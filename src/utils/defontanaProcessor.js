import * as XLSX from 'xlsx';
import {
  parseDateXLS,
  parseNumXLS,
  normName,
  daysBetween,
  todayMidnight,
} from './defontanaHelpers.js';
import {
  CUENTAS_CLIENTES,
  CLIENTE_PAGO_DIAS,
  UMBRAL_FACTURA_CRITICA_DIAS,
} from '../config/cobranzas.js';

// ══════════════════════════════════════════════════════════════════════
// defontanaProcessor — algoritmo HÍBRIDO v1.5
//
// TRACK 1 (Vta_): folio-matching por col N. Las Vta_FVAELECT/FVEELECTINT
//   tienen folio real; los INGRESO que las pagan comparten ese folio →
//   matching exacto → DSO real.
//
// TRACK 2 (APERTURA): FIFO cronológico clásico. Cargos sin folio real se
//   ordenan por fecha y los créditos residuales se aplican de más antiguo
//   a más nuevo.
// ══════════════════════════════════════════════════════════════════════

export async function processSingleFile(file) {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array', cellDates: false });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];

  const allRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  if (allRows.length < 8) throw new Error(`${file.name}: archivo vacío o mal formateado`);

  let headerIdx = 6;
  for (let i = 0; i < Math.min(10, allRows.length); i++) {
    const row = allRows[i].map((c) => String(c || '').toLowerCase().trim());
    if (row.some((c) => c === 'cuenta') && row.some((c) => c.includes('descripción') || c === 'descripcion')) {
      headerIdx = i;
      break;
    }
  }
  const headers = allRows[headerIdx].map((c) => String(c || '').trim());
  const dataRows = allRows.slice(headerIdx + 1).filter((r) => r && r.some((c) => c !== '' && c != null));

  const movimientos = dataRows
    .map((row) => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i]; });
      return {
        cuenta: String(obj['Cuenta'] || '').trim(),
        fecha: parseDateXLS(obj['Fecha']),
        tipo: String(obj['Tipo'] || '').trim(),
        numero: obj['Número'] || obj['Numero'] || '',
        rut: String(obj['ID Ficha'] || '').trim(),
        cliente: String(obj['Ficha'] || '').trim(),
        cargo: parseNumXLS(obj['Cargo ($)']),
        abono: parseNumXLS(obj['Abono ($)']),
        saldo: parseNumXLS(obj['Saldo ($)']),
        documento: String(obj['Documento'] || '').trim(),
        vencimiento: parseDateXLS(obj['Vencimiento']),
        numeroDoc: obj['Número Doc.'] || obj['Numero Doc.'] || '',
        numeroDocPago: obj['Número Doc. Pago'] || obj['Numero Doc. Pago'] || '',
        docPago: String(obj['Doc. Pago'] || '').trim(),
      };
    })
    .filter((m) => m.fecha && m.cliente);

  const cuentasCount = {};
  movimientos.forEach((m) => { if (m.cuenta) cuentasCount[m.cuenta] = (cuentasCount[m.cuenta] || 0) + 1; });
  const cuenta = Object.entries(cuentasCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  let fechaInforme = null;
  for (let i = 0; i < headerIdx; i++) {
    const row = allRows[i] || [];
    for (const cell of row) {
      const s = String(cell || '');
      const m = s.match(/Fecha:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i) || s.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
      if (m) { fechaInforme = parseDateXLS(m[1]); break; }
    }
    if (fechaInforme) break;
  }
  if (!fechaInforme) fechaInforme = todayMidnight();

  const fechas = movimientos.map((m) => m.fecha).filter(Boolean);
  const fechaMin = fechas.length ? new Date(Math.min(...fechas.map((f) => f.getTime()))) : null;
  const fechaMax = fechas.length ? new Date(Math.max(...fechas.map((f) => f.getTime()))) : null;

  return {
    nombre: file.name,
    movimientos,
    fechaInforme,
    cuenta,
    cuentaLabel: CUENTAS_CLIENTES[cuenta] || cuenta || 'Desconocida',
    totalMovimientos: movimientos.length,
    fechaMin,
    fechaMax,
  };
}

