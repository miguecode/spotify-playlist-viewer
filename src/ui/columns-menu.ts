import type { Column } from '../lib/columns';
import { h } from './dom';
import { icon } from './icons';

export interface ColumnsMenuHandlers {
  toggle(key: string, visible: boolean): void;
  showAll(): void;
  reset(): void;
}

/** Botón "Columnas" con un panel de casillas para mostrar u ocultar cada columna. */
export class ColumnsMenu {
  private readonly button: HTMLButtonElement;
  private readonly panel: HTMLElement;
  private readonly list: HTMLElement;
  private readonly inputs = new Map<string, HTMLInputElement>();

  constructor(
    private readonly host: HTMLElement,
    private readonly handlers: ColumnsMenuHandlers,
  ) {
    this.button = h(
      'button',
      {
        class: 'btn btn--ghost',
        type: 'button',
        'aria-label': 'Columnas',
        'aria-haspopup': 'true',
        'aria-expanded': 'false',
        onclick: () => this.setOpen(Boolean(this.panel.hidden)),
      },
      icon('columns', 18),
      h('span', { class: 'btn__label' }, 'Columnas'),
    );
    this.list = h('div', { class: 'popover__list' });
    this.panel = h(
      'div',
      { class: 'popover', role: 'dialog', 'aria-label': 'Columnas visibles', hidden: true },
      this.list,
      h(
        'div',
        { class: 'popover__foot' },
        h('button', { class: 'btn btn--text', type: 'button', onclick: () => handlers.showAll() }, 'Mostrar todas'),
        h('button', { class: 'btn btn--text', type: 'button', onclick: () => handlers.reset() }, 'Restablecer'),
      ),
    );
    this.host.replaceChildren(this.button, this.panel);

    document.addEventListener('pointerdown', (ev) => {
      if (!this.panel.hidden && ev.target instanceof Node && !this.host.contains(ev.target)) this.setOpen(false);
    });
    this.host.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && !this.panel.hidden) {
        this.setOpen(false);
        this.button.focus();
      }
    });
  }

  private setOpen(open: boolean): void {
    this.panel.hidden = !open;
    this.button.setAttribute('aria-expanded', String(open));
  }

  /** Arma la lista de casillas. La columna "Canción" no se puede ocultar. */
  setColumns(columns: readonly Column[], isVisible: (col: Column) => boolean): void {
    this.inputs.clear();
    const rows = columns.map((col) => {
      const locked = col.kind === 'title';
      const input = h('input', {
        type: 'checkbox',
        checked: isVisible(col),
        disabled: locked,
        onchange: () => this.handlers.toggle(col.key, input.checked),
      });
      this.inputs.set(col.key, input);
      return h('label', { class: `opt${locked ? ' is-locked' : ''}` }, input, h('span', { class: 'opt__name' }, col.label));
    });
    this.list.replaceChildren(...rows);
  }

  sync(columns: readonly Column[], isVisible: (col: Column) => boolean): void {
    for (const col of columns) {
      const input = this.inputs.get(col.key);
      if (input) input.checked = isVisible(col);
    }
  }
}
