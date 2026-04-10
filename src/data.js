import Papa from 'papaparse';

const BASE = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSlD_sQVnKW53q0m243_Gr0EletIkDxjaN1-mRzdlma7q6WktHBhXYBBunmz5ZyBg/pub';
const VENTAS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS07T19mYyF8IMvUMlgaOXG1uJboEoeFvlYtOqMGCwMx_uzAVxy_vKHFL-AjMxCA_lbG8uvBxjFzZpV/pub?gid=0&single=true&output=csv';

const SHEETS = {
  bancos:          `${BASE}?gid=1699395114&single=true&output=csv`,
  dap:             `${BASE}?gid=1020614134&single=true&output=csv`,
  calendario:      `${BASE}?gid=1876759165&single=true&output=csv`,
  ffmm:            `${BASE}?gid=1691837276&single=true&output=csv`,
  leasingDetalle:  `${BASE}?gid=675670021&single=true&output=csv`,
  leasingResumen:  `${BASE}?gid=771027573&single=true&output=csv`,
  credito:         `${BASE}?gid=1158539978&single=true&output=csv`,
};

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

function parsePct(v) {
  if (v == null || v === '' || v === '-') return null;
  let s = String(v).trim().replace('%', '').replace(',', '.').replace(/"/g, '');
  const n = parseFloat(s);
  if (isNaN(n)) return null;
  if (n > 0.1) return n / 100;
  return n;
}

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

function findHeaderIdx(lines, keywords) {
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const lineUp = lines[i].toUpperCase();
    if (keywords.every(k => lineUp.includes(k.toUpperCase()))) return i;
  }
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const lineUp = lines[i].toUpperCase();
    if (keywords.some(k => lineUp.includes(k.toUpperCase()))) return i;
  }
  return 0;
}

function parseNumCLP(v) {
  if (v == null || v === '' || v === '-' || v === '—') return 0;
  const s = String(v).trim().replace(/\$/g, '').replace(/\s/g, '').replace(/\./g, '');
  const n = parseInt(s, 10);
  return isNaN(n) ? 0 : n;
}

function parseNumUF(v) {
  if (v == null || v === '' || v === '-' || v === '—') return 0;
  let s = String(v).trim().replace(/\$/g, '').replace(/\s/g, '');
  s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function normalizeLeasingHeaders(parsed) {
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

// ── Ventas: detecta si la factura lleva IVA ──────────────────────────────────
function esAfecta(documento) {
  const d = (documento || '').toUpperCase();
  // Exenta o No Afecta → sin IVA
  if (d.includes('EXENTA') || d.includes('NO AFECTA') || d.includes('EXENTO')) return false;
  // Factura Electrónica → con IVA
  return true;
}

// ── Parsea la hoja de ventas y construye los agregados para flujo de caja ────
function parseVentas(text) {
  const raw = Papa.parse(text, { header: true, skipEmptyLines: true }).data;

  // Filas individuales con fecha + monto con IVA cuando corresponde
  const rows = raw
    .filter(r => {
      const fecha = parseDate(r['FECHA'] || r['Fecha'] || '');
      const neto = parseNum(r['NETO'] || r['Neto'] || '');
      return fecha && neto != null && neto > 0;
    })
    .map(r => {
      const fecha = parseDate(r['FECHA'] || r['Fecha'] || '');
      const neto = parseNum(r['NETO'] || r['Neto'] || '') || 0;
      const doc = r['DOCUMENTO'] || r['Documento'] || '';
      const afecta = esAfecta(doc);
      const montoReal = afecta ? Math.round(neto * 1.19) : neto; // IVA 19%
      return {
        fecha,
        neto,
        montoReal,   // lo que llega al banco
        afecta,
        razonSocial: (r['RAZON SOCIAL'] || r['Razón Social'] || '').trim(),
        folio: r['FOLIO'] || r['Folio'] || '',
      };
    });

  // Agrupar por mes YYYY-MM
  const porMes = {};
  rows.forEach(r => {
    const mes = r.fecha.substring(0, 7);
    if (!porMes[mes]) porMes[mes] = { mes, neto: 0, montoReal: 0, facturas: 0 };
    porMes[mes].neto += r.neto;
    porMes[mes].montoReal += r.montoReal;
    porMes[mes].facturas += 1;
  });

  // Agrupar por día YYYY-MM-DD
  const porDia = {};
  rows.forEach(r => {
    if (!porDia[r.fecha]) porDia[r.fecha] = { fecha: r.fecha, neto: 0, montoReal: 0, facturas: 0 };
    porDia[r.fecha].neto += r.neto;
    porDia[r.fecha].montoReal += r.montoReal;
    porDia[r.fecha].facturas += 1;
  });

  return {
    rows,
    porMes: Object.values(porMes).sort((a, b) => a.mes.localeCompare(b.mes)),
    porDia: Object.values(porDia).sort((a, b) => a.fecha.localeCompare(b.fecha)),
  };
}

export async function fetchAllData() {
  // Fetches en paralelo: hojas internas + ventas
  const [
    bancosText, dapText, calText, ffmmText,
    leasingDetText, leasingResText, creditoText,
    ventasText,
  ] = await Promise.all([
    ...Object.values(SHEETS).map(url =>
      fetch(url, { cache: 'no-store' }).then(r => r.text()).catch(() => '')
    ),
    fetch(VENTAS_URL, { cache: 'no-store' }).then(r => r.text()).catch(() => ''),
  ]);

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

  // ── LEASING DETALLE ───────────────────────────────────────────────────────
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

  // ── LEASING RESUMEN ───────────────────────────────────────────────────────
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

  // ── CRÉDITO COMERCIAL ─────────────────────────────────────────────────────
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

  const creditoPendiente = credito.filter(c => c.fechaVenc >= hoyCredito);
  const saldoInsolutoActual = creditoPendiente
    .filter(c => c.valorCuota > 0)
    .reduce((s, c) => s + c.valorCuota, 0);

  // ── VENTAS ────────────────────────────────────────────────────────────────
  const ventas = parseVentas(ventasText);

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
    ventas,
  };
}

export function getToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
