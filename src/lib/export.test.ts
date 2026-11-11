import { describe, expect, it } from 'vitest';
import { COLUMNS } from './columns';
import { toCsv } from './export';
import { makeTrack } from './test-utils';

const cols = ['name', 'artists', 'loudness'].map((key) => COLUMNS.find((c) => c.key === key)!);

describe('toCsv', () => {
  it('empieza con BOM, usa CRLF y escribe los encabezados', () => {
    const csv = toCsv(cols, []);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toBe('﻿Canción,Artista(s),Sonoridad (dB)\r\n');
  });

  it('entrecomilla comas y comillas', () => {
    const csv = toCsv(cols, [makeTrack({ name: 'Hola, "mundo"', artists: ['A', 'B'] })]);
    expect(csv).toContain('"Hola, ""mundo"""');
  });

  it('neutraliza fórmulas en los textos', () => {
    const csv = toCsv(cols, [makeTrack({ name: '=SUM(A1:A9)' })]);
    expect(csv).toContain("'=SUM(A1:A9)");
  });

  it('no altera los números negativos', () => {
    const csv = toCsv(cols, [makeTrack({ name: 'X', loudness: -4.96 })]);
    expect(csv).toContain(',-4.96\r\n');
  });
});
