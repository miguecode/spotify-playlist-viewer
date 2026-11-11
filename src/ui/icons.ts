// Íconos propios (path en una grilla de 24×24). Son constantes del código, no vienen del CSV.
const PATHS = {
  search:
    '<path d="M10.5 3a7.5 7.5 0 1 0 4.55 13.46l4.74 4.75 1.41-1.42-4.74-4.74A7.5 7.5 0 0 0 10.5 3zm0 2a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11z"/>',
  close:
    '<path d="M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19l5.6-5.6 5.6 5.6 1.4-1.4-5.6-5.6L19 6.4 17.6 5 12 10.6z"/>',
  filters:
    '<path d="M3 6h9.1a3 3 0 0 1 5.8 0H21v2h-3.1a3 3 0 0 1-5.8 0H3zm12 2a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM3 16h3.1a3 3 0 0 1 5.8 0H21v2h-9.1a3 3 0 0 1-5.8 0H3zm6 2a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>',
  columns: '<path d="M4 4h4.5v16H4zm5.75 0h4.5v16h-4.5zM15.5 4H20v16h-4.5z"/>',
  download: '<path d="M11 3h2v9.17l3.59-3.58L18 10l-6 6-6-6 1.41-1.41L11 12.17zM5 19h14v2H5z"/>',
  arrow: '<path d="M12 4.5 18.5 12H14v7.5h-4V12H5.5z"/>',
  chevron: '<path d="m7.4 9.6 4.6 4.6 4.6-4.6L18 11l-6 6-6-6z"/>',
  info: '<path fill-rule="evenodd" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-6h2zm0-8h-2V7h2z"/>',
  note: '<path d="M19 3v12.5a3.5 3.5 0 1 1-2-3.16V7.3L9 9v8.5a3.5 3.5 0 1 1-2-3.16V6z"/>',
} as const;

export type IconName = keyof typeof PATHS;

/** Devuelve un <svg> nuevo listo para insertar. Hereda el color del texto (currentColor). */
export function icon(name: IconName, size = 20): SVGSVGElement {
  const template = document.createElement('template');
  template.innerHTML =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" ` +
    `fill="currentColor" aria-hidden="true" focusable="false">${PATHS[name]}</svg>`;
  return template.content.firstElementChild as SVGSVGElement;
}

/** Marca de la app (mismo dibujo que el favicon). */
export function brandMark(size = 32): SVGSVGElement {
  const template = document.createElement('template');
  template.innerHTML =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${size}" height="${size}" aria-hidden="true" focusable="false">` +
    '<rect width="32" height="32" rx="8" fill="#1ed760"/><path fill="#121212" d="M7 16h4v9H7zm7-9h4v18h-4zm7 6h4v12h-4z"/></svg>';
  return template.content.firstElementChild as SVGSVGElement;
}
