import { describe, it, expect } from 'vitest'
import { cropBuffer, transformPixel, applyColorAdjustments, applyFilter, renderPipeline } from './renderPipeline'
import { createDefaultSettings } from '../types/editor'
import type { EditorSettings, PixelBuffer } from '../types/editor'

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

describe('transformPixel', () => {
  it('is the identity under neutral settings', () => {
    expect(transformPixel(100, 150, 200, 1, 1, 1)).toEqual([100, 150, 200])
  })

  it('scales brightness multiplicatively', () => {
    expect(transformPixel(100, 100, 100, 1.5, 1, 1)).toEqual([150, 150, 150])
  })

  it('pushes values away from mid-grey under increased contrast', () => {
    expect(transformPixel(178, 178, 178, 1, 2, 1)).toEqual([228, 228, 228])
  })

  it('desaturates toward luminance when saturation is 0', () => {
    const [r, g, b] = transformPixel(200, 100, 50, 1, 1, 0)
    expect(r).toBeCloseTo(124.2, 5)
    expect(g).toBeCloseTo(124.2, 5)
    expect(b).toBeCloseTo(124.2, 5)
  })
})

describe('applyColorAdjustments', () => {
  it('leaves pixels unchanged under neutral settings', () => {
    const buffer = { width: 1, height: 1, data: new Uint8ClampedArray([100, 150, 200, 128]) }
    const result = applyColorAdjustments(buffer, 1, 1, 1)
    expect(Array.from(result.data)).toEqual([100, 150, 200, 128])
  })

  it('applies brightness multiplicatively and clamps at 255', () => {
    const buffer = { width: 1, height: 1, data: new Uint8ClampedArray([200, 200, 200, 255]) }
    const result = applyColorAdjustments(buffer, 2, 1, 1)
    expect(Array.from(result.data)).toEqual([255, 255, 255, 255])
  })

  it('preserves alpha and does not mutate the source buffer', () => {
    const source = new Uint8ClampedArray([10, 10, 10, 42])
    const buffer = { width: 1, height: 1, data: source }
    const result = applyColorAdjustments(buffer, 1.5, 1, 1)
    expect(result.data[3]).toBe(42)
    expect(source[0]).toBe(10)
  })
})

describe('applyFilter', () => {
  it('passes pixels through unchanged for "none"', () => {
    const buffer = { width: 1, height: 1, data: new Uint8ClampedArray([10, 20, 30, 255]) }
    const result = applyFilter(buffer, 'none')
    expect(Array.from(result.data)).toEqual([10, 20, 30, 255])
    expect(result.data).not.toBe(buffer.data)
  })

  it('converts every channel to luminance for "greyscale"', () => {
    const buffer = { width: 1, height: 1, data: new Uint8ClampedArray([200, 100, 50, 255]) }
    const result = applyFilter(buffer, 'greyscale')
    expect(result.data[0]).toBe(result.data[1])
    expect(result.data[1]).toBe(result.data[2])
    expect(result.data[0]).toBeCloseTo(124, 0)
    expect(result.data[3]).toBe(255)
  })

  it('applies the sepia matrix and clamps at 255', () => {
    const buffer = { width: 1, height: 1, data: new Uint8ClampedArray([255, 255, 255, 255]) }
    const result = applyFilter(buffer, 'sepia')
    expect(result.data[0]).toBe(255)
    expect(result.data[1]).toBe(255)
    expect(result.data[2]).toBeCloseTo(239, 0)
  })
})

describe('renderPipeline', () => {
  it('composes crop, color adjustments, and filter in sequence', () => {
    const source = {
      width: 2,
      height: 1,
      data: new Uint8ClampedArray([
        10, 10, 10, 255,
        200, 50, 50, 255,
      ]),
    }
    const settings: EditorSettings = {
      crop: { x: 1, y: 0, width: 1, height: 1 },
      brightness: 1.5,
      contrast: 1,
      saturation: 1,
      filter: 'greyscale',
    }

    const result = renderPipeline(source, settings)

    expect(result.width).toBe(1)
    expect(result.height).toBe(1)
    // crop picks the second pixel (200,50,50); brightness*1.5 -> (255,75,75)
    // after clamping; greyscale luminance of (255,75,75) = 0.299*255 + 0.587*75
    // + 0.114*75 = 128.82, which rounds to 129 on store. Applying greyscale
    // BEFORE the brightness adjustment (a wrong pipeline order) would instead
    // produce 142 here, so this fixture actually distinguishes the two orders.
    expect(Array.from(result.data)).toEqual([129, 129, 129, 255])
  })

  it('is a no-op end-to-end under default settings', () => {
    const source = { width: 1, height: 1, data: new Uint8ClampedArray([10, 20, 30, 255]) }
    const result = renderPipeline(source, createDefaultSettings())
    expect(Array.from(result.data)).toEqual([10, 20, 30, 255])
  })
})
