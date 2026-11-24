import React, { type CSSProperties, type ReactNode } from 'react'
import { useVirtualizer } from './useVirtualizer.js'
import type { VirtualizerOptions } from '../types.js'

export interface VirtualListProps
  extends Omit<VirtualizerOptions, 'getScrollElement'> {
  height: number | string
  width?: number | string
  renderItem: (index: number) => ReactNode
  className?: string
  style?: CSSProperties
  itemClassName?: string
}

export function VirtualList({
  height,
  width = '100%',
  renderItem,
  className,
  style,
  itemClassName,
  ...virtualizerOptions
}: VirtualListProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)

  const { items, totalSize, measureRef, scrollRef } = useVirtualizer({
    ...virtualizerOptions,
    // getScrollElement is unused by the engine (mount() is the actual entry
    // point), but the type requires it; keep it in sync with containerRef.
    getScrollElement: () => containerRef.current,
  })

  // Merge scrollRef (registers with Virtualizer) and containerRef (local read)
  const mergedRef = React.useCallback(
    (el: HTMLDivElement | null) => {
      containerRef.current = el
      scrollRef(el)
    },
    [scrollRef],
  )

  return (
    <div
      ref={mergedRef}
      className={className}
      style={{ height, width, overflow: 'auto', position: 'relative', ...style }}
    >
      <div style={{ height: totalSize, width: '100%', position: 'relative' }}>
        {items.map((item) => (
          <div
            key={item.key}
            ref={measureRef(item.index)}
            className={itemClassName}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${item.start}px)`,
            }}
          >
            {renderItem(item.index)}
          </div>
        ))}
      </div>
    </div>
  )
}
