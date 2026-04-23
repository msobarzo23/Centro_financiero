// Parsers dedicados para montos chilenos. Se usan desde data.js y estan testeados
// en parsers.test.js — si tocas algo, corre `npm test`.

const VACIO = new Set(['', '-', '—', null, undefined]);

// Limpia prefijos de moneda y espacios.
function limpiar(v) {
  if (VACIO.has(v)) return null;
  let s = String(v).trim();
  s = s.replace(/\$/g, '').replace(/\s/g, '').replace(/"/g, '');
  // Parentesis = negativo.
  let neg = false;
  if (s.startsWith('(') && s.endsWith(')')) {
    neg = true;
    s = s.slice(1, -1);
  }
  if (s.startsWith('-')) {
    neg = true;
    s = s.slice(1);
  }
  return { s, neg };
}

// Montos en pesos chilenos. Siempre entero, punto = separador de miles.
// "1.234.567" → 1234567. Coma se ignora (CLP no lleva decimales).
export function parseCLP(v) {
  const c = limpiar(v);
  if (!c) return 0;
  const s = c.s.replace(/\./g, '').replace(/,.*/, ''); // drop decimales si alguien los puso
  const n = parseInt(s, 10);
  if (isNaN(n)) return 0;
  return c.neg ? -n : n;
}

// Montos en UF (decimales con coma). "1.234,56" UF = 1234.56
// Si solo viene un punto y sigue con 3 digitos asumimos miles; si no, decimal.
export function parseUF(v) {
  const c = limpiar(v);
  if (!c) return 0;
  let s = c.s;
  if (s.includes('.') && s.includes(',')) {
    // Formato es-CL completo: puntos miles, coma decimal.
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  } else if (s.includes('.')) {
    const parts = s.split('.');
    // Heuristica: si la ultima parte tiene exactamente 3 digitos, era separador de miles.
    const ultima = parts[parts.length - 1];
    if (parts.length > 2 || (parts.length === 2 && ultima.length === 3)) {
      s = s.replace(/\./g, '');
    }
    // si no, es decimal (ej. "1.5") y se deja como esta.
  }
  const n = parseFloat(s);
  if (isNaN(n)) return 0;
  return c.neg ? -n : n;
}

// Porcentajes: "5,5%" → 0.055, "0.12" → 0.12 (asume ya normalizado si <= 0.1).
export function parsePct(v) {
  const c = limpiar(v);
  if (!c) return null;
  const s = c.s.replace('%', '').replace(',', '.');
  const n = parseFloat(s);
  if (isNaN(n)) return null;
  return n > 0.1 ? n / 100 : n;
}

// Parser generico para columnas ambiguas (no usar si sabes que es UF o CLP).
export function parseNum(v) {
  const c = limpiar(v);
  if (!c) return null;
  let s = c.s;
  if (s.includes('.') && s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  } else if (s.includes('.')) {
    const parts = s.split('.');
    const ultima = parts[parts.length - 1];
    if (parts.length > 2 || (parts.length === 2 && ultima.length === 3)) {
      s = s.replace(/\./g, '');
    }
  }
  const n = parseFloat(s);
  if (isNaN(n)) return null;
  return c.neg ? -n : n;
}

// "27/01/2026" o "2026-01-27" → "2026-01-27". Todo lo demas → null.
export function parseDate(v) {
  if (!v) return null;
  const s = String(v).trim();
  const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m1) {
    const day = m1[1].padStart(2, '0');
    const month = m1[2].padStart(2, '0');
    return `${m1[3]}-${month}-${day}`;
  }
  const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}`;
  return null;
}

export function getToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
