import { useMemo, useState } from 'react';
import { S, W, R, SP, eyebrow, cardStyle } from '../utils/theme.js';
import { f, fS } from '../utils/format.js';
import { Card, Eyebrow, Metric, SectionTitle } from '../components/common.jsx';
import { buildClientesMaestro, buildEstadoMeta, ESTADO_ORDEN } from '../utils/clientesMaestro.js';

const MONO = "'SF Mono', ui-monospace, Menlo, Consolas, monospace";
const TABULAR = { fontFamily: MONO, fontFeatureSettings: "'tnum' 1, 'zero' 1" };
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// Pestaña Clientes 360 — vista enriquecida por cliente.
// Funciona siempre (con ventas de Google Sheets). Si hay cobranzas Defontana
// cargadas se enriquece con saldo, DSO, aging y facturas pendientes.
export default function TabClientes360({ C, isMobile, ventas, defontana, hoy }) {
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('todos');
  const [filterCuenta, setFilterCuenta] = useState('todos');

  const maestro = useMemo(() => {
    return buildClientesMaestro({
      ventasRows: ventas?.rows || [],
      cobranzas: defontana?.cobranzas || null,
      hoy,
    });
  }, [ventas, defontana?.cobranzas, hoy]);

  const ESTADO_META = useMemo(() => buildEstadoMeta(C), [C]);

  if (!maestro || maestro.clientes.length === 0) {
    return (
      <div style={{ padding: SP.xl, textAlign: 'center', color: C.tm }}>
        Sin datos de clientes aún. Revisa que la hoja de Ventas esté configurada.
      </div>
    );
  }

  const clientes = maestro.clientes;
  const hayDefontana = !!defontana?.cobranzas;

  const clientesFiltrados = clientes.filter((c) => {
    if (search && !c.nombre.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterEstado !== 'todos' && c.estado !== filterEstado) return false;
    if (filterCuenta === 'nacional' && c.esInternacional) return false;
    if (filterCuenta === 'internacional' && !c.esInternacional) return false;
    return true;
  });

  const hayFiltros = filterEstado !== 'todos' || filterCuenta !== 'todos' || search;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SP.xl }}>
      {/* Header */}
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
          Clientes 360
        </div>
        <div style={{ fontSize: S.sm, color: C.tm, lineHeight: 1.5 }}>
          {maestro.totales.nClientes} clientes · {maestro.totales.nClientesActivos3m} activos
          últ. 3m
          {hayDefontana ? ` · ${maestro.totales.nInternacionales} internacionales` : ''}
          {!hayDefontana && (
            <> · <span style={{ color: C.amber, fontWeight: W.sb }}>Sube un informe Defontana en Cobranzas para enriquecer con saldo, DSO y aging.</span></>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
          gap: SP.md,
        }}
      >
        <Metric
          C={C}
          label="Clientes totales"
          value={maestro.totales.nClientes}
          sub={`${maestro.totales.nClientesActivos3m} activos · ${maestro.totales.nClientesConSaldo} con saldo`}
          color={C.accent}
        />
        <Metric
          C={C}
          label="Facturación últ. 3m"
          value={f(maestro.totales.facturacion3m)}
          sub={`${maestro.totales.nClientesActivos3m} clientes facturando`}
          color={C.green}
        />
        <Metric
          C={C}
          label="Facturación 12m"
          value={f(maestro.totales.facturacion12m)}
          sub="Rolling últimos 12 meses"
          color={C.teal}
        />
        <Metric
          C={C}
          label={hayDefontana ? 'Saldo crítico' : 'Saldo crítico'}
          value={hayDefontana ? f(maestro.totales.saldoCritico) : '—'}
          sub={hayDefontana ? 'Facturas +180d' : 'Requiere Defontana'}
          color={C.purple}
        />
      </div>

      {/* Distribución por estado */}
      <div>
        <SectionTitle
          C={C}
          right={
            <div style={{ fontSize: S.xs, color: C.td, fontWeight: W.m }}>
              Click para filtrar
            </div>
          }
        >
          Distribución por estado
        </SectionTitle>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile
              ? 'repeat(2, 1fr)'
              : 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: SP.sm,
          }}
        >
          {ESTADO_ORDEN.map((key) => {
            const meta = ESTADO_META[key];
            const count = maestro.distribucionEstado[key] || 0;
            const active = filterEstado === key;
            return (
              <button
                key={key}
                onClick={() => setFilterEstado(active ? 'todos' : key)}
                style={{
                  ...cardStyle(C, { pad: 'sm' }),
                  background: active ? meta.bg : C.surface,
                  border: `1px solid ${active ? meta.color : C.border}`,
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 120ms ease',
                  opacity: count === 0 ? 0.55 : 1,
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 2,
                    background: meta.color,
                    opacity: active ? 1 : 0.45,
                  }}
                />
                <div style={{ ...eyebrow(C), marginBottom: SP.xs }}>{meta.label}</div>
                <div
                  style={{
                    fontSize: S.xl2,
                    fontWeight: W.sb,
                    color: count > 0 ? meta.color : C.td,
                    letterSpacing: '-0.5px',
                    lineHeight: 1,
                    ...TABULAR,
                  }}
                >
                  {count}
                </div>
                <div style={{ fontSize: S.xxs, color: C.tm, marginTop: 4, fontWeight: W.m, lineHeight: 1.4 }}>
                  {meta.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', alignItems: 'center', gap: SP.sm, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '0 1 260px', minWidth: 180 }}>
          <span
            style={{
              position: 'absolute',
              left: SP.sm,
              top: '50%',
              transform: 'translateY(-50%)',
              color: C.tm,
              fontSize: S.sm,
            }}
          >
            ⌕
          </span>
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: `${SP.sm}px ${SP.md}px ${SP.sm}px ${SP.xl2}px`,
              fontSize: S.sm,
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: R.md,
              color: C.text,
              fontFamily: 'inherit',
              outline: 'none',
            }}
          />
        </div>
        {hayDefontana && (
          <div
            style={{
              display: 'flex',
              gap: 3,
              padding: 3,
              background: C.surfaceAlt,
              borderRadius: R.md,
              border: `1px solid ${C.border}`,
            }}
          >
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'nacional', label: 'NAC' },
              { id: 'internacional', label: 'INT' },
            ].map((fp) => {
              const active = filterCuenta === fp.id;
              return (
                <button
                  key={fp.id}
                  onClick={() => setFilterCuenta(fp.id)}
                  style={{
                    padding: `${SP.xs}px ${SP.sm + 2}px`,
                    background: active ? C.surface : 'transparent',
                    border: `1px solid ${active ? C.borderL : 'transparent'}`,
                    borderRadius: R.sm,
                    fontSize: S.xs,
                    color: active ? C.text : C.tm,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontWeight: active ? W.sb : W.m,
                  }}
                >
                  {fp.label}
                </button>
              );
            })}
          </div>
        )}
        {hayFiltros && (
          <button
            onClick={() => { setFilterEstado('todos'); setFilterCuenta('todos'); setSearch(''); }}
            style={{
              padding: `${SP.xs}px ${SP.md}px`,
              background: 'transparent',
              border: `1px solid ${C.border}`,
              borderRadius: R.sm,
              fontSize: S.xs,
              color: C.tm,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontWeight: W.m,
            }}
          >
            ✕ Limpiar
          </button>
        )}
        <div style={{ fontSize: S.xs, color: C.tm, marginLeft: 'auto', fontWeight: W.m }}>
          {clientesFiltrados.length} de {clientes.length}
        </div>
      </div>

      {/* Tabla */}
      <Card C={C} pad="sm">
        <ClientesTable
          C={C}
          clientes={clientesFiltrados}
          ESTADO_META={ESTADO_META}
          hayDefontana={hayDefontana}
          onSelect={setSelected}
          isMobile={isMobile}
        />
      </Card>

      {selected && (
        <ClienteDrawer
          C={C}
          cliente={selected}
          ESTADO_META={ESTADO_META}
          hayDefontana={hayDefontana}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════════════════

function dsoColor(dso, C) {
  if (dso == null) return C.td;
  if (dso <= 45) return C.green;
  if (dso <= 60) return C.amber;
  return C.red;
}

function deltaColor(d, C) {
  if (d == null) return C.td;
  if (d >= 10) return C.green;
  if (d >= -10) return C.tm;
  if (d >= -40) return C.amber;
  return C.red;
}

function fmtDeltaPct(d) {
  if (d == null) return '—';
  if (d > 999) return '+999%';
  return `${d > 0 ? '+' : ''}${Math.round(d)}%`;
}

function fmtDateCorto(ymd) {
  if (!ymd) return '—';
  const [, m, d] = ymd.split('-');
  return `${d}/${m}`;
}

// ══════════════════════════════════════════════════════════════════════
// Tabla
// ══════════════════════════════════════════════════════════════════════

function ClientesTable({ C, clientes, ESTADO_META, hayDefontana, onSelect, isMobile }) {
  const visibles = clientes.slice(0, 100);

  const headers = isMobile
    ? ['Cliente', 'Estado', 'Fact. 3m', 'Δ']
    : ['Cliente', '', 'Estado', 'Fact. 3m', 'Δ vs 3m ant.', hayDefontana ? 'Saldo' : '', hayDefontana ? 'DSO' : '', 'Última fact.', ''].filter(Boolean);

  return (
    <>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: S.sm }}>
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th
                  key={i}
                  style={{
                    padding: `${SP.sm}px ${SP.sm}px`,
                    textAlign: i <= 2 ? 'left' : 'right',
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
            {visibles.map((c, i) => {
              const meta = ESTADO_META[c.estado] || ESTADO_META.activo;
              return (
                <tr
                  key={i}
                  onClick={() => onSelect(c)}
                  style={{
                    borderBottom: `1px solid ${C.border}`,
                    cursor: 'pointer',
                    transition: 'background 100ms ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = C.surfaceAlt)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td
                    style={{
                      padding: `${SP.sm}px ${SP.sm}px`,
                      color: C.text,
                      fontWeight: W.m,
                      maxWidth: 280,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {c.nombre}
                  </td>
                  {!isMobile && (
                    <td style={{ padding: `${SP.sm}px 4px` }}>
                      {c.esInternacional && <MiniBadge C={C} tipo="int" />}
                    </td>
                  )}
                  <td style={{ padding: `${SP.sm}px ${SP.sm}px` }}>
                    <EstadoPill meta={meta} />
                  </td>
                  <td
                    style={{
                      ...TABULAR,
                      padding: `${SP.sm}px ${SP.sm}px`,
                      textAlign: 'right',
                      color: c.facturacionUlt3m > 0 ? C.text : C.td,
                      fontWeight: W.sb,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {c.facturacionUlt3m > 0 ? f(c.facturacionUlt3m) : '—'}
                  </td>
                  <td
                    style={{
                      ...TABULAR,
                      padding: `${SP.sm}px ${SP.sm}px`,
                      textAlign: 'right',
                      color: deltaColor(c.deltaPctVs3mAnterior, C),
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {fmtDeltaPct(c.deltaPctVs3mAnterior)}
                  </td>
                  {hayDefontana && !isMobile && (
                    <>
                      <td
                        style={{
                          ...TABULAR,
                          padding: `${SP.sm}px ${SP.sm}px`,
                          textAlign: 'right',
                          color: c.saldoTotal > 0 ? C.text : C.td,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {c.saldoTotal > 0 ? f(c.saldoTotal) : '—'}
                      </td>
                      <td
                        style={{
                          ...TABULAR,
                          padding: `${SP.sm}px ${SP.sm}px`,
                          textAlign: 'right',
                          color: dsoColor(c.dsoProm, C),
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {c.dsoProm != null ? `${Math.round(c.dsoProm)}d` : '—'}
                      </td>
                    </>
                  )}
                  {!isMobile && (
                    <>
                      <td
                        style={{
                          padding: `${SP.sm}px ${SP.sm}px`,
                          textAlign: 'right',
                          color: C.tm,
                          fontSize: S.xs,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {c.ultimaFactura ? fmtDateCorto(c.ultimaFactura) : '—'}
                      </td>
                      <td
                        style={{
                          padding: `${SP.sm}px ${SP.sm}px`,
                          textAlign: 'right',
                          color: C.tm,
                          fontSize: S.md,
                        }}
                      >
                        ›
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {clientes.length > 100 && (
        <div
          style={{
            fontSize: S.xs,
            color: C.tm,
            textAlign: 'center',
            marginTop: SP.md,
            fontWeight: W.m,
          }}
        >
          Mostrando los primeros 100 de {clientes.length}. Afina el filtro para ver otros.
        </div>
      )}
    </>
  );
}

function MiniBadge({ C, tipo }) {
  const color = tipo === 'int' ? C.cyan : C.accent;
  const bg = tipo === 'int' ? C.cyanD : C.accentD;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 6px',
        background: bg,
        color,
        borderRadius: 999,
        fontSize: S.xxs,
        fontWeight: W.b,
        letterSpacing: '0.4px',
      }}
    >
      {tipo === 'int' ? 'INT' : 'NAC'}
    </span>
  );
}

function EstadoPill({ meta }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        background: meta.bg,
        color: meta.color,
        borderRadius: 999,
        fontSize: S.xxs,
        fontWeight: W.sb,
        letterSpacing: '0.3px',
      }}
    >
      {meta.label}
    </span>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Drawer enriquecido
// ══════════════════════════════════════════════════════════════════════

function ClienteDrawer({ C, cliente, ESTADO_META, hayDefontana, onClose }) {
  const meta = ESTADO_META[cliente.estado] || ESTADO_META.activo;
  const heatMax = Math.max(...cliente.facturacionMensual.map((m) => m.monto), 1);
  const facturasOrdenadas = [...(cliente.facturasPendientes || [])].sort((a, b) => {
    if (a.critica !== b.critica) return a.critica ? -1 : 1;
    return (b.diasAtraso || 0) - (a.diasAtraso || 0);
  });

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        zIndex: 50,
        display: 'flex',
        justifyContent: 'flex-end',
        backdropFilter: 'blur(3px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(760px, 100%)',
          height: '100%',
          background: C.bg,
          borderLeft: `1px solid ${C.border}`,
          overflowY: 'auto',
          padding: `${SP.xl}px ${SP.xl2}px`,
          paddingBottom: `calc(${SP.xl}px + env(safe-area-inset-bottom))`,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: SP.lg,
            gap: SP.md,
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: SP.xs,
                marginBottom: SP.xs,
                flexWrap: 'wrap',
              }}
            >
              {hayDefontana && (
                <MiniBadge C={C} tipo={cliente.esInternacional ? 'int' : 'nac'} />
              )}
              <EstadoPill meta={meta} />
              {cliente.rut && (
                <span style={{ fontSize: S.xs, color: C.tm, fontFamily: MONO }}>
                  {cliente.rut}
                </span>
              )}
            </div>
            <div
              style={{
                fontSize: S.xl,
                fontWeight: W.sb,
                color: C.text,
                letterSpacing: '-0.4px',
                lineHeight: 1.25,
              }}
            >
              {cliente.nombre}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: `1px solid ${C.border}`,
              borderRadius: R.md,
              padding: `${SP.xs}px ${SP.sm}px`,
              cursor: 'pointer',
              color: C.tm,
              fontSize: S.md,
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Descripción estado */}
        <div
          style={{
            padding: `${SP.sm}px ${SP.md}px`,
            background: meta.bg,
            border: `1px solid ${meta.color}33`,
            borderRadius: R.md,
            marginBottom: SP.lg,
            fontSize: S.sm,
            color: meta.color,
            lineHeight: 1.5,
          }}
        >
          <strong style={{ fontWeight: W.b }}>{meta.label}:</strong> {meta.desc}
        </div>

        {/* Alertas */}
        {cliente.alertas && cliente.alertas.length > 0 && (
          <div style={{ marginBottom: SP.lg }}>
            <Eyebrow C={C}>Alertas</Eyebrow>
            <div style={{ display: 'flex', flexDirection: 'column', gap: SP.xs }}>
              {cliente.alertas.map((a, i) => (
                <div
                  key={i}
                  style={{
                    padding: `${SP.sm}px ${SP.md}px`,
                    background: C.amberD,
                    border: `1px solid ${C.amber}33`,
                    borderRadius: R.md,
                    fontSize: S.sm,
                    color: C.amber,
                    display: 'flex',
                    alignItems: 'center',
                    gap: SP.xs,
                    fontWeight: W.m,
                  }}
                >
                  <span>⚠</span>
                  {a.msg}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: SP.sm,
            marginBottom: SP.xl,
          }}
        >
          <MiniStat C={C} label="Fact. últ. 3m" value={f(cliente.facturacionUlt3m)} />
          <MiniStat
            C={C}
            label="Δ vs 3m anterior"
            value={fmtDeltaPct(cliente.deltaPctVs3mAnterior)}
            color={deltaColor(cliente.deltaPctVs3mAnterior, C)}
          />
          <MiniStat C={C} label="Fact. 12m" value={f(cliente.facturacionUlt12m)} />
          {hayDefontana && (
            <>
              <MiniStat
                C={C}
                label="Saldo pendiente"
                value={cliente.saldoTotal > 0 ? f(cliente.saldoTotal) : '—'}
                color={cliente.saldoTotal > 0 ? C.accent : C.td}
              />
              <MiniStat
                C={C}
                label="DSO real"
                value={cliente.dsoProm != null ? `${Math.round(cliente.dsoProm)} días` : '—'}
                sub={cliente.nPagosObservados > 0 ? `${cliente.nPagosObservados} pagos` : 'sin muestra'}
                color={dsoColor(cliente.dsoProm, C)}
              />
              <MiniStat
                C={C}
                label="Crítico +180d"
                value={cliente.montoCriticas > 0 ? f(cliente.montoCriticas) : '—'}
                sub={cliente.nFacturasCriticas > 0 ? `${cliente.nFacturasCriticas} facturas` : ''}
                color={cliente.montoCriticas > 0 ? C.purple : C.td}
              />
            </>
          )}
          <MiniStat
            C={C}
            label="Meses activos 12m"
            value={`${cliente.mesesConFacturacion12m}/12`}
          />
          <MiniStat
            C={C}
            label="Última factura"
            value={cliente.ultimaFactura || '—'}
            sub={cliente.diasDesdeUltimaVenta != null ? `hace ${cliente.diasDesdeUltimaVenta}d` : ''}
          />
          <MiniStat
            C={C}
            label="Participación 3m"
            value={`${((cliente.participacion || 0) * 100).toFixed(1)}%`}
            sub="Del total"
          />
        </div>

        {/* Heatmap 12 meses */}
        <div style={{ marginBottom: SP.xl }}>
          <Eyebrow C={C}>Facturación mensual · últimos 12 meses</Eyebrow>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(12, 1fr)',
              gap: 4,
            }}
          >
            {cliente.facturacionMensual.map((m, i) => {
              const intensity = m.monto / heatMax;
              const bg = m.monto === 0
                ? C.surfaceAlt
                : mezclarAccent(C, 0.18 + intensity * 0.62);
              const [, month] = m.mes.split('-');
              return (
                <div
                  key={i}
                  title={`${m.mes}: ${f(m.monto)}`}
                  style={{
                    background: bg,
                    border: `1px solid ${m.monto > 0 ? C.accent + '55' : C.border}`,
                    borderRadius: R.sm,
                    padding: `${SP.sm}px 3px`,
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      fontSize: S.xxs,
                      color: C.tm,
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px',
                      fontWeight: W.sb,
                    }}
                  >
                    {MESES_CORTOS[parseInt(month, 10) - 1]}
                  </div>
                  <div
                    style={{
                      fontSize: S.xxs,
                      fontWeight: W.b,
                      color: m.monto > 0 ? C.text : C.td,
                      marginTop: 2,
                      ...TABULAR,
                    }}
                  >
                    {m.monto > 0 ? fS(m.monto) : '—'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Facturas pendientes */}
        {hayDefontana && facturasOrdenadas.length > 0 && (
          <div>
            <Eyebrow C={C}>Facturas pendientes ({facturasOrdenadas.length})</Eyebrow>
            <div
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: R.md,
                overflow: 'hidden',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: S.sm }}>
                <thead>
                  <tr>
                    {['Folio', 'Vencimiento', 'Atraso', 'Monto', 'Estado'].map((h, i) => (
                      <th
                        key={i}
                        style={{
                          padding: `${SP.sm}px ${SP.sm}px`,
                          textAlign: i <= 1 ? 'left' : i === 4 ? 'right' : 'right',
                          color: C.tm,
                          fontSize: S.xxs,
                          fontWeight: W.sb,
                          borderBottom: `1px solid ${C.border}`,
                          textTransform: 'uppercase',
                          letterSpacing: '0.4px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {facturasOrdenadas.slice(0, 25).map((ft, i) => (
                    <tr
                      key={i}
                      style={{
                        borderBottom: `1px solid ${C.border}`,
                        background: ft.critica ? C.purpleD : 'transparent',
                      }}
                    >
                      <td
                        style={{
                          padding: `7px ${SP.sm}px`,
                          color: C.tm,
                          fontFamily: MONO,
                          fontSize: S.xs,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {ft.folio || '—'}
                      </td>
                      <td
                        style={{
                          padding: `7px ${SP.sm}px`,
                          color: C.tm,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {ft.vencimiento
                          ? fmtDateCorto(typeof ft.vencimiento === 'string'
                              ? ft.vencimiento
                              : `${ft.vencimiento.getFullYear()}-${String(ft.vencimiento.getMonth() + 1).padStart(2, '0')}-${String(ft.vencimiento.getDate()).padStart(2, '0')}`)
                          : '—'}
                      </td>
                      <td
                        style={{
                          ...TABULAR,
                          padding: `7px ${SP.sm}px`,
                          textAlign: 'right',
                          color: ft.diasAtraso > 0 ? C.red : C.td,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {ft.diasAtraso != null && ft.diasAtraso > 0 ? `${ft.diasAtraso}d` : '—'}
                      </td>
                      <td
                        style={{
                          ...TABULAR,
                          padding: `7px ${SP.sm}px`,
                          textAlign: 'right',
                          color: C.text,
                          fontWeight: W.sb,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {f(ft.monto)}
                      </td>
                      <td
                        style={{
                          padding: `7px ${SP.sm}px`,
                          textAlign: 'right',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <EstadoFact C={C} critica={ft.critica} diasAtraso={ft.diasAtraso} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {facturasOrdenadas.length > 25 && (
                <div
                  style={{
                    padding: `${SP.xs}px ${SP.sm}px`,
                    fontSize: S.xxs,
                    color: C.tm,
                    textAlign: 'center',
                    borderTop: `1px solid ${C.border}`,
                    fontWeight: W.m,
                  }}
                >
                  Mostrando 25 de {facturasOrdenadas.length}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MiniStat({ C, label, value, sub, color }) {
  return (
    <div
      style={{
        ...cardStyle(C, { pad: 'sm' }),
      }}
    >
      <div style={{ ...eyebrow(C), marginBottom: SP.xs }}>{label}</div>
      <div
        style={{
          fontSize: S.md,
          fontWeight: W.b,
          color: color || C.text,
          letterSpacing: '-0.2px',
          lineHeight: 1.15,
          ...TABULAR,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: S.xxs, color: C.td, marginTop: 3, fontWeight: W.m }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function EstadoFact({ C, critica, diasAtraso }) {
  let label;
  let color;
  let bg;
  if (critica) {
    label = 'Crítica';
    color = C.purple;
    bg = C.purpleD;
  } else if (diasAtraso > 60) {
    label = 'Vencida';
    color = C.red;
    bg = C.redD;
  } else if (diasAtraso > 0) {
    label = 'Atrasada';
    color = C.amber;
    bg = C.amberD;
  } else {
    label = 'Al día';
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

// Mezcla el color accent con el fondo para construir el degradado del heatmap.
// Usa rgba aproximada: asumimos que C.accent es hex (#RRGGBB).
function mezclarAccent(C, alpha) {
  const hex = C.accent || '#4FC3F7';
  const m = hex.match(/#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i);
  if (!m) return C.accentD;
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
