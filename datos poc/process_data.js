const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

// ── Configuración Google Sheets ──────────────────────────────────────────────
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');

// ── Años de comparación ── cambiar estas 2 constantes cada año nuevo ──────────
const AÑO_ACTUAL   = 2026;  // año en curso (ventas activas)
const AÑO_ANTERIOR = 2025;  // año previo para comparación YoY


const SHEETS = {
  // Al pasar a 2027: mover el ID de ventasActual → ventasAnterior y agregar el ID de ventas 2027
  ventasAnterior: { id: '1R0LRR6bUkWdxSffs49_wJBMwmSyhjLKGpDELRjws1ac', range: 'A:AZ' },
  ventasActual:   { id: '1RQfTkYvOL_sGbPcMjEUEmbJmmWqWJbaxC-T0nW6umbI', range: 'A:AZ' },
  metas:              { id: '1F9vgcHfA20dIm6caUZmH756fgSn562lCqoC0GdqgNRc', range: 'metas!A:Z' },
  cartera:            { id: '1F9vgcHfA20dIm6caUZmH756fgSn562lCqoC0GdqgNRc', range: 'cartera!A:Z' },
  clientesNR:         { id: '1F9vgcHfA20dIm6caUZmH756fgSn562lCqoC0GdqgNRc', range: 'clientes_nuevos_recuperados!A:Z' },
  estratVentasProductos: { id: '1F9vgcHfA20dIm6caUZmH756fgSn562lCqoC0GdqgNRc', range: 'Estrate_Ventas_Productos!A:Z' },
  visitasAtencion:       { id: '1F9vgcHfA20dIm6caUZmH756fgSn562lCqoC0GdqgNRc', range: 'visitas_atencion!A:Z' },
  incidencias:           { id: '1F9vgcHfA20dIm6caUZmH756fgSn562lCqoC0GdqgNRc', range: 'incidencias!A:Z' },
  oportunidadesOffline:  { id: '1F9vgcHfA20dIm6caUZmH756fgSn562lCqoC0GdqgNRc', range: 'oportunidades_offline!A:Z' },
  bscMetasPeor:          { id: '1F9vgcHfA20dIm6caUZmH756fgSn562lCqoC0GdqgNRc', range: 'bsc_metas_peor!A:Z' },
};

const outDir = path.join(__dirname, '..', 'src', 'data');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// ── Google Sheets reader ─────────────────────────────────────────────────────
async function getSheetData(sheets, sheetId, range) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range,
    valueRenderOption: 'UNFORMATTED_VALUE',  // fechas llegan como serial numérico → sin ambigüedad DD/MM vs MM/DD
  });
  const rows = res.data.values || [];
  if (rows.length < 2) return [];
  const headers = rows[0].map(h => String(h).trim());
  return rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (row[i] !== undefined ? String(row[i]).trim() : ''); });
    return obj;
  }).filter(r => Object.values(r).some(v => v !== ''));
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function parseNum(v) {
  if (!v) return 0;
  const n = parseFloat(String(v).replace(/[$,\s]/g, ''));
  return isNaN(n) ? 0 : n;
}

function parseDate(v) {
  if (!v) return null;
  v = v.trim();
  let d;
  // Serial numérico de Google Sheets (días desde 30-dic-1899) — inequívoco
  const serial = parseFloat(v);
  if (!isNaN(serial) && serial > 20000 && serial < 60000 && !/\//.test(v)) {
    // Convertir serial a componentes UTC y crear fecha local para evitar desfase por zona horaria
    const utc = new Date(Date.UTC(1899, 11, 30) + Math.floor(serial) * 86400000);
    d = new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate());
  } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(v)) {
    // Texto DD/MM/AAAA (fallback si la celda es texto)
    const parts = v.split('/');
    const day = parseInt(parts[0]), mon = parseInt(parts[1]), yr = parseInt(parts[2]);
    d = mon > 12 ? new Date(yr, day - 1, mon) : new Date(yr, mon - 1, day);
  } else {
    d = new Date(v);
  }
  if (!d || isNaN(d.getTime())) return null;
  return d;
}

function normAgent(name) {
  if (!name) return 'SIN AGENTE';
  return name.trim().toUpperCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ');
}

function normClient(name) {
  if (!name) return 'SIN CLIENTE';
  return name.trim().toUpperCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ');
}

// Devuelve la fila de metas más reciente cuya vigencia sea ≤ (targetAño, targetMes)
function getMetaActiva(rows, kpiCod, targetAño, targetMes) {
  const candidates = rows.filter(r =>
    r['kpi_cod'] === kpiCod && (
      parseInt(r['año']) < targetAño ||
      (parseInt(r['año']) === targetAño && parseInt(r['mes_inicio']) <= targetMes)
    )
  );
  if (!candidates.length) return null;
  return candidates.reduce((best, r) => {
    const rA = parseInt(r['año']), rM = parseInt(r['mes_inicio']);
    const bA = parseInt(best['año']), bM = parseInt(best['mes_inicio']);
    return (rA > bA || (rA === bA && rM > bM)) ? r : best;
  });
}

const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// ── Agentes comerciales ──────────────────────────────────────────────────────
const AGENTES_COMERCIALES = new Set([
  'HORTENCIA VILLA',
  'ELIZABETH DIAZ AGUIRRE',
  'EDWIN HERNANDEZ',
  'ADRIANA CASAS PINEDA',
  'VERONICA CRUZ',
  'AMAIRANI GARCIA',
  'ITZEL ZORAIDA HERNANDEZ BARBOSA'
]);

// ── Procesamiento ventas ──────────────────────────────────────────────────────
function processVentas(rows, año) {
  const result = [];
  let skipped = 0;
  rows.forEach((r, idx) => {
    const tipo = (r['TIPO DOCUMENTO'] || '').trim().toUpperCase();
    if (!tipo) { skipped++; return; } // ignorar filas sin tipo de documento
    const fecha = parseDate(r['FECHA']);
    if (!fecha) { skipped++; return; }
    if (fecha.getFullYear() !== año) { skipped++; return; }

    const agNorm = normAgent(r['NOMBRE AGENTE']);
    const cliNorm = normClient(r['NOMBRE CLIENTE']);
    const importe = parseNum(r['IMPORTE']);
    const costo = parseNum(r['COSTO TOTAL']);
    const mesNum = fecha.getMonth() + 1;
    const folio = r['FOLIO'] ? String(r['FOLIO']).trim() : '';
    const letra = r['LETRA'] ? String(r['LETRA']).trim() : '';

    result.push({
      id: `V${año}-${idx}`,
      folio,
      folio_key: `${folio}-${letra}-${r['CLIENTE']}`,
      fecha: fecha.toISOString().split('T')[0],
      año,
      mes_num: mesNum,
      mes_nombre: MESES_ES[mesNum - 1],
      cliente_num: r['CLIENTE'] || '',
      cliente_nombre: cliNorm,
      agente_nombre: AGENTES_COMERCIALES.has(agNorm) ? agNorm : 'SIN AGENTE',
      segmento: r['SEGMENTO'] || '',
      linea: r['DECRIP. LINEA'] || r['DESCRIP. LINEA'] || '',
      importe: Math.abs(importe),
      costo:   Math.abs(costo),
      solo_presencia: false,
      sucursal: r['Sucursal'] || 'Pachuca'
    });
  });
  console.log(`  ${año}: ${result.length} registros válidos, ${skipped} omitidos`);
  return result;
}

// ── Clientes con ticket acumulado > $3,000 por mes ───────────────────────────
function buildClientesSobre3000(ventas) {
  const byMesCli = {};
  ventas.forEach(v => {
    if (v.solo_presencia) return;
    const cli = v.cliente_num || v.cliente_nombre;
    if (!byMesCli[v.mes_num]) byMesCli[v.mes_num] = {};
    byMesCli[v.mes_num][cli] = (byMesCli[v.mes_num][cli] || 0) + v.importe;
  });
  const result = {};
  Object.entries(byMesCli).forEach(([mes, clis]) => {
    result[parseInt(mes)] = Object.values(clis).filter(v => v > 3000).length;
  });
  return result;
}

