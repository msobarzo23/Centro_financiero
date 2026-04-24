import { mesLabel } from '../utils/format.js';
import { S, W, SP } from '../utils/theme.js';
import { Card, Eyebrow } from './common.jsx';

const MONO = "'SF Mono', ui-monospace, Menlo, Consolas, monospace";

// Barras de cobertura calendario últimos N meses.
export function GraficoCobertura({ C, cal, hoy }) {
  const meses = {};
  cal.forEach(c => {
    if (!c.fecha) return;
    const m = c.fecha.substring(0, 7);
    if (!meses[m]) meses[m] = { mes: m, comp: 0, guar: 0 };
    meses[m].comp += c.monto;
    meses[m].guar += c.guardado;
  });
  const data = Object.values(meses).sort((a, b) => a.mes.localeCompare(b.mes)).slice(-8);
  if (data.length === 0) return null;

  const VW = 560, VH = 160, padL = 8, padR = 8, padT = 16, padB = 32;
  const chartW = VW - padL - padR;
  const chartH = VH - padT - padB;
  const maxVal = Math.max(...data.map(d => d.comp), 1);
  const barW = Math.floor(chartW / data.length);
  const gap = 6;
  const bW = Math.max(barW - gap, 8);
  const mesHoy = hoy.substring(0, 7);

  return (
    <Card C={C} style={{ flex: 1, minWidth: 280 }}>
      <Eyebrow C={C}>Cobertura calendario · últimos {data.length} meses</Eyebrow>
      <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width: "100%", height: "auto", overflow: "visible" }}>
        {[0.25, 0.5, 0.75, 1].map(p => (
          <line
            key={p}
            x1={padL}
            y1={padT + chartH * (1 - p)}
            x2={VW - padR}
            y2={padT + chartH * (1 - p)}
            stroke={C.border}
            strokeWidth="0.5"
            strokeDasharray="3,3"
          />
        ))}
        {data.map((d, i) => {
          const x = padL + i * barW + gap / 2;
          const pct = d.comp > 0 ? Math.min(d.guar / d.comp, 1) : 0;
          const hComp = chartH * (d.comp / maxVal);
          const hGuar = hComp * pct;
          const yComp = padT + chartH - hComp;
          const yGuar = padT + chartH - hGuar;
          const ok = pct >= 0.9;
          const partial = pct >= 0.5 && pct < 0.9;
          const barColor = ok ? C.green : partial ? C.amber : C.red;
          const isHoy = d.mes === mesHoy;
          return (
            <g key={i}>
              <rect x={x} y={yComp} width={bW} height={hComp} fill={C.surfaceAlt} rx={3} />
              <rect x={x} y={yGuar} width={bW} height={hGuar} fill={barColor} rx={3} opacity={0.9} />
              {isHoy && <rect x={x} y={padT} width={bW} height={chartH} fill={C.accentD} rx={3} />}
              <text
                x={x + bW / 2}
                y={yComp - 4}
                textAnchor="middle"
                fontSize="9"
                fill={ok ? C.green : partial ? C.amber : C.tm}
                fontWeight={isHoy ? "700" : "600"}
              >
                {Math.round(pct * 100)}%
              </text>
              <text
                x={x + bW / 2}
                y={VH - 6}
                textAnchor="middle"
                fontSize="10"
                fontWeight={isHoy ? 700 : 500}
                fill={isHoy ? C.accent : C.tm}
              >
                {mesLabel(d.mes)}
              </text>
            </g>
          );
        })}
      </svg>
      <div style={{ display: "flex", gap: SP.md, marginTop: SP.xs, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: SP.xs, fontSize: S.xs, color: C.tm, fontWeight: W.m }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: C.green }} /> ≥90%
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: SP.xs, fontSize: S.xs, color: C.tm, fontWeight: W.m }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: C.amber }} /> 50-89%
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: SP.xs, fontSize: S.xs, color: C.tm, fontWeight: W.m }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: C.red }} /> &lt;50%
        </div>
      </div>
    </Card>
  );
}

// Dona de distribución DAP vigentes por tipo.
export function GraficoDonaDap({ C, dap, clas, fS }) {
  const vigentes = dap.filter(d => d.vigente === "si" || d.vigente === "sí");
  const grupos = [
    { label: "Trabajo", key: "trabajo", color: C.accent },
    { label: "Inversión", key: "inversion", color: C.amber },
    { label: "Crédito", key: "credito", color: C.cyan },
  ];
  const totales = grupos.map(g => ({
    ...g,
    monto: vigentes.filter(d => clas(d.tipo) === g.key).reduce((s, d) => s + d.montoInicial, 0),
  })).filter(g => g.monto > 0);

  const total = totales.reduce((s, g) => s + g.monto, 0);
  if (total === 0) return null;

  const cx = 60, cy = 60, Ro = 52, Ri = 32;
  let startAngle = 0;
  const slices = totales.map(g => {
    const angle = (g.monto / total) * 2 * Math.PI;
    const endAngle = startAngle + angle;
    const x1 = cx + Ro * Math.sin(startAngle);
    const y1 = cy - Ro * Math.cos(startAngle);
    const x2 = cx + Ro * Math.sin(endAngle);
    const y2 = cy - Ro * Math.cos(endAngle);
    const xi1 = cx + Ri * Math.sin(startAngle);
    const yi1 = cy - Ri * Math.cos(startAngle);
    const xi2 = cx + Ri * Math.sin(endAngle);
    const yi2 = cy - Ri * Math.cos(endAngle);
    const large = angle > Math.PI ? 1 : 0;
    const path = `M ${x1} ${y1} A ${Ro} ${Ro} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${Ri} ${Ri} 0 ${large} 0 ${xi1} ${yi1} Z`;
    const slice = { ...g, path, startAngle, endAngle };
    startAngle = endAngle;
    return slice;
  });

  return (
    <Card C={C} style={{ flex: 1, minWidth: 240 }}>
      <Eyebrow C={C}>Distribución DAP vigentes</Eyebrow>
      <div style={{ display: "flex", alignItems: "center", gap: SP.lg }}>
        <svg viewBox="0 0 120 120" style={{ width: 108, height: 108, flexShrink: 0 }}>
          {slices.map((s, i) => (
            <path key={i} d={s.path} fill={s.color} opacity={0.9} stroke={C.surface} strokeWidth="2" />
          ))}
          <text x={cx} y={cy - 4} textAnchor="middle" fontSize="8" fill={C.tm} fontWeight="600">
            TOTAL
          </text>
          <text x={cx} y={cy + 9} textAnchor="middle" fontSize="11" fontWeight="700" fill={C.text}>
            {fS(total)}
          </text>
        </svg>
        <div style={{ flex: 1 }}>
          {totales.map((g, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: SP.sm,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: SP.sm }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: g.color }} />
                <span style={{ fontSize: S.sm, color: C.text, fontWeight: W.m }}>{g.label}</span>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: S.base, fontWeight: W.sb, color: C.text, fontFamily: MONO }}>
                  {fS(g.monto)}
                </div>
                <div style={{ fontSize: S.xxs, color: C.td, fontWeight: W.m }}>
                  {Math.round((g.monto / total) * 100)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
