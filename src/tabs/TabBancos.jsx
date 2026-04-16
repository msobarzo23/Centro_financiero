import { useState, useEffect } from 'react';
import { f, fS, fd } from '../utils/format.js';

export default function TabBancos({ C, bancos, isMobile }) {
  const fechas = [...new Set(bancos.map(b => b.fecha))].sort().reverse();
  const [fechaSel, setFechaSel] = useState(fechas[0] || "");
  const [bancoSel, setBancoSel] = useState("TODOS");

  useEffect(() => {
    if (fechas[0] && !fechaSel) setFechaSel(fechas[0]);
  }, [fechas.join(',')]);

  const movs = bancos.filter(b => b.fecha === fechaSel && (bancoSel === "TODOS" || b.banco === bancoSel));
  const bancosUniq = [...new Set(bancos.filter(b => b.fecha === fechaSel).map(b => b.banco))];

  // Resumen del día seleccionado: saldo final por banco + delta vs día anterior
  const finalesDia = {};
  bancos.filter(b => b.fecha === fechaSel).forEach(b => {
    if (b.saldoFinal != null) finalesDia[b.banco] = b.saldoFinal;
  });

  const fechaAnterior = fechas[fechas.indexOf(fechaSel) + 1];
  const finalesAyer = {};
  if (fechaAnterior) {
    bancos.filter(b => b.fecha === fechaAnterior).forEach(b => {
      if (b.saldoFinal != null) finalesAyer[b.banco] = b.saldoFinal;
    });
  }

  const totalDia = Object.values(finalesDia).reduce((s, v) => s + v, 0);
  const totalAyer = Object.values(finalesAyer).reduce((s, v) => s + v, 0);
  const deltaTotal = totalAyer > 0 ? totalDia - totalAyer : null;

  // Formato amigable de fecha
  const fechaLarga = fechaSel
    ? new Date(fechaSel + "T12:00:00").toLocaleDateString("es-CL", {
        weekday: "long", day: "2-digit", month: "long", year: "numeric",
      })
    : "";

  const esHoy = fechaSel === new Date().toLocaleDateString("en-CA");

  // Colores para descripción
  const tagColor = (desc) => {
    if (desc === "Saldo Inicial") return { bg: C.accentD, color: C.accent };
    if (desc.includes("DAP")) return { bg: C.amberD, color: C.amber };
    return { bg: "transparent", color: C.text };
  };

  // ─── MOBILE ─────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Selector de fecha compacto */}
        <div style={{
          background: C.surface, borderRadius: 10,
          padding: "12px 14px", border: `0.5px solid ${C.border}`,
        }}>
          <div style={{
            fontSize: 10, color: C.tm, marginBottom: 4,
            textTransform: "uppercase", letterSpacing: "0.5px",
          }}>Fecha</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <select
              value={fechaSel}
              onChange={e => { setFechaSel(e.target.value); setBancoSel("TODOS"); }}
              style={{
                flex: 1, padding: "8px 10px", borderRadius: 8,
                fontSize: 14, background: C.surfaceAlt, color: C.text,
                border: `0.5px solid ${C.border}`,
                textTransform: "capitalize",
              }}>
              {fechas.map(f => (
                <option key={f} value={f}>
                  {new Date(f + "T12:00:00").toLocaleDateString("es-CL", {
                    weekday: "short", day: "2-digit", month: "short", year: "numeric",
                  })}
                </option>
              ))}
            </select>
            {esHoy && (
              <span style={{
                padding: "4px 10px", borderRadius: 6,
                fontSize: 10, fontWeight: 600,
                background: C.greenD, color: C.greenT,
                textTransform: "uppercase", letterSpacing: "0.5px",
              }}>Hoy</span>
            )}
          </div>
        </div>

        {/* Saldo total del día */}
        {Object.keys(finalesDia).length > 0 && (
          <div style={{
            background: C.surface, borderRadius: 12,
            padding: "18px 18px 14px",
            border: `0.5px solid ${C.border}`,
          }}>
            <div style={{
              fontSize: 11, color: C.tm, marginBottom: 4,
              textTransform: "uppercase", letterSpacing: "0.5px",
            }}>Total {esHoy ? "hoy" : "del día"}</div>
            <div style={{
              fontSize: 30, fontWeight: 600, color: C.text,
              fontFamily: "monospace", letterSpacing: "-0.5px",
              lineHeight: 1.1,
            }}>{f(totalDia)}</div>
            {deltaTotal !== null && (
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 6 }}>
                <span style={{
                  fontSize: 12, fontWeight: 500,
                  color: deltaTotal >= 0 ? C.green : C.red,
                }}>{deltaTotal >= 0 ? "+" : ""}{fS(deltaTotal)}</span>
                <span style={{ fontSize: 11, color: C.td }}>vs {fd(fechaAnterior)}</span>
              </div>
            )}
          </div>
        )}

        {/* Tarjetas por banco */}
        {Object.keys(finalesDia).length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{
              fontSize: 11, color: C.tm, paddingLeft: 4,
              textTransform: "uppercase", letterSpacing: "0.5px",
            }}>Saldos por banco</div>
            {Object.entries(finalesDia).map(([banco, saldo]) => {
              const ayer = finalesAyer[banco];
              const diff = ayer != null ? saldo - ayer : null;
              return (
                <div key={banco} style={{
                  background: C.surface, borderRadius: 10,
                  padding: "14px 16px", border: `0.5px solid ${C.border}`,
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <div>
                    <div style={{
                      fontSize: 13, fontWeight: 600, color: C.text,
                      marginBottom: 2,
                    }}>{banco}</div>
                    {diff !== null && diff !== 0 && (
                      <div style={{
                        fontSize: 11, color: diff > 0 ? C.green : C.red,
                      }}>{diff > 0 ? "+" : ""}{fS(diff)} vs {fd(fechaAnterior)}</div>
                    )}
                    {diff === 0 && (
                      <div style={{ fontSize: 11, color: C.td }}>sin cambio</div>
                    )}
                    {diff === null && (
                      <div style={{ fontSize: 11, color: C.td }}>sin comparación</div>
                    )}
                  </div>
                  <div style={{
                    fontSize: 18, fontWeight: 600, color: C.text,
                    fontFamily: "monospace",
                  }}>{fS(saldo)}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Filtro por banco (solo si hay >1) */}
        {bancosUniq.length > 1 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
            {["TODOS", ...bancosUniq].map(b => (
              <button key={b} onClick={() => setBancoSel(b)}
                style={{
                  padding: "6px 12px", borderRadius: 14,
                  fontSize: 11, fontWeight: 500,
                  background: bancoSel === b ? C.accent : C.surfaceAlt,
                  color: bancoSel === b ? "#fff" : C.tm,
                  border: `0.5px solid ${bancoSel === b ? C.accent : C.border}`,
                  cursor: "pointer",
                }}>{b}</button>
            ))}
          </div>
        )}

        {/* Lista de movimientos */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{
            fontSize: 11, color: C.tm, paddingLeft: 4,
            textTransform: "uppercase", letterSpacing: "0.5px",
          }}>Movimientos</div>
          {movs.length === 0 ? (
            <div style={{
              padding: 20, textAlign: "center", color: C.td,
              background: C.surface, borderRadius: 10,
              border: `0.5px solid ${C.border}`, fontSize: 13,
            }}>Sin movimientos para esta fecha</div>
          ) : movs.map((m, i) => {
            const tag = tagColor(m.descripcion);
            return (
              <div key={i} style={{
                background: C.surface, borderRadius: 10,
                padding: "12px 14px", border: `0.5px solid ${C.border}`,
              }}>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  marginBottom: 6,
                }}>
                  <span style={{
                    padding: "2px 8px", borderRadius: 4,
                    fontSize: 10, fontWeight: 500,
                    background: tag.bg, color: tag.color,
                    textTransform: "uppercase", letterSpacing: "0.3px",
                  }}>{m.descripcion || "—"}</span>
                  <span style={{ fontSize: 11, color: C.tm }}>{m.banco}</span>
                </div>

                <div style={{
                  display: "flex", alignItems: "baseline", justifyContent: "space-between",
                  marginBottom: m.comentario ? 6 : 0,
                }}>
                  <div>
                    {m.monto != null && (
                      <div style={{
                        fontSize: 16, fontWeight: 600,
                        fontFamily: "monospace",
                        color: m.monto < 0 ? C.red : C.green,
                      }}>{m.monto > 0 ? "+" : ""}{fS(m.monto)}</div>
                    )}
                  </div>
                  {m.saldoFinal != null && (
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 10, color: C.td }}>Saldo</div>
                      <div style={{
                        fontSize: 13, fontWeight: 500, color: C.text,
                        fontFamily: "monospace",
                      }}>{fS(m.saldoFinal)}</div>
                    </div>
                  )}
                </div>

                {m.comentario && (
                  <div style={{ fontSize: 11, color: C.td }}>{m.comentario}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── DESKTOP ─────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div style={{
        display: "flex", gap: 10, marginBottom: 14,
        alignItems: "center", flexWrap: "wrap",
      }}>
        <select
          value={fechaSel}
          onChange={e => { setFechaSel(e.target.value); setBancoSel("TODOS"); }}
          style={{
            padding: "8px 14px", borderRadius: 8, fontSize: 13,
            background: C.surfaceAlt, color: C.text,
            border: `0.5px solid ${C.border}`,
          }}>
          {fechas.map(f => (
            <option key={f} value={f}>
              {new Date(f + "T12:00:00").toLocaleDateString("es-CL", {
                weekday: "short", day: "2-digit", month: "short", year: "numeric",
              })}
            </option>
          ))}
        </select>
        {esHoy && (
          <span style={{
            padding: "5px 12px", borderRadius: 6,
            fontSize: 11, fontWeight: 600,
            background: C.greenD, color: C.greenT,
            textTransform: "uppercase", letterSpacing: "0.5px",
          }}>Hoy</span>
        )}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginLeft: "auto" }}>
          {["TODOS", ...bancosUniq].map(b => (
            <button key={b} onClick={() => setBancoSel(b)}
              style={{
                padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 500,
                background: bancoSel === b ? C.accent : C.surfaceAlt,
                color: bancoSel === b ? "#fff" : C.tm,
                border: `0.5px solid ${bancoSel === b ? C.accent : C.border}`,
                cursor: "pointer",
              }}>{b}</button>
          ))}
        </div>
      </div>

      {/* Resumen */}
      {Object.keys(finalesDia).length > 0 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <div style={{
            background: C.surface, borderRadius: 10,
            padding: "14px 18px", border: `0.5px solid ${C.border}`,
            flex: 1, minWidth: 220,
          }}>
            <div style={{
              fontSize: 11, color: C.tm, marginBottom: 4,
              textTransform: "uppercase", letterSpacing: "0.5px",
            }}>Total del día</div>
            <div style={{
              fontSize: 24, fontWeight: 600, color: C.text,
              fontFamily: "monospace",
            }}>{f(totalDia)}</div>
            {deltaTotal !== null && (
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}>
                <span style={{
                  fontSize: 12, fontWeight: 500,
                  color: deltaTotal >= 0 ? C.green : C.red,
                }}>{deltaTotal >= 0 ? "+" : ""}{fS(deltaTotal)}</span>
                <span style={{ fontSize: 11, color: C.td }}>vs {fd(fechaAnterior)}</span>
              </div>
            )}
          </div>
          {Object.entries(finalesDia).map(([banco, saldo]) => {
            const ayer = finalesAyer[banco];
            const diff = ayer != null ? saldo - ayer : null;
            return (
              <div key={banco} style={{
                background: C.surface, borderRadius: 10,
                padding: "14px 16px", border: `0.5px solid ${C.border}`,
                flex: 1, minWidth: 140,
              }}>
                <div style={{ fontSize: 11, color: C.tm, marginBottom: 4 }}>{banco}</div>
                <div style={{
                  fontSize: 18, fontWeight: 600, color: C.text,
                  fontFamily: "monospace",
                }}>{fS(saldo)}</div>
                {diff !== null && diff !== 0 && (
                  <div style={{ fontSize: 11, color: diff > 0 ? C.green : C.red, marginTop: 2 }}>
                    {diff > 0 ? "+" : ""}{fS(diff)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tabla */}
      <div style={{
        background: C.surface, borderRadius: 10,
        border: `0.5px solid ${C.border}`, overflow: "hidden",
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `0.5px solid ${C.borderL}` }}>
              {["Banco", "Descripción", "Monto", "Saldo", "Comentario"].map(h => (
                <th key={h} style={{
                  padding: "10px 12px", textAlign: "left", fontSize: 11,
                  color: C.td, fontWeight: 500, textTransform: "uppercase",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {movs.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 20, textAlign: "center", color: C.td }}>
                Sin movimientos para esta fecha
              </td></tr>
            ) : movs.map((m, i) => {
              const tag = tagColor(m.descripcion);
              return (
                <tr key={i} style={{ borderBottom: `0.5px solid ${C.border}` }}>
                  <td style={{ padding: "8px 12px", color: C.tm, fontSize: 12 }}>{m.banco}</td>
                  <td style={{ padding: "8px 12px" }}>
                    <span style={{
                      padding: "2px 8px", borderRadius: 4, fontSize: 11,
                      background: tag.bg, color: tag.color,
                    }}>{m.descripcion}</span>
                  </td>
                  <td style={{
                    padding: "8px 12px", fontWeight: 500,
                    color: m.monto == null ? C.td : m.monto < 0 ? C.red : C.green,
                    fontFamily: "monospace",
                  }}>{m.monto != null ? `${m.monto > 0 ? "+" : ""}${fS(m.monto)}` : "—"}</td>
                  <td style={{
                    padding: "8px 12px", fontWeight: 500, color: C.text,
                    fontFamily: "monospace",
                  }}>{m.saldoFinal != null ? fS(m.saldoFinal) : "—"}</td>
                  <td style={{ padding: "8px 12px", color: C.td, fontSize: 12 }}>{m.comentario || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