// ── Ticket promedio de clientes nuevos por mes ────────────────────────────────
// Cruza clientesNR (status=Nuevo, añoActual) con ventas del mismo mes.
// Match primario por cliente_num; fallback por cliente_nombre para los que no tienen ID.
function buildTicketPromedioNuevos(ventasActual, clientesNR, añoActual) {
  // Paso 1: agrupar clientes nuevos por mes — IDs y nombres por separado
  const nuevosPorMes = {};
  clientesNR.filter(c => c.año === añoActual && c.status === 'Nuevo').forEach(c => {
    const id  = (c.cliente_num || '').trim();
    const nom = c.cliente_nombre || '';
    if (!id && !nom) return;
    if (!nuevosPorMes[c.mes_num]) nuevosPorMes[c.mes_num] = { ids: new Set(), nombres: new Set() };
    if (id) nuevosPorMes[c.mes_num].ids.add(id);
    else    nuevosPorMes[c.mes_num].nombres.add(nom);
  });

  // Paso 2: para cada mes, calcular ticket promedio de esos clientes en ventas
  const result = {};
  Object.entries(nuevosPorMes).forEach(([mes, { ids, nombres }]) => {
    const mesNum = parseInt(mes);
    const lineas = ventasActual.filter(v => {
      if (v.mes_num !== mesNum || v.solo_presencia) return false;
      if (v.cliente_num && ids.has(v.cliente_num)) return true;
      if (!v.cliente_num && nombres.has(v.cliente_nombre)) return true;
      return false;
    });
    const totalVentas = lineas.reduce((s, v) => s + v.importe, 0);
    const numTickets  = new Set(lineas.map(v => v.folio_key)).size;
    if (numTickets > 0) result[mesNum] = Math.round(totalVentas / numTickets);
  });
  return result;
}

// ── Cobertura de clientes nuevos por mes ─────────────────────────────────────
// Para cada mes M: cuántos de los nuevos acumulados (meses 1..M) compraron en M
function buildCoberturaNuevosPorMes(ventasActual, clientesNR, añoActual) {
  // Preindexar compradores reales por mes
  const compPorMes = {};
  ventasActual.filter(v => !v.solo_presencia).forEach(v => {
    if (!compPorMes[v.mes_num]) compPorMes[v.mes_num] = { ids: new Set(), nombres: new Set() };
    if (v.cliente_num) compPorMes[v.mes_num].ids.add(v.cliente_num);
    else if (v.cliente_nombre) compPorMes[v.mes_num].nombres.add(v.cliente_nombre);
  });

  // Nuevos del año agrupados por mes de registro
  const nuevosPorMes = {};
  clientesNR.filter(c => c.año === añoActual && c.status === 'Nuevo').forEach(c => {
    if (!nuevosPorMes[c.mes_num]) nuevosPorMes[c.mes_num] = [];
    nuevosPorMes[c.mes_num].push(c);
  });

  // Iterar mes a mes acumulando el pool de nuevos
  const acumIds     = new Set();
  const acumNombres = new Set();
  const result = {};

  for (let m = 1; m <= 12; m++) {
    (nuevosPorMes[m] || []).forEach(c => {
      const id = (c.cliente_num || '').trim();
      if (id) acumIds.add(id);
      else if (c.cliente_nombre) acumNombres.add(c.cliente_nombre);
    });

    const totalAcum = acumIds.size + acumNombres.size;
    if (totalAcum === 0) continue;

    const comp = compPorMes[m] || { ids: new Set(), nombres: new Set() };
    let compraron = 0;
    acumIds.forEach(id  => { if (comp.ids.has(id))       compraron++; });
    acumNombres.forEach(nom => { if (comp.nombres.has(nom)) compraron++; });

    result[m] = {
      nuevos_acum: totalAcum,
      compraron,
      pct: Math.round((compraron / totalAcum) * 1000) / 10,
    };
  }
  return result;
}

// ── KPI mensual ───────────────────────────────────────────────────────────────
function buildKPIMensual(ventas, año) {
  const byMes = {};
  ventas.forEach(v => {
    const k = v.mes_num;
    if (!byMes[k]) byMes[k] = { mes_num: k, mes_nombre: v.mes_nombre, año, ventas: 0, costo: 0, tickets: new Set(), clientes: new Set() };
    byMes[k].ventas += v.importe;
    byMes[k].costo += v.costo;
    byMes[k].tickets.add(v.folio_key);
    byMes[k].clientes.add(v.cliente_num || v.cliente_nombre);
  });
  return Object.values(byMes).sort((a, b) => a.mes_num - b.mes_num).map(m => ({
    ...m, tickets: m.tickets.size, clientes: m.clientes.size,
    margen: m.ventas - m.costo,
    margen_pct: m.ventas > 0 ? (m.ventas - m.costo) / m.ventas * 100 : 0,
    ticket_promedio: m.tickets.size > 0 ? m.ventas / m.tickets.size : 0
  }));
}

