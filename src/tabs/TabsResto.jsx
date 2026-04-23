import { useState } from 'react';
import {
  f, fS, fd, fdf, dd, fUF, clas, colorTipo, colorBanco,
  mesLabel, mesLabelLargo,
} from '../utils/format.js';
import { Metric } from '../components/common.jsx';
import Proyeccion90d from '../components/Proyeccion90d.jsx';

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
    <div>
      {Object.entries(meses).sort(([a], [b]) => a.localeCompare(b)).map(([mes, items]) => {
        const comp = items.reduce((s, c) => s + c.monto, 0);
        const guar = items.reduce((s, c) => s + c.guardado, 0);
        const pct = comp > 0 ? Math.min(guar / comp, 1) : 0;
        const label = new Date(mes + "-15").toLocaleDateString("es-CL", { month: "long", year: "numeric" });

        return (
          <div key={mes} style={{ marginBottom: 16 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              marginBottom: 8, flexWrap: "wrap",
            }}>
              <div style={{
                fontSize: 14, fontWeight: 600, color: C.text,
                textTransform: "capitalize", minWidth: 110,
              }}>{label}</div>
              <div style={{
                flex: 1, minWidth: 100, height: 6,
                background: C.surfaceAlt, borderRadius: 3,
              }}>
                <div style={{
                  width: `${pct * 100}%`, height: "100%", borderRadius: 3,
                  background: pct >= 0.9 ? C.green : pct >= 0.5 ? C.amber : C.red,
                }}/>
              </div>
              <div style={{ fontSize: 12, color: C.tm, minWidth: 40, textAlign: "right" }}>
                {Math.round(pct * 100)}%
              </div>
              {!isMobile && (
                <div style={{ fontSize: 12, color: C.td }}>{f(guar)} / {f(comp)}</div>
              )}
            </div>

            <div style={{
              background: C.surface, borderRadius: 10,
              border: `0.5px solid ${C.border}`, overflow: "hidden",
            }}>
              {items.map((c, i) => {
                const ok = c.falta === 0;
                const past = c.fecha < hoy;
                const today = c.fecha === hoy;
                return (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: isMobile ? "10px 12px" : "10px 14px",
                    borderBottom: i < items.length - 1 ? `0.5px solid ${C.border}` : "none",
                    opacity: past ? 0.5 : 1,
                    background: today ? C.accentD : "transparent",
                  }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: "50%",
                      border: `2px solid ${ok ? C.green : C.amber}`,
                      background: ok ? C.green : "transparent",
                      flexShrink: 0,
                    }}/>
                    <div style={{ minWidth: 46, fontSize: 11, color: C.tm }}>{fd(c.fecha)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, color: C.text,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>{c.concepto}</div>
                      {c.comentario && !isMobile && (
                        <div style={{ fontSize: 11, color: C.td }}>{c.comentario}</div>
                      )}
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 500,
                        fontFamily: "monospace",
                        color: ok ? C.green : C.text,
                      }}>{fS(c.monto)}</div>
                      {c.falta > 0 && (
                        <div style={{ fontSize: 10, color: C.red }}>Falta: {fS(c.falta)}</div>
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

  // Usamos neto (sin IVA) para mantener coherencia con los egresos que
  // tambien estan en valores sin IVA (cuotaLeasing s/IVA, calendario, credito).
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
    const W = 860, H = 220, padL = 10, padR = 10, padT = 20, padB = 36;
    const chartW = W - padL - padR, chartH = H - padT - padB;
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
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
        {[0.25, 0.5, 0.75, 1].map(p => (
          <line key={p} x1={padL} y1={padT + chartH * (1 - p)} x2={W - padR} y2={padT + chartH * (1 - p)}
            stroke={C.border} strokeWidth="0.5" strokeDasharray="3,3"/>
        ))}
        {minAcum < 0 && (
          <line x1={padL} y1={padT + scaleAcum(0)} x2={W - padR} y2={padT + scaleAcum(0)}
            stroke={C.td} strokeWidth="0.5" strokeDasharray="4,2"/>
        )}
        {data12conAcum.map((d, i) => {
          const x = padL + i * barW + bPad;
          const esAct = d.mes === mesAct;
          const hIng = chartH * (d.ingreso / maxVal);
          const hEgr = chartH * (d.egresos / maxVal);
          return (
            <g key={i}>
              {esAct && <rect x={padL + i * barW} y={padT} width={barW} height={chartH} fill={C.accentD} rx={2}/>}
              <rect x={x} y={padT + chartH - hIng} width={bW} height={hIng} fill={C.green} opacity={0.75} rx={2}/>
              <rect x={x + bW + 1} y={padT + chartH - hEgr} width={bW} height={hEgr} fill={C.red} opacity={0.65} rx={2}/>
              <text x={padL + i * barW + barW / 2} y={H - 6} textAnchor="middle"
                fontSize="8.5" fill={esAct ? C.accent : C.td}>
                {mesLabel(d.mes)}
              </text>
            </g>
          );
        })}
        <polyline points={puntos} fill="none" stroke={C.amber} strokeWidth="1.5" strokeLinejoin="round"/>
        {data12conAcum.map((d, i) => {
          const cx = padL + i * barW + barW / 2;
          const cy = padT + scaleAcum(d.acum);
          return <circle key={i} cx={cx} cy={cy} r={2.5} fill={C.amber}/>;
        })}
      </svg>
    );
  }

  function Grafico30d() {
    const W = 860, H = 200, padL = 10, padR = 10, padT = 16, padB = 32;
    const chartW = W - padL - padR, chartH = H - padT - padB;
    const maxVal = Math.max(...data30.map(d => Math.max(d.ingreso, d.egresos)), 1);
    const barW = Math.floor(chartW / data30.length);
    const gap = 2;
    const bW = Math.max(barW - gap, 3);

    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
        {[0.5, 1].map(p => (
          <line key={p} x1={padL} y1={padT + chartH * (1 - p)} x2={W - padR} y2={padT + chartH * (1 - p)}
            stroke={C.border} strokeWidth="0.5" strokeDasharray="3,3"/>
        ))}
        {data30.map((d, i) => {
          const x = padL + i * barW + gap / 2;
          const hIng = chartH * (d.ingreso / maxVal);
          const hEgr = chartH * (d.egresos / maxVal);
          const dNum = parseInt(d.fecha.split('-')[2], 10);
          const showLabel = dNum === 1 || dNum % 5 === 0 || d.esHoy;
          return (
            <g key={i}>
              {d.esHoy && <rect x={padL + i * barW} y={padT} width={barW} height={chartH} fill={C.accentD}/>}
              {d.esPasado && d.ingreso > 0 &&
                <rect x={x} y={padT + chartH - hIng} width={bW} height={hIng} fill={C.green} opacity={0.5} rx={1}/>}
              {!d.esPasado && d.egresos > 0 &&
                <rect x={x} y={padT + chartH - hEgr} width={bW} height={hEgr} fill={C.red} opacity={0.55} rx={1}/>}
              {!d.esPasado && d.ingreso > 0 &&
                <rect x={x} y={padT + chartH - hIng} width={bW} height={hIng} fill={C.green} opacity={0.75} rx={1}/>}
              {showLabel && (
                <text x={x + bW / 2} y={H - 4} textAnchor="middle"
                  fontSize="8" fill={d.esHoy ? C.accent : C.td}>
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
    <div>
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

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <Metric C={C} label={`Ingresos ${new Date(mesAct + "-15").toLocaleDateString("es-CL", { month: "long" })}`}
          value={ingresoMesAct > 0 ? f(ingresoMesAct) : "Sin datos"} sub="Neto facturado" color={C.green}/>
        <Metric C={C} label="Egresos comprometidos"
          value={f(egresoMesAct)} sub="Cal + leasing s/IVA + crédito" color={C.red}/>
        <Metric C={C} label="Resultado neto"
          value={f(netoMesAct)} sub="Ingreso − egreso" color={netoMesAct >= 0 ? C.green : C.red}/>
        <Metric C={C} label="Promedio ingreso/mes"
          value={f(promedioIngMensual)} sub="Neto · meses con ventas (hasta 14m)" color={C.accent}/>
      </div>

      <div style={{
        display: "flex", gap: 0, marginBottom: 14,
        background: C.surfaceAlt, borderRadius: 8, padding: 3,
        width: "fit-content", border: `0.5px solid ${C.border}`,
      }}>
        {[['30d', 'Detalle 30 días'], ['12m', 'Resumen 12 meses']].map(([k, label]) => (
          <button key={k} onClick={() => setVista(k)} style={{
            padding: "6px 16px", borderRadius: 6, fontSize: 12,
            fontWeight: vista === k ? 600 : 400,
            background: vista === k ? C.accent : "transparent",
            color: vista === k ? "#fff" : C.tm,
            border: "none", cursor: "pointer",
          }}>{label}</button>
        ))}
      </div>

      <div style={{
        background: C.surface, borderRadius: 10, padding: 16,
        border: `0.5px solid ${C.border}`, marginBottom: 14,
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8,
        }}>
          <div style={{
            fontSize: 12, color: C.tm,
            textTransform: "uppercase", letterSpacing: "0.5px",
          }}>
            {vista === '30d' ? 'Ingresos vs egresos' : 'Ingresos vs egresos · línea = neto acumulado'}
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: C.td }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: C.green, opacity: 0.75 }}/> Ingresos
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: C.td }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: C.red, opacity: 0.65 }}/> Egresos
            </div>
            {vista === '12m' && (
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: C.td }}>
                <div style={{ width: 20, height: 2, background: C.amber, borderRadius: 1 }}/> Neto acum.
              </div>
            )}
          </div>
        </div>
        {vista === '30d' ? <Grafico30d/> : <Grafico12m/>}
      </div>

      {vista === '12m' && (
        <div style={{
          background: C.surface, borderRadius: 10,
          border: `0.5px solid ${C.border}`, overflow: "hidden", marginBottom: 14,
        }}>
          <div style={{
            padding: "12px 14px", borderBottom: `0.5px solid ${C.borderL}`,
            fontSize: 12, color: C.tm, textTransform: "uppercase",
          }}>Detalle mensual</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>{["Mes", "Ingresos (c/IVA)", "Egresos", "Neto", "Neto acum.", "Facturas"].map(h => (
                  <th key={h} style={{
                    padding: "8px 12px", textAlign: "left", fontSize: 10,
                    color: C.td, fontWeight: 500, textTransform: "uppercase",
                    whiteSpace: "nowrap", borderBottom: `0.5px solid ${C.borderL}`,
                  }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {data12conAcum.map((d, i) => {
                  const esAct = d.mes === mesAct;
                  const ventasInfo = ventas.porMes.find(v => v.mes === d.mes);
                  return (
                    <tr key={i} style={{
                      borderTop: `0.5px solid ${C.border}`,
                      background: esAct ? C.accentD : "transparent",
                    }}>
                      <td style={{
                        padding: "7px 12px", fontWeight: esAct ? 600 : 400,
                        color: esAct ? C.accent : C.text,
                        whiteSpace: "nowrap", textTransform: "capitalize",
                      }}>{mesLabelLargo(d.mes)}</td>
                      <td style={{ padding: "7px 12px", fontFamily: "monospace", color: d.ingreso > 0 ? C.green : C.td }}>
                        {d.ingreso > 0 ? f(d.ingreso) : "—"}
                      </td>
                      <td style={{ padding: "7px 12px", fontFamily: "monospace", color: d.egresos > 0 ? C.red : C.td }}>
                        {d.egresos > 0 ? f(d.egresos) : "—"}
                      </td>
                      <td style={{ padding: "7px 12px", fontFamily: "monospace", fontWeight: 600, color: d.neto >= 0 ? C.green : C.red }}>
                        {d.ingreso > 0 || d.egresos > 0 ? (d.neto >= 0 ? "+" : "") + f(d.neto) : "—"}
                      </td>
                      <td style={{ padding: "7px 12px", fontFamily: "monospace", color: d.acum >= 0 ? C.text : C.red }}>
                        {f(d.acum)}
                      </td>
                      <td style={{ padding: "7px 12px", color: C.tm, textAlign: "center" }}>
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
        <div style={{
          background: C.surface, borderRadius: 10,
          padding: 16, border: `0.5px solid ${C.border}`,
        }}>
          <div style={{ fontSize: 12, color: C.tm, marginBottom: 10, textTransform: "uppercase" }}>
            Top clientes · mes actual
          </div>
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
              <div style={{ fontSize: 12, color: C.td, fontStyle: "italic" }}>Sin datos del mes actual</div>
            );
            return top.map((c, i) => {
              const pct = totalTop > 0 ? c.monto / totalTop : 0;
              return (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "7px 0",
                  borderBottom: i < top.length - 1 ? `0.5px solid ${C.border}` : "none",
                }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: 4, background: C.accentD,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: C.accent }}>{i + 1}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 12, color: C.text,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{c.nombre}</div>
                    <div style={{ height: 3, background: C.surfaceAlt, borderRadius: 2, marginTop: 3 }}>
                      <div style={{ height: "100%", width: `${pct * 100}%`, background: C.accent, borderRadius: 2 }}/>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, fontFamily: "monospace", color: C.text }}>{f(c.monto)}</div>
                    <div style={{ fontSize: 10, color: C.td }}>{c.facturas} doc.</div>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}

      {vista === '12m' && mejorMes && peorMes && (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
          <div style={{
            background: C.surface, borderRadius: 10,
            padding: "14px 16px", border: `0.5px solid ${C.green}44`,
          }}>
            <div style={{ fontSize: 11, color: C.td, marginBottom: 4, textTransform: "uppercase" }}>Mejor mes</div>
            <div style={{
              fontSize: 13, fontWeight: 600, color: C.text,
              textTransform: "capitalize", marginBottom: 2,
            }}>{mesLabelLargo(mejorMes.mes)}</div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "monospace", color: C.green }}>
              +{f(mejorMes.neto)}
            </div>
            <div style={{ fontSize: 11, color: C.td, marginTop: 3 }}>
              {f(mejorMes.ingreso)} ingreso · {f(mejorMes.egresos)} egreso
            </div>
          </div>
          <div style={{
            background: C.surface, borderRadius: 10,
            padding: "14px 16px", border: `0.5px solid ${C.red}44`,
          }}>
            <div style={{ fontSize: 11, color: C.td, marginBottom: 4, textTransform: "uppercase" }}>Mes más ajustado</div>
            <div style={{
              fontSize: 13, fontWeight: 600, color: C.text,
              textTransform: "capitalize", marginBottom: 2,
            }}>{mesLabelLargo(peorMes.mes)}</div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "monospace", color: C.red }}>
              {f(peorMes.neto)}
            </div>
            <div style={{ fontSize: 11, color: C.td, marginTop: 3 }}>
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
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <Metric C={C} label="DAP trabajo" value={f(trab.reduce((s, d) => s + d.montoInicial, 0))} sub={`${trab.length} depósitos`}/>
        <Metric C={C} label="DAP inversión" value={f(inv.reduce((s, d) => s + d.montoInicial, 0))} sub={`${inv.length} depósitos`} color={C.amber}/>
        <Metric C={C} label="DAP crédito" value={f(cred.reduce((s, d) => s + d.montoInicial, 0))} sub={`${cred.length} depósitos`} color={C.cyan}/>
        <Metric C={C} label="Ganancia activos" value={f(vigentes.reduce((s, d) => s + d.ganancia, 0))} sub="Intereses vigentes" color={C.green}/>
        <Metric C={C} label="Ganancia histórica" value={f(ganHist)} sub="Desde 2022" color={C.green}/>
      </div>

      <div style={{
        background: C.surface, borderRadius: 10,
        border: `0.5px solid ${C.border}`, overflow: "hidden",
      }}>
        <div style={{
          padding: "12px 14px", borderBottom: `0.5px solid ${C.borderL}`,
          fontSize: 12, color: C.tm, textTransform: "uppercase",
        }}>DAPs vigentes ({vigentes.length})</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 800 }}>
            <thead><tr>{["Tipo", "Banco", "Inicio", "Vence", "Días", "Tasa", "Monto", "Ganancia", "Para qué"].map(h => (
              <th key={h} style={{
                padding: "8px 10px", textAlign: "left", fontSize: 10,
                color: C.td, fontWeight: 500, textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}>{h}</th>
            ))}</tr></thead>
            <tbody>
              {vigentes.sort((a, b) => (a.vencimiento || "").localeCompare(b.vencimiento || "")).map((d, i) => {
                const dias = d.vencimiento ? dd(hoy, d.vencimiento) : 999;
                const tc = colorTipo(clas(d.tipo), C);
                return (
                  <tr key={i} style={{ borderTop: `0.5px solid ${C.border}` }}>
                    <td style={{ padding: "8px 10px" }}>
                      <span style={{
                        padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 500,
                        background: tc.bg, color: tc.color,
                      }}>{d.tipo}</span>
                    </td>
                    <td style={{ padding: "8px 10px", color: C.tm }}>{d.banco}</td>
                    <td style={{ padding: "8px 10px", color: C.tm }}>{fd(d.fechaInicio)}</td>
                    <td style={{
                      padding: "8px 10px",
                      color: dias <= 3 && dias >= 0 ? C.amber : C.text,
                      fontWeight: dias <= 3 && dias >= 0 ? 600 : 400,
                    }}>{fd(d.vencimiento)} {dias <= 3 && dias >= 0 ? `(${dias}d)` : ""}</td>
                    <td style={{ padding: "8px 10px", color: C.tm, textAlign: "center" }}>{d.dias}</td>
                    <td style={{ padding: "8px 10px", color: C.tm }}>{d.tasa ? (d.tasa * 100).toFixed(2) + "%" : "—"}</td>
                    <td style={{ padding: "8px 10px", fontFamily: "monospace", color: C.text, fontWeight: 500 }}>{fS(d.montoInicial)}</td>
                    <td style={{ padding: "8px 10px", fontFamily: "monospace", color: C.green }}>+{fS(d.ganancia)}</td>
                    <td style={{
                      padding: "8px 10px", color: C.td, maxWidth: 200,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>{d.comentario}</td>
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
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <Metric C={C} label="Total invertido" value={f(totalInv)} sub={`${ffmm.length} fondos activos`} color={C.purple}/>
        <Metric C={C} label="Valor actual" value={totalAct > 0 ? f(totalAct) : "Actualizar en hoja"} color={C.accent}/>
        <Metric C={C} label="Rentabilidad" value={totalRent > 0 ? f(totalRent) : "—"}
          sub={totalRent > 0 && totalInv > 0 ? `${(totalRent / totalInv * 100).toFixed(2)}%` : undefined} color={C.green}/>
      </div>

      <div style={{
        background: C.surface, borderRadius: 10,
        border: `0.5px solid ${C.border}`, overflow: "hidden", marginBottom: 14,
      }}>
        <div style={{
          padding: "12px 14px", borderBottom: `0.5px solid ${C.borderL}`,
          fontSize: 12, color: C.tm, textTransform: "uppercase",
        }}>Saldos vigentes por fondo</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 700 }}>
            <thead><tr>{["Empresa", "Fondo", "Admin.", "Invertido", "Valor actual", "Rent.", "Rent. %"].map(h => (
              <th key={h} style={{
                padding: "10px 12px", textAlign: "left", fontSize: 10,
                color: C.td, fontWeight: 500, textTransform: "uppercase",
              }}>{h}</th>
            ))}</tr></thead>
            <tbody>
              {ffmm.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 20, textAlign: "center", color: C.td }}>Ingresa fondos mutuos en la hoja</td></tr>
              ) : ffmm.map((fm, i) => (
                <tr key={i} style={{ borderTop: `0.5px solid ${C.border}` }}>
                  <td style={{ padding: "8px 12px", color: C.text }}>{fm.empresa}</td>
                  <td style={{ padding: "8px 12px", color: C.text }}>{fm.fondo}</td>
                  <td style={{ padding: "8px 12px" }}>
                    <span style={{
                      padding: "2px 8px", borderRadius: 4, fontSize: 11,
                      background: C.purpleD, color: C.purple,
                    }}>{fm.admin}</span>
                  </td>
                  <td style={{ padding: "8px 12px", fontFamily: "monospace", color: C.text }}>{fS(fm.invertido)}</td>
                  <td style={{ padding: "8px 12px", fontFamily: "monospace", color: C.accent, fontWeight: 500 }}>
                    {fm.valorActual > 0 ? fS(fm.valorActual) : "—"}
                  </td>
                  <td style={{ padding: "8px 12px", fontFamily: "monospace", color: C.green }}>
                    {fm.rentabilidad > 0 ? `+${fS(fm.rentabilidad)}` : "—"}
                  </td>
                  <td style={{ padding: "8px 12px", color: C.green, fontWeight: 500 }}>
                    {fm.rentabilidad > 0 && fm.invertido > 0 ? `${(fm.rentabilidad / fm.invertido * 100).toFixed(2)}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {movimientos.length > 0 && (
        <div style={{
          background: C.surface, borderRadius: 10,
          border: `0.5px solid ${C.border}`, overflow: "hidden",
        }}>
          <div style={{
            padding: "12px 14px", borderBottom: `0.5px solid ${C.borderL}`,
            fontSize: 12, color: C.tm, textTransform: "uppercase",
          }}>Historial de movimientos</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 600 }}>
              <thead><tr>{["Fecha", "Empresa", "Fondo", "Tipo", "Monto"].map(h => (
                <th key={h} style={{
                  padding: "10px 12px", textAlign: "left", fontSize: 10,
                  color: C.td, fontWeight: 500, textTransform: "uppercase",
                }}>{h}</th>
              ))}</tr></thead>
              <tbody>
                {movimientos.map((m, i) => (
                  <tr key={i} style={{ borderTop: `0.5px solid ${C.border}` }}>
                    <td style={{ padding: "8px 12px", color: C.tm }}>{fd(m.fecha)}</td>
                    <td style={{ padding: "8px 12px", color: C.text }}>{m.empresa}</td>
                    <td style={{ padding: "8px 12px", color: C.text }}>{m.fondo}</td>
                    <td style={{ padding: "8px 12px" }}>
                      <span style={{
                        padding: "2px 8px", borderRadius: 4, fontSize: 11,
                        background: m.tipo === "Aporte" ? C.greenD : C.redD,
                        color: m.tipo === "Aporte" ? C.green : C.red,
                      }}>{m.tipo}</span>
                    </td>
                    <td style={{ padding: "8px 12px", fontFamily: "monospace", color: C.text, fontWeight: 500 }}>{fS(m.monto)}</td>
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

  const porBanco = {};
  leasingDetalle.forEach(d => {
    const b = d.banco;
    if (!porBanco[b]) porBanco[b] = { deudaUF: 0, cuota: 0, contratos: 0 };
    porBanco[b].deudaUF += d.deudaUF;
    porBanco[b].cuota += d.cuotaCLPcIVA;
    porBanco[b].contratos += 1;
  });

  const proximas = leasingResumen.slice(0, 3);

  return (
    <div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <Metric C={C} label="Deuda total (UF)" value={fUF(totalDeudaUF)} sub={`${leasingDetalle.length} contratos activos`} color={C.teal}/>
        <Metric C={C} label="Tractos en leasing" value={totalTractos} sub="Unidades comprometidas" color={C.teal}/>
        <Metric C={C} label="Cuota mensual total" value={f(totalCuotaCLP)} sub="Con IVA · todos los bancos" color={C.amber}/>
        <Metric C={C} label="Cuotas por pagar" value={totalCuotasPorPagar} sub="Suma contratos activos" color={C.td}/>
      </div>

      {proximas.length > 0 && (
        <div style={{
          background: C.surface, borderRadius: 10,
          padding: 16, border: `0.5px solid ${C.border}`, marginBottom: 14,
        }}>
          <div style={{
            fontSize: 12, color: C.tm, marginBottom: 10,
            textTransform: "uppercase", letterSpacing: "0.5px",
          }}>Próximas cuotas a pagar</div>
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 10,
          }}>
            {proximas.map((r, i) => {
              const bciTotal = (r.bciDia5 || 0) + (r.bciDia15 || 0);
              const esUrgente = i === 0;
              return (
                <div key={i} style={{
                  padding: "12px 14px", borderRadius: 8,
                  background: esUrgente ? C.amberD : C.surfaceAlt,
                  border: `0.5px solid ${esUrgente ? C.amber + "55" : C.border}`,
                }}>
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    marginBottom: 6,
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text, textTransform: "capitalize" }}>
                      {r.mes} {r.anio}
                    </div>
                    {esUrgente && (
                      <span style={{
                        fontSize: 10, padding: "2px 8px", borderRadius: 4,
                        background: C.amber + "33", color: C.amberT, fontWeight: 600,
                      }}>PRÓXIMA</span>
                    )}
                  </div>
                  <div style={{
                    fontSize: 20, fontWeight: 700,
                    color: esUrgente ? C.amberT : C.text,
                    fontFamily: "monospace", marginBottom: 4,
                  }}>{f(r.cuotaCLPcIVA)}</div>
                  <div style={{ fontSize: 11, color: C.td }}>s/IVA: {f(r.cuotaCLPsIVA)}</div>
                  <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {bciTotal > 0 && (
                      <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: C.accentD, color: C.accent }}>
                        BCI {fUF(bciTotal)} UF
                      </span>
                    )}
                    {r.vfsVolvo > 0 && (
                      <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: C.amberD, color: C.amber }}>
                        VFS {fUF(r.vfsVolvo)} UF
                      </span>
                    )}
                    {r.bancoChile > 0 && (
                      <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: C.tealD, color: C.teal }}>
                        BancoChile {fUF(r.bancoChile)} UF
                      </span>
                    )}
                  </div>
                  {r.contratosActivos > 0 && (
                    <div style={{ marginTop: 6, fontSize: 11, color: C.td }}>{r.contratosActivos} contratos activos</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{
        background: C.surface, borderRadius: 10,
        border: `0.5px solid ${C.border}`, overflow: "hidden", marginBottom: 14,
      }}>
        <div style={{
          padding: "12px 14px", borderBottom: `0.5px solid ${C.borderL}`,
          fontSize: 12, color: C.tm, textTransform: "uppercase",
        }}>Contratos activos ({leasingDetalle.length})</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 700 }}>
            <thead><tr>{["Banco", "Tractos", "Cuota c/IVA", "Cuotas x Pagar", "Vencimiento", "Deuda UF"].map(h => (
              <th key={h} style={{
                padding: "8px 12px", textAlign: "left", fontSize: 10,
                color: C.td, fontWeight: 500, textTransform: "uppercase", whiteSpace: "nowrap",
              }}>{h}</th>
            ))}</tr></thead>
            <tbody>
              {leasingDetalle.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 20, textAlign: "center", color: C.td }}>Sin contratos activos</td></tr>
              ) : leasingDetalle.map((d, i) => {
                const tc = colorBanco(d.banco, C);
                const diasFin = d.fechaFin ? dd(hoy, d.fechaFin) : 9999;
                const venceProx = diasFin <= 60 && diasFin >= 0;
                return (
                  <tr key={i} style={{
                    borderTop: `0.5px solid ${C.border}`,
                    background: i % 2 === 0 ? "transparent" : C.surfaceAlt + "55",
                  }}>
                    <td style={{ padding: "8px 12px" }}>
                      <span style={{
                        padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 500,
                        background: tc.bg, color: tc.color,
                      }}>{d.banco}</span>
                    </td>
                    <td style={{ padding: "8px 12px", color: C.text, fontWeight: 500, textAlign: "center" }}>{d.nTractos}</td>
                    <td style={{ padding: "8px 12px", fontFamily: "monospace", color: C.text, fontWeight: 600 }}>{fS(d.cuotaCLPcIVA)}</td>
                    <td style={{ padding: "8px 12px", color: C.text, textAlign: "center" }}>{d.cuotasPorPagar}</td>
                    <td style={{
                      padding: "8px 12px",
                      color: venceProx ? C.amber : C.text,
                      fontWeight: venceProx ? 600 : 400,
                      whiteSpace: "nowrap",
                    }}>{fd(d.fechaFin)}{venceProx ? ` (${diasFin}d)` : ""}</td>
                    <td style={{ padding: "8px 12px", fontFamily: "monospace", color: C.teal, fontWeight: 500 }}>{fUF(d.deudaUF)}</td>
                  </tr>
                );
              })}
            </tbody>
            {leasingDetalle.length > 1 && (
              <tfoot>
                <tr style={{ borderTop: `1px solid ${C.borderL}`, background: C.surfaceAlt }}>
                  <td style={{ padding: "8px 12px", fontWeight: 600, color: C.text, fontSize: 11 }}>TOTAL</td>
                  <td style={{ padding: "8px 12px", fontWeight: 600, color: C.text, textAlign: "center" }}>{totalTractos}</td>
                  <td style={{ padding: "8px 12px", fontFamily: "monospace", fontWeight: 700, color: C.amber }}>{fS(totalCuotaCLP)}</td>
                  <td style={{ padding: "8px 12px", fontWeight: 600, color: C.text, textAlign: "center" }}>{totalCuotasPorPagar}</td>
                  <td style={{ padding: "8px 12px" }}></td>
                  <td style={{ padding: "8px 12px", fontFamily: "monospace", fontWeight: 700, color: C.teal }}>{fUF(totalDeudaUF)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {leasingResumen.length > 0 && (
        <div style={{
          background: C.surface, borderRadius: 10,
          border: `0.5px solid ${C.border}`, overflow: "hidden",
        }}>
          <div style={{
            padding: "12px 14px", borderBottom: `0.5px solid ${C.borderL}`,
            fontSize: 12, color: C.tm, textTransform: "uppercase",
          }}>Proyección mensual de cuotas</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 700 }}>
              <thead><tr>{["Mes", "Cuota c/IVA", "BCI", "VFS Volvo", "Banco Chile", "Contratos", "Vence"].map(h => (
                <th key={h} style={{
                  padding: "8px 12px", textAlign: "left", fontSize: 10,
                  color: C.td, fontWeight: 500, textTransform: "uppercase", whiteSpace: "nowrap",
                }}>{h}</th>
              ))}</tr></thead>
              <tbody>
                {leasingResumen.map((r, i) => {
                  const bciTotal = (r.bciDia5 || 0) + (r.bciDia15 || 0);
                  const esActual = i === 0;
                  return (
                    <tr key={i} style={{
                      borderTop: `0.5px solid ${C.border}`,
                      background: esActual ? C.tealD : "transparent",
                    }}>
                      <td style={{
                        padding: "8px 12px", fontWeight: esActual ? 600 : 400,
                        color: C.text, whiteSpace: "nowrap", textTransform: "capitalize",
                      }}>{r.mes} {r.anio}</td>
                      <td style={{
                        padding: "8px 12px", fontFamily: "monospace",
                        fontWeight: esActual ? 700 : 500,
                        color: esActual ? C.teal : C.text,
                      }}>{fS(r.cuotaCLPcIVA)}</td>
                      <td style={{ padding: "8px 12px", fontFamily: "monospace", color: C.accent }}>{bciTotal > 0 ? fUF(bciTotal) : "—"}</td>
                      <td style={{ padding: "8px 12px", fontFamily: "monospace", color: C.amber }}>{r.vfsVolvo > 0 ? fUF(r.vfsVolvo) : "—"}</td>
                      <td style={{ padding: "8px 12px", fontFamily: "monospace", color: C.teal }}>{r.bancoChile > 0 ? fUF(r.bancoChile) : "—"}</td>
                      <td style={{ padding: "8px 12px", color: C.tm, textAlign: "center" }}>{r.contratosActivos || "—"}</td>
                      <td style={{ padding: "8px 12px", color: r.vesteEstesMes ? C.amber : C.td, fontSize: 11 }}>{r.vesteEstesMes || "—"}</td>
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
    <div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <Metric C={C} label="Total a pagar" value={f(saldoInsoluto)} sub="Capital + intereses futuros" color={C.red}/>
        <Metric C={C} label="Cuotas pendientes" value={creditoPendiente.length}
          sub={`de ${totalCuotas} totales · pagadas: ${pagadas}`} color={C.amber}/>
        <Metric C={C} label="Cuota mensual" value={f(cuotaMensual)} sub="Capital + interés" color={C.text}/>
        <Metric C={C} label="Intereses pendientes" value={f(interesesPend)} sub={`Total histórico: ${f(totalIntereses)}`} color={C.td}/>
      </div>

      {(proxima || segunda) && (
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gap: 10, marginBottom: 14,
        }}>
          {[proxima, segunda].filter(Boolean).map((c, i) => {
            const dias = c.fechaVenc >= hoy ? Math.ceil((new Date(c.fechaVenc) - new Date(hoy)) / 864e5) : 0;
            const esUrgente = dias <= 5 && dias >= 0;
            return (
              <div key={i} style={{
                background: C.surface, borderRadius: 10,
                padding: "14px 16px",
                border: `0.5px solid ${esUrgente ? C.amber + "66" : C.border}`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>Cuota {c.nCuota}</span>
                  {esUrgente && (
                    <span style={{
                      fontSize: 10, padding: "2px 8px", borderRadius: 4,
                      background: C.amberD, color: C.amberT, fontWeight: 600,
                    }}>EN {dias}d</span>
                  )}
                </div>
                <div style={{
                  fontSize: 20, fontWeight: 700, fontFamily: "monospace",
                  color: esUrgente ? C.amberT : C.text, marginBottom: 6,
                }}>{f(c.valorCuota)}</div>
                <div style={{ fontSize: 11, color: C.td }}>Vence: {fdf(c.fechaVenc)}</div>
                <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 10, color: C.td }}>Capital</div>
                    <div style={{ fontSize: 12, fontFamily: "monospace", color: C.text }}>{f(c.amortizacion)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: C.td }}>Interés</div>
                    <div style={{ fontSize: 12, fontFamily: "monospace", color: C.amber }}>{f(c.interes)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: C.td }}>Saldo tras pago</div>
                    <div style={{ fontSize: 12, fontFamily: "monospace", color: C.td }}>{f(c.saldoInsoluto)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{
        background: C.surface, borderRadius: 10,
        border: `0.5px solid ${C.border}`, overflow: "hidden",
      }}>
        <div style={{
          padding: "12px 14px", borderBottom: `0.5px solid ${C.borderL}`,
          fontSize: 12, color: C.tm, textTransform: "uppercase",
        }}>Tabla de amortización · {totalCuotas} cuotas</div>
        <div style={{ overflowX: "auto", maxHeight: 480, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 600 }}>
            <thead style={{ position: "sticky", top: 0, background: C.surface, zIndex: 1 }}>
              <tr>{["N°", "Vencimiento", "Capital", "Interés", "Cuota", "Saldo Insoluto"].map(h => (
                <th key={h} style={{
                  padding: "8px 12px", textAlign: "left", fontSize: 10,
                  color: C.td, fontWeight: 500, textTransform: "uppercase",
                  whiteSpace: "nowrap", borderBottom: `0.5px solid ${C.borderL}`,
                }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {credito.map((c, i) => {
                const pasada = c.fechaVenc < hoy;
                const esHoy = c.fechaVenc === hoy;
                return (
                  <tr key={i} style={{
                    borderTop: `0.5px solid ${C.border}`,
                    opacity: pasada ? 0.45 : 1,
                    background: esHoy ? C.amberD : "transparent",
                  }}>
                    <td style={{ padding: "7px 12px", color: C.tm, fontWeight: 500 }}>{c.nCuota}</td>
                    <td style={{ padding: "7px 12px", color: pasada ? C.td : C.text, whiteSpace: "nowrap" }}>{fdf(c.fechaVenc)}</td>
                    <td style={{ padding: "7px 12px", fontFamily: "monospace", color: C.text }}>{c.amortizacion > 0 ? f(c.amortizacion) : "—"}</td>
                    <td style={{ padding: "7px 12px", fontFamily: "monospace", color: C.amber }}>{c.interes > 0 ? f(c.interes) : "—"}</td>
                    <td style={{ padding: "7px 12px", fontFamily: "monospace", fontWeight: 600, color: pasada ? C.td : C.text }}>
                      {c.valorCuota > 0 ? f(c.valorCuota) : "—"}
                    </td>
                    <td style={{ padding: "7px 12px", fontFamily: "monospace", color: C.teal }}>{f(c.saldoInsoluto)}</td>
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
    if (tipo === "urgente") return { bg: C.redD, border: C.red + "55", badgeBg: C.red, badgeText: "#fff", label: "URGENTE", labelColor: C.red };
    if (tipo === "atencion") return { bg: C.amberD, border: C.amber + "55", badgeBg: C.amber, badgeText: "#000", label: "ATENCIÓN", labelColor: C.amberT };
    return { bg: C.accentD, border: C.accent + "55", badgeBg: C.accent, badgeText: "#fff", label: "INFO", labelColor: C.accent };
  };

  const urgentes = alertas.filter(a => a.tipo === "urgente");
  const atenciones = alertas.filter(a => a.tipo === "atencion");
  const infos = alertas.filter(a => a.tipo === "info");

  if (alertas.length === 0) return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "60px 20px", gap: 12,
    }}>
      <div style={{ fontSize: 32 }}>✅</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>Sin alertas activas</div>
      <div style={{ fontSize: 13, color: C.td }}>Todos los vencimientos están bajo control esta semana</div>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        {urgentes.length > 0 && (
          <div style={{
            padding: "10px 16px", borderRadius: 8,
            background: C.redD, border: `0.5px solid ${C.red + "55"}`,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: C.red }}>{urgentes.length}</span>
            <span style={{ fontSize: 12, color: C.red, fontWeight: 600, textTransform: "uppercase" }}>
              Urgente{urgentes.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
        {atenciones.length > 0 && (
          <div style={{
            padding: "10px 16px", borderRadius: 8,
            background: C.amberD, border: `0.5px solid ${C.amber + "55"}`,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: C.amberT }}>{atenciones.length}</span>
            <span style={{ fontSize: 12, color: C.amberT, fontWeight: 600, textTransform: "uppercase" }}>
              Atención{atenciones.length !== 1 ? "" : "es"}
            </span>
          </div>
        )}
        {infos.length > 0 && (
          <div style={{
            padding: "10px 16px", borderRadius: 8,
            background: C.accentD, border: `0.5px solid ${C.accent + "55"}`,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: C.accent }}>{infos.length}</span>
            <span style={{ fontSize: 12, color: C.accent, fontWeight: 600, textTransform: "uppercase" }}>
              Info{infos.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {alertas.map((a, i) => {
          const col = colorConfig(a.tipo);
          return (
            <div key={i} style={{
              background: col.bg, border: `0.5px solid ${col.border}`,
              borderRadius: 10, padding: "14px 16px",
              display: "flex", gap: 14, alignItems: "flex-start",
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: col.badgeBg + "22",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, fontSize: 18,
              }}>{a.icono}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                    background: col.badgeBg, color: col.badgeText, letterSpacing: "0.5px",
                  }}>{col.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{a.titulo}</span>
                </div>
                <div style={{ fontSize: 13, color: C.tm }}>{a.mensaje}</div>
                {a.fecha && (
                  <div style={{ fontSize: 11, color: C.td, marginTop: 4 }}>
                    {new Date(a.fecha + "T12:00:00").toLocaleDateString("es-CL", {
                      weekday: "long", day: "numeric", month: "long", year: "numeric",
                    })}
                  </div>
                )}
              </div>
              <div style={{ flexShrink: 0, textAlign: "right" }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: col.labelColor, lineHeight: 1 }}>{a.dias}</div>
                <div style={{ fontSize: 10, color: C.td }}>días</div>
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
      lines: lines.filter(l => l.trim()), total,
      ts: new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }),
    }, ...history.slice(0, 4)]);
    setLines([""]);
  };

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "1fr 260px",
      gap: 14,
    }}>
      <div style={{
        background: C.surface, borderRadius: 10,
        padding: 16, border: `0.5px solid ${C.border}`,
      }}>
        <div style={{ fontSize: 12, color: C.tm, marginBottom: 6, textTransform: "uppercase" }}>
          Calculadora rápida
        </div>
        <div style={{ fontSize: 11, color: C.td, marginBottom: 12 }}>
          {'Soporta +, -, *, / · "M" = millones · "MM" = miles de millones · Ej: 500M+300M, 1.5MM*2'}
        </div>
        {lines.map((l, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <input
              type="text" value={l}
              onChange={e => upd(i, e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") add(); }}
              placeholder={i === 0 ? "Ej: 500M+300M" : ""}
              inputMode="decimal"
              style={{
                flex: 1, padding: "10px 12px", borderRadius: 8,
                fontSize: 16, background: C.surfaceAlt, color: C.text,
                border: `0.5px solid ${C.border}`,
                fontFamily: "monospace", outline: "none",
              }}/>
            <span style={{
              fontSize: 13, fontFamily: "monospace",
              color: vals[i] != null ? (vals[i] >= 0 ? C.green : C.red) : C.td,
              minWidth: 90, textAlign: "right",
            }}>{vals[i] != null ? fS(vals[i]) : ""}</span>
            {lines.length > 1 && (
              <button onClick={() => rem(i)} style={{
                background: "none", border: "none", color: C.td,
                cursor: "pointer", fontSize: 18, padding: "0 4px",
              }}>×</button>
            )}
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button onClick={add} style={{
            padding: "8px 14px", borderRadius: 6, fontSize: 12,
            background: C.surfaceAlt, color: C.tm,
            border: `0.5px solid ${C.border}`, cursor: "pointer",
          }}>+ Línea</button>
          <button onClick={clear} style={{
            padding: "8px 14px", borderRadius: 6, fontSize: 12,
            background: C.surfaceAlt, color: C.tm,
            border: `0.5px solid ${C.border}`, cursor: "pointer",
          }}>Limpiar</button>
        </div>
        {has && (
          <div style={{
            marginTop: 16, padding: "12px 14px", borderRadius: 8,
            background: total >= 0 ? C.greenD : C.redD,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontSize: 12, color: C.tm, textTransform: "uppercase" }}>Total</span>
            <span style={{
              fontSize: 22, fontWeight: 600, fontFamily: "monospace",
              color: total >= 0 ? C.green : C.red,
            }}>{f(total)}</span>
          </div>
        )}
      </div>
      <div style={{
        background: C.surface, borderRadius: 10,
        padding: 16, border: `0.5px solid ${C.border}`,
      }}>
        <div style={{ fontSize: 12, color: C.tm, marginBottom: 10, textTransform: "uppercase" }}>Historial</div>
        {history.length === 0 ? (
          <div style={{ fontSize: 12, color: C.td, fontStyle: "italic" }}>Aparecerá al limpiar</div>
        ) : history.map((h, i) => (
          <div key={i} style={{ padding: "8px 0", borderBottom: i < history.length - 1 ? `0.5px solid ${C.border}` : "none" }}>
            <div style={{ fontSize: 10, color: C.td }}>{h.ts}</div>
            <div style={{ fontSize: 12, color: C.tm }}>{h.lines.join(" | ")}</div>
            <div style={{ fontSize: 14, fontWeight: 600, fontFamily: "monospace", color: h.total >= 0 ? C.green : C.red }}>
              {f(h.total)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
