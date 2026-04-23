import { useMemo, useState } from 'react';
import { f, fS, fd, mesLabel } from '../utils/format.js';

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

  // Filas filtradas por año y cliente (aplica a tabla y a rankings).
  const rowsFiltradas = useMemo(() => {
    return rows.filter((r) => {
      if (anioFiltro !== 'TODOS' && !r.fecha.startsWith(anioFiltro)) return false;
      if (clienteFiltro && !r.razonSocial.toLowerCase().includes(clienteFiltro.toLowerCase()))
        return false;
      return true;
    });
  }, [rows, anioFiltro, clienteFiltro]);

  // ─── Métricas globales (todo en NETO) ──────────────────────────────────
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

  // Afectas vs exentas del año (neto).
  const afectasYTD = rowsAnio.filter((r) => r.afecta).reduce((s, r) => s + r.neto, 0);
  const exentasYTD = rowsAnio.filter((r) => !r.afecta).reduce((s, r) => s + r.neto, 0);
  const pctAfectas = totalAnio > 0 ? afectasYTD / totalAnio : 0;

  // Comparación año anterior: mismo mes y mismo periodo del año (hasta la fecha).
  const totalMismoMesAnioPasado = rows
    .filter((r) => r.fecha.startsWith(mesAnioPasado))
    .reduce((s, r) => s + r.neto, 0);
  const deltaMesYoY =
    totalMismoMesAnioPasado > 0
      ? (totalMes - totalMismoMesAnioPasado) / totalMismoMesAnioPasado
      : null;

  const mmddHoy = hoy.slice(5); // "MM-DD" del año actual
  const totalAnioPasadoALaFecha = rows
    .filter((r) => r.fecha.startsWith(anioPasado) && r.fecha.slice(5) <= mmddHoy)
    .reduce((s, r) => s + r.neto, 0);
  const deltaAnioYoY =
    totalAnioPasadoALaFecha > 0
      ? (totalAnio - totalAnioPasadoALaFecha) / totalAnioPasadoALaFecha
      : null;

  // ─── Top clientes por monto neto ───────────────────────────────────────
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

  // ─── Gráfico evolución mensual con YoY ─────────────────────────────────
  // Usa porMes.neto y superpone los mismos meses del año anterior.
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

  // Últimas facturas (máximo 50 en la tabla para no sobrecargar).
  const facturasTabla = useMemo(
    () =>
      [...rowsFiltradas]
        .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.folio.localeCompare(a.folio))
        .slice(0, 50),
    [rowsFiltradas],
  );

  if (rows.length === 0) {
    return (
      <div
        style={{
          background: C.surface,
          borderRadius: 10,
          padding: 24,
          border: `0.5px solid ${C.border}`,
          textAlign: 'center',
          color: C.td,
          fontSize: 13,
        }}
      >
        Sin datos de ventas disponibles. Verifica que la hoja esté publicada.
      </div>
    );
  }

  const metricCard = (label, value, sub, color) => (
    <div
      style={{
        background: C.surface,
        borderRadius: 10,
        padding: isMobile ? '12px 14px' : '14px 16px',
        border: `0.5px solid ${C.border}`,
        flex: 1,
        minWidth: isMobile ? 140 : 160,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: C.tm,
          marginBottom: 4,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: isMobile ? 18 : 22,
          fontWeight: 600,
          color: color || C.text,
          fontFamily: 'monospace',
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: C.td, marginTop: 3 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Métricas principales (todas en neto) */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
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
        <div
          style={{
            background: C.surface,
            borderRadius: 10,
            padding: '14px 16px',
            border: `0.5px solid ${C.border}`,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 12,
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: C.tm,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Evolución últimos {mesesGrafico.length} meses · neto
            </div>
            <div style={{ display: 'flex', gap: 10, fontSize: 10, color: C.td }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 10, background: C.teal, borderRadius: 2 }} />
                {anioActual}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
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
            style={{ width: '100%', height: 160, overflow: 'visible' }}
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
                      rx={2}
                    />
                  )}
                  <rect
                    x={x}
                    y={y}
                    width={34}
                    height={h}
                    fill={esHoy ? C.accent : C.teal}
                    opacity={0.85}
                    rx={2}
                  />
                  <text
                    x={x + 17}
                    y={y - 4}
                    textAnchor="middle"
                    fontSize="9"
                    fill={C.td}
                    fontWeight={esHoy ? 700 : 400}
                  >
                    {fS(m.neto)}
                  </text>
                  <text
                    x={x + 17}
                    y={152}
                    textAnchor="middle"
                    fontSize="10"
                    fill={esHoy ? C.accent : C.td}
                  >
                    {mesLabel(m.mes)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {/* Filtros */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <select
          value={anioFiltro}
          onChange={(e) => setAnioFiltro(e.target.value)}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            fontSize: 12,
            background: C.surfaceAlt,
            color: C.text,
            border: `0.5px solid ${C.border}`,
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
          placeholder="Buscar cliente..."
          style={{
            flex: 1,
            minWidth: 180,
            padding: '6px 12px',
            borderRadius: 6,
            fontSize: 12,
            background: C.surfaceAlt,
            color: C.text,
            border: `0.5px solid ${C.border}`,
          }}
        />
      </div>

      {/* Top clientes */}
      <div
        style={{
          background: C.surface,
          borderRadius: 10,
          padding: '14px 16px',
          border: `0.5px solid ${C.border}`,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: C.tm,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Top 10 clientes por facturación neta · {anioFiltro === 'TODOS' ? 'histórico' : anioFiltro}
          </div>
        </div>
        {topClientes.map((c, i) => (
          <div
            key={c.cliente}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 0',
              borderTop: i > 0 ? `0.5px solid ${C.border}` : 'none',
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: i < 3 ? C.accentD : C.surfaceAlt,
                color: i < 3 ? C.accent : C.tm,
                fontSize: 11,
                fontWeight: 600,
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
                  fontSize: 13,
                  color: C.text,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {c.cliente}
              </div>
              <div style={{ fontSize: 11, color: C.td }}>
                {c.facturas} factura{c.facturas !== 1 ? 's' : ''}
              </div>
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: C.text,
                fontFamily: 'monospace',
                textAlign: 'right',
              }}
            >
              {fS(c.monto)}
            </div>
          </div>
        ))}
      </div>

      {/* Últimas facturas */}
      <div
        style={{
          background: C.surface,
          borderRadius: 10,
          padding: isMobile ? '12px' : '14px 16px',
          border: `0.5px solid ${C.border}`,
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: C.tm,
            marginBottom: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Últimas facturas ({facturasTabla.length} de {rowsFiltradas.length})
        </div>
        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {facturasTabla.map((r, i) => (
              <div
                key={`${r.folio}-${i}`}
                style={{
                  background: C.surfaceAlt,
                  borderRadius: 8,
                  padding: '10px 12px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: 4,
                  }}
                >
                  <span style={{ fontSize: 12, color: C.tm }}>
                    #{r.folio} · {fd(r.fecha)}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: r.afecta ? C.accent : C.amberT,
                      fontWeight: 500,
                    }}
                  >
                    {r.afecta ? 'AFECTA' : 'EXENTA'}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: C.text,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginBottom: 4,
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
                      fontSize: 14,
                      fontWeight: 600,
                      color: C.text,
                      fontFamily: 'monospace',
                    }}
                  >
                    {f(r.neto)}
                  </div>
                  {r.afecta && (
                    <div
                      style={{
                        fontSize: 11,
                        color: C.td,
                        fontFamily: 'monospace',
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
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `0.5px solid ${C.borderL}` }}>
                {['Fecha', 'Folio', 'Cliente', 'Tipo', 'Neto', 'Total c/IVA'].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '8px 12px',
                      textAlign: h === 'Neto' || h === 'Total c/IVA' ? 'right' : 'left',
                      fontSize: 11,
                      color: C.td,
                      fontWeight: 500,
                      textTransform: 'uppercase',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {facturasTabla.map((r, i) => (
                <tr key={`${r.folio}-${i}`} style={{ borderBottom: `0.5px solid ${C.border}` }}>
                  <td style={{ padding: '7px 12px', color: C.tm, fontSize: 12 }}>{fd(r.fecha)}</td>
                  <td style={{ padding: '7px 12px', color: C.td, fontSize: 12 }}>{r.folio}</td>
                  <td
                    style={{
                      padding: '7px 12px',
                      color: C.text,
                      maxWidth: 260,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {r.razonSocial}
                  </td>
                  <td style={{ padding: '7px 12px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 500,
                        background: r.afecta ? C.accentD : C.amberD,
                        color: r.afecta ? C.accent : C.amberT,
                      }}
                    >
                      {r.afecta ? 'AFECTA' : 'EXENTA'}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: '7px 12px',
                      textAlign: 'right',
                      color: C.tm,
                      fontFamily: 'monospace',
                    }}
                  >
                    {fS(r.neto)}
                  </td>
                  <td
                    style={{
                      padding: '7px 12px',
                      textAlign: 'right',
                      fontWeight: 500,
                      color: C.text,
                      fontFamily: 'monospace',
                    }}
                  >
                    {fS(r.montoReal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
