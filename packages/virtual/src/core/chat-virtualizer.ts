import { Virtualizer } from './virtualizer.js'
import type { VirtualizerOptions } from '../types.js'

/**
 * ChatVirtualizer: reverse-scroll engine for chat UIs.
 *
 * Invariants:
 *  - Scroll anchors to the bottom by default (stick-to-bottom).
 *  - Prepending items does NOT jump the scroll position.
 *  - Appended items auto-scroll only when already at the bottom.
 */
export class ChatVirtualizer extends Virtualizer {
  // No `scrollElement` field here — the parent's protected field is used directly.
  private stickToBottom = true
  private prevCount: number

  constructor(options: Omit<VirtualizerOptions, 'reverse'>) {
    super({ ...options, reverse: true })
    this.prevCount = options.count
  }

  override mount(element: Element): void {
    super.mount(element)
    this.scrollToBottom('instant')
  }

  /**
   * Call when item count changes.
   * @param newCount  The new total count.
   * @param prevCount The count before the update — used to detect append vs prepend.
   */
  onCountChange(newCount: number, prevCount: number): void {
    const delta = newCount - prevCount
    if (delta <= 0) return

    this.prevCount = newCount
    this.updateOptions({ count: newCount })

    if (this.stickToBottom) {
      requestAnimationFrame(() => this.scrollToBottom('smooth'))
    }
    // For prepend: browser scroll anchor preserves the visual position.
  }

  scrollToBottom(behavior: ScrollBehavior = 'smooth'): void {
    // `scrollElement` is protected on the parent class — accessible here.
    if (!this.scrollElement) return
    this.scrollElement.scrollTo({ top: this.scrollElement.scrollHeight, behavior })
  }

  setStickToBottom(value: boolean): void {
    if (this.stickToBottom !== value) {
      this.stickToBottom = value
      this.notify()
    }
  }

  isStuckToBottom(): boolean {
    return this.stickToBottom
  }
}
