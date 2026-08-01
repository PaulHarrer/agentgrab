export const MESSAGE_TYPES = {
  start: 'agentgrab:start',
  stop: 'agentgrab:stop',
  ended: 'agentgrab:ended',
} as const;

/** Reply a content script sends back so the background knows it's alive. */
export const ACK = 'agentgrab:ack';

export type ExtensionMessage =
  /** Background → content: activate the element picker in this frame. */
  | { type: typeof MESSAGE_TYPES.start }
  /**
   * Background → content: tear down picker UI.
   * `exceptFrame` is the token of the frame that owns the current selection —
   * that frame keeps its popover open while every other frame cleans up.
   */
  | { type: typeof MESSAGE_TYPES.stop; exceptFrame?: string }
  /** Content → background: this frame finished picking (selected or cancelled). */
  | { type: typeof MESSAGE_TYPES.ended; frame: string };
