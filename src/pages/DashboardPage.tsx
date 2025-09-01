import { Paper, Typography, Stack, Button } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export default function DashboardPage() {
  const { user } = useAuth()

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6">Dashboard</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Bienvenido{user ? `, ${String(user.username)}` : ''} al sistema RH de GV.
      </Typography>
      <Stack direction="row" spacing={1}>
        <Button component={RouterLink} to="/empleados" variant="contained">
          Ir a Empleados
        </Button>
      </Stack>
    </Paper>
  )
}
