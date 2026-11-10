import type { Track } from '../types';

/** Canción de prueba con todos los campos vacíos, salvo los que se indiquen. */
export function makeTrack(overrides: Partial<Track> = {}): Track {
  return {
    position: 1,
    uri: 'spotify:track:AAAAAAAAAAAAAAAAAAAAAA',
    trackId: 'AAAAAAAAAAAAAAAAAAAAAA',
    isrc: '',
    name: 'Canción',
    album: '',
    artists: [],
    releaseDate: null,
    releaseRaw: '',
    durationMs: null,
    popularity: null,
    explicit: null,
    addedBy: '',
    addedAt: null,
    addedDay: null,
    genres: [],
    label: '',
    danceability: null,
    energy: null,
    key: null,
    loudness: null,
    mode: null,
    speechiness: null,
    acousticness: null,
    instrumentalness: null,
    liveness: null,
    valence: null,
    tempo: null,
    timeSignature: null,
    ...overrides,
  };
}
