import { describe, it, expect } from 'vitest';
import {
  saldoActualBancos,
  ingresoDiarioPromedio,
  expandirLeasing,
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
  it('promedia por días de ventana, no por facturas', () => {
    const ventasRows = [
      { fecha: '2026-04-01', montoReal: 3000 }, // hace 22 días
      { fecha: '2026-04-15', montoReal: 6000 }, // hace 8 días
    ];
    // ventana 30 días: (3000+6000)/30 = 300
    expect(ingresoDiarioPromedio(ventasRows, 30, '2026-04-23')).toBe(300);
  });

  it('excluye facturas fuera de la ventana', () => {
    const ventasRows = [
      { fecha: '2026-01-01', montoReal: 100000 },
      { fecha: '2026-04-15', montoReal: 3000 },
    ];
    // ventana 30: solo la del 15/04 → 3000/30 = 100
    expect(ingresoDiarioPromedio(ventasRows, 30, '2026-04-23')).toBe(100);
  });
});

describe('expandirLeasing', () => {
  it('expande cuotas al día de vencimiento de cada mes en el rango', () => {
    const leasingDetalle = [
      { diaVto: 5, cuotasPorPagar: 3, cuotaCLPcIVA: 1000000 },
    ];
    const fechas = [];
    for (let i = 0; i < 93; i++) {
      const d = new Date(2026, 3, 23);
      d.setDate(d.getDate() + i);
      fechas.push(d.toISOString().slice(0, 10));
    }
    const egresos = expandirLeasing(leasingDetalle, fechas);
    // Abril-2026 día 5 ya pasó (hoy=23), no está en el rango
    // Mayo-2026-05, Junio-2026-05, Julio-2026-05 sí están
    expect(egresos['2026-05-05']).toBe(1000000);
    expect(egresos['2026-06-05']).toBe(1000000);
  });

  it('no agrega cuotas si el contrato ya no tiene cuotas por pagar', () => {
    const leasingDetalle = [{ diaVto: 5, cuotasPorPagar: 0, cuotaCLPcIVA: 1000000 }];
    const fechas = ['2026-05-05', '2026-06-05'];
    expect(expandirLeasing(leasingDetalle, fechas)).toEqual({});
  });
});

describe('proyectar', () => {
  it('suma saldo inicial + netos día a día', () => {
    const r = proyectar({
      saldoInicial: 1000000,
      ingresoDiario: 10000,
      calendario: [],
      leasingDetalle: [],
      creditoPendiente: [],
      hoy: '2026-04-23',
      dias: 3,
    });
    // día 0: saldo = 1000000 + 10000 = 1010000
    // día 1: 1020000; día 2: 1030000
    expect(r.serie[0].saldo).toBe(1010000);
    expect(r.serie[2].saldo).toBe(1030000);
    expect(r.saldoFinal).toBe(1030000);
  });

  it('marca saldo mínimo y primer cruce negativo', () => {
    const r = proyectar({
      saldoInicial: 50000,
      ingresoDiario: 1000,
      calendario: [{ fecha: '2026-04-25', monto: 500000 }],
      leasingDetalle: [],
      creditoPendiente: [],
      hoy: '2026-04-23',
      dias: 5,
    });
    expect(r.primerCruceNegativo).not.toBeNull();
    expect(r.primerCruceNegativo.fecha).toBe('2026-04-25');
    expect(r.saldoMin.saldo).toBeLessThan(0);
  });

  it('usa ingreso conocido cuando existe, y proyectado en otro caso', () => {
    const r = proyectar({
      saldoInicial: 0,
      ingresoDiario: 1000,
      ventasRowsFuturas: [{ fecha: '2026-04-24', montoReal: 999999 }],
      hoy: '2026-04-23',
      dias: 3,
    });
    // Día 0 (23): sin ingreso conocido → 1000
    // Día 1 (24): con ingreso conocido → 999999 (no se suma el 1000 encima)
    // Día 2 (25): sin ingreso conocido → 1000
    expect(r.serie[0].ingreso).toBe(1000);
    expect(r.serie[1].ingreso).toBe(999999);
    expect(r.serie[2].ingreso).toBe(1000);
  });
});
