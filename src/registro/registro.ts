export interface Fila {
  ts: string;
  codigo: string;
  evento: string;
  version: string;
  navegador: string;
  so: string;
  datos: Record<string, unknown>;
}

const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generarCodigo(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join('');
}

export function detectarEntorno(ua: string): { navegador: string; so: string } {
  const navegador =
    /Edg\//.test(ua) ? 'Edge'
    : /OPR\//.test(ua) ? 'Opera'
    : /Firefox\//.test(ua) ? 'Firefox'
    : /Chrome\//.test(ua) ? 'Chrome'
    : /Safari\//.test(ua) ? 'Safari'
    : 'Otro';
  const so =
    /Windows/.test(ua) ? 'Windows'
    : /Android/.test(ua) ? 'Android'
    : /iPhone|iPad/.test(ua) ? 'iOS'
    : /Mac OS X/.test(ua) ? 'macOS'
    : /CrOS/.test(ua) ? 'ChromeOS'
    : /Linux/.test(ua) ? 'Linux'
    : 'Otro';
  return { navegador, so };
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Envia una fila con hasta `intentos` reintentos. Nunca lanza error: devuelve si llego. */
export async function enviarFila(
  url: string,
  fila: Fila,
  fetchFn: typeof fetch = fetch,
  intentos = 3,
  esperaMs = 1000,
): Promise<boolean> {
  for (let i = 1; i <= intentos; i++) {
    try {
      const r = await fetchFn(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(fila),
      });
      if (r.ok && (await r.json()).ok) return true;
    } catch {
    }
    if (i < intentos) await esperar(esperaMs * i);
  }
  console.warn(`[registro] No se pudo enviar «${fila.evento}» tras ${intentos} intentos.`);
  return false;
}

export const CODIGO = generarCodigo();

const VERSION = import.meta.env.DEV ? `${__VERSION__}-dev` : __VERSION__;

const pendientes: Fila[] = [];

export async function registrar(evento: string, datos: Record<string, unknown> = {}): Promise<boolean> {
  const url = import.meta.env.VITE_URL_REGISTRO;
  if (!url) {
    console.warn('[registro] Falta VITE_URL_REGISTRO en .env.local; no se envía nada.');
    return false;
  }
  const fila: Fila = {
    ts: new Date().toISOString(),
    codigo: CODIGO,
    evento,
    version: VERSION,
    ...detectarEntorno(navigator.userAgent),
    datos,
  };
  const ok = await enviarFila(url, fila);
  if (!ok) pendientes.push(fila);
  return ok;
}

/** Reenvia las filas pendientes en orden. Devuelve true si ya no queda ninguna. */
export async function reenviarPendientes(): Promise<boolean> {
  const url = import.meta.env.VITE_URL_REGISTRO;
  if (!url) return true;
  while (pendientes.length) {
    if (!(await enviarFila(url, pendientes[0]))) return false;
    pendientes.shift();
  }
  return true;
}
