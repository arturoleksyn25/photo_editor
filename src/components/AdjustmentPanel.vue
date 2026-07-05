<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useImageEditorStore } from '../stores/imageEditor'
import type { FilterType } from '../types/editor'

const store = useImageEditorStore()
const { settings } = storeToRefs(store)

const filterOptions: { title: string; value: FilterType }[] = [
  { title: 'None', value: 'none' },
  { title: 'Greyscale', value: 'greyscale' },
  { title: 'Sepia', value: 'sepia' },
]

function onBrightnessChange(value: number) {
  store.setBrightness(value)
}

function onContrastChange(value: number) {
  store.setContrast(value)
}

function onSaturationChange(value: number) {
  store.setSaturation(value)
}

function onFilterChange(value: FilterType) {
  store.setFilter(value)
}
</script>

<template>
  <div class="adjustment-panel">
    <v-slider
      :model-value="settings.brightness"
      label="Brightness"
      min="0"
      max="2"
      step="0.01"
      @update:model-value="onBrightnessChange"
    />
    <v-slider
      :model-value="settings.contrast"
      label="Contrast"
      min="0"
      max="2"
      step="0.01"
      @update:model-value="onContrastChange"
    />
    <v-slider
      :model-value="settings.saturation"
      label="Saturation"
      min="0"
      max="2"
      step="0.01"
      @update:model-value="onSaturationChange"
    />
    <v-select
      :model-value="settings.filter"
      :items="filterOptions"
      label="Filter"
      @update:model-value="onFilterChange"
    />
  </div>
</template>

<style scoped>
.adjustment-panel {
  padding-top: 15px;
}
</style>