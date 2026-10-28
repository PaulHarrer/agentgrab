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
  color-scheme: light;
  --ag-accent: #5174ff;
  --ag-mono: "Geist Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

* { box-sizing: border-box; }

/* Spotlight: a crisp outline only — no fill, no glow, no page dim. */
.spotlight {
  position: fixed;
  outline: 2px solid var(--ag-accent);
  outline-offset: 0;
  border-radius: 2px;
  pointer-events: none;
  transition: top 90ms ease-out, left 90ms ease-out, width 90ms ease-out, height 90ms ease-out;
}

.spotlight[data-locked="true"] {
  outline-color: var(--ag-accent);
}

/* Inspector badge: a dark chip sitting over the page. */
.badge {
  position: fixed;
  pointer-events: none;
  max-width: min(460px, 90vw);
  padding: 3px 7px;
  border-radius: 6px;
  background: #17171a;
  color: #fff;
  font: 500 11px/1.35 var(--ag-mono);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.2);
}

.badge[data-locked="true"] { background: #17171a; color: #fff; }
.badge .dim { color: rgba(255, 255, 255, 0.62); }

/* Dock: a bottom-center white pill, visible in the top frame during
 * picking and editing alike. Tool buttons, with the close action at
 * the far right. Centering lives on the anchor so the nav pill can hang
 * off its left without the dock jumping when it appears. */
.dock-anchor {
  position: fixed;
  left: 50%;
  bottom: 16px;
  transform: translateX(-50%);
  z-index: 2;
  pointer-events: none;
  width: max-content;
}

.toolbar {
  position: relative;
  left: auto;
  bottom: auto;
  transform: none;
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 2px;
  height: 52px;
  padding: 0 8px;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.06), 0 8px 28px rgba(0, 0, 0, 0.12);
}

/* Nav pill: up/down stepping controls, hanging off the dock's left. */
.nav-pill {
  position: absolute;
  top: 0;
  right: calc(100% + 8px);
  height: 52px;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 0 6px;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.06), 0 8px 28px rgba(0, 0, 0, 0.12);
  pointer-events: auto;
}

.nav-btn {
  margin: 0;
  appearance: none;
  -webkit-appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 36px;
  padding: 0 10px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #8a8a8a;
  font: 500 13px/1 Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  cursor: pointer;
}

.nav-btn svg { display: block; flex: none; }
.nav-btn span { display: block; line-height: 1; }
.nav-btn:hover { background: #f3f3f3; color: #3a3a3a; }
.nav-btn:disabled { opacity: 0.35; cursor: default; pointer-events: none; }

.dock-btn {
  margin: 0;
  appearance: none;
  -webkit-appearance: none;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #8a8a8a;
  display: grid;
  place-items: center;
  padding: 0;
  cursor: pointer;
}

.dock-btn:hover {
  background: #f3f3f3;
  color: #3a3a3a;
}

.dock-btn[data-active="true"] {
  background: #e8e7fb;
  color: #5c5ce0;
}

.dock-btn:disabled {
  opacity: 0.35;
  cursor: default;
  pointer-events: none;
}

.dock-close {
  margin-left: 4px;
}

/* Popover: a centered white capture card floating above the dock. */
.popover {
  position: fixed;
  left: 50%;
  bottom: 80px;
  transform: translateX(-50%);
  width: 340px;
  max-width: calc(100vw - 24px);
  max-height: calc(100vh - 108px);
  overflow: auto;
  pointer-events: auto;
  background: #fff;
  color: #1a1a1a;
  border: 0;
  border-radius: 20px;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.06), 0 16px 48px -12px rgba(0, 0, 0, 0.22), 0 2px 8px rgba(0, 0, 0, 0.04);
  font: 13px/1.4 Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  padding: 6px 0 8px;
  animation: ag-in 160ms ease-out;
  user-select: auto;
}

@keyframes ag-in {
  from { opacity: 0; transform: translateX(-50%) translateY(8px); }
  to { opacity: 1; transform: translateX(-50%); }
}

.pop-head {
  display: flex;
  align-items: center;
  gap: 2px;
  min-height: 40px;
  padding: 2px 8px 4px 6px;
}

.pop-title {
  flex: 1;
  min-width: 0;
  text-align: center;
  font-weight: 500;
  font-size: 13px;
  color: #3f3f3f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.icon-btn {
  margin: 0;
  appearance: none;
  -webkit-appearance: none;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #8d8d8d;
  display: grid;
  place-items: center;
  padding: 0;
  cursor: pointer;
}

.icon-btn:hover {
  background: #f3f3f3;
  color: #1a1a1a;
}

/* Stage: rounded checkerboard the captured element is scaled into. */
.stage {
  margin: 0 12px;
  height: 168px;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #fff;
  background-image:
    linear-gradient(45deg, #e6e6e6 25%, transparent 25%),
    linear-gradient(-45deg, #e6e6e6 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #e6e6e6 75%),
    linear-gradient(-45deg, transparent 75%, #e6e6e6 75%);
  background-size: 16px 16px;
  background-position: 0 0, 0 8px, 8px -8px, -8px 0;
}

.preview-fit {
  position: relative;
  flex: none;
}

.preview-fit > * {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: top left;
  pointer-events: none;
}

/* Ancestor fills, scaled with the clone. Clipped to the element's box so a
 * parent gradient shows the slice that actually sits behind it. */
.preview-backdrop {
  overflow: hidden;
  z-index: 0;
}

.meta {
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 14px 16px 8px;
}

.meta-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  min-width: 0;
}

.meta-k {
  width: 72px;
  flex: none;
  color: #a3a3a3;
  font-size: 13px;
  font-weight: 400;
}

.meta-v {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #1c1c1c;
  font-size: 13.5px;
  font-weight: 500;
}

.meta-v.is-empty {
  color: #c4c4c4;
  font-weight: 400;
}

textarea {
  display: block;
  width: calc(100% - 24px);
  margin: 4px 12px 8px;
  min-height: 52px;
  max-height: 20vh;
  padding: 8px 10px;
  border: 0;
  border-radius: 10px;
  background: #f5f5f5;
  color: #1a1a1a;
  font: 13px/1.45 Inter, ui-sans-serif, system-ui, sans-serif;
  resize: vertical;
  outline: none;
  box-shadow: none;
}

textarea::placeholder {
  color: #b0b0b0;
}

textarea:focus {
  box-shadow: inset 0 0 0 1px #e4e4e4;
}

.rule {
  height: 1px;
  margin: 2px 0 4px;
  background: #eee;
}

.actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px;
  padding: 2px 8px 2px;
}

button.action {
  margin: 0;
  appearance: none;
  -webkit-appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 36px;
  padding: 0;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #6a6a6a;
  font: 500 13px/1 Inter, ui-sans-serif, system-ui, sans-serif;
  cursor: pointer;
  text-align: center;
}

button.action span {
  display: block;
  line-height: 1;
}

button.action svg {
  display: block;
  flex: none;
}

button.action:hover,
button.action[data-active="true"],
button.action[data-copied="true"] {
  background: #f0f0f0;
  color: #2a2a2a;
}

pre.preview {
  margin: 4px 12px 6px;
  padding: 10px 12px;
  max-height: 22vh;
  overflow: auto;
  border: 0;
  border-radius: 10px;
  background: #f6f6f6;
  color: #3a3a3a;
  font: 11px/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
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
