import * as React from 'react'
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { AxiosError } from 'axios'

import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'

import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import EditIcon from '@mui/icons-material/Edit'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import BadgeIcon from '@mui/icons-material/Badge'
import WorkIcon from '@mui/icons-material/Work'
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter'
import ScheduleIcon from '@mui/icons-material/Schedule'
import EventIcon from '@mui/icons-material/Event'
import EmailIcon from '@mui/icons-material/Email'
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone'
import HomeWorkIcon from '@mui/icons-material/HomeWork'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import CreditCardIcon from '@mui/icons-material/CreditCard'
import WcIcon from '@mui/icons-material/Wc'
import FavoriteIcon from '@mui/icons-material/Favorite'

import { exportEmpleadoPDF } from './pdf'
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

  const handleExportPDF = async () => {
    if (!data) return
    await exportEmpleadoPDF(data)
  }

  const handleCopy = (value?: string) => {
    if (!value) return
    navigator.clipboard.writeText(value).catch(() => {})
  }

  return (
    <Paper
      sx={{
        p: 2,
        mx: 'auto',
        maxWidth: 1200,
        '@media print': { boxShadow: 'none', m: 0, borderRadius: 0 },
      }}
    >
      {/* Header */}
      <Stack className="no-print" direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} size="small">
            Volver
          </Button>
          <Typography variant="h6" component="h1">Detalle del empleado</Typography>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button variant="contained" startIcon={<PictureAsPdfIcon />} size="small" onClick={handleExportPDF}>
            PDF
          </Button>
          <Button
            variant="text"
            startIcon={<EditIcon />}
            size="small"
            component={RouterLink}
            to={`/empleados/${id}/editar`}
          >
            Editar
          </Button>
        </Stack>
      </Stack>

      {/* Contenido */}
      <Box>
        {isLoading && <LoadingSkeleton />}

        {isError && (
          <Alert severity="error">
            {`No se pudo cargar el empleado${error?.response?.status ? ` (HTTP ${error.response.status})` : ''}.`}
          </Alert>
        )}

        {data && (
          <Box>
            {/* Summary header */}
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                  <Avatar
                    sx={{ width: 72, height: 72, fontSize: 28 }}
                    src={(data as any).foto || undefined}
                  >
                    {`${data.nombres?.[0] ?? ''}${data.apellido_paterno?.[0] ?? ''}`.toUpperCase()}
                  </Avatar>

                  <Box sx={{ minWidth: 260 }}>
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

                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" mt={0.5}>
                      {(data as any).departamento_nombre && (
                        <Chip size="small" icon={<BusinessCenterIcon />} label={(data as any).departamento_nombre} />
                      )}
                      {(data as any).puesto_nombre && (
                        <Chip size="small" icon={<WorkIcon />} label={(data as any).puesto_nombre} />
                      )}
                      {(data as any).turno_nombre && (
                        <Chip size="small" icon={<ScheduleIcon />} label={(data as any).turno_nombre} />
                      )}
                    </Stack>
                  </Box>

                  {/* Acciones rápidas */}
                  <Stack className="no-print" direction="row" spacing={1} sx={{ ml: 'auto' }} flexWrap="wrap">
                    <Button size="small" variant="outlined" component={RouterLink} to="asistencias">Asistencias</Button>
                    <Button size="small" variant="outlined" component={RouterLink} to="vacaciones">Vacaciones</Button>
                    <Button size="small" variant="outlined" component={RouterLink} to="permisos">Permisos</Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>

            {/* 2 columnas: aside + contenido */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '320px 1fr' },
                gap: 2,
              }}
            >
              {/* Aside */}
              <Stack spacing={2}>
                <Section title="Contacto">
                  <InfoRow icon={<EmailIcon />} label="Email" value={data.email}>
                    {data.email && (
                      <Tooltip title="Copiar">
                        <IconButton size="small" onClick={() => handleCopy(data.email!)}>
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </InfoRow>
                  <InfoRow icon={<PhoneIphoneIcon />} label="Celular" value={(data as any).celular}>
                    {(data as any).celular && (
                      <Tooltip title="Copiar">
                        <IconButton size="small" onClick={() => handleCopy((data as any).celular!)}>
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </InfoRow>
                </Section>

                <Section title="Identificación">
                  <InfoRow icon={<BadgeIcon />} label="Núm. empleado" value={(data as any).num_empleado} />
                  <InfoRow icon={<EventIcon />} label="Fecha ingreso" value={fmtDate((data as any).fecha_ingreso)} />
                  <InfoRow icon={<ScheduleIcon />} label="Horario" value={(data as any).horario_nombre} />
                </Section>
              </Stack>

              {/* Contenido principal */}
              <Stack spacing={2}>
                <Section title="Datos laborales">
                  <InfoRow icon={<BusinessCenterIcon />} label="Departamento" value={(data as any).departamento_nombre} />
                  <InfoRow icon={<WorkIcon />} label="Puesto" value={(data as any).puesto_nombre} />
                  <InfoRow icon={<ScheduleIcon />} label="Turno" value={(data as any).turno_nombre} />
                </Section>

                <Section title="Datos personales">
                  <InfoRow icon={<WcIcon />} label="Género" value={(data as any).genero_display ?? (data as any).genero} />
                  <InfoRow icon={<FavoriteIcon />} label="Estado civil" value={(data as any).estado_civil_display ?? (data as any).estado_civil} />
                </Section>

                <Section title="Dirección">
                  <InfoRow icon={<HomeWorkIcon />} label="Dirección" value={formatAddress(data)} />
                </Section>

                <Section title="Bancarios">
                  <InfoRow icon={<AccountBalanceIcon />} label="Banco" value={(data as any).banco} />
                  <InfoRow icon={<CreditCardIcon />} label="Cuenta" value={mask((data as any).cuenta)} />
                </Section>
              </Stack>
            </Box>
          </Box>
        )}
      </Box>
    </Paper>
  )
}

