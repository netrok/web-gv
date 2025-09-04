// src/features/empleados/pdf.ts
import type { Empleado } from './types'

/* ===== Helpers de formato ===== */
function fmtDate(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-MX')
}
function fmtMoney(v?: string | number) {
  if (v === undefined || v === null || v === '') return '—'
  const n = Number(v)
  return Number.isFinite(n) ? n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' }) : String(v)
}
function maskEnd4(v?: string | number) {
  if (v === undefined || v === null || v === '') return '—'
  const s = String(v)
  return s.length > 4 ? `•••• ${s.slice(-4)}` : '••••'
}
/** Usa el *_nombre si existe; de lo contrario el *_id; si nada, '—' */
function preferName(e: any, nameKey: string, idKey: string) {
  const name = e?.[nameKey]
  if (name != null && String(name).trim() !== '') return String(name)
  const id = e?.[idKey]
  return id != null && String(id).trim() !== '' ? String(id) : '—'
}

/* ===== Helpers de imagen ===== */
async function blobToDataURL(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = reject
    r.readAsDataURL(blob)
  })
}
async function loadImageDataURL(src: File | Blob | string): Promise<string | null> {
  try {
    if (src instanceof File || src instanceof Blob) {
      return await blobToDataURL(src)
    }
    if (typeof src === 'string') {
      const res = await fetch(src, { mode: 'cors' })
      if (!res.ok) return null
      const b = await res.blob()
      return await blobToDataURL(b)
    }
  } catch {}
  return null
}

/** 2 pares por fila (4 columnas): L V | L V */
function toTwoPairRows(pairs: Array<[string, any]>): string[][] {
  const rows: string[][] = []
  for (let i = 0; i < pairs.length; i += 2) {
    const [l1, v1] = pairs[i]!
    const [l2, v2] = pairs[i + 1] ?? ['', '']
    const _v1 = v1 == null || String(v1).trim() === '' ? '—' : String(v1)
    const _v2 = v2 == null || String(v2).trim() === '' ? '—' : String(v2)
    rows.push([l1, _v1, l2, _v2])
  }
  return rows
}

/** Normaliza teléfonos para comparar (solo dígitos) */
function normPhone(v?: any) {
  return v == null ? '' : String(v).replace(/\D+/g, '')
}

/** Filtra pares con valor vacío si hideEmpty=true */
function filterPairs(pairs: Array<[string, any]>, hideEmpty: boolean): Array<[string, any]> {
  if (!hideEmpty) return pairs
  return pairs.filter(([, v]) => !(v == null || (typeof v === 'string' && v.trim() === '')))
}

/* ===== Opciones de PDF ===== */
type SignatureLine = {
  /** Nombre a mostrar bajo la línea */
  name?: string
  /** Puesto a mostrar bajo el nombre */
  title?: string
  /** Etiqueta encima de la línea (ej. “Nombre y firma del empleado”) */
  label?: string
  /** Imagen de firma (opcional) */
  signImage?: string | Blob | File
}

type PdfOpts = {
  logo?: string | Blob | File
  companyName?: string
  hideEmpty?: boolean
  /** Folio a mostrar en la barra superior (derecha) */
  folio?: string
  /** Imagen de huella a la derecha de la firma del empleado */
  fingerprint?: string | Blob | File
  /** Firmas a mostrar al final (3 columnas) */
  signatures?: {
    empleado?: SignatureLine
    supervisor?: SignatureLine
    rh?: SignatureLine
  }
}

