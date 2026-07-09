import React, { useState, useEffect, useMemo } from 'react'
import TopNav from './components/TopNav.jsx'
import FilterBar from './components/FilterBar.jsx'
import KPIRow from './components/KPIRow.jsx'
import ChartVentasMensuales from './components/ChartVentasMensuales.jsx'
import ChartAgenteCuota from './components/ChartAgenteCuota.jsx'
import ChartCobertura from './components/ChartCobertura.jsx'
import ChartClientesNP from './components/ChartClientesNP.jsx'
import ChartTickets from './components/ChartTickets.jsx'
import ChartMargen from './components/ChartMargen.jsx'
import TablaAgentes from './components/TablaAgentes.jsx'
import TablaClientes from './components/TablaClientes.jsx'
import AlertasPanel from './components/AlertasPanel.jsx'
import LecturaTactica from './components/LecturaTactica.jsx'
import CalidadDatos from './components/CalidadDatos.jsx'

export default function App() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeModule, setActiveModule] = useState('dashboard')

  // Filtros
  const [filtros, setFiltros] = useState({
    año: 'todos',
    meses: [],
    agente: 'todos',
    tipoCliente: 'todos',
  })

  useEffect(() => {
    fetch('/data/dashboard_data.json')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const dataFiltrada = useMemo(() => {
    if (!data) return null
    let kpiAgentes = data.kpi_agentes
    let kpi2026 = data.kpi_mensual_2026
    let kpi2025 = data.kpi_mensual_2025
    let clientes = data.tabla_clientes
    let alertas = data.alertas

    if (filtros.agente !== 'todos') {
      kpiAgentes = kpiAgentes.filter(a => a.agente === filtros.agente)
      clientes = clientes.filter(c => c.agente === filtros.agente)
      alertas = alertas.filter(a => !a.agente || a.agente === filtros.agente)
    }
    if (filtros.meses.length > 0) {
      kpi2026 = kpi2026.filter(m => filtros.meses.includes(m.mes_num))
      kpi2025 = kpi2025.filter(m => filtros.meses.includes(m.mes_num))
    }
    if (filtros.tipoCliente !== 'todos') {
      clientes = clientes.filter(c => (c.status || '').toLowerCase() === filtros.tipoCliente.toLowerCase())
    }

    // recalcular resumen con filtros
    const totalVenta = kpiAgentes.reduce((s, a) => s + (a.ventas || 0), 0)
    const totalMeta = kpiAgentes.reduce((s, a) => s + (a.meta || 0), 0)
    const totalCosto = kpiAgentes.reduce((s, a) => s + (a.costo || 0), 0)
    const totalTickets = kpiAgentes.reduce((s, a) => s + (a.tickets || 0), 0)
    const totalAtendidos = kpiAgentes.reduce((s, a) => s + (a.clientes_atendidos || 0), 0)
    const totalCartera = filtros.agente !== 'todos'
      ? kpiAgentes.reduce((s, a) => s + (a.cartera_total || 0), 0)
      : data.resumen.cartera_total
    const totalNuevos = kpiAgentes.reduce((s, a) => s + (a.clientes_nuevos || 0), 0)
    const totalRecup = kpiAgentes.reduce((s, a) => s + (a.clientes_recuperados || 0), 0)

    // Cumplimiento justo: solo agentes con meta asignada
    const agentesConMeta = kpiAgentes.filter(a => a.meta > 0)
    const ventaConMeta = agentesConMeta.reduce((s, a) => s + (a.ventas || 0), 0)
    const cumplimientoPct = totalMeta > 0 ? ventaConMeta / totalMeta * 100 : null

    // ── Comparación dinámica vs 2025 ──────────────────────────────────────────
    // Si hay filtro de agente: sumar ventas_2025_por_mes de ese agente para los meses activos
    // Si no: usar kpi2025 mensual ya filtrado por mes
    let venta2025_periodo
    if (filtros.agente !== 'todos') {
      const mesesFiltro = filtros.meses.length > 0 ? new Set(filtros.meses) : null
      venta2025_periodo = kpiAgentes.reduce((s, a) => {
        const byMes = a.ventas_2025_por_mes || {}
        const total = mesesFiltro
          ? Object.entries(byMes).filter(([m]) => mesesFiltro.has(parseInt(m))).reduce((x, [, v]) => x + v, 0)
          : (a.ventas_2025 || 0)
        return s + total
      }, 0)
    } else {
      venta2025_periodo = kpi2025.reduce((s, m) => s + (m.ventas || 0), 0)
    }
    const diferencia_vs_2025 = totalVenta - venta2025_periodo
    const variacion_pct = venta2025_periodo > 0
      ? (diferencia_vs_2025 / venta2025_periodo * 100)
      : null

    // Etiqueta descriptiva del periodo comparado
    const MESES_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
    const mesesActivos = filtros.meses.length > 0
      ? filtros.meses.sort((a,b) => a-b).map(m => MESES_ES[m-1]).join('–')
      : data.resumen.meses_nombres?.map(n => n.slice(0,3)).join('–') || 'Ene–Jun'
    const periodo_label = `${mesesActivos} 2025 vs ${mesesActivos} 2026`

    const resumen = {
      ...data.resumen,
      total_venta_2026: totalVenta,
      total_meta_2026: totalMeta,
      venta_agentes_con_meta: ventaConMeta,
      cumplimiento_pct: cumplimientoPct,
      diferencia_meta: ventaConMeta - totalMeta,
      total_costo: totalCosto,
      margen_monetario: totalVenta - totalCosto,
      margen_pct: totalVenta > 0 ? (totalVenta - totalCosto) / totalVenta * 100 : 0,
      total_tickets: totalTickets,
      ticket_promedio: totalTickets > 0 ? totalVenta / totalTickets : 0,
      clientes_atendidos: totalAtendidos,
      cartera_total: totalCartera,
      cobertura_cartera_pct: totalCartera > 0 ? totalAtendidos / totalCartera * 100 : null,
      clientes_pendientes: Math.max(0, totalCartera - totalAtendidos),
      clientes_nuevos: totalNuevos,
      clientes_recuperados: totalRecup,
      // Comparación dinámica — se actualiza con cada filtro de mes/agente
      total_venta_2025_mismo_periodo: venta2025_periodo,
      diferencia_vs_2025,
      variacion_interanual: variacion_pct,
      periodo_comparacion: periodo_label,
    }

    return { resumen, kpiAgentes, kpi2026, kpi2025, clientes, alertas }
  }, [data, filtros])

  const limpiarFiltros = () => setFiltros({ año: 'todos', meses: [], agente: 'todos', tipoCliente: 'todos' })

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 48, height: 48, border: '4px solid #e2e8f0', borderTopColor: '#1a6cf0', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <div style={{ color: '#64748b', fontWeight: 600 }}>Cargando datos...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (!data) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 12, color: '#ef4444' }}>
      <div style={{ fontSize: 40 }}>⚠️</div>
      <div style={{ fontWeight: 700 }}>No se pudo cargar dashboard_data.json</div>
      <div style={{ color: '#64748b', fontSize: 13 }}>Coloca el archivo en /public/data/dashboard_data.json</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8' }}>
      <TopNav activeModule={activeModule} onModule={setActiveModule} lastUpdate={data.resumen.ultima_actualizacion} />

      {activeModule === 'dashboard' && (
        <main style={{ maxWidth: 1600, margin: '0 auto', padding: '20px 20px 40px' }}>
          <FilterBar
            data={data}
            filtros={filtros}
            onChange={setFiltros}
            onLimpiar={limpiarFiltros}
          />

          <KPIRow resumen={dataFiltrada.resumen} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <ChartVentasMensuales kpi2025={dataFiltrada.kpi2025} kpi2026={dataFiltrada.kpi2026} metas={data.metas} filtros={filtros} />
            <ChartAgenteCuota agentes={dataFiltrada.kpiAgentes} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
            <ChartCobertura agentes={dataFiltrada.kpiAgentes} />
            <ChartClientesNP kpi2026={dataFiltrada.kpi2026} clientesNR={data.clientes_nr} filtros={filtros} />
            <ChartTickets kpi2026={dataFiltrada.kpi2026} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <ChartMargen kpi2026={dataFiltrada.kpi2026} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 16 }}>
            <TablaAgentes agentes={dataFiltrada.kpiAgentes} onSelectAgente={(ag) => setFiltros(f => ({ ...f, agente: f.agente === ag ? 'todos' : ag }))} agenteSeleccionado={filtros.agente} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <TablaClientes clientes={dataFiltrada.clientes} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <AlertasPanel alertas={dataFiltrada.alertas} />
            <LecturaTactica hallazgos={data.lectura_tactica} resumen={dataFiltrada.resumen} />
          </div>

          <CalidadDatos data={data} />
        </main>
      )}

      {activeModule === 'wbr' && <ProximamentePage titulo="WBR — Weekly Business Review" icono="📅" />}
      {activeModule === 'scorecard' && <ProximamentePage titulo="Balanced Scorecard" icono="⚖️" />}
    </div>
  )
}

function ProximamentePage({ titulo, icono }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 56px)', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 64 }}>{icono}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: '#0f1f3d' }}>{titulo}</div>
      <div style={{ color: '#64748b', fontSize: 15, background: '#fff', padding: '8px 20px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontWeight: 600 }}>
        Próximamente — Módulo en desarrollo
      </div>
      <div style={{ color: '#94a3b8', fontSize: 13, maxWidth: 400, textAlign: 'center', marginTop: 8 }}>
        La arquitectura y modelo de datos ya están preparados para integrar este módulo sin reconstruir la plataforma.
      </div>
    </div>
  )
}
