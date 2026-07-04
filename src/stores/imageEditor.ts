import { defineStore } from 'pinia'
import type { EditorSettings, FilterType, Rect } from '../types/editor'
import { createDefaultSettings } from '../types/editor'

export interface OriginalImage {
  bitmap: ImageBitmap
  width: number
  height: number
  fileName: string
  mimeType: string
}

interface ImageEditorState {
  original: OriginalImage | null
  settings: EditorSettings
  showingOriginal: boolean
}

export const useImageEditorStore = defineStore('imageEditor', {
  state: (): ImageEditorState => ({
    original: null,
    settings: createDefaultSettings(),
    showingOriginal: false,
  }),
  actions: {
    loadImage(original: OriginalImage) {
      this.original = original
      this.settings = createDefaultSettings()
      this.showingOriginal = false
    },
    setCrop(rect: Rect | null) {
      this.settings.crop = rect
    },
    resetCrop() {
      this.settings.crop = null
    },
    setBrightness(value: number) {
      this.settings.brightness = value
    },
    setContrast(value: number) {
      this.settings.contrast = value
    },
    setSaturation(value: number) {
      this.settings.saturation = value
    },
    setFilter(value: FilterType) {
      this.settings.filter = value
    },
    resetAll() {
      this.settings = createDefaultSettings()
    },
    toggleViewOriginal() {
      this.showingOriginal = !this.showingOriginal
    },
  },
})
