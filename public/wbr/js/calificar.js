const TUMBA = {
  kpis: 'KPIs: Marca ✅ o ❌ en cada indicador según el desempeño del agente en esta semana.',
  desc: 'Descubrimiento: Registra el hallazgo principal de la visita — oportunidad, obstáculo o compromiso clave.',
  acc:  'Acciones: Agrega los compromisos concretos que el agente asumió en esta sesión.'
}

// ── SESIÓN ───────────────────────────────────────────────

function calcSemana(fechaStr) {
  const d = new Date(fechaStr)
  const inicio = new Date(d.getFullYear(), 0, 1)
  return Math.ceil(((d - inicio) / 86400000 + inicio.getDay() + 1) / 7)
}

function resetCalificar() {
  const sesIdEl   = document.getElementById('sesId')
  const sesFecha  = document.getElementById('sesFecha')
  const sesSemana = document.getElementById('sesSemana')

  sesFecha.value = new Date().toISOString().split('T')[0]
  sesSemana.value = calcSemana(sesFecha.value)
  sesFecha.addEventListener('change', () => {
    sesSemana.value = calcSemana(sesFecha.value)
  })

  if (sesionActiva) {
    sesIdEl.value = sesionActiva.id
    document.getElementById('vendedoresContainer').innerHTML = ''
    renderVendedores()
    showFloatingBtn()
    document.getElementById('concluirBtnWrap').style.display = ''
    document.querySelector('[onclick*="tab-nueva"]')?.click()
  } else {
    const maxId = state.calificaciones.reduce((max, c) => {
      const n = parseInt(String(c.ID_Sesion || '').replace(/\D/g, ''))
      return isNaN(n) ? max : Math.max(max, n)
    }, 0)
    sesIdEl.value = 'SES' + String(maxId + 1).padStart(3, '0')
    document.getElementById('vendedoresContainer').innerHTML = ''
  }

  renderHistorial()
}

function crearSesion() {
  const id     = document.getElementById('sesId').value.trim()
  const fecha  = document.getElementById('sesFecha').value
  const semana = document.getElementById('sesSemana').value

  if (!id || !fecha) return toast('Completa el ID y la fecha', 'error')

  sesionActiva = { id, fecha, semana }
  localStorage.setItem('wbr_sesion_activa', JSON.stringify(sesionActiva))
  showFloatingBtn()
  renderVendedores()
  document.getElementById('concluirBtnWrap').style.display = ''
  toast('Sesión ' + id + ' iniciada')
}

function showFloatingBtn() {
  if (!sesionActiva) return
  const el = document.getElementById('floatingWBR')
  document.getElementById('floatingLabel').textContent =
    sesionActiva.id + ' activa · Semana ' + sesionActiva.semana
  el.classList.add('show')
}

function volverASesion() {
  document.querySelector('.nav-item[onclick*="calificar"]')?.click()
}

function concluirWBR() {
  document.getElementById('concluirSesId').textContent = sesionActiva?.id || ''
  openModal('modalConcluir')
}

function confirmarConcluir() {
  closeModal('modalConcluir')
  sesionActiva = null
  localStorage.removeItem('wbr_sesion_activa')
  document.getElementById('floatingWBR').classList.remove('show')
  document.getElementById('vendedoresContainer').innerHTML = ''
  document.getElementById('concluirBtnWrap').style.display = 'none'
  document.getElementById('sesId').value = ''
  renderHistorial()
  toast('Sesión concluida correctamente')
}

// ── FLUJO POR VENDEDOR ────────────────────────────────────

