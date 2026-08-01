/**
 * Collects everything an AI agent needs to find the picked element in a
 * codebase and change it confidently: locators, markup, layout, and — when the
 * page runs a dev build — the component and source file that rendered it.
 */

import { cssSelectorFor, describeElement, domPathFor, stableClasses, xPathFor } from './selector';

export interface SourceHint {
  framework: string;
  component?: string;
  file?: string;
  line?: number;
}

export interface ElementContext {
  url: string;
  pageTitle: string;
  viewport: { width: number; height: number };
  inIframe: boolean;

  tag: string;
  cssSelector: string;
  xpath: string;
  domPath: string;
  label: string;

  attributes: Record<string, string>;
  unstableClasses: string[];
  text: string;
  outerHTML: string;
  parentHTML: string;
  childSummary: string;

  rect: { x: number; y: number; width: number; height: number };
  styles: Record<string, string>;
  inShadowDom: boolean;
  shadowHostPath: string | null;

  sourceHints: SourceHint[];
  searchHints: string[];
}

const STYLE_PROPS = [
  'display',
  'position',
  'width',
  'height',
  'margin',
  'padding',
  'color',
  'background-color',
  'font-family',
  'font-size',
  'font-weight',
  'line-height',
  'text-align',
  'border',
  'border-radius',
  'box-shadow',
  'flex-direction',
  'justify-content',
  'align-items',
  'gap',
  'grid-template-columns',
  'opacity',
  'z-index',
];

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}\n… [truncated, ${value.length - max} more characters]`;
}

/** Collapse long text nodes so the markup stays readable in a prompt. */
function compactHTML(el: Element, maxTextLength = 120): string {
  const clone = el.cloneNode(true) as Element;
  const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];
  while (walker.nextNode()) texts.push(walker.currentNode as Text);

  for (const node of texts) {
    const value = node.nodeValue ?? '';
    const trimmed = value.replace(/\s+/g, ' ');
    node.nodeValue = trimmed.length > maxTextLength ? `${trimmed.slice(0, maxTextLength)}…` : trimmed;
  }

  return clone.outerHTML.replace(/>\s+</g, '>\n<');
}

/** The element's own tag with attributes, but children replaced by a stub. */
function shallowHTML(el: Element): string {
  const clone = el.cloneNode(false) as Element;
  const childCount = el.children.length;
  clone.innerHTML = childCount > 0 ? `<!-- ${childCount} child element(s) -->` : '…';
  return clone.outerHTML;
}

function getAttributes(el: Element): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const attr of Array.from(el.attributes)) {
    attrs[attr.name] = attr.value.length > 300 ? `${attr.value.slice(0, 300)}…` : attr.value;
  }
  return attrs;
}

function getStyles(el: Element): Record<string, string> {
  const computed = window.getComputedStyle(el);
  const styles: Record<string, string> = {};
  for (const prop of STYLE_PROPS) {
    const value = computed.getPropertyValue(prop).trim();
    if (value && value !== 'none' && value !== 'normal' && value !== 'auto') {
      styles[prop] = value;
    }
  }
  return styles;
}

/* ------------------------------------------------------------------ *
 * Framework introspection
 * ------------------------------------------------------------------ */

interface AnyRecord {
  [key: string]: any;
}

function reactHints(el: Element): SourceHint[] {
  const keys = Object.keys(el);
  const fiberKey = keys.find((k) => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
  if (!fiberKey) return [];

  const hints: SourceHint[] = [];
  let fiber: AnyRecord | null = (el as unknown as AnyRecord)[fiberKey];
  let guard = 0;

  while (fiber && guard++ < 40 && hints.length < 4) {
    const type = fiber.type ?? fiber.elementType;
    let component: string | undefined;

    if (typeof type === 'function') {
      component = type.displayName || type.name;
    } else if (type && typeof type === 'object') {
      component =
        type.displayName ||
        type.render?.displayName ||
        type.render?.name ||
        type.type?.displayName ||
        type.type?.name;
    }

    const source = fiber._debugSource ?? fiber._debugInfo?.[0];
    const file: string | undefined = source?.fileName;

    if (component && component !== 'Unknown' && !hints.some((h) => h.component === component)) {
      hints.push({
        framework: 'React',
        component,
        file: file ? shortenPath(file) : undefined,
        line: source?.lineNumber,
      });
    } else if (file && hints.length === 0) {
      hints.push({ framework: 'React', file: shortenPath(file), line: source?.lineNumber });
    }

    fiber = fiber.return;
  }

  return hints;
}

function vueHints(el: Element): SourceHint[] {
  const node = el as unknown as AnyRecord;
  const hints: SourceHint[] = [];

  // Vue 3
  let instance: AnyRecord | null = node.__vueParentComponent ?? null;
  let guard = 0;
  while (instance && guard++ < 20 && hints.length < 3) {
    const type = instance.type ?? {};
    const component: string | undefined = type.__name || type.name;
    const file: string | undefined = type.__file;
    if (component || file) {
      hints.push({
        framework: 'Vue',
        component,
        file: file ? shortenPath(file) : undefined,
      });
    }
    instance = instance.parent;
  }

  // Vue 2
  const legacy = node.__vue__;
  if (hints.length === 0 && legacy) {
    const options = legacy.$options ?? {};
    hints.push({ framework: 'Vue', component: options.name, file: options.__file ? shortenPath(options.__file) : undefined });
  }

  return hints;
}

function svelteHints(el: Element): SourceHint[] {
  const scoped = Array.from(el.classList).find((c) => /^svelte-[a-z0-9]{5,}$/.test(c));
  return scoped ? [{ framework: 'Svelte', component: `scope class ${scoped}` }] : [];
}

function angularHints(el: Element): SourceHint[] {
  const contentAttr = Array.from(el.attributes).find((a) => a.name.startsWith('_ngcontent-'));
  const hostAttr = Array.from(el.attributes).find((a) => a.name.startsWith('_nghost-'));
  const marker = hostAttr ?? contentAttr;
  if (!marker) return [];
  return [{ framework: 'Angular', component: `component scope ${marker.name}` }];
}

function shortenPath(file: string): string {
  const normalized = file.replace(/\\/g, '/');
  const match = normalized.match(/(?:^|\/)((?:src|app|pages|components|lib|routes)\/.*)$/);
  return match?.[1] ?? normalized.split('/').slice(-3).join('/');
}

function collectSourceHints(el: Element): SourceHint[] {
  const hints: SourceHint[] = [];
  let current: Element | null = el;
  let depth = 0;

  // Framework internals sometimes live on an ancestor rather than the leaf.
  while (current && depth++ < 4 && hints.length === 0) {
    hints.push(...reactHints(current), ...vueHints(current), ...angularHints(current));
    current = current.parentElement;
  }

  hints.push(...svelteHints(el));
  return hints;
}

/* ------------------------------------------------------------------ *
 * Search hints — strings an agent can grep for in the repo
 * ------------------------------------------------------------------ */

function collectSearchHints(el: Element, attrs: Record<string, string>): string[] {
  const hints = new Set<string>();

  const id = attrs['id'];
  if (id) hints.add(`id="${id}"`);

  for (const key of Object.keys(attrs)) {
    if (key.startsWith('data-') || key === 'aria-label' || key === 'name' || key === 'placeholder') {
      const value = attrs[key];
      if (value && value.length <= 60) hints.add(`${key}="${value}"`);
    }
  }

  for (const cls of stableClasses(el).slice(0, 4)) hints.add(`.${cls}`);

  const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
  if (text && text.length <= 80) {
    hints.add(`"${text}"`);
  } else if (text) {
    // Longest distinctive-looking phrase from the start of the content.
    hints.add(`"${text.slice(0, 60).trim()}"`);
  }

  const href = attrs['href'];
  if (href && href.length <= 80) hints.add(`href="${href}"`);

  const src = attrs['src'];
  if (src && src.length <= 80) hints.add(`src="${src}"`);

  return Array.from(hints).slice(0, 10);
}

/* ------------------------------------------------------------------ */

export function buildElementContext(el: Element): ElementContext {
  const rect = el.getBoundingClientRect();
  const attributes = getAttributes(el);
  const root = el.getRootNode();
  const shadowHost = root instanceof ShadowRoot ? root.host : null;

  const children = Array.from(el.children).slice(0, 8).map(describeElement);
  const childSummary =
    el.children.length === 0
      ? '(no child elements)'
      : children.join(', ') + (el.children.length > children.length ? `, … +${el.children.length - children.length} more` : '');

  return {
    url: location.href,
    pageTitle: document.title,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    inIframe: window.top !== window.self,

    tag: el.localName,
    cssSelector: cssSelectorFor(el),
    xpath: xPathFor(el),
    domPath: domPathFor(el),
    label: describeElement(el),

    attributes,
    unstableClasses: Array.from(el.classList).filter((c) => !stableClasses(el).includes(c)),
    text: truncate((el.textContent ?? '').replace(/\s+/g, ' ').trim(), 400),
    outerHTML: truncate(compactHTML(el), 4000),
    parentHTML: el.parentElement ? truncate(shallowHTML(el.parentElement), 600) : '(no parent)',
    childSummary,

    rect: {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    },
    styles: getStyles(el),
    inShadowDom: shadowHost !== null,
    shadowHostPath: shadowHost ? domPathFor(shadowHost) : null,

    sourceHints: collectSourceHints(el),
    searchHints: collectSearchHints(el, attributes),
  };
}
