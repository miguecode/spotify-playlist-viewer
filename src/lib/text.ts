/** Rango [inicio, fin) dentro de un string. */
export type Range = [number, number];

const ASCII = /^[\x00-\x7f]*$/;
const MARKS = /\p{M}/gu;

/**
 * Normaliza para comparar: minúsculas y sin tildes.
 * Garantiza que el resultado tenga el mismo largo que el original, así los índices
 * encontrados en el texto normalizado sirven para resaltar el texto original.
 */
export function fold(s: string): string {
  if (ASCII.test(s)) return s.toLowerCase();
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s.charAt(i);
    const folded = ch.normalize('NFD').replace(MARKS, '').toLowerCase();
    if (folded.length === 1) {
      out += folded;
    } else {
      const lower = ch.toLowerCase();
      out += lower.length === 1 ? lower : ch;
    }
  }
  return out;
}

/** Separa la búsqueda en términos normalizados y sin repetir. */
export function parseQuery(query: string): string[] {
  return [...new Set(fold(query).split(/\s+/).filter(Boolean))];
}

/** Todos los términos deben aparecer en el texto (ya normalizado). */
export function matchesAll(foldedText: string, terms: readonly string[]): boolean {
  return terms.every((term) => foldedText.includes(term));
}

/** Posiciones de todas las apariciones de cada término en el texto (ya normalizado). */
export function findRanges(foldedText: string, terms: readonly string[]): Range[] {
  const ranges: Range[] = [];
  for (const term of terms) {
    if (!term) continue;
    let i = foldedText.indexOf(term);
    while (i !== -1) {
      ranges.push([i, i + term.length]);
      i = foldedText.indexOf(term, i + term.length);
    }
  }
  return ranges;
}

/** Une rangos que se pisan o se tocan. */
export function mergeRanges(ranges: readonly Range[]): Range[] {
  const sorted = [...ranges].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged: Range[] = [];
  for (const [start, end] of sorted) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1]) {
      last[1] = Math.max(last[1], end);
    } else {
      merged.push([start, end]);
    }
  }
  return merged;
}
