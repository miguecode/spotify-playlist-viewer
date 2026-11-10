import { describe, expect, it } from 'vitest';
import { COLUMNS, type Column } from './columns';
import { matchesQuery } from './search';
import { nextSort, sortTracks } from './sort';
import { parseQuery } from './text';
import { makeTrack } from './test-utils';

const col = (key: string): Column => COLUMNS.find((c) => c.key === key)!;

describe('nextSort', () => {
  it('numéricas: primero descendente, luego ascendente, luego sin orden', () => {
    const popularity = col('popularity');
    const first = nextSort(null, popularity);
    expect(first).toEqual({ key: 'popularity', dir: 'desc' });
    const second = nextSort(first, popularity);
    expect(second).toEqual({ key: 'popularity', dir: 'asc' });
    expect(nextSort(second, popularity)).toBeNull();
  });

  it('texto: primero ascendente', () => {
    expect(nextSort(null, col('name'))).toEqual({ key: 'name', dir: 'asc' });
  });

  it('al cambiar de columna arranca por el sentido natural de la nueva', () => {
    expect(nextSort({ key: 'name', dir: 'desc' }, col('popularity'))).toEqual({
      key: 'popularity',
      dir: 'desc',
    });
  });
});

describe('sortTracks', () => {
  const t1 = makeTrack({ position: 1, popularity: 10 });
  const t2 = makeTrack({ position: 2, popularity: null });
  const t3 = makeTrack({ position: 3, popularity: 90 });
  const t4 = makeTrack({ position: 4, popularity: 10 });
  const rows = [t1, t2, t3, t4];

  it('los vacíos van siempre al final, sea cual sea el sentido', () => {
    const desc = sortTracks(rows, col('popularity'), { key: 'popularity', dir: 'desc' });
    expect(desc.map((t) => t.position)).toEqual([3, 1, 4, 2]);
    const asc = sortTracks(rows, col('popularity'), { key: 'popularity', dir: 'asc' });
    expect(asc.map((t) => t.position)).toEqual([1, 4, 3, 2]);
  });

  it('ordena texto con números naturales (2 antes que 10)', () => {
    const tracks = [
      makeTrack({ position: 1, name: 'Track 10' }),
      makeTrack({ position: 2, name: 'Track 2' }),
    ];
    const sorted = sortTracks(tracks, col('name'), { key: 'name', dir: 'asc' });
    expect(sorted.map((t) => t.name)).toEqual(['Track 2', 'Track 10']);
  });

  it('sin orden devuelve una copia en el orden original', () => {
    const copy = sortTracks(rows, undefined, null);
    expect(copy).toEqual(rows);
    expect(copy).not.toBe(rows);
  });
});

describe('matchesQuery', () => {
  const t = makeTrack({ name: 'Check', artists: ['FLO'], album: 'Británico' });
  const cols = [col('name'), col('artists'), col('album')];

  it('encuentra cada término en cualquier columna visible', () => {
    expect(matchesQuery(cols, t, parseQuery('flo che'))).toBe(true);
    expect(matchesQuery(cols, t, parseQuery('flo xyz'))).toBe(false);
  });

  it('ignora tildes y mayúsculas', () => {
    expect(matchesQuery(cols, t, parseQuery('BRITANICO'))).toBe(true);
  });

  it('no busca en columnas que no están visibles', () => {
    expect(matchesQuery([col('name')], t, parseQuery('flo'))).toBe(false);
  });

  it('una búsqueda vacía deja pasar todo', () => {
    expect(matchesQuery(cols, t, [])).toBe(true);
  });
});
