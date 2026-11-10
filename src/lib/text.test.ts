import { describe, expect, it } from 'vitest';
import { findRanges, fold, matchesAll, mergeRanges, parseQuery } from './text';

describe('fold', () => {
  it('ignora mayúsculas y tildes', () => {
    expect(fold('Británico')).toBe('britanico');
    expect(fold('ÁÉÍÓÚ ñ')).toBe('aeiou n');
  });

  it('mantiene el largo del texto original para poder resaltar por posición', () => {
    for (const s of ['Canción Ñandú', 'Get It Till I’m Gone', 'Touché', 'ß İstanbul 🎵']) {
      expect(fold(s)).toHaveLength(s.length);
    }
  });
});

describe('parseQuery', () => {
  it('separa en términos normalizados y sin repetir', () => {
    expect(parseQuery('  Hola  hóLA mundo ')).toEqual(['hola', 'mundo']);
    expect(parseQuery('   ')).toEqual([]);
  });
});

describe('búsqueda y resaltado', () => {
  it('matchesAll exige todos los términos', () => {
    expect(matchesAll('flo r&b británico', ['flo', 'r&b'])).toBe(true);
    expect(matchesAll('flo r&b', ['flo', 'pop'])).toBe(false);
  });

  it('findRanges encuentra todas las apariciones', () => {
    expect(findRanges('hello world', ['o'])).toEqual([
      [4, 5],
      [7, 8],
    ]);
  });

  it('mergeRanges une rangos que se pisan o se tocan', () => {
    expect(
      mergeRanges([
        [7, 8],
        [0, 3],
        [2, 5],
        [8, 9],
      ]),
    ).toEqual([
      [0, 5],
      [7, 9],
    ]);
  });
});
