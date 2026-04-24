// Proyección de flujo de caja a 13 semanas cruzando caja actual con:
//   - Cobranzas Defontana (facturas por fecha de vencimiento).
//   - DAPs Trabajo que vencen en la ventana.
//   - Calendario financiero (egresos).
//   - Leasing (cuotas en día de vencimiento de cada mes).
//   - Crédito (cuotas por fechaVenc).
//
// Para ingresos NO usamos estimación histórica de ventas — eso ya lo cubre
// `proyectar()` en proyeccion.js (proyección 90 días diaria). Este motor se
// enfoca en lo que Defontana + datos de finanzas agregan: certeza sobre
// cobranzas ya emitidas y DAPs que se liberan.

import { saldoActualBancos, expandirLeasing } from './proyeccion.js';
import { clas } from './format.js';

// ── Helpers de fecha (formato "YYYY-MM-DD") ─────────────────────────

export function toDateStr(v) {
  if (!v) return null;
  if (typeof v === 'string') return v.slice(0, 10);
  if (v instanceof Date && !isNaN(v)) {
    return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`;
  }
  return null;
}

function addDaysStr(str, n) {
  const d = new Date(str + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

// Lunes de la semana ISO que contiene la fecha.
function startOfISOWeek(str) {
  const d = new Date(str + 'T12:00:00');
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toDateStr(d);
}

function fmtRangoCorto(inicioStr, finStr) {
  const [, mi, di] = inicioStr.split('-');
  const [, mf, df] = finStr.split('-');
  return `${di}/${mi} — ${df}/${mf}`;
}

function listarFechasEntre(inicioStr, finStr) {
  const out = [];
  let cur = inicioStr;
  while (cur <= finStr) {
    out.push(cur);
    cur = addDaysStr(cur, 1);
  }
  return out;
}

function esDapVigente(d) {
  const v = (d.vigente || '').toString().toLowerCase();
  return v === 'si' || v === 'sí' || v === 'yes';
}

// ══════════════════════════════════════════════════════════════════════
// Motor principal
// ══════════════════════════════════════════════════════════════════════

export function buildFlujo13s({
  bancos = [],
  calendario = [],
  leasingDetalle = [],
  creditoPendiente = [],
  cobranzas = null,
  dap = [],
  ffmm = [],
  hoy,
}) {
  if (!hoy) return null;

  const cajaInicial = saldoActualBancos(bancos) || 0;

  const startS0 = startOfISOWeek(hoy);
  const semanas = [];
  for (let w = 0; w < 13; w++) {
    const inicio = addDaysStr(startS0, w * 7);
    const fin = addDaysStr(inicio, 6);
    semanas.push({
      n: w + 1,
      inicio,
      fin,
      label: fmtRangoCorto(inicio, fin),
      ingresos: 0,
      egresos: 0,
      detIngresos: [],
      detEgresos: [],
    });
  }

  const rangoInicio = semanas[0].inicio;
  const rangoFin = semanas[semanas.length - 1].fin;
  const todasFechas = listarFechasEntre(rangoInicio, rangoFin);

  // ─── Egresos: calendario ──────────────────────────────────────
  calendario.forEach((r) => {
    if (!r.fecha || r.fecha < hoy) return;
    for (const s of semanas) {
      if (r.fecha >= s.inicio && r.fecha <= s.fin) {
        s.egresos += r.monto || 0;
        s.detEgresos.push({
          fecha: r.fecha,
          concepto: r.concepto || 'Calendario',
          monto: r.monto || 0,
          tipo: 'cal',
        });
        break;
      }
    }
  });

  // ─── Egresos: leasing (cuota con IVA — lo que realmente sale de caja) ──
  const leasingPorFecha = expandirLeasing(leasingDetalle, todasFechas, 'cuotaCLPcIVA');
  Object.entries(leasingPorFecha).forEach(([fecha, monto]) => {
    if (fecha < hoy) return;
    for (const s of semanas) {
      if (fecha >= s.inicio && fecha <= s.fin) {
        s.egresos += monto;
        s.detEgresos.push({
          fecha,
          concepto: 'Leasing (cuota)',
          monto,
          tipo: 'leasing',
        });
        break;
      }
    }
  });

  // ─── Egresos: crédito ──────────────────────────────────────────
  creditoPendiente.forEach((c) => {
    if (!c.fechaVenc || c.fechaVenc < hoy) return;
    for (const s of semanas) {
      if (c.fechaVenc >= s.inicio && c.fechaVenc <= s.fin) {
        s.egresos += c.valorCuota || 0;
        s.detEgresos.push({
          fecha: c.fechaVenc,
          concepto: `Crédito · cuota ${c.nCuota}`,
          monto: c.valorCuota || 0,
          tipo: 'credito',
        });
        break;
      }
    }
  });

  // ─── Ingresos: cobranzas Defontana (no críticas, por fecha vencimiento) ──
  let totalCobranzasExistentes = 0;
  let totalCobranzasVencidas = 0;
  if (cobranzas) {
    Object.values(cobranzas.porCliente || {}).forEach((c) => {
      (c.facturasPendientes || []).forEach((f) => {
        if (f.critica) return;
        if (!f.vencimiento) return;
        const vencStr = toDateStr(f.vencimiento);
        if (!vencStr) return;
        let targetStr = vencStr;
        const vencida = vencStr < hoy;
        if (vencida) {
          targetStr = hoy;
          totalCobranzasVencidas += f.monto;
        }
        for (const s of semanas) {
          if (targetStr >= s.inicio && targetStr <= s.fin) {
            s.ingresos += f.monto;
            s.detIngresos.push({
              fecha: targetStr,
              concepto: `${(c.nombre || '').slice(0, 40)} · folio ${f.folio || '—'}`,
              monto: f.monto,
              tipo: 'cobranza',
              vencida,
            });
            totalCobranzasExistentes += f.monto;
            break;
          }
        }
      });
    });
  }

  // ─── Ingresos: DAPs Trabajo que vencen ────────────────────────
  let totalDAPsVence = 0;
  dap.forEach((d) => {
    if (!esDapVigente(d)) return;
    if (clas(d.tipo) !== 'trabajo') return;
    if (!d.vencimiento || d.vencimiento < hoy) return;
    const monto = d.montoFinal || d.montoInicial || 0;
    if (monto <= 0) return;
    for (const s of semanas) {
      if (d.vencimiento >= s.inicio && d.vencimiento <= s.fin) {
        s.ingresos += monto;
        s.detIngresos.push({
          fecha: d.vencimiento,
          concepto: `DAP ${d.banco || ''} vence`,
          monto,
          tipo: 'dap',
        });
        totalDAPsVence += monto;
        break;
      }
    }
  });

  // ─── Caja rodante ──────────────────────────────────────────────
  let caja = cajaInicial;
  semanas.forEach((s) => {
    s.cajaInicial = caja;
    s.neto = s.ingresos - s.egresos;
    s.cajaFinal = caja + s.neto;
    caja = s.cajaFinal;
  });

  // ─── Colchón ──────────────────────────────────────────────────
  const totalFFMM = (ffmm || []).reduce((s, f) => s + (f.valorActual || 0), 0);
  const dapInversion = dap.filter((d) => esDapVigente(d) && clas(d.tipo) === 'inversion');
  const dapCredito = dap.filter((d) => esDapVigente(d) && clas(d.tipo) === 'credito');
  const totalDAPInv = dapInversion.reduce(
    (s, d) => s + (d.montoFinal || d.montoInicial || 0),
    0,
  );
  const totalDAPCred = dapCredito.reduce(
    (s, d) => s + (d.montoFinal || d.montoInicial || 0),
    0,
  );
  const colchonTotal = totalFFMM + totalDAPInv + totalDAPCred;

  const totalIngresos = semanas.reduce((s, x) => s + x.ingresos, 0);
  const totalEgresos = semanas.reduce((s, x) => s + x.egresos, 0);
  const flujoNeto = totalIngresos - totalEgresos;
  const semanasNegativas = semanas.filter((s) => s.cajaFinal < 0);

  const rescate = buildRescate(semanas, {
    fondos: ffmm || [],
    dapInv: dapInversion,
    dapCred: dapCredito,
  });

  return {
    semanas,
    cajaInicial,
    totalIngresos,
    totalEgresos,
    flujoNeto,
    totalCobranzasExistentes,
    totalCobranzasVencidas,
    totalDAPsVence,
    colchonTotal,
    colchonFFMM: totalFFMM,
    colchonDAPInv: totalDAPInv,
    colchonDAPCred: totalDAPCred,
    dapInversion,
    dapCredito,
    semanasNegativas,
    rescate,
  };
}

// ══════════════════════════════════════════════════════════════════════
// Plan de rescate — FFMM → DAP Inv → DAP Créd
// Por cada semana con cajaFinal < 0, arma un plan consumiendo el colchón
// disponible en ese orden (más líquido y barato primero).
// ══════════════════════════════════════════════════════════════════════

export function buildRescate(semanas, { fondos = [], dapInv = [], dapCred = [] }) {
  const fuentes = construirFuentes({ fondos, dapInv, dapCred });
  const sugerencias = {};
  // Estado compartido: a medida que rescatamos en semanas tempranas, las
  // fuentes se van vaciando y no están disponibles para semanas posteriores.
  const disponibles = fuentes.map((f) => ({ ...f, saldoRestante: f.monto }));

  semanas.forEach((s, idx) => {
    if (s.cajaFinal >= 0) return;
    const necesitado = Math.abs(s.cajaFinal);
    const plan = [];
    let cubierto = 0;

    for (const fuente of disponibles) {
      if (cubierto >= necesitado) break;
      if (fuente.saldoRestante <= 0) continue;

      // Si la fuente es un DAP con vencimiento posterior al fin de la
      // semana s, necesitamos romperla (penalidad). FFMM siempre disponible.
      const disponibleSinRomper =
        !fuente.vencimiento || fuente.vencimiento <= s.fin;

      const aTomar = Math.min(fuente.saldoRestante, necesitado - cubierto);
      plan.push({
        tipo: fuente.tipo,
        label: fuente.label,
        monto: aTomar,
        rompe: !disponibleSinRomper,
        vencimiento: fuente.vencimiento,
      });
      fuente.saldoRestante -= aTomar;
      cubierto += aTomar;
    }

    sugerencias[idx] = {
      necesitado,
      cubierto,
      faltante: Math.max(0, necesitado - cubierto),
      plan,
    };
  });

  return sugerencias;
}

function construirFuentes({ fondos, dapInv, dapCred }) {
  const fuentes = [];

  const totalFFMM = fondos.reduce((s, f) => s + (f.valorActual || 0), 0);
  if (totalFFMM > 0) {
    fuentes.push({
      tipo: 'ffmm',
      label: fondos.length === 1 ? fondos[0].fondo || 'FFMM' : `FFMM (${fondos.length})`,
      monto: totalFFMM,
      vencimiento: null,
      prioridad: 1,
    });
  }

  [...dapInv]
    .filter((d) => (d.montoFinal || d.montoInicial || 0) > 0)
    .sort((a, b) => (a.vencimiento || '9999-12-31').localeCompare(b.vencimiento || '9999-12-31'))
    .forEach((d) => {
      fuentes.push({
        tipo: 'dap_inv',
        label: `DAP Inv · ${d.banco || ''}`,
        monto: d.montoFinal || d.montoInicial || 0,
        vencimiento: d.vencimiento || null,
        prioridad: 2,
      });
    });

  [...dapCred]
    .filter((d) => (d.montoFinal || d.montoInicial || 0) > 0)
    .sort((a, b) => (a.vencimiento || '9999-12-31').localeCompare(b.vencimiento || '9999-12-31'))
    .forEach((d) => {
      fuentes.push({
        tipo: 'dap_cred',
        label: `DAP Créd · ${d.banco || ''}`,
        monto: d.montoFinal || d.montoInicial || 0,
        vencimiento: d.vencimiento || null,
        prioridad: 3,
      });
    });

  return fuentes;
}
