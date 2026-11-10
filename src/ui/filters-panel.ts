import { localDay } from '../lib/csv';
import {
  FACETS,
  RANGES,
  dayBounds,
  emptyFilters,
  facetCounts,
  facetTotals,
  rangeBounds,
  type DateRange,
  type ExplicitFilter,
  type FacetDef,
  type FacetKey,
  type FilterState,
  type RangeDef,
  type RangeKey,
} from '../lib/filters';
import { fmtNumber } from '../lib/format';
import { fold } from '../lib/text';
import type { Track } from '../types';
import { h, type Child } from './dom';
import { icon } from './icons';

/** Lo que cada sección necesita para leer y cambiar el estado de los filtros. */
interface Ctx {
  tracks: readonly Track[];
  get(): FilterState;
  set(next: FilterState): void;
}

interface Section {
  el: HTMLElement;
  /** Refleja el estado de los filtros en los controles. */
  sync(f: FilterState): void;
}

/** Cuántos valores se dibujan de una vez en una lista de casillas (el resto aparece con "Mostrar más" o buscando). */
const PAGE = 60;
/** Una lista con más valores que esto muestra un buscador. */
const SEARCH_FROM = 8;

// ───────────────────────── Armado de secciones ─────────────────────────

function makeSection(title: string, open: boolean, ...body: Child[]) {
  const badge = h('span', { class: 'fsec__badge', hidden: true });
  const chevron = icon('chevron', 18);
  chevron.classList.add('fsec__chev');
  const el = h(
    'details',
    { class: 'fsec', open },
    h('summary', { class: 'fsec__head' }, h('span', { class: 'fsec__title' }, title), badge, chevron),
    h('div', { class: 'fsec__body' }, ...body),
  );
  const setCount = (n: number): void => {
    badge.hidden = n === 0;
    badge.textContent = String(n);
  };
  return { el, setCount };
}

// ───────────────────────── Fechas ─────────────────────────

interface Preset {
  label: string;
  range: DateRange;
}

const sameRange = (a: DateRange, b: DateRange): boolean => a.from === b.from && a.to === b.to;

function dateSection(
  ctx: Ctx,
  title: string,
  field: 'release' | 'added',
  bounds: [string, string],
  presets: Preset[],
  open: boolean,
): Section {
  const from = h('input', {
    type: 'date',
    class: 'input',
    min: bounds[0],
    max: bounds[1],
    'aria-label': `${title}: desde`,
  });
  const to = h('input', {
    type: 'date',
    class: 'input',
    min: bounds[0],
    max: bounds[1],
    'aria-label': `${title}: hasta`,
  });

  const apply = (range: DateRange): void => {
    // Si las fechas quedaron al revés, se dan vuelta en vez de dejar un rango imposible.
    const fixed = range.from && range.to && range.from > range.to ? { from: range.to, to: range.from } : range;
    ctx.set({ ...ctx.get(), [field]: fixed });
  };
  from.addEventListener('change', () => apply({ from: from.value, to: to.value }));
  to.addEventListener('change', () => apply({ from: from.value, to: to.value }));

  const buttons = presets.map((preset) => {
    const button = h(
      'button',
      {
        class: 'preset',
        type: 'button',
        // Volver a tocar un atajo activo lo quita.
        onclick: () => apply(sameRange(ctx.get()[field], preset.range) ? { from: '', to: '' } : preset.range),
      },
      preset.label,
    );
    return { preset, button };
  });

  const section = makeSection(
    title,
    open,
    buttons.length > 0 ? h('div', { class: 'presets' }, ...buttons.map((b) => b.button)) : null,
    h(
      'div',
      { class: 'field-row' },
      h('label', { class: 'field' }, 'Desde', from),
      h('label', { class: 'field' }, 'Hasta', to),
    ),
  );

  return {
    el: section.el,
    sync(f) {
      const range = f[field];
      from.value = range.from;
      to.value = range.to;
      for (const { preset, button } of buttons) {
        button.classList.toggle('is-active', sameRange(range, preset.range));
      }
      section.setCount(range.from || range.to ? 1 : 0);
    },
  };
}

