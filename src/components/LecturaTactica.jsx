import React from 'react'
import { fmt } from '../utils/format.js'

const MESES_NOM = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function generarHallazgos(r, filtros, kpiAgentes) {
  const hallazgos = []
  const esPorAgente = filtros?.agente !== 'todos'
  const nombreCorto = esPorAgente ? filtros.agente.split(' ')[0] : null
  const periodo     = r.filtro_label || 'el periodo'
  const es2025      = filtros?.año === '2025'

  // 1. Cumplimiento vs meta
  if (r.cumplimiento_pct != null) {
    const cumple = r.cumplimiento_pct >= 100
    const txt = esPorAgente
      ? `${nombreCorto} lleva ${fmt.pct(r.cumplimiento_pct)} de su meta en ${periodo}.`
      : `Venta acumulada al ${fmt.pct(r.cumplimiento_pct)} de la meta en ${periodo}.`
    const sufijo = cumple
      ? ` Superó el objetivo por ${fmt.moneda(Math.abs(r.diferencia_meta || 0))}.`
      : ` Déficit de ${fmt.moneda(Math.abs(r.diferencia_meta || 0))}.`
    hallazgos.push(txt + sufijo)
  } else {
    hallazgos.push(`Venta total en ${periodo}: ${fmt.moneda(r.total_venta_2026)}.`)
  }

  // 2. Comparativo vs 2025 (solo cuando no se está viendo 2025)
  if (r.variacion_interanual != null && !es2025) {
    const vari = r.variacion_interanual
    const dif  = r.diferencia_vs_2025 || 0
    hallazgos.push(
      `Vs mismo periodo 2025: ${vari >= 0 ? '+' : ''}${vari.toFixed(1)}% (${vari >= 0 ? '+' : ''}${fmt.moneda(dif)}).`
    )
  }

  // 3. Cobertura de cartera
  if (r.cobertura_cartera_pct != null) {
    const pendientes = r.clientes_pendientes > 0
      ? ` Quedan ${r.clientes_pendientes} clientes sin atender.`
      : ' Toda la cartera fue atendida.'
    hallazgos.push(`Cobertura de cartera: ${fmt.pct(r.cobertura_cartera_pct)}.` + pendientes)
  }

  // 4. Nuevos, recuperados y perdidos
  const nuevos  = (!es2025 ? (r.clientes_nuevos_2026 ?? r.clientes_nuevos) : r.clientes_nuevos_2025) || 0
  const recup   = (!es2025 ? (r.clientes_recuperados_2026 ?? r.clientes_recuperados) : r.clientes_recuperados_2025) || 0
  const perdidos = r.clientes_perdidos || 0
  if (nuevos > 0 || recup > 0) {
    hallazgos.push(
      `Se captaron ${nuevos} cliente${nuevos !== 1 ? 's' : ''} nuevo${nuevos !== 1 ? 's' : ''} y se recuperaron ${recup}.` +
      (perdidos > 0 ? ` En riesgo (sin compra reciente): ${perdidos}.` : '')
    )
  } else if (perdidos > 0) {
    hallazgos.push(`Sin clientes nuevos en el periodo. Clientes en riesgo: ${perdidos}.`)
  }

  // 5. Ticket promedio con variación interanual
  if (r.ticket_promedio > 0) {
    const varTkt = r.ticket_promedio_2025 > 0 && !es2025
      ? (r.ticket_promedio - r.ticket_promedio_2025) / r.ticket_promedio_2025 * 100
      : null
    const varTxt = varTkt != null
      ? ` Var. vs 2025: ${varTkt >= 0 ? '+' : ''}${varTkt.toFixed(1)}%.`
      : ''
    hallazgos.push(
      `Ticket promedio ${fmt.moneda(r.ticket_promedio)} con ${(r.total_tickets || 0).toLocaleString('es-MX')} tickets únicos.` + varTxt
    )
  }

  // 6. Margen con variación interanual
  if (r.margen_pct != null && r.margen_monetario > 0) {
    const varMrg = r.margen_pct_2025 > 0 && !es2025
      ? r.margen_pct - r.margen_pct_2025
      : null
    const varTxt = varMrg != null
      ? ` ${varMrg >= 0 ? '▲' : '▼'} ${Math.abs(varMrg).toFixed(1)} pp vs 2025.`
      : ''
    hallazgos.push(
      `Margen bruto del periodo: ${fmt.pct(r.margen_pct)} (${fmt.moneda(r.margen_monetario)}).` + varTxt
    )
  }

  // 7. Dispersión entre agentes (solo vista global)
  if (!esPorAgente && kpiAgentes?.length > 1) {
    const conMeta = kpiAgentes.filter(a => a.meta > 0 && a.cumplimiento_pct != null)
    if (conMeta.length > 1) {
      const mejor = conMeta.reduce((a, b) => a.cumplimiento_pct > b.cumplimiento_pct ? a : b)
      const peor  = conMeta.reduce((a, b) => a.cumplimiento_pct < b.cumplimiento_pct ? a : b)
      hallazgos.push(
        `Mejor cumplimiento: ${mejor.agente.split(' ')[0]} (${fmt.pct(mejor.cumplimiento_pct)}). ` +
        `Menor: ${peor.agente.split(' ')[0]} (${fmt.pct(peor.cumplimiento_pct)}).`
      )
    }
  }

  return hallazgos
}

