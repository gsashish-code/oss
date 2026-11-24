/**
 * Stores measured sizes for items whose actual DOM size differs
 * from the estimated size. When a measurement lands we recompute
 * offsets only from that index onward — O(n) in the worst case
 * but typically O(changed items) in practice.
 */
export class MeasureCache {
  private measured = new Map<number, number>()

  set(index: number, size: number): void {
    this.measured.set(index, size)
  }

  get(index: number): number | undefined {
    return this.measured.get(index)
  }

  has(index: number): boolean {
    return this.measured.has(index)
  }

  clear(): void {
    this.measured.clear()
  }
}
