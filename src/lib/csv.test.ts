import { describe, expect, it } from 'vitest';
import floCsv from '../../fixtures/flo.csv?raw';
import { CsvError, normalizeRelease, parseCsv } from './csv';

describe('parseCsv con el CSV real de Exportify (flo)', () => {
  const tracks = parseCsv(floCsv);

  it('lee todas las canciones, aunque el primer encabezado traiga BOM', () => {
    expect(tracks).toHaveLength(24);
    expect(tracks[0]?.uri).toBe('spotify:track:1CcorUngVSo7k2GX8GLB53');
  });

  it('convierte los campos a su tipo', () => {
    expect(tracks[0]).toMatchObject({
      position: 1,
      trackId: '1CcorUngVSo7k2GX8GLB53',
      name: 'Feature Me',
      album: 'The Lead',
      artists: ['FLO'],
      releaseDate: '2022-07-08',
      durationMs: 201621,
      popularity: 50,
      explicit: false,
      genres: ['r&b británico'],
      tempo: 127.03,
      key: 6,
      mode: 0,
      timeSignature: 4,
    });
    expect(tracks[0]?.addedAt).toBe(Date.parse('2026-08-06T16:39:13Z'));
  });

  it('separa varios artistas (;) y varios géneros (,)', () => {
    const pretty = tracks.find((t) => t.name.startsWith('Pretty Eyes'));
    expect(pretty?.artists).toEqual(['sunkis', 'FLO']);
    expect(pretty?.genres).toEqual(['r&b chino', 'r&b británico']);
  });
});

describe('parseCsv con casos límite', () => {
  it('rechaza archivos que no son de Exportify', () => {
    expect(() => parseCsv('a,b\n1,2\n')).toThrow(CsvError);
  });

  it('avisa si no hay canciones', () => {
    expect(() => parseCsv('Track URI,Track Name\n')).toThrow('no tiene canciones');
  });

  it('acepta el BOM suelto y campos con comas entre comillas', () => {
    const [t] = parseCsv('﻿Track URI,Track Name\nspotify:track:abc123,"Hola, mundo"\n');
    expect(t?.name).toBe('Hola, mundo');
  });

  it('deja en null los números vacíos en vez de convertirlos en 0', () => {
    const [t] = parseCsv('Track URI,Track Name,Popularity\nspotify:track:abc123,X,\n');
    expect(t?.popularity).toBeNull();
  });

  it('no arma enlace para archivos locales', () => {
    const [t] = parseCsv('Track URI,Track Name\nspotify:local:a:b:c:1,X\n');
    expect(t?.trackId).toBeNull();
  });

  it('no deja pasar IDs con caracteres raros', () => {
    const [t] = parseCsv('Track URI,Track Name\nspotify:track:abc"><script>,X\n');
    expect(t?.trackId).toBeNull();
  });
});

describe('normalizeRelease', () => {
  it('completa mes y día faltantes', () => {
    expect(normalizeRelease('2022')).toBe('2022-01-01');
    expect(normalizeRelease('2022-07')).toBe('2022-07-01');
    expect(normalizeRelease('2022-07-08')).toBe('2022-07-08');
  });

  it('devuelve null si no es una fecha', () => {
    expect(normalizeRelease('')).toBeNull();
    expect(normalizeRelease('ayer')).toBeNull();
  });
});

describe('valores en 0 que en realidad son «sin dato»', () => {
  const header = 'Track URI,Track Name,Popularity,Danceability,Energy,Key,Loudness,Mode,Speechiness,Acousticness,Instrumentalness,Liveness,Valence,Tempo,Time Signature';
  const row = (name: string, values: string) => `spotify:track:AAAAAAAAAAAAAAAAAAAAAA,${name},${values}`;

  it('si todas las medidas de audio vienen en 0, la canción queda sin datos de audio', () => {
    const [t] = parseCsv([header, row('A', '40,0,0,0,0,0,0,0,0,0,0,0,0')].join('\n'));
    expect(t).toMatchObject({ popularity: 40, danceability: null, energy: null, key: null, tempo: null, timeSignature: null });
  });

  it('una canción con audio real conserva sus valores, incluso un 0 legítimo', () => {
    const [t] = parseCsv([header, row('A', '40,0.5,0.7,0,-5.2,1,0,0.1,0,0.1,0.4,120,4')].join('\n'));
    expect(t).toMatchObject({ key: 0, speechiness: 0, instrumentalness: 0, tempo: 120, timeSignature: 4 });
  });

  it('si toda la playlist tiene popularidad 0, no hay dato de popularidad', () => {
    const tracks = parseCsv([header, row('A', '0,0.5,0.7,0,-5,1,0,0,0,0,0.4,120,4'), row('B', '0,0.5,0.7,0,-5,1,0,0,0,0,0.4,120,4')].join('\n'));
    expect(tracks.map((t) => t.popularity)).toEqual([null, null]);
  });

  it('un 0 de popularidad aislado se respeta', () => {
    const tracks = parseCsv([header, row('A', '0,0.5,0.7,0,-5,1,0,0,0,0,0.4,120,4'), row('B', '55,0.5,0.7,0,-5,1,0,0,0,0,0.4,120,4')].join('\n'));
    expect(tracks.map((t) => t.popularity)).toEqual([0, 55]);
  });
});
