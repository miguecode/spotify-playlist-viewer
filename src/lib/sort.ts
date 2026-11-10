import type { Track } from '../types';
import type { Column } from './columns';

export type SortDir = 'asc' | 'desc';

export interface SortState {
  key: string;
  dir: SortDir;
}

const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true });

/** Ciclo al hacer clic en un encabezado: sentido natural de la columna → el opuesto → sin orden. */
export function nextSort(current: SortState | null, col: Column): SortState | null {
  if (!current || current.key !== col.key) return { key: col.key, dir: col.defaultDir };
  if (current.dir === col.defaultDir) {
    return { key: col.key, dir: col.defaultDir === 'asc' ? 'desc' : 'asc' };
  }
  return null;
}

const isEmpty = (v: string | number | null): boolean => v === null || v === '';

/** Ordena una copia. Los vacíos van siempre al final y los empates conservan el orden original. */
export function sortTracks(
  tracks: readonly Track[],
  col: Column | undefined,
  sort: SortState | null,
): Track[] {
  if (!col || !sort) return tracks.slice();
  const sign = sort.dir === 'asc' ? 1 : -1;
  const keyed = tracks.map((t) => ({ t, v: col.sortValue(t) }));

  keyed.sort((a, b) => {
    const aEmpty = isEmpty(a.v);
    const bEmpty = isEmpty(b.v);
    if (aEmpty || bEmpty) {
      if (aEmpty && bEmpty) return a.t.position - b.t.position;
      return aEmpty ? 1 : -1;
    }
    const diff =
      typeof a.v === 'number' && typeof b.v === 'number'
        ? a.v - b.v
        : collator.compare(String(a.v), String(b.v));
    return diff !== 0 ? diff * sign : a.t.position - b.t.position;
  });

  return keyed.map((k) => k.t);
}
