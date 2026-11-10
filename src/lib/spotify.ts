import type { Track } from '../types';

/** Enlace para abrir la canción en Spotify. El ID ya viene validado (solo letras y números). */
export function trackUrl(track: Track): string | null {
  return track.trackId ? `https://open.spotify.com/track/${track.trackId}` : null;
}
