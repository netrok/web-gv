// src/features/empleados/EmpleadoCreatePage.tsx
import * as React from 'react'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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

import { createEmpleado, type EmpleadoCreate } from './api'
import { GENEROS, ESTADOS_CIVILES, type Genero, type EstadoCivil } from './types'

const steps = ['Identificación', 'Laboral', 'Contacto y dirección', 'Bancarios & Confirmación']

// ---------- Helpers choices/normalización ----------
const normKey = (s?: string) =>
  (s ?? '')
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .trim().replace(/\s+/g, '_').toUpperCase()

const GENERO_VALUES = GENEROS.map(o => o.value) as ReadonlyArray<Genero>
const CIVIL_VALUES  = ESTADOS_CIVILES.map(o => o.value) as ReadonlyArray<EstadoCivil>

const normalizeGenero = (s?: string | null): Genero | undefined => {
  if (!s) return undefined
  const k = normKey(s) as Genero
  return GENERO_VALUES.includes(k) ? k : undefined
}
const normalizeCivil = (s?: string | null): EstadoCivil | undefined => {
  if (!s) return undefined
  const k = normKey(s) as EstadoCivil
  return CIVIL_VALUES.includes(k) ? k : undefined
}

// vacío -> null (para limpiar campo)
const toNull = (v: FormDataEntryValue | null) => {
  const s = (v ?? '').toString().trim()
  return s === '' ? null : s
}
function toOpt(v: FormDataEntryValue | null): string | undefined {
  const s = (v ?? '').toString().trim()
  return s ? s : undefined
}

