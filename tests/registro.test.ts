import { describe, expect, it, vi } from 'vitest';
import { detectarEntorno, enviarFila, generarCodigo, type Fila } from '../src/registro/registro';

const fila: Fila = {
  ts: '2026-10-27T00:00:00.000Z', codigo: 'ABC234', evento: 'prueba',
  version: '0.1.0', navegador: 'Chrome', so: 'Windows', datos: {},
};
const respuesta = (ok: boolean) => ({ ok: true, json: async () => ({ ok }) }) as Response;

describe('generarCodigo', () => {
  it('da 6 caracteres sin caracteres ambiguos', () => {
    for (let i = 0; i < 200; i++) expect(generarCodigo()).toMatch(/^[A-HJKMNP-Z2-9]{6}$/);
  });
});

describe('detectarEntorno', () => {
  it('reconoce Edge en Windows, Firefox en Linux y Safari en macOS', () => {
    expect(detectarEntorno('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0 Safari/537.36 Edg/130.0'))
      .toEqual({ navegador: 'Edge', so: 'Windows' });
    expect(detectarEntorno('Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0'))
      .toEqual({ navegador: 'Firefox', so: 'Linux' });
    expect(detectarEntorno('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) Version/17.5 Safari/605.1.15'))
      .toEqual({ navegador: 'Safari', so: 'macOS' });
  });
});

describe('enviarFila', () => {
  it('envía en texto plano y devuelve true si Apps Script confirma', async () => {
    const f = vi.fn().mockResolvedValue(respuesta(true));
    expect(await enviarFila('u', fila, f, 3, 0)).toBe(true);
    expect(f).toHaveBeenCalledTimes(1);
    expect(f.mock.calls[0][1].headers['Content-Type']).toMatch(/^text\/plain/);
  });

  it('reintenta hasta 3 veces y devuelve false sin lanzar error', async () => {
    const f = vi.fn().mockRejectedValue(new Error('red'));
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await enviarFila('u', fila, f, 3, 0)).toBe(false);
    expect(f).toHaveBeenCalledTimes(3);
    expect(aviso).toHaveBeenCalled();
  });

  it('se recupera si falla el primer intento', async () => {
    const f = vi.fn().mockRejectedValueOnce(new Error('red')).mockResolvedValue(respuesta(true));
    expect(await enviarFila('u', fila, f, 3, 0)).toBe(true);
    expect(f).toHaveBeenCalledTimes(2);
  });
});
