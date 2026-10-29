import type { Pregunta } from './formulario';

export const CONSENTIMIENTO = {
  titulo: 'Consentimiento informado',
  parrafos: [
    'Te invitamos a participar en el estudio «Generación procedural de oleadas con EDA: experiencia y usabilidad en jugadores universitarios», del curso Seminario de Investigación I de la Universidad de Lima, a cargo de César Alexander Porras Peña.',
    'Si aceptas, responderás un breve formulario de perfil, jugarás cinco niveles de un videojuego de disparos y, al terminar cada nivel, contestarás cinco preguntas rápidas. Al final responderás dos cuestionarios sobre tu experiencia. La sesión dura aproximadamente [DURACIÓN: completar tras la prueba piloto].',
    'Tu participación es voluntaria y puedes abandonar en cualquier momento cerrando la página. No se registran tu nombre, tu correo ni otros datos que te identifiquen: el juego genera un código anónimo que acompaña tus respuestas y tu desempeño. Los datos se usarán solo con fines académicos.',
    'Para consultas, escribe a [CORREO DE CONTACTO].',
  ],
};

const SINO: [string, string][] = [['si', 'Sí'], ['no', 'No']];

export const PRETEST: Pregunta[] = [
  { id: 'edad', tipo: 'numero', texto: '¿Cuántos años tienes?', min: 10, max: 99 },
  { id: 'universitario', tipo: 'unica', texto: '¿Eres estudiante universitario actualmente?', opciones: SINO },
  {
    id: 'frecuencia', tipo: 'unica', texto: '¿Con qué frecuencia juegas videojuegos?',
    opciones: [
      ['nunca', 'Nunca o casi nunca'], ['mensual', 'Algunas veces al mes'], ['semanal', 'Algunas veces por semana'],
      ['diaria', 'Todos o casi todos los días'],
    ],
  },
  {
    id: 'generos', tipo: 'multiple', texto: '¿Qué géneros juegas habitualmente? Puedes marcar varios.',
    opciones: [
      ['accion', 'Acción o disparos'], ['aventura', 'Aventura'], ['estrategia', 'Estrategia'], ['deportes', 'Deportes o carreras'],
      ['rol', 'Rol (RPG)'], ['puzles', 'Puzles'], ['otro', 'Otro'], ['ninguno', 'Ninguno'],
    ],
  },
  {
    id: 'familiaridad', tipo: 'escala', texto: '¿Qué tanto conoces los juegos de disparos por oleadas, como Space Invaders o Galaga?',
    min: 1, max: 5, anclas: ['Nada', 'Mucho'],
  },
];

export const ITEMS_NIVEL = [
  { id: 'desafio', texto: 'El juego no fue ni demasiado fácil ni demasiado difícil de jugar.', anclas: ['Totalmente en desacuerdo', 'Totalmente de acuerdo'], minipxi: true },
  { id: 'maestria', texto: 'Sentí que jugaba bien este juego.', anclas: ['Totalmente en desacuerdo', 'Totalmente de acuerdo'], minipxi: true },
  { id: 'inmersion', texto: 'Mi atención estuvo totalmente centrada en el juego.', anclas: ['Totalmente en desacuerdo', 'Totalmente de acuerdo'], minipxi: true },
  { id: 'disfrute', texto: 'La pasé bien jugando este juego.', anclas: ['Totalmente en desacuerdo', 'Totalmente de acuerdo'], minipxi: true },
  { id: 'dificultad', texto: '¿Qué tan difícil te pareció este nivel?', anclas: ['Muy fácil', 'Muy difícil'], minipxi: false },
] as const;

const ACUERDO_PXI: [string, string] = ['Totalmente en desacuerdo', 'Totalmente de acuerdo'];

const ITEMS_PXI: Pregunta[] = ([
  ['desafio_1', 'El juego no fue ni demasiado fácil ni demasiado difícil de jugar.'],
  ['desafio_2', 'El juego fue desafiante, pero no demasiado desafiante.'],
  ['desafio_3', 'Los desafíos del juego tuvieron el nivel de dificultad adecuado para mí.'],
  ['maestria_1', 'Sentí que jugaba bien este juego.'],
  ['maestria_2', 'Me sentí capaz mientras jugaba.'],
  ['maestria_3', 'Sentí que dominaba este juego.'],
  ['inmersion_1', 'Mientras jugaba, dejé de ser consciente de lo que me rodeaba.'],
  ['inmersion_2', 'Me sumergí en el juego.'],
  ['inmersion_3', 'Mi atención estuvo totalmente centrada en el juego.'],
] as const).map(([id, texto]): Pregunta => ({ id: `pxi_${id}`, tipo: 'escala', texto, min: -3, max: 3, anclas: ACUERDO_PXI }));

export const CONTROL: Pregunta = {
  id: 'control', tipo: 'escala', texto: 'Para comprobar que lees con atención, marca +2 en esta pregunta.',
  min: -3, max: 3, anclas: ACUERDO_PXI,
};
export const RESPUESTA_CONTROL = 2;

export const POSTEST_PXI: Pregunta[] = [...ITEMS_PXI.slice(0, 6), CONTROL, ...ITEMS_PXI.slice(6)];

export const INSTRUCCION_SUS =
  'Por favor seleccione de cada uno de los enunciados la opción que mejor describa su experiencia con el juego. '
  + 'Un puntaje de 1 significa que usted se encuentra totalmente en desacuerdo con el enunciado, mientras que un puntaje '
  + 'en 5 significa que está totalmente de acuerdo, un puntaje de 3 significaría que usted se encuentra neutral con el enunciado.';

const ITEMS_SUS = [
  'Me gustaría jugar este juego frecuentemente.',
  'Considero que este juego es innecesariamente complejo.',
  'Considero que el juego es fácil de usar.',
  'Considero necesario el apoyo de personal experto para poder utilizar este juego.',
  'Considero que las funciones del juego están bien integradas.',
  'Considero que el juego presenta muchas contradicciones.',
  'Imagino que la mayoría de las personas aprenderían a usar este juego rápidamente.',
  'Considero que el uso de este juego es tedioso.',
  'Me sentí muy confiado al usar el juego.',
  'Necesité saber bastantes cosas antes de poder empezar a usar este juego.',
];

export const POSTEST_SUS: Pregunta[] = ITEMS_SUS.map((texto, i): Pregunta => ({
  id: `sus_${i + 1}`, tipo: 'escala', texto, min: 1, max: 5, anclas: ['Totalmente en desacuerdo', 'Totalmente de acuerdo'],
}));

export const POSTEST_ABIERTA: Pregunta[] = [{
  id: 'abierta', tipo: 'abierta', opcional: true,
  texto: '¿Qué te pareció la experiencia de juego? Cuéntanos qué te gustó y qué cambiarías.',
}];
