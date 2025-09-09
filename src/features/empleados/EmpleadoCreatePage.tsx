// src/features/empleados/EmpleadoCreatePage.tsx
import * as React from 'react'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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

import api from '@/api/client'
import { createEmpleado, type EmpleadoCreate } from './api'
import {
  GENEROS,
  ESTADOS_CIVILES,
  ESCOLARIDADES,
  type Genero,
  type EstadoCivil,
  type Escolaridad,
} from './types'

const steps = ['Identificación', 'Laboral', 'Contacto y dirección', 'Bancarios & Confirmación']

/* ---------- Regex alineadas al backend y requisitos del front ---------- */
const RE_CURP   = /^[A-Z]{4}\d{6}[HM][A-Z]{5}\d{2}$/
const RE_RFC    = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/
const RE_NSS    = /^\d{11}$/
const RE_CLABE  = /^\d{18}$/
const RE_CUENTA = /^\d{10,20}$/
const RE_PHONE10 = /^\d{10}$/        // teléfonos estrictos de 10 dígitos (MX)
const RE_CP     = /^\d{5}$/          // código postal 5 dígitos

const patternAttr = (re: RegExp) => re.source
const toUpperOnBlur = (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.value = e.currentTarget.value.toUpperCase().trim()
}
const stripSpacesDashesOnBlur = (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.value = e.currentTarget.value.replace(/[\s-]+/g, '')
}

/* ---------- Helpers choices/normalización ---------- */
const normKey = (s?: string) =>
  (s ?? '')
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .trim().replace(/\s+/g, '_').toUpperCase()

const GENERO_VALUES = GENEROS.map(o => o.value) as ReadonlyArray<Genero>
const normalizeGenero = (s?: string | null): Genero | undefined => {
  if (!s) return undefined
  const k = normKey(s) as Genero
  return GENERO_VALUES.includes(k) ? k : undefined
}

// vacío -> null (para limpiar campo)
const toNull = (v: FormDataEntryValue | null) => {
  const s = (v ?? '').toString().trim()
  return s === '' ? null : s
}
const toOpt = (v: FormDataEntryValue | null): string | undefined => {
  const s = (v ?? '').toString().trim()
  return s ? s : undefined
}
const toIntOpt = (v: FormDataEntryValue | null): number | undefined => {
  const s = toOpt(v)
  if (!s) return undefined
  const n = Number(s)
  return Number.isNaN(n) ? undefined : n
}

// Detalle de errores DRF
function flattenDRFErrors(err: unknown): string {
  const data = (err as any)?.response?.data
  if (!data) return ''
  if (typeof data === 'string') return data
  if (Array.isArray(data)) return data.join('\n')
  if (typeof data === 'object') {
    return Object.entries(data)
      .map(([k, v]) =>
        `${k}: ${Array.isArray(v) ? v.join(' ') : typeof v === 'string' ? v : JSON.stringify(v)}`)
      .join('\n')
  }
  return String(data)
}

/* ---------- Tipos mínimos para catálogos ---------- */
type CatalogItem = { id: number; nombre: string }
type Paginated<T> = { results?: T[] } & Record<string, unknown>
const unpag = <T,>(data: T[] | Paginated<T>): T[] => Array.isArray(data) ? data : (data.results ?? [])

