import '@fontsource-variable/figtree';
import './styles/base.css';
import './styles/table.css';
import './styles/filters.css';

import { columnsWithData, type Column } from './lib/columns';
import { CsvError, parseCsv } from './lib/csv';
import { toCsv } from './lib/export';
import {
  compileFilters,
  describeFilters,
  emptyFilters,
  removeFilter,
  type FilterState,
} from './lib/filters';
import { fmtNumber, formatTotalDuration } from './lib/format';
import { matchesQuery } from './lib/search';
import { nextSort, sortTracks, type SortState } from './lib/sort';
import { loadJson, saveJson } from './lib/storage';
import { parseQuery } from './lib/text';
import type { Track } from './types';
import { ColumnsMenu } from './ui/columns-menu';
import { byId, h } from './ui/dom';
import { FiltersPanel } from './ui/filters-panel';
import { brandMark, icon } from './ui/icons';
import { VirtualTable } from './ui/table';

/** Un CSV de Exportify pesa unos KB; algo mucho más grande no es una playlist. */
const MAX_BYTES = 50 * 1024 * 1024;
const COLUMNS_KEY = 'playlist-viewer:columns';

// ───────────────────────── Estado ─────────────────────────

interface Loaded {
  name: string;
  tracks: Track[];
  /** Solo las columnas para las que el CSV trae datos. */
  columns: Column[];
}

const app = {
  data: null as Loaded | null,
  sort: null as SortState | null,
  query: '',
  filters: emptyFilters(),
  /** Visibilidad elegida por la persona (se recuerda entre visitas). Lo que falta usa el valor por defecto. */
  overrides: loadOverrides(),
  /** Lo que se ve ahora: sirve para exportar exactamente eso. */
  rows: [] as Track[],
  shown: [] as Column[],
};

function loadOverrides(): Record<string, boolean> {
  const raw = loadJson<unknown>(COLUMNS_KEY);
  const out: Record<string, boolean> = {};
  if (raw && typeof raw === 'object') {
    for (const [key, value] of Object.entries(raw)) {
      if (typeof value === 'boolean') out[key] = value;
    }
  }
  return out;
}

const isVisible = (col: Column): boolean => col.kind === 'title' || (app.overrides[col.key] ?? col.defaultVisible);

// ───────────────────────── Elementos ─────────────────────────

const welcome = byId('welcome');
const workspace = byId('workspace');
const btnOpen = byId('btn-open');
const btnChoose = byId('btn-choose');
const fileInput = byId<HTMLInputElement>('file-input');
const heroTitle = byId('hero-title');
const heroMeta = byId('hero-meta');
const search = byId<HTMLInputElement>('search');
const searchClear = byId('search-clear');
const btnFilters = byId('btn-filters');
const btnExport = byId('btn-export');
const btnClear = byId('btn-clear');
const btnEmptyClear = byId('btn-empty-clear');
const btnCloseFilters = byId('btn-close-filters');
const backdrop = byId('backdrop');
const chipsRow = byId('active-filters');
const status = byId('status');
const tableHost = byId('table-host');
const empty = byId('empty');
const overlay = byId('drop-overlay');
const toast = byId('toast');

// Íconos y marca (se dibujan por código, no vienen del HTML)
byId('brand-mark').append(brandMark(28));
byId('dropzone-icon').append(icon('note', 44));
byId('search-icon').append(icon('search', 20));
searchClear.append(icon('close', 16));
btnCloseFilters.append(icon('close', 20));

const filtersBadge = h('span', { class: 'badge', hidden: true });
btnFilters.append(icon('filters', 18), h('span', { class: 'btn__label' }, 'Filtros'), filtersBadge);
btnExport.append(icon('download', 18), h('span', { class: 'btn__label' }, 'Exportar CSV'));
btnExport.title = 'Descarga las canciones y columnas que ves ahora';
btnExport.setAttribute('aria-label', 'Exportar CSV');

// ───────────────────────── Componentes ─────────────────────────

const table = new VirtualTable((col) => {
  app.sort = nextSort(app.sort, col);
  update(true);
});
tableHost.append(table.element);

const panel = new FiltersPanel(byId('filters-body'), (next) => {
  app.filters = next;
  update(true);
});

function saveOverrides(): void {
  saveJson(COLUMNS_KEY, app.overrides);
}

