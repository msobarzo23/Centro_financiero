import { useMemo, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Receipt,
  AlertTriangle,
  BarChart3,
  Search,
  CalendarRange,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  ReferenceLine,
} from 'recharts';
import { fmtPeso, fmtMM, fmtCLP, fd } from '../utils/format.js';
import { S, W, R, SP, FONT_TITLE, FONT_BODY, FONT_MONO } from '../utils/theme.js';
import { Card, Eyebrow, SectionTitle } from '../components/common.jsx';
import {
  comparacionMensual,
  totalYTD,
  proyectarEstacional,
  proyectarProrrateada,
  topClientes,
  calcularHHI,
  nivelHHI,
  clientesEnFuga,
  evolucionClientesMes,
  totalPorAnio,
  brechaYTD,
  etiquetaMes,
} from '../utils/ventasMetrics.js';
import { META_ANUAL, CLIENT_COLORS, nombreCliente } from '../config/ventasConfig.js';

// Pestaña Ventas: vista ejecutiva completa inspirada en dashboard-ventas,
// aplicando la skill frontend-design-bello.
export default function TabVentas({ C, ventas, isMobile, hoy }) {
  const rows = useMemo(() => ventas?.rows || [], [ventas]);

  const aniosDisponibles = useMemo(() => {
    const s = new Set(rows.map((r) => r.fecha.substring(0, 4)));
    return [...s].sort().reverse();
  }, [rows]);

  const [anioSel, setAnioSel] = useState(() => hoy.substring(0, 4));
  const [clienteFiltro, setClienteFiltro] = useState('');

  // Sincroniza selector si el año actual no está en los datos disponibles.
  const anioActual = anioSel in Object.fromEntries(aniosDisponibles.map((y) => [y, true]))
    ? anioSel
    : aniosDisponibles[0] || hoy.substring(0, 4);
  const anioPasado = String(Number(anioActual) - 1);

  const esAnioEnCurso = anioActual === hoy.substring(0, 4);
  const mmddCorte = esAnioEnCurso ? hoy.slice(5) : '12-31';
  const mesActualISO = esAnioEnCurso ? hoy.substring(0, 7) : `${anioActual}-12`;

  // ─── KPIs principales ─────────────────────────────────────────────────
  const totalActualYTD = totalYTD(rows, anioActual, mmddCorte);
  const totalAnteriorYTD = totalYTD(rows, anioPasado, mmddCorte);
  const brecha = brechaYTD(totalActualYTD, totalAnteriorYTD);

  const totalMesActual = useMemo(
    () => rows.filter((r) => r.fecha.startsWith(mesActualISO)).reduce((s, r) => s + (r.neto || 0), 0),
    [rows, mesActualISO],
  );
  const mesAnioPasado = `${anioPasado}-${mesActualISO.slice(5)}`;
  const totalMesAnioPasado = useMemo(
    () => rows.filter((r) => r.fecha.startsWith(mesAnioPasado)).reduce((s, r) => s + (r.neto || 0), 0),
    [rows, mesAnioPasado],
  );
  const deltaMesPct = totalMesAnioPasado > 0
    ? ((totalMesActual - totalMesAnioPasado) / totalMesAnioPasado) * 100
    : null;

  const facturasYTD = useMemo(
    () => rows.filter((r) => r.fecha.startsWith(anioActual) && r.fecha.slice(5) <= mmddCorte).length,
    [rows, anioActual, mmddCorte],
  );
  const ticketPromedio = facturasYTD > 0 ? totalActualYTD / facturasYTD : 0;

  // Proyecciones: estacional + prorrateada (solo para año en curso).
  const proyEstacional = useMemo(() => {
    if (!esAnioEnCurso) return totalActualYTD;
    return proyectarEstacional(rows, anioActual, anioPasado, mmddCorte);
  }, [rows, anioActual, anioPasado, mmddCorte, esAnioEnCurso, totalActualYTD]);

  const proyProrrateada = useMemo(() => {
    if (!esAnioEnCurso) return totalActualYTD;
    return proyectarProrrateada(totalActualYTD, Number(anioActual), hoy);
  }, [totalActualYTD, anioActual, hoy, esAnioEnCurso]);

  const pctVsMeta = META_ANUAL > 0 ? (proyEstacional / META_ANUAL) * 100 : 0;

  // ─── Comparación mensual ──────────────────────────────────────────────
  const metaMensual = META_ANUAL / 12;
  const compMensual = useMemo(
    () => comparacionMensual(rows, anioActual, anioPasado, metaMensual),
    [rows, anioActual, anioPasado, metaMensual],
  );

  // ─── Top clientes + HHI ───────────────────────────────────────────────
  const rowsAnioSel = useMemo(
    () => rows.filter((r) => r.fecha.startsWith(anioActual)),
    [rows, anioActual],
  );

  const { top: top10, restoMonto, restoShare, total: totalYear, clientesTotales } = useMemo(
    () => topClientes(rowsAnioSel, 10),
    [rowsAnioSel],
  );

  const hhi = useMemo(() => {
    const allShares = topClientes(rowsAnioSel, 9999).top.map((c) => c.share);
    return calcularHHI(allShares);
  }, [rowsAnioSel]);
  const nivel = nivelHHI(hhi);

  const pieData = useMemo(() => {
    const arr = top10.map((c, i) => ({
      name: c.cliente,
      value: c.monto,
      color: CLIENT_COLORS[i] || CLIENT_COLORS[CLIENT_COLORS.length - 1],
    }));
    if (restoMonto > 0) {
      arr.push({ name: 'Otros', value: restoMonto, color: '#94A3B8' });
    }
    return arr;
  }, [top10, restoMonto]);

  // ─── Clientes en fuga ─────────────────────────────────────────────────
  const fuga = useMemo(() => clientesEnFuga(rows, hoy, 2), [rows, hoy]);

  // ─── Evolución por cliente ────────────────────────────────────────────
  const evolucion = useMemo(() => evolucionClientesMes(rowsAnioSel, { nMeses: 12, topN: 5 }), [rowsAnioSel]);

  // ─── Histórico por año ────────────────────────────────────────────────
  const historico = useMemo(() => {
    const porA = totalPorAnio(rows);
    return Object.entries(porA)
      .map(([a, v]) => ({ anio: a, total: v }))
      .sort((a, b) => a.anio.localeCompare(b.anio));
  }, [rows]);

  // ─── Tabla de facturas ────────────────────────────────────────────────
  const facturasTabla = useMemo(() => {
    const filtered = rows.filter((r) => {
      if (!r.fecha.startsWith(anioActual)) return false;
      if (clienteFiltro && !r.razonSocial.toLowerCase().includes(clienteFiltro.toLowerCase())) return false;
      return true;
    });
    return [...filtered]
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || String(b.folio).localeCompare(String(a.folio)))
      .slice(0, 50);
  }, [rows, anioActual, clienteFiltro]);

  const facturasCount = useMemo(
    () => rows.filter((r) => r.fecha.startsWith(anioActual)
      && (!clienteFiltro || r.razonSocial.toLowerCase().includes(clienteFiltro.toLowerCase())),
    ).length,
    [rows, anioActual, clienteFiltro],
  );

  if (rows.length === 0) {
    return (
      <Card C={C} style={{ textAlign: 'center', color: C.td, fontSize: S.base, padding: SP.xl2 }}>
        Sin datos de ventas disponibles. Verifica que la hoja de Google Sheets esté publicada.
      </Card>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SP.lg, fontFamily: FONT_BODY }}>
      {/* Header con selector de año y meta */}
      <HeaderVentas
        C={C}
        isMobile={isMobile}
        anioActual={anioActual}
        aniosDisponibles={aniosDisponibles}
        onChangeAnio={setAnioSel}
        esAnioEnCurso={esAnioEnCurso}
        hoy={hoy}
      />

      {/* KPIs primarios (4) */}
      <div
        className="stagger"
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
          gap: SP.md,
        }}
      >
        <KpiCard
          C={C}
          Icon={TrendingUp}
          iconColor={C.accent}
          label={`Ventas ${anioActual} YTD`}
          value={fmtMM(totalActualYTD)}
          sub={`${fmtCLP(totalActualYTD)} · ${facturasYTD} facturas`}
        />
        <KpiCard
          C={C}
          Icon={CalendarRange}
          iconColor={C.tm}
          label={`${anioPasado} mismo periodo`}
          value={fmtMM(totalAnteriorYTD)}
          sub={`${fmtCLP(totalAnteriorYTD)}`}
        />
        <KpiCard
          C={C}
          Icon={brecha.abs >= 0 ? TrendingUp : TrendingDown}
          iconColor={brecha.abs >= 0 ? C.green : C.red}
          label="Brecha vs año anterior"
          value={`${brecha.abs >= 0 ? '+' : '−'}${fmtMM(Math.abs(brecha.abs)).replace('$', '$')}`}
          valueColor={brecha.abs >= 0 ? C.green : C.red}
          sub={brecha.pct !== null
            ? `${brecha.pct >= 0 ? '+' : ''}${brecha.pct.toFixed(1).replace('.', ',')}% sobre ${anioPasado}`
            : 'Sin base comparativa'}
        />
        <KpiCard
          C={C}
          Icon={Receipt}
          iconColor={C.teal}
          label={`Facturado ${etiquetaMes(Number(mesActualISO.slice(5)))} ${anioActual}`}
          value={fmtMM(totalMesActual)}
          sub={deltaMesPct !== null
            ? `${deltaMesPct >= 0 ? '+' : ''}${deltaMesPct.toFixed(1).replace('.', ',')}% vs ${anioPasado}`
            : 'Sin base comparativa'}
          subColor={deltaMesPct !== null ? (deltaMesPct >= 0 ? C.green : C.red) : C.td}
        />
      </div>

      {/* KPIs secundarios (3) */}
      <div
        className="stagger"
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: SP.md,
        }}
      >
        <KpiCard
          C={C}
          Icon={TrendingUp}
          iconColor={C.accent}
          label="Proyección anual (estacional)"
          value={fmtMM(proyEstacional)}
          sub={esAnioEnCurso
            ? `Prorrateada: ${fmtMM(proyProrrateada)}`
            : 'Año cerrado · total real'}
          valueColor={C.accent}
        />
        <KpiCard
          C={C}
          Icon={Target}
          iconColor={pctVsMeta >= 100 ? C.green : (pctVsMeta >= 85 ? C.amber : C.red)}
          label="% vs meta anual"
          value={`${pctVsMeta.toFixed(1).replace('.', ',')}%`}
          valueColor={pctVsMeta >= 100 ? C.green : (pctVsMeta >= 85 ? C.amber : C.red)}
          sub={`Meta: ${fmtMM(META_ANUAL)}`}
        />
        <KpiCard
          C={C}
          Icon={Receipt}
          iconColor={C.teal}
          label="Ticket promedio YTD"
          value={fmtPeso(ticketPromedio)}
          sub={`${fmtCLP(facturasYTD)} facturas netas`}
        />
      </div>

      {/* Comparación mensual */}
      <Card C={C} pad="lg">
        <SectionTitle
          C={C}
          serif
          right={
            <LegendDot C={C} items={[
              { label: anioActual, color: C.accent },
              { label: anioPasado, color: C.teal },
              { label: 'Meta mensual', color: C.amber, dashed: true },
            ]} />
          }
        >
          Comparación mensual · {anioActual} vs {anioPasado}
        </SectionTitle>
        <div style={{ width: '100%', height: isMobile ? 260 : 340 }}>
          <ResponsiveContainer>
            <ComposedChart data={compMensual} margin={{ top: 8, right: 8, left: isMobile ? -20 : 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis dataKey="label" stroke={C.tm} tick={{ fontSize: 12, fontFamily: FONT_BODY }} />
              <YAxis
                stroke={C.tm}
                tick={{ fontSize: 11, fontFamily: FONT_MONO }}
                tickFormatter={(v) => `${(v / 1_000_000).toLocaleString('es-CL', { maximumFractionDigits: 0 })}M`}
                width={isMobile ? 44 : 64}
              />
              <Tooltip content={<ChartTooltip C={C} />} cursor={{ fill: C.accentD }} />
              <Bar
                dataKey="anterior"
                name={anioPasado}
                fill={C.teal}
                radius={[4, 4, 0, 0]}
                animationDuration={800}
                animationEasing="ease-out"
              />
              <Bar
                dataKey="actual"
                name={anioActual}
                fill={C.accent}
                radius={[4, 4, 0, 0]}
                animationDuration={800}
                animationEasing="ease-out"
              />
              <Line
                type="monotone"
                dataKey="meta"
                stroke={C.amber}
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                name="Meta"
                animationDuration={800}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Participación Top 10 + ranking + HHI */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'minmax(280px, 1fr) 2fr',
          gap: SP.md,
        }}
      >
        <Card C={C} pad="lg">
          <SectionTitle C={C}>Participación {anioActual}</SectionTitle>
          <div style={{ width: '100%', height: isMobile ? 240 : 280 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="55%"
                  outerRadius="85%"
                  paddingAngle={1.5}
                  animationDuration={800}
                  animationEasing="ease-out"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke={C.surface} strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip C={C} percentOf={totalYear} />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: SP.sm }}>
            <Stat C={C} label="Clientes" value={fmtCLP(clientesTotales)} />
            <Stat
              C={C}
              label="Concentración HHI"
              value={Math.round(hhi).toLocaleString('es-CL')}
              valueColor={nivel.color}
              sub={nivel.label}
            />
          </div>
        </Card>

        <Card C={C} pad="lg">
          <SectionTitle
            C={C}
            right={
              <div style={{ fontSize: S.xs, color: C.tm, fontWeight: W.m }}>
                Top 10 · {fmtMM(totalYear)} YTD
              </div>
            }
          >
            Ranking de clientes {anioActual}
          </SectionTitle>
          <RankingClientes C={C} top={top10} restoMonto={restoMonto} restoShare={restoShare} isMobile={isMobile} />
        </Card>
      </div>

      {/* Clientes en fuga */}
      {fuga.length > 0 && (
        <Card C={C} pad="lg" style={{ borderLeft: `4px solid ${C.amber}` }}>
          <SectionTitle
            C={C}
            right={
              <div style={{ fontSize: S.xs, color: C.amberT, fontWeight: W.sb, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Valor histórico en riesgo: {fmtMM(fuga.reduce((s, f) => s + f.valorHistorico, 0))}
              </div>
            }
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: SP.sm }}>
              <AlertTriangle size={18} color={C.amber} />
              Clientes en fuga · {fuga.length}
            </span>
          </SectionTitle>
          <ClientesFuga C={C} data={fuga.slice(0, 6)} isMobile={isMobile} />
          {fuga.length > 6 && (
            <div style={{ marginTop: SP.md, fontSize: S.xs, color: C.td, fontWeight: W.m }}>
              Mostrando los 6 de mayor valor histórico · {fuga.length - 6} más sin mostrar.
            </div>
          )}
        </Card>
      )}

      {/* Evolución por cliente apilada */}
      <Card C={C} pad="lg">
        <SectionTitle
          C={C}
          right={
            <div style={{ fontSize: S.xs, color: C.tm, fontWeight: W.m }}>
              Top 5 clientes + Otros · últimos 12 meses
            </div>
          }
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: SP.sm }}>
            <BarChart3 size={18} color={C.accent} />
            Evolución por cliente
          </span>
        </SectionTitle>
        <div style={{ width: '100%', height: isMobile ? 280 : 340 }}>
          <ResponsiveContainer>
            <BarChart data={evolucion.data} margin={{ top: 8, right: 8, left: isMobile ? -20 : 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis dataKey="label" stroke={C.tm} tick={{ fontSize: 12, fontFamily: FONT_BODY }} />
              <YAxis
                stroke={C.tm}
                tick={{ fontSize: 11, fontFamily: FONT_MONO }}
                tickFormatter={(v) => `${(v / 1_000_000).toLocaleString('es-CL', { maximumFractionDigits: 0 })}M`}
                width={isMobile ? 44 : 64}
              />
              <Tooltip content={<ChartTooltip C={C} />} cursor={{ fill: C.accentD }} />
              <Legend wrapperStyle={{ fontSize: 12, fontFamily: FONT_BODY }} />
              {evolucion.series.map((s, i) => {
                const color = s === 'Otros'
                  ? '#94A3B8'
                  : CLIENT_COLORS[evolucion.series.filter((n) => n !== 'Otros').indexOf(s)] || CLIENT_COLORS[i];
                return (
                  <Bar
                    key={s}
                    dataKey={s}
                    stackId="clientes"
                    fill={color}
                    radius={i === evolucion.series.length - 1 ? [4, 4, 0, 0] : 0}
                    animationDuration={800}
                    animationEasing="ease-out"
                  />
                );
              })}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Histórico por año */}
      {historico.length > 1 && (
        <Card C={C} pad="lg">
          <SectionTitle C={C}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: SP.sm }}>
              <BarChart3 size={18} color={C.teal} />
              Histórico anual · {historico.length} años
            </span>
          </SectionTitle>
          <div style={{ width: '100%', height: isMobile ? 220 : 280 }}>
            <ResponsiveContainer>
              <BarChart data={historico} margin={{ top: 8, right: 8, left: isMobile ? -20 : 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                <XAxis dataKey="anio" stroke={C.tm} tick={{ fontSize: 12, fontFamily: FONT_BODY }} />
                <YAxis
                  stroke={C.tm}
                  tick={{ fontSize: 11, fontFamily: FONT_MONO }}
                  tickFormatter={(v) => `${(v / 1_000_000).toLocaleString('es-CL', { maximumFractionDigits: 0 })}M`}
                  width={isMobile ? 44 : 64}
                />
                <Tooltip content={<ChartTooltip C={C} labelKey="anio" />} cursor={{ fill: C.accentD }} />
                <ReferenceLine y={META_ANUAL} stroke={C.amber} strokeDasharray="6 4" strokeWidth={2} />
                <Bar
                  dataKey="total"
                  fill={C.teal}
                  radius={[4, 4, 0, 0]}
                  animationDuration={800}
                  animationEasing="ease-out"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Tabla de facturas */}
      <Card C={C} pad={isMobile ? 'sm' : 'md'}>
        <SectionTitle
          C={C}
          right={
            <div style={{ fontSize: S.xs, color: C.tm, fontWeight: W.m }}>
              Mostrando {facturasTabla.length} de {facturasCount}
            </div>
          }
        >
          Últimas facturas {anioActual}
        </SectionTitle>

        <div style={{ display: 'flex', gap: SP.sm, flexWrap: 'wrap', marginBottom: SP.md }}>
          <label
            style={{
              flex: 1,
              minWidth: 240,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              gap: SP.sm,
              background: C.surfaceAlt,
              border: `1px solid ${C.border}`,
              borderRadius: R.md,
              padding: `${SP.sm}px ${SP.md}px`,
            }}
          >
            <Search size={16} color={C.tm} />
            <input
              value={clienteFiltro}
              onChange={(e) => setClienteFiltro(e.target.value)}
              placeholder="Buscar cliente…"
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: S.base,
                fontWeight: W.m,
                color: C.text,
                fontFamily: FONT_BODY,
              }}
            />
          </label>
        </div>

        {isMobile ? (
          <TablaMobile C={C} rows={facturasTabla} />
        ) : (
          <TablaDesktop C={C} rows={facturasTabla} />
        )}
      </Card>
    </div>
  );
}

