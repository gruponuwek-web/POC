const SS = SpreadsheetApp.getActiveSpreadsheet()

function doGet(e) {
  const action = e.parameter.action
  try {
    if (action === 'getEquipo')          return json(getHoja('Equipo'))
    if (action === 'getKPIs')            return json(getKPIs())
    if (action === 'getClasificaciones') return json(getHoja('Clasificaciones'))
    if (action === 'getCalificaciones')  return json(getHoja('Calificaciones'))
    if (action === 'getPlanAcciones')    return json(getHoja('PlanAcciones'))
    if (action === 'getSeguimiento')     return json(getHoja('Seguimiento'))
    if (action === 'getDescubrimientos') return json(getHoja('Descubrimientos'))
    if (action === 'getAusencias')       return json(getHoja('Ausencias'))
    if (action === 'getSesionesMBR')     return json(getHoja('SesionesMBR'))
    if (action === 'getCompromisos')     return json(getHoja('Compromisos'))
    return json({ error: 'action no reconocida: ' + action })
  } catch(err) {
    return json({ error: err.message })
  }
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents)
  const action = data.action
  try {
    if (action === 'saveCalificacion')   return json(saveCalificacion(data))
    if (action === 'saveDescubrimiento') return json(saveDescubrimiento(data))
    if (action === 'savePlanAccion')     return json(savePlanAccion(data))
    if (action === 'saveSeguimiento')    return json(saveSeguimiento(data))
    if (action === 'savePdfToDrive')     return json(savePdfToDrive(data))
    if (action === 'deleteSesion')       return json(deleteSesion(data))
    if (action === 'saveAusencia')       return json(saveAusencia(data))
    if (action === 'deleteAusencia')     return json(deleteAusencia(data))
    if (action === 'deleteAccion')       return json(deleteAccion(data))
    if (action === 'saveSesionMBR')      return json(saveSesionMBR(data))
    if (action === 'deleteSesionMBR')    return json(deleteSesionMBR(data))
    if (action === 'saveCompromiso')          return json(saveCompromiso(data))
    if (action === 'deleteCompromiso')        return json(deleteCompromiso(data))
    if (action === 'clearCompromisosSeccion') return json(clearCompromisosSeccion(data))
    return json({ error: 'action no reconocida: ' + action })
  } catch(err) {
    return json({ error: err.message })
  }
}

// ── HELPERS ──────────────────────────────────────────────

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON)
}

function getHoja(nombre) {
  const hoja = SS.getSheetByName(nombre)
  const rows = hoja.getDataRange().getValues()
  const headers = rows[0]
  return rows.slice(1)
    .filter(r => r.some(c => c !== ''))
    .map(r => {
      const obj = {}
      headers.forEach((h, i) => { obj[h] = r[i] })
      return obj
    })
}

function getKPIs() {
  const hoja = SS.getSheetByName('KPIs')
  const rows = hoja.getDataRange().getValues()
  const result = {}
  rows.forEach(r => {
    const rol = r[0]
    if (!rol) return
    result[rol] = r.slice(1).filter(k => k !== '')
  })
  return result
}

function nextId(nombreHoja, colIndex) {
  const hoja = SS.getSheetByName(nombreHoja)
  const vals = hoja.getDataRange().getValues().slice(1)
  let max = 0
  vals.forEach(r => {
    const id = String(r[colIndex] || '')
    const num = parseInt(id.replace(/\D/g, ''))
    if (!isNaN(num) && num > max) max = num
  })
  return max + 1
}

// ── ESCRITURAS ────────────────────────────────────────────

function saveCalificacion(d) {
  const hoja = SS.getSheetByName('Calificaciones')
  const rows = hoja.getDataRange().getValues()

  for (let i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][1]) === String(d.id_sesion) &&
        String(rows[i][3]) === String(d.vendedor)) {
      hoja.deleteRow(i + 1)
    }
  }

  const n = nextId('Calificaciones', 0)
  const id = 'CAL' + String(n).padStart(4, '0')
  const kpis = d.kpis || []
  const cumplimiento = kpis.length > 0
    ? kpis.filter(k => k === true || k === 'true' || k === 'TRUE').length / kpis.length
    : 0

  const fila = [id, d.id_sesion, d.fecha, d.vendedor, d.rol, d.semana, cumplimiento]
  kpis.forEach(k => fila.push(k === true || k === 'true' || k === 'TRUE' ? 'TRUE' : 'FALSE'))

  hoja.appendRow(fila)
  return { success: true, id }
}

