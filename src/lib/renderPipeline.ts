import type { PixelBuffer, Rect } from '../types/editor'

export function clamp8(value: number): number {
  return Math.min(255, Math.max(0, value))
}

export function cropBuffer(source: PixelBuffer, rect: Rect | null): PixelBuffer {
  if (!rect) {
    return {
      data: new Uint8ClampedArray(source.data),
      width: source.width,
      height: source.height,
    }
  }

  const { x, y, width, height } = rect
  const cropped = new Uint8ClampedArray(width * height * 4)
  for (let row = 0; row < height; row++) {
    const srcStart = ((y + row) * source.width + x) * 4
    const srcRow = source.data.subarray(srcStart, srcStart + width * 4)
    cropped.set(srcRow, row * width * 4)
  }
  return { data: cropped, width, height }
}
