import React, { useState, useEffect, useMemo } from 'react'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

// Colores del sistema Intel Comercial
// Verde: #22c55e · Ámbar: #f59e0b · Rojo: #ef4444 · Azul: #1a6cf0 · Navy: #0f1f3d
const PERSPECTIVAS = [
  {
    id: 'ventas', nombre: 'Incrementar ventas',
    icon: '💰', hdrColor: '#0f1f3d', hdrBg: '#eff6ff',
    kpis: [
      { cod:'2.1a', desc:'Crecimiento de ventas en el periodo', unidad:'%', peso:10,  meta:'15.00%',     actual:'25.02%',     peor:'-6.24%',     ratio:100   },
      { cod:'2.1b', desc:'Meta alcanzada',                      unidad:'%', peso:12,  meta:'$4,890,000', actual:'$4,832,083', peor:'$3,226,745', ratio:98.82 },
      { cod:'2.1c', desc:'Ticket promedio',                     unidad:'$', peso:6,   meta:'$600',       actual:'$5,878',     peor:'$4,808',     ratio:100   },
      { cod:'2.1d', desc:'Clientes con incremento de ticket',   unidad:'#', peso:6,   meta:'95',         actual:'294',        peor:'70',         ratio:100   },
      { cod:'2.1e', desc:'Primer ticket de cliente nuevo',      unidad:'$', peso:3,   meta:'$3,000',     actual:'$5,286',     peor:'$500',       ratio:100   },
      { cod:'2.1f', desc:'Tickets únicos atendidos',            unidad:'#', peso:3,   meta:'840',        actual:'821',        peor:'707',        ratio:97.74 },
    ]
  },
  {
    id: 'productos', nombre: 'Estrategia de venta por productos',
    icon: '🏷️', hdrColor: '#1a3a6e', hdrBg: '#f0f7ff',
    kpis: [
      { cod:'3.1a', desc:'Promociones aplicadas', unidad:'#', peso:7.5, meta:null, actual:null, peor:null, ratio:null },
      { cod:'3.1b', desc:'Venta por promociones', unidad:'%', peso:7.5, meta:null, actual:null, peor:null, ratio:null },
    ]
  },
  {
    id: 'clientes', nombre: 'Incrementar clientes',
    icon: '👥', hdrColor: '#1a6cf0', hdrBg: '#eff6ff',
    kpis: [
      { cod:'4.1a', desc:'Clientes perdidos',              unidad:'#', peso:6, meta:'9',   actual:'6',      peor:'24',  ratio:100   },
      { cod:'4.1b', desc:'Visitas de atención a clientes', unidad:'#', peso:5, meta:null,  actual:'3',      peor:null,  ratio:null  },
      { cod:'4.2a', desc:'Cobertura de cartera total',     unidad:'%', peso:6, meta:'55%', actual:'50.79%', peor:'45%', ratio:92.35 },
      { cod:'4.2b', desc:'Cobertura de clientes nuevos',   unidad:'%', peso:5, meta:null,  actual:'33.53%', peor:null,  ratio:null  },
      { cod:'4.3a', desc:'Nuevos clientes',                unidad:'#', peso:5, meta:'25',  actual:'16',     peor:null,  ratio:64    },
      { cod:'4.3b', desc:'Clientes recuperados',           unidad:'#', peso:3, meta:null,  actual:'4',      peor:null,  ratio:null  },
    ]
  },
  {
    id: 'entregas', nombre: 'Calidad de entregas',
    icon: '📦', hdrColor: '#0f1f3d', hdrBg: '#f0f7ff',
    kpis: [
      { cod:'5.1b', desc:'Cantidad de incidencias', unidad:'#', peso:10, meta:null, actual:'11', peor:null, ratio:null },
    ]
  },
  {
    id: 'oportunidades', nombre: 'Nuevas oportunidades',
    icon: '🎯', hdrColor: '#1a3a6e', hdrBg: '#eff6ff',
    kpis: [
      { cod:'7.1a', desc:'Tasa de conversión', unidad:'%', peso:1.5, meta:null, actual:null, peor:null, ratio:null },
      { cod:'7.1b', desc:'Cotizaciones realizadas',     unidad:'#', peso:1.5, meta:null, actual:null, peor:null, ratio:null },
      { cod:'7.1c', desc:'Visitas realizadas',          unidad:'#', peso:1,   meta:null, actual:null, peor:null, ratio:null },
      { cod:'7.1d', desc:'Leads generados',             unidad:'#', peso:1,   meta:null, actual:null, peor:null, ratio:null },
    ]
  },
]

