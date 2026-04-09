import Papa from 'papaparse';

const BASE = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSlD_sQVnKW53q0m243_Gr0EletIkDxjaN1-mRzdlma7q6WktHBhXYBBunmz5ZyBg/pub';

const SHEETS = {
  bancos:     `${BASE}?gid=1699395114&single=true&output=csv`,
  dap:        `${BASE}?gid=1020614134&single=true&output=csv`,
  calendario: `${BASE}?gid=1876759165&single=true&output=csv`,
  ffmm:       `${BASE}?gid=1691837276&single=true&output=csv`,
};

// Skip title rows (first 3 rows are title/description/blank)
function skipTitleRows(text) {
  const lines = text.split('\n');
  // Find the header row - it's the one that has actual column names
  // Usually row index 3 (4th row, after title, description, blank)
  let headerIdx = 0;
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const line = lines[i].trim();
    if (line.startsWith('Fecha') || line.startsWith('Empresa')) {
      headerIdx = i;
      break;
    }
  }
  return lines.slice(headerIdx).join('\n');
}

function parseCSV(text) {
  const cleaned = skipTitleRows(text);
  return Papa.parse(cleaned, { header: true, skipEmptyLines: true }).data;
}

// Parse Chilean number format: 684.491.358 or $684.491.358 or (123.456)
function parseNum(v) {
  if (v == null || v === '' || v === '-' || v === '—') return null;
  let s = String(v).trim();
  // Remove $ and spaces
  s = s.replace(/\$/g, '').replace(/\s/g, '');
  // Check for parentheses (negative)
  const isNeg = s.startsWith('(') && s.endsWith(')');
  if (isNeg) s = s.slice(1, -1);
  // Chilean format: dots are thousands, comma is decimal
  // If has dots and no comma: 684.491.358 → remove dots
  // If has dots and comma: 1.234,56 → remove dots, replace comma with dot
  if (s.includes('.') && s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes('.')) {
    // Could be 684.491.358 (thousands) or 0.39 (decimal)
    // If multiple dots, definitely thousands separator
    const dotCount = (s.match(/\./g) || []).length;
    if (dotCount > 1) {
      s = s.replace(/\./g, '');
    } else {
      // Single dot: check if it looks like thousands (3 digits after dot)
      const parts = s.split('.');
      if (parts[1] && parts[1].length === 3) {
        s = s.replace('.', ''); // thousands
      }
      // else keep as decimal
    }
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }
  const n = parseFloat(s);
  return isNaN(n) ? null : (isNeg ? -n : n);
}

