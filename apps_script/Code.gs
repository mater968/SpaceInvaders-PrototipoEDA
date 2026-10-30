const HOJA_JUGADOR = 'jugador';
const HOJA_SISTEMA = 'sistema';
const HOJA_RESPALDO = 'respaldo';
const GUARDAR_PRUEBAS = false;
const NIVELES = 5;
const RESPUESTA_CONTROL = 2;
const MAX_DATOS = 20000;
const EVENTOS = ['sesion', 'tamizaje', 'excluido', 'nivel', 'encuesta_nivel', 'cuestionario_final'];

const TAMIZAJE = ['edad', 'universitario', 'frecuencia', 'generos', 'familiaridad'];
const NIVEL_JUGADOR = [
  ['superado', 'superado'], ['aciertos', 'aciertos'], ['disparos', 'disparos'], ['vidas_inicio', 'vidasInicio'],
  ['vidas_fin', 'vidasFin'], ['tiempo_ms', 'tiempoMs'], ['A', 'A'], ['V', 'V'], ['T', 'T'], ['R', 'R'],
  ['d_objetivo', 'd_objetivo'], ['d_siguiente', 'd_siguiente'],
];
const ENCUESTA = ['desafio', 'maestria', 'inmersion', 'disfrute', 'dificultad'];
const CONSTRUCTOS = ['desafio', 'maestria', 'inmersion'];
const ITEMS_PXI = CONSTRUCTOS.flatMap((c) => [1, 2, 3].map((n) => 'pxi_' + c + '_' + n));
const ITEMS_SUS = rango(10).map((i) => 'sus_' + i);
const NIVEL_SISTEMA = [
  ['oleada', 'oleada'], ['formacion', 'formacion'], ['d_objetivo', 'd_objetivo'], ['d_oleada', 'd_oleada'],
  ['densidad', 'densidad'], ['den_objetivo', 'den_objetivo'], ['aptitud', 'aptitud'], ['generaciones', 'generaciones'],
  ['semilla', 'semilla'], ['ms_generacion', 'ms_generacion'], ['fps_medio', 'fpsMedio'], ['fps_p5', 'fpsP5'],
];

const COLUMNAS_JUGADOR = [
  'codigo', 'grupo', 'version', 'fecha', 'excluido', 'completo', 'control_ok', 'valido',
  ...TAMIZAJE,
  ...rango(NIVELES).flatMap((n) => [...NIVEL_JUGADOR.map(([c]) => c), ...ENCUESTA].map((c) => 'n' + n + '_' + c)),
  ...ITEMS_PXI, 'control', ...CONSTRUCTOS.map((c) => 'pxi_prom_' + c),
  ...ITEMS_SUS, 'sus_puntaje', 'abierta',
];
const COLUMNAS_SISTEMA = [
  'codigo', 'evento', 'nivel', 'grupo', 'version', 'navegador', 'so', 'fecha', 'pantalla', 'carga_ms',
  ...NIVEL_SISTEMA.map(([c]) => c), 'ms_encuesta',
];
const COLUMNAS_RESPALDO = ['ts', 'codigo', 'evento', 'version', 'navegador', 'so', 'datos'];

/** Recibe un evento del juego y lo escribe en la hoja del jugador y en la del sistema. */
function doPost(e) {
  let fila;
  try {
    fila = JSON.parse(e.postData.contents);
  } catch (err) {
    return responder({ ok: false, error: 'JSON invalido' });
  }
  const error = validar(fila);
  if (error) return responder({ ok: false, error: error });
  if (/-dev$/.test(String(fila.version)) && !GUARDAR_PRUEBAS) return responder({ ok: true, ignorado: 'prueba' });

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const libro = SpreadsheetApp.getActiveSpreadsheet();
    obtenerHoja(libro, HOJA_RESPALDO, COLUMNAS_RESPALDO, true)
      .appendRow(COLUMNAS_RESPALDO.map((c) => seguro(c === 'datos' ? JSON.stringify(fila.datos) : fila[c])));
    distribuir(libro, fila);
  } finally {
    lock.releaseLock();
  }
  return responder({ ok: true });
}

/** Devuelve el motivo por el que la fila no se acepta, o cadena vacia si es valida. */
function validar(fila) {
  if (!fila || !/^[A-Z0-9]{6}$/.test(String(fila.codigo))) return 'codigo invalido';
  if (EVENTOS.indexOf(fila.evento) < 0) return 'evento desconocido';
  if (!fila.datos || typeof fila.datos !== 'object') return 'faltan datos';
  if (JSON.stringify(fila.datos).length > MAX_DATOS) return 'datos demasiado grandes';
  const n = fila.datos.nivel;
  if ((fila.evento === 'nivel' || fila.evento === 'encuesta_nivel') && !(Number.isInteger(n) && n >= 1 && n <= NIVELES)) {
    return 'nivel invalido';
  }
  return '';
}

