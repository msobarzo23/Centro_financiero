import { useState } from 'react';

// Agrupación: las 4 principales van al bottom nav; el resto cae en "Más".
const PRINCIPALES = ["Resumen", "Bancos", "Calendario", "Alertas"];
const SECUNDARIAS = ["Ventas", "Flujo de Caja", "Inversiones", "Fondos Mutuos", "Leasing", "Crédito", "Calculadora"];

export const TABS = [...PRINCIPALES.slice(0, 1), ...["Bancos", "Calendario"], ...SECUNDARIAS.slice(0, 3), "Fondos Mutuos", "Leasing", "Crédito", "Alertas", "Calculadora"];
// Orden canónico de pestañas. El índice en este arreglo coincide con el case
// del switch en App.jsx; si agregas o mueves pestañas, actualiza ambos lados.
export const ALL_TABS = ["Resumen", "Bancos", "Calendario", "Ventas", "Flujo de Caja", "Inversiones", "Fondos Mutuos", "Leasing", "Crédito", "Alertas", "Calculadora"];

export function DesktopTabs({ tab, setTab, C, nAlertas }) {
  return (
    <div style={{
      display: "flex", gap: 0, padding: "0 20px",
      borderBottom: `0.5px solid ${C.border}`, overflowX: "auto",
    }}>
      {ALL_TABS.map((t, i) => {
        const esAlertas = t === "Alertas";
        return (
          <button key={t} onClick={() => setTab(i)} style={{
            padding: "12px 16px", fontSize: 13,
            fontWeight: tab === i ? 600 : 400,
            color: tab === i ? C.accent : C.tm,
            background: "none", border: "none",
            borderBottom: tab === i ? `2px solid ${C.accent}` : "2px solid transparent",
            cursor: "pointer", whiteSpace: "nowrap", position: "relative",
          }}>
            {t}
            {esAlertas && nAlertas > 0 && (
              <span style={{
                position: "absolute", top: 8, right: 2,
                background: C.red, color: "#fff", borderRadius: 10,
                fontSize: 9, fontWeight: 700, padding: "1px 5px", lineHeight: 1.4,
              }}>{nAlertas}</span>
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

  // Pestañas principales en el bottom bar y sus índices en ALL_TABS.
  const principales = [
    { label: "Resumen", idx: 0, icon: "▤" },
    { label: "Bancos", idx: 1, icon: "▣" },
    { label: "Calendario", idx: 2, icon: "▦" },
    { label: "Alertas", idx: 9, icon: "!" },
  ];
  const secundariasIdx = [3, 4, 5, 6, 7, 8, 10];
  const secLabels = secundariasIdx.map(i => ({ label: ALL_TABS[i], idx: i }));

  return (
    <>
      {/* Sheet "Más" */}
      {showMas && (
        <>
          <div
            onClick={() => setShowMas(false)}
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
              zIndex: 40,
            }}
          />
          <div style={{
            position: "fixed", left: 0, right: 0, bottom: 0,
            background: C.surface, borderRadius: "16px 16px 0 0",
            padding: "12px 16px 24px",
            borderTop: `0.5px solid ${C.border}`,
            zIndex: 50,
            boxShadow: "0 -4px 20px rgba(0,0,0,0.15)",
          }}>
            <div style={{
              width: 40, height: 4, background: C.borderL,
              borderRadius: 2, margin: "0 auto 16px",
            }}/>
            <div style={{
              fontSize: 12, color: C.tm, textTransform: "uppercase",
              letterSpacing: "0.5px", marginBottom: 12, paddingLeft: 4,
            }}>Más pestañas</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {secLabels.map(({ label, idx }) => {
                const active = tab === idx;
                return (
                  <button key={label}
                    onClick={() => { setTab(idx); setShowMas(false); }}
                    style={{
                      padding: "14px 16px", borderRadius: 10,
                      background: active ? C.accentD : C.surfaceAlt,
                      color: active ? C.accent : C.text,
                      border: `0.5px solid ${active ? C.accent + "55" : C.border}`,
                      fontSize: 14, fontWeight: active ? 600 : 400,
                      cursor: "pointer", textAlign: "left",
                    }}>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Bottom nav fijo */}
      <div style={{
        position: "fixed", left: 0, right: 0, bottom: 0,
        background: C.surface, borderTop: `0.5px solid ${C.border}`,
        display: "flex", justifyContent: "space-around",
        padding: "6px 0 8px",
        paddingBottom: "calc(8px + env(safe-area-inset-bottom))",
        zIndex: 30,
      }}>
        {principales.map(({ label, idx, icon }) => {
          const active = tab === idx;
          const esAlerta = idx === 9;
          return (
            <button key={label} onClick={() => setTab(idx)}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: 3, padding: "4px 10px",
                background: "none", border: "none", cursor: "pointer",
                color: active ? C.accent : C.tm,
                position: "relative", minWidth: 56,
              }}>
              <span style={{
                fontSize: 18, fontWeight: active ? 700 : 400,
                lineHeight: 1,
              }}>{icon}</span>
              <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>{label}</span>
              {esAlerta && nAlertas > 0 && (
                <span style={{
                  position: "absolute", top: 0, right: 8,
                  background: C.red, color: "#fff", borderRadius: 10,
                  fontSize: 9, fontWeight: 700, padding: "1px 5px", lineHeight: 1.4,
                }}>{nAlertas}</span>
              )}
            </button>
          );
        })}
        <button onClick={() => setShowMas(true)}
          style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            gap: 3, padding: "4px 10px",
            background: "none", border: "none", cursor: "pointer",
            color: secundariasIdx.includes(tab) ? C.accent : C.tm,
            minWidth: 56,
          }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>⋯</span>
          <span style={{ fontSize: 10 }}>Más</span>
        </button>
      </div>
    </>
  );
}