// ── KPI por agente ────────────────────────────────────────────────────────────
function buildKPIAgente(ventas2026, ventas2025, metas, cartera, clientesNR) {
  const byAgent = {};
  const ventasPorMes = {}, costoPorMes = {}, ticketsPorMes = {}, clientesPorMes = {};

  ventas2026.forEach(v => {
    const ag = v.agente_nombre;
    if (ag === 'SIN AGENTE') return;
    const mes = v.mes_num;
    if (!byAgent[ag]) byAgent[ag] = { agente: ag, ventas: 0, costo: 0, tickets: new Set(), clientes: new Set(), meta: 0 };
    byAgent[ag].ventas += v.importe;
    byAgent[ag].costo += v.costo;
    if (!v.solo_presencia) byAgent[ag].tickets.add(v.folio_key);
    byAgent[ag].clientes.add(v.cliente_num || v.cliente_nombre);
    if (!ventasPorMes[ag]) { ventasPorMes[ag] = {}; costoPorMes[ag] = {}; ticketsPorMes[ag] = {}; clientesPorMes[ag] = {}; }
    ventasPorMes[ag][mes] = (ventasPorMes[ag][mes] || 0) + v.importe;
    costoPorMes[ag][mes]  = (costoPorMes[ag][mes]  || 0) + v.costo;
    if (!v.solo_presencia) {
      if (!ticketsPorMes[ag][mes]) ticketsPorMes[ag][mes] = new Set();
      ticketsPorMes[ag][mes].add(v.folio_key);
    }
    if (!clientesPorMes[ag][mes]) clientesPorMes[ag][mes] = new Set();
    clientesPorMes[ag][mes].add(v.cliente_num || v.cliente_nombre);
  });

  const mesesConVentas = new Set(ventas2026.map(v => v.mes_num));
  const metaPorMes = {};
  metas.filter(m => m.año === AÑO_ACTUAL && mesesConVentas.has(m.mes_num)).forEach(m => {
    const ag = m.agente_nombre;
    if (!byAgent[ag]) byAgent[ag] = { agente: ag, ventas: 0, costo: 0, tickets: new Set(), clientes: new Set(), meta: 0 };
    byAgent[ag].meta += m.meta;
    if (!metaPorMes[ag]) metaPorMes[ag] = {};
    metaPorMes[ag][m.mes_num] = (metaPorMes[ag][m.mes_num] || 0) + m.meta;
  });

  const carteraByAgent = {};
  cartera.forEach(c => {
    const ag = c.agente_nombre;
    if (!carteraByAgent[ag]) carteraByAgent[ag] = new Set();
    carteraByAgent[ag].add(c.cliente_num || c.cliente_nombre);
  });

  const ventas2025ByAgentMes = {};
  const costo2025ByAgentMes = {};
  const tickets2025ByAgentMes = {};
  ventas2025.forEach(v => {
    const ag = v.agente_nombre;
    if (!AGENTES_COMERCIALES.has(ag)) return;
    if (!ventas2025ByAgentMes[ag]) ventas2025ByAgentMes[ag] = {};
    ventas2025ByAgentMes[ag][v.mes_num] = (ventas2025ByAgentMes[ag][v.mes_num] || 0) + v.importe;
    if (!costo2025ByAgentMes[ag]) costo2025ByAgentMes[ag] = {};
    costo2025ByAgentMes[ag][v.mes_num] = (costo2025ByAgentMes[ag][v.mes_num] || 0) + v.costo;
    if (!tickets2025ByAgentMes[ag]) tickets2025ByAgentMes[ag] = {};
    if (!tickets2025ByAgentMes[ag][v.mes_num]) tickets2025ByAgentMes[ag][v.mes_num] = new Set();
    tickets2025ByAgentMes[ag][v.mes_num].add(v.folio_key);
  });
  const ventas2025ByAgent = {};
  Object.entries(ventas2025ByAgentMes).forEach(([ag, byMes]) => {
    ventas2025ByAgent[ag] = Object.entries(byMes)
      .filter(([mes]) => mesesConVentas.has(parseInt(mes)))
      .reduce((s, [, v]) => s + v, 0);
  });

  // Match solo por ID de cliente — el agente se toma de ventas (no de la hoja NR)
  const v26IDs = new Set(ventas2026.filter(v => v.cliente_num).map(v => v.cliente_num));
  const v25IDs = new Set(ventas2025.filter(v => v.cliente_num).map(v => v.cliente_num));
  // Mapa id → agente en ventas (primer agente encontrado, los comerciales tienen prioridad)
  const v26AgPorId = {}, v25AgPorId = {};
  ventas2026.forEach(v => { if (v.cliente_num && !v26AgPorId[v.cliente_num]) v26AgPorId[v.cliente_num] = v.agente_nombre; });
  ventas2025.forEach(v => { if (v.cliente_num && !v25AgPorId[v.cliente_num]) v25AgPorId[v.cliente_num] = v.agente_nombre; });

  const nuevosByAgent = {}, recupByAgent = {};
  const nuevos2025ByAgent = {}, recup2025ByAgent = {};
  const nuevosPorMesByAgent = {}, recupPorMesByAgent = {};
  const nuevos2025PorMesByAgent = {}, recup2025PorMesByAgent = {};

  const _addMes = (dict, ag, mes) => {
    if (!dict[ag]) dict[ag] = {};
    dict[ag][mes] = (dict[ag][mes] || 0) + 1;
  };

  clientesNR.forEach(c => {
    const id = (c.cliente_num || '').trim();
    if (!id) return;
    const st = c.status;
    const mes = c.mes_num;
    if (c.año === AÑO_ACTUAL) {
      if (!v26IDs.has(id)) return;
      const ag = v26AgPorId[id];
      if (!ag) return;
      const en25 = v25IDs.has(id);
      if (st === 'Nuevo'      && !en25) { nuevosByAgent[ag] = (nuevosByAgent[ag] || 0) + 1; if (mes) _addMes(nuevosPorMesByAgent, ag, mes); }
      if (st === 'Recuperado' &&  en25) { recupByAgent[ag]  = (recupByAgent[ag]  || 0) + 1; if (mes) _addMes(recupPorMesByAgent,  ag, mes); }
    } else if (c.año === AÑO_ANTERIOR) {
      if (!v25IDs.has(id)) return;
      const ag = v25AgPorId[id];
      if (!ag) return;
      if (st === 'Nuevo')      { nuevos2025ByAgent[ag] = (nuevos2025ByAgent[ag] || 0) + 1; if (mes) _addMes(nuevos2025PorMesByAgent, ag, mes); }
      if (st === 'Recuperado') { recup2025ByAgent[ag]  = (recup2025ByAgent[ag]  || 0) + 1; if (mes) _addMes(recup2025PorMesByAgent,  ag, mes); }
    }
  });

  // Clientes en riesgo/perdidos por agente
  // Último mes de compra por cliente: combinado 2026 (mes 1-12) y 2025 (mes -11 a 0, donde dic2025=0)
  const mesMaxAg = ventas2026.length ? Math.max(...ventas2026.map(v => v.mes_num)) : 0;
  const mesCortePerdidoAg = mesMaxAg - 4;
  const ultimoMesAg = {}; // agente → cliente → último mes (2026: 1-12, 2025: mes-12 → dic=0... ene=-11)
  const ultimoMesGlobal = {}; // cliente → último mes global (misma escala, todos los agentes)
  ventas2026.forEach(v => {
    if (v.solo_presencia) return; // solo visita, no compra real
    if (!AGENTES_COMERCIALES.has(v.agente_nombre)) return;
    const ag = v.agente_nombre; const k = v.cliente_num || v.cliente_nombre;
    if (!ultimoMesAg[ag]) ultimoMesAg[ag] = {};
    if (ultimoMesAg[ag][k] === undefined || v.mes_num > ultimoMesAg[ag][k]) ultimoMesAg[ag][k] = v.mes_num;
    if (ultimoMesGlobal[k] === undefined || v.mes_num > ultimoMesGlobal[k]) ultimoMesGlobal[k] = v.mes_num;
  });
  ventas2025.forEach(v => {
    if (!AGENTES_COMERCIALES.has(v.agente_nombre)) return;
    const ag = v.agente_nombre; const k = v.cliente_num || v.cliente_nombre;
    const mesRel = v.mes_num - 12; // dic2025=0, nov=-1, ... ene=-11
    if (!ultimoMesAg[ag]) ultimoMesAg[ag] = {};
    if (ultimoMesAg[ag][k] === undefined || mesRel > ultimoMesAg[ag][k]) ultimoMesAg[ag][k] = mesRel;
    if (ultimoMesGlobal[k] === undefined || mesRel > ultimoMesGlobal[k]) ultimoMesGlobal[k] = mesRel;
  });
  // Referencia por agente: cartera asignada + clientes de 2025 de ese agente
  const cli2025ByAgent = {};
  const clientesPorMes2025 = {};
  ventas2025.forEach(v => {
    if (!AGENTES_COMERCIALES.has(v.agente_nombre)) return;
    const ag = v.agente_nombre; const k = v.cliente_num || v.cliente_nombre;
    if (!cli2025ByAgent[ag]) cli2025ByAgent[ag] = new Set();
    cli2025ByAgent[ag].add(k);
    if (!clientesPorMes2025[ag]) clientesPorMes2025[ag] = {};
    if (!clientesPorMes2025[ag][v.mes_num]) clientesPorMes2025[ag][v.mes_num] = new Set();
    clientesPorMes2025[ag][v.mes_num].add(k);
  });

  // Último mes de compra en 2025 por agente (para perdidos_2025)
  const ultimoMes25Ag = {};
  ventas2025.forEach(v => {
    if (!AGENTES_COMERCIALES.has(v.agente_nombre)) return;
    const ag = v.agente_nombre; const k = v.cliente_num || v.cliente_nombre;
    if (!ultimoMes25Ag[ag]) ultimoMes25Ag[ag] = {};
    if (!ultimoMes25Ag[ag][k] || v.mes_num > ultimoMes25Ag[ag][k]) ultimoMes25Ag[ag][k] = v.mes_num;
  });

  return Object.values(byAgent).map(a => {
    const cartSet = carteraByAgent[a.agente] || new Set();
    const cli25Set = cli2025ByAgent[a.agente] || new Set();
    const refClientes = new Set([...cartSet, ...cli25Set]);
    const uMes = ultimoMesAg[a.agente] || {};
    // cliente en riesgo: último mes compra (2026 o 2025-relativo) <= corte
    const perdidosAg = [...refClientes].filter(c => { const u = uMes[c]; return u === undefined || u <= mesCortePerdidoAg; }).length;
    // perdidos_al_mes[mes] = clientes que cruzaron el umbral de 4 meses SIN compra exactamente ese mes
    // Usa último mes GLOBAL (cualquier agente) para coincidir con la tabla de clientes
    const perdidos_al_mes = {};
    for (let m = 1; m <= 12; m++) {
      const exacto = m - 4;
      perdidos_al_mes[m] = [...refClientes].filter(c => { const u = ultimoMesGlobal[c]; return u !== undefined && u === exacto; }).length;
    }
    // perdidos_al_mes_2025: meses 5-12 de 2025 (sin datos 2024 no podemos calcular 1-4)
    const uMes25 = ultimoMes25Ag[a.agente] || {};
    const perdidos_al_mes_2025 = {};
    for (let m = 5; m <= 12; m++) {
      const exacto = m - 4;
      perdidos_al_mes_2025[m] = [...refClientes].filter(c => { const u = uMes25[c]; return u !== undefined && u === exacto; }).length;
    }
    // Total perdidos 2025: último mes en 2025 <= 8 (cruzaron umbral antes de fin de año)
    const perdidosAg2025 = [...refClientes].filter(c => { const u = uMes25[c]; return u !== undefined && u <= 8; }).length;
    const cartTotal = cartSet.size;
    const atendidos = a.clientes.size;
    const ticketsCount = a.tickets.size;
    const venta2025 = ventas2025ByAgent[a.agente] || 0;
    return {
      agente: a.agente,
      ventas: a.ventas,
      ventas_por_mes: ventasPorMes[a.agente] || {},
      costo_por_mes:  costoPorMes[a.agente]  || {},
      tickets_por_mes: Object.fromEntries(Object.entries(ticketsPorMes[a.agente] || {}).map(([m,s]) => [m, s.size])),
      clientes_por_mes: Object.fromEntries(Object.entries(clientesPorMes[a.agente] || {}).map(([m,s]) => [m, s.size])),
      clientes_ids_por_mes: Object.fromEntries(Object.entries(clientesPorMes[a.agente] || {}).map(([m,s]) => [m, [...s]])),
      meta_por_mes: metaPorMes[a.agente] || {},
      ventas_2025: venta2025,
      ventas_2025_por_mes: ventas2025ByAgentMes[a.agente] || {},
      costo_2025_por_mes: costo2025ByAgentMes[a.agente] || {},
      tickets_2025_por_mes: Object.fromEntries(Object.entries(tickets2025ByAgentMes[a.agente] || {}).map(([m,s]) => [m, s.size])),
      tickets_2025: Object.values(tickets2025ByAgentMes[a.agente] || {}).reduce((s, set) => s + set.size, 0),
      variacion_vs_2025: venta2025 > 0 ? ((a.ventas - venta2025) / venta2025 * 100) : null,
      meta: a.meta,
      diferencia_meta: a.ventas - a.meta,
      cumplimiento_pct: a.meta > 0 ? (a.ventas / a.meta * 100) : null,
      cartera_total: cartTotal,
      clientes_atendidos: atendidos,
      clientes_atendidos_2025: cli2025ByAgent[a.agente] ? cli2025ByAgent[a.agente].size : 0,
      clientes_ids_por_mes_2025: Object.fromEntries(Object.entries(clientesPorMes2025[a.agente] || {}).map(([m,s]) => [m, [...s]])),
      cobertura_pct: cartTotal > 0 ? (atendidos / cartTotal * 100) : null,
      clientes_pendientes: Math.max(0, cartTotal - atendidos),
      clientes_nuevos: nuevosByAgent[a.agente] || 0,
      clientes_recuperados: recupByAgent[a.agente] || 0,
      clientes_nuevos_2025: nuevos2025ByAgent[a.agente] || 0,
      clientes_recuperados_2025: recup2025ByAgent[a.agente] || 0,
      nuevos_por_mes: nuevosPorMesByAgent[a.agente] || {},
      recup_por_mes: recupPorMesByAgent[a.agente] || {},
      nuevos_2025_por_mes: nuevos2025PorMesByAgent[a.agente] || {},
      recup_2025_por_mes: recup2025PorMesByAgent[a.agente] || {},
      clientes_perdidos: perdidosAg,
      clientes_perdidos_2026: Object.entries(perdidos_al_mes).reduce((s, [m, v]) => parseInt(m) <= mesMaxAg ? s + v : s, 0),
      clientes_perdidos_2025: perdidosAg2025,
      perdidos_al_mes,
      perdidos_al_mes_2025,
      tickets: ticketsCount,
      ticket_promedio: ticketsCount > 0 ? a.ventas / ticketsCount : 0,
      costo: a.costo,
      margen: a.ventas - a.costo,
      margen_pct: a.ventas > 0 ? ((a.ventas - a.costo) / a.ventas * 100) : 0
    };
  }).sort((a, b) => (b.cumplimiento_pct || 0) - (a.cumplimiento_pct || 0));
}

