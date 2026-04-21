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
await Promise.all(files.map(file => uploadFile(file)))
```

This is equivalent to clicking "Upload" three times simultaneously, but in code. The UI stays blocked until every upload finishes, so calling `onRefresh()` after `Promise.all` guarantees the file list is already up to date.

### Showing selected file names
Because users can select many files, a simple `<input>` alone does not give useful feedback. Rendering the list of selected filenames under the input helps users confirm they chose the right files before clicking Upload.

---

## Implementation Plan

The parallel-requests approach keeps the backend entirely unchanged and only modifies `FileUpload.jsx` and `files.js`.

### Step 1 — Add `multiple` to the file input in FileUpload.jsx

Open [frontend/src/components/FileUpload.jsx](../frontend/src/components/FileUpload.jsx) and change the `input` element and the state variable.

**Before:**
```jsx
const [selectedFile, setSelectedFile] = useState(null)

<input
    type="file"
    ref={fileInputRef}
    onChange={(e) => setSelectedFile(e.target.files[0])}
/>
```

**After:**
```jsx
const [selectedFiles, setSelectedFiles] = useState([])

<input
    type="file"
    multiple                                              // allow picking many files
    ref={fileInputRef}
    onChange={(e) => setSelectedFiles(Array.from(e.target.files))}
/>
```

`Array.from()` converts the browser's `FileList` into a plain JavaScript array so you can map over it.

### Step 2 — Update `handleUpload` to loop over all files

**Before:**
```javascript
const handleUpload = async () => {
    if (!selectedFile) return
    await uploadFile(selectedFile)
    setSelectedFile(null)
    fileInputRef.current.value = ''
    onRefresh()
}
```

**After:**
```javascript
const handleUpload = async () => {
    if (selectedFiles.length === 0) return
    await Promise.all(selectedFiles.map(file => uploadFile(file)))
    setSelectedFiles([])
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

The existing `POST /api/files/upload` endpoint in [backend/routes/file_router.py](../backend/routes/file_router.py) handles one file per request. Since the parallel approach sends one request per file, nothing in the backend changes.

### Complete updated FileUpload.jsx

```jsx
import '../styles/FileUpload.css'
import { useState, useRef } from 'react'
import { uploadFile } from '../api/files'

export function FileUpload({ onRefresh }) {
    const [selectedFiles, setSelectedFiles] = useState([])
    const fileInputRef = useRef(null)

    const handleUpload = async () => {
        if (selectedFiles.length === 0) return
        await Promise.all(selectedFiles.map(file => uploadFile(file)))
        setSelectedFiles([])
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

This approach is more efficient at scale (one round-trip, one database transaction) but requires adding the new endpoint. For the current project stage the parallel single-file approach is sufficient.

---

## What the Final Flow Looks Like

```
PARALLEL APPROACH (recommended for now)
User opens file picker → selects 3 files
    → FileList converted to Array, stored in selectedFiles state
    → selected file names rendered below the input
User clicks Upload
    → Promise.all starts 3 concurrent POST /api/files/upload requests
    → each runs the existing upload handler independently
    → all 3 finish → onRefresh() fetches updated file list
    → table shows 3 new rows
```
