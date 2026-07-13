let calVista = 'mes'
let calFecha = new Date()
let calDiaSel = null

const DIAS  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function setVista(v, btn) {
  calVista = v
  document.getElementById('btnVistaMes').classList.toggle('btn-primary', v === 'mes')
  document.getElementById('btnVistaSem').classList.toggle('btn-primary', v === 'semana')
  renderCalendario()
}

function navFecha(dir) {
  if (calVista === 'mes') {
    calFecha = new Date(calFecha.getFullYear(), calFecha.getMonth() + dir, 1)
  } else {
    calFecha = new Date(calFecha.getTime() + dir * 7 * 86400000)
  }
  renderCalendario()
}

function irHoy() {
  calFecha = new Date()
  calDiaSel = null
  renderCalendario()
}

function toDateKey(d) {
  return d.toISOString().split('T')[0]
}

function getAccionesFiltradas() {
  const vend = document.getElementById('calFiltroVendedor')?.value || ''
  const est  = document.getElementById('calFiltroEstatus')?.value  || ''
  return state.acciones.filter(a =>
    (!vend || a.Vendedor === vend) &&
    (!est  || a.Estatus === est) &&
    a.Fecha_Compromiso
  )
}

function renderCalendario() {
  const titulo = MESES[calFecha.getMonth()] + ' ' + calFecha.getFullYear()
  document.getElementById('calTitulo').textContent = 'Agenda — ' + titulo

  const acciones = getAccionesFiltradas()
  const byDate   = {}
  acciones.forEach(a => {
    const k = String(a.Fecha_Compromiso).split('T')[0]
    if (!byDate[k]) byDate[k] = []
    byDate[k].push(a)
  })

  calVista === 'mes' ? renderMes(byDate) : renderSemana(byDate)
}

function renderMes(byDate) {
  const anio = calFecha.getFullYear()
  const mes  = calFecha.getMonth()
  const primer  = new Date(anio, mes, 1).getDay()
  const ultDia  = new Date(anio, mes + 1, 0).getDate()
  const hoy     = toDateKey(new Date())

  let html = '<div class="cal-grid">'
  DIAS.forEach(d => { html += `<div class="cal-head">${d}</div>` })

  // Celdas vacías al inicio
  for (let i = 0; i < primer; i++) html += '<div class="cal-day cal-empty"></div>'

  for (let d = 1; d <= ultDia; d++) {
    const key   = anio + '-' + String(mes+1).padStart(2,'0') + '-' + String(d).padStart(2,'0')
    const items = byDate[key] || []
    const isHoy = key === hoy
    const isSel = key === calDiaSel
    const dots  = items.slice(0,3).map(a => {
      const c = a.Prioridad === 'Alta' ? 'var(--danger)' : a.Prioridad === 'Media' ? 'var(--warning)' : 'var(--success)'
      return `<span style="width:5px;height:5px;border-radius:50%;background:${c};display:inline-block;margin:1px"></span>`
    }).join('')
    const mas = items.length > 3 ? `<span style="font-size:9px;color:var(--muted)">+${items.length-3}</span>` : ''

    html += `<div class="cal-day${isHoy?' cal-today':''}${isSel?' cal-sel':''}${items.length?' cal-has-items':''}"
      onclick="seleccionarDia('${key}',${JSON.stringify(items).replace(/"/g,'&quot;')})">
      <div style="font-size:11px;font-weight:${isHoy?700:400};color:${isHoy?'var(--accent)':'var(--text2)'}">${d}</div>
      <div style="margin-top:2px">${dots}${mas}</div>
    </div>`
  }
  html += '</div>'
  document.getElementById('calContainer').innerHTML = html
  if (calDiaSel && byDate[calDiaSel]) {
    mostrarDetalle(calDiaSel, byDate[calDiaSel])
  } else {
    document.getElementById('calDetalle').innerHTML = ''
  }
}

function renderSemana(byDate) {
  const inicio = new Date(calFecha)
  inicio.setDate(calFecha.getDate() - calFecha.getDay())
  const dias = Array.from({length:7}, (_,i) => {
    const d = new Date(inicio); d.setDate(inicio.getDate()+i); return d
  })
  const hoy = toDateKey(new Date())

  let html = '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:8px">'
  dias.forEach(d => {
    const key   = toDateKey(d)
    const items = byDate[key] || []
    const isHoy = key === hoy
    html += `<div style="border:1px solid var(--border);border-radius:var(--radius);padding:8px;background:${isHoy?'var(--accent-light)':'var(--surface)'}">
      <div style="font-size:11px;font-weight:600;color:${isHoy?'var(--accent)':'var(--text2)'};margin-bottom:6px">
        ${DIAS[d.getDay()]} ${d.getDate()}
      </div>
      ${items.map(a => `
        <div onclick="openSeguimientoModal('${a.ID_Accion}')"
          style="font-size:11px;padding:4px 6px;border-radius:4px;margin-bottom:4px;cursor:pointer;
          background:${a.Prioridad==='Alta'?'var(--danger-light)':a.Prioridad==='Media'?'var(--warning-light)':'var(--success-light)'}">
          <div style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${a.Descripcion||'—'}</div>
          <div style="color:var(--muted)">${a.Vendedor?.split(' ')[0]}</div>
        </div>`).join('')}
    </div>`
  })
  html += '</div>'
  document.getElementById('calContainer').innerHTML = html
  document.getElementById('calDetalle').innerHTML = ''
}

function seleccionarDia(key, items) {
  if (calDiaSel === key) {
    calDiaSel = null
    document.getElementById('calDetalle').innerHTML = ''
    renderCalendario()
    return
  }
  calDiaSel = key
  renderCalendario()
  mostrarDetalle(key, items)
}

function mostrarDetalle(key, items) {
  const el = document.getElementById('calDetalle')
  if (!items.length) { el.innerHTML = ''; return }
  el.innerHTML = `
    <div class="card">
      <div class="card-title">${fmtDate(key)} — ${items.length} acción(es)</div>
      <table class="tbl">
        <thead><tr><th>Agente</th><th>Acción</th><th>Cliente</th><th>Prioridad</th><th>Estatus</th><th></th></tr></thead>
        <tbody>${items.map(a => `
          <tr>
            <td>${a.Vendedor||'—'}</td>
            <td>${a.Descripcion||'—'}</td>
            <td>${a.Cliente||'—'}</td>
            <td>${badgePrio(a.Prioridad)}</td>
            <td>${badgeEst(a.Estatus)}</td>
            <td>${a.Estatus!=='Cerrado'?`<button class="btn btn-sm" onclick="openSeguimientoModal('${a.ID_Accion}')">+ Seg.</button>`:'—'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`
}

function renderAgenda() {
  const sel = document.getElementById('calFiltroVendedor')
  if (sel) {
    const curr = sel.value
    sel.innerHTML = '<option value="">Todos los agentes</option>'
    state.equipo.filter(m => m.Rol !== 'Coordinador').forEach(v => {
      const o = document.createElement('option')
      o.value = v.Nombre; o.textContent = v.Nombre
      sel.appendChild(o)
    })
    sel.value = curr
  }
  renderCalendario()
}
