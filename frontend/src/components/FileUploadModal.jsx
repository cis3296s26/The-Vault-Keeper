import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Modal from '@mui/material/Modal';
import '../styles/Modal.css'
import { useState, useRef } from "react"
// encryptFile replaces the plain uploadFile helper so files can be encrypted before sending
import { encryptFile } from '../utils/crypto';

// BASE_URL is defined here because uploads are sent directly via fetch instead of files.js
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};

export default function FileUploadModal({ onRefresh }) {
  const [open, setOpen] = React.useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  // selectedFiles is an array instead of a single file to support multi-file upload
  const [selectedFiles, setSelectedFiles] = useState([])
  const [password, setPassword] = useState('')
  const [protect, setProtect] = useState(false)
  const fileInputRef = useRef(null)

  // Uploads all selected files and resets the form.
  // Each file is sent in its own POST request so the existing single-file endpoint is reused.
  // Promise.all runs all uploads concurrently and waits for every one to finish before
  // calling onRefresh, so the table always shows the complete set of new files.
  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      alert('Please select a file first!')
      return
    }

    // uploadOne handles one file: encrypts it first if password protection is on,
    // then sends a POST with the file (and salt + iv if encrypted)
    const uploadOne = async (file) => {
      const formData = new FormData()
      if (protect && password) {
        // Each file gets its own random salt and IV so encryption is independent
        // even though all files in the batch share the same password
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

    try {
      await Promise.all(selectedFiles.map(uploadOne))
      // Reset all state after a successful upload
      setSelectedFiles([])
      setPassword('')
      setProtect(false)
      fileInputRef.current.value = ''
      onRefresh()
      handleClose()
    } catch (err) {
      console.error(err)
      alert('Upload failed. Please try again.')
    }
  }

  return (
    <div>
      <Button variant="contained" onClick={handleOpen}>Upload File+</Button>
      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={style}>
          <div id="modal">
            <Typography id="modal-modal-title" variant="h6" component="h2">
              Upload File
            </Typography>
            {/* multiple allows the user to select more than one file at once.
                Array.from converts the FileList to a plain array so .map() works on it. */}
            <input
              type="file"
              multiple
              ref={fileInputRef}
              onChange={(e) => setSelectedFiles(Array.from(e.target.files))}
            />
            {/* Show selected filenames so the user can confirm their selection before uploading */}
            {selectedFiles.length > 0 && (
              <ul>
                {selectedFiles.map((f, i) => (
                  <li key={i}>{f.name}</li>
                ))}
              </ul>
            )}
            {/* Password protect checkbox -- reveals the password input when checked */}
            <label>
              <input type="checkbox" checked={protect} onChange={e => setProtect(e.target.checked)} />
              {' '}Password protect
            </label>
            {protect && (
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            )}
            <div className='modal-buttons'>
              <Button variant="contained" onClick={handleClose}>Cancel</Button>
              <Button variant="contained" onClick={handleUpload}>Upload</Button>
            </div>
          </div>
        </Box>
      </Modal>
    </div>
  );
}
