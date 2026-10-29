const VOLUMEN = 0.25;
let ctx: AudioContext | null = null;
let maestro: GainNode | null = null;
let silenciado = false;

function audio(): AudioContext | null {
  try {
    if (!ctx) {
      ctx = new AudioContext();
      maestro = ctx.createGain();
      maestro.gain.value = silenciado ? 0 : VOLUMEN;
      maestro.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Un tono que barre de f0 a f1 Hz y se apaga en `dur` segundos. */
function tono(forma: OscillatorType, f0: number, f1: number, dur: number, vol = 1, retraso = 0) {
  const c = audio();
  if (!c || !maestro) return;
  const t = c.currentTime + retraso;
  const osc = c.createOscillator();
  const env = c.createGain();
  osc.type = forma;
  osc.frequency.setValueAtTime(f0, t);
  osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
  env.gain.setValueAtTime(vol, t);
  env.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(env).connect(maestro);
  osc.start(t);
  osc.stop(t + dur);
}

/** Ruido filtrado: la base de las explosiones. */
function ruido(dur: number, vol: number, corteHz: number) {
  const c = audio();
  if (!c || !maestro) return;
  const t = c.currentTime;
  const buffer = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
  const datos = buffer.getChannelData(0);
  for (let i = 0; i < datos.length; i++) datos[i] = Math.random() * 2 - 1;
  const fuente = c.createBufferSource();
  fuente.buffer = buffer;
  const filtro = c.createBiquadFilter();
  filtro.type = 'lowpass';
  filtro.frequency.setValueAtTime(corteHz, t);
  filtro.frequency.exponentialRampToValueAtTime(100, t + dur);
  const env = c.createGain();
  env.gain.setValueAtTime(vol, t);
  env.gain.exponentialRampToValueAtTime(0.001, t + dur);
  fuente.connect(filtro).connect(env).connect(maestro);
  fuente.start(t);
}

const arpegio = (notas: number[], paso: number, vol: number) =>
  notas.forEach((f, i) => tono('square', f, f, paso * 1.2, vol, i * paso));

export const sonido = {
  disparo: () => tono('square', 900, 250, 0.11, 0.35),
  disparoEnemigo: () => tono('triangle', 320, 110, 0.16, 0.25),
  golpeResistente: () => tono('square', 160, 120, 0.07, 0.4),
  explosionEnemigo: () => ruido(0.22, 0.7, 2500),
  naveDanada: () => {
    ruido(0.55, 1, 900);
    tono('sawtooth', 220, 40, 0.5, 0.35);
  },
  escudoAbsorbe: () => tono('sine', 1200, 500, 0.2, 0.5),
  objeto: () => arpegio([523, 659, 784, 1047], 0.06, 0.3),
  nivelSuperado: () => arpegio([392, 523, 659, 784, 1047], 0.1, 0.3),
  nivelPerdido: () => arpegio([392, 330, 262, 196], 0.14, 0.3),
};

/** Tecla M: silencia o reactiva todos los efectos. */
export function alternarSilencio(): boolean {
  silenciado = !silenciado;
  if (maestro) maestro.gain.value = silenciado ? 0 : VOLUMEN;
  return silenciado;
}

export const estaSilenciado = () => silenciado;
