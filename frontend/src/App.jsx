import Layout from "./components/Layout"
import './App.css'
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material'

const theme = createTheme({
  colorSchemes: {
    light: {
      palette: {
        primary: {
          main: '#743882',
        },
      },
    },
    dark: {
      palette: {
        primary: {
          main: '#743882',
        },
      },
    },
  },
  components: {
    MuiTableCell: {
      styleOverrides: {
        head: {
          backgroundColor: '#743882',
          color: '#fff',
        },
      },
    },
  },
})


function App() {
  return (
    <div>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Layout />
      </ThemeProvider>
    </div>
  )
}

export default App