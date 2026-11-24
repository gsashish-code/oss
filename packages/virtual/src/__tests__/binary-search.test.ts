import { describe, it, expect } from 'vitest'
import { findStartIndex } from '../utils/binary-search.js'

describe('findStartIndex', () => {
  it('returns 0 for empty array', () => {
    expect(findStartIndex([], 100)).toBe(0)
  })

  it('returns 0 when target is before all offsets', () => {
    expect(findStartIndex([0, 50, 100, 150], 0)).toBe(0)
  })

  it('finds exact match', () => {
    expect(findStartIndex([0, 50, 100, 150], 100)).toBe(2)
  })

  it('finds the item whose offset just exceeds target', () => {
    // Target 60 is between 50 and 100 → index 1 (item whose range includes 60)
    expect(findStartIndex([0, 50, 100, 150], 60)).toBe(1)
  })

  it('handles single-element array', () => {
    expect(findStartIndex([0], 0)).toBe(0)
  })

  it('returns last valid index when target exceeds all offsets', () => {
    const result = findStartIndex([0, 50, 100], 999)
    expect(result).toBeGreaterThanOrEqual(0)
    expect(result).toBeLessThanOrEqual(2)
  })
})
