import { useEffect, useState } from "react"

function App() {
  const [files, setFiles] = useState([])

  useEffect(() => {
    fetch("http://localhost:8000/api/files/")
      .then(res => res.json())
      .then(data => {
        console.log(data)
        setFiles(data)
      })
  }, [])

  return (
    <div>
      {files.map(file => (
        <div key={file.id}>{file.name}</div>
      ))}
    </div>
  )
}

export default App