/* ===== Export principal ===== */
export async function exportEmpleadoPDF(e: Partial<Empleado>, opts: PdfOpts = {}) {
  const hideEmpty = opts.hideEmpty ?? true

  const [{ jsPDF }, autoTableMod] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])
  // @ts-ignore
  const autoTable = (autoTableMod.default ?? autoTableMod) as (doc: any, opts: any) => void

  // Paleta corporativa
  const PRIMARY: [number, number, number] = [12, 53, 106]
  const BORDER:  [number, number, number] = [210, 210, 210]
  const HEADBG:  [number, number, number] = [243, 246, 252]
  const TEXT:    [number, number, number] = [20, 20, 20]
  const MUTED:   [number, number, number] = [85, 90, 95]
  const FOOT:    [number, number, number] = [120, 120, 120]

  const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' })
  const margin = 36
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()

  /* ===== HEADER (barra + logo + folio) ===== */
  const barH = 52
  doc.setFillColor(...PRIMARY)
  doc.rect(0, 0, pageW, barH, 'F')

  const envLogo = (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.VITE_APP_LOGO) || undefined
  const logoSrc = opts.logo ?? envLogo ?? '/logo.png'
  let titleX = margin
  if (logoSrc) {
    const logoData = await loadImageDataURL(logoSrc as any)
    if (logoData) {
      const logoH = 28
      let logoW = 120
      try {
        const img = new Image()
        img.src = logoData
        await new Promise(res => { img.onload = () => res(null) })
        const ratio = img.width / img.height
        logoW = Math.min(logoH * ratio, 120)
      } catch {}
      const fmt = logoData.startsWith('data:image/png') ? 'PNG' : 'JPEG'
      doc.addImage(logoData, fmt, margin, (barH - logoH) / 2, logoW, logoH)
      titleX = margin + logoW + 10
    }
  }

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  const title = opts.companyName ? `Ficha de empleado · ${opts.companyName}` : 'FICHA DE EMPLEADO'
  doc.text(title, titleX, 30)

  const numEmpleado = (e as any).num_empleado ?? '—'
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text(`Núm. empleado: ${numEmpleado}`, pageW - margin, 22 + 8, { align: 'right' })
  if (opts.folio) {
    doc.text(`Folio: ${String(opts.folio)}`, pageW - margin, 22 + 8 + 12, { align: 'right' })
  }

  /* ===== CABECERA (nombre + estado + foto) ===== */
  let y = barH + 18
  const nombre =
    `${(e as any).nombres ?? ''} ${(e as any).apellido_paterno ?? ''} ${(e as any).apellido_materno ?? ''}`.trim() || '—'
  const estado = (e as any).activo ? 'Activo' : 'Inactivo'

  // Foto
  const fotoSrc = (e as any).foto as string | File | Blob | undefined
  const fotoSize = 96
  let fotoDrawn = false
  if (fotoSrc) {
    const dataUrl = await loadImageDataURL(fotoSrc)
    if (dataUrl) {
      doc.setDrawColor(...BORDER)
      doc.rect(pageW - margin - fotoSize, y - 6, fotoSize, fotoSize, 'S')
      const fmt = dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG'
      doc.addImage(dataUrl, fmt, pageW - margin - fotoSize + 1, y - 5, fotoSize - 2, fotoSize - 2)
      fotoDrawn = true
    }
  }

  doc.setTextColor(...TEXT)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(nombre, margin, y)

  y += 18
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(...MUTED)
  doc.text(`Estado: ${estado}`, margin, y)

  if (fotoDrawn) {
    const yBottom = (barH + 18) + fotoSize
    if (yBottom + 8 > y) y = yBottom + 8
  }
  y += 10
  doc.setDrawColor(...BORDER)
  doc.line(margin, y, pageW - margin, y)
  y += 12

  /* ===== Tablas (4 columnas: L V | L V) ===== */
  const commonTableOpts = {
    styles: {
      fontSize: 10,
      cellPadding: 6,
      lineColor: BORDER as any,
      lineWidth: 0.5,
      textColor: TEXT as any,
      halign: 'left' as const,
      valign: 'middle' as const,
    },
    margin: { left: margin, right: margin },
    tableWidth: pageW - margin * 2,
    theme: 'grid' as const,
    headStyles: {
      fillColor: HEADBG as any,
      textColor: TEXT as any,
      fontStyle: 'bold' as const,
    },
    columnStyles: {
      0: { cellWidth: 120, fontStyle: 'bold', textColor: MUTED as any },
      1: {},
      2: { cellWidth: 120, fontStyle: 'bold', textColor: MUTED as any },
      3: {},
    } as any,
    showHead: 'never' as const,
  }

  const sectionTitle = (title: string) => {
    doc.setFillColor(...HEADBG)
    doc.setDrawColor(...BORDER)
    doc.rect(margin, y, pageW - margin * 2, 24, 'F')
    doc.setTextColor(...TEXT)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(title, margin + 8, y + 16)
    y += 30
  }

  const tableTwoPairs = (pairs: Array<[string, any]>) => {
    const pruned = filterPairs(pairs, hideEmpty)
    if (!pruned.length) return
    const body = toTwoPairRows(pruned)
    autoTable(doc, { ...commonTableOpts, startY: y, body })
    // @ts-ignore
    y = (doc as any).lastAutoTable.finalY + 12
  }

  const ensureSpace = (h: number) => {
    if (y + h > pageH - margin - 24) {
      doc.addPage()
      y = margin
    }
  }

  /* ===== Secciones ===== */
  sectionTitle('Identificación')
  tableTwoPairs([
    ['Fecha de ingreso', fmtDate((e as any).fecha_ingreso)],
    ['Fecha de nacimiento', fmtDate((e as any).fecha_nacimiento)],
  ])

  sectionTitle('Datos personales')
  tableTwoPairs([
    // (Nombres/Apellidos NO se repiten)
    ['Género', (e as any).genero_display ?? (e as any).genero],
    ['Estado civil', (e as any).estado_civil_display ?? (e as any).estado_civil],
    ['CURP', (e as any).curp],
    ['RFC', (e as any).rfc],
    ['NSS', (e as any).nss],
    ['Escolaridad', (e as any).escolaridad],
  ])

  sectionTitle('Contacto')
  {
    const tel = (e as any).telefono
    const cel = (e as any).celular
    const pairs: Array<[string, any]> = []
    if (tel && cel && normPhone(tel) === normPhone(cel)) {
      pairs.push(['Teléfono/Celular', tel])
    } else {
      pairs.push(['Teléfono', tel])
      pairs.push(['Celular', cel])
    }
    pairs.push(['Email', (e as any).email])
    pairs.push(['Emergencia - Nombre', (e as any).contacto_emergencia_nombre])
    pairs.push(['Emergencia - Parentesco', (e as any).contacto_emergencia_parentesco])
    pairs.push(['Emergencia - Teléfono', (e as any).contacto_emergencia_telefono])
    tableTwoPairs(pairs)
  }

  sectionTitle('Dirección')
  tableTwoPairs([
    ['Calle', (e as any).calle],
    ['Número', (e as any).numero],
    ['Colonia', (e as any).colonia],
    ['Municipio', (e as any).municipio],
    ['Estado', (e as any).estado],
    ['CP', (e as any).cp],
  ])

  sectionTitle('Datos laborales')
  tableTwoPairs([
    ['Departamento', preferName(e, 'departamento_nombre', 'departamento_id')],
    ['Puesto',       preferName(e, 'puesto_nombre',       'puesto_id')],
    ['Turno',        preferName(e, 'turno_nombre',        'turno_id')],
    ['Horario',      preferName(e, 'horario_nombre',      'horario_id')],
    ['Tipo de contrato', (e as any).tipo_contrato],
    ['Tipo de jornada',  (e as any).tipo_jornada],
    ['Sueldo',           fmtMoney((e as any).sueldo)],
  ])

  sectionTitle('Bancarios')
  tableTwoPairs([
    ['Banco', (e as any).banco],
    ['Cuenta', maskEnd4((e as any).cuenta)],
    ['CLABE', maskEnd4((e as any).clabe)],
  ])

  if ((e as any).notas && String((e as any).notas).trim() !== '') {
    sectionTitle('Notas')
    autoTable(doc, {
      ...commonTableOpts,
      startY: y,
      body: [[(e as any).notas, '', '', '']],
      columnStyles: { 0: {}, 1: { cellWidth: 0 }, 2: { cellWidth: 0 }, 3: { cellWidth: 0 } } as any,
      showHead: 'never',
    })
    // @ts-ignore
    y = (doc as any).lastAutoTable.finalY + 12
  }

  /* ===== Bloque de firmas & huella ===== */
  const drawSignatureBox = async (
    x: number,
    w: number,
    line: SignatureLine | undefined,
    addFingerprint?: boolean
  ) => {
    const boxH = 110
    ensureSpace(boxH)
    const baseY = y

    // Línea de firma
    const lineY = baseY + 60
    doc.setDrawColor(...BORDER)
    doc.line(x, lineY, x + w, lineY)

    // Etiqueta encima (opcional)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...MUTED)
    const label = line?.label ?? ''
    if (label) doc.text(label, x, baseY + 18)

    // Nombre + puesto (debajo)
    doc.setTextColor(...TEXT)
    doc.setFont('helvetica', 'bold')
    doc.text(line?.name ?? '', x, lineY + 14)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...MUTED)
    doc.text(line?.title ?? '', x, lineY + 28)

    // Imagen de firma (opcional)
    if (line?.signImage) {
      const img = await loadImageDataURL(line.signImage)
      if (img) {
        const fmt = img.startsWith('data:image/png') ? 'PNG' : 'JPEG'
        // Colocar al centro sobre la línea
        const iw = Math.min(140, w * 0.8)
        const ih = iw * 0.35
        const ix = x + (w - iw) / 2
        const iy = baseY + 30
        doc.addImage(img, fmt, ix, iy, iw, ih)
      }
    }

    // Huella (solo en caja del empleado, si se solicita)
    if (addFingerprint) {
      const fp = opts.fingerprint ? await loadImageDataURL(opts.fingerprint) : null
      const fpSize = 48
      const fpX = x + w - fpSize
      const fpY = baseY + 8
      doc.setDrawColor(...BORDER)
      doc.rect(fpX - 2, fpY - 2, fpSize + 4, fpSize + 4) // marco
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...MUTED)
      doc.text('Huella', fpX - 2, fpY - 6)
      if (fp) {
        const fmt = fp.startsWith('data:image/png') ? 'PNG' : 'JPEG'
        doc.addImage(fp, fmt, fpX, fpY, fpSize, fpSize)
      }
    }

    y = baseY + boxH
  }

  // Solo si se piden firmas
  if (opts.signatures) {
    const gap = 12
    const totalW = pageW - margin * 2
    const colW = (totalW - gap * 2) / 3
    const x1 = margin
    const x2 = margin + colW + gap
    const x3 = margin + (colW + gap) * 2

    // Título de bloque
    ensureSpace(40)
    doc.setFillColor(...HEADBG)
    doc.setDrawColor(...BORDER)
    doc.rect(margin, y, totalW, 24, 'F')
    doc.setTextColor(...TEXT)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('Firmas', margin + 8, y + 16)
    y += 28

    // Tres columnas
    await drawSignatureBox(x1, colW, opts.signatures.empleado, true)
    // Alinear y para las otras dos cajas en la misma fila
    const yRowTop = y - 110
    // “Congelar” y, dibujar las otras 2 cajas y luego continuar debajo
    const prevY = y
    y = yRowTop
    await drawSignatureBox(x2, colW, opts.signatures.supervisor)
    y = yRowTop
    await drawSignatureBox(x3, colW, opts.signatures.rh)
    y = prevY
  }

  /* ===== Footer: paginación ===== */
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(9)
    doc.setTextColor(...FOOT)
    doc.text(`Página ${i} de ${pageCount}`, pageW - margin, pageH - margin / 2, { align: 'right' })
  }

  const fileId = (e as any).num_empleado ?? (e as any).id ?? 'empleado'
  doc.save(`empleado_${fileId}.pdf`)
}
