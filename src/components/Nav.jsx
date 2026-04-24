import { useState } from 'react';
import {
  LayoutDashboard,
  Landmark,
  Calendar,
  ShoppingCart,
  Wallet,
  TrendingUp,
  PiggyBank,
  Truck,
  CreditCard,
  AlertTriangle,
  Calculator,
  Receipt,
  Users,
  MoreHorizontal,
} from 'lucide-react';
import { S, W, R, SP, FONT_BODY } from '../utils/theme.js';

// Orden canónico de pestañas. El índice coincide con el case en App.jsx;
// si agregas o mueves pestañas, actualiza ambos lados.
export const ALL_TABS = [
  "Resumen", "Bancos", "Calendario", "Ventas", "Flujo de Caja",
  "Inversiones", "Fondos Mutuos", "Leasing", "Crédito", "Alertas", "Calculadora",
  "Cobranzas", "Clientes 360",
];

// Icono por índice de tab (Lucide). Mantener sincronizado con ALL_TABS.
const TAB_ICONS = [
  LayoutDashboard, // 0 Resumen
  Landmark,        // 1 Bancos
  Calendar,        // 2 Calendario
  ShoppingCart,    // 3 Ventas
  Wallet,          // 4 Flujo de Caja
  TrendingUp,      // 5 Inversiones
  PiggyBank,       // 6 Fondos Mutuos
  Truck,           // 7 Leasing
  CreditCard,      // 8 Crédito
  AlertTriangle,   // 9 Alertas
  Calculator,      // 10 Calculadora
  Receipt,         // 11 Cobranzas
  Users,           // 12 Clientes 360
];

export function DesktopTabs({ tab, setTab, C, nAlertas }) {
  return (
    <div
      className="scrollbar-hide"
      style={{
        display: "flex",
        gap: 0,
        padding: `0 ${SP.xl}px`,
        borderBottom: `1px solid ${C.border}`,
        background: C.surface,
        overflowX: "auto",
        fontFamily: FONT_BODY,
      }}
    >
      {ALL_TABS.map((t, i) => {
        const active = tab === i;
        const esAlertas = t === "Alertas";
        const Icon = TAB_ICONS[i] || LayoutDashboard;
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
              borderBottom: active ? `3px solid ${C.accent}` : "3px solid transparent",
              cursor: "pointer",
              whiteSpace: "nowrap",
              position: "relative",
              transition: "color 200ms ease, background 200ms ease",
              display: "inline-flex",
              alignItems: "center",
              gap: SP.xs + 2,
              fontFamily: FONT_BODY,
            }}
            onMouseEnter={(e) => {
              if (!active) e.currentTarget.style.background = C.accentD;
            }}
            onMouseLeave={(e) => {
              if (!active) e.currentTarget.style.background = "none";
            }}
          >
            <Icon size={16} strokeWidth={active ? 2.5 : 2} />
            {t}
            {esAlertas && nAlertas > 0 && (
              <span
                style={{
                  marginLeft: 2,
                  background: C.red,
                  color: "#fff",
                  borderRadius: 999,
                  fontSize: S.xxs,
                  fontWeight: W.b,
                  padding: "2px 7px",
                  lineHeight: 1.2,
                  fontFamily: FONT_BODY,
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
    { label: "Resumen", idx: 0 },
    { label: "Bancos", idx: 1 },
    { label: "Ventas", idx: 3 },
    { label: "Alertas", idx: 9 },
  ];
  const secundariasIdx = [2, 4, 5, 6, 7, 8, 10, 11, 12];
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
              background: "rgba(15,23,42,0.55)",
              backdropFilter: "blur(3px)",
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
              boxShadow: "0 -8px 28px rgba(15,23,42,0.18)",
              fontFamily: FONT_BODY,
              animation: "fadeInUp 280ms cubic-bezier(0.2,0.7,0.2,1) both",
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
                const Icon = TAB_ICONS[idx] || LayoutDashboard;
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
                      display: "flex",
                      alignItems: "center",
                      gap: SP.sm,
                      fontFamily: FONT_BODY,
                    }}
                  >
                    <Icon size={16} strokeWidth={active ? 2.5 : 2} />
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
          boxShadow: "0 -2px 12px rgba(15,23,42,0.06)",
          fontFamily: FONT_BODY,
        }}
      >
        {principales.map(({ label, idx }) => {
          const active = tab === idx;
          const esAlerta = idx === 9;
          const Icon = TAB_ICONS[idx] || LayoutDashboard;
          return (
            <button
              key={label}
              onClick={() => setTab(idx)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                padding: `${SP.xs}px ${SP.md}px`,
                background: "none",
                border: "none",
                cursor: "pointer",
                color: active ? C.accent : C.tm,
                position: "relative",
                minWidth: 60,
                transition: "color 160ms ease",
                fontFamily: FONT_BODY,
              }}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 2} />
              <span style={{ fontSize: S.xxs, fontWeight: active ? W.sb : W.m, letterSpacing: "0.2px" }}>
                {label}
              </span>
              {esAlerta && nAlertas > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: 0,
                    right: 8,
                    background: C.red,
                    color: "#fff",
                    borderRadius: 999,
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
            gap: 3,
            padding: `${SP.xs}px ${SP.md}px`,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: secundariasIdx.includes(tab) ? C.accent : C.tm,
            minWidth: 60,
            fontFamily: FONT_BODY,
          }}
        >
          <MoreHorizontal size={20} strokeWidth={secundariasIdx.includes(tab) ? 2.5 : 2} />
          <span style={{ fontSize: S.xxs, fontWeight: W.m, letterSpacing: "0.2px" }}>Más</span>
        </button>
      </div>
    </>
  );
}
