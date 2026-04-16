import { f, fS, fd, fdf, dd, clas, colorTipo, mesLabel } from '../utils/format.js';
import { GraficoCobertura, GraficoDonaDap } from '../components/Graficos.jsx';

export default function TabResumen({
  C, bancos, dap, cal, ffmm,
  leasingDetalle, leasingResumen,
  creditoPendiente, saldoInsoluto, alertas,
  isMobile, hoy,
  onGoTab, // navega a otra pestaña al tocar "ver"
}) {
  const bancosHoy = bancos.filter(b => b.fecha === hoy);
  const saldosIni = bancosHoy.filter(b => b.descripcion === "Saldo Inicial");
  const totalIni = saldosIni.reduce((s, b) => s + (b.saldoInicial || 0), 0);
  const ultimo = {};
  bancosHoy.forEach(b => { if (b.saldoFinal != null) ultimo[b.banco] = b.saldoFinal; });
  const saldoAct = Object.values(ultimo).reduce((s, v) => s + v, 0);

  // Saldo de ayer (para delta)
  const fechasDisp = [...new Set(bancos.map(b => b.fecha))].sort();
  const idxHoy = fechasDisp.indexOf(hoy);
  const fechaAyer = idxHoy > 0 ? fechasDisp[idxHoy - 1] : (fechasDisp.length > 0 && fechasDisp[fechasDisp.length - 1] < hoy ? fechasDisp[fechasDisp.length - 1] : null);
  const ultimoAyer = {};
  if (fechaAyer) {
    bancos.filter(b => b.fecha === fechaAyer).forEach(b => {
      if (b.saldoFinal != null) ultimoAyer[b.banco] = b.saldoFinal;
    });
  }
  const saldoAyer = Object.values(ultimoAyer).reduce((s, v) => s + v, 0);
  const deltaHoyAyer = saldoAct > 0 && saldoAyer > 0 ? saldoAct - saldoAyer : null;

  // DAPs
  const dapsV = dap.filter(d => d.vigente === "si" || d.vigente === "sí");
  const totalDAP = dapsV.reduce((s, d) => s + d.montoInicial, 0);
  const totalGanDAP = dapsV.reduce((s, d) => s + d.ganancia, 0);
  const ganHistorica = dap.reduce((s, d) => s + d.ganancia, 0);
  const trab = dapsV.filter(d => clas(d.tipo) === 'trabajo');
  const inv = dapsV.filter(d => clas(d.tipo) === 'inversion');
  const cred = dapsV.filter(d => clas(d.tipo) === 'credito');

  // FFMM
  const totalFFMMInv = ffmm.reduce((s, f) => s + f.invertido, 0);
  const totalFFMMAct = ffmm.reduce((s, f) => s + f.valorActual, 0);
  const totalGanFFMM = ffmm.reduce((s, f) => s + f.rentabilidad, 0);

  // Mes actual cobertura
  const mesActual = hoy.substring(0, 7);
  const calMes = cal.filter(c => c.fecha && c.fecha.startsWith(mesActual));
  const compMes = calMes.reduce((s, c) => s + c.monto, 0);
  const guarMes = calMes.reduce((s, c) => s + c.guardado, 0);
  const pctMes = compMes > 0 ? guarMes / compMes : 0;

  // Semana
  const finSemana = new Date(hoy + "T12:00:00");
  finSemana.setDate(finSemana.getDate() + (7 - finSemana.getDay()));
  const finSemStr = `${finSemana.getFullYear()}-${String(finSemana.getMonth()+1).padStart(2,"0")}-${String(finSemana.getDate()).padStart(2,"0")}`;
  const semComps = cal.filter(c => c.fecha >= hoy && c.fecha <= finSemStr);
  const semCubierta = semComps.length === 0 || semComps.every(c => c.falta === 0);
  const faltaSem = semComps.reduce((s, c) => s + c.falta, 0);

  const proxComp = cal.filter(c => c.fecha >= hoy).slice(0, 5);
  const proxDAP = dapsV.filter(d => d.vencimiento > hoy)
    .sort((a, b) => a.vencimiento.localeCompare(b.vencimiento)).slice(0, 5);

  // Leasing
  const totalDeudaLeasingUF = leasingDetalle.reduce((s, d) => s + d.deudaUF, 0);
  const cuotaTotalLeasing = leasingDetalle.reduce((s, d) => s + d.cuotaCLPcIVA, 0);
  const deudaLeasingSIVACLP = leasingDetalle.reduce((s, d) => s + (d.cuotaCLPsIVA * d.cuotasPorPagar), 0);

  const noData = bancosHoy.length === 0;
  const mesLabelAct = new Date(hoy + "T12:00:00").toLocaleDateString("es-CL", { month: "long" });

  const colorAlerta = (tipo) =>
    tipo === "urgente" ? { bg: C.redD, border: C.red + "55", text: C.red } :
    tipo === "atencion" ? { bg: C.amberD, border: C.amber + "55", text: C.amberT } :
    { bg: C.accentD, border: C.accent + "55", text: C.accent };

  // ─── LAYOUT MOBILE ────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

        {/* Banner semana */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 12px", borderRadius: 8,
          background: noData ? C.amberD : semCubierta ? C.greenD : C.amberD,
          border: `0.5px solid ${noData ? C.amber + "44" : semCubierta ? C.green + "44" : C.amber + "44"}`,
        }}>
          <span style={{ fontSize: 14 }}>{noData ? "○" : semCubierta ? "●" : "◐"}</span>
          <span style={{
            fontSize: 12, fontWeight: 500,
            color: noData ? C.amberT : semCubierta ? C.greenT : C.amberT,
          }}>
            {noData ? "Sin saldos hoy — ingresa en Google Sheets"
             : semCubierta ? "Semana cubierta"
             : `Faltan ${f(faltaSem)} esta semana`}
          </span>
        </div>

        {/* HÉROE: Saldo hoy */}
        <div style={{
          background: C.surface, borderRadius: 12,
          padding: "18px 18px 16px",
          border: `0.5px solid ${C.border}`,
        }}
          onClick={() => onGoTab && onGoTab(1)}
        >
          <div style={{
            fontSize: 11, color: C.tm,
            textTransform: "uppercase", letterSpacing: "0.5px",
            marginBottom: 4,
          }}>Saldo bancos hoy</div>
          <div style={{
            fontSize: 30, fontWeight: 600,
            fontFamily: "monospace", letterSpacing: "-0.5px",
            color: saldoAct > 0 ? C.text : C.td,
            lineHeight: 1.1,
          }}>
            {saldoAct > 0 ? f(saldoAct) : "Sin datos"}
          </div>
          {deltaHoyAyer !== null && (
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 6 }}>
              <span style={{
                fontSize: 12, fontWeight: 500,
                color: deltaHoyAyer >= 0 ? C.green : C.red,
              }}>
                {deltaHoyAyer >= 0 ? "+" : ""}{fS(deltaHoyAyer)}
              </span>
              <span style={{ fontSize: 11, color: C.td }}>vs {fd(fechaAyer)}</span>
              <span style={{ marginLeft: "auto", fontSize: 11, color: C.accent }}>Ver →</span>
            </div>
          )}
        </div>

        {/* Alerta más urgente */}
        {alertas.length > 0 && (() => {
          const a = alertas[0];
          const col = colorAlerta(a.tipo);
          return (
            <div
              onClick={() => onGoTab && onGoTab(8)}
              style={{
                background: col.bg, border: `0.5px solid ${col.border}`,
                borderRadius: 10, padding: "12px 14px",
                display: "flex", gap: 10, alignItems: "center",
              }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: col.text + "22",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, fontSize: 15,
              }}>{a.icono}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, color: col.text,
                  textTransform: "uppercase", letterSpacing: "0.3px",
                }}>
                  {a.tipo === "urgente" ? "Urgente" : a.tipo === "atencion" ? "Atención" : "Info"}
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: C.text, marginTop: 1 }}>
                  {a.titulo}
                </div>
                <div style={{
                  fontSize: 11, color: C.tm, marginTop: 1,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{a.mensaje}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 600, color: col.text, lineHeight: 1 }}>{a.dias}</div>
                <div style={{ fontSize: 9, color: col.text, opacity: 0.7 }}>días</div>
              </div>
            </div>
          );
        })()}

        {alertas.length > 1 && (
          <div
            onClick={() => onGoTab && onGoTab(8)}
            style={{
              padding: "8px 14px", borderRadius: 8,
              background: C.surfaceAlt,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
            <span style={{ fontSize: 12, color: C.tm }}>
              +{alertas.length - 1} alerta{alertas.length - 1 !== 1 ? "s" : ""} más
            </span>
            <span style={{ fontSize: 11, color: C.accent, fontWeight: 500 }}>Ver todas →</span>
          </div>
        )}

        {/* Métricas DAP + FFMM 2x1 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div
            onClick={() => onGoTab && onGoTab(4)}
            style={{
              background: C.surface, borderRadius: 10,
              padding: "12px 14px", border: `0.5px solid ${C.border}`,
            }}>
            <div style={{
              fontSize: 10, color: C.tm, marginBottom: 4,
              textTransform: "uppercase", letterSpacing: "0.5px",
            }}>En DAP</div>
            <div style={{
              fontSize: 18, fontWeight: 600, color: C.amber,
              fontFamily: "monospace", lineHeight: 1.2,
            }}>{fS(totalDAP)}</div>
            <div style={{ fontSize: 10, color: C.td, marginTop: 2 }}>
              {dapsV.length} vigentes
            </div>
          </div>
          <div
            onClick={() => onGoTab && onGoTab(5)}
            style={{
              background: C.surface, borderRadius: 10,
              padding: "12px 14px", border: `0.5px solid ${C.border}`,
            }}>
            <div style={{
              fontSize: 10, color: C.tm, marginBottom: 4,
              textTransform: "uppercase", letterSpacing: "0.5px",
            }}>Fondos mutuos</div>
            <div style={{
              fontSize: 18, fontWeight: 600, color: C.purple,
              fontFamily: "monospace", lineHeight: 1.2,
            }}>{fS(totalFFMMAct > 0 ? totalFFMMAct : totalFFMMInv)}</div>
            {totalGanFFMM > 0 && (
              <div style={{ fontSize: 10, color: C.green, marginTop: 2 }}>+{fS(totalGanFFMM)}</div>
            )}
          </div>
        </div>

        {/* Cobertura mes actual */}
        <div
          onClick={() => onGoTab && onGoTab(2)}
          style={{
            background: C.surface, borderRadius: 10,
            padding: "14px 16px", border: `0.5px solid ${C.border}`,
          }}>
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "baseline", marginBottom: 8,
          }}>
            <div style={{
              fontSize: 11, color: C.tm,
              textTransform: "uppercase", letterSpacing: "0.5px",
            }}>{mesLabelAct} cubierto</div>
            <div style={{ fontSize: 11, color: C.td }}>
              {fS(guarMes)} / {fS(compMes)}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              flex: 1, height: 8, background: C.surfaceAlt,
              borderRadius: 4, overflow: "hidden",
            }}>
              <div style={{
                width: `${Math.min(pctMes * 100, 100)}%`, height: "100%",
                background: pctMes >= 0.9 ? C.green : pctMes >= 0.5 ? C.amber : C.red,
                borderRadius: 4,
              }}/>
            </div>
            <span style={{
              fontSize: 14, fontWeight: 600,
              color: pctMes >= 0.9 ? C.green : pctMes >= 0.5 ? C.amberT : C.red,
            }}>{Math.round(pctMes * 100)}%</span>
          </div>
        </div>

        {/* Próximos compromisos */}
        <div style={{
          background: C.surface, borderRadius: 10,
          padding: "14px 16px", border: `0.5px solid ${C.border}`,
        }}>
          <div style={{
            fontSize: 11, color: C.tm, marginBottom: 10,
            textTransform: "uppercase", letterSpacing: "0.5px",
          }}>Próximos compromisos</div>
          {proxComp.length === 0 ? (
            <div style={{ fontSize: 12, color: C.td, fontStyle: "italic" }}>Sin compromisos próximos</div>
          ) : proxComp.map((c, i) => {
            const d = dd(hoy, c.fecha);
            const ok = c.falta === 0;
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "7px 0",
                borderTop: i > 0 ? `0.5px solid ${C.border}` : "none",
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: ok ? C.green : C.amber, flexShrink: 0,
                }}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, color: C.text,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{c.concepto}</div>
                  <div style={{ fontSize: 11, color: ok ? C.td : C.amberT }}>
                    {d === 0 ? "hoy" : d === 1 ? "mañana" : `en ${d}d`}
                    {!ok && ` · falta ${fS(c.falta)}`}
                  </div>
                </div>
                <div style={{
                  fontSize: 13, fontWeight: 500,
                  fontFamily: "monospace",
                  color: ok ? C.green : C.text,
                }}>{fS(c.monto)}</div>
              </div>
            );
          })}
        </div>

        {/* Saldos por banco */}
        {Object.keys(ultimo).length > 0 && (
          <div
            onClick={() => onGoTab && onGoTab(1)}
            style={{
              background: C.surface, borderRadius: 10,
              padding: "14px 16px", border: `0.5px solid ${C.border}`,
            }}>
            <div style={{
              fontSize: 11, color: C.tm, marginBottom: 10,
              textTransform: "uppercase", letterSpacing: "0.5px",
            }}>Saldos por banco</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {Object.entries(ultimo).map(([b, s]) => {
                const ayerBanco = ultimoAyer[b];
                const diff = ayerBanco != null ? s - ayerBanco : null;
                return (
                  <div key={b} style={{
                    background: C.surfaceAlt, borderRadius: 8,
                    padding: "10px 12px",
                  }}>
                    <div style={{ fontSize: 10, color: C.tm, marginBottom: 2 }}>{b}</div>
                    <div style={{
                      fontSize: 15, fontWeight: 600, color: C.text,
                      fontFamily: "monospace",
                    }}>{fS(s)}</div>
                    {diff !== null && diff !== 0 && (
                      <div style={{
                        fontSize: 10,
                        color: diff > 0 ? C.green : C.red,
                      }}>{diff > 0 ? "+" : ""}{fS(diff)}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Próximos DAPs a vencer (secundario) */}
        {proxDAP.length > 0 && (
          <div
            onClick={() => onGoTab && onGoTab(4)}
            style={{
              background: C.surface, borderRadius: 10,
              padding: "14px 16px", border: `0.5px solid ${C.border}`,
            }}>
            <div style={{
              fontSize: 11, color: C.tm, marginBottom: 10,
              textTransform: "uppercase", letterSpacing: "0.5px",
            }}>DAPs próximos a vencer</div>
            {proxDAP.slice(0, 3).map((d, i) => {
              const dias = dd(hoy, d.vencimiento);
              const tc = colorTipo(clas(d.tipo), C);
              return (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "7px 0",
                  borderTop: i > 0 ? `0.5px solid ${C.border}` : "none",
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: tc.color, flexShrink: 0,
                  }}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, color: C.text,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{d.comentario || `DAP ${d.banco}`}</div>
                    <div style={{ fontSize: 11, color: C.td }}>
                      vence {fd(d.vencimiento)} · {dias === 1 ? "mañana" : `en ${dias}d`}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{
                      fontSize: 13, fontWeight: 500,
                      color: C.text, fontFamily: "monospace",
                    }}>{fS(d.montoInicial)}</div>
                    <div style={{ fontSize: 10, color: C.green }}>+{fS(d.ganancia)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ height: 20 }}/>
      </div>
    );
  }

  // ─── LAYOUT DESKTOP ───────────────────────────────────────────────────────
  return (
    <div>
      {/* Banner */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        marginBottom: alertas.length > 0 ? 8 : 14,
        padding: "8px 12px", borderRadius: 8,
        background: noData ? C.amberD : semCubierta ? C.greenD : C.amberD,
        border: `0.5px solid ${noData ? C.amber + "44" : semCubierta ? C.green + "44" : C.amber + "44"}`,
      }}>
        <span style={{ fontSize: 14 }}>{noData ? "○" : semCubierta ? "●" : "◐"}</span>
        <span style={{
          fontSize: 13, fontWeight: 500,
          color: noData ? C.amberT : semCubierta ? C.greenT : C.amberT,
        }}>
          {noData ? "Sin movimientos bancarios hoy — ingresa los saldos en Google Sheets"
           : semCubierta ? "Semana cubierta — compromisos al día"
           : `Faltan ${f(faltaSem)} para cubrir la semana`}
        </span>
      </div>

      {/* Alertas top 3 */}
      {alertas.length > 0 && (
        <div style={{ marginBottom: 14, display: "flex", flexDirection: "column", gap: 4 }}>
          {alertas.slice(0, 3).map((a, i) => {
            const col = colorAlerta(a.tipo);
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 12px", borderRadius: 8,
                background: col.bg, border: `0.5px solid ${col.border}`,
              }}>
                <span style={{ fontSize: 13 }}>{a.icono}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{
                    fontSize: 12, fontWeight: 600,
                    color: col.text, marginRight: 8,
                  }}>{a.titulo.toUpperCase()}</span>
                  <span style={{ fontSize: 12, color: C.tm }}>{a.mensaje}</span>
                </div>
              </div>
            );
          })}
          {alertas.length > 3 && (
            <div style={{ fontSize: 11, color: C.td, paddingLeft: 12 }}>
              +{alertas.length - 3} alertas más — ver pestaña Alertas
            </div>
          )}
        </div>
      )}

      {/* Métricas principales */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{
          background: C.surface, borderRadius: 10,
          padding: "18px 20px", border: `0.5px solid ${C.border}`,
          flex: 2, minWidth: 280,
        }}>
          <div style={{
            fontSize: 11, color: C.tm, marginBottom: 6,
            textTransform: "uppercase", letterSpacing: "0.5px",
          }}>Saldo cuentas hoy</div>
          <div style={{
            fontSize: 30, fontWeight: 600,
            fontFamily: "monospace", letterSpacing: "-0.5px",
            color: saldoAct > 0 ? C.text : C.td, lineHeight: 1.1,
          }}>{saldoAct > 0 ? f(saldoAct) : "Sin datos"}</div>
          {deltaHoyAyer !== null ? (
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 6 }}>
              <span style={{
                fontSize: 12, fontWeight: 500,
                color: deltaHoyAyer >= 0 ? C.green : C.red,
              }}>{deltaHoyAyer >= 0 ? "+" : ""}{fS(deltaHoyAyer)}</span>
              <span style={{ fontSize: 11, color: C.td }}>vs {fd(fechaAyer)}</span>
            </div>
          ) : totalIni > 0 && (
            <div style={{ fontSize: 11, color: C.td, marginTop: 6 }}>Inicial: {f(totalIni)}</div>
          )}
        </div>

        <div style={{
          background: C.surface, borderRadius: 10,
          padding: "14px 16px", border: `0.5px solid ${C.border}`,
          flex: 1, minWidth: 160,
        }}>
          <div style={{
            fontSize: 11, color: C.tm, marginBottom: 4,
            textTransform: "uppercase", letterSpacing: "0.5px",
          }}>En DAP vigentes</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: C.amber, lineHeight: 1.2 }}>
            {f(totalDAP)}
          </div>
          <div style={{ fontSize: 11, color: C.td, marginTop: 3 }}>
            {trab.length} trabajo · {inv.length} inv · {cred.length} cred
          </div>
        </div>

        <div style={{
          background: C.surface, borderRadius: 10,
          padding: "14px 16px", border: `0.5px solid ${C.border}`,
          flex: 1, minWidth: 160,
        }}>
          <div style={{
            fontSize: 11, color: C.tm, marginBottom: 4,
            textTransform: "uppercase", letterSpacing: "0.5px",
          }}>Fondos mutuos</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: C.purple, lineHeight: 1.2 }}>
            {totalFFMMAct > 0 ? f(totalFFMMAct) : f(totalFFMMInv)}
          </div>
          {totalGanFFMM > 0 && (
            <div style={{ fontSize: 11, color: C.green, marginTop: 3 }}>
              +{fS(totalGanFFMM)} rentabilidad
            </div>
          )}
        </div>

        <div style={{
          background: C.surface, borderRadius: 10,
          padding: "14px 16px", border: `0.5px solid ${C.border}`,
          flex: 1, minWidth: 160,
        }}>
          <div style={{
            fontSize: 11, color: C.tm, marginBottom: 4,
            textTransform: "uppercase", letterSpacing: "0.5px",
          }}>{mesLabelAct} cubierto</div>
          <div style={{
            fontSize: 22, fontWeight: 600, lineHeight: 1.2,
            color: pctMes >= 0.9 ? C.green : pctMes >= 0.5 ? C.amberT : C.red,
          }}>{Math.round(pctMes * 100)}%</div>
          <div style={{ fontSize: 11, color: C.td, marginTop: 3 }}>
            {fS(guarMes)} de {fS(compMes)}
          </div>
        </div>
      </div>

      {/* Leasing + Crédito */}
      {leasingDetalle.length > 0 && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          <div style={{
            background: C.surface, borderRadius: 10,
            padding: "14px 16px", border: `0.5px solid ${C.border}`,
            flex: 2, minWidth: 260,
          }}>
            <div style={{
              fontSize: 11, color: C.tm, marginBottom: 10,
              textTransform: "uppercase", letterSpacing: "0.5px",
            }}>
              Leasing · {leasingDetalle.length} contratos · {totalDeudaLeasingUF.toLocaleString("es-CL",{minimumFractionDigits:2,maximumFractionDigits:2})} UF
            </div>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 11, color: C.td, marginBottom: 2 }}>Cuota mensual c/IVA</div>
                <div style={{
                  fontSize: 18, fontWeight: 700, color: C.amber,
                  fontFamily: "monospace",
                }}>{f(cuotaTotalLeasing)}</div>
              </div>
              <div style={{ borderLeft: `0.5px solid ${C.border}`, paddingLeft: 16 }}>
                <div style={{ fontSize: 11, color: C.td, marginBottom: 2 }}>Deuda s/IVA</div>
                <div style={{
                  fontSize: 18, fontWeight: 600, color: C.teal,
                  fontFamily: "monospace",
                }}>{f(deudaLeasingSIVACLP)}</div>
              </div>
            </div>
          </div>
          {saldoInsoluto > 0 && (
            <div style={{
              background: C.surface, borderRadius: 10,
              padding: "14px 16px", border: `0.5px solid ${C.border}`,
              flex: 1, minWidth: 180,
            }}>
              <div style={{
                fontSize: 11, color: C.tm, marginBottom: 6,
                textTransform: "uppercase", letterSpacing: "0.5px",
              }}>Crédito comercial</div>
              <div style={{
                fontSize: 20, fontWeight: 700, color: C.red,
                fontFamily: "monospace",
              }}>{f(saldoInsoluto)}</div>
              <div style={{ fontSize: 11, color: C.td, marginTop: 4 }}>
                {creditoPendiente.length} cuotas pendientes
              </div>
            </div>
          )}
        </div>
      )}

      {/* Gráficos */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <GraficoCobertura C={C} cal={cal} hoy={hoy}/>
        <GraficoDonaDap C={C} dap={dap} clas={clas} fS={fS}/>
      </div>

      {/* Próximos compromisos + DAPs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{
          background: C.surface, borderRadius: 10,
          padding: 16, border: `0.5px solid ${C.border}`,
        }}>
          <div style={{
            fontSize: 12, color: C.tm, marginBottom: 10,
            textTransform: "uppercase",
          }}>Próximos compromisos</div>
          {proxComp.length === 0 ? (
            <div style={{ fontSize: 12, color: C.td, fontStyle: "italic" }}>Sin compromisos próximos</div>
          ) : proxComp.map((c, i) => {
            const d = dd(hoy, c.fecha);
            const ok = c.falta === 0;
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "7px 0",
                borderBottom: i < proxComp.length - 1 ? `0.5px solid ${C.border}` : "none",
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: ok ? C.green : C.amber, flexShrink: 0,
                }}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, color: C.text,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{c.concepto}</div>
                  <div style={{ fontSize: 11, color: C.td }}>
                    {fdf(c.fecha)} · {d === 0 ? "hoy" : d === 1 ? "mañana" : `en ${d}d`}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 500,
                    color: ok ? C.green : C.text,
                  }}>{fS(c.monto)}</div>
                  {!ok && <div style={{ fontSize: 10, color: C.red }}>Falta {fS(c.falta)}</div>}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{
          background: C.surface, borderRadius: 10,
          padding: 16, border: `0.5px solid ${C.border}`,
        }}>
          <div style={{
            fontSize: 12, color: C.tm, marginBottom: 10,
            textTransform: "uppercase",
          }}>DAPs próximos a vencer</div>
          {proxDAP.length === 0 ? (
            <div style={{ fontSize: 12, color: C.td, fontStyle: "italic" }}>Sin DAPs por vencer</div>
          ) : proxDAP.map((d, i) => {
            const dias = dd(hoy, d.vencimiento);
            const tc = colorTipo(clas(d.tipo), C);
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "7px 0",
                borderBottom: i < proxDAP.length - 1 ? `0.5px solid ${C.border}` : "none",
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: tc.color, flexShrink: 0,
                }}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, color: C.text,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{d.comentario || `DAP ${d.banco}`}</div>
                  <div style={{ fontSize: 11, color: C.td }}>
                    Vence {fdf(d.vencimiento)} · {dias === 1 ? "mañana" : `en ${dias}d`}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 500, color: C.text,
                  }}>{fS(d.montoInicial)}</div>
                  <div style={{ fontSize: 10, color: C.green }}>+{fS(d.ganancia)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Saldos por banco desktop */}
      {Object.keys(ultimo).length > 0 && (
        <div style={{
          marginTop: 12, background: C.surface, borderRadius: 10,
          padding: 16, border: `0.5px solid ${C.border}`,
        }}>
          <div style={{
            fontSize: 12, color: C.tm, marginBottom: 10,
            textTransform: "uppercase",
          }}>Saldos por banco hoy</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {Object.entries(ultimo).map(([b, s]) => {
              const ayerBanco = ultimoAyer[b];
              const diff = ayerBanco != null ? s - ayerBanco : null;
              return (
                <div key={b} style={{
                  flex: 1, minWidth: 120,
                  padding: "10px 12px", borderRadius: 8,
                  background: C.surfaceAlt,
                }}>
                  <div style={{ fontSize: 11, color: C.tm, marginBottom: 2 }}>{b}</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: C.text }}>{fS(s)}</div>
                  {diff !== null && diff !== 0 && (
                    <div style={{ fontSize: 11, color: diff > 0 ? C.green : C.red }}>
                      {diff > 0 ? "+" : ""}{fS(diff)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