export default function LecturaTactica({ resumen: r, filtros, kpiAgentes }) {
  const hallazgos = generarHallazgos(r, filtros, kpiAgentes)

  const contextoPartes = [
    filtros?.agente !== 'todos' ? `Agente: ${filtros.agente.split(' ')[0]}` : 'Todos los agentes',
    filtros?.meses?.length > 0
      ? filtros.meses.map(m => MESES_NOM[m - 1]).join('-')
      : 'Todos los meses',
    filtros?.año !== 'todos' ? filtros.año : '2025/2026',
  ]

  return (
    <div style={{
      background:'linear-gradient(135deg, #0f1f3d 0%, #1a3a6e 100%)',
      borderRadius:10, padding:'16px 20px', color:'#fff',
      boxShadow:'0 1px 4px rgba(0,0,0,.1)'
    }}>
      <div style={{ fontSize:12, fontWeight:700, color:'#4da3ff', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:8 }}>
        📝 Lectura Táctica del Periodo
      </div>

      {/* Contexto de filtros activos */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
        {contextoPartes.map((p, i) => (
          <span key={i} style={{
            fontSize:10, fontWeight:600,
            background:'rgba(77,163,255,.15)', border:'1px solid rgba(77,163,255,.3)',
            color:'#7dd3fc', padding:'2px 8px', borderRadius:10
          }}>
            {p}
          </span>
        ))}
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
        {hallazgos.map((h, i) => (
          <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,.08)' }}>
            <span style={{ color:'#fcd34d', fontWeight:800, fontSize:13, width:22, flexShrink:0, lineHeight:1.4 }}>{i + 1}</span>
            <div style={{ fontSize:12.5, color:'rgba(255,255,255,.9)', lineHeight:1.5 }}>{h}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop:14, paddingTop:12, borderTop:'1px solid rgba(255,255,255,.1)', display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <Stat label="Venta Total"  value={fmt.moneda(r.total_venta_2026)} />
        <Stat label="Cumplimiento" value={r.cumplimiento_pct != null ? fmt.pct(r.cumplimiento_pct) : '—'} />
        <Stat label="Margen"       value={r.margen_pct != null ? fmt.pct(r.margen_pct) : '—'} />
        <Stat label="Ticket Prom." value={r.ticket_promedio > 0 ? fmt.moneda(r.ticket_promedio) : '—'} />
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div style={{ background:'rgba(255,255,255,.07)', borderRadius:7, padding:'8px 12px' }}>
      <div style={{ fontSize:10, color:'rgba(255,255,255,.5)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.4px', marginBottom:3 }}>{label}</div>
      <div style={{ fontSize:16, fontWeight:800, color:'#fff' }}>{value}</div>
    </div>
  )
}