function renderVendedores() {
  const cont = document.getElementById('vendedoresContainer')
  if (!cont) return
  const vendedores = state.equipo.filter(m => m.Rol !== 'Coordinador')
  cont.innerHTML = vendedores.map((v, i) => {
    const vid = 'v' + i
    return `
    <div class="vend-block" id="vb-${vid}">
      <div class="vend-hdr" onclick="toggleVendedor('${vid}')">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="avatar">${initials(v.Nombre)}</div>
          <div>
            <div style="font-size:13px;font-weight:600">${v.Nombre}</div>
            <div style="font-size:11px;color:var(--muted)">${v.Rol}</div>
          </div>
          <span id="pct-${vid}" class="pill" style="display:none"></span>
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          <div class="vstep" id="step-kpis-${vid}" onclick="event.stopPropagation();switchVStep('${vid}','kpis')">KPIs</div>
          <div class="vstep" id="step-desc-${vid}" onclick="event.stopPropagation();switchVStep('${vid}','desc')">Descubrimiento</div>
          <div class="vstep" id="step-acc-${vid}" onclick="event.stopPropagation();switchVStep('${vid}','acc')">Acciones</div>
          <i class="ti ti-chevron-down" id="arrow-${vid}" style="font-size:14px;color:var(--muted);transition:.2s"></i>
        </div>
      </div>
      <div class="vend-body" id="vb-body-${vid}" style="display:none">
        ${panelKpis(vid, v)}
        ${panelDesc(vid, v)}
        ${panelAcc(vid, v)}
      </div>
    </div>`
  }).join('')

  // Activar primer step de cada vendedor
  vendedores.forEach((_, i) => switchVStep('v' + i, 'kpis'))
}

function panelKpis(vid, v) {
  const kpisRol = state.kpis[v.Rol] || []
  const calExist = sesionActiva
    ? state.calificaciones.find(c => c.ID_Sesion === sesionActiva.id && c.Vendedor === v.Nombre)
    : null
  let kpisExist = []
  if (calExist?.KPIs) {
    try { kpisExist = JSON.parse(calExist.KPIs) } catch(e) {}
  }
  const rows = kpisRol.map((kpi, i) => {
    const val = kpisExist[i]
    return `
    <div class="kpi-row" id="kpirow-${vid}-${i}">
      <span>${kpi}</span>
      <div style="display:flex;gap:6px">
        <button class="kpi-btn${val === true ? ' si' : ''}" onclick="toggleKpi(this,'si','${vid}','${i}')">✅</button>
        <button class="kpi-btn${val === false && kpisExist.length ? ' no' : ''}" onclick="toggleKpi(this,'no','${vid}','${i}')">❌</button>
      </div>
    </div>`
  }).join('')
  return `
    <div class="vpanel" id="panel-kpis-${vid}">
      <div class="tumba">${TUMBA.kpis}</div>
      ${rows || '<div style="color:var(--muted);font-size:12px">No hay KPIs configurados para este rol.</div>'}
      <div style="display:flex;justify-content:flex-end;margin-top:12px">
        <button class="btn btn-primary btn-sm" onclick="guardarKpisYseguir('${vid}','${v.Nombre}','${v.Rol}')">
          Guardar KPIs y continuar →
        </button>
      </div>
    </div>`
}

function panelDesc(vid, v) {
  const descExist = sesionActiva
    ? (state.descubrimientos || []).find(d => d.ID_Sesion === sesionActiva.id && d.Vendedor === v.Nombre)
    : null
  const descVal = descExist?.Descubrimiento || ''
  return `
    <div class="vpanel" id="panel-desc-${vid}" style="display:none">
      <div class="tumba">${TUMBA.desc}</div>
      <textarea id="desc-${vid}" rows="3" placeholder="Escribe el descubrimiento de la visita…" style="width:100%;margin-bottom:10px">${descVal}</textarea>
      <div style="display:flex;justify-content:flex-end">
        <button class="btn btn-primary btn-sm" onclick="guardarDescYseguir('${vid}','${v.Nombre}')">
          Guardar y continuar →
        </button>
      </div>
    </div>`
}

