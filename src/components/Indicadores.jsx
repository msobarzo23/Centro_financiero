import { useIndicadores } from '../utils/indicadores.js';

const fmtCLP = (n) =>
  n != null
    ? `$${n.toLocaleString('es-CL', { maximumFractionDigits: n >= 1000 ? 0 : 2 })}`
    : '—';

// Badge compacto para el header: UF + USD en una línea.
export function IndicadoresBadge({ C, compacto = false }) {
  const { data, isLoading, error } = useIndicadores();

  if (isLoading || error || !data) return null;

  const uf = fmtCLP(data.uf);
  const dolar = fmtCLP(data.dolar);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: compacto ? 8 : 10,
        padding: compacto ? '4px 8px' : '4px 10px',
        borderRadius: 6,
        background: C.surfaceAlt,
        border: `0.5px solid ${C.border}`,
        fontSize: 11,
      }}
    >
      <span style={{ color: C.td }}>
        UF <span style={{ color: C.text, fontWeight: 600, fontFamily: 'monospace' }}>{uf}</span>
      </span>
      <span style={{ color: C.border }}>·</span>
      <span style={{ color: C.td }}>
        USD <span style={{ color: C.text, fontWeight: 600, fontFamily: 'monospace' }}>{dolar}</span>
      </span>
    </div>
  );
}

// Tarjeta detallada para el tab Resumen con UF, USD, UTM, TPM, IPC.
export function IndicadoresCard({ C }) {
  const { data, isLoading, error } = useIndicadores();

  if (isLoading) {
    return (
      <div
        style={{
          background: C.surface,
          borderRadius: 10,
          padding: '14px 16px',
          border: `0.5px solid ${C.border}`,
          color: C.td,
          fontSize: 12,
        }}
      >
        Cargando indicadores…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        style={{
          background: C.surface,
          borderRadius: 10,
          padding: '14px 16px',
          border: `0.5px solid ${C.border}`,
          color: C.td,
          fontSize: 12,
        }}
      >
        Indicadores no disponibles.
      </div>
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
          marginBottom: 10,
          flexWrap: 'wrap',
          gap: 6,
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
          Indicadores del día
        </div>
        {fechaStr && (
          <div style={{ fontSize: 10, color: C.td }}>
            Fuente: mindicador.cl · {fechaStr}
          </div>
        )}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
          gap: 8,
        }}
      >
        {indicadores.map((i) => (
          <div
            key={i.label}
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
                marginBottom: 3,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              {i.label}
            </div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: i.color,
                fontFamily: 'monospace',
              }}
            >
              {i.valor}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
