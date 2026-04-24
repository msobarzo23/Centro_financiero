// Maestro de clientes — vista unificada cruzando ventas (Google Sheets) con
// cobranzas Defontana (opcional). Las ventas son la fuente de verdad para
// facturación histórica; las cobranzas agregan saldo, DSO, aging y facturas
// pendientes cuando el usuario cargó el informe.

// ── Estados de cliente ──────────────────────────────────────────────
// Se evalúan en este orden (el primero que matchea gana):
//   critico     → tiene facturas +180d sin pagar (cruza con Defontana)
//   inactivo    → sin facturar hace más de 180 días (o nunca facturó)
//   fuga        → sin facturar hace 60-180 días
//   nuevo       → primera factura hace ≤ 90 días
//   decreciente → factura en últimos 60d pero delta 3m < -20%
//   activo      → todo lo demás

export const ESTADO_ORDEN = ['critico', 'inactivo', 'fuga', 'nuevo', 'decreciente', 'activo'];

// ESTADO_META depende del tema; se construye con los tokens C del theme
// para que los colores calcen con dark/light.
export function buildEstadoMeta(C) {
  return {
    critico: {
      label: 'Crítico cobranza',
      color: C.purple,
      bg: C.purpleD,
      desc: 'Facturas +180 días sin pagar',
    },
    inactivo: {
      label: 'Inactivo',
      color: C.tm,
      bg: C.surfaceAlt,
      desc: 'Sin facturar hace +180 días',
    },
    fuga: {
      label: 'Fuga',
      color: C.red,
      bg: C.redD,
      desc: 'Sin facturar hace 60-180 días',
    },
    nuevo: {
      label: 'Nuevo',
      color: C.cyan,
      bg: C.cyanD,
      desc: 'Primera factura hace ≤ 90 días',
    },
    decreciente: {
      label: 'Decreciente',
      color: C.amber,
      bg: C.amberD,
      desc: 'Facturación −20% vs trimestre anterior',
    },
    activo: {
      label: 'Activo',
      color: C.green,
      bg: C.greenD,
      desc: 'Facturación estable o creciente',
    },
  };
}

// ── Helpers de fechas (strings YYYY-MM-DD) ──────────────────────────

