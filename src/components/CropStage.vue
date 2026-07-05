<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.css'
import { storeToRefs } from 'pinia'
import { useImageEditorStore } from '../stores/imageEditor'
import type { OriginalImage } from '../stores/imageEditor'

const store = useImageEditorStore()
const { original } = storeToRefs(store)

const imageRef = ref<HTMLImageElement | null>(null)
let cropper: Cropper | null = null

function destroyCropper() {
  cropper?.destroy()
  cropper = null
}

function bitmapToDataUrl(bitmap: ImageBitmap): string {
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas context is not available')
  ctx.drawImage(bitmap, 0, 0)
  return canvas.toDataURL()
}

function onCropChange() {
  if (!cropper) return
  const data = cropper.getData(true)
  store.setCrop({ x: data.x, y: data.y, width: data.width, height: data.height })
}

function initCropper(value: OriginalImage | null) {
  destroyCropper()
  if (!value || !imageRef.value) return
  const img = imageRef.value
  img.onload = () => {
    cropper = new Cropper(img, {
      viewMode: 1,
      autoCropArea: 1,
      crop: onCropChange,
    })
  }
  img.src = bitmapToDataUrl(value.bitmap)
}

watch(original, initCropper)

onMounted(() => {
  if (original.value) {
    initCropper(original.value)
  }
})

onBeforeUnmount(destroyCropper)
</script>

<template>
  <div class="crop-stage">
    <img ref="imageRef" alt="Crop source" />
  </div>
</template>

<style scoped>
.crop-stage {
  width: 100%;
  height: 800px;
  overflow: hidden;
}
</style>
