import '../styles/FileUpload.css'
import { useState, useRef } from "react"
import { uploadFile } from "../api/files"

export function FileUpload({ onRefresh }) {
    const [selectedFile, setSelectedFile] = useState(null)
    const fileInputRef = useRef(null)

    // Uploads file and reset file input
    const handleUpload = async () => {
        if (!selectedFile) return
        await uploadFile(selectedFile)
        setSelectedFile(null)
        fileInputRef.current.value = ''
        onRefresh()
    }
    return (
        <div id="FileUpload">
            <input type="file" ref={fileInputRef} onChange={(e) => setSelectedFile(e.target.files[0])} />
            <button onClick={handleUpload}>Upload</button>
        </div>
    );
}