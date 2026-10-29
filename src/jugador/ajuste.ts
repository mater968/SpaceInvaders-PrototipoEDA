export const D1 = 0.3;
const PASO = 0.1;
const D_MIN = 0.1;
const D_MAX = 0.95;

export const T_REF_MS = [40000, 45000, 50000, 55000, 60000];

export interface DatosDesempeno {
  aciertos: number;
  disparos: number;
  vidasInicio: number;
  vidasFin: number;
  tiempoMs: number;
  superado: boolean;
}

/** Ecuacion 3: calcula el indice de desempeño del nivel. */
export function indiceDesempeno(d: DatosDesempeno, tRefMs: number) {
  const A = d.disparos > 0 ? Math.min(1, d.aciertos / d.disparos) : 0;
  // Con una vida extra se pueden terminar con mas vidas que al inicio; Vₖ es una proporcion y se acota a 1.
  const V = d.vidasInicio > 0 ? Math.min(1, d.vidasFin / d.vidasInicio) : 0;
  const T = d.superado ? Math.min(1, tRefMs / Math.max(1, d.tiempoMs)) : 0;
  const R = 0.4 * A + 0.4 * V + 0.2 * T;
  return { A: r3(A), V: r3(V), T: r3(T), R: r3(R) };
}

/** Ecuacion 4: corrige la dificultad segun el desempeño. */
export const delta = (R: number) => (R > 0.75 ? 0.1 : R >= 0.45 ? 0 : -0.2);

/** Ecuacion 4: calcula la dificultad objetivo del nivel siguiente. */
export function siguienteDificultad(Dk: number, R: number, ajustar: boolean): number {
  const d = ajustar ? delta(R) : 0;
  return Math.round(Math.min(D_MAX, Math.max(D_MIN, Dk + PASO + d)) * 100) / 100;
}

const r3 = (x: number) => Math.round(x * 1000) / 1000;