function panelAcc(vid, v) {
  const accsExist = sesionActiva
    ? (state.planAcciones || []).filter(a => a.ID_Sesion === sesionActiva.id && a.Vendedor === v.Nombre)
    : []
  // Pre-render existing action cards as HTML
  const cardsHtml = accsExist.map((a, idx) => _accionCardHtml(idx + 1, a)).join('')
  return `
    <div class="vpanel" id="panel-acc-${vid}" style="display:none">
      <div class="tumba">${TUMBA.acc}</div>
      <div id="accForms-${vid}">${cardsHtml}</div>
      <button class="btn btn-sm" style="margin-bottom:12px" onclick="agregarAccionForm('${vid}','${v.Nombre}')">
        <i class="ti ti-plus"></i> Agregar acción
      </button>
      <div style="display:flex;justify-content:flex-end">
        <button class="btn btn-primary btn-sm" onclick="guardarAccionesVendedor('${vid}','${v.Nombre}')">
          <i class="ti ti-device-floppy"></i> Guardar acciones y finalizar
        </button>
      </div>
    </div>`
}

function _accionCardHtml(num, a = {}) {
  const opts = (list, sel) => list.map(o => `<option${o===sel?' selected':''}>${o}</option>`).join('')
  const clases = ['Prospección','Fidelización','BCG','Recuperación']
  const prios  = ['Alta','Media','Baja']
  return `
    <div class="accion-card">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px">
        <div style="font-size:12px;font-weight:600">Acción ${num}</div>
        <button class="btn btn-sm" style="padding:2px 8px;font-size:11px" onclick="this.closest('.accion-card').remove()">
          <i class="ti ti-trash"></i>
        </button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div><label class="form-label">Clasificación</label>
          <select>${opts(clases, a.Clasificacion)}</select>
        </div>
        <div><label class="form-label">Prioridad</label>
          <select>${opts(prios, a.Prioridad)}</select>
        </div>
        <div><label class="form-label">Acción</label><input type="text" placeholder="Descripción corta" value="${a.Descripcion||''}"></div>
        <div><label class="form-label">Cliente</label><input type="text" placeholder="Nombre del cliente" value="${a.Cliente||''}"></div>
        <div><label class="form-label">Resultado esperado</label><input type="text" value="${a.Resultado_Esperado||''}"></div>
        <div><label class="form-label">Fecha compromiso</label><input type="date" value="${a.Fecha_Compromiso||''}"></div>
      </div>
      <div style="margin-top:8px"><label class="form-label">Detalle libre</label>
        <textarea rows="2" placeholder="Contexto adicional…" style="width:100%">${a.Descripcion_Libre||''}</textarea>
      </div>
    </div>`
}

function toggleVendedor(vid) {
  const body  = document.getElementById('vb-body-' + vid)
  const arrow = document.getElementById('arrow-' + vid)
  const open  = body.style.display !== 'none'
  body.style.display  = open ? 'none' : ''
  arrow.style.transform = open ? '' : 'rotate(180deg)'
}

function switchVStep(vid, step) {
  ;['kpis','desc','acc'].forEach(s => {
    document.getElementById('panel-' + s + '-' + vid)?.style && (document.getElementById('panel-' + s + '-' + vid).style.display = 'none')
    const el = document.getElementById('step-' + s + '-' + vid)
    if (el) el.className = 'vstep' + (s === step ? ' active' : '')
  })
  const panel = document.getElementById('panel-' + step + '-' + vid)
  if (panel) panel.style.display = ''
}

function toggleKpi(btn, val, vid, idx) {
  const row = document.getElementById('kpirow-' + vid + '-' + idx)
  row.querySelectorAll('.kpi-btn').forEach(b => b.classList.remove('si','no'))
  btn.classList.add(val)
}

// ── GUARDAR PASOS ─────────────────────────────────────────

