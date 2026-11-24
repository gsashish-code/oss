import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import { ChatVirtualizer } from '../core/chat-virtualizer.js'
import type { VirtualizerOptions, VirtualizerState } from '../types.js'

export interface UseChatVirtualizerResult extends VirtualizerState {
  scrollRef: (el: HTMLElement | null) => void
  measureRef: (index: number) => (el: Element | null) => void
  scrollToBottom: (behavior?: ScrollBehavior) => void
  isStuckToBottom: boolean
}

export function useChatVirtualizer(
  options: Omit<VirtualizerOptions, 'reverse'>,
): UseChatVirtualizerResult {
  const virtualizerRef = useRef<ChatVirtualizer | null>(null)
  const containerRef = useRef<HTMLElement | null>(null)
  const prevCountRef = useRef(options.count)

  if (!virtualizerRef.current) {
    virtualizerRef.current = new ChatVirtualizer(options)
  }

  const virtualizer = virtualizerRef.current

  // Track stick-to-bottom state via scroll events
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const handleScroll = () => {
      const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 10
      virtualizer.setStickToBottom(isAtBottom)
    }

    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  })

  // Notify virtualizer when count changes
  useEffect(() => {
    if (options.count !== prevCountRef.current) {
      virtualizer.onCountChange(options.count, prevCountRef.current)
      prevCountRef.current = options.count
    }
  })

  const subscribe = useCallback(
    (onStoreChange: () => void) => virtualizer.subscribe(onStoreChange),
    [virtualizer],
  )

  const getSnapshot = useCallback(() => virtualizer.getState(), [virtualizer])
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const scrollRef = useCallback(
    (el: HTMLElement | null) => {
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

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = 'smooth') => virtualizer.scrollToBottom(behavior),
    [virtualizer],
  )

  return {
    ...state,
    scrollRef,
    measureRef,
    scrollToBottom,
    isStuckToBottom: virtualizer.isStuckToBottom(),
  }
}
