// Configuración del ingestor Defontana.
// Aquí viven las cuentas contables y los plazos de pago por cliente.
// Centralizado para que si cambia un plazo solo se edita acá.

export const CUENTAS_CLIENTES = {
  '1110401001': 'Nacionales',
  '1110401002': 'Internacionales',
};

// Clientes con plazo de pago distinto al default (30 días).
// Si el archivo Defontana no trae vencimiento, se estima con estos días.
export const CLIENTE_PAGO_DIAS = {
  'MAXAM CHILE S.A.': 60,
  'MAXAM CHILE SA': 60,
};

// Una factura con más días de atraso que este umbral se considera crítica
// (probablemente incobrable en el ciclo normal).
export const UMBRAL_FACTURA_CRITICA_DIAS = 180;
