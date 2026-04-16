import { useState, useEffect, useMemo } from 'react';
import { fetchData } from './data.js';
import { T } from './utils/theme.js';
import { buildAlertas } from './utils/alertas.js';
import { useIsMobile } from './utils/useMediaQuery.js';

import { Loading } from './components/common.jsx';
import { DesktopTabs, MobileBottomNav, ALL_TABS } from './components/Nav.jsx';

import TabResumen from './tabs/TabResumen.jsx';
import TabBancos from './tabs/TabBancos.jsx';
import {
  TabCalendario, TabFlujoCaja, TabInversiones, TabFFMM,
  TabLeasing, TabCredito, TabAlertas, TabCalc,
} from './tabs/TabsResto.jsx';

const STORAGE_KEY = "cmf_tbello_v2";

export default function App() {
  const [tema, setTema] = useState(() => localStorage.getItem(STORAGE_KEY + "_tema") || "dark");
  const [tab, setTab] = useState(0);
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [err, setErr] = useState(null);
  const [ultimaAct, setUltimaAct] = useState(null);

  const isMobile = useIsMobile();
  const C = T[tema];

  // Cargar data al montar, caché inmediata de localStorage para mostrar algo rápido
  useEffect(() => {
    const cached = localStorage.getItem(STORAGE_KEY + "_data");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setData(parsed);
        setCargando(false);
      } catch (_) {}
    }
    refresh();
    const interval = setInterval(refresh, 5 * 60 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh() {
    try {
      setErr(null);
      const d = await fetchData();
      setData(d);
      setUltimaAct(new Date());
      setCargando(false);
      try { localStorage.setItem(STORAGE_KEY + "_data", JSON.stringify(d)); } catch (_) {}
    } catch (e) {
      console.error(e);
      setErr(e.message || "Error al cargar datos");
      setCargando(false);
    }
  }

  function toggleTema() {
    const nuevo = tema === "dark" ? "light" : "dark";
    setTema(nuevo);
    localStorage.setItem(STORAGE_KEY + "_tema", nuevo);
  }

  const alertas = useMemo(() => {
    if (!data) return [];
    return buildAlertas(
      { dap: data.dap, cal: data.cal, leasingDetalle: data.leasingDetalle, creditoPendiente: data.creditoPendiente },
      data.hoy,
    );
  }, [data]);

  // Aplicar color de fondo global
  useEffect(() => {
    document.body.style.background = C.bg;
    document.body.style.color = C.text;
    document.body.style.margin = "0";
    document.body.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    document.documentElement.style.background = C.bg;
    // Mantener theme-color del viewport
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute('content', C.bg);
  }, [C]);

  if (cargando && !data) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, color: C.text }}>
        <Loading C={C}/>
      </div>
    );
  }

  if (err && !data) {
    return (
      <div style={{
        minHeight: "100vh", background: C.bg, color: C.text,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}>
        <div style={{
          background: C.surface, borderRadius: 10, padding: 24,
          border: `0.5px solid ${C.red}55`, maxWidth: 420,
        }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.red, marginBottom: 8 }}>Error al cargar datos</div>
          <div style={{ fontSize: 13, color: C.tm, marginBottom: 14 }}>{err}</div>
          <button onClick={refresh} style={{
            padding: "8px 16px", borderRadius: 6,
            background: C.accent, color: "#fff", border: "none",
            fontSize: 13, cursor: "pointer",
          }}>Reintentar</button>
        </div>
      </div>
    );
  }

  const {
    bancos, dap, cal, ffmm, ffmmMov,
    leasingDetalle, leasingResumen,
    credito, creditoPendiente, saldoInsoluto,
    ventas, hoy,
  } = data;

  // Wrapper para props comunes
  const commonProps = { C, isMobile, hoy };

  const tabContent = () => {
    switch (tab) {
      case 0: return <TabResumen
        {...commonProps}
        bancos={bancos} dap={dap} cal={cal} ffmm={ffmm}
        leasingDetalle={leasingDetalle} leasingResumen={leasingResumen}
        creditoPendiente={creditoPendiente} saldoInsoluto={saldoInsoluto}
        alertas={alertas}
        onGoTab={setTab}
      />;
      case 1: return <TabBancos {...commonProps} bancos={bancos}/>;
      case 2: return <TabCalendario {...commonProps} cal={cal}/>;
      case 3: return <TabFlujoCaja
        {...commonProps}
        ventas={ventas} calendario={cal}
        leasingDetalle={leasingDetalle} creditoPendiente={creditoPendiente}
      />;
      case 4: return <TabInversiones {...commonProps} dap={dap}/>;
      case 5: return <TabFFMM {...commonProps} ffmm={ffmm} movimientos={ffmmMov}/>;
      case 6: return <TabLeasing {...commonProps} leasingDetalle={leasingDetalle} leasingResumen={leasingResumen}/>;
      case 7: return <TabCredito {...commonProps} credito={credito} creditoPendiente={creditoPendiente} saldoInsoluto={saldoInsoluto}/>;
      case 8: return <TabAlertas {...commonProps} alertas={alertas}/>;
      case 9: return <TabCalc {...commonProps}/>;
      default: return null;
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text }}>
      {/* Header */}
      <div style={{
        background: C.surface,
        borderBottom: `0.5px solid ${C.border}`,
        padding: isMobile ? "10px 16px" : "14px 20px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        gap: 10,
        position: "sticky", top: 0, zIndex: 20,
        paddingTop: isMobile ? "calc(10px + env(safe-area-inset-top))" : "14px",
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: isMobile ? 14 : 16, fontWeight: 600, color: C.text,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{isMobile ? "CMF · TBello" : "Centro de Mando Financiero"}</div>
          {!isMobile && (
            <div style={{ fontSize: 11, color: C.tm, marginTop: 2 }}>
              Transportes Bello e Hijos Ltda. · {ALL_TABS[tab]}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {ultimaAct && !isMobile && (
            <span style={{ fontSize: 10, color: C.td, marginRight: 6 }}>
              Act. {ultimaAct.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button onClick={refresh} title="Refrescar" style={{
            padding: "6px 10px", borderRadius: 6, fontSize: 12,
            background: C.surfaceAlt, color: C.tm,
            border: `0.5px solid ${C.border}`, cursor: "pointer",
          }}>↻</button>
          <button onClick={toggleTema} title={tema === "dark" ? "Cambiar a claro" : "Cambiar a oscuro"} style={{
            padding: "6px 10px", borderRadius: 6, fontSize: 12,
            background: C.surfaceAlt, color: C.tm,
            border: `0.5px solid ${C.border}`, cursor: "pointer",
          }}>{tema === "dark" ? "☀" : "☾"}</button>
        </div>
      </div>

      {/* Tabs desktop */}
      {!isMobile && (
        <DesktopTabs tab={tab} setTab={setTab} C={C} nAlertas={alertas.length}/>
      )}

      {/* Contenido */}
      <div style={{
        padding: isMobile ? "12px 12px 0" : "18px 20px",
        paddingBottom: isMobile ? "84px" : "40px",
        maxWidth: 1400, margin: "0 auto",
      }}>
        {tabContent()}
      </div>

      {/* Bottom nav mobile */}
      {isMobile && (
        <MobileBottomNav tab={tab} setTab={setTab} C={C} nAlertas={alertas.length}/>
      )}
    </div>
  );
}
