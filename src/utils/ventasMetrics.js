// Cálculos puros para métricas de ventas.
// Todas las funciones reciben `rows` con shape { fecha: 'YYYY-MM-DD', neto, razonSocial, afecta, folio, montoReal }.
// No mutan input y no dependen de React ni de Recharts.

import { nombreCliente, INACTIVITY_THRESHOLD_MONTHS } from '../config/ventasConfig.js';

const MESES_ABREV = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MESES_LARGO = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// Devuelve el etiquetado abreviado de un mes 1..12.
export const etiquetaMes = (m1a12) => MESES_ABREV[Math.max(0, Math.min(11, m1a12 - 1))] || '';
export const etiquetaMesLargo = (m1a12) => MESES_LARGO[Math.max(0, Math.min(11, m1a12 - 1))] || '';

// Suma de neto filtrado por una función predicate.
export function sumaNetoSi(rows, predicate) {
  let s = 0;
  for (const r of rows) {
    if (predicate(r)) s += r.neto || 0;
  }
  return s;
}

// Totaliza por año: { '2024': 12345, '2025': 67890 }
export function totalPorAnio(rows) {
  const out = {};
  for (const r of rows) {
    const y = r.fecha.substring(0, 4);
    out[y] = (out[y] || 0) + (r.neto || 0);
  }
  return out;
}

// Total YTD de un año dado, cortado a mes/día de referencia.
// mmdd por defecto = día de hoy (o el del rango de datos disponibles para el año en curso).
export function totalYTD(rows, anio, mmddCorte) {
  const prefix = String(anio);
  return sumaNetoSi(rows, (r) =>
    r.fecha.startsWith(prefix) && (!mmddCorte || r.fecha.slice(5) <= mmddCorte),
  );
}

// Serie mensual de un año: [{ mes: 'YYYY-MM', m: 1..12, neto }].
// Relleno con ceros para los meses sin facturas.
export function serieMensualAnio(rows, anio) {
  const prefix = String(anio);
  const acc = Array.from({ length: 12 }, (_, i) => ({ m: i + 1, neto: 0 }));
  for (const r of rows) {
    if (r.fecha.startsWith(prefix)) {
      const m = Number(r.fecha.slice(5, 7));
      if (m >= 1 && m <= 12) acc[m - 1].neto += r.neto || 0;
    }
  }
  return acc.map((x) => ({
    mes: `${anio}-${String(x.m).padStart(2, '0')}`,
    m: x.m,
    label: etiquetaMes(x.m),
    neto: x.neto,
  }));
}

// Comparación año actual vs año anterior mes a mes (12 meses).
// Retorna [{ label, m, actual, anterior, meta }] donde meta = MetaAnual/12.
export function comparacionMensual(rows, anioActual, anioAnterior, metaMensual = 0) {
  const act = serieMensualAnio(rows, anioActual);
  const ant = serieMensualAnio(rows, anioAnterior);
  return act.map((a, i) => ({
    label: a.label,
    m: a.m,
    actual: a.neto,
    anterior: ant[i].neto,
    meta: metaMensual,
  }));
}

// Proyección lineal: YTD extrapolado a 12 meses asumiendo velocidad constante.
// Útil como línea de base.
export function proyectarLineal(ytd, mesesTranscurridos) {
  if (!mesesTranscurridos || mesesTranscurridos <= 0) return 0;
  return (ytd / mesesTranscurridos) * 12;
}

// Proyección prorrateada por días hábiles transcurridos (excluye sáb/dom).
// `hoyISO` = 'YYYY-MM-DD'. `anio` = año objetivo.
export function proyectarProrrateada(ytd, anio, hoyISO) {
  const hoy = new Date(hoyISO + 'T12:00:00');
  const inicio = new Date(`${anio}-01-01T12:00:00`);
  const fin = new Date(`${anio}-12-31T12:00:00`);
  const habilesHastaHoy = contarDiasHabiles(inicio, hoy);
  const habilesAnio = contarDiasHabiles(inicio, fin);
  if (habilesHastaHoy <= 0 || habilesAnio <= 0) return 0;
  return (ytd / habilesHastaHoy) * habilesAnio;
}

function contarDiasHabiles(desde, hasta) {
  if (desde > hasta) return 0;
  let n = 0;
  const d = new Date(desde);
  while (d <= hasta) {
    const dow = d.getDay(); // 0 = dom, 6 = sab
    if (dow !== 0 && dow !== 6) n++;
    d.setDate(d.getDate() + 1);
  }
  return n;
}

// Proyección estacional: usa la distribución porcentual del año anterior
// para escalar los meses aún no cerrados del año en curso.
// Mejor que la lineal cuando hay estacionalidad fuerte.
// `mmddCorte` define qué parte del mes actual está cerrada.
export function proyectarEstacional(rows, anioActual, anioAnterior, mmddCorte) {
  const actAnual = serieMensualAnio(rows, anioActual);
  const antAnual = serieMensualAnio(rows, anioAnterior);
  const antTotal = antAnual.reduce((s, x) => s + x.neto, 0);
  if (antTotal <= 0) return 0;

  const mesHoy = Number(mmddCorte.slice(0, 2));
  const diaHoy = Number(mmddCorte.slice(3));
  let proyectado = 0;
  for (let m = 1; m <= 12; m++) {
    if (m < mesHoy) {
      proyectado += actAnual[m - 1].neto;
    } else if (m === mesHoy) {
      // Completa el mes actual con el ritmo del mes pasado equivalente.
      const diasEnMes = new Date(anioActual, m, 0).getDate();
      const frac = Math.min(1, diaHoy / diasEnMes);
      const esperadoMes = antAnual[m - 1].neto;
      const actualMes = actAnual[m - 1].neto;
      const restante = esperadoMes * (1 - frac);
      proyectado += Math.max(actualMes, actualMes + restante);
    } else {
      // Meses futuros: usar el mismo mes del año pasado como proxy.
      proyectado += antAnual[m - 1].neto;
    }
  }
  return proyectado;
}

