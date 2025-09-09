// src/features/empleados/EmpleadoEditPage.tsx
import * as React from 'react'
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import api from '@/api/client'

import {
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  LinearProgress,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
  MenuItem,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SaveIcon from '@mui/icons-material/Save'
import CloseIcon from '@mui/icons-material/Close'
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore'
import NavigateNextIcon from '@mui/icons-material/NavigateNext'
import UploadFileIcon from '@mui/icons-material/UploadFile'

import type { Empleado, Genero, EstadoCivil, Escolaridad } from './types'
import { GENEROS, ESTADOS_CIVILES, ESCOLARIDADES } from './types'
import { fetchEmpleadoById, patchEmpleado } from './api'
import type { EmpleadoCreate } from './api'

// Validadores y normalizadores compartidos
import {
  RE_CURP,
  RE_RFC,
  RE_NSS,
  RE_CLABE,
  RE_CUENTA,
  RE_PHONE10,
  RE_CP_MX,
  patternAttr,
  toUpperOnBlur,
  stripSpacesDashesOnBlur,
} from './validators'

const steps = ['Identificación', 'Laboral', 'Contacto y dirección', 'Bancarios & Confirmación']

/* ---------- Helpers de normalización ---------- */
const normKeyUpper = (s?: string) =>
  (s ?? '')
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .trim().replace(/\s+/g, '_').toUpperCase()

const normKeyLower = (s?: string) =>
  (s ?? '')
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .trim().replace(/\s+/g, '_').toLowerCase()

const GENERO_VALUES = GENEROS.map(o => o.value) as ReadonlyArray<Genero>
const CIVIL_VALUES  = ESTADOS_CIVILES.map(o => o.value) as ReadonlyArray<EstadoCivil>
const ESCOLARIDAD_VALUES = ESCOLARIDADES.map(o => o.value) as ReadonlyArray<Escolaridad>

// Backend puede traer códigos (S/C/D/V/U/UL)
const CIVIL_CODE_TO_VALUE: Record<string, EstadoCivil> = {
  S: 'soltero',
  C: 'casado',
  D: 'divorciado',
  V: 'viudo',
  U: 'union_libre',
  UL: 'union_libre',
}
const isCivilCode = (v?: string | null) => !!v && (['S','C','D','V','U','UL'] as const).includes(v as any)

const normalizeGenero = (s?: string | null): Genero | undefined => {
  if (!s) return undefined
  const k = normKeyUpper(s) as Genero
  return GENERO_VALUES.includes(k) ? k : undefined
}
const normalizeCivil = (s?: string | null): EstadoCivil | undefined => {
  if (!s) return undefined
  const raw = String(s).trim()
  if (isCivilCode(raw)) return CIVIL_CODE_TO_VALUE[raw]
  const k = normKeyLower(raw) as EstadoCivil
  return CIVIL_VALUES.includes(k) ? k : undefined
}
const normalizeEscolaridad = (s?: string | null): Escolaridad | undefined => {
  if (!s) return undefined
  const k = normKeyUpper(s) as Escolaridad
  return ESCOLARIDAD_VALUES.includes(k) ? k : undefined
}

const toOpt = (v: FormDataEntryValue | null): string | undefined => {
  const s = (v ?? '').toString().trim()
  return s ? s : undefined
}

// Omite el campo si el select está vacío o el valor no es válido
const choiceFromForm = <T extends string>(
  fd: FormData,
  name: string,
  normalizer: (v?: string | null) => T | undefined
): T | undefined => {
  const raw = (fd.get(name) ?? '').toString().trim()
  if (!raw) return undefined
  return normalizer(raw) ?? undefined
}

function formatDateForInput(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

function flattenDRFErrors(err: unknown): string {
  const data = (err as any)?.response?.data
  if (!data) return ''
  if (typeof data === 'string') return data
  if (Array.isArray(data)) return data.join('\n')
  if (typeof data === 'object') {
    return Object.entries(data)
      .map(([k, v]) =>
        `${k}: ${Array.isArray(v) ? v.join(' ') : typeof v === 'string' ? v : JSON.stringify(v)}`
      )
      .join('\n')
  }
  return String(data)
}

/* ---------- Fetch catálogos (Deptos, Puestos, Turnos, Horarios) ---------- */
type OpcionBasica = { id: number; nombre: string }
type Paginated<T> = { results?: T[] }

async function fetchOptions(path: string): Promise<OpcionBasica[]> {
  const { data } = await api.get<Paginated<OpcionBasica> | OpcionBasica[]>(path, { params: { page_size: 1000 } })
  return Array.isArray(data) ? data : (data.results ?? [])
}

/* ---------- Componente ---------- */
export default function EmpleadoEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data, isLoading, isError, error } = useQuery<Empleado, AxiosError>({
    queryKey: ['empleado', id],
    queryFn: () => fetchEmpleadoById(id!),
    enabled: !!id,
  })

  // Catálogos
  const { data: departamentos = [], isLoading: isDepsLoading } = useQuery({
    queryKey: ['departamentos'],
    queryFn: () => fetchOptions('/v1/departamentos/'),
  })
  const { data: puestos = [], isLoading: isPuestosLoading } = useQuery({
    queryKey: ['puestos'],
    queryFn: () => fetchOptions('/v1/puestos/'),
  })
  // ⬇️ NUEVO: Turnos y Horarios (solo esto se agregó)
  const { data: turnos = [], isLoading: isTurnosLoading } = useQuery({
    queryKey: ['turnos'],
    queryFn: () => fetchOptions('/v1/turnos/'),
  })
  const { data: horarios = [], isLoading: isHorariosLoading } = useQuery({
    queryKey: ['horarios'],
    queryFn: () => fetchOptions('/v1/horarios/'),
  })

  const [activeStep, setActiveStep] = React.useState(0)
  const lastStep = steps.length - 1

  const [fotoPreview, setFotoPreview] = React.useState<string | null>(null)
  const prevBlobUrl = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (!data) return
    setFotoPreview((data as any).foto_url || (data as any).foto || null)
  }, [data])

  // Limpia blob URLs
  React.useEffect(() => {
    if (fotoPreview && fotoPreview.startsWith('blob:')) {
      if (prevBlobUrl.current && prevBlobUrl.current !== fotoPreview && prevBlobUrl.current.startsWith('blob:')) {
        URL.revokeObjectURL(prevBlobUrl.current)
      }
      prevBlobUrl.current = fotoPreview
    }
    return () => {
      if (prevBlobUrl.current && prevBlobUrl.current.startsWith('blob:')) {
        URL.revokeObjectURL(prevBlobUrl.current)
      }
    }
  }, [fotoPreview])

  const { mutateAsync, isPending, isError: isSaveError, error: saveError } = useMutation({
    mutationFn: (payload: Partial<EmpleadoCreate>) => patchEmpleado(id!, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['empleados'] }).catch(() => {})
      qc.invalidateQueries({ queryKey: ['empleado', id] }).catch(() => {})
      navigate('/empleados', { replace: true, state: { flash: 'Empleado actualizado' } })
    },
  })

  const formRef = React.useRef<HTMLFormElement>(null)
  const [dirty, setDirty] = React.useState(false)
  React.useEffect(() => {
    const form = formRef.current
    if (!form) return
    const onChange = () => setDirty(true)
    form.addEventListener('change', onChange)
    return () => form.removeEventListener('change', onChange)
  }, [])

  const progress = Math.round(((activeStep + 1) / steps.length) * 100)

  function validateCurrentStep(): boolean {
    const form = formRef.current
    if (!form) return true
    const stepPanels = form.querySelectorAll<HTMLElement>('[data-step]')
    const current = stepPanels[activeStep]
    if (!current) return true
    const inputs = Array.from(current.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input,textarea,select'))
    for (const el of inputs) {
      if (!el.checkValidity()) {
        form.reportValidity()
        return false
      }
    }
    return true
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (activeStep !== lastStep) return
    if (!validateCurrentStep()) return

    const fd = new FormData(e.currentTarget)
    const fotoEntry = fd.get('foto')
    const fotoFile = fotoEntry instanceof File ? fotoEntry : null
    const includeFoto = !!(fotoFile && fotoFile.size > 0)

    const payload: Partial<EmpleadoCreate> = {
      // Identificación / personales
      num_empleado: toOpt(fd.get('num_empleado')),
      activo: fd.get('activo') === 'on',
      nombres: toOpt(fd.get('nombres')),
      apellido_paterno: toOpt(fd.get('apellido_paterno')),
      apellido_materno: toOpt(fd.get('apellido_materno')),
      fecha_nacimiento: toOpt(fd.get('fecha_nacimiento')),
      curp: toOpt(fd.get('curp')),
      rfc: toOpt(fd.get('rfc')),
      nss: toOpt(fd.get('nss')),

      // Choices
      genero: choiceFromForm(fd, 'genero', normalizeGenero),
      estado_civil: choiceFromForm(fd, 'estado_civil', normalizeCivil),
      escolaridad: choiceFromForm(fd, 'escolaridad', normalizeEscolaridad),

      // Laboral (IDs reales)
      departamento_id: (() => { const v = toOpt(fd.get('departamento_id')); return v ? Number(v) : undefined })(),
      puesto_id:       (() => { const v = toOpt(fd.get('puesto_id'));       return v ? Number(v) : undefined })(),
      // ⬇️ NUEVO: enviar turno_id y horario_id (en vez de *_nombre)
      turno_id:        (() => { const v = toOpt(fd.get('turno_id'));        return v ? Number(v) : undefined })(),
      horario_id:      (() => { const v = toOpt(fd.get('horario_id'));      return v ? Number(v) : undefined })(),
      fecha_ingreso: toOpt(fd.get('fecha_ingreso')),
      sueldo: toOpt(fd.get('sueldo')),
      tipo_contrato: toOpt(fd.get('tipo_contrato')),
      tipo_jornada: toOpt(fd.get('tipo_jornada')),

      // Contacto
      telefono: toOpt(fd.get('telefono')),
      celular: toOpt(fd.get('celular')),
      email: toOpt(fd.get('email')),
      contacto_emergencia_nombre: toOpt(fd.get('contacto_emergencia_nombre')),
      contacto_emergencia_parentesco: toOpt(fd.get('contacto_emergencia_parentesco')),
      contacto_emergencia_telefono: toOpt(fd.get('contacto_emergencia_telefono')),

      // Dirección
      calle: toOpt(fd.get('calle')),
      numero: toOpt(fd.get('numero')),
      colonia: toOpt(fd.get('colonia')),
      municipio: toOpt(fd.get('municipio')),
      estado: toOpt(fd.get('estado')),
      cp: toOpt(fd.get('cp')),

      // Bancario
      banco: toOpt(fd.get('banco')),
      cuenta: toOpt(fd.get('cuenta')),
      clabe: toOpt(fd.get('clabe')),

      // Otros
      notas: toOpt(fd.get('notas')),
    }

    if (includeFoto) payload.foto = fotoFile

    await mutateAsync(payload)
  }

  // Bloquear Enter en pasos que no sean el último
  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' && activeStep !== lastStep) e.preventDefault()
  }

  // Avanzar con protección anti “ghost click”
  const handleNext = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!validateCurrentStep()) return
    setTimeout(() => setActiveStep(s => Math.min(s + 1, lastStep)), 0)
  }

  const handleBack = () => setActiveStep(s => Math.max(s - 1, 0))

  const handleCancel = () => {
    if (dirty && !window.confirm('Hay cambios sin guardar. ¿Salir sin guardar?')) return
    navigate('/empleados', { replace: true })
  }

  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) {
      setFotoPreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setFotoPreview(url)
  }

  if (isLoading) {
    return (
      <Paper sx={{ p: 2, mx: 'auto', maxWidth: 1000 }}>
        <Typography variant="h6">Cargando empleado…</Typography>
      </Paper>
    )
  }

  if (isError || !data) {
    return (
      <Paper sx={{ p: 2, mx: 'auto', maxWidth: 1000 }}>
        <Alert severity="error">
          {`No se pudo cargar el empleado${(error as any)?.response?.status ? ` (HTTP ${(error as any).response.status})` : ''}.`}
        </Alert>
      </Paper>
    )
  }

  // defaultValue robusto para estado_civil — sin hooks
  const civilDefault: EstadoCivil | '' = (() => {
    const raw = (data as any)?.estado_civil as string | undefined
    if (!raw) return ''
    if (isCivilCode(raw)) return CIVIL_CODE_TO_VALUE[raw]
    return normKeyLower(raw) as EstadoCivil
  })()

  // ids actuales (si tu API los expone)
  const depIdDefault = (data as any).departamento ?? ''
  const puestoIdDefault = (data as any).puesto ?? ''
  const turnoIdDefault = (data as any).turno ?? ''        // ⬅️ NUEVO
  const horarioIdDefault = (data as any).horario ?? ''    // ⬅️ NUEVO

  return (
    <Paper sx={{ p: 2, mx: 'auto', maxWidth: 1000 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            type="button"
            startIcon={<ArrowBackIcon />}
            component={RouterLink}
            to={`/empleados/${id}`}
            size="small"
          >
            Volver
          </Button>
          <Typography variant="h6" component="h1">Editar empleado</Typography>
        </Stack>

        <Stack direction="row" spacing={1}>
          <Button
            type="button"
            variant="text"
            startIcon={<CloseIcon />}
            onClick={handleCancel}
            size="small"
            disabled={isPending}
          >
            Cancelar
          </Button>

          <Button
            type="button"
            variant="outlined"
            startIcon={<NavigateBeforeIcon />}
            onClick={handleBack}
            size="small"
            disabled={activeStep === 0 || isPending}
          >
            Atrás
          </Button>

          {activeStep === lastStep ? (
            <Button
              type="button"
              variant="contained"
              startIcon={<SaveIcon />}
              size="small"
              disabled={isPending}
              onClick={() => formRef.current?.requestSubmit()}
            >
              Guardar
            </Button>
          ) : (
            <Button
              type="button"
              variant="contained"
              endIcon={<NavigateNextIcon />}
              size="small"
              onClick={handleNext}
              disabled={isPending}
            >
              Siguiente
            </Button>
          )}
        </Stack>
      </Stack>

      {/* Stepper + progreso */}
      <Box sx={{ mb: 2 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map(label => (
            <Step key={label}><StepLabel>{label}</StepLabel></Step>
          ))}
        </Stepper>
        <LinearProgress variant="determinate" value={progress} sx={{ mt: 1 }} />
      </Box>

      {isSaveError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {`No se pudo guardar${(saveError as any)?.response?.status ? ` (HTTP ${(saveError as any).response.status})` : ''}.`}
          <Box component="pre" sx={{ whiteSpace: 'pre-wrap', mt: 1, fontSize: 12 }}>
            {flattenDRFErrors(saveError)}
          </Box>
        </Alert>
      )}

      {/* FORM */}
      <Box
        id="empleado-edit-form"
        component="form"
        ref={formRef}
        onSubmit={handleSubmit}
        onKeyDown={handleFormKeyDown}
        autoComplete="off"
      >
        {/* PASO 1: Identificación / Personales */}
        <StepPanel active={activeStep === 0} index={0}>
          <Grid2>
            <TextField
              name="num_empleado"
              label="Núm. empleado"
              required
              disabled={isPending}
              defaultValue={(data as any).num_empleado || ''}
            />
            <FormControlLabel
              control={<Checkbox name="activo" defaultChecked={Boolean((data as any).activo)} disabled={isPending} />}
              label="Activo"
            />

            <TextField name="nombres" label="Nombres" required disabled={isPending} defaultValue={data.nombres || ''} />
            <TextField name="apellido_paterno" label="Apellido paterno" required disabled={isPending} defaultValue={(data as any).apellido_paterno || ''} />
            <TextField name="apellido_materno" label="Apellido materno" required disabled={isPending} defaultValue={(data as any).apellido_materno || ''} />

            <TextField
              name="fecha_nacimiento"
              label="Fecha nacimiento"
              type="date"
              InputLabelProps={{ shrink: true }}
              required
              disabled={isPending}
              defaultValue={formatDateForInput((data as any).fecha_nacimiento)}
            />

            {/* CURP */}
            <TextField
              name="curp"
              label="CURP"
              required
              disabled={isPending}
              defaultValue={(data as any).curp || ''}
              inputProps={{ pattern: patternAttr(RE_CURP), maxLength: 18 }}
              onBlur={toUpperOnBlur}
              helperText="18 caracteres, formato oficial"
            />

            {/* RFC */}
            <TextField
              name="rfc"
              label="RFC"
              required
              disabled={isPending}
              defaultValue={(data as any).rfc || ''}
              inputProps={{ pattern: patternAttr(RE_RFC), maxLength: 13 }}
              onBlur={toUpperOnBlur}
              helperText="12–13 caracteres"
            />

            {/* NSS */}
            <TextField
              name="nss"
              label="NSS"
              required
              disabled={isPending}
              defaultValue={(data as any).nss || ''}
              inputProps={{ pattern: patternAttr(RE_NSS), maxLength: 11, inputMode: 'numeric' }}
              onBlur={stripSpacesDashesOnBlur}
              helperText="11 dígitos"
            />

            {/* Género */}
            <TextField
              name="genero"
              label="Género"
              select
              required
              disabled={isPending}
              defaultValue={normalizeGenero((data as any).genero) ?? ''}
            >
              <MenuItem value="">(Sin dato)</MenuItem>
              {GENEROS.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </TextField>

            {/* Estado civil */}
            <TextField
              name="estado_civil"
              label="Estado civil"
              select
              required
              disabled={isPending}
              defaultValue={civilDefault}
            >
              <MenuItem value="">(Sin dato)</MenuItem>
              {ESTADOS_CIVILES.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </TextField>

            {/* Escolaridad */}
            <TextField
              name="escolaridad"
              label="Escolaridad"
              select
              required
              disabled={isPending}
              defaultValue={normalizeEscolaridad((data as any).escolaridad) ?? ''}
            >
              <MenuItem value="">(Sin dato)</MenuItem>
              {ESCOLARIDADES.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </TextField>
          </Grid2>

          <Divider sx={{ my: 2 }} />

          <Stack direction="row" spacing={2} alignItems="center" useFlexGap flexWrap="wrap">
            <Avatar src={fotoPreview || undefined} sx={{ width: 72, height: 72 }} />
            <Button variant="outlined" size="small" startIcon={<UploadFileIcon />} component="label">
              Subir nueva foto
              <input name="foto" type="file" accept="image/*" hidden onChange={handleFotoChange} />
            </Button>
            {fotoPreview && (
              <Button type="button" variant="text" size="small" onClick={() => setFotoPreview(null)}>
                Quitar foto
              </Button>
            )}
          </Stack>
        </StepPanel>

        {/* PASO 2: Laboral */}
        <StepPanel active={activeStep === 1} index={1}>
          <Grid2>
            {/* Departamento (combo con ID) */}
            <TextField
              name="departamento_id"
              label="Departamento"
              select
              required
              disabled={isPending || isDepsLoading}
              defaultValue={depIdDefault}
            >
              <MenuItem value="">(Selecciona)</MenuItem>
              {departamentos.map(opt => (
                <MenuItem key={opt.id} value={opt.id}>{opt.nombre}</MenuItem>
              ))}
            </TextField>

            {/* Puesto (combo con ID) */}
            <TextField
              name="puesto_id"
              label="Puesto"
              select
              required
              disabled={isPending || isPuestosLoading}
              defaultValue={puestoIdDefault}
            >
              <MenuItem value="">(Selecciona)</MenuItem>
              {puestos.map(opt => (
                <MenuItem key={opt.id} value={opt.id}>{opt.nombre}</MenuItem>
              ))}
            </TextField>

            {/* ⬇️ NUEVO: Turno (combo con ID) */}
            <TextField
              name="turno_id"
              label="Turno"
              select
              required
              disabled={isPending || isTurnosLoading}
              defaultValue={turnoIdDefault}
            >
              <MenuItem value="">(Selecciona)</MenuItem>
              {turnos.map(opt => (
                <MenuItem key={opt.id} value={opt.id}>{opt.nombre}</MenuItem>
              ))}
            </TextField>

            {/* ⬇️ NUEVO: Horario (combo con ID) */}
            <TextField
              name="horario_id"
              label="Horario"
              select
              required
              disabled={isPending || isHorariosLoading}
              defaultValue={horarioIdDefault}
            >
              <MenuItem value="">(Selecciona)</MenuItem>
              {horarios.map(opt => (
                <MenuItem key={opt.id} value={opt.id}>{opt.nombre}</MenuItem>
              ))}
            </TextField>

            <TextField
              name="fecha_ingreso"
              label="Fecha ingreso"
              type="date"
              InputLabelProps={{ shrink: true }}
              required
              disabled={isPending}
              defaultValue={formatDateForInput((data as any).fecha_ingreso)}
            />
            <TextField
              name="sueldo"
              label="Sueldo"
              type="number"
              required
              inputProps={{ step: '0.01' }}
              disabled={isPending}
              defaultValue={(data as any).sueldo ?? ''}
            />

            {/* Tipo de contrato */}
            <TextField
              name="tipo_contrato"
              label="Tipo de contrato"
              select
              required
              disabled={isPending}
              defaultValue={(data as any).tipo_contrato ?? ''}
            >
              <MenuItem value="">(Selecciona)</MenuItem>
              <MenuItem value="determinado">Determinado</MenuItem>
              <MenuItem value="indeterminado">Indeterminado</MenuItem>
              <MenuItem value="obra">Obra o proyecto</MenuItem>
            </TextField>

            {/* Tipo de jornada */}
            <TextField
              name="tipo_jornada"
              label="Tipo de jornada"
              select
              required
              disabled={isPending}
              defaultValue={(data as any).tipo_jornada ?? ''}
            >
              <MenuItem value="">(Selecciona)</MenuItem>
              <MenuItem value="diurna">Diurna</MenuItem>
              <MenuItem value="mixta">Mixta</MenuItem>
              <MenuItem value="nocturna">Nocturna</MenuItem>
            </TextField>
          </Grid2>
        </StepPanel>

        {/* PASO 3: Contacto y dirección */}
        <StepPanel active={activeStep === 2} index={2}>
          <Grid2>
            <TextField
              name="telefono"
              label="Teléfono"
              required
              disabled={isPending}
              defaultValue={(data as any).telefono || ''}
              inputProps={{ pattern: patternAttr(RE_PHONE10), maxLength: 10, inputMode: 'tel' }}
              onBlur={stripSpacesDashesOnBlur}
              helperText="10 dígitos"
            />
            <TextField
              name="celular"
              label="Celular"
              required
              disabled={isPending}
              defaultValue={(data as any).celular || ''}
              inputProps={{ pattern: patternAttr(RE_PHONE10), maxLength: 10, inputMode: 'tel' }}
              onBlur={stripSpacesDashesOnBlur}
              helperText="10 dígitos"
            />
            <TextField
              name="email"
              label="Email"
              type="email"
              required
              disabled={isPending}
              defaultValue={data.email || ''}
            />

            <TextField name="contacto_emergencia_nombre" label="Contacto emergencia - Nombre" required disabled={isPending} defaultValue={(data as any).contacto_emergencia_nombre || ''} />
            <TextField name="contacto_emergencia_parentesco" label="Contacto emergencia - Parentesco" required disabled={isPending} defaultValue={(data as any).contacto_emergencia_parentesco || ''} />
            <TextField
              name="contacto_emergencia_telefono"
              label="Contacto emergencia - Teléfono"
              required
              disabled={isPending}
              defaultValue={(data as any).contacto_emergencia_telefono || ''}
              inputProps={{ pattern: patternAttr(RE_PHONE10), maxLength: 10, inputMode: 'tel' }}
              onBlur={stripSpacesDashesOnBlur}
              helperText="10 dígitos"
            />
          </Grid2>

          <Divider sx={{ my: 1 }} />

          <Stack spacing={1}>
            <Typography variant="subtitle2" color="text.secondary">Dirección</Typography>
            <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
              <TextField name="calle" label="Calle" required sx={{ flex: 1, minWidth: 160 }} disabled={isPending} defaultValue={(data as any).calle || ''} />
              <TextField name="numero" label="Número" required sx={{ width: 140 }} disabled={isPending} defaultValue={(data as any).numero || ''} />
              <TextField name="colonia" label="Colonia" required sx={{ flex: 1, minWidth: 160 }} disabled={isPending} defaultValue={(data as any).colonia || ''} />
              <TextField name="municipio" label="Municipio" required sx={{ flex: 1, minWidth: 160 }} disabled={isPending} defaultValue={(data as any).municipio || ''} />
              <TextField name="estado" label="Estado" required sx={{ flex: 1, minWidth: 160 }} disabled={isPending} defaultValue={(data as any).estado || ''} />
              <TextField
                name="cp"
                label="CP"
                required
                sx={{ width: 140 }}
                disabled={isPending}
                defaultValue={(data as any).cp || ''}
                inputProps={{ pattern: patternAttr(RE_CP_MX), maxLength: 5, inputMode: 'numeric' }}
                onBlur={stripSpacesDashesOnBlur}
                helperText="5 dígitos"
              />
            </Stack>
          </Stack>

          <TextField
            name="notas"
            label="Notas"
            multiline
            minRows={3}
            sx={{ mt: 2, width: '100%' }}
            disabled={isPending}
            defaultValue={(data as any).notas || ''}
          />
        </StepPanel>

        {/* PASO 4: Bancarios & Confirmación */}
        <StepPanel active={activeStep === 3} index={3}>
          <Grid2>
            <TextField name="banco" label="Banco" disabled={isPending} defaultValue={(data as any).banco || ''} />
            <TextField
              name="cuenta"
              label="Cuenta"
              required
              disabled={isPending}
              defaultValue={(data as any).cuenta || ''}
              inputProps={{ pattern: patternAttr(RE_CUENTA), maxLength: 20, inputMode: 'numeric' }}
              onBlur={stripSpacesDashesOnBlur}
              helperText="10 a 20 dígitos"
            />
            <TextField
              name="clabe"
              label="CLABE"
              required
              disabled={isPending}
              defaultValue={(data as any).clabe || ''}
              inputProps={{ pattern: patternAttr(RE_CLABE), maxLength: 18, inputMode: 'numeric' }}
              onBlur={stripSpacesDashesOnBlur}
              helperText="18 dígitos"
            />
          </Grid2>

          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">Resumen</Typography>
            <Typography variant="body2" color="text.secondary">
              Revisa que los datos sean correctos antes de guardar.
            </Typography>
          </Box>
        </StepPanel>
      </Box>
    </Paper>
  )
}

/* ---------- Helpers UI ---------- */
function StepPanel({
  active,
  index,
  children,
}: React.PropsWithChildren<{ active: boolean; index: number }>) {
  return (
    <Box data-step sx={{ display: active ? 'block' : 'none', mt: index === 0 ? 0 : 2 }}>
      {children}
    </Box>
  )
}

function Grid2({ children }: React.PropsWithChildren) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
      {children}
    </Box>
  )
}
