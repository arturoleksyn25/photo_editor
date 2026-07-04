export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export type FilterType = 'none' | 'greyscale' | 'sepia'

export interface EditorSettings {
  crop: Rect | null
  brightness: number
  contrast: number
  saturation: number
  filter: FilterType
}

export interface PixelBuffer {
  data: Uint8ClampedArray
  width: number
  height: number
}

export function createDefaultSettings(): EditorSettings {
  return {
    crop: null,
    brightness: 1,
    contrast: 1,
    saturation: 1,
    filter: 'none',
  }
}
