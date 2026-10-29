import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../src/generador/azar';
import { formar, NOMBRES_PLANTILLA } from '../src/generador/formacion';
import { COLUMNAS, densidad, dificultad, esJugable, FILAS } from '../src/generador/oleada';
import { OLEADAS_CONTROL } from '../src/generador/oleadasControl';
import { generarOleada } from '../src/generador/umda';

const conteo = (o: readonly number[]) => [1, 2, 3].map((t) => o.slice(0, 20).filter((c) => c === t).length);
const esSimetrica = (o: readonly number[]) =>
  Array.from({ length: FILAS }, (_, f) => o.slice(f * COLUMNAS, (f + 1) * COLUMNAS))
    .every((fila) => fila.every((c, i) => c === fila[COLUMNAS - 1 - i]));

describe('formaciones', () => {
  const casos: number[][] = [];
  for (let b = 0; b <= 20; b++) for (let r = 0; r <= 20 - b; r++) for (let s = 0; s <= 20 - b - r; s++) {
    if (b + r + s < 6) continue;
    const cel = [...Array(b).fill(1), ...Array(r).fill(2), ...Array(s).fill(3)];
    casos.push([...cel, ...Array(20 - cel.length).fill(0), 1, 2, 3, 0]);
  }

  it('conservan la cantidad de cada tipo, la velocidad, los objetos, d(x) y Den(x)', () => {
    for (const o of casos) for (const nombre of NOMBRES_PLANTILLA) {
      const f = formar(o, nombre);
      expect(conteo(f)).toEqual(conteo(o));
      expect(f.slice(20)).toEqual(o.slice(20));
      expect(dificultad(f)).toBe(dificultad(o));
      expect(densidad(f)).toBe(densidad(o));
      expect(esJugable(f)).toBe(true);
    }
  });

  it('son simétricas de izquierda a derecha', () => {
    for (const o of casos) for (const nombre of NOMBRES_PLANTILLA) expect(esSimetrica(formar(o, nombre))).toBe(true);
  });

  it('dan el mismo resultado sin importar el orden de entrada', () => {
    const rnd = mulberry32(7);
    const o = casos[123];
    const mezclada = [...o.slice(0, 20)].sort(() => rnd() - 0.5).concat(o.slice(20));
    for (const nombre of NOMBRES_PLANTILLA) expect(formar(mezclada, nombre)).toEqual(formar(o, nombre));
  });

  it('se aplican a las oleadas del UMDA y a las de control', () => {
    const r = generarOleada(0.5, 42);
    expect(NOMBRES_PLANTILLA).toContain(r.formacion);
    expect(esSimetrica(r.oleada)).toBe(true);
    expect(generarOleada(0.5, 42).oleada).toEqual(r.oleada);
    OLEADAS_CONTROL.forEach((o) => expect(esSimetrica(o)).toBe(true));
  });
});