/** Décadas de lanzamiento presentes en la playlist (hasta 6, las más recientes). Solo sirven si hay más de una. */
function decadePresets(bounds: [string, string]): Preset[] {
  const first = Math.floor(Number(bounds[0].slice(0, 4)) / 10) * 10;
  const last = Math.floor(Number(bounds[1].slice(0, 4)) / 10) * 10;
  if (!Number.isFinite(first) || !Number.isFinite(last) || first === last) return [];
  const out: Preset[] = [];
  for (let decade = last; decade >= first && out.length < 6; decade -= 10) {
    out.push({ label: `${decade}s`, range: { from: `${decade}-01-01`, to: `${decade + 9}-12-31` } });
  }
  return out.reverse();
}

function addedPresets(): Preset[] {
  const daysAgo = (n: number): string => localDay(Date.now() - n * 86_400_000);
  return [
    { label: 'Últimos 7 días', range: { from: daysAgo(7), to: '' } },
    { label: 'Últimos 30 días', range: { from: daysAgo(30), to: '' } },
    { label: 'Este año', range: { from: `${new Date().getFullYear()}-01-01`, to: '' } },
  ];
}

// ───────────────────────── Explícita ─────────────────────────

function explicitSection(ctx: Ctx): Section {
  const options: [ExplicitFilter, string][] = [
    ['all', 'Todas'],
    ['yes', 'Explícitas'],
    ['no', 'No explícitas'],
  ];
  const buttons = options.map(([value, label]) => ({
    value,
    button: h(
      'button',
      {
        class: 'preset',
        type: 'button',
        'aria-pressed': 'false',
        onclick: () => ctx.set({ ...ctx.get(), explicit: value }),
      },
      label,
    ),
  }));
  const section = makeSection('Contenido explícito', false, h('div', { class: 'presets' }, ...buttons.map((b) => b.button)));

  return {
    el: section.el,
    sync(f) {
      for (const { value, button } of buttons) {
        const active = f.explicit === value;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', String(active));
      }
      section.setCount(f.explicit === 'all' ? 0 : 1);
    },
  };
}

// ───────────────────────── Facetas (listas de casillas) ─────────────────────────

