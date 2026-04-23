# Concepts Guide: Multi-File Upload & Password-Protected Files

This document explains every concept you encountered while building the multi-file upload and password-protection features. It assumes you know Java, C, and Python, and that this is your first full-stack web project. Every new idea is explained from scratch and connected to something you already know.

---

## Table of Contents

1. [How a Full-Stack App Is Structured](#1-how-a-full-stack-app-is-structured)
2. [JavaScript vs. Python: Key Differences to Know](#2-javascript-vs-python-key-differences-to-know)
3. [React: Building UI with Components](#3-react-building-ui-with-components)
4. [JSX: HTML Inside JavaScript](#4-jsx-html-inside-javascript)
5. [State: Variables That Refresh the Screen](#5-state-variables-that-refresh-the-screen)
6. [Refs: Reaching Into the DOM Directly](#6-refs-reaching-into-the-dom-directly)
7. [Async / Await and Promises](#7-async--await-and-promises)
8. [The Fetch API: Making HTTP Requests from the Browser](#8-the-fetch-api-making-http-requests-from-the-browser)
9. [FormData: Sending Files Over HTTP](#9-formdata-sending-files-over-http)
10. [FileList and ArrayBuffer: How the Browser Represents Files](#10-filelist-and-arraybuffer-how-the-browser-represents-files)
11. [Promise.all: Running Multiple Async Tasks at Once](#11-promiseall-running-multiple-async-tasks-at-once)
12. [Cryptography Fundamentals](#12-cryptography-fundamentals)
13. [The Web Crypto API](#13-the-web-crypto-api)
14. [FastAPI: Form Fields and File Uploads](#14-fastapi-form-fields-and-file-uploads)
15. [SQLModel: Adding Columns to a Database Table](#15-sqlmodel-adding-columns-to-a-database-table)
16. [Putting It All Together: The Full Upload and Download Flow](#16-putting-it-all-together-the-full-upload-and-download-flow)

---

## 1. How a Full-Stack App Is Structured

"Full-stack" means the project has two separate programs talking to each other over a network:

```
[ Browser (React) ]  ←—— HTTP requests/responses ——→  [ Server (FastAPI) ]
     frontend                                               backend
```

**Frontend** (React) runs inside the user's browser. It draws the UI, responds to clicks, and sends requests to the backend when it needs data or wants to upload a file.

**Backend** (FastAPI) runs on a server. It receives those requests, talks to the database and file storage, and sends back a response.

Neither side can directly call functions in the other — the only connection is HTTP requests, exactly like your browser loading a webpage. When `FileUpload.jsx` calls `fetch(...)`, it is sending an HTTP request across that boundary.

This separation is why the frontend and backend are in different folders (`frontend/` and `backend/`) and why CORS (Cross-Origin Resource Sharing) has to be configured — by default browsers block requests between different origins as a security measure.

---

## 2. JavaScript vs. Python: Key Differences to Know

You know Python, so here are the most surprising things about JavaScript:

| Concept | Python | JavaScript |
|---------|--------|------------|
| Variable declaration | `x = 5` | `const x = 5` or `let x = 5` |
| `const` vs `let` | no equivalent | `const` = cannot be reassigned; `let` = can |
| Function syntax | `def f(x):` | `function f(x) {}` or `(x) => {}` |
| Arrow functions | `lambda x: x+1` | `x => x + 1` |
| String interpolation | `f"Hello {name}"` | `` `Hello ${name}` `` (backtick, not quote) |
| `None` | `None` | `null` or `undefined` |
| Lists | `[]` | `[]` (called arrays) |
| Dicts | `{}` | `{}` (called objects) |
| Async | `async def` / `await` | `async function` / `await` (same idea) |
| Imports | `from x import y` | `import { y } from 'x'` |
| Printing | `print(x)` | `console.log(x)` |

JavaScript has no type annotations by default (TypeScript adds them, but this project uses plain JS). There are no colons at the end of `if`/`for` lines, and indentation is style only — curly braces `{}` define blocks.

---

## 3. React: Building UI with Components

React is a JavaScript library for building user interfaces. Its central idea is **components**: reusable functions that return a piece of the UI.

Think of a component like a Java class, but instead of methods and fields it has state variables and returns HTML-like markup. Every time the state changes, React automatically re-renders (redraws) the component.

```jsx
export function FileUpload({ onRefresh }) {
    // state and logic go here
    return (
        // markup (what appears on screen) goes here
    )
}
```

`export` makes the component available to other files — same concept as `public` in Java.

`{ onRefresh }` is a **prop** (short for property) — data passed into the component from its parent, like a parameter. In Python terms: `def FileUpload(onRefresh):`.

The component is used in another file like an HTML tag:
```jsx
<FileUpload onRefresh={handleRefresh} />
```

---

## 4. JSX: HTML Inside JavaScript

JSX is a syntax extension that lets you write HTML-like markup inside a JavaScript file. React transforms it into regular function calls before the browser runs it.

```jsx
// This JSX:
return <button onClick={handleUpload}>Upload</button>

// Gets transformed into this plain JavaScript:
return React.createElement('button', { onClick: handleUpload }, 'Upload')
```

You never write the transformed version by hand — JSX is just a shorthand. A few rules:

- All tags must be closed: `<input />` not `<input>`
- `class` is a reserved word in JavaScript, so you write `className` instead
- Event handlers use camelCase: `onClick`, `onChange`, not `onclick`, `onchange`
- To put JavaScript inside JSX, wrap it in `{}`: `<p>{file.name}</p>`
- Comments inside JSX must use `{/* like this */}` — regular `//` would be rendered as text

---

## 5. State: Variables That Refresh the Screen

In a normal program, changing a variable has no visible effect on its own. In React, **state variables** are special: when their value changes, React automatically redraws the component to reflect the new value.

You create state with `useState`:

```jsx
const [selectedFiles, setSelectedFiles] = useState([])
```

This is destructuring assignment (like Python's `a, b = (1, 2)`). `useState([])` returns two things:
1. `selectedFiles` — the current value (starts as `[]`)
2. `setSelectedFiles` — a function you call to update it

You **never** write `selectedFiles = something` directly. You always call `setSelectedFiles(something)`. Direct assignment doesn't trigger a re-render, so the screen would not update.

Analogy: think of state as a variable whose setter is also wired to a "repaint" signal. In Java, it would be like a field with a setter that calls `repaint()` automatically.

```jsx
// WRONG — screen won't update
selectedFiles = newFiles

// RIGHT — React redraws the component
setSelectedFiles(newFiles)
```

---

## 6. Refs: Reaching Into the DOM Directly

The DOM (Document Object Model) is the browser's internal representation of the page. React normally manages the DOM for you — you describe what the UI should look like and React updates the DOM. But sometimes you need to reach into a specific element directly.

`useRef` gives you a direct reference to a DOM element:

```jsx
const fileInputRef = useRef(null)

// Attach it to an element:
<input type="file" ref={fileInputRef} />

// Later, use it to clear the input:
fileInputRef.current.value = ''
```

`fileInputRef.current` is the actual DOM element — the same kind of object you would get from `document.getElementById(...)` in plain JavaScript.

The reason you need this for file inputs specifically: React does not control the file input's value (the selected file shown in the box). To clear it after an upload, you have to reach into the DOM and set `.value = ''` directly.

---

## 7. Async / Await and Promises

JavaScript is **single-threaded** — it can only do one thing at a time. To avoid freezing the browser while waiting for a network request or a slow operation, JavaScript uses **asynchronous** programming.

You already have async/await in Python, so the concept is the same. The difference is how it works under the hood.

In Python, `await` suspends the current coroutine. In JavaScript, `await` suspends the current function and hands control back to the browser's event loop — allowing the browser to handle other events (mouse clicks, repaints) while it waits.

```javascript
// This is a Promise — JavaScript's way of representing "a value that will exist in the future"
const promise = fetch('/api/files/upload', { method: 'POST', body: formData })

// await pauses here until the fetch finishes, then gives you the result
const response = await promise

// Shorthand (most common):
const response = await fetch('/api/files/upload', { method: 'POST', body: formData })
```

A `Promise` is like a Python `Future`. It has three states:
- **pending** — the operation is still running
- **fulfilled** — it finished successfully (has a value)
- **rejected** — it failed (has an error)

Any function that uses `await` must be declared `async`:

```javascript
const handleUpload = async () => {
    const response = await fetch(...)   // await only works inside async functions
}
```

If you forget `async`, JavaScript throws a syntax error — same rule as Python.

---

## 8. The Fetch API: Making HTTP Requests from the Browser

`fetch` is the browser's built-in function for making HTTP requests. It replaces what you might do with `requests` in Python or `HttpURLConnection` in Java.

```javascript
// GET request (simplest form)
const response = await fetch('/api/files')
const data = await response.json()   // parse the response body as JSON

// POST request with a body
const response = await fetch('/api/files/upload', {
    method: 'POST',
    body: formData,         // the data to send
})
```

Notice that `fetch` itself returns a Promise that resolves to a `Response` object — and then calling `response.json()` also returns a Promise, because parsing the body is also asynchronous. That's why both lines need `await`.

`fetch` does **not** throw an error for 4xx/5xx HTTP status codes — it only rejects if the network itself fails. To check if the server returned an error, you check `response.ok` (true for 200–299).

---

## 9. FormData: Sending Files Over HTTP

HTTP is a text protocol at its core. To send binary data like files, the browser uses **multipart/form-data** encoding — it splits the request body into named "parts", each containing one field or file.

`FormData` is the JavaScript object that builds this encoding for you:

```javascript
const formData = new FormData()

// Append a plain text field (like a form input)
formData.append('salt', 'a3f2c8...')

// Append a file
formData.append('file', selectedFile)

// Append a Blob (raw bytes with a filename)
formData.append('file', new Blob([encryptedBytes]), 'report.pdf')
```

`Blob` (Binary Large Object) is a wrapper around raw binary data. When you encrypt a file you get an `ArrayBuffer` of scrambled bytes — wrapping it in `new Blob([...])` turns it into something FormData can send, and you can give it a filename as the third argument.

On the FastAPI side, each `formData.append('key', value)` call becomes one form field the server can read by name.

---

## 10. FileList and ArrayBuffer: How the Browser Represents Files

When a user picks files with `<input type="file">`, the browser gives you a **FileList** — a read-only, array-like collection of `File` objects. It is not a real JavaScript array, so `.map()` and `.filter()` don't work on it directly.

```javascript
// e.target.files is a FileList — convert it first
const files = Array.from(e.target.files)   // now it's a real array
files.map(f => console.log(f.name))        // works
```

A `File` object has:
- `.name` — the filename (string)
- `.size` — size in bytes (number)
- `.type` — MIME type like `"image/png"` (string)
- `.arrayBuffer()` — async method that returns the raw bytes as an `ArrayBuffer`

An **ArrayBuffer** is a fixed-length block of raw bytes in memory — the closest JavaScript equivalent to a `byte[]` in Java or `bytes` in Python. You cannot read individual bytes from it directly; you need a **typed array view**:

```javascript
const buffer = await file.arrayBuffer()       // raw bytes
const bytes = new Uint8Array(buffer)          // view it as unsigned 8-bit integers
console.log(bytes[0])                         // first byte, 0–255
```

The Web Crypto API works with `ArrayBuffer` and `Uint8Array` directly — that's why `file.arrayBuffer()` is called before encrypting.

---

## 11. Promise.all: Running Multiple Async Tasks at Once

If you need to upload three files sequentially (one after the other), you wait for the full time of all three:

```javascript
// Sequential — total time = time1 + time2 + time3
await uploadOne(files[0])
await uploadOne(files[1])
await uploadOne(files[2])
```

`Promise.all` starts all of them at the same time and waits for all of them to finish:

```javascript
// Parallel — total time ≈ max(time1, time2, time3)
await Promise.all([
    uploadOne(files[0]),
    uploadOne(files[1]),
    uploadOne(files[2]),
])
```

Combined with `.map()`, this becomes a one-liner that works for any number of files:

```javascript
await Promise.all(selectedFiles.map(file => uploadOne(file)))
```

`.map()` turns the array of files into an array of Promises (each `uploadOne(file)` call returns a Promise). `Promise.all` takes that array and resolves when every Promise in it resolves.

If any one Promise rejects (fails), `Promise.all` immediately rejects with that error. All the other uploads may still be running in the background. For production code you would handle this more carefully; for a course project this is fine.

---

## 12. Cryptography Fundamentals

This section covers the concepts needed to understand the zero-knowledge password-protection design — without going into the math.

### Symmetric Encryption

Symmetric encryption uses the same key to both encrypt and decrypt. Think of it like a combination lock: whoever knows the combination can lock and unlock it. AES (Advanced Encryption Standard) is the industry-standard symmetric cipher. This project uses **AES-GCM** (Galois/Counter Mode), which is the recommended variant because it also detects tampering.

### What Is a Key?

An encryption key is just a sequence of random bits. AES-256 uses a 256-bit (32-byte) key. The key is the secret — anyone with the key can decrypt the file.

### Key Derivation: Turning a Password Into a Key

A user types a password like `"hello123"` — that string cannot be used directly as an AES key (wrong length, not random enough). **PBKDF2** (Password-Based Key Derivation Function 2) solves this: it runs the password through a hashing function 100,000 times, mixing in a salt, to produce a proper fixed-length key.

```
password + salt  →  [PBKDF2, 100,000 rounds of SHA-256]  →  256-bit AES key
```

The 100,000 iterations make brute-force guessing slow: an attacker trying a million passwords has to run 100,000 hash rounds per guess, not just one.

### What Is a Salt?

A **salt** is a random sequence of bytes generated fresh for each file. Without a salt, two users who both use the password `"hello123"` would produce the exact same key — an attacker could pre-compute a table of (password → key) pairs and look up anyone's key instantly (a "rainbow table" attack).

With a salt, even identical passwords produce completely different keys because the salt is different every time. The salt is not secret — it is stored in the database alongside the encrypted file. Its only job is to make each key derivation unique.

### What Is an IV (Initialization Vector)?

An **IV** is a random value required by AES-GCM. Unlike the salt (which makes keys unique), the IV makes each individual encryption operation unique. AES-GCM becomes insecure if you ever reuse the same IV with the same key — generating a fresh random IV for every encryption call prevents this. Like the salt, the IV is not secret and is stored in the database.

### Authentication Tag

AES-GCM also produces an **authentication tag** alongside the ciphertext. When decrypting, AES-GCM checks this tag. If the password is wrong (producing the wrong key), or if the file was tampered with, the tag check fails and the browser throws an error — it refuses to return any output at all. This is why entering a wrong password gives an immediate error rather than producing corrupted garbage.

### Zero-Knowledge Design

"Zero-knowledge" in this context means the server never sees the password or the unencrypted file. Encryption happens in the browser before the upload. The server stores encrypted bytes it cannot read. Even if the database was stolen, an attacker would only have ciphertext + salt + IV — they would still need to brute-force the password.

---

## 13. The Web Crypto API

The Web Crypto API is built into every modern browser — no libraries needed. It lives at `window.crypto` (usually just `crypto`). All its heavy operations live under `crypto.subtle` (the name "subtle" signals that misuse is easy and mistakes are serious).

### Generating Random Bytes

```javascript
const salt = crypto.getRandomValues(new Uint8Array(16))
```

`getRandomValues` fills the typed array you pass it with cryptographically random bytes. This is the right way to get randomness for security purposes — `Math.random()` is not cryptographically secure and must never be used for keys, salts, or IVs.

### Importing a Password as Key Material

```javascript
const keyMaterial = await crypto.subtle.importKey(
    'raw',                   // format: raw bytes
    enc.encode(password),    // the password converted to bytes
    { name: 'PBKDF2' },     // algorithm this will be used with
    false,                   // not exportable
    ['deriveKey']            // only allowed use
)
```

`importKey` takes raw bytes and tells the browser "treat these as key material for PBKDF2". The browser holds the result internally — JavaScript cannot read the raw bytes back out (`false` = not exportable). This is a security feature.

### Deriving the AES Key with PBKDF2

```javascript
const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
)
```

This produces a 256-bit AES-GCM key from the password material and salt. The key object is held inside the browser — again, JavaScript cannot export the raw key bytes. The only thing you can do with it is encrypt and decrypt.

### Encrypting

```javascript
const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },   // algorithm + IV
    key,                        // the derived key
    arrayBuffer                 // the file's raw bytes
)
```

Returns an `ArrayBuffer` of the same size as the input (plus 16 bytes for the authentication tag). It looks like random noise.

### Decrypting

```javascript
const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },   // must match the IV used during encryption
    key,                        // must be derived from the same password + salt
    ciphertext
)
```

Returns the original `ArrayBuffer` if the password and IV are correct. Throws an error (rejects the Promise) if anything is wrong — the authentication tag check fails.

---

## 14. FastAPI: Form Fields and File Uploads

You already know the basics of FastAPI endpoints. Multipart form uploads add a few new pieces.

### Receiving a File

`UploadFile` is FastAPI's type for a file sent in a multipart request. The file's raw bytes are available at `.file` (a file-like object), `.filename` is the name, and `.size` is the byte count.

```python
from fastapi import UploadFile

@router.post("/upload")
def upload(file: UploadFile):
    data = file.file.read()   # raw bytes
```

### Receiving Extra Form Fields

To receive text fields alongside the file (like `salt` and `iv`), import `Form` and annotate each parameter:

```python
from fastapi import Form

@router.post("/upload")
def upload(
    file: UploadFile,
    salt: str | None = Form(default=None),
    iv:   str | None = Form(default=None),
):
    ...
```

`Form(default=None)` means the field is optional — if the client doesn't send it, the parameter is `None`. This is how the same endpoint handles both regular uploads and encrypted uploads.

**Important:** when an endpoint has both `UploadFile` and `Form` parameters, FastAPI requires that the request be `multipart/form-data`. If you send JSON instead, FastAPI returns a 422 error.

### Why Not JSON?

You might wonder: why not just send the salt and iv in a JSON body alongside the file? The answer is that HTTP requests can only have one body. A file upload uses `multipart/form-data` as the body. You cannot also have a JSON body in the same request. Form fields are the correct way to include text data in a file upload request.

---

## 15. SQLModel: Adding Columns to a Database Table

SQLModel is a library that lets you define a Python class and have it automatically become a database table. Each class attribute becomes a column.

```python
class File(SQLModel, table=True):
    id:           int | None = Field(default=None, primary_key=True)
    name:         str
    size:         int | None
    r2_key:       str
    created_at:   datetime = Field(default_factory=datetime.utcnow)
    is_protected: bool     = Field(default=False)
    salt:         str | None = Field(default=None)
    iv:           str | None = Field(default=None)
```

`Field(default=None)` means the column is nullable — a row can exist without a value in that column. This is important here because existing files in the database don't have a salt or iv.

`Field(default=False)` means the column defaults to `False` when a new row is inserted without specifying a value — so regular (non-protected) uploads work without any changes.

### Database Migrations

When you add a new column to a SQLModel class, the Python class is updated but the actual SQLite `.db` file on disk is not. The database file was created the first time the app ran and does not automatically change when you edit the Python code.

For development, the simplest fix is to delete the `.db` file and let SQLModel recreate it from scratch when the server starts. For production you would write a migration script that adds the columns to the existing file without deleting any data. The tool most commonly used for this is called **Alembic**.

---

## 16. Putting It All Together: The Full Upload and Download Flow

Here is a complete walkthrough connecting every concept above into the two features.

### Multi-File Upload Flow

```
1. User clicks the file input (type="file" multiple)
2. Browser shows file picker — user selects 3 files
3. onChange fires → e.target.files is a FileList
4. Array.from(e.target.files) converts FileList → real JS array
5. setSelectedFiles(array) updates state → React re-renders
6. The <ul> list appears showing the 3 filenames (Step 3 of the plan)
7. User clicks Upload → handleUpload runs (async)
8. Promise.all(selectedFiles.map(uploadOne)) starts 3 fetch calls simultaneously
9. Each fetch POSTs one file to /api/files/upload (existing endpoint, no changes)
10. All 3 finish → Promise.all resolves → onRefresh() runs
11. File table re-fetches from backend and shows 3 new rows
```

### Encrypted Upload Flow

```
1–6. Same as above, plus user checks "Password protect" and types a password
7. User clicks Upload → handleUpload runs
8. For each file, uploadOne runs:
   a. file.arrayBuffer() — reads the file's raw bytes into memory
   b. encryptFile(buffer, password):
      - crypto.getRandomValues → 16-byte salt (unique per file)
      - crypto.getRandomValues → 12-byte IV (unique per file)
      - crypto.subtle.importKey → password bytes become PBKDF2 material
      - crypto.subtle.deriveKey → PBKDF2 produces 256-bit AES key
      - crypto.subtle.encrypt  → AES-GCM scrambles the file bytes
      - Returns { encrypted, salt (hex), iv (hex) }
   c. FormData is built with:
      - 'file' → new Blob([encrypted]) — the scrambled bytes
      - 'salt' → hex string
      - 'iv'   → hex string
   d. fetch POSTs the FormData to /api/files/upload
9. FastAPI receives:
   - file → encrypted bytes (it doesn't know or care they're encrypted)
   - salt → hex string (from Form field)
   - iv   → hex string (from Form field)
   - Sets is_protected=True, stores salt + iv in the database row
   - Saves encrypted bytes to file storage (Cloudflare R2)
10. Backend never saw the password — zero-knowledge
```

### Encrypted Download Flow

```
1. User clicks "View" on a protected file
2. GET /api/files/view/{id} → returns { url, is_protected: true, salt, iv }
3. Browser prompts user for password (prompt() dialog)
4. GET {url} → downloads the encrypted bytes as an ArrayBuffer
5. decryptFile(encrypted, password, salt, iv):
   - hexToBytes(salt) → Uint8Array
   - hexToBytes(iv)   → Uint8Array
   - deriveKey(password, salt) → re-derives the exact same AES key
     (PBKDF2 is deterministic: same password + same salt = same key)
   - crypto.subtle.decrypt → AES-GCM checks authentication tag
     - If password correct: returns original file bytes
     - If password wrong: authentication tag fails → Promise rejects → catch block shows alert
6. URL.createObjectURL(new Blob([decrypted])) → creates a temporary download URL
7. A hidden <a> tag is clicked programmatically → browser saves the file
8. URL.revokeObjectURL(...) → frees the memory
```

---

## Key Takeaways

- **React** manages the UI as a tree of components, each with its own state. Change the state, the screen updates automatically.
- **async/await** in JavaScript works the same way as in Python — it pauses a function without freezing the whole program.
- **fetch + FormData** is how the frontend sends files and data to the backend. FormData handles the multipart encoding so you don't have to.
- **Promise.all** turns sequential async work into parallel async work with one line.
- **Encryption happens in the browser**, not the server. The server only stores the ciphertext and the non-secret parameters (salt, iv) needed to decrypt later.
- **Salt** makes each key unique even when the password is the same. **IV** makes each encryption operation unique. Neither is secret.
- **PBKDF2** is the bridge between a human-memorable password and a machine-usable key. AES-GCM is the algorithm that does the actual scrambling and also detects wrong passwords.
- **SQLModel columns** define the database schema in Python. New columns need either a default value or a migration for existing rows.
