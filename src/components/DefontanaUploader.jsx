import { useRef, useState } from 'react';
import { S, W, R, SP } from '../utils/theme.js';
import { fmtDateMed } from '../utils/defontanaHelpers.js';

// Uploader drag&drop para archivos Defontana (.xlsx).
// Acepta hasta 2 archivos: cuenta 1110401001 Nacionales + 1110401002 Internacionales.
// Procesa todo en el navegador — los archivos no salen del equipo.
export function DefontanaUploader({
  C,
  onUpload,
  onClear,
  current,
  uploading = false,
  acceptMultiple = true,
  title = 'Sube el informe de cobranzas Defontana',
  description = 'Exporta el Informe por Análisis de Defontana (cuenta 1110401001 Nacionales y/o 1110401002 Internacionales) y arrástralo aquí. Puedes soltar los dos archivos juntos.',
}) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState(null);

  const handleFiles = async (files) => {
    const arr = Array.from(files).filter((f) => f.name.match(/\.(xlsx|xls|xlsm)$/i));
    if (arr.length === 0) {
      setError('Solo archivos Excel (.xlsx, .xls, .xlsm)');
      return;
    }
    setError(null);
    try {
      await onUpload(arr);
    } catch (e) {
      setError(e.message || 'Error procesando archivo');
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const archivos = current?.archivos || [];
  const esInternacional = (a) => a.cuenta === '1110401002';

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? C.accent : C.border}`,
          borderRadius: R.lg,
          padding: `${SP.xl2}px ${SP.xl}px`,
          textAlign: 'center',
          cursor: 'pointer',
          background: dragOver ? C.accentD : C.surfaceAlt,
          transition: 'all 120ms ease',
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: R.md,
            background: current ? C.greenD : C.accentD,
            color: current ? C.green : C.accent,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: SP.md,
            fontSize: 22,
            fontWeight: W.b,
          }}
        >
          {uploading ? (
            <span style={{ display: 'inline-block', animation: 'spin 0.9s linear infinite' }}>↻</span>
          ) : current ? '✓' : '↑'}
        </div>

        {current ? (
          <>
            <div
              style={{
                fontSize: S.md,
                fontWeight: W.sb,
                color: C.text,
                marginBottom: SP.sm,
                letterSpacing: '-0.2px',
              }}
            >
              {archivos.length} archivo{archivos.length !== 1 ? 's' : ''} cargado{archivos.length !== 1 ? 's' : ''}
            </div>
            <div
              style={{
                display: 'flex',
                gap: SP.xs,
                justifyContent: 'center',
                flexWrap: 'wrap',
                marginBottom: SP.sm,
              }}
            >
              {archivos.map((a, i) => (
                <span
                  key={i}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: `3px ${SP.sm}px`,
                    background: esInternacional(a) ? C.cyanD : C.accentD,
                    color: esInternacional(a) ? C.cyan : C.accent,
                    border: `1px solid ${esInternacional(a) ? C.cyan + '44' : C.accent + '44'}`,
                    borderRadius: 999,
                    fontSize: S.xxs,
                    fontWeight: W.sb,
                    letterSpacing: '0.2px',
                  }}
                >
                  {esInternacional(a) ? 'INT' : 'NAC'} · {a.cuentaLabel}
                  <span style={{ color: C.td, fontWeight: W.r }}> · {a.totalMovimientos}</span>
                </span>
              ))}
            </div>
            <div style={{ fontSize: S.sm, color: C.tm, marginBottom: SP.xs }}>
              {current.totalMovimientos} movimientos · al {fmtDateMed(current.fechaInforme)}
            </div>
            <div style={{ fontSize: S.xs, color: C.accent, fontWeight: W.sb }}>
              Haz click o arrastra para reemplazar
            </div>
          </>
        ) : (
          <>
            <div
              style={{
                fontSize: S.lg,
                fontWeight: W.sb,
                color: C.text,
                marginBottom: SP.xs,
                letterSpacing: '-0.2px',
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontSize: S.sm,
                color: C.tm,
                marginBottom: SP.sm,
                maxWidth: 440,
                margin: `0 auto ${SP.sm}px`,
                lineHeight: 1.5,
              }}
            >
              {description}
            </div>
            <div style={{ fontSize: S.xs, color: C.td }}>
              .xlsx — se procesa 100% en tu navegador, nada sale de este equipo
            </div>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.xlsm"
          multiple={acceptMultiple}
          onChange={(e) => handleFiles(e.target.files)}
          style={{ display: 'none' }}
        />
      </div>

      {error && (
        <div
          style={{
            marginTop: SP.sm,
            padding: `${SP.sm}px ${SP.md}px`,
            background: C.redD,
            border: `1px solid ${C.red}55`,
            borderRadius: R.md,
            fontSize: S.sm,
            color: C.red,
            display: 'flex',
            alignItems: 'center',
            gap: SP.xs,
            fontWeight: W.m,
          }}
        >
          <span style={{ fontSize: S.md }}>⚠</span> {error}
        </div>
      )}

      {current && onClear && (
        <button
          onClick={onClear}
          style={{
            marginTop: SP.sm,
            padding: `${SP.xs}px ${SP.md}px`,
            background: 'transparent',
            border: `1px solid ${C.border}`,
            borderRadius: R.sm,
            fontSize: S.xs,
            color: C.tm,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            cursor: 'pointer',
            fontWeight: W.m,
          }}
        >
          ✕ Quitar archivo{archivos.length > 1 ? 's' : ''}
        </button>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
