let _segAccionId = null
let _borrarAccionId = null
let _acPage = 1
let _acPageSize = 10

function _acFiltrar() { _acPage = 1; renderAcciones() }

function _acCambiarTamano() {
  _acPageSize = parseInt(document.getElementById('acPageSize').value) || 10
  _acPage = 1
  renderAcciones()
}

function clearFiltrosAcciones() {
  document.getElementById('acFiltroVendedor').value = ''
  document.getElementById('acFiltroEstatus').value  = ''
  document.getElementById('acFiltroPrio').value     = ''
  document.getElementById('acFechaIni').value       = ''
  document.getElementById('acFechaFin').value       = ''
  _acPage = 1
  renderAcciones()
}

function renderAcciones() {
  const vendedor  = document.getElementById('acFiltroVendedor')?.value || ''
  const estatus   = document.getElementById('acFiltroEstatus')?.value  || ''
  const prio      = document.getElementById('acFiltroPrio')?.value     || ''
  const fechaIni  = document.getElementById('acFechaIni')?.value       || ''
  const fechaFin  = document.getElementById('acFechaFin')?.value       || ''

  const lista = state.acciones.filter(a => {
    if (vendedor && a.Vendedor !== vendedor) return false
    if (estatus  && a.Estatus  !== estatus)  return false
    if (prio     && a.Prioridad !== prio)    return false
    if (fechaIni || fechaFin) {
      const d = a.Fecha_Compromiso ? String(a.Fecha_Compromiso).split('T')[0] : null
      if (!d) return false
      if (fechaIni && d < fechaIni) return false
      if (fechaFin && d > fechaFin) return false
    }
    return true
  })

  const total      = lista.length
  const totalPages = Math.max(1, Math.ceil(total / _acPageSize))
  if (_acPage > totalPages) _acPage = totalPages

  const desde  = (_acPage - 1) * _acPageSize
  const pagina = lista.slice(desde, desde + _acPageSize)

  const tbody = document.getElementById('accionesBody')
  if (!tbody) return

  if (!pagina.length) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;color:var(--muted);padding:24px">Sin acciones para los filtros seleccionados.</td></tr>`
    _renderAcPaginacion(0, 1)
    return
  }

  tbody.innerHTML = pagina.map((a, i) => `
    <tr>
      <td style="text-align:center;color:var(--muted);font-size:12px;font-variant-numeric:tabular-nums;font-weight:600">${desde + i + 1}</td>
      <td>${a.Vendedor || '—'}</td>
      <td>${a.Clasificacion || '—'}</td>
      <td>${badgePrio(a.Prioridad)}</td>
      <td>${a.Descripcion || '—'}</td>
      <td>${a.Cliente || '—'}</td>
      <td>${fmtDate(a.Fecha_Compromiso)}</td>
      <td>${a.Acompanamiento || '—'}</td>
      <td>${badgeEst(a.Estatus)}</td>
      <td style="white-space:nowrap">
        ${a.Estatus !== 'Cerrado'
          ? `<button class="btn btn-sm" onclick="openSeguimientoModal('${a.ID_Accion}')">+ Seg.</button>`
          : '—'
        }
        <button class="btn btn-sm" style="margin-left:4px;color:var(--danger);border-color:var(--danger)" onclick="pedirBorrarAccion('${a.ID_Accion}')" title="Eliminar acción">
          <i class="ti ti-trash"></i>
        </button>
      </td>
    </tr>`).join('')

  _renderAcPaginacion(total, totalPages)
}

function _renderAcPaginacion(total, totalPages) {
  const info = document.getElementById('acPagInfo')
  const btns = document.getElementById('acPagBtns')
  if (!info || !btns) return

  if (total === 0) { info.textContent = '0 registros'; btns.innerHTML = ''; return }

  const desde = (_acPage - 1) * _acPageSize + 1
  const hasta = Math.min(_acPage * _acPageSize, total)
  info.textContent = `${desde}–${hasta} de ${total} registro${total !== 1 ? 's' : ''}`

  if (totalPages <= 1) { btns.innerHTML = ''; return }

  // Page window: show up to 5 page buttons
  let start = Math.max(1, _acPage - 2)
  let end   = Math.min(totalPages, start + 4)
  if (end - start < 4) start = Math.max(1, end - 4)

  const pageBtn = (label, p, active, disabled) =>
    `<button class="btn btn-sm${active ? ' btn-primary' : ''}" onclick="_acGoto(${p})" ${disabled ? 'disabled' : ''}
      style="min-width:30px;padding:3px 8px;font-size:12px">${label}</button>`

  const parts = []
  parts.push(pageBtn('‹', _acPage - 1, false, _acPage === 1))
  if (start > 1) { parts.push(pageBtn('1', 1, false, false)); if (start > 2) parts.push('<span style="padding:0 2px;color:var(--muted);line-height:28px">…</span>') }
  for (let p = start; p <= end; p++) parts.push(pageBtn(p, p, p === _acPage, false))
  if (end < totalPages) { if (end < totalPages - 1) parts.push('<span style="padding:0 2px;color:var(--muted);line-height:28px">…</span>'); parts.push(pageBtn(totalPages, totalPages, false, false)) }
  parts.push(pageBtn('›', _acPage + 1, false, _acPage === totalPages))

  btns.innerHTML = parts.join('')
}

