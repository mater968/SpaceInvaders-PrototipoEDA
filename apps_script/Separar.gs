const ORIGEN = 'registros';
const HOJA_RESULTADOS = 'resultados';
const HOJA_TECNICO = 'tecnico';
const INCLUIR_PRUEBAS = false;
const NIVELES = 5;
const RESPUESTA_CONTROL = 2;

const PRETEST = ['edad', 'universitario', 'frecuencia', 'generos', 'familiaridad'];
const NIVEL_JUEGO = [
  ['superado', 'superado'], ['aciertos', 'aciertos'], ['disparos', 'disparos'], ['vidas_inicio', 'vidasInicio'],
  ['vidas_fin', 'vidasFin'], ['tiempo_ms', 'tiempoMs'], ['A', 'A'], ['V', 'V'], ['T', 'T'], ['R', 'R'],
  ['d_objetivo', 'd_objetivo'], ['d_siguiente', 'd_siguiente'],
];
const NIVEL_ENCUESTA = ['desafio', 'maestria', 'inmersion', 'disfrute', 'dificultad'];
const CONSTRUCTOS = ['desafio', 'maestria', 'inmersion'];
const ITEMS_PXI = CONSTRUCTOS.flatMap((c) => [1, 2, 3].map((n) => 'pxi_' + c + '_' + n));
const ITEMS_SUS = Array.from({ length: 10 }, (_, i) => 'sus_' + (i + 1));

const CABECERA_RESULTADOS = [
  'codigo', 'grupo', 'fecha', 'completo', 'control_ok', 'valido',
  ...PRETEST,
  ...rango(NIVELES).flatMap((n) => [...NIVEL_JUEGO.map(([h]) => h), ...NIVEL_ENCUESTA].map((h) => 'n' + n + '_' + h)),
  ...ITEMS_PXI, 'control', ...CONSTRUCTOS.map((c) => 'pxi_prom_' + c),
  ...ITEMS_SUS, 'sus_puntaje', 'abierta',
];
const TECNICO = [
  ['nivel', 'nivel'], ['oleada', 'oleada'], ['formacion', 'formacion'], ['d_objetivo', 'd_objetivo'],
  ['d_oleada', 'd_oleada'], ['densidad', 'densidad'], ['den_objetivo', 'den_objetivo'], ['aptitud', 'aptitud'],
  ['generaciones', 'generaciones'], ['semilla', 'semilla'], ['ms_generacion', 'ms_generacion'],
  ['fps_medio', 'fpsMedio'], ['fps_p5', 'fpsP5'],
];
const CABECERA_TECNICO = ['codigo', 'grupo', 'version', 'navegador', 'so', 'pantalla', 'carga_ms', 'excluido',
  ...TECNICO.map(([h]) => h), 'ms_encuesta'];

// Crea el menu al abrir la hoja. Desde el editor no hay hoja abierta: ahi se ejecuta separarDatos directamente.
function onOpen() {
  try {
    SpreadsheetApp.getUi().createMenu('Datos').addItem('Separar y limpiar datos', 'separarDatos').addToUi();
  } catch (e) {
    console.log('onOpen solo crea el menú al abrir la hoja. Para separar los datos, ejecuta separarDatos.');
  }
}

function separarDatos() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  const origen = libro.getSheetByName(ORIGEN);
  if (!origen || origen.getLastRow() < 2) throw new Error('La hoja «' + ORIGEN + '» no tiene datos.');
  const personas = agrupar(origen.getDataRange().getValues());

  const resultados = [];
  const tecnico = [];
  for (const p of personas.lista) {
    const sesion = p.eventos.sesion || {};
    const grupo = sesion.grupo || (Object.values(p.niveles)[0] || {}).grupo || '';
    const excluido = p.eventos.excluido ? p.eventos.excluido.motivo : '';
    const base = [p.codigo, grupo, p.version, p.navegador, p.so, sesion.pantalla, sesion.carga_ms, excluido];

    const niveles = Object.keys(p.niveles).map(Number).sort((a, b) => a - b);
    if (niveles.length === 0) tecnico.push([...base, ...TECNICO.map(() => ''), '']);
    for (const n of niveles) {
      tecnico.push([...base, ...TECNICO.map(([, k]) => p.niveles[n][k]), (p.encuestas[n] || {}).ms_respuesta]);
    }

    if (excluido) continue;
    const pre = p.eventos.pretest || {};
    const post = p.eventos.postest;
    const completo = !!p.eventos.pretest && !!post
      && rango(NIVELES).every((n) => p.niveles[n] && p.encuestas[n]);
    const controlOk = post ? post.control === RESPUESTA_CONTROL : '';
    resultados.push([
      p.codigo, grupo, p.inicio, completo, controlOk, completo && controlOk === true,
      ...PRETEST.map((k) => pre[k]),
      ...rango(NIVELES).flatMap((n) => [
        ...NIVEL_JUEGO.map(([, k]) => (p.niveles[n] || {})[k]),
        ...NIVEL_ENCUESTA.map((k) => (p.encuestas[n] || {})[k]),
      ]),
      ...ITEMS_PXI.map((k) => (post || {})[k]), (post || {}).control,
      ...CONSTRUCTOS.map((c) => (post ? promedio([1, 2, 3].map((i) => post['pxi_' + c + '_' + i])) : '')),
      ...ITEMS_SUS.map((k) => (post || {})[k]), post ? puntajeSus(ITEMS_SUS.map((k) => post[k])) : '',
      (post || {}).abierta,
    ]);
  }

  escribir(libro, HOJA_RESULTADOS, CABECERA_RESULTADOS, resultados, ['codigo']);
  escribir(libro, HOJA_TECNICO, CABECERA_TECNICO, tecnico, ['codigo', 'oleada']);
  const validos = resultados.filter((r) => r[5] === true).length;
  const resumen = resultados.length + ' participantes (' + validos + ' válidos) · ' + personas.descartadas
    + ' filas descartadas · ' + personas.duplicadas + ' duplicadas';
  console.log(resumen);
  try {
    libro.toast(resumen, 'Datos separados', 10);
  } catch (e) {
  }
}

