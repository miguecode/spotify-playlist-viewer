import { findRanges, fold, mergeRanges } from '../lib/text';

export type Child = Node | string | number | null | undefined | false;
type Attr = string | number | boolean | null | undefined | ((ev: Event) => void);
export type Attrs = Record<string, Attr>;

/** Atributos que se asignan como propiedad del elemento (no como atributo HTML). */
const PROP_KEYS = new Set(['value', 'checked', 'disabled', 'hidden']);

/**
 * Crea un elemento. Todo texto entra como nodo de texto (nunca como HTML),
 * así que un nombre de canción con "<" o "&" no puede inyectar nada.
 * Los atributos que empiezan con "on" son listeners (onclick, oninput, …).
 */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'class') {
      el.className = String(value);
    } else if (PROP_KEYS.has(key)) {
      Reflect.set(el, key, value);
    } else if (value !== false) {
      el.setAttribute(key, value === true ? '' : String(value));
    }
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    el.append(typeof child === 'number' ? String(child) : child);
  }
  return el;
}

export function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Falta el elemento #${id} en el HTML`);
  return el as T;
}

/** Texto con las coincidencias de la búsqueda envueltas en <mark>. */
export function highlight(text: string, terms: readonly string[]): Node {
  if (terms.length === 0 || text === '') return document.createTextNode(text);
  const ranges = mergeRanges(findRanges(fold(text), terms));
  if (ranges.length === 0) return document.createTextNode(text);

  const fragment = document.createDocumentFragment();
  let pos = 0;
  for (const [start, end] of ranges) {
    if (start > pos) fragment.append(text.slice(pos, start));
    fragment.append(h('mark', {}, text.slice(start, end)));
    pos = end;
  }
  if (pos < text.length) fragment.append(text.slice(pos));
  return fragment;
}
