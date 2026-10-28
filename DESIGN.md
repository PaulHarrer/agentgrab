# AgentGrab design

The product UI is a single in-page overlay. There is no popup, options page, or dark theme. Everything below is what `entrypoints/content/styles.ts` and `entrypoints/content/picker.ts` actually render.

The overlay is a custom element (`agentgrab-overlay`) appended to `document.documentElement`, with an open shadow root. `:host { all: initial }` plus the shadow root keep page CSS out and stop the overlay from leaking styles back. `color-scheme: light` is forced. Interactive pieces opt into pointer events; the host itself is `pointer-events: none`.

## Principles

- Sit on the page, don't cover it. No dim, no fill, no glow on the highlight. A 2px outline is the whole spotlight.
- Light surfaces only. White cards, near-black inspector chip, neutral gray text.
- One accent for the highlight (`#5174ff`). Active tools use a separate indigo, not that blue.
- Pills for the dock, a soft card for the capture panel. Corners are either fully round or quietly rounded — nothing in between on the chrome.
- Stroke icons, current color, no fills.
- Motion is short and positional. The highlight tracks the pointer; the card fades up once.

## Color

Declared token:

| Token | Value | Use |
| --- | --- | --- |
| `--ag-accent` | `#5174ff` | Spotlight outline only |

Everything else is a literal.

| Role | Value |
| --- | --- |
| Card / dock / stage base | `#fff` |
| Inspector chip | `#17171a` |
| Chip text | `#fff` |
| Chip secondary | `rgba(255, 255, 255, 0.62)` |
| Body text | `#1a1a1a` |
| Card title | `#3f3f3f` |
| Meta value | `#1c1c1c` |
| Meta label | `#a3a3a3` |
| Empty value | `#c4c4c4` |
| Placeholder | `#b0b0b0` |
| Dock / nav icon | `#8a8a8a` |
| Dock / nav hover | `#3a3a3a` on `#f3f3f3` |
| Header icon | `#8d8d8d`, hover `#1a1a1a` on `#f3f3f3` |
| Action label | `#6a6a6a`, hover `#2a2a2a` on `#f0f0f0` |
| Active tool | `#5c5ce0` on `#e8e7fb` |
| Field | `#f5f5f5` |
| Field focus ring | `#e4e4e4` |
| Prompt preview | `#3a3a3a` on `#f6f6f6` |
| Divider | `#eee` |
| Checkerboard tile | `#e6e6e6` on `#fff` |

Locked vs hovering does not change color. `.spotlight[data-locked]` and `.badge[data-locked]` repeat the same values.

Disabled controls drop to `opacity: 0.35` and lose pointer events. There is no separate disabled color.

## Type

UI face: `Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`.

Inspector face: `"Geist Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` (`--ag-mono`).

Neither face is loaded by the extension. If Inter or Geist Mono is not already installed, the stack falls through to the system UI or system mono. The prompt preview does not use `--ag-mono`; it uses `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`. The request field also drops `-apple-system` and `"Segoe UI"` from the UI stack.

| Use | Spec |
| --- | --- |
| Popover | `13px / 1.4`, weight 400 |
| Title, nav, actions | `13px / 1`, weight 500 |
| Meta label | `13px`, weight 400, `#a3a3a3` |
| Meta value | `13.5px`, weight 500, `#1c1c1c` |
| Empty meta | same size, weight 400, `#c4c4c4`, text is an em dash |
| Request field | `13px / 1.45` |
| Inspector badge | `500 11px / 1.35` mono, nowrap, ellipsis |
| Prompt preview | `11px / 1.5` mono, wraps |

No letter-spacing. Truncation is ellipsis on the title, badge, and meta values. Full strings live on `title`.

## Elevation

Surfaces float. Borders are hairline shadows, not `border`.

| Surface | Shadow |
| --- | --- |
| Dock, nav pill | `0 0 0 1px rgba(0, 0, 0, 0.06), 0 8px 28px rgba(0, 0, 0, 0.12)` |
| Popover | `0 0 0 1px rgba(0, 0, 0, 0.06), 0 16px 48px -12px rgba(0, 0, 0, 0.22), 0 2px 8px rgba(0, 0, 0, 0.04)` |
| Badge | `0 0 0 1px rgba(0, 0, 0, 0.2)` |

Host `z-index` is `2147483647`. Inside the shadow root the dock anchor is `z-index: 2`. The popover is a later sibling, so it paints above the dock.

## Radius

| Element | Radius |
| --- | --- |
| Spotlight | `2px` |
| Badge | `6px` |
| Header icon button | `8px` |
| Field, action, preview | `10px` |
| Stage | `12px` |
| Popover | `20px` |
| Dock, nav pill, dock button, nav button | `999px` |

## Space

Dock sits `16px` off the bottom, centered with `left: 50%` + `translateX(-50%)` on an anchor, not on the pill itself. That keeps the dock still when the nav pill hangs off the left (`right: calc(100% + 8px)`, `8px` gap).

Popover is fixed, `340px` wide, `bottom: 80px`, centered the same way. It caps at `calc(100vw - 24px)` and `calc(100vh - 108px)`, and scrolls internally.

