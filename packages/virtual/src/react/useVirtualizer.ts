import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import { Virtualizer } from '../core/virtualizer.js'
import type { VirtualizerOptions, VirtualizerState, ScrollToIndexOptions } from '../types.js'

export interface UseVirtualizerResult extends VirtualizerState {
  virtualizer: Virtualizer
  measureRef: (index: number) => (el: Element | null) => void
  scrollToIndex: (opts: ScrollToIndexOptions) => void
}

export function useVirtualizer(options: VirtualizerOptions): UseVirtualizerResult {
  const virtualizerRef = useRef<Virtualizer | null>(null)
  const containerRef = useRef<Element | null>(null)
  const optionsRef = useRef(options)

  // Keep options in sync without re-creating the virtualizer
  useEffect(() => {
    optionsRef.current = options
    virtualizerRef.current?.updateOptions(options)
  })

  if (!virtualizerRef.current) {
    virtualizerRef.current = new Virtualizer(options)
  }

  const virtualizer = virtualizerRef.current

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return virtualizer.subscribe(onStoreChange)
    },
    [virtualizer],
  )

  const getSnapshot = useCallback(() => virtualizer.getState(), [virtualizer])

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  // Mount/unmount the virtualizer when the scroll container mounts
  const scrollRef = useCallback(
    (el: Element | null) => {
      if (el === containerRef.current) return
      if (containerRef.current) virtualizer.unmount()
      containerRef.current = el
      if (el) virtualizer.mount(el)
    },
    [virtualizer],
  )

  // Per-item ref callback for dynamic size measurement
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

  // Expose scrollRef on the state so callers can wire up the container
  ;(state as VirtualizerState & { scrollRef: typeof scrollRef }).scrollRef = scrollRef

  return { ...state, virtualizer, measureRef, scrollToIndex }
}
