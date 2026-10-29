export type Oleada = readonly number[];

export const VACIO = 0, BASICO = 1, RAPIDO = 2, RESISTENTE = 3;
export const LENTA = 0, MEDIA = 1, RAPIDA = 2;
export const NINGUNO = 0, VIDA = 1, ESCUDO = 2, DOBLE = 3;

export const FILAS = 4, COLUMNAS = 5, LONGITUD = 24;

/** eᵢ: basico 1, rapido 2, resistente 2. */
export const PESO_ENEMIGO = [0, 1, 2, 2];
/** v(x): lenta 1, media 1.25, rapida 1.5. */
export const FACTOR_VELOCIDAD = [1, 1.25, 1.5];
/** oⱼ: vida extra 2, escudo 2, disparo doble 1. */
export const AYUDA_OBJETO = [0, 2, 2, 1];
/** Carga maxima: 20 enemigos de peso 2 a velocidad rapida. */
export const CARGA_MAX = 60;

export const celdas = (o: Oleada) => o.slice(0, FILAS * COLUMNAS);
export const objetos = (o: Oleada) => o.slice(21, LONGITUD);
export const numEnemigos = (o: Oleada) => celdas(o).filter((c) => c !== VACIO).length;

/** Ecuacion 1: calcula la dificultad de la oleada, de 0 a 1. */
export function dificultad(o: Oleada): number {
  const enemigos = celdas(o).reduce((s, c) => s + PESO_ENEMIGO[c], 0);
  const ayuda = objetos(o).reduce((s, j) => s + AYUDA_OBJETO[j], 0);
  return Math.min(1, Math.max(0, (FACTOR_VELOCIDAD[o[20]] * enemigos - ayuda) / CARGA_MAX));
}

/** Den(x): tipos distintos de enemigo y de objeto presentes, entre 6. */
export function densidad(o: Oleada): number {
  const enemigos = new Set(celdas(o).filter((c) => c !== VACIO));
  const ayudas = new Set(objetos(o).filter((j) => j !== NINGUNO));
  return (enemigos.size + ayudas.size) / 6;
}

/** Una oleada es jugable si tiene entre 6 y 20 enemigos. */
export const esJugable = (o: Oleada) => o.length === LONGITUD && numEnemigos(o) >= 6 && numEnemigos(o) <= 20;
