import React, { useState } from 'react'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

// Colores del sistema Intel Comercial
// Verde: #22c55e · Ámbar: #f59e0b · Rojo: #ef4444 · Azul: #1a6cf0 · Navy: #0f1f3d
const PERSPECTIVAS = [
  {
    id: 'ventas', nombre: 'Incrementar ventas',
    icon: '💰', hdrColor: '#0f1f3d', hdrBg: '#eff6ff',
    kpis: [
      { cod:'2.1a', desc:'Crecimiento de ventas en el periodo', unidad:'%', peso:25,  meta:'15.00%',     actual:'25.02%',     peor:'-6.24%',     ratio:100   },
      { cod:'2.1b', desc:'Meta alcanzada',                      unidad:'%', peso:25,  meta:'$4,890,000', actual:'$4,832,083', peor:'$3,226,745', ratio:98.82 },
      { cod:'2.1c', desc:'Ticket promedio',                     unidad:'$', peso:7.5, meta:'$600',       actual:'$5,878',     peor:'$4,808',     ratio:100   },
      { cod:'2.1d', desc:'Clientes con incremento de ticket',   unidad:'#', peso:10,  meta:'95',         actual:'294',        peor:'70',         ratio:100   },
      { cod:'2.1e', desc:'Primer ticket de cliente nuevo',      unidad:'$', peso:7.5, meta:'$3,000',     actual:'$5,286',     peor:'$500',       ratio:100   },
      { cod:'2.1f', desc:'Tickets únicos atendidos',            unidad:'#', peso:10,  meta:'840',        actual:'821',        peor:'707',        ratio:97.74 },
    ]
  },
  {
    id: 'productos', nombre: 'Estrategia de venta por productos',
    icon: '🏷️', hdrColor: '#1a3a6e', hdrBg: '#f0f7ff',
    kpis: [
      { cod:'3.1a', desc:'Promociones aplicadas', unidad:'#', peso:14, meta:null, actual:null, peor:null, ratio:null },
      { cod:'3.1b', desc:'Venta por promociones', unidad:'%', peso:14, meta:null, actual:null, peor:null, ratio:null },
    ]
  },
  {
    id: 'clientes', nombre: 'Incrementar clientes',
    icon: '👥', hdrColor: '#1a6cf0', hdrBg: '#eff6ff',
    kpis: [
      { cod:'4.1a', desc:'Clientes perdidos',              unidad:'#', peso:11, meta:'9',   actual:'6',      peor:'24',  ratio:100   },
      { cod:'4.1b', desc:'Visitas de atención a clientes', unidad:'#', peso:11, meta:null,  actual:'3',      peor:null,  ratio:null  },
      { cod:'4.2a', desc:'Cobertura de cartera total',     unidad:'%', peso:11, meta:'55%', actual:'50.79%', peor:'45%', ratio:92.35 },
      { cod:'4.2b', desc:'Cobertura de clientes nuevos',   unidad:'%', peso:11, meta:null,  actual:'33.53%', peor:null,  ratio:null  },
      { cod:'4.3a', desc:'Nuevos clientes',                unidad:'#', peso:11, meta:'25',  actual:'16',     peor:null,  ratio:64    },
      { cod:'4.3b', desc:'Clientes recuperados',           unidad:'#', peso:11, meta:null,  actual:'4',      peor:null,  ratio:null  },
    ]
  },
  {
    id: 'entregas', nombre: 'Calidad de entregas',
    icon: '📦', hdrColor: '#0f1f3d', hdrBg: '#f0f7ff',
    kpis: [
      { cod:'5.1b', desc:'Cantidad de incidencias', unidad:'#', peso:33.33, meta:null, actual:'11', peor:null, ratio:null },
    ]
  },
  {
    id: 'oportunidades', nombre: 'Nuevas oportunidades off-line',
    icon: '🎯', hdrColor: '#1a3a6e', hdrBg: '#eff6ff',
    kpis: [
      { cod:'7.1a', desc:'Tasa de conversión off-line', unidad:'%', peso:25, meta:null, actual:null, peor:null, ratio:null },
      { cod:'7.1b', desc:'Cotizaciones realizadas',     unidad:'#', peso:25, meta:null, actual:null, peor:null, ratio:null },
      { cod:'7.1c', desc:'Visitas realizadas',          unidad:'#', peso:25, meta:null, actual:null, peor:null, ratio:null },
      { cod:'7.1d', desc:'Leads generados',             unidad:'#', peso:25, meta:null, actual:null, peor:null, ratio:null },
    ]
  },
]

