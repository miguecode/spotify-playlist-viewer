import type { Track } from '../types';
import type { Column } from './columns';
import { fold, matchesAll } from './text';

// Formatear fechas y normalizar texto en cada tecla sería lento con miles de canciones: se guarda por canción y columna.
const texts = new WeakMap<Track, Map<string, string>>();
const folded = new WeakMap<Track, Map<string, string>>();

function cached(
  store: WeakMap<Track, Map<string, string>>,
  t: Track,
  key: string,
  compute: () => string,
): string {
  let perTrack = store.get(t);
  if (!perTrack) {
    perTrack = new Map();
    store.set(t, perTrack);
  }
  let value = perTrack.get(key);
  if (value === undefined) {
    value = compute();
    perTrack.set(key, value);
  }
  return value;
}

/** Texto que se ve en la celda. */
export function cellText(col: Column, t: Track): string {
  return cached(texts, t, col.key, () => col.text(t));
}

function foldedCell(col: Column, t: Track): string {
  return cached(folded, t, col.key, () => fold(cellText(col, t)));
}

/**
 * ¿La fila coincide con la búsqueda? Se busca en las columnas visibles, sin importar mayúsculas ni tildes,
 * y deben aparecer todos los términos (cada uno dentro de alguna columna).
 */
export function matchesQuery(columns: readonly Column[], t: Track, terms: readonly string[]): boolean {
  if (terms.length === 0) return true;
  const haystack = columns.map((col) => foldedCell(col, t)).join('\n');
  return matchesAll(haystack, terms);
}
