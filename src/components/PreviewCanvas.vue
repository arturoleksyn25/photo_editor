<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useImageEditorStore } from '../stores/imageEditor'
import { renderPipeline } from '../lib/renderPipeline'
import type { EditorSettings, PixelBuffer, Rect } from '../types/editor'

const PREVIEW_MAX_DIMENSION = 1200

const store = useImageEditorStore()
const { original, settings, showingOriginal } = storeToRefs(store)

const canvasRef = ref<HTMLCanvasElement | null>(null)
const previewSource = ref<PixelBuffer | null>(null)
let previewScale = 1
let frameScheduled = false

function bitmapToPixelBuffer(bitmap: ImageBitmap, maxDimension?: number): PixelBuffer {
  const scale = maxDimension ? Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height)) : 1
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas context is not available')
  ctx.drawImage(bitmap, 0, 0, width, height)
  const imageData = ctx.getImageData(0, 0, width, height)
  return { data: imageData.data, width: imageData.width, height: imageData.height }
}

// `settings.crop` is always expressed in the ORIGINAL (full-resolution) image's
// pixel coordinates (see CropStage.vue) so that export always crops the true
// original. `previewSource` is a downscaled cache of that same original, so a
// full-res crop rect must be scaled down before it can be applied to it —
// applying it unscaled would ask cropBuffer for a region larger than the
// downscaled buffer actually contains.
function scaleRectToPreview(rect: Rect, scale: number): Rect {
  return {
    x: Math.round(rect.x * scale),
    y: Math.round(rect.y * scale),
    width: Math.max(1, Math.round(rect.width * scale)),
    height: Math.max(1, Math.round(rect.height * scale)),
  }
}

function scheduleDraw() {
  if (frameScheduled) return
  frameScheduled = true
  requestAnimationFrame(() => {
    frameScheduled = false
    draw()
  })
}

function draw() {
  const canvas = canvasRef.value
  if (!canvas || !original.value || !previewSource.value) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  let result: PixelBuffer
  if (showingOriginal.value) {
    result = previewSource.value
  } else {
    const previewSettings: EditorSettings = {
      ...settings.value,
      crop: settings.value.crop ? scaleRectToPreview(settings.value.crop, previewScale) : null,
    }
    result = renderPipeline(previewSource.value, previewSettings)
  }

  canvas.width = result.width
  canvas.height = result.height
  ctx.putImageData(new ImageData(result.data as any, result.width, result.height), 0, 0)
}

function cachePreviewSource(bitmap: ImageBitmap) {
  previewScale = Math.min(1, PREVIEW_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
  previewSource.value = bitmapToPixelBuffer(bitmap, PREVIEW_MAX_DIMENSION)
}

watch(original, (value) => {
  if (value) {
    cachePreviewSource(value.bitmap)
  } else {
    previewSource.value = null
  }
  scheduleDraw()
})

watch([settings, showingOriginal], scheduleDraw, { deep: true })

onMounted(() => {
  if (original.value) {
    cachePreviewSource(original.value.bitmap)
  }
  scheduleDraw()
})
</script>

<template>
  <canvas ref="canvasRef" class="preview-canvas" />
</template>

<style scoped>
.preview-canvas {
  max-width: 100%;
  height: auto;
  border: 1px solid rgba(0, 0, 0, 0.12);
}
</style>