// ── Helpers ─────────────────────────────────────────────────────
function calKpi(kpi) {
  if (kpi.ratio === null || kpi.ratio === undefined) return 0
  return Math.min(kpi.ratio, 100) / 100 * kpi.peso
}

function perspScore(persp) {
  const sumCal  = persp.kpis.reduce((s, k) => s + calKpi(k), 0)
  const sumPeso = persp.kpis.reduce((s, k) => s + k.peso, 0)
  return sumPeso > 0 ? (sumCal / sumPeso) * 100 : 0
}

function statusOf(ratio) {
  if (ratio === null || ratio === undefined) return 'sin-dato'
  if (ratio >= 100) return 'meta'
  if (ratio >= 70)  return 'seguimiento'
  return 'alerta'
}

const STATUS_CFG = {
  'meta':        { dot:'#22c55e', bg:'#dcfce7', color:'#15803d', label:'En meta',        icon:'●' },
  'seguimiento': { dot:'#f59e0b', bg:'#fef3c7', color:'#92400e', label:'En seguimiento', icon:'◐' },
  'alerta':      { dot:'#ef4444', bg:'#fee2e2', color:'#b91c1c', label:'Alerta',         icon:'○' },
  'sin-dato':    { dot:'#94a3b8', bg:'#f1f5f9', color:'#475569', label:'Sin dato',       icon:'○' },
}

// ── Gauge SVG ───────────────────────────────────────────────────
function Gauge({ value }) {
  const pct    = Math.min(Math.max(value, 0), 100) / 100
  const R      = 40
  const cx     = 55
  const cy     = 52
  const start  = Math.PI               // 180° left
  const sweep  = Math.PI               // 180° arc
  const angle  = start + sweep * pct
  const x1     = cx + R * Math.cos(start)
  const y1     = cy + R * Math.sin(start)
  const x2     = cx + R * Math.cos(angle)
  const y2     = cy + R * Math.sin(angle)
  const largeArc = pct > 0.5 ? 1 : 0
  const color  = value >= 80 ? '#22c55e' : value >= 55 ? '#f59e0b' : '#ef4444'

  return (
    <svg viewBox="0 0 110 58" style={{ width:180, display:'block', margin:'0 auto' }}>
      {/* Track */}
      <path d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
        fill="none" stroke="#e2e8f0" strokeWidth="9" strokeLinecap="round" />
      {/* Fill */}
      {pct > 0 && (
        <path d={`M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2}`}
          fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" />
      )}
      {/* Needle dot */}
      <circle cx={x2} cy={y2} r="4" fill={color} />
      {/* Value */}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="17" fontWeight="800" fill={color}
        style={{ fontFamily:'system-ui,sans-serif' }}>
        {value.toFixed(1)}%
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize="7.5" fill="#64748b"
        style={{ fontFamily:'system-ui,sans-serif', fontWeight:600, letterSpacing:'.5px' }}>
        SCORE BSC
      </text>
    </svg>
  )
}

// ── Mini progress bar ────────────────────────────────────────────
function MiniBar({ value, max=100, color }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
      <div style={{ flex:1, height:5, background:'#e2e8f0', borderRadius:3, overflow:'hidden' }}>
        <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:3, transition:'width .5s' }} />
      </div>
      <span style={{ fontSize:11, fontWeight:700, color, fontVariantNumeric:'tabular-nums', minWidth:32 }}>
        {value.toFixed(0)}%
      </span>
    </div>
  )
}

// ── Componente principal ─────────────────────────────────────────
const fmt$ = n => n ? '$' + Math.round(n).toLocaleString('es-MX') : null

