// src/features/empleados/api.ts
import api from '@/api/client'
import type { Empleado, Genero, EstadoCivil } from './types'

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
/** Payload para crear/editar. Ajusta nullables según tu backend */
export type EmpleadoCreate = {
  // Requeridos mínimos
  num_empleado: string
  nombres: string
  apellido_paterno: string
  fecha_nacimiento: string | Date

  // Personales
  apellido_materno?: string | null
  genero?: Genero | null                // 'M' | 'F' | 'O'
  estado_civil?: EstadoCivil | null     // 'soltero'|'casado'|'union_libre'|'divorciado'|'viudo'
  escolaridad?: string | null           // texto libre (no choices en el modelo)
  curp?: string | null
  rfc?: string | null
  nss?: string | null

  // Contacto
  telefono?: string | null
  celular?: string | null
  email?: string | null

  // Contacto de emergencia
  contacto_emergencia_nombre?: string | null
  contacto_emergencia_parentesco?: string | null
  contacto_emergencia_telefono?: string | null

  // Relaciones (IDs reales)
  departamento_id?: number | null
  puesto_id?: number | null
  turno_id?: number | null
  horario_id?: number | null

  // Laboral
  fecha_ingreso?: string | Date | null
  sueldo?: number | string | null
  tipo_contrato?: string | null         // 'determinado'|'indeterminado'|'obra'
  tipo_jornada?: string | null          // 'diurna'|'mixta'|'nocturna'
  activo?: boolean

  // Dirección
  calle?: string | null
  numero?: string | null
  colonia?: string | null
  municipio?: string | null
  estado?: string | null
  cp?: string | null

  // Bancarios
  banco?: string | null
  cuenta?: string | null
  clabe?: string | null

  // Otros
  notas?: string | null

  // Archivos
  foto?: File | null

  /** Labels temporales usados por la UI (no enviarlos si tu API no los acepta) */
  departamento_nombre?: string
  puesto_nombre?: string
  turno_nombre?: string
  horario_nombre?: string

  /** Opcionales de display que podría enviar el API (no enviar) */
  genero_display?: string | null
  estado_civil_display?: string | null
  escolaridad_display?: string | null
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

/** Convierte Date a 'YYYY-MM-DD' (shallow) y limpia UI-only fields */
const UI_ONLY_KEYS = new Set([
  'departamento_nombre',
  'puesto_nombre',
  'turno_nombre',
  'horario_nombre',
  'genero_display',
  'estado_civil_display',
  'escolaridad_display',
])

function normalizeForSubmit<T extends Record<string, any>>(payload: T): T {
  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(payload)) {
    if (UI_ONLY_KEYS.has(k)) continue
    let val = v
    if (val instanceof Date) val = val.toISOString().slice(0, 10)

    // Alineado con el modelo:
    if (k === 'genero' && typeof val === 'string') val = val.toUpperCase()      // 'M'|'F'|'O'
    if ((k === 'estado_civil' || k === 'tipo_contrato' || k === 'tipo_jornada') && typeof val === 'string') {
      val = val.toLowerCase()                                                   // backend espera minúsculas
    }
    // escolaridad: texto libre → no tocar casing

    out[k] = val
  }
  return out as T
}

function toFormData(payload: Record<string, any>): FormData {
  const fd = new FormData()
  for (const [k, raw] of Object.entries(payload)) {
    if (UI_ONLY_KEYS.has(k)) continue
    let v = raw
    if (v === undefined || v === null) continue
    if (v instanceof Date) v = v.toISOString().slice(0, 10)

    if (k === 'genero' && typeof v === 'string') v = v.toUpperCase()
    if ((k === 'estado_civil' || k === 'tipo_contrato' || k === 'tipo_jornada') && typeof v === 'string') {
      v = v.toLowerCase()
    }

    if (v instanceof File || v instanceof Blob) {
      fd.append(k, v)
    } else if (Array.isArray(v)) {
      v.forEach(item => {
        if (item !== undefined && item !== null) {
          let val = item
          if (val instanceof Date) val = val.toISOString().slice(0, 10)
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

/* --- CREATE (POST) --- */
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

/* --- UPDATE (PUT) --- */
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

/* --- PATCH (parcial) --- */
export async function patchEmpleado(
  id: number | string,
  input: Partial<EmpleadoCreate> | FormData
): Promise<Empleado> {
  const body =
    input instanceof FormData
      ? input
      : hasFileLike(input)
      ? toFormData(normalizeForSubmit(input as any))
      : normalizeForSubmit(input as any)

  const { data } = await api.patch<Empleado>(`${EMPLEADOS_PATH}${id}/`, body, {
    headers: body instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
  })
  return data
}

/* --- DELETE --- */
export async function deleteEmpleado(id: number | string): Promise<void> {
  await api.delete(`${EMPLEADOS_PATH}${id}/`)
}
