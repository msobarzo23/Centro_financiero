import Papa from 'papaparse';

const BASE = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSlD_sQVnKW53q0m243_Gr0EletIkDxjaN1-mRzdlma7q6WktHBhXYBBunmz5ZyBg/pub';

const SHEETS = {
  bancos:          `${BASE}?gid=1699395114&single=true&output=csv`,
  dap:             `${BASE}?gid=1020614134&single=true&output=csv`,
  calendario:      `${BASE}?gid=1876759165&single=true&output=csv`,
  ffmm:            `${BASE}?gid=1691837276&single=true&output=csv`,
  leasingDetalle:  `${BASE}?gid=675670021&single=true&output=csv`,
  leasingResumen:  `${BASE}?gid=771027573&single=true&output=csv`,
};

// Skip title rows (first 3 rows are title/description/blank)
function skipTitleRows(text) {
  const lines = text.split('\n');
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
  s = s.replace(/\$/g, '').replace(/\s/g, '');
  const isNeg = s.startsWith('(') && s.endsWith(')');
  if (isNeg) s = s.slice(1, -1);
  if (s.includes('.') && s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes('.')) {
    const dotCount = (s.match(/\./g) || []).length;
    if (dotCount > 1) {
      s = s.replace(/\./g, '');
    } else {
      const parts = s.split('.');
      if (parts[1] && parts[1].length === 3) {
        s = s.replace('.', '');
      }
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
  if (n > 0.1) return n / 100;
  return n;
}

// Parse date DD/MM/YYYY or YYYY-MM-DD
function parseDate(v) {
  if (!v) return null;
  const s = String(v).trim();
  const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m1) {
    const day = m1[1].padStart(2, '0');
    const month = m1[2].padStart(2, '0');
    return `${m1[3]}-${month}-${day}`;
  }
  const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}`;
  return null;
}

// Encuentra la fila de encabezado en hojas con títulos decorativos arriba.
// Busca la primera fila que contenga TODAS las palabras clave indicadas.
function findHeaderIdx(lines, keywords) {
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const lineUp = lines[i].toUpperCase();
    if (keywords.every(k => lineUp.includes(k.toUpperCase()))) return i;
  }
  // Fallback: buscar cualquiera
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const lineUp = lines[i].toUpperCase();
    if (keywords.some(k => lineUp.includes(k.toUpperCase()))) return i;
  }
  return 0;
}

export async function fetchAllData() {
  const results = await Promise.all(
    Object.values(SHEETS).map(url =>
      fetch(url, { cache: 'no-store' }).then(r => r.text()).catch(() => '')
    )
  );
  const [bancosText, dapText, calText, ffmmText, leasingDetText, leasingResText] = results;

  // ── Bancos ────────────────────────────────────────────────────────────────
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

  // ── DAP ───────────────────────────────────────────────────────────────────
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
        ganancia,
        tipo: (r['Tipo'] || '').trim(),
        vigente: (r['Vigente'] || '').trim().toLowerCase(),
        banco: (r['Banco'] || '').trim(),
        estado: (r['Estado'] || r['estado'] || '').trim(),
        comentario: (r['Comentario'] || '').trim(),
      };
    });

  // ── Calendario ────────────────────────────────────────────────────────────
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

  // ── FFMM ──────────────────────────────────────────────────────────────────
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

  // ── LEASING DETALLE (NUEVO) ───────────────────────────────────────────────
  // Header contiene "ID", "Banco" y "Estado" en la misma fila.
  const leasingDetLines = leasingDetText.split('\n');
  const leasingDetHeaderIdx = findHeaderIdx(leasingDetLines, ['ID', 'BANCO', 'ESTADO']);
  const leasingDetCSV = leasingDetLines.slice(leasingDetHeaderIdx).join('\n');
  const leasingDetRaw = Papa.parse(leasingDetCSV, { header: true, skipEmptyLines: true }).data;

  const leasingDetalle = leasingDetRaw
    .filter(r => {
      const banco = (r['Banco / Emisor'] || r['Banco/Emisor'] || r['Banco'] || '').trim();
      const estado = (r['Estado'] || '').trim().toUpperCase();
      return banco !== '' && !banco.toUpperCase().includes('TOTAL') && estado === 'ACTIVO';
    })
    .map(r => ({
      id:             (r['ID'] || '').trim(),
      banco:          (r['Banco / Emisor'] || r['Banco/Emisor'] || r['Banco'] || '').trim(),
      nTractos:       parseNum(r['N Tractos'] || r['N° Tractos'] || '') || 0,
      cuotaUFIndiv:   parseNum(r['Cuota UF Individual'] || '') || 0,
      cuotaUFGrupo:   parseNum(r['Cuota UF Total Grupo'] || r['Cuota UF Grupo'] || '') || 0,
      diaVto:         parseNum(r['Dia Vcto'] || r['Día Vcto'] || '') || 0,
      fechaInicio:    parseDate(r['Fecha Inicio']) || '',
      fechaFin:       parseDate(r['Fecha Fin (Vencimiento)'] || r['Fecha Fin'] || r['Vencimiento'] || '') || '',
      cuotasTotales:  parseNum(r['Cuotas Totales'] || '') || 0,
      cuotasPagadas:  parseNum(r['Cuotas Pagadas'] || '') || 0,
      cuotasPorPagar: parseNum(r['Cuotas Por Pagar'] || '') || 0,
      estado:         (r['Estado'] || '').trim(),
      deudaUF:        parseNum(r['Deuda Pendiente UF'] || '') || 0,
      cuotaCLPsIVA:   parseNum(r['Cuota CLP s/IVA'] || r['Cuota CLP s IVA'] || '') || 0,
      cuotaCLPcIVA:   parseNum(r['Cuota CLP c/IVA'] || r['Cuota CLP c IVA'] || '') || 0,
    }));

  // ── LEASING RESUMEN (NUEVO) ───────────────────────────────────────────────
  // Header contiene "Mes" y "Cuota" en la misma fila.
  const leasingResLines = leasingResText.split('\n');
  const leasingResHeaderIdx = findHeaderIdx(leasingResLines, ['MES', 'CUOTA']);
  const leasingResCSV = leasingResLines.slice(leasingResHeaderIdx).join('\n');
  const leasingResRaw = Papa.parse(leasingResCSV, { header: true, skipEmptyLines: true }).data;

  const leasingResumen = leasingResRaw
    .filter(r => {
      const mes = (r['Mes'] || '').trim();
      return mes !== '' && mes.toUpperCase() !== 'MES' && !mes.toUpperCase().includes('TOTAL');
    })
    .map(r => ({
      mes:              (r['Mes'] || '').trim(),
      anio:             (r['Anio'] || r['Año'] || '').trim(),
      cuotaUFTotal:     parseNum(r['Cuota UF Total Mes'] || r['Cuota UF Total'] || '') || 0,
      cuotaCLPsIVA:     parseNum(r['Cuota CLP s/IVA'] || r['Cuota CLP s IVA'] || '') || 0,
      cuotaCLPcIVA:     parseNum(r['Cuota CLP c/IVA'] || r['Cuota CLP c IVA'] || '') || 0,
      // BCI cobra en dos fechas distintas (día 5 y día 15)
      bciDia5:          parseNum(r['BCI (UF) Dia 5'] || r['BCI (UF) Día 5'] || r['BCI Dia5'] || r['BCI (UF)'] || '') || 0,
      bciDia15:         parseNum(r['BCI (UF) Dia 15'] || r['BCI (UF) Día 15'] || r['BCI Dia15'] || '') || 0,
      vfsVolvo:         parseNum(r['VFS VOLVO (UF)'] || r['VFS VOLVO'] || r['VFS (UF)'] || '') || 0,
      bancoChile:       parseNum(r['BANCO DE CHILE (UF)'] || r['BANCO DE CHILE'] || r['Banco Chile (UF)'] || '') || 0,
      contratosActivos: parseNum(r['Contratos Activos'] || '') || 0,
      vesteEstesMes:    (r['Vence este mes'] || '').trim(),
      delta:            parseNum(r['Delta vs mes anterior'] || r['Delta'] || '') || 0,
    }));

  return {
    bancos,
    dap,
    calendario,
    ffmmSaldos,
    ffmmMovimientos,
    leasingDetalle,
    leasingResumen,
  };
}

export function getToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
