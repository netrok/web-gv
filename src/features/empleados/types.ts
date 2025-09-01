export interface Empleado {
  id: number
  num_empleado: string
  nombres: string
  apellido_paterno: string
  apellido_materno: string

  fecha_nacimiento: string
  genero: string
  genero_display?: string
  estado_civil: string
  estado_civil_display?: string

  curp: string
  rfc: string
  nss: string

  telefono: string
  celular: string
  email: string

  calle: string
  numero: string
  colonia: string
  municipio: string
  estado: string
  cp: string

  departamento_id: number
  departamento_nombre: string
  puesto_id: number
  puesto_nombre: string
  turno_id: number
  turno_nombre: string
  horario_id: number
  horario_nombre: string

  fecha_ingreso: string
  activo: boolean
  sueldo: string | number
  tipo_contrato: string
  tipo_jornada: string
  banco: string
  clabe: string
  cuenta: string

  contacto_emergencia_nombre: string
  contacto_emergencia_parentesco: string
  contacto_emergencia_telefono: string

  escolaridad: string
  notas: string
  foto: string | null
  foto_url?: string | null

  created_at: string
  updated_at: string
  deleted_at: string | null
}
