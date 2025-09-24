// src/api/auth.ts
import api from './client'
import { jwtDecode } from 'jwt-decode'
import type { JwtPayload, Role } from '@/types/auth'

const STORAGE = {
  access: 'access_token',
  refresh: 'refresh_token',
} as const

type LoginResponse =
  | { access: string; refresh: string }
  | { access_token: string; refresh_token: string }
  | Record<string, unknown>

// Base de API: en dev usamos proxy de Vite => "/api"
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api'

/** Une base y path sin usar new URL para bases relativas como "/api" */
function joinPath(base: string, path: string) {
  const b = base.endsWith('/') ? base.slice(0, -1) : base
  const p = path.startsWith('/') ? path : `/${path}`
  return `${b}${p}` // ej: "/api" + "/token/" => "/api/token/"
}

export async function login(username: string, password: string) {
  const loginPath = import.meta.env.VITE_JWT_LOGIN as string // p.ej. "/token/"
  const loginUrl = joinPath(API_BASE, loginPath)

  // Si tu backend usa "email" en lugar de "username", cambia la clave aquí:
  const payload = { username, password }

  const { data } = await api.post<LoginResponse>(loginUrl, payload)

  const access = (data as any).access ?? (data as any).access_token
  const refresh = (data as any).refresh ?? (data as any).refresh_token

  if (!access || !refresh) {
    throw new Error('El servidor no devolvió tokens válidos.')
  }

  setTokens(access, refresh)
  return parseUser(access)
}

export function logout() {
  clearTokens()
  // opcional: redirigir al login
  // window.location.replace('/login')
}

export function getAccessToken(): string | null {
  return localStorage.getItem(STORAGE.access)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(STORAGE.refresh)
}

export function setTokens(access: string, refresh?: string) {
  localStorage.setItem(STORAGE.access, access)
  if (refresh) localStorage.setItem(STORAGE.refresh, refresh)
}

export function clearTokens() {
  localStorage.removeItem(STORAGE.access)
  localStorage.removeItem(STORAGE.refresh)
}

export function parseUser(accessToken?: string) {
  const token = accessToken || getAccessToken()
  if (!token) return null
  try {
    const payload = jwtDecode<JwtPayload>(token)
    const roles = (payload.roles || []) as (Role | string)[]
    return {
      username: (payload as any).username || (payload as any).email || payload.sub || 'user',
      roles: roles.map(String) as Role[],
      tokenExp: payload.exp,
    }
  } catch {
    return null
  }
}

/** ¿El access token ya caducó? (con margen de gracia en segundos) */
export function isAccessTokenExpired(graceSeconds = 30) {
  const token = getAccessToken()
  if (!token) return true
  try {
    const { exp } = jwtDecode<JwtPayload>(token)
    const now = Math.floor(Date.now() / 1000)
    return !exp || exp < now + graceSeconds
  } catch {
    return true
  }
}