// ── Tabla clientes ────────────────────────────────────────────────────────────
function buildClienteTable(ventas2026, ventas2025, cartera, clientesNR) {
  // ── Paso 1: acumular datos de 2026 ──────────────────────────────────────────
  const byClient = {};
  ventas2026.forEach(v => {
    const key = v.cliente_num || v.cliente_nombre;
    if (!byClient[key]) byClient[key] = {
      cliente_num: v.cliente_num, cliente_nombre: v.cliente_nombre, agente: v.agente_nombre,
      ventas_2026: 0, costo_2026: 0, tickets_2026: new Set(), meses_activos_2026: new Set(),
      ultima_compra_2026: null, ultima_compra_2025: null
    };
    byClient[key].ventas_2026 += v.importe;
    byClient[key].costo_2026  += v.costo;
    if (!v.solo_presencia) {
      byClient[key].tickets_2026.add(v.folio_key);
      byClient[key].meses_activos_2026.add(v.mes_num);
      const fd = new Date(v.fecha);
      if (!byClient[key].ultima_compra_2026 || fd > new Date(byClient[key].ultima_compra_2026))
        byClient[key].ultima_compra_2026 = v.fecha;
    }
  });

  // ── Paso 2: acumular datos de 2025 (última compra + ventas totales) ─────────
  const v25ventas = {};
  const v25ultima = {};
  const v25meses = {};
  ventas2025.forEach(v => {
    const key = v.cliente_num || v.cliente_nombre;
    v25ventas[key] = (v25ventas[key] || 0) + v.importe;
    if (!v.solo_presencia) {
      const fd = new Date(v.fecha);
      if (!v25ultima[key] || fd > new Date(v25ultima[key])) v25ultima[key] = v.fecha;
      if (!v25meses[key]) v25meses[key] = new Set();
      v25meses[key].add(v.mes_num);
    }
  });

  // ── Paso 3: agregar clientes de 2025 que no aparecen en 2026 ────────────────
  const clienteRef = (num, nombre, agente) => ({
    cliente_num: num, cliente_nombre: nombre, agente,
    ventas_2026: 0, costo_2026: 0, tickets_2026: new Set(), meses_activos_2026: new Set(),
    ultima_compra_2026: null, ultima_compra_2025: null
  });
  ventas2025.forEach(v => {
    const key = v.cliente_num || v.cliente_nombre;
    if (!byClient[key]) byClient[key] = clienteRef(v.cliente_num, v.cliente_nombre, v.agente_nombre);
  });

  // ── Paso 4: propagar última compra de 2025 a los que no tienen 2026 ─────────
  Object.keys(byClient).forEach(key => {
    byClient[key].ultima_compra_2025 = v25ultima[key] || null;
  });

  // ── Paso 5: status y métricas ────────────────────────────────────────────────
  const _tv26IDs = new Set(ventas2026.filter(v => v.cliente_num).map(v => v.cliente_num));
  const _tv25IDs = new Set(ventas2025.filter(v => v.cliente_num).map(v => v.cliente_num));
  const nuevosValidados = new Set(clientesNR.filter(c => {
    const id = (c.cliente_num || '').trim();
    return c.año === AÑO_ACTUAL && c.status === 'Nuevo' && id && _tv26IDs.has(id) && !_tv25IDs.has(id);
  }).map(c => (c.cliente_num || '').trim()));
  const recupValidados = new Set(clientesNR.filter(c => {
    const id = (c.cliente_num || '').trim();
    return c.año === AÑO_ACTUAL && c.status === 'Recuperado' && id && _tv26IDs.has(id) && _tv25IDs.has(id);
  }).map(c => (c.cliente_num || '').trim()));

  const today = new Date();
  const DIAS_PERDIDO = 120; // 4 meses

  return Object.entries(byClient).map(([key, c]) => {
    const tks = c.tickets_2026.size;
    const v25cli = v25ventas[key] || 0;
    // Última compra real = la más reciente entre ambos años
    const fechas = [c.ultima_compra_2026, c.ultima_compra_2025].filter(Boolean);
    const ultima_compra = fechas.length ? fechas.reduce((a, b) => a > b ? a : b) : null;
    const diasUltima = ultima_compra ? Math.round((today - new Date(ultima_compra)) / 86400000) : null;
    const id = c.cliente_num || '';
    let status = 'Activo';
    if (id && nuevosValidados.has(id)) status = 'Nuevo';
    else if (id && recupValidados.has(id)) status = 'Recuperado';
    else if (!v25cli && !id) status = 'Nuevo';
    const origen = status; // preservar antes de sobreescribir con Perdido
    // Perdido = sin compra en ninguno de los dos años en los últimos 4 meses
    if (!ultima_compra || diasUltima >= DIAS_PERDIDO) status = 'Perdido';
    return {
      cliente_num: c.cliente_num, cliente_nombre: c.cliente_nombre, agente: c.agente, status, origen,
      ventas_2026: c.ventas_2026, ventas_2025: v25cli,
      variacion: v25cli > 0 ? ((c.ventas_2026 - v25cli) / v25cli * 100) : null,
      tickets: tks, ticket_promedio: tks > 0 ? c.ventas_2026 / tks : 0,
      meses_activos_2026: c.meses_activos_2026.size,
      meses_activos_2025: v25meses[key] ? v25meses[key].size : 0,
      ultima_compra, dias_sin_compra: diasUltima,
      ultima_compra_2026: c.ultima_compra_2026,
      riesgo: diasUltima !== null ? (diasUltima >= 120 ? 'Alto' : diasUltima >= 60 ? 'Medio' : 'Bajo') : 'Sin datos'
    };
  }).sort((a, b) => b.ventas_2026 - a.ventas_2026);
}

