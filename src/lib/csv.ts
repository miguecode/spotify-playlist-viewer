import Papa from 'papaparse';
import type { Track } from '../types';

/** Error con un mensaje listo para mostrarle a la persona. */
export class CsvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CsvError';
  }
}

type Row = Record<string, string | undefined>;

// Exportify cambió algunos nombres de columna entre versiones; se aceptan las variantes conocidas.
const HEADERS = {
  uri: ['Track URI'],
  name: ['Track Name'],
  album: ['Album Name'],
  artists: ['Artist Name(s)', 'Artist Name'],
  release: ['Release Date', 'Album Release Date'],
  duration: ['Duration (ms)', 'Track Duration (ms)'],
  popularity: ['Popularity'],
  explicit: ['Explicit', 'Explicit?'],
  addedBy: ['Added By'],
  addedAt: ['Added At'],
  genres: ['Genres', 'Artist Genres'],
  label: ['Record Label', 'Label'],
  isrc: ['ISRC'],
  danceability: ['Danceability'],
  energy: ['Energy'],
  key: ['Key'],
  loudness: ['Loudness'],
  mode: ['Mode'],
  speechiness: ['Speechiness'],
  acousticness: ['Acousticness'],
  instrumentalness: ['Instrumentalness'],
  liveness: ['Liveness'],
  valence: ['Valence'],
  tempo: ['Tempo'],
  timeSignature: ['Time Signature'],
} as const;

const REQUIRED = ['Track URI', 'Track Name'];

function get(row: Row, names: readonly string[]): string {
  for (const name of names) {
    const value = row[name]?.trim();
    if (value) return value;
  }
  return '';
}

export function toNumber(s: string): number | null {
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function toBool(s: string): boolean | null {
  const v = s.toLowerCase();
  if (v === 'true' || v === '1' || v === 'yes') return true;
  if (v === 'false' || v === '0' || v === 'no') return false;
  return null;
}

function toTimestamp(s: string): number | null {
  if (!s) return null;
  const ms = Date.parse(s);
  return Number.isNaN(ms) ? null : ms;
}

function splitList(s: string, separator: string): string[] {
  return [...new Set(s.split(separator).map((part) => part.trim()).filter(Boolean))];
}

/** "2022" → "2022-01-01", "2022-07" → "2022-07-01". Devuelve null si no es una fecha válida. */
export function normalizeRelease(raw: string): string | null {
  const m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(raw);
  if (!m) return null;
  return `${m[1]}-${m[2] ?? '01'}-${m[3] ?? '01'}`;
}

/** Día calendario en la zona horaria local, como YYYY-MM-DD. */
export function localDay(ms: number): string {
  const d = new Date(ms);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

function toTrack(row: Row, position: number): Track {
  const uri = get(row, HEADERS.uri);
  const releaseRaw = get(row, HEADERS.release);
  const addedAt = toTimestamp(get(row, HEADERS.addedAt));
  const num = (names: readonly string[]): number | null => toNumber(get(row, names));

  return {
    position,
    uri,
    trackId: /^spotify:track:([A-Za-z0-9]+)$/.exec(uri)?.[1] ?? null,
    isrc: get(row, HEADERS.isrc),
    name: get(row, HEADERS.name),
    album: get(row, HEADERS.album),
    artists: splitList(get(row, HEADERS.artists), ';'),
    releaseDate: normalizeRelease(releaseRaw),
    releaseRaw,
    durationMs: num(HEADERS.duration),
    popularity: num(HEADERS.popularity),
    explicit: toBool(get(row, HEADERS.explicit).toLowerCase()),
    addedBy: get(row, HEADERS.addedBy),
    addedAt,
    addedDay: addedAt === null ? null : localDay(addedAt),
    genres: splitList(get(row, HEADERS.genres), ','),
    label: get(row, HEADERS.label),
    danceability: num(HEADERS.danceability),
    energy: num(HEADERS.energy),
    key: num(HEADERS.key),
    loudness: num(HEADERS.loudness),
    mode: num(HEADERS.mode),
    speechiness: num(HEADERS.speechiness),
    acousticness: num(HEADERS.acousticness),
    instrumentalness: num(HEADERS.instrumentalness),
    liveness: num(HEADERS.liveness),
    valence: num(HEADERS.valence),
    tempo: num(HEADERS.tempo),
    timeSignature: num(HEADERS.timeSignature),
  };
}

const AUDIO_FIELDS = [
  'danceability',
  'energy',
  'key',
  'loudness',
  'mode',
  'speechiness',
  'acousticness',
  'instrumentalness',
  'liveness',
  'valence',
  'tempo',
  'timeSignature',
] as const;

const isZero = (n: number | null): boolean => n === null || n === 0;

/**
 * Cuando Spotify no tiene un dato, Exportify a veces lo escribe como 0 en vez de dejarlo vacío.
 * Un 0 así no es un valor real y mostrarlo (con su barra) engaña, así que se pasa a «sin dato»:
 * - Audio: una canción real nunca tiene tempo 0 ni todas sus medidas principales en 0.
 * - Popularidad: un 0 casi siempre es un dato que Spotify no entregó (desde 2026 quitó el campo de su API
 *   y puede aparecer como 0), así que también se muestra como «sin información».
 */
export function clearPlaceholderZeros(tracks: Track[]): void {
  for (const t of tracks) {
    const noAudio = [t.tempo, t.danceability, t.energy, t.valence, t.loudness].every(isZero);
    if (noAudio) {
      for (const field of AUDIO_FIELDS) t[field] = null;
    } else if (t.timeSignature === 0) {
      t.timeSignature = null;
    }
  }
  for (const t of tracks) {
    if (t.popularity === 0) t.popularity = null;
  }
}

/** Convierte el texto de un CSV de Exportify en canciones. Lanza CsvError si no se puede. */
export function parseCsv(text: string): Track[] {
  const result = Papa.parse<Row>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    // El CSV de Exportify trae un BOM al inicio que se pega al primer nombre de columna.
    transformHeader: (header) => header.replace(/^﻿/, '').trim(),
  });

  const headers = result.meta.fields ?? [];
  const missing = REQUIRED.filter((name) => !headers.includes(name));
  if (missing.length > 0) {
    throw new CsvError(
      `Este archivo no parece una exportación de Exportify: faltan las columnas ${missing.join(' y ')}.`,
    );
  }

  const tracks: Track[] = [];
  for (const row of result.data) {
    const track = toTrack(row, tracks.length + 1);
    if (track.name || track.uri) tracks.push(track);
  }

  if (tracks.length === 0) throw new CsvError('El CSV no tiene canciones.');
  clearPlaceholderZeros(tracks);
  return tracks;
}
