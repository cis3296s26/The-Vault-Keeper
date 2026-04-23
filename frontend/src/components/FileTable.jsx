import * as React from 'react';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import IconButton from '@mui/material/IconButton'
import DeleteIcon from '@mui/icons-material/Delete'
import { viewFile, deleteFile } from '../api/files';
import DeleteModal from './DeleteModal';

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
                        if (column.id === 'view') {
                        return (
                            <TableCell key="view" sx={{ cursor: 'pointer' }} onClick={() => viewFile(row.id)}>
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
