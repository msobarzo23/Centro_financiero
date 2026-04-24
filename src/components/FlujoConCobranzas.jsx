import { useState } from 'react';
import { S, W, R, SP } from '../utils/theme.js';
import { f } from '../utils/format.js';
import { Card, Eyebrow, Metric, SectionTitle } from './common.jsx';

const MONO = "'SF Mono', ui-monospace, Menlo, Consolas, monospace";
const TABULAR = { fontFamily: MONO, fontFeatureSettings: "'tnum' 1, 'zero' 1" };

// Proyección de 13 semanas cruzando caja actual + cobranzas Defontana +
// DAPs Trabajo vs. calendario + leasing + crédito.
// Se renderiza solo cuando hay cobranzas Defontana cargadas.
export default function FlujoConCobranzas({ C, isMobile, flujo }) {
  if (!flujo) return null;

  const {
    semanas,
    cajaInicial,
    totalIngresos,
    totalEgresos,
    flujoNeto,
    totalCobranzasExistentes,
    totalCobranzasVencidas,
    totalDAPsVence,
    colchonTotal,
    colchonFFMM,
    colchonDAPInv,
    colchonDAPCred,
    semanasNegativas,
    rescate,
  } = flujo;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SP.lg, marginTop: SP.xl2 }}>
      <div>
        <div
          style={{
            fontSize: S.xl,
            fontWeight: W.sb,
            color: C.text,
            letterSpacing: '-0.3px',
            marginBottom: SP.xs,
          }}
        >
          Flujo 13 semanas con cobranzas
        </div>
        <div style={{ fontSize: S.sm, color: C.tm, lineHeight: 1.5 }}>
          Proyección semanal cruzando caja actual con cobranzas Defontana (por fecha de
          vencimiento) y DAPs Trabajo que vencen. Egresos desde calendario + leasing + crédito.
          Facturas críticas (+180d) no se proyectan; facturas vencidas se consolidan en la
          semana actual.
        </div>
      </div>

      {/* ── KPIs ──────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
          gap: SP.md,
        }}
      >
        <Metric
          C={C}
          label="Caja inicial"
          value={f(cajaInicial)}
          sub="Saldo bancario al día"
          color={C.text}
        />
        <Metric
          C={C}
          label="Ingresos 90d"
          value={f(totalIngresos)}
          sub={subIngresos({
            totalCobranzasExistentes,
            totalCobranzasVencidas,
            totalDAPsVence,
          })}
          color={C.green}
        />
        <Metric
          C={C}
          label="Egresos 90d"
          value={f(totalEgresos)}
          sub="Calendario + leasing + crédito"
          color={C.red}
        />
        <Metric
          C={C}
          label="Colchón disponible"
          value={f(colchonTotal)}
          sub={subColchon({ colchonFFMM, colchonDAPInv, colchonDAPCred })}
          color={C.purple}
        />
      </div>

      {/* ── Flujo neto (destaque) ─────────────────────── */}
      <Card C={C} pad="md">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: SP.sm,
          }}
        >
          <div>
            <Eyebrow C={C}>Flujo neto 90 días</Eyebrow>
            <div
              style={{
                ...TABULAR,
                fontSize: S.xl2,
                fontWeight: W.sb,
                color: flujoNeto >= 0 ? C.green : C.red,
                letterSpacing: '-0.4px',
                lineHeight: 1.1,
              }}
            >
              {flujoNeto >= 0 ? '+' : ''}
              {f(flujoNeto)}
            </div>
          </div>
          <div
            style={{
              fontSize: S.sm,
              color: C.tm,
              textAlign: 'right',
              fontWeight: W.m,
              lineHeight: 1.5,
            }}
          >
            Caja proyectada al final de S13:{' '}
            <b
              style={{
                color:
                  semanas[12]?.cajaFinal >= 0 ? C.text : C.red,
              }}
            >
              {f(semanas[12]?.cajaFinal || 0)}
            </b>
          </div>
        </div>
      </Card>

      {/* ── Alerta rescate ────────────────────────────── */}
      {semanasNegativas.length > 0 && (
        <AlertaRescate
          C={C}
          semanas={semanas}
          rescate={rescate}
          colchonTotal={colchonTotal}
        />
      )}

      {/* ── Tabla semana a semana ─────────────────────── */}
      <div>
        <SectionTitle C={C}>Detalle semana a semana</SectionTitle>
        <Card C={C} pad="sm">
          <TablaSemanas
            C={C}
            semanas={semanas}
            rescate={rescate}
            isMobile={isMobile}
          />
        </Card>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Helpers de texto
