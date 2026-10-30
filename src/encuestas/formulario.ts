export type Pregunta =
  | { id: string; tipo: 'numero'; texto: string; min: number; max: number; desplegable?: boolean }
  | { id: string; tipo: 'unica'; texto: string; opciones: [string, string][]; desplegable?: boolean }
  | { id: string; tipo: 'multiple'; texto: string; opciones: [string, string][] }
  | { id: string; tipo: 'escala'; texto: string; min: number; max: number; anclas: [string, string] }
  | { id: string; tipo: 'abierta'; texto: string; opcional?: boolean };

export type Respuestas = Record<string, number | string | string[]>;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const signo = (v: number, min: number) => (min < 0 && v > 0 ? `+${v}` : `${v}`.replace('-', '−'));

function abrirCapa(html: string): HTMLDivElement {
  const capa = document.createElement('div');
  capa.className = 'capa';
  capa.innerHTML = html;
  document.body.appendChild(capa);
  return capa;
}

function htmlDesplegable(id: string, texto: string, opciones: [string, string][]): string {
  const ops = opciones.map(([v, e]) => `<option value="${v}">${esc(e)}</option>`).join('');
  return `<select name="${id}" aria-label="${esc(texto)}"><option value="" selected disabled>Selecciona una opción</option>${ops}</select>`;
}

function htmlPregunta(p: Pregunta, i: number): string {
  const leyenda = `<legend><span class="num">${i + 1}.</span> ${esc(p.texto)}</legend>`;
  if (p.tipo === 'numero' && p.desplegable) {
    const ops = Array.from({ length: p.max - p.min + 1 }, (_, k): [string, string] => [`${p.min + k}`, `${p.min + k}`]);
    return `<fieldset data-id="${p.id}">${leyenda}${htmlDesplegable(p.id, p.texto, ops)}</fieldset>`;
  }
  if (p.tipo === 'unica' && p.desplegable) return `<fieldset data-id="${p.id}">${leyenda}${htmlDesplegable(p.id, p.texto, p.opciones)}</fieldset>`;
  switch (p.tipo) {
    case 'numero':
      return `<fieldset data-id="${p.id}">${leyenda}<input type="number" name="${p.id}" min="${p.min}" max="${p.max}" inputmode="numeric" aria-label="${esc(p.texto)}"></fieldset>`;
    case 'unica':
    case 'multiple': {
      const tipo = p.tipo === 'unica' ? 'radio' : 'checkbox';
      const ops = p.opciones.map(([v, e]) => `<label class="opcion"><input type="${tipo}" name="${p.id}" value="${v}"> ${esc(e)}</label>`).join('');
      return `<fieldset data-id="${p.id}">${leyenda}<div class="opciones-col">${ops}</div></fieldset>`;
    }
    case 'escala': {
      const vals = Array.from({ length: p.max - p.min + 1 }, (_, k) => p.min + k);
      const ops = vals.map((v) => `<label class="punto"><input type="radio" name="${p.id}" value="${v}"><span>${signo(v, p.min)}</span></label>`).join('');
      return `<fieldset data-id="${p.id}">${leyenda}<div class="escala">${ops}</div>`
        + `<div class="anclas"><span>${esc(p.anclas[0])}</span><span>${esc(p.anclas[1])}</span></div></fieldset>`;
    }
    case 'abierta':
      return `<fieldset data-id="${p.id}">${leyenda}<textarea name="${p.id}" rows="4" maxlength="2000" aria-label="${esc(p.texto)}"></textarea></fieldset>`;
  }
}

/** Lee y valida las respuestas. Devuelve los ids sin responder o fuera de rango. */
export function leerRespuestas(form: HTMLFormElement, preguntas: Pregunta[]): { respuestas: Respuestas; faltan: string[] } {
  const datos = new FormData(form);
  const respuestas: Respuestas = {};
  const faltan: string[] = [];
  for (const p of preguntas) {
    if (p.tipo === 'multiple') {
      const v = datos.getAll(p.id).map(String);
      if (v.length === 0) faltan.push(p.id);
      respuestas[p.id] = v;
      continue;
    }
    const v = String(datos.get(p.id) ?? '').trim();
    if (p.tipo === 'abierta') {
      if (!v && !p.opcional) faltan.push(p.id);
      respuestas[p.id] = v;
    } else if (p.tipo === 'unica') {
      if (!v) faltan.push(p.id);
      else respuestas[p.id] = v;
    } else {
      const n = Number(v);
      if (v === '' || !Number.isInteger(n) || n < p.min || n > p.max) faltan.push(p.id);
      else respuestas[p.id] = n;
    }
  }
  return { respuestas, faltan };
}

