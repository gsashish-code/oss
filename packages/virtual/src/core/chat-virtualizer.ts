import { Virtualizer } from './virtualizer.js'
import type { VirtualizerOptions } from '../types.js'

/**
 * ChatVirtualizer: reverse-scroll engine for chat UIs.
 *
 * Invariants this class maintains:
 *  - Scroll is anchored to the bottom by default (stick-to-bottom).
 *  - Prepending items (new messages at top) does NOT jump the scroll position.
 *  - New messages appended at bottom auto-scroll only when already at bottom.
 */
export class ChatVirtualizer extends Virtualizer {
  private stickToBottom = true
  private prevCount: number
  private scrollElement: Element | null = null

  constructor(options: Omit<VirtualizerOptions, 'reverse'>) {
    super({ ...options, reverse: true, onReachedTop: options.onReachedTop })
    this.prevCount = options.count
  }

  override mount(element: Element): void {
    this.scrollElement = element
    super.mount(element)
    // Initial scroll to bottom
    this.scrollToBottom('instant')
  }

  /**
   * Call when item count changes (e.g. new message appended or old messages prepended).
   * Pass the previous count to determine whether this is a prepend or append.
   */
  onCountChange(newCount: number, prevCount: number): void {
    const delta = newCount - prevCount
    if (delta <= 0) return

    const isAppend = newCount > this.prevCount
    this.prevCount = newCount

    if (isAppend && this.stickToBottom) {
      // New message came in at the bottom; scroll down to it
      requestAnimationFrame(() => this.scrollToBottom('smooth'))
    }
    // For prepend: scroll position is preserved by the browser's scroll anchor.
    // If the browser doesn't support it we compensate in the React hook.
  }

  scrollToBottom(behavior: ScrollBehavior = 'smooth'): void {
    const el = this.scrollElement
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior })
  }

  setStickToBottom(value: boolean): void {
    this.stickToBottom = value
  }

  isStuckToBottom(): boolean {
    return this.stickToBottom
  }
}