// ══════════════════════════════════════════════════════════════════════

function subIngresos({ totalCobranzasExistentes, totalCobranzasVencidas, totalDAPsVence }) {
  const partes = [];
  partes.push(`Cobranzas ${f(totalCobranzasExistentes)}`);
  if (totalCobranzasVencidas > 0) partes.push(`(${f(totalCobranzasVencidas)} vencidas)`);
  if (totalDAPsVence > 0) partes.push(`+ DAPs ${f(totalDAPsVence)}`);
  return partes.join(' · ');
}

function subColchon({ colchonFFMM, colchonDAPInv, colchonDAPCred }) {
  const partes = [];
  if (colchonFFMM > 0) partes.push(`FFMM ${f(colchonFFMM)}`);
  if (colchonDAPInv > 0) partes.push(`DAP Inv ${f(colchonDAPInv)}`);
  if (colchonDAPCred > 0) partes.push(`DAP Créd ${f(colchonDAPCred)}`);
  return partes.length ? partes.join(' + ') : 'sin colchón';
}

// ══════════════════════════════════════════════════════════════════════
// Alerta rescate
// ══════════════════════════════════════════════════════════════════════

function AlertaRescate({ C, semanas, rescate, colchonTotal }) {
  const [expanded, setExpanded] = useState(true);
  const negativas = semanas.filter((s) => s.cajaFinal < 0);
  const peor = negativas.reduce(
    (m, s) => (s.cajaFinal < m.cajaFinal ? s : m),
    negativas[0],
  );
  const peorIdx = semanas.indexOf(peor);
  const peorNecesitado = Math.abs(peor.cajaFinal);
  const cubreTodo = colchonTotal >= peorNecesitado;

  const color = cubreTodo ? C.amber : C.red;
  const bg = cubreTodo ? C.amberD : C.redD;

  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${color}55`,
        borderRadius: R.lg,
        overflow: 'hidden',
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          padding: `${SP.md}px ${SP.lg}px`,
          background: 'transparent',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          fontFamily: 'inherit',
          textAlign: 'left',
          color: 'inherit',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: SP.sm }}>
          <span style={{ fontSize: S.lg, color, marginTop: 2 }}>⚠</span>
          <div>
            <div
              style={{
                fontSize: S.md,
                fontWeight: W.sb,
                color,
                letterSpacing: '-0.2px',
              }}
            >
              {cubreTodo
                ? `Caja cae negativa en ${negativas.length} semana${negativas.length > 1 ? 's' : ''} — el colchón alcanza`
                : `Caja cae negativa en ${negativas.length} semana${negativas.length > 1 ? 's' : ''} — colchón insuficiente`}
            </div>
            <div style={{ fontSize: S.xs, color: C.tm, marginTop: 2, fontWeight: W.m }}>
              Peor punto: S{peorIdx + 1} ({peor.label}) con {f(peor.cajaFinal)}. Colchón total:{' '}
              {f(colchonTotal)}.
            </div>
          </div>
        </div>
        <span style={{ fontSize: S.md, color: C.tm, fontWeight: W.b }}>
          {expanded ? '−' : '+'}
        </span>
      </button>
      {expanded && (
        <div
          style={{
            padding: `0 ${SP.lg}px ${SP.md}px`,
            display: 'flex',
            flexDirection: 'column',
            gap: SP.xs,
          }}
        >
          {negativas.slice(0, 5).map((s, i) => {
            const idx = semanas.indexOf(s);
            const sug = rescate[idx];
            if (!sug) return null;
            return (
              <div
                key={i}
                style={{
                  padding: `${SP.sm}px ${SP.md}px`,
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: R.md,
                  fontSize: S.sm,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: SP.xs,
                    gap: SP.sm,
                    flexWrap: 'wrap',
                  }}
                >
                  <strong style={{ color: C.text, fontWeight: W.sb }}>
                    S{idx + 1} · {s.label} — caja {f(s.cajaFinal)}
                  </strong>
                  {sug.faltante > 0 && (
                    <span
                      style={{
                        fontSize: S.xxs,
                        color: C.red,
                        fontWeight: W.b,
                        padding: '2px 8px',
                        background: C.redD,
                        borderRadius: 999,
                        letterSpacing: '0.3px',
                      }}
                    >
                      FALTAN {f(sug.faltante)}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: SP.xs, flexWrap: 'wrap' }}>
                  {sug.plan.map((p, pi) => (
                    <RescatePill key={pi} C={C} plan={p} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RescatePill({ C, plan }) {
  const labelCorto =
    plan.tipo === 'ffmm' ? 'FFMM' : plan.tipo === 'dap_inv' ? 'DAP Inv' : 'DAP Créd';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: `3px ${SP.sm}px`,
        background: C.purpleD,
        border: `1px solid ${C.purple}44`,
        borderRadius: 999,
        fontSize: S.xxs,
        color: C.purple,
        fontWeight: W.sb,
        letterSpacing: '0.3px',
      }}
    >
      {labelCorto}
      <span style={{ color: C.text, fontWeight: W.b }}>{f(plan.monto)}</span>
      {plan.rompe && (
        <span style={{ color: C.red, fontSize: S.xxs }}>⚡ rompe</span>
      )}
    </span>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Tabla semanas
// ══════════════════════════════════════════════════════════════════════

function TablaSemanas({ C, semanas, rescate, isMobile }) {
  const headers = isMobile
    ? ['Sem', 'Período', 'Neto', 'Caja final', 'Estado']
    : ['Sem', 'Período', 'Caja inicial', 'Ingresos', 'Egresos', 'Neto', 'Caja final', 'Estado'];

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: S.sm }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                style={{
                  padding: `${SP.sm}px ${SP.sm}px`,
                  textAlign: i <= 1 ? 'left' : i === headers.length - 1 ? 'left' : 'right',
                  color: C.tm,
                  fontSize: S.xxs,
                  fontWeight: W.sb,
                  borderBottom: `1px solid ${C.border}`,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  whiteSpace: 'nowrap',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {semanas.map((s, i) => {
            const sug = rescate[i];
            return (
              <tr
                key={i}
                style={{
                  borderBottom: `1px solid ${C.border}`,
                  background: i === 0 ? C.accentD : 'transparent',
                }}
              >
                <td
                  style={{
                    padding: `${SP.sm}px ${SP.sm}px`,
                    color: C.text,
                    fontWeight: W.sb,
                    whiteSpace: 'nowrap',
                  }}
                >
                  S{i + 1}
                </td>
                <td
                  style={{
                    padding: `${SP.sm}px ${SP.sm}px`,
                    color: C.tm,
                    fontSize: S.xs,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {s.label}
                </td>
                {!isMobile && (
                  <>
                    <td
                      style={{
                        ...TABULAR,
                        padding: `${SP.sm}px ${SP.sm}px`,
                        textAlign: 'right',
                        color: s.cajaInicial >= 0 ? C.tm : C.red,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {f(s.cajaInicial)}
                    </td>
                    <td
                      style={{
                        ...TABULAR,
                        padding: `${SP.sm}px ${SP.sm}px`,
                        textAlign: 'right',
                        color: s.ingresos > 0 ? C.green : C.td,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {s.ingresos > 0 ? '+' + f(s.ingresos) : '—'}
                    </td>
                    <td
                      style={{
                        ...TABULAR,
                        padding: `${SP.sm}px ${SP.sm}px`,
                        textAlign: 'right',
                        color: s.egresos > 0 ? C.red : C.td,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {s.egresos > 0 ? '−' + f(s.egresos) : '—'}
                    </td>
                  </>
                )}
                <td
                  style={{
                    ...TABULAR,
                    padding: `${SP.sm}px ${SP.sm}px`,
                    textAlign: 'right',
                    color: s.neto >= 0 ? C.green : C.red,
                    fontWeight: W.sb,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {s.neto >= 0 ? '+' : ''}
                  {f(s.neto)}
                </td>
                <td
                  style={{
                    ...TABULAR,
                    padding: `${SP.sm}px ${SP.sm}px`,
                    textAlign: 'right',
                    color: s.cajaFinal >= 0 ? C.text : C.red,
                    fontWeight: W.b,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {f(s.cajaFinal)}
                </td>
                <td
                  style={{
                    padding: `${SP.sm}px ${SP.sm}px`,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <EstadoSemana C={C} semana={s} sug={sug} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EstadoSemana({ C, semana, sug }) {
  let label;
  let color;
  let bg;
  if (semana.cajaFinal < 0) {
    if (sug && sug.faltante === 0) {
      label = 'Rescatable';
      color = C.purple;
      bg = C.purpleD;
    } else {
      label = 'Negativa';
      color = C.red;
      bg = C.redD;
    }
  } else if (semana.cajaFinal < 50_000_000) {
    label = 'Baja';
    color = C.amber;
    bg = C.amberD;
  } else {
    label = 'OK';
    color = C.green;
    bg = C.greenD;
  }
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        background: bg,
        color,
        borderRadius: 999,
        fontSize: S.xxs,
        fontWeight: W.sb,
        letterSpacing: '0.3px',
      }}
    >
      {label}
    </span>
  );
}