// ── Alertas ───────────────────────────────────────────────────────────────────
function buildAlertas(kpiAgentes, kpi2025, kpi2026, tablaClientes) {
  const alertas = [];
  kpiAgentes.filter(a => a.cumplimiento_pct !== null && a.cumplimiento_pct < 85).forEach(a => {
    alertas.push({ tipo: 'warning', categoria: 'Cumplimiento de Venta', agente: a.agente,
      mensaje: `${a.agente} está al ${a.cumplimiento_pct.toFixed(1)}% de su meta. Déficit de $${Math.abs(a.diferencia_meta).toLocaleString('es-MX',{minimumFractionDigits:0})}.`,
      accion: 'Revisar plan de recuperación' });
  });
  kpiAgentes.filter(a => a.cobertura_pct !== null && a.cobertura_pct < 70).forEach(a => {
    alertas.push({ tipo: 'danger', categoria: 'Cobertura de Cartera', agente: a.agente,
      mensaje: `${a.agente} tiene cobertura de ${a.cobertura_pct.toFixed(1)}%. ${a.clientes_pendientes} clientes pendientes.`,
      accion: 'Activar visitas a clientes pendientes' });
  });
  kpi2026.forEach(m => {
    const mes25 = kpi2025.find(x => x.mes_num === m.mes_num);
    if (mes25 && m.ventas < mes25.ventas) {
      const caida = ((m.ventas - mes25.ventas) / mes25.ventas * 100);
      alertas.push({ tipo: 'warning', categoria: 'Comparativo Interanual', agente: null,
        mensaje: `${m.mes_nombre} 2026 cayó ${caida.toFixed(1)}% vs ${m.mes_nombre} 2025.`,
        accion: 'Analizar causas de la caída' });
    }
  });
  const enRiesgo = tablaClientes.filter(c => c.riesgo === 'Alto').length;
  if (enRiesgo > 0) alertas.push({ tipo: 'danger', categoria: 'Clientes en Riesgo', agente: null,
    mensaje: `${enRiesgo} clientes llevan más de 4 meses sin comprar.`, accion: 'Contactar clientes en riesgo' });
  const nuevosSinRepetir = tablaClientes.filter(c => (c.status||'').toLowerCase() === 'nuevo' && c.tickets <= 1).length;
  if (nuevosSinRepetir > 0) alertas.push({ tipo: 'info', categoria: 'Retención de Clientes Nuevos', agente: null,
    mensaje: `${nuevosSinRepetir} clientes nuevos no han realizado una segunda compra.`, accion: 'Activar campaña de seguimiento' });
  return alertas;
}