export async function processFiles(files) {
  const fileArr = Array.from(files);
  if (fileArr.length === 0) throw new Error('No hay archivos que procesar');
  const results = await Promise.all(fileArr.map(processSingleFile));

  const cuentasVistas = new Set();
  for (const r of results) {
    if (r.cuenta && cuentasVistas.has(r.cuenta)) {
      throw new Error(`Subiste dos archivos de la cuenta ${r.cuentaLabel} (${r.cuenta}).`);
    }
    if (r.cuenta) cuentasVistas.add(r.cuenta);
  }

  const allMovs = [];
  let fechaInforme = null;
  let fechaMin = null;
  let fechaMax = null;
  const archivos = [];
  for (const r of results) {
    allMovs.push(...r.movimientos);
    archivos.push({
      nombre: r.nombre,
      cuenta: r.cuenta,
      cuentaLabel: r.cuentaLabel,
      totalMovimientos: r.totalMovimientos,
      fechaMin: r.fechaMin,
      fechaMax: r.fechaMax,
      fechaInforme: r.fechaInforme,
    });
    if (!fechaInforme || (r.fechaInforme && r.fechaInforme > fechaInforme)) fechaInforme = r.fechaInforme;
    if (r.fechaMin && (!fechaMin || r.fechaMin < fechaMin)) fechaMin = r.fechaMin;
    if (r.fechaMax && (!fechaMax || r.fechaMax > fechaMax)) fechaMax = r.fechaMax;
  }
  return {
    movimientos: allMovs,
    fechaInforme,
    fechaMin,
    fechaMax,
    totalMovimientos: allMovs.length,
    archivos,
    cuentasDetectadas: Array.from(cuentasVistas),
  };
}

function normFolio(v) {
  if (v == null || v === '') return '';
  const s = String(v).trim();
  if (/^\d+\.0+$/.test(s)) return s.split('.')[0];
  return s;
}

