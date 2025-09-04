import api from '@/api/client'
import type { Empleado } from './types'

/* ---------- Tipos auxiliares ---------- */
type Paginated<T> = {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export type EmpleadosListParams = {
  page?: number
  page_size?: number
  search?: string
  ordering?: string
  departamento?: number | string
  puesto?: number | string
  activo?: boolean
}

export type EmpleadosList = {
  items: Empleado[]
  total?: number
  next?: string | null
  previous?: string | null
}

/* ---------- Config ---------- */
export const EMPLEADOS_PATH =
  (import.meta.env.VITE_EMPLEADOS as string) || '/v1/empleados/'

/* ---------- Normalización ---------- */
function normalizeList(data: Empleado[] | Paginated<Empleado>): EmpleadosList {
  if (Array.isArray(data)) return { items: data }
  return {
    items: data.results ?? [],
    total: data.count,
    next: data.next,
    previous: data.previous,
  }
}

/* ---------- Lecturas ---------- */
export async function fetchEmpleados(
  params: EmpleadosListParams = {}
): Promise<EmpleadosList> {
  const { data } = await api.get<Empleado[] | Paginated<Empleado>>(EMPLEADOS_PATH, { params })
  return normalizeList(data)
}

export async function fetchEmpleadoById(id: number | string): Promise<Empleado> {
  const { data } = await api.get<Empleado>(`${EMPLEADOS_PATH}${id}/`)
  return data
}

// Alias por compatibilidad
export const getEmpleado = fetchEmpleadoById

/* ---------- Escrituras ---------- */
/** Shape para crear/editar. Ajusta campos opcionales según tu backend */
export type EmpleadoCreate = {
  num_empleado: string
  nombres: string
  apellido_paterno: string
  apellido_materno?: string | null

  /** FIX: agregado para evitar TS2353 */
  fecha_nacimiento: string | Date

  genero?: string
  estado_civil?: string | null
  curp?: string | null
  rfc?: string | null
  nss?: string | null

  /** Alineado a tu modelo */
  telefono?: string | null
  email?: string | null

  /** Generalmente el backend espera IDs */
  departamento_id?: number
  puesto_id?: number

  /** Acepta Date o string YYYY-MM-DD */
  fecha_ingreso?: string | Date

  activo?: boolean

  /** Direcciones / bancos (opcionales) */
  calle?: string
  numero?: string
  colonia?: string
  municipio?: string
  estado?: string
  cp?: string
  banco?: string
  cuenta?: string

  /** Archivos */
  foto?: File | null

  /** Soporta tus campos *_nombre si tu UI los usa temporalmente */
  departamento_nombre?: string
  puesto_nombre?: string
  turno_nombre?: string
  horario_nombre?: string
}

/* --- helpers JSON/FormData auto --- */
function hasFileLike(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return false
  for (const v of Object.values(obj as Record<string, unknown>)) {
    if (v instanceof File || v instanceof Blob) return true
    if (Array.isArray(v) && v.some(x => x instanceof File || x instanceof Blob)) return true
  }
  return false
}

/** Convierte Date a 'YYYY-MM-DD' en shallow props */
function normalizeForSubmit<T extends Record<string, any>>(payload: T): T {
  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(payload)) {
    if (v instanceof Date) {
      out[k] = v.toISOString().slice(0, 10)
    } else {
      out[k] = v
    }
  }
  return out as T
}

function toFormData(payload: Record<string, any>): FormData {
  const fd = new FormData()
  for (const [k, raw] of Object.entries(payload)) {
    const v = raw instanceof Date ? raw.toISOString().slice(0, 10) : raw
    if (v === undefined || v === null) continue
    if (v instanceof File || v instanceof Blob) {
      fd.append(k, v)
    } else if (Array.isArray(v)) {
      v.forEach(item => {
        if (item !== undefined && item !== null) {
          const val = item instanceof Date ? item.toISOString().slice(0, 10) : item
          fd.append(k, val instanceof Blob ? val : String(val))
        }
      })
    } else if (typeof v === 'boolean' || typeof v === 'number') {
      fd.append(k, String(v))
    } else {
      fd.append(k, v)
    }
  }
  return fd
}

/* --- CREATE --- */
export async function createEmpleado(
  input: EmpleadoCreate | FormData
): Promise<Empleado> {
  const body =
    input instanceof FormData
      ? input
      : hasFileLike(input)
      ? toFormData(normalizeForSubmit(input as any))
      : normalizeForSubmit(input as any)

  const { data } = await api.post<Empleado>(EMPLEADOS_PATH, body, {
    headers: body instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
  })
  return data
}

/* --- UPDATE --- */
export async function updateEmpleado(
  id: number | string,
  input: Partial<EmpleadoCreate> | FormData
): Promise<Empleado> {
  const body =
    input instanceof FormData
      ? input
      : hasFileLike(input)
      ? toFormData(normalizeForSubmit(input as any))
      : normalizeForSubmit(input as any)

  const { data } = await api.put<Empleado>(`${EMPLEADOS_PATH}${id}/`, body, {
    headers: body instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
  })
  return data
}

/* --- DELETE --- */
export async function deleteEmpleado(id: number | string): Promise<void> {
  await api.delete(`${EMPLEADOS_PATH}${id}/`)
}
