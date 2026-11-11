import { describe, expect, it } from 'vitest';
import { COLUMNS } from './columns';
import { FACETS, RANGES } from './filters';
import { columnHelp, filterHelp } from './help';

describe('textos de ayuda', () => {
  it('toda columna (salvo # y Canción) tiene explicación', () => {
    const missing = COLUMNS.filter((c) => c.kind !== 'index' && c.kind !== 'title' && !columnHelp(c.key)).map(
      (c) => c.key,
    );
    expect(missing).toEqual([]);
  });

  it('todo filtro tiene explicación', () => {
    const keys = [...FACETS.map((f) => f.key), ...RANGES.map((r) => r.key), 'release', 'added', 'explicit'];
    const missing = keys.filter((key) => !filterHelp(key));
    expect(missing).toEqual([]);
  });

  it('los textos no están vacíos ni son demasiado largos para un globo de ayuda', () => {
    for (const col of COLUMNS) {
      const text = columnHelp(col.key);
      if (text === undefined) continue;
      expect(text.trim().length, col.key).toBeGreaterThan(10);
      expect(text.length, col.key).toBeLessThan(260);
    }
  });

  it('un filtro y su columna comparten la misma explicación', () => {
    expect(filterHelp('artist')).toBe(columnHelp('artists'));
    expect(filterHelp('key')).toBe(columnHelp('tonality'));
    expect(filterHelp('loudness')).toBe(columnHelp('loudness'));
  });
});
