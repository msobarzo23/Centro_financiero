import Papa from 'papaparse';

const BASE = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSlD_sQVnKW53q0m243_Gr0EletIkDxjaN1-mRzdlma7q6WktHBhXYBBunmz5ZyBg/pub';

const SHEETS = {
  resumen:  `${BASE}?gid=1738797304&single=true&output=csv`,
  bancos:   `${BASE}?gid=1699395114&single=true&output=csv`,
  dap:      `${BASE}?gid=1020614134&single=true&output=csv`,
  calendario: `${BASE}?gid=1876759165&single=true&output=csv`,
  ffmm:     `${BASE}?gid=1691837276&single=true&output=csv`,
};

function parseCSV(text) {
  const result = Papa.parse(text, { header: true, skipEmptyLines: true, dynamicTyping: false });
  return result.data;
}

function parseNum(v) {
  if (v == null || v === '' || v === '-') return null;
  const s = String(v).replace(/\$/g, '').replace(/\./g, '').replace(/,/g, '.').replace(/\s/g, '').replace(/[()]/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? null : (String(v).includes('(') ? -n : n);
}

function parsePct(v) {
  if (v == null || v === '') return null;
  const s = String(v).replace('%', '').replace(',', '.').trim();
  const n = parseFloat(s);
  if (isNaN(n)) return null;
  return n > 1 ? n / 100 : n;
}

function parseDate(v) {
  if (!v) return null;
  const s = String(v).trim();
  // DD/MM/YYYY
  const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m1) return `${m1[3]}-${m1[2].padStart(2,'0')}-${m1[1].padStart(2,'0')}`;
  // YYYY-MM-DD
  const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}`;
  // MM/DD/YYYY (Google Sheets US locale)
  const m3 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m3) {
    const d = parseInt(m3[1]), mo = parseInt(m3[2]);
    if (d > 12) return `${m3[3]}-${m3[2].padStart(2,'0')}-${m3[1].padStart(2,'0')}`;
    return `${m3[3]}-${m3[1].padStart(2,'0')}-${m3[2].padStart(2,'0')}`;
  }
  return null;
}

export async function fetchAllData() {
  const [resText, bancosText, dapText, calText, ffmmText] = await Promise.all(
    [SHEETS.resumen, SHEETS.bancos, SHEETS.dap, SHEETS.calendario, SHEETS.ffmm].map(url =>
      fetch(url, { cache: 'no-store' }).then(r => r.text()).catch(() => '')
    )
  );

  // Parse Bancos - skip title rows, find header
  const bancosRaw = parseCSV(bancosText);
  const bancos = bancosRaw
    .filter(r => r['Fecha'] && r['Banco'] && parseDate(r['Fecha']))
    .map(r => ({
      fecha: parseDate(r['Fecha']),
      banco: (r['Banco'] || '').trim(),
      descripcion: (r['Descripción'] || r['Descripcion'] || '').trim(),
      monto: parseNum(r['Monto']),
      saldoInicial: parseNum(r['Saldo Inicial']),
      saldoFinal: parseNum(r['Saldo Final']),
      comentario: (r['Comentario'] || r['COMENTARIO O QUE HACER'] || '').trim(),
      estado: (r['Estado'] || '').trim(),
    }));

  // Parse DAP
  const dapRaw = parseCSV(dapText);
  const dap = dapRaw
    .filter(r => r['Fecha Inicio'] && parseDate(r['Fecha Inicio']) && r['Fecha Inicio'] !== 'Total')
    .map(r => ({
      fechaInicio: parseDate(r['Fecha Inicio']),
      vencimiento: parseDate(r['Vencimiento']),
      dias: parseNum(r['Días']) || parseNum(r['Dias']) || 0,
      tasa: parsePct(r['Tasa']) || parseNum(r['Tasa']) || 0,
      montoInicial: parseNum(r['Monto Inicial']) || 0,
      montoFinal: parseNum(r['Monto Final']) || 0,
      ganancia: parseNum(r['Ganancia']) || 0,
      tipo: (r['Tipo'] || r['Tipo inversion/ trabajo'] || '').trim(),
      vigente: (r['Vigente'] || '').trim().toLowerCase(),
      banco: (r['Banco'] || '').trim(),
      estado: (r['Estado'] || r['estado'] || '').trim(),
      comentario: (r['Comentario'] || '').trim(),
    }));

  // Parse Calendario
  const calRaw = parseCSV(calText);
  const calendario = calRaw
    .filter(r => r['Fecha'] && parseDate(r['Fecha']) && r['Fecha'] !== 'TOTALES')
    .map(r => ({
      fecha: parseDate(r['Fecha']),
      monto: parseNum(r['Monto']) || 0,
      guardado: parseNum(r['Guardado']) || 0,
      falta: parseNum(r['Falta']) || 0,
      concepto: (r['Concepto'] || '').trim(),
      estado: (r['Estado'] || '').trim(),
      comentario: (r['Comentario'] || '').trim(),
    }));

  // Parse FFMM - has two sections: Saldos (row 5+) and Movimientos (row 14+)
  const ffmmRaw = parseCSV(ffmmText);
  const ffmmSaldos = [];
  const ffmmMovimientos = [];
  
  let inSaldos = false, inMov = false;
  const allRows = Papa.parse(ffmmText, { skipEmptyLines: true }).data;
  
  let saldoHeaders = null, movHeaders = null;
  for (let i = 0; i < allRows.length; i++) {
    const row = allRows[i];
    const first = (row[0] || '').trim();
    
    if (first === 'Empresa' && row[1] && (row[1].trim() === 'Fondo' || row[1].trim() === 'Fecha')) {
      if (!saldoHeaders && row[2] && row[2].trim() === 'Administradora') {
        saldoHeaders = row.map(c => (c||'').trim());
        inSaldos = true; inMov = false;
        continue;
      }
      if (!movHeaders && row[2] && row[2].trim() === 'Fondo') {
        movHeaders = row.map(c => (c||'').trim());
        inSaldos = false; inMov = true;
        continue;
      }
    }
    if (first === 'Fecha' && row[1] && row[1].trim() === 'Empresa') {
      movHeaders = row.map(c => (c||'').trim());
      inSaldos = false; inMov = true;
      continue;
    }
    if (first === 'HISTORIAL DE MOVIMIENTOS') { inSaldos = false; continue; }
    if (first === '' && row.every(c => !c || c.trim() === '')) continue;
    if (first === 'TOTAL' || first === 'TOTALES') { inSaldos = false; continue; }
    
    if (inSaldos && saldoHeaders && first && first !== 'SALDOS VIGENTES') {
      ffmmSaldos.push({
        empresa: (row[0]||'').trim(),
        fondo: (row[1]||'').trim(),
        admin: (row[2]||'').trim(),
        invertido: parseNum(row[3]) || 0,
        valorActual: parseNum(row[4]) || 0,
        rentabilidad: parseNum(row[5]) || 0,
      });
    }
    if (inMov && movHeaders && row[0]) {
      const fecha = parseDate(row[0]);
      if (fecha) {
        ffmmMovimientos.push({
          fecha,
          empresa: (row[1]||'').trim(),
          fondo: (row[2]||'').trim(),
          tipo: (row[3]||'').trim(),
          monto: parseNum(row[4]) || 0,
          comentario: (row[5]||'').trim(),
        });
      }
    }
  }

  return { bancos, dap, calendario, ffmmSaldos, ffmmMovimientos };
}

export function getToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
