import '../styles/FileUpload.css'
import { useState, useRef } from "react"
import { uploadFile } from "../api/files"

export function FileUpload({ onRefresh }) {
    const [selectedFile, setSelectedFile] = useState([])
    const [password, setPassword] = useState('')
    const [protect, setProtect] = useState(false)
    const fileInputRef = useRef(null)

    // Uploads file and reset file input
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
    // Promise.all starts all uploads at once and waits until every one finishes. 
    // Only then does onRefresh() run, ensuring the file table reflects all new files.
    await Promise.all(selectedFiles.map(uploadOne))
    setSelectedFiles([])
    setPassword('')
    setProtect(false)
    fileInputRef.current.value = ''
    onRefresh()
    }

    return (
        <div id="FileUpload">
            {/*Array.from() converts the browser's FileList into a plain JavaScript array so you can map over it.*/}
            <input 
                type="file"
                multiple
                ref={fileInputRef}
                onChange={(e) => setSelectedFiles(Array.from(e.target.files))}
            />
            {/*small file list so the user can see what they selected*/}
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