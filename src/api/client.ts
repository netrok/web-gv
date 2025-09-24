// src/api/client.ts
import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
  AxiosHeaders,
} from 'axios'

// Extiende el tipo de Axios para permitir _retry
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    _retry?: boolean
  }
}

// Base de la API: en dev usamos proxy de Vite => "/api"
// (Si algún día quieres apuntar directo a Django en LAN, pon VITE_API_URL=http://192.168.0.20:8000/api)
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api'

/** Une base y path sin usar new URL para bases relativas como "/api" */
function joinPath(base: string, path: string) {
  const b = base.endsWith('/') ? base.slice(0, -1) : base
  const p = path.startsWith('/') ? path : `/${path}`
  return `${b}${p}`
}

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: false, // si usas cookies httpOnly, pon true y configura CORS en Django
})

const STORAGE = {
  access: 'access_token',
  refresh: 'refresh_token',
} as const

let isRefreshing = false
let pendingQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = []

function getAccessToken() {
  return localStorage.getItem(STORAGE.access) || ''
}
function getRefreshToken() {
  return localStorage.getItem(STORAGE.refresh) || ''
}
function setTokens(access: string, refresh?: string) {
  localStorage.setItem(STORAGE.access, access)
  if (refresh) localStorage.setItem(STORAGE.refresh, refresh)
}
function clearTokens() {
  localStorage.removeItem(STORAGE.access)
  localStorage.removeItem(STORAGE.refresh)
}

/** Asegura que headers sea AxiosHeaders y setea Authorization sin romper tipos */
function setAuthHeader(cfg: InternalAxiosRequestConfig, token: string) {
  if (!(cfg.headers instanceof AxiosHeaders)) {
    cfg.headers = new AxiosHeaders(cfg.headers as any)
  }
  (cfg.headers as AxiosHeaders).set('Authorization', `Bearer ${token}`)
}

// Inyecta el access token en cada request si existe
api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) setAuthHeader(config, token)
  return config
})

type RefreshResponse = {
  access?: string
  access_token?: string
  refresh?: string
  refresh_token?: string
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig | undefined
    const status = error.response?.status

    // Si no hay config o status (e.g., error de red), no intentamos refresh
    if (!original || !status) return Promise.reject(error)

    // Solo manejamos 401 no reintentado
    if (status === 401 && !original._retry) {
      const refreshToken = getRefreshToken()
      if (!refreshToken) {
        clearTokens()
        window.location.replace('/login')
        return Promise.reject(error)
      }

      // Si ya hay un refresh en curso, encola este request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({
            resolve: (newToken: string) => {
              setAuthHeader(original, newToken)
              resolve(api(original))
            },
            reject,
          })
        })
      }

      // Marca como reintento y lanza refresh
      original._retry = true
      isRefreshing = true

      try {
        const refreshPath = import.meta.env.VITE_JWT_REFRESH as string // p.ej. "/token/refresh/"
        const refreshUrl = joinPath(API_BASE, refreshPath)

        const { data } = await axios.post<RefreshResponse>(refreshUrl, { refresh: refreshToken })
        const newAccess = data.access ?? data.access_token
        const newRefresh = data.refresh ?? data.refresh_token

        if (!newAccess) throw new Error('No se recibió access token en el refresh.')

        // Guarda tokens (si viene refresh nuevo, se actualiza)
        setTokens(newAccess, newRefresh)

        // Despierta a los que esperaban
        pendingQueue.forEach((p) => p.resolve(newAccess))
        pendingQueue = []

        // Reintenta la petición original con el nuevo token
        setAuthHeader(original, newAccess)
        return api(original)
      } catch (e) {
        // Falla el refresh: limpia y manda a login
        pendingQueue.forEach((p) => p.reject(e))
        pendingQueue = []
        clearTokens()
        window.location.replace('/login')
        return Promise.reject(e)
      } finally {
        isRefreshing = false
      }
    }

    // Cualquier otro error se propaga
    return Promise.reject(error)
  }
)

export default api
