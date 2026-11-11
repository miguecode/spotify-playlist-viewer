import { h } from './dom';
import { icon } from './icons';

/**
 * Ícono ⓘ con una explicación corta. Hay un solo globo para toda la página:
 * - Mouse: aparece al pasar por encima; un clic lo deja fijo.
 * - Teclado: aparece al enfocar el botón; Enter lo deja fijo; Escape o salir del botón lo cierra.
 * - Toque (celular): un toque lo abre; tocar en otro lado lo cierra.
 */

const TIP_ID = 'info-tooltip';
const GAP = 8;

interface Open {
  trigger: HTMLElement;
  pinned: boolean;
}

let tip: HTMLElement | null = null;
let tipTitle: HTMLElement;
let tipText: HTMLElement;
let open: Open | null = null;

function ensureTip(): HTMLElement {
  if (tip) return tip;

  tipTitle = h('strong', { class: 'tooltip__title' });
  tipText = h('span', { class: 'tooltip__text' });
  tip = h('div', { class: 'tooltip', id: TIP_ID, role: 'tooltip', hidden: true }, tipTitle, tipText);
  document.body.append(tip);

  // Cerrar al tocar fuera, con Escape, al desplazar cualquier cosa o al cambiar el tamaño.
  document.addEventListener('pointerdown', (ev) => {
    if (open && !open.trigger.contains(ev.target as Node)) hideInfoTip();
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && open) hideInfoTip();
  });
  window.addEventListener('scroll', () => hideInfoTip(), { capture: true, passive: true });
  window.addEventListener('resize', () => hideInfoTip());

  return tip;
}

function place(el: HTMLElement, trigger: HTMLElement): void {
  const rect = trigger.getBoundingClientRect();
  const width = el.offsetWidth;
  const height = el.offsetHeight;

  const left = Math.max(GAP, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - GAP));
  // Debajo del ícono; si no entra, arriba.
  let top = rect.bottom + GAP;
  if (top + height > window.innerHeight - GAP) top = Math.max(GAP, rect.top - height - GAP);

  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
}

function show(trigger: HTMLElement, label: string, text: string, pinned: boolean): void {
  const el = ensureTip();
  if (open && open.trigger !== trigger) setExpanded(open.trigger, false);

  tipTitle.textContent = label;
  tipText.textContent = text;
  el.hidden = false;
  place(el, trigger);

  open = { trigger, pinned };
  setExpanded(trigger, true);
}

function setExpanded(trigger: HTMLElement, expanded: boolean): void {
  trigger.setAttribute('aria-expanded', String(expanded));
  if (expanded) trigger.setAttribute('aria-describedby', TIP_ID);
  else trigger.removeAttribute('aria-describedby');
}

export function hideInfoTip(): void {
  if (!open || !tip) return;
  tip.hidden = true;
  setExpanded(open.trigger, false);
  open = null;
}

/** Conecta cualquier botón con el globo de ayuda (mouse, teclado y toque). */
export function bindTip(trigger: HTMLElement, label: string, text: string): void {
  trigger.addEventListener('pointerenter', (ev) => {
    if (ev.pointerType === 'mouse') show(trigger, label, text, false);
  });
  trigger.addEventListener('pointerleave', (ev) => {
    if (ev.pointerType === 'mouse' && open?.trigger === trigger && !open.pinned) hideInfoTip();
  });
  trigger.addEventListener('focus', () => {
    // Solo con teclado: al hacer clic con el mouse el foco no debe abrirlo dos veces.
    if (trigger.matches(':focus-visible')) show(trigger, label, text, false);
  });
  trigger.addEventListener('blur', () => {
    if (open?.trigger === trigger) hideInfoTip();
  });
  trigger.addEventListener('click', (ev) => {
    // Dentro de un <summary>, un encabezado o un enlace: no debe plegar, ordenar ni navegar.
    ev.preventDefault();
    ev.stopPropagation();
    if (open?.trigger === trigger && open.pinned) hideInfoTip();
    else show(trigger, label, text, true);
  });
}

/** Botón ⓘ que explica `label` con `text`. */
export function infoTip(label: string, text: string): HTMLButtonElement {
  const trigger = h(
    'button',
    { class: 'info', type: 'button', 'aria-label': `Qué es: ${label}`, 'aria-expanded': 'false' },
    icon('info', 16),
  );
  bindTip(trigger, label, text);
  return trigger;
}
