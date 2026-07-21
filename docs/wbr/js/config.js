const API = 'https://script.google.com/macros/s/AKfycbxPS5xKblTMvRGgNj6JBuT8yCr0dwx88ueKbH8LpM9jf5Cu1CKRgfJ50UNRvfjp4IZVlg/exec'
const COORD = 'David'
const DRIVE_FOLDER_ID = ''

// Activar para ver demo de nuevos KPIs (ignorar los del backend)
const DEMO_MODE = true

// Agentes excluidos del WBR (no aparecen en ninguna vista)
const EXCLUDED_AGENTS = ['Elizabeth Diaz Aguirre']

// KPIs de demo — se usan cuando DEMO_MODE=true o el backend no devuelve KPIs para el rol
const DEMO_KPIS = [
  'Venta vs cuota',
  'Margen',
  'Ticket promedio',
  'Clientes nuevos y recuperados',
  'Clientes atendidos de cartera',
  null, // espacio reservado para KPI futuro
]
