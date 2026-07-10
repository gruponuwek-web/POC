import React from 'react'
import { fmt } from '../utils/format.js'

function generarHallazgos(r, filtros) {
  const hallazgos = []
  const agente = filtros?.agente !== 'todos' ? filtros.agente.split(' ')[0] : null
  const periodo = r.filtro_label || 'el periodo'

  // 1. Cumplimiento vs meta
  if (r.cumplimiento_pct != null) {
    const cumple = r.cumplimiento_pct >= 100
    const txt = agente
      ? `${agente} lleva ${fmt.pct(r.cumplimiento_pct)} de su meta en ${periodo}.`
      : `La venta acumulada alcanza el ${fmt.pct(r.cumplimiento_pct)} de la meta en ${periodo}.`
    const sufijo = cumple
      ? ` Superó el objetivo por ${fmt.moneda(Math.abs(r.diferencia_meta))}.`
      : ` Déficit de ${fmt.moneda(Math.abs(r.diferencia_meta || 0))}.`
    hallazgos.push(txt + sufijo)
  } else {
    hallazgos.push(`Venta total en ${periodo}: ${fmt.moneda(r.total_venta_2026)}.`)
  }

  // 2. Cobertura de cartera
  if (r.cobertura_cartera_pct != null) {
    const txt = `La cobertura de cartera asignada es del ${fmt.pct(r.cobertura_cartera_pct)}.`
    const pendientes = r.clientes_pendientes > 0
      ? ` Quedan ${r.clientes_pendientes} clientes sin atender.`
      : ` Toda la cartera fue atendida.`
    hallazgos.push(txt + pendientes)
  }

  // 3. Nuevos, recuperados y perdidos
  const nuevos = r.clientes_nuevos || 0
  const recup  = r.clientes_recuperados || 0
  const perdidos = r.clientes_perdidos || 0
  if (nuevos > 0 || recup > 0) {
    hallazgos.push(
      `Se incorporaron ${nuevos} clientes nuevos y se recuperaron ${recup}.` +
      (perdidos > 0 ? ` En riesgo (perdidos): ${perdidos}.` : '')
    )
  } else if (perdidos > 0) {
    hallazgos.push(`Sin clientes nuevos en el periodo. Clientes perdidos: ${perdidos}.`)
  }

  // 4. Ticket promedio y variación
  if (r.ticket_promedio > 0) {
    const varTxt = r.variacion_interanual != null
      ? ` Variación vs mismo periodo 2025: ${r.variacion_interanual >= 0 ? '+' : ''}${r.variacion_interanual.toFixed(1)}%.`
      : ''
    hallazgos.push(
      `Ticket promedio ${fmt.moneda(r.ticket_promedio)} con ${(r.total_tickets || 0).toLocaleString('es-MX')} tickets únicos.` + varTxt
    )
  }

  // 5. Margen (solo si hay datos)
  if (r.margen_pct != null && r.margen_monetario > 0) {
    hallazgos.push(
      `Margen bruto del periodo: ${fmt.pct(r.margen_pct)} (${fmt.moneda(r.margen_monetario)}).`
    )
  }

  return hallazgos
}

export default function LecturaTactica({ resumen: r, filtros }) {
  const hallazgos = generarHallazgos(r, filtros)

  return (
    <div style={{
      background:'linear-gradient(135deg, #0f1f3d 0%, #1a3a6e 100%)',
      borderRadius:10, padding:'16px 20px', color:'#fff',
      boxShadow:'0 1px 4px rgba(0,0,0,.1)'
    }}>
      <div style={{ fontSize:12, fontWeight:700, color:'#4da3ff', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:12 }}>
        📝 Lectura Táctica del Periodo
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
        {hallazgos.map((h, i) => (
          <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,.08)' }}>
            <span style={{ color:'#fcd34d', fontWeight:800, fontSize:14, width:22, flexShrink:0, lineHeight:1.4 }}>{i + 1}</span>
            <div style={{ fontSize:12.5, color:'rgba(255,255,255,.9)', lineHeight:1.5 }}>{h}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop:14, paddingTop:12, borderTop:'1px solid rgba(255,255,255,.1)', display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <Stat label="Venta Total"   value={fmt.moneda(r.total_venta_2026)} />
        <Stat label="Cumplimiento"  value={fmt.pct(r.cumplimiento_pct)} />
        <Stat label="Margen"        value={fmt.pct(r.margen_pct)} />
        <Stat label="Ticket Prom."  value={fmt.moneda(r.ticket_promedio)} />
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
