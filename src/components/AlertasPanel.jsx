import React, { useState } from 'react'

const TIPO_STYLE = {
  danger: { icon:'🔴', bg:'#fff5f5', border:'#fecaca', color:'#b91c1c' },
  warning: { icon:'⚠️', bg:'#fffbeb', border:'#fde68a', color:'#a16207' },
  info: { icon:'💡', bg:'#eff6ff', border:'#bfdbfe', color:'#1d4ed8' },
  success: { icon:'✅', bg:'#f0fdf4', border:'#bbf7d0', color:'#15803d' },
}

export default function AlertasPanel({ alertas }) {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? alertas : alertas.slice(0, 5)

  return (
    <div style={{ background:'#fff',borderRadius:10,padding:'16px',border:'1.5px solid #e2e8f0',boxShadow:'0 1px 4px rgba(0,0,0,.05)' }}>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12 }}>
        <span style={{ fontSize:12,fontWeight:700,color:'#0f1f3d',textTransform:'uppercase',letterSpacing:'.4px' }}>🔔 Alertas y Oportunidades</span>
        <span style={{ fontSize:11,background:'#fee2e2',color:'#b91c1c',padding:'2px 8px',borderRadius:10,fontWeight:700 }}>{alertas.length}</span>
      </div>

      <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
        {visible.map((a, i) => {
          const s = TIPO_STYLE[a.tipo] || TIPO_STYLE.info
          return (
            <div key={i} style={{ background:s.bg,border:`1.5px solid ${s.border}`,borderRadius:8,padding:'10px 12px',display:'flex',gap:10,alignItems:'flex-start' }}>
              <span style={{ fontSize:14,flexShrink:0,marginTop:1 }}>{s.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:10,fontWeight:700,color:s.color,textTransform:'uppercase',letterSpacing:'.4px',marginBottom:3 }}>{a.categoria}</div>
                <div style={{ fontSize:12,color:'#334155',lineHeight:1.4 }}>{a.mensaje}</div>
                {a.accion && <div style={{ fontSize:11,color:s.color,marginTop:4,fontStyle:'italic' }}>→ {a.accion}</div>}
              </div>
            </div>
          )
        })}
      </div>

      {alertas.length > 5 && (
        <button onClick={() => setShowAll(v => !v)} style={{ marginTop:10,width:'100%',padding:'7px',borderRadius:6,border:'1.5px solid #e2e8f0',background:'#f8fafc',fontSize:11,fontWeight:600,color:'#475569',cursor:'pointer' }}>
          {showAll ? 'Mostrar menos' : `Ver ${alertas.length - 5} más`}
        </button>
      )}
    </div>
  )
}
