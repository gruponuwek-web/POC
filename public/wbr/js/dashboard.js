// ── FILTROS DE FECHA ─────────────────────────────────────

function getFiltroFecha() {
  return {
    ini: document.getElementById('dashFechaInicio').value,
    fin: document.getElementById('dashFechaFin').value
  }
}

function setFiltroRapido(tipo) {
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
  renderDashboard()
}

function clearFiltroFecha() {
  document.getElementById('dashFechaInicio').value = ''
  document.getElementById('dashFechaFin').value = ''
  renderDashboard()
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
