import * as React from 'react'
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { AxiosError } from 'axios'

import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  GlobalStyles,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import EditIcon from '@mui/icons-material/Edit'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import PrintIcon from '@mui/icons-material/Print'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import BeachAccessIcon from '@mui/icons-material/BeachAccess'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import QrCode2Icon from '@mui/icons-material/QrCode2'

import type { Empleado } from './types'
import { fetchEmpleadoById } from './api'

export default function EmpleadoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data, isLoading, isError, error } = useQuery<Empleado, AxiosError>({
    queryKey: ['empleado', id],
    queryFn: () => fetchEmpleadoById(id!),
    enabled: !!id,
  })

  // Para PDF/Impresión
  const printRef = React.useRef<HTMLDivElement>(null)

  // QR (generado on-demand con import dinámico)
  const [qrUrl, setQrUrl] = React.useState<string | null>(null)
  React.useEffect(() => {
    const genQr = async () => {
      if (!data) return
      try {
        const QR = await import('qrcode')
        const texto = JSON.stringify({
          id: (data as any).id ?? id,
          num: (data as any).num_empleado ?? '',
          nombre: `${data.nombres} ${data.apellido_paterno} ${data.apellido_materno}`.trim(),
          email: data.email ?? '',
        })
        const url = await QR.toDataURL(texto, { width: 160, margin: 2 })
        setQrUrl(url)
      } catch {
        setQrUrl(null)
      }
    }
    genQr()
  }, [data, id])

  const handleCopy = (value?: string) => {
    if (!value) return
    navigator.clipboard.writeText(value).catch(() => {})
  }

  const handlePrint = () => {
    window.print()
  }

  const handleExportPDF = async () => {
    if (!printRef.current) return
    const [{ jsPDF }, html2canvasMod] = await Promise.all([
      import('jspdf'),
      import('html2canvas'),
    ])
    const html2canvas = html2canvasMod.default ?? (html2canvasMod as any)
    const canvas = await html2canvas(printRef.current, { scale: 2, useCORS: true })
    const imgData = canvas.toDataURL('image/png')

    const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()

    const imgWidth = pageWidth
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    if (imgHeight > pageHeight) {
      const scale = pageHeight / imgHeight
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth * scale, pageHeight)
    } else {
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
    }

    pdf.save(`empleado_${(data as any)?.num_empleado ?? id}.pdf`)
  }

  return (
    <Paper
      sx={{
        p: 2,
        mx: 'auto',
        maxWidth: 1000,
        '@media print': {
          boxShadow: 'none',
          m: 0,
          borderRadius: 0,
        },
      }}
    >
      {/* Reglas globales de impresión para ocultar elementos con .no-print */}
      <GlobalStyles styles={{ '@media print': { '.no-print': { display: 'none !important' } } }} />

      {/* Header (no se imprime) */}
      <Stack className="no-print" direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} size="small">
            Volver
          </Button>
          <Typography variant="h6" component="h1">Detalle del empleado</Typography>
        </Stack>

        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<PrintIcon />} size="small" onClick={handlePrint}>
            Imprimir
          </Button>
          <Button variant="contained" startIcon={<PictureAsPdfIcon />} size="small" onClick={handleExportPDF}>
            PDF
          </Button>
          <Button
            variant="text"
            startIcon={<EditIcon />}
            size="small"
            component={RouterLink}
            to="edit"
            disabled
            title="Próximamente"
          >
            Editar
          </Button>
        </Stack>
      </Stack>

      {/* Contenido imprimible */}
      <Box ref={printRef}>
        {isLoading && (
          <Box sx={{ display: 'grid', placeItems: 'center', height: 200 }}>
            <CircularProgress />
          </Box>
        )}

        {isError && (
          <Alert severity="error">
            {`No se pudo cargar el empleado${
              error?.response?.status ? ` (HTTP ${error.response.status})` : ''
            }.`}
          </Alert>
        )}

        {data && (
          <Box>
            {/* Encabezado con avatar y estado */}
            <Stack direction="row" spacing={2} alignItems="center" mb={2}>
              <Avatar
                sx={{ width: 64, height: 64, fontSize: 24 }}
                src={(data as any).foto || undefined}
              >
                {`${data.nombres?.[0] ?? ''}${data.apellido_paterno?.[0] ?? ''}`.toUpperCase()}
              </Avatar>
              <Stack spacing={0.5}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  <Typography variant="h5" sx={{ mr: 1 }}>
                    {data.nombres} {data.apellido_paterno} {data.apellido_materno}
                  </Typography>
                  <Chip
                    size="small"
                    color={data.activo ? 'success' : 'default'}
                    label={data.activo ? 'Activo' : 'Inactivo'}
                  />
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  {(data as any).departamento_nombre && (
                    <Chip size="small" label={(data as any).departamento_nombre} />
                  )}
                  {(data as any).puesto_nombre && (
                    <Chip size="small" label={(data as any).puesto_nombre} />
                  )}
                  {(data as any).turno_nombre && (
                    <Chip size="small" label={(data as any).turno_nombre} />
                  )}
                </Stack>
              </Stack>
            </Stack>

            {/* Acciones rápidas (no se imprimen) */}
            <Stack className="no-print" direction="row" spacing={1} mb={2} flexWrap="wrap">
              <Button
                startIcon={<CalendarMonthIcon />}
                variant="outlined"
                component={RouterLink}
                to="asistencias"
                size="small"
              >
                Asistencias
              </Button>
              <Button
                startIcon={<BeachAccessIcon />}
                variant="outlined"
                component={RouterLink}
                to="vacaciones"
                size="small"
              >
                Vacaciones
              </Button>
              <Button
                startIcon={<FactCheckIcon />}
                variant="outlined"
                component={RouterLink}
                to="permisos"
                size="small"
              >
                Permisos
              </Button>
            </Stack>

            {/* Layout de detalles (CSS Grid) */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2,
              }}
            >
              <Field label="Núm. empleado" value={(data as any).num_empleado} />
              <Field label="Departamento" value={(data as any).departamento_nombre} />
              <Field label="Puesto" value={(data as any).puesto_nombre} />
              <Field label="Turno" value={(data as any).turno_nombre} />

              <Stack spacing={0.5} direction="row" alignItems="center">
                <Box flex={1}>
                  <Field label="Email" value={data.email} />
                </Box>
                <Tooltip title="Copiar correo" className="no-print">
                  <IconButton size="small" onClick={() => handleCopy(data.email ?? '')}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
              <Field label="Celular" value={(data as any).celular} />

              <Field label="Género" value={(data as any).genero_display ?? (data as any).genero} />
              <Field
                label="Estado civil"
                value={(data as any).estado_civil_display ?? (data as any).estado_civil}
              />

              <Field label="Fecha ingreso" value={fmtDate((data as any).fecha_ingreso)} />
              <Field label="Horario" value={(data as any).horario_nombre} />

              {/* Dirección ocupa todo el ancho */}
              <Box sx={{ gridColumn: '1 / -1' }}>
                <Field
                  label="Dirección"
                  value={[
                    (data as any).calle,
                    (data as any).numero,
                    (data as any).colonia,
                    (data as any).municipio,
                    (data as any).estado,
                    (data as any).cp,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                />
              </Box>

              <Field label="Banco" value={(data as any).banco} />
              <Field label="Cuenta" value={mask((data as any).cuenta)} />
            </Box>

            {/* Bloque QR (derecha) */}
            <Box
              sx={{
                mt: 3,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr auto' },
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Stack spacing={0.5}>
                <Typography variant="caption" color="text.secondary">Identificación</Typography>
                <Typography>
                  {(data as any).num_empleado ? `Empleado #${(data as any).num_empleado}` : `ID: ${id}`}
                </Typography>
              </Stack>

              <Stack alignItems="center" spacing={0.5}>
                {qrUrl ? (
                  <Box component="img" src={qrUrl} alt="QR empleado" sx={{ width: 128, height: 128 }} />
                ) : (
                  <Stack alignItems="center" spacing={0.5}>
                    <QrCode2Icon fontSize="large" />
                    <Typography variant="caption" color="text.secondary">
                      (Instala <code>qrcode</code> para ver el QR)
                    </Typography>
                  </Stack>
                )}
              </Stack>
            </Box>
          </Box>
        )}
      </Box>
    </Paper>
  )
}

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <Stack spacing={0.5}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography>{value || '—'}</Typography>
    </Stack>
  )
}

function mask(v?: string) {
  if (!v) return '—'
  const s = String(v)
  return s.length > 4 ? `•••• ${s.slice(-4)}` : '••••'
}

function fmtDate(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-MX')
}
