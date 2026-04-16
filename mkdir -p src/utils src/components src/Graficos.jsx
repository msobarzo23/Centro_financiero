import { mesLabel } from '../utils/format.js';

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

  const W = 560, H = 160, padL = 8, padR = 8, padT = 16, padB = 32;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const maxVal = Math.max(...data.map(d => d.comp), 1);
  const barW = Math.floor(chartW / data.length);
  const gap = 6;
  const bW = Math.max(barW - gap, 8);
  const mesHoy = hoy.substring(0, 7);

  return (
    <div style={{
      background: C.surface, borderRadius: 10,
      padding: "14px 16px", border: `0.5px solid ${C.border}`,
      flex: 1, minWidth: 260,
    }}>
      <div style={{
        fontSize: 11, color: C.tm, marginBottom: 10,
        textTransform: "uppercase", letterSpacing: "0.5px",
      }}>Cobertura calendario · últimos {data.length} meses</div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", overflow: "visible" }}>
        {[0.25, 0.5, 0.75, 1].map(p => (
          <line key={p} x1={padL} y1={padT + chartH * (1 - p)} x2={W - padR} y2={padT + chartH * (1 - p)}
            stroke={C.border} strokeWidth="0.5" strokeDasharray="3,3"/>
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
              <rect x={x} y={yComp} width={bW} height={hComp} fill={C.surfaceAlt} rx={2}/>
              <rect x={x} y={yGuar} width={bW} height={hGuar} fill={barColor} rx={2} opacity={0.85}/>
              {isHoy && <rect x={x} y={padT} width={bW} height={chartH} fill={C.accentD} rx={2}/>}
              <text x={x + bW/2} y={yComp - 4} textAnchor="middle"
                fontSize="8" fill={ok ? C.green : partial ? C.amber : C.td} fontWeight={isHoy ? "700" : "400"}>
                {Math.round(pct * 100)}%
              </text>
              <text x={x + bW/2} y={H - 6} textAnchor="middle"
                fontSize="9" fill={isHoy ? C.accent : C.td}>
                {mesLabel(d.mes)}
              </text>
            </g>
          );
        })}
      </svg>
      <div style={{ display: "flex", gap: 12, marginTop: 4, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: C.td }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: C.green }}/> ≥90%
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: C.td }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: C.amber }}/> 50-89%
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: C.td }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: C.red }}/> &lt;50%
        </div>
      </div>
    </div>
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

  const cx = 60, cy = 60, R = 50, r = 30;
  let startAngle = 0;
  const slices = totales.map(g => {
    const angle = (g.monto / total) * 2 * Math.PI;
    const endAngle = startAngle + angle;
    const x1 = cx + R * Math.sin(startAngle);
    const y1 = cy - R * Math.cos(startAngle);
    const x2 = cx + R * Math.sin(endAngle);
    const y2 = cy - R * Math.cos(endAngle);
    const xi1 = cx + r * Math.sin(startAngle);
    const yi1 = cy - r * Math.cos(startAngle);
    const xi2 = cx + r * Math.sin(endAngle);
    const yi2 = cy - r * Math.cos(endAngle);
    const large = angle > Math.PI ? 1 : 0;
    const path = `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${r} ${r} 0 ${large} 0 ${xi1} ${yi1} Z`;
    const slice = { ...g, path, startAngle, endAngle };
    startAngle = endAngle;
    return slice;
  });

  return (
    <div style={{
      background: C.surface, borderRadius: 10,
      padding: "14px 16px", border: `0.5px solid ${C.border}`,
      flex: 1, minWidth: 220,
    }}>
      <div style={{
        fontSize: 11, color: C.tm, marginBottom: 10,
        textTransform: "uppercase", letterSpacing: "0.5px",
      }}>Distribución DAP vigentes</div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <svg viewBox="0 0 120 120" style={{ width: 100, height: 100, flexShrink: 0 }}>
          {slices.map((s, i) => (
            <path key={i} d={s.path} fill={s.color} opacity={0.85} stroke={C.surface} strokeWidth="1.5"/>
          ))}
          <text x={cx} y={cy - 4} textAnchor="middle" fontSize="8" fill={C.tm}>TOTAL</text>
          <text x={cx} y={cy + 8} textAnchor="middle" fontSize="10" fontWeight="700" fill={C.text}>{fS(total)}</text>
        </svg>
        <div style={{ flex: 1 }}>
          {totales.map((g, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: g.color }}/>
                <span style={{ fontSize: 12, color: C.tm }}>{g.label}</span>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.text, fontFamily: "monospace" }}>{fS(g.monto)}</div>
                <div style={{ fontSize: 10, color: C.td }}>{Math.round(g.monto / total * 100)}%</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
