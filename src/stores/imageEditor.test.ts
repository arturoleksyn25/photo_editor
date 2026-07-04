import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useImageEditorStore } from './imageEditor'

function fakeOriginal() {
  return {
    bitmap: {} as ImageBitmap,
    width: 800,
    height: 600,
    fileName: 'photo.jpg',
    mimeType: 'image/jpeg',
  }
}

describe('useImageEditorStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts with no original image and default settings', () => {
    const store = useImageEditorStore()
    expect(store.original).toBeNull()
    expect(store.settings).toEqual({ crop: null, brightness: 1, contrast: 1, saturation: 1, filter: 'none' })
  })

  it('loadImage sets the original and resets settings', () => {
    const store = useImageEditorStore()
    store.setBrightness(1.5)
    store.loadImage(fakeOriginal())
    expect(store.original).toEqual(fakeOriginal())
    expect(store.settings.brightness).toBe(1)
  })

  it('setCrop and resetCrop only touch the crop field', () => {
    const store = useImageEditorStore()
    store.setBrightness(1.3)
    store.setCrop({ x: 10, y: 10, width: 100, height: 100 })
    expect(store.settings.crop).toEqual({ x: 10, y: 10, width: 100, height: 100 })
    expect(store.settings.brightness).toBe(1.3)
    store.resetCrop()
    expect(store.settings.crop).toBeNull()
    expect(store.settings.brightness).toBe(1.3)
  })

  it('resetAll clears every setting back to defaults', () => {
    const store = useImageEditorStore()
    store.setBrightness(1.8)
    store.setCrop({ x: 1, y: 1, width: 2, height: 2 })
    store.setFilter('sepia')
    store.resetAll()
    expect(store.settings).toEqual({ crop: null, brightness: 1, contrast: 1, saturation: 1, filter: 'none' })
  })

  it('toggleViewOriginal flips the flag without touching settings', () => {
    const store = useImageEditorStore()
    store.setBrightness(1.2)
    expect(store.showingOriginal).toBe(false)
    store.toggleViewOriginal()
    expect(store.showingOriginal).toBe(true)
    expect(store.settings.brightness).toBe(1.2)
  })
})
