import React, { useMemo } from 'react'
import { fmt } from '../utils/format.js'

const MESES_NOM = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

const SEV = {
  danger:  { border:'#ef4444', bg:'#fff5f5', icon:'🔴', color:'#b91c1c' },
  warning: { border:'#f59e0b', bg:'#fffbeb', icon:'⚠️', color:'#a16207' },
  info:    { border:'#3b82f6', bg:'#eff6ff', icon:'💡', color:'#1d4ed8' },
  success: { border:'#22c55e', bg:'#f0fdf4', icon:'✅', color:'#15803d' },
}

function buildInsights(resumen, kpiAgentes, filtros) {
  const items = []
  const esPorAgente = filtros.agente !== 'todos'
  const es2025      = filtros.año === '2025'
  const esPorMes    = filtros.meses.length > 0
  const mesesStr    = esPorMes ? filtros.meses.map(m => MESES_NOM[m - 1]).join(', ') : null
  const nombre      = esPorAgente ? filtros.agente.split(' ')[0] : null

  const periodoLabel = esPorMes
    ? (filtros.meses.length === 1 ? MESES_NOM[filtros.meses[0] - 1] : mesesStr)
    : resumen.meses_nombres?.map(n => n.slice(0, 3)).join('–') || 'el periodo'

  // ── 1. Cumplimiento de venta ─────────────────────────────────────────────
  if (resumen.cumplimiento_pct != null) {
    const cumple = resumen.cumplimiento_pct >= 100
    const dif    = resumen.diferencia_meta || 0
    items.push({
      sev: cumple ? 'success' : resumen.cumplimiento_pct < 80 ? 'danger' : 'warning',
      cat: 'Cumplimiento de Venta',
      titulo: esPorAgente
        ? `${nombre} al ${fmt.pct(resumen.cumplimiento_pct)} de su meta en ${periodoLabel}`
        : `Acumulado al ${fmt.pct(resumen.cumplimiento_pct)} de la meta — ${periodoLabel}`,
      sub: cumple
        ? `Supera la meta por ${fmt.moneda(Math.abs(dif))} · Meta: ${fmt.moneda(resumen.total_meta_2026)}`
        : `Déficit: ${fmt.moneda(Math.abs(dif))} · Meta: ${fmt.moneda(resumen.total_meta_2026)}`,
      accion: !cumple ? 'Revisar plan de recuperación' : null,
      orden: cumple ? 3 : resumen.cumplimiento_pct < 80 ? 0 : 1,
    })
  }

  // ── 2. Comparativo vs 2025 ───────────────────────────────────────────────
  if (resumen.variacion_interanual != null && !es2025) {
    const vari = resumen.variacion_interanual
    const dif  = resumen.diferencia_vs_2025 || 0
    const v25  = resumen.total_venta_2025_mismo_periodo || 0
    items.push({
      sev: vari < -10 ? 'danger' : vari < 0 ? 'warning' : 'success',
      cat: 'Comparativo Interanual',
      titulo: `Venta ${vari >= 0 ? 'creció' : 'cayó'} ${vari >= 0 ? '+' : ''}${vari.toFixed(1)}% vs mismo periodo 2025`,
      sub: `${vari >= 0 ? '+' : ''}${fmt.moneda(dif)} · 2025: ${fmt.moneda(v25)}`,
      accion: vari < -5 ? 'Analizar causas de la caída' : null,
      orden: vari < -10 ? 0 : vari < 0 ? 2 : 4,
    })
  }

  // ── 3. Cobertura de cartera ──────────────────────────────────────────────
  if (resumen.cobertura_cartera_pct != null && !es2025) {
    const cob  = resumen.cobertura_cartera_pct
    const pend = resumen.clientes_pendientes || 0
    const atnd = resumen.clientes_atendidos  || 0
    items.push({
      sev: cob < 50 ? 'danger' : cob < 80 ? 'warning' : 'success',
      cat: 'Cobertura de Cartera',
      titulo: cob >= 80
        ? `Cobertura al ${fmt.pct(cob)} — nivel de atención óptimo`
        : `Solo el ${fmt.pct(cob)} de la cartera fue atendida${mesesStr ? ` (${mesesStr})` : ''}`,
      sub: pend > 0
        ? `${atnd} clientes atendidos · ${pend} pendientes sin atender`
        : `${atnd} clientes atendidos — cartera completa`,
      accion: cob < 50 ? 'Priorizar visitas pendientes' : cob < 80 ? 'Reforzar cobertura' : null,
      orden: cob < 50 ? 0 : cob < 80 ? 2 : 5,
    })
  }

  // ── 4. Retención / clientes en riesgo ────────────────────────────────────
  const perdidos = resumen.clientes_perdidos || 0
  if (perdidos > 0) {
    items.push({
      sev: perdidos > 15 ? 'danger' : 'warning',
      cat: 'Retención de Clientes',
      titulo: `${perdidos} cliente${perdidos > 1 ? 's' : ''} en riesgo de pérdida`,
      sub: `Sin compra en los últimos 4 meses${mesesStr ? ` · Filtro: ${mesesStr}` : ''}`,
      accion: 'Activar plan de reactivación',
      orden: perdidos > 15 ? 0 : 2,
    })
  }

  // ── 5. Captación de nuevos ───────────────────────────────────────────────
  const nuevos = es2025
    ? (resumen.clientes_nuevos_2025 || 0)
    : (resumen.clientes_nuevos_2026 ?? resumen.clientes_nuevos ?? 0)
  const recup = es2025
    ? (resumen.clientes_recuperados_2025 || 0)
    : (resumen.clientes_recuperados_2026 ?? resumen.clientes_recuperados ?? 0)
  if (nuevos === 0) {
    items.push({
      sev: 'warning',
      cat: 'Captación de Nuevos',
      titulo: `Sin clientes nuevos en el periodo${mesesStr ? ` (${mesesStr})` : ''}`,
      sub: recup > 0
        ? `${recup} cliente${recup > 1 ? 's' : ''} recuperado${recup > 1 ? 's' : ''} · Captación neta: 0`
        : 'Captación nula en el periodo',
      accion: 'Revisar estrategia de captación',
      orden: 3,
    })
  } else {
    items.push({
      sev: 'info',
      cat: 'Captación de Nuevos',
      titulo: `${nuevos} nuevo${nuevos > 1 ? 's' : ''} captado${nuevos > 1 ? 's' : ''}${recup > 0 ? ` · ${recup} recuperado${recup > 1 ? 's' : ''}` : ''}`,
      sub: `Incorporación neta: ${nuevos + recup} clientes${perdidos > 0 ? ` · En riesgo: ${perdidos}` : ''}`,
      accion: null,
      orden: 5,
    })
  }

  // ── 6. Margen vs meta ────────────────────────────────────────────────────
  if (esPorAgente) {
    const ag = kpiAgentes[0]
    if (ag?.meta_margen_pct != null && ag.meta_margen_pct > 0) {
      const metaPct  = ag.meta_margen_pct * 100
      const realPct  = ag.margen_pct || 0
      const ratio    = realPct / metaPct * 100
      const varMrg   = resumen.margen_pct_2025 > 0 ? realPct - resumen.margen_pct_2025 : null
      items.push({
        sev: ratio >= 100 ? 'success' : ratio >= 85 ? 'warning' : 'danger',
        cat: 'Margen vs Meta',
        titulo: ratio >= 100
          ? `Margen de ${nombre}: ${fmt.pct(realPct)} — objetivo alcanzado`
          : `Margen de ${nombre}: ${fmt.pct(realPct)} vs meta ${fmt.pct(metaPct)}`,
        sub: [
          ratio < 100 ? `Brecha: ${(metaPct - realPct).toFixed(1)} pp` : null,
          `Monetario: ${fmt.moneda(resumen.margen_monetario)}`,
          varMrg != null ? `${varMrg >= 0 ? '▲' : '▼'} ${Math.abs(varMrg).toFixed(1)} pp vs 2025` : null,
        ].filter(Boolean).join(' · '),
        accion: ratio < 100 ? 'Revisar mezcla de productos' : null,
        orden: ratio < 85 ? 1 : ratio < 100 ? 3 : 5,
      })
    }
  } else if (resumen.margen_pct != null) {
    const varMrg = resumen.margen_pct_2025 > 0 && !es2025
      ? resumen.margen_pct - resumen.margen_pct_2025
      : null
    const bajoMg = kpiAgentes.filter(a =>
      a.meta_margen_pct != null && a.meta_margen_pct > 0 &&
      (a.margen_pct || 0) < a.meta_margen_pct * 100 * 0.9
    )
    items.push({
      sev: bajoMg.length > 2 ? 'warning' : bajoMg.length > 0 ? 'warning' : 'success',
      cat: 'Margen Bruto',
      titulo: `Margen del periodo: ${fmt.pct(resumen.margen_pct)} · ${fmt.moneda(resumen.margen_monetario)}`,
      sub: [
        varMrg != null ? `${varMrg >= 0 ? '▲' : '▼'} ${Math.abs(varMrg).toFixed(1)} pp vs 2025` : null,
        bajoMg.length > 0
          ? `${bajoMg.length} agente${bajoMg.length > 1 ? 's' : ''} bajo meta: ${bajoMg.slice(0, 2).map(a => a.agente.split(' ')[0]).join(', ')}${bajoMg.length > 2 ? '…' : ''}`
          : 'Todos los agentes cumplen meta de margen',
      ].filter(Boolean).join(' · '),
      accion: bajoMg.length > 0 ? 'Revisar mezcla de productos' : null,
      orden: bajoMg.length > 2 ? 2 : 4,
    })
  }

  // ── 7. Ticket promedio ───────────────────────────────────────────────────
  if (resumen.ticket_promedio > 0) {
    const varTkt = resumen.ticket_promedio_2025 > 0 && !es2025
      ? (resumen.ticket_promedio - resumen.ticket_promedio_2025) / resumen.ticket_promedio_2025 * 100
      : null
    items.push({
      sev: varTkt == null ? 'info' : varTkt < -10 ? 'warning' : varTkt > 0 ? 'success' : 'info',
      cat: 'Ticket Promedio',
      titulo: `Ticket promedio ${fmt.moneda(resumen.ticket_promedio)} con ${(resumen.total_tickets || 0).toLocaleString('es-MX')} pedidos`,
      sub: varTkt != null
        ? `${varTkt >= 0 ? '+' : ''}${varTkt.toFixed(1)}% vs 2025 · 2025: ${fmt.moneda(resumen.ticket_promedio_2025)}`
        : `${(resumen.total_tickets || 0).toLocaleString('es-MX')} tickets únicos en el periodo`,
      accion: varTkt != null && varTkt < -10 ? 'Revisar descuentos / mezcla' : null,
      orden: varTkt != null && varTkt < -10 ? 2 : 6,
    })
  }

  // ── 8. Dispersión entre agentes (solo vista global) ──────────────────────
  if (!esPorAgente && kpiAgentes?.length > 1) {
    const conMeta = kpiAgentes.filter(a => a.meta > 0 && a.cumplimiento_pct != null)
    if (conMeta.length > 1) {
      const mejor     = conMeta.reduce((a, b) => a.cumplimiento_pct > b.cumplimiento_pct ? a : b)
      const peor      = conMeta.reduce((a, b) => a.cumplimiento_pct < b.cumplimiento_pct ? a : b)
      const dispersion = mejor.cumplimiento_pct - peor.cumplimiento_pct
      items.push({
        sev: dispersion > 40 ? 'warning' : 'info',
        cat: 'Dispersión entre Agentes',
        titulo: `Mejor: ${mejor.agente.split(' ')[0]} (${fmt.pct(mejor.cumplimiento_pct)}) · Menor: ${peor.agente.split(' ')[0]} (${fmt.pct(peor.cumplimiento_pct)})`,
        sub: `Brecha de ${dispersion.toFixed(1)} pp entre el más y menos efectivo del periodo`,
        accion: dispersion > 40 ? 'Compartir prácticas del mejor agente' : null,
        orden: dispersion > 40 ? 3 : 7,
      })
    }
  }

  return items.sort((a, b) => (a.orden || 0) - (b.orden || 0))
}

