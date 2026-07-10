const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const base = __dirname;
const outDir = path.join(base, 'csv');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

function exportSheet(filePath, sheetName, outName) {
  console.log(`Exportando: ${outName}...`);
  const wb = XLSX.readFile(filePath, { cellDates: true, dense: false });
  const ws = sheetName ? wb.Sheets[sheetName] : wb.Sheets[wb.SheetNames[0]];
  const csv = XLSX.utils.sheet_to_csv(ws);
  fs.writeFileSync(path.join(outDir, outName), csv, 'utf8');
  const lines = csv.split('\n').length;
  console.log(`  -> ${outName} | ${lines} filas | ${(fs.statSync(path.join(outDir,outName)).size/1024).toFixed(0)} KB`);
}

// Ventas 2026
exportSheet(path.join(base, 'Ventas-2026.xlsx'), null, 'ventas_2026.csv');

// Info Comercial - 3 hojas
const wbInfo = XLSX.readFile(path.join(base, 'Info Comercial .xlsx'), { cellDates: true });
for (const sheetName of wbInfo.SheetNames) {
  const ws = wbInfo.Sheets[sheetName];
  const csv = XLSX.utils.sheet_to_csv(ws);
  const fname = `info_${sheetName.replace(/\s+/g,'_')}.csv`;
  fs.writeFileSync(path.join(outDir, fname), csv, 'utf8');
  console.log(`  -> ${fname} | ${csv.split('\n').length} filas`);
}

console.log('\nDone. Archivos en:', outDir);
