function abrirExportPanel(sid) {
  const ses = _getSesionData(sid)
  const overlay = document.createElement('div')
  overlay.id = 'exportOverlay'
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;display:flex;align-items:center;justify-content:center'
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:10px;padding:28px;width:420px;box-shadow:0 8px 32px rgba(0,0,0,.2)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <div style="font-size:16px;font-weight:700">Exportar reporte PDF</div>
        <button onclick="document.getElementById('exportOverlay').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#94a3b8">×</button>
      </div>
      <div style="background:#f8f9fc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:20px;font-size:13px;color:#4b5563">
        <div style="font-weight:600;margin-bottom:4px">${ses.sid}</div>
        <div>Semana ${ses.semana} · ${fmtDate(ses.fecha)}</div>
        <div style="margin-top:4px">${ses.califs.length} calificaciones · ${ses.acts.length} acciones</div>
      </div>
      <div id="pdfStatus" style="display:none;text-align:center;padding:12px;font-size:13px;margin-bottom:12px;border-radius:6px"></div>
      <div style="display:flex;gap:10px">
        <button onclick="descargarPdf('${sid}')" style="flex:1;padding:10px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">
          📥 Descargar PDF
        </button>
        ${DRIVE_FOLDER_ID ? `<button onclick="guardarEnDrive('${sid}')" style="flex:1;padding:10px;background:#16a34a;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">
          ☁️ Guardar en Drive
        </button>` : ''}
      </div>
    </div>`
  document.body.appendChild(overlay)
}

async function descargarPdf(sid) {
  _setPdfStatus('⏳ Generando PDF…', '#eff4ff', '#1d4ed8')
  try {
    const doc = await _buildPdf(sid)
    doc.save(sid + '_Reporte_WBR.pdf')
    _setPdfStatus('✅ PDF descargado', '#f0fdf4', '#15803d')
    setTimeout(() => document.getElementById('exportOverlay')?.remove(), 1500)
  } catch(e) {
    _setPdfStatus('❌ Error: ' + e.message, '#fef2f2', '#b91c1c')
  }
}

async function guardarEnDrive(sid) {
  _setPdfStatus('⏳ Subiendo a Drive…', '#eff4ff', '#1d4ed8')
  try {
    const doc = await _buildPdf(sid)
    const b64 = doc.output('datauristring').split(',')[1]
    const res = await post('savePdfToDrive', { nombre: sid + '_WBR.pdf', b64, folderId: DRIVE_FOLDER_ID })
    if (res.success) {
      _setPdfStatus('✅ Guardado en Drive', '#f0fdf4', '#15803d')
      setTimeout(() => document.getElementById('exportOverlay')?.remove(), 1500)
    } else {
      _setPdfStatus('❌ ' + res.error, '#fef2f2', '#b91c1c')
    }
  } catch(e) {
    _setPdfStatus('❌ Error: ' + e.message, '#fef2f2', '#b91c1c')
  }
}

function _setPdfStatus(msg, bg, color) {
  const el = document.getElementById('pdfStatus')
  if (!el) return
  el.style.display = ''
  el.style.background = bg
  el.style.color = color
  el.textContent = msg
}

async function _buildPdf(sid) {
  if (typeof jspdf === 'undefined' && typeof window.jspdf === 'undefined') {
    await new Promise((res, rej) => {
      const s = document.createElement('script')
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
      s.onload = res; s.onerror = rej
      document.head.appendChild(s)
    })
  }
  const { jsPDF } = window.jspdf
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210, M = 14, CW = W - M * 2
  let y = 0

  const ses = _getSesionData(sid)
  const vendedores = state.equipo.filter(m => m.Rol !== 'Coordinador')

  // Header
  doc.setFillColor(15, 31, 61)
  doc.rect(0, 0, W, 24, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14); doc.setTextColor(255, 255, 255)
  doc.text('WBR Portal', M, 10)
  doc.setFontSize(8); doc.setTextColor(150, 180, 255)
  doc.text('Weekly Business Review', M, 15)
  doc.setTextColor(255,255,255); doc.setFontSize(9)
  doc.text(ses.sid + '  ·  Semana ' + ses.semana + '  ·  ' + fmtDate(ses.fecha), W - M, 10, { align: 'right' })
  doc.text('Coordinador: ' + COORD, W - M, 16, { align: 'right' })
  y = 30

  // Sección KPIs
  y = _pdfSeccion(doc, '1. KPIs por agente', y, W, M)
  vendedores.forEach(v => {
    if (y > 255) { doc.addPage(); y = 20 }
    const cal = ses.califs.find(c => c.Vendedor === v.Nombre)
    const pct = cal ? Math.round(parseFloat(cal.Pct_Cumplimiento) * 100) : null
    doc.setFillColor(239, 244, 255)
    doc.rect(M, y, CW, 8, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(15, 31, 61)
    doc.text(v.Nombre, M + 3, y + 5.5)
    if (pct !== null) {
      const [r,g,b] = pct >= 80 ? [22,163,74] : pct >= 50 ? [217,119,6] : [220,38,38]
      doc.setTextColor(r,g,b); doc.text(pct + '%', W - M - 3, y + 5.5, { align: 'right' })
    }
    y += 10
    const kpisRol = state.kpis[v.Rol] || []
    kpisRol.forEach((kpi, i) => {
      if (y > 270) { doc.addPage(); y = 20 }
      const ok = cal?.['KPI_' + (i+1)] === 'TRUE'
      if (i % 2 === 0) { doc.setFillColor(248,249,252); doc.rect(M, y, CW, 7, 'F') }
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(75, 85, 99)
      doc.text(kpi, M + 4, y + 5)
      doc.setFont('helvetica', 'bold'); doc.setTextColor(ok ? 22 : 220, ok ? 163 : 38, ok ? 74 : 38)
      doc.text(ok ? '✓' : '✗', W - M - 5, y + 5)
      y += 7
    })
    y += 4
  })

  // Sección Descubrimientos
  if (ses.descs.length) {
    if (y > 240) { doc.addPage(); y = 20 }
    y = _pdfSeccion(doc, '2. Descubrimientos', y, W, M)
    ses.descs.forEach(d => {
      if (y > 255) { doc.addPage(); y = 20 }
      doc.setFillColor(255, 251, 235)
      const lines = doc.splitTextToSize(d.Descubrimiento || '', CW - 8)
      const h = lines.length * 5 + 10
      doc.rect(M, y, CW, h, 'F')
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(146, 64, 14)
      doc.text(d.Vendedor, M + 4, y + 6)
      doc.setFont('helvetica', 'normal'); doc.setTextColor(120, 53, 15)
      doc.text(lines, M + 4, y + 12)
      y += h + 6
    })
  }

  // Sección Acciones
  if (ses.acts.length) {
    if (y > 240) { doc.addPage(); y = 20 }
    y = _pdfSeccion(doc, '3. Plan de acciones', y, W, M)
    ses.acts.forEach((a, i) => {
      if (y > 260) { doc.addPage(); y = 20 }
      if (i % 2 === 0) { doc.setFillColor(248,249,252); doc.rect(M, y, CW, 8, 'F') }
      const [pr, pg, pb] = a.Prioridad === 'Alta' ? [220,38,38] : a.Prioridad === 'Media' ? [217,119,6] : [22,163,74]
      doc.setFillColor(pr,pg,pb); doc.rect(M, y, 2, 8, 'F')
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(26, 29, 35)
      doc.text(a.Vendedor?.split(' ')[0] || '', M + 5, y + 5.5)
      doc.setFont('helvetica', 'normal'); doc.setTextColor(75,85,99)
      doc.text(a.Descripcion || '', M + 35, y + 5.5)
      doc.text(fmtDate(a.Fecha_Compromiso), W - M - 3, y + 5.5, { align: 'right' })
      y += 8
    })
  }

  // Footer en todas las páginas
  const total = doc.getNumberOfPages()
  for (let p = 1; p <= total; p++) {
    doc.setPage(p)
    doc.setDrawColor(226, 232, 240); doc.line(M, 285, W-M, 285)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(156, 163, 175)
    doc.text('WBR Portal  ·  ' + ses.sid + '  ·  Generado por ' + COORD, M, 290)
    doc.text('Pág. ' + p + ' / ' + total, W-M, 290, { align: 'right' })
  }

  return doc
}

function _pdfSeccion(doc, titulo, y, W, M) {
  doc.setFillColor(37, 99, 235)
  doc.rect(M, y, W - M*2, 8, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(255,255,255)
  doc.text(titulo, M + 4, y + 5.5)
  return y + 11
}
