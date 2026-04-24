// Proyección de flujo de caja (neto, sin IVA) para los proximos N dias.
// Modelo: una factura emitida hoy se cobra en `plazoCobro` dias mas (30 default).
// Los ingresos del dia D vienen de la facturacion del dia D-plazoCobro.

export function saldoActualBancos(bancos) {
  if (!bancos || bancos.length === 0) return 0;
  const porBanco = {};
  [...bancos]
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .forEach((b) => {
      if (b.saldoFinal != null && b.banco) porBanco[b.banco] = b.saldoFinal;
    });
  return Object.values(porBanco).reduce((s, v) => s + v, 0);
}

// Promedio diario de ventas (neto) de los ultimos N dias.
// Fallback cuando no hay data del mismo mes del año pasado.
export function ingresoDiarioPromedio(ventasRows, diasVentana = 60, hoy) {
  if (!ventasRows || ventasRows.length === 0) return 0;
  const hoyD = new Date(hoy + 'T12:00:00');
  const desde = new Date(hoyD);
  desde.setDate(desde.getDate() - diasVentana);
  const desdeStr = desde.toISOString().slice(0, 10);
  const recientes = ventasRows.filter((r) => r.fecha >= desdeStr && r.fecha <= hoy);
  const total = recientes.reduce((s, r) => s + r.neto, 0);
  return total / diasVentana;
}

// Agrupa ventas (neto) por mes YYYY-MM, pensado para lookup de estacionalidad.
export function ventasPorMes(ventasRows) {
  const map = {};
  if (!ventasRows) return map;
  ventasRows.forEach((r) => {
    const mes = r.fecha.substring(0, 7);
    if (!map[mes]) map[mes] = 0;
    map[mes] += r.neto;
  });
  return map;
}

// Estimación de facturación para un día, basada en el mismo mes del año
// anterior distribuido uniformemente por días. Fallback al promedio simple.
export function estimarFacturacionDia(fechaISO, ventasMes, fallbackDiario) {
  const [y, m] = fechaISO.split('-').map(Number);
  const mesAnioPasado = `${y - 1}-${String(m).padStart(2, '0')}`;
  const totalMesPasado = ventasMes[mesAnioPasado];
  if (totalMesPasado && totalMesPasado > 0) {
    const diasDelMes = new Date(y, m, 0).getDate();
    return totalMesPasado / diasDelMes;
  }
  return fallbackDiario;
}

function listaFechas(hoy, dias) {
  const out = [];
  const hoyD = new Date(hoy + 'T12:00:00');
  for (let i = 0; i < dias; i++) {
    const d = new Date(hoyD);
    d.setDate(d.getDate() + i);
    out.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    );
  }
  return out;
}

function restarDias(fechaISO, dias) {
  const d = new Date(fechaISO + 'T12:00:00');
  d.setDate(d.getDate() - dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Expande cuotas de leasing en fechas concretas. Por defecto usa cuota sin
// IVA (coherente con ventas netas en la proyección de caja).
export function expandirLeasing(leasingDetalle, fechas, campo = 'cuotaCLPsIVA') {
  const egresos = {};
  if (!leasingDetalle) return egresos;
  const mesesRango = new Set(fechas.map((f) => f.substring(0, 7)));
  leasingDetalle.forEach((d) => {
    if (!d.diaVto || d.cuotasPorPagar <= 0) return;
    let cuotasRestantes = d.cuotasPorPagar;
    [...mesesRango].sort().forEach((mes) => {
      if (cuotasRestantes <= 0) return;
      const [y, m] = mes.split('-').map(Number);
      const ultimoDia = new Date(y, m, 0).getDate();
      const dia = Math.min(d.diaVto, ultimoDia);
      const fecha = `${mes}-${String(dia).padStart(2, '0')}`;
      if (fechas.includes(fecha)) {
        egresos[fecha] = (egresos[fecha] || 0) + (d[campo] || 0);
        cuotasRestantes -= 1;
      }
    });
  });
  return egresos;
}

export function proyectar({
  saldoInicial,
  ventasRows = [],
  calendario = [],
  leasingDetalle = [],
  creditoPendiente = [],
  hoy,
  dias = 90,
  plazoCobro = 30,
  multiplicadorIngresos = 1.0,
  leasingCampo = 'cuotaCLPsIVA',
}) {
  const fechas = listaFechas(hoy, dias);
  const vMes = ventasPorMes(ventasRows);
  const promedioFallback = ingresoDiarioPromedio(ventasRows, 60, hoy);

  const facturacionRealPorDia = {};
  ventasRows.forEach((r) => {
    facturacionRealPorDia[r.fecha] = (facturacionRealPorDia[r.fecha] || 0) + r.neto;
  });

  const egresosPorFecha = {};
  calendario.forEach((c) => {
    if (c.fecha && fechas.includes(c.fecha)) {
      egresosPorFecha[c.fecha] = (egresosPorFecha[c.fecha] || 0) + (c.monto || 0);
    }
  });
  creditoPendiente.forEach((c) => {
    if (c.fechaVenc && fechas.includes(c.fechaVenc)) {
      egresosPorFecha[c.fechaVenc] =
        (egresosPorFecha[c.fechaVenc] || 0) + (c.valorCuota || 0);
    }
  });
  const egresosLeasing = expandirLeasing(leasingDetalle, fechas, leasingCampo);
  Object.entries(egresosLeasing).forEach(([fecha, monto]) => {
    egresosPorFecha[fecha] = (egresosPorFecha[fecha] || 0) + monto;
  });

  let saldo = saldoInicial;
  let saldoMin = { fecha: hoy, saldo };
  let primerCruceNegativo = null;
  let totalIngConocidos = 0;
  let totalIngEstimados = 0;

  const serie = fechas.map((fecha) => {
    const fechaFacturacion = restarDias(fecha, plazoCobro);

    let ingresoBase;
    let tipoIngreso;

    if (fechaFacturacion <= hoy) {
      // La facturacion ya ocurrio; usamos monto real.
      ingresoBase = facturacionRealPorDia[fechaFacturacion] || 0;
      tipoIngreso = 'real';
      totalIngConocidos += ingresoBase;
    } else {
      // Facturacion futura; estimamos con mismo mes año pasado.
      ingresoBase = estimarFacturacionDia(fechaFacturacion, vMes, promedioFallback);
      tipoIngreso = 'estimado';
      totalIngEstimados += ingresoBase;
    }

    const ingreso = ingresoBase * multiplicadorIngresos;
    const egreso = egresosPorFecha[fecha] || 0;
    const neto = ingreso - egreso;
    saldo += neto;
    if (saldo < saldoMin.saldo) saldoMin = { fecha, saldo };
    if (saldo < 0 && !primerCruceNegativo) primerCruceNegativo = { fecha, saldo };
    return { fecha, ingreso, tipoIngreso, egreso, neto, saldo };
  });

  return {
    serie,
    saldoInicial,
    saldoFinal: saldo,
    saldoMin,
    primerCruceNegativo,
    plazoCobro,
    promedioFallback,
    totalIngresos: serie.reduce((s, d) => s + d.ingreso, 0),
    totalEgresos: serie.reduce((s, d) => s + d.egreso, 0),
    totalIngConocidos,
    totalIngEstimados,
  };
}