/** Lee «registros», descarta filas de prueba o invalidas y duplicadas, y agrupa por codigo. */
function agrupar(valores) {
  const cab = valores[0].map(String);
  const i = (n) => cab.indexOf(n);
  const filas = valores.slice(1).map((v) => ({
    ts: v[i('ts')] instanceof Date ? v[i('ts')] : new Date(v[i('ts')]),
    codigo: String(v[i('codigo')]).trim(),
    evento: String(v[i('evento')]).trim(),
    version: String(v[i('version')]).trim(),
    navegador: v[i('navegador')],
    so: v[i('so')],
    datos: leerJson(v[i('datos')]),
  })).sort((a, b) => a.ts - b.ts);

  const eventosValidos = ['sesion', 'pretest', 'excluido', 'nivel', 'encuesta_nivel', 'postest'];
  const mapa = new Map();
  const vistos = new Set();
  let descartadas = 0;
  let duplicadas = 0;
  for (const f of filas) {
    const prueba = /-dev$/.test(f.version) && !INCLUIR_PRUEBAS;
    if (!f.datos || prueba || !/^[A-Z0-9]{6}$/.test(f.codigo) || eventosValidos.indexOf(f.evento) < 0) {
      descartadas++;
      continue;
    }
    const clave = f.codigo + '|' + f.evento + '|' + (f.datos.nivel || '');
    if (vistos.has(clave)) {
      duplicadas++;
      continue;
    }
    vistos.add(clave);
    if (!mapa.has(f.codigo)) {
      mapa.set(f.codigo, {
        codigo: f.codigo, inicio: f.ts, version: f.version, navegador: f.navegador, so: f.so,
        eventos: {}, niveles: {}, encuestas: {},
      });
    }
    const p = mapa.get(f.codigo);
    if (f.evento === 'nivel') p.niveles[f.datos.nivel] = f.datos;
    else if (f.evento === 'encuesta_nivel') p.encuestas[f.datos.nivel] = f.datos;
    else p.eventos[f.evento] = f.datos;
  }
  return { lista: [...mapa.values()], descartadas, duplicadas };
}

/** Escribe la hoja desde cero. Las columnas de texto se fijan antes para que Sheets no las convierta en numeros. */
function escribir(libro, nombre, cabecera, filas, columnasTexto) {
  const hoja = libro.getSheetByName(nombre) || libro.insertSheet(nombre);
  hoja.clear();
  const tabla = [cabecera, ...filas.map((f) => f.map(celda))];
  for (const c of columnasTexto) hoja.getRange(1, cabecera.indexOf(c) + 1, tabla.length, 1).setNumberFormat('@');
  hoja.getRange(1, 1, tabla.length, cabecera.length).setValues(tabla);
  hoja.getRange(1, 1, 1, cabecera.length).setFontWeight('bold');
  hoja.setFrozenRows(1);
  hoja.setFrozenColumns(1);
}

/** Un valor por celda: si/no como 1/0, listas separadas por comas y textos que no se ejecuten como formula. */
function celda(v) {
  if (v === undefined || v === null) return '';
  if (v === true) return 1;
  if (v === false) return 0;
  if (Array.isArray(v)) return v.join(', ');
  if (v instanceof Date || typeof v === 'number') return v;
  if (typeof v === 'object') return JSON.stringify(v);
  const s = String(v);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function leerJson(texto) {
  try {
    const o = JSON.parse(String(texto).replace(/^'/, ''));
    return o && typeof o === 'object' ? o : null;
  } catch (e) {
    return null;
  }
}

function promedio(xs) {
  const v = xs.filter((x) => typeof x === 'number');
  return v.length ? Math.round((v.reduce((s, x) => s + x, 0) / v.length) * 1000) / 1000 : '';
}

/** SUS de 0 a 100: impares, respuesta − 1; pares, 5 − respuesta; la suma por 2.5. */
function puntajeSus(r) {
  if (r.some((x) => typeof x !== 'number')) return '';
  return r.reduce((s, x, i) => s + (i % 2 === 0 ? x - 1 : 5 - x), 0) * 2.5;
}

function rango(n) {
  return Array.from({ length: n }, (_, i) => i + 1);
}
