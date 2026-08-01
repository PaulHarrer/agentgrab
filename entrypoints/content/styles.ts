/**
 * Styles for the picker UI. Lives inside a shadow root, and `all: initial`
 * on the host stops the page's own CSS from leaking in.
 */
export const PICKER_STYLES = /* css */ `
:host {
  all: initial;
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  pointer-events: none;
  color-scheme: dark;
  --ag-accent: #6d5efc;
  --ag-accent-soft: rgba(109, 94, 252, 0.25);
  --ag-locked: #22c55e;
  --ag-surface: #14161f;
  --ag-surface-2: #1b1e2a;
  --ag-text: #e9eaf2;
  --ag-muted: #9aa1b8;
  --ag-border: rgba(255, 255, 255, 0.1);
  --ag-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --ag-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
}

* { box-sizing: border-box; }

.spotlight {
  position: fixed;
  border-radius: 3px;
  pointer-events: none;
  box-shadow: 0 0 0 2px var(--ag-accent), 0 0 0 100vmax rgba(9, 10, 16, 0.45);
  transition: top 90ms ease-out, left 90ms ease-out, width 90ms ease-out, height 90ms ease-out;
}

.spotlight[data-locked="true"] {
  box-shadow: 0 0 0 2px var(--ag-locked), 0 0 0 100vmax rgba(9, 10, 16, 0.55);
}

.badge {
  position: fixed;
  pointer-events: none;
  max-width: min(460px, 90vw);
  padding: 4px 8px;
  border-radius: 6px;
  background: var(--ag-accent);
  color: #fff;
  font: 500 11px/1.45 var(--ag-mono);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
}

.badge[data-locked="true"] { background: var(--ag-locked); color: #04210f; }
.badge .dim { opacity: 0.72; }

.toolbar {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 16px;
  border-radius: 999px;
  background: rgba(20, 22, 31, 0.94);
  border: 1px solid var(--ag-border);
  color: var(--ag-text);
  font: 12px/1 var(--ag-font);
  box-shadow: 0 10px 34px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(10px);
  white-space: nowrap;
}

.toolbar .mark {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--ag-accent);
  box-shadow: 0 0 0 4px var(--ag-accent-soft);
}

.toolbar .hint { color: var(--ag-muted); display: flex; align-items: center; gap: 6px; }

kbd {
  display: inline-block;
  padding: 2px 5px;
  border-radius: 4px;
  border: 1px solid var(--ag-border);
  background: rgba(255, 255, 255, 0.06);
  font: 500 10px/1.3 var(--ag-mono);
  color: var(--ag-text);
}

.popover {
  position: fixed;
  width: 420px;
  max-width: calc(100vw - 24px);
  pointer-events: auto;
  background: var(--ag-surface);
  border: 1px solid var(--ag-border);
  border-radius: 14px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
  color: var(--ag-text);
  font: 13px/1.5 var(--ag-font);
  overflow: hidden;
  animation: ag-in 140ms ease-out;
  user-select: auto;
}

@keyframes ag-in {
  from { opacity: 0; transform: translateY(-6px) scale(0.98); }
  to { opacity: 1; transform: none; }
}

.pop-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 12px 11px 14px;
  border-bottom: 1px solid var(--ag-border);
}

.pop-head .mark {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--ag-locked);
  flex: none;
}

.pop-title { font-weight: 600; font-size: 12px; letter-spacing: 0.01em; flex: none; }

.pop-target {
  flex: 1;
  min-width: 0;
  font: 11px/1.4 var(--ag-mono);
  color: var(--ag-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  direction: rtl;
  text-align: left;
}

.icon-btn {
  flex: none;
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--ag-muted);
  font: 15px/1 var(--ag-font);
  cursor: pointer;
}
.icon-btn:hover { background: rgba(255, 255, 255, 0.08); color: var(--ag-text); }

.pop-body { padding: 12px 14px; }

label.field {
  display: block;
  margin-bottom: 6px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ag-muted);
}

textarea {
  display: block;
  width: 100%;
  min-height: 96px;
  max-height: 40vh;
  padding: 10px 11px;
  border-radius: 9px;
  border: 1px solid var(--ag-border);
  background: var(--ag-surface-2);
  color: var(--ag-text);
  font: 13px/1.55 var(--ag-font);
  resize: vertical;
  outline: none;
}
textarea::placeholder { color: #6c7390; }
textarea:focus { border-color: var(--ag-accent); box-shadow: 0 0 0 3px var(--ag-accent-soft); }

.pop-foot {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px 13px;
}

button.action {
  border: 1px solid transparent;
  border-radius: 9px;
  padding: 8px 13px;
  font: 600 12.5px/1 var(--ag-font);
  cursor: pointer;
  transition: background 120ms, border-color 120ms;
}

button.primary { background: var(--ag-accent); color: #fff; flex: 1; }
button.primary:hover { background: #7c6ffd; }
button.primary[data-copied="true"] { background: var(--ag-locked); color: #04210f; }

button.ghost { background: transparent; border-color: var(--ag-border); color: var(--ag-muted); }
button.ghost:hover { color: var(--ag-text); border-color: rgba(255, 255, 255, 0.22); }

.pop-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 14px;
  border-top: 1px solid var(--ag-border);
  font-size: 11px;
  color: var(--ag-muted);
}

.pop-meta .facts { display: flex; gap: 10px; overflow: hidden; white-space: nowrap; }
.pop-meta .facts span { overflow: hidden; text-overflow: ellipsis; }

.link-btn {
  border: 0;
  background: transparent;
  color: var(--ag-muted);
  font: 11px/1 var(--ag-font);
  cursor: pointer;
  padding: 3px 4px;
  border-radius: 5px;
  flex: none;
}
.link-btn:hover { color: var(--ag-text); background: rgba(255, 255, 255, 0.07); }

pre.preview {
  margin: 0;
  padding: 12px 14px;
  max-height: 34vh;
  overflow: auto;
  border-top: 1px solid var(--ag-border);
  background: #0e1017;
  color: #969dba;
  font: 11px/1.6 var(--ag-mono);
  white-space: pre-wrap;
  word-break: break-word;
}

[hidden] { display: none !important; }
`;

/** Applied to the host page (not the shadow root) while picking is active. */
export const PAGE_STYLES = /* css */ `
html.agentgrab-picking, html.agentgrab-picking * {
  cursor: crosshair !important;
  user-select: none !important;
}
`;
