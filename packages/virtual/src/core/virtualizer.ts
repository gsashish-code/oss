import { findStartIndex } from '../utils/binary-search.js'
import { MeasureCache } from '../utils/measure-cache.js'
import type {
  VirtualItem,
  VirtualizerOptions,
  VirtualizerState,
  ScrollToIndexOptions,
} from '../types.js'

const DEFAULT_OVERSCAN = 3

export class Virtualizer {
  private options: Required<
    Omit<VirtualizerOptions, 'onReachedTop' | 'onReachedBottom' | 'getItemKey'>
  > &
    Pick<VirtualizerOptions, 'onReachedTop' | 'onReachedBottom' | 'getItemKey'>

  private cache = new MeasureCache()
  private offsets: number[] = []
  private scrollElement: Element | null = null
  private rafId: number | null = null
  private observers = new Map<number, ResizeObserver>()
  private listeners: Array<() => void> = []
  private scrollOffset = 0
  private isScrolling = false
  private scrollTimer: ReturnType<typeof setTimeout> | null = null
  private cachedState: VirtualizerState | null = null

  constructor(options: VirtualizerOptions) {
    this.options = {
      overscan: DEFAULT_OVERSCAN,
      scrollMargin: 0,
      reverse: false,
      ...options,
    }
    this.recomputeOffsets(0)
  }

  // ─── Public API ─────────────────────────────────────────────────

  subscribe(listener: () => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  mount(element: Element): void {
    this.scrollElement = element
    element.addEventListener('scroll', this.handleScroll, { passive: true })
    this.syncScrollOffset()
  }

  unmount(): void {
    this.scrollElement?.removeEventListener('scroll', this.handleScroll)
    this.scrollElement = null
    this.observers.forEach((o) => o.disconnect())
    this.observers.clear()
    if (this.rafId !== null) cancelAnimationFrame(this.rafId)
    if (this.scrollTimer !== null) clearTimeout(this.scrollTimer)
  }

  measureItem(index: number, element: Element): void {
    if (!element) return

    const existing = this.observers.get(index)
    if (existing) existing.disconnect()

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      const size =
        this.isHorizontal()
          ? entry.contentRect.width
          : entry.contentRect.height

      if (this.cache.get(index) !== size) {
        this.cache.set(index, size)
        this.recomputeOffsets(index)
        this.notify()
      }
    })

