import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: '.',
  manifest: {
    name: 'AgentGrab',
    description: 'Grab the right context for your AI agent: pick any element on a page and copy a ready-to-use prompt.',
    permissions: ['scripting', 'activeTab', 'clipboardWrite'],
    action: {
      default_title: 'AgentGrab — pick an element (Alt+Shift+E)',
    },
    commands: {
      'pick-element': {
        suggested_key: { default: 'Alt+Shift+E' },
        description: 'Pick an element on the current page',
      },
    }
  },
});