| Piece | Size |
| --- | --- |
| Dock / nav height | `52px` |
| Dock padding / gap | `0 8px` / `2px` |
| Dock button | `36 × 36` |
| Nav button | height `36`, padding `0 10px`, icon-to-label gap `6px` |
| Nav pill padding | `0 6px` |
| Close tool | extra `4px` left margin |
| Popover padding | `6px 0 8px` |
| Header | min-height `40px`, padding `2px 8px 4px 6px`, gap `2px` |
| Header icon button | `32 × 32` |
| Stage | height `168px`, margin `0 12px` |
| Stage inset when scaling | `12px` each side (`clientWidth/Height - 24`) |
| Meta | padding `14px 16px 8px`, row gap `9px`, label column `72px`, label-to-value `12px` |
| Field | margin `4px 12px 8px`, padding `8px 10px`, min-height `52px`, max-height `20vh` |
| Divider | `1px`, margin `2px 0 4px` |
| Actions | 2 columns, gap `2px`, padding `2px 8px`, button height `36`, icon gap `8px` |
| Preview | margin `4px 12px 6px`, padding `10px 12px`, max-height `22vh` |

Badge max width is `min(460px, 90vw)`, padding `3px 7px`. It prefers to sit `4px` above the element (needs ~`28px` of room). Otherwise it drops `4px` below, and never closer than `4px` to the viewport edge.

## Icons

All icons are inline SVG: `fill="none"`, `stroke="currentColor"`, `stroke-width="1.75"`, round caps and joins. Sizes: `18` on dock tools, `16` on nav, header, and close, `15` on card actions.

| Control | Mark |
| --- | --- |
| Pick | Crosshair |
| Grabbed element | Clipboard |
| Dock close | X |
| Step out / in | Up / down arrow, labeled "Up" / "Down" |
| Pick another | Left chevron |
| Card close | Trash can (not an X) |
| Preview | Eye |
| Copy | Overlapping squares |

Buttons reset `appearance` and use `margin: 0` so page button styles cannot leak in before `all: initial` on the host does its job. Icon buttons are `display: grid; place-items: center`.

## Surfaces

### Spotlight

Fixed box matching the element's `getBoundingClientRect`. `outline: 2px solid var(--ag-accent)`, `outline-offset: 0`, no background. Position and size transition in `90ms ease-out`. Hidden until something is hovered or selected.

### Badge

Dark chip, mono, one line: selector text, then a dim `  W × H` in rounded pixels. Same chip when locked.

### Dock

White pill, top frame only. Three tools: pick, grabbed element, close. Pick is active (indigo) while choosing. Grab is disabled until an element is selected, then it becomes the active tool and focuses the request field. Close finishes the session. Iframes do not show the dock.

### Nav pill

Same white pill, hanging off the dock's left, shown only in the top frame once an element is selected. Up walks to the parent and pushes the current node onto a trail. Down walks back down that trail, or to the first real child. A button disables when there is nowhere to go.

### Popover

White card, `20px` radius, enters with `ag-in`: `160ms ease-out`, from `opacity: 0` and `translateY(8px)` to opaque and in place. The horizontal centering transform is part of that animation, so it does not jump.

Order inside the card:

1. Header — back (repick), centered title (element label), trash (close).
2. Stage — `168px` checkerboard (`16px` tiles). A sanitized clone of the element is scaled to fit, capped at `1.5` and floored at `0.05`, with `12px` padding. Clone styles are copied inline because page CSS cannot reach the shadow root.
3. Meta — Tag, Text, Classes, Selector, Page, Source. Page is the hostname with `www.` stripped. Source is the first framework hint. Missing values are an em dash in the empty color.
4. Request field — placeholder "What should change?", no border, gray fill, inset `1px` ring on focus, vertical resize only.
5. Hairline.
6. Two actions — Preview and Copy prompt. Active and copied states share the action hover fill.
7. Prompt preview — hidden until Preview is on, or until copy fails. Then the toggle reads "Hide preview".

Copy success swaps the label to "Copied" for 2 seconds. Failure shows "Copy failed" and opens the preview so the prompt can still be taken by hand.

### Page cursor

While picking, `html.agentgrab-picking` forces `cursor: crosshair` and `user-select: none` on the page, including every descendant. That style is injected into the host document, not the shadow root. It comes off as soon as an element is selected.

## Interaction

| Input | Result |
| --- | --- |
| Toolbar icon or Alt+Shift+E | Start or stop |
| Hover | Move spotlight and badge |
| Click | Select. Page click is swallowed |
| ↑ / ↓ | Parent / child. In the field, arrows type instead |
| Enter | Select the highlight |
| Ctrl/Cmd+Enter | Copy, from the field |
| Esc | Close |

Hover fills are instant. No transition is set on buttons.

## Brand mark

Extension icons live in `public/icon/` at 16, 32, 48, 96, and 128. The mark is a rounded square with a blue-to-violet raised fist. The toolbar action has no popup; the title is "AgentGrab — pick an element (Alt+Shift+E)".

The wordmark in the README is plain centered type under that icon. Product name is AgentGrab. Line under it: "Grab the right context for your AI Agent".

## Out of scope

Not part of the current UI, so don't invent them to match this file:

- Dark mode. `color-scheme: light` is intentional.
- A browser-action popup or settings page.
- A second accent. `#5174ff` is the highlight. `#5c5ce0` / `#e8e7fb` is the active tool. They are not interchangeable.
- Page dimming, spotlight fill, or a glow.
- Loaded webfonts. Name Inter and Geist Mono in new UI, and keep the same fallbacks, unless fonts are actually bundled.
