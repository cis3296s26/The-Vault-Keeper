import { useEffect, useState } from "react"
import { getFiles } from "../api/files"
import FileTable from "../components/FileTable"
import FileUploadModal from "../components/FileUploadModal"
import '../styles/FilesPage.css'
import { TextField } from "@mui/material"

function FilesPage() {
  const [files, setFiles] = useState([])
  const [search, setSearch] = useState('')

  // Gets files using the api and stores them in files
  const fetchFiles = () => {
      getFiles().then(data => setFiles(data))
  }

  const filteredFiles = files.filter(file => 
    file.name.toLowerCase().includes(search.toLowerCase())
  )

  // Run once pattern that executes fetchFiles, populating files
  useEffect(() => {
    fetchFiles();
  }, [])

  return (
    <div id="FilesPage">
        <h2>Documents</h2>
        <div className="files-table-actions">
            <TextField id="outlined-basic" label="Search Documents" variant="outlined" size="small" onChange={(e) => setSearch(e.target.value)} />
            <FileUploadModal onRefresh={fetchFiles} />
        </div>
        <FileTable files={filteredFiles} onRefresh={fetchFiles} />
    </div>
  )
}

export default FilesPage