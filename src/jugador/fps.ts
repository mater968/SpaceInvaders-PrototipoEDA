/** FPS medio y percentil 5 de un nivel, a partir de la duracion de cada fotograma en ms. */
export function estadisticasFps(deltas: number[]): { fpsMedio: number; fpsP5: number } {
  const validos = deltas.filter((d) => d > 0);
  if (validos.length === 0) return { fpsMedio: 0, fpsP5: 0 };
  const total = validos.reduce((s, d) => s + d, 0);
  // El percentil 5 de los FPS corresponde al percentil 95 de la duracion de los fotogramas.
  const ordenados = [...validos].sort((a, b) => a - b);
  const p95 = ordenados[Math.min(ordenados.length - 1, Math.ceil(0.95 * ordenados.length) - 1)];
  return { fpsMedio: round1((validos.length * 1000) / total), fpsP5: round1(1000 / p95) };
}

const round1 = (x: number) => Math.round(x * 10) / 10;
