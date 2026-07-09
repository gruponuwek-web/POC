import React from 'react'
import { fmt, semaforo, SEM_VENTA, SEM_COBERTURA } from '../utils/format.js'

export default function KPIRow({ resumen: r }) {
  const semVenta = semaforo(r.cumplimiento_pct, SEM_VENTA)
  const semCob = semaforo(r.cobertura_cartera_pct, SEM_COBERTURA)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12, marginBottom: 16 }}>
      <KPI color="#1a6cf0" icon="💰" label="Venta Acumulada"
        value={fmt.moneda(r.total_venta_2026)}
        sub={`2025: ${fmt.moneda(r.total_venta_2025_mismo_periodo)}`}
        badge={r.diferencia_vs_2025 >= 0
          ? { text: `↑ +${fmt.pct(r.variacion_interanual)}  +${fmt.moneda(r.diferencia_vs_2025)}`, color: 'green' }
          : { text: `↓ ${fmt.pct(r.variacion_interanual)}  ${fmt.moneda(r.diferencia_vs_2025)}`, color: 'red' }}
        note={r.periodo_comparacion}
      />
      <KPI color={semColor(semVenta)} icon={semIcon(semVenta)} label="Cumplimiento de Cuota"
        value={fmt.pct(r.cumplimiento_pct)}
        sub={`${fmt.moneda(r.venta_agentes_con_meta || r.total_venta_2026)} / ${fmt.moneda(r.total_meta_2026)}`}
        progress={Math.min(r.cumplimiento_pct, 100)}
        badge={{ text: semLabel(semVenta), color: semVenta }}
        note="Agentes con meta asignada"
      />
      <KPI color={semColor(semCob)} icon="👥" label="Cobertura de Cartera"
        value={fmt.pct(Math.min(r.cobertura_cartera_pct, 100))}
        sub={`${fmt.num(r.clientes_atendidos)} activos · ${fmt.num(r.cartera_total)} en cartera`}
        progress={Math.min(r.cobertura_cartera_pct, 100)}
        badge={r.clientes_atendidos > r.cartera_total
          ? { text: `+${fmt.num(r.clientes_atendidos - r.cartera_total)} fuera de cartera`, color: 'blue' }
          : { text: `${fmt.num(r.clientes_pendientes)} pendientes`, color: r.clientes_pendientes > 0 ? 'yellow' : 'green' }}
      />
      <KPI color="#22c55e" icon="🟢" label="Clientes Nuevos"
        value={fmt.num(r.clientes_nuevos)}
        sub="Primera compra en el periodo"
        badge={{ text: `+${fmt.num(r.clientes_recuperados)} recuperados`, color: 'green' }}
      />
      <KPI color="#ef4444" icon="🔴" label="Clientes en Riesgo"
        value={fmt.num(r.clientes_perdidos)}
        sub="Sin compra en el periodo"
        badge={{ text: 'Regla: +90 días', color: r.clientes_perdidos > 10 ? 'red' : 'yellow' }}
      />
      <KPI color="#8b5cf6" icon="🧾" label="Tickets Únicos"
        value={fmt.num(r.total_tickets)}
        sub={`Ticket prom: ${fmt.moneda(r.ticket_promedio)}`}
      />
      <KPI color="#14b8a6" icon="📈" label="Margen"
        value={fmt.pct(r.margen_pct)}
        sub={fmt.moneda(r.margen_monetario)}
        badge={r.margen_pct >= 20 ? { text: '✅ Saludable', color: 'green' } : { text: '⚠️ Revisar', color: 'yellow' }}
      />
    </div>
  )
}

function KPI({ color, icon, label, value, sub, badge, progress, note }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 10, padding: '14px 16px',
      border: '1.5px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,.05)',
      position: 'relative', overflow: 'hidden'
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color }} />
      <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
        <span>{icon}</span>{label}
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
