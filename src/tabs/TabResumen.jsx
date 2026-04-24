import { f, fS, fd, fdf, dd, clas, colorTipo } from '../utils/format.js';
import { S, W, R, SP, eyebrow, bigNumber } from '../utils/theme.js';
import { Card, Eyebrow, SectionTitle } from '../components/common.jsx';
import { GraficoCobertura, GraficoDonaDap } from '../components/Graficos.jsx';
import { IndicadoresCard } from '../components/Indicadores.jsx';

export default function TabResumen({
  C, bancos, dap, cal, ffmm,
  leasingDetalle, leasingResumen,
  creditoPendiente, saldoInsoluto, alertas,
  isMobile, hoy,
  onGoTab,
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
  const fechaAyer = idxHoy > 0
    ? fechasDisp[idxHoy - 1]
    : (fechasDisp.length > 0 && fechasDisp[fechasDisp.length - 1] < hoy ? fechasDisp[fechasDisp.length - 1] : null);
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

  // Banner de estado (mobile + desktop usan el mismo)
  const StatusBanner = () => (
    <div
      style={{
        display: "flex", alignItems: "center", gap: SP.sm,
        padding: `${SP.sm}px ${SP.md}px`,
        borderRadius: R.md,
        background: noData ? C.amberD : semCubierta ? C.greenD : C.amberD,
        border: `1px solid ${noData ? C.amber + "44" : semCubierta ? C.green + "44" : C.amber + "44"}`,
      }}
    >
      <span style={{ fontSize: S.md }}>
        {noData ? "○" : semCubierta ? "●" : "◐"}
      </span>
      <span
        style={{
          fontSize: S.sm, fontWeight: W.sb,
          color: noData ? C.amberT : semCubierta ? C.greenT : C.amberT,
        }}
      >
        {noData
          ? "Sin saldos hoy — ingresa en Google Sheets"
          : semCubierta
            ? "Semana cubierta — compromisos al día"
            : `Faltan ${f(faltaSem)} para cubrir la semana`}
      </span>
    </div>
  );

  // ─── LAYOUT MOBILE ────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: SP.md }}>
        <StatusBanner />

        {/* HÉROE: Saldo hoy */}
        <Card C={C} pad="lg" onClick={() => onGoTab && onGoTab(1)}>
          <Eyebrow C={C}>Saldo bancos hoy</Eyebrow>
          <div
            style={{
              ...bigNumber(C, saldoAct > 0 ? C.text : C.td),
              fontSize: S.xl4, letterSpacing: "-1px",
            }}
          >
            {saldoAct > 0 ? f(saldoAct) : "Sin datos"}
          </div>
          {deltaHoyAyer !== null && (
            <div style={{ display: "flex", gap: SP.sm, alignItems: "center", marginTop: SP.sm }}>
              <span
                style={{
                  fontSize: S.sm, fontWeight: W.sb,
                  color: deltaHoyAyer >= 0 ? C.green : C.red,
                }}
              >
                {deltaHoyAyer >= 0 ? "+" : ""}{fS(deltaHoyAyer)}
              </span>
              <span style={{ fontSize: S.xs, color: C.td, fontWeight: W.m }}>
                vs {fd(fechaAyer)}
              </span>
              <span style={{ marginLeft: "auto", fontSize: S.xs, color: C.accent, fontWeight: W.sb }}>
                Ver →
              </span>
            </div>
          )}
        </Card>

        {/* Alerta principal */}
        {alertas.length > 0 && (() => {
          const a = alertas[0];
          const col = colorAlerta(a.tipo);
          return (
            <div
              onClick={() => onGoTab && onGoTab(9)}
              style={{
                background: col.bg,
                border: `1px solid ${col.border}`,
                borderRadius: R.lg,
                padding: `${SP.md}px ${SP.md}px`,
                display: "flex",
                gap: SP.md,
                alignItems: "center",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: col.text + "22",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, fontSize: S.lg,
                }}
              >
                {a.icono}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: S.xxs, fontWeight: W.b, color: col.text,
                    textTransform: "uppercase", letterSpacing: "0.5px",
                  }}
                >
                  {a.tipo === "urgente" ? "Urgente" : a.tipo === "atencion" ? "Atención" : "Info"}
                </div>
                <div style={{ fontSize: S.base, fontWeight: W.sb, color: C.text, marginTop: 1 }}>
                  {a.titulo}
                </div>
                <div
                  style={{
                    fontSize: S.xs, color: C.tm, marginTop: 2,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}
                >
                  {a.mensaje}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: S.xl, fontWeight: W.sb, color: col.text, lineHeight: 1 }}>
                  {a.dias}
                </div>
                <div style={{ fontSize: S.xxs, color: col.text, opacity: 0.7, fontWeight: W.m }}>
                  días
                </div>
              </div>
            </div>
          );
        })()}

        {alertas.length > 1 && (
          <div
            onClick={() => onGoTab && onGoTab(9)}
            style={{
              padding: `${SP.sm}px ${SP.md}px`,
              borderRadius: R.md,
              background: C.surfaceAlt,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: S.sm, color: C.tm, fontWeight: W.m }}>
              +{alertas.length - 1} alerta{alertas.length - 1 !== 1 ? "s" : ""} más
            </span>
            <span style={{ fontSize: S.xs, color: C.accent, fontWeight: W.sb }}>Ver todas →</span>
          </div>
        )}

        <IndicadoresCard C={C} />

        {/* DAP + FFMM */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: SP.sm }}>
          <Card C={C} pad="sm" onClick={() => onGoTab && onGoTab(5)}>
            <Eyebrow C={C}>En DAP</Eyebrow>
            <div style={{ ...bigNumber(C, C.amber), fontSize: S.xl }}>{fS(totalDAP)}</div>
            <div style={{ fontSize: S.xxs, color: C.td, marginTop: SP.xs, fontWeight: W.m }}>
              {dapsV.length} vigentes
            </div>
          </Card>
          <Card C={C} pad="sm" onClick={() => onGoTab && onGoTab(6)}>
            <Eyebrow C={C}>Fondos mutuos</Eyebrow>
            <div style={{ ...bigNumber(C, C.purple), fontSize: S.xl }}>
              {fS(totalFFMMAct > 0 ? totalFFMMAct : totalFFMMInv)}
            </div>
            {totalGanFFMM > 0 && (
              <div style={{ fontSize: S.xxs, color: C.green, marginTop: SP.xs, fontWeight: W.sb }}>
                +{fS(totalGanFFMM)}
              </div>
            )}
          </Card>
        </div>

        {/* Cobertura mes */}
        <Card C={C} onClick={() => onGoTab && onGoTab(2)}>
          <div
            style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "baseline", marginBottom: SP.sm,
            }}
          >
            <Eyebrow C={C} style={{ marginBottom: 0 }}>{mesLabelAct} cubierto</Eyebrow>
            <div style={{ fontSize: S.xs, color: C.td, fontWeight: W.m }}>
              {fS(guarMes)} / {fS(compMes)}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: SP.md }}>
            <div
              style={{
                flex: 1, height: 8, background: C.surfaceAlt,
                borderRadius: 4, overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.min(pctMes * 100, 100)}%`,
                  height: "100%",
                  background: pctMes >= 0.9 ? C.green : pctMes >= 0.5 ? C.amber : C.red,
                  borderRadius: 4,
                  transition: "width 300ms ease",
                }}
              />
            </div>
            <span
              style={{
                fontSize: S.md, fontWeight: W.sb,
                color: pctMes >= 0.9 ? C.green : pctMes >= 0.5 ? C.amberT : C.red,
                minWidth: 44, textAlign: "right",
              }}
            >
              {Math.round(pctMes * 100)}%
            </span>
          </div>
        </Card>

        {/* Próximos compromisos */}
        <Card C={C}>
          <Eyebrow C={C}>Próximos compromisos</Eyebrow>
          {proxComp.length === 0 ? (
            <div style={{ fontSize: S.sm, color: C.td, fontStyle: "italic" }}>
              Sin compromisos próximos
            </div>
          ) : proxComp.map((c, i) => {
            const d = dd(hoy, c.fecha);
            const ok = c.falta === 0;
            return (
              <div
                key={i}
                style={{
                  display: "flex", alignItems: "center", gap: SP.md,
                  padding: `${SP.sm}px 0`,
                  borderTop: i > 0 ? `1px solid ${C.border}` : "none",
                }}
              >
                <div
                  style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: ok ? C.green : C.amber, flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: S.base, color: C.text, fontWeight: W.m,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}
                  >
                    {c.concepto}
                  </div>
                  <div style={{ fontSize: S.xs, color: ok ? C.td : C.amberT, fontWeight: W.m }}>
                    {d === 0 ? "hoy" : d === 1 ? "mañana" : `en ${d}d`}
                    {!ok && ` · falta ${fS(c.falta)}`}
                  </div>
                </div>
                <div
                  style={{
                    ...bigNumber(C, ok ? C.green : C.text),
                    fontSize: S.base, fontWeight: W.sb,
                  }}
                >
                  {fS(c.monto)}
                </div>
              </div>
            );
          })}
        </Card>

        {/* Saldos por banco */}
        {Object.keys(ultimo).length > 0 && (
          <Card C={C} onClick={() => onGoTab && onGoTab(1)}>
            <Eyebrow C={C}>Saldos por banco</Eyebrow>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: SP.sm }}>
              {Object.entries(ultimo).map(([b, s]) => {
                const ayerBanco = ultimoAyer[b];
                const diff = ayerBanco != null ? s - ayerBanco : null;
                return (
                  <div
                    key={b}
                    style={{
                      background: C.surfaceAlt,
                      borderRadius: R.md,
                      padding: `${SP.sm}px ${SP.md}px`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: S.xxs, color: C.tm, marginBottom: 2,
                        textTransform: "uppercase", letterSpacing: "0.4px", fontWeight: W.sb,
                      }}
                    >
                      {b}
                    </div>
                    <div style={{ ...bigNumber(C, C.text), fontSize: S.md }}>{fS(s)}</div>
                    {diff !== null && diff !== 0 && (
                      <div
                        style={{
                          fontSize: S.xxs, fontWeight: W.sb,
                          color: diff > 0 ? C.green : C.red,
                        }}
                      >
                        {diff > 0 ? "+" : ""}{fS(diff)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Próximos DAPs */}
        {proxDAP.length > 0 && (
          <Card C={C} onClick={() => onGoTab && onGoTab(5)}>
            <Eyebrow C={C}>DAPs próximos a vencer</Eyebrow>
            {proxDAP.slice(0, 3).map((d, i) => {
              const dias = dd(hoy, d.vencimiento);
              const tc = colorTipo(clas(d.tipo), C);
              return (
                <div
                  key={i}
                  style={{
                    display: "flex", alignItems: "center", gap: SP.md,
                    padding: `${SP.sm}px 0`,
                    borderTop: i > 0 ? `1px solid ${C.border}` : "none",
                  }}
                >
                  <div
                    style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: tc.color, flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: S.base, color: C.text, fontWeight: W.m,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}
                    >
                      {d.comentario || `DAP ${d.banco}`}
                    </div>
                    <div style={{ fontSize: S.xs, color: C.td, fontWeight: W.m }}>
                      vence {fd(d.vencimiento)} · {dias === 1 ? "mañana" : `en ${dias}d`}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ ...bigNumber(C, C.text), fontSize: S.base }}>
                      {fS(d.montoInicial)}
                    </div>
                    <div style={{ fontSize: S.xxs, color: C.green, fontWeight: W.sb }}>
                      +{fS(d.ganancia)}
                    </div>
                  </div>
                </div>
              );
            })}
          </Card>
        )}

        <div style={{ height: SP.xl }} />
      </div>
    );
  }

  // ─── LAYOUT DESKTOP ───────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: SP.lg }}>
      <StatusBanner />

      {/* Alertas top 3 */}
      {alertas.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: SP.xs }}>
          {alertas.slice(0, 3).map((a, i) => {
            const col = colorAlerta(a.tipo);
            return (
              <div
                key={i}
                style={{
                  display: "flex", alignItems: "center", gap: SP.md,
                  padding: `${SP.sm}px ${SP.md}px`,
                  borderRadius: R.md,
                  background: col.bg,
                  border: `1px solid ${col.border}`,
                }}
              >
                <span style={{ fontSize: S.md }}>{a.icono}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: S.sm, fontWeight: W.b,
                      color: col.text,
                      marginRight: SP.sm,
                      textTransform: "uppercase", letterSpacing: "0.4px",
                    }}
                  >
                    {a.titulo}
                  </span>
                  <span style={{ fontSize: S.sm, color: C.tm, fontWeight: W.m }}>{a.mensaje}</span>
                </div>
              </div>
            );
          })}
          {alertas.length > 3 && (
            <div style={{ fontSize: S.xs, color: C.td, paddingLeft: SP.md, fontWeight: W.m }}>
              +{alertas.length - 3} alertas más — ver pestaña Alertas
            </div>
          )}
        </div>
      )}

      {/* Métricas principales */}
      <div style={{ display: "flex", gap: SP.md, flexWrap: "wrap" }}>
        <div
          style={{
            background: C.surface,
            borderRadius: R.lg,
            padding: `${SP.xl}px ${SP.xl2}px`,
            border: `1px solid ${C.border}`,
            flex: 2,
            minWidth: 300,
          }}
        >
          <Eyebrow C={C}>Saldo cuentas hoy</Eyebrow>
          <div style={{ ...bigNumber(C, saldoAct > 0 ? C.text : C.td), fontSize: S.xl4, letterSpacing: "-1px" }}>
            {saldoAct > 0 ? f(saldoAct) : "Sin datos"}
          </div>
          {deltaHoyAyer !== null ? (
            <div style={{ display: "flex", gap: SP.sm, alignItems: "center", marginTop: SP.sm }}>
              <span
                style={{
                  fontSize: S.sm, fontWeight: W.sb,
                  color: deltaHoyAyer >= 0 ? C.green : C.red,
                }}
              >
                {deltaHoyAyer >= 0 ? "+" : ""}{fS(deltaHoyAyer)}
              </span>
              <span style={{ fontSize: S.xs, color: C.td, fontWeight: W.m }}>vs {fd(fechaAyer)}</span>
            </div>
          ) : totalIni > 0 && (
            <div style={{ fontSize: S.xs, color: C.td, marginTop: SP.sm, fontWeight: W.m }}>
              Inicial: {f(totalIni)}
            </div>
          )}
        </div>

        <div
          style={{
            background: C.surface,
            borderRadius: R.lg,
            padding: `${SP.lg}px ${SP.lg}px`,
            border: `1px solid ${C.border}`,
            flex: 1,
            minWidth: 180,
          }}
        >
          <Eyebrow C={C}>En DAP vigentes</Eyebrow>
          <div style={{ ...bigNumber(C, C.amber), fontSize: S.xl2 }}>{f(totalDAP)}</div>
          <div style={{ fontSize: S.xs, color: C.td, marginTop: SP.xs, fontWeight: W.m }}>
            {trab.length} trabajo · {inv.length} inv · {cred.length} cred
          </div>
        </div>

        <div
          style={{
            background: C.surface,
            borderRadius: R.lg,
            padding: `${SP.lg}px ${SP.lg}px`,
            border: `1px solid ${C.border}`,
            flex: 1,
            minWidth: 180,
          }}
        >
          <Eyebrow C={C}>Fondos mutuos</Eyebrow>
          <div style={{ ...bigNumber(C, C.purple), fontSize: S.xl2 }}>
            {totalFFMMAct > 0 ? f(totalFFMMAct) : f(totalFFMMInv)}
          </div>
          {totalGanFFMM > 0 && (
            <div style={{ fontSize: S.xs, color: C.green, marginTop: SP.xs, fontWeight: W.sb }}>
              +{fS(totalGanFFMM)} rentabilidad
            </div>
          )}
        </div>

        <div
          style={{
            background: C.surface,
            borderRadius: R.lg,
            padding: `${SP.lg}px ${SP.lg}px`,
            border: `1px solid ${C.border}`,
            flex: 1,
            minWidth: 180,
          }}
        >
          <Eyebrow C={C}>{mesLabelAct} cubierto</Eyebrow>
          <div
            style={{
              ...bigNumber(C, pctMes >= 0.9 ? C.green : pctMes >= 0.5 ? C.amberT : C.red),
              fontSize: S.xl2,
            }}
          >
            {Math.round(pctMes * 100)}%
          </div>
          <div style={{ fontSize: S.xs, color: C.td, marginTop: SP.xs, fontWeight: W.m }}>
            {fS(guarMes)} de {fS(compMes)}
          </div>
        </div>
      </div>

      {/* Leasing + Crédito */}
      {leasingDetalle.length > 0 && (
        <div style={{ display: "flex", gap: SP.md, flexWrap: "wrap" }}>
          <Card C={C} style={{ flex: 2, minWidth: 280 }}>
            <Eyebrow C={C}>
              Leasing · {leasingDetalle.length} contratos · {totalDeudaLeasingUF.toLocaleString("es-CL",{minimumFractionDigits:2,maximumFractionDigits:2})} UF
            </Eyebrow>
            <div style={{ display: "flex", gap: SP.lg, alignItems: "center" }}>
              <div>
                <div style={{ fontSize: S.xs, color: C.td, marginBottom: 2, fontWeight: W.m }}>
                  Cuota mensual c/IVA
                </div>
                <div style={{ ...bigNumber(C, C.amber), fontSize: S.xl }}>{f(cuotaTotalLeasing)}</div>
              </div>
              <div style={{ borderLeft: `1px solid ${C.border}`, paddingLeft: SP.lg }}>
                <div style={{ fontSize: S.xs, color: C.td, marginBottom: 2, fontWeight: W.m }}>
                  Deuda s/IVA
                </div>
                <div style={{ ...bigNumber(C, C.teal), fontSize: S.xl }}>{f(deudaLeasingSIVACLP)}</div>
              </div>
            </div>
          </Card>
          {saldoInsoluto > 0 && (
            <Card C={C} style={{ flex: 1, minWidth: 200 }}>
              <Eyebrow C={C}>Crédito comercial</Eyebrow>
              <div style={{ ...bigNumber(C, C.red), fontSize: S.xl2 }}>{f(saldoInsoluto)}</div>
              <div style={{ fontSize: S.xs, color: C.td, marginTop: SP.xs, fontWeight: W.m }}>
                {creditoPendiente.length} cuotas pendientes
              </div>
            </Card>
          )}
        </div>
      )}

      <IndicadoresCard C={C} />

      {/* Gráficos */}
      <div style={{ display: "flex", gap: SP.md, flexWrap: "wrap" }}>
        <GraficoCobertura C={C} cal={cal} hoy={hoy} />
        <GraficoDonaDap C={C} dap={dap} clas={clas} fS={fS} />
      </div>

      {/* Próximos compromisos + DAPs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: SP.md }}>
        <Card C={C}>
          <Eyebrow C={C}>Próximos compromisos</Eyebrow>
          {proxComp.length === 0 ? (
            <div style={{ fontSize: S.sm, color: C.td, fontStyle: "italic" }}>
              Sin compromisos próximos
            </div>
          ) : proxComp.map((c, i) => {
            const d = dd(hoy, c.fecha);
            const ok = c.falta === 0;
            return (
              <div
                key={i}
                style={{
                  display: "flex", alignItems: "center", gap: SP.sm,
                  padding: `${SP.sm}px 0`,
                  borderBottom: i < proxComp.length - 1 ? `1px solid ${C.border}` : "none",
                }}
              >
                <div
                  style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: ok ? C.green : C.amber, flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: S.base, color: C.text, fontWeight: W.m,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}
                  >
                    {c.concepto}
                  </div>
                  <div style={{ fontSize: S.xs, color: C.td, fontWeight: W.m }}>
                    {fdf(c.fecha)} · {d === 0 ? "hoy" : d === 1 ? "mañana" : `en ${d}d`}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ ...bigNumber(C, ok ? C.green : C.text), fontSize: S.base }}>
                    {fS(c.monto)}
                  </div>
                  {!ok && (
                    <div style={{ fontSize: S.xxs, color: C.red, fontWeight: W.sb }}>
                      Falta {fS(c.falta)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </Card>

        <Card C={C}>
          <Eyebrow C={C}>DAPs próximos a vencer</Eyebrow>
          {proxDAP.length === 0 ? (
            <div style={{ fontSize: S.sm, color: C.td, fontStyle: "italic" }}>
              Sin DAPs por vencer
            </div>
          ) : proxDAP.map((d, i) => {
            const dias = dd(hoy, d.vencimiento);
            const tc = colorTipo(clas(d.tipo), C);
            return (
              <div
                key={i}
                style={{
                  display: "flex", alignItems: "center", gap: SP.sm,
                  padding: `${SP.sm}px 0`,
                  borderBottom: i < proxDAP.length - 1 ? `1px solid ${C.border}` : "none",
                }}
              >
                <div
                  style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: tc.color, flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: S.base, color: C.text, fontWeight: W.m,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}
                  >
                    {d.comentario || `DAP ${d.banco}`}
                  </div>
                  <div style={{ fontSize: S.xs, color: C.td, fontWeight: W.m }}>
                    Vence {fdf(d.vencimiento)} · {dias === 1 ? "mañana" : `en ${dias}d`}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ ...bigNumber(C, C.text), fontSize: S.base }}>
                    {fS(d.montoInicial)}
                  </div>
                  <div style={{ fontSize: S.xxs, color: C.green, fontWeight: W.sb }}>
                    +{fS(d.ganancia)}
                  </div>
                </div>
              </div>
            );
          })}
        </Card>
      </div>

      {/* Saldos por banco */}
      {Object.keys(ultimo).length > 0 && (
        <Card C={C}>
          <Eyebrow C={C}>Saldos por banco hoy</Eyebrow>
          <div style={{ display: "flex", gap: SP.md, flexWrap: "wrap" }}>
            {Object.entries(ultimo).map(([b, s]) => {
              const ayerBanco = ultimoAyer[b];
              const diff = ayerBanco != null ? s - ayerBanco : null;
              return (
                <div
                  key={b}
                  style={{
                    flex: 1, minWidth: 140,
                    padding: `${SP.sm}px ${SP.md}px`,
                    borderRadius: R.md,
                    background: C.surfaceAlt,
                  }}
                >
                  <div
                    style={{
                      fontSize: S.xxs, color: C.tm, marginBottom: 2,
                      textTransform: "uppercase", letterSpacing: "0.4px", fontWeight: W.sb,
                    }}
                  >
                    {b}
                  </div>
                  <div style={{ ...bigNumber(C, C.text), fontSize: S.lg }}>{fS(s)}</div>
                  {diff !== null && diff !== 0 && (
                    <div style={{ fontSize: S.xs, fontWeight: W.sb, color: diff > 0 ? C.green : C.red }}>
                      {diff > 0 ? "+" : ""}{fS(diff)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
