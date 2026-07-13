// ── FILTROS DE FECHA ─────────────────────────────────────

function getFiltroFecha() {
  return {
    ini: document.getElementById('dashFechaInicio').value,
    fin: document.getElementById('dashFechaFin').value
  }
}

function setFiltroRapido(tipo, btn) {
  const hoy = new Date()
  let ini, fin = hoy.toISOString().split('T')[0]
  if (tipo === 'semana') {
    const d = new Date(hoy); d.setDate(hoy.getDate() - hoy.getDay() + 1)
    ini = d.toISOString().split('T')[0]
  } else if (tipo === 'mes') {
    ini = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0]
  } else {
    ini = new Date(hoy.getFullYear(), Math.floor(hoy.getMonth()/3)*3, 1).toISOString().split('T')[0]
  }
  document.getElementById('dashFechaInicio').value = ini
  document.getElementById('dashFechaFin').value = fin
  _setActiveFiltroBtn(btn)
  renderDashboard()
}

function clearFiltroFecha() {
  document.getElementById('dashFechaInicio').value = ''
  document.getElementById('dashFechaFin').value = ''
  const sel = document.getElementById('filtroVendedor')
  if (sel) sel.value = ''
  _setActiveFiltroBtn(null)
  renderDashboard()
}

function _setActiveFiltroBtn(activeBtn) {
  document.querySelectorAll('.dash-filtro-btn').forEach(b => b.classList.remove('active'))
  if (activeBtn) activeBtn.classList.add('active')
}

function filtrarPorFecha(items, campo) {
  const { ini, fin } = getFiltroFecha()
  if (!ini && !fin) return items
  return items.filter(it => {
    const d = it[campo] ? String(it[campo]).split('T')[0] : null
    if (!d) return false
    if (ini && d < ini) return false
    if (fin && d > fin) return false
    return true
  })
}

// ── RENDER ───────────────────────────────────────────────

function renderDashboard() {
  const vendedor = document.getElementById('filtroVendedor')?.value || ''
  const califs   = filtrarPorFecha(state.calificaciones, 'Fecha').filter(c => !vendedor || c.Vendedor === vendedor)
  const acciones = filtrarPorFecha(state.acciones, 'Creado_En').filter(a => !vendedor || a.Vendedor === vendedor)

  const sesiones   = new Set(califs.map(c => c.ID_Sesion)).size
  const pendientes = acciones.filter(a => a.Estatus === 'Pendiente').length
  const cerradas   = acciones.filter(a => a.Estatus === 'Cerrado').length
  const total      = acciones.length

  const pctsValidos = califs.map(c => parseFloat(c.Pct_Cumplimiento)).filter(v => !isNaN(v) && v <= 1)
  const kpiProm = pctsValidos.length
    ? Math.round(pctsValidos.reduce((s,v) => s+v, 0) / pctsValidos.length * 100)
    : 0

  document.getElementById('statSesiones').textContent    = sesiones
  document.getElementById('statSesionesSub').textContent = sesiones + ' sesiones registradas'
  document.getElementById('statPendientes').textContent  = pendientes
  document.getElementById('statPendientesSub').textContent = 'de ' + total + ' acciones totales'
  document.getElementById('statCerradas').textContent    = cerradas
  document.getElementById('statCerradasSub').textContent = total ? Math.round(cerradas/total*100) + '% resolución' : ''
  document.getElementById('statKpi').textContent         = kpiProm + '%'

  renderEquipoList(califs, acciones)
  renderPrioChart(acciones)
  renderUltimasAcciones(acciones)
  renderMBRDashboard()
}

function renderEquipoList(califs, acciones) {
  const el = document.getElementById('equipoList')
  if (!el) return
  const vendedores = state.equipo.filter(m => m.Rol !== 'Coordinador')

  el.innerHTML = vendedores.map(v => {
    const califsV = califs.filter(c => c.Vendedor === v.Nombre)
    const pctsV   = califsV.map(c => parseFloat(c.Pct_Cumplimiento)).filter(x => !isNaN(x) && x <= 1)
    const pct     = pctsV.length ? Math.round(pctsV.reduce((s,x)=>s+x,0)/pctsV.length*100) : null
    const pend    = acciones.filter(a => a.Vendedor === v.Nombre && a.Estatus === 'Pendiente').length
    const cls     = pct === null ? '' : pct >= 80 ? 'green' : pct >= 50 ? 'yellow' : 'red'
    const fillColor = pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)'
    const ini = initials(v.Nombre)

    return `<div class="equipo-item">
      <div class="avatar">${ini}</div>
      <div class="eq-info">
        <div class="eq-name">${v.Nombre}${pend > 0 ? ` <span style="font-size:10px;background:var(--danger-light);color:var(--danger);padding:1px 5px;border-radius:4px;font-weight:600">${pend} pend.</span>` : ''}</div>
        <div class="bar-track" style="margin-top:4px;width:100%">
          <div class="bar-fill" style="width:${pct||0}%;background:${fillColor}"></div>
        </div>
      </div>
      ${pct !== null ? `<span class="pill pill-${cls}">${pct}%</span>` : '<span style="color:var(--muted);font-size:12px">—</span>'}
    </div>`
  }).join('')
}

