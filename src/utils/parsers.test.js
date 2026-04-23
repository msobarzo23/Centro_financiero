import { describe, it, expect } from 'vitest';
import { parseCLP, parseUF, parsePct, parseDate, parseNum } from './parsers.js';

describe('parseCLP', () => {
  it('parsea formato chileno con puntos de miles', () => {
    expect(parseCLP('1.234.567')).toBe(1234567);
    expect(parseCLP('$ 1.500.000')).toBe(1500000);
    expect(parseCLP('500')).toBe(500);
  });

  it('ignora decimales (CLP es entero)', () => {
    expect(parseCLP('1.234,56')).toBe(1234);
    expect(parseCLP('1000,50')).toBe(1000);
  });

  it('maneja negativos con parentesis y signo', () => {
    expect(parseCLP('(1.000)')).toBe(-1000);
    expect(parseCLP('-500')).toBe(-500);
  });

  it('retorna 0 para valores vacios', () => {
    expect(parseCLP('')).toBe(0);
    expect(parseCLP('-')).toBe(0);
    expect(parseCLP(null)).toBe(0);
    expect(parseCLP(undefined)).toBe(0);
  });
});

describe('parseUF', () => {
  it('parsea UF con coma decimal', () => {
    expect(parseUF('123,45')).toBe(123.45);
    expect(parseUF('1.234,56')).toBeCloseTo(1234.56, 2);
  });

  it('1.500 con separador de miles se lee como 1500 UF', () => {
    expect(parseUF('1.500')).toBe(1500);
  });

  it('3.5 sin separador de miles se lee como decimal', () => {
    expect(parseUF('3.5')).toBe(3.5);
  });

  it('maneja vacios como 0', () => {
    expect(parseUF('')).toBe(0);
    expect(parseUF('—')).toBe(0);
  });
});

describe('parsePct', () => {
  it('convierte porcentaje textual a fraccion', () => {
    expect(parsePct('5,5%')).toBeCloseTo(0.055, 5);
    expect(parsePct('12%')).toBe(0.12);
  });

  it('deja fraccion si ya esta normalizada', () => {
    expect(parsePct('0.05')).toBe(0.05);
    expect(parsePct('0,08')).toBe(0.08);
  });

  it('retorna null para vacios', () => {
    expect(parsePct('')).toBeNull();
    expect(parsePct('-')).toBeNull();
  });
});

describe('parseDate', () => {
  it('convierte dd/mm/yyyy a ISO', () => {
    expect(parseDate('27/01/2026')).toBe('2026-01-27');
    expect(parseDate('1/1/2026')).toBe('2026-01-01');
  });

  it('mantiene ISO como esta', () => {
    expect(parseDate('2026-01-27')).toBe('2026-01-27');
    expect(parseDate('2026-01-27T12:00:00Z')).toBe('2026-01-27');
  });

  it('retorna null para formatos no reconocidos', () => {
    expect(parseDate('')).toBeNull();
    expect(parseDate('Total')).toBeNull();
    expect(parseDate(null)).toBeNull();
  });
});

describe('parseNum', () => {
  it('distingue miles vs decimales por longitud', () => {
    expect(parseNum('1.234.567')).toBe(1234567);
    expect(parseNum('1.500')).toBe(1500);
    expect(parseNum('3.5')).toBe(3.5);
    expect(parseNum('1.234,56')).toBeCloseTo(1234.56, 2);
  });
});
