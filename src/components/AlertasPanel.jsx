import React, { useState, useMemo } from 'react'
import { fmt } from '../utils/format.js'

const MESES_NOM = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

const TIPO_STYLE = {
  danger:  { icon:'🔴', bg:'#fff5f5', border:'#fecaca', color:'#b91c1c' },
  warning: { icon:'⚠️', bg:'#fffbeb', border:'#fde68a', color:'#a16207' },
  info:    { icon:'💡', bg:'#eff6ff', border:'#bfdbfe', color:'#1d4ed8' },
  success: { icon:'✅', bg:'#f0fdf4', border:'#bbf7d0', color:'#15803d' },
}

function generarAlertas(resumen, kpiAgentes, filtros) {
  const alertas = []
  const esPorAgente = filtros.agente !== 'todos'
  const esPorMes    = filtros.meses.length > 0
  const mesesStr    = esPorMes ? `(${filtros.meses.map(m => MESES_NOM[m - 1]).join(', ')})` : ''
  const nombreCorto = esPorAgente ? filtros.agente.split(' ')[0] : null

  // ── 1. Cumplimiento de venta ──────────────────────────────────────────────
  if (esPorAgente) {
    const ag = kpiAgentes[0]
    if (ag?.cumplimiento_pct != null) {
      const ok  = ag.cumplimiento_pct >= 100
      const dif = ag.diferencia_meta || 0
      alertas.push({
        tipo: ok ? 'success' : ag.cumplimiento_pct < 75 ? 'danger' : 'warning',
        categoria: 'Cumplimiento de Venta',
        mensaje: `${nombreCorto} al ${fmt.pct(ag.cumplimiento_pct)} de su meta${mesesStr ? ' ' + mesesStr : ''}. ${
          ok ? `Supera meta por ${fmt.moneda(dif)}.` : `Déficit de ${fmt.moneda(Math.abs(dif))}.`}`,
        accion: !ok ? 'Revisar plan de recuperación' : null,
      })
    }
  } else {
    const criticos   = kpiAgentes.filter(a => a.meta > 0 && a.cumplimiento_pct != null && a.cumplimiento_pct < 75)
    const enRiesgo   = kpiAgentes.filter(a => a.meta > 0 && a.cumplimiento_pct != null && a.cumplimiento_pct >= 75 && a.cumplimiento_pct < 90)
    const superan    = kpiAgentes.filter(a => a.meta > 0 && (a.cumplimiento_pct || 0) >= 100)

    criticos.forEach(a => alertas.push({
      tipo: 'danger', categoria: 'Cumplimiento de Venta',
      mensaje: `${a.agente} al ${fmt.pct(a.cumplimiento_pct)} de meta. Déficit de ${fmt.moneda(Math.abs(a.diferencia_meta || 0))}.`,
      accion: 'Revisar plan urgente', agente: a.agente,
    }))
    enRiesgo.forEach(a => alertas.push({
      tipo: 'warning', categoria: 'Cumplimiento de Venta',
      mensaje: `${a.agente} al ${fmt.pct(a.cumplimiento_pct)} de meta. Déficit de ${fmt.moneda(Math.abs(a.diferencia_meta || 0))}.`,
      accion: 'Revisar plan de recuperación', agente: a.agente,
    }))
    if (superan.length > 0) {
      alertas.push({
        tipo: 'success', categoria: 'Meta Alcanzada',
        mensaje: `${superan.length} agente${superan.length > 1 ? 's' : ''} supera${superan.length > 1 ? 'n' : ''} su meta: ${
          superan.slice(0, 3).map(a => a.agente.split(' ')[0]).join(', ')}${superan.length > 3 ? ` y ${superan.length - 3} más` : ''}.`,
      })
    }
  }

  // ── 2. Comparativo interanual ─────────────────────────────────────────────
  if (resumen.variacion_interanual != null && filtros.año !== '2025') {
    const vari = resumen.variacion_interanual
    const dif  = resumen.diferencia_vs_2025 || 0
    alertas.push({
      tipo: vari < -10 ? 'danger' : vari < 0 ? 'warning' : 'success',
      categoria: 'Comparativo Interanual',
      mensaje: `Venta ${vari >= 0 ? 'creció' : 'cayó'} ${vari >= 0 ? '+' : ''}${vari.toFixed(1)}% vs mismo periodo 2025. Diferencia: ${fmt.moneda(dif)}.`,
      accion: vari < -5 ? 'Analizar causas de la caída' : null,
    })
  }

  // ── 3. Cobertura de cartera ───────────────────────────────────────────────
  if (resumen.cobertura_cartera_pct != null && filtros.año !== '2025') {
    const cob  = resumen.cobertura_cartera_pct
    const pend = resumen.clientes_pendientes || 0
    if (cob < 50) {
      alertas.push({
        tipo: 'danger', categoria: 'Cobertura de Cartera',
        mensaje: `Cobertura al ${fmt.pct(cob)}${mesesStr ? ' ' + mesesStr : ''}. ${pend} clientes sin atender.`,
        accion: 'Priorizar visitas pendientes',
      })
    } else if (cob < 80) {
      alertas.push({
        tipo: 'warning', categoria: 'Cobertura de Cartera',
        mensaje: `Cobertura al ${fmt.pct(cob)}${mesesStr ? ' ' + mesesStr : ''}. ${pend} clientes pendientes.`,
        accion: 'Reforzar cobertura',
      })
    } else {
      alertas.push({
        tipo: 'success', categoria: 'Cobertura de Cartera',
        mensaje: `Cobertura al ${fmt.pct(cob)} — excelente nivel de atención.`,
      })
    }
  }

  // ── 4. Retención / clientes perdidos ──────────────────────────────────────
  if (resumen.clientes_perdidos > 0) {
    alertas.push({
      tipo: resumen.clientes_perdidos > 15 ? 'danger' : 'warning',
      categoria: 'Retención de Clientes',
      mensaje: `${resumen.clientes_perdidos} cliente${resumen.clientes_perdidos > 1 ? 's' : ''} sin compra reciente (riesgo de pérdida)${mesesStr ? ' ' + mesesStr : ''}.`,
      accion: 'Activar plan de reactivación',
    })
  }

  // ── 5. Captación de nuevos clientes ──────────────────────────────────────
  const nuevos = filtros.año === '2025'
    ? (resumen.clientes_nuevos_2025 || 0)
    : (resumen.clientes_nuevos_2026 ?? resumen.clientes_nuevos ?? 0)
  if (nuevos === 0) {
    alertas.push({
      tipo: 'warning', categoria: 'Captación de Nuevos',
      mensaje: `Sin clientes nuevos en el periodo${mesesStr ? ' ' + mesesStr : ''}.`,
      accion: 'Revisar estrategia de captación',
    })
  } else {
    const recup = filtros.año === '2025'
      ? (resumen.clientes_recuperados_2025 || 0)
      : (resumen.clientes_recuperados_2026 ?? resumen.clientes_recuperados ?? 0)
    alertas.push({
      tipo: 'info', categoria: 'Captación de Nuevos',
      mensaje: `${nuevos} cliente${nuevos > 1 ? 's' : ''} nuevo${nuevos > 1 ? 's' : ''} captado${nuevos > 1 ? 's' : ''}${
        recup > 0 ? ` y ${recup} recuperado${recup > 1 ? 's' : ''}` : ''} en el periodo.`,
    })
  }

  // ── 6. Margen vs meta de margen ───────────────────────────────────────────
  if (esPorAgente) {
    const ag = kpiAgentes[0]
    if (ag?.meta_margen_pct != null && ag.meta_margen_pct > 0) {
      const metaPct  = ag.meta_margen_pct * 100
      const realPct  = ag.margen_pct || 0
      const ratio    = realPct / metaPct * 100
      alertas.push({
        tipo: ratio >= 100 ? 'success' : ratio >= 85 ? 'warning' : 'danger',
        categoria: 'Margen vs Meta',
        mensaje: `Margen de ${nombreCorto}: ${fmt.pct(realPct)} (meta ${fmt.pct(metaPct)}). ${
          ratio >= 100 ? 'Objetivo de margen alcanzado.' : `Brecha de ${(metaPct - realPct).toFixed(1)} pp.`}`,
        accion: ratio < 100 ? 'Revisar mezcla de productos' : null,
      })
    }
  } else {
    const bajoMargen = kpiAgentes.filter(a =>
      a.meta_margen_pct != null && a.meta_margen_pct > 0 &&
      (a.margen_pct || 0) < a.meta_margen_pct * 100 * 0.9
    )
    if (bajoMargen.length > 0) {
      alertas.push({
        tipo: 'warning', categoria: 'Margen por Agente',
        mensaje: `${bajoMargen.length} agente${bajoMargen.length > 1 ? 's' : ''} bajo su meta de margen: ${
          bajoMargen.slice(0, 3).map(a => `${a.agente.split(' ')[0]} (${fmt.pct(a.margen_pct)})`).join(', ')}${bajoMargen.length > 3 ? '…' : ''}.`,
        accion: 'Revisar mezcla de productos',
      })
    }
  }

  // ── 7. Ticket promedio interanual ─────────────────────────────────────────
  if (resumen.ticket_promedio > 0 && resumen.ticket_promedio_2025 > 0 && filtros.año !== '2025') {
    const varTkt = (resumen.ticket_promedio - resumen.ticket_promedio_2025) / resumen.ticket_promedio_2025 * 100
    if (Math.abs(varTkt) > 5) {
      alertas.push({
        tipo: varTkt < -10 ? 'warning' : varTkt > 0 ? 'success' : 'info',
        categoria: 'Ticket Promedio',
        mensaje: `Ticket promedio ${fmt.moneda(resumen.ticket_promedio)} — ${varTkt >= 0 ? '+' : ''}${varTkt.toFixed(1)}% vs mismo periodo 2025.`,
      })
    }
  }

  return alertas
}

