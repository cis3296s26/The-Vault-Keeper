import '../styles/FileUpload.css'
import { useState, useRef } from "react"
import { uploadFile } from "../api/files"

export function FileUpload({ onRefresh }) {
    const [selectedFile, setSelectedFile] = useState(null)
    const [password, setPassword] = useState('')
    const [protect, setProtect] = useState(false)
    const fileInputRef = useRef(null)

    // Uploads file and reset file input
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