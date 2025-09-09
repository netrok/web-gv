import * as React from 'react'
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AxiosError } from 'axios'

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

// Para mostrar detalle de errores de DRF
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

  const [activeStep, setActiveStep] = React.useState(0)
  const lastStep = steps.length - 1

  const [fotoPreview, setFotoPreview] = React.useState<string | null>(null)
  const prevBlobUrl = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (!data) return
    setFotoPreview((data as any).foto_url || (data as any).foto || null)
  }, [data])

  // Limpia blob URLs para evitar memory leaks
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
    const inputs = Array.from(current.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input,textarea'))
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

      // Choices — se omiten si están vacíos
      genero: choiceFromForm(fd, 'genero', normalizeGenero),            // 'M'|'F'|'O'
      estado_civil: choiceFromForm(fd, 'estado_civil', normalizeCivil), // 'soltero'|...
      escolaridad: choiceFromForm(fd, 'escolaridad', normalizeEscolaridad),

      // Laboral
      departamento_nombre: toOpt(fd.get('departamento_nombre')),
      puesto_nombre: toOpt(fd.get('puesto_nombre')),
      turno_nombre: toOpt(fd.get('turno_nombre')),
      horario_nombre: toOpt(fd.get('horario_nombre')),
      fecha_ingreso: toOpt(fd.get('fecha_ingreso')),
      sueldo: toOpt(fd.get('sueldo')),
      tipo_contrato: toOpt(fd.get('tipo_contrato')), // minúsculas desde el select
      tipo_jornada: toOpt(fd.get('tipo_jornada')),   // minúsculas desde el select

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
    if (isCivilCode(raw)) return CIVIL_CODE_TO_VALUE[raw] // "S" -> "soltero"
    return normKeyLower(raw) as EstadoCivil               // normaliza "Soltero", "UNION LIBRE", etc.
  })()

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
        {/* PASO 1: Identificación */}
        <StepPanel active={activeStep === 0} index={0}>
          <Grid2>
            <TextField name="num_empleado" label="Núm. empleado" required disabled={isPending} defaultValue={(data as any).num_empleado || ''} />
            <FormControlLabel control={<Checkbox name="activo" defaultChecked={Boolean((data as any).activo)} disabled={isPending} />} label="Activo" />

            <TextField name="nombres" label="Nombres" required disabled={isPending} defaultValue={data.nombres || ''} />
            <TextField name="apellido_paterno" label="Apellido paterno" disabled={isPending} defaultValue={(data as any).apellido_paterno || ''} />
            <TextField name="apellido_materno" label="Apellido materno" disabled={isPending} defaultValue={(data as any).apellido_materno || ''} />

            <TextField name="fecha_nacimiento" label="Fecha nacimiento" type="date" InputLabelProps={{ shrink: true }} disabled={isPending} defaultValue={formatDateForInput((data as any).fecha_nacimiento)} />
            <TextField name="curp" label="CURP" disabled={isPending} defaultValue={(data as any).curp || ''} />
            <TextField name="rfc" label="RFC" disabled={isPending} defaultValue={(data as any).rfc || ''} />
            <TextField name="nss" label="NSS" disabled={isPending} defaultValue={(data as any).nss || ''} />

            {/* Género (select) */}
            <TextField
              name="genero"
              label="Género"
              select
              disabled={isPending}
              defaultValue={normalizeGenero((data as any).genero) ?? ''}
            >
              <MenuItem value="">(Sin dato)</MenuItem>
              {GENEROS.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </TextField>

            {/* Estado civil (select) */}
            <TextField
              name="estado_civil"
              label="Estado civil"
              select
              disabled={isPending}
              defaultValue={civilDefault}
            >
              <MenuItem value="">(Sin dato)</MenuItem>
              {ESTADOS_CIVILES.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </TextField>

            {/* Escolaridad (select) */}
            <TextField
              name="escolaridad"
              label="Escolaridad"
              select
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
            <TextField name="departamento_nombre" label="Departamento" disabled={isPending} defaultValue={(data as any).departamento_nombre || ''} />
            <TextField name="puesto_nombre" label="Puesto" disabled={isPending} defaultValue={(data as any).puesto_nombre || ''} />
            <TextField name="turno_nombre" label="Turno" disabled={isPending} defaultValue={(data as any).turno_nombre || ''} />
            <TextField name="horario_nombre" label="Horario" disabled={isPending} defaultValue={(data as any).horario_nombre || ''} />

            <TextField name="fecha_ingreso" label="Fecha ingreso" type="date" InputLabelProps={{ shrink: true }} disabled={isPending} defaultValue={formatDateForInput((data as any).fecha_ingreso)} />
            <TextField name="sueldo" label="Sueldo" type="number" inputProps={{ step: '0.01' }} disabled={isPending} defaultValue={(data as any).sueldo ?? ''} />

            {/* Tipo de contrato */}
            <TextField
              name="tipo_contrato"
              label="Tipo de contrato"
              select
              disabled={isPending}
              defaultValue={(data as any).tipo_contrato ?? ''}
            >
              <MenuItem value="">(Sin dato)</MenuItem>
              <MenuItem value="determinado">Determinado</MenuItem>
              <MenuItem value="indeterminado">Indeterminado</MenuItem>
              <MenuItem value="obra">Obra o proyecto</MenuItem>
            </TextField>

            {/* Tipo de jornada */}
            <TextField
              name="tipo_jornada"
              label="Tipo de jornada"
              select
              disabled={isPending}
              defaultValue={(data as any).tipo_jornada ?? ''}
            >
              <MenuItem value="">(Sin dato)</MenuItem>
              <MenuItem value="diurna">Diurna</MenuItem>
              <MenuItem value="mixta">Mixta</MenuItem>
              <MenuItem value="nocturna">Nocturna</MenuItem>
            </TextField>
          </Grid2>
        </StepPanel>

        {/* PASO 3: Contacto y dirección */}
        <StepPanel active={activeStep === 2} index={2}>
          <Grid2>
            <TextField name="telefono" label="Teléfono" disabled={isPending} defaultValue={(data as any).telefono || ''} />
            <TextField name="celular" label="Celular" disabled={isPending} defaultValue={(data as any).celular || ''} />
            <TextField name="email" label="Email" type="email" disabled={isPending} defaultValue={data.email || ''} />

            <TextField name="contacto_emergencia_nombre" label="Contacto emergencia - Nombre" disabled={isPending} defaultValue={(data as any).contacto_emergencia_nombre || ''} />
            <TextField name="contacto_emergencia_parentesco" label="Contacto emergencia - Parentesco" disabled={isPending} defaultValue={(data as any).contacto_emergencia_parentesco || ''} />
            <TextField name="contacto_emergencia_telefono" label="Contacto emergencia - Teléfono" disabled={isPending} defaultValue={(data as any).contacto_emergencia_telefono || ''} />
          </Grid2>

          <Divider sx={{ my: 1 }} />

          <Stack spacing={1}>
            <Typography variant="subtitle2" color="text.secondary">Dirección</Typography>
            <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
              <TextField name="calle" label="Calle" sx={{ flex: 1, minWidth: 160 }} disabled={isPending} defaultValue={(data as any).calle || ''} />
              <TextField name="numero" label="Número" sx={{ width: 140 }} disabled={isPending} defaultValue={(data as any).numero || ''} />
              <TextField name="colonia" label="Colonia" sx={{ flex: 1, minWidth: 160 }} disabled={isPending} defaultValue={(data as any).colonia || ''} />
              <TextField name="municipio" label="Municipio" sx={{ flex: 1, minWidth: 160 }} disabled={isPending} defaultValue={(data as any).municipio || ''} />
              <TextField name="estado" label="Estado" sx={{ flex: 1, minWidth: 160 }} disabled={isPending} defaultValue={(data as any).estado || ''} />
              <TextField name="cp" label="CP" sx={{ width: 140 }} disabled={isPending} defaultValue={(data as any).cp || ''} />
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
            <TextField name="cuenta" label="Cuenta" disabled={isPending} defaultValue={(data as any).cuenta || ''} />
            <TextField name="clabe" label="CLABE" disabled={isPending} defaultValue={(data as any).clabe || ''} />
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