function facetSection(ctx: Ctx, def: FacetDef, open: boolean): Section | null {
  const totals = facetTotals(ctx.tracks, def);
  if (totals.size < 2) return null; // con un solo valor no hay nada que filtrar

  const values = [...totals.keys()].sort(
    (a, b) => (totals.get(b) ?? 0) - (totals.get(a) ?? 0) || a.localeCompare(b, 'es'),
  );
  const foldedValues = new Map(values.map((v) => [v, fold(v)]));

  let query = '';
  let limit = PAGE;
  let counts = new Map<string, number>();
  const items = new Map<string, { input: HTMLInputElement; count: HTMLElement; row: HTMLElement }>();

  const list = h('div', { class: 'opts' });
  const empty = h('p', { class: 'fsec__empty', hidden: true }, 'Sin resultados');
  const more = h('button', {
    class: 'btn btn--text',
    type: 'button',
    onclick: () => {
      limit += PAGE;
      build();
    },
  });

  const toggle = (value: string, on: boolean): void => {
    const f = ctx.get();
    const current = f.facets[def.key] ?? [];
    const next = on ? [...current, value] : current.filter((v) => v !== value);
    const facets = { ...f.facets };
    if (next.length > 0) facets[def.key] = next;
    else delete facets[def.key];
    ctx.set({ ...f, facets });
  };

  const option = (value: string, checked: boolean): HTMLElement => {
    const input = h('input', { type: 'checkbox', checked, onchange: () => toggle(value, input.checked) });
    const count = h('span', { class: 'opt__count' });
    const row = h('label', { class: 'opt' }, input, h('span', { class: 'opt__name', title: value }, value), count);
    items.set(value, { input, count, row });
    return row;
  };

  const paint = (): void => {
    for (const [value, item] of items) {
      const n = counts.get(value) ?? 0;
      item.count.textContent = fmtNumber(n);
      item.row.classList.toggle('is-zero', n === 0 && !item.input.checked);
    }
  };

  // Se reconstruye solo al buscar o al pedir más; al tildar casillas solo se actualizan contadores (no salta el scroll).
  const build = (): void => {
    const selected = new Set(ctx.get().facets[def.key] ?? []);
    const q = fold(query.trim());
    const matching = values.filter((v) => !q || (foldedValues.get(v) ?? '').includes(q));
    // Los valores elegidos van primero para que no queden escondidos detrás de "Mostrar más".
    const ordered = [...matching.filter((v) => selected.has(v)), ...matching.filter((v) => !selected.has(v))];
    items.clear();
    list.replaceChildren(...ordered.slice(0, limit).map((v) => option(v, selected.has(v))));
    more.hidden = ordered.length <= limit;
    more.textContent = `Mostrar más (${fmtNumber(ordered.length - limit)} restantes)`;
    empty.hidden = ordered.length > 0;
    paint();
  };

  const search =
    values.length > SEARCH_FROM
      ? h('input', {
          type: 'search',
          class: 'input',
          placeholder: `Buscar ${def.label.toLowerCase()}…`,
          autocomplete: 'off',
          spellcheck: 'false',
          'aria-label': `Buscar ${def.label.toLowerCase()}`,
          oninput: (ev: Event) => {
            query = (ev.target as HTMLInputElement).value;
            limit = PAGE;
            build();
          },
        })
      : null;

  const section = makeSection(def.label, open, search, list, empty, more);
  build();

  return {
    el: section.el,
    sync(f) {
      counts = facetCounts(ctx.tracks, f, def);
      const selected = new Set(f.facets[def.key] ?? []);
      for (const [value, item] of items) item.input.checked = selected.has(value);
      paint();
      section.setCount(selected.size);
    },
  };
}

// ───────────────────────── Rangos (slider doble) ─────────────────────────

interface RangeItem {
  key: RangeKey;
  el: HTMLElement;
  sync(f: FilterState): void;
}

function rangeItem(ctx: Ctx, def: RangeDef, bounds: [number, number]): RangeItem {
  const [min, max] = bounds;
  const make = (label: string) =>
    h('input', { type: 'range', min, max, step: def.step, value: label === 'lo' ? min : max, 'aria-label': `${def.label}: ${label === 'lo' ? 'mínimo' : 'máximo'}` });
  const lo = make('lo');
  const hi = make('hi');
  const text = h('span', { class: 'range__text' });
  const box = h('div', { class: 'range__box' }, h('div', { class: 'range__track' }, h('div', { class: 'range__fill' })), lo, hi);
  const el = h(
    'div',
    { class: 'range' },
    h('div', { class: 'range__head' }, h('span', { class: 'range__label' }, def.label), text),
    box,
  );

  const percent = (n: number): string => `${((n - min) / (max - min)) * 100}%`;

  const paint = (): void => {
    const a = lo.valueAsNumber;
    const b = hi.valueAsNumber;
    const active = a > min || b < max;
    box.style.setProperty('--lo', percent(a));
    box.style.setProperty('--hi', percent(b));
    // Si los dos tiradores quedan juntos en el extremo derecho, el de abajo tiene que poder agarrarse.
    lo.style.zIndex = a > (min + max) / 2 ? '3' : '2';
    hi.style.zIndex = '2';
    el.classList.toggle('is-active', active);
    text.textContent = active ? `${def.format(a)} – ${def.format(b)}` : 'Todos';
  };

  const commit = (): void => {
    const a = lo.valueAsNumber;
    const b = hi.valueAsNumber;
    const f = ctx.get();
    const ranges = { ...f.ranges };
    if (a <= min && b >= max) delete ranges[def.key];
    else ranges[def.key] = [a, b];
    ctx.set({ ...f, ranges });
  };

  // Un tirador nunca pasa al otro: se frena contra él.
  lo.addEventListener('input', () => {
    if (lo.valueAsNumber > hi.valueAsNumber) lo.value = hi.value;
    commit();
  });
  hi.addEventListener('input', () => {
    if (hi.valueAsNumber < lo.valueAsNumber) hi.value = lo.value;
    commit();
  });

  return {
    key: def.key,
    el,
    sync(f) {
      const range = f.ranges[def.key];
      lo.value = String(range?.[0] ?? min);
      hi.value = String(range?.[1] ?? max);
      paint();
    },
  };
}

