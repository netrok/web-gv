import { AppBar, Box, Button, Container, Toolbar, Typography } from '@mui/material'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

type Props = { children?: React.ReactNode }

export default function AppLayout({ children }: Props) {
  const { isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isAuthRoute = location.pathname === '/login' // ⬅️ detecta login

  if (isAuthRoute) {
    // Vista full-screen centrada sin AppBar ni Container
    return (
      <Box
        sx={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
          bgcolor: 'background.default',
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 480 }}>{children}</Box>
      </Box>
    )
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            GV RH
          </Typography>
          <Button component={RouterLink} to="/" color="inherit">Inicio</Button>
          {isAuthenticated && (
            <Button component={RouterLink} to="/empleados" color="inherit">Empleados</Button>
          )}
          {isAuthenticated ? (
            <Button color="inherit" onClick={handleLogout}>Salir</Button>
          ) : (
            <Button component={RouterLink} to="/login" color="inherit">Entrar</Button>
          )}
        </Toolbar>
      </AppBar>
      <Container sx={{ py: 3 }}>{children}</Container>
    </Box>
  )
}
