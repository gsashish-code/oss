import React, { type CSSProperties, type ReactNode, useCallback, useRef } from 'react'
import { useVirtualizer } from './useVirtualizer.js'
import type { VirtualizerOptions } from '../types.js'

export interface VirtualGridProps
  extends Omit<VirtualizerOptions, 'getScrollElement' | 'count' | 'horizontal'> {
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
  const containerRef = useRef<HTMLDivElement>(null)

  const {
    items: rowItems,
    totalSize: totalRowSize,
    measureRef: measureRowRef,
    scrollRef: rowScrollRef,
  } = useVirtualizer({
    ...rest,
    count: rowCount,
    estimateSize,
    horizontal: false,
    getScrollElement: () => containerRef.current,
  })

  const {
    items: colItems,
    totalSize: totalColSize,
    measureRef: measureColRef,
    scrollRef: colScrollRef,
  } = useVirtualizer({
    count: columnCount,
    estimateSize: estimateColumnSize,
    horizontal: true,
    getScrollElement: () => containerRef.current,
  })

  // Both virtualizers share the same scroll container.
  // rowScrollRef handles vertical scroll; colScrollRef handles horizontal.
  const mergedScrollRef = useCallback(
    (el: HTMLDivElement | null) => {
      containerRef.current = el
      rowScrollRef(el)
      colScrollRef(el)
    },
    [rowScrollRef, colScrollRef],
  )

  return (
    <div
      ref={mergedScrollRef}
      className={className}
      style={{ height, width, overflow: 'auto', position: 'relative', ...style }}
    >
      <div style={{ height: totalRowSize, width: totalColSize, position: 'relative' }}>
        {rowItems.map((rowItem) =>
          colItems.map((colItem) => (
            <div
              key={`${rowItem.key}-${colItem.key}`}
              // Measure each row's height from column 0;
              // measure each column's width from row 0.
              ref={
                colItem.index === 0
                  ? measureRowRef(rowItem.index)
                  : rowItem.index === 0
                    ? measureColRef(colItem.index)
                    : undefined
              }
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
