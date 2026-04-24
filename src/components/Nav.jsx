import { useState } from 'react';
import { S, W, R, SP } from '../utils/theme.js';

// Orden canónico de pestañas. El índice coincide con el case en App.jsx;
// si agregas o mueves pestañas, actualiza ambos lados.
export const ALL_TABS = [
  "Resumen", "Bancos", "Calendario", "Ventas", "Flujo de Caja",
  "Inversiones", "Fondos Mutuos", "Leasing", "Crédito", "Alertas", "Calculadora",
  "Cobranzas", "Clientes 360",
];

export function DesktopTabs({ tab, setTab, C, nAlertas }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 0,
        padding: `0 ${SP.xl}px`,
        borderBottom: `1px solid ${C.border}`,
        background: C.surface,
        overflowX: "auto",
      }}
    >
      {ALL_TABS.map((t, i) => {
        const active = tab === i;
        const esAlertas = t === "Alertas";
        return (
          <button
            key={t}
            onClick={() => setTab(i)}
            style={{
              padding: `${SP.md}px ${SP.lg}px`,
              fontSize: S.base,
              fontWeight: active ? W.sb : W.m,
              color: active ? C.accent : C.tm,
              background: "none",
              border: "none",
              borderBottom: active ? `2px solid ${C.accent}` : "2px solid transparent",
              cursor: "pointer",
              whiteSpace: "nowrap",
              position: "relative",
              transition: "color 120ms ease",
            }}
          >
            {t}
            {esAlertas && nAlertas > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: 6,
                  right: -2,
                  background: C.red,
                  color: "#fff",
                  borderRadius: 10,
                  fontSize: S.xxs,
                  fontWeight: W.b,
                  padding: "1px 6px",
                  lineHeight: 1.4,
                }}
              >
                {nAlertas}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// Bottom navigation para mobile.
export function MobileBottomNav({ tab, setTab, C, nAlertas }) {
  const [showMas, setShowMas] = useState(false);

  const principales = [
    { label: "Resumen", idx: 0, icon: "▤" },
    { label: "Bancos", idx: 1, icon: "▣" },
    { label: "Calendario", idx: 2, icon: "▦" },
    { label: "Alertas", idx: 9, icon: "!" },
  ];
  const secundariasIdx = [3, 4, 5, 6, 7, 8, 10, 11, 12];
  const secLabels = secundariasIdx.map(i => ({ label: ALL_TABS[i], idx: i }));

  return (
    <>
      {showMas && (
        <>
          <div
            onClick={() => setShowMas(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(2px)",
              zIndex: 40,
            }}
          />
          <div
            style={{
              position: "fixed",
              left: 0,
              right: 0,
              bottom: 0,
              background: C.surface,
              borderRadius: `${R.xl}px ${R.xl}px 0 0`,
              padding: `${SP.md}px ${SP.lg}px ${SP.xl2}px`,
              borderTop: `1px solid ${C.border}`,
              zIndex: 50,
              boxShadow: "0 -8px 28px rgba(0,0,0,0.2)",
            }}
          >
            <div
              style={{
                width: 44,
                height: 4,
                background: C.borderL,
                borderRadius: 2,
                margin: `0 auto ${SP.lg}px`,
              }}
            />
            <div
              style={{
                fontSize: S.xs,
                color: C.tm,
                textTransform: "uppercase",
                letterSpacing: "0.6px",
                fontWeight: W.sb,
                marginBottom: SP.md,
                paddingLeft: SP.xs,
              }}
            >
              Más pestañas
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: SP.sm }}>
              {secLabels.map(({ label, idx }) => {
                const active = tab === idx;
                return (
                  <button
                    key={label}
                    onClick={() => { setTab(idx); setShowMas(false); }}
                    style={{
                      padding: `${SP.md}px ${SP.lg}px`,
                      borderRadius: R.md,
                      background: active ? C.accentD : C.surfaceAlt,
                      color: active ? C.accent : C.text,
                      border: `1px solid ${active ? C.accent + "55" : C.border}`,
                      fontSize: S.md,
                      fontWeight: active ? W.sb : W.m,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          background: C.surface,
          borderTop: `1px solid ${C.border}`,
          display: "flex",
          justifyContent: "space-around",
          padding: `${SP.sm}px 0 ${SP.sm}px`,
          paddingBottom: `calc(${SP.sm}px + env(safe-area-inset-bottom))`,
          zIndex: 30,
          boxShadow: "0 -2px 12px rgba(0,0,0,0.08)",
        }}
      >
        {principales.map(({ label, idx, icon }) => {
          const active = tab === idx;
          const esAlerta = idx === 9;
          return (
            <button
              key={label}
              onClick={() => setTab(idx)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                padding: `${SP.xs}px ${SP.md}px`,
                background: "none",
                border: "none",
                cursor: "pointer",
                color: active ? C.accent : C.tm,
                position: "relative",
                minWidth: 60,
              }}
            >
              <span style={{ fontSize: 18, fontWeight: active ? W.b : W.r, lineHeight: 1 }}>
                {icon}
              </span>
              <span style={{ fontSize: S.xxs, fontWeight: active ? W.sb : W.m, letterSpacing: "0.2px" }}>
                {label}
              </span>
              {esAlerta && nAlertas > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: 0,
                    right: 10,
                    background: C.red,
                    color: "#fff",
                    borderRadius: 10,
                    fontSize: S.xxs,
                    fontWeight: W.b,
                    padding: "1px 5px",
                    lineHeight: 1.4,
                  }}
                >
                  {nAlertas}
                </span>
              )}
            </button>
          );
        })}
        <button
          onClick={() => setShowMas(true)}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            padding: `${SP.xs}px ${SP.md}px`,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: secundariasIdx.includes(tab) ? C.accent : C.tm,
            minWidth: 60,
          }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>⋯</span>
          <span style={{ fontSize: S.xxs, fontWeight: W.m, letterSpacing: "0.2px" }}>Más</span>
        </button>
      </div>
    </>
  );
}
