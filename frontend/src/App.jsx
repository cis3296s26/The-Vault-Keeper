import { useEffect, useState } from "react"
import { getFiles } from "./api/files"
import { FileTable } from "./components/FileTable"
import { FileUpload } from "./components/FileUpload"
import './App.css'

function App() {
  const [files, setFiles] = useState([])

  // Gets files using the api and stores them in files
  const fetchFiles = () => {
      getFiles().then(data => setFiles(data))
  }

  // Run once pattern that executes fetchFiles, populating files
  useEffect(() => {
    fetchFiles();
  }, [])

  return (
    <div>
      <nav id="nav">
        <div id="nav-title-container">
          <h1 className="nav-title">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-lock-keyhole-icon lucide-lock-keyhole"><circle cx="12" cy="16" r="1"/><rect x="3" y="10" width="18" height="12" rx="2"/><path d="M7 10V7a5 5 0 0 1 10 0v3"/></svg>
            Vault Keeper</h1>
        </div>
        <div id="nav-link-container">
          <p>Link 1</p>
          <p>Link 2</p>
          <p>Link 3</p>
        </div>
      </nav>

      <div id="content">
        <FileUpload onRefresh={fetchFiles} />
        <FileTable files={files} onRefresh={fetchFiles} />
      </div>
        <footer id="footer">
      </footer>
    </div>
  )
}

export default App