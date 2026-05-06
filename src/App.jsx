import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, Sun, Moon } from 'lucide-react';
import { fetchData } from './data.js';
import { T, S, W, R, SP, FONT_BODY, FONT_TITLE } from './utils/theme.js';
import { buildAlertas } from './utils/alertas.js';
import { useIsMobile } from './utils/useMediaQuery.js';

import { Loading } from './components/common.jsx';
import { DesktopTabs, MobileBottomNav, ALL_TABS } from './components/Nav.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { ToastStack } from './components/Toast.jsx';
import { IndicadoresBadge } from './components/Indicadores.jsx';

import TabResumen from './tabs/TabResumen.jsx';
import TabBancos from './tabs/TabBancos.jsx';
import TabVentas from './tabs/TabVentas.jsx';
import TabCobranzas from './tabs/TabCobranzas.jsx';
import TabClientes360 from './tabs/TabClientes360.jsx';
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
import { useDefontana } from './hooks/useDefontana.js';

const TEMA_KEY = 'cmf_tbello_tema';
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export default function App() {
  const [tema, setTema] = useState(() => localStorage.getItem(TEMA_KEY) || 'light');
  const [tab, setTab] = useState(0);
  const [toasts, setToasts] = useState([]);

  const isMobile = useIsMobile();
  const C = T[tema];

  // Datos: TanStack Query se encarga de cache, refetch 5min, dedupe, retries.
  const { data, isPending, isFetching, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['allData'],
    queryFn: fetchData,
  });

  // Datos Defontana (ingesta local de XLSX, no pasa por react-query).
  const defontana = useDefontana();

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
    document.body.style.fontFamily = FONT_BODY;
    document.body.style.fontFeatureSettings = "'cv11' 1, 'ss01' 1";
    document.body.style.textRendering = 'optimizeLegibility';
    document.body.style.webkitFontSmoothing = 'antialiased';
    document.body.style.MozOsxFontSmoothing = 'grayscale';
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
            borderRadius: R.lg,
            padding: SP.xl2,
            border: `1px solid ${C.red}55`,
            maxWidth: 420,
            boxShadow: C.shadow,
          }}
        >
          <div style={{ fontSize: S.lg, fontWeight: W.sb, color: C.red, marginBottom: SP.sm, letterSpacing: "-0.2px" }}>
            Error al cargar datos
          </div>
          <div style={{ fontSize: S.base, color: C.tm, marginBottom: SP.lg, lineHeight: 1.5 }}>
            {error.message || 'Revisa tu conexión'}
          </div>
          <button
            onClick={() => refetch()}
            style={{
              padding: `${SP.sm}px ${SP.lg}px`,
              borderRadius: R.md,
              background: C.accent,
              color: '#fff',
              border: 'none',
              fontSize: S.base,
              fontWeight: W.sb,
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
    leasingProximas,
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
            bancos={bancos}
            ventas={ventas}
            calendario={cal}
            leasingDetalle={leasingDetalle}
            creditoPendiente={creditoPendiente}
            dap={dap}
            ffmm={ffmm}
            defontana={defontana}
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
            leasingProximas={leasingProximas}
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
      case 11:
        return (
          <TabCobranzas
            {...commonProps}
            saldosRaw={defontana.saldosRaw}
            cobranzas={defontana.cobranzas}
            uploading={defontana.uploading}
            uploadSaldos={defontana.uploadSaldos}
            clearSaldos={defontana.clearSaldos}
          />
        );
      case 12:
        return (
          <TabClientes360
            {...commonProps}
            ventas={ventas}
            defontana={defontana}
          />
        );
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
            borderBottom: `1px solid ${C.amber}44`,
            padding: `${SP.sm}px ${SP.lg}px`,
            fontSize: S.sm,
            fontWeight: W.m,
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
          borderBottom: `1px solid ${C.border}`,
          padding: isMobile ? `${SP.md}px ${SP.lg}px` : `${SP.lg}px ${SP.xl}px`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: SP.md,
          position: 'sticky',
          top: 0,
          zIndex: 20,
          paddingTop: isMobile
            ? `calc(${SP.md}px + env(safe-area-inset-top))`
            : `${SP.lg}px`,
        }}
      >
        <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: SP.md }}>
          <img
            src="/logo-bello.svg"
            alt="Transportes Bello"
            style={{
              height: 56,
              width: 'auto',
              display: 'block',
              flexShrink: 0,
              filter: tema === 'dark' ? 'brightness(0) invert(1)' : 'none',
            }}
          />
          <div style={{ height: 44, width: 1, background: C.border, flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: isMobile ? S.lg : S.xl,
                fontWeight: W.r,
                color: C.text,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                letterSpacing: '-0.5px',
                lineHeight: 1.15,
                fontFamily: FONT_TITLE,
              }}
            >
              {isMobile ? 'CMF · TBello' : 'Centro de Mando Financiero'}
            </div>
            {!isMobile && (
              <div style={{ fontSize: S.xs, color: C.tm, marginTop: 2, fontWeight: W.m, fontFamily: FONT_BODY }}>
                Transportes Bello e Hijos Ltda. · {ALL_TABS[tab]}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: SP.sm, flexShrink: 0 }}>
          {!isMobile && <IndicadoresBadge C={C} />}
          {ultimaAct && (
            <span style={{ fontSize: S.xs, color: C.td, marginRight: SP.xs, fontWeight: W.m }}>
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
              width: 36,
              height: 36,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: R.md,
              background: C.surfaceAlt,
              color: isFetching ? C.td : C.tm,
              border: `1px solid ${C.border}`,
              cursor: isFetching ? 'wait' : 'pointer',
              opacity: isFetching ? 0.6 : 1,
              transition: 'background 160ms ease, color 160ms ease',
            }}
            onMouseEnter={(e) => { if (!isFetching) { e.currentTarget.style.background = C.accentD; e.currentTarget.style.color = C.accent; } }}
            onMouseLeave={(e) => { if (!isFetching) { e.currentTarget.style.background = C.surfaceAlt; e.currentTarget.style.color = C.tm; } }}
          >
            <RefreshCw
              size={16}
              strokeWidth={2}
              style={{ animation: isFetching ? 'spin 0.9s linear infinite' : 'none' }}
            />
          </button>
          <button
            onClick={toggleTema}
            title={tema === 'dark' ? 'Cambiar a claro' : 'Cambiar a oscuro'}
            style={{
              width: 36,
              height: 36,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: R.md,
              background: C.surfaceAlt,
              color: C.tm,
              border: `1px solid ${C.border}`,
              cursor: 'pointer',
              transition: 'background 160ms ease, color 160ms ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = C.accentD; e.currentTarget.style.color = C.accent; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = C.surfaceAlt; e.currentTarget.style.color = C.tm; }}
          >
            {tema === 'dark' ? <Sun size={16} strokeWidth={2} /> : <Moon size={16} strokeWidth={2} />}
          </button>
        </div>
      </div>

      {!isMobile && <DesktopTabs tab={tab} setTab={setTab} C={C} nAlertas={alertas.length} />}

      <div
        style={{
          padding: isMobile ? `${SP.md}px ${SP.md}px 0` : `${SP.xl2}px ${SP.xl2}px`,
          paddingBottom: isMobile ? '92px' : `${SP.xl3}px`,
          maxWidth: 1400,
          margin: '0 auto',
        }}
      >
        <ErrorBoundary>{tabContent()}</ErrorBoundary>
      </div>

      {isMobile && <MobileBottomNav tab={tab} setTab={setTab} C={C} nAlertas={alertas.length} />}

      <ToastStack toasts={toasts} onDismiss={dismissToast} C={C} />
    </div>
  );
}
