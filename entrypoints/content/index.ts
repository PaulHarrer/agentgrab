import { defineContentScript } from 'wxt/utils/define-content-script';
import { browser } from 'wxt/browser';
import { ACK, MESSAGE_TYPES, type ExtensionMessage } from '@/lib/messages';
import { ElementPicker } from './picker';

declare global {
  interface Window {
    __agentgrabLoaded?: boolean;
  }
}

export default defineContentScript({
  matches: ['<all_urls>'],
  allFrames: true,
  runAt: 'document_idle',

  main() {
    // `scripting.executeScript` may re-run this in a frame that already has it.
    if (window.__agentgrabLoaded) return;
    window.__agentgrabLoaded = true;

    const frameToken = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    const picker = new ElementPicker(frameToken);

    picker.onEnded = () => {
      void browser.runtime
        .sendMessage({ type: MESSAGE_TYPES.ended, frame: frameToken } satisfies ExtensionMessage)
        .catch(() => undefined);
    };

    browser.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
      if (message?.type === MESSAGE_TYPES.start) {
        picker.start();
        sendResponse(ACK);
      } else if (message?.type === MESSAGE_TYPES.stop) {
        // The frame that owns the current selection keeps its popover open.
        if (message.exceptFrame !== frameToken) picker.stop();
        sendResponse(ACK);
      }
      return false;
    });
  },
});