export default function AlertasPanel({ resumen, kpiAgentes, filtros }) {
  const [showAll, setShowAll] = useState(false)

  const alertas = useMemo(
    () => generarAlertas(resumen, kpiAgentes || [], filtros),
    [resumen, kpiAgentes, filtros]
  )

  const visible = showAll ? alertas : alertas.slice(0, 5)

  const hayDanger  = alertas.some(a => a.tipo === 'danger')
  const hayWarning = alertas.some(a => a.tipo === 'warning')
  const badgeBg    = hayDanger ? '#fee2e2' : hayWarning ? '#fef9c3' : '#dcfce7'
  const badgeColor = hayDanger ? '#b91c1c' : hayWarning ? '#a16207' : '#15803d'

  const filtroActivo = filtros.agente !== 'todos' || filtros.meses.length > 0 || filtros.año !== 'todos'
  const contextoPartes = [
    filtros.agente !== 'todos' ? filtros.agente.split(' ')[0] : null,
    filtros.meses.length > 0 ? filtros.meses.map(m => MESES_NOM[m - 1]).join('-') : null,
    filtros.año !== 'todos' ? filtros.año : null,
  ].filter(Boolean)

  return (
    <div style={{ background:'#fff', borderRadius:10, padding:'16px', border:'1.5px solid #e2e8f0', boxShadow:'0 1px 4px rgba(0,0,0,.05)' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:filtroActivo ? 8 : 12 }}>
        <span style={{ fontSize:12, fontWeight:700, color:'#0f1f3d', textTransform:'uppercase', letterSpacing:'.4px' }}>🔔 Alertas y Oportunidades</span>
        <span style={{ fontSize:11, background:badgeBg, color:badgeColor, padding:'2px 8px', borderRadius:10, fontWeight:700 }}>{alertas.length}</span>
      </div>

      {filtroActivo && (
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
          <span style={{ fontSize:10, color:'#64748b', fontWeight:600, alignSelf:'center' }}>Vista:</span>
          {contextoPartes.map((p, i) => (
            <span key={i} style={{ fontSize:10, fontWeight:600, background:'#eff6ff', border:'1px solid #bfdbfe', color:'#1d4ed8', padding:'2px 8px', borderRadius:10 }}>
              {p}
            </span>
          ))}
        </div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {visible.map((a, i) => {
          const s = TIPO_STYLE[a.tipo] || TIPO_STYLE.info
          return (
            <div key={i} style={{ background:s.bg, border:`1.5px solid ${s.border}`, borderRadius:8, padding:'10px 12px', display:'flex', gap:10, alignItems:'flex-start' }}>
              <span style={{ fontSize:14, flexShrink:0, marginTop:1 }}>{s.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:10, fontWeight:700, color:s.color, textTransform:'uppercase', letterSpacing:'.4px', marginBottom:3 }}>{a.categoria}</div>
                <div style={{ fontSize:12, color:'#334155', lineHeight:1.4 }}>{a.mensaje}</div>
                {a.accion && <div style={{ fontSize:11, color:s.color, marginTop:4, fontStyle:'italic' }}>→ {a.accion}</div>}
              </div>
            </div>
          )
        })}
        {alertas.length === 0 && (
          <div style={{ fontSize:12, color:'#64748b', textAlign:'center', padding:'16px 0' }}>
            Sin alertas para el periodo seleccionado.
          </div>
        )}
      </div>

      {alertas.length > 5 && (
        <button
          onClick={() => setShowAll(v => !v)}
          style={{ marginTop:10, width:'100%', padding:'7px', borderRadius:6, border:'1.5px solid #e2e8f0', background:'#f8fafc', fontSize:11, fontWeight:600, color:'#475569', cursor:'pointer' }}
        >
          {showAll ? 'Mostrar menos' : `Ver ${alertas.length - 5} más`}
        </button>
      )}
    </div>
  )
}
