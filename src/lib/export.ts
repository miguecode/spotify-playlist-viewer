import type { Track } from '../types';
import type { Column } from './columns';

/**
 * Un texto que empieza con = + - @ se interpreta como fórmula al abrir el CSV en Excel o Sheets.
 * Se le antepone una comilla simple para que se lea como texto.
 */
function escapeCell(value: string | number): string {
  if (typeof value === 'number') return String(value);
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** CSV de las filas y columnas indicadas, con BOM para que Excel respete los acentos. */
export function toCsv(columns: readonly Column[], rows: readonly Track[]): string {
  const lines = [
    columns.map((col) => escapeCell(col.label)).join(','),
    ...rows.map((t) => columns.map((col) => escapeCell(col.exportValue(t))).join(',')),
  ];
  return '﻿' + lines.join('\r\n') + '\r\n';
}
