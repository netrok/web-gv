// src/routes/RequireRole.tsx
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import type { Role } from '@/types/auth'

type Props = {
  roles?: Role[]
  redirectTo?: string
}

export default function RequireRole({ roles = [], redirectTo = '/' }: Props) {
  const { isAuthenticated, hasRole } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  const allowed = roles.length === 0 || hasRole(...roles)
  return allowed ? (
    <Outlet />
  ) : (
    <Navigate to={redirectTo} replace state={{ from: location, reason: 'forbidden' }} />
  )
}
