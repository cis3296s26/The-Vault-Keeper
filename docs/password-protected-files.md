# Password-Protected Files

This document explains how to add password-protected file uploads to the current version of The Vault Keeper. The goal is a **zero-knowledge** design: the backend never sees the password or the unencrypted file. Encryption and decryption happen entirely in the browser.

---

## Technologies Required

### 1. Web Crypto API
A set of cryptographic functions built directly into every modern browser — no extra libraries needed. The parts relevant to this feature are:

- **`crypto.getRandomValues()`** — fills a typed array with cryptographically strong random bytes. Used to generate the *salt* and *IV* described below.
- **`crypto.subtle.importKey()`** — converts raw bytes (your password) into a key object the browser can use.
- **`crypto.subtle.deriveKey()` with PBKDF2** — turns a password string into a fixed-length encryption key. PBKDF2 is a *key-derivation function*: it runs the password through thousands of hashing rounds so that guessing attacks are slow.
- **`crypto.subtle.encrypt()` / `crypto.subtle.decrypt()` with AES-GCM** — the actual encryption algorithm. AES-GCM is the standard choice: it encrypts data and also produces an *authentication tag* that detects tampering.

### 2. FastAPI — `UploadFile` and new fields on the endpoint
The existing `POST /api/files/upload` endpoint already accepts a file. To support encrypted uploads it needs two extra pieces of data alongside the file: the *salt* and the *IV* (both explained below). FastAPI accepts these as additional form fields sent in the same multipart request.

### 3. SQLModel / SQLite — new columns on the `File` model
The database row for each file needs to store whether it is encrypted, and if so, the salt and IV that are required to decrypt it later. These values are safe to store in plain text — they are not secret.

### 4. React — two new UI states
The frontend needs a password input field that appears when the user marks a file as protected. The same field reappears when downloading, so the browser can decrypt before saving.

---

## Key Concepts

### What is a Salt?
A salt is a random string of bytes generated fresh for each file. Two users who encrypt files with the password `"hello"` will end up with completely different encryption keys because each encryption used a different salt. This prevents *rainbow table* attacks (pre-computed tables of passwords → keys).

The salt is **not secret**. It is stored in the database and sent back to the browser when the user wants to download and decrypt.

### What is an IV (Initialization Vector)?
An IV is another random value, but it belongs to the encryption step itself (not the key derivation). AES-GCM requires that you never reuse the same IV with the same key. Generating a fresh random IV for every encryption call guarantees this. Like the salt, the IV is stored in the database in plain text.

### PBKDF2: From Password to Key
The browser cannot use a password string directly as an AES key. PBKDF2 solves this:

```
password (string)  +  salt (random bytes)  →  [PBKDF2, 100,000 iterations]  →  256-bit AES key
```

The number of iterations (100,000 is a reasonable default) makes brute-force guessing expensive. The same password + same salt always produces the same key, which is why the salt must be stored and reused at decryption time.

### AES-GCM: Encrypting the File
Once the key exists, `crypto.subtle.encrypt` takes the key, the IV, and the raw file bytes, and returns an encrypted *ArrayBuffer*. This buffer is what gets uploaded to the backend. It looks like random noise — only someone with the correct password and the stored salt/IV can reverse it.

### How Upload and Download Work End-to-End

**Upload:**
1. User selects a file and types a password.
2. Browser generates a random 16-byte salt and a random 12-byte IV.
3. Browser runs PBKDF2 to derive a 256-bit AES key from the password + salt.
4. Browser encrypts the file bytes with AES-GCM using the key and IV.
5. The encrypted bytes, plus the salt and IV (as hex strings), are POSTed to the backend.
6. Backend stores the encrypted blob on disk and saves `is_protected=True`, `salt`, and `iv` in the database row. **The backend never sees the password.**

**Download:**
1. Browser asks the backend for the file's metadata (includes salt and iv).
2. User is prompted for the password.
3. Browser re-derives the same key using PBKDF2 with the password + stored salt.
4. Browser decrypts the blob using AES-GCM with the key + stored IV.
5. Decrypted bytes are turned into a download link and saved locally.

If the wrong password is entered, AES-GCM's authentication tag check fails and the browser throws an error before producing any output.

---

## Implementation Plan

### Step 1 — Update the `File` database model

Add three optional columns to [backend/models/File.py](../backend/models/File.py):

```python
class File(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    size: int | None
    r2_key: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # New fields for password protection
    is_protected: bool = Field(default=False)
    salt: str | None = Field(default=None)   # hex-encoded, 16 bytes
    iv: str | None = Field(default=None)     # hex-encoded, 12 bytes
```

SQLModel will add the columns the next time `create_db_and_tables()` runs on a fresh database. For an existing database you would need a migration script (or delete the `.db` file in development).

### Step 2 — Update the upload endpoint

Modify `POST /api/files/upload` in [backend/routes/file_router.py](../backend/routes/file_router.py) to accept the two optional form fields:

```python
from fastapi import Form

@router.post("/upload")
def upload(
    file: UploadFile,
    session: SessionDep,
    salt: str | None = Form(default=None),
    iv: str | None = Form(default=None),
) -> FileModel:
    is_protected = salt is not None and iv is not None
    file_key = storage.upload_file(file.file, file.filename)
    upload_file = FileModel(
        name=file.filename,
        size=file.size,
        r2_key=file_key,
        is_protected=is_protected,
        salt=salt,
        iv=iv,
    )
    session.add(upload_file)
    session.commit()
    session.refresh(upload_file)
    return upload_file
```

