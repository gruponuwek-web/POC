import React from 'react'

export default function TopNav({ activeModule, onModule, lastUpdate, session, onLogout }) {
  const tabs = [
    { id: 'dashboard', label: '📊 Dashboard Táctico', active: true },
    { id: 'wbr', label: '📅 WBR' },
    { id: 'scorecard', label: '⚖️ Balanced Scorecard' },
  ]

  return (
    <nav style={{
      background: 'linear-gradient(135deg, #0f1f3d 0%, #1a3a6e 100%)',
      borderBottom: '3px solid #1a6cf0',
      position: 'sticky', top: 0, zIndex: 200,
      boxShadow: '0 2px 12px rgba(0,0,0,.25)'
    }}>
      <div style={{ maxWidth: 1600, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', height: 56, gap: 24 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: '.5px' }}>
            INTEL<span style={{ color: '#4da3ff' }}>COMERCIAL</span>
          </div>
          <div style={{ fontSize: 10, color: '#4da3ff', letterSpacing: '.4px' }}>Inteligencia de Negocios</div>
        </div>

        <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,.15)', marginLeft: 4 }} />

        <div style={{ display: 'flex', gap: 4, flex: 1 }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => onModule(t.id)}
              style={{
                padding: '6px 16px',
                borderRadius: '6px 6px 0 0',
                border: '1px solid',
                borderBottom: 'none',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all .15s',
                position: 'relative',
                borderColor: activeModule === t.id ? 'rgba(255,255,255,.2)' : 'transparent',
                background: activeModule === t.id ? 'rgba(255,255,255,.12)' : 'transparent',
                color: activeModule === t.id ? '#fff' : (t.soon ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.6)'),
              }}
            >
              {t.label}
              {t.soon && (
                <span style={{
                  position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)',
                  background: '#f59e0b', color: '#fff', fontSize: 9, padding: '2px 6px',
                  borderRadius: 4, whiteSpace: 'nowrap', fontWeight: 700
                }}>Próximamente</span>
              )}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 7, height: 7, background: '#22c55e', borderRadius: '50%', display: 'inline-block' }} />
            Actualización: {lastUpdate || '—'}
          </div>
          {session && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{session.nombre}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,.45)' }}>{session.rol}</div>
              </div>
              <button onClick={onLogout} style={{
                background: 'rgba(255,255,255,.1)',
                border: '1px solid rgba(255,255,255,.2)',
                borderRadius: 6,
                color: 'rgba(255,255,255,.7)',
                fontSize: 11,
                fontWeight: 600,
                padding: '4px 10px',
                cursor: 'pointer',
              }}>
                Salir
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
