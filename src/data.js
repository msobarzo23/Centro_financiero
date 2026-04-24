import Papa from 'papaparse';
import { parseCLP, parseUF, parsePct, parseDate, parseNum, getToday } from './utils/parsers.js';
import { validarData } from './utils/schemas.js';

// ─── Configuración desde .env ───────────────────────────────────────────────
const BASE = import.meta.env.VITE_SHEET_BASE;
const VENTAS_URL = import.meta.env.VITE_VENTAS_URL;
const IVA = 0.19;

const SHEETS = {
  bancos: `${BASE}?gid=${import.meta.env.VITE_GID_BANCOS}&single=true&output=csv`,
  dap: `${BASE}?gid=${import.meta.env.VITE_GID_DAP}&single=true&output=csv`,
  calendario: `${BASE}?gid=${import.meta.env.VITE_GID_CALENDARIO}&single=true&output=csv`,
  ffmm: `${BASE}?gid=${import.meta.env.VITE_GID_FFMM}&single=true&output=csv`,
  leasingDetalle: `${BASE}?gid=${import.meta.env.VITE_GID_LEASING_DETALLE}&single=true&output=csv`,
  leasingResumen: `${BASE}?gid=${import.meta.env.VITE_GID_LEASING_RESUMEN}&single=true&output=csv`,
  credito: `${BASE}?gid=${import.meta.env.VITE_GID_CREDITO}&single=true&output=csv`,
};

// ─── Helpers de CSV ─────────────────────────────────────────────────────────
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
  if (!text) return [];
  return Papa.parse(skipTitleRows(text), { header: true, skipEmptyLines: true }).data;
}

function findHeaderIdx(lines, keywords) {
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const lineUp = lines[i].toUpperCase();
    if (keywords.every((k) => lineUp.includes(k.toUpperCase()))) return i;
  }
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const lineUp = lines[i].toUpperCase();
    if (keywords.some((k) => lineUp.includes(k.toUpperCase()))) return i;
  }
  return 0;
}

// Extrae un bloque CSV desde la primera línea que cumpla el patrón regex
// hasta la primera banda separadora (2+ líneas consecutivas que sólo tengan
// comas/espacios). Los Google Sheets publicados a CSV usan ",,,,,,,," como
// fila vacía, no \n\n, así que no basta con buscar newlines puros.
function extractCsvBlock(text, headerRegex) {
  if (!text) return '';
  const m = text.match(headerRegex);
  if (!m) return '';
  const sub = text.slice(m.index);
  // 3 saltos de línea donde entre ellos sólo hay comas/espacios/tabs => 2
  // líneas sin datos reales == fin de tabla.
  const endMatch = sub.match(/\r?\n[ \t,]*\r?\n[ \t,]*\r?\n/);
  if (endMatch && endMatch.index > 0) return sub.slice(0, endMatch.index);
  return sub;
}

function normalizeLeasingHeaders(parsed) {
  const remap = {};
  (parsed.meta.fields || []).forEach((f) => {
    const clean = f.replace(/\r?\n/g, ' ').trim();
    if (clean !== f) remap[f] = clean;
  });
  if (Object.keys(remap).length === 0) return parsed.data;
  return parsed.data.map((row) => {
    const newRow = { ...row };
    Object.entries(remap).forEach(([oldKey, newKey]) => {
      newRow[newKey] = newRow[oldKey];
      delete newRow[oldKey];
    });
    return newRow;
  });
}

// ─── Ventas ────────────────────────────────────────────────────────────────
function esAfecta(documento) {
  const d = (documento || '').toUpperCase();
  if (d.includes('EXENTA') || d.includes('NO AFECTA') || d.includes('EXENTO')) return false;
  return true;
}

