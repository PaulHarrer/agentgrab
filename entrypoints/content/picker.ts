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
  <button type="button" class="icon-btn" data-ref="repick" title="Pick another" aria-label="Pick another">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
  </button>
  <span class="pop-title" data-ref="target"></span>
  <button type="button" class="icon-btn" data-ref="close" title="Close (Esc)" aria-label="Close">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
  </button>
</div>
<div class="stage" data-ref="stage"></div>
<div class="meta">
  <div class="meta-row"><span class="meta-k">Tag</span><span class="meta-v" data-ref="tag"></span></div>
  <div class="meta-row"><span class="meta-k">Text</span><span class="meta-v" data-ref="text"></span></div>
  <div class="meta-row"><span class="meta-k">Classes</span><span class="meta-v" data-ref="classes"></span></div>
  <div class="meta-row"><span class="meta-k">Selector</span><span class="meta-v" data-ref="selector"></span></div>
  <div class="meta-row"><span class="meta-k">Page</span><span class="meta-v" data-ref="page"></span></div>
  <div class="meta-row"><span class="meta-k">Source</span><span class="meta-v" data-ref="hint"></span></div>
</div>
<textarea id="ag-request" data-ref="request" spellcheck="true" rows="2" placeholder="What should change?"></textarea>
<div class="rule"></div>
<div class="actions">
  <button type="button" class="action" data-ref="preview-toggle">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>
    <span data-ref="preview-label">Preview</span>
  </button>
  <button type="button" class="action" data-ref="copy">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
    <span data-ref="copy-label">Copy prompt</span>
  </button>
