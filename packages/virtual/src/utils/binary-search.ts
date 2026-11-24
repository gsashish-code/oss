/**
 * Finds the first index where the cumulative offset exceeds the target.
 * O(log n) lookup for initial render position.
 */
export function findStartIndex(offsets: number[], target: number): number {
  let lo = 0
  let hi = offsets.length - 1

  while (lo <= hi) {
    const mid = (lo + hi) >>> 1
    const offset = offsets[mid]
    if (offset === undefined) break
    if (offset < target) {
      lo = mid + 1
    } else if (offset > target) {
      hi = mid - 1
    } else {
      return mid
    }
  }

  return Math.max(0, lo - 1)
}