function _acGoto(p) { _acPage = p; renderAcciones() }

function openModalAccion() {
  populateSelects()
  document.getElementById('mDesc').value = ''
  document.getElementById('mDescLibre').value = ''
  document.getElementById('mCliente').value = ''
  document.getElementById('mResultado').value = ''
  document.getElementById('mFecha').value = ''
  document.getElementById('mAcompa').value = COORD
  if (sesionActiva) document.getElementById('mSesionId').value = sesionActiva.id
  openModal('modalAccion')
}

async function guardarAccion() {
  const sesId = document.getElementById('mSesionId').value
  const vend  = document.getElementById('mVendedor').value
  const desc  = document.getElementById('mDesc').value.trim()
  if (!sesId) return toast('Selecciona una sesión', 'error')
  if (!vend)  return toast('Selecciona un agente', 'error')
  if (!desc)  return toast('Escribe una descripción', 'error')

  setLoading('btnGuardarAccion', true)
  const res = await post('savePlanAccion', {
    id_sesion: sesId,
    vendedor: vend,
    clasificacion: document.getElementById('mClasif').value,
    prioridad: document.getElementById('mPrio').value,
    descripcion: desc,
    descripcion_libre: document.getElementById('mDescLibre').value,
    cliente: document.getElementById('mCliente').value,
    resultado_esperado: document.getElementById('mResultado').value,
    acompanamiento: document.getElementById('mAcompa').value,
    fecha_compromiso: document.getElementById('mFecha').value
  })
  setLoading('btnGuardarAccion', false, '<i class="ti ti-device-floppy"></i> Guardar acción')

  if (res.success) {
    closeModal('modalAccion')
    await loadAll()
    renderAcciones()
    toast('Acción registrada')
  } else {
    toast('Error: ' + res.error, 'error')
  }
}

// ── ELIMINAR ACCIÓN ───────────────────────────────────────

function pedirBorrarAccion(id) {
  _borrarAccionId = id
  const acc = state.acciones.find(a => a.ID_Accion === id)
  document.getElementById('borrarAccionDesc').textContent = acc?.Descripcion || id
  openModal('modalBorrarAccion')
}

async function confirmarBorrarAccion() {
  if (!_borrarAccionId) return
  closeModal('modalBorrarAccion')
  const res = await post('deleteAccion', { id_accion: _borrarAccionId })
  if (res.success) {
    await loadAll()
    renderAcciones()
    toast('Acción eliminada')
    _borrarAccionId = null
  } else {
    toast('Error: ' + (res.error || 'No se pudo eliminar'), 'error')
  }
}

// ── SEGUIMIENTO ───────────────────────────────────────────

function openSeguimientoModal(idAccion) {
  _segAccionId = idAccion
  const acc = state.acciones.find(a => a.ID_Accion === idAccion)
  if (!acc) return

  document.getElementById('segAccionInfo').innerHTML = `
    <div style="font-weight:600;margin-bottom:4px">${acc.Descripcion || '—'}</div>
    <div>${acc.Vendedor} · ${acc.Cliente || '—'} · ${badgePrio(acc.Prioridad)} ${badgeEst(acc.Estatus)}</div>`

  const segs = state.seguimiento.filter(s => s.ID_Accion === idAccion)
  document.getElementById('segHistorial').innerHTML = segs.length
    ? `<div style="font-size:12px;font-weight:600;color:var(--muted);margin-bottom:8px">Historial</div>` +
      segs.map(s => `
        <div style="border-left:2px solid var(--border);padding:6px 12px;margin-bottom:6px;font-size:12px">
          <div style="font-weight:600">${fmtDate(s.Fecha_Seguimiento)} — ${badgeEst(s.Nuevo_Estatus)}</div>
          <div style="color:var(--text2);margin-top:2px">${s.Notas || '—'}</div>
        </div>`).join('')
    : ''

  document.getElementById('segFecha').value = new Date().toISOString().split('T')[0]
  document.getElementById('segNotas').value = ''
  document.getElementById('segEstatus').value = acc.Estatus || 'Pendiente'
  openModal('modalSeguimiento')
}

async function guardarSeguimiento() {
  if (!_segAccionId) return
  const notas   = document.getElementById('segNotas').value.trim()
  const estatus = document.getElementById('segEstatus').value
  const fecha   = document.getElementById('segFecha').value

  setLoading('btnGuardarSeg', true)
  const res = await post('saveSeguimiento', {
    id_accion: _segAccionId,
    fecha_seguimiento: fecha,
    coordinador: COORD,
    notas,
    nuevo_estatus: estatus
  })
  setLoading('btnGuardarSeg', false, '<i class="ti ti-device-floppy"></i> Guardar')

  if (res.success) {
    closeModal('modalSeguimiento')
    await loadAll()
    renderAcciones()
    renderAgenda()
    toast('Seguimiento registrado')
  } else {
    toast('Error: ' + res.error, 'error')
  }
}
