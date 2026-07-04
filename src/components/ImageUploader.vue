<script setup lang="ts">
import { ref, watch } from 'vue'
import { useImageEditorStore } from '../stores/imageEditor'

const store = useImageEditorStore()
const selectedFile = ref<File | null>(null)

watch(selectedFile, async (file) => {
  if (!file) return

  const bitmap = await createImageBitmap(file)
  store.loadImage({
    bitmap,
    width: bitmap.width,
    height: bitmap.height,
    fileName: file.name,
    mimeType: file.type,
  })

  selectedFile.value = null
})
</script>

<template>
  <v-file-input v-model="selectedFile" label="Upload image" accept="image/*" />
</template>