/** Reparte un evento: lo que responde o hace el jugador va a «jugador»; el generador y el equipo, a «sistema». */
function distribuir(libro, f) {
  const d = f.datos;
  const n = d.nivel;
  const jugador = (valores) => guardar(libro, HOJA_JUGADOR, COLUMNAS_JUGADOR, { codigo: f.codigo },
    Object.assign({ version: f.version }, valores), f.ts, estado);
  const sistema = (nivel, valores) => guardar(libro, HOJA_SISTEMA, COLUMNAS_SISTEMA, { codigo: f.codigo, nivel: nivel },
    Object.assign({ version: f.version, navegador: f.navegador, so: f.so }, valores), f.ts);

  if (f.evento === 'sesion') {
    jugador({ grupo: d.grupo });
    sistema('', { evento: 'sesion', grupo: d.grupo, pantalla: d.pantalla, carga_ms: d.carga_ms });
  } else if (f.evento === 'tamizaje') {
    jugador(tomar(d, TAMIZAJE.map((c) => [c, c])));
  } else if (f.evento === 'excluido') {
    jugador({ excluido: d.motivo });
  } else if (f.evento === 'nivel') {
    jugador(Object.assign({ grupo: d.grupo }, tomar(d, NIVEL_JUGADOR, 'n' + n + '_')));
    sistema(n, Object.assign({ evento: 'nivel', grupo: d.grupo }, tomar(d, NIVEL_SISTEMA)));
  } else if (f.evento === 'encuesta_nivel') {
    jugador(tomar(d, ENCUESTA.map((c) => [c, c]), 'n' + n + '_'));
    sistema(n, { evento: 'nivel', ms_encuesta: d.ms_respuesta });
  } else if (f.evento === 'cuestionario_final') {
    const prom = d.pxi_promedios || {};
    jugador(Object.assign(
      tomar(d, [...ITEMS_PXI, 'control', ...ITEMS_SUS, 'sus_puntaje', 'abierta'].map((c) => [c, c])),
      Object.fromEntries(CONSTRUCTOS.map((c) => ['pxi_prom_' + c, prom[c]])),
    ));
  }
}

/** Copia los campos del evento con el nombre de columna indicado. */
function tomar(d, pares, prefijo) {
  return Object.fromEntries(pares.map(([col, campo]) => [(prefijo || '') + col, d[campo]]));
}

/** Busca la fila con esa clave (o crea una nueva), cambia solo las columnas recibidas y la vuelve a escribir. */
function guardar(libro, nombre, columnas, clave, valores, ts, ajustar) {
  const hoja = obtenerHoja(libro, nombre, columnas, false);
  const col = (k) => {
    const i = columnas.indexOf(k);
    if (i < 0) throw new Error('Columna desconocida: ' + k);
    return i;
  };
  const ultima = hoja.getLastRow();
  const filas = ultima > 1 ? hoja.getRange(2, 1, ultima - 1, columnas.length).getValues() : [];
  const claves = Object.keys(clave);
  const i = filas.findIndex((f) => claves.every((k) => String(f[col(k)]) === String(clave[k])));
  const fila = i >= 0 ? filas[i] : columnas.map(() => '');

  const todo = Object.assign({}, clave, valores);
  for (const k of Object.keys(todo)) if (todo[k] !== undefined) fila[col(k)] = celda(todo[k]);
  if (fila[col('fecha')] === '') fila[col('fecha')] = ts;
  if (ajustar) ajustar(fila, col);

  hoja.getRange(i >= 0 ? i + 2 : ultima + 1, 1, 1, columnas.length).setValues([fila.map(seguro)]);
}

/** completo: tamizaje, cinco niveles con su encuesta y cuestionario final. valido: completo y acierta la pregunta de control. */
function estado(fila, col) {
  const lleno = (k) => fila[col(k)] !== '' && fila[col(k)] !== null;
  const completo = lleno('edad') && lleno('sus_puntaje')
    && rango(NIVELES).every((n) => lleno('n' + n + '_superado') && lleno('n' + n + '_dificultad'));
  const controlOk = lleno('control') ? (Number(fila[col('control')]) === RESPUESTA_CONTROL ? 1 : 0) : '';
  fila[col('completo')] = completo ? 1 : 0;
  fila[col('control_ok')] = controlOk;
  fila[col('valido')] = completo && controlOk === 1 ? 1 : 0;
}

/** Devuelve la hoja; si no existe la crea con su cabecera y con la columna del codigo como texto. */
function obtenerHoja(libro, nombre, columnas, oculta) {
  let hoja = libro.getSheetByName(nombre);
  if (!hoja) {
    hoja = libro.insertSheet(nombre);
    hoja.getRange(1, 1, 1, columnas.length).setValues([columnas]).setFontWeight('bold');
    hoja.getRange(1, columnas.indexOf('codigo') + 1, hoja.getMaxRows(), 1).setNumberFormat('@');
    hoja.setFrozenRows(1);
    hoja.setFrozenColumns(1);
    if (oculta) hoja.hideSheet();
  }
  return hoja;
}

/** Un valor por celda: si/no como 1/0 y listas separadas por comas. */
function celda(v) {
  if (v === null) return '';
  if (v === true) return 1;
  if (v === false) return 0;
  if (Array.isArray(v)) return v.join(', ');
  if (typeof v === 'object' && !(v instanceof Date)) return JSON.stringify(v);
  return v;
}

/** Evita que un texto que empiece con = + - @ se ejecute como formula en la hoja. */
function seguro(v) {
  if (v === undefined || v === null) return '';
  if (typeof v !== 'string') return v;
  const s = v.slice(0, MAX_DATOS);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function responder(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function rango(n) {
  return Array.from({ length: n }, (_, i) => i + 1);
}
