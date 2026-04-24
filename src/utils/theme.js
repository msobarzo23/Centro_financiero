// Paleta de colores para tema oscuro y claro + tokens de diseño compartidos.
// Paleta alineada con la skill frontend-design-bello (Transportes Bello).
// Primario corporativo: #1D4ED8  ·  Acento operativo: #EA580C

export const T = {
  dark: {
    bg: "#0F172A", surface: "#1E293B", surfaceAlt: "#273449",
    border: "#334155", borderL: "#475569",
    text: "#F8FAFC", tm: "#94A3B8", td: "#64748B",
    accent: "#3B82F6", accentD: "rgba(59,130,246,0.14)",
    green: "#22C55E", greenD: "rgba(34,197,94,0.14)", greenT: "#4ADE80",
    red: "#F87171", redD: "rgba(248,113,113,0.14)",
    amber: "#F59E0B", amberD: "rgba(245,158,11,0.14)", amberT: "#FBBF24",
    purple: "#A855F7", purpleD: "rgba(168,85,247,0.14)",
    cyan: "#22D3EE", cyanD: "rgba(34,211,238,0.14)",
    teal: "#EA580C", tealD: "rgba(234,88,12,0.14)",
    shadow: "0 1px 2px rgba(0,0,0,0.35), 0 1px 3px rgba(0,0,0,0.25)",
  },
  light: {
    bg: "#F8FAFC", surface: "#FFFFFF", surfaceAlt: "#F1F5F9",
    border: "#E2E8F0", borderL: "#CBD5E1",
    text: "#0F172A", tm: "#64748B", td: "#94A3B8",
    accent: "#1D4ED8", accentD: "rgba(29,78,216,0.08)",
    green: "#16A34A", greenD: "rgba(22,163,74,0.08)", greenT: "#15803D",
    red: "#DC2626", redD: "rgba(220,38,38,0.08)",
    amber: "#D97706", amberD: "rgba(217,119,6,0.10)", amberT: "#B45309",
    purple: "#7C3AED", purpleD: "rgba(124,58,237,0.08)",
    cyan: "#0284C7", cyanD: "rgba(2,132,199,0.08)",
    teal: "#EA580C", tealD: "rgba(234,88,12,0.10)",
    shadow: "0 1px 2px rgba(16,24,40,0.06), 0 1px 3px rgba(16,24,40,0.05)",
  },
};

// Escala tipográfica unificada. Usar estos valores en vez de números sueltos.
export const S = {
  xxs: 10,  // contadores, badges muy secundarios
  xs: 11,   // eyebrow labels (uppercase), metadata
  sm: 12,   // labels, subtítulos
  base: 13, // body normal
  md: 14,   // body destacado, tabs, menús
  lg: 16,   // section titles
  xl: 18,   // números secundarios en cards chicas
  xl2: 22,  // números principales de métrica
  xl3: 28,  // hero secundario
  xl4: 34,  // hero principal (saldo de hoy)
};

// Pesos de fuente.
export const W = { r: 400, m: 500, sb: 600, b: 700 };

// Radios de borde.
export const R = { none: 0, sm: 6, md: 8, lg: 12, xl: 16 };

// Espaciado.
export const SP = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xl2: 24, xl3: 32 };

// Estilos preconstruidos que se reutilizan en muchos lugares.
// eyebrowLabel: etiqueta en mayúsculas sobre el número de una métrica.
export const eyebrow = (C) => ({
  fontSize: S.xs,
  color: C.tm,
  textTransform: "uppercase",
  letterSpacing: "0.6px",
  fontWeight: W.sb,
  fontFamily: FONT_BODY,
});

// Número grande de métrica (monospace, kerning apretado).
export const bigNumber = (C, color) => ({
  fontSize: S.xl2,
  fontWeight: W.b,
  color: color || C.text,
  fontFamily: FONT_MONO,
  fontFeatureSettings: "'tnum' 1, 'zero' 1",
  letterSpacing: "-0.3px",
  lineHeight: 1.15,
});

// Card base: fondo, borde, radio y padding consistentes.
export const cardStyle = (C, { pad = "md", elevated = false } = {}) => {
  const pads = { sm: "12px 14px", md: "16px 18px", lg: "20px 22px" };
  return {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: R.lg,
    padding: pads[pad] || pads.md,
    boxShadow: elevated ? C.shadow : "none",
    transition: "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
  };
};

// Tipografías alineadas con la skill frontend-design-bello.
// Cargadas en index.html desde Google Fonts.
export const FONT_TITLE =
  "'DM Serif Display', 'Playfair Display', Georgia, 'Times New Roman', serif";

export const FONT_BODY =
  "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

export const FONT_MONO =
  "'JetBrains Mono', 'SF Mono', ui-monospace, Menlo, Consolas, monospace";

// Alias retrocompatible: antes era el body. Muchos archivos lo importan.
export const FONT_STACK = FONT_BODY;
