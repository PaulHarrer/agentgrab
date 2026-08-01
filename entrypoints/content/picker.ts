import { buildElementContext, type ElementContext } from '@/lib/context';
import { buildPrompt } from '@/lib/prompt';
import { describeElement } from '@/lib/selector';
import { PAGE_STYLES, PICKER_STYLES } from './styles';

type Mode = 'idle' | 'picking' | 'editing';

const HOST_TAG = 'agentgrab-overlay';
const PICKING_CLASS = 'agentgrab-picking';

/** Mouse events swallowed while picking so the page can't react to the click. */
const BLOCKED_EVENTS = [
  'mousedown',
  'mouseup',
  'click',
  'dblclick',
  'auxclick',
  'contextmenu',
  'pointerdown',
  'pointerup',
] as const;

const POPOVER_HTML = /* html */ `
<div class="pop-head">
  <span class="mark"></span>
  <span class="pop-title">AgentGrab</span>
  <span class="pop-target" data-ref="target"></span>
  <button class="icon-btn" data-ref="close" title="Close (Esc)" aria-label="Close">&times;</button>
</div>
<div class="pop-body">
  <label class="field" for="ag-request">What should change?</label>
  <textarea id="ag-request" data-ref="request" spellcheck="true"
    placeholder="e.g. Make this button full width on mobile and use the brand colour instead of grey."></textarea>
</div>
<div class="pop-foot">
  <button class="action primary" data-ref="copy">Copy prompt</button>
  <button class="action ghost" data-ref="repick">Pick another</button>
</div>
<div class="pop-meta">
  <span class="facts"><span data-ref="hint"></span></span>
  <button class="link-btn" data-ref="preview-toggle">Preview</button>
</div>
<pre class="preview" data-ref="preview" hidden></pre>
`;

export class ElementPicker {
  private readonly frameToken: string;
  private readonly isTopFrame = window.top === window.self;

  private mode: Mode = 'idle';
  private host: HTMLElement | null = null;
  private shadow: ShadowRoot | null = null;
  private pageStyle: HTMLStyleElement | null = null;

  private spotlight: HTMLDivElement | null = null;
  private badge: HTMLDivElement | null = null;
  private toolbar: HTMLDivElement | null = null;
  private popover: HTMLDivElement | null = null;

  private hovered: Element | null = null;
  private selected: Element | null = null;
  private context: ElementContext | null = null;
  /** Elements stepped away from with ArrowUp, so ArrowDown can step back. */
  private descendTrail: Element[] = [];
  private copyResetTimer: number | null = null;

  /** Called when this frame finishes picking, so other frames can clean up. */
  onEnded: (() => void) | null = null;

  constructor(frameToken: string) {
    this.frameToken = frameToken;
  }

  get isActive(): boolean {
    return this.mode !== 'idle';
  }

  get token(): string {
    return this.frameToken;
  }

  /* ---------------------------------------------------------------- *
   * Lifecycle
   * ---------------------------------------------------------------- */

  start(): void {
    this.teardown();
    this.mount();
    this.mode = 'picking';
    this.setPageCursor(true);
    this.bindPickingEvents();
    if (this.toolbar) this.toolbar.hidden = !this.isTopFrame;
  }

  stop(): void {
    this.teardown();
  }

  private teardown(): void {
    this.unbindPickingEvents();
    window.removeEventListener('scroll', this.onViewportChange, true);
    window.removeEventListener('resize', this.onViewportChange);
    document.removeEventListener('keydown', this.onKeyDown, true);

    this.setPageCursor(false);
    if (this.copyResetTimer !== null) {
      clearTimeout(this.copyResetTimer);
      this.copyResetTimer = null;
    }

    this.host?.remove();
    this.host = null;
    this.shadow = null;
    this.spotlight = null;
    this.badge = null;
    this.toolbar = null;
    this.popover = null;
    this.hovered = null;
    this.selected = null;
    this.context = null;
    this.descendTrail = [];
    this.mode = 'idle';
  }

  private mount(): void {
    const host = document.createElement(HOST_TAG);
    host.setAttribute('data-agentgrab', '');
    const shadow = host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = PICKER_STYLES;
    shadow.append(style);

    const spotlight = document.createElement('div');
    spotlight.className = 'spotlight';
    spotlight.hidden = true;

    const badge = document.createElement('div');
    badge.className = 'badge';
    badge.hidden = true;

    const toolbar = document.createElement('div');
    toolbar.className = 'toolbar';
    toolbar.innerHTML = /* html */ `
      <span class="mark"></span>
      <span>Click an element to grab it</span>
      <span class="hint"><kbd>&uarr;</kbd><kbd>&darr;</kbd> parent / child</span>
      <span class="hint"><kbd>Esc</kbd> cancel</span>
    `;

    shadow.append(spotlight, badge, toolbar);
    // documentElement rather than body: a transformed <body> would otherwise
    // become the containing block for our fixed-position layers.
    document.documentElement.append(host);

    this.host = host;
    this.shadow = shadow;
    this.spotlight = spotlight;
    this.badge = badge;
    this.toolbar = toolbar;

    document.addEventListener('keydown', this.onKeyDown, true);
    window.addEventListener('scroll', this.onViewportChange, true);
    window.addEventListener('resize', this.onViewportChange);
  }

