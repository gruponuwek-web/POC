let state = {
  equipo: [],
  kpis: {},
  clasificaciones: [],
  calificaciones: [],
  acciones: [],
  seguimiento: [],
  descubrimientos: []
}
let sesionActiva = null

// ── HTTP ──────────────────────────────────────────────────

async function api(action) {
  const r = await fetch(API + '?action=' + action)
  return r.json()
}

async function post(action, data) {
  const r = await fetch(API, {
    method: 'POST',
    body: JSON.stringify({ action, ...data })
  })
  return r.json()
}

// ── UI HELPERS ────────────────────────────────────────────

function toast(msg, type = 'success') {
  const t = document.createElement('div')
  t.className = 'toast toast-' + type
  t.textContent = msg
  document.body.appendChild(t)
  setTimeout(() => t.classList.add('show'), 10)
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300) }, 3500)
}

function setLoading(btnId, loading, text) {
  const btn = document.getElementById(btnId)
  if (!btn) return
  btn.disabled = loading
  btn.textContent = loading ? '⏳ Guardando…' : text
}

function navigate(el, page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'))
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'))
  document.getElementById('page-' + page).classList.add('active')
  el.classList.add('active')
  if (page === 'dashboard')  renderDashboard()
  if (page === 'calificar')  resetCalificar()
  if (page === 'acciones')   renderAcciones()
  if (page === 'agenda')     renderAgenda()
}

function switchTab(el, tabId) {
  const parent = el.closest('.tabs').parentElement
  parent.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
  el.classList.add('active')
  parent.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'))
  document.getElementById(tabId).classList.add('active')
}

function openModal(id) { document.getElementById(id).classList.add('open') }
function closeModal(id) { document.getElementById(id).classList.remove('open') }

// ── FORMATTERS ────────────────────────────────────────────

function initials(name) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function pctPill(val) {
  const pct = Math.round(val * 100)
  const cls = pct >= 80 ? 'green' : pct >= 50 ? 'yellow' : 'red'
  return `<span class="pill pill-${cls}">${pct}%</span>`
}

function calcPct(cal, rol) {
  const kpisRol = state.kpis[rol] || []
  if (!kpisRol.length) return 0
  let ok = 0
  kpisRol.forEach((_, i) => {
    const v = cal['KPI_' + (i + 1)]
    if (v === 'TRUE' || v === true) ok++
  })
  return ok / kpisRol.length
}

function badgePrio(p) {
  const map = { Alta: 'danger', Media: 'warning', Baja: 'success' }
  return `<span class="badge badge-${map[p] || 'muted'}">${p}</span>`
}

function badgeEst(e) {
  const map = { Pendiente: 'warning', 'En proceso': 'accent', Cerrado: 'success' }
  return `<span class="badge badge-${map[e] || 'muted'}">${e}</span>`
}

function fmtDate(d) {
  if (!d) return '—'
  const dt = new Date(d)
  return dt.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── CARGA INICIAL ─────────────────────────────────────────

async function loadAll() {
  try {
    const [equipo, kpis, clasifs, califs, acciones, seg, descs] = await Promise.all([
      api('getEquipo'),
      api('getKPIs'),
      api('getClasificaciones'),
      api('getCalificaciones'),
      api('getPlanAcciones'),
      api('getSeguimiento'),
      api('getDescubrimientos')
    ])
    state.equipo          = equipo
    state.kpis            = kpis
    state.clasificaciones = clasifs
    state.calificaciones  = califs
    state.acciones        = acciones
    state.seguimiento     = seg
    state.descubrimientos = descs

    const saved = localStorage.getItem('wbr_sesion_activa')
    if (saved) {
      sesionActiva = JSON.parse(saved)
      showFloatingBtn()
    }

    populateSelects()
    renderDashboard()
  } catch(e) {
    toast('Error al cargar datos: ' + e.message, 'error')
  }
}

function populateSelects() {
  const vendedores = state.equipo.filter(m => m.Rol !== 'Coordinador').map(m => m.Nombre)

  ;['filtroVendedor', 'mVendedor', 'calFiltroVendedor', 'acFiltroVendedor'].forEach(id => {
    const el = document.getElementById(id)
    if (!el) return
    const curr = el.value
    el.innerHTML = '<option value="">Todos</option>'
    vendedores.forEach(v => {
      const o = document.createElement('option')
      o.value = v; o.textContent = v
      el.appendChild(o)
    })
    if (curr) el.value = curr
  })

  const sesSelect = document.getElementById('mSesionId')
  if (sesSelect) {
    const ids = [...new Set(state.calificaciones.map(c => c.ID_Sesion))].sort()
    sesSelect.innerHTML = '<option value="">-- Sesión --</option>'
    ids.forEach(id => {
      const o = document.createElement('option')
      o.value = id; o.textContent = id
      sesSelect.appendChild(o)
    })
    if (sesionActiva) sesSelect.value = sesionActiva.id
  }
}
