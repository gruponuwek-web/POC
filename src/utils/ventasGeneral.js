// Cómputo pivotable de Ventas General a partir de la tabla de hechos (fact table).
// fact = { dims:{sucursales,proveedores,lineas,productos,vendedores,clientes},
//          rows:[[año,mes,si,pi,li,proi,vi,ci,venta,costo,n,cant]],
//          folios:[[año,mes,si,eb,ci,venta,[[proi,li,pi],...]]] }
// Un solo recorrido produce todos los agregados que necesita la página.

export function computeVG(fact, filtros) {
  if (!fact || !fact.rows || !fact.dims) return null
  const { dims, rows } = fact

  const año = filtros.año || 'todos'
  const equipo = filtros.equipo || 'todos'
  const mesesSet = (filtros.meses && filtros.meses.length) ? new Set(filtros.meses) : null
  const sucIdx = (filtros.sucursal && filtros.sucursal !== 'todas') ? dims.sucursales.indexOf(filtros.sucursal) : -1
  const provIdx = (filtros.vgProveedor && filtros.vgProveedor !== 'todos') ? dims.proveedores.indexOf(filtros.vgProveedor) : -1
  const lineaIdx = (filtros.vgLinea && filtros.vgLinea !== 'todas') ? dims.lineas.indexOf(filtros.vgLinea) : -1

  // Punto de referencia ("a la fecha de...") para Clientes Perdidos, en la escala relativa
  // 2026=mes, 2025=mes-12. Permite que Año/Mes muevan la fecha de corte de recencia.
  const mesMax2026 = fact.mesMax2026 || 7
  const mesesArr = filtros.meses || []
  const soloMes = mesesArr.length === 1 ? mesesArr[0] : null
  const refRel = año === '2025' ? (soloMes != null ? soloMes - 12 : 0)
    : año === '2026' ? (soloMes != null ? soloMes : mesMax2026)
    : (soloMes != null ? soloMes : mesMax2026)

  let comV = 0, comC = 0, comN = 0, restoV = 0, restoC = 0, restoN = 0
  let prevComV = 0, prevRestoV = 0
  const porMes = {}                 // { mes: {comV,restoV,comC,restoC,comN,restoN} } (respeta año)
  const porMesY = {}                // { mes: {2025:{vc,vr,cc,cr,nc,nr}, 2026:{...}} } (ambos años)
  const vendMap = new Map()         // vi -> {nombre,equipo,venta,costo,n}
  const provMap = new Map()         // pi -> {nombre,venta,costo,n}
  const cliMap = new Map()          // ci -> {nombre,num,venta}
  const porSucursal = {}            // si -> {com,resto} (IGNORA el filtro de sucursal)
  const cliLast = new Map()         // ci -> última compra (mes relativo) dentro del alcance actual
  const comparar = año === '2026'

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const ry = r[0], rm = r[1], si = r[2], pi = r[3], li = r[4], vi = r[6], ci = r[7]
    const venta = r[8], costo = r[9], n = r[10]

    if (provIdx >= 0 && pi !== provIdx) continue
    if (lineaIdx >= 0 && li !== lineaIdx) continue
    const vend = dims.vendedores[vi]
    const esCom = vend.equipo === 'comercial'
    if (equipo === 'comercial' && !esCom) continue
    if (equipo === 'resto' && esCom) continue

    const inMeses = !mesesSet || mesesSet.has(rm)
    const passYear = !(año === '2025' && ry !== 2025) && !(año === '2026' && ry !== 2026)

    // Venta por sucursal (ignora el filtro de sucursal; respeta año/mes/equipo/prov/línea)
    if (passYear && inMeses) {
      let ps = porSucursal[si]; if (!ps) { ps = { com: 0, resto: 0 }; porSucursal[si] = ps }
      if (esCom) ps.com += venta; else ps.resto += venta
    }

    // A partir de aquí, todo respeta el filtro de sucursal
    if (sucIdx >= 0 && si !== sucIdx) continue

    // Última compra por cliente (para perdidos): respeta sucursal/equipo/proveedor/línea.
    // Si se filtra un año específico, SOLO se considera ese año (no acumulado); con
    // "Todos" se combinan ambos años. Año/Mes también mueven refRel, el punto de corte.
    // 2026: mes; 2025: mes-12 — misma escala relativa continua.
    const rel = ry === 2026 ? rm : rm - 12
    if (passYear && rel <= refRel) {
      const prevRel = cliLast.get(ci)
      if (prevRel === undefined || rel > prevRel) cliLast.set(ci, rel)
    }

    // Desglose por año-mes (ambos años, respeta el resto de filtros menos año)
    if (inMeses) {
      let pmy = porMesY[rm]; if (!pmy) { pmy = { 2025: { vc: 0, vr: 0, cc: 0, cr: 0, nc: 0, nr: 0 }, 2026: { vc: 0, vr: 0, cc: 0, cr: 0, nc: 0, nr: 0 } }; porMesY[rm] = pmy }
      const slot = pmy[ry]
      if (slot) { if (esCom) { slot.vc += venta; slot.cc += costo; slot.nc += n } else { slot.vr += venta; slot.cr += costo; slot.nr += n } }
    }

    // Comparación vs año anterior (solo vista 2026): acumula 2025 en mismos meses/scope
    if (comparar && ry === 2025 && inMeses) {
      if (esCom) prevComV += venta; else prevRestoV += venta
    }

    // Filtro de año para el agregado principal
    if (año === '2025' && ry !== 2025) continue
    if (año === '2026' && ry !== 2026) continue
    if (!inMeses) continue

    if (esCom) { comV += venta; comC += costo; comN += n } else { restoV += venta; restoC += costo; restoN += n }

    let pm = porMes[rm]; if (!pm) { pm = { comV: 0, restoV: 0, comC: 0, restoC: 0, comN: 0, restoN: 0 }; porMes[rm] = pm }
    if (esCom) { pm.comV += venta; pm.comC += costo; pm.comN += n } else { pm.restoV += venta; pm.restoC += costo; pm.restoN += n }

    let vm = vendMap.get(vi); if (!vm) { vm = { nombre: vend.nombre, equipo: vend.equipo, venta: 0, costo: 0, n: 0 }; vendMap.set(vi, vm) }
    vm.venta += venta; vm.costo += costo; vm.n += n

    let pv = provMap.get(pi); if (!pv) { pv = { nombre: dims.proveedores[pi], venta: 0, costo: 0, n: 0 }; provMap.set(pi, pv) }
    pv.venta += venta; pv.costo += costo; pv.n += n

    let cm = cliMap.get(ci); if (!cm) { const c = dims.clientes[ci]; cm = { nombre: c.nombre, num: c.num, venta: 0 }; cliMap.set(ci, cm) }
    cm.venta += venta
  }

  const bySales = (a, b) => b.venta - a.venta
  const vendedores = [...vendMap.values()].filter(v => v.venta > 0).sort(bySales)
  const proveedores = [...provMap.values()].filter(p => p.venta > 0).sort(bySales)
  const clientes = [...cliMap.values()].filter(c => c.venta > 0).sort(bySales)
  const topResto = vendedores.filter(v => v.equipo === 'resto').slice(0, 7)

  const meses = Object.keys(porMes).map(Number).sort((a, b) => a - b)
  const mesesY = Object.keys(porMesY).map(Number).sort((a, b) => a - b)
  const total = comV + restoV
  const prev = comparar ? { comV: prevComV, restoV: prevRestoV, total: prevComV + prevRestoV } : null

  // Venta por sucursal (para las donas): nombre + split comercial/resto
  const sucursalesVenta = Object.keys(porSucursal).map(si => {
    const p = porSucursal[si]
    return { nombre: dims.sucursales[si], com: p.com, resto: p.resto, total: p.com + p.resto }
  }).filter(s => s.total > 0).sort((a, b) => b.total - a.total)

  // Ticket promedio (desde cubo de tickets únicos; responde a año/mes/sucursal/equipo, no a prov/línea)
  let tkVenta = 0, tkCount = 0
  if (fact.ticketsCubo) {
    for (const k in fact.ticketsCubo) {
      const [ry, rm, si, eb] = k.split('|').map(Number)
      if (año === '2025' && ry !== 2025) continue
      if (año === '2026' && ry !== 2026) continue
      if (mesesSet && !mesesSet.has(rm)) continue
      if (sucIdx >= 0 && si !== sucIdx) continue
      if (equipo === 'comercial' && eb !== 0) continue
      if (equipo === 'resto' && eb !== 1) continue
      const c = fact.ticketsCubo[k]; tkVenta += c.v; tkCount += c.t
    }
  }
  const ticketProm = tkCount > 0 ? tkVenta / tkCount : 0

  // Clientes perdidos (regla +4 meses) calculado desde la fact table:
  // responde a sucursal, equipo, proveedor, línea, año y mes (vía refRel).
  // Base = clientes del alcance con historial de compra a la fecha de referencia.
  const corte = refRel - 4
  let perdidos = 0, perdidosTotal = 0
  cliLast.forEach(rel => { perdidosTotal++; if (rel <= corte) perdidos++ })

  return {
    comV, restoV, comN, restoN, total, totalN: comN + restoN, prev,
    porMes, meses, porMesY, mesesY, vendedores, proveedores, clientes, topResto, sucursalesVenta,
    ticketProm, tickets: tkCount, perdidos, perdidosTotal, perdidosPct: perdidosTotal > 0 ? perdidos / perdidosTotal * 100 : 0,
  }
}

