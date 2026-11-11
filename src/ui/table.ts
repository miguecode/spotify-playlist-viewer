import type { Column } from '../lib/columns';
import { columnHelp } from '../lib/help';
import { cellText } from '../lib/search';
import type { SortState } from '../lib/sort';
import { trackUrl } from '../lib/spotify';
import type { Track } from '../types';
import { h, highlight } from './dom';
import { icon } from './icons';
import { bindTip, hideInfoTip, infoTip } from './info-tip';

const ROW_H = 52;
const HEAD_H = 40;
const OVERSCAN = 8;

/** «E» de contenido explícito, a la derecha de la canción; al pasar el mouse explica qué significa. */
function explicitTag(): HTMLElement {
  const tag = h(
    'button',
    { class: 'tag-e', type: 'button', 'aria-label': 'Explícita: qué significa', 'aria-expanded': 'false' },
    'E',
  );
  bindTip(tag, 'Explícita', columnHelp('explicit') ?? '');
  return tag;
}

/**
 * Tabla con scroll virtual: solo se dibujan las filas que se ven (más un margen),
 * así una playlist de miles de canciones se mueve igual de fluida que una de veinte.
 */
export class VirtualTable {
  readonly element: HTMLElement;

  private readonly scroller: HTMLElement;
  private readonly inner: HTMLElement;
  private readonly head: HTMLElement;
  private readonly body: HTMLElement;
  private readonly rowsEl: HTMLElement;

  private rows: readonly Track[] = [];
  private columns: readonly Column[] = [];
  private sort: SortState | null = null;
  private terms: readonly string[] = [];
  /** Columnas que quedan fijas al desplazar en horizontal → su posición "left". */
  private sticky = new Map<string, number>();
  private stickyEdge = '';
  /** Huella de lo que dibuja el encabezado (columnas + orden). */
  private headKey = '';

  private start = -1;
  private end = -1;
  private frame = 0;

  constructor(private readonly onSort: (col: Column) => void) {
    this.head = h('div', { class: 'table__head', role: 'row', 'aria-rowindex': 1 });
    this.rowsEl = h('div', { class: 'table__rows' });
    this.body = h('div', { class: 'table__body', role: 'rowgroup' }, this.rowsEl);
    this.inner = h('div', { class: 'table__inner' }, this.head, this.body);
    this.scroller = h('div', { class: 'table__scroll' }, this.inner);
    this.element = h('div', { class: 'table', role: 'table', 'aria-label': 'Canciones de la playlist' }, this.scroller);

    this.scroller.addEventListener('scroll', () => this.schedule(), { passive: true });
    new ResizeObserver(() => this.schedule()).observe(this.scroller);
  }

  setData(
    rows: readonly Track[],
    columns: readonly Column[],
    sort: SortState | null,
    terms: readonly string[],
    resetScroll: boolean,
  ): void {
    this.rows = rows;
    this.columns = columns;
    this.sort = sort;
    this.terms = terms;
    this.computeSticky();

    const totalWidth = columns.reduce((sum, col) => sum + col.width, 0);
    this.inner.style.width = `${totalWidth}px`;
    this.body.style.height = `${rows.length * ROW_H}px`;
    this.element.setAttribute('aria-rowcount', String(rows.length + 1));

    // Los encabezados solo cambian con las columnas o el orden; no hace falta rehacerlos en cada tecla de la búsqueda.
    const headKey = `${columns.map((c) => c.key).join(',')}|${sort ? `${sort.key}:${sort.dir}` : ''}`;
    if (headKey !== this.headKey) {
      this.headKey = headKey;
      this.renderHead();
    }
    if (resetScroll) this.scroller.scrollTop = 0;
    this.render(true);
  }

  private computeSticky(): void {
    this.sticky = new Map();
    this.stickyEdge = '';
    let left = 0;
    for (const col of this.columns) {
      if (col.kind !== 'index' && col.kind !== 'title') break;
      this.sticky.set(col.key, left);
      this.stickyEdge = col.key;
      left += col.width;
    }
  }

  private box(el: HTMLElement, col: Column): void {
    el.style.width = `${col.width}px`;
    const left = this.sticky.get(col.key);
    if (left !== undefined) {
      el.classList.add('is-sticky');
      el.style.left = `${left}px`;
      if (col.key === this.stickyEdge) el.classList.add('is-edge');
    }
  }

