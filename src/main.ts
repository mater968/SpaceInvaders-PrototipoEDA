import Phaser from 'phaser';
import * as C from './config';
import {
  consentimiento, encuestaNivel, formulario, pantallaFinal, type Respuestas,
} from './encuestas/formulario';
import {
  CONSENTIMIENTO, INSTRUCCION_SUS, ITEMS_NIVEL, POSTEST_ABIERTA, POSTEST_PXI, POSTEST_SUS, PRETEST, RESPUESTA_CONTROL,
} from './encuestas/instrumentos';
import { promediosPxi, puntajeSus } from './encuestas/puntajes';
import { densidad, dificultad, type Oleada } from './generador/oleada';
import { CURVA_BASE, OLEADAS_CONTROL, PLANTILLAS_CONTROL } from './generador/oleadasControl';
import { generarOleada } from './generador/umda';
import { EscenaMensaje, type DatosMensaje } from './juego/EscenaMensaje';
import { EscenaNivel, type DatosNivel, type Desempeno } from './juego/EscenaNivel';
import { alternarSilencio } from './juego/sonido';
import { D1, indiceDesempeno, siguienteDificultad, T_REF_MS } from './jugador/ajuste';
import { CODIGO, reenviarPendientes, registrar } from './registro/registro';

const juego = new Phaser.Game({
  type: Phaser.AUTO,
  width: C.ANCHO,
  height: C.ALTO,
  parent: 'juego',
  backgroundColor: '#000000',
  audio: { noAudio: true },
});
juego.scene.add('mensaje', EscenaMensaje);
juego.scene.add('nivel', EscenaNivel);

type Grupo = 'experimental' | 'control';

/** Asignacion al azar 50/50. En desarrollo se puede forzar con ?grupo=experimental o ?grupo=control. */
function asignarGrupo(): Grupo {
  if (import.meta.env.DEV) {
    const g = new URLSearchParams(location.search).get('grupo');
    if (g === 'experimental' || g === 'control') return g;
  }
  return crypto.getRandomValues(new Uint8Array(1))[0] < 128 ? 'experimental' : 'control';
}

interface OleadaPreparada {
  oleada: Oleada;
  dObjetivo: number;
  formacion: string;
  generacion: { ms_generacion: number; semilla: number; generaciones: number; aptitud: number; den_objetivo: number } | null;
}

/**
 * Solo aqui se usa el grupo: el juego recibe la oleada sin saber de donde viene.
 * La generacion se difiere un instante para que la encuesta o la pantalla en curso se dibuje primero.
 */
function prepararOleada(grupo: Grupo, nivel: number, dObjetivo: number): Promise<OleadaPreparada> {
  if (grupo === 'control') {
    return Promise.resolve({
      oleada: OLEADAS_CONTROL[nivel - 1], dObjetivo: CURVA_BASE[nivel - 1], formacion: PLANTILLAS_CONTROL[nivel - 1], generacion: null,
    });
  }
  return new Promise((resolver) => setTimeout(() => {
    const r = generarOleada(dObjetivo);
    if (import.meta.env.DEV) {
      console.info(`[umda] nivel ${nivel} · D* ${dObjetivo} · d ${r.dificultad.toFixed(3)} · Den* ${r.densidadObjetivo.toFixed(2)} · Den ${r.densidad.toFixed(2)} · ${r.formacion} · ${r.generaciones} gen · ${r.ms.toFixed(1)} ms`);
    }
    resolver({
      oleada: r.oleada,
      dObjetivo,
      formacion: r.formacion,
      generacion: { ms_generacion: Math.round(r.ms * 10) / 10, semilla: r.semilla, generaciones: r.generaciones, aptitud: Math.round(r.aptitud * 1000) / 1000, den_objetivo: Math.round(r.densidadObjetivo * 1000) / 1000 },
    });
  }, 50));
}

const mensaje = (titulo: string, lineas: string[]) =>
  new Promise<void>((alContinuar) => juego.scene.start('mensaje', { titulo, lineas, alContinuar } satisfies DatosMensaje));

const mensajeFinal = (lineas: string[]) =>
  juego.scene.start('mensaje', { titulo: 'GRACIAS', lineas } satisfies DatosMensaje);

const jugarNivel = (oleada: Oleada, nivel: number, vidas: number) =>
  new Promise<Desempeno>((alTerminar) =>
    juego.scene.start('nivel', { oleada, nivel, vidas, alTerminar } satisfies DatosNivel));

/** Mientras hay un formulario HTML, Phaser no debe capturar teclas (ESPACIO, A, D, flechas) ni mostrar escenas. */
async function enFormulario<T>(f: () => Promise<T>): Promise<T> {
  juego.scene.getScenes(true).forEach((s) => s.scene.stop());
  juego.input.keyboard!.enabled = false;
  try {
    return await f();
  } finally {
    juego.input.keyboard!.enabled = true;
  }
}

