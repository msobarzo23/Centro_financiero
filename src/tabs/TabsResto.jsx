import { useState } from 'react';
import {
  f, fS, fd, fdf, dd, fUF, clas, colorTipo, colorBanco,
  mesLabel, mesLabelLargo,
} from '../utils/format.js';
import { S, W, R, SP } from '../utils/theme.js';
import { Card, Eyebrow, Metric } from '../components/common.jsx';
import Proyeccion90d from '../components/Proyeccion90d.jsx';

const MONO = "'SF Mono', ui-monospace, Menlo, Consolas, monospace";

// Estilo común de celda de tabla
const thStyle = (C) => ({
  padding: `${SP.md}px ${SP.md}px`,
  textAlign: "left",
  fontSize: S.xs,
  color: C.tm,
  fontWeight: W.sb,
  textTransform: "uppercase",
  letterSpacing: "0.6px",
  whiteSpace: "nowrap",
});

const tableContainerStyle = (C) => ({
  background: C.surface,
  borderRadius: R.lg,
  border: `1px solid ${C.border}`,
  overflow: "hidden",
});

// Pill (etiqueta pequeña tipo badge)
const Pill = ({ children, bg, color, C }) => (
  <span
    style={{
      padding: `2px ${SP.sm}px`,
      borderRadius: R.sm,
      fontSize: S.xxs,
      fontWeight: W.sb,
      background: bg,
      color: color,
      textTransform: "uppercase",
      letterSpacing: "0.4px",
    }}
  >
    {children}
  </span>
);

