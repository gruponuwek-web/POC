import React, { useState } from 'react'
import { fmt, semaforo, SEM_VENTA, SEM_COBERTURA } from '../utils/format.js'

export default function KPIRow({ resumen: r }) {
  const semVenta = semaforo(r.cumplimiento_pct, SEM_VENTA)
  const semCob = semaforo(r.cobertura_cartera_pct, SEM_COBERTURA)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12, marginBottom: 16 }}>
      <KPI color="#1a6cf0" icon="💰" label="Venta Acumulada"
        tooltip="Total facturado en el periodo. Se compara contra el mismo rango de meses del año anterior para ver si vamos creciendo o cayendo."
        value={fmt.moneda(r.total_venta_2026)}
        sub={`2025: ${fmt.moneda(r.total_venta_2025_mismo_periodo)}`}
        badge={r.diferencia_vs_2025 >= 0
          ? { text: `↑ +${fmt.pct(r.variacion_interanual)}  +${fmt.moneda(r.diferencia_vs_2025)}`, color: 'green' }
          : { text: `↓ ${fmt.pct(r.variacion_interanual)}  ${fmt.moneda(r.diferencia_vs_2025)}`, color: 'red' }}
        note={r.periodo_comparacion}
      />
      <KPI color={semColor(semVenta)} icon={semIcon(semVenta)} label="Cumplimiento de Cuota"
        tooltip="Qué porcentaje de la meta de ventas se ha alcanzado. Solo cuenta agentes que tienen meta asignada para no distorsionar el número."
        value={fmt.pct(r.cumplimiento_pct)}
        sub={`${fmt.moneda(r.venta_agentes_con_meta || r.total_venta_2026)} / ${fmt.moneda(r.total_meta_2026)}`}
        progress={Math.min(r.cumplimiento_pct, 100)}
        badge={{ text: semLabel(semVenta), color: semVenta }}
        note="Agentes con meta asignada"
      />
      <KPI color={semColor(semCob)} icon="👥" label="Cobertura de Cartera Total"
        tooltip="De todos los clientes asignados a los agentes, cuántos realizaron al menos una compra en el periodo. Los pendientes son los que aún no han comprado."
        value={`${fmt.num(r.clientes_atendidos)} / ${fmt.num(r.cartera_total)}`}
        sub={`${fmt.pct(Math.min(r.cobertura_cartera_pct, 100))} de cobertura`}
        progress={Math.min(r.cobertura_cartera_pct, 100)}
        badge={r.clientes_atendidos > r.cartera_total
          ? { text: `+${fmt.num(r.clientes_atendidos - r.cartera_total)} fuera de cartera`, color: 'blue' }
          : { text: `${fmt.num(r.clientes_pendientes)} pendientes`, color: r.clientes_pendientes > 0 ? 'yellow' : 'green' }}
        note={r.cartera_total_empresa && r.cartera_total_empresa !== r.cartera_total
          ? `Cartera agente: ${fmt.num(r.cartera_total)} · Total empresa: ${fmt.num(r.cartera_total_empresa)}`
          : `Total cartera: ${fmt.num(r.cartera_total)} clientes`}
      />
      {(() => {
        const n26 = r.clientes_nuevos_2026 || 0
        const n25 = r.clientes_nuevos_2025 || 0
        const rc26 = r.clientes_recuperados_2026 || 0
        const rc25 = r.clientes_recuperados_2025 || 0
        const diffN = n26 - n25
        const pctN = n25 > 0 ? diffN / n25 * 100 : null
        return (
          <KPI color="#22c55e" icon="🟢" label="Clientes Nuevos"
            tooltip="Nuevos: clientes que compraron por primera vez. Recuperados: clientes que volvieron a comprar después de más de 4 meses sin hacerlo. Ambos se validan contra las ventas reales."
            value={fmt.num(r.clientes_nuevos)}
            sub={`Recuperados: ${fmt.num(r.clientes_recuperados)}`}
            badge={pctN != null
              ? { text: `${diffN >= 0 ? '↑ +' : '↓ '}${fmt.pct(Math.abs(pctN))}  ${diffN >= 0 ? '+' : ''}${fmt.num(diffN)}`, color: diffN >= 0 ? 'green' : 'red' }
              : null}
            note={`2025: ${fmt.num(n25)} nuevos, ${fmt.num(rc25)} recup  |  2026: ${fmt.num(n26)} nuevos, ${fmt.num(rc26)} recup`}
          />
        )
      })()}
      <KPI color="#ef4444" icon="🔴" label="Clientes Perdidos"
        tooltip="Clientes que llevan más de 4 meses sin realizar ninguna compra. Al filtrar por mes se ven los clientes que cruzaron ese umbral en ese mes específico (no el acumulado)."
        value={fmt.num(r.clientes_perdidos)}
        sub="Sin compra en el periodo"
        badge={{ text: 'Regla: +4 meses', color: r.clientes_perdidos > 10 ? 'red' : 'yellow' }}
      />
      {(() => {
        const t26 = r.total_tickets_2026 || 0
        const t25 = r.total_tickets_2025 || 0
        const diff = t26 - t25
        const pct = t25 > 0 ? diff / t25 * 100 : null
        return (
          <KPI color="#8b5cf6" icon="🧾" label="Tickets Únicos"
            tooltip="Número de pedidos o facturas distintas en el periodo. El ticket promedio es el valor promedio por pedido. Se compara el mismo periodo de ambos años."
            value={fmt.num(r.total_tickets)}
            sub={`Prom 2026: ${fmt.moneda(r.ticket_promedio)}  ·  Prom 2025: ${fmt.moneda(r.ticket_promedio_2025)}`}
            badge={pct != null
              ? { text: `${diff >= 0 ? '↑ +' : '↓ '}${fmt.pct(Math.abs(pct))}  ${diff >= 0 ? '+' : ''}${fmt.num(diff)}`, color: diff >= 0 ? 'green' : 'red' }
              : null}
            note={`2025: ${fmt.num(t25)} · 2026: ${fmt.num(t26)}${r.periodo_comparacion ? `  |  ${r.periodo_comparacion}` : ''}`}
          />
        )
      })()}
      <KPI color="#14b8a6" icon="📈" label="Margen"
        tooltip="Diferencia entre lo que se vendió y lo que costó la mercancía. Un margen saludable es mayor al 20%. Se compara el mismo periodo de ambos años."
        value={fmt.pct(r.margen_pct)}
        sub={fmt.moneda(r.margen_monetario)}
        badge={r.margen_pct >= 20 ? { text: '✅ Saludable', color: 'green' } : { text: '⚠️ Revisar', color: 'yellow' }}
        note={r.margen_pct_2025 != null ? `2025: ${fmt.pct(r.margen_pct_2025)} · ${fmt.moneda(r.margen_monetario_2025)}` : null}
      />
    </div>
  )
}

