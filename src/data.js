// ─── URLs de Google Sheets publicadas como CSV ───────────────────────────────
const URLS = {
  bancos:       "https://docs.google.com/spreadsheets/d/e/2PACX-1vSlD_sQVnKW53q0m243_Gr0EletIkDxjaN1-mRzdlma7q6WktHBhXYBBunmz5ZyBg/pub?gid=1699395114&single=true&output=csv",
  dap:          "https://docs.google.com/spreadsheets/d/e/2PACX-1vSlD_sQVnKW53q0m243_Gr0EletIkDxjaN1-mRzdlma7q6WktHBhXYBBunmz5ZyBg/pub?gid=1020614134&single=true&output=csv",
  calendario:   "https://docs.google.com/spreadsheets/d/e/2PACX-1vSlD_sQVnKW53q0m243_Gr0EletIkDxjaN1-mRzdlma7q6WktHBhXYBBunmz5ZyBg/pub?gid=1876759165&single=true&output=csv",
  ffmmSaldos:   "https://docs.google.com/spreadsheets/d/e/2PACX-1vSlD_sQVnKW53q0m243_Gr0EletIkDxjaN1-mRzdlma7q6WktHBhXYBBunmz5ZyBg/pub?gid=1691837276&single=true&output=csv",
  ffmmMovs:     "https://docs.google.com/spreadsheets/d/e/2PACX-1vSlD_sQVnKW53q0m243_Gr0EletIkDxjaN1-mRzdlma7q6WktHBhXYBBunmz5ZyBg/pub?gid=1691837276&single=true&output=csv",
  leasingDetalle:  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSlD_sQVnKW53q0m243_Gr0EletIkDxjaN1-mRzdlma7q6WktHBhXYBBunmz5ZyBg/pub?gid=675670021&single=true&output=csv",
  leasingResumen:  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSlD_sQVnKW53q0m243_Gr0EletIkDxjaN1-mRzdlma7q6WktHBhXYBBunmz5ZyBg/pub?gid=771027573&single=true&output=csv",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
export function getToday() {
  return new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map(line => {
    const cols = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQ = !inQ; }
      else if (line[i] === ',' && !inQ) { cols.push(cur); cur = ""; }
      else { cur += line[i]; }
    }
    cols.push(cur);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (cols[i] || "").trim().replace(/^"|"$/g, ""); });
    return obj;
  });
}

function n(v) {
  if (v == null || v === "") return 0;
  // Remove thousands dots and replace decimal comma: "1.234,56" → 1234.56
  const s = String(v).replace(/\./g, "").replace(",", ".");
  const r = parseFloat(s);
  return isNaN(r) ? 0 : r;
}

