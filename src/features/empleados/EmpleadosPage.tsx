import * as React from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import {
  DataGrid,
  type GridColDef,
  type GridPaginationModel,
  type GridSortModel,
} from '@mui/x-data-grid'
import {
  Box,
  Chip,
  Paper,
  Stack,
  Typography,
  Alert,
  TextField,
  InputAdornment,
  MenuItem,
  Button,
  IconButton,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import TableViewIcon from '@mui/icons-material/TableView'
import VisibilityIcon from '@mui/icons-material/Visibility'
import AddIcon from '@mui/icons-material/Add'          // ⬅️ NUEVO
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import type { AxiosError } from 'axios'

import { fetchEmpleados } from './api'
import type { Empleado } from './types'
import api from '@/api/client'

type EmpleadosList = {
  items: Empleado[]
  total?: number
  next?: string | null
  previous?: string | null
}

type CatalogoItem = { id: number; nombre: string }

// ---- Config ----
const EMPLEADOS_PATH = (import.meta.env.VITE_EMPLEADOS as string) || '/v1/empleados/'
const DEPARTAMENTOS_PATH = (import.meta.env.VITE_DEPARTAMENTOS as string) || '/v1/departamentos/'
const PUESTOS_PATH = (import.meta.env.VITE_PUESTOS as string) || '/v1/puestos/'

// Mapa de columnas → campo de ordenamiento en API (sin Puesto/Email)
const EMPLEADOS_ORDER_MAP: Record<string, string> = {
  num_empleado: 'num_empleado',
  nombres: 'nombres',
  apellido_paterno: 'apellido_paterno',
  apellido_materno: 'apellido_materno',
  departamento_nombre: 'departamento_nombre',
  celular: 'celular',
  activo: 'activo',
}

// ---- Helpers ----
async function fetchCatalogo(path: string): Promise<CatalogoItem[]> {
  const { data } = await api.get(path, { params: { page_size: 1000 } })
  if (Array.isArray(data)) return data as CatalogoItem[]
  return (data?.results as CatalogoItem[]) ?? []
}

// CSV sin Puesto/Email
function toCSV(rows: Empleado[]): string {
  const headers = ['Núm.', 'Nombre(s)', 'A. Paterno', 'A. Materno', 'Departamento', 'Celular', 'Estatus']
  const lines = rows.map((r) => [
    r.num_empleado,
    r.nombres,
    r.apellido_paterno,
    r.apellido_materno,
    r.departamento_nombre,
    r.celular,
    r.activo ? 'Activo' : 'Inactivo',
  ])
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [headers, ...lines].map((row) => row.map(esc).join(',')).join('\n')
}

export default function EmpleadosPage() {
  const navigate = useNavigate()

  // Paginación
  const [paginationModel, setPaginationModel] = React.useState<GridPaginationModel>({ page: 0, pageSize: 10 })

  // Búsqueda (debounce)
  const [search, setSearch] = React.useState('')
  const [debouncedSearch, setDebouncedSearch] = React.useState(search)
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350)
    return () => clearTimeout(t)
  }, [search])

  // Orden server-side
  const [sortModel, setSortModel] = React.useState<GridSortModel>([])
  const ordering = React.useMemo(() => {
    if (!sortModel.length) return undefined
    const { field, sort } = sortModel[0]!
    const apiField = EMPLEADOS_ORDER_MAP[field] ?? field
    return sort === 'desc' ? `-${apiField}` : apiField
  }, [sortModel])

  // Filtros
  const [departamentoId, setDepartamentoId] = React.useState<number | ''>('')
  const [puestoId, setPuestoId] = React.useState<number | ''>('') // filtro se mantiene aunque la columna no esté
  const [estatus, setEstatus] = React.useState<'all' | 'true' | 'false'>('all')

  // Catálogos
  const { data: departamentos = [] } = useQuery<CatalogoItem[]>({
    queryKey: ['departamentos'],
    queryFn: () => fetchCatalogo(DEPARTAMENTOS_PATH),
    placeholderData: [],
  })
  const { data: puestos = [] } = useQuery<CatalogoItem[]>({
    queryKey: ['puestos'],
    queryFn: () => fetchCatalogo(PUESTOS_PATH),
    placeholderData: [],
  })

  // Datos Empleados
  const { data, isLoading, isError, error } = useQuery<EmpleadosList, AxiosError>({
    queryKey: [
      'empleados',
      paginationModel.page,
      paginationModel.pageSize,
      debouncedSearch,
      departamentoId,
      puestoId,
      estatus,
      ordering,
    ],
    queryFn: () =>
      fetchEmpleados({
        page: paginationModel.page + 1,
        page_size: paginationModel.pageSize,
        search: debouncedSearch || undefined,
        departamento: departamentoId || undefined,
        puesto: puestoId || undefined,
        activo: estatus === 'all' ? undefined : estatus === 'true',
        ordering,
      } as any),
    placeholderData: keepPreviousData,
  })

  const rows = data?.items ?? []
  const rowCount = data?.total ?? 0

  // Columnas
  const columns = React.useMemo<GridColDef<Empleado>[]>(
    () => [
      { field: 'num_empleado', headerName: 'Núm.', width: 110, sortable: true, headerClassName: 'dg-bold' },
      { field: 'nombres', headerName: 'Nombre(s)', flex: 1, minWidth: 160, sortable: true, headerClassName: 'dg-bold' },
      { field: 'apellido_paterno', headerName: 'A. Paterno', flex: 1, minWidth: 140, sortable: true, headerClassName: 'dg-bold' },
      { field: 'apellido_materno', headerName: 'A. Materno', flex: 1, minWidth: 140, sortable: true, headerClassName: 'dg-bold' },
      { field: 'departamento_nombre', headerName: 'Departamento', flex: 1, minWidth: 160, sortable: true, headerClassName: 'dg-bold' },
      { field: 'celular', headerName: 'Celular', minWidth: 160, sortable: true, headerClassName: 'dg-bold' },
      {
        field: 'activo',
        headerName: 'Estatus',
        width: 120,
        sortable: true,
        headerClassName: 'dg-bold',
        renderCell: (params) => {
          const v = Boolean(params.value)
          return <Chip label={v ? 'Activo' : 'Inactivo'} color={v ? 'success' : 'default'} size="small" />
        },
      },
      {
        field: 'acciones',
        headerName: 'Acciones',
        width: 130,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        align: 'center',
        headerAlign: 'center',
        renderCell: (params: any) => (
          <Button
            size="small"
            startIcon={<VisibilityIcon />}
            component={RouterLink}
            to={`/empleados/${params.row.id}`}
          >
            Ver
          </Button>
        ),
      },
    ],
    []
  )

  // ---- Export helpers ----
  const [exporting, setExporting] = React.useState(false)

  const commonQueryParams = React.useMemo(() => {
    return {
      search: debouncedSearch || undefined,
      departamento: departamentoId || undefined,
      puesto: puestoId || undefined,
      activo: estatus === 'all' ? undefined : estatus === 'true',
      ordering,
    } as Record<string, unknown>
  }, [debouncedSearch, departamentoId, puestoId, estatus, ordering])

  const handleExportExcelServer = async () => {
    setExporting(true)
    try {
      const base = EMPLEADOS_PATH.endsWith('/') ? EMPLEADOS_PATH.slice(0, -1) : EMPLEADOS_PATH
      const url = `${base}/export/excel/`
      const res = await api.get(url, { params: commonQueryParams, responseType: 'blob' })
      const cd = res.headers['content-disposition'] as string | undefined
      const filename = cd && /filename="?([^"]+)"?/i.test(cd) ? decodeURIComponent(RegExp.$1) : 'empleados.xlsx'
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = filename
      document.body.appendChild(link); link.click(); link.remove()
      URL.revokeObjectURL(link.href)
    } catch (e) {
      console.error('Excel export error', e)
      alert('No se pudo exportar a Excel desde el servidor.')
    } finally {
      setExporting(false)
    }
  }

  const fetchAllEmpleados = async (): Promise<Empleado[]> => {
    const pageSize = 200
    let url: string = EMPLEADOS_PATH
    let params: any = { ...commonQueryParams, page: 1, page_size: pageSize }
    const all: Empleado[] = []
    for (;;) {
      const { data } = await api.get(url, { params })
      if (Array.isArray(data)) {
        all.push(...(data as Empleado[]))
        break
      } else {
        const items = (data?.results as Empleado[]) ?? []
        all.push(...items)
        if (data?.next) {
          url = data.next
          params = undefined
        } else break
      }
    }
    return all
  }

  const handleExportCSV = async () => {
    setExporting(true)
    try {
      const all = await fetchAllEmpleados()
      const csv = toCSV(all)
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = 'empleados.csv'
      document.body.appendChild(link); link.click(); link.remove()
      URL.revokeObjectURL(link.href)
    } catch (e) {
      console.error('CSV export error', e)
      alert('No se pudo exportar a CSV.')
    } finally {
      setExporting(false)
    }
  }

  const handleExportPDF = async () => {
    setExporting(true)
    try {
      const [{ jsPDF }, autoTableMod] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
      // @ts-ignore
      const autoTable = autoTableMod.default as (doc: any, opts: any) => void
      const all = await fetchAllEmpleados()
      const doc = new jsPDF({ orientation: 'landscape' })
      const fecha = new Date().toLocaleString()
      doc.setFontSize(14); doc.text('Empleados', 14, 14)
      doc.setFontSize(10); doc.text(`Generado: ${fecha}`, 14, 20)
      const head = [['Núm.', 'Nombre(s)', 'A. Paterno', 'A. Materno', 'Departamento', 'Celular', 'Estatus']]
      const body = all.map((r) => [
        r.num_empleado,
        r.nombres,
        r.apellido_paterno,
        r.apellido_materno,
        r.departamento_nombre,
        r.celular,
        r.activo ? 'Activo' : 'Inactivo',
      ])
      autoTable(doc, {
        head, body, startY: 26, styles: { fontSize: 8 }, headStyles: { fillColor: [33, 150, 243] },
        didDrawPage: (d: any) => {
          const pageCount = doc.getNumberOfPages()
          doc.setFontSize(9)
          doc.text(
            `Página ${d.pageNumber} de ${pageCount}`,
            doc.internal.pageSize.getWidth() - 40,
            doc.internal.pageSize.getHeight() - 8
          )
        },
      })
      doc.save('empleados.pdf')
    } catch (e) {
      console.error('PDF export error', e)
      alert('No se pudo exportar a PDF en el cliente.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <Paper sx={{ p: 2, mx: 'auto', maxWidth: 1800, width: '100%' }}>
      {/* HEADER / TOOLBAR */}
      <Stack direction="row" alignItems="center" flexWrap="wrap" columnGap={1.5} rowGap={1} mb={2}>
        <Typography variant="h6" sx={{ mr: 1.5, flexShrink: 0 }}>
          Empleados
        </Typography>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
          <TextField
            size="small"
            placeholder="Buscar…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPaginationModel((m) => ({ ...m, page: 0 }))
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ flex: '1 1 220px', minWidth: 200, maxWidth: 320 }}
          />

          <TextField
            select
            size="small"
            label="Departamento"
            value={departamentoId}
            onChange={(e) => {
              setDepartamentoId(e.target.value === '' ? '' : Number(e.target.value))
              setPaginationModel((m) => ({ ...m, page: 0 }))
            }}
            sx={{ flex: '1 1 220px', minWidth: 200 }}
          >
            <MenuItem value="">Todos</MenuItem>
            {departamentos.map((d) => (
              <MenuItem key={d.id} value={d.id}>{d.nombre}</MenuItem>
            ))}
          </TextField>

          <TextField
            select
            size="small"
            label="Puesto"
            value={puestoId}
            onChange={(e) => {
              setPuestoId(e.target.value === '' ? '' : Number(e.target.value))
              setPaginationModel((m) => ({ ...m, page: 0 }))
            }}
            sx={{ flex: '1 1 220px', minWidth: 200 }}
          >
            <MenuItem value="">Todos</MenuItem>
            {puestos.map((p) => (
              <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
            ))}
          </TextField>

          <TextField
            select
            size="small"
            label="Estatus"
            value={estatus}
            onChange={(e) => {
              setEstatus(e.target.value as 'all' | 'true' | 'false')
              setPaginationModel((m) => ({ ...m, page: 0 }))
            }}
            sx={{ flex: '0 0 160px', minWidth: 160 }}
          >
            <MenuItem value="all">Todos</MenuItem>
            <MenuItem value="true">Activos</MenuItem>
            <MenuItem value="false">Inactivos</MenuItem>
          </TextField>

          {/* Acciones (sm+) */}
          <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 1, ml: 'auto', flexShrink: 0 }}>
            {/* ⬇️ NUEVO EMPLEADO */}
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              size="small"
              component={RouterLink}
              to="/empleados/nuevo"
            >
              Nuevo
            </Button>

            <Button variant="outlined" size="small" startIcon={<FileDownloadIcon />} onClick={handleExportExcelServer} disabled={exporting}>
              Excel
            </Button>
            <Button variant="outlined" size="small" startIcon={<TableViewIcon />} onClick={handleExportCSV} disabled={exporting}>
              CSV
            </Button>
            <Button variant="outlined" size="small" startIcon={<PictureAsPdfIcon />} onClick={handleExportPDF} disabled={exporting}>
              PDF
            </Button>
          </Box>

          {/* Acciones (xs) */}
          <Box sx={{ display: { xs: 'flex', sm: 'none' }, gap: 0.5, ml: 'auto', flexShrink: 0 }}>
            {/* ⬇️ NUEVO EMPLEADO (icon) */}
            <IconButton
              color="primary"
              component={RouterLink}
              to="/empleados/nuevo"
              size="small"
              aria-label="Nuevo empleado"
            >
              <AddIcon fontSize="small" />
            </IconButton>

            <IconButton color="primary" onClick={handleExportExcelServer} disabled={exporting} size="small" aria-label="Exportar a Excel">
              <FileDownloadIcon fontSize="small" />
            </IconButton>
            <IconButton onClick={handleExportCSV} disabled={exporting} size="small" aria-label="Exportar a CSV">
              <TableViewIcon fontSize="small" />
            </IconButton>
            <IconButton onClick={handleExportPDF} disabled={exporting} size="small" aria-label="Exportar a PDF">
              <PictureAsPdfIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </Stack>

      {isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {`No se pudo cargar la lista de empleados${error?.response?.status ? ` (HTTP ${error.response.status})` : ''}.`}
        </Alert>
      )}

      <Box sx={{ height: 640, width: '100%' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={isLoading}
          getRowId={(row) => row.id}
          disableRowSelectionOnClick
          localeText={{ noRowsLabel: 'Sin registros' }}
          paginationMode="server"
          rowCount={rowCount}
          pageSizeOptions={[10, 25, 50]}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          sortingMode="server"
          sortModel={sortModel}
          onSortModelChange={setSortModel}
          density="standard"
          disableColumnMenu
          onRowDoubleClick={(p) => navigate(`/empleados/${p.row.id}`)}
          sx={{
            '& .dg-bold .MuiDataGrid-columnHeaderTitle': { fontWeight: 700 },
          }}
        />
      </Box>
    </Paper>
  )
}