    observer.observe(element)
    this.observers.set(index, observer)
  }

  scrollToIndex({ index, align = 'auto', behavior = 'smooth' }: ScrollToIndexOptions): void {
    const el = this.scrollElement
    if (!el) return

    const itemOffset = this.offsets[index] ?? 0
    const itemSize = this.getSizeAt(index)
    const viewportSize = this.getViewportSize()
    const currentOffset = this.scrollOffset

    let targetOffset: number
    if (align === 'start') {
      targetOffset = itemOffset
    } else if (align === 'end') {
      targetOffset = itemOffset + itemSize - viewportSize
    } else if (align === 'center') {
      targetOffset = itemOffset + itemSize / 2 - viewportSize / 2
    } else {
      // auto: scroll only if not visible
      if (itemOffset >= currentOffset && itemOffset + itemSize <= currentOffset + viewportSize) {
        return
      }
      targetOffset = itemOffset < currentOffset ? itemOffset : itemOffset + itemSize - viewportSize
    }

    el.scrollTo({
      [this.isHorizontal() ? 'left' : 'top']: Math.max(0, targetOffset),
      behavior,
    })
  }

  getState(): VirtualizerState {
    const items = this.getVirtualItems()
    const totalSize = this.getTotalSize()
    const prev = this.cachedState

    // Return the same reference when nothing changed so useSyncExternalStore
    // does not schedule a spurious re-render.
    if (
      prev !== null &&
      prev.totalSize === totalSize &&
      prev.scrollOffset === this.scrollOffset &&
      prev.isScrolling === this.isScrolling &&
      prev.items.length === items.length &&
      (items.length === 0 ||
        (prev.items[0]?.start === items[0]?.start &&
          prev.items[items.length - 1]?.start === items[items.length - 1]?.start))
    ) {
      return prev
    }

    this.cachedState = { items, totalSize, scrollOffset: this.scrollOffset, isScrolling: this.isScrolling }
    return this.cachedState
  }

  updateOptions(options: Partial<VirtualizerOptions>): void {
    this.options = { ...this.options, ...options }
    this.recomputeOffsets(0)
    this.notify()
  }

  // ─── Internal ───────────────────────────────────────────────────

  private handleScroll = (): void => {
    if (this.rafId !== null) return

    this.rafId = requestAnimationFrame(() => {
      this.rafId = null
      this.syncScrollOffset()
    })
  }

  private syncScrollOffset(): void {
    const el = this.scrollElement
    if (!el) return

    const prev = this.scrollOffset
    this.scrollOffset = this.isHorizontal() ? el.scrollLeft : el.scrollTop
    this.isScrolling = true

    if (this.scrollTimer !== null) clearTimeout(this.scrollTimer)
    this.scrollTimer = setTimeout(() => {
      this.isScrolling = false
      this.notify()
    }, 150)

    if (prev !== this.scrollOffset) {
      this.checkReachedEdge()
      this.notify()
    }
  }

  private checkReachedEdge(): void {
    const el = this.scrollElement
    if (!el) return

    const { onReachedTop, onReachedBottom, reverse } = this.options
    const offset = this.scrollOffset
    const totalSize = this.getTotalSize()
    const viewportSize = this.getViewportSize()

    if (totalSize === 0) return

    if (reverse && onReachedTop && offset <= 0) {
      onReachedTop()
    } else if (!reverse && onReachedBottom && offset + viewportSize >= totalSize - 1) {
      onReachedBottom()
    }
  }

  private getVirtualItems(): VirtualItem[] {
    const { count, overscan, scrollMargin } = this.options
    if (count === 0) return []

    const viewportSize = this.getViewportSize()
    const rangeStart = Math.max(0, this.scrollOffset - scrollMargin)
    const rangeEnd = this.scrollOffset + viewportSize + scrollMargin

    const startIdx = Math.max(0, findStartIndex(this.offsets, rangeStart) - overscan)
    let endIdx = startIdx

    while (endIdx < count - 1 && (this.offsets[endIdx + 1] ?? 0) < rangeEnd) {
      endIdx++
    }
    endIdx = Math.min(count - 1, endIdx + overscan)

    const items: VirtualItem[] = []
    for (let i = startIdx; i <= endIdx; i++) {
      const start = this.offsets[i] ?? 0
      const size = this.getSizeAt(i)
      items.push({
        index: i,
        start,
        size,
        end: start + size,
        key: this.options.getItemKey ? this.options.getItemKey(i) : i,
      })
    }

    return items
  }

  private getTotalSize(): number {
    const { count } = this.options
    if (count === 0) return 0
    const lastOffset = this.offsets[count - 1] ?? 0
    return lastOffset + this.getSizeAt(count - 1)
  }

  private getSizeAt(index: number): number {
    return this.cache.get(index) ?? this.options.estimateSize(index)
  }

  private recomputeOffsets(fromIndex: number): void {
    const { count } = this.options
    if (this.offsets.length !== count) {
      this.offsets = new Array(count).fill(0) as number[]
    }

    this.cachedState = null

    if (count === 0) return

    // Single O(n - fromIndex) pass. Items before fromIndex are unchanged.
    for (let i = fromIndex; i < count; i++) {
      this.offsets[i] = i === 0 ? 0 : (this.offsets[i - 1] ?? 0) + this.getSizeAt(i - 1)
    }
  }

  private getViewportSize(): number {
    const el = this.scrollElement
    if (!el) return 0
    return this.isHorizontal() ? el.clientWidth : el.clientHeight
  }

  private isHorizontal(): boolean {
    return false // future: support horizontal
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener()
    }
  }
}
