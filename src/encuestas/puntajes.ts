/** SUS de 0 a 100: items impares aportan (r − 1), pares (5 − r); la suma se multiplica por 2.5. */
export function puntajeSus(respuestas: number[]): number {
  if (respuestas.length !== 10 || respuestas.some((r) => r < 1 || r > 5)) {
    throw new Error('El SUS necesita 10 respuestas entre 1 y 5');
  }
  const suma = respuestas.reduce((s, r, i) => s + (i % 2 === 0 ? r - 1 : 5 - r), 0);
  return suma * 2.5;
}

/** Promedio por constructo del PXI. Las claves de los items tienen la forma pxi_<constructo>_<n>. */
export function promediosPxi(respuestas: Record<string, number>): Record<string, number> {
  const grupos: Record<string, number[]> = {};
  for (const [clave, valor] of Object.entries(respuestas)) {
    const m = /^pxi_(.+)_\d+$/.exec(clave);
    if (m) (grupos[m[1]] ??= []).push(valor);
  }
  return Object.fromEntries(
    Object.entries(grupos).map(([c, v]) => [c, Math.round((v.reduce((s, x) => s + x, 0) / v.length) * 100) / 100]),
  );
}
