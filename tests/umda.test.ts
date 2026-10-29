import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../src/generador/azar';
import { densidad, dificultad, esJugable } from '../src/generador/oleada';
import { aptitud, estimarModelo, generarOleada, K, muestrear, UMDA } from '../src/generador/umda';

describe('modelo (Tabla 4.1)', () => {
  it('aplica el suavizado de Laplace: (c + 1) / (40 + K)', () => {
    const sel = Array.from({ length: 40 }, () => [2, ...Array(19).fill(0), 0, 0, 0, 0]);
    const m = estimarModelo(sel);
    expect(m[0][2]).toBeCloseTo(41 / 44);
    expect(m[0][0]).toBeCloseTo(1 / 44);
    expect(m[20]).toHaveLength(3);
    expect(m[20][0]).toBeCloseTo(41 / 43);
    for (const p of m) expect(p.reduce((s, x) => s + x, 0)).toBeCloseTo(1);
  });
});

describe('muestreo', () => {
  it('reproduce las probabilidades del modelo (±0.02 con 10 000 muestras)', () => {
    const rnd = mulberry32(7);
    const modelo = K.map((k) => Array.from({ length: k }, (_, v) => (v + 1) / ((k * (k + 1)) / 2)));
    const n = 10000;
    const cuenta = K.map((k) => Array<number>(k).fill(0));
    for (let i = 0; i < n; i++) muestrear(modelo, rnd).forEach((v, pos) => cuenta[pos][v]++);
    cuenta.forEach((c, pos) => c.forEach((x, v) => expect(Math.abs(x / n - modelo[pos][v])).toBeLessThan(0.02)));
  });
});

describe('generarOleada', () => {
  it('la misma semilla reproduce la misma oleada; otra semilla da otra', () => {
    expect(generarOleada(0.5, 123).oleada).toEqual(generarOleada(0.5, 123).oleada);
    expect(generarOleada(0.5, 123).oleada).not.toEqual(generarOleada(0.5, 456).oleada);
  });

  it('la mejor aptitud nunca baja y respeta la terminación', () => {
    for (const s of [1, 2, 3, 4, 5]) {
      const r = generarOleada(0.6, s);
      r.historial.slice(1).forEach((f, i) => expect(f).toBeGreaterThanOrEqual(r.historial[i]));
      expect(r.generaciones).toBeLessThanOrEqual(UMDA.maxGeneraciones);
      if (r.generaciones < UMDA.maxGeneraciones) {
        const cola = r.historial.slice(-UMDA.sinMejora - 1);
        expect(new Set(cola).size).toBe(1);
      }
    }
  });

  it('exactitud, jugabilidad y tiempo para D* de 0.10 a 0.95', () => {
    const errores: number[] = [];
    for (let d = 0.1; d <= 0.951; d += 0.05) {
      for (let s = 1; s <= 5; s++) {
        const r = generarOleada(Math.round(d * 100) / 100, s * 1000 + Math.round(d * 100));
        expect(esJugable(r.oleada)).toBe(true);
        expect(r.ms).toBeLessThan(1000);
        errores.push(Math.abs(r.dificultad - d));
      }
    }
    const mae = errores.reduce((a, b) => a + b, 0) / errores.length;
    expect(mae).toBeLessThanOrEqual(0.02);
  });

  it('supera a la búsqueda al azar con el mismo número de evaluaciones', () => {
    let errUmda = 0;
    let errAzar = 0;
    for (const [i, d] of [0.2, 0.35, 0.5, 0.65, 0.8].entries()) {
      const r = generarOleada(d, 900 + i, 0.5);
      errUmda += Math.abs(r.dificultad - d);
      const rnd = mulberry32(900 + i);
      const evaluaciones = UMDA.poblacion + UMDA.nuevas * r.generaciones;
      let mejor = { o: [] as number[], f: -1 };
      for (let e = 0; e < evaluaciones; e++) {
        const o = K.map((k) => Math.floor(rnd() * k));
        const f = aptitud(o, d, 0.5);
        if (f > mejor.f) mejor = { o, f };
      }
      errAzar += Math.abs(dificultad(mejor.o) - d);
    }
    expect(errUmda).toBeLessThan(errAzar);
  });
});

describe('ecuación 2 con densidad objetivo (opción B)', () => {
  it('la densidad varía entre oleadas en lugar de quedar siempre en 1', () => {
    const dens = new Set<number>();
    for (let s = 1; s <= 60; s++) dens.add(Math.round(generarOleada(0.5, s).densidad * 6));
    expect(dens.size).toBeGreaterThanOrEqual(4);
  });
  it('se acerca a la densidad objetivo cuando se fija', () => {
    for (const k of [1, 2, 3, 4, 5, 6]) {
      const r = generarOleada(0.5, 40 + k, k / 6);
      expect(r.densidadObjetivo).toBeCloseTo(k / 6);
      expect(Math.abs(densidad(r.oleada) - k / 6)).toBeLessThanOrEqual(1 / 6 + 1e-9);
    }
  });
});
