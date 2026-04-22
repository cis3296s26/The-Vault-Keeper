# Multi-File Upload

This document explains how to add multi-file upload support to The Vault Keeper. The goal is to let users select and upload more than one file at a time without changing the existing single-file upload logic.

---

## Technologies Required

### 1. HTML `<input type="file" multiple>`
A single HTML attribute — `multiple` — tells the browser to allow the user to select several files from the file picker at once. The selected files are available as a `FileList` object (an array-like collection of `File` objects) on `event.target.files` instead of just `event.target.files[0]`.

### 2. `FormData` with multiple entries
`FormData` is the object used to send files to a server. You can call `formData.append('file', file)` more than once with the same key name. The server then receives all those files under that same key. Each `append` call adds one file to the request body; the browser serializes them together using the standard `multipart/form-data` encoding.

### 3. FastAPI — `List[UploadFile]`
FastAPI's `UploadFile` type can be annotated as `List[UploadFile]` (or `list[UploadFile]`). When FastAPI sees multiple form fields with the same name it automatically collects them into a Python list, so the handler receives all files in one call. You then loop over the list and process each file the same way the current single-file handler works.

### 4. React state — `selectedFiles` array
The current component stores one file in `selectedFile` (a single `File` object). To support multiple files, the state becomes an array. The upload handler iterates over that array when building the `FormData`.

---

## Key Concepts

### FileList vs. File
When `multiple` is set on an `<input type="file">`, `e.target.files` is a `FileList`. You cannot call `.map()` on it directly because it is not a plain JavaScript array. Converting it is one line:

```javascript
const files = Array.from(e.target.files)   // now it's a regular array
```

After that, `files.map(...)`, `files.forEach(...)`, and `files.length` all work normally.

### One request vs. many requests
There are two valid ways to send multiple files:

| Approach | How it works | Trade-off |
|----------|-------------|-----------|
| **Single request** | Append all files to one `FormData`, send one `POST`. Backend receives a `list[UploadFile]`. | One round-trip. Slightly more complex backend handler. |
| **Parallel requests** | Send one `POST` per file using `Promise.all`. Backend handler is unchanged. | More network calls but the existing endpoint works as-is. |

For this project the **parallel requests** approach is recommended because it requires no backend changes — the existing `/upload` endpoint already handles one file perfectly, and `Promise.all` runs them all at the same time so the total time is not much longer than a single upload.

### `Promise.all` for parallel uploads
`Promise.all` takes an array of Promises and waits for all of them to finish before continuing. If you have three files, all three uploads start at the same time:

```javascript
await Promise.all(files.map(file => uploadSingleFile(file)))
```

This is equivalent to clicking "Upload" three times simultaneously, but in code. The UI stays blocked until every upload finishes, so calling `onRefresh()` after `Promise.all` guarantees the file list is already up to date.

### Password protection and multiple files
Password protection was added before multi-file upload. The current `handleUpload` builds `FormData` inline and calls `encryptFile` before sending — it does not use the `uploadFile` helper from `files.js`.

When uploading multiple files with a password, the same password is applied to every file in the batch (one password field, many files). Each file still gets its own randomly generated salt and IV, so the encryption is independent per file even though the password is shared. This matches how most password-manager-style tools work: you set one password for a batch, not one per file.

To keep the loop clean, extract the per-file send logic into a local helper inside `handleUpload` (see Step 2).

### Showing selected file names
Because users can select many files, a simple `<input>` alone does not give useful feedback. Rendering the list of selected filenames under the input helps users confirm they chose the right files before clicking Upload.

---

## Implementation Plan

The parallel-requests approach keeps the backend entirely unchanged and only modifies `FileUpload.jsx`.

> **Note:** The password-protection feature was implemented first and changed `FileUpload.jsx` significantly. The "Before" snapshots below reflect the current state of the file after that change, not the original single-file version.

### Step 1 — Change `selectedFile` to `selectedFiles` in FileUpload.jsx

Open [frontend/src/components/FileUpload.jsx](../frontend/src/components/FileUpload.jsx) and change the state variable and the `input` element.

**Before (current state after password-protection work):**
```jsx
const [selectedFile, setSelectedFile] = useState(null)

<input type="file" ref={fileInputRef} onChange={e => setSelectedFile(e.target.files[0])} />
```

**After:**
```jsx
const [selectedFiles, setSelectedFiles] = useState([])

<input
    type="file"
    multiple
    ref={fileInputRef}
    onChange={(e) => setSelectedFiles(Array.from(e.target.files))}
/>
```

`Array.from()` converts the browser's `FileList` into a plain JavaScript array so you can map over it.

### Step 2 — Update `handleUpload` to loop over all files

The current `handleUpload` builds `FormData` inline and encrypts the file when `protect && password` is set. To support multiple files, extract the per-file logic into a local helper and loop over `selectedFiles` with `Promise.all`.

**Before (current state after password-protection work):**
```javascript
const handleUpload = async () => {
    if (!selectedFile) return

    const formData = new FormData()

    if (protect && password) {
        const buffer = await selectedFile.arrayBuffer()
        const { encrypted, salt, iv } = await encryptFile(buffer, password)
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
```

