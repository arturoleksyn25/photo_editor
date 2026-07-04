import { describe, it, expect } from 'vitest'
import { cropBuffer } from './renderPipeline'
import type { PixelBuffer } from '../types/editor'

function makeSampleBuffer(): PixelBuffer {
  return {
    width: 2,
    height: 2,
    data: new Uint8ClampedArray([
      10, 20, 30, 255,
      40, 50, 60, 255,
      70, 80, 90, 255,
      100, 110, 120, 255,
    ]),
  }
}

describe('cropBuffer', () => {
  it('returns a full clone when rect is null', () => {
    const source = makeSampleBuffer()
    const result = cropBuffer(source, null)
    expect(result.width).toBe(2)
    expect(result.height).toBe(2)
    expect(Array.from(result.data)).toEqual(Array.from(source.data))
    expect(result.data).not.toBe(source.data)
  })

  it('extracts the requested sub-rectangle', () => {
    const source = makeSampleBuffer()
    const result = cropBuffer(source, { x: 1, y: 0, width: 1, height: 1 })
    expect(result.width).toBe(1)
    expect(result.height).toBe(1)
    expect(Array.from(result.data)).toEqual([40, 50, 60, 255])
  })

  it('extracts a multi-row sub-rectangle using the source stride', () => {
    const source = makeSampleBuffer()
    const result = cropBuffer(source, { x: 0, y: 0, width: 1, height: 2 })
    expect(result.width).toBe(1)
    expect(result.height).toBe(2)
    expect(Array.from(result.data)).toEqual([10, 20, 30, 255, 70, 80, 90, 255])
  })
})
