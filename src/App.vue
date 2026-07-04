<script setup lang="ts">
import { storeToRefs } from 'pinia'
import ImageUploader from './components/ImageUploader.vue'
import CropStage from './components/CropStage.vue'
import AdjustmentPanel from './components/AdjustmentPanel.vue'
import PreviewCanvas from './components/PreviewCanvas.vue'
import ExportBar from './components/ExportBar.vue'
import { useImageEditorStore } from './stores/imageEditor'

const store = useImageEditorStore()
const { original } = storeToRefs(store)
</script>

<template>
  <v-app>
    <v-app-bar title="Pet Photo Editor" />
    <v-main>
      <v-container>
        <ImageUploader />
        <template v-if="original">
          <v-row>
            <v-col cols="12" md="6">
              <h3>Crop</h3>
              <CropStage />
            </v-col>
            <v-col cols="12" md="6">
              <h3>Preview</h3>
              <PreviewCanvas />
            </v-col>
          </v-row>
          <AdjustmentPanel />
          <ExportBar />
        </template>
      </v-container>
    </v-main>
  </v-app>
</template>
