import { describe, expect, it } from 'vitest';
import { CONTROL, ITEMS_NIVEL, POSTEST_PXI, POSTEST_SUS } from '../src/encuestas/instrumentos';

describe('encuesta por nivel', () => {
  it('aplica 4 ítems del miniPXI (desafío, maestría e inmersión iguales a los del PXI) y la dificultad percibida', () => {
    expect(ITEMS_NIVEL.map((i) => i.id)).toEqual(['desafio', 'maestria', 'inmersion', 'disfrute', 'dificultad']);
    expect(ITEMS_NIVEL.map((i) => i.minipxi)).toEqual([true, true, true, true, false]);
    const pxi = Object.fromEntries(POSTEST_PXI.map((p) => [p.id, p.texto]));
    expect(ITEMS_NIVEL.slice(0, 3).map((i) => i.texto)).toEqual([pxi.pxi_desafio_1, pxi.pxi_maestria_1, pxi.pxi_inmersion_3]);
  });
});

describe('post test', () => {
  it('aplica 3 constructos del PXI con 3 ítems cada uno y la pregunta de control en el puesto 7', () => {
    expect(POSTEST_PXI).toHaveLength(10);
    expect(POSTEST_PXI[6]).toBe(CONTROL);
    const items = POSTEST_PXI.filter((p) => p !== CONTROL).map((p) => p.id);
    expect(items).toEqual(['desafio', 'maestria', 'inmersion'].flatMap((c) => [1, 2, 3].map((n) => `pxi_${c}_${n}`)));
  });

  it('no deja marcadores pendientes en el PXI, el SUS ni la encuesta por nivel', () => {
    const textos = [...POSTEST_PXI, ...POSTEST_SUS, ...ITEMS_NIVEL].map((p) => p.texto);
    expect(textos.filter((t) => /\[|pendiente/i.test(t))).toEqual([]);
    expect(POSTEST_SUS).toHaveLength(10);
  });
});
