import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Modal from '@mui/material/Modal';
import '../styles/Modal.css'
import { useState, useRef } from "react"
import { uploadFile } from '../api/files';

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
  const [selectedFile, setSelectedFile] = useState(null)
  const fileInputRef = useRef(null)

  // Uploads file and reset file input
  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select a file first!')
      return
    }
    try {
      await uploadFile(selectedFile)
      setSelectedFile(null)
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
                <input type="file" ref={fileInputRef} onChange={(e) => setSelectedFile(e.target.files[0])} />
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
