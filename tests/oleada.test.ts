import { describe, expect, it } from 'vitest';
import { dificultad, esJugable, LONGITUD } from '../src/generador/oleada';
import { CURVA_BASE, OLEADAS_CONTROL } from '../src/generador/oleadasControl';

describe('ecuación 1', () => {
  it('vale 1 con 20 enemigos de peso 2 a velocidad rápida y sin objetos', () => {
    expect(dificultad([...Array(20).fill(3), 2, 0, 0, 0])).toBe(1);
  });
  it('resta la ayuda de los objetos y no baja de 0', () => {
    expect(dificultad([...Array(6).fill(1), ...Array(14).fill(0), 0, 0, 0, 0])).toBeCloseTo(6 / 60);
    expect(dificultad([1, ...Array(19).fill(0), 0, 1, 2, 1])).toBe(0);
  });
});

describe('oleada jugable', () => {
  it('exige entre 6 y 20 enemigos y 24 posiciones', () => {
    expect(esJugable([...Array(5).fill(1), ...Array(15).fill(0), 0, 0, 0, 0])).toBe(false);
    expect(esJugable([...Array(6).fill(1), ...Array(14).fill(0), 0, 0, 0, 0])).toBe(true);
    expect(esJugable([...Array(20).fill(1), 0, 0, 0])).toBe(false);
  });
});

describe('oleadas de control', () => {
  it('son 5, jugables y siguen la curva base con tolerancia de 0.02', () => {
    expect(OLEADAS_CONTROL).toHaveLength(5);
    OLEADAS_CONTROL.forEach((o, k) => {
      expect(o).toHaveLength(LONGITUD);
      expect(esJugable(o)).toBe(true);
      expect(Math.abs(dificultad(o) - CURVA_BASE[k])).toBeLessThanOrEqual(0.02);
    });
  });
});
