import type { PercentField, Track } from '../types';
import { fmtNumber, formatDay, formatDuration, keyLabel, pct } from './format';

// ───────────────────────── Facetas (listas de valores con casillas) ─────────────────────────

export type FacetKey = 'artist' | 'genre' | 'album' | 'label' | 'key' | 'timeSignature' | 'addedBy';

export interface FacetDef {
  key: FacetKey;
  label: string;
  /** Valores de la canción para esta faceta (puede haber varios, por ejemplo varios artistas). */
  values(t: Track): string[];
}

const one = (value: string): string[] => (value ? [value] : []);

export const FACETS: readonly FacetDef[] = [
  { key: 'artist', label: 'Artista', values: (t) => t.artists },
  { key: 'genre', label: 'Género', values: (t) => t.genres },
  { key: 'album', label: 'Álbum', values: (t) => one(t.album) },
  { key: 'label', label: 'Sello', values: (t) => one(t.label) },
  { key: 'key', label: 'Tonalidad', values: (t) => one(keyLabel(t.key, t.mode)) },
  {
    key: 'timeSignature',
    label: 'Compás',
    values: (t) => (t.timeSignature === null ? [] : [`${t.timeSignature}/4`]),
  },
  { key: 'addedBy', label: 'Agregada por', values: (t) => one(t.addedBy) },
];

// ───────────────────────── Rangos (sliders) ─────────────────────────

export type RangeKey =
  | 'popularity'
  | 'duration'
  | 'tempo'
  | 'loudness'
  | PercentField;

export interface RangeDef {
  key: RangeKey;
  label: string;
  step: number;
  /** Valor que se compara. Está redondeado igual que lo que se ve en la tabla. */
  value(t: Track): number | null;
  format(n: number): string;
  /** Límites fijos del slider; si no hay, salen de los datos. */
  fixed?: [number, number];
}

function percentRange(key: PercentField, label: string): RangeDef {
  return {
    key,
    label,
    step: 1,
    value: (t) => pct(t, key),
    format: (n) => `${n}%`,
    fixed: [0, 100],
  };
}

export const RANGES: readonly RangeDef[] = [
  {
    key: 'popularity',
    label: 'Popularidad',
    step: 1,
    value: (t) => t.popularity,
    format: (n) => String(n),
    fixed: [0, 100],
  },
  {
    key: 'duration',
    label: 'Duración',
    step: 1,
    value: (t) => (t.durationMs === null ? null : Math.round(t.durationMs / 1000)),
    format: (n) => formatDuration(n * 1000),
  },
  {
    key: 'tempo',
    label: 'Tempo (BPM)',
    step: 1,
    value: (t) => (t.tempo === null ? null : Math.round(t.tempo)),
    format: (n) => String(n),
  },
  {
    key: 'loudness',
    label: 'Sonoridad (dB)',
    step: 0.1,
    value: (t) => (t.loudness === null ? null : Math.round(t.loudness * 10) / 10),
    format: (n) => fmtNumber(n, 1),
  },
  percentRange('danceability', 'Bailabilidad'),
  percentRange('energy', 'Energía'),
  percentRange('valence', 'Positividad'),
  percentRange('speechiness', 'Hablado'),
  percentRange('acousticness', 'Acústica'),
  percentRange('instrumentalness', 'Instrumental'),
  percentRange('liveness', 'En vivo'),
];

const clean = (n: number): number => Number(n.toFixed(6));