function saveDescubrimiento(d) {
  const hoja = SS.getSheetByName('Descubrimientos')
  const rows = hoja.getDataRange().getValues()

  // Upsert por sesion + vendedor
  for (let i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][1]) === String(d.id_sesion) &&
        String(rows[i][2]) === String(d.vendedor)) {
      hoja.deleteRow(i + 1)
    }
  }

  const n = nextId('Descubrimientos', 0)
  const id = 'DESC' + String(n).padStart(4, '0')
  const ts = new Date().toISOString()
  hoja.appendRow([id, d.id_sesion, d.vendedor, d.descubrimiento, ts])
  return { success: true, id }
}

function savePlanAccion(d) {
  const hoja = SS.getSheetByName('PlanAcciones')

  // Si es el primer acción del lote, borrar acciones previas de ese vendedor en esa sesión
  if (d.primer_del_lote) {
    const rows = hoja.getDataRange().getValues()
    const accIds = []
    for (let i = rows.length - 1; i >= 1; i--) {
      if (String(rows[i][1]) === String(d.id_sesion) &&
          String(rows[i][2]) === String(d.vendedor)) {
        accIds.push(String(rows[i][0]))
        hoja.deleteRow(i + 1)
      }
    }
    // Borrar seguimientos de las acciones eliminadas
    if (accIds.length) {
      const segHoja = SS.getSheetByName('Seguimiento')
      const segRows = segHoja.getDataRange().getValues()
      for (let i = segRows.length - 1; i >= 1; i--) {
        if (accIds.includes(String(segRows[i][1]))) segHoja.deleteRow(i + 1)
      }
    }
  }

  const n = nextId('PlanAcciones', 0)
  const id = 'ACC' + String(n).padStart(4, '0')
  const ts = new Date().toISOString()
  hoja.appendRow([
    id, d.id_sesion, d.vendedor, d.clasificacion, d.prioridad,
    d.descripcion, d.descripcion_libre || '', d.resultado_esperado || '',
    d.cliente || '', d.acompanamiento || '', d.proveedor_externo || '',
    d.fecha_compromiso || '', 'Pendiente', ts
  ])
  return { success: true, id }
}

function saveSeguimiento(d) {
  const hoja = SS.getSheetByName('Seguimiento')
  const n = nextId('Seguimiento', 0)
  const id = 'SEG' + String(n).padStart(4, '0')
  const ts = new Date().toISOString()
  hoja.appendRow([id, d.id_accion, d.fecha_seguimiento, d.coordinador, d.notas, d.nuevo_estatus, ts])

  const acc = SS.getSheetByName('PlanAcciones')
  const accRows = acc.getDataRange().getValues()
  for (let i = 1; i < accRows.length; i++) {
    if (String(accRows[i][0]) === String(d.id_accion)) {
      acc.getRange(i + 1, 13).setValue(d.nuevo_estatus)
      break
    }
  }
  return { success: true, id }
}

function saveAusencia(d) {
  const hoja = SS.getSheetByName('Ausencias')
  const rows = hoja.getDataRange().getValues()

  // Upsert por sesion + vendedor
  for (let i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][1]) === String(d.id_sesion) &&
        String(rows[i][4]) === String(d.vendedor)) {
      hoja.deleteRow(i + 1)
    }
  }

  const n = nextId('Ausencias', 0)
  const id = 'AUS' + String(n).padStart(3, '0')
  const ts = new Date().toISOString()
  hoja.appendRow([id, d.id_sesion, d.fecha, d.semana, d.vendedor, d.razon, ts])
  return { success: true, id }
}

function deleteAccion(d) {
  const accHoja = SS.getSheetByName('PlanAcciones')
  const accRows = accHoja.getDataRange().getValues()
  for (let i = accRows.length - 1; i >= 1; i--) {
    if (String(accRows[i][0]) === String(d.id_accion)) {
      accHoja.deleteRow(i + 1)
      break
    }
  }
  // Borrar seguimientos asociados
  const segHoja = SS.getSheetByName('Seguimiento')
  const segRows = segHoja.getDataRange().getValues()
  for (let i = segRows.length - 1; i >= 1; i--) {
    if (String(segRows[i][1]) === String(d.id_accion)) segHoja.deleteRow(i + 1)
  }
  return { success: true }
}

function deleteAusencia(d) {
  const hoja = SS.getSheetByName('Ausencias')
  const rows = hoja.getDataRange().getValues()
  for (let i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][1]) === String(d.id_sesion) &&
        String(rows[i][4]) === String(d.vendedor)) {
      hoja.deleteRow(i + 1)
    }
  }
  return { success: true }
}

function savePdfToDrive(d) {
  const folder = DriveApp.getFolderById(d.folderId)
  const bytes = Utilities.base64Decode(d.b64)
  const blob = Utilities.newBlob(bytes, 'application/pdf', d.nombre)
  const file = folder.createFile(blob)
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW)
  return { success: true, url: file.getUrl(), id: file.getId() }
}

