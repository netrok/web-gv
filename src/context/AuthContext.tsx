import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { login as apiLogin, logout as apiLogout, parseUser, getAccessToken } from '@/api/auth'
import type { Role } from '@/types/auth'

type User = { username: string | number; roles: Role[]; tokenExp: number } | null

interface AuthCtx {
  user: User
  isAuthenticated: boolean
  login: (u: string, p: string) => Promise<void>
  logout: () => void
  hasRole: (...roles: Role[]) => boolean
}

const AuthContext = createContext<AuthCtx | null>(null)

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<User>(parseUser())

  useEffect(() => {
    const token = getAccessToken()
    if (token) setUser(parseUser(token))
  }, [])

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      isAuthenticated: !!user,
      async login(username, password) {
        const u = await apiLogin(username, password)
        setUser(u)
      },
      logout() {
        apiLogout()
        setUser(null)
      },
      hasRole(...roles: Role[]) {
        if (!user) return false
        if (roles.length === 0) return true
        return user.roles?.some((r) => roles.includes(r as Role)) ?? false
      },
    }),
    [user]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
