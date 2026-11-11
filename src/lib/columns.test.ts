import { describe, expect, it } from 'vitest';
import { COLUMNS, columnsWithData, exportColumns } from './columns';
import { makeTrack } from './test-utils';

const labels = (cols: readonly { label: string }[]): string[] => cols.map((c) => c.label);

describe('orden y visibilidad por defecto de las columnas', () => {
  it('respeta el orden pedido y deja el resto como estaba', () => {
    expect(labels(COLUMNS).slice(0, 11)).toEqual([
      '#',
      'Canción',
      'Artista(s)',
      'Álbum',
      'Lanzamiento',
      'Duración',
      'Género',
      'Popularidad',
      'Agregada por',
      'Agregada el',
      'Sello',
    ]);
    expect(labels(COLUMNS).slice(11, 15)).toEqual(['BPM', 'Tonalidad', 'Bailabilidad', 'Energía']);
  });

  it('por defecto solo se ven los datos principales', () => {
    const visible = COLUMNS.filter((c) => c.defaultVisible).map((c) => c.label);
    expect(visible).toEqual(['#', 'Canción', 'Artista(s)', 'Álbum', 'Lanzamiento', 'Duración', 'Género', 'Popularidad']);
  });

  it('«Explícita» ya no es una columna de la tabla', () => {
    expect(COLUMNS.some((c) => c.key === 'explicit')).toBe(false);
  });
});

describe('columnas sin dato', () => {
  it('popularidad y audio se ofrecen siempre, para poder decir «Sin dato»', () => {
    const keys = columnsWithData([makeTrack()]).map((c) => c.key);
    expect(keys).toContain('popularity');
    expect(keys).toContain('tempo');
    expect(keys).toContain('energy');
    expect(keys).not.toContain('label');
  });

  it('las celdas sin valor no producen texto (la tabla muestra «Sin dato»)', () => {
    const t = makeTrack();
    for (const col of COLUMNS.filter((c) => c.unknown)) expect(col.text(t)).toBe('');
  });
});

describe('exportColumns', () => {
  const visible = COLUMNS.filter((c) => c.defaultVisible);

  it('agrega «Explícita» justo después de la canción si hay dato', () => {
    const out = exportColumns(visible, [makeTrack({ explicit: true })]);
    expect(labels(out).slice(0, 4)).toEqual(['#', 'Canción', 'Explícita', 'Artista(s)']);
    expect(out[2]?.exportValue(makeTrack({ explicit: true }))).toBe('true');
  });

  it('no la agrega si el CSV no trae el dato', () => {
    expect(exportColumns(visible, [makeTrack()])).toHaveLength(visible.length);
  });
});
