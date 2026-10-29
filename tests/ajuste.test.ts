import { describe, expect, it } from 'vitest';
import { D1, delta, indiceDesempeno, siguienteDificultad } from '../src/jugador/ajuste';
import { CURVA_BASE } from '../src/generador/oleadasControl';

const base = { aciertos: 8, disparos: 10, vidasInicio: 3, vidasFin: 3, tiempoMs: 50000, superado: true };

describe('ecuación 3', () => {
  it('combina precisión, vidas y rapidez con pesos 0.4, 0.4 y 0.2', () => {
    // A = 0.8, V = 1, T = min(1, 40/50) = 0.8 → R = 0.32 + 0.4 + 0.16 = 0.88
    expect(indiceDesempeno(base, 40000)).toEqual({ A: 0.8, V: 1, T: 0.8, R: 0.88 });
  });
  it('sin disparos A = 0; V se acota a 1 con vida extra; T = 1 si fue más rápido que t_ref', () => {
    expect(indiceDesempeno({ ...base, disparos: 0, aciertos: 0, vidasFin: 4, tiempoMs: 20000 }, 40000))
      .toEqual({ A: 0, V: 1, T: 1, R: 0.6 });
  });
  it('si pierde todas las vidas, V = 0 y T = 0 aunque haya perdido rápido', () => {
    expect(indiceDesempeno({ ...base, vidasFin: 0, tiempoMs: 5000, superado: false }, 40000))
      .toEqual({ A: 0.8, V: 0, T: 0, R: 0.32 });
  });
});

describe('ecuación 4', () => {
  it('Δ según el canal 0.45-0.75, con los límites incluidos en el canal', () => {
    expect(delta(0.76)).toBe(0.1);
    expect(delta(0.75)).toBe(0);
    expect(delta(0.45)).toBe(0);
    expect(delta(0.44)).toBe(-0.2);
  });
  it('sube, mantiene la curva o baja, dentro de 0.10 y 0.95', () => {
    expect(siguienteDificultad(0.3, 0.9, true)).toBe(0.5);
    expect(siguienteDificultad(0.3, 0.6, true)).toBe(0.4);
    expect(siguienteDificultad(0.3, 0.2, true)).toBe(0.2);
    expect(siguienteDificultad(0.1, 0.1, true)).toBe(0.1);
    expect(siguienteDificultad(0.9, 0.9, true)).toBe(0.95);
  });
  it('la versión de control (Δ = 0) reproduce la curva base 0.30 → 0.70', () => {
    const curva = [D1];
    for (let k = 1; k < 5; k++) curva.push(siguienteDificultad(curva[k - 1], 0.99, false));
    expect(curva).toEqual(CURVA_BASE);
  });
});