  private setPageCursor(active: boolean): void {
    const root = document.documentElement;
    if (active) {
      root.classList.add(PICKING_CLASS);
      if (!this.pageStyle) {
        this.pageStyle = document.createElement('style');
        this.pageStyle.setAttribute('data-agentgrab', '');
        this.pageStyle.textContent = PAGE_STYLES;
      }
      (document.head ?? root).append(this.pageStyle);
    } else {
      root.classList.remove(PICKING_CLASS);
      this.pageStyle?.remove();
    }
  }

  /* ---------------------------------------------------------------- *
   * Picking
   * ---------------------------------------------------------------- */

  private bindPickingEvents(): void {
    window.addEventListener('mousemove', this.onMouseMove, true);
    for (const type of BLOCKED_EVENTS) {
      window.addEventListener(type, this.onBlockedEvent, true);
    }
  }

  private unbindPickingEvents(): void {
    window.removeEventListener('mousemove', this.onMouseMove, true);
    for (const type of BLOCKED_EVENTS) {
      window.removeEventListener(type, this.onBlockedEvent, true);
    }
  }

  /** Deepest element under the pointer, ignoring our own overlay. */
  private resolveTarget(event: Event): Element | null {
    const path = event.composedPath();
    for (const node of path) {
      if (node === this.host) return null;
      if (node instanceof Element) return node;
    }
    return event.target instanceof Element ? event.target : null;
  }

  private onMouseMove = (event: MouseEvent): void => {
    if (this.mode !== 'picking') return;
    const target = this.resolveTarget(event);
    if (!target || target === this.hovered) return;

    this.descendTrail = [];
    this.setHovered(target);
  };

  private onBlockedEvent = (event: Event): void => {
    if (this.mode !== 'picking') return;
    if (this.host && event.composedPath().includes(this.host)) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (event.type === 'click') {
      const target = this.hovered ?? this.resolveTarget(event);
      if (target) this.select(target);
    }
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    if (this.mode === 'idle') return;

    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.finish();
      return;
    }

    if (this.mode !== 'picking') return;