function toYMD(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addMonthsYM(ym, n) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function addDaysStr(str, n) {
  const d = new Date(str + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return toYMD(d);
}

function daysBetweenStr(a, b) {
  if (!a || !b) return null;
  const aD = new Date(a + 'T12:00:00');
  const bD = new Date(b + 'T12:00:00');
  return Math.round((bD - aD) / 86400000);
}

function normNameLocal(s) {
  if (!s) return '';
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

// ══════════════════════════════════════════════════════════════════════
// Motor principal
// ══════════════════════════════════════════════════════════════════════

export function buildClientesMaestro({ ventasRows = [], cobranzas = null, hoy }) {
  if (!hoy) return null;

  // ── Índice de cobranzas por cliente (si hay) ──
  const cobranzasPorKey = {};
  if (cobranzas?.porCliente) {
    Object.values(cobranzas.porCliente).forEach((c) => {
      const k = normNameLocal(c.nombre);
      if (!k) return;
      cobranzasPorKey[k] = c;
    });
  }

  // ── Agrupar ventas por cliente ──
  const porCliente = {};
  ventasRows.forEach((v) => {
    if (!v.razonSocial || !v.fecha) return;
    const key = normNameLocal(v.razonSocial);
    if (!key) return;
    if (!porCliente[key]) {
      porCliente[key] = {
        key,
        nombre: v.razonSocial,
        fechas: [],
        neto: 0,
        porMes: {},
      };
    }
    porCliente[key].fechas.push(v.fecha);
    porCliente[key].neto += v.neto || 0;
    const mes = v.fecha.substring(0, 7);
    porCliente[key].porMes[mes] = (porCliente[key].porMes[mes] || 0) + (v.neto || 0);
  });

  // ── Agregar clientes que solo están en cobranzas (saldos sin ventas recientes) ──
  Object.entries(cobranzasPorKey).forEach(([key, c]) => {
    if (!porCliente[key]) {
      porCliente[key] = {
        key,
        nombre: c.nombre,
        fechas: [],
        neto: 0,
        porMes: {},
      };
    }
  });

  // ── Ventanas temporales ──
  const hoyMes = hoy.substring(0, 7);
  const hace3m = addDaysStr(hoy, -90);
  const hace6m = addDaysStr(hoy, -180);
  const hace12m = addDaysStr(hoy, -365);

  // 12 meses para heatmap (últimos 12 incluyendo actual)
  const mesesHeatmap = [];
  for (let i = 11; i >= 0; i--) {
    mesesHeatmap.push(addMonthsYM(hoyMes, -i));
  }

  // Total facturación últimos 3m (para participación)
  let totalFact3m = 0;

  // ── Procesar cada cliente ──
  const clientes = Object.values(porCliente).map((c) => {
    const fechasOrdenadas = [...c.fechas].sort();
    const primeraFactura = fechasOrdenadas[0] || null;
    const ultimaFactura = fechasOrdenadas[fechasOrdenadas.length - 1] || null;

    const facturacionMensual = mesesHeatmap.map((mes) => ({
      mes,
      monto: c.porMes[mes] || 0,
    }));

    const facturacionUlt12m = c.fechas
      .filter((f) => f >= hace12m && f <= hoy)
      .length === 0
      ? 0
      : Object.entries(c.porMes)
          .filter(([mes]) => mes >= hace12m.substring(0, 7) && mes <= hoyMes)
          .reduce((s, [, v]) => s + v, 0);

    const mesesConFacturacion12m = facturacionMensual.filter((m) => m.monto > 0).length;

    return {
      ...c,
      facturacionMensual,
      facturacionUlt12m,
      facturacionUlt3m: 0, // se llena en el segundo pase (por rows, no por mes)
      facturacion3mAnterior: 0,
      deltaPctVs3mAnterior: null,
      mesesConFacturacion12m,
      primeraFactura,
      ultimaFactura,
      diasDesdeUltimaVenta: ultimaFactura ? daysBetweenStr(ultimaFactura, hoy) : null,
      primeraFacturaDiasAtras: primeraFactura ? daysBetweenStr(primeraFactura, hoy) : null,
    };
  });

  // ── Recalcular fact 3m y fact 3m anterior por rows (más preciso que por mes) ──
  // Inicializamos contadores por cliente.
  const f3m = {}; // últimos 0-90 días
  const f3mAnt = {}; // últimos 90-180 días
  ventasRows.forEach((v) => {
    if (!v.razonSocial || !v.fecha) return;
    const key = normNameLocal(v.razonSocial);
    if (!key) return;
    if (v.fecha >= hace3m && v.fecha <= hoy) {
      f3m[key] = (f3m[key] || 0) + (v.neto || 0);
    } else if (v.fecha >= hace6m && v.fecha < hace3m) {
      f3mAnt[key] = (f3mAnt[key] || 0) + (v.neto || 0);
    }
  });

  clientes.forEach((c) => {
    c.facturacionUlt3m = f3m[c.key] || 0;
    c.facturacion3mAnterior = f3mAnt[c.key] || 0;
    totalFact3m += c.facturacionUlt3m;
    if (c.facturacion3mAnterior > 0) {
      c.deltaPctVs3mAnterior =
        ((c.facturacionUlt3m - c.facturacion3mAnterior) / c.facturacion3mAnterior) * 100;
    } else if (c.facturacionUlt3m > 0) {
      c.deltaPctVs3mAnterior = 100; // nuevo en el trimestre
    } else {
      c.deltaPctVs3mAnterior = null;
    }
  });

  // ── Enriquecer con cobranzas y clasificar ──
  clientes.forEach((c) => {
    const cob = cobranzasPorKey[c.key];
    if (cob) {
      c.esInternacional = !!cob.esInternacional;
      c.saldoTotal = Math.max(cob.saldoPendiente || 0, 0);
      c.facturasPendientes = cob.facturasPendientes || [];
      c.nFacturasPendientes = c.facturasPendientes.length;
      c.nFacturasCriticas = cob.facturasCriticas?.length || 0;
      c.montoCriticas = cob.montoCriticas || 0;
      c.dsoProm = cob.dsoReal;
      c.nPagosObservados = cob.dsoMuestras || 0;
      c.rut = cob.rut || null;
    } else {
      c.esInternacional = false;
      c.saldoTotal = 0;
      c.facturasPendientes = [];
      c.nFacturasPendientes = 0;
      c.nFacturasCriticas = 0;
      c.montoCriticas = 0;
      c.dsoProm = null;
      c.nPagosObservados = 0;
      c.rut = null;
    }

    c.participacion = totalFact3m > 0 ? c.facturacionUlt3m / totalFact3m : 0;
    c.estado = clasificar(c);

    const alertas = [];
    if (c.estado === 'critico') {
      alertas.push({ msg: `${c.nFacturasCriticas} factura${c.nFacturasCriticas !== 1 ? 's' : ''} crítica${c.nFacturasCriticas !== 1 ? 's' : ''} (+180d) por ${Math.round(c.montoCriticas / 1e6)}M` });
    }
    if (c.deltaPctVs3mAnterior != null && c.deltaPctVs3mAnterior < -40 && c.facturacionUlt3m > 0) {
      alertas.push({ msg: `Facturación cae ${Math.round(-c.deltaPctVs3mAnterior)}% vs trimestre anterior` });
    }
    if (c.saldoTotal > 0 && c.facturacionUlt3m === 0) {
      alertas.push({ msg: 'Tiene saldo pero no ha facturado en 3 meses' });
    }
    c.alertas = alertas;
  });

  // Ordenar por facturación últimos 3m desc, luego por saldo desc.
  clientes.sort((a, b) => {
    if (b.facturacionUlt3m !== a.facturacionUlt3m) return b.facturacionUlt3m - a.facturacionUlt3m;
    return (b.saldoTotal || 0) - (a.saldoTotal || 0);
  });

  // ── Totales y distribución ──
  const distribucionEstado = {};
  ESTADO_ORDEN.forEach((e) => (distribucionEstado[e] = 0));
  clientes.forEach((c) => {
    distribucionEstado[c.estado] = (distribucionEstado[c.estado] || 0) + 1;
  });

  const facturacion12m = clientes.reduce((s, c) => s + c.facturacionUlt12m, 0);
  const saldoCritico = clientes.reduce((s, c) => s + c.montoCriticas, 0);
  const saldoTotal = clientes.reduce((s, c) => s + c.saldoTotal, 0);
  const nClientesActivos3m = clientes.filter((c) => c.facturacionUlt3m > 0).length;
  const nClientesConSaldo = clientes.filter((c) => c.saldoTotal > 0).length;
  const nInternacionales = clientes.filter((c) => c.esInternacional).length;

  return {
    clientes,
    totales: {
      nClientes: clientes.length,
      nClientesActivos3m,
      nClientesConSaldo,
      nInternacionales,
      facturacion3m: totalFact3m,
      facturacion12m,
      saldoTotal,
      saldoCritico,
    },
    distribucionEstado,
    ventanas: { hace3m, hace6m, hace12m, hoy },
  };
}

// ══════════════════════════════════════════════════════════════════════

function clasificar(c) {
  if (c.montoCriticas > 0) return 'critico';
  if (c.diasDesdeUltimaVenta == null) return 'inactivo';
  if (c.diasDesdeUltimaVenta > 180) return 'inactivo';
  if (c.diasDesdeUltimaVenta > 60) return 'fuga';
  if (c.primeraFacturaDiasAtras != null && c.primeraFacturaDiasAtras <= 90) return 'nuevo';
  if (c.deltaPctVs3mAnterior != null && c.deltaPctVs3mAnterior < -20) return 'decreciente';
  return 'activo';
}