function parseVentas(text) {
  if (!text) return { rows: [], porMes: [], porDia: [] };
  const raw = Papa.parse(text, { header: true, skipEmptyLines: true }).data;

  const rows = raw
    .filter((r) => {
      const fecha = parseDate(r['FECHA'] || r['Fecha'] || '');
      const neto = parseNum(r['NETO'] || r['Neto'] || '');
      return fecha && neto != null && neto > 0;
    })
    .map((r) => {
      const fecha = parseDate(r['FECHA'] || r['Fecha'] || '');
      const neto = parseNum(r['NETO'] || r['Neto'] || '') || 0;
      const doc = r['DOCUMENTO'] || r['Documento'] || '';
      const afecta = esAfecta(doc);
      const montoReal = afecta ? Math.round(neto * (1 + IVA)) : neto;
      return {
        fecha,
        neto,
        montoReal,
        afecta,
        razonSocial: (r['RAZON SOCIAL'] || r['Razón Social'] || '').trim(),
        folio: r['FOLIO'] || r['Folio'] || '',
      };
    });

  const porMes = {};
  rows.forEach((r) => {
    const mes = r.fecha.substring(0, 7);
    if (!porMes[mes]) porMes[mes] = { mes, neto: 0, montoReal: 0, facturas: 0 };
    porMes[mes].neto += r.neto;
    porMes[mes].montoReal += r.montoReal;
    porMes[mes].facturas += 1;
  });

  const porDia = {};
  rows.forEach((r) => {
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

// ─── Fetch con track de errores por hoja ───────────────────────────────────
async function fetchSheet(url, nombre, errores) {
  if (!url) {
    errores.push({ hoja: nombre, motivo: 'URL no configurada en .env' });
    return '';
  }
  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) {
      errores.push({ hoja: nombre, motivo: `HTTP ${r.status}` });
      return '';
    }
    return await r.text();
  } catch (e) {
    errores.push({ hoja: nombre, motivo: e.message || 'Error de red' });
    return '';
  }
}

// ─── Fetch principal ───────────────────────────────────────────────────────
export async function fetchAllData() {
  if (!BASE || !VENTAS_URL) {
    throw new Error(
      'Faltan variables de entorno VITE_SHEET_BASE y/o VITE_VENTAS_URL. Revisa .env',
    );
  }

  const errores = [];
  const [
    bancosText,
    dapText,
    calText,
    ffmmText,
    leasingDetText,
    leasingResText,
    creditoText,
    ventasText,
  ] = await Promise.all([
    fetchSheet(SHEETS.bancos, 'Bancos', errores),
    fetchSheet(SHEETS.dap, 'DAP', errores),
    fetchSheet(SHEETS.calendario, 'Calendario', errores),
    fetchSheet(SHEETS.ffmm, 'Fondos Mutuos', errores),
    fetchSheet(SHEETS.leasingDetalle, 'Leasing Detalle', errores),
    fetchSheet(SHEETS.leasingResumen, 'Leasing Resumen', errores),
    fetchSheet(SHEETS.credito, 'Crédito', errores),
    fetchSheet(VENTAS_URL, 'Ventas', errores),
  ]);

  // ── Bancos ──
  const bancos = parseCSV(bancosText)
    .filter((r) => r['Fecha'] && parseDate(r['Fecha']))
    .map((r) => ({
      fecha: parseDate(r['Fecha']),
      banco: (r['Banco'] || '').trim(),
      descripcion: (r['Descripción'] || r['Descripcion'] || '').trim(),
      monto: parseNum(r['Monto']),
      saldoInicial: parseNum(r['Saldo Inicial']),
      saldoFinal: parseNum(r['Saldo Final']),
      comentario: (r['Comentario'] || '').trim(),
      estado: (r['Estado'] || '').trim(),
    }));

  // ── DAP ──
  const dap = parseCSV(dapText)
    .filter((r) => {
      const fi = r['Fecha Inicio'] || '';
      return fi && fi !== 'Total' && fi !== 'TOTALES' && parseDate(fi);
    })
    .map((r) => ({
      fechaInicio: parseDate(r['Fecha Inicio']),
      vencimiento: parseDate(r['Vencimiento']),
      dias: parseNum(r['Días']) || parseNum(r['Dias']) || 0,
      tasa: parsePct(r['Tasa']) || 0,
      montoInicial: parseCLP(r['Monto Inicial']),
      montoFinal: parseCLP(r['Monto Final']),
      ganancia: parseCLP(r['Ganancia']),
      tipo: (r['Tipo'] || '').trim(),
      vigente: (r['Vigente'] || '').trim().toLowerCase(),
      banco: (r['Banco'] || '').trim(),
      estado: (r['Estado'] || r['estado'] || '').trim(),
      comentario: (r['Comentario'] || '').trim(),
    }));

  // ── Calendario ──
  const calendario = parseCSV(calText)
    .filter((r) => {
      const f = r['Fecha'] || '';
      return f && f !== 'TOTALES' && f !== 'Total' && parseDate(f);
    })
    .map((r) => ({
      fecha: parseDate(r['Fecha']),
      monto: parseCLP(r['Monto']),
      guardado: parseCLP(r['Guardado']),
      falta: parseCLP(r['Falta']),
      concepto: (r['Concepto'] || '').trim(),
      estado: (r['Estado'] || '').trim(),
      comentario: (r['Comentario'] || '').trim(),
    }));

  // ── FFMM ──
  const ffmmLines = ffmmText.split('\n');
  const ffmmSaldos = [];
  const ffmmMovimientos = [];
  let saldoHeaderIdx = -1,
    movHeaderIdx = -1;
  for (let i = 0; i < ffmmLines.length; i++) {
    const line = ffmmLines[i];
    if (line.includes('Empresa') && line.includes('Administradora')) saldoHeaderIdx = i;
    if (line.includes('Fecha') && line.includes('Empresa') && line.includes('Tipo'))
      movHeaderIdx = i;
  }
  if (saldoHeaderIdx >= 0) {
    const saldoEnd = movHeaderIdx > 0 ? movHeaderIdx : ffmmLines.length;
    const saldoData = Papa.parse(ffmmLines.slice(saldoHeaderIdx, saldoEnd).join('\n'), {
      header: true,
      skipEmptyLines: true,
    }).data;
    for (const r of saldoData) {
      const empresa = (r['Empresa'] || '').trim();
      if (
        !empresa ||
        empresa === 'TOTAL' ||
        empresa === 'TOTALES' ||
        empresa === 'SALDOS VIGENTES' ||
        empresa === 'HISTORIAL DE MOVIMIENTOS'
      )
        continue;
      ffmmSaldos.push({
        empresa,
        fondo: (r['Fondo'] || '').trim(),
        admin: (r['Administradora'] || '').trim(),
        invertido: parseCLP(r['Monto Invertido']),
        valorActual: parseCLP(r['Valor Actual']),
        rentabilidad: parseCLP(r['Rentabilidad']),
      });
    }
  }
  if (movHeaderIdx >= 0) {
    const movData = Papa.parse(ffmmLines.slice(movHeaderIdx).join('\n'), {
      header: true,
      skipEmptyLines: true,
    }).data;
    for (const r of movData) {
      const fecha = parseDate(r['Fecha']);
      if (!fecha) continue;
      ffmmMovimientos.push({
        fecha,
        empresa: (r['Empresa'] || '').trim(),
        fondo: (r['Fondo'] || '').trim(),
        tipo: (r['Tipo'] || '').trim(),
        monto: parseCLP(r['Monto']),
        comentario: (r['Comentario'] || '').trim(),
      });
    }
  }

  // ── Leasing Detalle ──
  const leasingDetLines = leasingDetText.split('\n');
  const leasingDetParsed = Papa.parse(
    leasingDetLines.slice(findHeaderIdx(leasingDetLines, ['ID', 'BANCO'])).join('\n'),
    { header: true, skipEmptyLines: true },
  );
  const leasingDetNorm = normalizeLeasingHeaders(leasingDetParsed);
  const leasingDetalle = leasingDetNorm
    .filter((r) => {
      const banco = (r['Banco / Emisor'] || r['Banco/Emisor'] || r['Banco'] || '').trim();
      const estado = (r['Estado'] || '').trim().toUpperCase();
      return banco !== '' && !banco.toUpperCase().includes('TOTAL') && estado === 'ACTIVO';
    })
    .map((r) => {
      const g = (...keys) => {
        for (const k of keys) {
          if (r[k] != null && r[k] !== '') return r[k];
        }
        return '';
      };
      return {
        id: (r['ID'] || '').trim(),
        banco: g('Banco / Emisor', 'Banco/Emisor', 'Banco').trim(),
        nTractos: parseNum(g('N Tractos', 'N° Tractos')) || 0,
        cuotaUFIndiv: parseUF(g('Cuota UF Individual', 'Cuota UF  Individual')),
        cuotaUFGrupo: parseUF(
          g('Cuota UF Total Grupo', 'Cuota UF  Total Grupo', 'Cuota UF Grupo'),
        ),
        diaVto: parseNum(g('Dia Vcto', 'Día Vcto')) || 0,
        fechaInicio: parseDate(g('Fecha Inicio')) || '',
        fechaFin:
          parseDate(
            g('Fecha Fin (Vencimiento)', 'Fecha Fin  (Vencimiento)', 'Fecha Fin', 'Vencimiento'),
          ) || '',
        cuotasTotales: parseNum(g('Cuotas Totales', 'Cuotas  Totales')) || 0,
        cuotasPagadas: parseNum(g('Cuotas Pagadas', 'Cuotas  Pagadas')) || 0,
        cuotasPorPagar: parseNum(g('Cuotas Por Pagar', 'Cuotas Por  Pagar')) || 0,
        estado: (r['Estado'] || '').trim(),
        deudaUF: parseUF(g('Deuda Pendiente UF', 'Deuda  Pendiente UF')),
        cuotaCLPsIVA: parseCLP(g('Cuota CLP s/IVA', 'Cuota CLP  s/IVA', 'Cuota CLP s IVA')),
        cuotaCLPcIVA: parseCLP(g('Cuota CLP c/IVA', 'Cuota CLP  c/IVA', 'Cuota CLP c IVA')),
      };
    });

  // ── Leasing Resumen (tabla "Proyección mensual de cuotas") ──
  // La hoja pública "Leasing_Resumen" tiene varias sub-tablas separadas por
  // líneas vacías. La que nos interesa aquí es la de proyección mensual
  // cuyos headers comienzan con "Mes,Anio,...". Extraemos solo ese bloque.
  const resumenBlockText = extractCsvBlock(leasingResText, /^[ \t]*Mes,[ \t]*Anio,/mi);
  const leasingResParsed = Papa.parse(resumenBlockText, { header: true, skipEmptyLines: true });
  const leasingResNorm = normalizeLeasingHeaders(leasingResParsed);
  const leasingResumen = leasingResNorm
    .filter((r) => {
      const mes = (r['Mes'] || '').trim();
      return mes !== '' && mes.toUpperCase() !== 'MES' && !mes.toUpperCase().includes('TOTAL');
    })
    .map((r) => {
      const g = (...keys) => {
        for (const k of keys) {
          if (r[k] != null && r[k] !== '') return r[k];
        }
        return '';
      };
      return {
        mes: (r['Mes'] || '').trim(),
        anio: (r['Anio'] || r['Año'] || '').trim(),
        cuotaUFTotal: parseUF(g('Cuota UF Total Mes', 'Cuota UF Total Mes (dia5+dia15)', 'Cuota UF Total')),
        cuotaCLPsIVA: parseCLP(g('Cuota CLP s/IVA', 'Cuota CLP s IVA')),
        cuotaCLPcIVA: parseCLP(g('Cuota CLP c/IVA', 'Cuota CLP c IVA')),
        bciDia5: parseUF(g('BCI (UF) Dia 5', 'BCI (UF) Día 5', 'BCI Dia5', 'BCI (UF)')),
        bciDia15: parseUF(g('BCI (UF) Dia 15', 'BCI (UF) Día 15', 'BCI Dia15')),
        vfsVolvo: parseUF(g('VFS VOLVO (UF)', 'VFS VOLVO', 'VFS (UF)')),
        bancoChile: parseUF(g('BANCO CHILE (UF)', 'BANCO DE CHILE (UF)', 'BANCO DE CHILE', 'Banco Chile (UF)')),
        contratosActivos: parseNum(g('Contratos Activos')) || 0,
        vesteEstesMes: (r['Vence este mes'] || '').trim(),
        delta: parseCLP(g('Delta UF vs mes ant.', 'Delta vs mes anterior', 'Delta')),
      };
    });

  // ── Leasing Próximas Cuotas (tabla "PROXIMAS CUOTAS A PAGAR") ──
  // Tabla ya calculada en la hoja: fecha vencimiento + monto CLP con IVA ya incluido.
  // Es la fuente más limpia para mostrar "próximos 2 pagos".
  const proximasBlockText = extractCsvBlock(
    leasingResText,
    /^[ \t]*Fecha Vencimiento,[ \t]*D[ií]as? Restantes,/mi,
  );
  const leasingProximasParsed = Papa.parse(proximasBlockText, { header: true, skipEmptyLines: true });
  const leasingProximas = leasingProximasParsed.data
    .filter((r) => {
      const fechaRaw = (r['Fecha Vencimiento'] || '').trim();
      // Formato esperado "dd/mm/yyyy" o "yyyy-mm-dd". Filtra headers de tablas
      // subsiguientes que Papa parseó con los mismos nombres de columna.
      return /^\d{1,4}[\/-]\d{1,2}[\/-]\d{1,4}$/.test(fechaRaw);
    })
    .map((r) => {
      const g = (...keys) => {
        for (const k of keys) {
          if (r[k] != null && r[k] !== '') return r[k];
        }
        return '';
      };
      const fechaRaw = g('Fecha Vencimiento', 'Fecha  Vencimiento').trim();
      return {
        fechaRaw,
        fecha: parseDate(fechaRaw) || '',
        diasRestantes: parseNum(g('Dias Restantes', 'Días Restantes')) || 0,
        cuotaUF: parseUF(g('Cuota UF Total', 'Cuota UF  Total', 'Cuota UF')),
        cuotaCLPsIVA: parseCLP(g('Cuota CLP s/IVA', 'Cuota CLP s IVA')),
        cuotaCLPcIVA: parseCLP(g('Cuota CLP c/IVA', 'Cuota CLP c IVA')),
        bancos: g('Bancos que cobran', 'Bancos').trim(),
        estado: g('Estado').trim(),
      };
    })
    .filter((r) => r.fecha && r.cuotaCLPcIVA > 0);

  // ── Crédito Comercial ──
  // Nota: los créditos se descuentan por PAC, así que cualquier cuota con
  // fecha ya pasada se considera pagada. No hay cuotas vencidas impagas.
  const creditoRaw = Papa.parse(creditoText || '', { header: true, skipEmptyLines: true }).data;
  const hoyCredito = getToday();
  const credito = creditoRaw
    .filter((r) => {
      const nc = r['N° Cuota'] || r['N Cuota'] || r['N°Cuota'] || '';
      return nc !== '' && !isNaN(parseInt(nc));
    })
    .map((r) => {
      const fechaVenc = parseDate(r['Fecha Vencimiento'] || '');
      return {
        nCuota: parseInt(r['N° Cuota'] || r['N Cuota'] || '0', 10),
        fechaVenc: fechaVenc || '',
        amortizacion: parseCLP(r['Amortización Capital'] || r['Amortizacion Capital'] || ''),
        interes: parseCLP(r['Monto Interés'] || r['Monto Interes'] || ''),
        valorCuota: parseCLP(r['Valor Cuota'] || ''),
        saldoInsoluto: parseCLP(r['Saldo Insoluto'] || ''),
        pagada: fechaVenc ? fechaVenc < hoyCredito : false,
      };
    });
  const creditoPendiente = credito.filter((c) => c.fechaVenc >= hoyCredito);
  const saldoInsolutoActual = creditoPendiente
    .filter((c) => c.valorCuota > 0)
    .reduce((s, c) => s + c.valorCuota, 0);

  // ── Ventas ──
  const ventas = parseVentas(ventasText);

  const data = {
    bancos,
    dap,
    cal: calendario,
    ffmm: ffmmSaldos,
    ffmmMov: ffmmMovimientos,
    leasingDetalle,
    leasingResumen,
    leasingProximas,
    credito,
    creditoPendiente,
    saldoInsoluto: saldoInsolutoActual,
    ventas,
    hoy: getToday(),
    errores,
  };

  // Validación Zod: reporta desviaciones de esquema sin abortar la carga.
  const avisos = validarData(data);
  avisos.forEach((a) => errores.push(a));

  return data;
}

export { getToday };
export const fetchData = fetchAllData;