const columnsMenu = new ColumnsMenu(byId('columns-host'), {
  toggle(key, visible) {
    app.overrides[key] = visible;
    saveOverrides();
    update(false);
  },
  showAll() {
    for (const col of app.data?.columns ?? []) app.overrides[col.key] = true;
    saveOverrides();
    if (app.data) columnsMenu.sync(app.data.columns, isVisible);
    update(false);
  },
  reset() {
    app.overrides = {};
    saveOverrides();
    if (app.data) columnsMenu.sync(app.data.columns, isVisible);
    update(false);
  },
});

// ───────────────────────── Actualización de la vista ─────────────────────────

function plural(n: number): string {
  return `${fmtNumber(n)} ${n === 1 ? 'canción' : 'canciones'}`;
}

function totalDuration(tracks: readonly Track[]): number {
  return tracks.reduce((sum, t) => sum + (t.durationMs ?? 0), 0);
}

/** Recalcula qué canciones se ven (búsqueda + filtros + orden) y redibuja. */
function update(resetScroll: boolean): void {
  const data = app.data;
  if (!data) return;

  const shown = data.columns.filter(isVisible);
  // Si se oculta la columna por la que se ordenaba, se vuelve al orden original.
  if (app.sort && !shown.some((col) => col.key === app.sort?.key)) app.sort = null;

  const terms = parseQuery(app.query);
  const passes = compileFilters(app.filters);
  const filtered = data.tracks.filter((t) => passes(t) && matchesQuery(shown, t, terms));
  const sortCol = app.sort ? shown.find((col) => col.key === app.sort?.key) : undefined;
  const rows = sortTracks(filtered, sortCol, app.sort);

  app.rows = rows;
  app.shown = shown;

  table.setData(rows, shown, app.sort, terms, resetScroll);
  tableHost.hidden = rows.length === 0;
  empty.hidden = rows.length !== 0;

  // El total de la playlist ya está en el encabezado: acá solo se informa cuando hay algo filtrado.
  const total = data.tracks.length;
  const duration = totalDuration(rows);
  const count = `${fmtNumber(rows.length)} de ${plural(total)}`;
  status.textContent =
    rows.length === total ? '' : duration > 0 ? `${count} · ${formatTotalDuration(duration)}` : count;

  renderActiveFilters();
}

function renderActiveFilters(): void {
  const active = describeFilters(app.filters);
  chipsRow.hidden = active.length === 0;
  chipsRow.replaceChildren(
    ...active.map((filter) =>
      h(
        'button',
        {
          class: 'fchip',
          type: 'button',
          title: 'Quitar este filtro',
          onclick: () => setFilters(removeFilter(app.filters, filter.id)),
        },
        filter.label,
        icon('close', 12),
      ),
    ),
  );
  // El botón siempre ocupa su lugar (solo se habilita): si apareciera y desapareciera, el panel saltaría.
  (btnClear as HTMLButtonElement).disabled = active.length === 0;
  filtersBadge.hidden = active.length === 0;
  filtersBadge.textContent = String(active.length);
  // En pantallas chicas el botón queda solo con el ícono: el nombre accesible lo da aria-label.
  btnFilters.setAttribute('aria-label', active.length > 0 ? `Filtros (${active.length} activos)` : 'Filtros');
}

function setFilters(next: FilterState): void {
  app.filters = next;
  panel.update(next);
  update(true);
}

function clearAll(): void {
  window.clearTimeout(searchTimer);
  search.value = '';
  searchClear.hidden = true;
  app.query = '';
  setFilters(emptyFilters());
}

btnClear.addEventListener('click', clearAll);
btnEmptyClear.addEventListener('click', clearAll);

// ───────────────────────── Búsqueda ─────────────────────────

let searchTimer = 0;

search.addEventListener('input', () => {
  searchClear.hidden = search.value === '';
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => {
    app.query = search.value;
    update(true);
  }, 90);
});

function clearSearch(): void {
  window.clearTimeout(searchTimer);
  search.value = '';
  searchClear.hidden = true;
  app.query = '';
  update(true);
}

searchClear.addEventListener('click', () => {
  clearSearch();
  search.focus();
});

search.addEventListener('keydown', (ev) => {
  if (ev.key !== 'Escape') return;
  if (search.value) clearSearch();
  else search.blur();
});

// ───────────────────────── Panel de filtros (en pantallas chicas es un cajón) ─────────────────────────

const desktop = window.matchMedia('(min-width: 901px)');

function setFiltersOpen(open: boolean): void {
  workspace.classList.toggle('is-filters-open', open);
  btnFilters.setAttribute('aria-expanded', String(open));
  backdrop.hidden = !(open && !desktop.matches);
}

