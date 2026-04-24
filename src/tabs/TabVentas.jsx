import { useMemo, useState } from 'react';
import { f, fS, fd, mesLabel } from '../utils/format.js';
import { S, W, R, SP } from '../utils/theme.js';
import { Card, Eyebrow } from '../components/common.jsx';

const MONO = "'SF Mono', ui-monospace, Menlo, Consolas, monospace";

// Pestaña Ventas: métricas, evolución mensual, top clientes, tabla de facturas.
// `ventas` viene de data.js con { rows, porMes, porDia }.
export default function TabVentas({ C, ventas, isMobile, hoy }) {
  const [clienteFiltro, setClienteFiltro] = useState('');
  const [anioFiltro, setAnioFiltro] = useState('TODOS');

  const rows = useMemo(() => ventas?.rows || [], [ventas]);
  const porMes = useMemo(() => ventas?.porMes || [], [ventas]);

  const aniosDisponibles = useMemo(() => {
    const s = new Set(rows.map((r) => r.fecha.substring(0, 4)));
    return [...s].sort().reverse();
  }, [rows]);

  const rowsFiltradas = useMemo(() => {
    return rows.filter((r) => {
      if (anioFiltro !== 'TODOS' && !r.fecha.startsWith(anioFiltro)) return false;
      if (clienteFiltro && !r.razonSocial.toLowerCase().includes(clienteFiltro.toLowerCase()))
        return false;
      return true;
    });
  }, [rows, anioFiltro, clienteFiltro]);

  const mesActual = hoy.substring(0, 7);
  const anioActual = hoy.substring(0, 4);
  const anioPasado = String(Number(anioActual) - 1);
  const mesAnioPasado = `${anioPasado}-${mesActual.slice(5)}`;

  const rowsMes = rows.filter((r) => r.fecha.startsWith(mesActual));
  const rowsAnio = rows.filter((r) => r.fecha.startsWith(anioActual));
  const totalMes = rowsMes.reduce((s, r) => s + r.neto, 0);
  const totalAnio = rowsAnio.reduce((s, r) => s + r.neto, 0);
  const facturasMes = rowsMes.length;
  const facturasAnio = rowsAnio.length;
  const ticketPromedio = facturasAnio > 0 ? totalAnio / facturasAnio : 0;

  const afectasYTD = rowsAnio.filter((r) => r.afecta).reduce((s, r) => s + r.neto, 0);
  const exentasYTD = rowsAnio.filter((r) => !r.afecta).reduce((s, r) => s + r.neto, 0);
  const pctAfectas = totalAnio > 0 ? afectasYTD / totalAnio : 0;

  const totalMismoMesAnioPasado = rows
    .filter((r) => r.fecha.startsWith(mesAnioPasado))
    .reduce((s, r) => s + r.neto, 0);
  const deltaMesYoY =
    totalMismoMesAnioPasado > 0
      ? (totalMes - totalMismoMesAnioPasado) / totalMismoMesAnioPasado
      : null;

  const mmddHoy = hoy.slice(5);
  const totalAnioPasadoALaFecha = rows
    .filter((r) => r.fecha.startsWith(anioPasado) && r.fecha.slice(5) <= mmddHoy)
    .reduce((s, r) => s + r.neto, 0);
  const deltaAnioYoY =
    totalAnioPasadoALaFecha > 0
      ? (totalAnio - totalAnioPasadoALaFecha) / totalAnioPasadoALaFecha
      : null;

  const topClientes = useMemo(() => {
    const base = anioFiltro === 'TODOS' ? rows : rowsAnio;
    const map = {};
    base.forEach((r) => {
      const k = r.razonSocial || 'SIN RAZON SOCIAL';
      if (!map[k]) map[k] = { cliente: k, monto: 0, facturas: 0 };
      map[k].monto += r.neto;
      map[k].facturas += 1;
    });
    return Object.values(map)
      .sort((a, b) => b.monto - a.monto)
      .slice(0, 10);
  }, [rows, rowsAnio, anioFiltro]);

  const porMesNetoMap = useMemo(() => {
    const m = {};
    porMes.forEach((r) => (m[r.mes] = r.neto));
    return m;
  }, [porMes]);

  const mesesGrafico = useMemo(() => {
    const ultimos = porMes.slice(-12);
    return ultimos.map((m) => {
      const [y, mm] = m.mes.split('-').map(Number);
      const mesPasado = `${y - 1}-${String(mm).padStart(2, '0')}`;
      return {
        mes: m.mes,
        neto: m.neto,
        netoAnioPasado: porMesNetoMap[mesPasado] || 0,
      };
    });
  }, [porMes, porMesNetoMap]);

  const maxMes = mesesGrafico.reduce(
    (m, r) => Math.max(m, r.neto, r.netoAnioPasado),
    0,
  );

  const facturasTabla = useMemo(
    () =>
      [...rowsFiltradas]
        .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.folio.localeCompare(a.folio))
        .slice(0, 50),
    [rowsFiltradas],
  );

  if (rows.length === 0) {
    return (
      <Card C={C} style={{ textAlign: 'center', color: C.td, fontSize: S.base, padding: SP.xl2 }}>
        Sin datos de ventas disponibles. Verifica que la hoja esté publicada.
      </Card>
    );
  }

  const metricCard = (label, value, sub, color) => (
    <Card C={C} pad={isMobile ? "sm" : "md"} style={{ flex: 1, minWidth: isMobile ? 150 : 180 }}>
      <Eyebrow C={C}>{label}</Eyebrow>
      <div
        style={{
          fontSize: isMobile ? S.xl : S.xl2,
          fontWeight: W.sb,
          color: color || C.text,
          fontFamily: MONO,
          lineHeight: 1.15,
          letterSpacing: "-0.3px",
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: S.xs, color: C.td, marginTop: SP.xs, fontWeight: W.m }}>{sub}</div>
      )}
    </Card>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SP.md }}>
      <div style={{ display: 'flex', gap: SP.md, flexWrap: 'wrap' }}>
        {metricCard(
          'Facturado mes',
          f(totalMes),
          deltaMesYoY !== null
            ? `${deltaMesYoY >= 0 ? '+' : ''}${Math.round(deltaMesYoY * 100)}% vs mismo mes ${anioPasado}`
            : `${facturasMes} facturas`,
          C.accent,
        )}
        {metricCard(
          `Facturado ${anioActual}`,
          f(totalAnio),
          deltaAnioYoY !== null
            ? `${deltaAnioYoY >= 0 ? '+' : ''}${Math.round(deltaAnioYoY * 100)}% vs ${anioPasado} a la fecha`
            : `${facturasAnio} facturas`,
          C.teal,
        )}
        {metricCard('Ticket promedio', f(ticketPromedio), 'Neto sobre YTD', C.amber)}
        {metricCard(
          'Afectas vs exentas',
          `${Math.round(pctAfectas * 100)}%`,
          `${fS(afectasYTD)} / ${fS(exentasYTD)}`,
          C.purple,
        )}
      </div>

      {/* Gráfico evolución mensual */}
      {mesesGrafico.length > 0 && (
        <Card C={C}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: SP.md,
              gap: SP.sm,
              flexWrap: 'wrap',
            }}
          >
            <Eyebrow C={C} style={{ marginBottom: 0 }}>
              Evolución últimos {mesesGrafico.length} meses · neto
            </Eyebrow>
            <div style={{ display: 'flex', gap: SP.md, fontSize: S.xs, color: C.td, fontWeight: W.m }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: SP.xs }}>
                <span style={{ width: 10, height: 10, background: C.teal, borderRadius: 2 }} />
                {anioActual}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: SP.xs }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    background: C.teal,
                    borderRadius: 2,
                    opacity: 0.3,
                  }}
                />
                {anioPasado}
              </span>
            </div>
          </div>
          <svg
            viewBox={`0 0 ${Math.max(mesesGrafico.length * 50, 200)} 160`}
            style={{ width: '100%', height: 180, overflow: 'visible' }}
          >
            {[0.25, 0.5, 0.75, 1].map((p) => (
              <line
                key={p}
                x1={0}
                y1={140 * (1 - p) + 10}
                x2={mesesGrafico.length * 50}
                y2={140 * (1 - p) + 10}
                stroke={C.border}
                strokeWidth="0.5"
                strokeDasharray="3,3"
              />
            ))}
            {mesesGrafico.map((m, i) => {
              const h = maxMes > 0 ? (m.neto / maxMes) * 120 : 0;
              const hYoY = maxMes > 0 ? (m.netoAnioPasado / maxMes) * 120 : 0;
              const x = i * 50 + 8;
              const y = 130 - h;
              const yYoY = 130 - hYoY;
              const esHoy = m.mes === mesActual;
              return (
                <g key={m.mes}>
                  {m.netoAnioPasado > 0 && (
                    <rect
                      x={x - 4}
                      y={yYoY}
                      width={34}
                      height={hYoY}
                      fill={C.teal}
                      opacity={0.25}
                      rx={3}
                    />
                  )}
                  <rect
                    x={x}
                    y={y}
                    width={34}
                    height={h}
                    fill={esHoy ? C.accent : C.teal}
                    opacity={0.85}
                    rx={3}
                  />
                  <text
                    x={x + 17}
                    y={y - 4}
                    textAnchor="middle"
                    fontSize="10"
                    fill={esHoy ? C.text : C.tm}
                    fontWeight={esHoy ? 700 : 500}
                  >
                    {fS(m.neto)}
                  </text>
                  <text
                    x={x + 17}
                    y={152}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight={esHoy ? 700 : 500}
                    fill={esHoy ? C.accent : C.tm}
                  >
                    {mesLabel(m.mes)}
                  </text>
                </g>
              );
            })}
          </svg>
        </Card>
      )}

      {/* Filtros */}
      <div
        style={{
          display: 'flex',
          gap: SP.sm,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <select
          value={anioFiltro}
          onChange={(e) => setAnioFiltro(e.target.value)}
          style={{
            padding: `${SP.sm}px ${SP.md}px`,
            borderRadius: R.md,
            fontSize: S.base,
            fontWeight: W.m,
            background: C.surfaceAlt,
            color: C.text,
            border: `1px solid ${C.border}`,
            cursor: 'pointer',
          }}
        >
          <option value="TODOS">Todos los años</option>
          {aniosDisponibles.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <input
          value={clienteFiltro}
          onChange={(e) => setClienteFiltro(e.target.value)}
          placeholder="Buscar cliente…"
          style={{
            flex: 1,
            minWidth: 200,
            padding: `${SP.sm}px ${SP.md}px`,
            borderRadius: R.md,
            fontSize: S.base,
            fontWeight: W.m,
            background: C.surfaceAlt,
            color: C.text,
            border: `1px solid ${C.border}`,
            outline: 'none',
          }}
        />
      </div>

      {/* Top clientes */}
      <Card C={C}>
        <Eyebrow C={C}>
          Top 10 clientes por facturación neta · {anioFiltro === 'TODOS' ? 'histórico' : anioFiltro}
        </Eyebrow>
        {topClientes.map((c, i) => (
          <div
            key={c.cliente}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: SP.md,
              padding: `${SP.sm}px 0`,
              borderTop: i > 0 ? `1px solid ${C.border}` : 'none',
            }}
          >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: i < 3 ? C.accentD : C.surfaceAlt,
                color: i < 3 ? C.accent : C.tm,
                fontSize: S.sm,
                fontWeight: W.b,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {i + 1}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: S.base,
                  color: C.text,
                  fontWeight: W.m,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {c.cliente}
              </div>
              <div style={{ fontSize: S.xs, color: C.td, fontWeight: W.m }}>
                {c.facturas} factura{c.facturas !== 1 ? 's' : ''}
              </div>
            </div>
            <div
              style={{
                fontSize: S.md,
                fontWeight: W.sb,
                color: C.text,
                fontFamily: MONO,
                textAlign: 'right',
                letterSpacing: "-0.2px",
              }}
            >
              {fS(c.monto)}
            </div>
          </div>
        ))}
      </Card>

      {/* Últimas facturas */}
      <Card C={C} pad={isMobile ? "sm" : "md"}>
        <Eyebrow C={C}>
          Últimas facturas ({facturasTabla.length} de {rowsFiltradas.length})
        </Eyebrow>
        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: SP.xs }}>
            {facturasTabla.map((r, i) => (
              <div
                key={`${r.folio}-${i}`}
                style={{
                  background: C.surfaceAlt,
                  borderRadius: R.md,
                  padding: `${SP.sm}px ${SP.md}px`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: SP.xs,
                  }}
                >
                  <span style={{ fontSize: S.xs, color: C.tm, fontWeight: W.m }}>
                    #{r.folio} · {fd(r.fecha)}
                  </span>
                  <span
                    style={{
                      fontSize: S.xxs,
                      color: r.afecta ? C.accent : C.amberT,
                      fontWeight: W.b,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {r.afecta ? 'Afecta' : 'Exenta'}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: S.base,
                    color: C.text,
                    fontWeight: W.m,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginBottom: SP.xs,
                  }}
                >
                  {r.razonSocial}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                  }}
                >
                  <div
                    style={{
                      fontSize: S.md,
                      fontWeight: W.sb,
                      color: C.text,
                      fontFamily: MONO,
                      letterSpacing: "-0.2px",
                    }}
                  >
                    {f(r.neto)}
                  </div>
                  {r.afecta && (
                    <div
                      style={{
                        fontSize: S.xs,
                        color: C.td,
                        fontFamily: MONO,
                        fontWeight: W.m,
                      }}
                    >
                      c/IVA {fS(r.montoReal)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: S.base }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.borderL}` }}>
                  {['Fecha', 'Folio', 'Cliente', 'Tipo', 'Neto', 'Total c/IVA'].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: `${SP.sm}px ${SP.md}px`,
                        textAlign: h === 'Neto' || h === 'Total c/IVA' ? 'right' : 'left',
                        fontSize: S.xs,
                        color: C.tm,
                        fontWeight: W.sb,
                        textTransform: 'uppercase',
                        letterSpacing: "0.6px",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {facturasTabla.map((r, i) => (
                  <tr key={`${r.folio}-${i}`} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: `${SP.sm}px ${SP.md}px`, color: C.tm, fontSize: S.sm, fontWeight: W.m }}>
                      {fd(r.fecha)}
                    </td>
                    <td style={{ padding: `${SP.sm}px ${SP.md}px`, color: C.td, fontSize: S.sm, fontWeight: W.m }}>
                      {r.folio}
                    </td>
                    <td
                      style={{
                        padding: `${SP.sm}px ${SP.md}px`,
                        color: C.text,
                        fontWeight: W.m,
                        maxWidth: 280,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {r.razonSocial}
                    </td>
                    <td style={{ padding: `${SP.sm}px ${SP.md}px` }}>
                      <span
                        style={{
                          padding: `2px ${SP.sm}px`,
                          borderRadius: R.sm,
                          fontSize: S.xxs,
                          fontWeight: W.sb,
                          background: r.afecta ? C.accentD : C.amberD,
                          color: r.afecta ? C.accent : C.amberT,
                          textTransform: "uppercase",
                          letterSpacing: "0.4px",
                        }}
                      >
                        {r.afecta ? 'Afecta' : 'Exenta'}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: `${SP.sm}px ${SP.md}px`,
                        textAlign: 'right',
                        color: C.tm,
                        fontFamily: MONO,
                        fontWeight: W.m,
                      }}
                    >
                      {fS(r.neto)}
                    </td>
                    <td
                      style={{
                        padding: `${SP.sm}px ${SP.md}px`,
                        textAlign: 'right',
                        fontWeight: W.sb,
                        color: C.text,
                        fontFamily: MONO,
                      }}
                    >
                      {fS(r.montoReal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
