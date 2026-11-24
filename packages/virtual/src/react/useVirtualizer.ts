import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import { Virtualizer } from '../core/virtualizer.js'
import type { VirtualizerOptions, VirtualizerState, ScrollToIndexOptions } from '../types.js'

export interface UseVirtualizerResult extends VirtualizerState {
  virtualizer: Virtualizer
  /** Attach to the scroll container element. Required — without it nothing renders. */
  scrollRef: (el: Element | null) => void
  measureRef: (index: number) => (el: Element | null) => void
  scrollToIndex: (opts: ScrollToIndexOptions) => void
}

export function useVirtualizer(options: VirtualizerOptions): UseVirtualizerResult {
  const virtualizerRef = useRef<Virtualizer | null>(null)
  const containerRef = useRef<Element | null>(null)
  const prevCountRef = useRef(options.count)

  if (!virtualizerRef.current) {
    virtualizerRef.current = new Virtualizer(options)
  }

  const virtualizer = virtualizerRef.current

  // Sync count changes without touching the stabilised refs below.
  // No dependency array here is intentional, but state caching in Virtualizer
  // ensures getState() returns the same reference when nothing changes, so
  // useSyncExternalStore never schedules a spurious re-render.
  useEffect(() => {
    if (options.count !== prevCountRef.current) {
      prevCountRef.current = options.count
      virtualizer.updateOptions(options)
    }
  })

  const subscribe = useCallback(
    (onStoreChange: () => void) => virtualizer.subscribe(onStoreChange),
    [virtualizer],
  )

  const getSnapshot = useCallback(() => virtualizer.getState(), [virtualizer])

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const scrollRef = useCallback(
    (el: Element | null) => {
      if (el === containerRef.current) return
      if (containerRef.current) virtualizer.unmount()
      containerRef.current = el
      if (el) virtualizer.mount(el)
    },
    [virtualizer],
  )

  const measureRef = useCallback(
    (index: number) => (el: Element | null) => {
      if (el) virtualizer.measureItem(index, el)
    },
    [virtualizer],
  )

  const scrollToIndex = useCallback(
    (opts: ScrollToIndexOptions) => virtualizer.scrollToIndex(opts),
    [virtualizer],
  )

  return { ...state, virtualizer, scrollRef, measureRef, scrollToIndex }
}