/** Muestra un formulario de una pagina y resuelve cuando todas las preguntas obligatorias estan respondidas. */
export function formulario(titulo: string, intro: string, preguntas: Pregunta[], boton = 'Continuar'): Promise<Respuestas> {
  return new Promise((resolver) => {
    const capa = abrirCapa(
      `<form class="panel" novalidate><h1>${esc(titulo)}</h1>${intro ? `<p class="intro">${esc(intro)}</p>` : ''}`
      + preguntas.map(htmlPregunta).join('')
      + `<p class="error" role="alert"></p><button type="submit">${esc(boton)}</button></form>`,
    );
    const form = capa.querySelector('form')!;
    const error = capa.querySelector<HTMLElement>('.error')!;
    form.querySelector<HTMLElement>('input, select, textarea')?.focus();
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const { respuestas, faltan } = leerRespuestas(form, preguntas);
      form.querySelectorAll('fieldset').forEach((f) => f.classList.toggle('falta', faltan.includes(f.dataset.id!)));
      if (faltan.length) {
        error.textContent = faltan.length === 1 ? 'Falta responder 1 pregunta (marcada en rojo).' : `Faltan responder ${faltan.length} preguntas (marcadas en rojo).`;
        form.querySelector<HTMLElement>(`fieldset[data-id="${faltan[0]}"]`)?.scrollIntoView({ block: 'center' });
        return;
      }
      capa.remove();
      resolver(respuestas);
    });
  });
}

/** Consentimiento informado: resuelve true si acepta. */
export function consentimiento(titulo: string, parrafos: string[]): Promise<boolean> {
  return new Promise((resolver) => {
    const capa = abrirCapa(
      `<div class="panel"><h1>${esc(titulo)}</h1>${parrafos.map((p) => `<p>${esc(p)}</p>`).join('')}`
      + `<div class="botones"><button data-v="1">Acepto participar</button><button data-v="0" class="secundario">No acepto</button></div></div>`,
    );
    capa.querySelector<HTMLElement>('button')!.focus();
    capa.querySelectorAll<HTMLButtonElement>('button').forEach((b) => b.addEventListener('click', () => {
      capa.remove();
      resolver(b.dataset.v === '1');
    }));
  });
}

interface ItemNivel { id: string; texto: string; anclas: readonly [string, string]; minipxi: boolean }

/**
 * Encuesta de fin de nivel: una pregunta a la vez, con las teclas 1 a 7 o con clic.
 * Los items del miniPXI se guardan de −3 a +3 (tecla − 4); la dificultad, de 1 a 7.
 */
export function encuestaNivel(nivel: number, items: readonly ItemNivel[]): Promise<Record<string, number>> {
  return new Promise((resolver) => {
    const capa = abrirCapa(
      `<div class="panel nivel" role="dialog" aria-live="polite"><h1>Fin del nivel ${nivel}</h1>`
      + '<p class="progreso"></p><p class="enunciado"></p>'
      + `<div class="teclas">${[1, 2, 3, 4, 5, 6, 7].map((k) => `<button data-k="${k}">${k}</button>`).join('')}</div>`
      + '<div class="anclas"><span></span><span></span></div>'
      + '<p class="ayuda">Responde con las teclas 1 a 7 o haz clic en un número.</p></div>',
    );
    const progreso = capa.querySelector<HTMLElement>('.progreso')!;
    const enunciado = capa.querySelector<HTMLElement>('.enunciado')!;
    const [izq, der] = capa.querySelectorAll<HTMLElement>('.anclas span');
    const respuestas: Record<string, number> = {};
    const inicio = performance.now();
    let i = 0;
    let listoDesde = 0;

    const mostrar = () => {
      const it = items[i];
      progreso.textContent = `Pregunta ${i + 1} de ${items.length}`;
      enunciado.textContent = it.texto;
      izq.textContent = `1 = ${it.anclas[0]}`;
      der.textContent = `7 = ${it.anclas[1]}`;
      listoDesde = performance.now() + 350;
    };

    const responder = (k: number) => {
      if (performance.now() < listoDesde) return;
      const it = items[i];
      respuestas[it.id] = it.minipxi ? k - 4 : k;
      i++;
      if (i < items.length) return mostrar();
      document.removeEventListener('keydown', alTeclear);
      capa.remove();
      resolver({ ...respuestas, ms_respuesta: Math.round(performance.now() - inicio) });
    };

    const alTeclear = (e: KeyboardEvent) => {
      const k = Number(e.key);
      if (!e.repeat && Number.isInteger(k) && k >= 1 && k <= 7) responder(k);
    };
    document.addEventListener('keydown', alTeclear);
    capa.querySelectorAll<HTMLButtonElement>('.teclas button').forEach((b) => b.addEventListener('click', () => responder(Number(b.dataset.k))));
    mostrar();
  });
}

/** Pantalla final: espera el envio de los datos y ofrece reintentar si falla. */
export function pantallaFinal(codigo: string, enviar: () => Promise<boolean>): Promise<void> {
  return new Promise((resolver) => {
    const capa = abrirCapa(
      '<div class="panel"><h1>¡Gracias por participar!</h1>'
      + `<p>Tu código anónimo es <strong class="codigo">${esc(codigo)}</strong>.</p>`
      + '<p class="estado" role="status">Enviando tus respuestas…</p><button hidden>Reintentar el envío</button></div>',
    );
    const estado = capa.querySelector<HTMLElement>('.estado')!;
    const boton = capa.querySelector<HTMLButtonElement>('button')!;
    const intentar = async () => {
      boton.hidden = true;
      estado.textContent = 'Enviando tus respuestas…';
      if (await enviar()) {
        estado.textContent = 'Tus respuestas se guardaron. Ya puedes cerrar esta página.';
        resolver();
      } else {
        estado.textContent = 'No se pudieron enviar tus respuestas. Revisa tu conexión y pulsa «Reintentar». No cierres la página.';
        boton.hidden = false;
        boton.focus();
      }
    };
    boton.addEventListener('click', intentar);
    void intentar();
  });
}
