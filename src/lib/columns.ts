import type { PercentField, Track } from '../types';
import {
  fmtNumber,
  formatAddedAt,
  formatDuration,
  formatReleaseDate,
  keyLabel,
  pct,
} from './format';

/** Cómo se dibuja la celda. */
export type ColumnKind = 'index' | 'title' | 'text' | 'num' | 'bar' | 'chips' | 'explicit';

export interface Column {
  key: string;
  label: string;
  kind: ColumnKind;
  /** Ancho en px. */
  width: number;
  defaultVisible: boolean;
  /** Sentido del primer clic al ordenar. */
  defaultDir: 'asc' | 'desc';
  /** Texto que se muestra (y en el que busca la barra de búsqueda). */
  text(t: Track): string;
  /** Valor para ordenar. null o '' van siempre al final. */
  sortValue(t: Track): string | number | null;
  /** Valor que se escribe al exportar el CSV. */
  exportValue(t: Track): string | number;
  /** Etiquetas individuales (solo kind "chips"). */
  items?(t: Track): string[];
  /** Relleno de la barra, de 0 a 1 (solo kind "bar"). */
  bar?(t: Track): number | null;
}

function percentColumn(field: PercentField, label: string, defaultVisible: boolean): Column {
  return {
    key: field,
    label,
    kind: 'bar',
    width: 160,
    defaultVisible,
    defaultDir: 'desc',
    text: (t) => String(pct(t, field) ?? ''),
    sortValue: (t) => t[field],
    exportValue: (t) => t[field] ?? '',
    bar: (t) => t[field],
  };
}

