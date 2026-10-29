const HOJA = 'registros';
const COLUMNAS = ['ts', 'codigo', 'evento', 'version', 'navegador', 'so', 'datos'];
const MAX_DATOS = 20000;

function doPost(e) {
  let fila;
  try {
    fila = JSON.parse(e.postData.contents);
  } catch (err) {
    return responder({ ok: false, error: 'JSON inválido' });
  }
  if (!/^[A-Z0-9]{6}$/.test(String(fila.codigo)) || !/^[a-z0-9_]{1,40}$/.test(String(fila.evento))) {
    return responder({ ok: false, error: 'Falta codigo o evento, o tienen formato inválido' });
  }
  const datos = JSON.stringify(fila.datos || {});
  if (datos.length > MAX_DATOS) return responder({ ok: false, error: 'datos demasiado grande' });

  const valores = COLUMNAS.map((c) => limpiar(c === 'datos' ? datos : fila[c]));
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    obtenerHoja().appendRow(valores);
  } finally {
    lock.releaseLock();
  }
  return responder({ ok: true });
}

function obtenerHoja() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = libro.getSheetByName(HOJA);
  if (!hoja) {
    hoja = libro.insertSheet(HOJA);
    hoja.appendRow(COLUMNAS);
    hoja.setFrozenRows(1);
  }
  return hoja;
}

// Evita que un texto que empiece con = + - @ se ejecute como formula en la hoja.
function limpiar(v) {
  const s = v === undefined || v === null ? '' : String(v).slice(0, MAX_DATOS);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function responder(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
