import React, { useState } from 'react'

export default function InfoTip({ text, light = false }) {
  const [show, setShow] = useState(false)
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <span
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        style={{ cursor: 'help', color: light ? 'rgba(255,255,255,.6)' : '#94a3b8', fontSize: 11, lineHeight: 1, marginLeft: 4 }}
      >ⓘ</span>
      {show && (
        <div style={{
          position: 'absolute', top: 20, left: 0, zIndex: 999,
          background: '#0f1f3d', color: '#fff', fontSize: 11,
          padding: '8px 12px', borderRadius: 8, width: 240, lineHeight: 1.5,
          boxShadow: '0 8px 24px rgba(0,0,0,.25)', pointerEvents: 'none', whiteSpace: 'normal',
          textTransform: 'none', letterSpacing: 0, fontWeight: 400
        }}>{text}</div>
      )}
    </span>
  )
}
