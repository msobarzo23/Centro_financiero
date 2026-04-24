import { useCallback, useEffect, useMemo, useState } from 'react';
import { processFiles, computeCobranzas } from '../utils/defontanaProcessor.js';

// Los archivos Defontana se procesan 100% en el navegador y se guardan en
// localStorage — nunca salen del equipo. No usamos react-query porque no hay
// endpoint que refetchear; la fuente de verdad es el upload del usuario.

const STORAGE_KEY_SALDOS = 'cmf_tbello_defontana_saldos_v1';
const STORAGE_KEY_HISTORICO = 'cmf_tbello_defontana_historico_v1';

function rehydrateDates(obj) {
  if (!obj) return null;
  if (obj.movimientos) {
    obj.movimientos.forEach((m) => {
      if (m.fecha) m.fecha = new Date(m.fecha);
      if (m.vencimiento) m.vencimiento = new Date(m.vencimiento);
    });
  }
  if (obj.fechaInforme) obj.fechaInforme = new Date(obj.fechaInforme);
  if (obj.fechaMin) obj.fechaMin = new Date(obj.fechaMin);
  if (obj.fechaMax) obj.fechaMax = new Date(obj.fechaMax);
  if (obj.archivos) {
    obj.archivos.forEach((a) => {
      if (a.fechaInforme) a.fechaInforme = new Date(a.fechaInforme);
      if (a.fechaMin) a.fechaMin = new Date(a.fechaMin);
      if (a.fechaMax) a.fechaMax = new Date(a.fechaMax);
    });
  }
  return obj;
}

function loadFromStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return rehydrateDates(JSON.parse(raw));
  } catch {
    return null;
  }
}

function saveToStorage(key, obj) {
  try {
    localStorage.setItem(key, JSON.stringify(obj));
  } catch (e) {
    // Probablemente QuotaExceeded. No tiramos error al usuario porque el
    // estado en memoria sigue válido; solo no persistirá al refrescar.
    console.warn('[defontana] no se pudo persistir en localStorage', e);
  }
}

export function useDefontana() {
  const [saldosRaw, setSaldosRaw] = useState(null);
  const [historicoRaw, setHistoricoRaw] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const s = loadFromStorage(STORAGE_KEY_SALDOS);
    const h = loadFromStorage(STORAGE_KEY_HISTORICO);
    if (s) setSaldosRaw(s);
    if (h) setHistoricoRaw(h);
  }, []);

  const uploadSaldos = useCallback(async (files) => {
    setUploading(true);
    setError(null);
    try {
      const procesado = await processFiles(files);
      setSaldosRaw(procesado);
      saveToStorage(STORAGE_KEY_SALDOS, procesado);
      return procesado;
    } catch (e) {
      setError(e.message || 'Error procesando archivo');
      throw e;
    } finally {
      setUploading(false);
    }
  }, []);

  const uploadHistorico = useCallback(async (files) => {
    setUploading(true);
    setError(null);
    try {
      const procesado = await processFiles(files);
      setHistoricoRaw(procesado);
      saveToStorage(STORAGE_KEY_HISTORICO, procesado);
      return procesado;
    } catch (e) {
      setError(e.message || 'Error procesando archivo');
      throw e;
    } finally {
      setUploading(false);
    }
  }, []);

  const clearSaldos = useCallback(() => {
    setSaldosRaw(null);
    try { localStorage.removeItem(STORAGE_KEY_SALDOS); } catch { /* storage inaccesible */ }
  }, []);

  const clearHistorico = useCallback(() => {
    setHistoricoRaw(null);
    try { localStorage.removeItem(STORAGE_KEY_HISTORICO); } catch { /* storage inaccesible */ }
  }, []);

  const cobranzas = useMemo(() => {
    if (!saldosRaw) return null;
    return computeCobranzas(saldosRaw);
  }, [saldosRaw]);

  return {
    saldosRaw,
    historicoRaw,
    cobranzas,
    uploading,
    error,
    uploadSaldos,
    uploadHistorico,
    clearSaldos,
    clearHistorico,
  };
}
