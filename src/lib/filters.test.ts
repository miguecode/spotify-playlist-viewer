import { describe, expect, it } from 'vitest';
import {
  FACETS,
  RANGES,
  compileFilters,
  describeFilters,
  emptyFilters,
  facetCounts,
  facetTotals,
  rangeBounds,
  removeFilter,
  type FilterState,
} from './filters';
import { makeTrack } from './test-utils';

const a = makeTrack({
  position: 1,
  name: 'A',
  artists: ['FLO'],
  genres: ['r&b'],
  explicit: true,
  popularity: 50,
  releaseDate: '2022-07-08',
  addedDay: '2026-07-14',
});
const b = makeTrack({
  position: 2,
  name: 'B',
  artists: ['FLO', 'GloRilla'],
  genres: ['r&b', 'hip hop'],
  explicit: false,
  popularity: 70,
  releaseDate: '2025-12-12',
  addedDay: '2026-08-11',
});
const c = makeTrack({ position: 3, name: 'C', artists: ['Otro'], genres: ['pop'] });
const all = [a, b, c];

const names = (f: FilterState): string[] =>
  all.filter(compileFilters(f)).map((t) => t.name);

const withFilters = (patch: Partial<FilterState>): FilterState => ({ ...emptyFilters(), ...patch });

describe('compileFilters', () => {
  it('sin filtros deja pasar todo', () => {
    expect(names(emptyFilters())).toEqual(['A', 'B', 'C']);
  });

  it('dentro de una faceta alcanza con un valor (OR)', () => {
    expect(names(withFilters({ facets: { artist: ['GloRilla', 'Otro'] } }))).toEqual(['B', 'C']);
  });

  it('entre filtros distintos deben cumplirse todos (AND)', () => {
    const f = withFilters({ facets: { artist: ['FLO'], genre: ['hip hop'] } });
    expect(names(f)).toEqual(['B']);
  });

  it('explícita sí/no excluye las canciones sin dato', () => {
    expect(names(withFilters({ explicit: 'yes' }))).toEqual(['A']);
    expect(names(withFilters({ explicit: 'no' }))).toEqual(['B']);
  });

  it('los rangos incluyen los extremos y excluyen lo que no tiene dato', () => {
    expect(names(withFilters({ ranges: { popularity: [50, 50] } }))).toEqual(['A']);
    expect(names(withFilters({ ranges: { popularity: [51, 100] } }))).toEqual(['B']);
  });

  it('filtra por fecha de lanzamiento y de agregado', () => {
    expect(names(withFilters({ release: { from: '2025-01-01', to: '' } }))).toEqual(['B']);
    expect(names(withFilters({ release: { from: '', to: '2022-07-08' } }))).toEqual(['A']);
    expect(names(withFilters({ added: { from: '2026-08-01', to: '2026-08-31' } }))).toEqual(['B']);
  });
});

describe('facetas', () => {
  const artist = FACETS.find((d) => d.key === 'artist')!;

  it('facetTotals cuenta cada valor una vez por canción', () => {
    expect(facetTotals(all, artist)).toEqual(
      new Map([
        ['FLO', 2],
        ['GloRilla', 1],
        ['Otro', 1],
      ]),
    );
  });

  it('facetCounts ignora la propia faceta pero respeta las demás', () => {
    const f = withFilters({ facets: { artist: ['Otro'], genre: ['r&b'] } });
    expect(facetCounts(all, f, artist)).toEqual(
      new Map([
        ['FLO', 2],
        ['GloRilla', 1],
      ]),
    );
  });
});

describe('rangeBounds', () => {
  const def = (key: string) => RANGES.find((r) => r.key === key)!;

  it('usa límites fijos cuando existen', () => {
    expect(rangeBounds(def('popularity'), [a])).toEqual([0, 100]);
  });

  it('calcula los límites desde los datos, redondeados al paso', () => {
    const tracks = [makeTrack({ durationMs: 150_000 }), makeTrack({ durationMs: 201_621 })];
    expect(rangeBounds(def('duration'), tracks)).toEqual([150, 202]);
    const loud = [makeTrack({ loudness: -7.233 }), makeTrack({ loudness: -3.389 })];
    expect(rangeBounds(def('loudness'), loud)).toEqual([-7.2, -3.4]);
  });

  it('devuelve null si no hay datos o todos son iguales', () => {
    expect(rangeBounds(def('tempo'), [a])).toBeNull();
    expect(rangeBounds(def('tempo'), [makeTrack({ tempo: 120 }), makeTrack({ tempo: 120 })])).toBeNull();
  });
});

describe('filtros activos', () => {
  const full = withFilters({
    facets: { artist: ['FLO', 'GloRilla'] },
    explicit: 'yes',
    ranges: { popularity: [10, 90] },
    release: { from: '2020-01-01', to: '' },
    added: { from: '', to: '2026-12-31' },
  });

  it('describe cada filtro por separado', () => {
    const labels = describeFilters(full).map((x) => x.label);
    expect(labels).toEqual([
      'Artista: FLO',
      'Artista: GloRilla',
      'Solo explícitas',
      'Popularidad: 10 – 90',
      'Lanzamiento: desde 01/01/2020',
      'Agregada: hasta 31/12/2026',
    ]);
  });

  it('quitar todos los filtros deja el estado vacío', () => {
    let state = full;
    for (const { id } of describeFilters(full)) state = removeFilter(state, id);
    expect(state).toEqual(emptyFilters());
  });

  it('un id desconocido no rompe nada', () => {
    expect(removeFilter(full, 'no es json')).toBe(full);
    expect(removeFilter(full, '["otra"]')).toBe(full);
  });
});
