import React from 'react'
import { fmt } from '../utils/format.js'

export default function LecturaTactica({ hallazgos, resumen: r }) {
  return (
    <div style={{
      background:'linear-gradient(135deg, #0f1f3d 0%, #1a3a6e 100%)',
      borderRadius:10, padding:'16px 20px', color:'#fff',
      boxShadow:'0 1px 4px rgba(0,0,0,.1)'
    }}>
      <div style={{ fontSize:12,fontWeight:700,color:'#4da3ff',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:12 }}>
        📝 Lectura Táctica del Periodo
      </div>
      <div style={{ display:'flex',flexDirection:'column',gap:0 }}>
        {(hallazgos || []).map((h, i) => (
          <div key={i} style={{ display:'flex',alignItems:'flex-start',gap:10,padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,.08)' }}>
            <span style={{ color:'#fcd34d',fontWeight:800,fontSize:14,width:22,flexShrink:0,lineHeight:1.4 }}>{i + 1}</span>
            <div style={{ fontSize:12.5,color:'rgba(255,255,255,.9)',lineHeight:1.5 }}>{h}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop:14,paddingTop:12,borderTop:'1px solid rgba(255,255,255,.1)',display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
        <Stat label="Venta Total" value={fmt.moneda(r.total_venta_2026)} />
        <Stat label="Cumplimiento" value={fmt.pct(r.cumplimiento_pct)} />
        <Stat label="Margen" value={fmt.pct(r.margen_pct)} />
        <Stat label="Ticket Prom." value={fmt.moneda(r.ticket_promedio)} />
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div style={{ background:'rgba(255,255,255,.07)',borderRadius:7,padding:'8px 12px' }}>
      <div style={{ fontSize:10,color:'rgba(255,255,255,.5)',fontWeight:600,textTransform:'uppercase',letterSpacing:'.4px',marginBottom:3 }}>{label}</div>
      <div style={{ fontSize:16,fontWeight:800,color:'#fff' }}>{value}</div>
    </div>
  )
}