export default function BalancedScorecard({ data }) {
  const [mes, setMes] = useState(3)
  const [expandida, setExpandida] = useState(null)

  // Auto-seleccionar el mes actual; si aún no tiene datos, el último disponible
  useEffect(() => {
    const meses = data?.resumen?.meses_disponibles
    if (!meses?.length) return
    const mesActual = new Date().getMonth() + 1          // 1–12
    const target = meses.includes(mesActual) ? mesActual : meses[meses.length - 1]
    setMes(target)
  }, [data])

  // ── Calcular KPIs reales de "Incrementar ventas" desde dashboard_data ──
  const ventasLive = useMemo(() => {
    if (!data) return null
    const m26 = data.kpi_mensual_actual?.find(m => m.mes_num === mes)
    const m25 = data.kpi_mensual_anterior?.find(m => m.mes_num === mes)
    if (!m26) return null

    const ventas26   = m26.ventas || 0
    const ventas25   = m25?.ventas || 0
    const metaMes    = data.kpi_agentes?.reduce((s, a) => s + (a.meta_por_mes?.[mes] || 0), 0) || 0
    const ticketProm = m26.ticket_promedio || 0
    const tickets    = m26.tickets || 0
    const crecimiento = ventas25 > 0 ? (ventas26 - ventas25) / ventas25 * 100 : null

    const cliSobre3000 = data.clientes_sobre_3000_por_mes?.[mes] ?? null
    const ticketNuevos = data.ticket_promedio_nuevos_por_mes?.[mes] ?? null

    // Metas configurables desde el JSON (process_data.js → BSC_METAS)
    const M = data.bsc_metas_por_mes?.[mes] || {}
    const m2a = M['2.1a']?.meta ?? 15
    // 2.1c: meta dinámica = ticket promedio del mismo mes del año anterior
    const ticketProm25 = m25?.ticket_promedio || 0
    const m2c = ticketProm25 > 0 ? ticketProm25 : (M['2.1c']?.meta ?? 600)
    // peor = ticket promedio mínimo de cualquier mes del año anterior
    const ticketMin25 = data.kpi_mensual_anterior?.length
      ? Math.min(...data.kpi_mensual_anterior.map(m => m.ticket_promedio || Infinity).filter(v => isFinite(v)))
      : null
    const m2d = M['2.1d']?.meta     ?? 95
    const m2e = M['2.1e']?.meta     ?? 3000
    const m2f = M['2.1f']?.meta     ?? 840

    return {
      '2.1a': {
        actual: crecimiento !== null ? crecimiento.toFixed(2) + '%' : null,
        meta:   m2a + '%',
        ratio:  crecimiento !== null ? (crecimiento / m2a) * 100 : null,
      },
      '2.1b': {
        actual: fmt$(ventas26),
        meta:   metaMes > 0 ? fmt$(metaMes) : null,
        ratio:  metaMes > 0 ? (ventas26 / metaMes) * 100 : null,
      },
      '2.1c': {
        actual: fmt$(ticketProm),
        meta:   fmt$(m2c),
        peor:   ticketMin25 ? fmt$(ticketMin25) : null,
        ratio:  ticketProm > 0 ? (ticketProm / m2c) * 100 : null,
      },
      '2.1d': {
        actual: cliSobre3000 !== null ? String(cliSobre3000) : null,
        meta:   String(m2d),
        ratio:  cliSobre3000 !== null ? (cliSobre3000 / m2d) * 100 : null,
      },
      '2.1e': {
        actual: ticketNuevos !== null ? fmt$(ticketNuevos) : null,
        meta:   fmt$(m2e),
        ratio:  ticketNuevos !== null ? (ticketNuevos / m2e) * 100 : null,
      },
      '2.1f': {
        actual: tickets > 0 ? String(tickets) : null,
        meta:   String(m2f),
        ratio:  tickets > 0 ? (tickets / m2f) * 100 : null,
      },
    }
  }, [data, mes])

  // ── KPIs reales: Estrategia de venta por productos ──────────────
  const productosLive = useMemo(() => {
    if (!data) return null
    const fila = data.estrat_ventas_productos?.[mes]
    if (!fila) return null
    const M    = data.bsc_metas_por_mes?.[mes] || {}
    const m3a  = M['3.1a']?.meta ?? 10
    const m3b  = M['3.1b']?.meta ?? 20

    // % venta con promo: usamos ventas reales del mes para el denominador
    const ventasMes = data.kpi_mensual_actual?.find(m => m.mes_num === mes)?.ventas || 0
    const pctPromo  = ventasMes > 0 ? (fila.venta_con_promo / ventasMes) * 100 : null

    return {
      '3.1a': {
        actual: fila.promos_aplicadas > 0 ? String(fila.promos_aplicadas) : null,
        meta:   String(m3a),
        peor:   M['3.1a']?.peor ? String(M['3.1a'].peor) : null,
        ratio:  fila.promos_aplicadas > 0 ? (fila.promos_aplicadas / m3a) * 100 : null,
      },
      '3.1b': {
        actual: pctPromo !== null ? pctPromo.toFixed(1) + '%' : null,
        meta:   m3b + '%',
        peor:   M['3.1b']?.peor ? M['3.1b'].peor + '%' : null,
        ratio:  pctPromo !== null ? (pctPromo / m3b) * 100 : null,
      },
    }
  }, [data, mes])

  // ── KPIs reales: Incrementar clientes ─────────────────────────
  const clientesLive = useMemo(() => {
    if (!data) return null
    const añoActual = data.resumen?.año_actual
    const kMes     = data.kpi_mensual_actual?.find(m => m.mes_num === mes)
    const cartera  = data.resumen?.cartera_total || 0
    const M        = data.bsc_metas_por_mes?.[mes] || {}

    // Datos del mes seleccionado (BSC es snapshot mensual, no acumulado)
    const nrMes   = data.clientes_nr_por_mes?.find(m => m.mes_num === mes)
    const nuevos  = nrMes?.[`nuevos_${añoActual}`] ?? null
    const recup   = nrMes?.[`recup_${añoActual}`]  ?? null

    // Cobertura mensual: misma lógica que Dashboard Táctico
    // Suma de clientes_ids_por_mes[mes].size por agente (igual que totalAtendidos en App.jsx)
    const totalAtendidosMes = data.kpi_agentes?.reduce((s, a) => {
      return s + (a.clientes_ids_por_mes?.[mes]?.length || 0)
    }, 0) ?? null
    const cobertura = cartera > 0 && totalAtendidosMes !== null ? (totalAtendidosMes / cartera) * 100 : null

    // Misma lógica que Dashboard Táctico: clientes cuya última compra fue en mes M-4
    // relMesKPI convierte fecha a mes relativo (2026→1-12, 2025→-11 a 0)
    const relMesKPI = (fecha) => { const d = new Date(fecha); return (d.getFullYear() - añoActual) * 12 + (d.getMonth() + 1) }
    const _esPerdido = c => c.status === 'Perdido' || !c.ultima_compra || c.dias_sin_compra >= 120
    const targetRm   = mes - 4
    const perdidos   = data.tabla_clientes?.filter(c => _esPerdido(c) && c.ultima_compra && relMesKPI(c.ultima_compra) === targetRm).length ?? null

    // 4.1b: visitas de atención al cliente ese mes
    const visitas = data.visitas_atencion_por_mes?.[mes] ?? null

    // 4.2b: cobertura de nuevos acumulados que compraron en el mes
    const cobNuevos = data.cobertura_nuevos_por_mes?.[mes]

    const m4_1a = M['4.1a']?.meta ?? 9
    const m4_1b = M['4.1b']?.meta ?? null
    const m4_2a = M['4.2a']?.meta ?? 55
    const m4_2b = M['4.2b']?.meta ?? 50
    const m4_3a = M['4.3a']?.meta ?? 25
    const m4_3b = M['4.3b']?.meta ?? null

    return {
      '4.1a': {
        actual: perdidos !== null ? String(perdidos) : null,
        meta:   String(m4_1a),
        ratio:  perdidos !== null ? (perdidos <= m4_1a ? 100 : (m4_1a / perdidos) * 100) : null,
      },
      '4.1b': {
        actual: visitas !== null ? String(visitas) : null,
        meta:   m4_1b ? String(m4_1b) : null,
        peor:   M['4.1b']?.peor ? String(M['4.1b'].peor) : null,
        ratio:  visitas !== null && m4_1b ? (visitas / m4_1b) * 100 : null,
      },
      '4.2a': {
        actual: cobertura !== null ? cobertura.toFixed(1) + '%' : null,
        meta:   m4_2a + '%',
        ratio:  cobertura !== null ? (cobertura / m4_2a) * 100 : null,
      },
      '4.2b': {
        actual: cobNuevos ? cobNuevos.pct.toFixed(1) + '%' : null,
        meta:   m4_2b + '%',
        peor:   M['4.2b']?.peor ? M['4.2b'].peor + '%' : null,
        ratio:  cobNuevos ? (cobNuevos.pct / m4_2b) * 100 : null,
      },
      '4.3a': {
        actual: nuevos !== null ? String(nuevos) : null,
        meta:   String(m4_3a),
        peor:   M['4.3a']?.peor ? String(M['4.3a'].peor) : null,
        ratio:  nuevos !== null ? (nuevos / m4_3a) * 100 : null,
      },
      '4.3b': {
        actual: recup !== null ? String(recup) : null,
        meta:   m4_3b ? String(m4_3b) : null,
        peor:   M['4.3b']?.peor ? String(M['4.3b'].peor) : null,
        ratio:  recup !== null && m4_3b ? (recup / m4_3b) * 100 : null,
      },
    }
  }, [data, mes])

  // ── KPIs reales: Calidad de entregas ──────────────────────────
  const entregasLive = useMemo(() => {
    if (!data) return null
    const incidencias = data.incidencias_por_mes?.[mes] ?? null
    const M = data.bsc_metas_por_mes?.[mes] || {}
    const m5_1b = M['5.1b']?.meta ?? null
    return {
      '5.1b': {
        actual: incidencias !== null ? String(incidencias) : null,
        meta:   m5_1b ? String(m5_1b) : null,
        peor:   M['5.1b']?.peor ? String(M['5.1b'].peor) : null,
        ratio:  incidencias !== null && m5_1b
          ? (incidencias <= m5_1b ? 100 : (m5_1b / incidencias) * 100)
          : null,
      },
    }
  }, [data, mes])

  // ── KPIs reales: Nuevas oportunidades off-line ─────────────────
  const oportunidadesLive = useMemo(() => {
    if (!data) return null
    const fila = data.oportunidades_offline_por_mes?.[mes]
    if (!fila) return null
    const M = data.bsc_metas_por_mes?.[mes] || {}
    const m7a = M['7.1a']?.meta ?? null
    const m7b = M['7.1b']?.meta     ?? null
    const m7c = M['7.1c']?.meta     ?? null
    const m7d = M['7.1d']?.meta     ?? null
    return {
      '7.1a': {
        actual: fila.tasa_conversion !== null ? fila.tasa_conversion.toFixed(1) + '%' : null,
        meta:   m7a ? m7a + '%' : null,
        peor:   M['7.1a']?.peor ? M['7.1a'].peor + '%' : null,
        ratio:  m7a && fila.tasa_conversion !== null ? (fila.tasa_conversion / m7a) * 100 : null,
      },
      '7.1b': {
        actual: fila.cotizaciones > 0 ? String(fila.cotizaciones) : null,
        meta:   m7b ? String(m7b) : null,
        peor:   M['7.1b']?.peor ? String(M['7.1b'].peor) : null,
        ratio:  m7b && fila.cotizaciones > 0 ? (fila.cotizaciones / m7b) * 100 : null,
      },
      '7.1c': {
        actual: fila.visitas > 0 ? String(fila.visitas) : null,
        meta:   m7c ? String(m7c) : null,
        peor:   M['7.1c']?.peor ? String(M['7.1c'].peor) : null,
        ratio:  m7c && fila.visitas > 0 ? (fila.visitas / m7c) * 100 : null,
      },
      '7.1d': {
        actual: fila.leads > 0 ? String(fila.leads) : null,
        meta:   m7d ? String(m7d) : null,
        peor:   M['7.1d']?.peor ? String(M['7.1d'].peor) : null,
        ratio:  m7d && fila.leads > 0 ? (fila.leads / m7d) * 100 : null,
      },
    }
  }, [data, mes])

  // ── Fusionar estructura estática con datos reales ───────────────
  const perspectivas = useMemo(() => {
    const liveMap = { ventas: ventasLive, productos: productosLive, clientes: clientesLive, entregas: entregasLive, oportunidades: oportunidadesLive }
    return PERSPECTIVAS.map(p => {
      const live = liveMap[p.id]
      if (!live) return p
      return {
        ...p,
        kpis: p.kpis.map(k => {
          const live = liveMap[p.id]?.[k.cod]
          if (!live) return k
          // Si hay fuente live para este KPI, sus valores mandan (null = sin dato)
          return {
            ...k,
            actual: live.actual,
            ratio:  live.ratio,
            ...(live.meta  ? { meta:  live.meta  } : {}),
            ...(live.peor  ? { peor:  live.peor  } : {}),
          }
        }),
      }
    })
  }, [ventasLive, productosLive, clientesLive, entregasLive, oportunidadesLive])

  const allKpis    = useMemo(() => perspectivas.flatMap(p => p.kpis), [perspectivas])
  const totalPeso  = allKpis.reduce((s, k) => s + k.peso, 0)
  const totalCal   = allKpis.reduce((s, k) => s + calKpi(k), 0)
  const totalScore = totalPeso > 0 ? (totalCal / totalPeso) * 100 : 0

  const enMeta   = allKpis.filter(k => k.ratio !== null && k.ratio >= 100).length
  const enSeguim = allKpis.filter(k => k.ratio !== null && k.ratio >= 70 && k.ratio < 100).length
  const enAlerta = allKpis.filter(k => k.ratio === null || k.ratio < 70).length
  const scoreColor = totalScore >= 80 ? '#22c55e' : totalScore >= 55 ? '#f59e0b' : '#ef4444'

  // KPIs críticos para panel de atención
  const criticos = perspectivas.flatMap(p =>
    p.kpis.filter(k => statusOf(k.ratio) === 'alerta' || statusOf(k.ratio) === 'sin-dato')
      .map(k => ({ ...k, perspNombre: p.nombre, perspColor: p.hdrColor }))
  ).slice(0, 5)

  return (
    <div style={{ padding:'14px 24px 32px', maxWidth:1440, margin:'0 auto', fontFamily:'system-ui,sans-serif' }}>

      {/* ── Encabezado ───────────────────────────────────────── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12, gap:12, flexWrap:'wrap' }}>
        <div>
          <h2 style={{ margin:0, fontSize:18, fontWeight:800, color:'#0f1f3d', letterSpacing:'-.3px' }}>⚖️ Balanced Scorecard</h2>
          <p style={{ margin:'2px 0 0', color:'#64748b', fontSize:11.5 }}>
            Desempeño comercial · <strong style={{color:'#0f1f3d'}}>Ventas</strong> conectada a Google Sheets — resto en proceso
          </p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <label style={{ fontSize:12, color:'#64748b', fontWeight:600 }}>Mes</label>
          <select value={mes} onChange={e => setMes(Number(e.target.value))}
            style={{ padding:'5px 12px', borderRadius:8, border:'1.5px solid #e2e8f0', fontSize:13, color:'#1e293b', background:'#fff', cursor:'pointer', fontWeight:600 }}>
            {MESES.map((m, i) => {
              const tieneData = data?.kpi_mensual_actual?.some(k => k.mes_num === i + 1)
              return <option key={i} value={i+1}>{m}{tieneData ? '' : ' (sin datos)'}</option>
            })}
          </select>
        </div>
      </div>

      {/* ── Fila única: Score + Heat blocks ── */}
      <div style={{ display:'flex', gap:8, marginBottom:10, alignItems:'stretch' }}>

        {/* Score compacto */}
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:10, padding:'10px 16px',
          minWidth:118, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <div style={{ fontSize:26, fontWeight:900, color:scoreColor, lineHeight:1, fontVariantNumeric:'tabular-nums' }}>
            {totalScore.toFixed(1)}%
          </div>
          <div style={{ fontSize:9.5, color:'#94a3b8', fontWeight:700, letterSpacing:'.6px', marginTop:3, marginBottom:8 }}>
            SCORE BSC
          </div>
          <div style={{ display:'flex', gap:12 }}>
            {[
              { val:enMeta,   color:'#22c55e', label:'Meta'   },
              { val:enSeguim, color:'#f59e0b', label:'Seg.'   },
              { val:enAlerta, color:'#ef4444', label:'⚠'      },
            ].map(s => (
              <div key={s.label} style={{ textAlign:'center' }}>
                <div style={{ fontSize:15, fontWeight:800, color:s.color, lineHeight:1 }}>{s.val}</div>
                <div style={{ fontSize:9, color:'#94a3b8', fontWeight:600, letterSpacing:'.3px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 5 Heat blocks en línea */}
        {perspectivas.map(p => {
          const pCal   = p.kpis.reduce((s, k) => s + calKpi(k), 0)
          const pPeso  = p.kpis.reduce((s, k) => s + k.peso, 0)
          const pScore = perspScore(p)
          const color  = pScore >= 80 ? '#15803d' : pScore >= 55 ? '#92400e' : '#b91c1c'
          const bg     = pScore >= 80 ? '#f0fdf4' : pScore >= 55 ? '#fffbeb' : '#fef2f2'
          const border = pScore >= 80 ? '#bbf7d0' : pScore >= 55 ? '#fde68a' : '#fecaca'
          return (
            <div key={p.id} style={{ flex:1, background:bg, border:`1px solid ${border}`, borderRadius:10, padding:'10px 12px',
              display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
              <div style={{ fontSize:10.5, color, fontWeight:700, lineHeight:1.25, marginBottom:4 }}>
                {p.icon} {p.nombre}
              </div>
              <div style={{ fontSize:21, fontWeight:900, color, lineHeight:1, fontVariantNumeric:'tabular-nums' }}>
                {pCal.toFixed(1)}%
              </div>
              <div style={{ fontSize:9.5, color, opacity:.6, marginTop:2 }}>
                {pPeso.toFixed(0)}% del BSC
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:3, marginTop:8 }}>
                {p.kpis.map(k => {
                  const st = statusOf(k.ratio)
                  const dc = st === 'meta' ? '#22c55e' : st === 'seguimiento' ? '#f59e0b' : '#94a3b8'
                  return <div key={k.cod} title={`${k.cod} ${k.desc}`}
                    style={{ width:8, height:8, borderRadius:2, background:dc, flexShrink:0 }} />
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Tabla + Panel alertas lado a lado ── */}
      <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>

        {/* ── Tabla detallada ──────────────────────────────────── */}
        <div style={{ flex:1, minWidth:0, background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,.07)' }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, tableLayout:'fixed' }}>
            <colgroup>
              <col style={{ width:170 }} />
              <col style={{ width:230 }} />
              <col style={{ width:100 }} />
              <col style={{ width:115 }} />
              <col style={{ width:125 }} />
              <col style={{ width:95  }} />
              <col style={{ width:115 }} />
            </colgroup>
            <thead>
              <tr style={{ background:'#0f1f3d' }}>
                {[
                  ['Perspectiva',       'left'  ],
                  ['KPI',               'left'  ],
                  ['Meta',              'center'],
                  ['Peor de los casos', 'center'],
                  ['Desempeño actual',  'center'],
                  ['vs Meta',           'center'],
                  ['Calificación',      'center'],
                ].map(([label, align], i) => (
                  <th key={label} style={{ padding: i < 2 ? '10px 14px' : '10px 8px', textAlign:align,
                    color:'rgba(255,255,255,.85)', fontWeight:700, letterSpacing:'.3px',
                    whiteSpace:'nowrap', fontSize:11 }}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {perspectivas.map(persp => {
                const pScore   = perspScore(persp)
                const pCal     = persp.kpis.reduce((s, k) => s + calKpi(k), 0)
                const pPeso    = persp.kpis.reduce((s, k) => s + k.peso, 0)
                const pColor   = pScore >= 80 ? '#22c55e' : pScore >= 55 ? '#f59e0b' : '#ef4444'

                return (
                  <React.Fragment key={persp.id}>
                    {persp.kpis.map((kpi, ki) => {
                      const st      = statusOf(kpi.ratio)
                      const cfg     = STATUS_CFG[st]
                      const kpiCal  = calKpi(kpi)
                      const isFirst = ki === 0
                      const isLast  = ki === persp.kpis.length - 1

                      return (
                        <tr key={kpi.cod}
                          style={{ borderBottom:`1px solid ${isLast ? '#cbd5e1' : '#f1f5f9'}`,
                            background: ki % 2 === 0 ? '#fafafa' : '#fff',
                            transition:'background .1s' }}
                          onMouseEnter={e => e.currentTarget.style.background='#f0f7ff'}
                          onMouseLeave={e => e.currentTarget.style.background = ki % 2 === 0 ? '#fafafa' : '#fff'}>

                          {/* Perspectiva (rowspan) */}
                          {isFirst && (
                            <td rowSpan={persp.kpis.length}
                              style={{ padding:'0 10px', verticalAlign:'middle', textAlign:'center', width:180,
                                background:persp.hdrBg, borderLeft:`4px solid ${persp.hdrColor}` }}>
                              <div style={{ fontSize:13, fontWeight:700, color:persp.hdrColor, lineHeight:1.3 }}>
                                {persp.icon} {persp.nombre}
                              </div>
                            </td>
                          )}

                          {/* Descripción */}
                          <td style={{ padding:'7px 14px', color:'#1e293b', fontSize:12, minWidth:200 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                              <span style={{ width:7, height:7, borderRadius:'50%', background:cfg.dot, flexShrink:0 }} />
                              {kpi.desc}
                              <span style={{ fontSize:10, color:'#94a3b8', flexShrink:0 }}>({kpi.unidad})</span>
                            </div>
                          </td>

                          {/* Meta */}
                          <td style={{ padding:'7px 10px', textAlign:'center', color:'#15803d', fontVariantNumeric:'tabular-nums', fontSize:12, fontWeight:600, width:100 }}>
                            {kpi.meta ?? <span style={{ color:'#cbd5e1', fontWeight:400 }}>—</span>}
                          </td>

                          {/* Peor de los casos */}
                          <td style={{ padding:'7px 10px', textAlign:'center', color:'#b91c1c', fontVariantNumeric:'tabular-nums', fontSize:12, width:110 }}>
                            {kpi.peor ?? <span style={{ color:'#cbd5e1' }}>—</span>}
                          </td>

                          {/* Actual */}
                          <td style={{ padding:'7px 10px', textAlign:'center', fontWeight:700, fontVariantNumeric:'tabular-nums', fontSize:12.5, width:110,
                            color: kpi.actual ? '#0f172a' : '#cbd5e1' }}>
                            {kpi.actual ?? '—'}
                          </td>

                          {/* vs Meta (badge color) */}
                          <td style={{ padding:'7px 10px', textAlign:'center', width:90 }}>
                            <span style={{ display:'inline-block', padding:'3px 9px', borderRadius:6,
                              background:cfg.bg, color:cfg.color, fontWeight:700, fontSize:11.5,
                              fontVariantNumeric:'tabular-nums', minWidth:60, textAlign:'center' }}>
                              {kpi.ratio !== null ? kpi.ratio.toFixed(2) + '%' : '0.00%'}
                            </span>
                          </td>

                          {/* Calificación con mini-barra */}
                          <td style={{ padding:'7px 14px', width:110 }}>
                            <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                              <span style={{ fontSize:12.5, fontWeight:700, color: kpiCal > 0 ? cfg.color : '#cbd5e1', fontVariantNumeric:'tabular-nums' }}>
                                {kpiCal.toFixed(1)}%
                              </span>
                              <div style={{ height:3, background:'#f1f5f9', borderRadius:2 }}>
                                <div style={{ height:'100%', width:`${kpi.peso > 0 ? Math.min((kpiCal/kpi.peso)*100, 100) : 0}%`,
                                  background:cfg.dot, borderRadius:2, transition:'width .5s' }} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      )
                    })}

                  </React.Fragment>
                )
              })}

              {/* Total final */}
              <tr style={{ background:'#0f1f3d' }}>
                <td colSpan={5} style={{ padding:'13px 18px', textAlign:'right', color:'rgba(255,255,255,.6)', fontWeight:600, fontSize:12, letterSpacing:'.5px' }}>
                  SCORE TOTAL BALANCED SCORECARD · {MESES[mes - 1].toUpperCase()} {data?.resumen?.año_actual || ''}
                </td>
                <td style={{ padding:'13px 10px', textAlign:'center' }}>
                  <span style={{ color:'#fff', fontWeight:700, fontSize:13,
                    background:'rgba(255,255,255,.12)', padding:'4px 12px', borderRadius:6 }}>
                    {((totalCal / totalPeso) * 100).toFixed(1)}%
                  </span>
                </td>
                <td style={{ padding:'13px 14px' }}>
                  <span style={{ fontSize:20, fontWeight:900,
                    color: totalScore >= 80 ? '#4ade80' : totalScore >= 55 ? '#fbbf24' : '#f87171',
                    fontVariantNumeric:'tabular-nums' }}>
                    {totalCal.toFixed(1)}%
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        </div>

        {/* ── Panel alertas lateral ── */}
        {criticos.length > 0 && (
          <div style={{ width:210, flexShrink:0, background:'#fff', border:'1px solid #fca5a5',
            borderLeft:'4px solid #ef4444', borderRadius:14, overflow:'hidden',
            boxShadow:'0 1px 4px rgba(0,0,0,.07)' }}>
            <div style={{ background:'#fff5f5', padding:'10px 14px', borderBottom:'1px solid #fecaca',
              display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ fontSize:13 }}>⚠️</span>
              <span style={{ fontSize:12, fontWeight:800, color:'#b91c1c', letterSpacing:'.1px' }}>Requieren atención</span>
              <span style={{ marginLeft:'auto', background:'#fca5a5', color:'#7f1d1d', fontSize:11,
                fontWeight:800, padding:'1px 7px', borderRadius:10 }}>{criticos.length}</span>
            </div>
            <div style={{ padding:'6px 0' }}>
              {criticos.map(k => (
                <div key={k.cod} style={{ padding:'8px 14px', borderBottom:'1px solid #fff1f1' }}>
                  <div style={{ fontSize:11.5, fontWeight:700, color:'#1e293b', marginBottom:3, lineHeight:1.3 }}>
                    {k.desc}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontSize:10, color:'#fff', background:k.perspColor,
                      padding:'1px 6px', borderRadius:4, fontWeight:700 }}>{k.cod}</span>
                    <span style={{ fontSize:10.5, color:'#94a3b8' }}>{k.perspNombre}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      <p style={{ marginTop:10, fontSize:11, color:'#94a3b8', textAlign:'right' }}>
        * Todos los KPIs conectados a Google Sheets. Metas provisionales (es_prueba): 4.1b, 4.3b, 5.1b y "Nuevas oportunidades" (7.1a–7.1d).
      </p>
    </div>
  )
}