function rangeGroup(ctx: Ctx, title: string, keys: RangeKey[], open: boolean): Section | null {
  const items: RangeItem[] = [];
  for (const key of keys) {
    const def = RANGES.find((r) => r.key === key);
    const bounds = def ? rangeBounds(def, ctx.tracks) : null;
    if (def && bounds) items.push(rangeItem(ctx, def, bounds));
  }
  if (items.length === 0) return null;

  const section = makeSection(title, open, ...items.map((i) => i.el));
  return {
    el: section.el,
    sync(f) {
      for (const item of items) item.sync(f);
      section.setCount(items.filter((i) => f.ranges[i.key]).length);
    },
  };
}

// ───────────────────────── Panel ─────────────────────────

/** Panel lateral con todos los filtros. Solo ofrece los que tienen sentido para el CSV cargado. */
export class FiltersPanel {
  private sections: Section[] = [];
  private filters: FilterState = emptyFilters();

  constructor(
    private readonly host: HTMLElement,
    /** Se llama cuando la persona cambia un filtro desde el panel. */
    private readonly onChange: (next: FilterState) => void,
  ) {}

  /** Arma el panel para las canciones de un CSV nuevo y deja los filtros en blanco. */
  setTracks(tracks: readonly Track[]): void {
    this.filters = emptyFilters();
    const ctx: Ctx = {
      tracks,
      get: () => this.filters,
      set: (next) => {
        this.filters = next;
        this.syncAll();
        this.onChange(next);
      },
    };

    const facet = (key: FacetKey, open = false): Section | null => {
      const def = FACETS.find((d) => d.key === key);
      return def ? facetSection(ctx, def, open) : null;
    };

    const releaseBounds = dayBounds(tracks, (t) => t.releaseDate);
    const addedBounds = dayBounds(tracks, (t) => t.addedDay);

    const sections: (Section | null)[] = [
      releaseBounds ? dateSection(ctx, 'Lanzamiento', 'release', releaseBounds, decadePresets(releaseBounds), true) : null,
      addedBounds ? dateSection(ctx, 'Agregada a la playlist', 'added', addedBounds, addedPresets(), false) : null,
      facet('artist', true),
      facet('genre'),
      facet('album'),
      facet('label'),
      explicitSection(ctx),
      rangeGroup(ctx, 'Popularidad y duración', ['popularity', 'duration'], false),
      rangeGroup(
        ctx,
        'Características de audio',
        ['tempo', 'danceability', 'energy', 'valence', 'loudness', 'speechiness', 'acousticness', 'instrumentalness', 'liveness'],
        false,
      ),
      facet('key'),
      facet('timeSignature'),
      facet('addedBy'),
    ];
    this.sections = sections.filter((s): s is Section => s !== null);

    this.host.replaceChildren(...this.sections.map((s) => s.el));
    this.host.scrollTop = 0;
    this.syncAll();
  }

  /** Cambio externo (quitar un filtro desde su etiqueta, "Limpiar todo"): el panel solo se actualiza. */
  update(filters: FilterState): void {
    this.filters = filters;
    this.syncAll();
  }

  private syncAll(): void {
    for (const section of this.sections) section.sync(this.filters);
  }
}
