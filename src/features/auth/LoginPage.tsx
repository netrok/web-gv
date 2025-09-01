import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material'
import * as React from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/context/AuthContext'
import { useNavigate } from 'react-router-dom'

const schema = z.object({
  username: z.string().min(1, 'Usuario requerido'),
  password: z.string().min(1, 'Contraseña requerida'),
})
type FormValues = z.infer<typeof schema>

function getErrorMessage(err: unknown): string {
  if (typeof err === 'string') return err
  if (err && typeof err === 'object') {
    const anyErr = err as any
    return anyErr?.response?.data?.detail ?? anyErr?.message ?? 'Credenciales inválidas'
  }
  return 'Credenciales inválidas'
}

export default function LoginPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema) })

  const { login } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = React.useState<string | null>(null)

  const onSubmit = async (values: FormValues) => {
    setError(null)
    try {
      await login(values.username.trim(), values.password)
      navigate('/', { replace: true })
    } catch (e) {
      setError(getErrorMessage(e))
    }
  }

  return (
    <Box
      component="main"
      sx={{
        position: 'fixed',
        inset: 0,                // top:0 right:0 bottom:0 left:0
        display: 'grid',
        placeItems: 'center',    // centra vertical/horizontal
        p: 2,
        bgcolor: 'background.default',
        zIndex: (t) => t.zIndex.modal + 1, // por encima de AppBar/Container
      }}
    >
      <Paper sx={{ p: 4, width: '100%', maxWidth: 420 }} elevation={6}>
        <Typography variant="h6" mb={2}>Iniciar sesión</Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate autoComplete="on">
          <Stack spacing={2}>
            <TextField
              label="Usuario"
              fullWidth
              autoFocus
              autoComplete="username"
              inputProps={{ autoCapitalize: 'none', spellCheck: 'false' }}
              {...register('username')}
              error={!!errors.username}
              helperText={errors.username?.message}
            />
            <TextField
              label="Contraseña"
              fullWidth
              type="password"
              autoComplete="current-password"
              {...register('password')}
              error={!!errors.password}
              helperText={errors.password?.message}
            />
            <Button type="submit" variant="contained" fullWidth disabled={isSubmitting}>
              {isSubmitting ? 'Entrando…' : 'Entrar'}
            </Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  )
}
