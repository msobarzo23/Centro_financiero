import { describe, it, expect } from 'vitest';
import {
  saldoActualBancos,
  ingresoDiarioPromedio,
  expandirLeasing,
  estimarFacturacionDia,
  ventasPorMes,
  proyectar,
} from './proyeccion.js';

describe('saldoActualBancos', () => {
  it('usa el último saldoFinal de cada banco', () => {
    const bancos = [
      { fecha: '2026-04-20', banco: 'BCI', saldoFinal: 1000 },
      { fecha: '2026-04-21', banco: 'BCI', saldoFinal: 1500 },
      { fecha: '2026-04-21', banco: 'Chile', saldoFinal: 500 },
    ];
    expect(saldoActualBancos(bancos)).toBe(2000);
  });

  it('ignora filas sin saldoFinal', () => {
    const bancos = [
      { fecha: '2026-04-21', banco: 'BCI', saldoFinal: null },
      { fecha: '2026-04-21', banco: 'Chile', saldoFinal: 500 },
    ];
    expect(saldoActualBancos(bancos)).toBe(500);
  });

  it('retorna 0 si no hay bancos', () => {
    expect(saldoActualBancos([])).toBe(0);
    expect(saldoActualBancos(null)).toBe(0);
  });
});

describe('ingresoDiarioPromedio', () => {
  it('promedia por días de ventana usando neto', () => {
    const ventasRows = [
      { fecha: '2026-04-01', neto: 3000 },
      { fecha: '2026-04-15', neto: 6000 },
    ];
    expect(ingresoDiarioPromedio(ventasRows, 30, '2026-04-23')).toBe(300);
  });

  it('excluye facturas fuera de la ventana', () => {
    const ventasRows = [
      { fecha: '2026-01-01', neto: 100000 },
      { fecha: '2026-04-15', neto: 3000 },
    ];
    expect(ingresoDiarioPromedio(ventasRows, 30, '2026-04-23')).toBe(100);
  });
});

describe('ventasPorMes', () => {
  it('agrupa por YYYY-MM sumando neto', () => {
    const rows = [
      { fecha: '2025-01-10', neto: 100 },
      { fecha: '2025-01-20', neto: 200 },
      { fecha: '2025-02-05', neto: 50 },
    ];
    const map = ventasPorMes(rows);
    expect(map['2025-01']).toBe(300);
    expect(map['2025-02']).toBe(50);
  });
});

describe('estimarFacturacionDia', () => {
  it('usa el mismo mes del año anterior distribuido por días del mes', () => {
    // Abril tiene 30 días. Si año pasado en abril facturamos 300.000, un día abril es 10.000.
    const ventasMes = { '2025-04': 300000 };
    expect(estimarFacturacionDia('2026-04-15', ventasMes, 999)).toBe(10000);
  });

  it('cae al fallback si no hay data del año pasado', () => {
    expect(estimarFacturacionDia('2026-04-15', {}, 777)).toBe(777);
  });
});

describe('expandirLeasing', () => {
  it('usa cuotaCLPsIVA por defecto (sin IVA)', () => {
    const leasingDetalle = [
      { diaVto: 5, cuotasPorPagar: 3, cuotaCLPsIVA: 800000, cuotaCLPcIVA: 952000 },
    ];
    const fechas = ['2026-05-05', '2026-06-05', '2026-07-05'];
    const egresos = expandirLeasing(leasingDetalle, fechas);
    expect(egresos['2026-05-05']).toBe(800000);
  });

  it('permite forzar cuotaCLPcIVA si el caller lo pide', () => {
    const leasingDetalle = [
      { diaVto: 5, cuotasPorPagar: 3, cuotaCLPsIVA: 800000, cuotaCLPcIVA: 952000 },
    ];
    const fechas = ['2026-05-05'];
    const egresos = expandirLeasing(leasingDetalle, fechas, 'cuotaCLPcIVA');
    expect(egresos['2026-05-05']).toBe(952000);
  });

  it('respeta cuotasPorPagar como límite', () => {
    const leasingDetalle = [{ diaVto: 5, cuotasPorPagar: 1, cuotaCLPsIVA: 100 }];
    const fechas = ['2026-05-05', '2026-06-05', '2026-07-05'];
    const egresos = expandirLeasing(leasingDetalle, fechas);
    expect(egresos['2026-05-05']).toBe(100);
    expect(egresos['2026-06-05']).toBeUndefined();
  });
});

describe('proyectar', () => {
  it('ingresos de los primeros 30 días son facturación real de los últimos 30 días', () => {
    const ventasRows = [
      { fecha: '2026-03-25', neto: 1000000 }, // se cobra 2026-04-24
      { fecha: '2026-04-10', neto: 2000000 }, // se cobra 2026-05-10
    ];
    const r = proyectar({
      saldoInicial: 0,
      ventasRows,
      hoy: '2026-04-23',
      dias: 30,
      plazoCobro: 30,
    });
    const dia24Abril = r.serie.find((d) => d.fecha === '2026-04-24');
    expect(dia24Abril.tipoIngreso).toBe('real');
    expect(dia24Abril.ingreso).toBe(1000000);
  });

  it('ingresos lejanos usan estacionalidad del año pasado', () => {
    // Julio 2025 facturó 300k. Con plazoCobro 30, el cobro cae ~agosto 2025.
    // Para estimar un día de agosto-2026, la fecha de facturación será julio-2026,
    // que consulta julio-2025 → 300k / 31 días del mes.
    const ventasRows = [
      { fecha: '2025-07-15', neto: 300000 },
    ];
    const r = proyectar({
      saldoInicial: 0,
      ventasRows,
      hoy: '2026-04-23',
      dias: 180,
      plazoCobro: 30,
    });
    const diaAgosto = r.serie.find((d) => d.fecha.startsWith('2026-08'));
    expect(diaAgosto.tipoIngreso).toBe('estimado');
    expect(diaAgosto.ingreso).toBeCloseTo(300000 / 31, 0);
  });

  it('multiplicador aplica escenarios', () => {
    const ventasRows = [{ fecha: '2026-03-25', neto: 1000000 }];
    const r = proyectar({
      saldoInicial: 0,
      ventasRows,
      hoy: '2026-04-23',
      dias: 30,
      plazoCobro: 30,
      multiplicadorIngresos: 0.5,
    });
    const dia24Abril = r.serie.find((d) => d.fecha === '2026-04-24');
    expect(dia24Abril.ingreso).toBe(500000);
  });

  it('saldo acumula día a día y marca mínimo', () => {
    const r = proyectar({
      saldoInicial: 100000,
      ventasRows: [],
      calendario: [{ fecha: '2026-04-25', monto: 200000 }],
      hoy: '2026-04-23',
      dias: 5,
      plazoCobro: 30,
    });
    const dia25 = r.serie.find((d) => d.fecha === '2026-04-25');
    expect(dia25.saldo).toBe(-100000);
    expect(r.primerCruceNegativo.fecha).toBe('2026-04-25');
  });
});
