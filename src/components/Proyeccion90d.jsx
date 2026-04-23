import { useMemo, useState } from 'react';
import { f, fS, fd } from '../utils/format.js';
import { saldoActualBancos, proyectar } from '../utils/proyeccion.js';

// Proyección visual del saldo bancario para los próximos 90 días.
// Todo en neto (sin IVA). Ingresos desfasados por plazo de cobro.
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
    return proyectar({
      saldoInicial: saldoActualBancos(bancos),
      ventasRows: ventas?.rows || [],
      calendario,
      leasingDetalle,
      creditoPendiente,
      hoy,
      dias: 90,
      plazoCobro,
      multiplicadorIngresos: multiplicadores[escenario],
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

  // ─── Gráfico SVG ─────────────────────────────────────────────────────
  const W = 860,
    H = 240,
    padL = 40,
    padR = 14,
    padT = 20,
    padB = 40;
  const chartW = W - padL - padR,
    chartH = H - padT - padB;

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

  return (
    <div
      style={{
        background: C.surface,
        borderRadius: 10,
        padding: isMobile ? '14px' : '18px 20px',
        border: `0.5px solid ${C.border}`,
        marginBottom: 12,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: C.text,
              marginBottom: 2,
            }}
          >
            Proyección de saldo · próximos 90 días (neto)
          </div>
          <div style={{ fontSize: 11, color: C.td }}>
            Parte de {f(saldoInicial)} · {Math.round(pctConocido * 100)}% de ingresos ya facturados
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {[
            { key: 'conservador', label: '-30%' },
            { key: 'base', label: 'Base' },
            { key: 'optimista', label: '+30%' },
          ].map((e) => (
            <button
              key={e.key}
              onClick={() => setEscenario(e.key)}
              style={{
                padding: '4px 10px',
                borderRadius: 4,
                fontSize: 11,
                background: escenario === e.key ? C.accent : C.surfaceAlt,
                color: escenario === e.key ? '#fff' : C.tm,
                border: `0.5px solid ${escenario === e.key ? C.accent : C.border}`,
                cursor: 'pointer',
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 8,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            background: C.surfaceAlt,
            borderRadius: 8,
            padding: '10px 12px',
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: C.tm,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: 3,
            }}
          >
            Saldo final (día 90)
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: saldoFinal >= saldoInicial ? C.green : saldoFinal >= 0 ? C.amber : C.red,
              fontFamily: 'monospace',
            }}
          >
            {fS(saldoFinal)}
          </div>
          <div style={{ fontSize: 10, color: C.td, marginTop: 2 }}>
            {saldoFinal >= saldoInicial ? '+' : ''}
            {fS(saldoFinal - saldoInicial)} vs hoy
          </div>
        </div>

        <div
          style={{
            background: C.surfaceAlt,
            borderRadius: 8,
            padding: '10px 12px',
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: C.tm,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: 3,
            }}
          >
            Saldo mínimo
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: saldoMin.saldo < 0 ? C.red : saldoMin.saldo < umbralAbsoluto ? C.amber : C.text,
              fontFamily: 'monospace',
            }}
          >
            {fS(saldoMin.saldo)}
          </div>
          <div style={{ fontSize: 10, color: C.td, marginTop: 2 }}>el {fd(saldoMin.fecha)}</div>
        </div>

        {primerCruceNegativo ? (
          <div
            style={{
              background: C.redD,
              borderRadius: 8,
              padding: '10px 12px',
              border: `0.5px solid ${C.red}44`,
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: C.red,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: 3,
              }}
            >
              ⚠ Saldo negativo
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: C.red,
              }}
            >
              el {fd(primerCruceNegativo.fecha)}
            </div>
            <div style={{ fontSize: 10, color: C.red, marginTop: 2, opacity: 0.8 }}>
              {fS(primerCruceNegativo.saldo)}
            </div>
          </div>
        ) : tocaUmbral ? (
          <div
            style={{
              background: C.amberD,
              borderRadius: 8,
              padding: '10px 12px',
              border: `0.5px solid ${C.amber}44`,
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: C.amberT,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: 3,
              }}
            >
              Bajo del {umbralPct}%
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: C.amberT,
              }}
            >
              el {fd(tocaUmbral.fecha)}
            </div>
          </div>
        ) : (
          <div
            style={{
              background: C.greenD,
              borderRadius: 8,
              padding: '10px 12px',
              border: `0.5px solid ${C.green}44`,
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: C.greenT,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: 3,
              }}
            >
              Sin riesgos
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: C.greenT,
              }}
            >
              Saldo estable 90d
            </div>
          </div>
        )}
      </div>

      {/* Gráfico */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', overflow: 'visible' }}
      >
        {/* Líneas guía Y */}
        {[0, 0.25, 0.5, 0.75, 1].map((p) => {
          const y = padT + chartH * p;
          const valor = maxY - rangeY * p;
          return (
            <g key={p}>
              <line
                x1={padL}
                y1={y}
                x2={W - padR}
                y2={y}
                stroke={C.border}
                strokeWidth="0.5"
                strokeDasharray={p === 0 || p === 1 ? '0' : '3,3'}
              />
              <text
                x={padL - 6}
                y={y + 3}
                textAnchor="end"
                fontSize="9"
                fill={C.td}
                fontFamily="monospace"
              >
                {fS(valor)}
              </text>
            </g>
          );
        })}

        {/* Línea de cero si el rango cruza negativos */}
        {minY < 0 && (
          <line
            x1={padL}
            y1={yScale(0)}
            x2={W - padR}
            y2={yScale(0)}
            stroke={C.red}
            strokeWidth="0.8"
          />
        )}

        {/* Línea de umbral */}
        {umbralAbsoluto > 0 && umbralAbsoluto > minY && umbralAbsoluto < maxY && (
          <line
            x1={padL}
            y1={yScale(umbralAbsoluto)}
            x2={W - padR}
            y2={yScale(umbralAbsoluto)}
            stroke={C.amber}
            strokeWidth="0.6"
            strokeDasharray="4,3"
            opacity={0.6}
          />
        )}

        {/* Área */}
        <polygon points={areaPoints} fill={C.accent} opacity={0.1} />
        {/* Línea */}
        <polyline
          points={linePoints}
          fill="none"
          stroke={C.accent}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />

        {/* Puntos rojos en egresos grandes */}
        {tieneEgresosGrandes.map((d) => (
          <g key={d.fecha}>
            <circle cx={xScale(d.i)} cy={yScale(d.saldo)} r={3.5} fill={C.red} />
            <text
              x={xScale(d.i)}
              y={yScale(d.saldo) - 8}
              textAnchor="middle"
              fontSize="8"
              fill={C.red}
              fontWeight="600"
            >
              {fS(d.egreso)}
            </text>
          </g>
        ))}

        {/* Etiquetas X cada ~15 días */}
        {serie.map((d, i) => {
          if (i % 15 !== 0 && i !== serie.length - 1) return null;
          const fecha = new Date(d.fecha + 'T12:00:00');
          return (
            <text
              key={d.fecha}
              x={xScale(i)}
              y={H - 14}
              textAnchor="middle"
              fontSize="9"
              fill={C.td}
            >
              {fecha.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
            </text>
          );
        })}

        {/* Label punto inicial */}
        <circle cx={xScale(0)} cy={yScale(saldoInicial)} r={3} fill={C.accent} />
        <text x={xScale(0) + 6} y={yScale(saldoInicial) - 6} fontSize="9" fill={C.accent}>
          Hoy
        </text>
      </svg>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginTop: 10,
          fontSize: 10,
          color: C.td,
          flexWrap: 'wrap',
        }}
      >
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          Plazo de cobro:
          <select
            value={plazoCobro}
            onChange={(e) => setPlazoCobro(Number(e.target.value))}
            style={{
              padding: '2px 6px',
              borderRadius: 4,
              fontSize: 10,
              background: C.surfaceAlt,
              color: C.text,
              border: `0.5px solid ${C.border}`,
            }}
          >
            <option value={30}>30 días</option>
            <option value={45}>45 días</option>
            <option value={60}>60 días</option>
          </select>
        </label>
        <span style={{ color: C.border }}>·</span>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          Umbral de alerta:
          <input
            type="range"
            min="0"
            max="50"
            step="5"
            value={umbralPct}
            onChange={(e) => setUmbralPct(Number(e.target.value))}
            style={{ width: 80 }}
          />
          <span style={{ color: C.amberT, fontWeight: 600, minWidth: 30 }}>{umbralPct}%</span>
        </label>
        <span style={{ color: C.border }}>·</span>
        <span>
          Ingresos estimados con el mismo mes del año anterior; si no hay data, promedio últimos
          60 días.
        </span>
      </div>
    </div>
  );
}
