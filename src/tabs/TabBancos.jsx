import { useState, useEffect } from 'react';
import { f, fS, fd } from '../utils/format.js';
import { S, W, R, SP } from '../utils/theme.js';
import { Card, Eyebrow } from '../components/common.jsx';

export default function TabBancos({ C, bancos, isMobile }) {
  const fechas = [...new Set(bancos.map(b => b.fecha))].sort().reverse();
  const [fechaSel, setFechaSel] = useState(fechas[0] || "");
  const [bancoSel, setBancoSel] = useState("TODOS");

  useEffect(() => {
    if (fechas[0] && !fechaSel) setFechaSel(fechas[0]);
  }, [fechas.join(',')]);

  const movs = bancos.filter(b => b.fecha === fechaSel && (bancoSel === "TODOS" || b.banco === bancoSel));
  const bancosUniq = [...new Set(bancos.filter(b => b.fecha === fechaSel).map(b => b.banco))];

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

  const esHoy = fechaSel === new Date().toLocaleDateString("en-CA");

  const tagColor = (desc) => {
    if (desc === "Saldo Inicial") return { bg: C.accentD, color: C.accent };
    if (desc && desc.includes("DAP")) return { bg: C.amberD, color: C.amber };
    return { bg: "transparent", color: C.text };
  };

  const MONO = "'SF Mono', ui-monospace, Menlo, Consolas, monospace";

  // Select y pill "Hoy" reusados
  const DateSelect = ({ style }) => (
    <select
      value={fechaSel}
      onChange={e => { setFechaSel(e.target.value); setBancoSel("TODOS"); }}
      style={{
        padding: `${SP.sm}px ${SP.md}px`,
        borderRadius: R.md,
        fontSize: S.base,
        fontWeight: W.m,
        background: C.surfaceAlt,
        color: C.text,
        border: `1px solid ${C.border}`,
        cursor: "pointer",
        ...(style || {}),
      }}
    >
      {fechas.map(f => (
        <option key={f} value={f}>
          {new Date(f + "T12:00:00").toLocaleDateString("es-CL", {
            weekday: "short", day: "2-digit", month: "short", year: "numeric",
          })}
        </option>
      ))}
    </select>
  );

  const HoyPill = () => esHoy && (
    <span
      style={{
        padding: `${SP.xs}px ${SP.md}px`,
        borderRadius: R.md,
        fontSize: S.xxs,
        fontWeight: W.b,
        background: C.greenD,
        color: C.greenT,
        textTransform: "uppercase",
        letterSpacing: "0.6px",
      }}
    >
      Hoy
    </span>
  );

  const BancoChip = ({ banco, active }) => (
    <button
      key={banco}
      onClick={() => setBancoSel(banco)}
      style={{
        padding: `${SP.xs}px ${SP.md}px`,
        borderRadius: R.xl,
        fontSize: S.sm,
        fontWeight: W.sb,
        background: active ? C.accent : C.surfaceAlt,
        color: active ? "#fff" : C.tm,
        border: `1px solid ${active ? C.accent : C.border}`,
        cursor: "pointer",
        transition: "all 120ms ease",
      }}
    >
      {banco}
    </button>
  );

  // ─── MOBILE ─────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: SP.md }}>
        <Card C={C} pad="sm">
          <Eyebrow C={C} style={{ marginBottom: SP.xs }}>Fecha</Eyebrow>
          <div style={{ display: "flex", alignItems: "center", gap: SP.sm }}>
            <DateSelect style={{ flex: 1, textTransform: "capitalize" }} />
            <HoyPill />
          </div>
        </Card>

        {Object.keys(finalesDia).length > 0 && (
          <Card C={C} pad="lg">
            <Eyebrow C={C}>Total {esHoy ? "hoy" : "del día"}</Eyebrow>
            <div
              style={{
                fontSize: S.xl4,
                fontWeight: W.sb,
                color: C.text,
                fontFamily: MONO,
                letterSpacing: "-1px",
                lineHeight: 1.1,
              }}
            >
              {f(totalDia)}
            </div>
            {deltaTotal !== null && (
              <div style={{ display: "flex", gap: SP.sm, alignItems: "center", marginTop: SP.sm }}>
                <span
                  style={{
                    fontSize: S.sm, fontWeight: W.sb,
                    color: deltaTotal >= 0 ? C.green : C.red,
                  }}
                >
                  {deltaTotal >= 0 ? "+" : ""}{fS(deltaTotal)}
                </span>
                <span style={{ fontSize: S.xs, color: C.td, fontWeight: W.m }}>
                  vs {fd(fechaAnterior)}
                </span>
              </div>
            )}
          </Card>
        )}

        {Object.keys(finalesDia).length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: SP.sm }}>
            <Eyebrow C={C} style={{ paddingLeft: SP.xs, marginBottom: 0 }}>
              Saldos por banco
            </Eyebrow>
            {Object.entries(finalesDia).map(([banco, saldo]) => {
              const ayer = finalesAyer[banco];
              const diff = ayer != null ? saldo - ayer : null;
              return (
                <Card
                  key={banco}
                  C={C}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ fontSize: S.base, fontWeight: W.sb, color: C.text, marginBottom: 2 }}>
                      {banco}
                    </div>
                    {diff !== null && diff !== 0 && (
                      <div style={{ fontSize: S.xs, color: diff > 0 ? C.green : C.red, fontWeight: W.sb }}>
                        {diff > 0 ? "+" : ""}{fS(diff)} vs {fd(fechaAnterior)}
                      </div>
                    )}
                    {diff === 0 && (
                      <div style={{ fontSize: S.xs, color: C.td, fontWeight: W.m }}>sin cambio</div>
                    )}
                    {diff === null && (
                      <div style={{ fontSize: S.xs, color: C.td, fontWeight: W.m }}>sin comparación</div>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: S.xl,
                      fontWeight: W.sb,
                      color: C.text,
                      fontFamily: MONO,
                      letterSpacing: "-0.3px",
                    }}
                  >
                    {fS(saldo)}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {bancosUniq.length > 1 && (
          <div style={{ display: "flex", gap: SP.xs, flexWrap: "wrap", marginTop: SP.xs }}>
            {["TODOS", ...bancosUniq].map(b => (
              <BancoChip key={b} banco={b} active={bancoSel === b} />
            ))}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: SP.xs }}>
          <Eyebrow C={C} style={{ paddingLeft: SP.xs, marginBottom: 0 }}>Movimientos</Eyebrow>
          {movs.length === 0 ? (
            <Card C={C} style={{ textAlign: "center", color: C.td, fontSize: S.base }}>
              Sin movimientos para esta fecha
            </Card>
          ) : movs.map((m, i) => {
            const tag = tagColor(m.descripcion);
            return (
              <Card key={i} C={C} pad="sm">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: SP.sm,
                  }}
                >
                  <span
                    style={{
                      padding: `2px ${SP.sm}px`,
                      borderRadius: R.sm,
                      fontSize: S.xxs,
                      fontWeight: W.sb,
                      background: tag.bg,
                      color: tag.color,
                      textTransform: "uppercase",
                      letterSpacing: "0.4px",
                    }}
                  >
                    {m.descripcion || "—"}
                  </span>
                  <span style={{ fontSize: S.xs, color: C.tm, fontWeight: W.m }}>{m.banco}</span>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    marginBottom: m.comentario ? SP.xs : 0,
                  }}
                >
                  <div>
                    {m.monto != null && (
                      <div
                        style={{
                          fontSize: S.lg,
                          fontWeight: W.sb,
                          fontFamily: MONO,
                          color: m.monto < 0 ? C.red : C.green,
                          letterSpacing: "-0.3px",
                        }}
                      >
                        {m.monto > 0 ? "+" : ""}{fS(m.monto)}
                      </div>
                    )}
                  </div>
                  {m.saldoFinal != null && (
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: S.xxs, color: C.td, fontWeight: W.m }}>Saldo</div>
                      <div
                        style={{
                          fontSize: S.base,
                          fontWeight: W.sb,
                          color: C.text,
                          fontFamily: MONO,
                        }}
                      >
                        {fS(m.saldoFinal)}
                      </div>
                    </div>
                  )}
                </div>

                {m.comentario && (
                  <div style={{ fontSize: S.xs, color: C.td, fontWeight: W.m }}>{m.comentario}</div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── DESKTOP ─────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: SP.lg }}>
      <div style={{ display: "flex", gap: SP.sm, alignItems: "center", flexWrap: "wrap" }}>
        <DateSelect />
        <HoyPill />
        <div style={{ display: "flex", gap: SP.xs, flexWrap: "wrap", marginLeft: "auto" }}>
          {["TODOS", ...bancosUniq].map(b => (
            <BancoChip key={b} banco={b} active={bancoSel === b} />
          ))}
        </div>
      </div>

      {Object.keys(finalesDia).length > 0 && (
        <div style={{ display: "flex", gap: SP.md, flexWrap: "wrap" }}>
          <Card C={C} style={{ flex: 1, minWidth: 240 }}>
            <Eyebrow C={C}>Total del día</Eyebrow>
            <div
              style={{
                fontSize: S.xl3,
                fontWeight: W.sb,
                color: C.text,
                fontFamily: MONO,
                letterSpacing: "-0.5px",
                lineHeight: 1.15,
              }}
            >
              {f(totalDia)}
            </div>
            {deltaTotal !== null && (
              <div style={{ display: "flex", gap: SP.sm, alignItems: "center", marginTop: SP.xs }}>
                <span
                  style={{
                    fontSize: S.sm, fontWeight: W.sb,
                    color: deltaTotal >= 0 ? C.green : C.red,
                  }}
                >
                  {deltaTotal >= 0 ? "+" : ""}{fS(deltaTotal)}
                </span>
                <span style={{ fontSize: S.xs, color: C.td, fontWeight: W.m }}>
                  vs {fd(fechaAnterior)}
                </span>
              </div>
            )}
          </Card>
          {Object.entries(finalesDia).map(([banco, saldo]) => {
            const ayer = finalesAyer[banco];
            const diff = ayer != null ? saldo - ayer : null;
            return (
              <Card key={banco} C={C} style={{ flex: 1, minWidth: 160 }}>
                <Eyebrow C={C}>{banco}</Eyebrow>
                <div
                  style={{
                    fontSize: S.xl,
                    fontWeight: W.sb,
                    color: C.text,
                    fontFamily: MONO,
                    letterSpacing: "-0.3px",
                  }}
                >
                  {fS(saldo)}
                </div>
                {diff !== null && diff !== 0 && (
                  <div
                    style={{
                      fontSize: S.xs,
                      color: diff > 0 ? C.green : C.red,
                      marginTop: 2,
                      fontWeight: W.sb,
                    }}
                  >
                    {diff > 0 ? "+" : ""}{fS(diff)}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <div
        style={{
          background: C.surface,
          borderRadius: R.lg,
          border: `1px solid ${C.border}`,
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: S.base }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.borderL}`, background: C.surfaceAlt }}>
              {["Banco", "Descripción", "Monto", "Saldo", "Comentario"].map(h => (
                <th
                  key={h}
                  style={{
                    padding: `${SP.md}px ${SP.md}px`,
                    textAlign: "left",
                    fontSize: S.xs,
                    color: C.tm,
                    fontWeight: W.sb,
                    textTransform: "uppercase",
                    letterSpacing: "0.6px",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {movs.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: SP.xl, textAlign: "center", color: C.td, fontSize: S.base }}>
                  Sin movimientos para esta fecha
                </td>
              </tr>
            ) : movs.map((m, i) => {
              const tag = tagColor(m.descripcion);
              return (
                <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: `${SP.sm}px ${SP.md}px`, color: C.tm, fontSize: S.sm, fontWeight: W.m }}>
                    {m.banco}
                  </td>
                  <td style={{ padding: `${SP.sm}px ${SP.md}px` }}>
                    <span
                      style={{
                        padding: `2px ${SP.sm}px`,
                        borderRadius: R.sm,
                        fontSize: S.xxs,
                        fontWeight: W.sb,
                        background: tag.bg,
                        color: tag.color,
                        textTransform: "uppercase",
                        letterSpacing: "0.4px",
                      }}
                    >
                      {m.descripcion}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: `${SP.sm}px ${SP.md}px`,
                      fontWeight: W.sb,
                      color: m.monto == null ? C.td : m.monto < 0 ? C.red : C.green,
                      fontFamily: MONO,
                    }}
                  >
                    {m.monto != null ? `${m.monto > 0 ? "+" : ""}${fS(m.monto)}` : "—"}
                  </td>
                  <td
                    style={{
                      padding: `${SP.sm}px ${SP.md}px`,
                      fontWeight: W.sb,
                      color: C.text,
                      fontFamily: MONO,
                    }}
                  >
                    {m.saldoFinal != null ? fS(m.saldoFinal) : "—"}
                  </td>
                  <td style={{ padding: `${SP.sm}px ${SP.md}px`, color: C.td, fontSize: S.sm, fontWeight: W.m }}>
                    {m.comentario || "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
