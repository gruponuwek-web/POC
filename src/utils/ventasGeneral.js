// Cómputo pivotable de Ventas General a partir de la tabla de hechos (fact table).
// fact = { dims:{sucursales,proveedores,lineas,vendedores,clientes}, rows:[[año,mes,si,pi,li,vi,ci,venta,costo,n]] }
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

  let comV = 0, comC = 0, comN = 0, restoV = 0, restoC = 0, restoN = 0
  let prevComV = 0, prevRestoV = 0
  const porMes = {}                 // { mes: {comV,restoV,comC,restoC,comN,restoN} } (respeta año)
  const porMesY = {}                // { mes: {2025:{vc,vr,cc,cr,nc,nr}, 2026:{...}} } (ambos años)
  const vendMap = new Map()         // vi -> {nombre,equipo,venta,costo,n}
  const provMap = new Map()         // pi -> {nombre,venta,costo,n}
  const cliMap = new Map()          // ci -> {nombre,num,venta}
  const porSucursal = {}            // si -> {com,resto} (IGNORA el filtro de sucursal)
  const comparar = año === '2026'

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const ry = r[0], rm = r[1], si = r[2], pi = r[3], li = r[4], vi = r[5], ci = r[6]
    const venta = r[7], costo = r[8], n = r[9]

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

  // Clientes perdidos (compraron en 2025 y no en 2026; responde a sucursal/equipo)
  let perdidos = 0, perdidosTotal = 0
  if (fact.perdidosCubo) {
    for (const k in fact.perdidosCubo) {
      const [si, eb] = k.split('|').map(Number)
      if (sucIdx >= 0 && si !== sucIdx) continue
      if (equipo === 'comercial' && eb !== 0) continue
      if (equipo === 'resto' && eb !== 1) continue
      const p = fact.perdidosCubo[k]; perdidos += p.perdidos; perdidosTotal += p.total
    }
  }

  return {
    comV, restoV, comN, restoN, total, totalN: comN + restoN, prev,
    porMes, meses, porMesY, mesesY, vendedores, proveedores, clientes, topResto, sucursalesVenta,
    ticketProm, tickets: tkCount, perdidos, perdidosTotal, perdidosPct: perdidosTotal > 0 ? perdidos / perdidosTotal * 100 : 0,
  }
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