function KPI({ color, icon, label, value, sub, badge, progress, note, tooltip }) {
  const [show, setShow] = useState(false)
  return (
    <div style={{
      background: '#fff', borderRadius: 10, padding: '14px 16px',
      border: '1.5px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,.05)',
      position: 'relative', overflow: 'visible'
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color, borderRadius: '10px 10px 0 0' }} />
      <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
        <span>{icon}</span>
        <span style={{ flex: 1 }}>{label}</span>
        {tooltip && (
          <span
            onMouseEnter={() => setShow(true)}
            onMouseLeave={() => setShow(false)}
            style={{ cursor: 'help', color: '#94a3b8', fontSize: 11, lineHeight: 1, flexShrink: 0 }}
          >ⓘ
            {show && (
              <div style={{
                position: 'absolute', top: 28, right: 0, zIndex: 999,
                background: '#0f1f3d', color: '#fff', fontSize: 11, fontWeight: 400,
                padding: '8px 12px', borderRadius: 8, width: 220, lineHeight: 1.5,
                boxShadow: '0 8px 24px rgba(0,0,0,.25)', textTransform: 'none', letterSpacing: 0,
                pointerEvents: 'none'
              }}>{tooltip}</div>
            )}
          </span>
        )}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#0f1f3d', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{sub}</div>}
      {progress != null && (
        <div style={{ height: 4, background: '#f1f5f9', borderRadius: 4, marginTop: 8, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min(100, progress || 0)}%`, background: color, borderRadius: 4, transition: 'width .6s ease' }} />
        </div>
      )}
      {badge && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 3,
          fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, marginTop: 6,
          background: badge.color === 'green' ? '#dcfce7' : badge.color === 'yellow' ? '#fef9c3' : badge.color === 'red' ? '#fee2e2' : badge.color === 'blue' ? '#dbeafe' : '#f1f5f9',
          color: badge.color === 'green' ? '#15803d' : badge.color === 'yellow' ? '#a16207' : badge.color === 'red' ? '#b91c1c' : badge.color === 'blue' ? '#1d4ed8' : '#64748b',
        }}>{badge.text}</div>
      )}
      {note && <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 3, fontStyle: 'italic' }}>{note}</div>}
    </div>
  )
}

function semColor(s) {
  return s === 'green' ? '#22c55e' : s === 'yellow' ? '#f59e0b' : s === 'red' ? '#ef4444' : '#94a3b8'
}
function semIcon(s) {
  return s === 'green' ? '✅' : s === 'yellow' ? '⚠️' : s === 'red' ? '🔴' : '—'
}
function semLabel(s) {
  return s === 'green' ? '✅ En meta' : s === 'yellow' ? '⚠️ En riesgo' : s === 'red' ? '🔴 Bajo meta' : '—'
}