</div>
<pre class="preview" data-ref="preview" hidden></pre>
`;

const DOCK_HTML = /* html */ `
<button type="button" class="dock-btn" data-ref="tool-pick" title="Pick an element" aria-label="Pick an element">
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v3"/><path d="M12 19v3"/><path d="M2 12h3"/><path d="M19 12h3"/></svg>
</button>
<button type="button" class="dock-btn" data-ref="tool-grab" title="Grabbed element" aria-label="Grabbed element" disabled>
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>
</button>
<button type="button" class="dock-btn dock-close" data-ref="dock-close" title="Close (Esc)" aria-label="Close">
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
</button>
`;

/** Computed properties copied onto the stage clone (transform/transition/animation excluded). */
const CLONE_PROPS = [
  'display',
  'position',
  'box-sizing',
  'width',
  'height',
  'min-width',
  'min-height',
  'max-width',
  'max-height',
  'margin',
  'padding',
  'color',
  'background-color',
  'background-image',
  'background-size',
  'background-position',
  'background-repeat',
  'background-origin',
  'background-clip',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'line-height',
  'letter-spacing',
  'text-align',
  'text-decoration-line',
  'text-transform',
  'white-space',
  'border',
  // Chrome often returns an empty `border` shorthand, so copy the sides too.
  'border-top',
  'border-right',
  'border-bottom',
  'border-left',
  'border-radius',
  'box-shadow',
  'opacity',
  'overflow',
  'flex-direction',
  'flex-wrap',
  'justify-content',
  'align-items',
  'align-content',
  'gap',
  'flex',
  'grid-template-columns',
  'grid-template-rows',
  'object-fit',
  'vertical-align',
  'list-style-type',
] as const;

export class ElementPicker {
  private readonly frameToken: string;
  private readonly isTopFrame = window.top === window.self;

  private mode: Mode = 'idle';
  private host: HTMLElement | null = null;
  private shadow: ShadowRoot | null = null;
  private pageStyle: HTMLStyleElement | null = null;

  private spotlight: HTMLDivElement | null = null;
  private badge: HTMLDivElement | null = null;
  private dockAnchor: HTMLDivElement | null = null;
  private toolbar: HTMLDivElement | null = null;
  private navPill: HTMLDivElement | null = null;
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
    if (this.dockAnchor) this.dockAnchor.hidden = !this.isTopFrame;
    this.setTools('picking');
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
    this.dockAnchor = null;
    this.toolbar = null;
    this.navPill = null;
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
    toolbar.innerHTML = DOCK_HTML;

    const pickTool = toolbar.querySelector<HTMLButtonElement>('[data-ref="tool-pick"]');
    pickTool?.addEventListener('click', () => {
      if (this.mode === 'editing') this.start();
    });

    const grabTool = toolbar.querySelector<HTMLButtonElement>('[data-ref="tool-grab"]');
    grabTool?.addEventListener('click', () => {
      this.shadow?.querySelector<HTMLTextAreaElement>('[data-ref="request"]')?.focus();
    });

    const closeDock = toolbar.querySelector<HTMLButtonElement>('[data-ref="dock-close"]');
    closeDock?.addEventListener('click', () => this.finish());

    // Anchor keeps the dock bottom-center; the nav pill hangs off its left
    // without the dock shifting position when it appears.
    const dockAnchor = document.createElement('div');
    dockAnchor.className = 'dock-anchor';
    dockAnchor.append(toolbar);

    const navPill = document.createElement('div');
    navPill.className = 'nav-pill';
    navPill.hidden = true;
    navPill.innerHTML = /* html */ `
      <button type="button" class="nav-btn" data-ref="step-outer" title="Select outer element" aria-label="Select outer element">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
        <span>Up</span>
      </button>
      <button type="button" class="nav-btn" data-ref="step-inner" title="Select inner element" aria-label="Select inner element">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>
        <span>Down</span>
      </button>
    `;

    navPill.querySelector<HTMLButtonElement>('[data-ref="step-outer"]')?.addEventListener('click', () => this.stepOuter());
    navPill.querySelector<HTMLButtonElement>('[data-ref="step-inner"]')?.addEventListener('click', () => this.stepInner());

    dockAnchor.append(navPill);

    shadow.append(spotlight, badge, dockAnchor);
    // documentElement rather than body: a transformed <body> would otherwise
    // become the containing block for our fixed-position layers.
    document.documentElement.append(host);

    this.host = host;
    this.shadow = shadow;
    this.spotlight = spotlight;
    this.badge = badge;
    this.dockAnchor = dockAnchor;
    this.toolbar = toolbar;
    this.navPill = navPill;

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

    if (this.mode === 'editing') {
      if (event.key === 'ArrowUp' && !this.isTextEntryTarget(event)) {
        event.preventDefault();
        this.stepOuter();
      } else if (event.key === 'ArrowDown' && !this.isTextEntryTarget(event)) {
        event.preventDefault();
        this.stepInner();
      }
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

  /** True when the keyboard event originates inside a text-entry control. */
  private isTextEntryTarget(event: KeyboardEvent): boolean {
    const target = event.target;
    if (!(target instanceof Element)) return false;
    if (target.localName === 'textarea' || target.localName === 'input') return true;
    return (target as HTMLElement).isContentEditable === true;
  }

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

  /** Deepest selectable child of the current selection, honoring the trail. */
  private outerElement(): Element | null {
    const parent = this.selected?.parentElement ?? null;
    if (!parent || parent === this.host) return null;
    return parent;
  }

  private innerElement(): Element | null {
    const selected = this.selected;
    if (!selected) return null;
    const fromTrail = this.descendTrail[this.descendTrail.length - 1];
    if (fromTrail && fromTrail.isConnected && fromTrail.parentElement === selected) return fromTrail;
    const skip = new Set(['script', 'style', 'link', 'noscript']);
    for (const child of Array.from(selected.children)) {
      if (child === this.host) continue;
      if (skip.has(child.localName)) continue;
      return child;
    }
    return null;
  }

  private stepOuter(): void {
    if (this.mode !== 'editing' || !this.selected) return;
    const parent = this.outerElement();
    if (!parent) return;
    this.descendTrail.push(this.selected);
    this.reselect(parent);
  }

  private stepInner(): void {
    if (this.mode !== 'editing' || !this.selected) return;
    const child = this.innerElement();
    if (!child) return;
    if (this.descendTrail[this.descendTrail.length - 1] === child) this.descendTrail.pop();
    this.reselect(child);
  }

  /** Swap the locked selection in place, preserving the typed request. */
  private reselect(el: Element): void {
    if (!this.shadow) return;
    const request = this.popover?.querySelector<HTMLTextAreaElement>('[data-ref="request"]');
    const savedRequest = request?.value ?? '';

    this.selected = el;
    this.hovered = null;
    this.context = buildElementContext(el);

    this.paintHighlight(el, true);
    this.renderPopover({ focus: false });

    const nextRequest = this.popover?.querySelector<HTMLTextAreaElement>('[data-ref="request"]');
    if (nextRequest) nextRequest.value = savedRequest;
    this.setTools('editing');
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

    this.paintHighlight(el, true);
    this.renderPopover();
    this.setTools('editing');

    // Other frames should drop their overlays now that this one has a target.
    this.onEnded?.();
  }

  private renderPopover(options: { focus?: boolean } = {}): void {
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
    const tag = ref<HTMLSpanElement>('tag');
    const text = ref<HTMLSpanElement>('text');
    const classes = ref<HTMLSpanElement>('classes');
    const selector = ref<HTMLSpanElement>('selector');
    const page = ref<HTMLSpanElement>('page');
    const hint = ref<HTMLSpanElement>('hint');
    const stage = ref<HTMLDivElement>('stage');
    const request = ref<HTMLTextAreaElement>('request');
    const copyButton = ref<HTMLButtonElement>('copy');
    const copyLabel = ref<HTMLSpanElement>('copy-label');
    const repickButton = ref<HTMLButtonElement>('repick');
    const closeButton = ref<HTMLButtonElement>('close');
    const previewToggle = ref<HTMLButtonElement>('preview-toggle');
    const previewLabel = ref<HTMLSpanElement>('preview-label');
    const preview = ref<HTMLPreElement>('preview');

    target.textContent = context.label;
    target.title = context.cssSelector;

    tag.textContent = `<${context.tag}>`;
    tag.title = tag.textContent;

    const rawText = context.text.replace(/\n\u2026 \[truncated.*$/, '');
    if (rawText) {
      text.textContent = rawText;
    } else {
      text.textContent = '\u2014';
      text.classList.add('is-empty');
    }
    text.title = rawText;

    const classListRaw = (context.attributes.class ?? '').replace(/\s+/g, ' ').trim();
    if (classListRaw) {
      classes.textContent = classListRaw;
    } else {
      classes.textContent = '\u2014';
      classes.classList.add('is-empty');
    }
    classes.title = classListRaw;

    selector.textContent = context.label;
    selector.title = context.cssSelector;

    let pageHost = context.url;
    try {
      pageHost = new URL(context.url).hostname.replace(/^www\./, '');
    } catch {
      // Not a parsable URL — show the raw string instead.
    }
    page.textContent = pageHost;
    page.title = pageHost;

    const source = context.sourceHints[0];
    if (source) {
      const sourceText =
        `${source.framework}${source.component ? ` \u00b7 ${source.component}` : ''}${source.file ? ` \u00b7 ${source.file}` : ''}`;
      hint.textContent = sourceText;
      hint.title = sourceText;
    } else {
      hint.textContent = '\u2014';
      hint.title = '\u2014';
      hint.classList.add('is-empty');
    }

    if (this.selected) this.paintStage(stage, this.selected);

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
      previewLabel.textContent = preview.hidden ? 'Preview' : 'Hide preview';
      if (preview.hidden) {
        delete previewToggle.dataset.active;
      } else {
        previewToggle.dataset.active = 'true';
      }
      refreshPreview();
      this.positionPopover();
    });

    this.positionPopover();
    if (options.focus !== false) request.focus();
  }

  /** Placement is CSS-driven (fixed, centered above the dock); kept for call sites. */
  private positionPopover(): void {}

  /** Build the sanitized, scaled snapshot of the selected element into the stage. */
  private paintStage(stage: HTMLElement, source: Element): void {
    try {
      const clone = source.cloneNode(true) as Element;

      // Sanitize: drop dangerous nodes and attributes before anything else.
      clone.querySelectorAll('script, style, link, iframe, object, embed, noscript').forEach((n) => n.remove());
      const cloneTree: Element[] = [clone, ...clone.querySelectorAll('*')];
      for (const el of cloneTree) {
        for (const attr of Array.from(el.attributes)) {
          const name = attr.name.toLowerCase();
          if (name.startsWith('on')) {
            el.removeAttribute(attr.name);
          } else if (name === 'srcdoc') {
            el.removeAttribute(attr.name);
          } else if (name === 'href' || name === 'src') {
            const value = attr.value.trim().toLowerCase();
            if (value.startsWith('javascript:')) el.setAttribute(name === 'href' ? 'href' : 'src', name === 'href' ? '#' : '');
          }
        }
        el.removeAttribute('autoplay');
      }

      // Tags the sanitizer strips from the clone. The originals still carry
      // them, so they must be skipped here too or every following sibling
      // would get the next clone child's styles.
      const SKIP_TAGS = new Set(['script', 'style', 'link', 'iframe', 'object', 'embed', 'noscript']);

      // Walk the original and the clone in parallel, copying computed layout
      // styles as inline style. The page's CSS does not reach the shadow root.
      const originals: Element[] = [];
      const matches: Element[] = [];
      const walk = (original: Element, mirrored: Element): void => {
        if (originals.length >= 200) return;
        originals.push(original);
        matches.push(mirrored);
        const originalChildren = original.children;
        const mirroredChildren = mirrored.children;
        let next = 0;
        for (let i = 0; i < originalChildren.length; i++) {
          const child = originalChildren[i]!;
          if (SKIP_TAGS.has(child.localName.toLowerCase())) continue;
          if (next >= mirroredChildren.length) break;
          walk(child, mirroredChildren[next++]!);
        }
      };
      walk(source, clone);

      for (let i = 0; i < originals.length; i++) {
        const original = originals[i]!;
        const mirrored = matches[i]!;
        const computed = window.getComputedStyle(original);
        let css = '';
        for (const prop of CLONE_PROPS) {
          const value = computed.getPropertyValue(prop).trim();
          if (!value) continue;
          if (prop === 'position' && (value === 'fixed' || value === 'sticky')) {
            css += 'position: relative; ';
            continue;
          }
          css += `${prop}: ${value}; `;
        }
        const el = mirrored as HTMLElement;
        const existing = el.getAttribute('style') ?? '';
        if (css) el.setAttribute('style', existing + css);
      }

      // Force the root to behave inside the stage. z-index keeps it above the
      // backdrop; a copied negative z-index would otherwise hide the element.
      const root = clone as HTMLElement;
      root.setAttribute(
        'style',
        `${root.getAttribute('style') ?? ''}position: relative; z-index: 1; margin: 0; max-width: none; animation: none; transition: none; box-sizing: border-box; `,
      );

      const rect = source.getBoundingClientRect();
      const width = Math.max(rect.width, 1);
      const height = Math.max(rect.height, 1);

      const fit = document.createElement('div');
      fit.className = 'preview-fit';
      const backdrop = buildPreviewBackdrop(source, width, height);
      if (backdrop) fit.append(backdrop);
      fit.append(clone);
      stage.textContent = '';
      stage.append(fit);

      requestAnimationFrame(() => {
        const availWidth = stage.clientWidth - 24;
        const availHeight = stage.clientHeight - 24;
        if (availWidth <= 0 || availHeight <= 0) return;
        const scale = Math.max(0.05, Math.min(availWidth / width, availHeight / height, 1.5));
        fit.style.width = `${width * scale}px`;
        fit.style.height = `${height * scale}px`;
        root.style.width = `${width}px`;
        root.style.height = `${height}px`;
        root.style.transform = `scale(${scale})`;
        if (backdrop) backdrop.style.transform = `scale(${scale})`;
      });
    } catch {
      // On any failure, keep the empty checkerboard rather than breaking the popover.
      stage.textContent = '';
    }
  }

  /** Reflect the current mode onto the dock tools and the nav pill. */
  private setTools(mode: Mode): void {
    const pick = this.toolbar?.querySelector<HTMLElement>('[data-ref="tool-pick"]');
    const grab = this.toolbar?.querySelector<HTMLButtonElement>('[data-ref="tool-grab"]');

    if (pick) {
      if (mode === 'picking') pick.dataset.active = 'true';
      else delete pick.dataset.active;
    }
    if (grab) {
      if (mode === 'editing') grab.dataset.active = 'true';
      else delete grab.dataset.active;
      grab.disabled = mode !== 'editing';
    }

    if (this.navPill) {
      this.navPill.hidden = mode === 'picking' ? true : !this.isTopFrame;
      const stepOuter = this.navPill.querySelector<HTMLButtonElement>('[data-ref="step-outer"]');
      const stepInner = this.navPill.querySelector<HTMLButtonElement>('[data-ref="step-inner"]');
      if (stepOuter) stepOuter.disabled = this.outerElement() === null;
      if (stepInner) stepInner.disabled = this.innerElement() === null;
    }
  }

  private async copy(request: string, button: HTMLButtonElement): Promise<void> {
    if (!this.context) return;

    const prompt = buildPrompt(this.context, request);
    const copied = await writeToClipboard(prompt);

    if (this.copyResetTimer !== null) clearTimeout(this.copyResetTimer);
    button.dataset.copied = String(copied);
    const label = button.querySelector<HTMLSpanElement>('[data-ref="copy-label"]');
    if (label) label.textContent = copied ? 'Copied' : 'Copy failed';

    if (!copied) {
      const preview = this.popover?.querySelector<HTMLPreElement>('[data-ref="preview"]');
      if (preview) {
        preview.hidden = false;
        preview.textContent = prompt;
        const previewLabel = this.popover?.querySelector<HTMLSpanElement>('[data-ref="preview-label"]');
        const previewToggle = this.popover?.querySelector<HTMLButtonElement>('[data-ref="preview-toggle"]');
        if (previewLabel) previewLabel.textContent = 'Hide preview';
        if (previewToggle) previewToggle.dataset.active = 'true';
        this.positionPopover();
      }
    }

    this.copyResetTimer = window.setTimeout(() => {
      button.dataset.copied = 'false';
      if (label) label.textContent = 'Copy prompt';
    }, 2000);
  }

  /** Close everything and let the background know this frame is done. */
  private finish(): void {
    this.teardown();
    this.onEnded?.();
  }
}

/**
 * Paint what shows through a transparent element. The clone only has its own
 * background, so without this a heading on a colored card sits on the
 * checkerboard instead of the color you see on the page.
 *
 * Layers are sized to each ancestor and clipped to the element's border box,
 * so a parent gradient shows the slice behind the element rather than being
 * stretched over it. The page canvas is the bottom layer when no ancestor
 * is opaque.
 */
function buildPreviewBackdrop(source: Element, width: number, height: number): HTMLElement | null {
  const sourceRect = source.getBoundingClientRect();
  const layers: HTMLElement[] = [];
  let opaque = false;
  let node = parentAcrossShadow(source);
  let guard = 0;

  while (node && guard++ < 40 && !opaque) {
    if (node.hasAttribute('data-agentgrab')) break;

    const computed = window.getComputedStyle(node);
    // `background-clip: text` paints the glyphs, not the box behind children.
    const paints =
      computed.display !== 'contents' &&
      computed.visibility !== 'hidden' &&
      computed.backgroundClip.trim() !== 'text';
    if (paints) {
      const color = computed.backgroundColor.trim();
      const image = computed.backgroundImage.trim();
      const alpha = colorAlpha(color);
      const hasImage = image !== '' && image !== 'none';
      const hasColor = alpha === null ? color !== '' && color !== 'transparent' : alpha > 0.001;
      const rect = node.getBoundingClientRect();
      const covers =
        rect.width > 0 &&
        rect.height > 0 &&
        rect.right > sourceRect.left &&
        rect.left < sourceRect.right &&
        rect.bottom > sourceRect.top &&
        rect.top < sourceRect.bottom;
      // Overflow and negative margins can stick out of a parent. A partial
      // overlap is not a full cover, so keep walking for the rest of the box.
      const fullyCovers =
        rect.left <= sourceRect.left + 0.5 &&
        rect.top <= sourceRect.top + 0.5 &&
        rect.right >= sourceRect.right - 0.5 &&
        rect.bottom >= sourceRect.bottom - 0.5;

      if (covers && (hasColor || hasImage)) {
        const layer = document.createElement('div');
        layer.style.position = 'absolute';
        layer.style.left = `${rect.left - sourceRect.left}px`;
        layer.style.top = `${rect.top - sourceRect.top}px`;
        layer.style.width = `${rect.width}px`;
        layer.style.height = `${rect.height}px`;
        if (hasColor) layer.style.backgroundColor = color;
        if (hasImage) {
          layer.style.backgroundImage = image;
          layer.style.backgroundSize = computed.backgroundSize;
          layer.style.backgroundPosition = computed.backgroundPosition;
          layer.style.backgroundRepeat = computed.backgroundRepeat;
          layer.style.backgroundOrigin = computed.backgroundOrigin;
          layer.style.backgroundClip = computed.backgroundClip;
        }
        // Nearest ancestor must paint above farther ones.
        layers.unshift(layer);
        if (fullyCovers) opaque = alpha !== null && alpha >= 0.999;
      }
    }

    if (node === document.documentElement) break;
    node = parentAcrossShadow(node);
  }

  if (!opaque) {
    const canvas = document.createElement('div');
    canvas.style.cssText = 'position:absolute;inset:0;';
    canvas.style.backgroundColor = pageCanvasColor();
    layers.unshift(canvas);
  }

  if (layers.length === 0) return null;

  const backdrop = document.createElement('div');
  backdrop.className = 'preview-backdrop';
  backdrop.setAttribute('aria-hidden', 'true');
  backdrop.style.width = `${width}px`;
  backdrop.style.height = `${height}px`;
  // Clip to the element's curve so a parent fill doesn't square off the corners.
  backdrop.style.borderRadius = window.getComputedStyle(source).borderRadius;
  for (const layer of layers) backdrop.append(layer);
  return backdrop;
}

/** Parent element, stepping out of a shadow root onto its host. */
function parentAcrossShadow(node: Element): Element | null {
  if (node.parentElement) return node.parentElement;
  const root = node.getRootNode();
  return root instanceof ShadowRoot ? root.host : null;
}

/** Alpha of a computed color, or null when the syntax isn't recognized. */
function colorAlpha(color: string): number | null {
  const value = color.trim().toLowerCase();
  if (!value || value === 'transparent') return 0;

  const slash = value.match(/\/\s*([0-9.]+)(%?)\s*\)\s*$/);
  if (slash) {
    const n = Number(slash[1]);
    if (!Number.isFinite(n)) return null;
    return slash[2] ? n / 100 : n;
  }

  const comma = value.match(/^(?:rgba|hsla)\([^)]+,\s*([0-9.]+)\s*\)$/);
  if (comma) {
    const n = Number(comma[1]);
    return Number.isFinite(n) ? n : null;
  }

  if (/^(?:rgb|hsl|hwb|lab|lch|oklab|oklch|color)\(/.test(value)) return 1;
  if (value.startsWith('#')) {
    const hex = value.slice(1);
    if (hex.length === 4 || hex.length === 8) {
      const a = Number.parseInt(hex.slice(-2), 16);
      return Number.isFinite(a) ? a / 255 : null;
    }
    return 1;
  }
  return null;
}

/** Resolved `canvas` color of the page, not the shadow root's light scheme. */
function pageCanvasColor(): string {
  const probe = document.createElement('div');
  probe.setAttribute('data-agentgrab', '');
  probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;pointer-events:none;background-color:canvas;';
  document.documentElement.append(probe);
  try {
    return window.getComputedStyle(probe).backgroundColor || '#fff';
  } finally {
    probe.remove();
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
