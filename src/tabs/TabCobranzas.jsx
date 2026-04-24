import { useMemo, useState } from 'react';
import { S, W, R, SP, eyebrow, bigNumber, cardStyle } from '../utils/theme.js';
import { Card, Eyebrow, Metric, SectionTitle } from '../components/common.jsx';
import { DefontanaUploader } from '../components/DefontanaUploader.jsx';
import { fmtM, fmtDateMed, fmtNum } from '../utils/defontanaHelpers.js';

const MONO = "'SF Mono', ui-monospace, Menlo, Consolas, monospace";
const TABULAR = { fontFamily: MONO, fontFeatureSettings: "'tnum' 1, 'zero' 1" };

// Pestaña Cobranzas — Fase 2: ingesta + aging + DSO + detalle por cliente.
// Datos vienen del hook useDefontana (localStorage, sin react-query).
export default function TabCobranzas({
  C,
  isMobile,
  saldosRaw,
  cobranzas,
  uploading,
  uploadSaldos,
  clearSaldos,
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('todos');
  const [bucketFocus, setBucketFocus] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);

  // ── Pantalla de onboarding cuando no hay datos ──────────────────
  if (!cobranzas || !saldosRaw) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: SP.lg, maxWidth: 720 }}>
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
            Por cobrar
          </div>
          <div style={{ fontSize: S.sm, color: C.tm, lineHeight: 1.5 }}>
            Sube el Informe por Análisis de Defontana para ver el aging, DSO y detalle por cliente.
            Los archivos se procesan en tu navegador y quedan guardados localmente — no se suben a
            ningún servidor.
          </div>
        </div>
        <Card C={C} pad="lg">
          <DefontanaUploader
            C={C}
            current={saldosRaw}
            uploading={uploading}
            onUpload={uploadSaldos}
            onClear={clearSaldos}
          />
        </Card>
      </div>
    );
  }

  const clientes = cobranzas.clientesArray || [];

  const clientesFiltrados = clientes.filter((c) => {
    if (search && !c.nombre.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'nacionales' && c.esInternacional) return false;
    if (filter === 'internacionales' && !c.esInternacional) return false;
    if (filter === 'criticos' && c.montoCriticas <= 0) return false;
    return true;
  });

  const BUCKETS = [
    { key: 'porVencer', label: 'Por vencer', color: C.green, colorBg: C.greenD },
    { key: 'vencidas_0_30', label: '1 a 30 días', color: C.amber, colorBg: C.amberD },
    { key: 'vencidas_31_60', label: '31 a 60 días', color: C.amber, colorBg: C.amberD },
    { key: 'vencidas_61_90', label: '61 a 90 días', color: C.red, colorBg: C.redD },
    { key: 'vencidas_91_180', label: '91 a 180 días', color: C.red, colorBg: C.redD },
    { key: 'vencidas_critica', label: '+180 días (crítica)', color: C.purple, colorBg: C.purpleD },
  ];

  const dsoGlobalStr = cobranzas.dsoGlobal ? `${Math.round(cobranzas.dsoGlobal)} días` : 'sin muestra';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SP.xl }}>
      {/* ── Header ──────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: SP.lg,
          flexWrap: 'wrap',
        }}
      >
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
            Por cobrar
          </div>
          <div style={{ fontSize: S.sm, color: C.tm, lineHeight: 1.5 }}>
            {clientes.length} clientes con saldo · DSO global {dsoGlobalStr} ·{' '}
            {cobranzas.totalFacturasPendientes} facturas pendientes · al{' '}
            {fmtDateMed(cobranzas.fechaInforme)}
          </div>
        </div>
      </div>

      {/* ── KPIs ──────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile
            ? 'repeat(2, 1fr)'
            : cobranzas.totalPorCuenta?.internacional > 0
              ? 'repeat(5, 1fr)'
              : 'repeat(4, 1fr)',
          gap: SP.md,
        }}
      >
        <Metric
          C={C}
          label="Total pendiente"
          value={fmtM(cobranzas.totalPendiente)}
          sub={`${fmtNum(clientes.length)} clientes · ${fmtNum(cobranzas.totalFacturasPendientes)} facturas`}
          color={C.accent}
        />
        <Metric
          C={C}
          label="Cobrable"
          value={fmtM(cobranzas.totalCobrable)}
          sub={pctLabel(cobranzas.totalCobrable, cobranzas.totalPendiente)}
          color={C.green}
        />
        <Metric
          C={C}
          label="Vencido"
          value={fmtM(cobranzas.totalVencido)}
          sub={pctLabel(cobranzas.totalVencido, cobranzas.totalPendiente)}
          color={C.amber}
        />
        <Metric
          C={C}
          label="Crítico (+180d)"
          value={fmtM(cobranzas.totalCritico)}
          sub={`${cobranzas.aging.vencidas_critica.count} facturas`}
          color={C.purple}
        />
        {cobranzas.totalPorCuenta?.internacional > 0 && (
          <Metric
            C={C}
            label="Internacional"
            value={fmtM(cobranzas.totalPorCuenta.internacional)}
            sub={pctLabel(cobranzas.totalPorCuenta.internacional, cobranzas.totalPendiente)}
            color={C.cyan}
          />
        )}
      </div>

      {/* ── Aging buckets ─────────────────────────────── */}
      <div>
        <SectionTitle
          C={C}
          right={
            <div style={{ fontSize: S.xs, color: C.td, fontWeight: W.m }}>
              Click en un bucket para ver facturas
            </div>
          }
        >
          Aging
        </SectionTitle>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile
              ? 'repeat(2, 1fr)'
              : 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: SP.sm,
          }}
        >
          {BUCKETS.map((b) => {
            const data = cobranzas.aging[b.key];
            const pct =
              cobranzas.totalPendiente > 0
                ? (data.monto / cobranzas.totalPendiente) * 100
                : 0;
            const active = bucketFocus === b.key;
            return (
              <button
                key={b.key}
                onClick={() => setBucketFocus(active ? null : b.key)}
                style={{
                  ...cardStyle(C, { pad: 'sm' }),
                  background: active ? b.colorBg : C.surface,
                  border: `1px solid ${active ? b.color : C.border}`,
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 120ms ease',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 2,
                    background: b.color,
                    opacity: active ? 1 : 0.4,
                  }}
                />
                <div style={{ ...eyebrow(C), marginBottom: SP.xs }}>{b.label}</div>
                <div
                  style={{
                    ...TABULAR,
                    fontSize: S.lg,
                    fontWeight: W.sb,
                    color: data.monto > 0 ? b.color : C.td,
                    letterSpacing: '-0.3px',
                    lineHeight: 1.15,
                  }}
                >
                  {fmtM(data.monto)}
                </div>
                <div style={{ fontSize: S.xxs, color: C.tm, marginTop: 3, fontWeight: W.m }}>
                  {data.count} fact · {pct.toFixed(0)}%
                </div>
              </button>
            );
          })}
        </div>
        {bucketFocus && (
          <div style={{ marginTop: SP.md }}>
            <BucketDetail
              C={C}
              bucket={cobranzas.aging[bucketFocus]}
              label={BUCKETS.find((b) => b.key === bucketFocus).label}
              onClose={() => setBucketFocus(null)}
            />
          </div>
        )}
      </div>

      {/* ── Filtros ───────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: SP.sm,
          flexWrap: 'wrap',
        }}
      >
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
            { id: 'nacionales', label: 'NAC' },
            { id: 'internacionales', label: 'INT' },
            { id: 'criticos', label: 'Críticos' },
          ].map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
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
                {f.label}
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: S.xs, color: C.tm, marginLeft: 'auto', fontWeight: W.m }}>
          Mostrando {clientesFiltrados.length} de {clientes.length}
        </div>
      </div>

      {/* ── Tabla clientes ────────────────────────────── */}
      <Card C={C} pad="sm">
        <ClientesTable
          C={C}
          clientes={clientesFiltrados}
          onSelect={setSelectedClient}
          isMobile={isMobile}
        />
      </Card>

      {/* ── Actualizar archivos (al pie) ──────────────── */}
      <Card C={C} pad="md">
        <Eyebrow C={C}>Actualizar informe</Eyebrow>
        <DefontanaUploader
          C={C}
          current={saldosRaw}
          uploading={uploading}
          onUpload={uploadSaldos}
          onClear={clearSaldos}
        />
      </Card>

      {selectedClient && (
        <ClienteDrawer
          C={C}
          cliente={selectedClient}
          onClose={() => setSelectedClient(null)}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════════════════

function pctLabel(parte, total) {
  if (!total || total <= 0) return '';
  return `${((parte / total) * 100).toFixed(0)}% del total`;
}

function dsoColor(dso, C) {
  if (dso == null) return C.td;
  if (dso <= 45) return C.green;
  if (dso <= 60) return C.amber;
  return C.red;
}

// ══════════════════════════════════════════════════════════════════════
// ClientesTable
// ══════════════════════════════════════════════════════════════════════

function ClientesTable({ C, clientes, onSelect, isMobile }) {
  const visibles = clientes.slice(0, 100);
  const headers = isMobile
    ? ['Cliente', 'Saldo', 'DSO']
    : ['Cliente', '', 'Saldo total', 'Cobrable', 'Crítico', 'DSO', '# fact', ''];

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
                    textAlign: i <= 1 ? 'left' : 'right',
                    color: C.tm,
                    fontWeight: W.sb,
                    fontSize: S.xxs,
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
            {visibles.map((c, i) => (
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
                    maxWidth: 320,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {c.nombre}
                </td>
                {!isMobile && (
                  <td style={{ padding: `${SP.sm}px 4px` }}>
                    {c.esInternacional && <Badge C={C} tipo="int" />}
                  </td>
                )}
                <td
                  style={{
                    ...TABULAR,
                    padding: `${SP.sm}px ${SP.sm}px`,
                    textAlign: 'right',
                    color: C.text,
                    fontWeight: W.sb,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {fmtM(c.saldoPendiente)}
                </td>
                {!isMobile && (
                  <>
                    <td
                      style={{
                        ...TABULAR,
                        padding: `${SP.sm}px ${SP.sm}px`,
                        textAlign: 'right',
                        color: c.montoCobrables > 0 ? C.green : C.td,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {c.montoCobrables > 0 ? fmtM(c.montoCobrables) : '—'}
                    </td>
                    <td
                      style={{
                        ...TABULAR,
                        padding: `${SP.sm}px ${SP.sm}px`,
                        textAlign: 'right',
                        color: c.montoCriticas > 0 ? C.purple : C.td,
                        fontWeight: c.montoCriticas > 0 ? W.sb : W.r,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {c.montoCriticas > 0 ? fmtM(c.montoCriticas) : '—'}
                    </td>
                  </>
                )}
                <td
                  style={{
                    ...TABULAR,
                    padding: `${SP.sm}px ${SP.sm}px`,
                    textAlign: 'right',
                    color: dsoColor(c.dsoReal, C),
                    whiteSpace: 'nowrap',
                  }}
                >
                  {c.dsoReal != null ? `${Math.round(c.dsoReal)}d` : '—'}
                  {c.dsoReal != null && !isMobile && (
                    <span style={{ color: C.td, fontSize: S.xxs, marginLeft: 3 }}>
                      ({c.dsoMuestras})
                    </span>
                  )}
                </td>
                {!isMobile && (
                  <>
                    <td
                      style={{
                        ...TABULAR,
                        padding: `${SP.sm}px ${SP.sm}px`,
                        textAlign: 'right',
                        color: C.tm,
                      }}
                    >
                      {c.facturasCount}
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
            ))}
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

function Badge({ C, tipo }) {
  const color = tipo === 'int' ? C.cyan : C.accent;
  const bg = tipo === 'int' ? C.cyanD : C.accentD;
  const label = tipo === 'int' ? 'INT' : 'NAC';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 6px',
        background: bg,
        color,
        borderRadius: 999,
        fontSize: S.xxs,
        fontWeight: W.b,
        letterSpacing: '0.4px',
      }}
    >
      {label}
    </span>
  );
}

// ══════════════════════════════════════════════════════════════════════
// BucketDetail
// ══════════════════════════════════════════════════════════════════════

function BucketDetail({ C, bucket, label, onClose }) {
  const ordenadas = [...bucket.facturas].sort((a, b) => b.monto - a.monto).slice(0, 30);
  return (
    <div
      style={{
        background: C.surfaceAlt,
        border: `1px solid ${C.border}`,
        borderRadius: R.md,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: `${SP.sm}px ${SP.md}px`,
          background: C.surface,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <div>
          <span
            style={{
              fontSize: S.base,
              fontWeight: W.sb,
              color: C.text,
              letterSpacing: '-0.2px',
            }}
          >
            {label}
          </span>
          <span style={{ fontSize: S.xs, color: C.tm, marginLeft: SP.sm, fontWeight: W.m }}>
            Top 30 por monto · {bucket.count} facturas · {fmtM(bucket.monto)} total
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: C.tm,
            padding: 4,
            fontSize: S.md,
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>
      <div style={{ overflowX: 'auto', maxHeight: 340, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: S.sm }}>
          <thead
            style={{
              position: 'sticky',
              top: 0,
              background: C.surfaceAlt,
              zIndex: 1,
            }}
          >
            <tr>
              {['Cliente', 'Folio', 'Emisión', 'Vencimiento', 'Atraso', 'Monto'].map((h, i) => (
                <th
                  key={i}
                  style={{
                    padding: `6px ${SP.sm}px`,
                    textAlign: i === 0 || i <= 3 ? 'left' : 'right',
                    color: C.tm,
                    fontWeight: W.sb,
                    fontSize: S.xxs,
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
            {ordenadas.map((f, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td
                  style={{
                    padding: `6px ${SP.sm}px`,
                    color: C.text,
                    maxWidth: 260,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {f.cliente}
                </td>
                <td
                  style={{
                    padding: `6px ${SP.sm}px`,
                    color: C.tm,
                    fontFamily: MONO,
                    fontSize: S.xs,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {f.folio || '—'}
                </td>
                <td style={{ padding: `6px ${SP.sm}px`, color: C.tm, whiteSpace: 'nowrap' }}>
                  {f.fecha ? fmtDateMed(f.fecha) : '—'}
                </td>
                <td style={{ padding: `6px ${SP.sm}px`, color: C.tm, whiteSpace: 'nowrap' }}>
                  {f.vencimiento ? fmtDateMed(f.vencimiento) : '—'}
                </td>
                <td
                  style={{
                    padding: `6px ${SP.sm}px`,
                    color: f.diasAtraso > 0 ? C.red : C.td,
                    textAlign: 'right',
                    ...TABULAR,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {f.diasAtraso != null && f.diasAtraso > 0 ? `${f.diasAtraso}d` : '—'}
                </td>
                <td
                  style={{
                    ...TABULAR,
                    padding: `6px ${SP.sm}px`,
                    textAlign: 'right',
                    color: C.text,
                    fontWeight: W.sb,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {fmtM(f.monto)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// ClienteDrawer
// ══════════════════════════════════════════════════════════════════════

function ClienteDrawer({ C, cliente, onClose }) {
  const facturas = useMemo(() => {
    return [...(cliente.facturasPendientes || [])].sort((a, b) => {
      if (a.critica !== b.critica) return a.critica ? -1 : 1;
      return (b.diasAtraso || 0) - (a.diasAtraso || 0);
    });
  }, [cliente]);

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
          width: 'min(720px, 100%)',
          height: '100%',
          background: C.bg,
          borderLeft: `1px solid ${C.border}`,
          overflowY: 'auto',
          padding: `${SP.xl}px ${SP.xl2}px`,
          paddingBottom: `calc(${SP.xl}px + env(safe-area-inset-bottom))`,
        }}
      >
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
            <div style={{ display: 'flex', alignItems: 'center', gap: SP.sm, marginBottom: SP.xs }}>
              <Badge C={C} tipo={cliente.esInternacional ? 'int' : 'nac'} />
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

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: SP.sm,
            marginBottom: SP.xl,
          }}
        >
          <StatCard
            C={C}
            label="Saldo total"
            value={fmtM(cliente.saldoPendiente)}
            color={C.accent}
          />
          <StatCard
            C={C}
            label="DSO real"
            value={cliente.dsoReal != null ? `${Math.round(cliente.dsoReal)} días` : 'sin muestra'}
            sub={
              cliente.dsoMuestras > 0
                ? `${cliente.dsoMuestras} pagos observados`
                : 'sin matching por folio'
            }
            color={dsoColor(cliente.dsoReal, C)}
          />
          <StatCard
            C={C}
            label="Cobrable"
            value={fmtM(cliente.montoCobrables)}
            sub={`${cliente.facturasCobrables?.length || 0} facturas ≤180d`}
            color={C.green}
          />
          <StatCard
            C={C}
            label="Crítico"
            value={fmtM(cliente.montoCriticas)}
            sub={
              cliente.facturasCriticas?.length > 0
                ? `${cliente.facturasCriticas.length} facturas +180d`
                : 'sin facturas críticas'
            }
            color={C.purple}
          />
        </div>

        <div
          style={{
            fontSize: S.md,
            fontWeight: W.sb,
            color: C.text,
            marginBottom: SP.sm,
            letterSpacing: '-0.2px',
          }}
        >
          Facturas pendientes ({facturas.length})
        </div>
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: R.md,
            overflow: 'hidden',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: S.sm }}>
              <thead>
                <tr>
                  {['Folio', 'Emisión', 'Vencimiento', 'Atraso', 'Monto', 'Estado'].map((h, i) => (
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
                {facturas.map((f, i) => (
                  <tr
                    key={i}
                    style={{
                      borderBottom: `1px solid ${C.border}`,
                      background: f.critica ? C.purpleD : 'transparent',
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
                      {f.folio || '—'}
                    </td>
                    <td
                      style={{
                        padding: `7px ${SP.sm}px`,
                        color: C.tm,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {f.fecha ? fmtDateMed(f.fecha) : '—'}
                    </td>
                    <td
                      style={{
                        padding: `7px ${SP.sm}px`,
                        color: C.tm,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {f.vencimiento ? fmtDateMed(f.vencimiento) : '—'}
                    </td>
                    <td
                      style={{
                        ...TABULAR,
                        padding: `7px ${SP.sm}px`,
                        textAlign: 'right',
                        color: f.diasAtraso > 0 ? C.red : C.td,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {f.diasAtraso != null && f.diasAtraso > 0 ? `${f.diasAtraso}d` : '—'}
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
                      {fmtM(f.monto)}
                    </td>
                    <td
                      style={{
                        padding: `7px ${SP.sm}px`,
                        textAlign: 'right',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <EstadoPill
                        C={C}
                        critica={f.critica}
                        diasAtraso={f.diasAtraso}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ C, label, value, sub, color }) {
  return (
    <div style={cardStyle(C, { pad: 'md' })}>
      <Eyebrow C={C}>{label}</Eyebrow>
      <div style={bigNumber(C, color || C.text)}>{value}</div>
      {sub && (
        <div style={{ fontSize: S.xs, color: C.td, marginTop: SP.xs, fontWeight: W.m }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function EstadoPill({ C, critica, diasAtraso }) {
  let label = 'Al día';
  let color = C.green;
  let bg = C.greenD;
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