function renderPrioChart(acciones) {
  const el = document.getElementById('prioChart')
  if (!el) return
  const abiertas = acciones.filter(a => a.Estatus !== 'Cerrado')
  const alta   = abiertas.filter(a => a.Prioridad === 'Alta').length
  const media  = abiertas.filter(a => a.Prioridad === 'Media').length
  const baja   = abiertas.filter(a => a.Prioridad === 'Baja').length
  const maxV   = Math.max(alta, media, baja, 1)

  el.innerHTML = [
    { label: 'Alta',  val: alta,  color: 'var(--danger)' },
    { label: 'Media', val: media, color: 'var(--warning)' },
    { label: 'Baja',  val: baja,  color: 'var(--success)' }
  ].map(p => `
    <div style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
        <span>${p.label}</span><span style="font-weight:600">${p.val}</span>
      </div>
      <div class="bar-track">
        <div class="bar-fill" style="width:${Math.round(p.val/maxV*100)}%;background:${p.color}"></div>
      </div>
    </div>`).join('')
}

function renderMBRDashboard() {
  const kpisEl   = document.getElementById('mbrDashKpis')
  const contentEl = document.getElementById('mbrDashContent')
  if (!kpisEl || !contentEl) return

  const { ini, fin } = getFiltroFecha()
  const vendedor = document.getElementById('filtroVendedor')?.value || ''

  // Filtrar sesiones MBR por rango de fecha
  const sesiones = state.sesionesMBR.filter(s => {
    const d = String(s.Fecha || '').split('T')[0]
    if (ini && d < ini) return false
    if (fin && d > fin) return false
    return true
  })

  const sesIds = new Set(sesiones.map(s => String(s.ID_Sesion)))

  // Compromisos de esas sesiones
  const comp = state.compromisos.filter(c =>
    sesIds.has(String(c.ID_Sesion)) &&
    (!vendedor || c.Vendedor === vendedor)
  )

  const total    = comp.length
  const cumplidos = comp.filter(c => c.Cumplido === 'TRUE' || c.Cumplido === true).length
  const monto    = comp.reduce((s, c) => s + parseFloat(c.Monto || 0), 0)
  const pct      = total > 0 ? Math.round(cumplidos / total * 100) : 0

  // KPI chips
  const fmtM = n => '$' + Number(n).toLocaleString('es-MX')
  kpisEl.innerHTML = [
    { label: 'Sesiones MBR', val: sesiones.length, color: 'var(--accent)' },
    { label: 'Compromisos',  val: total,            color: 'var(--text2)' },
    { label: 'Cumplidos',    val: `${cumplidos}/${total}`, color: pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)' },
    { label: 'Monto total',  val: fmtM(monto),      color: '#16a34a' },
  ].map(k => `
    <div style="text-align:center;padding:6px 14px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;min-width:90px">
      <div style="font-size:15px;font-weight:800;color:${k.color};font-variant-numeric:tabular-nums">${k.val}</div>
      <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;margin-top:2px">${k.label}</div>
    </div>`).join('')

  // Sin datos
  if (!sesiones.length) {
    contentEl.innerHTML = `<div style="text-align:center;padding:28px;color:var(--muted);font-size:13px">Sin sesiones MBR en el período seleccionado</div>`
    return
  }

  // Tabla por agente
  const vendedores = state.equipo.filter(m => m.Rol !== 'Coordinador' && (!vendedor || m.Nombre === vendedor))
  const SECS = ['Prospeccion','BCG','Recuperacion']

  contentEl.innerHTML = `<div style="overflow-x:auto">
    <table class="tbl">
      <thead><tr>
        <th>Agente</th>
        <th style="text-align:center">Prospección</th>
        <th style="text-align:center">BCG</th>
        <th style="text-align:center">Recuperación</th>
        <th style="text-align:center">Score</th>
        <th style="text-align:right">Monto</th>
      </tr></thead>
      <tbody>
        ${vendedores.map(v => {
          const vc = comp.filter(c => c.Vendedor === v.Nombre)
          const secScore = sec => {
            const s = vc.filter(c => c.Seccion === sec)
            const ok = s.filter(c => c.Cumplido === 'TRUE' || c.Cumplido === true).length
            return s.length ? `${ok}/${s.length}` : '—'
          }
          const totalV   = vc.length
          const cumpV    = vc.filter(c => c.Cumplido === 'TRUE' || c.Cumplido === true).length
          const pctV     = totalV > 0 ? Math.round(cumpV / totalV * 100) : null
          const montoV   = vc.reduce((s, c) => s + parseFloat(c.Monto || 0), 0)
          const cls      = pctV === null ? 'muted' : pctV >= 80 ? 'green' : pctV >= 50 ? 'yellow' : 'red'
          return `<tr>
            <td>
              <div style="display:flex;align-items:center;gap:8px">
                <div class="avatar" style="width:28px;height:28px;font-size:10px;flex-shrink:0">${initials(v.Nombre)}</div>
                <span>${v.Nombre}</span>
              </div>
            </td>
            ${SECS.map(s => `<td style="text-align:center;font-size:12px;font-weight:600">${secScore(s)}</td>`).join('')}
            <td style="text-align:center">${pctV !== null ? `<span class="pill pill-${cls}">${pctV}%</span>` : '<span style="color:var(--muted)">—</span>'}</td>
            <td style="text-align:right;font-weight:700;font-variant-numeric:tabular-nums">${montoV > 0 ? fmtM(montoV) : '—'}</td>
          </tr>`
        }).join('')}
      </tbody>
    </table>
  </div>`
}

function renderUltimasAcciones(acciones) {
  const el = document.getElementById('ultimasAcciones')
  if (!el) return
  const ultimas = [...acciones].slice(-6).reverse()
  el.innerHTML = ultimas.map(a => `
    <tr>
      <td>${a.Vendedor || '—'}</td>
      <td>${a.Descripcion || '—'}</td>
      <td>${a.Cliente || '—'}</td>
      <td>${fmtDate(a.Fecha_Compromiso)}</td>
      <td>${badgePrio(a.Prioridad)}</td>
      <td>${badgeEst(a.Estatus)}</td>
    </tr>`).join('')
}
