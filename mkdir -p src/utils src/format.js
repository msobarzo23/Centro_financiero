// Formateadores de montos, fechas y helpers varios.

export const f = (n) => {
  if (n == null) return "—";
  const a = Math.abs(n);
  if (a >= 1e9) return `$${(n/1e9).toLocaleString("es-CL",{minimumFractionDigits:1,maximumFractionDigits:1})} MM`;
  if (a >= 1e6) return `$${Math.round(n/1e6).toLocaleString("es-CL")} M`;
  return `$${Math.round(n).toLocaleString("es-CL")}`;
};

export const fS = (n) => {
  if (n == null) return "—";
  const a = Math.abs(n);
  if (a >= 1e9) return `${(n/1e9).toFixed(1)}MM`;
  if (a >= 1e6) return `${Math.round(n/1e6)}M`;
  return Math.round(n).toLocaleString("es-CL");
};

export const dd = (a, b) => Math.ceil((new Date(b) - new Date(a)) / 864e5);

export const fd = (d) => d
  ? new Date(d + "T12:00:00").toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit" })
  : "";

export const fdf = (d) => d
  ? new Date(d + "T12:00:00").toLocaleDateString("es-CL", { weekday: "short", day: "2-digit", month: "short" })
  : "";

export const fUF = (n) => n
  ? n.toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  : "—";

export const mesLabel = (m) => new Date(m + "-15").toLocaleDateString("es-CL", { month: "short" });
export const mesLabelLargo = (m) => new Date(m + "-15").toLocaleDateString("es-CL", { month: "long", year: "numeric" });

// Clasificador de tipo de DAP (trabajo, inversion, credito).
export const clas = (tipo) => {
  const t = (tipo || '').trim().toLowerCase();
  if (t === 'trabajo') return 'trabajo';
  if (t === 'inversion' || t === 'inversión') return 'inversion';
  if (t === 'credito' || t === 'crédito') return 'credito';
  return t;
};

export const colorTipo = (t, C) => {
  if (t === 'trabajo') return { bg: C.accentD, color: C.accent };
  if (t === 'inversion') return { bg: C.amberD, color: C.amber };
  if (t === 'credito') return { bg: C.cyanD, color: C.cyan };
  return { bg: C.purpleD, color: C.purple };
};

export const colorBanco = (banco, C) => {
  const b = (banco || '').toUpperCase();
  if (b.includes('BCI')) return { bg: C.accentD, color: C.accent };
  if (b.includes('VOLVO') || b.includes('VFS')) return { bg: C.amberD, color: C.amber };
  if (b.includes('CHILE')) return { bg: C.tealD, color: C.teal };
  return { bg: C.purpleD, color: C.purple };
};

// Detecta mobile vs desktop.
export const useIsMobile = (breakpoint = 768) => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < breakpoint;
};