// ══════════════════════════════════════════════════════════════════════
// COMPUTE COBRANZAS — híbrido v1.5
// ══════════════════════════════════════════════════════════════════════
export function computeCobranzas(procesado, todayRef = null) {
  if (!procesado || !procesado.movimientos) return null;
  const today = todayRef || procesado.fechaInforme || todayMidnight();
  const movs = procesado.movimientos;

  const porCliente = {};
  movs.forEach((m) => {
    const key = normName(m.cliente);
    if (!porCliente[key]) {
      porCliente[key] = {
        nombre: m.cliente,
        rut: m.rut,
        cuentas: new Set(),
        movimientos: [],
        totalCargo: 0,
        totalAbono: 0,
      };
    }
    porCliente[key].movimientos.push(m);
    porCliente[key].totalCargo += m.cargo;
    porCliente[key].totalAbono += m.abono;
    if (m.cuenta) porCliente[key].cuentas.add(m.cuenta);
  });

  Object.values(porCliente).forEach((c) => {
    c.saldoPendiente = c.totalCargo - c.totalAbono;
    c.esInternacional = c.cuentas.has('1110401002');
    c.cuentas = Array.from(c.cuentas);

    const movsCliente = c.movimientos;

    const vtaFolios = new Set();
    movsCliente.forEach((m) => {
      if (m.cargo > 0 && m.tipo !== 'INGRESO' && m.tipo !== 'APERTURA') {
        const f = normFolio(m.numeroDoc);
        if (f) vtaFolios.add(f);
      }
    });

    const vtaMovs = movsCliente.filter((m) => vtaFolios.has(normFolio(m.numeroDoc)));
    const apertMovs = movsCliente.filter((m) => !vtaFolios.has(normFolio(m.numeroDoc)));

    c.facturasPendientes = [];
    c.facturasCriticas = [];
    c.facturasCobrables = [];
    const dsoSamples = [];
    let facturasCount = 0;
    let pagosCount = 0;

    // ─── TRACK 1 — Vta_: folio-matching ─────────────────────────────
    const porFolioVta = new Map();
    vtaMovs.forEach((m) => {
      const f = normFolio(m.numeroDoc);
      if (!f) return;
      if (!porFolioVta.has(f)) porFolioVta.set(f, []);
      porFolioVta.get(f).push(m);
    });

    porFolioVta.forEach((rows, folio) => {
      const facturas = rows
        .filter((r) => r.cargo > 0 && r.tipo !== 'INGRESO')
        .sort((a, b) => (a.fecha || 0) - (b.fecha || 0));
      const reversiones = rows.filter((r) => r.cargo > 0 && r.tipo === 'INGRESO');
      const abonos = rows.filter((r) => r.abono > 0).sort((a, b) => (a.fecha || 0) - (b.fecha || 0));
      if (!facturas.length) return;

      const totalF = facturas.reduce((s, r) => s + r.cargo, 0);
      const totalRev = reversiones.reduce((s, r) => s + r.cargo, 0);
      const totalAb = abonos.reduce((s, r) => s + r.abono, 0);
      const abNetos = totalAb - totalRev;
      const saldo = totalF - abNetos;
      const primerCargo = facturas[0];
      if (primerCargo.tipo !== 'APERTURA') facturasCount++;
      pagosCount += abonos.length;

      if (saldo <= 0.01) {
        if (abonos.length > 0 && primerCargo.fecha && primerCargo.tipo !== 'APERTURA') {
          const ult = abonos[abonos.length - 1];
          const dias = daysBetween(primerCargo.fecha, ult.fecha);
          if (dias !== null && dias >= 0 && dias < 730) {
            dsoSamples.push({
              dias,
              monto: totalF,
              folio,
              fechaEmision: primerCargo.fecha,
              fechaPago: ult.fecha,
            });
          }
        }
        return;
      }

      const venc = primerCargo.vencimiento || estimarVencimiento(primerCargo.fecha, c.nombre);
      const diasAtraso = venc ? daysBetween(venc, today) : null;
      const critica = diasAtraso != null && diasAtraso > UMBRAL_FACTURA_CRITICA_DIAS;
      const fact = {
        folio,
        fecha: primerCargo.fecha,
        vencimiento: venc,
        monto: saldo,
        montoOriginal: totalF,
        montoPagado: abNetos,
        documento: primerCargo.documento,
        diasAtraso,
        tipo: primerCargo.tipo,
        cuenta: primerCargo.cuenta,
        esApertura: false,
        critica,
        pagosParciales: abonos.length,
        parcial: abonos.length > 0,
      };
      c.facturasPendientes.push(fact);
      if (critica) c.facturasCriticas.push(fact);
      else c.facturasCobrables.push(fact);
    });

    // ─── TRACK 2 — APERTURA: FIFO cronológico ───────────────────────
    const apertCargos = apertMovs
      .filter((m) => m.cargo > 0 && m.tipo !== 'INGRESO')
      .sort((a, b) => (a.fecha || new Date(0)) - (b.fecha || new Date(0)));

    const abonosNetos2 =
      apertMovs.filter((m) => m.abono > 0).reduce((s, m) => s + m.abono, 0) -
      apertMovs.filter((m) => m.cargo > 0 && m.tipo === 'INGRESO').reduce((s, m) => s + m.cargo, 0);

    let rem = abonosNetos2;
    for (const r of apertCargos) {
      if (rem >= r.cargo) {
        rem -= r.cargo;
        pagosCount++;
        continue;
      }
      const saldoF = r.cargo - rem;
      rem = 0;
      if (saldoF < 1) continue;
      if (r.tipo !== 'APERTURA') facturasCount++;

      const venc = r.vencimiento || estimarVencimiento(r.fecha, c.nombre);
      const diasAtraso = venc ? daysBetween(venc, today) : null;
      const critica = diasAtraso != null && diasAtraso > UMBRAL_FACTURA_CRITICA_DIAS;
      const fact = {
        folio: normFolio(r.numeroDoc) || String(r.numero || '') || '—',
        fecha: r.fecha,
        vencimiento: venc,
        monto: saldoF,
        montoOriginal: r.cargo,
        montoPagado: r.cargo - saldoF,
        documento: r.documento,
        diasAtraso,
        tipo: r.tipo,
        cuenta: r.cuenta,
        esApertura: r.tipo === 'APERTURA',
        critica,
        pagosParciales: 0,
        parcial: rem > 0,
      };
      c.facturasPendientes.push(fact);
      if (critica) c.facturasCriticas.push(fact);
      else c.facturasCobrables.push(fact);
    }

    c.facturasCount = facturasCount;
    c.pagosCount = pagosCount;
    c.montoCriticas = c.facturasCriticas.reduce((s, f) => s + f.monto, 0);
    c.montoCobrables = c.facturasCobrables.reduce((s, f) => s + f.monto, 0);
    c.saldoPendienteFolios = c.facturasPendientes.reduce((s, f) => s + f.monto, 0);

    if (dsoSamples.length > 0) {
      const totM = dsoSamples.reduce((s, x) => s + x.monto, 0);
      c.dsoReal = totM > 0 ? dsoSamples.reduce((s, x) => s + x.dias * x.monto, 0) / totM : null;
      c.dsoMuestras = dsoSamples.length;
      c.dsoSamples = dsoSamples;
    } else {
      c.dsoReal = null;
      c.dsoMuestras = 0;
      c.dsoSamples = [];
    }
  });

  // ─── Aging global ──────────────────────────────────────────────
  const todasFacturas = [];
  Object.values(porCliente).forEach((c) => {
    c.facturasPendientes.forEach((f) => todasFacturas.push({
      ...f,
      cliente: c.nombre,
      clienteKey: normName(c.nombre),
      rut: c.rut,
    }));
  });

  const aging = {
    porVencer: { count: 0, monto: 0, facturas: [] },
    vencidas_0_30: { count: 0, monto: 0, facturas: [] },
    vencidas_31_60: { count: 0, monto: 0, facturas: [] },
    vencidas_61_90: { count: 0, monto: 0, facturas: [] },
    vencidas_91_180: { count: 0, monto: 0, facturas: [] },
    vencidas_critica: { count: 0, monto: 0, facturas: [] },
  };
  todasFacturas.forEach((f) => {
    const d = f.diasAtraso;
    const b = d == null || d <= 0 ? 'porVencer'
      : d <= 30 ? 'vencidas_0_30'
      : d <= 60 ? 'vencidas_31_60'
      : d <= 90 ? 'vencidas_61_90'
      : d <= UMBRAL_FACTURA_CRITICA_DIAS ? 'vencidas_91_180'
      : 'vencidas_critica';
    aging[b].count++;
    aging[b].monto += f.monto;
    aging[b].facturas.push(f);
  });

  const totalPendiente = Object.values(porCliente).reduce((s, c) => s + Math.max(c.saldoPendiente, 0), 0);
  const totalCobrable =
    aging.porVencer.monto +
    aging.vencidas_0_30.monto +
    aging.vencidas_31_60.monto +
    aging.vencidas_61_90.monto +
    aging.vencidas_91_180.monto;
  const totalCritico = aging.vencidas_critica.monto;
  const totalVencido =
    aging.vencidas_0_30.monto +
    aging.vencidas_31_60.monto +
    aging.vencidas_61_90.monto +
    aging.vencidas_91_180.monto +
    aging.vencidas_critica.monto;

  const clientesArray = Object.values(porCliente)
    .filter((c) => Math.abs(c.saldoPendiente) > 0.01)
    .sort((a, b) => b.saldoPendiente - a.saldoPendiente);

  let dsoGlobalSum = 0;
  let dsoGlobalWeight = 0;
  clientesArray.forEach((c) => {
    if (c.dsoReal != null && c.saldoPendiente > 0) {
      dsoGlobalSum += c.dsoReal * c.saldoPendiente;
      dsoGlobalWeight += c.saldoPendiente;
    }
  });
  const dsoGlobal = dsoGlobalWeight > 0 ? dsoGlobalSum / dsoGlobalWeight : null;

  const totalPorCuenta = { nacional: 0, internacional: 0 };
  clientesArray.forEach((c) => {
    if (c.esInternacional) totalPorCuenta.internacional += c.saldoPendiente;
    else totalPorCuenta.nacional += c.saldoPendiente;
  });

  return {
    porCliente,
    clientesArray,
    aging,
    totalPendiente,
    totalCobrable,
    totalCritico,
    totalVencido,
    totalPorCuenta,
    dsoGlobal,
    totalFacturasPendientes: todasFacturas.length,
    fechaInforme: today,
    totalMovimientos: procesado.totalMovimientos,
    archivos: procesado.archivos || [],
  };
}

export function estimarVencimiento(fechaFactura, nombreCliente) {
  if (!fechaFactura) return null;
  const dias =
    CLIENTE_PAGO_DIAS[normName(nombreCliente)] ||
    CLIENTE_PAGO_DIAS[nombreCliente] ||
    (normName(nombreCliente).includes('maxam') ? 60 : 30);
  const v = new Date(fechaFactura);
  v.setDate(v.getDate() + dias);
  return v;
}