// ─── CALENDARIO ──────────────────────────────────────────────────────────────
export function TabCalendario({ C, cal, isMobile, hoy }) {
  const meses = {};
  cal.forEach(c => {
    if (!c.fecha) return;
    const m = c.fecha.substring(0, 7);
    if (!meses[m]) meses[m] = [];
    meses[m].push(c);
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: SP.lg }}>
      {Object.entries(meses).sort(([a], [b]) => a.localeCompare(b)).map(([mes, items]) => {
        const comp = items.reduce((s, c) => s + c.monto, 0);
        const guar = items.reduce((s, c) => s + c.guardado, 0);
        const pct = comp > 0 ? Math.min(guar / comp, 1) : 0;
        const label = new Date(mes + "-15").toLocaleDateString("es-CL", { month: "long", year: "numeric" });

        return (
          <div key={mes}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: SP.md,
                marginBottom: SP.sm,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  fontSize: S.md,
                  fontWeight: W.sb,
                  color: C.text,
                  textTransform: "capitalize",
                  minWidth: 120,
                  letterSpacing: "-0.2px",
                }}
              >
                {label}
              </div>
              <div
                style={{
                  flex: 1,
                  minWidth: 120,
                  height: 8,
                  background: C.surfaceAlt,
                  borderRadius: 4,
                }}
              >
                <div
                  style={{
                    width: `${pct * 100}%`,
                    height: "100%",
                    borderRadius: 4,
                    background: pct >= 0.9 ? C.green : pct >= 0.5 ? C.amber : C.red,
                    transition: "width 300ms ease",
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: S.sm,
                  color: C.tm,
                  minWidth: 44,
                  textAlign: "right",
                  fontWeight: W.sb,
                }}
              >
                {Math.round(pct * 100)}%
              </div>
              {!isMobile && (
                <div style={{ fontSize: S.sm, color: C.td, fontWeight: W.m }}>
                  {f(guar)} / {f(comp)}
                </div>
              )}
            </div>

            <div style={tableContainerStyle(C)}>
              {items.map((c, i) => {
                const ok = c.falta === 0;
                const past = c.fecha < hoy;
                const today = c.fecha === hoy;
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: SP.md,
                      padding: isMobile ? `${SP.sm}px ${SP.md}px` : `${SP.md}px ${SP.lg}px`,
                      borderBottom: i < items.length - 1 ? `1px solid ${C.border}` : "none",
                      opacity: past ? 0.55 : 1,
                      background: today ? C.accentD : "transparent",
                    }}
                  >
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        border: `2px solid ${ok ? C.green : C.amber}`,
                        background: ok ? C.green : "transparent",
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ minWidth: 52, fontSize: S.xs, color: C.tm, fontWeight: W.sb }}>
                      {fd(c.fecha)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: S.base,
                          color: C.text,
                          fontWeight: W.m,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {c.concepto}
                      </div>
                      {c.comentario && !isMobile && (
                        <div style={{ fontSize: S.xs, color: C.td, fontWeight: W.m }}>
                          {c.comentario}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div
                        style={{
                          fontSize: S.base,
                          fontWeight: W.sb,
                          fontFamily: MONO,
                          color: ok ? C.green : C.text,
                        }}
                      >
                        {fS(c.monto)}
                      </div>
                      {c.falta > 0 && (
                        <div style={{ fontSize: S.xxs, color: C.red, fontWeight: W.sb }}>
                          Falta: {fS(c.falta)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── FLUJO DE CAJA ───────────────────────────────────────────────────────────
export function TabFlujoCaja({ C, bancos, ventas, calendario, leasingDetalle, creditoPendiente, isMobile, hoy }) {
  const [vista, setVista] = useState('12m');
  const hoyD = new Date(hoy + "T12:00:00");

  const egresosPorMes = {};
  calendario.forEach(c => {
    if (!c.fecha) return;
    const mes = c.fecha.substring(0, 7);
    if (!egresosPorMes[mes]) egresosPorMes[mes] = 0;
    egresosPorMes[mes] += c.monto;
  });

  const cuotaLeasingMes = leasingDetalle.reduce((s, d) => s + d.cuotaCLPsIVA, 0);
  const cuotaCreditoMes = creditoPendiente.length > 0 ? (creditoPendiente[0].valorCuota || 0) : 0;

  const mesesSet = new Set();
  ventas.porMes.forEach(m => mesesSet.add(m.mes));
  for (let i = 0; i < 12; i++) {
    const d = new Date(hoyD.getFullYear(), hoyD.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    mesesSet.add(key);
  }
  const meses12 = [...mesesSet].sort().slice(-14);

  const ventasPorMes = {};
  ventas.porMes.forEach(m => { ventasPorMes[m.mes] = m.neto; });

  const data12 = meses12.map(mes => {
    const ingreso = ventasPorMes[mes] || 0;
    const egresosCal = egresosPorMes[mes] || 0;
    const esFuturo = mes >= hoy.substring(0, 7);
    const egresosTotal = esFuturo ? egresosCal + cuotaLeasingMes + cuotaCreditoMes : egresosCal;
    const neto = ingreso - egresosTotal;
    return { mes, ingreso, egresos: egresosTotal, neto };
  });

  let acum12 = 0;
  const data12conAcum = data12.map(d => {
    acum12 += d.neto;
    return { ...d, acum: acum12 };
  });

  const dias30 = [];
  for (let i = -7; i < 30; i++) {
    const d = new Date(hoyD);
    d.setDate(d.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    dias30.push(key);
  }

  const ventasPorDia = {};
  ventas.porDia.forEach(d => { ventasPorDia[d.fecha] = d.neto; });
  const egresosPorDia = {};
  calendario.forEach(c => { if (c.fecha) egresosPorDia[c.fecha] = (egresosPorDia[c.fecha] || 0) + c.monto; });
  const diasVtoLeasing = [...new Set(leasingDetalle.map(d => d.diaVto))];
  dias30.forEach(fecha => {
    const diaNum = parseInt(fecha.split('-')[2], 10);
    if (diasVtoLeasing.includes(diaNum)) {
      const cuotaDia = leasingDetalle.filter(d => d.diaVto === diaNum).reduce((s, d) => s + d.cuotaCLPsIVA, 0);
      egresosPorDia[fecha] = (egresosPorDia[fecha] || 0) + cuotaDia;
    }
  });
  creditoPendiente.forEach(c => {
    if (c.fechaVenc && dias30.includes(c.fechaVenc)) {
      egresosPorDia[c.fechaVenc] = (egresosPorDia[c.fechaVenc] || 0) + c.valorCuota;
    }
  });

  const data30 = dias30.map(fecha => ({
    fecha,
    ingreso: ventasPorDia[fecha] || 0,
    egresos: egresosPorDia[fecha] || 0,
    neto: (ventasPorDia[fecha] || 0) - (egresosPorDia[fecha] || 0),
    esHoy: fecha === hoy,
    esPasado: fecha < hoy,
  }));

  const mesAct = hoy.substring(0, 7);
  const ingresoMesAct = ventasPorMes[mesAct] || 0;
  const egresoMesAct = (egresosPorMes[mesAct] || 0) + cuotaLeasingMes + cuotaCreditoMes;
  const netoMesAct = ingresoMesAct - egresoMesAct;
  const promedioIngMensual = data12.filter(d => d.ingreso > 0).reduce((s, d) => s + d.ingreso, 0)
    / Math.max(data12.filter(d => d.ingreso > 0).length, 1);
  const mejorMes = [...data12].sort((a, b) => b.neto - a.neto)[0];
  const peorMes = [...data12].sort((a, b) => a.neto - b.neto)[0];

  function Grafico12m() {
    const VW = 860, VH = 220, padL = 10, padR = 10, padT = 20, padB = 36;
    const chartW = VW - padL - padR, chartH = VH - padT - padB;
    const maxVal = Math.max(...data12conAcum.map(d => Math.max(d.ingreso, d.egresos)), 1);
    const minAcum = Math.min(...data12conAcum.map(d => d.acum), 0);
    const maxAcum = Math.max(...data12conAcum.map(d => d.acum), 1);
    const rangeAcum = maxAcum - minAcum || 1;
    const barW = Math.floor(chartW / data12conAcum.length);
    const bPad = 4;
    const bW = Math.max((barW - bPad * 2) / 2, 4);
    const scaleAcum = (v) => chartH * (1 - (v - minAcum) / rangeAcum);
    const puntos = data12conAcum.map((d, i) => {
      const cx = padL + i * barW + barW / 2;
      const cy = padT + scaleAcum(d.acum);
      return `${cx},${cy}`;
    }).join(' ');

    return (
      <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width: "100%", height: "auto" }}>
        {[0.25, 0.5, 0.75, 1].map(p => (
          <line key={p} x1={padL} y1={padT + chartH * (1 - p)} x2={VW - padR} y2={padT + chartH * (1 - p)}
            stroke={C.border} strokeWidth="0.5" strokeDasharray="3,3" />
        ))}
        {minAcum < 0 && (
          <line x1={padL} y1={padT + scaleAcum(0)} x2={VW - padR} y2={padT + scaleAcum(0)}
            stroke={C.td} strokeWidth="0.5" strokeDasharray="4,2" />
        )}
        {data12conAcum.map((d, i) => {
          const x = padL + i * barW + bPad;
          const esAct = d.mes === mesAct;
          const hIng = chartH * (d.ingreso / maxVal);
          const hEgr = chartH * (d.egresos / maxVal);
          return (
            <g key={i}>
              {esAct && <rect x={padL + i * barW} y={padT} width={barW} height={chartH} fill={C.accentD} rx={2} />}
              <rect x={x} y={padT + chartH - hIng} width={bW} height={hIng} fill={C.green} opacity={0.8} rx={2} />
              <rect x={x + bW + 1} y={padT + chartH - hEgr} width={bW} height={hEgr} fill={C.red} opacity={0.7} rx={2} />
              <text x={padL + i * barW + barW / 2} y={VH - 6} textAnchor="middle"
                fontSize="9" fontWeight={esAct ? 700 : 500} fill={esAct ? C.accent : C.tm}>
                {mesLabel(d.mes)}
              </text>
            </g>
          );
        })}
        <polyline points={puntos} fill="none" stroke={C.amber} strokeWidth="2" strokeLinejoin="round" />
        {data12conAcum.map((d, i) => {
          const cx = padL + i * barW + barW / 2;
          const cy = padT + scaleAcum(d.acum);
          return <circle key={i} cx={cx} cy={cy} r={2.8} fill={C.amber} />;
        })}
      </svg>
    );
  }

  function Grafico30d() {
    const VW = 860, VH = 200, padL = 10, padR = 10, padT = 16, padB = 32;
    const chartW = VW - padL - padR, chartH = VH - padT - padB;
    const maxVal = Math.max(...data30.map(d => Math.max(d.ingreso, d.egresos)), 1);
    const barW = Math.floor(chartW / data30.length);
    const gap = 2;
    const bW = Math.max(barW - gap, 3);

    return (
      <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width: "100%", height: "auto" }}>
        {[0.5, 1].map(p => (
          <line key={p} x1={padL} y1={padT + chartH * (1 - p)} x2={VW - padR} y2={padT + chartH * (1 - p)}
            stroke={C.border} strokeWidth="0.5" strokeDasharray="3,3" />
        ))}
        {data30.map((d, i) => {
          const x = padL + i * barW + gap / 2;
          const hIng = chartH * (d.ingreso / maxVal);
          const hEgr = chartH * (d.egresos / maxVal);
          const dNum = parseInt(d.fecha.split('-')[2], 10);
          const showLabel = dNum === 1 || dNum % 5 === 0 || d.esHoy;
          return (
            <g key={i}>
              {d.esHoy && <rect x={padL + i * barW} y={padT} width={barW} height={chartH} fill={C.accentD} />}
              {d.esPasado && d.ingreso > 0 &&
                <rect x={x} y={padT + chartH - hIng} width={bW} height={hIng} fill={C.green} opacity={0.5} rx={1} />}
              {!d.esPasado && d.egresos > 0 &&
                <rect x={x} y={padT + chartH - hEgr} width={bW} height={hEgr} fill={C.red} opacity={0.6} rx={1} />}
              {!d.esPasado && d.ingreso > 0 &&
                <rect x={x} y={padT + chartH - hIng} width={bW} height={hIng} fill={C.green} opacity={0.8} rx={1} />}
              {showLabel && (
                <text x={x + bW / 2} y={VH - 4} textAnchor="middle"
                  fontSize="9" fontWeight={d.esHoy ? 700 : 500} fill={d.esHoy ? C.accent : C.tm}>
                  {d.esHoy ? "HOY" : fd(d.fecha)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: SP.lg }}>
      <Proyeccion90d
        C={C}
        bancos={bancos}
        ventas={ventas}
        calendario={calendario}
        leasingDetalle={leasingDetalle}
        creditoPendiente={creditoPendiente}
        hoy={hoy}
        isMobile={isMobile}
      />

      <div style={{ display: "flex", gap: SP.md, flexWrap: "wrap" }}>
        <Metric C={C}
          label={`Ingresos ${new Date(mesAct + "-15").toLocaleDateString("es-CL", { month: "long" })}`}
          value={ingresoMesAct > 0 ? f(ingresoMesAct) : "Sin datos"}
          sub="Neto facturado" color={C.green} />
        <Metric C={C} label="Egresos comprometidos"
          value={f(egresoMesAct)} sub="Cal + leasing s/IVA + crédito" color={C.red} />
        <Metric C={C} label="Resultado neto"
          value={f(netoMesAct)} sub="Ingreso − egreso" color={netoMesAct >= 0 ? C.green : C.red} />
        <Metric C={C} label="Promedio ingreso/mes"
          value={f(promedioIngMensual)} sub="Neto · meses con ventas (hasta 14m)" color={C.accent} />
      </div>

      <div
        style={{
          display: "flex",
          gap: 0,
          background: C.surfaceAlt,
          borderRadius: R.md,
          padding: 3,
          width: "fit-content",
          border: `1px solid ${C.border}`,
        }}
      >
        {[['30d', 'Detalle 30 días'], ['12m', 'Resumen 12 meses']].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setVista(k)}
            style={{
              padding: `${SP.sm}px ${SP.lg}px`,
              borderRadius: R.sm,
              fontSize: S.sm,
              fontWeight: vista === k ? W.sb : W.m,
              background: vista === k ? C.accent : "transparent",
              color: vista === k ? "#fff" : C.tm,
              border: "none",
              cursor: "pointer",
              transition: "all 120ms ease",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <Card C={C}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: SP.md,
            flexWrap: "wrap",
            gap: SP.sm,
          }}
        >
          <Eyebrow C={C} style={{ marginBottom: 0 }}>
            {vista === '30d' ? 'Ingresos vs egresos' : 'Ingresos vs egresos · línea = neto acumulado'}
          </Eyebrow>
          <div style={{ display: "flex", gap: SP.md }}>
            <div style={{ display: "flex", alignItems: "center", gap: SP.xs, fontSize: S.xs, color: C.tm, fontWeight: W.m }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: C.green, opacity: 0.8 }} /> Ingresos
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: SP.xs, fontSize: S.xs, color: C.tm, fontWeight: W.m }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: C.red, opacity: 0.7 }} /> Egresos
            </div>
            {vista === '12m' && (
              <div style={{ display: "flex", alignItems: "center", gap: SP.xs, fontSize: S.xs, color: C.tm, fontWeight: W.m }}>
                <div style={{ width: 20, height: 2, background: C.amber, borderRadius: 1 }} /> Neto acum.
              </div>
            )}
          </div>
        </div>
        {vista === '30d' ? <Grafico30d /> : <Grafico12m />}
      </Card>

      {vista === '12m' && (
        <div style={tableContainerStyle(C)}>
          <div style={{ padding: `${SP.md}px ${SP.lg}px`, borderBottom: `1px solid ${C.borderL}` }}>
            <Eyebrow C={C} style={{ marginBottom: 0 }}>Detalle mensual</Eyebrow>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: S.base }}>
              <thead>
                <tr>
                  {["Mes", "Ingresos", "Egresos", "Neto", "Neto acum.", "Facturas"].map(h => (
                    <th key={h} style={{ ...thStyle(C), borderBottom: `1px solid ${C.borderL}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data12conAcum.map((d, i) => {
                  const esAct = d.mes === mesAct;
                  const ventasInfo = ventas.porMes.find(v => v.mes === d.mes);
                  return (
                    <tr key={i} style={{ borderTop: `1px solid ${C.border}`, background: esAct ? C.accentD : "transparent" }}>
                      <td
                        style={{
                          padding: `${SP.sm}px ${SP.md}px`,
                          fontWeight: esAct ? W.sb : W.m,
                          color: esAct ? C.accent : C.text,
                          whiteSpace: "nowrap",
                          textTransform: "capitalize",
                        }}
                      >
                        {mesLabelLargo(d.mes)}
                      </td>
                      <td style={{ padding: `${SP.sm}px ${SP.md}px`, fontFamily: MONO, color: d.ingreso > 0 ? C.green : C.td, fontWeight: W.m }}>
                        {d.ingreso > 0 ? f(d.ingreso) : "—"}
                      </td>
                      <td style={{ padding: `${SP.sm}px ${SP.md}px`, fontFamily: MONO, color: d.egresos > 0 ? C.red : C.td, fontWeight: W.m }}>
                        {d.egresos > 0 ? f(d.egresos) : "—"}
                      </td>
                      <td style={{ padding: `${SP.sm}px ${SP.md}px`, fontFamily: MONO, fontWeight: W.sb, color: d.neto >= 0 ? C.green : C.red }}>
                        {d.ingreso > 0 || d.egresos > 0 ? (d.neto >= 0 ? "+" : "") + f(d.neto) : "—"}
                      </td>
                      <td style={{ padding: `${SP.sm}px ${SP.md}px`, fontFamily: MONO, color: d.acum >= 0 ? C.text : C.red, fontWeight: W.m }}>
                        {f(d.acum)}
                      </td>
                      <td style={{ padding: `${SP.sm}px ${SP.md}px`, color: C.tm, textAlign: "center", fontWeight: W.m }}>
                        {ventasInfo ? ventasInfo.facturas : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {vista === '30d' && (
        <Card C={C}>
          <Eyebrow C={C}>Top clientes · mes actual</Eyebrow>
          {(() => {
            const clientes = {};
            ventas.rows.filter(r => r.fecha.startsWith(mesAct)).forEach(r => {
              if (!clientes[r.razonSocial]) clientes[r.razonSocial] = { nombre: r.razonSocial, monto: 0, facturas: 0 };
              clientes[r.razonSocial].monto += r.montoReal;
              clientes[r.razonSocial].facturas += 1;
            });
            const top = Object.values(clientes).sort((a, b) => b.monto - a.monto).slice(0, 8);
            const totalTop = top.reduce((s, c) => s + c.monto, 0);
            if (top.length === 0) return (
              <div style={{ fontSize: S.sm, color: C.td, fontStyle: "italic" }}>
                Sin datos del mes actual
              </div>
            );
            return top.map((c, i) => {
              const pct = totalTop > 0 ? c.monto / totalTop : 0;
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: SP.md,
                    padding: `${SP.sm}px 0`,
                    borderBottom: i < top.length - 1 ? `1px solid ${C.border}` : "none",
                  }}
                >
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: R.sm,
                      background: C.accentD,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ fontSize: S.xxs, fontWeight: W.b, color: C.accent }}>{i + 1}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: S.base,
                        color: C.text,
                        fontWeight: W.m,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {c.nombre}
                    </div>
                    <div style={{ height: 3, background: C.surfaceAlt, borderRadius: 2, marginTop: 4 }}>
                      <div style={{ height: "100%", width: `${pct * 100}%`, background: C.accent, borderRadius: 2 }} />
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: S.base, fontWeight: W.sb, fontFamily: MONO, color: C.text }}>
                      {f(c.monto)}
                    </div>
                    <div style={{ fontSize: S.xxs, color: C.td, fontWeight: W.m }}>{c.facturas} doc.</div>
                  </div>
                </div>
              );
            });
          })()}
        </Card>
      )}

      {vista === '12m' && mejorMes && peorMes && (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: SP.md }}>
          <div style={{ ...tableContainerStyle(C), padding: `${SP.lg}px ${SP.lg}px`, border: `1px solid ${C.green}44` }}>
            <Eyebrow C={C}>Mejor mes</Eyebrow>
            <div
              style={{
                fontSize: S.base,
                fontWeight: W.sb,
                color: C.text,
                textTransform: "capitalize",
                marginBottom: SP.xs,
              }}
            >
              {mesLabelLargo(mejorMes.mes)}
            </div>
            <div style={{ fontSize: S.xl, fontWeight: W.b, fontFamily: MONO, color: C.green, letterSpacing: "-0.3px" }}>
              +{f(mejorMes.neto)}
            </div>
            <div style={{ fontSize: S.xs, color: C.td, marginTop: SP.xs, fontWeight: W.m }}>
              {f(mejorMes.ingreso)} ingreso · {f(mejorMes.egresos)} egreso
            </div>
          </div>
          <div style={{ ...tableContainerStyle(C), padding: `${SP.lg}px ${SP.lg}px`, border: `1px solid ${C.red}44` }}>
            <Eyebrow C={C}>Mes más ajustado</Eyebrow>
            <div
              style={{
                fontSize: S.base,
                fontWeight: W.sb,
                color: C.text,
                textTransform: "capitalize",
                marginBottom: SP.xs,
              }}
            >
              {mesLabelLargo(peorMes.mes)}
            </div>
            <div style={{ fontSize: S.xl, fontWeight: W.b, fontFamily: MONO, color: C.red, letterSpacing: "-0.3px" }}>
              {f(peorMes.neto)}
            </div>
            <div style={{ fontSize: S.xs, color: C.td, marginTop: SP.xs, fontWeight: W.m }}>
              {f(peorMes.ingreso)} ingreso · {f(peorMes.egresos)} egreso
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── INVERSIONES ─────────────────────────────────────────────────────────────
export function TabInversiones({ C, dap, hoy }) {
  const vigentes = dap.filter(d => d.vigente === "si" || d.vigente === "sí");
  const trab = vigentes.filter(d => clas(d.tipo) === 'trabajo');
  const inv = vigentes.filter(d => clas(d.tipo) === 'inversion');
  const cred = vigentes.filter(d => clas(d.tipo) === 'credito');
  const ganHist = dap.reduce((s, d) => s + d.ganancia, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: SP.lg }}>
      <div style={{ display: "flex", gap: SP.md, flexWrap: "wrap" }}>
        <Metric C={C} label="DAP trabajo" value={f(trab.reduce((s, d) => s + d.montoInicial, 0))} sub={`${trab.length} depósitos`} />
        <Metric C={C} label="DAP inversión" value={f(inv.reduce((s, d) => s + d.montoInicial, 0))} sub={`${inv.length} depósitos`} color={C.amber} />
        <Metric C={C} label="DAP crédito" value={f(cred.reduce((s, d) => s + d.montoInicial, 0))} sub={`${cred.length} depósitos`} color={C.cyan} />
        <Metric C={C} label="Ganancia activos" value={f(vigentes.reduce((s, d) => s + d.ganancia, 0))} sub="Intereses vigentes" color={C.green} />
        <Metric C={C} label="Ganancia histórica" value={f(ganHist)} sub="Desde 2022" color={C.green} />
      </div>

      <div style={tableContainerStyle(C)}>
        <div style={{ padding: `${SP.md}px ${SP.lg}px`, borderBottom: `1px solid ${C.borderL}` }}>
          <Eyebrow C={C} style={{ marginBottom: 0 }}>DAPs vigentes ({vigentes.length})</Eyebrow>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: S.base, minWidth: 900 }}>
            <thead>
              <tr>
                {["Tipo", "Banco", "Inicio", "Vence", "Días", "Tasa", "Monto", "Ganancia", "Para qué"].map(h => (
                  <th key={h} style={thStyle(C)}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vigentes.sort((a, b) => (a.vencimiento || "").localeCompare(b.vencimiento || "")).map((d, i) => {
                const dias = d.vencimiento ? dd(hoy, d.vencimiento) : 999;
                const tc = colorTipo(clas(d.tipo), C);
                return (
                  <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: `${SP.sm}px ${SP.md}px` }}>
                      <Pill bg={tc.bg} color={tc.color} C={C}>{d.tipo}</Pill>
                    </td>
                    <td style={{ padding: `${SP.sm}px ${SP.md}px`, color: C.tm, fontWeight: W.m }}>{d.banco}</td>
                    <td style={{ padding: `${SP.sm}px ${SP.md}px`, color: C.tm, fontWeight: W.m }}>{fd(d.fechaInicio)}</td>
                    <td
                      style={{
                        padding: `${SP.sm}px ${SP.md}px`,
                        color: dias <= 3 && dias >= 0 ? C.amber : C.text,
                        fontWeight: dias <= 3 && dias >= 0 ? W.sb : W.m,
                      }}
                    >
                      {fd(d.vencimiento)} {dias <= 3 && dias >= 0 ? `(${dias}d)` : ""}
                    </td>
                    <td style={{ padding: `${SP.sm}px ${SP.md}px`, color: C.tm, textAlign: "center", fontWeight: W.m }}>
                      {d.dias}
                    </td>
                    <td style={{ padding: `${SP.sm}px ${SP.md}px`, color: C.tm, fontWeight: W.m }}>
                      {d.tasa ? (d.tasa * 100).toFixed(2) + "%" : "—"}
                    </td>
                    <td style={{ padding: `${SP.sm}px ${SP.md}px`, fontFamily: MONO, color: C.text, fontWeight: W.sb }}>
                      {fS(d.montoInicial)}
                    </td>
                    <td style={{ padding: `${SP.sm}px ${SP.md}px`, fontFamily: MONO, color: C.green, fontWeight: W.sb }}>
                      +{fS(d.ganancia)}
                    </td>
                    <td
                      style={{
                        padding: `${SP.sm}px ${SP.md}px`,
                        color: C.td,
                        maxWidth: 220,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        fontWeight: W.m,
                      }}
                    >
                      {d.comentario}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── FFMM ────────────────────────────────────────────────────────────────────
export function TabFFMM({ C, ffmm, movimientos }) {
  const totalInv = ffmm.reduce((s, f) => s + f.invertido, 0);
  const totalAct = ffmm.reduce((s, f) => s + f.valorActual, 0);
  const totalRent = ffmm.reduce((s, f) => s + f.rentabilidad, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: SP.lg }}>
      <div style={{ display: "flex", gap: SP.md, flexWrap: "wrap" }}>
        <Metric C={C} label="Total invertido" value={f(totalInv)} sub={`${ffmm.length} fondos activos`} color={C.purple} />
        <Metric C={C} label="Valor actual" value={totalAct > 0 ? f(totalAct) : "Actualizar en hoja"} color={C.accent} />
        <Metric C={C} label="Rentabilidad" value={totalRent > 0 ? f(totalRent) : "—"}
          sub={totalRent > 0 && totalInv > 0 ? `${(totalRent / totalInv * 100).toFixed(2)}%` : undefined} color={C.green} />
      </div>

      <div style={tableContainerStyle(C)}>
        <div style={{ padding: `${SP.md}px ${SP.lg}px`, borderBottom: `1px solid ${C.borderL}` }}>
          <Eyebrow C={C} style={{ marginBottom: 0 }}>Saldos vigentes por fondo</Eyebrow>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: S.base, minWidth: 720 }}>
            <thead>
              <tr>
                {["Empresa", "Fondo", "Admin.", "Invertido", "Valor actual", "Rent.", "Rent. %"].map(h => (
                  <th key={h} style={thStyle(C)}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ffmm.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: SP.xl, textAlign: "center", color: C.td, fontSize: S.base }}>
                  Ingresa fondos mutuos en la hoja
                </td></tr>
              ) : ffmm.map((fm, i) => (
                <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                  <td style={{ padding: `${SP.sm}px ${SP.md}px`, color: C.text, fontWeight: W.m }}>{fm.empresa}</td>
                  <td style={{ padding: `${SP.sm}px ${SP.md}px`, color: C.text, fontWeight: W.m }}>{fm.fondo}</td>
                  <td style={{ padding: `${SP.sm}px ${SP.md}px` }}>
                    <Pill bg={C.purpleD} color={C.purple} C={C}>{fm.admin}</Pill>
                  </td>
                  <td style={{ padding: `${SP.sm}px ${SP.md}px`, fontFamily: MONO, color: C.text, fontWeight: W.m }}>
                    {fS(fm.invertido)}
                  </td>
                  <td style={{ padding: `${SP.sm}px ${SP.md}px`, fontFamily: MONO, color: C.accent, fontWeight: W.sb }}>
                    {fm.valorActual > 0 ? fS(fm.valorActual) : "—"}
                  </td>
                  <td style={{ padding: `${SP.sm}px ${SP.md}px`, fontFamily: MONO, color: C.green, fontWeight: W.sb }}>
                    {fm.rentabilidad > 0 ? `+${fS(fm.rentabilidad)}` : "—"}
                  </td>
                  <td style={{ padding: `${SP.sm}px ${SP.md}px`, color: C.green, fontWeight: W.sb }}>
                    {fm.rentabilidad > 0 && fm.invertido > 0 ? `${(fm.rentabilidad / fm.invertido * 100).toFixed(2)}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {movimientos.length > 0 && (
        <div style={tableContainerStyle(C)}>
          <div style={{ padding: `${SP.md}px ${SP.lg}px`, borderBottom: `1px solid ${C.borderL}` }}>
            <Eyebrow C={C} style={{ marginBottom: 0 }}>Historial de movimientos</Eyebrow>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: S.base, minWidth: 620 }}>
              <thead>
                <tr>
                  {["Fecha", "Empresa", "Fondo", "Tipo", "Monto"].map(h => (
                    <th key={h} style={thStyle(C)}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {movimientos.map((m, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: `${SP.sm}px ${SP.md}px`, color: C.tm, fontWeight: W.m }}>{fd(m.fecha)}</td>
                    <td style={{ padding: `${SP.sm}px ${SP.md}px`, color: C.text, fontWeight: W.m }}>{m.empresa}</td>
                    <td style={{ padding: `${SP.sm}px ${SP.md}px`, color: C.text, fontWeight: W.m }}>{m.fondo}</td>
                    <td style={{ padding: `${SP.sm}px ${SP.md}px` }}>
                      <Pill
                        bg={m.tipo === "Aporte" ? C.greenD : C.redD}
                        color={m.tipo === "Aporte" ? C.green : C.red}
                        C={C}
                      >
                        {m.tipo}
                      </Pill>
                    </td>
                    <td style={{ padding: `${SP.sm}px ${SP.md}px`, fontFamily: MONO, color: C.text, fontWeight: W.sb }}>
                      {fS(m.monto)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── LEASING ─────────────────────────────────────────────────────────────────
export function TabLeasing({ C, leasingDetalle, leasingResumen, isMobile, hoy }) {
  const totalDeudaUF = leasingDetalle.reduce((s, d) => s + d.deudaUF, 0);
  const totalCuotaCLP = leasingDetalle.reduce((s, d) => s + d.cuotaCLPcIVA, 0);
  const totalTractos = leasingDetalle.reduce((s, d) => s + d.nTractos, 0);
  const totalCuotasPorPagar = leasingDetalle.reduce((s, d) => s + d.cuotasPorPagar, 0);

  const proximas = leasingResumen.slice(0, 3);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: SP.lg }}>
      <div style={{ display: "flex", gap: SP.md, flexWrap: "wrap" }}>
        <Metric C={C} label="Deuda total (UF)" value={fUF(totalDeudaUF)} sub={`${leasingDetalle.length} contratos activos`} color={C.teal} />
        <Metric C={C} label="Tractos en leasing" value={totalTractos} sub="Unidades comprometidas" color={C.teal} />
        <Metric C={C} label="Cuota mensual total" value={f(totalCuotaCLP)} sub="Con IVA · todos los bancos" color={C.amber} />
        <Metric C={C} label="Cuotas por pagar" value={totalCuotasPorPagar} sub="Suma contratos activos" color={C.td} />
      </div>

      {proximas.length > 0 && (
        <Card C={C}>
          <Eyebrow C={C}>Próximas cuotas a pagar</Eyebrow>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(220px, 1fr))",
              gap: SP.md,
            }}
          >
            {proximas.map((r, i) => {
              const bciTotal = (r.bciDia5 || 0) + (r.bciDia15 || 0);
              const esUrgente = i === 0;
              return (
                <div
                  key={i}
                  style={{
                    padding: `${SP.md}px ${SP.lg}px`,
                    borderRadius: R.md,
                    background: esUrgente ? C.amberD : C.surfaceAlt,
                    border: `1px solid ${esUrgente ? C.amber + "55" : C.border}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: SP.xs,
                    }}
                  >
                    <div style={{ fontSize: S.base, fontWeight: W.sb, color: C.text, textTransform: "capitalize" }}>
                      {r.mes} {r.anio}
                    </div>
                    {esUrgente && <Pill bg={C.amber + "33"} color={C.amberT} C={C}>Próxima</Pill>}
                  </div>
                  <div
                    style={{
                      fontSize: S.xl2,
                      fontWeight: W.b,
                      color: esUrgente ? C.amberT : C.text,
                      fontFamily: MONO,
                      marginBottom: SP.xs,
                      letterSpacing: "-0.3px",
                    }}
                  >
                    {f(r.cuotaCLPcIVA)}
                  </div>
                  <div style={{ fontSize: S.xs, color: C.td, fontWeight: W.m }}>
                    s/IVA: {f(r.cuotaCLPsIVA)}
                  </div>
                  <div style={{ marginTop: SP.sm, display: "flex", gap: SP.xs, flexWrap: "wrap" }}>
                    {bciTotal > 0 && <Pill bg={C.accentD} color={C.accent} C={C}>BCI {fUF(bciTotal)} UF</Pill>}
                    {r.vfsVolvo > 0 && <Pill bg={C.amberD} color={C.amber} C={C}>VFS {fUF(r.vfsVolvo)} UF</Pill>}
                    {r.bancoChile > 0 && <Pill bg={C.tealD} color={C.teal} C={C}>BancoChile {fUF(r.bancoChile)} UF</Pill>}
                  </div>
                  {r.contratosActivos > 0 && (
                    <div style={{ marginTop: SP.sm, fontSize: S.xs, color: C.td, fontWeight: W.m }}>
                      {r.contratosActivos} contratos activos
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div style={tableContainerStyle(C)}>
        <div style={{ padding: `${SP.md}px ${SP.lg}px`, borderBottom: `1px solid ${C.borderL}` }}>
          <Eyebrow C={C} style={{ marginBottom: 0 }}>
            Contratos activos ({leasingDetalle.length})
          </Eyebrow>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: S.base, minWidth: 760 }}>
            <thead>
              <tr>
                {["Banco", "Tractos", "Cuota c/IVA", "Cuotas x Pagar", "Vencimiento", "Deuda UF"].map(h => (
                  <th key={h} style={thStyle(C)}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leasingDetalle.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: SP.xl, textAlign: "center", color: C.td, fontSize: S.base }}>
                  Sin contratos activos
                </td></tr>
              ) : leasingDetalle.map((d, i) => {
                const tc = colorBanco(d.banco, C);
                const diasFin = d.fechaFin ? dd(hoy, d.fechaFin) : 9999;
                const venceProx = diasFin <= 60 && diasFin >= 0;
                return (
                  <tr
                    key={i}
                    style={{
                      borderTop: `1px solid ${C.border}`,
                      background: i % 2 === 0 ? "transparent" : C.surfaceAlt + "55",
                    }}
                  >
                    <td style={{ padding: `${SP.sm}px ${SP.md}px` }}>
                      <Pill bg={tc.bg} color={tc.color} C={C}>{d.banco}</Pill>
                    </td>
                    <td style={{ padding: `${SP.sm}px ${SP.md}px`, color: C.text, fontWeight: W.sb, textAlign: "center" }}>
                      {d.nTractos}
                    </td>
                    <td style={{ padding: `${SP.sm}px ${SP.md}px`, fontFamily: MONO, color: C.text, fontWeight: W.sb }}>
                      {fS(d.cuotaCLPcIVA)}
                    </td>
                    <td style={{ padding: `${SP.sm}px ${SP.md}px`, color: C.text, textAlign: "center", fontWeight: W.m }}>
                      {d.cuotasPorPagar}
                    </td>
                    <td
                      style={{
                        padding: `${SP.sm}px ${SP.md}px`,
                        color: venceProx ? C.amber : C.text,
                        fontWeight: venceProx ? W.sb : W.m,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {fd(d.fechaFin)}{venceProx ? ` (${diasFin}d)` : ""}
                    </td>
                    <td style={{ padding: `${SP.sm}px ${SP.md}px`, fontFamily: MONO, color: C.teal, fontWeight: W.sb }}>
                      {fUF(d.deudaUF)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {leasingDetalle.length > 1 && (
              <tfoot>
                <tr style={{ borderTop: `1px solid ${C.borderL}`, background: C.surfaceAlt }}>
                  <td style={{ padding: `${SP.sm}px ${SP.md}px`, fontWeight: W.b, color: C.text, fontSize: S.xs, textTransform: "uppercase", letterSpacing: "0.6px" }}>
                    Total
                  </td>
                  <td style={{ padding: `${SP.sm}px ${SP.md}px`, fontWeight: W.sb, color: C.text, textAlign: "center" }}>
                    {totalTractos}
                  </td>
                  <td style={{ padding: `${SP.sm}px ${SP.md}px`, fontFamily: MONO, fontWeight: W.b, color: C.amber }}>
                    {fS(totalCuotaCLP)}
                  </td>
                  <td style={{ padding: `${SP.sm}px ${SP.md}px`, fontWeight: W.sb, color: C.text, textAlign: "center" }}>
                    {totalCuotasPorPagar}
                  </td>
                  <td style={{ padding: `${SP.sm}px ${SP.md}px` }}></td>
                  <td style={{ padding: `${SP.sm}px ${SP.md}px`, fontFamily: MONO, fontWeight: W.b, color: C.teal }}>
                    {fUF(totalDeudaUF)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {leasingResumen.length > 0 && (
        <div style={tableContainerStyle(C)}>
          <div style={{ padding: `${SP.md}px ${SP.lg}px`, borderBottom: `1px solid ${C.borderL}` }}>
            <Eyebrow C={C} style={{ marginBottom: 0 }}>Proyección mensual de cuotas</Eyebrow>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: S.base, minWidth: 720 }}>
              <thead>
                <tr>
                  {["Mes", "Cuota c/IVA", "BCI", "VFS Volvo", "Banco Chile", "Contratos", "Vence"].map(h => (
                    <th key={h} style={thStyle(C)}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leasingResumen.map((r, i) => {
                  const bciTotal = (r.bciDia5 || 0) + (r.bciDia15 || 0);
                  const esActual = i === 0;
                  return (
                    <tr key={i} style={{ borderTop: `1px solid ${C.border}`, background: esActual ? C.tealD : "transparent" }}>
                      <td
                        style={{
                          padding: `${SP.sm}px ${SP.md}px`,
                          fontWeight: esActual ? W.sb : W.m,
                          color: C.text,
                          whiteSpace: "nowrap",
                          textTransform: "capitalize",
                        }}
                      >
                        {r.mes} {r.anio}
                      </td>
                      <td
                        style={{
                          padding: `${SP.sm}px ${SP.md}px`,
                          fontFamily: MONO,
                          fontWeight: esActual ? W.b : W.sb,
                          color: esActual ? C.teal : C.text,
                        }}
                      >
                        {fS(r.cuotaCLPcIVA)}
                      </td>
                      <td style={{ padding: `${SP.sm}px ${SP.md}px`, fontFamily: MONO, color: C.accent, fontWeight: W.m }}>
                        {bciTotal > 0 ? fUF(bciTotal) : "—"}
                      </td>
                      <td style={{ padding: `${SP.sm}px ${SP.md}px`, fontFamily: MONO, color: C.amber, fontWeight: W.m }}>
                        {r.vfsVolvo > 0 ? fUF(r.vfsVolvo) : "—"}
                      </td>
                      <td style={{ padding: `${SP.sm}px ${SP.md}px`, fontFamily: MONO, color: C.teal, fontWeight: W.m }}>
                        {r.bancoChile > 0 ? fUF(r.bancoChile) : "—"}
                      </td>
                      <td style={{ padding: `${SP.sm}px ${SP.md}px`, color: C.tm, textAlign: "center", fontWeight: W.m }}>
                        {r.contratosActivos || "—"}
                      </td>
                      <td style={{ padding: `${SP.sm}px ${SP.md}px`, color: r.vesteEstesMes ? C.amber : C.td, fontSize: S.xs, fontWeight: W.m }}>
                        {r.vesteEstesMes || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CRÉDITO ─────────────────────────────────────────────────────────────────
export function TabCredito({ C, credito, creditoPendiente, saldoInsoluto, isMobile, hoy }) {
  const totalCuotas = credito.length;
  const pagadas = credito.filter(c => c.fechaVenc < hoy).length;
  const totalIntereses = credito.reduce((s, c) => s + c.interes, 0);
  const interesesPend = creditoPendiente.reduce((s, c) => s + c.interes, 0);
  const cuotaMensual = creditoPendiente.length > 0 ? creditoPendiente[0].valorCuota : 0;
  const proxima = creditoPendiente[0] || null;
  const segunda = creditoPendiente[1] || null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: SP.lg }}>
      <div style={{ display: "flex", gap: SP.md, flexWrap: "wrap" }}>
        <Metric C={C} label="Total a pagar" value={f(saldoInsoluto)} sub="Capital + intereses futuros" color={C.red} />
        <Metric C={C} label="Cuotas pendientes" value={creditoPendiente.length}
          sub={`de ${totalCuotas} totales · pagadas: ${pagadas}`} color={C.amber} />
        <Metric C={C} label="Cuota mensual" value={f(cuotaMensual)} sub="Capital + interés" color={C.text} />
        <Metric C={C} label="Intereses pendientes" value={f(interesesPend)} sub={`Total histórico: ${f(totalIntereses)}`} color={C.td} />
      </div>

      {(proxima || segunda) && (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: SP.md }}>
          {[proxima, segunda].filter(Boolean).map((c, i) => {
            const dias = c.fechaVenc >= hoy ? Math.ceil((new Date(c.fechaVenc) - new Date(hoy)) / 864e5) : 0;
            const esUrgente = dias <= 5 && dias >= 0;
            return (
              <div
                key={i}
                style={{
                  background: C.surface,
                  borderRadius: R.lg,
                  padding: `${SP.lg}px ${SP.lg}px`,
                  border: `1px solid ${esUrgente ? C.amber + "66" : C.border}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: SP.xs }}>
                  <span style={{ fontSize: S.sm, fontWeight: W.sb, color: C.text }}>Cuota {c.nCuota}</span>
                  {esUrgente && <Pill bg={C.amberD} color={C.amberT} C={C}>En {dias}d</Pill>}
                </div>
                <div
                  style={{
                    fontSize: S.xl2,
                    fontWeight: W.b,
                    fontFamily: MONO,
                    color: esUrgente ? C.amberT : C.text,
                    marginBottom: SP.xs,
                    letterSpacing: "-0.3px",
                  }}
                >
                  {f(c.valorCuota)}
                </div>
                <div style={{ fontSize: S.xs, color: C.td, fontWeight: W.m }}>Vence: {fdf(c.fechaVenc)}</div>
                <div style={{ display: "flex", gap: SP.lg, marginTop: SP.md, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: S.xxs, color: C.tm, fontWeight: W.sb, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Capital
                    </div>
                    <div style={{ fontSize: S.sm, fontFamily: MONO, color: C.text, fontWeight: W.sb, marginTop: 2 }}>
                      {f(c.amortizacion)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: S.xxs, color: C.tm, fontWeight: W.sb, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Interés
                    </div>
                    <div style={{ fontSize: S.sm, fontFamily: MONO, color: C.amber, fontWeight: W.sb, marginTop: 2 }}>
                      {f(c.interes)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: S.xxs, color: C.tm, fontWeight: W.sb, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Saldo tras pago
                    </div>
                    <div style={{ fontSize: S.sm, fontFamily: MONO, color: C.td, fontWeight: W.sb, marginTop: 2 }}>
                      {f(c.saldoInsoluto)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={tableContainerStyle(C)}>
        <div style={{ padding: `${SP.md}px ${SP.lg}px`, borderBottom: `1px solid ${C.borderL}` }}>
          <Eyebrow C={C} style={{ marginBottom: 0 }}>
            Tabla de amortización · {totalCuotas} cuotas
          </Eyebrow>
        </div>
        <div style={{ overflowX: "auto", maxHeight: 520, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: S.base, minWidth: 620 }}>
            <thead style={{ position: "sticky", top: 0, background: C.surface, zIndex: 1 }}>
              <tr>
                {["N°", "Vencimiento", "Capital", "Interés", "Cuota", "Saldo Insoluto"].map(h => (
                  <th key={h} style={{ ...thStyle(C), borderBottom: `1px solid ${C.borderL}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {credito.map((c, i) => {
                const pasada = c.fechaVenc < hoy;
                const esHoy = c.fechaVenc === hoy;
                return (
                  <tr
                    key={i}
                    style={{
                      borderTop: `1px solid ${C.border}`,
                      opacity: pasada ? 0.5 : 1,
                      background: esHoy ? C.amberD : "transparent",
                    }}
                  >
                    <td style={{ padding: `${SP.sm}px ${SP.md}px`, color: C.tm, fontWeight: W.sb }}>{c.nCuota}</td>
                    <td
                      style={{
                        padding: `${SP.sm}px ${SP.md}px`,
                        color: pasada ? C.td : C.text,
                        whiteSpace: "nowrap",
                        fontWeight: W.m,
                      }}
                    >
                      {fdf(c.fechaVenc)}
                    </td>
                    <td style={{ padding: `${SP.sm}px ${SP.md}px`, fontFamily: MONO, color: C.text, fontWeight: W.m }}>
                      {c.amortizacion > 0 ? f(c.amortizacion) : "—"}
                    </td>
                    <td style={{ padding: `${SP.sm}px ${SP.md}px`, fontFamily: MONO, color: C.amber, fontWeight: W.m }}>
                      {c.interes > 0 ? f(c.interes) : "—"}
                    </td>
                    <td style={{ padding: `${SP.sm}px ${SP.md}px`, fontFamily: MONO, fontWeight: W.sb, color: pasada ? C.td : C.text }}>
                      {c.valorCuota > 0 ? f(c.valorCuota) : "—"}
                    </td>
                    <td style={{ padding: `${SP.sm}px ${SP.md}px`, fontFamily: MONO, color: C.teal, fontWeight: W.m }}>
                      {f(c.saldoInsoluto)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── ALERTAS ─────────────────────────────────────────────────────────────────
export function TabAlertas({ C, alertas }) {
  const colorConfig = (tipo) => {
    if (tipo === "urgente") return { bg: C.redD, border: C.red + "55", badgeBg: C.red, badgeText: "#fff", label: "Urgente", labelColor: C.red };
    if (tipo === "atencion") return { bg: C.amberD, border: C.amber + "55", badgeBg: C.amber, badgeText: "#000", label: "Atención", labelColor: C.amberT };
    return { bg: C.accentD, border: C.accent + "55", badgeBg: C.accent, badgeText: "#fff", label: "Info", labelColor: C.accent };
  };

  const urgentes = alertas.filter(a => a.tipo === "urgente");
  const atenciones = alertas.filter(a => a.tipo === "atencion");
  const infos = alertas.filter(a => a.tipo === "info");

  if (alertas.length === 0) return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: `${SP.xl3 * 2}px ${SP.xl}px`,
        gap: SP.md,
      }}
    >
      <div style={{ fontSize: 36 }}>✅</div>
      <div style={{ fontSize: S.lg, fontWeight: W.sb, color: C.text, letterSpacing: "-0.2px" }}>
        Sin alertas activas
      </div>
      <div style={{ fontSize: S.base, color: C.td, fontWeight: W.m }}>
        Todos los vencimientos están bajo control esta semana
      </div>
    </div>
  );

  const StatCard = ({ n, label, color, bg, border }) => (
    <div
      style={{
        padding: `${SP.md}px ${SP.lg}px`,
        borderRadius: R.md,
        background: bg,
        border: `1px solid ${border}`,
        display: "flex",
        alignItems: "center",
        gap: SP.sm,
      }}
    >
      <span style={{ fontSize: S.xl2, fontWeight: W.b, color: color, fontFamily: MONO }}>{n}</span>
      <span
        style={{
          fontSize: S.sm,
          color: color,
          fontWeight: W.sb,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        {label}
      </span>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: SP.lg }}>
      <div style={{ display: "flex", gap: SP.md, flexWrap: "wrap" }}>
        {urgentes.length > 0 && (
          <StatCard
            n={urgentes.length}
            label={`Urgente${urgentes.length !== 1 ? "s" : ""}`}
            color={C.red}
            bg={C.redD}
            border={C.red + "55"}
          />
        )}
        {atenciones.length > 0 && (
          <StatCard
            n={atenciones.length}
            label={`Atenci${atenciones.length !== 1 ? "ones" : "ón"}`}
            color={C.amberT}
            bg={C.amberD}
            border={C.amber + "55"}
          />
        )}
        {infos.length > 0 && (
          <StatCard
            n={infos.length}
            label={`Info${infos.length !== 1 ? "s" : ""}`}
            color={C.accent}
            bg={C.accentD}
            border={C.accent + "55"}
          />
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: SP.sm }}>
        {alertas.map((a, i) => {
          const col = colorConfig(a.tipo);
          return (
            <div
              key={i}
              style={{
                background: col.bg,
                border: `1px solid ${col.border}`,
                borderRadius: R.lg,
                padding: `${SP.md}px ${SP.lg}px`,
                display: "flex",
                gap: SP.md,
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: R.md,
                  background: col.badgeBg + "22",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: S.xl,
                }}
              >
                {a.icono}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: SP.sm, marginBottom: SP.xs, flexWrap: "wrap" }}>
                  <span
                    style={{
                      fontSize: S.xxs,
                      fontWeight: W.b,
                      padding: `2px ${SP.sm}px`,
                      borderRadius: R.sm,
                      background: col.badgeBg,
                      color: col.badgeText,
                      letterSpacing: "0.6px",
                      textTransform: "uppercase",
                    }}
                  >
                    {col.label}
                  </span>
                  <span style={{ fontSize: S.md, fontWeight: W.sb, color: C.text, letterSpacing: "-0.2px" }}>
                    {a.titulo}
                  </span>
                </div>
                <div style={{ fontSize: S.base, color: C.tm, fontWeight: W.m, lineHeight: 1.5 }}>
                  {a.mensaje}
                </div>
                {a.fecha && (
                  <div style={{ fontSize: S.xs, color: C.td, marginTop: SP.xs, fontWeight: W.m }}>
                    {new Date(a.fecha + "T12:00:00").toLocaleDateString("es-CL", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                )}
              </div>
              <div style={{ flexShrink: 0, textAlign: "right" }}>
                <div
                  style={{
                    fontSize: S.xl2,
                    fontWeight: W.b,
                    color: col.labelColor,
                    lineHeight: 1,
                    fontFamily: MONO,
                  }}
                >
                  {a.dias}
                </div>
                <div style={{ fontSize: S.xxs, color: C.td, fontWeight: W.sb, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  días
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── CALCULADORA ─────────────────────────────────────────────────────────────
export function TabCalc({ C, isMobile }) {
  const [lines, setLines] = useState([""]);
  const [history, setHistory] = useState([]);

  const evalExpr = (input) => {
    if (!input || !input.trim()) return null;
    let s = input.replace(/\$/g, "").replace(/\s/g, "").toUpperCase();
    s = s.replace(/(\d[\d.,]*)(MM|M)?/gi, (_m, num, suffix) => {
      const clean = num.replace(/\./g, "").replace(/,/g, ".");
      const n = parseFloat(clean);
      if (isNaN(n)) return "NaN";
      if (suffix) {
        const su = suffix.toUpperCase();
        if (su === "MM") return String(n * 1e9);
        if (su === "M") return String(n * 1e6);
      }
      return String(n);
    });
    if (!/^[0-9.+\-*/() eE]+$/.test(s)) return null;
    try {
      const result = new Function("return (" + s + ")")();
      if (typeof result === "number" && isFinite(result)) return result;
      return null;
    } catch (e) { return null; }
  };

  const vals = lines.map(l => evalExpr(l.trim()));
  const total = vals.reduce((s, v) => s + (v || 0), 0);
  const has = vals.some(v => v !== null);

  const add = () => setLines([...lines, ""]);
  const upd = (i, v) => { const n = [...lines]; n[i] = v; setLines(n); };
  const rem = (i) => {
    if (lines.length === 1) { setLines([""]); return; }
    setLines(lines.filter((_, x) => x !== i));
  };
  const clear = () => {
    if (has) setHistory([{
      lines: lines.filter(l => l.trim()),
      total,
      ts: new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }),
    }, ...history.slice(0, 4)]);
    setLines([""]);
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 280px",
        gap: SP.md,
      }}
    >
      <Card C={C}>
        <Eyebrow C={C} style={{ marginBottom: SP.xs }}>Calculadora rápida</Eyebrow>
        <div style={{ fontSize: S.xs, color: C.td, marginBottom: SP.md, fontWeight: W.m, lineHeight: 1.5 }}>
          Soporta +, −, ×, ÷ · "M" = millones · "MM" = miles de millones (entrada) · Ej: 500M+300M
        </div>
        {lines.map((l, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: SP.sm, marginBottom: SP.sm }}>
            <input
              type="text"
              value={l}
              onChange={e => upd(i, e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") add(); }}
              placeholder={i === 0 ? "Ej: 500M+300M" : ""}
              inputMode="decimal"
              style={{
                flex: 1,
                padding: `${SP.sm}px ${SP.md}px`,
                borderRadius: R.md,
                fontSize: S.lg,
                background: C.surfaceAlt,
                color: C.text,
                border: `1px solid ${C.border}`,
                fontFamily: MONO,
                outline: "none",
                fontWeight: W.m,
              }}
            />
            <span
              style={{
                fontSize: S.base,
                fontFamily: MONO,
                fontWeight: W.sb,
                color: vals[i] != null ? (vals[i] >= 0 ? C.green : C.red) : C.td,
                minWidth: 100,
                textAlign: "right",
              }}
            >
              {vals[i] != null ? fS(vals[i]) : ""}
            </span>
            {lines.length > 1 && (
              <button
                onClick={() => rem(i)}
                style={{
                  background: "none",
                  border: "none",
                  color: C.td,
                  cursor: "pointer",
                  fontSize: S.xl,
                  padding: `0 ${SP.xs}px`,
                }}
              >
                ×
              </button>
            )}
          </div>
        ))}
        <div style={{ display: "flex", gap: SP.sm, marginTop: SP.md }}>
          <button
            onClick={add}
            style={{
              padding: `${SP.sm}px ${SP.md}px`,
              borderRadius: R.md,
              fontSize: S.sm,
              fontWeight: W.sb,
              background: C.surfaceAlt,
              color: C.tm,
              border: `1px solid ${C.border}`,
              cursor: "pointer",
            }}
          >
            + Línea
          </button>
          <button
            onClick={clear}
            style={{
              padding: `${SP.sm}px ${SP.md}px`,
              borderRadius: R.md,
              fontSize: S.sm,
              fontWeight: W.sb,
              background: C.surfaceAlt,
              color: C.tm,
              border: `1px solid ${C.border}`,
              cursor: "pointer",
            }}
          >
            Limpiar
          </button>
        </div>
        {has && (
          <div
            style={{
              marginTop: SP.lg,
              padding: `${SP.md}px ${SP.lg}px`,
              borderRadius: R.md,
              background: total >= 0 ? C.greenD : C.redD,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: S.xs,
                color: C.tm,
                textTransform: "uppercase",
                fontWeight: W.sb,
                letterSpacing: "0.6px",
              }}
            >
              Total
            </span>
            <span
              style={{
                fontSize: S.xl2,
                fontWeight: W.sb,
                fontFamily: MONO,
                color: total >= 0 ? C.green : C.red,
                letterSpacing: "-0.3px",
              }}
            >
              {f(total)}
            </span>
          </div>
        )}
      </Card>
      <Card C={C}>
        <Eyebrow C={C}>Historial</Eyebrow>
        {history.length === 0 ? (
          <div style={{ fontSize: S.sm, color: C.td, fontStyle: "italic" }}>Aparecerá al limpiar</div>
        ) : history.map((h, i) => (
          <div
            key={i}
            style={{
              padding: `${SP.sm}px 0`,
              borderBottom: i < history.length - 1 ? `1px solid ${C.border}` : "none",
            }}
          >
            <div style={{ fontSize: S.xxs, color: C.td, fontWeight: W.m }}>{h.ts}</div>
            <div style={{ fontSize: S.sm, color: C.tm, fontWeight: W.m, marginTop: 2 }}>{h.lines.join(" | ")}</div>
            <div
              style={{
                fontSize: S.md,
                fontWeight: W.sb,
                fontFamily: MONO,
                color: h.total >= 0 ? C.green : C.red,
                marginTop: 2,
              }}
            >
              {f(h.total)}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
