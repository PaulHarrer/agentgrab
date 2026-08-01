import { defineBackground } from 'wxt/utils/define-background';
import { browser } from 'wxt/browser';
import { ACK, MESSAGE_TYPES, type ExtensionMessage } from '@/lib/messages';

/**
 * The toolbar icon toggles the picker. Frames report back when picking ends so
 * the toggle state stays correct even if the user cancels with Escape.
 */
export default defineBackground(() => {
  const activeTabs = new Set<number>();

  function broadcast(tabId: number, message: ExtensionMessage): Promise<unknown> {
    // Rejects when no frame has a content script — never fatal for us.
    return browser.tabs.sendMessage(tabId, message).catch(() => undefined);
  }

  /** Pages open at install/update time have no content script until reloaded. */
  async function injectContentScript(tabId: number): Promise<boolean> {
    try {
      await browser.scripting.executeScript({
        target: { tabId, allFrames: true },
        files: ['/content-scripts/content.js'],
      });
      return true;
    } catch {
      return false; // Restricted page (chrome://, Web Store, PDF viewer, …).
    }
  }

  async function startPicking(tabId: number) {
    const reply = await broadcast(tabId, { type: MESSAGE_TYPES.start });

    if (reply !== ACK) {
      if (!(await injectContentScript(tabId))) return;
      await broadcast(tabId, { type: MESSAGE_TYPES.start });
    }

    activeTabs.add(tabId);
  }

  async function stopPicking(tabId: number) {
    activeTabs.delete(tabId);
    await broadcast(tabId, { type: MESSAGE_TYPES.stop });
  }

  async function toggle(tabId: number | undefined) {
    if (tabId === undefined) return;
    if (activeTabs.has(tabId)) await stopPicking(tabId);
    else await startPicking(tabId);
  }

  browser.action.onClicked.addListener((tab) => {
    void toggle(tab.id);
  });

  browser.commands?.onCommand.addListener((command, tab) => {
    if (command === 'pick-element') void toggle(tab?.id);
  });

  browser.runtime.onMessage.addListener((message: ExtensionMessage, sender) => {
    if (message?.type !== MESSAGE_TYPES.ended) return;

    const tabId = sender.tab?.id;
    if (tabId === undefined) return;

    activeTabs.delete(tabId);
    // One frame owns the selection now — every other frame drops its overlay.
    void broadcast(tabId, { type: MESSAGE_TYPES.stop, exceptFrame: message.frame });
  });

  browser.tabs.onRemoved.addListener((tabId) => activeTabs.delete(tabId));
  browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'loading') activeTabs.delete(tabId);
  });
});