**After:**
```javascript
const handleUpload = async () => {
    if (selectedFiles.length === 0) return

    const uploadOne = async (file) => {
        const formData = new FormData()
        if (protect && password) {
            const buffer = await file.arrayBuffer()
            const { encrypted, salt, iv } = await encryptFile(buffer, password)
            formData.append('file', new Blob([encrypted]), file.name)
            formData.append('salt', salt)
            formData.append('iv', iv)
        } else {
            formData.append('file', file)
        }
        return fetch(`${BASE_URL}/api/files/upload`, { method: 'POST', body: formData })
    }

    await Promise.all(selectedFiles.map(uploadOne))
    setSelectedFiles([])
    setPassword('')
    setProtect(false)
    fileInputRef.current.value = ''
    onRefresh()
}
```

`Promise.all` starts all uploads at once and waits until every one finishes. Only then does `onRefresh()` run, ensuring the file table reflects all new files.

### Step 3 — Show selected filenames (optional but recommended)

Add a small file list under the input so the user can see what they selected:

```jsx
{selectedFiles.length > 0 && (
    <ul>
        {selectedFiles.map((f, i) => (
            <li key={i}>{f.name}</li>
        ))}
    </ul>
)}
```

### Step 4 — No backend changes needed

The existing `POST /api/files/upload` endpoint in [backend/routes/file_router.py](../backend/routes/file_router.py) already accepts an optional `salt` and `iv` form field (added during the password-protection work). Since the parallel approach sends one request per file, and each request has the same shape as a single-file upload, nothing in the backend changes.

### Complete updated FileUpload.jsx

```jsx
import '../styles/FileUpload.css'
import { useState, useRef } from 'react'
import { encryptFile } from '../utils/crypto'

export function FileUpload({ onRefresh }) {
    const [selectedFiles, setSelectedFiles] = useState([])
    const [password, setPassword] = useState('')
    const [protect, setProtect] = useState(false)
    const fileInputRef = useRef(null)

    const handleUpload = async () => {
        if (selectedFiles.length === 0) return

        const uploadOne = async (file) => {
            const formData = new FormData()
            if (protect && password) {
                const buffer = await file.arrayBuffer()
                const { encrypted, salt, iv } = await encryptFile(buffer, password)
                formData.append('file', new Blob([encrypted]), file.name)
                formData.append('salt', salt)
                formData.append('iv', iv)
            } else {
                formData.append('file', file)
            }
            return fetch(`${BASE_URL}/api/files/upload`, { method: 'POST', body: formData })
        }

        await Promise.all(selectedFiles.map(uploadOne))
        setSelectedFiles([])
        setPassword('')
        setProtect(false)
        fileInputRef.current.value = ''
        onRefresh()
    }

    return (
        <div id="FileUpload">
            <input
                type="file"
                multiple
                ref={fileInputRef}
                onChange={(e) => setSelectedFiles(Array.from(e.target.files))}
            />
            {selectedFiles.length > 0 && (
                <ul>
                    {selectedFiles.map((f, i) => (
                        <li key={i}>{f.name}</li>
                    ))}
                </ul>
            )}
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

---

## Alternative: Single Request with `List[UploadFile]` (backend approach)

If you later want to send all files in one HTTP request (for example, to wrap the entire batch in a single database transaction), here is what the change looks like.

**Backend (`file_router.py`):**
```python
from typing import List

@router.post("/upload-many")
def upload_many(files: List[UploadFile], session: SessionDep) -> list[FileModel]:
    results = []
    for file in files:
        file_key = storage.upload_file(file.file, file.filename)
        db_file = FileModel(name=file.filename, size=file.size, r2_key=file_key)
        session.add(db_file)
        results.append(db_file)
    session.commit()
    for f in results:
        session.refresh(f)
    return results
```

**Frontend (`files.js`):**
```javascript
export const uploadFiles = async (files) => {
    const formData = new FormData()
    files.forEach(file => formData.append('files', file))  // same key, repeated
    const res = await fetch(`${BASE_URL}/api/files/upload-many`, {
        method: 'POST',
        body: formData,
    })
    return res.json()
}
```

This approach is more efficient at scale (one round-trip, one database transaction) but requires adding the new endpoint. For the current project stage the parallel single-file approach is sufficient. Note that extending this endpoint to support encryption would also require passing `salt` and `iv` per file, which is more complex since `FormData` does not have a natural way to associate per-file metadata.

---

## What the Final Flow Looks Like

```
PARALLEL APPROACH (recommended for now)
User opens file picker → selects 3 files
    → FileList converted to Array, stored in selectedFiles state
    → selected file names rendered below the input
User optionally checks "Password protect" and enters a password
User clicks Upload
    → Promise.all starts 3 concurrent POST /api/files/upload requests
    → each file is independently encrypted (own salt + iv) if protect is set
    → each runs the existing upload handler independently
    → all 3 finish → onRefresh() fetches updated file list
    → table shows 3 new rows
```
