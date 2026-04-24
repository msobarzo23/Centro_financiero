// Paleta de colores para tema oscuro y claro + tokens de diseño compartidos.

export const T = {
  dark: {
    bg: "#0B1016", surface: "#111821", surfaceAlt: "#19222E",
    border: "#1F2B3A", borderL: "#2C3B50",
    text: "#EDF1F6", tm: "#8B99AC", td: "#5A6B80",
    accent: "#4FC3F7", accentD: "rgba(79,195,247,0.12)",
    green: "#66BB6A", greenD: "rgba(102,187,106,0.12)", greenT: "#81C784",
    red: "#EF5350", redD: "rgba(239,83,80,0.12)",
    amber: "#FFB74D", amberD: "rgba(255,183,77,0.12)", amberT: "#FFCC80",
    purple: "#AB47BC", purpleD: "rgba(171,71,188,0.12)",
    cyan: "#26C6DA", cyanD: "rgba(38,198,218,0.12)",
    teal: "#26A69A", tealD: "rgba(38,166,154,0.12)",
    shadow: "0 1px 2px rgba(0,0,0,0.35), 0 1px 3px rgba(0,0,0,0.25)",
  },
  light: {
    bg: "#F6F7F9", surface: "#FFFFFF", surfaceAlt: "#F1F3F6",
    border: "#E3E6EC", borderL: "#D1D5DC",
    text: "#171A1F", tm: "#56606E", td: "#8A94A3",
    accent: "#0277BD", accentD: "rgba(2,119,189,0.08)",
    green: "#2E7D32", greenD: "rgba(46,125,50,0.08)", greenT: "#2E7D32",
    red: "#C62828", redD: "rgba(198,40,40,0.08)",
    amber: "#E65100", amberD: "rgba(230,81,0,0.08)", amberT: "#E65100",
    purple: "#7B1FA2", purpleD: "rgba(123,31,162,0.08)",
    cyan: "#00838F", cyanD: "rgba(0,131,143,0.08)",
    teal: "#00695C", tealD: "rgba(0,105,92,0.08)",
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
export const R = { sm: 6, md: 8, lg: 12, xl: 16 };

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
});

// Número grande de métrica (monospace, kerning apretado).
export const bigNumber = (C, color) => ({
  fontSize: S.xl2,
  fontWeight: W.sb,
  color: color || C.text,
  fontFamily: "'SF Mono', ui-monospace, Menlo, Consolas, monospace",
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
  };
};

// Family tipográfica moderna del sistema.
export const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