async function estudio(cargaMs: number) {
  const acepta = await enFormulario(() => consentimiento(CONSENTIMIENTO.titulo, CONSENTIMIENTO.parrafos));
  if (!acepta) {
    mensajeFinal(['No se registró ningún dato.', 'Ya puedes cerrar esta página.']);
    return;
  }
  const grupo = asignarGrupo();

  const pre = await enFormulario(() => formulario('Antes de empezar', 'Cuéntanos un poco sobre ti y tus hábitos de juego.', PRETEST));
  if (Number(pre.edad) < 18 || pre.universitario !== 'si') {
    void registrar('excluido', { motivo: Number(pre.edad) < 18 ? 'menor_de_edad' : 'no_universitario' });
    mensajeFinal(['Este estudio es solo para estudiantes', 'universitarios mayores de 18 años.', '', 'Ya puedes cerrar esta página.']);
    return;
  }
  void registrar('sesion', { grupo, carga_ms: cargaMs, pantalla: `${screen.width}x${screen.height}` });
  void registrar('pretest', pre);

  let siguiente = prepararOleada(grupo, 1, D1);
  await mensaje('SPACE INVADERS EDA', [
    '← →  o  A D   mover',
    'ESPACIO       disparar',
    'M             silenciar',
    '',
    'Recoge los objetos que caen:',
    '+VIDA   ESCUDO   x2 (disparo doble)',
    '',
    'Presiona ESPACIO para comenzar',
  ]);

  let vidas = C.VIDAS_INICIALES;
  for (let nivel = 1; nivel <= C.NIVELES; nivel++) {
    const { oleada, dObjetivo, formacion, generacion } = await siguiente;
    const d = await jugarNivel(oleada, nivel, vidas);
    const ind = indiceDesempeno(d, T_REF_MS[nivel - 1]);
    const dSiguiente = siguienteDificultad(dObjetivo, ind.R, grupo === 'experimental');
    void registrar('nivel', {
      ...d,
      grupo,
      oleada: oleada.join(''),
      formacion,
      d_objetivo: dObjetivo,
      d_oleada: Math.round(dificultad(oleada) * 1000) / 1000,
      densidad: Math.round(densidad(oleada) * 1000) / 1000,
      ms_generacion: generacion?.ms_generacion ?? null,
      semilla: generacion?.semilla ?? null,
      generaciones: generacion?.generaciones ?? null,
      aptitud: generacion?.aptitud ?? null,
      den_objetivo: generacion?.den_objetivo ?? null,
      ...ind,
      d_siguiente: nivel < C.NIVELES ? dSiguiente : null,
    });
    vidas = d.vidasFin > 0 ? d.vidasFin : C.VIDAS_INICIALES;

    if (nivel < C.NIVELES) siguiente = prepararOleada(grupo, nivel + 1, dSiguiente);
    const r = await enFormulario(() => encuestaNivel(nivel, ITEMS_NIVEL));
    void registrar('encuesta_nivel', { nivel, ...r });

    if (nivel < C.NIVELES) await mensaje(`NIVEL ${nivel + 1}`, ['Presiona ESPACIO cuando estés listo']);
  }

  const pxi = await enFormulario(() => formulario(
    'Tu experiencia con el juego (1 de 3)',
    'Indica qué tan de acuerdo estás con cada afirmación, de −3 (totalmente en desacuerdo) a +3 (totalmente de acuerdo).',
    POSTEST_PXI,
  ));
  const sus = await enFormulario(() => formulario(
    'Facilidad de uso (2 de 3)',
    INSTRUCCION_SUS,
    POSTEST_SUS,
  ));
  const abierta = await enFormulario(() => formulario('Para terminar (3 de 3)', '', POSTEST_ABIERTA, 'Enviar respuestas'));

  const pxiItems = Object.fromEntries(Object.entries(pxi).filter(([k]) => k.startsWith('pxi_'))) as Record<string, number>;
  const post: Respuestas | Record<string, unknown> = {
    ...pxi,
    ...sus,
    ...abierta,
    control_ok: pxi.control === RESPUESTA_CONTROL,
    sus_puntaje: puntajeSus(POSTEST_SUS.map((p) => Number(sus[p.id]))),
    pxi_promedios: promediosPxi(pxiItems),
  };

  let postEnviado = false;
  await enFormulario(() => pantallaFinal(CODIGO, async () => {
    postEnviado ||= await registrar('postest', post);
    return postEnviado && (await reenviarPendientes());
  }));
}

console.info(`[registro] Código anónimo de esta sesión: ${CODIGO}`);
window.addEventListener('keydown', (e) => {
  const escribiendo = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
  if (e.code === 'KeyM' && !e.repeat && !escribiendo) alternarSilencio();
});
if (import.meta.env.DEV) Object.assign(window, { juego });

juego.events.once(Phaser.Core.Events.READY, () => {
  void estudio(Math.round(performance.now()));
});
