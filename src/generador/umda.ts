import { mulberry32, nuevaSemilla } from './azar';
import { formar, NOMBRES_PLANTILLA, type NombrePlantilla } from './formacion';
import { densidad, dificultad, esJugable, type Oleada } from './oleada';

/** K: valores posibles por posicion. Celdas 0-19: 4 · velocidad: 3 · objetos 21-23: 4. */
export const K = [...Array<number>(20).fill(4), 3, 4, 4, 4];

export const UMDA = { poblacion: 100, seleccionados: 40, nuevas: 60, maxGeneraciones: 100, sinMejora: 10 } as const;

/** Ecuacion 2: puntua que tan cerca esta la oleada de la dificultad y la densidad objetivo. */
export function aptitud(o: Oleada, dObjetivo: number, denObjetivo: number): number {
  if (!esJugable(o)) return 0;
  return 0.7 * (1 - Math.abs(dificultad(o) - dObjetivo)) + 0.3 * (1 - Math.abs(densidad(o) - denObjetivo));
}

/** Den* uniforme entre 1/6 y 6/6, los valores que puede tomar una oleada jugable. */
export const sortearDensidad = (rnd: () => number) => (1 + Math.floor(rnd() * 6)) / 6;

/** Modelo con suavizado de Laplace: p = (c + 1) / (n + K), con n = 40 seleccionadas. */
export function estimarModelo(seleccionadas: Oleada[]): number[][] {
  return K.map((k, pos) => {
    const c = Array<number>(k).fill(0);
    for (const o of seleccionadas) c[o[pos]]++;
    return c.map((x) => (x + 1) / (seleccionadas.length + k));
  });
}

/** Muestrea cada posicion de forma independiente segun su distribucion. */
export function muestrear(modelo: number[][], rnd: () => number): number[] {
  return modelo.map((p) => {
    let u = rnd();
    for (let v = 0; v < p.length; v++) {
      u -= p[v];
      if (u < 0) return v;
    }
    return p.length - 1;
  });
}

export interface ResultadoUmda {
  oleada: number[];
  aptitud: number;
  dificultad: number;
  densidad: number;
  densidadObjetivo: number;
  generaciones: number;
  ms: number;
  semilla: number;
  historial: number[];
  formacion: NombrePlantilla;
}

interface Individuo { o: number[]; f: number }

/** Genera una oleada cuya dificultad se acerque a dObjetivo. La semilla la hace reproducible. */
export function generarOleada(dObjetivo: number, semilla: number = nuevaSemilla(), denObjetivo?: number): ResultadoUmda {
  const t0 = performance.now();
  const rnd = mulberry32(semilla);
  const denObj = denObjetivo ?? sortearDensidad(rnd);
  const evaluar = (o: number[]): Individuo => ({ o, f: aptitud(o, dObjetivo, denObj) });
  const ordenar = (p: Individuo[]) => p.sort((a, b) => b.f - a.f);

  let poblacion: Individuo[] = [];
  while (poblacion.length < UMDA.poblacion) {
    const o = K.map((k) => Math.floor(rnd() * k));
    if (esJugable(o)) poblacion.push(evaluar(o));
  }
  ordenar(poblacion);

  let mejor = poblacion[0].f;
  let sinMejora = 0;
  let generaciones = 0;
  const historial = [mejor];
  while (generaciones < UMDA.maxGeneraciones && sinMejora < UMDA.sinMejora) {
    generaciones++;
    const seleccionadas = poblacion.slice(0, UMDA.seleccionados);
    const modelo = estimarModelo(seleccionadas.map((x) => x.o));
    const nuevas = Array.from({ length: UMDA.nuevas }, () => evaluar(muestrear(modelo, rnd)));
    poblacion = ordenar([...seleccionadas, ...nuevas]);
    if (poblacion[0].f > mejor + 1e-12) {
      mejor = poblacion[0].f;
      sinMejora = 0;
    } else {
      sinMejora++;
    }
    historial.push(poblacion[0].f);
  }

  const formacion = NOMBRES_PLANTILLA[Math.floor(rnd() * NOMBRES_PLANTILLA.length)];
  const o = formar(poblacion[0].o, formacion);
  return {
    oleada: o, aptitud: mejor, dificultad: dificultad(o), densidad: densidad(o), densidadObjetivo: denObj,
    generaciones, ms: performance.now() - t0, semilla, historial, formacion,
  };
}
