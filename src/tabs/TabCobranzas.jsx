import { S, W, SP } from '../utils/theme.js';
import { Card, Eyebrow, Metric, SectionTitle } from '../components/common.jsx';
import { DefontanaUploader } from '../components/DefontanaUploader.jsx';
import { fmtM, fmtDateMed } from '../utils/defontanaHelpers.js';

// Pestaña Cobranzas — Fase 1: sólo ingesta de archivos Defontana.
// El aging, DSO por cliente y vista 360° vienen en la Fase 2.
export default function TabCobranzas({
  C,
  isMobile,
  saldosRaw,
  cobranzas,
  uploading,
  uploadSaldos,
  clearSaldos,
}) {
  const clientesConSaldo = cobranzas?.clientesArray?.length || 0;
  const totalPendiente = cobranzas?.totalPendiente || 0;
  const totalFacturas = cobranzas?.totalFacturasPendientes || 0;
  const totalMovimientos = saldosRaw?.totalMovimientos || 0;
  const archivosCargados = saldosRaw?.archivos?.length || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SP.xl }}>
      <div>
        <div
          style={{
            fontSize: S.xl,
            fontWeight: W.sb,
            color: C.text,
            letterSpacing: '-0.3px',
            marginBottom: SP.xs,
          }}
        >
          Cobranzas Defontana
        </div>
        <div style={{ fontSize: S.sm, color: C.tm, lineHeight: 1.5, maxWidth: 720 }}>
          Subí el Informe por Análisis de Defontana (cuenta <b>1110401001 Nacionales</b> y/o
          <b> 1110401002 Internacionales</b>). Los archivos se procesan en tu navegador y quedan
          guardados localmente — no se suben a ningún servidor.
        </div>
      </div>

      <Card C={C} pad="lg">
        <DefontanaUploader
          C={C}
          current={saldosRaw}
          uploading={uploading}
          onUpload={uploadSaldos}
          onClear={clearSaldos}
        />
      </Card>

      {saldosRaw && cobranzas && (
        <>
          <SectionTitle C={C}>Resumen</SectionTitle>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
              gap: SP.md,
            }}
          >
            <Metric
              C={C}
              label="Archivos cargados"
              value={archivosCargados}
              sub={`${totalMovimientos.toLocaleString('es-CL')} movimientos`}
            />
            <Metric
              C={C}
              label="Clientes con saldo"
              value={clientesConSaldo}
              sub={`${totalFacturas} facturas pendientes`}
            />
            <Metric
              C={C}
              label="Total pendiente"
              value={fmtM(totalPendiente)}
              color={C.accent}
            />
            <Metric
              C={C}
              label="Fecha informe"
              value={fmtDateMed(cobranzas.fechaInforme)}
              color={C.text}
            />
          </div>

          <Card C={C} pad="md">
            <Eyebrow C={C}>Pendientes</Eyebrow>
            <div style={{ fontSize: S.sm, color: C.tm, lineHeight: 1.6 }}>
              Ingesta operativa. En la próxima fase se agregan:
              <ul style={{ margin: `${SP.xs}px 0 0 ${SP.lg}px`, padding: 0 }}>
                <li>Aging: por vencer, 0-30, 31-60, 61-90, 91-180, crítica (+180d).</li>
                <li>DSO real por cliente (días efectivos de cobro).</li>
                <li>Vista 360° por cliente y proyección de flujo a 13 semanas.</li>
              </ul>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
