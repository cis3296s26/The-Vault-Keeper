import * as React from 'react';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import { deleteFile } from '../api/files';
import DeleteModal from './DeleteModal';
// decryptFile is used by handleView to decrypt password-protected files on download
import { decryptFile } from '../utils/crypto';

// BASE_URL is defined here because handleView fetches directly instead of going through files.js
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const columns = [
  { id: 'delete', label: '', minWidth: 30 },
  { id: 'name', label: 'Name', minWidth: 170 },
  { id: 'size', label: 'Size', minWidth: 100, format: (value) => formatSize(value) },
  {
    id: 'created_at',
    label: 'Uploaded',
    minWidth: 100,
    format: (value) => new Date(value + 'Z').toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  },
  { id: 'view', label: '', minWidth: 30 },
];

export default function FileTable({ files, onRefresh }) {
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  // Deletes file then refreshes the files list
  const handleDelete = async (fileId) => {
    await deleteFile(fileId)
    onRefresh()
  }

  // Replaces the old viewFile() call to handle both protected and unprotected files.
  // For protected files: fetches encrypted bytes, prompts for password, decrypts
  // client-side using AES-GCM, then triggers a download via a temporary blob URL.
  // For unprotected files: opens the download URL directly in a new tab.
  const handleView = async (file) => {
    // The /view endpoint returns the download URL plus is_protected, salt, and iv
    const meta = await fetch(`${BASE_URL}/api/files/view/${file.id}`).then(r => r.json())

    if (meta.is_protected) {
      const password = prompt('Enter file password:')
      if (!password) return

      // Download the raw encrypted bytes from the server
      const res = await fetch(`${BASE_URL}${meta.url}`)
      const encrypted = await res.arrayBuffer()

      // Attempt decryption -- AES-GCM will throw if the password is wrong
      let decrypted
      try {
        decrypted = await decryptFile(encrypted, password, meta.salt, meta.iv)
      } catch {
        alert('Incorrect password or corrupted file.')
        return
      }

      // Create a temporary URL for the decrypted bytes and trigger a download,
      // then immediately revoke the URL to free memory
      const url = URL.createObjectURL(new Blob([decrypted]))
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      a.click()
      URL.revokeObjectURL(url)
    } else {
      window.open(`${BASE_URL}${meta.url}`, '_blank')
    }
  }

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer sx={{ maxHeight: 440 }}>
        <Table stickyHeader aria-label="sticky table">
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align}
                  style={{ minWidth: column.minWidth }}
                >
                  {column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {files
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((row) => {
                return (
                  <TableRow hover role="checkbox" tabIndex={-1} key={row.code}>
                    {columns.map((column) => {
                        if (column.id === 'delete') {
                          return (
                            <TableCell key="delete">
                              <DeleteModal handleDelete={() => handleDelete(row.id)} />
                            </TableCell>
                          )
                        }
                        // View cell calls handleView instead of the old viewFile() helper
                        // so that password-protected files are decrypted before download
                        if (column.id === 'view') {
                          return (
                            <TableCell key="view" sx={{ cursor: 'pointer' }} onClick={() => handleView(row)}>
                              View
                            </TableCell>
                          )
                        }
                        const value = row[column.id]
                        return (
                          <TableCell key={column.id} align={column.align}>
                            {column.format ? column.format(value) : value}
                          </TableCell>
                        )
                    })}
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[10, 25, 100]}
        component="div"
        count={files.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
}