export default function PanelIntel({ resumen, kpiAgentes, filtros }) {
  const insights = useMemo(
    () => buildInsights(resumen, kpiAgentes || [], filtros),
    [resumen, kpiAgentes, filtros]
  )

  const contextoPartes = [
    filtros?.agente !== 'todos' ? `Agente: ${filtros.agente.split(' ')[0]}` : 'Todos los agentes',
    filtros?.meses?.length > 0 ? filtros.meses.map(m => MESES_NOM[m - 1]).join('-') : 'Todos los meses',
    filtros?.año !== 'todos' ? filtros.año : '2025/2026',
  ]

  const nDanger  = insights.filter(i => i.sev === 'danger').length
  const nWarning = insights.filter(i => i.sev === 'warning').length
  const badgeBg    = nDanger > 0 ? '#fee2e2' : nWarning > 0 ? '#fef9c3' : '#dcfce7'
  const badgeColor = nDanger > 0 ? '#b91c1c' : nWarning > 0 ? '#a16207' : '#15803d'

  // Grid adaptativo: 3 col si ≥6, 2 si ≥4, 1 si menos
  const cols = insights.length >= 6 ? 3 : insights.length >= 4 ? 2 : 1

  return (
    <div style={{ background:'#fff', borderRadius:12, border:'1.5px solid #e2e8f0', boxShadow:'0 2px 8px rgba(0,0,0,.06)', overflow:'hidden' }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ background:'linear-gradient(135deg, #0f1f3d 0%, #1a3a6e 100%)', padding:'16px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12, flexWrap:'wrap', gap:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:12, fontWeight:800, color:'#fff', textTransform:'uppercase', letterSpacing:'.5px' }}>
              🎯 Intel Táctica del Periodo
            </span>
            <span style={{ fontSize:11, fontWeight:700, padding:'2px 10px', borderRadius:10, background:badgeBg, color:badgeColor }}>
              {nDanger > 0 && `${nDanger} crítica${nDanger > 1 ? 's' : ''}`}
              {nDanger > 0 && nWarning > 0 ? ' · ' : ''}
              {nWarning > 0 && `${nWarning} alerta${nWarning > 1 ? 's' : ''}`}
              {nDanger === 0 && nWarning === 0 && 'Todo en orden'}
            </span>
          </div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {contextoPartes.map((p, i) => (
              <span key={i} style={{
                fontSize:10, fontWeight:600,
                background:'rgba(77,163,255,.18)', border:'1px solid rgba(77,163,255,.35)',
                color:'#7dd3fc', padding:'2px 10px', borderRadius:10,
              }}>{p}</span>
            ))}
          </div>
        </div>

        {/* KPI mini-stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
          {[
            { label:'Venta Total',  value:fmt.moneda(resumen.total_venta_2026) },
            { label:'Cumplimiento', value:resumen.cumplimiento_pct != null ? fmt.pct(resumen.cumplimiento_pct) : '—' },
            { label:'Margen Bruto', value:resumen.margen_pct != null ? fmt.pct(resumen.margen_pct) : '—' },
            { label:'Ticket Prom.', value:resumen.ticket_promedio > 0 ? fmt.moneda(resumen.ticket_promedio) : '—' },
          ].map(({ label, value }) => (
            <div key={label} style={{ background:'rgba(255,255,255,.08)', borderRadius:8, padding:'8px 12px' }}>
              <div style={{ fontSize:9.5, color:'rgba(255,255,255,.5)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.4px', marginBottom:3 }}>{label}</div>
              <div style={{ fontSize:15, fontWeight:800, color:'#fff', fontVariantNumeric:'tabular-nums' }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Insight cards ───────────────────────────────────────────────── */}
      <div style={{
        padding:'14px',
        display:'grid',
        gridTemplateColumns:`repeat(${cols},1fr)`,
        gap:10,
      }}>
        {insights.map((ins, i) => {
          const s = SEV[ins.sev] || SEV.info
          return (
            <div key={i} style={{
              borderLeft:`4px solid ${s.border}`,
              background:s.bg,
              borderRadius:'0 8px 8px 0',
              padding:'10px 12px',
              display:'flex', flexDirection:'column', gap:3,
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                <span style={{ fontSize:12 }}>{s.icon}</span>
                <span style={{ fontSize:9.5, fontWeight:700, color:s.color, textTransform:'uppercase', letterSpacing:'.4px' }}>{ins.cat}</span>
              </div>
              <div style={{ fontSize:12, fontWeight:600, color:'#1e293b', lineHeight:1.45 }}>
                {ins.titulo}
              </div>
              {ins.sub && (
                <div style={{ fontSize:11, color:'#64748b', lineHeight:1.4 }}>
                  {ins.sub}
                </div>
              )}
              {ins.accion && (
                <div style={{ fontSize:11, fontWeight:600, color:s.color, marginTop:2 }}>
                  → {ins.accion}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
