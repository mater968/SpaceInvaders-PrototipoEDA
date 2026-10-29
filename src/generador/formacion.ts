import { BASICO, COLUMNAS, FILAS, RAPIDO, RESISTENTE, VACIO, type Oleada } from './oleada';

const CENTRO = (COLUMNAS - 1) / 2;

interface Plantilla { prioridad: (f: number, a: number) => number; banda: (f: number, a: number) => number }

export const PLANTILLAS = {
  bloque: { prioridad: (f, a) => f * 10 + a, banda: (f) => f },
  flecha: { prioridad: (f, a) => Math.abs(f + a - 3) * 10 + (f + a > 3 ? 5 : 0) + a, banda: (f) => f },
  rombo: { prioridad: (f, a) => (Math.abs(f - 1.5) + a) * 10 + f / 10, banda: (f, a) => Math.abs(f - 1.5) + a },
  pinzas: { prioridad: (f, a) => (2 - a) * 10 + (3 - f), banda: (_f, a) => 2 - a },
  tablero: { prioridad: (f, a) => ((f + a) % 2) * 100 + f * 10 + a, banda: (f) => f },
  columnas: { prioridad: (f, a) => (a % 2) * 100 + f * 10 + a, banda: (_f, a) => a },
} satisfies Record<string, Plantilla>;

export type NombrePlantilla = keyof typeof PLANTILLAS;
export const NOMBRES_PLANTILLA = Object.keys(PLANTILLAS) as NombrePlantilla[];

const ORDEN_TIPOS = [RESISTENTE, BASICO, RAPIDO];

interface Grupo { celdas: number[]; prioridad: number; banda: number }

const GRUPOS: number[][] = Array.from({ length: FILAS }, (_, f) =>
  Array.from({ length: CENTRO + 1 }, (_, a) =>
    (a === 0 ? [f * COLUMNAS + CENTRO] : [f * COLUMNAS + CENTRO - a, f * COLUMNAS + CENTRO + a]))).flat();

/** Devuelve la oleada con sus enemigos ordenados segun la plantilla; velocidad y objetos no cambian. */
export function formar(o: Oleada, nombre: NombrePlantilla): number[] {
  const p: Plantilla = PLANTILLAS[nombre];
  const fa = (celda: number) => [Math.floor(celda / COLUMNAS), Math.abs((celda % COLUMNAS) - CENTRO)] as const;
  const conClave = (celdas: number[]): Grupo => {
    const [f, a] = fa(celdas[0]);
    return { celdas, prioridad: p.prioridad(f, a) + f / 1000, banda: p.banda(f, a) };
  };
  const porPrioridad = (x: Grupo, y: Grupo) => x.prioridad - y.prioridad;
  const centros = GRUPOS.filter((g) => g.length === 1).map(conClave).sort(porPrioridad);
  const pares = GRUPOS.filter((g) => g.length === 2).map(conClave).sort(porPrioridad);

  const restantes = new Map(ORDEN_TIPOS.map((t) => [t, o.slice(0, FILAS * COLUMNAS).filter((c) => c === t).length]));
  const n = [...restantes.values()].reduce((s, x) => s + x, 0);
  const impares = [...restantes.values()].filter((x) => x % 2 === 1).length;

  const natural = [...centros, ...pares].sort(porPrioridad)
    .reduce((acc, g) => (acc.libres >= g.celdas.length ? { libres: acc.libres - g.celdas.length, c: acc.c + (g.celdas.length === 1 ? 1 : 0) } : acc), { libres: n, c: 0 }).c;
  const posibles = [0, 1, 2, 3, 4].filter((c) => (n - c) % 2 === 0 && c >= impares && (n - c) / 2 <= pares.length);
  const c = posibles.reduce((m, x) => (Math.abs(x - natural) < Math.abs(m - natural) ? x : m));

  const elegidos = [...centros.slice(0, c), ...pares.slice(0, (n - c) / 2)]
    .sort((x, y) => x.banda - y.banda || x.prioridad - y.prioridad);

  const tipos: number[] = [];
  const asignar = (i: number, centrosLibres: number): boolean => {
    if (i === elegidos.length) return true;
    const tam = elegidos[i].celdas.length;
    const libresDespues = centrosLibres - (tam === 1 ? 1 : 0);
    const actual = ORDEN_TIPOS.find((t) => restantes.get(t)! > 0);
    for (const t of [actual!, ...ORDEN_TIPOS.filter((x) => x !== actual)]) {
      if (restantes.get(t)! < tam) continue;
      restantes.set(t, restantes.get(t)! - tam);
      const imp = [...restantes.values()].filter((x) => x % 2 === 1).length;
      if (libresDespues >= imp && (libresDespues - imp) % 2 === 0) {
        tipos[i] = t;
        if (asignar(i + 1, libresDespues)) return true;
      }
      restantes.set(t, restantes.get(t)! + tam);
    }
    return false;
  };
  if (!asignar(0, c)) throw new Error('formar: no se pudo repartir los tipos');

  const salida = [...o];
  for (let i = 0; i < FILAS * COLUMNAS; i++) salida[i] = VACIO;
  elegidos.forEach((g, i) => g.celdas.forEach((celda) => (salida[celda] = tipos[i])));
  return salida;
}
