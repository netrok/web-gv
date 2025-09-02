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
  Snackbar,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SaveIcon from '@mui/icons-material/Save'
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore'
import NavigateNextIcon from '@mui/icons-material/NavigateNext'
import UploadFileIcon from '@mui/icons-material/UploadFile'

import type { Empleado } from './types'
import { createEmpleado, type EmpleadoCreate } from './api'

const steps = ['Identificación', 'Laboral', 'Contacto y dirección', 'Bancarios & Confirmación']

export default function EmpleadoCreatePage() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [activeStep, setActiveStep] = React.useState(0)
  const [successOpen, setSuccessOpen] = React.useState(false)
  const [fotoPreview, setFotoPreview] = React.useState<string | null>(null)

  const { mutateAsync, isPending, isError, error } = useMutation({
    mutationFn: (payload: EmpleadoCreate) => createEmpleado(payload),
    onSuccess: () => {
      // Invalida el listado (ajusta el key si tu lista usa otro)
      qc.invalidateQueries({ queryKey: ['empleados'] }).catch(() => {})
      setSuccessOpen(true)
    },
  })

  // Ref del form para validar por paso
  const formRef = React.useRef<HTMLFormElement>(null)
  const progress = Math.round(((activeStep + 1) / steps.length) * 100)

  function validateCurrentStep(): boolean {
    const form = formRef.current
    if (!form) return true
    const stepPanels = form.querySelectorAll<HTMLElement>('[data-step]')
    const current = stepPanels[activeStep]
    if (!current) return true
    const inputs = Array.from(
      current.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input,textarea')
    )
    for (const el of inputs) {
      if (!el.checkValidity()) {
        form.reportValidity()
        return false
      }
    }
    return true
  }

  function toOpt(v: FormDataEntryValue | null): string | undefined {
    const s = (v ?? '').toString().trim()
    return s ? s : undefined
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!validateCurrentStep()) return

    const fd = new FormData(e.currentTarget)

    const payload: EmpleadoCreate = {
      num_empleado: String(fd.get('num_empleado') ?? '').trim(),
      nombres: String(fd.get('nombres') ?? '').trim(),
      apellido_paterno: toOpt(fd.get('apellido_paterno')),
      apellido_materno: toOpt(fd.get('apellido_materno')),
      email: toOpt(fd.get('email')),
      celular: toOpt(fd.get('celular')),
      genero: toOpt(fd.get('genero')),
      estado_civil: toOpt(fd.get('estado_civil')),
      fecha_ingreso: toOpt(fd.get('fecha_ingreso')),
      calle: toOpt(fd.get('calle')),
      numero: toOpt(fd.get('numero')),
      colonia: toOpt(fd.get('colonia')),
      municipio: toOpt(fd.get('municipio')),
      estado: toOpt(fd.get('estado')),
      cp: toOpt(fd.get('cp')),
      banco: toOpt(fd.get('banco')),
      cuenta: toOpt(fd.get('cuenta')),
      departamento_nombre: toOpt(fd.get('departamento_nombre')),
      puesto_nombre: toOpt(fd.get('puesto_nombre')),
      turno_nombre: toOpt(fd.get('turno_nombre')),
      horario_nombre: toOpt(fd.get('horario_nombre')),
      activo: fd.get('activo') === 'on',
      // archivo opcional
      foto: (fd.get('foto') as File) ?? null,
    }

    if (!payload.num_empleado || !payload.nombres) {
      (formRef.current as HTMLFormElement).reportValidity()
      return
    }

    const nuevo: Empleado = await mutateAsync(payload)

    // Ir al detalle si hay id, o al listado
    const id = (nuevo as any)?.id ?? (nuevo as any)?.num_empleado
    navigate(id ? `/empleados/${id}` : '/empleados')
  }

  const handleNext = () => {
    if (!validateCurrentStep()) return
    setActiveStep((s) => Math.min(s + 1, steps.length - 1))
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
          <Button startIcon={<ArrowBackIcon />} component={RouterLink} to="/empleados" size="small">
            Volver
          </Button>
          <Typography variant="h6" component="h1">Nuevo empleado</Typography>
        </Stack>

        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<NavigateBeforeIcon />}
            onClick={handleBack}
            size="small"
            disabled={activeStep === 0 || isPending}
          >
            Atrás
          </Button>

          {activeStep === steps.length - 1 ? (
            <Button
              form="empleado-create-form"
              type="submit"
              variant="contained"
              startIcon={<SaveIcon />}
              size="small"
              disabled={isPending}
            >
              Guardar
            </Button>
          ) : (
            <Button
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

      {isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {`No se pudo crear el empleado${
            (error as any)?.response?.status ? ` (HTTP ${(error as any).response.status})` : ''
          }.`}
        </Alert>
      )}

      {/* FORM */}
      <Box
        id="empleado-create-form"
        component="form"
        ref={formRef}
        onSubmit={handleSubmit}
        autoComplete="off"
      >
        {/* PASO 1: Identificación */}
        <StepPanel active={activeStep === 0} index={0}>
          <Grid2>
            <TextField name="num_empleado" label="Núm. empleado" required disabled={isPending} />
            <FormControlLabel
              control={<Checkbox name="activo" defaultChecked disabled={isPending} />}
              label="Activo"
            />

            <TextField name="nombres" label="Nombres" required disabled={isPending} />
            <TextField name="apellido_paterno" label="Apellido paterno" disabled={isPending} />
            <TextField name="apellido_materno" label="Apellido materno" disabled={isPending} />
          </Grid2>

          <Divider sx={{ my: 2 }} />

          {/* Foto opcional */}
          <Stack direction="row" spacing={2} alignItems="center" useFlexGap flexWrap="wrap">
            <Avatar src={fotoPreview || undefined} sx={{ width: 72, height: 72 }}>
              {/* iniciales si no hay preview */}
            </Avatar>
            <Button
              variant="outlined"
              size="small"
              startIcon={<UploadFileIcon />}
              component="label"
            >
              Subir foto
              <input name="foto" type="file" accept="image/*" hidden onChange={handleFotoChange} />
            </Button>
            {fotoPreview && (
              <Button
                variant="text"
                size="small"
                onClick={() => setFotoPreview(null)}
              >
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
            <TextField
              name="fecha_ingreso"
              label="Fecha ingreso"
              type="date"
              InputLabelProps={{ shrink: true }}
              disabled={isPending}
            />
          </Grid2>
        </StepPanel>

        {/* PASO 3: Contacto y dirección */}
        <StepPanel active={activeStep === 2} index={2}>
          <Grid2>
            <TextField name="email" label="Email" type="email" disabled={isPending} />
            <TextField name="celular" label="Celular" disabled={isPending} />
            <TextField name="genero" label="Género" disabled={isPending} />
            <TextField name="estado_civil" label="Estado civil" disabled={isPending} />
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
        </StepPanel>

        {/* PASO 4: Bancarios & Confirmación */}
        <StepPanel active={activeStep === 3} index={3}>
          <Grid2>
            <TextField name="banco" label="Banco" disabled={isPending} />
            <TextField name="cuenta" label="Cuenta" disabled={isPending} />
          </Grid2>

          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">Resumen</Typography>
            <Typography variant="body2" color="text.secondary">
              Revisa que los datos sean correctos antes de guardar.
            </Typography>
          </Box>
        </StepPanel>
      </Box>

      {/* Snackbar éxito */}
      <Snackbar
        open={successOpen}
        autoHideDuration={1800}
        onClose={() => setSuccessOpen(false)}
        message="Empleado creado"
      />
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
    <Box
      data-step
      sx={{
        display: active ? 'block' : 'none',
        mt: index === 0 ? 0 : 2,
      }}
    >
      {children}
    </Box>
  )
}

function Grid2({ children }: React.PropsWithChildren) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
        gap: 2,
      }}
    >
      {children}
    </Box>
  )
}
