import { useIndicadores } from '../utils/indicadores.js';
import { S, W, R, SP } from '../utils/theme.js';
import { Card, Eyebrow } from './common.jsx';

const MONO = "'SF Mono', ui-monospace, Menlo, Consolas, monospace";

const fmtCLP = (n) =>
  n != null
    ? `$${n.toLocaleString('es-CL', { maximumFractionDigits: n >= 1000 ? 0 : 2 })}`
    : '—';

// Badge compacto para el header: UF + USD en una línea.
export function IndicadoresBadge({ C }) {
  const { data, isLoading, error } = useIndicadores();

  if (isLoading || error || !data) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: SP.md,
        padding: `${SP.xs}px ${SP.md}px`,
        borderRadius: R.md,
        background: C.surfaceAlt,
        border: `1px solid ${C.border}`,
        fontSize: S.xs,
        fontWeight: W.m,
      }}
    >
      <span style={{ color: C.td }}>
        UF{' '}
        <span style={{ color: C.text, fontWeight: W.sb, fontFamily: MONO }}>
          {fmtCLP(data.uf)}
        </span>
      </span>
      <span style={{ color: C.border }}>·</span>
      <span style={{ color: C.td }}>
        USD{' '}
        <span style={{ color: C.text, fontWeight: W.sb, fontFamily: MONO }}>
          {fmtCLP(data.dolar)}
        </span>
      </span>
    </div>
  );
}

// Tarjeta detallada para el tab Resumen con UF, USD, UTM, TPM, IPC.
export function IndicadoresCard({ C }) {
  const { data, isLoading, error } = useIndicadores();

  if (isLoading) {
    return (
      <Card C={C} style={{ color: C.td, fontSize: S.sm, fontWeight: W.m }}>
        Cargando indicadores…
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card C={C} style={{ color: C.td, fontSize: S.sm, fontWeight: W.m }}>
        Indicadores no disponibles.
      </Card>
    );
  }

  const fechaStr = data.fecha
    ? new Date(data.fecha).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
    : '';

  const indicadores = [
    { label: 'UF', valor: fmtCLP(data.uf), color: C.accent },
    { label: 'USD', valor: fmtCLP(data.dolar), color: C.teal },
    { label: 'UTM', valor: fmtCLP(data.utm), color: C.amber },
    { label: 'TPM', valor: data.tpm != null ? `${data.tpm}%` : '—', color: C.purple },
    {
      label: 'IPC mes',
      valor: data.ipc != null ? `${data.ipc > 0 ? '+' : ''}${data.ipc}%` : '—',
      color: data.ipc > 0 ? C.red : C.green,
    },
  ];

  return (
    <Card C={C}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: SP.md,
          flexWrap: 'wrap',
          gap: SP.xs,
        }}
      >
        <Eyebrow C={C} style={{ marginBottom: 0 }}>Indicadores del día</Eyebrow>
        {fechaStr && (
          <div style={{ fontSize: S.xxs, color: C.td, fontWeight: W.m }}>
            Fuente: mindicador.cl · {fechaStr}
          </div>
        )}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: SP.sm,
        }}
      >
        {indicadores.map((i) => (
          <div
            key={i.label}
            style={{
              background: C.surfaceAlt,
              borderRadius: R.md,
              padding: `${SP.sm}px ${SP.md}px`,
            }}
          >
            <div
              style={{
                fontSize: S.xxs,
                color: C.tm,
                marginBottom: 3,
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
                fontWeight: W.sb,
              }}
            >
              {i.label}
            </div>
            <div
              style={{
                fontSize: S.lg,
                fontWeight: W.sb,
                color: i.color,
                fontFamily: MONO,
                letterSpacing: "-0.3px",
              }}
            >
              {i.valor}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
