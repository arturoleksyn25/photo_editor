<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useImageEditorStore } from '../stores/imageEditor'
import { renderPipeline } from '../lib/renderPipeline'
import type { PixelBuffer } from '../types/editor'

const PREVIEW_MAX_DIMENSION = 1200

const store = useImageEditorStore()
const { original, settings, showingOriginal } = storeToRefs(store)

const canvasRef = ref<HTMLCanvasElement | null>(null)
const previewSource = ref<PixelBuffer | null>(null)
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

  const result: PixelBuffer = showingOriginal.value
    ? previewSource.value
    : renderPipeline(previewSource.value, settings.value)

  canvas.width = result.width
  canvas.height = result.height
  ctx.putImageData(new ImageData(result.data as any, result.width, result.height), 0, 0)
}

watch(original, (value) => {
  previewSource.value = value ? bitmapToPixelBuffer(value.bitmap, PREVIEW_MAX_DIMENSION) : null
  scheduleDraw()
})

watch([settings, showingOriginal], scheduleDraw, { deep: true })

onMounted(() => {
  if (original.value) {
    previewSource.value = bitmapToPixelBuffer(original.value.bitmap, PREVIEW_MAX_DIMENSION)
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