function fetchCSV(url) {
  return fetch(url).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status} — ${url}`);
    return r.text();
  }).then(parseCSV);
}

// ─── Parsers por hoja ─────────────────────────────────────────────────────────

function parseBancos(rows) {
  return rows
    .filter(r => r["Fecha"] && r["Banco"])
    .map(r => ({
      fecha:        r["Fecha"],
      banco:        r["Banco"],
      descripcion:  r["Descripción"] || r["Descripcion"] || "",
      monto:        r["Monto"] === "" ? null : n(r["Monto"]),
      saldoInicial: r["Saldo Inicial"] === "" ? null : n(r["Saldo Inicial"]),
      saldoFinal:   r["Saldo Final"]   === "" ? null : n(r["Saldo Final"]),
      comentario:   r["Comentario"] || "",
    }));
}

function parseDAP(rows) {
  return rows
    .filter(r => r["Banco"] && r["Monto Inicial"])
    .map(r => ({
      banco:        r["Banco"],
      tipo:         r["Tipo"] || "",
      fechaInicio:  r["Fecha Inicio"] || "",
      vencimiento:  r["Vencimiento"]  || r["Fecha Fin"] || "",
      dias:         n(r["Días"] || r["Dias"] || 0),
      tasa:         n(r["Tasa"]) / 100,
      montoInicial: n(r["Monto Inicial"]),
      ganancia:     n(r["Ganancia"]),
      vigente:      (r["Vigente"] || "").toLowerCase(),
      comentario:   r["Para qué"] || r["Comentario"] || "",
    }));
}

function parseCalendario(rows) {
  return rows
    .filter(r => r["Fecha"] && r["Concepto"])
    .map(r => ({
      fecha:     r["Fecha"],
      concepto:  r["Concepto"],
      monto:     n(r["Monto"]),
      guardado:  n(r["Guardado"] || r["Monto Guardado"] || 0),
      falta:     n(r["Falta"] || 0),
      comentario: r["Comentario"] || "",
    }));
}

function parseFFMMSaldos(rows) {
  return rows
    .filter(r => r["Empresa"] && r["Fondo"])
    .map(r => ({
      empresa:      r["Empresa"],
      fondo:        r["Fondo"],
      admin:        r["Administradora"] || r["Admin"] || "",
      invertido:    n(r["Invertido"] || r["Monto Invertido"] || 0),
      valorActual:  n(r["Valor Actual"] || 0),
      rentabilidad: n(r["Rentabilidad"] || 0),
    }));
}

function parseFFMMMovs(rows) {
  return rows
    .filter(r => r["Fecha"] && r["Empresa"])
    .map(r => ({
      fecha:   r["Fecha"],
      empresa: r["Empresa"],
      fondo:   r["Fondo"],
      tipo:    r["Tipo"],
      monto:   n(r["Monto"]),
    }));
}

// ─── NUEVO: Leasing Detalle ───────────────────────────────────────────────────
function parseLeasingDetalle(rows) {
  return rows
    .filter(r => {
      const banco = r["Banco / Emisor"] || r["Banco/Emisor"] || r["Banco"] || "";
      return banco !== "" && (r["Estado"] || "").trim().toUpperCase() === "ACTIVO";
    })
    .map(r => ({
      id:              r["ID"] || "",
      banco:           r["Banco / Emisor"] || r["Banco/Emisor"] || r["Banco"] || "",
      nTractos:        n(r["N Tractos"] || r["N° Tractos"] || 0),
      cuotaUFIndiv:    n(r["Cuota UF Individual"] || 0),
      cuotaUFGrupo:    n(r["Cuota UF Total Grupo"] || r["Cuota UF Grupo"] || 0),
      diaVto:          n(r["Dia Vcto"] || r["Día Vcto"] || 0),
      fechaInicio:     r["Fecha Inicio"] || "",
      fechaFin:        r["Fecha Fin (Vencimiento)"] || r["Fecha Fin"] || r["Vencimiento"] || "",
      cuotasTotales:   n(r["Cuotas Totales"] || 0),
      cuotasPagadas:   n(r["Cuotas Pagadas"] || 0),
      cuotasPorPagar:  n(r["Cuotas Por Pagar"] || 0),
      estado:          r["Estado"] || "",
      deudaUF:         n(r["Deuda Pendiente UF"] || 0),
      cuotaCLPsIVA:    n(r["Cuota CLP s/IVA"] || r["Cuota CLP s IVA"] || 0),
      cuotaCLPcIVA:    n(r["Cuota CLP c/IVA"] || r["Cuota CLP c IVA"] || 0),
    }));
}

// ─── NUEVO: Leasing Resumen ───────────────────────────────────────────────────
function parseLeasingResumen(rows) {
  return rows
    .filter(r => r["Mes"] && r["Anio"] || r["Año"])
    .map(r => ({
      mes:             r["Mes"] || "",
      anio:            r["Anio"] || r["Año"] || "",
      cuotaUFTotal:    n(r["Cuota UF Total Mes"] || r["Cuota UF Total"] || 0),
      cuotaCLPsIVA:    n(r["Cuota CLP s/IVA"] || r["Cuota CLP s IVA"] || 0),
      cuotaCLPcIVA:    n(r["Cuota CLP c/IVA"] || r["Cuota CLP c IVA"] || 0),
      bciDia5:         n(r["BCI (UF) Dia 5"] || r["BCI (UF) Día 5"] || r["BCI Dia5"] || r["BCI (UF)"] || 0),
      bciDia15:        n(r["BCI (UF) Dia 15"] || r["BCI (UF) Día 15"] || r["BCI Dia15"] || 0),
      vfsVolvo:        n(r["VFS VOLVO (UF)"] || r["VFS (UF)"] || r["VFS VOLVO"] || 0),
      bancoChile:      n(r["BANCO DE CHILE (UF)"] || r["Banco Chile (UF)"] || r["BANCO DE CHILE"] || 0),
      contratosActivos: n(r["Contratos Activos"] || 0),
      vesteEstesMes:   r["Vence este mes"] || "",
      delta:           n(r["Delta vs mes anterior"] || r["Delta"] || 0),
    }));
}

// ─── Fetch principal ──────────────────────────────────────────────────────────
export async function fetchAllData() {
  const [
    rawBancos,
    rawDAP,
    rawCal,
    rawFFMM,
    rawFFMMM,
    rawLeasingDet,
    rawLeasingRes,
  ] = await Promise.all([
    fetchCSV(URLS.bancos),
    fetchCSV(URLS.dap),
    fetchCSV(URLS.calendario),
    fetchCSV(URLS.ffmmSaldos),
    fetchCSV(URLS.ffmmMovs),
    fetchCSV(URLS.leasingDetalle),
    fetchCSV(URLS.leasingResumen),
  ]);

  return {
    bancos:          parseBancos(rawBancos),
    dap:             parseDAP(rawDAP),
    calendario:      parseCalendario(rawCal),
    ffmmSaldos:      parseFFMMSaldos(rawFFMM),
    ffmmMovimientos: parseFFMMMovs(rawFFMMM),
    leasingDetalle:  parseLeasingDetalle(rawLeasingDet),
    leasingResumen:  parseLeasingResumen(rawLeasingRes),
  };
}