// ── Lectura táctica ───────────────────────────────────────────────────────────
function buildLecturaTactica(resumen, kpiAgentes) {
  const h = [];
  if (resumen.cumplimiento_pct !== null)
    h.push(`La venta acumulada alcanza el ${resumen.cumplimiento_pct.toFixed(1)}% de la meta, con ${resumen.diferencia_meta >= 0 ? 'superávit' : 'déficit'} de $${Math.abs(resumen.diferencia_meta).toLocaleString('es-MX',{minimumFractionDigits:0})}.`);
  const sobreMeta = kpiAgentes.filter(a => a.cumplimiento_pct !== null && a.cumplimiento_pct >= 100);
  if (sobreMeta.length > 0)
    h.push(`${sobreMeta.length} agente${sobreMeta.length>1?'s':''} superaron su cuota: ${sobreMeta.map(a=>`${a.agente.split(' ')[0]} (${a.cumplimiento_pct.toFixed(0)}%)`).join(', ')}.`);
  if (resumen.cobertura_cartera_pct !== null) {
    const cobReal = Math.min(resumen.cobertura_cartera_pct, 100);
    const extra = resumen.clientes_atendidos > resumen.cartera_total
      ? ` Además, ${resumen.clientes_atendidos - resumen.cartera_total} clientes activos están fuera de la cartera asignada.`
      : ` Quedan ${resumen.clientes_pendientes} clientes pendientes.`;
    h.push(`La cobertura de cartera asignada es del ${cobReal.toFixed(1)}%.${extra}`);
  }
  h.push(`Se incorporaron ${resumen.clientes_nuevos} clientes nuevos y se recuperaron ${resumen.clientes_recuperados}. En riesgo: ${resumen.clientes_perdidos}.`);
  if (resumen.ticket_promedio > 0)
    h.push(`Ticket promedio $${resumen.ticket_promedio.toLocaleString('es-MX',{minimumFractionDigits:0})} con ${resumen.total_tickets} tickets únicos.`);
  return h.slice(0, 5);
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    console.error('❌ No se encontró credentials.json en:', CREDENTIALS_PATH);
    console.error('   Descarga el archivo de tu Service Account de Google Cloud y colócalo ahí.');
    process.exit(1);
  }

  console.log('🔑 Autenticando con Google Sheets API...');
  const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  console.log('📥 Descargando datos de Google Sheets...');
  const [rawAnterior, rawActual, rawMetas, rawCartera, rawCliNR, rawEstratProd, rawVisitas, rawIncidencias, rawOportunidades, rawMetasPeor] = await Promise.all([
    getSheetData(sheets, SHEETS.ventasAnterior.id,        SHEETS.ventasAnterior.range),
    getSheetData(sheets, SHEETS.ventasActual.id,          SHEETS.ventasActual.range),
    getSheetData(sheets, SHEETS.metas.id,                 SHEETS.metas.range),
    getSheetData(sheets, SHEETS.cartera.id,               SHEETS.cartera.range),
    getSheetData(sheets, SHEETS.clientesNR.id,            SHEETS.clientesNR.range),
    getSheetData(sheets, SHEETS.estratVentasProductos.id, SHEETS.estratVentasProductos.range),
    getSheetData(sheets, SHEETS.visitasAtencion.id,       SHEETS.visitasAtencion.range),
    getSheetData(sheets, SHEETS.incidencias.id,           SHEETS.incidencias.range),
    getSheetData(sheets, SHEETS.oportunidadesOffline.id,  SHEETS.oportunidadesOffline.range),
    getSheetData(sheets, SHEETS.bscMetasPeor.id,          SHEETS.bscMetasPeor.range),
  ]);

  console.log(`✅ Datos: ${AÑO_ANTERIOR}=${rawAnterior.length} | ${AÑO_ACTUAL}=${rawActual.length} | metas=${rawMetas.length} | cartera=${rawCartera.length} | cliNR=${rawCliNR.length} | estratProd=${rawEstratProd.length} | visitas=${rawVisitas.length} | incidencias=${rawIncidencias.length} | oport=${rawOportunidades.length} | metasBSC=${rawMetasPeor.length}`);

  console.log('⚙️  Procesando ventas...');
  const ventas2025 = processVentas(rawAnterior, AÑO_ANTERIOR);
  const ventas2026 = processVentas(rawActual,   AÑO_ACTUAL);

  const MONTH_MAP = { 'enero':1,'febrero':2,'marzo':3,'abril':4,'mayo':5,'junio':6,'julio':7,'agosto':8,'septiembre':9,'octubre':10,'noviembre':11,'diciembre':12 };

  const metas = rawMetas
    .filter(r => r['Agente'] && r['Meta'] && AGENTES_COMERCIALES.has(normAgent(r['Agente'])))
    .map((r, i) => {
      const agNorm = normAgent(r['Agente']);
      const mesStr = (r['MEs_num'] || r['Mes_num'] || r['Mes'] || '').toLowerCase().trim();
      const mesNum = MONTH_MAP[mesStr] || parseInt(mesStr) || 0;
      const fechaRaw = parseDate(r['Fecha']);
      const año = fechaRaw ? fechaRaw.getFullYear() : AÑO_ACTUAL;
      return { id: `M${i+1}`, agente_nombre: agNorm, año, mes_num: mesNum, mes_nombre: MESES_ES[mesNum-1] || mesStr, meta: parseNum(r['Meta']), equipo: r['Equipo'] || 'COMERCIAL' };
    })
    .filter(m => m.mes_num > 0 && m.meta > 0);

  const cartera = rawCartera
    .filter(r => r['Agente'] && r['NOMBRE'] && AGENTES_COMERCIALES.has(normAgent(r['Agente'])))
    .map((r, i) => ({ id: `C${i+1}`, agente_nombre: normAgent(r['Agente']), cliente_num: r['NUM'] || '', cliente_nombre: normClient(r['NOMBRE']) }));

  const clientesNR = rawCliNR
    .filter(r => r['Nombre'])
    .map((r, i) => ({
      id: `CNR${i+1}`, sucursal: r['Sucursal'] || '', cliente_num: (r['Id'] || '').replace(/,/g, '').trim(),
      cliente_nombre: normClient(r['Nombre']), fecha_alta: r['Fecha de alta'] || '',
      año: parseInt(r['Año_a']) || 0, mes_num: parseInt(r['Mes_a']) || 0,
      agente_nombre: normAgent(r['Agente']), monto: parseNum(r['Monto']), status: (r['Status_Cli'] || '').trim()
    }));

  // ── Estrategia ventas por productos — parsear filas de la hoja ───────────────
  const estratVentasProductos = rawEstratProd
    .filter(r => r['Mes_num'] && r['Año'])
    .map(r => ({
      mes_num:          parseInt(r['Mes_num']) || 0,
      año:              parseInt(r['Año'])     || 0,
      promos_aplicadas: parseNum(r['Promos_Aplicadas']) || 0,
      venta_con_promo:  parseNum(r['Venta_Con_Promo'])  || 0,
    }))
    .filter(r => r.mes_num > 0 && r.año > 0);

  // Indexar por mes para el año actual
  const estratProdPorMes = {};
  estratVentasProductos.filter(r => r.año === AÑO_ACTUAL).forEach(r => {
    estratProdPorMes[r.mes_num] = r;
  });

  const ventas2025c = ventas2025.filter(v => AGENTES_COMERCIALES.has(v.agente_nombre));
  const ventas2026c = ventas2026.filter(v => AGENTES_COMERCIALES.has(v.agente_nombre));

  const kpi2025 = buildKPIMensual(ventas2025c, 2025);
  const kpi2026 = buildKPIMensual(ventas2026c, 2026);
  const kpiAgentes = buildKPIAgente(ventas2026c, ventas2025c, metas, cartera, clientesNR);

  // ── NR validados por mes y año para la gráfica ───────────────────────────────
  // Reutiliza los mismos Sets que se calculan abajo en resumen global
  const _r26IDs  = new Set(ventas2026c.filter(v => v.cliente_num).map(v => v.cliente_num));
  const _r26Nom  = new Set(ventas2026c.map(v => v.cliente_nombre));
  const _r25IDs  = new Set(ventas2025c.filter(v => v.cliente_num).map(v => v.cliente_num));
  const _r25Nom  = new Set(ventas2025c.map(v => v.cliente_nombre));
  const _enV = (c, ids, nom) => { const id = (c.cliente_num||'').trim(); return id ? ids.has(id) : nom.has(c.cliente_nombre); };

  // Gráfica NR 2026: match solo por ID
  const _g26IDs = new Set(ventas2026c.filter(v => v.cliente_num).map(v => v.cliente_num));
  const _g25IDs = new Set(ventas2025c.filter(v => v.cliente_num).map(v => v.cliente_num));
  const nuevosPorMes2026 = {};
  const recupPorMes2026  = {};
  clientesNR.filter(c => c.año === AÑO_ACTUAL && c.mes_num > 0).forEach(c => {
    const id = (c.cliente_num || '').trim();
    if (!id) return;
    const en26 = _g26IDs.has(id), en25 = _g25IDs.has(id);
    if (c.status === 'Nuevo'      && en26 && !en25) nuevosPorMes2026[c.mes_num] = (nuevosPorMes2026[c.mes_num] || 0) + 1;
    if (c.status === 'Recuperado' && en26 &&  en25) recupPorMes2026[c.mes_num]  = (recupPorMes2026[c.mes_num]  || 0) + 1;
  });
  const nrValidados2026 = []; // ya procesado arriba directamente en los objetos por mes

  // NR año anterior: solo cruce contra ventas del año anterior (no tenemos datos del año anterior-1)
  const _r24IDs = new Set(); const _r24Nom = new Set(); // sin datos del año previo al anterior
  const nrValidados2025 = clientesNR.filter(c => c.año === AÑO_ANTERIOR && c.mes_num > 0 &&
    _enV(c, _r25IDs, _r25Nom)
  );

  // Agrupar por mes
  const nrPorMes = {};
  // Nuevos 2026 desde ventas
  Object.entries(nuevosPorMes2026).forEach(([mes, cnt]) => {
    const k = parseInt(mes);
    if (!nrPorMes[k]) nrPorMes[k] = { mes_num: k, nuevos_2025:0, recup_2025:0, nuevos_2026:0, recup_2026:0 };
    nrPorMes[k].nuevos_2026 = cnt;
  });
  // Recuperados 2026 validados (composite key)
  Object.entries(recupPorMes2026).forEach(([mes, cnt]) => {
    const k = parseInt(mes);
    if (!nrPorMes[k]) nrPorMes[k] = { mes_num: k, nuevos_2025:0, recup_2025:0, nuevos_2026:0, recup_2026:0 };
    nrPorMes[k].recup_2026 = cnt;
  });
  // NR 2025 desde hoja (solo cruce con ventas2025)
  nrValidados2025.forEach(c => {
    const k = c.mes_num;
    if (!nrPorMes[k]) nrPorMes[k] = { mes_num: k, nuevos_2025:0, recup_2025:0, nuevos_2026:0, recup_2026:0 };
    if (c.status==='Nuevo') nrPorMes[k].nuevos_2025++; else nrPorMes[k].recup_2025++;
  });
  const clientes_nr_por_mes = Object.values(nrPorMes).sort((a,b) => a.mes_num - b.mes_num);

  // NR por mes desglosado por agente (para filtro de agente en dashboard)
  const nrPorMesAg = {}; // { agente: { mes_num: {...} } }
  const _addNRag = (agente, mes, field) => {
    if (!nrPorMesAg[agente]) nrPorMesAg[agente] = {};
    if (!nrPorMesAg[agente][mes]) nrPorMesAg[agente][mes] = { mes_num: mes, nuevos_2025:0, recup_2025:0, nuevos_2026:0, recup_2026:0 };
    nrPorMesAg[agente][mes][field]++;
  };
  // Agente real = el que tiene el cliente en ventas
  const _ag26PorId = {}, _ag25PorId = {};
  ventas2026c.forEach(v => { if (v.cliente_num && !_ag26PorId[v.cliente_num]) _ag26PorId[v.cliente_num] = v.agente_nombre; });
  ventas2025c.forEach(v => { if (v.cliente_num && !_ag25PorId[v.cliente_num]) _ag25PorId[v.cliente_num] = v.agente_nombre; });
  clientesNR.filter(c => c.año === AÑO_ACTUAL && c.mes_num > 0).forEach(c => {
    const id = (c.cliente_num || '').trim(); if (!id) return;
    const en26 = _g26IDs.has(id), en25 = _g25IDs.has(id);
    const ag = _ag26PorId[id]; if (!ag) return;
    if (c.status === 'Nuevo'      && en26 && !en25) _addNRag(ag, c.mes_num, 'nuevos_2026');
    if (c.status === 'Recuperado' && en26 &&  en25) _addNRag(ag, c.mes_num, 'recup_2026');
  });
  clientesNR.filter(c => c.año === AÑO_ANTERIOR && c.mes_num > 0).forEach(c => {
    const id = (c.cliente_num || '').trim(); if (!id) return;
    const en25 = _g25IDs.has(id);
    const ag = _ag25PorId[id]; if (!ag || !en25) return;
    const field = c.status === 'Nuevo' ? 'nuevos_2025' : 'recup_2025';
    _addNRag(ag, c.mes_num, field);
  });
  const clientes_nr_por_agente = {};
  Object.entries(nrPorMesAg).forEach(([ag, meses]) => {
    clientes_nr_por_agente[ag] = Object.values(meses).sort((a,b) => a.mes_num - b.mes_num);
  });

  // ── Resumen global ──────────────────────────────────────────────────────────
  const totalVenta2026 = ventas2026c.reduce((s, v) => s + v.importe, 0);
  const totalCosto2026 = ventas2026c.reduce((s, v) => s + v.costo, 0);
  const mesesConVentas2026 = new Set(ventas2026c.map(v => v.mes_num));
  const totalMeta2026 = metas.filter(m => m.año === AÑO_ACTUAL && mesesConVentas2026.has(m.mes_num)).reduce((s, m) => s + m.meta, 0);
  const agentesConMeta = new Set(metas.filter(m => m.año === AÑO_ACTUAL).map(m => m.agente_nombre));
  const ventaAgentesConMeta = ventas2026c.filter(v => agentesConMeta.has(v.agente_nombre)).reduce((s, v) => s + v.importe, 0);
  const totalTickets2026 = new Set(ventas2026c.map(v => v.folio_key)).size;
  const totalClientes2026 = new Set(ventas2026c.map(v => v.cliente_num || v.cliente_nombre)).size;
  const totalCartera = new Set(cartera.map(c => c.cliente_num || c.cliente_nombre)).size;
  // Cruce por ID — igual que buildKPIAgente: si el ID está en ventas se valida
  const _v26IDs  = new Set(ventas2026c.filter(v => v.cliente_num).map(v => v.cliente_num));
  const _v25IDs  = new Set(ventas2025c.filter(v => v.cliente_num).map(v => v.cliente_num));
  const totalNuevos2026 = clientesNR.filter(c => { const id=(c.cliente_num||'').trim(); return c.año===AÑO_ACTUAL && c.status==='Nuevo' && id && _v26IDs.has(id) && !_v25IDs.has(id); }).length;
  const totalRecup2026  = clientesNR.filter(c => { const id=(c.cliente_num||'').trim(); return c.año===AÑO_ACTUAL && c.status==='Recuperado' && id && _v26IDs.has(id) && _v25IDs.has(id); }).length;
  const totalNuevos2025 = clientesNR.filter(c => { const id=(c.cliente_num||'').trim(); return c.año===AÑO_ANTERIOR && c.status==='Nuevo' && id && _v25IDs.has(id); }).length;
  const totalRecup2025  = clientesNR.filter(c => { const id=(c.cliente_num||'').trim(); return c.año===AÑO_ANTERIOR && c.status==='Recuperado' && id && _v25IDs.has(id); }).length;
  const totalVenta2025c = ventas2025c.reduce((s, v) => s + v.importe, 0);
  const totalVenta2025_mismo_periodo = ventas2025c.filter(v => mesesConVentas2026.has(v.mes_num)).reduce((s, v) => s + v.importe, 0);
  const mesesDisponibles2026 = [...mesesConVentas2026].sort();

  const mesMaxDatos = Math.max(...ventas2026c.map(v => v.mes_num));
  const mesCortePerdido = mesMaxDatos - 4;
  const ultimoMes2026 = {};
  ventas2026c.forEach(v => { const k = v.cliente_num || v.cliente_nombre; if (!ultimoMes2026[k] || v.mes_num > ultimoMes2026[k]) ultimoMes2026[k] = v.mes_num; });
  const cliCarteraSet = new Set(cartera.map(c => c.cliente_num || c.cliente_nombre));
  const cli2025Set = new Set(ventas2025c.map(v => v.cliente_num || v.cliente_nombre));
  const clientesReferencia = new Set([...cliCarteraSet, ...cli2025Set]);
  const perdidosCount = [...clientesReferencia].filter(c => { const u = ultimoMes2026[c]; return !u || u <= mesCortePerdido; }).length;

  const mesesNombres = mesesDisponibles2026.map(m => MESES_ES[m-1]);
  const resumen = {
    año: AÑO_ACTUAL,
    año_actual: AÑO_ACTUAL,
    año_anterior: AÑO_ANTERIOR,
    ultima_actualizacion: new Date().toISOString().split('T')[0],
    meses_disponibles: mesesDisponibles2026,
    meses_nombres: mesesNombres,
    total_venta_2026: totalVenta2026,
    total_venta_2025: totalVenta2025c,
    total_venta_2025_mismo_periodo: totalVenta2025_mismo_periodo,
    variacion_interanual: totalVenta2025_mismo_periodo > 0 ? ((totalVenta2026 - totalVenta2025_mismo_periodo) / totalVenta2025_mismo_periodo * 100) : null,
    diferencia_vs_2025: totalVenta2026 - totalVenta2025_mismo_periodo,
    periodo_comparacion: `${mesesNombres[0]?.slice(0,3)}–${mesesNombres[mesesNombres.length-1]?.slice(0,3)} 2025 vs 2026`,
    total_meta_2026: totalMeta2026,
    cumplimiento_pct: totalMeta2026 > 0 ? (ventaAgentesConMeta / totalMeta2026 * 100) : null,
    venta_agentes_con_meta: ventaAgentesConMeta,
    diferencia_meta: ventaAgentesConMeta - totalMeta2026,
    total_tickets: totalTickets2026,
    ticket_promedio: totalTickets2026 > 0 ? totalVenta2026 / totalTickets2026 : 0,
    clientes_atendidos: totalClientes2026,
    cartera_total: totalCartera,
    cobertura_cartera_pct: totalCartera > 0 ? (totalClientes2026 / totalCartera * 100) : null,
    clientes_pendientes: Math.max(0, totalCartera - totalClientes2026),
    clientes_nuevos: totalNuevos2026,
    clientes_recuperados: totalRecup2026,
    clientes_nuevos_2025: totalNuevos2025,
    clientes_recuperados_2025: totalRecup2025,
    clientes_perdidos: perdidosCount,
    total_costo: totalCosto2026,
    margen_monetario: totalVenta2026 - totalCosto2026,
    margen_pct: totalVenta2026 > 0 ? ((totalVenta2026 - totalCosto2026) / totalVenta2026 * 100) : 0
  };

  const tablaClientes = buildClienteTable(ventas2026c, ventas2025c, cartera, clientesNR);
  const alertas = buildAlertas(kpiAgentes, kpi2025, kpi2026, tablaClientes);
  const lecturaTactica = buildLecturaTactica(resumen, kpiAgentes);

  const agentes = [...AGENTES_COMERCIALES].sort().map((nombre, i) => ({ id: `AG${String(i+1).padStart(3,'0')}`, nombre, equipo: 'COMERCIAL' }));

  const clientes_sobre_3000_por_mes      = buildClientesSobre3000(ventas2026c);
  const clientes_sobre_3000_por_mes_2025 = buildClientesSobre3000(ventas2025c);
  const ticket_promedio_nuevos_por_mes   = buildTicketPromedioNuevos(ventas2026c, clientesNR, AÑO_ACTUAL);
  const cobertura_nuevos_por_mes         = buildCoberturaNuevosPorMes(ventas2026c, clientesNR, AÑO_ACTUAL);

  // ── Ventas de clientes nuevos agrupadas por mes de COMPRA (no de alta) ────────
  // Para cada mes M: suma todas las ventas realizadas EN ese mes por cualquier
  // cliente que esté en la hoja de nuevos/recuperados del año actual.
  // helper: construye ventas de clientes NR agrupadas por mes de compra
  function _buildVentasNR(ventas, clientesNRFiltro) {
    const ids = new Set(), noms = new Set();
    clientesNRFiltro.forEach(c => {
      const id = (c.cliente_num || '').trim();
      if (id) ids.add(id); else if (c.cliente_nombre) noms.add(c.cliente_nombre);
    });
    const global = {}, porAgente = {};
    ventas.filter(v => {
      if (v.solo_presencia) return false;
      const id = (v.cliente_num || '').trim();
      return id ? ids.has(id) : noms.has(v.cliente_nombre);
    }).forEach(v => {
      const m = v.mes_num;
      if (!global[m]) global[m] = { monto: 0, clientes: new Set() };
      global[m].monto += v.importe;
      global[m].clientes.add(v.cliente_num || v.cliente_nombre);
      const ag = v.agente_nombre;
      if (!porAgente[ag]) porAgente[ag] = {};
      if (!porAgente[ag][m]) porAgente[ag][m] = { monto: 0, clientes: new Set() };
      porAgente[ag][m].monto += v.importe;
      porAgente[ag][m].clientes.add(v.cliente_num || v.cliente_nombre);
    });
    const gOut = {}, agOut = {};
    Object.entries(global).forEach(([m, d]) => { gOut[parseInt(m)] = { monto: Math.round(d.monto), clientes: d.clientes.size }; });
    Object.entries(porAgente).forEach(([ag, meses]) => {
      agOut[ag] = {};
      Object.entries(meses).forEach(([m, d]) => { agOut[ag][parseInt(m)] = { monto: Math.round(d.monto), clientes: d.clientes.size }; });
    });
    return { global: gOut, porAgente: agOut };
  }

  const _vnr2026 = _buildVentasNR(ventas2026c, clientesNR.filter(c => c.año === AÑO_ACTUAL));
  const _vnr2025 = _buildVentasNR(ventas2025c, clientesNR.filter(c => c.año === AÑO_ANTERIOR));

  const ventas_nr_por_mes_compra        = _vnr2026.global;
  const ventas_nr_por_mes_compra_agente = _vnr2026.porAgente;
  const ventas_nr_por_mes_compra_2025        = _vnr2025.global;
  const ventas_nr_por_mes_compra_agente_2025 = _vnr2025.porAgente;

  // ── Visitas de atención (4.1b): suma de visitas por mes para AÑO_ACTUAL ───────
  const visitas_atencion_por_mes = {};
  rawVisitas
    .filter(r => {
      const añoFila = parseInt(r['año']) || AÑO_ACTUAL;
      return añoFila === AÑO_ACTUAL && r['mes_num'] && r['visitas'];
    })
    .forEach(r => {
      const m = parseInt(r['mes_num']);
      if (m > 0) visitas_atencion_por_mes[m] = (visitas_atencion_por_mes[m] || 0) + parseNum(r['visitas']);
    });

  // ── Incidencias (5.1b): valor del mes — columna Cantidad_incidencias
  const incidencias_por_mes = {};
  rawIncidencias
    .filter(r => {
      const añoFila = parseInt(r['año']) || AÑO_ACTUAL;
      return añoFila === AÑO_ACTUAL && r['mes_num'];
    })
    .forEach(r => {
      const m = parseInt(r['mes_num']);
      const cant = parseNum(r['Cantidad_incidencias']) || 0;
      if (m > 0) incidencias_por_mes[m] = (incidencias_por_mes[m] || 0) + cant;
    });

  // ── Oportunidades off-line (7.1a–7.1d) ───────────────────────────────────────
  const oportunidades_offline_por_mes = {};
  rawOportunidades
    .filter(r => {
      const añoFila = parseInt(r['año']) || AÑO_ACTUAL;
      return añoFila === AÑO_ACTUAL && r['mes_num'];
    })
    .forEach(r => {
      const m = parseInt(r['mes_num']);
      if (m <= 0) return;
      const cotiz    = parseNum(r['cotizaciones']);
      const convert  = parseNum(r['cotizaciones_convertidas']);
      const visitas  = parseNum(r['visitas']);
      const leads    = parseNum(r['leads']);
      const tasa     = cotiz > 0 ? Math.round((convert / cotiz) * 1000) / 10 : null;
      oportunidades_offline_por_mes[m] = { cotizaciones: cotiz, cotizaciones_convertidas: convert, visitas, leads, tasa_conversion: tasa };
    });

  // ── Metas BSC por mes — vigencia dinámica desde hoja "bsc_metas_peor" ────────
  const kpisEnSheet = [...new Set(rawMetasPeor.map(r => r['kpi_cod']).filter(Boolean))];
