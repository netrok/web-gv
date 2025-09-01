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

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL as string,
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

    if (!original || !status) return Promise.reject(error)

    if (status === 401 && !original._retry) {
      const refreshToken = getRefreshToken()
      if (!refreshToken) {
        clearTokens()
        window.location.replace('/login')
        return Promise.reject(error)
      }

      // Ya hay un refresh en curso: encola este request
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

      // Lanza refresh
      original._retry = true
      isRefreshing = true
      try {
        const refreshPath = import.meta.env.VITE_JWT_REFRESH as string
        const refreshUrl = new URL(refreshPath, import.meta.env.VITE_API_URL as string).toString()

        const { data } = await axios.post<RefreshResponse>(refreshUrl, { refresh: refreshToken })
        const newAccess = data.access ?? data.access_token
        if (!newAccess) throw new Error('No se recibió access token en el refresh.')

        setTokens(newAccess)
        // Despierta a los que esperaban
        pendingQueue.forEach((p) => p.resolve(newAccess))
        pendingQueue = []

        setAuthHeader(original, newAccess)
        return api(original)
      } catch (e) {
        pendingQueue.forEach((p) => p.reject(e))
        pendingQueue = []
        clearTokens()
        window.location.replace('/login')
        return Promise.reject(e)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api
