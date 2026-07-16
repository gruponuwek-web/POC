let sesionMBR = null
let vendedorMBR = null

const SECCIONES_MBR = [
  { key: 'Prospeccion', icon: '🗺️', label: '1° Compromiso', sub: 'Prospección — Rutas' },
  { key: 'BCG',         icon: '📊', label: '2° Compromiso', sub: 'Crecimiento — Clientes' },
  { key: 'Recuperacion',icon: '🔄', label: '3° Compromiso', sub: 'Recuperación — Clientes' },
]

const TRASH_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>`

// ── INIT ─────────────────────────────────────────────────

function resetCompromisos() {
  // Restaurar sesión activa desde localStorage
  const saved = localStorage.getItem('mbr_sesion_activa')
  if (saved) {
    sesionMBR = JSON.parse(saved)
    _fillMBRSessionFields()
    _showMBRFlow()
  } else {
    sesionMBR = null
    _fillMBRSessionFields()
    document.getElementById('mbrVendorFlow').style.display = 'none'
    const btn = document.getElementById('btnIniciarMBR')
    btn.innerHTML = '<i class="ti ti-play"></i> Iniciar sesión'
    btn.disabled = false
    btn.style.background = ''
    const fechaEl = document.getElementById('mbrFecha')
    if (fechaEl) fechaEl.disabled = false
  }
}

function _fillMBRSessionFields() {
  const fechaEl = document.getElementById('mbrFecha')
  const semEl   = document.getElementById('mbrSemana')
  const idEl    = document.getElementById('mbrSesId')

  if (sesionMBR) {
    idEl.value    = sesionMBR.id
    fechaEl.value = sesionMBR.fecha
    semEl.value   = sesionMBR.semana
  } else {
    const today = new Date().toISOString().split('T')[0]
    if (!fechaEl.value) fechaEl.value = today
    semEl.value = calcSemana(fechaEl.value)
    idEl.value  = _nextMBRId()
  }
}

function _nextMBRId() {
  const maxId = state.sesionesMBR.reduce((max, s) => {
    const n = parseInt(String(s.ID_Sesion || '').replace(/\D/g, ''))
    return isNaN(n) ? max : Math.max(max, n)
  }, 0)
  return 'MBR' + String(maxId + 1).padStart(3, '0')
}

function mbrOnFechaChange() {
  const v = document.getElementById('mbrFecha').value
  if (v) document.getElementById('mbrSemana').value = calcSemana(v)
}

// ── INICIAR SESIÓN ────────────────────────────────────────

async function iniciarSesionMBR() {
  const id     = document.getElementById('mbrSesId').value
  const fecha  = document.getElementById('mbrFecha').value
  const semana = document.getElementById('mbrSemana').value
  if (!fecha) return toast('Selecciona una fecha', 'error')

  const btn = document.getElementById('btnIniciarMBR')
  btn.disabled = true
  btn.innerHTML = '⏳ Iniciando…'

  const res = await post('saveSesionMBR', { id_sesion: id, fecha, semana, coordinador: COORD })
  if (!res.success) {
    btn.disabled = false
    btn.innerHTML = '<i class="ti ti-play"></i> Iniciar sesión'
    return toast('Error: ' + (res.error || 'No se pudo crear la sesión'), 'error')
  }

  sesionMBR = { id, fecha, semana }
  localStorage.setItem('mbr_sesion_activa', JSON.stringify(sesionMBR))
  await loadAll()
  _showMBRFlow()
  toast('Sesión ' + id + ' iniciada')
}

function _showMBRFlow() {
  document.getElementById('mbrVendorFlow').style.display = 'block'
  document.getElementById('mbrFecha').disabled = true
  const btn = document.getElementById('btnIniciarMBR')
  btn.innerHTML = '<i class="ti ti-check"></i> Sesión iniciada'
  btn.disabled = true
  btn.style.background = '#16a34a'
  btn.style.borderColor = '#15803d'
  _renderVendedoresMBR()
}

// ── VENDORS ───────────────────────────────────────────────

function _renderVendedoresMBR() {
  const vendedores = state.equipo.filter(m => m.Rol !== 'Coordinador')
  const strip = document.getElementById('mbrVendorTabs')
  strip.innerHTML = vendedores.map((v, i) => {
    const comp = state.compromisos.filter(c =>
      String(c.ID_Sesion) === String(sesionMBR.id) && c.Vendedor === v.Nombre)
    const chip = comp.length
      ? `<span class="mbr-chip">${comp.filter(c => c.Cumplido === 'TRUE' || c.Cumplido === true).length}/${comp.length}</span>`
      : ''
    return `<div class="mbr-vendor-tab${i===0?' active':''}" onclick="selVendedorMBR(this,'${v.Nombre}')">
      <div class="vtab-av">${initials(v.Nombre)}</div>
      <span>${v.Nombre.split(' ').slice(0,2).join(' ')}</span>
      ${chip}
    </div>`
  }).join('')

  const first = vendedores[0]
  if (first) {
    vendedorMBR = first.Nombre
    _renderCompromisosVendedor(first.Nombre)
  }
}

function selVendedorMBR(el, nombre) {
  document.querySelectorAll('.mbr-vendor-tab').forEach(t => t.classList.remove('active'))
  el.classList.add('active')
  vendedorMBR = nombre
  _renderCompromisosVendedor(nombre)
}

// ── RENDER COMPROMISOS ────────────────────────────────────

function _renderCompromisosVendedor(vendedor) {
  const content = document.getElementById('mbrContent')
  content.innerHTML = `
    <div class="vendor-header" style="margin:14px 0 12px">
      <div class="vtab-av" style="width:38px;height:38px;font-size:14px;flex-shrink:0">${initials(vendedor)}</div>
      <div>
        <div style="font-size:15px;font-weight:700">${vendedor}</div>
        <div style="font-size:11px;color:var(--text2)">${sesionMBR.id} · Semana ${sesionMBR.semana}</div>
      </div>
    </div>
    <div class="mbr-grid" id="mbrGrid">
      ${SECCIONES_MBR.map(s => _seccionCardHTML(s, vendedor)).join('')}
    </div>
    <div class="mbr-score-bar" id="mbrScoreBar"></div>
    <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:14px">
      <button class="btn" onclick="pedirCerrarMBR()">
        <i class="ti ti-lock"></i> Cerrar sesión
      </button>
      <button class="btn btn-primary" style="background:linear-gradient(135deg,#16a34a,#15803d);border-color:#15803d" onclick="guardarCompromisosVendedor()">
        <i class="ti ti-device-floppy"></i> Guardar compromisos
      </button>
    </div>`
  _updateMBRScore()
}

function _seccionCardHTML(secCfg, vendedor) {
  const existentes = state.compromisos.filter(c =>
    String(c.ID_Sesion) === String(sesionMBR.id) &&
    c.Vendedor === vendedor &&
    c.Seccion === secCfg.key
  )
  const itemsHTML = existentes.map(c => _itemHTML(
    secCfg.key,
    c.Descripcion || '',
    c.Cumplido === 'TRUE' || c.Cumplido === true,
    c.Monto || 0,
    secCfg.key === 'Prospeccion'
  )).join('')

  return `
    <div class="mbr-card mbr-card-${secCfg.key.toLowerCase()}">
      <div class="mbr-card-head">
        <span class="mbr-head-icon">${secCfg.icon}</span>
        <div>
          <div class="mbr-head-label">${secCfg.label}</div>
          <div class="mbr-head-sub">${secCfg.sub}</div>
        </div>
        <div class="mbr-head-score" id="mbrScore_${secCfg.key}">—</div>
      </div>
      <div class="mbr-items" id="mbrItems_${secCfg.key}">${itemsHTML}</div>
      ${secCfg.key !== 'Prospeccion' ? `
      <div class="mbr-section-total">
        <span class="mbr-total-lbl">Total $</span>
        <span class="mbr-total-val" id="mbrTotal_${secCfg.key}">$0</span>
      </div>` : ''}
      <div class="mbr-add-row">
        <button onclick="addItemMBR('${secCfg.key}')">＋ Agregar</button>
      </div>
    </div>`
}

function _itemHTML(sec, nombre, cumplido, monto, hideMonto = false) {
  const uid = 'mbr_tog_' + Math.random().toString(36).slice(2)
  const rowCls = cumplido ? 'mbr-item cumplido' : 'mbr-item no-cumplido'
  return `<div class="${rowCls}">
    <input class="mbr-name-input" type="text" value="${nombre.replace(/"/g,'&quot;')}" placeholder="Escribe el nombre…" oninput="_updateMBRScore()">
    ${hideMonto ? '' : `<div class="mbr-monto-cell">
      <span class="mbr-peso">$</span>
      <input type="number" min="0" value="${monto||''}" placeholder="0" oninput="_updateMBRScore()">
    </div>`}
    <div class="mbr-toggle-wrap">
      <label class="mbr-toggle">
        <input type="checkbox" id="${uid}" ${cumplido?' checked':''} onchange="_onMBRToggle(this)">
        <span class="mbr-slider"></span>
      </label>
      <span class="mbr-toggle-lbl ${cumplido?'si':'no'}">${cumplido?'Cumplió':'No cumplió'}</span>
    </div>
    <button class="mbr-del-btn" onclick="_delItemMBR(this)">${TRASH_SVG}</button>
  </div>`
}

function _onMBRToggle(inp) {
  const row = inp.closest('.mbr-item')
  const lbl = row.querySelector('.mbr-toggle-lbl')
  const mi  = row.querySelector('input[type=number]')
  if (inp.checked) {
    row.classList.remove('no-cumplido'); row.classList.add('cumplido')
    lbl.textContent = 'Cumplió'; lbl.className = 'mbr-toggle-lbl si'
  } else {
    row.classList.remove('cumplido'); row.classList.add('no-cumplido')
    lbl.textContent = 'No cumplió'; lbl.className = 'mbr-toggle-lbl no'
    mi.value = ''
  }
  _updateMBRScore()
}

function _delItemMBR(btn) {
  const item = btn.closest('.mbr-item')
  item.style.transition = 'opacity .18s,transform .18s'
  item.style.opacity = '0'; item.style.transform = 'translateX(8px)'
  setTimeout(() => { item.remove(); _updateMBRScore() }, 180)
}

function addItemMBR(sec) {
  const cont = document.getElementById('mbrItems_' + sec)
  cont.insertAdjacentHTML('beforeend', _itemHTML(sec, '', false, 0, sec === 'Prospeccion'))
  cont.lastElementChild.querySelector('.mbr-name-input').focus()
  _updateMBRScore()
}

// ── SCORE ────────────────────────────────────────────────

function _secStats(sec) {
  const items = document.querySelectorAll('#mbrItems_' + sec + ' .mbr-item')
  let total = items.length, si = 0, monto = 0
  items.forEach(item => {
    if (item.classList.contains('cumplido')) si++
    monto += parseFloat(item.querySelector('input[type=number]')?.value || 0)
  })
  return { total, si, monto }
}

function _fmt(n) { return '$' + Number(n || 0).toLocaleString('es-MX') }

function _updateMBRScore() {
  const stats = {}
  SECCIONES_MBR.forEach(s => {
    stats[s.key] = _secStats(s.key)
    const sc = document.getElementById('mbrScore_' + s.key)
    const tot = document.getElementById('mbrTotal_' + s.key)
    if (sc) sc.textContent = stats[s.key].si + '/' + stats[s.key].total
    if (tot) tot.textContent = _fmt(stats[s.key].monto)
  })

  const total = SECCIONES_MBR.reduce((s, c) => s + stats[c.key].total, 0)
  const si    = SECCIONES_MBR.reduce((s, c) => s + stats[c.key].si, 0)
  const monto = SECCIONES_MBR.reduce((s, c) => s + stats[c.key].monto, 0)
  const pct   = total > 0 ? Math.round(si / total * 100) : 0

  const bar = document.getElementById('mbrScoreBar')
  if (!bar) return
  bar.innerHTML = `
    <div class="mbr-score-main">
      <span class="mbr-score-num">${si}</span><span class="mbr-score-den">/${total}</span>
    </div>
    <div class="mbr-score-progress">
      <div style="display:flex;justify-content:space-between;margin-bottom:5px">
        <span style="font-size:10px;color:rgba(255,255,255,.5)">Compromisos cumplidos</span>
        <span style="font-size:11px;font-weight:700;color:#4ade80">${pct}%</span>
      </div>
      <div class="mbr-bar-track"><div class="mbr-bar-fill" style="width:${pct}%"></div></div>
    </div>
    <div class="mbr-score-detail">
      ${SECCIONES_MBR.map(s => `
        <div class="mbr-stat">
          <div class="mbr-stat-val">${stats[s.key].si}/${stats[s.key].total}</div>
          <div class="mbr-stat-lbl">${s.key === 'Prospeccion' ? 'Prospección' : s.key}</div>
        </div>`).join('')}
    </div>
    <div class="mbr-monto-total">
      <div class="mbr-monto-val">${_fmt(monto)}</div>
      <div class="mbr-monto-lbl">Monto comprometido</div>
    </div>`
}

// ── GUARDAR ───────────────────────────────────────────────

async function guardarCompromisosVendedor() {
  if (!sesionMBR || !vendedorMBR) return

  let ok = true
  for (const secCfg of SECCIONES_MBR) {
    const items = document.querySelectorAll('#mbrItems_' + secCfg.key + ' .mbr-item')
    const lista = []
    items.forEach(item => {
      const desc = item.querySelector('.mbr-name-input').value.trim()
      if (!desc) return
      lista.push({
        descripcion: desc,
        cumplido: item.classList.contains('cumplido'),
        monto: parseFloat(item.querySelector('input[type=number]')?.value || 0) || 0
      })
    })

    for (let i = 0; i < lista.length; i++) {
      const res = await post('saveCompromiso', {
        id_sesion: sesionMBR.id,
        vendedor: vendedorMBR,
        seccion: secCfg.key,
        descripcion: lista[i].descripcion,
        cumplido: lista[i].cumplido,
        monto: lista[i].monto,
        primer_del_lote: i === 0
      })
      if (!res.success) { ok = false; break }
    }

    // Si la sección quedó vacía, borrar registros existentes
    if (lista.length === 0) {
      await post('clearCompromisosSeccion', {
        id_sesion: sesionMBR.id,
        vendedor: vendedorMBR,
        seccion: secCfg.key
      })
    }
  }

  if (ok) {
    await loadAll()
    _renderVendedoresMBR()
    toast('Compromisos guardados')
  } else {
    toast('Error al guardar', 'error')
  }
}

// ── CERRAR SESIÓN ─────────────────────────────────────────

function pedirCerrarMBR() {
  openModal('modalCerrarMBR')
}

async function confirmarCerrarMBR() {
  closeModal('modalCerrarMBR')
  sesionMBR = null
  vendedorMBR = null
  localStorage.removeItem('mbr_sesion_activa')
  await loadAll()
  resetCompromisos()
  toast('Sesión MBR cerrada')
}

// ── HISTORIAL ─────────────────────────────────────────────

function renderHistorialMBR() {
  const cont = document.getElementById('mbrHistorialContent')
  if (!cont) return

  const sesiones = [...state.sesionesMBR].sort((a, b) =>
    String(b.ID_Sesion).localeCompare(String(a.ID_Sesion)))

  if (!sesiones.length) {
    cont.innerHTML = `<div style="text-align:center;padding:48px;color:var(--muted)">
      <div style="font-size:32px;margin-bottom:12px">📋</div>
      <div style="font-weight:600">Sin sesiones MBR registradas</div>
    </div>`
    return
  }

  cont.innerHTML = `
    <div style="overflow-x:auto">
      <table class="tbl">
        <thead>
          <tr>
            <th>ID Sesión</th><th>Fecha</th><th>Semana</th>
            <th>Compromisos</th><th>Cumplidos</th><th>Monto total</th><th>Estatus</th><th></th>
          </tr>
        </thead>
        <tbody>
          ${sesiones.map(s => {
            const comp = state.compromisos.filter(c => String(c.ID_Sesion) === String(s.ID_Sesion))
            const cumplidos = comp.filter(c => c.Cumplido === 'TRUE' || c.Cumplido === true)
            const monto = comp.reduce((sum, c) => sum + parseFloat(c.Monto || 0), 0)
            const activa = sesionMBR && String(sesionMBR.id) === String(s.ID_Sesion)
            return `<tr>
              <td style="font-weight:700">${s.ID_Sesion}</td>
              <td>${fmtDate(s.Fecha)}</td>
              <td>${s.Semana}</td>
              <td>${comp.length}</td>
              <td>${cumplidos.length}/${comp.length}</td>
              <td style="font-weight:700;font-variant-numeric:tabular-nums">${_fmt(monto)}</td>
              <td>${activa
                ? '<span class="badge badge-success">Abierta</span>'
                : '<span class="badge badge-muted">Cerrada</span>'}</td>
              <td><button class="btn btn-sm" onclick="verSesionMBR('${s.ID_Sesion}')">Ver / Editar</button></td>
            </tr>`
          }).join('')}
        </tbody>
      </table>
    </div>`
}

async function verSesionMBR(id) {
  const ses = state.sesionesMBR.find(s => String(s.ID_Sesion) === String(id))
  if (!ses) return

  sesionMBR = { id: ses.ID_Sesion, fecha: ses.Fecha, semana: ses.Semana }
  localStorage.setItem('mbr_sesion_activa', JSON.stringify(sesionMBR))

  // Ir al tab Nueva sesión
  const tabs = document.querySelectorAll('#page-compromisos .tab')
  const panels = document.querySelectorAll('#page-compromisos .tab-panel')
  tabs.forEach(t => t.classList.remove('active'))
  panels.forEach(p => p.classList.remove('active'))
  tabs[0].classList.add('active')
  document.getElementById('mbr-nueva').classList.add('active')

  _fillMBRSessionFields()
  _showMBRFlow()
}
