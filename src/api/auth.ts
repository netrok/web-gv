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

export async function login(username: string, password: string) {
  const loginUrl = import.meta.env.VITE_JWT_LOGIN as string
  const { data } = await api.post<LoginResponse>(loginUrl, { username, password })

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
      username: payload.username || payload.email || payload.sub || 'user',
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