// ── Helpers ─────────────────────────────────────────────────────
function calKpi(kpi) {
  if (kpi.ratio === null || kpi.ratio === undefined) return 0
  return Math.min(kpi.ratio, 100) / 100 * kpi.peso
}

function perspScore(persp) {
  const sumCal  = persp.kpis.reduce((s, k) => s + calKpi(k), 0)
  const sumPeso = persp.kpis.reduce((s, k) => s + k.peso, 0)
  return sumPeso > 0 ? (sumCal / sumPeso) * 100 : 0
}

function statusOf(ratio) {
  if (ratio === null || ratio === undefined) return 'sin-dato'
  if (ratio >= 100) return 'meta'
  if (ratio >= 70)  return 'seguimiento'
  return 'alerta'
}

const STATUS_CFG = {
  'meta':        { dot:'#22c55e', bg:'#dcfce7', color:'#15803d', label:'En meta',        icon:'●' },
  'seguimiento': { dot:'#f59e0b', bg:'#fef3c7', color:'#92400e', label:'En seguimiento', icon:'◐' },
  'alerta':      { dot:'#ef4444', bg:'#fee2e2', color:'#b91c1c', label:'Alerta',         icon:'○' },
  'sin-dato':    { dot:'#94a3b8', bg:'#f1f5f9', color:'#475569', label:'Sin dato',       icon:'○' },
}

// ── Gauge SVG ───────────────────────────────────────────────────
function Gauge({ value }) {
  const pct    = Math.min(Math.max(value, 0), 100) / 100
  const R      = 40
  const cx     = 55
  const cy     = 52
  const start  = Math.PI               // 180° left
  const sweep  = Math.PI               // 180° arc
  const angle  = start + sweep * pct
  const x1     = cx + R * Math.cos(start)
  const y1     = cy + R * Math.sin(start)
  const x2     = cx + R * Math.cos(angle)
  const y2     = cy + R * Math.sin(angle)
  const largeArc = pct > 0.5 ? 1 : 0
  const color  = value >= 80 ? '#22c55e' : value >= 55 ? '#f59e0b' : '#ef4444'

  return (
    <svg viewBox="0 0 110 58" style={{ width:180, display:'block', margin:'0 auto' }}>
      {/* Track */}
      <path d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
        fill="none" stroke="#e2e8f0" strokeWidth="9" strokeLinecap="round" />
      {/* Fill */}
      {pct > 0 && (
        <path d={`M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2}`}
          fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" />
      )}
      {/* Needle dot */}
      <circle cx={x2} cy={y2} r="4" fill={color} />
      {/* Value */}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="17" fontWeight="800" fill={color}
        style={{ fontFamily:'system-ui,sans-serif' }}>
        {value.toFixed(1)}%
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize="7.5" fill="#64748b"
        style={{ fontFamily:'system-ui,sans-serif', fontWeight:600, letterSpacing:'.5px' }}>
        SCORE BSC
      </text>
    </svg>
  )
}

// ── Mini progress bar ────────────────────────────────────────────
function MiniBar({ value, max=100, color }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
      <div style={{ flex:1, height:5, background:'#e2e8f0', borderRadius:3, overflow:'hidden' }}>
        <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:3, transition:'width .5s' }} />
      </div>
      <span style={{ fontSize:11, fontWeight:700, color, fontVariantNumeric:'tabular-nums', minWidth:32 }}>
        {value.toFixed(0)}%
      </span>
    </div>
  )
}