async function guardarKpisYseguir(vid, vendedor, rol) {
  if (!sesionActiva) return toast('Primero crea la sesión', 'error')
  const kpisRol = state.kpis[rol] || []
  const kpis = kpisRol.map((_, i) => {
    const row = document.getElementById('kpirow-' + vid + '-' + i)
    const si  = row?.querySelector('.kpi-btn.si')
    return !!si
  })
  const res = await post('saveCalificacion', {
    id_sesion: sesionActiva.id,
    fecha: sesionActiva.fecha,
    semana: sesionActiva.semana,
    vendedor, rol, kpis
  })
  if (res.success) {
    const pct = Math.round(kpis.filter(Boolean).length / Math.max(kpis.length,1) * 100)
    const pctEl = document.getElementById('pct-' + vid)
    if (pctEl) {
      pctEl.textContent = pct + '%'
      pctEl.className = 'pill ' + (pct >= 80 ? 'pill-green' : pct >= 50 ? 'pill-yellow' : 'pill-red')
      pctEl.style.display = ''
    }
    document.getElementById('step-kpis-' + vid)?.classList.add('done')
    switchVStep(vid, 'desc')
    toast('KPIs guardados')
  } else {
    toast('Error: ' + res.error, 'error')
  }
}

async function guardarDescYseguir(vid, vendedor) {
  const desc = document.getElementById('desc-' + vid)?.value.trim()
  if (desc) {
    const res = await post('saveDescubrimiento', {
      id_sesion: sesionActiva.id, vendedor, descubrimiento: desc
    })
    if (!res.success) return toast('Error: ' + res.error, 'error')
  }
  document.getElementById('step-desc-' + vid)?.classList.add('done')
  switchVStep(vid, 'acc')
  agregarAccionForm(vid, vendedor)
  toast('Descubrimiento guardado')
}

function agregarAccionForm(vid, vendedor) {
  const cont = document.getElementById('accForms-' + vid)
  const idx  = cont.children.length
  const div  = document.createElement('div')
  div.innerHTML = _accionCardHtml(idx + 1)
  cont.appendChild(div.firstElementChild)
}

async function guardarAccionesVendedor(vid, vendedor) {
  const cards = document.getElementById('accForms-' + vid)?.querySelectorAll('.accion-card')
  if (!cards?.length) {
    document.getElementById('step-acc-' + vid)?.classList.add('done')
    toggleVendedor(vid)
    toast('Sin acciones registradas para ' + vendedor)
    return
  }
  for (let ci = 0; ci < cards.length; ci++) {
    const card = cards[ci]
    const inputs  = card.querySelectorAll('input')
    const selects = card.querySelectorAll('select')
    const ta      = card.querySelector('textarea')
    await post('savePlanAccion', {
      id_sesion: sesionActiva.id,
      vendedor,
      clasificacion: selects[0]?.value,
      prioridad: selects[1]?.value,
      descripcion: inputs[0]?.value,
      cliente: inputs[1]?.value,
      resultado_esperado: inputs[2]?.value,
      fecha_compromiso: inputs[3]?.value,
      descripcion_libre: ta?.value,
      acompanamiento: COORD,
      primer_del_lote: ci === 0   // señal para que el backend borre previas antes de insertar
    })
  }
  document.getElementById('step-acc-' + vid)?.classList.add('done')
  setTimeout(() => toggleVendedor(vid), 400)
  await loadAll()
  toast('Acciones de ' + vendedor + ' guardadas')
}

// ── HISTORIAL ─────────────────────────────────────────────

