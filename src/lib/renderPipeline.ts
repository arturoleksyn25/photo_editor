import type { EditorSettings, FilterType, PixelBuffer, Rect } from '../types/editor'

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

export function transformPixel(
  r: number,
  g: number,
  b: number,
  brightness: number,
  contrast: number,
  saturation: number
): [number, number, number] {
  let nr = r * brightness
  let ng = g * brightness
  let nb = b * brightness

  nr = (nr - 128) * contrast + 128
  ng = (ng - 128) * contrast + 128
  nb = (nb - 128) * contrast + 128

  const luminance = 0.299 * nr + 0.587 * ng + 0.114 * nb
  nr = luminance + (nr - luminance) * saturation
  ng = luminance + (ng - luminance) * saturation
  nb = luminance + (nb - luminance) * saturation

  return [clamp8(nr), clamp8(ng), clamp8(nb)]
}

export function applyColorAdjustments(
  buffer: PixelBuffer,
  brightness: number,
  contrast: number,
  saturation: number
): PixelBuffer {
  const data = new Uint8ClampedArray(buffer.data)
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = transformPixel(data[i], data[i + 1], data[i + 2], brightness, contrast, saturation)
    data[i] = r
    data[i + 1] = g
    data[i + 2] = b
  }
  return { data, width: buffer.width, height: buffer.height }
}

export function applyFilter(buffer: PixelBuffer, filter: FilterType): PixelBuffer {
  const data = new Uint8ClampedArray(buffer.data)
  if (filter === 'none') {
    return { data, width: buffer.width, height: buffer.height }
  }

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]

    if (filter === 'greyscale') {
      const luminance = clamp8(0.299 * r + 0.587 * g + 0.114 * b)
      data[i] = luminance
      data[i + 1] = luminance
      data[i + 2] = luminance
    } else if (filter === 'sepia') {
      data[i] = clamp8(0.393 * r + 0.769 * g + 0.189 * b)
      data[i + 1] = clamp8(0.349 * r + 0.686 * g + 0.168 * b)
      data[i + 2] = clamp8(0.272 * r + 0.534 * g + 0.131 * b)
    }
  }

  return { data, width: buffer.width, height: buffer.height }
}

export function renderPipeline(source: PixelBuffer, settings: EditorSettings): PixelBuffer {
  const cropped = cropBuffer(source, settings.crop)
  const adjusted = applyColorAdjustments(cropped, settings.brightness, settings.contrast, settings.saturation)
  return applyFilter(adjusted, settings.filter)
}