const bsc_metas_por_mes = {};
  for (let m = 1; m <= 12; m++) {
    bsc_metas_por_mes[m] = {};
    kpisEnSheet.forEach(kpi => {
      const fila = getMetaActiva(rawMetasPeor, kpi, AÑO_ACTUAL, m);
      if (fila) {
        bsc_metas_por_mes[m][kpi] = {
          meta: parseNum(fila['meta']),
          peor: fila['peor_de_los_casos'] !== '' ? parseNum(fila['peor_de_los_casos']) : null,
        };
      }
    });
  }

  const output = {
    resumen, agentes, metas,
    kpi_mensual_actual: kpi2026, kpi_mensual_anterior: kpi2025,
    kpi_agentes: kpiAgentes, tabla_clientes: tablaClientes,
    alertas, lectura_tactica: lecturaTactica, cartera_detalle: cartera, clientes_nr: clientesNR,
    clientes_nr_por_mes,
    clientes_nr_por_agente,
    clientes_sobre_3000_por_mes,
    clientes_sobre_3000_por_mes_2025,
    ticket_promedio_nuevos_por_mes,
    cobertura_nuevos_por_mes,
    ventas_nr_por_mes_compra,
    ventas_nr_por_mes_compra_agente,
    ventas_nr_por_mes_compra_2025,
    ventas_nr_por_mes_compra_agente_2025,
    visitas_atencion_por_mes,
    incidencias_por_mes,
    oportunidades_offline_por_mes,
    bsc_metas_por_mes,
    estrat_ventas_productos: estratProdPorMes,
  };

  const outFile = path.join(outDir, 'dashboard_data.json');
  fs.writeFileSync(outFile, JSON.stringify(output, null, 2), 'utf8');

  // Copiar a public/data también
  const pubDir = path.join(__dirname, '..', 'public', 'data');
  if (!fs.existsSync(pubDir)) fs.mkdirSync(pubDir, { recursive: true });
  fs.copyFileSync(outFile, path.join(pubDir, 'dashboard_data.json'));

  const sizeKB = Math.round(fs.statSync(outFile).size / 1024);
  console.log(`\n✅ dashboard_data.json generado: ${sizeKB} KB`);
  const perdidosEnTabla = tablaClientes.filter(c => c.status === 'Perdido').length;
  console.log(`   Agentes: ${kpiAgentes.length} | Meses 2026: ${kpi2026.length} | Clientes: ${tablaClientes.length}`);
  console.log(`   Clientes Perdidos — KPI: ${perdidosCount} | Tabla: ${perdidosEnTabla} (deben coincidir)`);
  console.log(`\n📊 Resumen:`);
  console.log(`   Venta 2026:    $${resumen.total_venta_2026.toLocaleString('es-MX',{minimumFractionDigits:0})}`);
  console.log(`   Meta 2026:     $${resumen.total_meta_2026.toLocaleString('es-MX',{minimumFractionDigits:0})}`);
  console.log(`   Cumplimiento:  ${resumen.cumplimiento_pct?.toFixed(1)}%`);
  console.log(`   Cobertura:     ${resumen.clientes_atendidos} / ${resumen.cartera_total} clientes`);
  console.log(`   Meses:         ${resumen.meses_nombres.join(', ')}`);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  if (err.message?.includes('PERMISSION_DENIED') || err.message?.includes('forbidden')) {
    console.error('   → Comparte los Sheets con el email de tu Service Account (client_email en credentials.json)');
  }
  process.exit(1);
});