function renderHistorial() {
  const el = document.getElementById('historialContent')
  if (!el) return

  const sesIds = [...new Set(state.calificaciones.map(c => c.ID_Sesion))].sort().reverse()
  if (!sesIds.length) {
    el.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:20px 0">No hay sesiones registradas aún.</div>'
    return
  }

  const vendedores = state.equipo.filter(m => m.Rol !== 'Coordinador').map(m => m.Nombre)
  const primerNombre = n => n.split(' ')[0]

  const header = `<th>Sesión</th><th>Fecha</th><th>Semana</th>` +
    vendedores.map(v => `<th>${primerNombre(v)}</th>`).join('') +
    `<th>Promedio</th><th>Acciones</th>`

  const filas = sesIds.map(sid => {
    const califsSes = state.calificaciones.filter(c => c.ID_Sesion === sid)
    const fecha = califsSes[0]?.Fecha ? fmtDate(califsSes[0].Fecha) : '—'
    const semana = califsSes[0]?.Semana || '—'

    const pcts = vendedores.map(v => {
      const cal = califsSes.find(c => c.Vendedor === v)
      if (!cal) return null
      const p = parseFloat(cal.Pct_Cumplimiento)
      return isNaN(p) ? null : p
    })

    const celdas = pcts.map(p =>
      p === null
        ? '<td style="color:var(--muted)">—</td>'
        : `<td>${pctPill(p)}</td>`
    ).join('')

    const validos = pcts.filter(p => p !== null)
    const prom    = validos.length ? validos.reduce((s,v)=>s+v,0)/validos.length : null

    return `<tr>
      <td style="font-weight:600">${sid}</td>
      <td>${fecha}</td>
      <td>${semana}</td>
      ${celdas}
      <td>${prom !== null ? pctPill(prom) : '—'}</td>
      <td style="white-space:nowrap">
        <button class="btn btn-sm" onclick="abrirMinuta('${sid}')">📄 Minuta</button>
        <button class="btn btn-sm" style="margin-left:4px" onclick="abrirExportPanel('${sid}')">📥 PDF</button>
        <button class="btn btn-sm" style="margin-left:4px" onclick="editarSesion('${sid}','${califsSes[0]?.Fecha||''}','${semana}')" title="Editar sesión">
          <i class="ti ti-edit"></i>
        </button>
        <button class="btn btn-sm" style="margin-left:4px;color:var(--danger);border-color:var(--danger)" onclick="pedirBorrarSesion('${sid}')" title="Borrar sesión">
          <i class="ti ti-trash"></i>
        </button>
      </td>
    </tr>`
  }).join('')

  el.innerHTML = `
    <div style="overflow-x:auto">
      <table class="tbl" style="min-width:700px">
        <thead><tr>${header}</tr></thead>
        <tbody>${filas}</tbody>
      </table>
    </div>
    <div style="font-size:11px;color:var(--muted);margin-top:8px">🟢 ≥80% · 🟡 50–79% · 🔴 &lt;50%</div>`
}

// ── EDITAR / BORRAR SESIÓN ────────────────────────────────

function editarSesion(sid, fecha, semana) {
  // Cargar la sesión como activa y navegar a Nueva sesión
  sesionActiva = { id: sid, fecha: fecha.split('T')[0], semana }
  localStorage.setItem('wbr_sesion_activa', JSON.stringify(sesionActiva))
  document.getElementById('sesId').value = sid
  document.getElementById('sesFecha').value = fecha.split('T')[0]
  document.getElementById('sesSemana').value = semana
  document.getElementById('vendedoresContainer').innerHTML = ''
  renderVendedores()
  document.getElementById('concluirBtnWrap').style.display = ''
  showFloatingBtn()
  // Cambiar al tab Nueva sesión
  document.querySelector('.tab[onclick*="tab-nueva"]')?.click()
  toast('Editando sesión ' + sid)
}

let _borrarSesionId = null

function pedirBorrarSesion(sid) {
  _borrarSesionId = sid
  document.getElementById('borrarSesId').textContent = sid
  openModal('modalBorrarSesion')
}

async function confirmarBorrarSesion() {
  if (!_borrarSesionId) return
  closeModal('modalBorrarSesion')
  const res = await post('deleteSesion', { id_sesion: _borrarSesionId })
  if (res.success) {
    await loadAll()
    renderHistorial()
    toast('Sesión ' + _borrarSesionId + ' eliminada')
    _borrarSesionId = null
  } else {
    toast('Error: ' + (res.error || 'No se pudo eliminar'), 'error')
  }
}