/* ---------- UI helpers ---------- */

function Section({ title, children }: React.PropsWithChildren<{ title: string }>) {
  return (
    <Card variant="outlined">
      <CardHeader title={title} sx={{ pb: 0.5 }} />
      <CardContent sx={{ pt: 1.5 }}>
        <Stack spacing={1.25}>{children}</Stack>
      </CardContent>
    </Card>
  )
}

function InfoRow({
  icon,
  label,
  value,
  children,
}: React.PropsWithChildren<{ icon?: React.ReactNode; label: string; value?: React.ReactNode }>) {
  return (
    <Stack direction="row" alignItems="center" spacing={1.5}>
      {icon && <Box sx={{ color: 'text.secondary', display: 'grid', placeItems: 'center' }}>{icon}</Box>}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography sx={{ wordBreak: 'break-word' }}>{value ?? '—'}</Typography>
      </Box>
      {children}
    </Stack>
  )
}

function LoadingSkeleton() {
  return (
    <Stack spacing={2}>
      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center">
            <Skeleton variant="circular" width={72} height={72} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width={280} />
              <Skeleton variant="text" width={200} />
            </Box>
          </Stack>
        </CardContent>
      </Card>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '320px 1fr' },
          gap: 2,
        }}
      >
        <Card variant="outlined"><CardContent><Skeleton height={140} /></CardContent></Card>
        <Card variant="outlined"><CardContent><Skeleton height={140} /></CardContent></Card>
      </Box>
    </Stack>
  )
}

/* ---------- formatters ---------- */

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

function formatAddress(e: Partial<Empleado>) {
  const parts = [
    (e as any).calle,
    (e as any).numero,
    (e as any).colonia,
    (e as any).municipio,
    (e as any).estado,
    (e as any).cp,
  ].filter(Boolean)
  return parts.length ? parts.join(', ') : '—'
}