/* ---------- Componente ---------- */
export default function EmpleadoCreatePage() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  // Catálogos (IDs reales)
  const { data: departamentos } = useQuery({
    queryKey: ['departamentos', 1000],
    queryFn: async () => {
      const { data } = await api.get<Paginated<CatalogItem> | CatalogItem[]>('/v1/departamentos/', { params: { page_size: 1000 } })
      return unpag(data)
    },
  })
  const { data: puestos } = useQuery({
    queryKey: ['puestos', 1000],
    queryFn: async () => {
      const { data } = await api.get<Paginated<CatalogItem> | CatalogItem[]>('/v1/puestos/', { params: { page_size: 1000 } })
      return unpag(data)
    },
  })
  const { data: turnos } = useQuery({
    queryKey: ['turnos', 1000],
    queryFn: async () => {
      const { data } = await api.get<Paginated<CatalogItem> | CatalogItem[]>('/v1/turnos/', { params: { page_size: 1000 } })
      return unpag(data)
    },
  })
  const { data: horarios } = useQuery({
    queryKey: ['horarios', 1000],
    queryFn: async () => {
      const { data } = await api.get<Paginated<CatalogItem> | CatalogItem[]>('/v1/horarios/', { params: { page_size: 1000 } })
      return unpag(data)
    },
  })

  const [activeStep, setActiveStep] = React.useState(0)
  const lastStep = steps.length - 1
  const [fotoPreview, setFotoPreview] = React.useState<string | null>(null)

  const formRef = React.useRef<HTMLFormElement>(null)
  const [dirty, setDirty] = React.useState(false)
  React.useEffect(() => {
    const form = formRef.current
    if (!form) return
    const onChange = () => setDirty(true)
    form.addEventListener('change', onChange)
    return () => form.removeEventListener('change', onChange)
  }, [])

  const { mutateAsync, isPending, isError: isCreateError, error: createError } = useMutation({
    mutationFn: (payload: EmpleadoCreate) => createEmpleado(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['empleados'] }).catch(() => {})
      navigate('/empleados', { replace: true, state: { flash: 'Empleado creado' } })
    },
  })

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

  // Bloquear Enter salvo en el último paso
  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' && activeStep !== lastStep) e.preventDefault()
  }

  const handleCancel = () => {
    if (dirty && !window.confirm('Hay cambios sin guardar. ¿Salir sin guardar?')) return
    navigate('/empleados', { replace: true })
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (activeStep !== lastStep) return
    if (!validateCurrentStep()) return

    const fd = new FormData(e.currentTarget)
    const fotoFile = (fd.get('foto') as File) ?? null
    const includeFoto = !!(fotoFile && fotoFile.size > 0)

    const payload = {
      // Identificación / personales (también se validan en el propio form)
      num_empleado: String(fd.get('num_empleado') ?? '').trim(),
      activo: fd.get('activo') === 'on',
      nombres: String(fd.get('nombres') ?? '').trim(),
      apellido_paterno: String(fd.get('apellido_paterno') ?? '').trim(),
      apellido_materno: String(fd.get('apellido_materno') ?? '').trim(),
      fecha_nacimiento: String(fd.get('fecha_nacimiento') ?? '').trim(),

      curp: toOpt(fd.get('curp')),
      rfc: toOpt(fd.get('rfc')),
      nss: toOpt(fd.get('nss')),

      genero: (() => {
        const raw = toNull(fd.get('genero'))
        if (raw === null) return null
        return normalizeGenero(raw) ?? null
      })(),

      estado_civil: ((): EstadoCivil | null => {
        const raw = toNull(fd.get('estado_civil'))
        return (raw as EstadoCivil | null)
      })(),

      escolaridad: ((): Escolaridad | null => {
        const raw = toNull(fd.get('escolaridad'))
        return (raw as Escolaridad | null)
      })(),

      // Relaciones (IDs reales) — obligatorias
      departamento_id: toIntOpt(fd.get('departamento_id')),
      puesto_id: toIntOpt(fd.get('puesto_id')),
      turno_id: toIntOpt(fd.get('turno_id')),
      horario_id: toIntOpt(fd.get('horario_id')),

      // Laboral — obligatorios
      fecha_ingreso: toOpt(fd.get('fecha_ingreso')),
      sueldo: toOpt(fd.get('sueldo')),
      tipo_contrato: toOpt(fd.get('tipo_contrato')),
      tipo_jornada: toOpt(fd.get('tipo_jornada')),

      // Contacto — obligatorios
      telefono: toOpt(fd.get('telefono')),
      celular: toOpt(fd.get('celular')),
      email: toOpt(fd.get('email')),

      contacto_emergencia_nombre: toOpt(fd.get('contacto_emergencia_nombre')),
      contacto_emergencia_parentesco: toOpt(fd.get('contacto_emergencia_parentesco')),
      contacto_emergencia_telefono: toOpt(fd.get('contacto_emergencia_telefono')),

      // Dirección — obligatorios
      calle: toOpt(fd.get('calle')),
      numero: toOpt(fd.get('numero')),
      colonia: toOpt(fd.get('colonia')),
      municipio: toOpt(fd.get('municipio')),
      estado: toOpt(fd.get('estado')),
      cp: toOpt(fd.get('cp')),

      // Bancario — opcionales
      banco: toOpt(fd.get('banco')),
      cuenta: toOpt(fd.get('cuenta')),
      clabe: toOpt(fd.get('clabe')),

      // Otros
      notas: toOpt(fd.get('notas')),

      // Archivo
      ...(includeFoto ? { foto: fotoFile } : {}),
    } as EmpleadoCreate & Record<string, any>

    // Requeridos mínimos + nuevos requeridos ya están cubiertos por `required` + pattern del form.
    // Si quieres una validación extra aquí, podríamos re-checar, pero el form ya bloquea submit.

    await mutateAsync(payload)
  }

  // Avance seguro
  const handleNext = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!validateCurrentStep()) return
    setTimeout(() => setActiveStep((s) => Math.min(s + 1, lastStep)), 0)
  }
  const handleBack = () => setActiveStep((s) => Math.max(s - 1, 0))

  // Previsualización de foto
  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) {
      setFotoPreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setFotoPreview(url)
  }

  return (
    <Paper sx={{ p: 2, mx: 'auto', maxWidth: 1000 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            type="button"
            startIcon={<ArrowBackIcon />}
            component={RouterLink}
            to="/empleados"
            size="small"
          >
            Volver
          </Button>
          <Typography variant="h6" component="h1">Nuevo empleado</Typography>
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
          {steps.map((label) => (
            <Step key={label}><StepLabel>{label}</StepLabel></Step>
          ))}
        </Stepper>
        <LinearProgress variant="determinate" value={progress} sx={{ mt: 1 }} />
      </Box>

      {isCreateError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {`No se pudo crear el empleado${
            (createError as any)?.response?.status ? ` (HTTP ${(createError as any).response.status})` : ''
          }.`}
          <Box component="pre" sx={{ whiteSpace: 'pre-wrap', mt: 1, fontSize: 12 }}>
            {flattenDRFErrors(createError)}
          </Box>
        </Alert>
      )}

      {/* FORM */}
      <Box
        id="empleado-create-form"
        component="form"
        ref={formRef}
        onSubmit={handleSubmit}
        onKeyDown={handleFormKeyDown}
        autoComplete="off"
      >
        {/* PASO 1: Identificación / Personales */}
        <StepPanel active={activeStep === 0} index={0}>
          <Grid2>
            <TextField name="num_empleado" label="Núm. empleado" required disabled={isPending} />
            <FormControlLabel control={<Checkbox name="activo" defaultChecked disabled={isPending} />} label="Activo" />

            <TextField name="nombres" label="Nombres" required disabled={isPending} />
            <TextField name="apellido_paterno" label="Apellido paterno" required disabled={isPending} />
            <TextField name="apellido_materno" label="Apellido materno" required disabled={isPending} />

            <TextField
              name="fecha_nacimiento"
              label="Fecha nacimiento"
              type="date"
              InputLabelProps={{ shrink: true }}
              required
              disabled={isPending}
            />

            {/* CURP (obligatoria) */}
            <TextField
              name="curp"
              label="CURP"
              required
              disabled={isPending}
              inputProps={{ pattern: patternAttr(RE_CURP), maxLength: 18 }}
              onBlur={toUpperOnBlur}
              helperText="18 caracteres, formato oficial"
            />

            {/* RFC (obligatorio) */}
            <TextField
              name="rfc"
              label="RFC"
              required
              disabled={isPending}
              inputProps={{ pattern: patternAttr(RE_RFC), maxLength: 13 }}
              onBlur={toUpperOnBlur}
              helperText="12–13 caracteres (personas físicas/morales)"
            />

            {/* NSS (obligatorio) */}
            <TextField
              name="nss"
              label="NSS"
              required
              disabled={isPending}
              inputProps={{ pattern: patternAttr(RE_NSS), maxLength: 11, inputMode: 'numeric' }}
              onBlur={stripSpacesDashesOnBlur}
              helperText="11 dígitos"
            />

            {/* Género (obligatorio) */}
            <TextField name="genero" label="Género" select required disabled={isPending} defaultValue="">
              <MenuItem value="">(Selecciona)</MenuItem>
              {GENEROS.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </TextField>

            {/* Estado civil (obligatorio) */}
            <TextField name="estado_civil" label="Estado civil" select required disabled={isPending} defaultValue="">
              <MenuItem value="">(Selecciona)</MenuItem>
              {ESTADOS_CIVILES.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </TextField>

            {/* Escolaridad (obligatoria) */}
            <TextField name="escolaridad" label="Escolaridad" select required disabled={isPending} defaultValue="">
              <MenuItem value="">(Selecciona)</MenuItem>
              {ESCOLARIDADES.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </TextField>
          </Grid2>

          <Divider sx={{ my: 2 }} />

          {/* Foto opcional */}
          <Stack direction="row" spacing={2} alignItems="center" useFlexGap flexWrap="wrap">
            <Avatar src={fotoPreview || undefined} sx={{ width: 72, height: 72 }} />
            <Button variant="outlined" size="small" startIcon={<UploadFileIcon />} component="label">
              Subir foto
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
            {/* Relaciones con IDs reales — obligatorias */}
            <TextField
              name="departamento_id"
              label="Departamento"
              select
              required
              disabled={isPending || !(departamentos?.length)}
              defaultValue=""
            >
              <MenuItem value="">(Selecciona)</MenuItem>
              {(departamentos ?? []).map(d => (
                <MenuItem key={d.id} value={d.id}>{d.nombre}</MenuItem>
              ))}
            </TextField>

            <TextField
              name="puesto_id"
              label="Puesto"
              select
              required
              disabled={isPending || !(puestos?.length)}
              defaultValue=""
            >
              <MenuItem value="">(Selecciona)</MenuItem>
              {(puestos ?? []).map(p => (
                <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
              ))}
            </TextField>

            <TextField
              name="turno_id"
              label="Turno"
              select
              required
              disabled={isPending || !(turnos?.length)}
              defaultValue=""
            >
              <MenuItem value="">(Selecciona)</MenuItem>
              {(turnos ?? []).map(t => (
                <MenuItem key={t.id} value={t.id}>{t.nombre}</MenuItem>
              ))}
            </TextField>

            <TextField
              name="horario_id"
              label="Horario"
              select
              required
              disabled={isPending || !(horarios?.length)}
              defaultValue=""
            >
              <MenuItem value="">(Selecciona)</MenuItem>
              {(horarios ?? []).map(h => (
                <MenuItem key={h.id} value={h.id}>{h.nombre}</MenuItem>
              ))}
            </TextField>

            <TextField
              name="fecha_ingreso"
              label="Fecha ingreso"
              type="date"
              InputLabelProps={{ shrink: true }}
              required
              disabled={isPending}
            />
            <TextField
              name="sueldo"
              label="Sueldo"
              type="number"
              required
              inputProps={{ step: '0.01', min: 0 }}
              disabled={isPending}
            />

            {/* Tipo de contrato (obligatorio) */}
            <TextField name="tipo_contrato" label="Tipo de contrato" select required disabled={isPending} defaultValue="">
              <MenuItem value="">(Selecciona)</MenuItem>
              <MenuItem value="determinado">Determinado</MenuItem>
              <MenuItem value="indeterminado">Indeterminado</MenuItem>
              <MenuItem value="obra">Obra o proyecto</MenuItem>
            </TextField>

            {/* Tipo de jornada (obligatorio) */}
            <TextField name="tipo_jornada" label="Tipo de jornada" select required disabled={isPending} defaultValue="">
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
            {/* Teléfono (10 dígitos obligatorio) */}
            <TextField
              name="telefono"
              label="Teléfono"
              required
              disabled={isPending}
              inputProps={{ pattern: patternAttr(RE_PHONE10), maxLength: 10, inputMode: 'numeric' }}
              onBlur={stripSpacesDashesOnBlur}
              helperText="10 dígitos"
            />

            {/* Celular (10 dígitos obligatorio) */}
            <TextField
              name="celular"
              label="Celular"
              required
              disabled={isPending}
              inputProps={{ pattern: patternAttr(RE_PHONE10), maxLength: 10, inputMode: 'numeric' }}
              onBlur={stripSpacesDashesOnBlur}
              helperText="10 dígitos"
            />

            {/* Email (obligatorio) */}
            <TextField name="email" label="Email" type="email" required disabled={isPending} />

            <TextField name="contacto_emergencia_nombre" label="Contacto emergencia - Nombre" required disabled={isPending} />
            <TextField name="contacto_emergencia_parentesco" label="Contacto emergencia - Parentesco" required disabled={isPending} />

            {/* Teléfono de contacto (10 dígitos obligatorio) */}
            <TextField
              name="contacto_emergencia_telefono"
              label="Contacto emergencia - Teléfono"
              required
              disabled={isPending}
              inputProps={{ pattern: patternAttr(RE_PHONE10), maxLength: 10, inputMode: 'numeric' }}
              onBlur={stripSpacesDashesOnBlur}
              helperText="10 dígitos"
            />
          </Grid2>

          <Divider sx={{ my: 1 }} />

          <Stack spacing={1}>
            <Typography variant="subtitle2" color="text.secondary">Dirección</Typography>
            <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
              <TextField name="calle" label="Calle" required sx={{ flex: 1, minWidth: 160 }} disabled={isPending} />
              <TextField name="numero" label="Número" required sx={{ width: 140 }} disabled={isPending} />
              <TextField name="colonia" label="Colonia" required sx={{ flex: 1, minWidth: 160 }} disabled={isPending} />
              <TextField name="municipio" label="Municipio" required sx={{ flex: 1, minWidth: 160 }} disabled={isPending} />
              <TextField name="estado" label="Estado" required sx={{ flex: 1, minWidth: 160 }} disabled={isPending} />
              <TextField
                name="cp"
                label="CP"
                required
                sx={{ width: 140 }}
                disabled={isPending}
                inputProps={{ pattern: patternAttr(RE_CP), maxLength: 5, inputMode: 'numeric' }}
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
          />
        </StepPanel>

        {/* PASO 4: Bancarios & Confirmación (opcionales) */}
        <StepPanel active={activeStep === 3} index={3}>
          <Grid2>
            <TextField name="banco" label="Banco" disabled={isPending} />

            {/* Cuenta */}
            <TextField
              name="cuenta"
              label="Cuenta"
              disabled={isPending}
              inputProps={{ pattern: patternAttr(RE_CUENTA), maxLength: 20, inputMode: 'numeric' }}
              onBlur={stripSpacesDashesOnBlur}
              helperText="10 a 20 dígitos"
            />

            {/* CLABE */}
            <TextField
              name="clabe"
              label="CLABE"
              disabled={isPending}
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