// Índice Herfindahl-Hirschman: concentración de cartera.
// Recibe array de share en porcentaje (0..100). Retorna 0..10000.
// <1500 = baja, 1500-2500 = moderada, >2500 = alta.
export function calcularHHI(sharesPct) {
  return sharesPct.reduce((s, p) => s + p * p, 0);
}

export function nivelHHI(hhi) {
  if (hhi < 1500) return { label: 'Baja', color: '#16A34A' };
  if (hhi <= 2500) return { label: 'Moderada', color: '#D97706' };
  return { label: 'Alta', color: '#DC2626' };
}

// Top N clientes por facturación total dentro del subset dado.
// Aplica alias de CLIENT_ALIASES. Retorna [{ cliente, monto, facturas, share }].
export function topClientes(rows, n = 10) {
  const map = {};
  let total = 0;
  for (const r of rows) {
    const k = nombreCliente(r.razonSocial);
    if (!map[k]) map[k] = { cliente: k, monto: 0, facturas: 0 };
    map[k].monto += r.neto || 0;
    map[k].facturas += 1;
    total += r.neto || 0;
  }
  const all = Object.values(map).sort((a, b) => b.monto - a.monto);
  const top = all.slice(0, n).map((c) => ({ ...c, share: total > 0 ? (c.monto / total) * 100 : 0 }));
  const restoMonto = all.slice(n).reduce((s, c) => s + c.monto, 0);
  const restoShare = total > 0 ? (restoMonto / total) * 100 : 0;
  return { top, restoMonto, restoShare, total, clientesTotales: all.length };
}

// Clientes en fuga: estaban activos el año anterior y llevan >= umbral meses sin facturar.
// `hoyISO` = 'YYYY-MM-DD'. Retorna [{ cliente, ultimoMes, ultimaFactura, valorHistorico, mesesSinFacturar }].
export function clientesEnFuga(rows, hoyISO, umbralMeses = INACTIVITY_THRESHOLD_MONTHS) {
  const hoy = new Date(hoyISO + 'T12:00:00');
  const anioActual = Number(hoyISO.slice(0, 4));
  const anioPasado = anioActual - 1;

  const porCliente = {};
  for (const r of rows) {
    const k = nombreCliente(r.razonSocial);
    if (!porCliente[k]) porCliente[k] = { cliente: k, filas: [] };
    porCliente[k].filas.push(r);
  }

  const out = [];
  for (const info of Object.values(porCliente)) {
    const activoAnioPasado = info.filas.some((r) => r.fecha.startsWith(String(anioPasado)));
    if (!activoAnioPasado) continue;

    const ultima = info.filas.reduce((a, b) => (a.fecha > b.fecha ? a : b));
    const fechaUltima = new Date(ultima.fecha + 'T12:00:00');
    const mesesSin = (hoy.getFullYear() - fechaUltima.getFullYear()) * 12
      + (hoy.getMonth() - fechaUltima.getMonth());
    if (mesesSin < umbralMeses) continue;

    const filasAnioPasado = info.filas.filter((r) => r.fecha.startsWith(String(anioPasado)));
    const valorHistorico = filasAnioPasado.reduce((s, r) => s + (r.neto || 0), 0);

    out.push({
      cliente: info.cliente,
      ultimoMes: ultima.fecha.substring(0, 7),
      ultimaFactura: ultima.fecha,
      mesesSinFacturar: mesesSin,
      valorHistorico,
    });
  }

  return out.sort((a, b) => b.valorHistorico - a.valorHistorico);
}

// Evolución por cliente apilada: retorna [{ mes, label, <clienteA>, <clienteB>, ..., Otros }].
// Toma los últimos `nMeses` meses con datos. `topN` clientes nombrados, el resto agrupado.
export function evolucionClientesMes(rows, { nMeses = 12, topN = 5 } = {}) {
  const top = topClientes(rows, topN).top.map((c) => c.cliente);
  const esTop = new Set(top);

  const porMes = {};
  for (const r of rows) {
    const mes = r.fecha.substring(0, 7);
    if (!porMes[mes]) porMes[mes] = { mes };
  }
  const mesesOrdenados = Object.keys(porMes).sort().slice(-nMeses);
  const mesesSet = new Set(mesesOrdenados);

  // Init
  for (const m of mesesOrdenados) {
    for (const c of top) porMes[m][c] = 0;
    porMes[m].Otros = 0;
  }

  for (const r of rows) {
    const mes = r.fecha.substring(0, 7);
    if (!mesesSet.has(mes)) continue;
    const k = nombreCliente(r.razonSocial);
    if (esTop.has(k)) porMes[mes][k] += r.neto || 0;
    else porMes[mes].Otros += r.neto || 0;
  }

  const first = mesesOrdenados[0];
  return {
    series: ['Otros', ...top], // orden de dibujo; primero se pinta abajo
    data: mesesOrdenados.map((m) => {
      const mm = Number(m.slice(5));
      return { ...porMes[m], label: etiquetaMes(mm), anioMes: m };
    }),
    rangoDesde: first || null,
  };
}

// Brecha YTD: actual - anterior. En CLP y en porcentaje.
export function brechaYTD(totalActual, totalAnterior) {
  const abs = totalActual - totalAnterior;
  const pct = totalAnterior > 0 ? (abs / totalAnterior) * 100 : null;
  return { abs, pct };
}
