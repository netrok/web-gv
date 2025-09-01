import api from '@/api/client'
import type { Empleado } from './types'

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
  departamento?: string
  puesto?: string
  activo?: boolean
}

const EMPLEADOS_PATH = (import.meta.env.VITE_EMPLEADOS as string) || '/empleados/'

function normalizeList(
  data: Empleado[] | Paginated<Empleado>
): { items: Empleado[]; total?: number; next?: string | null; previous?: string | null } {
  if (Array.isArray(data)) return { items: data }
  return { items: data.results ?? [], total: data.count, next: data.next, previous: data.previous }
}

export async function fetchEmpleados(params: EmpleadosListParams = {}) {
  const { data } = await api.get<Empleado[] | Paginated<Empleado>>(EMPLEADOS_PATH, { params })
  return normalizeList(data)
}

export async function getEmpleado(id: number) {
  const { data } = await api.get<Empleado>(`${EMPLEADOS_PATH}${id}/`)
  return data
}

export async function createEmpleado(payload: Partial<Empleado> | FormData) {
  const { data } = await api.post<Empleado>(EMPLEADOS_PATH, payload, {
    headers: payload instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
  })
  return data
}

export async function updateEmpleado(id: number, payload: Partial<Empleado> | FormData) {
  const { data } = await api.put<Empleado>(`${EMPLEADOS_PATH}${id}/`, payload, {
    headers: payload instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
  })
  return data
}

export async function deleteEmpleado(id: number) {
  await api.delete(`${EMPLEADOS_PATH}${id}/`)
}
