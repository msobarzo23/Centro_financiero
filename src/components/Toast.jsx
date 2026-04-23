import { useEffect } from 'react';

// Toasts apilados en la esquina inferior derecha. Autodescartan a los 6s.
export function ToastStack({ toasts, onDismiss, C }) {
  if (!toasts || toasts.length === 0) return null;
  return (
    <div
      style={{
        position: 'fixed',
        right: 16,
        bottom: 'calc(16px + env(safe-area-inset-bottom))',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 60,
        maxWidth: 'calc(100vw - 32px)',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} C={C} />
      ))}
    </div>
  );
}

function Toast({ toast, onDismiss, C }) {
  useEffect(() => {
    const id = setTimeout(() => onDismiss(toast.id), toast.duration || 6000);
    return () => clearTimeout(id);
  }, [toast.id, toast.duration, onDismiss]);

  const colores = {
    error: { bg: C.redD, border: C.red, text: C.red },
    warn: { bg: C.amberD, border: C.amber, text: C.amberT },
    info: { bg: C.accentD, border: C.accent, text: C.accent },
    success: { bg: C.greenD, border: C.green, text: C.greenT },
  };
  const col = colores[toast.tipo] || colores.info;

  return (
    <div
      onClick={() => onDismiss(toast.id)}
      style={{
        background: C.surface,
        border: `0.5px solid ${col.border}55`,
        borderLeft: `3px solid ${col.border}`,
        borderRadius: 8,
        padding: '10px 14px',
        fontSize: 12,
        color: C.text,
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        cursor: 'pointer',
        minWidth: 260,
        maxWidth: 360,
        pointerEvents: 'auto',
      }}
    >
      <div style={{ fontWeight: 600, color: col.text, marginBottom: 2 }}>{toast.titulo}</div>
      {toast.mensaje && <div style={{ color: C.tm, lineHeight: 1.4 }}>{toast.mensaje}</div>}
    </div>
  );
}
