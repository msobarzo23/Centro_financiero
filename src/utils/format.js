// Formateadores de montos, fechas y helpers varios.

export const f = (n) => {
  if (n == null) return "—";
  const a = Math.abs(n);
  if (a >= 1e6) return `$${Math.round(n/1e6).toLocaleString("es-CL")} M`;
  return `$${Math.round(n).toLocaleString("es-CL")}`;
};

export const fS = (n) => {
  if (n == null) return "—";
  const a = Math.abs(n);
  if (a >= 1e6) return `${Math.round(n/1e6).toLocaleString("es-CL")}M`;
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

// --- Aliases alineados con la skill frontend-design-bello ---
// Todos los helpers siguen el formato chileno: punto como separador de miles,
// coma como decimal. No reemplazan a f/fS — los complementan con nombres
// canónicos para nuevos módulos.

// fmtCLP: entero formateado a la chilena, sin prefijo. Ej: 1234567 -> "1.234.567".
export const fmtCLP = (n) => {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  return Math.round(Number(n)).toLocaleString("es-CL");
};

// fmtPeso: monto en pesos con prefijo $, sin decimales. Ej: 1234567 -> "$1.234.567".
// Nunca abrevia — úsalo en tablas o vistas de detalle.
export const fmtPeso = (n) => {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  return `$${Math.round(Number(n)).toLocaleString("es-CL")}`;
};

// fmtMM: monto abreviado a millones con una decimal. Ej: 57_700_000_000 -> "$57.700,0M".
// Úsalo en KPIs ejecutivos donde importa más el orden de magnitud que la precisión.
export const fmtMM = (n) => {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  const v = Number(n) / 1_000_000;
  return `$${v.toLocaleString("es-CL", { maximumFractionDigits: 1 })}M`;
};

// fmtPct: número con símbolo %. Convención: recibe porcentaje ya en escala 0..100.
// fmtPct(12.34) -> "12,3%". fmtPct(12.345, 2) -> "12,35%".
export const fmtPct = (n, decimals = 1) => {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  return `${Number(n).toLocaleString("es-CL", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}%`;
};

// fmtDelta: delta porcentual con flecha y color semántico.
// Recibe porcentaje en escala 0..100 (puede ser negativo).
export const fmtDelta = (n, decimals = 1) => {
  if (n == null || !Number.isFinite(Number(n))) {
    return { text: "—", positive: null };
  }
  const v = Number(n);
  const arrow = v >= 0 ? "▲" : "▼";
  const abs = Math.abs(v).toLocaleString("es-CL", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return { text: `${arrow} ${abs}%`, positive: v >= 0 };
};

// parseNumCLP: convierte string chileno ("1.234.567,89") en Number.
// Tolerante a $ inicial, espacios y signos.
export const parseNumCLP = (str) => {
  if (str == null) return 0;
  if (typeof str === "number") return str;
  const clean = String(str)
    .trim()
    .replace(/^\$\s*/, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = parseFloat(clean);
  return Number.isFinite(n) ? n : 0;
};

// Alias explícito — fmtCLP es equivalente a fS pero con nombre canónico de la skill.
export { fS as fmtInt };