  private schedule(): void {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.render(false);
    });
  }

  private renderHead(): void {
    hideInfoTip(); // los encabezados se vuelven a crear: un globo abierto quedaría huérfano
    const cells = this.columns.map((col) => {
      const dir = this.sort?.key === col.key ? this.sort.dir : null;
      const arrow = icon('arrow', 14);
      arrow.classList.add('th__arrow');
      const button = h(
        'button',
        {
          class: 'th__btn',
          type: 'button',
          title: `Ordenar por ${col.label}`,
          onclick: () => this.onSort(col),
        },
        h('span', { class: 'th__label' }, col.label),
        arrow,
      );
      const help = columnHelp(col.key);
      const th = h(
        'div',
        {
          class: `th${col.kind === 'num' ? ' th--end' : ''}${dir ? ' is-sorted' : ''}${dir === 'desc' ? ' is-desc' : ''}${help ? ' has-info' : ''}`,
          role: 'columnheader',
          'aria-sort': dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none',
        },
        button,
        // Fuera del botón de orden: son dos acciones distintas (ordenar / ver qué es).
        help ? infoTip(col.label, help) : null,
      );
      this.box(th, col);
      return th;
    });
    this.head.replaceChildren(...cells);
  }

  private render(force: boolean): void {
    const total = this.rows.length;
    const top = this.scroller.scrollTop;
    const viewport = this.scroller.clientHeight;
    const start = Math.max(0, Math.floor((top - HEAD_H) / ROW_H) - OVERSCAN);
    const end = Math.min(total, Math.ceil((top + viewport) / ROW_H) + OVERSCAN);
    if (!force && start === this.start && end === this.end) return;
    this.start = start;
    this.end = end;

    this.rowsEl.style.transform = `translateY(${start * ROW_H}px)`;
    const fragment = document.createDocumentFragment();
    for (let i = start; i < end; i++) {
      const track = this.rows[i];
      if (track) fragment.append(this.renderRow(track, i));
    }
    this.rowsEl.replaceChildren(fragment);
  }

  private renderRow(track: Track, index: number): HTMLElement {
    const row = h('div', { class: 'row', role: 'row', 'aria-rowindex': index + 2 });
    for (const col of this.columns) {
      const cell = h('div', { class: 'td', role: 'cell' }, this.renderCell(col, track));
      this.box(cell, col);
      row.append(cell);
    }
    return row;
  }

  private renderCell(col: Column, track: Track): Node {
    const text = cellText(col, track);
    if (text === '' && col.kind !== 'index') {
      return col.unknown
        ? h('span', { class: 'muted unknown' }, col.unknown)
        : h('span', { class: 'muted', 'aria-label': 'sin dato' }, '–');
    }

    switch (col.kind) {
      case 'index':
        return h('span', { class: 'cell-index' }, highlight(text, this.terms));

      case 'title': {
        const url = trackUrl(track);
        const content = highlight(text, this.terms);
        const title = url
          ? h(
              'a',
              {
                class: 'cell-title',
                href: url,
                target: '_blank',
                rel: 'noopener noreferrer',
                title: `${text} · abrir en Spotify`,
              },
              content,
            )
          : h('span', { class: 'cell-title', title: text }, content);
        return track.explicit ? h('div', { class: 'title-cell' }, title, explicitTag()) : title;
      }

      case 'num':
        return h('span', { class: 'cell-num' }, highlight(text, this.terms));

      case 'bar': {
        const fill = h('div', { class: 'bar__fill' });
        fill.style.width = `${Math.round((col.bar?.(track) ?? 0) * 100)}%`;
        return h(
          'div',
          { class: 'bar' },
          h('span', { class: 'bar__value' }, highlight(text, this.terms)),
          h('div', { class: 'bar__track' }, fill),
        );
      }

      case 'chips':
        return h(
          'div',
          { class: 'chips', title: text },
          ...(col.items?.(track) ?? []).map((item) =>
            h('span', { class: 'chip' }, highlight(item, this.terms)),
          ),
        );

      default:
        return h('span', { class: 'cell-text', title: text }, highlight(text, this.terms));
    }
  }
}
