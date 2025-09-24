import * as React from 'react'
import useAuth from './useAuth'
import { Navigate, useLocation } from 'react-router-dom'

type Props = { roles?: string[]; redirectTo?: string; children: React.ReactNode }

export default function RequireRole({ roles, redirectTo = '/login', children }: Props) {
  const { isAuthenticated, hasRole } = useAuth()
  const location = useLocation()
  if (!isAuthenticated) return <Navigate to={redirectTo} replace state={{ from: location }} />
  if (roles && roles.length > 0 && !hasRole(...roles)) return <Navigate to={redirectTo} replace />
  return <>{children}</>
}