    if (event.key === 'ArrowUp') {
      const parent = this.hovered?.parentElement;
      if (parent && this.hovered) {
        event.preventDefault();
        this.descendTrail.push(this.hovered);
        this.setHovered(parent);
      }
    } else if (event.key === 'ArrowDown') {
      const child = this.descendTrail.pop();
      if (child) {
        event.preventDefault();
        this.setHovered(child);
      }
    } else if (event.key === 'Enter' && this.hovered) {
      event.preventDefault();
      this.select(this.hovered);
    }
  };

  private setHovered(el: Element): void {
    this.hovered = el;
    this.paintHighlight(el, false);
  }

  private onViewportChange = (): void => {
    if (this.mode === 'picking' && this.hovered) {
      this.paintHighlight(this.hovered, false);
    } else if (this.mode === 'editing' && this.selected) {
      this.paintHighlight(this.selected, true);
      this.positionPopover();
    }
  };

  private paintHighlight(el: Element, locked: boolean): void {
    const { spotlight, badge } = this;
    if (!spotlight || !badge) return;

    const rect = el.getBoundingClientRect();
    spotlight.hidden = false;
    spotlight.dataset.locked = String(locked);
    spotlight.style.top = `${rect.top}px`;
    spotlight.style.left = `${rect.left}px`;
    spotlight.style.width = `${rect.width}px`;
    spotlight.style.height = `${rect.height}px`;

    badge.hidden = false;
    badge.dataset.locked = String(locked);
    badge.textContent = '';
    badge.append(describeElement(el));
    const dims = document.createElement('span');
    dims.className = 'dim';
    dims.textContent = `  ${Math.round(rect.width)} × ${Math.round(rect.height)}`;
    badge.append(dims);

    // Sit above the element, or below it when there's no room at the top.
    const badgeHeight = 22;
    const above = rect.top > badgeHeight + 6;
    badge.style.top = `${Math.max(4, above ? rect.top - badgeHeight - 4 : Math.min(rect.bottom + 4, window.innerHeight - badgeHeight - 4))}px`;
    badge.style.left = `${Math.min(Math.max(4, rect.left), Math.max(4, window.innerWidth - badge.offsetWidth - 8))}px`;
  }

  /* ---------------------------------------------------------------- *
   * Selection + popover
   * ---------------------------------------------------------------- */

  private select(el: Element): void {
    this.unbindPickingEvents();
    this.setPageCursor(false);
    this.mode = 'editing';
    this.selected = el;
    this.hovered = null;
    this.context = buildElementContext(el);

    if (this.toolbar) this.toolbar.hidden = true;
    this.paintHighlight(el, true);
    this.renderPopover();

    // Other frames should drop their overlays now that this one has a target.
    this.onEnded?.();
  }

  private renderPopover(): void {
    const { shadow, context } = this;
    if (!shadow || !context) return;

    this.popover?.remove();

    const popover = document.createElement('div');
    popover.className = 'popover';
    popover.innerHTML = POPOVER_HTML;
    shadow.append(popover);
    this.popover = popover;

    const ref = <T extends HTMLElement>(name: string): T => popover.querySelector(`[data-ref="${name}"]`) as T;

    const target = ref<HTMLSpanElement>('target');
    const request = ref<HTMLTextAreaElement>('request');
    const copyButton = ref<HTMLButtonElement>('copy');
    const repickButton = ref<HTMLButtonElement>('repick');
    const closeButton = ref<HTMLButtonElement>('close');
    const hint = ref<HTMLSpanElement>('hint');
    const previewToggle = ref<HTMLButtonElement>('preview-toggle');
    const preview = ref<HTMLPreElement>('preview');

    target.textContent = context.cssSelector;
    target.title = context.cssSelector;

    const source = context.sourceHints[0];
    hint.textContent = source
      ? `${source.framework}${source.component ? ` · ${source.component}` : ''}${source.file ? ` · ${source.file}` : ''}`
      : `${Object.keys(context.attributes).length} attributes · ${context.searchHints.length} search hints`;

    const refreshPreview = () => {
      if (!preview.hidden) preview.textContent = buildPrompt(context, request.value);
    };

    request.addEventListener('input', refreshPreview);
    request.addEventListener('keydown', (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        void this.copy(request.value, copyButton);
      }
    });

    copyButton.addEventListener('click', () => void this.copy(request.value, copyButton));
    repickButton.addEventListener('click', () => this.start());
    closeButton.addEventListener('click', () => this.finish());

    previewToggle.addEventListener('click', () => {
      preview.hidden = !preview.hidden;
      previewToggle.textContent = preview.hidden ? 'Preview' : 'Hide preview';
      refreshPreview();
      this.positionPopover();
    });

    this.positionPopover();
    request.focus();
  }

  private positionPopover(): void {
    const { popover, selected } = this;
    if (!popover || !selected) return;

    const rect = selected.getBoundingClientRect();
    const width = popover.offsetWidth;
    const height = popover.offsetHeight;
    const margin = 12;
    const gap = 10;

    let top = rect.bottom + gap;
    if (top + height > window.innerHeight - margin) {
      const above = rect.top - height - gap;
      top = above >= margin ? above : window.innerHeight - height - margin;
    }
    top = Math.max(margin, Math.min(top, window.innerHeight - height - margin));

    const left = Math.max(margin, Math.min(rect.left, window.innerWidth - width - margin));

    popover.style.top = `${top}px`;
    popover.style.left = `${left}px`;
  }

  private async copy(request: string, button: HTMLButtonElement): Promise<void> {
    if (!this.context) return;

    const prompt = buildPrompt(this.context, request);
    const copied = await writeToClipboard(prompt);

    if (this.copyResetTimer !== null) clearTimeout(this.copyResetTimer);
    button.dataset.copied = String(copied);
    button.textContent = copied ? 'Copied to clipboard' : 'Copy failed — select and copy below';

    if (!copied) {
      const preview = this.popover?.querySelector<HTMLPreElement>('[data-ref="preview"]');
      if (preview) {
        preview.hidden = false;
        preview.textContent = prompt;
        this.positionPopover();
      }
    }

    this.copyResetTimer = window.setTimeout(() => {
      button.dataset.copied = 'false';
      button.textContent = 'Copy prompt';
    }, 2000);
  }

  /** Close everything and let the background know this frame is done. */
  private finish(): void {
    this.teardown();
    this.onEnded?.();
  }
}

async function writeToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Not available on insecure origins, or the document lost focus.
  }

  try {
    const scratch = document.createElement('textarea');
    scratch.value = text;
    scratch.setAttribute('readonly', '');
    scratch.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0';
    document.body.append(scratch);
    scratch.select();
    const ok = document.execCommand('copy');
    scratch.remove();
    return ok;
  } catch {
    return false;
  }
}
