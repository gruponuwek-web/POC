import React, { useState, useEffect, useMemo } from 'react'
import Login from './components/Login.jsx'
import { getSession, clearSession } from './auth.js'
import TopNav from './components/TopNav.jsx'
import FilterBar from './components/FilterBar.jsx'
import KPIRow from './components/KPIRow.jsx'
import ChartVentasMensuales from './components/ChartVentasMensuales.jsx'
import ChartAgenteCuota from './components/ChartAgenteCuota.jsx'
import ChartCobertura from './components/ChartCobertura.jsx'
import ChartClientesNP from './components/ChartClientesNP.jsx'
import ChartVentasClientesNuevos from './components/ChartVentasClientesNuevos.jsx'
import ChartTickets from './components/ChartTickets.jsx'
import ChartClientesPerdidos from './components/ChartClientesPerdidos.jsx'
import ChartMargen from './components/ChartMargen.jsx'
import TablaAgentes from './components/TablaAgentes.jsx'
import TablaClientes from './components/TablaClientes.jsx'
import PanelIntel from './components/PanelIntel.jsx'
import CalidadDatos from './components/CalidadDatos.jsx'
import TablaClientesPerdidos from './components/TablaClientesPerdidos.jsx'
import BalancedScorecard from './components/BalancedScorecard.jsx'

