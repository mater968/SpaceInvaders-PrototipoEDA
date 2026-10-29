import { describe, expect, it } from 'vitest';
import { POSTEST_SUS } from '../src/encuestas/instrumentos';
import { promediosPxi, puntajeSus } from '../src/encuestas/puntajes';
import { densidad } from '../src/generador/oleada';
import { OLEADAS_CONTROL } from '../src/generador/oleadasControl';
import { estadisticasFps } from '../src/jugador/fps';

describe('densidad', () => {
  it('cuenta tipos distintos de enemigos y objetos entre 6', () => {
    expect(densidad([1, 1, 1, 1, 1, 1, ...Array(14).fill(0), 0, 0, 0, 0])).toBeCloseTo(1 / 6);
    expect(densidad([1, 2, 3, ...Array(17).fill(0), 0, 1, 2, 3])).toBe(1);
    expect(densidad([1, 2, 3, ...Array(17).fill(0), 0, 2, 2, 0])).toBeCloseTo(4 / 6);
  });
  it('da valores entre 0 y 1 en las oleadas de control', () => {
    for (const o of OLEADAS_CONTROL) expect(densidad(o)).toBeGreaterThan(0);
  });
});

describe('estadisticasFps', () => {
  it('60 FPS estables dan media y p5 de 60', () => {
    expect(estadisticasFps(Array(100).fill(1000 / 60))).toEqual({ fpsMedio: 60, fpsP5: 60 });
  });
  it('el p5 recoge los tirones', () => {
    const deltas = [...Array(90).fill(1000 / 60), ...Array(10).fill(100)];
    const r = estadisticasFps(deltas);
    expect(r.fpsP5).toBe(10);
    expect(r.fpsMedio).toBeLessThan(60);
  });
  it('sin fotogramas devuelve 0', () => {
    expect(estadisticasFps([])).toEqual({ fpsMedio: 0, fpsP5: 0 });
  });
});

describe('puntajeSus', () => {
  it('casos conocidos: todo neutro = 50, el mejor = 100, el peor = 0', () => {
    expect(puntajeSus(Array(10).fill(3))).toBe(50);
    expect(puntajeSus([5, 1, 5, 1, 5, 1, 5, 1, 5, 1])).toBe(100);
    expect(puntajeSus([1, 5, 1, 5, 1, 5, 1, 5, 1, 5])).toBe(0);
  });
  it('rechaza respuestas incompletas o fuera de escala', () => {
    expect(() => puntajeSus([3, 3])).toThrow();
    expect(() => puntajeSus(Array(10).fill(6))).toThrow();
  });
});

describe('promediosPxi', () => {
  it('promedia por constructo e ignora otras claves', () => {
    expect(promediosPxi({ pxi_desafio_1: 3, pxi_desafio_2: 1, pxi_desafio_3: 2, pxi_inmersion_1: -3, control: 2 }))
      .toEqual({ desafio: 2, inmersion: -3 });
  });
});

describe('SUS en español', () => {
  it('tiene 10 ítems con texto definitivo, escala de 1 a 5 y adaptado a «juego»', () => {
    expect(POSTEST_SUS).toHaveLength(10);
    for (const p of POSTEST_SUS) {
      expect(p.texto).not.toMatch(/pendiente|herramienta/i);
      expect(p.texto).toMatch(/juego/);
      expect(p).toMatchObject({ tipo: 'escala', min: 1, max: 5 });
    }
  });
});
