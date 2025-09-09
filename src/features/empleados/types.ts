// src/features/empleados/types.ts

// Fechas
export type ISODate = string;      // 'YYYY-MM-DD'
export type ISODateTime = string;  // ISO 8601 completo

// Catálogos (valores que acepta el backend)
export type Genero = 'M' | 'F' | 'O';
export type EstadoCivil = 'soltero' | 'casado' | 'union_libre' | 'divorciado' | 'viudo';

// Para UI: sugerencias de escolaridad (el backend NO tiene choices, es texto libre)
export type Escolaridad = string;

export const GENEROS: ReadonlyArray<{ value: Genero; label: string }> = [
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Femenino' },
  { value: 'O', label: 'Otro' },
];

export const ESTADOS_CIVILES: ReadonlyArray<{ value: EstadoCivil; label: string }> = [
  { value: 'soltero',      label: 'Soltero(a)' },
  { value: 'casado',       label: 'Casado(a)' },
  { value: 'union_libre',  label: 'Unión libre' },
  { value: 'divorciado',   label: 'Divorciado(a)' },
  { value: 'viudo',        label: 'Viudo(a)' },
];

// Catálogo de escolaridad para SELECT (solo sugerencias de UI)
export const ESCOLARIDADES: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'PRIMARIA',     label: 'Primaria' },
  { value: 'SECUNDARIA',   label: 'Secundaria' },
  { value: 'BACHILLERATO', label: 'Bachillerato/Preparatoria' },
  { value: 'TSU',          label: 'TSU / Técnico' },
  { value: 'LICENCIATURA', label: 'Licenciatura/Ingeniería' },
  { value: 'MAESTRIA',     label: 'Maestría' },
  { value: 'DOCTORADO',    label: 'Doctorado' },
];

// Modelo principal (alineado a tu API)
export interface Empleado {
  id: number;
  num_empleado: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string | null;

  /** Puede venir null en tu modelo */
  fecha_nacimiento: ISODate | null;

  genero: Genero | null;
  genero_display?: string | null;

  /** Backend usa minúsculas */
  estado_civil: EstadoCivil | null;
  estado_civil_display?: string | null;

  curp: string | null;
  rfc: string | null;
  nss: string | null;

  telefono: string | null;
  celular: string | null;
  email: string | null;

  // Dirección
  calle: string | null;
  numero: string | null;
  colonia: string | null;
  municipio: string | null;
  estado: string | null;
  cp: string | null;

  // Relaciones (tu front usa *_id + labels para UI)
  departamento_id: number | null;
  departamento_nombre?: string | null;
  puesto_id: number | null;
  puesto_nombre?: string | null;
  turno_id: number | null;
  turno_nombre?: string | null;
  horario_id: number | null;
  horario_nombre?: string | null;

  /** 'YYYY-MM-DD' o null */
  fecha_ingreso: ISODate | null;
  activo: boolean;

  /** Decimal en DRF puede venir como string */
  sueldo: number | string | null;

  /** Choices en el backend: 'determinado' | 'indeterminado' | 'obra' */
  tipo_contrato: string | null;

  /** Choices en el backend: 'diurna' | 'mixta' | 'nocturna' */
  tipo_jornada: string | null;

  // Bancarios
  banco: string | null;
  clabe: string | null;
  cuenta: string | null;

  // Contacto de emergencia
  contacto_emergencia_nombre: string | null;
  contacto_emergencia_parentesco: string | null;
  contacto_emergencia_telefono: string | null;

  // Texto libre
  escolaridad: Escolaridad | null;

  notas: string | null;

  // Archivos
  foto: string | null;        // nombre/ruta almacenada
  foto_url?: string | null;   // URL absoluta (si el API la expone)

  // Metadatos
  created_at: ISODateTime;
  updated_at: ISODateTime;
  deleted_at: ISODateTime | null;
}
