import * as React from 'react'
import api from '@/api/client'
import { login as apiLogin, logout as apiLogout, parseUser, getRefreshToken, setTokens, clearTokens } from '@/api/auth'

type User = { username: string; roles: string[]; tokenExp?: number } | null

type AuthContextType = {
  user: User
  isAuthenticated: boolean
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  hasRole: (...roles: string[]) => boolean
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined)

function buildUrl(path: string, base = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api') {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return new URL(cleanPath, base.endsWith('/') ? base : `${base}/`).toString()
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshPath = import.meta.env.VITE_JWT_REFRESH as string // ej: "/token/refresh/"
  const refreshUrl = buildUrl(refreshPath)
  const refresh = getRefreshToken()
  if (!refresh) return null
  try {
    const { data } = await api.post<{ access?: string; access_token?: string; refresh?: string; refresh_token?: string }>(
      refreshUrl,
      { refresh }
    )
    const newAccess = data.access ?? data.access_token ?? null
    const newRefresh = data.refresh ?? data.refresh_token
    if (newAccess) setTokens(newAccess, newRefresh)
    return newAccess
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User>(parseUser())
  const [loading, setLoading] = React.useState(false)

  // Refresh proactivo cada 30s si faltan ≤60s
  React.useEffect(() => {
    const id = window.setInterval(async () => {
      const now = Math.floor(Date.now() / 1000)
      const exp = user?.tokenExp
      if (!exp) return
      const secondsLeft = exp - now
      if (secondsLeft <= 60) {
        const token = await refreshAccessToken()
        if (token) setUser(parseUser(token))
      }
    }, 30_000)
    return () => clearInterval(id)
  }, [user?.tokenExp])

  const login = React.useCallback(async (username: string, password: string) => {
    setLoading(true)
    try {
      const logged = await apiLogin(username, password) // setea tokens adentro
      setUser(logged)
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = React.useCallback(() => {
    apiLogout()
    clearTokens()
    setUser(null)
  }, [])

  const hasRole = React.useCallback(
    (...roles: string[]) => {
      if (!user || !user.roles?.length) return false
      const set = new Set(user.roles.map((r) => r.toLowerCase()))
      return roles.some((r) => set.has(r.toLowerCase()))
    },
    [user]
  )

  const value: AuthContextType = { user, isAuthenticated: !!user, loading, login, logout, hasRole }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext debe usarse dentro de <AuthProvider>')
  return ctx
}
