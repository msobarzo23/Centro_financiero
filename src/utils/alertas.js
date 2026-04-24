// Motor de alertas: detecta DAPs, leasing, crédito y compromisos sin fondos
// en una ventana de 7 días hacia adelante.

export function buildAlertas({ dap, cal, leasingDetalle, creditoPendiente }, hoy) {
  const alertas = [];
  const diasHasta = (fecha) => Math.ceil(
    (new Date(fecha + "T12:00:00") - new Date(hoy + "T12:00:00")) / 864e5
  );

  // DAPs próximos a vencer
  const dapsV = dap.filter(d => (d.vigente === "si" || d.vigente === "sí") && d.vencimiento);
  dapsV.forEach(d => {
    const dias = diasHasta(d.vencimiento);
    if (dias >= 0 && dias <= 7) {
      const monto = d.montoInicial >= 1e6
        ? `$${Math.round(d.montoInicial/1e6).toLocaleString("es-CL")} M`
        : `$${Math.round(d.montoInicial).toLocaleString("es-CL")}`;
      const label = d.comentario || `DAP ${d.banco}`;
      const tipo = dias <= 2 ? "urgente" : dias <= 5 ? "atencion" : "info";
      alertas.push({
        tipo, icono: "💰",
        titulo: `DAP vence ${dias === 0 ? "hoy" : dias === 1 ? "mañana" : `en ${dias}d`}`,
        mensaje: `${label} · ${monto} · ${d.banco}`,
        fecha: d.vencimiento, dias,
      });
    }
  });

  // Leasing: agrupar por día de vencimiento y calcular próxima fecha
  const gruposLeasing = {};
  leasingDetalle.forEach(d => {
    const k = d.diaVto;
    if (!gruposLeasing[k]) gruposLeasing[k] = { diaVto: k, cuotaCIVA: 0, bancos: new Set() };
    gruposLeasing[k].cuotaCIVA += d.cuotaCLPcIVA;
    gruposLeasing[k].bancos.add(d.banco);
  });

  Object.values(gruposLeasing).forEach(g => {
    const hoyD = new Date(hoy + "T12:00:00");
    // Intentar mes actual primero
    let fechaVto = new Date(hoyD.getFullYear(), hoyD.getMonth(), g.diaVto, 12, 0, 0);
    // Si ya pasó o el día no existe en este mes, ir al siguiente
    if (fechaVto < hoyD || fechaVto.getDate() !== g.diaVto) {
      fechaVto = new Date(hoyD.getFullYear(), hoyD.getMonth() + 1, g.diaVto, 12, 0, 0);
    }
    const yyyy = fechaVto.getFullYear();
    const mm = String(fechaVto.getMonth() + 1).padStart(2, "0");
    const dd2 = String(fechaVto.getDate()).padStart(2, "0");
    const fechaStr = `${yyyy}-${mm}-${dd2}`;
    const dias = diasHasta(fechaStr);

    if (dias >= 0 && dias <= 7) {
      const monto = g.cuotaCIVA >= 1e6
        ? `$${Math.round(g.cuotaCIVA/1e6)}M`
        : `$${Math.round(g.cuotaCIVA).toLocaleString("es-CL")}`;
      const bancos = [...g.bancos].join(", ");
      const tipo = dias <= 2 ? "urgente" : dias <= 5 ? "atencion" : "info";
      alertas.push({
        tipo, icono: "🚛",
        titulo: `Cuota leasing día ${g.diaVto} · ${dias === 0 ? "hoy" : dias === 1 ? "mañana" : `en ${dias}d`}`,
        mensaje: `${monto} c/IVA · ${bancos}`,
        fecha: fechaStr, dias,
      });
    }
  });

  // Crédito comercial
  const proxCred = creditoPendiente.find(c => c.valorCuota > 0);
  if (proxCred) {
    const dias = diasHasta(proxCred.fechaVenc);
    if (dias >= 0 && dias <= 7) {
      const monto = proxCred.valorCuota >= 1e6
        ? `$${Math.round(proxCred.valorCuota/1e6)}M`
        : `$${Math.round(proxCred.valorCuota).toLocaleString("es-CL")}`;
      const tipo = dias <= 2 ? "urgente" : dias <= 5 ? "atencion" : "info";
      alertas.push({
        tipo, icono: "🏦",
        titulo: `Cuota crédito N°${proxCred.nCuota} · ${dias === 0 ? "hoy" : dias === 1 ? "mañana" : `en ${dias}d`}`,
        mensaje: `${monto} · Capital: $${Math.round(proxCred.amortizacion/1e6)}M · Interés: $${Math.round(proxCred.interes/1e6)}M`,
        fecha: proxCred.fechaVenc, dias,
      });
    }
  }

  // Compromisos del calendario sin fondos completos
  const finVentana = new Date(hoy + "T12:00:00");
  finVentana.setDate(finVentana.getDate() + 7);
  const finVentanaStr = `${finVentana.getFullYear()}-${String(finVentana.getMonth()+1).padStart(2,"0")}-${String(finVentana.getDate()).padStart(2,"0")}`;

  cal.filter(c => c.fecha >= hoy && c.fecha <= finVentanaStr && c.falta > 0).forEach(c => {
    const dias = diasHasta(c.fecha);
    const faltaStr = c.falta >= 1e6
      ? `$${Math.round(c.falta/1e6)}M`
      : `$${Math.round(c.falta).toLocaleString("es-CL")}`;
    const tipo = dias <= 2 ? "urgente" : "atencion";
    alertas.push({
      tipo, icono: "📅",
      titulo: `Compromiso sin fondos · ${dias === 0 ? "hoy" : dias === 1 ? "mañana" : `en ${dias}d`}`,
      mensaje: `${c.concepto} · Falta ${faltaStr}`,
      fecha: c.fecha, dias,
    });
  });

  const orden = { urgente: 0, atencion: 1, info: 2 };
  alertas.sort((a, b) => orden[a.tipo] - orden[b.tipo] || a.dias - b.dias);
  return alertas;
}
