import '../styles/FileTable.css'
import { viewFile, deleteFile } from '../api/files'

export function FileTable({ files, onRefresh }) {
    // Formates files size in the table
    function formatSize(bytes) {
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    // Deletes file then refreshes the files list
    const handleDelete = async (fileId) => {
        await deleteFile(fileId)
        onRefresh()
    }
    
    return (
        <div id="FileTable">
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Size</th>
                        <th>Created Date</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {files.length === 0 ? (
                        <tr>
                            <td colSpan="4">
                                No files uploaded yet
                            </td>
                        </tr>
                    ) : (files.map(file => (
                        <tr className="table-content" key={file.id}>
                            <td>
                                <span onClick={() => handleDelete(file.id)} style={{ cursor: 'pointer' }}><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash2-icon lucide-trash-2"><path d="M10 11v6" /><path d="M14 11v6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg></span>
                                &nbsp;&nbsp;&nbsp;{file.name}
                            </td>
                            <td>{formatSize(file.size)}</td>
                            <td>{new Date(file.created_at + 'Z').toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}</td>
                            <td onClick={() => viewFile(file.id)} style={{ cursor: 'pointer' }}>View</td>
                        </tr>
                    )))
                    }
                </tbody>
            </table>
        </div>
    )
}