/** Límites del slider: fijos o, si no, el mínimo y máximo reales (redondeados al paso). Null si no hay datos. */
export function rangeBounds(def: RangeDef, tracks: readonly Track[]): [number, number] | null {
  let min = Infinity;
  let max = -Infinity;
  for (const t of tracks) {
    const v = def.value(t);
    if (v === null) continue;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (min === Infinity) return null;
  const [lo, hi] = def.fixed ?? [
    clean(Math.floor(min / def.step + 1e-9) * def.step),
    clean(Math.ceil(max / def.step - 1e-9) * def.step),
  ];
  return lo < hi ? [lo, hi] : null;
}

// ───────────────────────── Fechas ─────────────────────────

export interface DateRange {
  /** YYYY-MM-DD o '' (sin límite). */
  from: string;
  to: string;
}

/** Primer y último día (YYYY-MM-DD) entre las canciones, o null si ninguna tiene fecha. */
export function dayBounds(
  tracks: readonly Track[],
  pick: (t: Track) => string | null,
): [string, string] | null {
  let min = '';
  let max = '';
  for (const t of tracks) {
    const d = pick(t);
    if (!d) continue;
    if (!min || d < min) min = d;
    if (!max || d > max) max = d;
  }
  return min ? [min, max] : null;
}

// ───────────────────────── Estado de los filtros ─────────────────────────

export type ExplicitFilter = 'all' | 'yes' | 'no';

export interface FilterState {
  facets: Partial<Record<FacetKey, string[]>>;
  explicit: ExplicitFilter;
  ranges: Partial<Record<RangeKey, [number, number]>>;
  release: DateRange;
  added: DateRange;
}

export function emptyFilters(): FilterState {
  return {
    facets: {},
    explicit: 'all',
    ranges: {},
    release: { from: '', to: '' },
    added: { from: '', to: '' },
  };
}

function inDays(day: string | null, range: DateRange): boolean {
  if (!range.from && !range.to) return true;
  if (!day) return false;
  if (range.from && day < range.from) return false;
  if (range.to && day > range.to) return false;
  return true;
}

/**
 * Arma la función que decide si una canción pasa los filtros.
 * Dentro de una faceta alcanza con que coincida UNO de los valores elegidos; entre filtros distintos deben cumplirse todos.
 * `skipFacet` deja afuera una faceta: sirve para contar cuántas canciones sumaría cada opción de esa faceta.
 */
export function compileFilters(f: FilterState, skipFacet?: FacetKey): (t: Track) => boolean {
  const facets = FACETS.flatMap((def) => {
    const selected = f.facets[def.key];
    return def.key !== skipFacet && selected && selected.length > 0
      ? [{ def, set: new Set(selected) }]
      : [];
  });
  const ranges = RANGES.flatMap((def) => {
    const r = f.ranges[def.key];
    return r ? [{ def, lo: r[0], hi: r[1] }] : [];
  });

  return (t) => {
    for (const { def, set } of facets) {
      if (!def.values(t).some((v) => set.has(v))) return false;
    }
    if (f.explicit === 'yes' && t.explicit !== true) return false;
    if (f.explicit === 'no' && t.explicit !== false) return false;
    for (const { def, lo, hi } of ranges) {
      const v = def.value(t);
      if (v === null || v < lo || v > hi) return false;
    }
    return inDays(t.releaseDate, f.release) && inDays(t.addedDay, f.added);
  };
}

/** Cuántas canciones hay por valor de una faceta, sin ningún filtro. */
export function facetTotals(tracks: readonly Track[], def: FacetDef): Map<string, number> {
  const totals = new Map<string, number>();
  for (const t of tracks) {
    for (const v of new Set(def.values(t))) totals.set(v, (totals.get(v) ?? 0) + 1);
  }
  return totals;
}

/** Cuántas canciones tendría cada valor de la faceta con todos los OTROS filtros aplicados. */
export function facetCounts(
  tracks: readonly Track[],
  filters: FilterState,
  def: FacetDef,
): Map<string, number> {
  const passes = compileFilters(filters, def.key);
  const counts = new Map<string, number>();
  for (const t of tracks) {
    if (!passes(t)) continue;
    for (const v of new Set(def.values(t))) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return counts;
}

// ───────────────────────── Filtros activos (chips) ─────────────────────────

export interface ActiveFilter {
  /** Identifica el filtro para poder quitarlo con removeFilter. */
  id: string;
  label: string;
}

function dateLabel(title: string, r: DateRange): string {
  if (r.from && r.to) return `${title}: ${formatDay(r.from)} – ${formatDay(r.to)}`;
  return r.from ? `${title}: desde ${formatDay(r.from)}` : `${title}: hasta ${formatDay(r.to)}`;
}

export function describeFilters(f: FilterState): ActiveFilter[] {
  const out: ActiveFilter[] = [];
  for (const def of FACETS) {
    for (const value of f.facets[def.key] ?? []) {
      out.push({ id: JSON.stringify(['facet', def.key, value]), label: `${def.label}: ${value}` });
    }
  }
  if (f.explicit !== 'all') {
    out.push({
      id: JSON.stringify(['explicit']),
      label: f.explicit === 'yes' ? 'Solo explícitas' : 'Sin explícitas',
    });
  }
  for (const def of RANGES) {
    const r = f.ranges[def.key];
    if (r) {
      out.push({
        id: JSON.stringify(['range', def.key]),
        label: `${def.label}: ${def.format(r[0])} – ${def.format(r[1])}`,
      });
    }
  }
  if (f.release.from || f.release.to) {
    out.push({ id: JSON.stringify(['release']), label: dateLabel('Lanzamiento', f.release) });
  }
  if (f.added.from || f.added.to) {
    out.push({ id: JSON.stringify(['added']), label: dateLabel('Agregada', f.added) });
  }
  return out;
}

/** Devuelve el estado sin el filtro indicado (un id de describeFilters). */
export function removeFilter(f: FilterState, id: string): FilterState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(id);
  } catch {
    return f;
  }
  if (!Array.isArray(parsed)) return f;
  const [type, a, b] = parsed as [string, string?, string?];

  switch (type) {
    case 'facet': {
      const key = a as FacetKey;
      const rest = (f.facets[key] ?? []).filter((v) => v !== b);
      const facets = { ...f.facets };
      if (rest.length > 0) facets[key] = rest;
      else delete facets[key];
      return { ...f, facets };
    }
    case 'explicit':
      return { ...f, explicit: 'all' };
    case 'range': {
      const ranges = { ...f.ranges };
      delete ranges[a as RangeKey];
      return { ...f, ranges };
    }
    case 'release':
      return { ...f, release: { from: '', to: '' } };
    case 'added':
      return { ...f, added: { from: '', to: '' } };
    default:
      return f;
  }
}
