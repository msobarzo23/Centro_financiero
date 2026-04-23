import { z } from 'zod';

// Validación tolerante: si la hoja está vacía o parcial, no aborta;
// solo reporta por consola y devuelve un aviso para mostrar en toast.

const bancoRow = z.object({
  fecha: z.string().nullable(),
  banco: z.string(),
  descripcion: z.string(),
});

const dapRow = z.object({
  fechaInicio: z.string().nullable(),
  vencimiento: z.string().nullable(),
  banco: z.string(),
});

const calRow = z.object({
  fecha: z.string().nullable(),
  monto: z.number(),
  concepto: z.string(),
});

const leasingDetRow = z.object({
  banco: z.string(),
  diaVto: z.number(),
  cuotaCLPcIVA: z.number(),
});

const creditoRow = z.object({
  nCuota: z.number(),
  fechaVenc: z.string(),
  valorCuota: z.number(),
});

// Chequea que las estructuras esenciales cumplan. Devuelve array de avisos
// tipo { hoja, motivo } listos para empujar a errores.
export function validarData(data) {
  const avisos = [];

  const chequeos = [
    { nombre: 'Bancos', items: data.bancos, schema: bancoRow },
    { nombre: 'DAP', items: data.dap, schema: dapRow },
    { nombre: 'Calendario', items: data.cal, schema: calRow },
    { nombre: 'Leasing Detalle', items: data.leasingDetalle, schema: leasingDetRow },
    { nombre: 'Crédito', items: data.credito, schema: creditoRow },
  ];

  for (const { nombre, items, schema } of chequeos) {
    if (!Array.isArray(items)) {
      avisos.push({ hoja: nombre, motivo: 'La hoja no es un arreglo' });
      continue;
    }
    if (items.length === 0) continue; // Hoja vacía ya se reportó en fetchSheet.
    const primera = schema.safeParse(items[0]);
    if (!primera.success) {
      const primerError = primera.error.issues[0];
      const campo = primerError?.path?.join('.') || 'desconocido';
      const mensaje = primerError?.message || 'estructura inválida';
      avisos.push({
        hoja: nombre,
        motivo: `Columna "${campo}" no coincide: ${mensaje}. ¿Cambió el encabezado de la hoja?`,
      });
      console.warn(`[schema] ${nombre}:`, primera.error.issues);
    }
  }

  return avisos;
}