export default function App() {
  const [session, setSession] = useState(() => getSession())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeModule, setActiveModule] = useState('dashboard')
  const [wbrMounted, setWbrMounted] = useState(false)

  // Filtros
  const [filtros, setFiltros] = useState({
    año: 'todos',
    meses: [],
    agente: 'todos',
    tipoCliente: 'todos',
    proveedor: 'todos',
  })

  useEffect(() => {
    if (activeModule === 'wbr') setWbrMounted(true)
  }, [activeModule])

  useEffect(() => {
    fetch(import.meta.env.BASE_URL + 'data/dashboard_data.json')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const dataFiltrada = useMemo(() => {
    if (!data) return null
    const es2025 = filtros.año === '2025'
    const mesMaxDatos = Math.max(...(data.resumen.meses_disponibles || [7]))
    const mesCortePerdido = mesMaxDatos - 4
    let kpiAgentes = data.kpi_agentes
    let kpi2026 = data.kpi_mensual_actual
    let kpi2025 = data.kpi_mensual_anterior
    let clientes = data.tabla_clientes
    let alertas = data.alertas

    if (filtros.proveedor !== 'todos') {
      const provKPIMes = data.kpi_mensual_por_proveedor?.[filtros.proveedor] || []
      const provKPIAg  = data.kpi_agentes_por_proveedor?.[filtros.proveedor] || {}
      kpi2026 = provKPIMes
      kpiAgentes = kpiAgentes.map(a => {
        const pd = provKPIAg[a.agente] || {}
        const vpm = pd.ventas_por_mes || {}
        const cpm = pd.costo_por_mes  || {}
        const tpm = pd.tickets_por_mes || {}
        const ventas  = Object.values(vpm).reduce((s, v) => s + v, 0)
        const costo   = Object.values(cpm).reduce((s, v) => s + v, 0)
        const tickets = Object.values(tpm).reduce((s, v) => s + v, 0)
        return {
          ...a,
          ventas, costo, tickets,
          margen: ventas - costo,
          margen_pct: ventas > 0 ? (ventas - costo) / ventas * 100 : 0,
          ticket_promedio: tickets > 0 ? ventas / tickets : 0,
          diferencia_meta: ventas - (a.meta || 0),
          cumplimiento_pct: (a.meta || 0) > 0 ? ventas / a.meta * 100 : null,
          ventas_por_mes: vpm,
          costo_por_mes: cpm,
          tickets_por_mes: tpm,
        }
      })
    }

    if (filtros.agente !== 'todos') {
      kpiAgentes = kpiAgentes.filter(a => a.agente === filtros.agente)
      clientes = clientes.filter(c => c.agente === filtros.agente)
      alertas = alertas.filter(a => !a.agente || a.agente === filtros.agente)
      // Reconstruir kpi mensual desde los datos por mes del agente seleccionado
      const ag = kpiAgentes[0]
      if (ag) {
        const MES_NOM = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
        kpi2026 = Object.entries(ag.ventas_por_mes || {}).map(([m, ventas]) => {
          const mesNum = parseInt(m)
          const costo = ag.costo_por_mes?.[m] || 0
          return { mes_num: mesNum, mes_nombre: MES_NOM[mesNum-1], año: 2026,
            ventas, costo, tickets: ag.tickets_por_mes?.[m] || 0,
            clientes: ag.clientes_por_mes?.[m] || 0,
            margen: ventas - costo, margen_pct: ventas > 0 ? (ventas-costo)/ventas*100 : 0 }
        }).sort((a,b) => a.mes_num - b.mes_num)
        kpi2025 = Object.entries(ag.ventas_2025_por_mes || {}).map(([m, ventas]) => {
          const mesNum = parseInt(m)
          return { mes_num: mesNum, mes_nombre: MES_NOM[mesNum-1], año: 2025, ventas }
        }).sort((a,b) => a.mes_num - b.mes_num)
      }
    }
    if (filtros.meses.length > 0) {
      kpi2026 = kpi2026.filter(m => filtros.meses.includes(m.mes_num))
      kpi2025 = kpi2025.filter(m => filtros.meses.includes(m.mes_num))
      // Recalcular kpiAgentes para los meses seleccionados
      kpiAgentes = kpiAgentes.map(a => {
        const ventas = filtros.meses.reduce((s, m) => s + (a.ventas_por_mes?.[m] || 0), 0)
        const costo  = filtros.meses.reduce((s, m) => s + (a.costo_por_mes?.[m]  || 0), 0)
        const tickets = filtros.meses.reduce((s, m) => s + (a.tickets_por_mes?.[m] || 0), 0)
        const _idsCampo = es2025 ? 'clientes_ids_por_mes_2025' : 'clientes_ids_por_mes'
        const _idsSet = new Set(filtros.meses.flatMap(m => a[_idsCampo]?.[m] || []))
        const clientes_atendidos = _idsSet.size
        const meta   = filtros.meses.reduce((s, m) => s + (a.meta_por_mes?.[m]   || 0), 0)
        return {
          ...a,
          ventas, costo, tickets, clientes_atendidos, meta,
          margen: ventas - costo,
          margen_pct: ventas > 0 ? (ventas - costo) / ventas * 100 : 0,
          diferencia_meta: ventas - meta,
          cumplimiento_pct: meta > 0 ? ventas / meta * 100 : null,
          ticket_promedio: tickets > 0 ? ventas / tickets : 0,
        }
      })
    }
    // Snapshot antes del filtro de tipo — para KPI de perdidos (independiente de tipoCliente)
    const clientesBase = clientes

    if (filtros.tipoCliente !== 'todos') {
      clientes = clientes.filter(c => (c.status || '').toLowerCase() === filtros.tipoCliente.toLowerCase())
    }

    // recalcular resumen con filtros
    const meses2026Set = new Set(kpi2026.map(m => m.mes_num))
    const mesesFiltro = filtros.meses.length > 0 ? filtros.meses : null
    const totalVenta = kpiAgentes.reduce((s, a) => s + (a.ventas || 0), 0)
    const totalMeta = kpiAgentes.reduce((s, a) => s + (a.meta || 0), 0)
    const totalCosto = kpiAgentes.reduce((s, a) => s + (a.costo || 0), 0)
    const costo2025 = kpiAgentes.reduce((s, a) => {
      const byMes = a.costo_2025_por_mes || {}
      if (mesesFiltro) return s + mesesFiltro.reduce((sm, m) => sm + (byMes[m] || 0), 0)
      return s + Object.entries(byMes).filter(([m]) => meses2026Set.has(parseInt(m))).reduce((sm, [, v]) => sm + v, 0)
    }, 0)
    const mesesTickets = filtros.meses.length > 0 ? filtros.meses : [...meses2026Set]
    const tickets2026 = kpiAgentes.reduce((s, a) => s + mesesTickets.reduce((sm, m) => sm + (a.tickets_por_mes?.[m] || 0), 0), 0)
    const tickets2025 = kpiAgentes.reduce((s, a) => s + mesesTickets.reduce((sm, m) => sm + (a.tickets_2025_por_mes?.[m] || 0), 0), 0)
    const totalTickets = es2025 ? tickets2025 : tickets2026
    const totalAtendidos = es2025
      ? kpiAgentes.reduce((s, a) => s + (a.clientes_atendidos_2025 || 0), 0)
      : kpiAgentes.reduce((s, a) => s + (a.clientes_atendidos || 0), 0)
    const totalCartera = filtros.agente !== 'todos'
      ? kpiAgentes.reduce((s, a) => s + (a.cartera_total || 0), 0)
      : data.resumen.cartera_total
    const nuevos2026 = mesesFiltro
      ? kpiAgentes.reduce((s, a) => s + mesesFiltro.reduce((sm, m) => sm + (a.nuevos_por_mes?.[m] || 0), 0), 0)
      : kpiAgentes.reduce((s, a) => s + (a.clientes_nuevos || 0), 0)
    const nuevos2025 = mesesFiltro
      ? kpiAgentes.reduce((s, a) => s + mesesFiltro.reduce((sm, m) => sm + (a.nuevos_2025_por_mes?.[m] || 0), 0), 0)
      : kpiAgentes.reduce((s, a) => s + (a.clientes_nuevos_2025 || 0), 0)
    const recup2026 = mesesFiltro
      ? kpiAgentes.reduce((s, a) => s + mesesFiltro.reduce((sm, m) => sm + (a.recup_por_mes?.[m] || 0), 0), 0)
      : kpiAgentes.reduce((s, a) => s + (a.clientes_recuperados || 0), 0)
    const recup2025 = mesesFiltro
      ? kpiAgentes.reduce((s, a) => s + mesesFiltro.reduce((sm, m) => sm + (a.recup_2025_por_mes?.[m] || 0), 0), 0)
      : kpiAgentes.reduce((s, a) => s + (a.clientes_recuperados_2025 || 0), 0)
    const totalNuevos = es2025 ? nuevos2025 : filtros.año === 'todos' ? nuevos2026 + nuevos2025 : nuevos2026
    const totalRecup  = es2025 ? recup2025  : filtros.año === 'todos' ? recup2026  + recup2025  : recup2026
    // Perdidos: siempre desde clientesBase (clientes únicos) — evita doble conteo por agente
    const _esPerdido = c => c.status === 'Perdido' || !c.ultima_compra || c.dias_sin_compra >= 120
    const mesesDisp = data.resumen.meses_disponibles || [1,2,3,4,5,6,7]
    const relMesKPI = (fecha) => { const d = new Date(fecha); return (d.getFullYear() - 2026) * 12 + (d.getMonth() + 1) }
    let totalPerdidos
    if (filtros.año === 'todos' && filtros.meses.length === 0) {
      totalPerdidos = clientesBase.filter(_esPerdido).length
    } else if (filtros.meses.length > 0) {
      totalPerdidos = clientesBase.filter(c => {
        if (!_esPerdido(c) || !c.ultima_compra) return false
        const rm = relMesKPI(c.ultima_compra)
        return filtros.meses.some(m => rm === m - 4)
      }).length
    } else if (filtros.año === '2025') {
      totalPerdidos = clientesBase.filter(c => _esPerdido(c) && !c.ultima_compra_2026).length
    } else {
      // año='2026': clientes cuya ultima_compra cae en el rango de meses disponibles
      const minRel = Math.min(...mesesDisp) - 4
      const maxRel = Math.max(...mesesDisp) - 4
      totalPerdidos = clientesBase.filter(c => {
        if (!_esPerdido(c) || !c.ultima_compra) return false
        const rm = relMesKPI(c.ultima_compra)
        return rm >= minRel && rm <= maxRel
      }).length
    }

    // Cumplimiento justo: solo agentes con meta asignada
    const agentesConMeta = kpiAgentes.filter(a => a.meta > 0)
    const ventaConMeta = agentesConMeta.reduce((s, a) => s + (a.ventas || 0), 0)
    const cumplimientoPct = totalMeta > 0 ? ventaConMeta / totalMeta * 100 : null

    // ── Comparación dinámica vs 2025 ──────────────────────────────────────────
    // Si hay filtro de agente: sumar ventas_2025_por_mes de ese agente para los meses activos
    // Si no: usar kpi2025 mensual ya filtrado por mes
    // Comparación siempre al mismo periodo que kpi2026 activo (meses disponibles en 2026)
    const meses2026Activos = new Set(kpi2026.map(m => m.mes_num))
    let venta2025_periodo
    if (filtros.agente !== 'todos') {
      venta2025_periodo = kpiAgentes.reduce((s, a) => {
        const byMes = a.ventas_2025_por_mes || {}
        const total = Object.entries(byMes)
          .filter(([m]) => meses2026Activos.has(parseInt(m)))
          .reduce((x, [, v]) => x + v, 0)
        return s + total
      }, 0)
    } else {
      venta2025_periodo = kpi2025
        .filter(m => meses2026Activos.has(m.mes_num))
        .reduce((s, m) => s + (m.ventas || 0), 0)
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
      margen_monetario_2025: venta2025_periodo - costo2025,
      margen_pct_2025: venta2025_periodo > 0 ? (venta2025_periodo - costo2025) / venta2025_periodo * 100 : 0,
      total_tickets: totalTickets,
      ticket_promedio: totalTickets > 0 ? totalVenta / totalTickets : 0,
      total_tickets_2026: tickets2026,
      total_tickets_2025: tickets2025,
      ticket_promedio_2025: tickets2025 > 0 ? venta2025_periodo / tickets2025 : 0,
      clientes_atendidos: totalAtendidos,
      cartera_total: totalCartera,
      cartera_total_empresa: data.resumen.cartera_total,
      cobertura_cartera_pct: totalCartera > 0 ? totalAtendidos / totalCartera * 100 : null,
      clientes_pendientes: Math.max(0, totalCartera - totalAtendidos),
      clientes_nuevos: totalNuevos,
      clientes_recuperados: totalRecup,
      clientes_nuevos_2026: nuevos2026,
      clientes_nuevos_2025: nuevos2025,
      clientes_recuperados_2026: recup2026,
      clientes_recuperados_2025: recup2025,
      clientes_perdidos: totalPerdidos,
      // Comparación dinámica — se actualiza con cada filtro de mes/agente
      total_venta_2025_mismo_periodo: venta2025_periodo,
      diferencia_vs_2025,
      variacion_interanual: variacion_pct,
      periodo_comparacion: periodo_label,
      filtro_label: filtros.meses.length > 0
        ? `${mesesActivos} ${filtros.año !== 'todos' ? filtros.año : '2025/2026'}`
        : filtros.año !== 'todos'
          ? `Año ${filtros.año} · ${mesesActivos}`
          : `Total acumulado · ${mesesActivos}`,
    }

    // NR por mes: filtrar por agente si está activo
    const nrPorMes = filtros.agente !== 'todos'
      ? (data.clientes_nr_por_agente?.[filtros.agente] || [])
      : data.clientes_nr_por_mes

    return { resumen, kpiAgentes, kpi2026, kpi2025, clientes, alertas, nrPorMes, año: filtros.año }
  }, [data, filtros])

  const [mesPerdidoSel, setMesPerdidoSel] = useState(null)
  const limpiarFiltros = () => { setFiltros({ año: 'todos', meses: [], agente: 'todos', tipoCliente: 'todos', proveedor: 'todos' }); setMesPerdidoSel(null) }

  if (!session) return <Login onLogin={setSession} />

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
      <TopNav
        activeModule={activeModule}
        onModule={setActiveModule}
        lastUpdate={data.resumen.ultima_actualizacion}
        session={session}
        onLogout={() => { clearSession(); setSession(null) }}
      />

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
            <ChartVentasMensuales kpi2025={dataFiltrada.kpi2025} kpi2026={dataFiltrada.kpi2026} metas={data.metas} filtros={filtros} año={dataFiltrada.año} />
            <ChartAgenteCuota agentes={dataFiltrada.kpiAgentes} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <ChartCobertura agentes={dataFiltrada.kpiAgentes} />
            <ChartClientesNP kpi2026={dataFiltrada.kpi2026} clientesNR={data.clientes_nr} nrPorMes={dataFiltrada.nrPorMes} filtros={filtros} año={dataFiltrada.año} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <ChartVentasClientesNuevos
              ventasNR={data.ventas_nr_por_mes_compra}
              ventasNRAg={data.ventas_nr_por_mes_compra_agente}
              ventasNR2025={data.ventas_nr_por_mes_compra_2025}
              ventasNRAg2025={data.ventas_nr_por_mes_compra_agente_2025}
              kpi2026={dataFiltrada.kpi2026}
              kpi2025={dataFiltrada.kpi2025}
              filtros={filtros}
              año={dataFiltrada.año}
              ventaTotalAnual2026={(data.kpi_mensual_actual || []).reduce((s, m) => s + (m.ventas || 0), 0)}
              ventaTotalAnual2025={(data.kpi_mensual_anterior || []).reduce((s, m) => s + (m.ventas || 0), 0)}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 16, marginBottom: 16 }}>
            <ChartClientesPerdidos kpiAgentes={dataFiltrada.kpiAgentes} clientes={dataFiltrada.clientes} año={filtros.año} filtros={filtros}
              mesesConDatos={filtros.año === '2025'
                ? dataFiltrada.kpi2025.map(m => m.mes_num)
                : dataFiltrada.kpi2026.map(m => m.mes_num)}
              mesSel={mesPerdidoSel}
              onMesClick={(m) => setMesPerdidoSel(prev => prev === m ? null : m)} />
            <TablaClientesPerdidos clientes={dataFiltrada.clientes} filtros={filtros} compact={true} mesFiltro={mesPerdidoSel} onClearMes={() => setMesPerdidoSel(null)}
              mesesConDatos={filtros.año === '2025' ? dataFiltrada.kpi2025.map(m => m.mes_num) : dataFiltrada.kpi2026.map(m => m.mes_num)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <ChartTickets kpi2026={dataFiltrada.kpi2026} kpi2025={dataFiltrada.kpi2025} kpiAgentes={dataFiltrada.kpiAgentes} año={filtros.año} />
            <ChartMargen kpi2026={dataFiltrada.kpi2026} kpiAgentes={dataFiltrada.kpiAgentes} año={filtros.año} />
          </div>



          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 16 }}>
            <TablaAgentes agentes={dataFiltrada.kpiAgentes} onSelectAgente={(ag) => setFiltros(f => ({ ...f, agente: f.agente === ag ? 'todos' : ag }))} agenteSeleccionado={filtros.agente} filtros={filtros} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <TablaClientes clientes={dataFiltrada.clientes} filtros={filtros} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <PanelIntel resumen={dataFiltrada.resumen} kpiAgentes={dataFiltrada.kpiAgentes} filtros={filtros} />
          </div>

          <CalidadDatos data={data} />
        </main>
      )}

      {wbrMounted && (
        <iframe
          src={import.meta.env.BASE_URL + 'wbr/index.html'}
          style={{ width: '100%', height: 'calc(100vh - 56px)', border: 'none', display: activeModule === 'wbr' ? 'block' : 'none' }}
          title="WBR Portal"
        />
      )}
      {activeModule === 'scorecard' && <BalancedScorecard data={data} />}
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
