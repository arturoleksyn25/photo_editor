<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useImageEditorStore } from '../stores/imageEditor'
import { renderPipeline } from '../lib/renderPipeline'
import type { PixelBuffer } from '../types/editor'

const store = useImageEditorStore()
const { original, settings, showingOriginal } = storeToRefs(store)

function bitmapToPixelBuffer(bitmap: ImageBitmap): PixelBuffer {
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas context is not available')
  ctx.drawImage(bitmap, 0, 0)
  const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height)
  return { data: imageData.data, width: imageData.width, height: imageData.height }
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

async function exportImage() {
  if (!original.value) return

  const fullResSource = bitmapToPixelBuffer(original.value.bitmap)
  const result = renderPipeline(fullResSource, settings.value)

  const canvas = document.createElement('canvas')
  canvas.width = result.width
  canvas.height = result.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const imageDataArray = new Uint8ClampedArray(result.data)
  ctx.putImageData(new ImageData(imageDataArray, result.width, result.height), 0, 0)

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) return

  const baseName = original.value.fileName.replace(/\.[^./]+$/, '')
  downloadBlob(blob, `${baseName}-edited.png`)
}

function exportOperationsJson() {
  if (!original.value) return

  const payload = {
    version: 1,
    sourceImage: {
      fileName: original.value.fileName,
      width: original.value.width,
      height: original.value.height,
    },
    operations: settings.value,
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const baseName = original.value.fileName.replace(/\.[^./]+$/, '')
  downloadBlob(blob, `${baseName}-operations.json`)
}

function onReset() {
  store.resetAll()
}

function onToggleViewOriginal() {
  store.toggleViewOriginal()
}
</script>

<template>
  <div class="export-bar">
    <v-btn :disabled="!original" @click="onReset">Reset</v-btn>
    <v-btn :disabled="!original" :color="showingOriginal ? 'primary' : undefined" @click="onToggleViewOriginal">View original</v-btn>
    <v-btn :disabled="!original" @click="exportImage">Download image</v-btn>
    <v-btn :disabled="!original" @click="exportOperationsJson">Download JSON</v-btn>
  </div>
</template>
