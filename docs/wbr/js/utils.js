let state = {
  equipo: [],
  kpis: {},
  clasificaciones: [],
  calificaciones: [],
  acciones: [],
  seguimiento: [],
  descubrimientos: [],
  ausencias: [],
  sesionesMBR: [],
  compromisos: []
}
let sesionActiva = null

function calcSemana(fechaStr) {
  const d = new Date(fechaStr)
  const inicio = new Date(d.getFullYear(), 0, 1)
  return Math.ceil(((d - inicio) / 86400000 + inicio.getDay() + 1) / 7)
}

// ── CACHÉ ─────────────────────────────────────────────────

const _CACHE_KEY = 'wbr_cache_v2'
const _CACHE_TTL = 10 * 60 * 1000 // 10 minutos

function _saveCache(data) {
  try { localStorage.setItem(_CACHE_KEY, JSON.stringify({ ts: Date.now(), data })) } catch {}
}

function _loadCache() {
  try {
    const raw = localStorage.getItem(_CACHE_KEY)
    if (!raw) return null
    const { ts, data } = JSON.parse(raw)
    return Date.now() - ts < _CACHE_TTL ? data : null
  } catch { return null }
}

function _clearCache() {
  localStorage.removeItem(_CACHE_KEY)
}

// ── HTTP ──────────────────────────────────────────────────

async function api(action) {
  const r = await fetch(API + '?action=' + action)
  return r.json()
}

async function post(action, data) {
  _clearCache()
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
  if (page === 'dashboard')   renderDashboard()
  if (page === 'calificar')   resetCalificar()
  if (page === 'acciones')    renderAcciones()
  if (page === 'agenda')      renderAgenda()
  if (page === 'compromisos') resetCompromisos()
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
    const cached = _loadCache()
    let equipo, kpis, clasifs, califs, acciones, seg, descs, ausencias, sesionesMBR, compromisos

    if (cached) {
      ;({ equipo, kpis, clasifs, califs, acciones, seg, descs, ausencias, sesionesMBR, compromisos } = cached)
    } else {
      ;[equipo, kpis, clasifs, califs, acciones, seg, descs, ausencias, sesionesMBR, compromisos] = await Promise.all([
        api('getEquipo'),
        api('getKPIs'),
        api('getClasificaciones'),
        api('getCalificaciones'),
        api('getPlanAcciones'),
        api('getSeguimiento'),
        api('getDescubrimientos'),
        api('getAusencias'),
        api('getSesionesMBR'),
        api('getCompromisos')
      ])
      _saveCache({ equipo, kpis, clasifs, califs, acciones, seg, descs, ausencias, sesionesMBR, compromisos })
    }

    state.equipo          = equipo.filter(m => !EXCLUDED_AGENTS.includes(m.Nombre))
    state.kpis            = kpis
    state.clasificaciones = clasifs
    state.calificaciones  = califs
    state.acciones        = acciones
    state.seguimiento     = seg
    state.descubrimientos = descs
    state.ausencias       = ausencias
    state.sesionesMBR     = sesionesMBR
    state.compromisos     = compromisos

    const saved = localStorage.getItem('wbr_sesion_activa')
    if (saved) {
      sesionActiva = JSON.parse(saved)
    }

    populateSelects()
    renderDashboard()

    // Poner fecha de hoy y calcular siguiente ID de sesión con datos ya cargados
    const fechaEl = document.getElementById('sesFecha')
    if (fechaEl) {
      if (!fechaEl.value) fechaEl.value = new Date().toISOString().split('T')[0]
      const semEl = document.getElementById('sesSemana')
      if (semEl && !semEl.value) semEl.value = calcSemana(fechaEl.value)
    }
    const sesIdEl = document.getElementById('sesId')
    if (sesIdEl && !sesionActiva) {
      // Obtener IDs únicos de sesiones de calificaciones Y ausencias
      const todasSesiones = [
        ...state.calificaciones.map(c => c.ID_Sesion),
        ...state.ausencias.map(a => a.ID_Sesion)
      ]
      const maxId = todasSesiones.reduce((max, sid) => {
        const n = parseInt(String(sid || '').replace(/\D/g, ''))
        return isNaN(n) ? max : Math.max(max, n)
      }, 0)
      sesIdEl.value = 'SES' + String(maxId + 1).padStart(3, '0')
    }
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