The backend treats the uploaded bytes as opaque — it does not care whether they are encrypted or not. It simply stores whatever it receives.

### Step 3 — Expose salt and iv in the view endpoint

The `/view/{file_id}` response needs to include `salt` and `iv` so the frontend knows whether to prompt for a password:

```python
@router.get("/view/{file_id}")
def view_file(file_id: int, session: SessionDep):
    file = session.get(FileModel, file_id)
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    return {
        "url": f"/api/files/download/{file.r2_key}",
        "is_protected": file.is_protected,
        "salt": file.salt,
        "iv": file.iv,
    }
```

### Step 4 — Encryption helper in the frontend

Create [frontend/src/utils/crypto.js](../frontend/src/utils/crypto.js):

```javascript
// Convert a hex string like "a3f2..." back to a Uint8Array
function hexToBytes(hex) {
    return new Uint8Array(hex.match(/.{2}/g).map(b => parseInt(b, 16)));
}

// Convert a Uint8Array to a hex string
function bytesToHex(bytes) {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Derive a 256-bit AES-GCM key from a password string and a salt (Uint8Array)
async function deriveKey(password, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

// Encrypt an ArrayBuffer with a password. Returns { encrypted, salt, iv } all as hex strings.
export async function encryptFile(arrayBuffer, password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, salt);
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, arrayBuffer);
    return {
        encrypted,                    // ArrayBuffer — send this as the file blob
        salt: bytesToHex(salt),       // store in DB
        iv: bytesToHex(iv),           // store in DB
    };
}

// Decrypt an ArrayBuffer using the password, salt hex, and iv hex from the database.
export async function decryptFile(arrayBuffer, password, saltHex, ivHex) {
    const salt = hexToBytes(saltHex);
    const iv = hexToBytes(ivHex);
    const key = await deriveKey(password, salt);
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, arrayBuffer);
}
```

### Step 5 — Update FileUpload.jsx

```jsx
import { encryptFile } from '../utils/crypto'

export function FileUpload({ onRefresh }) {
    const [selectedFile, setSelectedFile] = useState(null)
    const [password, setPassword] = useState('')
    const [protect, setProtect] = useState(false)
    const fileInputRef = useRef(null)

    const handleUpload = async () => {
        if (!selectedFile) return

        const formData = new FormData()

        if (protect && password) {
            const buffer = await selectedFile.arrayBuffer()
            const { encrypted, salt, iv } = await encryptFile(buffer, password)
            // Wrap the encrypted ArrayBuffer in a Blob so FormData can send it
            formData.append('file', new Blob([encrypted]), selectedFile.name)
            formData.append('salt', salt)
            formData.append('iv', iv)
        } else {
            formData.append('file', selectedFile)
        }

        await fetch(`${BASE_URL}/api/files/upload`, { method: 'POST', body: formData })
        setSelectedFile(null)
        setPassword('')
        setProtect(false)
        fileInputRef.current.value = ''
        onRefresh()
    }

    return (
        <div id="FileUpload">
            <input type="file" ref={fileInputRef} onChange={e => setSelectedFile(e.target.files[0])} />
            <label>
                <input type="checkbox" checked={protect} onChange={e => setProtect(e.target.checked)} />
                Password protect
            </label>
            {protect && (
                <input
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                />
            )}
            <button onClick={handleUpload}>Upload</button>
        </div>
    )
}
```

### Step 6 — Update the download flow in FileTable.jsx

```jsx
import { decryptFile } from '../utils/crypto'

const handleView = async (file) => {
    const meta = await fetch(`${BASE_URL}/api/files/view/${file.id}`).then(r => r.json())

    if (meta.is_protected) {
        const password = prompt('Enter file password:')
        if (!password) return

        const res = await fetch(`${BASE_URL}${meta.url}`)
        const encrypted = await res.arrayBuffer()

        let decrypted
        try {
            decrypted = await decryptFile(encrypted, password, meta.salt, meta.iv)
        } catch {
            alert('Incorrect password or corrupted file.')
            return
        }

        const url = URL.createObjectURL(new Blob([decrypted]))
        const a = document.createElement('a')
        a.href = url
        a.download = file.name
        a.click()
        URL.revokeObjectURL(url)
    } else {
        window.open(`${BASE_URL}${meta.url}`, '_blank')
    }
}
```

---

## What the Final Flow Looks Like

```
UPLOAD
User picks file + types password
    → browser encrypts in-memory (Web Crypto API)
    → FormData with encrypted blob + salt + iv  →  POST /api/files/upload
    → backend stores blob on disk, stores salt + iv in SQLite
    → backend never sees password

DOWNLOAD
User clicks "View" on a protected file
    → GET /api/files/view/{id}  →  returns { url, is_protected, salt, iv }
    → browser prompts for password
    → GET /api/files/download/{key}  →  returns encrypted bytes
    → browser decrypts in-memory using password + salt + iv
    → decrypted file saved to user's computer
    → if wrong password: AES-GCM authentication fails, browser throws error
```