/* ---------- Componente ---------- */
export default function EmpleadoCreatePage() {
  const navigate = useNavigate()
  const qc = useQueryClient()

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
    if (e.key === 'Enter' && activeStep !== lastStep) {
      e.preventDefault()
    }
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
      // Identificación / personales
      num_empleado: String(fd.get('num_empleado') ?? '').trim(),
      activo: fd.get('activo') === 'on',
      nombres: String(fd.get('nombres') ?? '').trim(),
      apellido_paterno: toOpt(fd.get('apellido_paterno')) ?? '',
      apellido_materno: toOpt(fd.get('apellido_materno')),
      fecha_nacimiento: toOpt(fd.get('fecha_nacimiento')) ?? '',

      curp: toOpt(fd.get('curp')),
      rfc: toOpt(fd.get('rfc')),
      nss: toOpt(fd.get('nss')),

      // Género normalizado (M/F/O) o null si vacío/no válido
      genero: (() => {
        const raw = toNull(fd.get('genero'))
        if (raw === null) return null
        return normalizeGenero(raw) ?? null
      })(),

      // Estado civil normalizado al catálogo
      estado_civil: (() => {
        const raw = toNull(fd.get('estado_civil'))
        if (raw === null) return null
        return normalizeCivil(raw) ?? null
      })(),

      // Escolaridad (catálogo libre, pero normalizamos a MAYÚSCULAS con guiones bajos)
      escolaridad: (() => {
        const raw = toNull(fd.get('escolaridad'))
        if (raw === null) return null
        return normKey(raw)
      })(),

      // Laboral (labels UI; el API los ignora gracias al normalizador del cliente)
      departamento_nombre: toOpt(fd.get('departamento_nombre')),
      puesto_nombre: toOpt(fd.get('puesto_nombre')),
      turno_nombre: toOpt(fd.get('turno_nombre')),
      horario_nombre: toOpt(fd.get('horario_nombre')),
      fecha_ingreso: toOpt(fd.get('fecha_ingreso')),
      sueldo: toOpt(fd.get('sueldo')),
      tipo_contrato: toOpt(fd.get('tipo_contrato')),
      tipo_jornada: toOpt(fd.get('tipo_jornada')),

      // Contacto
      telefono: toOpt(fd.get('telefono')), // <- FIX: antes estaba "Telefono"
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

      // Archivo
      ...(includeFoto ? { foto: fotoFile } : {}),
    } as EmpleadoCreate & Record<string, any>

    // Requeridos mínimos
    if (!payload.num_empleado || !payload.nombres || !payload.fecha_nacimiento) {
      formRef.current?.reportValidity()
      return
    }

    await mutateAsync(payload)
  }

  // Avance seguro (evita submits fantasma)
  const handleNext = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!validateCurrentStep()) return
    setTimeout(() => {
      setActiveStep((s) => Math.min(s + 1, lastStep))
    }, 0)
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
            <TextField name="apellido_paterno" label="Apellido paterno" disabled={isPending} />
            <TextField name="apellido_materno" label="Apellido materno" disabled={isPending} />

            <TextField
              name="fecha_nacimiento"
              label="Fecha nacimiento"
              type="date"
              InputLabelProps={{ shrink: true }}
              required
              disabled={isPending}
            />

            <TextField name="curp" label="CURP" disabled={isPending} />
            <TextField name="rfc" label="RFC" disabled={isPending} />
            <TextField name="nss" label="NSS" disabled={isPending} />

            {/* Género (select) */}
            <TextField
              name="genero"
              label="Género"
              select
              disabled={isPending}
              defaultValue=""
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
              defaultValue=""
            >
              <MenuItem value="">(Sin dato)</MenuItem>
              {ESTADOS_CIVILES.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </TextField>

            {/* Escolaridad (select) */}
            <TextField name="escolaridad" label="Escolaridad" select disabled={isPending} defaultValue="">
              <MenuItem value="">(Sin dato)</MenuItem>
              <MenuItem value="PRIMARIA">Primaria</MenuItem>
              <MenuItem value="SECUNDARIA">Secundaria</MenuItem>
              <MenuItem value="BACHILLERATO">Bachillerato/Preparatoria</MenuItem>
              <MenuItem value="TSU">TSU / Técnico</MenuItem>
              <MenuItem value="LICENCIATURA">Licenciatura/Ingeniería</MenuItem>
              <MenuItem value="MAESTRIA">Maestría</MenuItem>
              <MenuItem value="DOCTORADO">Doctorado</MenuItem>
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
            <TextField name="departamento_nombre" label="Departamento" disabled={isPending} />
            <TextField name="puesto_nombre" label="Puesto" disabled={isPending} />
            <TextField name="turno_nombre" label="Turno" disabled={isPending} />
            <TextField name="horario_nombre" label="Horario" disabled={isPending} />

            <TextField name="fecha_ingreso" label="Fecha ingreso" type="date" InputLabelProps={{ shrink: true }} disabled={isPending} />
            <TextField name="sueldo" label="Sueldo" type="number" inputProps={{ step: '0.01' }} disabled={isPending} />
            <TextField name="tipo_contrato" label="Tipo de contrato" disabled={isPending} />
            <TextField name="tipo_jornada" label="Tipo de jornada" disabled={isPending} />
          </Grid2>
        </StepPanel>

        {/* PASO 3: Contacto y dirección */}
        <StepPanel active={activeStep === 2} index={2}>
          <Grid2>
            <TextField name="telefono" label="Teléfono" disabled={isPending} /> {/* <- FIX */}
            <TextField name="celular" label="Celular" disabled={isPending} />
            <TextField name="email" label="Email" type="email" disabled={isPending} />

            <TextField name="contacto_emergencia_nombre" label="Contacto emergencia - Nombre" disabled={isPending} />
            <TextField name="contacto_emergencia_parentesco" label="Contacto emergencia - Parentesco" disabled={isPending} />
            <TextField name="contacto_emergencia_telefono" label="Contacto emergencia - Teléfono" disabled={isPending} />
          </Grid2>

          <Divider sx={{ my: 1 }} />

          <Stack spacing={1}>
            <Typography variant="subtitle2" color="text.secondary">Dirección</Typography>
            <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
              <TextField name="calle" label="Calle" sx={{ flex: 1, minWidth: 160 }} disabled={isPending} />
              <TextField name="numero" label="Número" sx={{ width: 140 }} disabled={isPending} />
              <TextField name="colonia" label="Colonia" sx={{ flex: 1, minWidth: 160 }} disabled={isPending} />
              <TextField name="municipio" label="Municipio" sx={{ flex: 1, minWidth: 160 }} disabled={isPending} />
              <TextField name="estado" label="Estado" sx={{ flex: 1, minWidth: 160 }} disabled={isPending} />
              <TextField name="cp" label="CP" sx={{ width: 140 }} disabled={isPending} />
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

        {/* PASO 4: Bancarios & Confirmación */}
        <StepPanel active={activeStep === 3} index={3}>
          <Grid2>
            <TextField name="banco" label="Banco" disabled={isPending} />
            <TextField name="cuenta" label="Cuenta" disabled={isPending} />
            <TextField name="clabe" label="CLABE" disabled={isPending} />
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