// ─── Subcomponentes ──────────────────────────────────────────────────────

function HeaderVentas({ C, isMobile, anioActual, aniosDisponibles, onChangeAnio, esAnioEnCurso, hoy }) {
  return (
    <div
      className="card-anim"
      style={{
        display: 'flex',
        alignItems: isMobile ? 'flex-start' : 'center',
        justifyContent: 'space-between',
        flexDirection: isMobile ? 'column' : 'row',
        gap: SP.md,
        padding: `${SP.md}px ${SP.lg}px`,
        background: `linear-gradient(135deg, ${C.accent}, ${C.accent}EE 60%, ${C.teal}DD)`,
        borderRadius: R.lg,
        color: '#FFFFFF',
        boxShadow: '0 4px 12px rgba(29,78,216,0.22)',
      }}
    >
      <div>
        <div
          style={{
            fontSize: isMobile ? S.xl2 : S.xl3,
            fontWeight: W.r,
            fontFamily: FONT_TITLE,
            lineHeight: 1.1,
            letterSpacing: '-0.5px',
          }}
        >
          Ventas {anioActual}
        </div>
        <div style={{ fontSize: S.sm, fontWeight: W.m, opacity: 0.85, marginTop: 4 }}>
          {esAnioEnCurso
            ? `YTD cortado al ${fd(hoy)}`
            : 'Año cerrado · cifras finales'}
        </div>
      </div>
      <div style={{ display: 'flex', gap: SP.sm, alignItems: 'center' }}>
        <label style={{ fontSize: S.xs, textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: W.sb, opacity: 0.85 }}>
          Año
        </label>
        <select
          value={anioActual}
          onChange={(e) => onChangeAnio(e.target.value)}
          style={{
            padding: `${SP.sm}px ${SP.md}px`,
            borderRadius: R.md,
            background: 'rgba(255,255,255,0.18)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.35)',
            fontSize: S.base,
            fontWeight: W.sb,
            fontFamily: FONT_MONO,
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          {aniosDisponibles.map((a) => (
            <option key={a} value={a} style={{ color: '#0F172A' }}>
              {a}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function KpiCard({ C, Icon, iconColor, label, value, valueColor, sub, subColor }) {
  return (
    <Card C={C} pad="md" hover>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: SP.sm }}>
        <Eyebrow C={C} style={{ marginBottom: 0 }}>{label}</Eyebrow>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: R.md,
            background: (iconColor || C.accent) + '1A',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: iconColor || C.accent,
            flexShrink: 0,
          }}
        >
          <Icon size={16} strokeWidth={2.25} />
        </div>
      </div>
      <div
        style={{
          fontSize: S.xl3,
          fontWeight: W.b,
          color: valueColor || C.text,
          fontFamily: FONT_MONO,
          letterSpacing: '-0.5px',
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: S.xs, color: subColor || C.tm, marginTop: SP.xs, fontWeight: W.m, fontFamily: FONT_BODY }}>
          {sub}
        </div>
      )}
    </Card>
  );
}

function LegendDot({ C, items }) {
  return (
    <div style={{ display: 'flex', gap: SP.md, fontSize: S.xs, color: C.tm, fontWeight: W.m, flexWrap: 'wrap' }}>
      {items.map((it) => (
        <span key={it.label} style={{ display: 'inline-flex', alignItems: 'center', gap: SP.xs }}>
          <span
            style={{
              width: 12,
              height: it.dashed ? 2 : 10,
              background: it.dashed ? 'transparent' : it.color,
              borderTop: it.dashed ? `2px dashed ${it.color}` : 'none',
              borderRadius: 2,
              display: 'inline-block',
            }}
          />
          {it.label}
        </span>
      ))}
    </div>
  );
}

function Stat({ C, label, value, valueColor, sub }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: S.xs, color: C.tm, fontWeight: W.sb, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </div>
      <div style={{ fontSize: S.xl, fontWeight: W.b, color: valueColor || C.text, fontFamily: FONT_MONO, marginTop: 2 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: S.xxs, color: valueColor || C.tm, fontWeight: W.sb, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function RankingClientes({ C, top, restoMonto, restoShare, isMobile }) {
  const all = [
    ...top,
    ...(restoMonto > 0
      ? [{ cliente: 'Otros clientes', monto: restoMonto, facturas: 0, share: restoShare, isOtros: true }]
      : []),
  ];
  const maxShare = Math.max(...all.map((c) => c.share), 1);

  return (
    <div>
      {all.map((c, i) => {
        const color = c.isOtros ? '#94A3B8' : (CLIENT_COLORS[i] || '#64748B');
        return (
          <div
            key={c.cliente + i}
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '28px 1fr auto' : '28px 1fr 180px auto',
              alignItems: 'center',
              gap: SP.sm,
              padding: `${SP.sm}px 0`,
              borderTop: i > 0 ? `1px solid ${C.border}` : 'none',
            }}
          >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: i < 3 && !c.isOtros ? color + '22' : C.surfaceAlt,
                color: i < 3 && !c.isOtros ? color : C.tm,
                fontSize: S.sm,
                fontWeight: W.b,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: FONT_MONO,
              }}
            >
              {c.isOtros ? '…' : i + 1}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: S.base,
                  color: C.text,
                  fontWeight: W.sb,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={c.cliente}
              >
                {c.cliente}
              </div>
              {!c.isOtros && (
                <div style={{ fontSize: S.xs, color: C.td, fontWeight: W.m, marginTop: 1 }}>
                  {c.facturas} factura{c.facturas !== 1 ? 's' : ''} · {c.share.toFixed(1).replace('.', ',')}% del total
                </div>
              )}
              {c.isOtros && (
                <div style={{ fontSize: S.xs, color: C.td, fontWeight: W.m, marginTop: 1 }}>
                  {c.share.toFixed(1).replace('.', ',')}% del total
                </div>
              )}
            </div>
            {!isMobile && (
              <div
                style={{
                  height: 8,
                  borderRadius: 4,
                  background: C.surfaceAlt,
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: `${(c.share / maxShare) * 100}%`,
                    height: '100%',
                    background: color,
                    transition: 'width 600ms cubic-bezier(0.2,0.7,0.2,1)',
                  }}
                />
              </div>
            )}
            <div
              style={{
                fontSize: S.md,
                fontWeight: W.b,
                color: C.text,
                fontFamily: FONT_MONO,
                textAlign: 'right',
                letterSpacing: '-0.2px',
              }}
            >
              {fmtMM(c.monto)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ClientesFuga({ C, data, isMobile }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
        gap: SP.sm,
      }}
    >
      {data.map((f) => (
        <div
          key={f.cliente}
          style={{
            background: C.amberD,
            border: `1px solid ${C.amber}44`,
            borderRadius: R.md,
            padding: `${SP.sm}px ${SP.md}px`,
            display: 'flex',
            alignItems: 'center',
            gap: SP.md,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: S.base,
                fontWeight: W.sb,
                color: C.text,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={f.cliente}
            >
              {f.cliente}
            </div>
            <div style={{ fontSize: S.xs, color: C.tm, fontWeight: W.m, marginTop: 2 }}>
              Última factura: {fd(f.ultimaFactura)} · hace {f.mesesSinFacturar} {f.mesesSinFacturar === 1 ? 'mes' : 'meses'}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: S.xs, color: C.amberT, textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: W.sb }}>
              En riesgo
            </div>
            <div style={{ fontSize: S.md, fontWeight: W.b, color: C.amberT, fontFamily: FONT_MONO, letterSpacing: '-0.2px' }}>
              {fmtMM(f.valorHistorico)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TablaDesktop({ C, rows }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: S.base,
          borderRadius: 0,
          overflow: 'hidden',
          fontFamily: FONT_BODY,
        }}
      >
        <thead>
          <tr style={{ background: C.accent, color: '#fff' }}>
            {[
              { k: 'Fecha', align: 'left' },
              { k: 'Folio', align: 'left' },
              { k: 'Cliente', align: 'left' },
              { k: 'Tipo', align: 'center' },
              { k: 'Neto', align: 'right' },
              { k: 'Total c/IVA', align: 'right' },
            ].map((h) => (
              <th
                key={h.k}
                style={{
                  padding: `${SP.sm + 2}px ${SP.md}px`,
                  textAlign: h.align,
                  fontSize: S.xs,
                  fontWeight: W.sb,
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
                  color: '#fff',
                }}
              >
                {h.k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={`${r.folio}-${i}`}
              style={{
                borderBottom: `1px solid ${C.border}`,
                background: i % 2 === 0 ? C.surface : C.surfaceAlt,
              }}
            >
              <td style={{ padding: `${SP.sm}px ${SP.md}px`, color: C.tm, fontSize: S.sm, fontWeight: W.m, fontFamily: FONT_MONO }}>
                {fd(r.fecha)}
              </td>
              <td style={{ padding: `${SP.sm}px ${SP.md}px`, color: C.td, fontSize: S.sm, fontWeight: W.m, fontFamily: FONT_MONO }}>
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
                title={r.razonSocial}
              >
                {nombreCliente(r.razonSocial)}
              </td>
              <td style={{ padding: `${SP.sm}px ${SP.md}px`, textAlign: 'center' }}>
                <Badge C={C} tone={r.afecta ? 'primary' : 'warning'}>
                  {r.afecta ? 'Afecta' : 'Exenta'}
                </Badge>
              </td>
              <td
                style={{
                  padding: `${SP.sm}px ${SP.md}px`,
                  textAlign: 'right',
                  color: C.tm,
                  fontFamily: FONT_MONO,
                  fontWeight: W.m,
                }}
              >
                {fmtCLP(r.neto)}
              </td>
              <td
                style={{
                  padding: `${SP.sm}px ${SP.md}px`,
                  textAlign: 'right',
                  fontWeight: W.sb,
                  color: C.text,
                  fontFamily: FONT_MONO,
                }}
              >
                {fmtCLP(r.montoReal)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TablaMobile({ C, rows }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SP.xs }}>
      {rows.map((r, i) => (
        <div
          key={`${r.folio}-${i}`}
          style={{
            background: C.surfaceAlt,
            borderRadius: R.md,
            padding: `${SP.sm}px ${SP.md}px`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: SP.xs }}>
            <span style={{ fontSize: S.xs, color: C.tm, fontWeight: W.m, fontFamily: FONT_MONO }}>
              #{r.folio} · {fd(r.fecha)}
            </span>
            <Badge C={C} tone={r.afecta ? 'primary' : 'warning'}>
              {r.afecta ? 'Afecta' : 'Exenta'}
            </Badge>
          </div>
          <div
            style={{
              fontSize: S.base,
              color: C.text,
              fontWeight: W.sb,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginBottom: SP.xs,
            }}
          >
            {nombreCliente(r.razonSocial)}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div style={{ fontSize: S.md, fontWeight: W.b, color: C.text, fontFamily: FONT_MONO, letterSpacing: '-0.2px' }}>
              {fmtPeso(r.neto)}
            </div>
            {r.afecta && (
              <div style={{ fontSize: S.xs, color: C.td, fontFamily: FONT_MONO, fontWeight: W.m }}>
                c/IVA {fmtCLP(r.montoReal)}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function Badge({ C, tone = 'primary', children }) {
  const map = {
    primary: { bg: C.accentD, color: C.accent },
    warning: { bg: C.amberD, color: C.amberT },
    success: { bg: C.greenD, color: C.greenT },
    danger: { bg: C.redD, color: C.red },
  };
  const { bg, color } = map[tone] || map.primary;
  return (
    <span
      style={{
        padding: `3px ${SP.sm}px`,
        borderRadius: 999,
        fontSize: S.xxs,
        fontWeight: W.b,
        background: bg,
        color,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        fontFamily: FONT_BODY,
        display: 'inline-block',
      }}
    >
      {children}
    </span>
  );
}

function ChartTooltip({ active, payload, label, C, percentOf, labelKey }) {
  if (!active || !payload || !payload.length) return null;
  const title = labelKey && payload[0]?.payload ? payload[0].payload[labelKey] : label;
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: R.md,
        padding: `${SP.sm}px ${SP.md}px`,
        boxShadow: C.shadow,
        fontFamily: FONT_BODY,
        fontSize: S.sm,
        minWidth: 160,
      }}
    >
      <div style={{ fontWeight: W.sb, color: C.text, marginBottom: SP.xs, fontFamily: FONT_TITLE, fontSize: S.md }}>
        {title}
      </div>
      {payload.map((p, i) => {
        const valor = Number(p.value) || 0;
        const pct = percentOf && percentOf > 0 ? (valor / percentOf) * 100 : null;
        return (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: SP.md,
              padding: '2px 0',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: SP.xs, color: C.tm }}>
              <span style={{ width: 10, height: 10, background: p.color || p.fill, borderRadius: 2 }} />
              {p.name}
            </span>
            <span style={{ color: C.text, fontWeight: W.sb, fontFamily: FONT_MONO }}>
              {fmtMM(valor)}
              {pct !== null && (
                <span style={{ color: C.tm, fontWeight: W.m, marginLeft: 6 }}>({pct.toFixed(1).replace('.', ',')}%)</span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
