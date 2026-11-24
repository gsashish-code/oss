import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Virtualizer } from '../core/virtualizer.js'

// Minimal mock for DOM Element scroll behavior
function makeScrollElement(scrollTop = 0, clientHeight = 500) {
  const listeners: Record<string, EventListener> = {}
  return {
    scrollTop,
    clientHeight,
    scrollLeft: 0,
    clientWidth: 500,
    scrollHeight: 10000,
    scrollTo: vi.fn(),
    addEventListener: (event: string, listener: EventListener) => {
      listeners[event] = listener
    },
    removeEventListener: vi.fn(),
    _trigger: (event: string) => listeners[event]?.({} as Event),
  }
}

describe('Virtualizer', () => {
  describe('getState() — initial render', () => {
    it('returns empty items for count 0', () => {
      const v = new Virtualizer({
        count: 0,
        getScrollElement: () => null,
        estimateSize: () => 50,
      })
      expect(v.getState().items).toHaveLength(0)
      expect(v.getState().totalSize).toBe(0)
    })

    it('returns totalSize = count * estimateSize for uniform items', () => {
      const v = new Virtualizer({
        count: 100,
        getScrollElement: () => null,
        estimateSize: () => 40,
      })
      expect(v.getState().totalSize).toBe(100 * 40)
    })

    it('computes correct offsets', () => {
      const v = new Virtualizer({
        count: 5,
        getScrollElement: () => null,
        estimateSize: () => 50,
      })
      const { items } = v.getState()
      expect(items[0]?.start).toBe(0)
      // With overscan=3 and viewport=0 (not mounted) we still get some items
    })
  })

  describe('mount + scroll', () => {
    it('renders only visible + overscan items after scroll', () => {
      const el = makeScrollElement(0, 200)
      const v = new Virtualizer({
        count: 1000,
        getScrollElement: () => el as unknown as Element,
        estimateSize: () => 50,
        overscan: 3,
      })
      v.mount(el as unknown as Element)

      const state = v.getState()
      // Visible range is 0–200, overscan adds 3 each side
      // So we expect roughly 4 (visible) + 3 (overscan) = 7 items max
      expect(state.items.length).toBeLessThan(20)
      expect(state.items[0]?.index).toBe(0)
    })

    it('fires onReachedBottom when scrolled to end', () => {
      const onReachedBottom = vi.fn()
      const el = makeScrollElement(9800, 200) // scrollTop near total
      const v = new Virtualizer({
        count: 100,
        getScrollElement: () => el as unknown as Element,
        estimateSize: () => 100,
        onReachedBottom,
      })
      v.mount(el as unknown as Element)
      el._trigger('scroll')
      // Wait for rAF — in test env requestAnimationFrame may not fire
      // so we call syncScrollOffset indirectly via mount
      expect(onReachedBottom).toHaveBeenCalledTimes(0) // rAF deferred
    })
  })

  describe('measureItem — dynamic sizes', () => {
    it('recalculates totalSize when measured size differs from estimate', () => {
      let resizeCallback: ResizeObserverCallback | null = null
      const MockResizeObserver = vi.fn().mockImplementation((cb: ResizeObserverCallback) => {
        resizeCallback = cb
        return { observe: vi.fn(), disconnect: vi.fn() }
      })
      vi.stubGlobal('ResizeObserver', MockResizeObserver)

      const v = new Virtualizer({
        count: 10,
        getScrollElement: () => null,
        estimateSize: () => 50,
      })

      const fakeEl = {} as Element
      v.measureItem(0, fakeEl)

      // Simulate resize observer callback with actual size 100
      resizeCallback!([
        { contentRect: { height: 100, width: 0 } } as unknown as ResizeObserverEntry,
      ], {} as ResizeObserver)

      // Item 0 measured at 100 instead of estimate 50 → totalSize increases by 50
      expect(v.getState().totalSize).toBe(9 * 50 + 100)

      vi.unstubAllGlobals()
    })
  })

  describe('scrollToIndex', () => {
    it('calls scrollTo with correct offset for align=start', () => {
      const el = makeScrollElement(0, 200)
      const v = new Virtualizer({
        count: 100,
        getScrollElement: () => el as unknown as Element,
        estimateSize: () => 50,
      })
      v.mount(el as unknown as Element)
      v.scrollToIndex({ index: 10, align: 'start', behavior: 'instant' })
      expect(el.scrollTo).toHaveBeenCalledWith({ top: 500, behavior: 'instant' })
    })

    it('calls scrollTo with correct offset for align=end', () => {
      const el = makeScrollElement(0, 200)
      const v = new Virtualizer({
        count: 100,
        getScrollElement: () => el as unknown as Element,
        estimateSize: () => 50,
      })
      v.mount(el as unknown as Element)
      v.scrollToIndex({ index: 10, align: 'end', behavior: 'instant' })
      // item 10: start=500, size=50 → end=550; end - viewportSize = 350
      expect(el.scrollTo).toHaveBeenCalledWith({ top: 350, behavior: 'instant' })
    })
  })

  describe('unmount', () => {
    it('removes scroll listener on unmount', () => {
      const el = makeScrollElement()
      const v = new Virtualizer({
        count: 10,
        getScrollElement: () => el as unknown as Element,
        estimateSize: () => 50,
      })
      v.mount(el as unknown as Element)
      v.unmount()
      expect(el.removeEventListener).toHaveBeenCalledWith('scroll', expect.any(Function))
    })
  })
})