btnFilters.addEventListener('click', () => setFiltersOpen(!workspace.classList.contains('is-filters-open')));
btnCloseFilters.addEventListener('click', () => setFiltersOpen(false));
backdrop.addEventListener('click', () => setFiltersOpen(false));
desktop.addEventListener('change', () => setFiltersOpen(desktop.matches));

document.addEventListener('keydown', (ev) => {
  if (workspace.hidden) return;
  const target = ev.target;
  const typing =
    target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

  if (ev.key === '/' && !typing && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
    ev.preventDefault();
    search.focus();
    search.select();
  } else if (ev.key === 'Escape' && !desktop.matches && workspace.classList.contains('is-filters-open')) {
    setFiltersOpen(false);
  }
});

// ───────────────────────── Carga de archivos ─────────────────────────

let toastTimer = 0;

function showToast(message: string, error = false): void {
  toast.textContent = message;
  toast.classList.toggle('is-error', error);
  toast.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.hidden = true;
  }, 5000);
}

function playlistName(fileName: string): string {
  return fileName.replace(/\.csv$/i, '').replace(/_+/g, ' ').trim() || 'Playlist';
}

function openPlaylist(name: string, tracks: Track[]): void {
  const columns = columnsWithData(tracks);
  app.data = { name, tracks, columns };
  app.sort = null;
  app.query = '';
  app.filters = emptyFilters();
  search.value = '';
  searchClear.hidden = true;

  heroTitle.textContent = name;
  const duration = totalDuration(tracks);
  heroMeta.textContent = duration > 0 ? `${plural(tracks.length)} · ${formatTotalDuration(duration)}` : plural(tracks.length);
  document.title = `${name} · Playlist Viewer`;

  welcome.hidden = true;
  workspace.hidden = false;
  btnOpen.hidden = false;

  columnsMenu.setColumns(columns, isVisible);
  panel.setTracks(tracks);
  setFiltersOpen(desktop.matches);
  update(true);
}

async function loadFile(file: File): Promise<void> {
  if (/\.zip$/i.test(file.name)) {
    showToast('Eso es un ZIP. Descomprimilo y elegí uno de los CSV de adentro.', true);
    return;
  }
  if (file.size > MAX_BYTES) {
    showToast('El archivo es demasiado grande (máximo 50 MB).', true);
    return;
  }
  try {
    openPlaylist(playlistName(file.name), parseCsv(await file.text()));
  } catch (error) {
    showToast(error instanceof CsvError ? error.message : 'No se pudo leer el archivo.', true);
  }
}

function handleFiles(files: FileList | null | undefined): void {
  const first = files?.[0];
  if (!first) return;
  if (files.length > 1) showToast('Se carga una playlist a la vez: abrí solo el primer archivo.');
  void loadFile(first);
}

btnChoose.addEventListener('click', () => fileInput.click());
btnOpen.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => {
  handleFiles(fileInput.files);
  fileInput.value = ''; // permite volver a elegir el mismo archivo
});

// Arrastrar y soltar en cualquier parte de la página
let dragDepth = 0;
const hasFiles = (ev: DragEvent): boolean => ev.dataTransfer?.types.includes('Files') ?? false;

window.addEventListener('dragenter', (ev) => {
  if (!hasFiles(ev)) return;
  ev.preventDefault();
  dragDepth += 1;
  overlay.hidden = false;
});
window.addEventListener('dragover', (ev) => {
  if (!hasFiles(ev)) return;
  ev.preventDefault();
  if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'copy';
});
window.addEventListener('dragleave', (ev) => {
  if (!hasFiles(ev)) return;
  dragDepth = Math.max(0, dragDepth - 1);
  if (dragDepth === 0) overlay.hidden = true;
});
window.addEventListener('drop', (ev) => {
  if (!hasFiles(ev)) return;
  ev.preventDefault();
  dragDepth = 0;
  overlay.hidden = true;
  handleFiles(ev.dataTransfer?.files);
});

// ───────────────────────── Exportar ─────────────────────────

btnExport.addEventListener('click', () => {
  const data = app.data;
  if (!data) return;
  if (app.rows.length === 0) {
    showToast('No hay canciones para exportar con los filtros actuales.', true);
    return;
  }
  const slug = data.name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '') || 'playlist';
  const url = URL.createObjectURL(new Blob([toCsv(app.shown, app.rows)], { type: 'text/csv;charset=utf-8' }));
  const link = h('a', { href: url, download: `${slug}-vista.csv` });
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
});
