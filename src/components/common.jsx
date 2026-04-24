// Componentes UI compartidos entre pestañas.
import { S, W, R, SP, eyebrow, bigNumber, cardStyle, FONT_TITLE, FONT_BODY } from '../utils/theme.js';

// Card: contenedor unificado. Usa en vez de <div style={{background: C.surface, ...}}>.
// Por defecto aplica animación fadeInUp; desactívala con animate={false}.
export function Card({
  C,
  pad = "md",
  elevated = false,
  onClick,
  children,
  style,
  className,
  animate = true,
  hover = false,
}) {
  const cls = [className, animate ? "card-anim" : "", hover ? "card-hover" : ""]
    .filter(Boolean)
    .join(" ")
    .trim();
  return (
    <div
      onClick={onClick}
      className={cls || undefined}
      style={{
        ...cardStyle(C, { pad, elevated }),
        cursor: onClick ? "pointer" : "default",
        ...(style || {}),
      }}
    >
      {children}
    </div>
  );
}

// Etiqueta superior (uppercase) de cards de métrica.
export function Eyebrow({ C, children, style }) {
  return (
    <div style={{ ...eyebrow(C), marginBottom: SP.sm, ...(style || {}) }}>
      {children}
    </div>
  );
}

// Título de sección grande (ej: "Saldos por banco").
// Usa la tipografía display de la skill (DM Serif Display) para transmitir carácter ejecutivo.
export function SectionTitle({ C, children, right, serif = false }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        marginBottom: SP.md,
        gap: SP.md,
        flexWrap: "wrap",
      }}
    >
      <div
        style={{
          fontSize: serif ? S.xl2 : S.lg,
          fontWeight: serif ? W.r : W.sb,
          color: C.text,
          letterSpacing: serif ? "-0.5px" : "-0.2px",
          fontFamily: serif ? FONT_TITLE : FONT_BODY,
          lineHeight: 1.2,
        }}
      >
        {children}
      </div>
      {right && <div>{right}</div>}
    </div>
  );
}

export function Metric({ label, value, sub, color, C, size = 'normal', onClick }) {
  const big = size === 'big';
  return (
    <div
      onClick={onClick}
      className="card-anim"
      style={{
        ...cardStyle(C, { pad: big ? "lg" : "md" }),
        flex: 1,
        minWidth: big ? 220 : 150,
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <Eyebrow C={C}>{label}</Eyebrow>
      <div style={bigNumber(C, color || C.accent)}>{value}</div>
      {sub && (
        <div style={{ fontSize: S.xs, color: C.td, marginTop: SP.xs, fontWeight: W.m, fontFamily: FONT_BODY }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export function Loading({ C }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: `${SP.xl3 * 2}px ${SP.xl}px`,
        flexDirection: "column",
        gap: SP.md,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          border: `3px solid ${C.border}`,
          borderTop: `3px solid ${C.accent}`,
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }}
      />
      <div style={{ fontSize: S.base, color: C.tm, fontWeight: W.m, fontFamily: FONT_BODY }}>
        Cargando datos desde Google Sheets…
      </div>
    </div>
  );
}

// Skeleton para estructura mientras carga.
export function SkeletonCard({ C, height = 80 }) {
  return (
    <div
      style={{
        background: C.surface,
        borderRadius: R.lg,
        height,
        border: `1px solid ${C.border}`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(90deg, transparent, ${C.surfaceAlt}, transparent)`,
          animation: "shimmer 1.8s infinite",
        }}
      />
    </div>
  );
}