// Parse tasa: "0,560%" or "0.39%" or 0.0039
function parsePct(v) {
  if (v == null || v === '' || v === '-') return null;
  let s = String(v).trim().replace('%', '').replace(',', '.').replace(/"/g, '');
  const n = parseFloat(s);
  if (isNaN(n)) return null;
  // If value > 0.1, it's likely a percentage like 0.390% meaning 0.00390
  if (n > 0.1) return n / 100;
  return n;
}

// Parse date DD/MM/YYYY or YYYY-MM-DD
function parseDate(v) {
  if (!v) return null;
  const s = String(v).trim();
  // DD/MM/YYYY
  const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m1) {
    const day = m1[1].padStart(2, '0');
    const month = m1[2].padStart(2, '0');
    return `${m1[3]}-${month}-${day}`;
  }
  // YYYY-MM-DD
  const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}`;
  return null;
}

export async function fetchAllData() {
  const results = await Promise.all(
    Object.values(SHEETS).map(url =>
      fetch(url, { cache: 'no-store' }).then(r => r.text()).catch(() => '')
    )
  );
  const [bancosText, dapText, calText, ffmmText] = results;

  // Parse Bancos
  const bancosRaw = parseCSV(bancosText);
  const bancos = bancosRaw
    .filter(r => r['Fecha'] && parseDate(r['Fecha']))
    .map(r => ({
      fecha: parseDate(r['Fecha']),
      banco: (r['Banco'] || '').trim(),
      descripcion: (r['Descripción'] || r['Descripcion'] || '').trim(),
      monto: parseNum(r['Monto']),
      saldoInicial: parseNum(r['Saldo Inicial']),
      saldoFinal: parseNum(r['Saldo Final']),
      comentario: (r['Comentario'] || '').trim(),
      estado: (r['Estado'] || '').trim(),
    }));

  // Parse DAP
  const dapRaw = parseCSV(dapText);
  const dap = dapRaw
    .filter(r => {
      const fi = r['Fecha Inicio'] || '';
      return fi && fi !== 'Total' && fi !== 'TOTALES' && parseDate(fi);
    })
    .map(r => {
      const tasa = parsePct(r['Tasa']) || 0;
      const montoIni = parseNum(r['Monto Inicial']) || 0;
      const montoFin = parseNum(r['Monto Final']) || 0;
      const ganancia = parseNum(r['Ganancia']) || 0;
      return {
        fechaInicio: parseDate(r['Fecha Inicio']),
        vencimiento: parseDate(r['Vencimiento']),
        dias: parseNum(r['Días']) || parseNum(r['Dias']) || 0,
        tasa,
        montoInicial: montoIni,
        montoFinal: montoFin,
        ganancia: ganancia,
        tipo: (r['Tipo'] || '').trim(),
        vigente: (r['Vigente'] || '').trim().toLowerCase(),
        banco: (r['Banco'] || '').trim(),
        estado: (r['Estado'] || r['estado'] || '').trim(),
        comentario: (r['Comentario'] || '').trim(),
      };
    });

  // Parse Calendario
  const calRaw = parseCSV(calText);
  const calendario = calRaw
    .filter(r => {
      const f = r['Fecha'] || '';
      return f && f !== 'TOTALES' && f !== 'Total' && parseDate(f);
    })
    .map(r => ({
      fecha: parseDate(r['Fecha']),
      monto: parseNum(r['Monto']) || 0,
      guardado: parseNum(r['Guardado']) || 0,
      falta: parseNum(r['Falta']) || 0,
      concepto: (r['Concepto'] || '').trim(),
      estado: (r['Estado'] || '').trim(),
      comentario: (r['Comentario'] || '').trim(),
    }));

  // Parse FFMM - two sections in one sheet
  const ffmmLines = ffmmText.split('\n');
  const ffmmSaldos = [];
  const ffmmMovimientos = [];

  let saldoHeaderIdx = -1, movHeaderIdx = -1;
  for (let i = 0; i < ffmmLines.length; i++) {
    const line = ffmmLines[i];
    if (line.includes('Empresa') && line.includes('Administradora')) saldoHeaderIdx = i;
    if (line.includes('Fecha') && line.includes('Empresa') && line.includes('Tipo')) movHeaderIdx = i;
  }

  if (saldoHeaderIdx >= 0) {
    const saldoEnd = movHeaderIdx > 0 ? movHeaderIdx : ffmmLines.length;
    const saldoCSV = ffmmLines.slice(saldoHeaderIdx, saldoEnd).join('\n');
    const saldoData = Papa.parse(saldoCSV, { header: true, skipEmptyLines: true }).data;
    for (const r of saldoData) {
      const empresa = (r['Empresa'] || '').trim();
      if (!empresa || empresa === 'TOTAL' || empresa === 'TOTALES' || empresa === 'SALDOS VIGENTES' || empresa === 'HISTORIAL DE MOVIMIENTOS') continue;
      ffmmSaldos.push({
        empresa,
        fondo: (r['Fondo'] || '').trim(),
        admin: (r['Administradora'] || '').trim(),
        invertido: parseNum(r['Monto Invertido']) || 0,
        valorActual: parseNum(r['Valor Actual']) || 0,
        rentabilidad: parseNum(r['Rentabilidad']) || 0,
      });
    }
  }

  if (movHeaderIdx >= 0) {
    const movCSV = ffmmLines.slice(movHeaderIdx).join('\n');
    const movData = Papa.parse(movCSV, { header: true, skipEmptyLines: true }).data;
    for (const r of movData) {
      const fecha = parseDate(r['Fecha']);
      if (!fecha) continue;
      ffmmMovimientos.push({
        fecha,
        empresa: (r['Empresa'] || '').trim(),
        fondo: (r['Fondo'] || '').trim(),
        tipo: (r['Tipo'] || '').trim(),
        monto: parseNum(r['Monto']) || 0,
        comentario: (r['Comentario'] || '').trim(),
      });
    }
  }

  return { bancos, dap, calendario, ffmmSaldos, ffmmMovimientos };
}

export function getToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
