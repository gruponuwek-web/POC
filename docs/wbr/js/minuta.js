function abrirMinuta(sid) {
  const ses    = _getSesionData(sid)
  const vendedores = state.equipo.filter(m => m.Rol !== 'Coordinador')

  const contenido = vendedores.map(v => {
    const cal  = ses.califs.find(c => c.Vendedor === v.Nombre)
    const desc = ses.descs.find(d => d.Vendedor === v.Nombre)
    const acts = ses.acts.filter(a => a.Vendedor === v.Nombre)
    const kpisRol = state.kpis[v.Rol] || []
    const pct  = cal ? Math.round(parseFloat(cal.Pct_Cumplimiento) * 100) : null

    const kpiRows = kpisRol.map((kpi, i) => {
      const val = cal?.['KPI_' + (i+1)]
      const ok  = val === 'TRUE' || val === true
      return `<tr>
        <td style="padding:5px 8px;border-bottom:1px solid #eee;font-size:13px">${kpi}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #eee;text-align:center;font-size:16px">${ok ? '✅' : '❌'}</td>
      </tr>`
    }).join('')

    const actsHtml = acts.length
      ? acts.map(a => `<div style="padding:6px 0;border-bottom:1px solid #eee;font-size:13px">
          <span style="font-weight:600">${a.Descripcion||'—'}</span>
          <span style="margin-left:8px;font-size:11px;background:#f1f5f9;padding:2px 6px;border-radius:4px">${a.Prioridad}</span>
          <span style="margin-left:4px;font-size:11px;color:#64748b">${fmtDate(a.Fecha_Compromiso)}</span>
          ${a.Cliente ? `<div style="font-size:12px;color:#64748b">Cliente: ${a.Cliente}</div>` : ''}
        </div>`).join('')
      : '<div style="font-size:13px;color:#94a3b8;padding:6px 0">Sin acciones registradas</div>'

    return `
      <div style="border:1px solid #e2e8f0;border-radius:8px;margin-bottom:16px;overflow:hidden">
        <div style="background:#0f1f3d;padding:10px 16px;display:flex;align-items:center;justify-content:space-between">
          <div style="color:#fff;font-weight:700;font-size:14px">${v.Nombre}</div>
          <div style="color:rgba(255,255,255,.7);font-size:12px">${v.Rol} · ${pct !== null ? pct + '%' : '—'}</div>
        </div>
        <div style="padding:14px 16px">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#94a3b8;margin-bottom:8px">KPIs</div>
          <table style="width:100%;border-collapse:collapse;margin-bottom:12px">${kpiRows}</table>
          ${desc ? `
            <div style="background:#fffbeb;border-left:3px solid #f59e0b;padding:10px 12px;border-radius:0 6px 6px 0;margin-bottom:12px">
              <div style="font-size:11px;font-weight:700;color:#92400e;margin-bottom:4px">DESCUBRIMIENTO</div>
              <div style="font-size:13px;color:#78350f">${desc.Descubrimiento}</div>
            </div>` : ''}
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#94a3b8;margin-bottom:8px">ACCIONES</div>
          ${actsHtml}
        </div>
      </div>`
  }).join('')

  const overlay = document.createElement('div')
  overlay.id = 'minutaOverlay'
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;overflow-y:auto;padding:30px 20px'
  overlay.innerHTML = `
    <div style="max-width:780px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,.2)">
      <div style="background:#0f1f3d;padding:20px 28px;display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="color:#4da3ff;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase">WBR Portal</div>
          <div style="color:#fff;font-size:20px;font-weight:800;margin-top:4px">Minuta de Sesión</div>
          <div style="color:rgba(255,255,255,.6);font-size:13px;margin-top:2px">
            ${ses.sid} · Semana ${ses.semana} · ${fmtDate(ses.fecha)}
          </div>
        </div>
        <div style="display:flex;gap:8px">
          <button onclick="window.print()" style="padding:8px 14px;border-radius:6px;border:1px solid rgba(255,255,255,.3);background:transparent;color:#fff;cursor:pointer;font-size:13px">🖨️ Imprimir</button>
          <button onclick="document.getElementById('minutaOverlay').remove()" style="padding:8px 14px;border-radius:6px;border:1px solid rgba(255,255,255,.3);background:transparent;color:#fff;cursor:pointer;font-size:13px">✕ Cerrar</button>
        </div>
      </div>
      <div style="padding:24px 28px" id="minutaBody">${contenido}</div>
    </div>`
  document.body.appendChild(overlay)
}

function _getSesionData(sid) {
  return {
    sid,
    fecha:  state.calificaciones.find(c => c.ID_Sesion === sid)?.Fecha || '',
    semana: state.calificaciones.find(c => c.ID_Sesion === sid)?.Semana || '',
    califs: state.calificaciones.filter(c => c.ID_Sesion === sid),
    acts:   state.acciones.filter(a => a.ID_Sesion === sid),
    descs:  state.descubrimientos.filter(d => d.ID_Sesion === sid)
  }
}
