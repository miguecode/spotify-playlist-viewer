/** Una canción de la playlist, ya normalizada a partir de una fila del CSV de Exportify. */
export interface Track {
  /** Posición (desde 1) dentro del CSV original. */
  position: number;
  uri: string;
  /** ID de Spotify si la URI es de una canción (no de un archivo local). */
  trackId: string | null;
  isrc: string;
  name: string;
  album: string;
  artists: string[];
  /** YYYY-MM-DD (si faltan mes o día se completan con 01) o null si no hay fecha. */
  releaseDate: string | null;
  /** Texto original, para mostrar la precisión real (solo año, año-mes o día completo). */
  releaseRaw: string;
  durationMs: number | null;
  popularity: number | null;
  explicit: boolean | null;
  addedBy: string;
  /** Epoch en ms. */
  addedAt: number | null;
  /** Día calendario local (YYYY-MM-DD) de addedAt, para filtrar por fecha. */
  addedDay: string | null;
  genres: string[];
  label: string;
  danceability: number | null;
  energy: number | null;
  key: number | null;
  loudness: number | null;
  mode: number | null;
  speechiness: number | null;
  acousticness: number | null;
  instrumentalness: number | null;
  liveness: number | null;
  valence: number | null;
  tempo: number | null;
  timeSignature: number | null;
}

/** Campos 0–1 de audio que se muestran como porcentaje. */
export type PercentField =
  | 'danceability'
  | 'energy'
  | 'valence'
  | 'speechiness'
  | 'acousticness'
  | 'instrumentalness'
  | 'liveness';