const TOP_N_SUNBURST = 12
const TOP_N_CHORD = 16

// Cómputo pivotable de Análisis de Productos (Sunburst, Densidad de compra, Correlación)
// a partir de la MISMA fact table, respetando los 6 filtros de la página.
// Sunburst: se arma desde `rows` (línea→producto), respeta año/mes/sucursal/equipo/prov/línea.
// Densidad: se arma desde `folios` (por cliente), respeta año/mes/sucursal/equipo — igual que
//   Ticket Promedio, no depende de proveedor/línea (la venta del folio es del ticket completo).
// Correlación: se arma desde `folios`, filtrando los ítems del folio por proveedor/línea si
//   aplica, y calculando co-ocurrencia (folios en común) sobre los ítems restantes.
export function computeProductAnalytics(fact, filtros) {
  if (!fact || !fact.rows || !fact.dims) return null
  const { dims, rows, folios } = fact

  const año = filtros.año || 'todos'
  const equipo = filtros.equipo || 'todos'
  const mesesSet = (filtros.meses && filtros.meses.length) ? new Set(filtros.meses) : null
  const sucIdx = (filtros.sucursal && filtros.sucursal !== 'todas') ? dims.sucursales.indexOf(filtros.sucursal) : -1
  const provIdx = (filtros.vgProveedor && filtros.vgProveedor !== 'todos') ? dims.proveedores.indexOf(filtros.vgProveedor) : -1
  const lineaIdx = (filtros.vgLinea && filtros.vgLinea !== 'todas') ? dims.lineas.indexOf(filtros.vgLinea) : -1

  // --- Sunburst: línea -> producto ---
  const lineaMap = new Map() // li -> { venta, cantidad, prods: Map(proi -> {venta,cantidad}) }
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const ry = r[0], rm = r[1], si = r[2], pi = r[3], li = r[4], proi = r[5], vi = r[6]
    const venta = r[8], cant = r[11]
    if (año === '2025' && ry !== 2025) continue
    if (año === '2026' && ry !== 2026) continue
    if (mesesSet && !mesesSet.has(rm)) continue
    if (sucIdx >= 0 && si !== sucIdx) continue
    if (provIdx >= 0 && pi !== provIdx) continue
    if (lineaIdx >= 0 && li !== lineaIdx) continue
    const vend = dims.vendedores[vi]
    const esCom = vend.equipo === 'comercial'
    if (equipo === 'comercial' && !esCom) continue
    if (equipo === 'resto' && esCom) continue

    let lm = lineaMap.get(li); if (!lm) { lm = { venta: 0, cantidad: 0, prods: new Map() }; lineaMap.set(li, lm) }
    lm.venta += venta; lm.cantidad += cant
    let pm = lm.prods.get(proi); if (!pm) { pm = { venta: 0, cantidad: 0 }; lm.prods.set(proi, pm) }
    pm.venta += venta; pm.cantidad += cant
  }
  const sunburst = [...lineaMap.entries()].map(([li, lm]) => {
    const prods = [...lm.prods.entries()].map(([proi, pm]) => ({ nombre: dims.productos[proi], venta: pm.venta, cantidad: pm.cantidad })).sort((a, b) => b.venta - a.venta)
    const top = prods.slice(0, TOP_N_SUNBURST)
    const resto = prods.slice(TOP_N_SUNBURST)
    if (resto.length) {
      const rv = resto.reduce((s, p) => s + p.venta, 0), rc = resto.reduce((s, p) => s + p.cantidad, 0)
      top.push({ nombre: `Otros (${resto.length})`, venta: rv, cantidad: rc })
    }
    return { nombre: dims.lineas[li], venta: lm.venta, cantidad: lm.cantidad, productos: top }
  }).filter(l => l.venta > 0).sort((a, b) => b.venta - a.venta)

  // --- Densidad: por cliente, comparando 2025 vs 2026 (el año siempre queda fijo a la
  // comparación; respeta mes/sucursal/equipo — no proveedor/línea, es a nivel folio) ---
  const foliosArr = folios || []
  const cliFreqY = { 2025: new Map(), 2026: new Map() }
  for (let i = 0; i < foliosArr.length; i++) {
    const fo = foliosArr[i]
    const ry = fo[0], rm = fo[1], si = fo[2], eb = fo[3], ci = fo[4], venta = fo[5]
    if (mesesSet && !mesesSet.has(rm)) continue
    if (sucIdx >= 0 && si !== sucIdx) continue
    if (equipo === 'comercial' && eb !== 0) continue
    if (equipo === 'resto' && eb !== 1) continue
    const m = cliFreqY[ry]; if (!m) continue
    let cf = m.get(ci); if (!cf) { cf = { tickets: 0, monto: 0 }; m.set(ci, cf) }
    cf.tickets += 1; cf.monto += venta
  }
  const densidad = {
    '2025': { frecuencias: [...cliFreqY[2025].values()].map(c => c.tickets), montos: [...cliFreqY[2025].values()].map(c => c.monto) },
    '2026': { frecuencias: [...cliFreqY[2026].values()].map(c => c.tickets), montos: [...cliFreqY[2026].values()].map(c => c.monto) },
  }

  // --- Correlación: red de co-ocurrencia de productos, respeta los 6 filtros ---
  const prodTotal = new Map()      // proi -> nº de folios (filtrados) en que aparece
  const folioItemsList = []        // canastas filtradas (arrays de proi), para co-ocurrencia
  for (let i = 0; i < foliosArr.length; i++) {
    const fo = foliosArr[i]
    const ry = fo[0], rm = fo[1], si = fo[2], eb = fo[3], items = fo[6]
    if (año === '2025' && ry !== 2025) continue
    if (año === '2026' && ry !== 2026) continue
    if (mesesSet && !mesesSet.has(rm)) continue
    if (sucIdx >= 0 && si !== sucIdx) continue
    if (equipo === 'comercial' && eb !== 0) continue
    if (equipo === 'resto' && eb !== 1) continue

    const filtItems = (provIdx < 0 && lineaIdx < 0) ? items
      : items.filter(([, li, pi]) => (lineaIdx < 0 || li === lineaIdx) && (provIdx < 0 || pi === provIdx))
    const proiSet = [...new Set(filtItems.map(([proi]) => proi))]
    if (proiSet.length >= 2) folioItemsList.push(proiSet)
    proiSet.forEach(proi => { prodTotal.set(proi, (prodTotal.get(proi) || 0) + 1) })
  }

  const topProds = [...prodTotal.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP_N_CHORD).map(([proi]) => proi)
  const prodIdxOf = new Map(topProds.map((proi, i) => [proi, i]))
  const n = topProds.length
  const matrix = Array.from({ length: n }, () => new Array(n).fill(0))
  folioItemsList.forEach(proiList => {
    const idxs = proiList.map(proi => prodIdxOf.get(proi)).filter(i => i !== undefined)
    for (let a = 0; a < idxs.length; a++) for (let b = a + 1; b < idxs.length; b++) {
      matrix[idxs[a]][idxs[b]]++; matrix[idxs[b]][idxs[a]]++
    }
  })
  const grado = matrix.map(row => row.reduce((s, v) => s + v, 0))
  const chord = { productos: topProds.map(proi => dims.productos[proi]), matrix, grado }

  return { sunburst, densidad, chord }
}

// Etiqueta legible del alcance según los filtros activos (para encabezados).
export function scopeLabel(filtros) {
  const partes = []
  if (filtros.sucursal && filtros.sucursal !== 'todas') partes.push(filtros.sucursal)
  if (filtros.vgLinea && filtros.vgLinea !== 'todas') partes.push(filtros.vgLinea)
  if (filtros.vgProveedor && filtros.vgProveedor !== 'todos') partes.push(filtros.vgProveedor)
  if (filtros.equipo === 'comercial') partes.push('Equipo comercial')
  else if (filtros.equipo === 'resto') partes.push('El resto')
  return partes.length ? partes.join(' · ') : 'Toda la empresa'
}
