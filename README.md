<p align="center" style="margin-bottom: 0px !important;">
  <img width="128" src="public/icon/128.png" alt="AgentGrab Icon" align="center">
</p>
<h1 align="center" style="margin-top: 0px;margin-bottom: 0px;">AgentGrab</h1>
<h2 align="center" style="margin-top: 0px;">
    Grab the right context for your AI Agent
</h2>

<p align="center">
    <picture><source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/group/github/stars/PaulHarrer/agentgrab+github/forks/PaulHarrer/agentgrab+github/license/PaulHarrer/agentgrab.svg?variant=outline&amp;mode=dark"><img alt="github group" src="https://shieldcn.dev/group/github/stars/PaulHarrer/agentgrab+github/forks/PaulHarrer/agentgrab+github/license/PaulHarrer/agentgrab.svg?variant=outline&amp;mode=light"></picture>
</p>

---

Stop describing UI changes to your AI coding agent in words. Point at the element instead.

AgentGrab is a browser extension that turns any element on a web page into a complete,
ready-to-paste prompt for agents like Cursor, Claude Code or GitHub Copilot. Click the element,
type what should change, and copy — the extension assembles everything the agent needs to find
that element in your codebase and edit it correctly.

No more _"the grey button under the pricing table, second one from the left."_

## How it works

1. **Start picking** — click the toolbar icon or press <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>E</kbd>.
   Hovering the page highlights elements with a live selector and size badge; page clicks are
   swallowed while picking, so selecting a link or submit button will not navigate away.
2. **Select an element** — click it, or use <kbd>↑</kbd> / <kbd>↓</kbd> to step to its parent or
   child until the highlight matches exactly what you mean.
3. **Say what should change** — e.g. _"make this full width on mobile and use the brand colour
   instead of grey."_ The generated prompt can be inspected first via **Preview**.
4. **Copy and paste** — hit **Copy prompt** (or <kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>Enter</kbd>)
   and paste it into your agent.

### Keyboard shortcuts

| Key | Action |
| --- | --- |
| <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>E</kbd> | Start / stop picking (rebind at `chrome://extensions/shortcuts`) |
| <kbd>↑</kbd> / <kbd>↓</kbd> | Select parent / child element |
| <kbd>Enter</kbd> | Select the highlighted element |
| <kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>Enter</kbd> | Copy the prompt |
| <kbd>Esc</kbd> | Cancel |

## What ends up in the prompt

The output is structured Markdown — not just a CSS selector. For the picked element it contains:

- **A stable CSS selector.** Test ids (`data-testid`, `data-cy`, …), semantic attributes and
  readable class names are preferred over build-generated hashes, because the selector has to map
  back to *source code*, not just to the rendered DOM. Ancestors are only added while the selector
  is still ambiguous.
- **XPath and a readable DOM path**, e.g. `body > main.content > section > button#submit`.
- **Current markup** — the element's outer HTML, whitespace-collapsed and truncated.
- **Parent element** (shallow) and a summary of direct children, for structural context.
- **All attributes**, including `data-*` and ARIA attributes.
- **Visible text content.**
- **Computed styles as rendered** — layout, spacing, colours, typography, flex/grid, radius, shadow.
- **Rendered box and viewport size**, plus flags for elements inside an iframe or a shadow root.
- **Source hints from the running framework** — the React, Vue, Svelte or Angular component that
  rendered the element. React and Vue also expose the source file and line when the page is running
  a dev build; in production builds usually only the component name survives.
- **Grep strings** — a shortlist of distinctive strings (ids, test ids, `aria-label`, visible text,
  `href`) the agent can search for to locate the source immediately.
- **Instructions** telling the agent to find the real source, confirm the match before editing,
  change only what was asked, and report back rather than guess if the element cannot be found.

Works inside iframes and shadow DOM. The overlay lives in its own shadow root, so it neither
inherits nor disturbs the page's styling.

## Privacy

Everything runs locally. The extension makes **no network requests**, has no account, no analytics
and no tracking — the prompt goes to your clipboard and nowhere else. It reads the page only after
you explicitly start the picker, and requests the minimum permissions: `activeTab`, `scripting`
(to inject the content script into tabs that were already open at install time) and `clipboardWrite`.

## Development

Built with [WXT](https://wxt.dev) and TypeScript.

```bash
bun install
bun run dev            # Chrome, with hot reload
bun run dev:firefox    # Firefox
bun run build          # production build → .output/chrome-mv3
bun run zip            # packaged zip for the store
bun run compile        # type-check only
```

Installs ignore package versions published in the last 7 days, including transitive dependencies (`bunfig.toml`).

To load a build manually: `chrome://extensions` → enable **Developer mode** → **Load unpacked** →
select `.output/chrome-mv3`.

### Project layout

```
entrypoints/
  background.ts        toolbar/shortcut toggle, content-script injection, per-tab state
  content/
    index.ts           content script entry, message handling, one picker per frame
    picker.ts          overlay, highlighting, keyboard navigation, popover, clipboard
    styles.ts          shadow-root and page styles
lib/
  selector.ts          stable CSS selector, XPath and DOM path generation
  context.ts           element context collection + framework introspection
  prompt.ts            renders the context into the final Markdown prompt
  messages.ts          message types shared by background and content script
```

## License

[MIT](LICENSE) © Paul Harrer
