import React from 'react'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const TIPOS = ['Activo','Nuevo','Recuperado','Perdido']

export default function FilterBar({ data, filtros, onChange, onLimpiar }) {
  const agentes = data?.kpi_agentes?.map(a => a.agente).sort() || []
  const mesesDisp = data?.resumen?.meses_disponibles || []

  const toggleMes = (num) => {
    const curr = filtros.meses
    const next = curr.includes(num) ? curr.filter(m => m !== num) : [...curr, num]
    onChange({ ...filtros, meses: next })
  }

  const hayFiltros = filtros.agente !== 'todos' || filtros.meses.length > 0 || filtros.tipoCliente !== 'todos'

  return (
    <div style={{
      background: '#fff', borderRadius: 10, padding: '12px 16px',
      marginBottom: 16, border: '1.5px solid #e2e8f0',
      boxShadow: '0 1px 4px rgba(0,0,0,.05)',
      display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center'
    }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px' }}>Filtros</span>

      {/* Agente */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Agente:</label>
        <select
          value={filtros.agente}
          onChange={e => onChange({ ...filtros, agente: e.target.value })}
          style={selectStyle}
        >
          <option value="todos">Todos</option>
          {agentes.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {/* Meses */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Mes:</label>
        {mesesDisp.map(num => (
          <button
            key={num}
            onClick={() => toggleMes(num)}
            style={{
              padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
              border: `1.5px solid ${filtros.meses.includes(num) ? '#1a6cf0' : '#e2e8f0'}`,
              background: filtros.meses.includes(num) ? '#1a6cf0' : '#f8fafc',
              color: filtros.meses.includes(num) ? '#fff' : '#475569',
              cursor: 'pointer', transition: 'all .15s'
            }}
          >{MESES[num - 1]?.slice(0, 3)}</button>
        ))}
      </div>

      {/* Tipo cliente */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Tipo cliente:</label>
        <select
          value={filtros.tipoCliente}
          onChange={e => onChange({ ...filtros, tipoCliente: e.target.value })}
          style={selectStyle}
        >
          <option value="todos">Todos</option>
          {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {hayFiltros && (
        <button onClick={onLimpiar} style={{
          marginLeft: 'auto', padding: '5px 14px', borderRadius: 6, fontSize: 11,
          fontWeight: 700, border: '1.5px solid #ef4444', background: '#fff5f5',
          color: '#ef4444', cursor: 'pointer', transition: 'all .15s'
        }}>✕ Limpiar filtros</button>
      )}
    </div>
  )
}

const selectStyle = {
  padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500,
  border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#334155',
  outline: 'none', cursor: 'pointer'
}