export const COLUMNS: readonly Column[] = [
  {
    key: 'position',
    label: '#',
    kind: 'index',
    width: 64,
    defaultVisible: true,
    defaultDir: 'asc',
    text: (t) => String(t.position),
    sortValue: (t) => t.position,
    exportValue: (t) => t.position,
  },
  {
    key: 'name',
    label: 'Canción',
    kind: 'title',
    width: 300,
    defaultVisible: true,
    defaultDir: 'asc',
    text: (t) => t.name,
    sortValue: (t) => t.name,
    exportValue: (t) => t.name,
  },
  {
    key: 'artists',
    label: 'Artista(s)',
    kind: 'text',
    width: 220,
    defaultVisible: true,
    defaultDir: 'asc',
    text: (t) => t.artists.join(', '),
    sortValue: (t) => t.artists.join(', '),
    exportValue: (t) => t.artists.join('; '),
  },
  {
    key: 'album',
    label: 'Álbum',
    kind: 'text',
    width: 240,
    defaultVisible: true,
    defaultDir: 'asc',
    text: (t) => t.album,
    sortValue: (t) => t.album,
    exportValue: (t) => t.album,
  },
  {
    key: 'release',
    label: 'Lanzamiento',
    kind: 'text',
    width: 160,
    defaultVisible: true,
    defaultDir: 'desc',
    text: (t) => formatReleaseDate(t.releaseRaw),
    sortValue: (t) => t.releaseDate,
    exportValue: (t) => t.releaseRaw,
  },
  {
    key: 'addedAt',
    label: 'Agregada el',
    kind: 'text',
    width: 190,
    defaultVisible: true,
    defaultDir: 'desc',
    text: (t) => (t.addedAt === null ? '' : formatAddedAt(t.addedAt)),
    sortValue: (t) => t.addedAt,
    exportValue: (t) => (t.addedAt === null ? '' : new Date(t.addedAt).toISOString()),
  },
  {
    key: 'duration',
    label: 'Duración',
    kind: 'num',
    width: 130,
    defaultVisible: true,
    defaultDir: 'desc',
    text: (t) => (t.durationMs === null ? '' : formatDuration(t.durationMs)),
    sortValue: (t) => t.durationMs,
    exportValue: (t) => t.durationMs ?? '',
  },
  {
    key: 'popularity',
    label: 'Popularidad',
    kind: 'bar',
    width: 160,
    defaultVisible: true,
    defaultDir: 'desc',
    text: (t) => String(t.popularity ?? ''),
    sortValue: (t) => t.popularity,
    exportValue: (t) => t.popularity ?? '',
    bar: (t) => (t.popularity === null ? null : t.popularity / 100),
  },
  {
    key: 'explicit',
    label: 'Explícita',
    kind: 'explicit',
    width: 130,
    defaultVisible: true,
    defaultDir: 'desc',
    text: (t) => (t.explicit ? 'Explícita' : ''),
    sortValue: (t) => (t.explicit === null ? null : t.explicit ? 1 : 0),
    exportValue: (t) => (t.explicit === null ? '' : String(t.explicit)),
  },
  {
    key: 'genres',
    label: 'Géneros',
    kind: 'chips',
    width: 260,
    defaultVisible: true,
    defaultDir: 'asc',
    text: (t) => t.genres.join(', '),
    sortValue: (t) => t.genres.join(', '),
    exportValue: (t) => t.genres.join(', '),
    items: (t) => t.genres,
  },
  {
    key: 'label',
    label: 'Sello',
    kind: 'text',
    width: 200,
    defaultVisible: true,
    defaultDir: 'asc',
    text: (t) => t.label,
    sortValue: (t) => t.label,
    exportValue: (t) => t.label,
  },
  {
    key: 'tempo',
    label: 'BPM',
    kind: 'num',
    width: 110,
    defaultVisible: true,
    defaultDir: 'desc',
    text: (t) => (t.tempo === null ? '' : String(Math.round(t.tempo))),
    sortValue: (t) => t.tempo,
    exportValue: (t) => t.tempo ?? '',
  },
  {
    key: 'tonality',
    label: 'Tonalidad',
    kind: 'text',
    width: 140,
    defaultVisible: true,
    defaultDir: 'asc',
    text: (t) => keyLabel(t.key, t.mode),
    // Ordena por nota y, a igual nota, menor antes que mayor. -1 = sin detectar.
    sortValue: (t) => (t.key === null || t.key < 0 ? null : t.key * 2 + (t.mode === 1 ? 1 : 0)),
    exportValue: (t) => keyLabel(t.key, t.mode),
  },
  percentColumn('danceability', 'Bailabilidad', true),
  percentColumn('energy', 'Energía', true),
  percentColumn('valence', 'Positividad', true),
  percentColumn('speechiness', 'Hablado', false),
  percentColumn('acousticness', 'Acústica', false),
  percentColumn('instrumentalness', 'Instrumental', false),
  percentColumn('liveness', 'En vivo', false),
  {
    key: 'loudness',
    label: 'Sonoridad (dB)',
    kind: 'num',
    width: 180,
    defaultVisible: false,
    defaultDir: 'desc',
    text: (t) => (t.loudness === null ? '' : fmtNumber(t.loudness, 1)),
    sortValue: (t) => t.loudness,
    exportValue: (t) => t.loudness ?? '',
  },
  {
    key: 'timeSignature',
    label: 'Compás',
    kind: 'num',
    width: 120,
    defaultVisible: false,
    defaultDir: 'asc',
    text: (t) => (t.timeSignature === null ? '' : `${t.timeSignature}/4`),
    sortValue: (t) => t.timeSignature,
    exportValue: (t) => t.timeSignature ?? '',
  },
  {
    key: 'addedBy',
    label: 'Agregada por',
    kind: 'text',
    width: 220,
    defaultVisible: false,
    defaultDir: 'asc',
    text: (t) => t.addedBy,
    sortValue: (t) => t.addedBy,
    exportValue: (t) => t.addedBy,
  },
  {
    key: 'isrc',
    label: 'ISRC',
    kind: 'text',
    width: 150,
    defaultVisible: false,
    defaultDir: 'asc',
    text: (t) => t.isrc,
    sortValue: (t) => t.isrc,
    exportValue: (t) => t.isrc,
  },
];

/** Una columna solo se ofrece si el CSV trae datos para ella (por ejemplo, sin audio features no hay "Energía"). */
export function columnsWithData(tracks: readonly Track[]): Column[] {
  return COLUMNS.filter((col) => {
    if (col.kind === 'index' || col.kind === 'title') return true;
    return tracks.some((t) => {
      const v = col.sortValue(t);
      return v !== null && v !== '';
    });
  });
}
