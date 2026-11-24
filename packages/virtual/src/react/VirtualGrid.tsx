import React, { type CSSProperties, type ReactNode, useCallback } from 'react'
import { useVirtualizer } from './useVirtualizer.js'
import type { VirtualizerOptions } from '../types.js'

export interface VirtualGridProps
  extends Omit<VirtualizerOptions, 'getScrollElement' | 'count'> {
  rowCount: number
  columnCount: number
  height: number | string
  width?: number | string
  estimateColumnSize: (colIndex: number) => number
  renderCell: (rowIndex: number, colIndex: number) => ReactNode
  className?: string
  style?: CSSProperties
}

export function VirtualGrid({
  rowCount,
  columnCount,
  height,
  width = '100%',
  estimateSize,
  estimateColumnSize,
  renderCell,
  className,
  style,
  ...rest
}: VirtualGridProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)

  const { items: rowItems, totalSize: totalRowSize, measureRef: measureRowRef } = useVirtualizer({
    ...rest,
    count: rowCount,
    estimateSize,
    getScrollElement: () => containerRef.current,
  })

  const colContainerRef = React.useRef<HTMLDivElement>(null)
  const { items: colItems, totalSize: totalColSize } = useVirtualizer({
    count: columnCount,
    estimateSize: estimateColumnSize,
    getScrollElement: () => containerRef.current,
  })

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ height, width, overflow: 'auto', position: 'relative', ...style }}
    >
      <div style={{ height: totalRowSize, width: totalColSize, position: 'relative' }}>
        {rowItems.map((rowItem) =>
          colItems.map((colItem) => (
            <div
              key={`${rowItem.key}-${colItem.key}`}
              ref={rowItem.index === 0 && colItem.index === 0
                ? measureRowRef(rowItem.index)
                : undefined}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: colItem.size,
                height: rowItem.size,
                transform: `translate(${colItem.start}px, ${rowItem.start}px)`,
              }}
            >
              {renderCell(rowItem.index, colItem.index)}
            </div>
          )),
        )}
      </div>
    </div>
  )
}
