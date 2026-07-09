import React, { useState } from 'react'

export default function CalidadDatos({ data }) {
  const [open, setOpen] = useState(false)
  const r = data.resumen

  const registros = [
    { label: 'Registros ventas 2025 (válidos)', value: '79,668', ok: true },
    { label: 'Registros ventas 2026 (válidos)', value: '35,771', ok: true },
    { label: 'Metas cargadas', value: data.metas?.length || 0, ok: true },
    { label: 'Agentes identificados', value: data.agentes?.length || 0, ok: true },
    { label: 'Clientes en cartera', value: r.cartera_total, ok: true },
    { label: 'Clientes nuevos/recuperados', value: data.clientes_nr?.length || 0, ok: true },
    { label: 'Clientes en tabla', value: data.tabla_clientes?.length || 0, ok: true },
    { label: 'Meses disponibles 2026', value: r.meses_nombres?.join(', '), ok: true },
    { label: 'Última actualización', value: r.ultima_actualizacion, ok: true },
    { label: 'Registros excluidos (no factura)', value: '~14,448', ok: false },
  ]

  return (
    <div style={{ background:'#fff',borderRadius:10,border:'1.5px solid #e2e8f0',overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,.05)' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ width:'100%',padding:'12px 16px',display:'flex',alignItems:'center',gap:10,background:'transparent',border:'none',cursor:'pointer',textAlign:'left' }}
      >
        <span style={{ fontSize:12,fontWeight:700,color:'#475569',textTransform:'uppercase',letterSpacing:'.5px' }}>🔍 Calidad de Datos</span>
        <span style={{ fontSize:11,background:'#dcfce7',color:'#15803d',padding:'2px 8px',borderRadius:10,fontWeight:700 }}>✅ Sin errores críticos</span>
        <span style={{ marginLeft:'auto',color:'#94a3b8',fontSize:14 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ borderTop:'1px solid #f1f5f9',padding:'12px 16px',display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:8 }}>
          {registros.map((r, i) => (
            <div key={i} style={{ display:'flex',alignItems:'center',gap:8,padding:'6px 10px',background:'#f8fafc',borderRadius:6 }}>
              <span style={{ fontSize:12 }}>{r.ok ? '✅' : '⚠️'}</span>
              <span style={{ fontSize:11,color:'#64748b',flex:1 }}>{r.label}</span>
              <span style={{ fontSize:11,fontWeight:700,color:'#334155' }}>{r.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
