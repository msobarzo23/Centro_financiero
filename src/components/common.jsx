// Componentes UI compartidos entre pestañas.

export function Metric({ label, value, sub, color, C, size = 'normal' }) {
  const big = size === 'big';
  return (
    <div style={{
      background: C.surface,
      borderRadius: 10,
      padding: big ? "18px 20px" : "14px 16px",
      border: `0.5px solid ${C.border}`,
      flex: 1,
      minWidth: big ? 200 : 130,
    }}>
      <div style={{
        fontSize: 11, color: C.tm, marginBottom: big ? 6 : 4,
        textTransform: "uppercase", letterSpacing: "0.5px",
      }}>{label}</div>
      <div style={{
        fontSize: big ? 28 : 22, fontWeight: 600, color: color || C.accent,
        lineHeight: 1.2, fontFamily: big ? "monospace" : "inherit",
        letterSpacing: big ? "-0.5px" : "0",
      }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.td, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

export function Loading({ C }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "60px 20px", flexDirection: "column", gap: 12,
    }}>
      <div style={{
        width: 40, height: 40,
        border: `3px solid ${C.border}`,
        borderTop: `3px solid ${C.accent}`,
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
      }} />
      <div style={{ fontSize: 13, color: C.tm }}>Cargando datos desde Google Sheets...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// Skeleton para mostrar estructura mientras carga (sensación de rapidez).
export function SkeletonCard({ C, height = 80 }) {
  return (
    <div style={{
      background: C.surface,
      borderRadius: 10,
      height,
      border: `0.5px solid ${C.border}`,
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", inset: 0,
        background: `linear-gradient(90deg, transparent, ${C.surfaceAlt}, transparent)`,
        animation: "shimmer 1.8s infinite",
      }}/>
      <style>{`@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
    </div>
  );
}
