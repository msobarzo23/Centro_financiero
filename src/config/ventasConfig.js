// Configuración de la pestaña Ventas.
// Valores por defecto alineados con el dashboard-ventas original de Transportes Bello.
// Sobreescribibles por variables de entorno en Vercel o .env.local.

// Meta anual de facturación neta (CLP). Default: 60.000.000.000 (60 mil millones).
export const META_ANUAL = (() => {
  const raw = Number(import.meta.env.VITE_META_ANUAL);
  return Number.isFinite(raw) && raw > 0 ? raw : 60_000_000_000;
})();

// Meses sin facturar para considerar a un cliente "en fuga".
export const INACTIVITY_THRESHOLD_MONTHS = 2;

// Alias de clientes: la clave (variante que aparece en el CSV) se muestra
// como el valor. Útil cuando un mismo cliente tiene varias razones sociales.
export const CLIENT_ALIASES = {
  NOVANDINO: 'SQM Salar (Novo Andino)',
  'NOVO ANDINO': 'SQM Salar (Novo Andino)',
  'SQM SALAR': 'SQM Salar (Novo Andino)',
};

// Resuelve el nombre canónico de un cliente aplicando alias.
export function nombreCliente(raw) {
  if (!raw) return 'Sin razón social';
  const key = raw.trim().toUpperCase();
  return CLIENT_ALIASES[key] || raw.trim();
}

// Paleta para series de clientes en gráficos (apilados, pie). 10 colores
// distintos y accesibles, alternan cálidos y fríos para distinguir segmentos.
export const CLIENT_COLORS = [
  '#1D4ED8', // primario
  '#EA580C', // acento
  '#16A34A', // verde
  '#7C3AED', // violeta
  '#0891B2', // cyan
  '#DB2777', // rosa
  '#D97706', // ámbar
  '#0284C7', // azul cielo
  '#059669', // esmeralda
  '#64748B', // slate (para "Otros")
];
