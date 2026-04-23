// Proyección de flujo de caja diario para los proximos N dias.
// Recibe saldo inicial + fuentes de ingresos y egresos, devuelve un arreglo
// de {fecha, ingreso, egreso, neto, saldo}.

// Calcula el saldo bancario actual sumando el ultimo saldoFinal por banco.
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

// Promedio diario de ingresos segun los ultimos N dias con factura.
// Si no hay data suficiente, devuelve 0.
export function ingresoDiarioPromedio(ventasRows, diasVentana = 60, hoy) {
  if (!ventasRows || ventasRows.length === 0) return 0;
  const hoyD = new Date(hoy + 'T12:00:00');
  const desde = new Date(hoyD);
  desde.setDate(desde.getDate() - diasVentana);
  const desdeStr = desde.toISOString().slice(0, 10);
  const recientes = ventasRows.filter((r) => r.fecha >= desdeStr && r.fecha <= hoy);
  const total = recientes.reduce((s, r) => s + r.montoReal, 0);
  return total / diasVentana;
}

// Genera lista ISO de los proximos `dias` dias (inclusive de hoy).
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

// Expande cuotas de leasing en fechas concretas dentro del rango.
// Para cada contrato, crea una cuota en el diaVto de cada mes del rango,
// si el contrato sigue activo (cuotasPorPagar > 0). No descuenta cuotas
// pagadas; asume que diaVto + cuotasPorPagar es respetado.
export function expandirLeasing(leasingDetalle, fechas) {
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
        egresos[fecha] = (egresos[fecha] || 0) + (d.cuotaCLPcIVA || 0);
        cuotasRestantes -= 1;
      }
    });
  });
  return egresos;
}

// Construye la proyeccion dia a dia.
export function proyectar({
  saldoInicial,
  ingresoDiario,
  ventasRowsFuturas = [],
  calendario = [],
  leasingDetalle = [],
  creditoPendiente = [],
  hoy,
  dias = 90,
}) {
  const fechas = listaFechas(hoy, dias);

  // Egresos por fecha: calendario + creditoPendiente + leasing expandido.
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
  const egresosLeasing = expandirLeasing(leasingDetalle, fechas);
  Object.entries(egresosLeasing).forEach(([fecha, monto]) => {
    egresosPorFecha[fecha] = (egresosPorFecha[fecha] || 0) + monto;
  });

  // Ingresos conocidos por fecha (ventas ya facturadas con fecha futura).
  const ingresosConocidos = {};
  ventasRowsFuturas.forEach((r) => {
    if (r.fecha && fechas.includes(r.fecha)) {
      ingresosConocidos[r.fecha] = (ingresosConocidos[r.fecha] || 0) + r.montoReal;
    }
  });

  let saldo = saldoInicial;
  let saldoMin = { fecha: hoy, saldo };
  let primerCruceNegativo = null;

  const serie = fechas.map((fecha) => {
    const ingresoConocido = ingresosConocidos[fecha] || 0;
    // Si hay ingreso conocido para ese dia, lo usamos; si no, asumimos el promedio.
    const ingresoProyectado = ingresoConocido > 0 ? ingresoConocido : ingresoDiario;
    const egreso = egresosPorFecha[fecha] || 0;
    const neto = ingresoProyectado - egreso;
    saldo += neto;
    if (saldo < saldoMin.saldo) saldoMin = { fecha, saldo };
    if (saldo < 0 && !primerCruceNegativo) primerCruceNegativo = { fecha, saldo };
    return {
      fecha,
      ingreso: ingresoProyectado,
      ingresoConocido,
      egreso,
      neto,
      saldo,
    };
  });

  return {
    serie,
    saldoInicial,
    saldoFinal: saldo,
    saldoMin,
    primerCruceNegativo,
    ingresoDiario,
    totalIngresos: serie.reduce((s, d) => s + d.ingreso, 0),
    totalEgresos: serie.reduce((s, d) => s + d.egreso, 0),
  };
}