// ── Componente principal ─────────────────────────────────────────
const ALL_KPIS = PERSPECTIVAS.flatMap(p => p.kpis)

export default function BalancedScorecard() {
  const [mes, setMes] = useState(3)
  const [expandida, setExpandida] = useState(null)

  const totalPeso  = ALL_KPIS.reduce((s, k) => s + k.peso, 0)
  const totalCal   = ALL_KPIS.reduce((s, k) => s + calKpi(k), 0)
  const totalScore = totalPeso > 0 ? (totalCal / totalPeso) * 100 : 0

  const enMeta       = ALL_KPIS.filter(k => k.ratio !== null && k.ratio >= 100).length
  const enSeguim     = ALL_KPIS.filter(k => k.ratio !== null && k.ratio >= 70 && k.ratio < 100).length
  const enAlerta     = ALL_KPIS.filter(k => k.ratio === null || k.ratio < 70).length
  const scoreColor   = totalScore >= 80 ? '#22c55e' : totalScore >= 55 ? '#f59e0b' : '#ef4444'

  // KPIs críticos para panel de atención
  const criticos = PERSPECTIVAS.flatMap(p =>
    p.kpis.filter(k => statusOf(k.ratio) === 'alerta' || statusOf(k.ratio) === 'sin-dato')
      .map(k => ({ ...k, perspNombre: p.nombre, perspColor: p.hdrColor }))
  ).slice(0, 5)

  return (
    <div style={{ padding:'20px 24px 48px', maxWidth:1440, margin:'0 auto', fontFamily:'system-ui,sans-serif' }}>

      {/* ── Encabezado ───────────────────────────────────────── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, gap:12, flexWrap:'wrap' }}>
        <div>
          <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:'#0f1f3d', letterSpacing:'-.3px' }}>⚖️ Balanced Scorecard</h2>
          <p style={{ margin:'3px 0 0', color:'#64748b', fontSize:12.5 }}>
            Desempeño comercial por perspectiva · Datos de ejemplo — se conectarán a Google Sheets
          </p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <label style={{ fontSize:12, color:'#64748b', fontWeight:600 }}>Mes</label>
          <select value={mes} onChange={e => setMes(Number(e.target.value))}
            style={{ padding:'7px 14px', borderRadius:8, border:'1.5px solid #e2e8f0', fontSize:13, color:'#1e293b', background:'#fff', cursor:'pointer', fontWeight:600 }}>
            {MESES.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* ── Panel superior: Gauge + perspectivas + alertas ──── */}
      <div style={{ display:'grid', gridTemplateColumns:'200px 1fr 260px', gap:16, marginBottom:20, alignItems:'start' }}>

        {/* Gauge */}
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, padding:'18px 12px 14px', boxShadow:'0 1px 4px rgba(0,0,0,.06)', textAlign:'center' }}>
          <Gauge value={totalScore} />
          <div style={{ display:'flex', justifyContent:'center', gap:16, marginTop:10 }}>
            {[
              { val:enMeta,   color:'#22c55e', label:'Meta'   },
              { val:enSeguim, color:'#f59e0b', label:'Seg.'   },
              { val:enAlerta, color:'#ef4444', label:'Alerta' },
            ].map(s => (
              <div key={s.label} style={{ textAlign:'center' }}>
                <div style={{ fontSize:18, fontWeight:800, color:s.color }}>{s.val}</div>
                <div style={{ fontSize:10, color:'#94a3b8', fontWeight:600, letterSpacing:'.4px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Cards por perspectiva */}
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {PERSPECTIVAS.map(p => {
            const score = perspScore(p)
            const color = score >= 80 ? '#22c55e' : score >= 55 ? '#f59e0b' : '#ef4444'
            const kpisOk  = p.kpis.filter(k => k.ratio !== null && k.ratio >= 100).length
            const kpisTot = p.kpis.length
            return (
              <div key={p.id}
                onClick={() => setExpandida(prev => prev === p.id ? null : p.id)}
                style={{ background:'#fff', border:`1px solid ${p.hdrBg}`, borderLeft:`4px solid ${p.hdrColor}`,
                  borderRadius:10, padding:'10px 16px', cursor:'pointer', transition:'box-shadow .15s',
                  boxShadow:'0 1px 3px rgba(0,0,0,.05)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:15 }}>{p.icon}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                      <span style={{ fontWeight:700, fontSize:12.5, color:'#1e293b' }}>{p.nombre}</span>
                      <span style={{ fontSize:11, color:'#94a3b8', fontWeight:500 }}>{kpisOk}/{kpisTot} KPIs en meta</span>
                    </div>
                    <MiniBar value={score} color={color} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Panel alertas */}
        <div style={{ background:'#fff', border:'1px solid #fca5a5', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
          <div style={{ background:'#ef4444', padding:'10px 16px', display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:14 }}>⚠️</span>
            <span style={{ color:'#fff', fontWeight:700, fontSize:13 }}>Requieren atención</span>
            <span style={{ marginLeft:'auto', background:'rgba(255,255,255,.2)', color:'#fff', fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:10 }}>{criticos.length}</span>
          </div>
          <div style={{ padding:'8px 0' }}>
            {criticos.length === 0
              ? <p style={{ padding:'12px 16px', color:'#16a34a', fontSize:13, fontWeight:600, margin:0 }}>✓ Sin alertas activas</p>
              : criticos.map(k => (
                <div key={k.cod} style={{ padding:'8px 16px', borderBottom:'1px solid #f1f5f9' }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#1e293b', marginBottom:2 }}>{k.desc}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontSize:10, color:'#fff', background:k.perspColor, padding:'1px 7px', borderRadius:4, fontWeight:600 }}>{k.cod}</span>
                    <span style={{ fontSize:11, color:'#94a3b8' }}>{k.perspNombre}</span>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div>

      {/* ── Tabla detallada ──────────────────────────────────── */}
      <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,.07)' }}>

        {/* Cabecera tabla */}
        <div style={{ background:'#0f1f3d', padding:'0' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11.5 }}>
            <thead>
              <tr>
                {[
                  ['Perspectiva / KPI',    'left',   180, true ],
                  ['Cód.',                 'center',  52, false],
                  ['Descripción',          'left',   200, true ],
                  ['Meta',                 'center', 100, false],
                  ['Desempeño actual',     'center', 115, false],
                  ['Peor de los casos',    'center', 110, false],
                  ['vs Meta',              'center',  95, false],
                  ['Peso',                 'center',  70, false],
                  ['Calificación',         'center', 120, false],
                ].map(([label, align, w, pad]) => (
                  <th key={label} style={{ padding: pad ? '10px 14px' : '10px 8px', textAlign:align, color:'rgba(255,255,255,.85)',
                    fontWeight:700, letterSpacing:'.3px', whiteSpace:'nowrap', width:w, fontSize:11 }}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
          </table>
        </div>

        {/* Body */}
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <tbody>
              {PERSPECTIVAS.map(persp => {
                const pScore   = perspScore(persp)
                const pCal     = persp.kpis.reduce((s, k) => s + calKpi(k), 0)
                const pPeso    = persp.kpis.reduce((s, k) => s + k.peso, 0)
                const pColor   = pScore >= 80 ? '#22c55e' : pScore >= 55 ? '#f59e0b' : '#ef4444'

                return (
                  <React.Fragment key={persp.id}>
                    {persp.kpis.map((kpi, ki) => {
                      const st      = statusOf(kpi.ratio)
                      const cfg     = STATUS_CFG[st]
                      const kpiCal  = calKpi(kpi)
                      const isFirst = ki === 0
                      const isLast  = ki === persp.kpis.length - 1

                      return (
                        <tr key={kpi.cod}
                          style={{ borderBottom:`1px solid ${isLast ? '#cbd5e1' : '#f1f5f9'}`,
                            background: ki % 2 === 0 ? '#fafafa' : '#fff',
                            transition:'background .1s' }}
                          onMouseEnter={e => e.currentTarget.style.background='#f0f7ff'}
                          onMouseLeave={e => e.currentTarget.style.background = ki % 2 === 0 ? '#fafafa' : '#fff'}>

                          {/* Perspectiva (rowspan) */}
                          {isFirst && (
                            <td rowSpan={persp.kpis.length}
                              style={{ padding:'0 10px', verticalAlign:'middle', textAlign:'center', width:180,
                                background:persp.hdrBg, borderLeft:`4px solid ${persp.hdrColor}` }}>
                              <div style={{ fontSize:13, fontWeight:700, color:persp.hdrColor, lineHeight:1.3 }}>
                                {persp.icon} {persp.nombre}
                              </div>
                            </td>
                          )}

                          {/* Código */}
                          <td style={{ padding:'10px 8px', textAlign:'center', width:52 }}>
                            <span style={{ fontSize:11, fontWeight:700, color:'#475569', fontFamily:'monospace',
                              background:'#f1f5f9', padding:'2px 6px', borderRadius:4 }}>
                              {kpi.cod}
                            </span>
                          </td>

                          {/* Descripción */}
                          <td style={{ padding:'10px 14px', color:'#1e293b', fontSize:12.5, minWidth:200 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                              <span style={{ width:8, height:8, borderRadius:'50%', background:cfg.dot, flexShrink:0 }} />
                              {kpi.desc}
                              <span style={{ fontSize:10, color:'#94a3b8', flexShrink:0 }}>({kpi.unidad})</span>
                            </div>
                          </td>

                          {/* Meta */}
                          <td style={{ padding:'10px 10px', textAlign:'center', color:'#475569', fontVariantNumeric:'tabular-nums', fontSize:12.5, width:100 }}>
                            {kpi.meta ?? <span style={{ color:'#cbd5e1' }}>—</span>}
                          </td>

                          {/* Actual */}
                          <td style={{ padding:'10px 10px', textAlign:'center', fontWeight:700, fontVariantNumeric:'tabular-nums', fontSize:13, width:115,
                            color: kpi.actual ? '#0f172a' : '#cbd5e1' }}>
                            {kpi.actual ?? '—'}
                          </td>

                          {/* Peor caso */}
                          <td style={{ padding:'10px 10px', textAlign:'center', color:'#94a3b8', fontVariantNumeric:'tabular-nums', fontSize:12, width:110 }}>
                            {kpi.peor ?? <span style={{ color:'#e2e8f0' }}>—</span>}
                          </td>

                          {/* vs Meta (badge color) */}
                          <td style={{ padding:'10px 10px', textAlign:'center', width:95 }}>
                            <span style={{ display:'inline-block', padding:'4px 10px', borderRadius:6,
                              background:cfg.bg, color:cfg.color, fontWeight:700, fontSize:12,
                              fontVariantNumeric:'tabular-nums', minWidth:64, textAlign:'center' }}>
                              {kpi.ratio !== null ? kpi.ratio.toFixed(2) + '%' : '0.00%'}
                            </span>
                          </td>

                          {/* Peso */}
                          <td style={{ padding:'10px 10px', textAlign:'center', color:'#64748b', fontSize:12, width:70, fontVariantNumeric:'tabular-nums' }}>
                            {kpi.peso.toFixed(1)}%
                          </td>

                          {/* Calificación con mini-barra */}
                          <td style={{ padding:'10px 14px', width:120 }}>
                            <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                                <span style={{ fontSize:12, fontWeight:700, color: kpiCal > 0 ? cfg.color : '#cbd5e1', fontVariantNumeric:'tabular-nums' }}>
                                  {kpiCal.toFixed(1)}%
                                </span>
                                <span style={{ fontSize:10, color:'#94a3b8' }}>/{kpi.peso.toFixed(0)}%</span>
                              </div>
                              <div style={{ height:4, background:'#f1f5f9', borderRadius:2 }}>
                                <div style={{ height:'100%', width:`${kpi.peso > 0 ? (kpiCal/kpi.peso)*100 : 0}%`,
                                  background:cfg.dot, borderRadius:2, transition:'width .5s' }} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      )
                    })}

                    {/* Subtotal perspectiva */}
                    <tr style={{ background:persp.hdrBg, borderBottom:'2px solid #94a3b8' }}>
                      <td style={{ padding:'8px 14px', borderLeft:`4px solid ${persp.hdrColor}` }}>
                        <span style={{ fontSize:11.5, fontWeight:800, color:persp.hdrColor, letterSpacing:'.2px' }}>
                          Subtotal — {persp.nombre}
                        </span>
                      </td>
                      <td colSpan={5} />
                      <td style={{ padding:'8px 10px', textAlign:'center' }}>
                        <span style={{ fontSize:12, fontWeight:700, color:pColor,
                          background:'#fff', padding:'3px 10px', borderRadius:6, border:`1px solid ${pColor}` }}>
                          {pScore.toFixed(1)}%
                        </span>
                      </td>
                      <td style={{ padding:'8px 10px', textAlign:'center', fontSize:12, fontWeight:700, color:persp.hdrColor, fontVariantNumeric:'tabular-nums' }}>
                        {pPeso.toFixed(1)}%
                      </td>
                      <td style={{ padding:'8px 14px' }}>
                        <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                          <span style={{ fontSize:13, fontWeight:800, color:pColor, fontVariantNumeric:'tabular-nums' }}>
                            {pCal.toFixed(1)}%
                          </span>
                          <div style={{ height:4, background:'rgba(0,0,0,.08)', borderRadius:2 }}>
                            <div style={{ height:'100%', width:`${(pCal/pPeso)*100}%`, background:pColor, borderRadius:2 }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                )
              })}

              {/* Total final */}
              <tr style={{ background:'#0f1f3d' }}>
                <td colSpan={6} style={{ padding:'13px 18px', textAlign:'right', color:'rgba(255,255,255,.6)', fontWeight:600, fontSize:12, letterSpacing:'.5px' }}>
                  SCORE TOTAL BALANCED SCORECARD · {MESES[mes - 1].toUpperCase()} 2026
                </td>
                <td style={{ padding:'13px 10px', textAlign:'center' }}>
                  <span style={{ color:'#fff', fontWeight:700, fontSize:13,
                    background:'rgba(255,255,255,.12)', padding:'4px 12px', borderRadius:6 }}>
                    {((totalCal / totalPeso) * 100).toFixed(1)}%
                  </span>
                </td>
                <td style={{ padding:'13px 10px', textAlign:'center', color:'rgba(255,255,255,.5)', fontWeight:600, fontSize:12 }}>100%</td>
                <td style={{ padding:'13px 14px' }}>
                  <span style={{ fontSize:20, fontWeight:900,
                    color: totalScore >= 80 ? '#4ade80' : totalScore >= 55 ? '#fbbf24' : '#f87171',
                    fontVariantNumeric:'tabular-nums' }}>
                    {totalCal.toFixed(1)}%
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <p style={{ marginTop:10, fontSize:11, color:'#94a3b8', textAlign:'right' }}>
        * Datos de ejemplo para validación de estructura. Los valores reales se conectarán a Google Sheets en la siguiente fase.
      </p>
    </div>
  )
}
