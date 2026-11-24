export interface VirtualItem {
  index: number
  start: number
  size: number
  end: number
  key: string | number
}

export interface VirtualizerOptions {
  count: number
  getScrollElement: () => Element | null
  estimateSize: (index: number) => number
  overscan?: number
  scrollMargin?: number
  /** Enable reverse/chat scroll — anchors to bottom, prepend without jump */
  reverse?: boolean
  /** Callback fired when scroll reaches the top (reverse mode) */
  onReachedTop?: () => void
  /** Callback fired when scroll reaches the bottom (normal mode) */
  onReachedBottom?: () => void
  /** Key extractor for stable item identity */
  getItemKey?: (index: number) => string | number
}

export interface VirtualizerState {
  items: VirtualItem[]
  totalSize: number
  scrollOffset: number
  isScrolling: boolean
}

export type ScrollAlignment = 'start' | 'center' | 'end' | 'auto'

export interface ScrollToIndexOptions {
  index: number
  align?: ScrollAlignment
  behavior?: ScrollBehavior
}
