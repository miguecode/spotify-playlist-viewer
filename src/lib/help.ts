/**
 * Explicaciones cortas de cada columna y filtro, para los íconos ⓘ.
 * La clave es la de la columna; los filtros que se llaman distinto apuntan a su columna en FILTER_TO_COLUMN.
 * "#" y "Canción" no llevan ayuda porque se explican solos.
 */
const COLUMN_HELP: Readonly<Record<string, string>> = {
  artists: 'Artistas de la canción. Cuando hay varios, el filtro permite elegir cualquiera de ellos.',
  album: 'Álbum o single en el que salió la canción.',
  release: 'Fecha de lanzamiento del álbum o single en el que salió la canción.',
  addedAt: 'Cuándo se agregó la canción a la playlist, en tu hora local.',
  duration: 'Duración de la canción, en minutos y segundos.',
  popularity:
    'Índice de 0 a 100 que calcula Spotify según cuántas reproducciones recientes tiene. No es el total histórico y cambia con el tiempo: es una foto del momento en que se exportó la playlist.',
  explicit:
    'Spotify marca la canción como explícita cuando su letra tiene contenido explícito. La marca la declara el sello: que no la tenga no garantiza que sea apta para todo público.',
  genres: 'Géneros que Spotify asigna a los artistas de la canción, no a la canción en sí.',
  label: 'Discográfica que publicó el álbum (por ejemplo, EMI o Universal). Es un dato del álbum, no de la canción.',
  tempo:
    'Velocidad estimada, en pulsos por minuto (BPM). Es una estimación automática: a veces sale al doble o a la mitad.',
  tonality: 'Nota base y modo (mayor o menor) estimados por Spotify, por ejemplo «Fa♯ menor».',
  danceability: 'De 0 a 100: qué tan bailable es, según el ritmo, su regularidad y la fuerza del beat.',
  energy: 'De 0 a 100: intensidad y actividad. Lo rápido, fuerte y ruidoso tiene valores altos.',
  valence: 'De 0 a 100: qué tan alegre suena. Alto es alegre o eufórica; bajo, triste o enojada.',
  speechiness:
    'De 0 a 100: presencia de palabras habladas. Sobre 66 es casi todo habla (un podcast), entre 33 y 66 mezcla música y habla (típico del rap) y bajo 33 es mayormente música.',
  acousticness:
    'De 0 a 100: confianza de que la canción sea acústica, es decir, sin instrumentos eléctricos ni electrónicos.',
  instrumentalness: 'De 0 a 100: probabilidad de que no tenga voces. Sobre 50 suele ser un tema instrumental.',
  liveness: 'De 0 a 100: probabilidad de que se haya grabado con público. Sobre 80 suele ser un tema en vivo.',
  loudness:
    'Sonoridad promedio de la grabación, en decibeles, normalmente entre −60 y 0. Cuanto más cerca de 0, más fuerte está masterizada. No es el volumen con el que la escuchás.',
  timeSignature: 'Cantidad de pulsos por compás, estimada por Spotify. 4/4 es el más común.',
  addedBy: 'Usuario que agregó la canción a la playlist. Sirve sobre todo en playlists colaborativas.',
  isrc: 'Código internacional de 12 caracteres que identifica una grabación específica. La misma grabación en un single y en un álbum comparte ISRC, así que sirve para detectar duplicados.',
};

/** Filtros cuya clave no coincide con la de su columna. */
const FILTER_TO_COLUMN: Readonly<Record<string, string>> = {
  artist: 'artists',
  genre: 'genres',
  key: 'tonality',
  added: 'addedAt',
};

export function columnHelp(columnKey: string): string | undefined {
  return COLUMN_HELP[columnKey];
}

export function filterHelp(filterKey: string): string | undefined {
  return COLUMN_HELP[FILTER_TO_COLUMN[filterKey] ?? filterKey];
}
