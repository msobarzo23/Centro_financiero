import Papa from 'papaparse';

const BASE = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSlD_sQVnKW53q0m243_Gr0EletIkDxjaN1-mRzdlma7q6WktHBhXYBBunmz5ZyBg/pub';

const SHEETS = {
  bancos:          `${BASE}?gid=1699395114&single=true&output=csv`,
  dap:             `${BASE}?gid=1020614134&single=true&output=csv`,
  calendario:      `${BASE}?gid=1876759165&single=true&output=csv`,
  ffmm:            `${BASE}?gid=1691837276&single=true&output=csv`,
  leasingDetalle:  `${BASE}?gid=675670021&single=true&output=csv`,
  leasingResumen:  `${BASE}?gid=771027573&single=true&output=csv`,
  credito:         `${BASE}?gid=1158539978&single=true&output=csv`,
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

// Parsea número entero chileno SIN decimales: 29.481.984 → 29481984
// Los puntos son siempre separadores de miles (no hay decimales en CLP).
function parseNumCLP(v) {
  if (v == null || v === '' || v === '-' || v === '—') return 0;
  const s = String(v).trim().replace(/\$/g, '').replace(/\s/g, '').replace(/\./g, '');
  const n = parseInt(s, 10);
  return isNaN(n) ? 0 : n;
}

// Parsea número UF con coma decimal: "3.730,98" → 3730.98
// Puntos = miles, coma = decimal.
function parseNumUF(v) {
  if (v == null || v === '' || v === '-' || v === '—') return 0;
  let s = String(v).trim().replace(/\$/g, '').replace(/\s/g, '');
  // "3.730,98" → remove dots → "373098" → replace comma → "3730.98"
  s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

// Limpia texto CSV de leasing: los headers tienen saltos de línea dentro de
// celdas con comillas ("Cuota CLP\nc/IVA"). Papa los maneja bien si le pasamos
// el texto raw completo, pero necesitamos normalizar los headers resultantes
// para poder acceder por nombre sin depender del salto de línea.
function normalizeLeasingHeaders(parsed) {
  // Papa.parse devuelve { data, meta }. Los campos con \n en el header quedan
  // como "Cuota CLP\nc/IVA". Los normalizamos reemplazando \n por espacio.
  const remap = {};
  (parsed.meta.fields || []).forEach(f => {
    const clean = f.replace(/\r?\n/g, ' ').trim();
    if (clean !== f) remap[f] = clean;
  });
  if (Object.keys(remap).length === 0) return parsed.data;
  return parsed.data.map(row => {
    const newRow = { ...row };
    Object.entries(remap).forEach(([oldKey, newKey]) => {
      newRow[newKey] = newRow[oldKey];
      delete newRow[oldKey];
    });
    return newRow;
  });
}

export async function fetchAllData() {
  const results = await Promise.all(
    Object.values(SHEETS).map(url =>
      fetch(url, { cache: 'no-store' }).then(r => r.text()).catch(() => '')
    )
  );
  const [bancosText, dapText, calText, ffmmText, leasingDetText, leasingResText, creditoText] = results;

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
  // La hoja tiene 3 filas de título antes del header real (fila 4).
  // Los headers tienen saltos de línea dentro de comillas, ej:
  //   "Cuota CLP\nc/IVA" → Papa lo lee con \n en el key.
  // Usamos normalizeLeasingHeaders() para aplanar esos keys a espacio.
  // Formatos numéricos:
  //   UF:  "3.730,98"   → coma decimal  → parseNumUF
  //   CLP: 29.481.984   → puntos=miles, sin decimales → parseNumCLP
  const leasingDetLines = leasingDetText.split('\n');
  const leasingDetHeaderIdx = findHeaderIdx(leasingDetLines, ['ID', 'BANCO']);
  const leasingDetCSV = leasingDetLines.slice(leasingDetHeaderIdx).join('\n');
  const leasingDetParsed = Papa.parse(leasingDetCSV, { header: true, skipEmptyLines: true });
  const leasingDetNorm = normalizeLeasingHeaders(leasingDetParsed);

  const leasingDetalle = leasingDetNorm
    .filter(r => {
      const banco = (r['Banco / Emisor'] || r['Banco/Emisor'] || r['Banco'] || '').trim();
      const estado = (r['Estado'] || '').trim().toUpperCase();
      return banco !== '' && !banco.toUpperCase().includes('TOTAL') && estado === 'ACTIVO';
    })
    .map(r => {
      const g = (...keys) => { for (const k of keys) { if (r[k] != null && r[k] !== '') return r[k]; } return ''; };
      return {
        id:             (r['ID'] || '').trim(),
        banco:          g('Banco / Emisor', 'Banco/Emisor', 'Banco').trim(),
        nTractos:       parseNum(g('N Tractos', 'N° Tractos')) || 0,
        cuotaUFIndiv:   parseNumUF(g('Cuota UF Individual', 'Cuota UF  Individual')),
        cuotaUFGrupo:   parseNumUF(g('Cuota UF Total Grupo', 'Cuota UF  Total Grupo', 'Cuota UF Grupo')),
        diaVto:         parseNum(g('Dia Vcto', 'Día Vcto')) || 0,
        fechaInicio:    parseDate(g('Fecha Inicio')) || '',
        fechaFin:       parseDate(g('Fecha Fin (Vencimiento)', 'Fecha Fin  (Vencimiento)', 'Fecha Fin', 'Vencimiento')) || '',
        cuotasTotales:  parseNum(g('Cuotas Totales', 'Cuotas  Totales')) || 0,
        cuotasPagadas:  parseNum(g('Cuotas Pagadas', 'Cuotas  Pagadas')) || 0,
        cuotasPorPagar: parseNum(g('Cuotas Por Pagar', 'Cuotas Por  Pagar')) || 0,
        estado:         (r['Estado'] || '').trim(),
        deudaUF:        parseNumUF(g('Deuda Pendiente UF', 'Deuda  Pendiente UF')),
        cuotaCLPsIVA:   parseNumCLP(g('Cuota CLP s/IVA', 'Cuota CLP  s/IVA', 'Cuota CLP s IVA')),
        cuotaCLPcIVA:   parseNumCLP(g('Cuota CLP c/IVA', 'Cuota CLP  c/IVA', 'Cuota CLP c IVA')),
      };
    });

  // ── LEASING RESUMEN (NUEVO) ───────────────────────────────────────────────
  // Header contiene "Mes" y "Cuota" en la misma fila.
  // CLP con IVA → parseNumCLP, UF → parseNumUF.
  const leasingResLines = leasingResText.split('\n');
  const leasingResHeaderIdx = findHeaderIdx(leasingResLines, ['MES', 'CUOTA']);
  const leasingResCSV = leasingResLines.slice(leasingResHeaderIdx).join('\n');
  const leasingResParsed = Papa.parse(leasingResCSV, { header: true, skipEmptyLines: true });
  const leasingResNorm = normalizeLeasingHeaders(leasingResParsed);

  const leasingResumen = leasingResNorm
    .filter(r => {
      const mes = (r['Mes'] || '').trim();
      return mes !== '' && mes.toUpperCase() !== 'MES' && !mes.toUpperCase().includes('TOTAL');
    })
    .map(r => {
      const g = (...keys) => { for (const k of keys) { if (r[k] != null && r[k] !== '') return r[k]; } return ''; };
      return {
        mes:              (r['Mes'] || '').trim(),
        anio:             (r['Anio'] || r['Año'] || '').trim(),
        cuotaUFTotal:     parseNumUF(g('Cuota UF Total Mes', 'Cuota UF Total')),
        cuotaCLPsIVA:     parseNumCLP(g('Cuota CLP s/IVA', 'Cuota CLP s IVA')),
        cuotaCLPcIVA:     parseNumCLP(g('Cuota CLP c/IVA', 'Cuota CLP c IVA')),
        bciDia5:          parseNumUF(g('BCI (UF) Dia 5', 'BCI (UF) Día 5', 'BCI Dia5', 'BCI (UF)')),
        bciDia15:         parseNumUF(g('BCI (UF) Dia 15', 'BCI (UF) Día 15', 'BCI Dia15')),
        vfsVolvo:         parseNumUF(g('VFS VOLVO (UF)', 'VFS VOLVO', 'VFS (UF)')),
        bancoChile:       parseNumUF(g('BANCO DE CHILE (UF)', 'BANCO DE CHILE', 'Banco Chile (UF)')),
        contratosActivos: parseNum(g('Contratos Activos')) || 0,
        vesteEstesMes:    (r['Vence este mes'] || '').trim(),
        delta:            parseNumCLP(g('Delta vs mes anterior', 'Delta')),
      };
    });

  // ── CRÉDITO COMERCIAL ────────────────────────────────────────────────────
  // CSV tiene header en fila 1 directamente, sin títulos decorativos.
  // Formato CLP con $: "$5.000.000.000" → parseNumCLP tras quitar $
  const creditoRaw = Papa.parse(creditoText, { header: true, skipEmptyLines: true }).data;
  const hoyCredito = getToday();

  const credito = creditoRaw
    .filter(r => {
      const nc = r['N° Cuota'] || r['N Cuota'] || r['N°Cuota'] || '';
      return nc !== '' && !isNaN(parseInt(nc));
    })
    .map(r => {
      const fechaVenc = parseDate(r['Fecha Vencimiento'] || '');
      return {
        nCuota:       parseInt(r['N° Cuota'] || r['N Cuota'] || '0', 10),
        fechaVenc:    fechaVenc || '',
        amortizacion: parseNumCLP(r['Amortización Capital'] || r['Amortizacion Capital'] || ''),
        interes:      parseNumCLP(r['Monto Interés'] || r['Monto Interes'] || ''),
        valorCuota:   parseNumCLP(r['Valor Cuota'] || ''),
        saldoInsoluto:parseNumCLP(r['Saldo Insoluto'] || ''),
        pagada:       fechaVenc ? fechaVenc < hoyCredito : false,
      };
    });

  // Cuotas pendientes = las que vencen hoy o después
  const creditoPendiente = credito.filter(c => c.fechaVenc >= hoyCredito);
  // Saldo insoluto actual = primera cuota pendiente (o última si todas pagadas)
  const saldoInsolutoActual = creditoPendiente.length > 0
    ? creditoPendiente[0].saldoInsoluto
    : credito.length > 0 ? credito[credito.length - 1].saldoInsoluto : 0;

  return {
    bancos,
    dap,
    calendario,
    ffmmSaldos,
    ffmmMovimientos,
    leasingDetalle,
    leasingResumen,
    credito,
    creditoPendiente,
    saldoInsolutoActual,
  };
}

export function getToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
