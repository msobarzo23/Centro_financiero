import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import TabVentas from './tabs/TabVentas.jsx';
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

const TEMA_KEY = 'cmf_tbello_tema';
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export default function App() {
  const [tema, setTema] = useState(() => localStorage.getItem(TEMA_KEY) || 'dark');
  const [tab, setTab] = useState(0);
  const [toasts, setToasts] = useState([]);

  const isMobile = useIsMobile();
  const C = T[tema];

  // Datos: TanStack Query se encarga de cache, refetch 5min, dedupe, retries.
  const { data, isPending, isFetching, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['allData'],
    queryFn: fetchData,
  });

  const pushToast = useCallback((toast) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Toasts por hoja fallida. Solo cuando la lista de errores cambia
  // respecto al fetch anterior (evita spam al refrescar cada 5min).
  const erroresPrevRef = useRef('');
  useEffect(() => {
    if (!data?.errores) return;
    const key = data.errores.map((e) => `${e.hoja}|${e.motivo}`).join(';');
    if (key && key !== erroresPrevRef.current) {
      data.errores.forEach((e) => {
        pushToast({
          tipo: 'warn',
          titulo: `Problema al cargar: ${e.hoja}`,
          mensaje: e.motivo,
        });
      });
    }
    erroresPrevRef.current = key;
  }, [data, pushToast]);

  // Toast cuando el fetch completo falla (no solo una hoja).
  const errorPrevRef = useRef(null);
  useEffect(() => {
    if (error && error !== errorPrevRef.current) {
      pushToast({
        tipo: 'error',
        titulo: 'No se pudo actualizar',
        mensaje: error.message || 'Revisa tu conexión',
      });
      errorPrevRef.current = error;
    } else if (!error) {
      errorPrevRef.current = null;
    }
  }, [error, pushToast]);

  function toggleTema() {
    const nuevo = tema === 'dark' ? 'light' : 'dark';
    setTema(nuevo);
    localStorage.setItem(TEMA_KEY, nuevo);
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

  // Primera carga (sin cache previo) y todavía no hay data.
  if (isPending && !data) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, color: C.text }}>
        <Loading C={C} />
      </div>
    );
  }

  // Error duro en la primera carga: no hay data previa para mostrar.
  if (error && !data) {
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
          <div style={{ fontSize: 13, color: C.tm, marginBottom: 14 }}>
            {error.message || 'Revisa tu conexión'}
          </div>
          <button
            onClick={() => refetch()}
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
        return <TabVentas {...commonProps} ventas={ventas} />;
      case 4:
        return (
          <TabFlujoCaja
            {...commonProps}
            ventas={ventas}
            calendario={cal}
            leasingDetalle={leasingDetalle}
            creditoPendiente={creditoPendiente}
          />
        );
      case 5:
        return <TabInversiones {...commonProps} dap={dap} />;
      case 6:
        return <TabFFMM {...commonProps} ffmm={ffmm} movimientos={ffmmMov} />;
      case 7:
        return (
          <TabLeasing
            {...commonProps}
            leasingDetalle={leasingDetalle}
            leasingResumen={leasingResumen}
          />
        );
      case 8:
        return (
          <TabCredito
            {...commonProps}
            credito={credito}
            creditoPendiente={creditoPendiente}
            saldoInsoluto={saldoInsoluto}
          />
        );
      case 9:
        return <TabAlertas {...commonProps} alertas={alertas} />;
      case 10:
        return <TabCalc {...commonProps} />;
      default:
        return null;
    }
  };

  const cacheStale = dataUpdatedAt > 0 && Date.now() - dataUpdatedAt > CACHE_MAX_AGE_MS;
  const minutosDesdeActualizacion = dataUpdatedAt
    ? Math.floor((Date.now() - dataUpdatedAt) / 60000)
    : null;
  const ultimaAct = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

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
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refrescar"
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              fontSize: 12,
              background: C.surfaceAlt,
              color: isFetching ? C.td : C.tm,
              border: `0.5px solid ${C.border}`,
              cursor: isFetching ? 'wait' : 'pointer',
              opacity: isFetching ? 0.6 : 1,
            }}
          >
            <span
              style={{
                display: 'inline-block',
                animation: isFetching ? 'spin 0.9s linear infinite' : 'none',
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
