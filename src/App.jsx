import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { fetchData } from './data.js';
import { T } from './utils/theme.js';
import { buildAlertas } from './utils/alertas.js';
import { useIsMobile } from './utils/useMediaQuery.js';

import { Loading } from './components/common.jsx';
import { DesktopTabs, MobileBottomNav, ALL_TABS } from './components/Nav.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { ToastStack } from './components/Toast.jsx';

import TabResumen from './tabs/TabResumen.jsx';
import TabBancos from './tabs/TabBancos.jsx';
import {
  TabCalendario,
  TabFlujoCaja,
  TabInversiones,
  TabFFMM,
  TabLeasing,
  TabCredito,
  TabAlertas,
  TabCalc,
} from './tabs/TabsResto.jsx';

const STORAGE_KEY = 'cmf_tbello_v2';
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h: luego el cache se considera obsoleto
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export default function App() {
  const [tema, setTema] = useState(() => localStorage.getItem(STORAGE_KEY + '_tema') || 'dark');
  const [tab, setTab] = useState(0);
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [err, setErr] = useState(null);
  const [ultimaAct, setUltimaAct] = useState(null);
  const [cacheStale, setCacheStale] = useState(false);
  const [toasts, setToasts] = useState([]);

  const isMobile = useIsMobile();
  const C = T[tema];
  const refreshingRef = useRef(false);
  const erroresPrevRef = useRef('');

  const pushToast = useCallback((toast) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refresh = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setRefrescando(true);
    setErr(null);
    try {
      const d = await fetchData();
      setData(d);
      const ahora = new Date();
      setUltimaAct(ahora);
      setCargando(false);
      setCacheStale(false);
      try {
        localStorage.setItem(STORAGE_KEY + '_data', JSON.stringify(d));
        localStorage.setItem(STORAGE_KEY + '_ts', String(ahora.getTime()));
      } catch {
        /* localStorage lleno o modo incógnito */
      }
      const erroresKey = (d.errores || []).map((e) => `${e.hoja}|${e.motivo}`).join(';');
      if (erroresKey && erroresKey !== erroresPrevRef.current) {
        (d.errores || []).forEach((e) => {
          pushToast({
            tipo: 'warn',
            titulo: `Problema al cargar: ${e.hoja}`,
            mensaje: e.motivo,
          });
        });
      }
      erroresPrevRef.current = erroresKey;
    } catch (e) {
      console.error(e);
      setErr(e.message || 'Error al cargar datos');
      setCargando(false);
      pushToast({
        tipo: 'error',
        titulo: 'No se pudo actualizar',
        mensaje: e.message || 'Revisa tu conexión',
      });
    } finally {
      refreshingRef.current = false;
      setRefrescando(false);
    }
  }, [pushToast]);

  useEffect(() => {
    const cached = localStorage.getItem(STORAGE_KEY + '_data');
    const cachedTs = parseInt(localStorage.getItem(STORAGE_KEY + '_ts') || '0', 10);
    if (cached) {
      try {
        setData(JSON.parse(cached));
        if (cachedTs) {
          setUltimaAct(new Date(cachedTs));
          setCacheStale(Date.now() - cachedTs > CACHE_MAX_AGE_MS);
        } else {
          setCacheStale(true);
        }
        setCargando(false);
      } catch {
        /* cache corrupto, se re-carga */
      }
    }
    refresh();
    const interval = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleTema() {
    const nuevo = tema === 'dark' ? 'light' : 'dark';
    setTema(nuevo);
    localStorage.setItem(STORAGE_KEY + '_tema', nuevo);
  }

  const alertas = useMemo(() => {
    if (!data) return [];
    return buildAlertas(
      {
        dap: data.dap,
        cal: data.cal,
        leasingDetalle: data.leasingDetalle,
        creditoPendiente: data.creditoPendiente,
      },
      data.hoy,
    );
  }, [data]);

  useEffect(() => {
    document.body.style.background = C.bg;
    document.body.style.color = C.text;
    document.body.style.margin = '0';
    document.body.style.fontFamily =
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    document.documentElement.style.background = C.bg;
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute('content', C.bg);
  }, [C]);

  if (cargando && !data) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, color: C.text }}>
        <Loading C={C} />
      </div>
    );
  }

  if (err && !data) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: C.bg,
          color: C.text,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        <div
          style={{
            background: C.surface,
            borderRadius: 10,
            padding: 24,
            border: `0.5px solid ${C.red}55`,
            maxWidth: 420,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 600, color: C.red, marginBottom: 8 }}>
            Error al cargar datos
          </div>
          <div style={{ fontSize: 13, color: C.tm, marginBottom: 14 }}>{err}</div>
          <button
            onClick={refresh}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              background: C.accent,
              color: '#fff',
              border: 'none',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const {
    bancos,
    dap,
    cal,
    ffmm,
    ffmmMov,
    leasingDetalle,
    leasingResumen,
    credito,
    creditoPendiente,
    saldoInsoluto,
    ventas,
    hoy,
  } = data;

  const commonProps = { C, isMobile, hoy };

  const tabContent = () => {
    switch (tab) {
      case 0:
        return (
          <TabResumen
            {...commonProps}
            bancos={bancos}
            dap={dap}
            cal={cal}
            ffmm={ffmm}
            leasingDetalle={leasingDetalle}
            leasingResumen={leasingResumen}
            creditoPendiente={creditoPendiente}
            saldoInsoluto={saldoInsoluto}
            alertas={alertas}
            onGoTab={setTab}
          />
        );
      case 1:
        return <TabBancos {...commonProps} bancos={bancos} />;
      case 2:
        return <TabCalendario {...commonProps} cal={cal} />;
      case 3:
        return (
          <TabFlujoCaja
            {...commonProps}
            ventas={ventas}
            calendario={cal}
            leasingDetalle={leasingDetalle}
            creditoPendiente={creditoPendiente}
          />
        );
      case 4:
        return <TabInversiones {...commonProps} dap={dap} />;
      case 5:
        return <TabFFMM {...commonProps} ffmm={ffmm} movimientos={ffmmMov} />;
      case 6:
        return (
          <TabLeasing
            {...commonProps}
            leasingDetalle={leasingDetalle}
            leasingResumen={leasingResumen}
          />
        );
      case 7:
        return (
          <TabCredito
            {...commonProps}
            credito={credito}
            creditoPendiente={creditoPendiente}
            saldoInsoluto={saldoInsoluto}
          />
        );
      case 8:
        return <TabAlertas {...commonProps} alertas={alertas} />;
      case 9:
        return <TabCalc {...commonProps} />;
      default:
        return null;
    }
  };

  const minutosDesdeActualizacion = ultimaAct
    ? Math.floor((Date.now() - ultimaAct.getTime()) / 60000)
    : null;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text }}>
      {cacheStale && (
        <div
          style={{
            background: C.amberD,
            borderBottom: `0.5px solid ${C.amber}44`,
            padding: '8px 16px',
            fontSize: 12,
            color: C.amberT,
            textAlign: 'center',
          }}
        >
          ⚠ Mostrando datos guardados. La última actualización fue hace más de 24 horas.
        </div>
      )}

      <div
        style={{
          background: C.surface,
          borderBottom: `0.5px solid ${C.border}`,
          padding: isMobile ? '10px 16px' : '14px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
          position: 'sticky',
          top: 0,
          zIndex: 20,
          paddingTop: isMobile ? 'calc(10px + env(safe-area-inset-top))' : '14px',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: isMobile ? 14 : 16,
              fontWeight: 600,
              color: C.text,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {isMobile ? 'CMF · TBello' : 'Centro de Mando Financiero'}
          </div>
          {!isMobile && (
            <div style={{ fontSize: 11, color: C.tm, marginTop: 2 }}>
              Transportes Bello e Hijos Ltda. · {ALL_TABS[tab]}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {ultimaAct && (
            <span style={{ fontSize: 10, color: C.td, marginRight: 6 }}>
              {minutosDesdeActualizacion === 0
                ? 'Ahora'
                : minutosDesdeActualizacion < 60
                  ? `Hace ${minutosDesdeActualizacion}m`
                  : ultimaAct.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={refresh}
            disabled={refrescando}
            title="Refrescar"
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              fontSize: 12,
              background: C.surfaceAlt,
              color: refrescando ? C.td : C.tm,
              border: `0.5px solid ${C.border}`,
              cursor: refrescando ? 'wait' : 'pointer',
              opacity: refrescando ? 0.6 : 1,
            }}
          >
            <span
              style={{
                display: 'inline-block',
                animation: refrescando ? 'spin 0.9s linear infinite' : 'none',
              }}
            >
              ↻
            </span>
          </button>
          <button
            onClick={toggleTema}
            title={tema === 'dark' ? 'Cambiar a claro' : 'Cambiar a oscuro'}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              fontSize: 12,
              background: C.surfaceAlt,
              color: C.tm,
              border: `0.5px solid ${C.border}`,
              cursor: 'pointer',
            }}
          >
            {tema === 'dark' ? '☀' : '☾'}
          </button>
        </div>
      </div>

      {!isMobile && <DesktopTabs tab={tab} setTab={setTab} C={C} nAlertas={alertas.length} />}

      <div
        style={{
          padding: isMobile ? '12px 12px 0' : '18px 20px',
          paddingBottom: isMobile ? '84px' : '40px',
          maxWidth: 1400,
          margin: '0 auto',
        }}
      >
        <ErrorBoundary>{tabContent()}</ErrorBoundary>
      </div>

      {isMobile && <MobileBottomNav tab={tab} setTab={setTab} C={C} nAlertas={alertas.length} />}

      <ToastStack toasts={toasts} onDismiss={dismissToast} C={C} />

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