// ── MBR ──────────────────────────────────────────────────

function saveSesionMBR(d) {
  const hoja = SS.getSheetByName('SesionesMBR')
  const rows = hoja.getDataRange().getValues()

  // Upsert por ID_Sesion
  for (let i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][0]) === String(d.id_sesion)) {
      hoja.deleteRow(i + 1)
    }
  }

  const ts = new Date().toISOString()
  hoja.appendRow([d.id_sesion, d.fecha, d.semana, d.coordinador || '', ts])
  return { success: true, id: d.id_sesion }
}

function deleteSesionMBR(d) {
  // Borrar compromisos de la sesión
  const compHoja = SS.getSheetByName('Compromisos')
  const compRows = compHoja.getDataRange().getValues()
  for (let i = compRows.length - 1; i >= 1; i--) {
    if (String(compRows[i][1]) === String(d.id_sesion)) compHoja.deleteRow(i + 1)
  }

  // Borrar la sesión
  const hoja = SS.getSheetByName('SesionesMBR')
  const rows = hoja.getDataRange().getValues()
  for (let i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][0]) === String(d.id_sesion)) hoja.deleteRow(i + 1)
  }
  return { success: true }
}

function saveCompromiso(d) {
  const hoja = SS.getSheetByName('Compromisos')
  const rows = hoja.getDataRange().getValues()

  // Upsert por ID_Sesion + Vendedor + Seccion + Descripcion
  // Si llega primer_del_lote=true borra todos los compromisos del vendedor+sesión+sección antes de insertar
  if (d.primer_del_lote) {
    for (let i = rows.length - 1; i >= 1; i--) {
      if (String(rows[i][1]) === String(d.id_sesion) &&
          String(rows[i][2]) === String(d.vendedor) &&
          String(rows[i][3]) === String(d.seccion)) {
        hoja.deleteRow(i + 1)
      }
    }
  }

  const n = nextId('Compromisos', 0)
  const id = 'COM' + String(n).padStart(4, '0')
  const ts = new Date().toISOString()
  hoja.appendRow([
    id,
    d.id_sesion,
    d.vendedor,
    d.seccion,       // 'Prospeccion' | 'BCG' | 'Recuperacion'
    d.descripcion,
    d.cumplido ? 'TRUE' : 'FALSE',
    d.monto || 0,
    ts
  ])
  return { success: true, id }
}

function clearCompromisosSeccion(d) {
  const hoja = SS.getSheetByName('Compromisos')
  const rows = hoja.getDataRange().getValues()
  for (let i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][1]) === String(d.id_sesion) &&
        String(rows[i][2]) === String(d.vendedor) &&
        String(rows[i][3]) === String(d.seccion)) {
      hoja.deleteRow(i + 1)
    }
  }
  return { success: true }
}

function deleteCompromiso(d) {
  const hoja = SS.getSheetByName('Compromisos')
  const rows = hoja.getDataRange().getValues()
  for (let i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][0]) === String(d.id_compromiso)) {
      hoja.deleteRow(i + 1)
      break
    }
  }
  return { success: true }
}

function deleteSesion(d) {
  const sid = d.id_sesion

  const calHoja = SS.getSheetByName('Calificaciones')
  const calRows = calHoja.getDataRange().getValues()
  for (let i = calRows.length - 1; i >= 1; i--) {
    if (String(calRows[i][1]) === String(sid)) calHoja.deleteRow(i + 1)
  }

  const descHoja = SS.getSheetByName('Descubrimientos')
  const descRows = descHoja.getDataRange().getValues()
  for (let i = descRows.length - 1; i >= 1; i--) {
    if (String(descRows[i][1]) === String(sid)) descHoja.deleteRow(i + 1)
  }

  const accHoja = SS.getSheetByName('PlanAcciones')
  const accRows = accHoja.getDataRange().getValues()
  const accIds = []
  for (let i = accRows.length - 1; i >= 1; i--) {
    if (String(accRows[i][1]) === String(sid)) {
      accIds.push(String(accRows[i][0]))
      accHoja.deleteRow(i + 1)
    }
  }

  if (accIds.length) {
    const segHoja = SS.getSheetByName('Seguimiento')
    const segRows = segHoja.getDataRange().getValues()
    for (let i = segRows.length - 1; i >= 1; i--) {
      if (accIds.includes(String(segRows[i][1]))) segHoja.deleteRow(i + 1)
    }
  }

  // Borrar ausencias de la sesión
  const ausHoja = SS.getSheetByName('Ausencias')
  const ausRows = ausHoja.getDataRange().getValues()
  for (let i = ausRows.length - 1; i >= 1; i--) {
    if (String(ausRows[i][1]) === String(sid)) ausHoja.deleteRow(i + 1)
  }

  return { success: true }
}
