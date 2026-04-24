import { useMemo, useState } from 'react';
import { f, fS, fd } from '../utils/format.js';
import { saldoActualBancos, proyectar } from '../utils/proyeccion.js';
import { S, W, R, SP } from '../utils/theme.js';
import { Card } from './common.jsx';

const MONO = "'SF Mono', ui-monospace, Menlo, Consolas, monospace";

// Proyección visual del saldo bancario para los próximos 90 días.
// Usa montos con IVA (montoReal) porque eso es lo que efectivamente entra
// al banco y el calendario/leasing ya traen impuestos incluidos.
export default function Proyeccion90d({
  C,
  bancos,
  ventas,
  calendario,
  leasingDetalle,
  creditoPendiente,
  hoy,
  isMobile,
}) {
  const [escenario, setEscenario] = useState('base');
  const [umbralPct, setUmbralPct] = useState(20);
  const [plazoCobro, setPlazoCobro] = useState(30);

  const multiplicadores = { conservador: 0.7, base: 1.0, optimista: 1.3 };

  const proyeccion = useMemo(() => {
    // Mapeamos montoReal (bruto con IVA) como si fuera neto para que
    // el motor de proyección trabaje en valores de caja reales.
    const ventasBrutas = (ventas?.rows || []).map((r) => ({
      ...r,
      neto: r.montoReal ?? r.neto ?? 0,
    }));
    return proyectar({
      saldoInicial: saldoActualBancos(bancos),
      ventasRows: ventasBrutas,
      calendario,
      leasingDetalle,
      creditoPendiente,
      hoy,
      dias: 90,
      plazoCobro,
      multiplicadorIngresos: multiplicadores[escenario],
      leasingCampo: 'cuotaCLPcIVA',
    });
  }, [bancos, ventas, calendario, leasingDetalle, creditoPendiente, hoy, escenario, plazoCobro]);

  const {
    serie,
    saldoInicial,
    saldoFinal,
    saldoMin,
    primerCruceNegativo,
    totalIngConocidos,
    totalIngEstimados,
  } = proyeccion;

  const umbralAbsoluto = saldoInicial * (umbralPct / 100);
  const tocaUmbral = serie.find((d) => d.saldo < umbralAbsoluto && d.saldo >= 0);
  const pctConocido =
    totalIngConocidos + totalIngEstimados > 0
      ? totalIngConocidos / (totalIngConocidos + totalIngEstimados)
      : 0;

  const VW = 860,
    VH = 240,
    padL = 46,
    padR = 14,
    padT = 20,
    padB = 40;
  const chartW = VW - padL - padR,
    chartH = VH - padT - padB;

  const minY = Math.min(0, ...serie.map((d) => d.saldo));
  const maxY = Math.max(saldoInicial, ...serie.map((d) => d.saldo));
  const rangeY = maxY - minY || 1;

  const xScale = (i) => padL + (chartW * i) / Math.max(serie.length - 1, 1);
  const yScale = (v) => padT + chartH * (1 - (v - minY) / rangeY);

  const linePoints = serie.map((d, i) => `${xScale(i)},${yScale(d.saldo)}`).join(' ');
  const areaPoints = [
    `${xScale(0)},${yScale(minY)}`,
    ...serie.map((d, i) => `${xScale(i)},${yScale(d.saldo)}`),
    `${xScale(serie.length - 1)},${yScale(minY)}`,
  ].join(' ');

  const tieneEgresosGrandes = serie
    .map((d, i) => ({ ...d, i }))
    .filter((d) => d.egreso > proyeccion.promedioFallback * 3)
    .slice(0, 6);

  const miniEyebrow = {
    fontSize: S.xxs,
    color: C.tm,
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    marginBottom: 4,
    fontWeight: W.sb,
  };

  return (
    <Card C={C} pad={isMobile ? "md" : "lg"}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: SP.sm,
          marginBottom: SP.md,
        }}
      >
        <div>
          <div
            style={{
              fontSize: S.md,
              fontWeight: W.sb,
              color: C.text,
              marginBottom: 2,
              letterSpacing: "-0.2px",
            }}
          >
            Proyección de saldo · próximos 90 días (con IVA)
          </div>
          <div style={{ fontSize: S.xs, color: C.tm, fontWeight: W.m }}>
            Parte de {f(saldoInicial)} · {Math.round(pctConocido * 100)}% de ingresos ya facturados
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            gap: 2,
            background: C.surfaceAlt,
            padding: 2,
            borderRadius: R.md,
            border: `1px solid ${C.border}`,
          }}
        >
          {[
            { key: 'conservador', label: '−30%' },
            { key: 'base', label: 'Base' },
            { key: 'optimista', label: '+30%' },
          ].map((e) => (
            <button
              key={e.key}
              onClick={() => setEscenario(e.key)}
              style={{
                padding: `${SP.xs}px ${SP.md}px`,
                borderRadius: R.sm,
                fontSize: S.xs,
                fontWeight: W.sb,
                background: escenario === e.key ? C.accent : 'transparent',
                color: escenario === e.key ? '#fff' : C.tm,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 120ms ease',
              }}
            >
              {e.label}
            </button>
          ))}
        </div>
      </div>

      {/* Métricas clave */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: SP.sm,
          marginBottom: SP.lg,
        }}
      >
        <div style={{ background: C.surfaceAlt, borderRadius: R.md, padding: `${SP.sm}px ${SP.md}px` }}>
          <div style={miniEyebrow}>Saldo final (día 90)</div>
          <div
            style={{
              fontSize: S.lg,
              fontWeight: W.sb,
              color: saldoFinal >= saldoInicial ? C.green : saldoFinal >= 0 ? C.amber : C.red,
              fontFamily: MONO,
              letterSpacing: "-0.2px",
            }}
          >
            {fS(saldoFinal)}
          </div>
          <div style={{ fontSize: S.xxs, color: C.td, marginTop: 2, fontWeight: W.m }}>
            {saldoFinal >= saldoInicial ? '+' : ''}
            {fS(saldoFinal - saldoInicial)} vs hoy
          </div>
        </div>

        <div style={{ background: C.surfaceAlt, borderRadius: R.md, padding: `${SP.sm}px ${SP.md}px` }}>
          <div style={miniEyebrow}>Saldo mínimo</div>
          <div
            style={{
              fontSize: S.lg,
              fontWeight: W.sb,
              color: saldoMin.saldo < 0 ? C.red : saldoMin.saldo < umbralAbsoluto ? C.amber : C.text,
              fontFamily: MONO,
              letterSpacing: "-0.2px",
            }}
          >
            {fS(saldoMin.saldo)}
          </div>
          <div style={{ fontSize: S.xxs, color: C.td, marginTop: 2, fontWeight: W.m }}>
            el {fd(saldoMin.fecha)}
          </div>
        </div>

        {primerCruceNegativo ? (
          <div
            style={{
              background: C.redD,
              borderRadius: R.md,
              padding: `${SP.sm}px ${SP.md}px`,
              border: `1px solid ${C.red}44`,
            }}
          >
            <div style={{ ...miniEyebrow, color: C.red }}>⚠ Saldo negativo</div>
            <div style={{ fontSize: S.lg, fontWeight: W.sb, color: C.red, fontFamily: MONO }}>
              el {fd(primerCruceNegativo.fecha)}
            </div>
            <div style={{ fontSize: S.xxs, color: C.red, marginTop: 2, opacity: 0.85, fontWeight: W.m }}>
              {fS(primerCruceNegativo.saldo)}
            </div>
          </div>
        ) : tocaUmbral ? (
          <div
            style={{
              background: C.amberD,
              borderRadius: R.md,
              padding: `${SP.sm}px ${SP.md}px`,
              border: `1px solid ${C.amber}44`,
            }}
          >
            <div style={{ ...miniEyebrow, color: C.amberT }}>Bajo del {umbralPct}%</div>
            <div style={{ fontSize: S.lg, fontWeight: W.sb, color: C.amberT, fontFamily: MONO }}>
              el {fd(tocaUmbral.fecha)}
            </div>
          </div>
        ) : (
          <div
            style={{
              background: C.greenD,
              borderRadius: R.md,
              padding: `${SP.sm}px ${SP.md}px`,
              border: `1px solid ${C.green}44`,
            }}
          >
            <div style={{ ...miniEyebrow, color: C.greenT }}>Sin riesgos</div>
            <div style={{ fontSize: S.md, fontWeight: W.sb, color: C.greenT }}>
              Saldo estable 90d
            </div>
          </div>
        )}
      </div>

      {/* Gráfico */}
      <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
        {[0, 0.25, 0.5, 0.75, 1].map((p) => {
          const y = padT + chartH * p;
          const valor = maxY - rangeY * p;
          return (
            <g key={p}>
              <line
                x1={padL}
                y1={y}
                x2={VW - padR}
                y2={y}
                stroke={C.border}
                strokeWidth="0.5"
                strokeDasharray={p === 0 || p === 1 ? '0' : '3,3'}
              />
              <text
                x={padL - 8}
                y={y + 3}
                textAnchor="end"
                fontSize="10"
                fontWeight="500"
                fill={C.tm}
                fontFamily={MONO}
              >
                {fS(valor)}
              </text>
            </g>
          );
        })}

        {minY < 0 && (
          <line x1={padL} y1={yScale(0)} x2={VW - padR} y2={yScale(0)} stroke={C.red} strokeWidth="1" />
        )}

        {umbralAbsoluto > 0 && umbralAbsoluto > minY && umbralAbsoluto < maxY && (
          <line
            x1={padL}
            y1={yScale(umbralAbsoluto)}
            x2={VW - padR}
            y2={yScale(umbralAbsoluto)}
            stroke={C.amber}
            strokeWidth="0.8"
            strokeDasharray="4,3"
            opacity={0.7}
          />
        )}

        <polygon points={areaPoints} fill={C.accent} opacity={0.12} />
        <polyline
          points={linePoints}
          fill="none"
          stroke={C.accent}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {tieneEgresosGrandes.map((d) => (
          <g key={d.fecha}>
            <circle cx={xScale(d.i)} cy={yScale(d.saldo)} r={4} fill={C.red} />
            <text
              x={xScale(d.i)}
              y={yScale(d.saldo) - 10}
              textAnchor="middle"
              fontSize="9"
              fill={C.red}
              fontWeight="700"
              fontFamily={MONO}
            >
              {fS(d.egreso)}
            </text>
          </g>
        ))}

        {serie.map((d, i) => {
          if (i % 15 !== 0 && i !== serie.length - 1) return null;
          const fecha = new Date(d.fecha + 'T12:00:00');
          return (
            <text
              key={d.fecha}
              x={xScale(i)}
              y={VH - 14}
              textAnchor="middle"
              fontSize="10"
              fontWeight="500"
              fill={C.tm}
            >
              {fecha.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
            </text>
          );
        })}

        <circle cx={xScale(0)} cy={yScale(saldoInicial)} r={4} fill={C.accent} />
        <text
          x={xScale(0) + 8}
          y={yScale(saldoInicial) - 8}
          fontSize="10"
          fill={C.accent}
          fontWeight="700"
        >
          Hoy
        </text>
      </svg>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: SP.md,
          marginTop: SP.md,
          fontSize: S.xs,
          color: C.tm,
          flexWrap: 'wrap',
          fontWeight: W.m,
        }}
      >
        <label style={{ display: 'flex', alignItems: 'center', gap: SP.xs }}>
          Plazo de cobro:
          <select
            value={plazoCobro}
            onChange={(e) => setPlazoCobro(Number(e.target.value))}
            style={{
              padding: `2px ${SP.sm}px`,
              borderRadius: R.sm,
              fontSize: S.xs,
              fontWeight: W.sb,
              background: C.surfaceAlt,
              color: C.text,
              border: `1px solid ${C.border}`,
              cursor: 'pointer',
            }}
          >
            <option value={30}>30 días</option>
            <option value={45}>45 días</option>
            <option value={60}>60 días</option>
          </select>
        </label>
        <span style={{ color: C.border }}>·</span>
        <label style={{ display: 'flex', alignItems: 'center', gap: SP.xs }}>
          Umbral de alerta:
          <input
            type="range"
            min="0"
            max="50"
            step="5"
            value={umbralPct}
            onChange={(e) => setUmbralPct(Number(e.target.value))}
            style={{ width: 90 }}
          />
          <span style={{ color: C.amberT, fontWeight: W.b, minWidth: 34 }}>{umbralPct}%</span>
        </label>
        <span style={{ color: C.border }}>·</span>
        <span style={{ color: C.td }}>
          Ingresos estimados con el mismo mes del año anterior; si no hay data, promedio últimos 60 días.
        </span>
      </div>
    </Card>
  );
}
