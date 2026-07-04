# Non-Destructive Image Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based, non-destructive image editor (upload, crop,
brightness/contrast/saturation, filter, view-original/reset, export image +
bonus JSON) per `docs/superpowers/specs/2026-07-04-image-editor-design.md`.

**Architecture:** A settings-object Pinia store (`crop`, `brightness`,
`contrast`, `saturation`, `filter`) sits between an immutable original
`ImageBitmap` and a single pure `renderPipeline` function (crop → color
adjust → filter) that both the live preview canvas and the export/JSON flows
call, guaranteeing preview/export/replay parity by construction.

**Tech Stack:** Vue 3 (`<script setup>`, TypeScript, strict mode), Vuetify 3,
Pinia, Vite, cropperjs, Vitest.

## Global Constraints

- Must run via `npm i && npm run dev` with no additional setup steps.
- TypeScript strict mode throughout; `npm run build` (type-check + build)
  must pass before any task is considered done.
- The original image (`ImageBitmap`) is never mutated after `loadImage`;
  every derived view (preview, export, JSON replay) is computed fresh from it.
- `settings` is a fixed-shape object (crop/brightness/contrast/saturation/
  filter), not an append-only operation list — each field is independently
  settable/resettable.
- Per the spec's Testing section: automated tests cover only the pure pixel
  math (`src/lib/renderPipeline.ts`) and the Pinia store; Vuetify-wired
  components are verified manually via `npm run dev` (jsdom + Vuetify has
  enough rendering quirks — ResizeObserver, matchMedia — that component tests
  would cost more than they're worth at this scope).

---

### Task 1: Project scaffold (Vite + Vue 3 + TS + Vuetify + Pinia + cropperjs)

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `index.html`
- Create: `.gitignore`
- Create: `src/vite-env.d.ts`
- Create: `src/main.ts`
- Create: `src/App.vue`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: a booting Vite dev server with Vue 3 + Vuetify 3 + Pinia wired
  in `src/main.ts` (Vuetify components/directives globally registered, so
  later components can use `<v-slider>`, `<v-btn>`, etc. without per-file
  imports). `src/App.vue` exists as the mount root that later tasks edit.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "pet-photo-editor",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "cropperjs": "^1.6.2",
    "pinia": "^2.2.2",
    "vue": "^3.4.38",
    "vuetify": "^3.7.2"
  },
  "devDependencies": {
    "@types/cropperjs": "^1.6.5",
    "@vitejs/plugin-vue": "^5.1.3",
    "jsdom": "^25.0.0",
    "typescript": "^5.5.4",
    "vite": "^5.4.2",
    "vitest": "^2.0.5",
    "vue-tsc": "^2.1.4"
  }
}
```

- [ ] **Step 2: Create `vite.config.ts`**

```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
  },
})
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",
    "strict": true
  },
  "include": ["src/**/*.ts", "src/**/*.vue", "src/**/*.d.ts"]
}
```

- [ ] **Step 4: Create `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Pet Photo Editor</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 5: Create `.gitignore`**

```
node_modules
dist
*.log
.DS_Store
```

- [ ] **Step 6: Create `src/vite-env.d.ts`**

```ts
/// <reference types="vite/client" />
```

- [ ] **Step 7: Create `src/main.ts`**

```ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createVuetify } from 'vuetify'
import 'vuetify/styles'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import App from './App.vue'

const vuetify = createVuetify({ components, directives })

createApp(App).use(createPinia()).use(vuetify).mount('#app')
```

- [ ] **Step 8: Create `src/App.vue` (placeholder, replaced fully in Task 12)**

```vue
<script setup lang="ts"></script>

<template>
  <v-app>
    <v-app-bar title="Pet Photo Editor" />
    <v-main>
      <v-container>
        <p>Scaffold OK.</p>
      </v-container>
    </v-main>
  </v-app>
</template>
```

- [ ] **Step 9: Install dependencies and verify the build**

Run: `npm install`
Expected: install completes with no errors.

Run: `npm run build`
Expected: `vue-tsc --noEmit` reports no type errors, `vite build` finishes
with `dist/` produced.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json vite.config.ts tsconfig.json index.html .gitignore src/vite-env.d.ts src/main.ts src/App.vue
git commit -m "Scaffold Vite + Vue 3 + TS + Vuetify + Pinia project"
```

---

### Task 2: Core types and `cropBuffer`

**Files:**
- Create: `src/types/editor.ts`
- Create: `src/lib/renderPipeline.ts`
- Create: `src/lib/renderPipeline.test.ts`

**Interfaces:**
- Consumes: nothing beyond the scaffold from Task 1.
- Produces (used by later tasks):
  - `src/types/editor.ts`: `interface Rect { x: number; y: number; width:
    number; height: number }`, `type FilterType = 'none' | 'greyscale' |
    'sepia'`, `interface EditorSettings { crop: Rect | null; brightness:
    number; contrast: number; saturation: number; filter: FilterType }`,
    `interface PixelBuffer { data: Uint8ClampedArray; width: number; height:
    number }`, `function createDefaultSettings(): EditorSettings`.
  - `src/lib/renderPipeline.ts`: `function clamp8(value: number): number`,
    `function cropBuffer(source: PixelBuffer, rect: Rect | null):
    PixelBuffer`.

- [ ] **Step 1: Create `src/types/editor.ts`**

```ts
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
```

- [ ] **Step 2: Write the failing test for `cropBuffer`**

Create `src/lib/renderPipeline.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { cropBuffer } from './renderPipeline'
import type { PixelBuffer } from '../types/editor'

function makeSampleBuffer(): PixelBuffer {
  return {
    width: 2,
    height: 2,
    data: new Uint8ClampedArray([
      10, 20, 30, 255,
      40, 50, 60, 255,
      70, 80, 90, 255,
      100, 110, 120, 255,
    ]),
  }
}

describe('cropBuffer', () => {
  it('returns a full clone when rect is null', () => {
    const source = makeSampleBuffer()
    const result = cropBuffer(source, null)
    expect(result.width).toBe(2)
    expect(result.height).toBe(2)
    expect(Array.from(result.data)).toEqual(Array.from(source.data))
    expect(result.data).not.toBe(source.data)
  })

  it('extracts the requested sub-rectangle', () => {
    const source = makeSampleBuffer()
    const result = cropBuffer(source, { x: 1, y: 0, width: 1, height: 1 })
    expect(result.width).toBe(1)
    expect(result.height).toBe(1)
    expect(Array.from(result.data)).toEqual([40, 50, 60, 255])
  })

  it('extracts a multi-row sub-rectangle using the source stride', () => {
    const source = makeSampleBuffer()
    const result = cropBuffer(source, { x: 0, y: 0, width: 1, height: 2 })
    expect(result.width).toBe(1)
    expect(result.height).toBe(2)
    expect(Array.from(result.data)).toEqual([10, 20, 30, 255, 70, 80, 90, 255])
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/lib/renderPipeline.test.ts`
Expected: FAIL — `renderPipeline.ts` does not exist / `cropBuffer` is not exported.

- [ ] **Step 4: Implement `cropBuffer` in `src/lib/renderPipeline.ts`**

```ts
import type { PixelBuffer, Rect } from '../types/editor'

export function clamp8(value: number): number {
  return Math.min(255, Math.max(0, value))
}

export function cropBuffer(source: PixelBuffer, rect: Rect | null): PixelBuffer {
  if (!rect) {
    return {
      data: new Uint8ClampedArray(source.data),
      width: source.width,
      height: source.height,
    }
  }

  const { x, y, width, height } = rect
  const cropped = new Uint8ClampedArray(width * height * 4)
  for (let row = 0; row < height; row++) {
    const srcStart = ((y + row) * source.width + x) * 4
    const srcRow = source.data.subarray(srcStart, srcStart + width * 4)
    cropped.set(srcRow, row * width * 4)
  }
  return { data: cropped, width, height }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/lib/renderPipeline.test.ts`
Expected: PASS — 3 tests passing.

- [ ] **Step 6: Commit**

```bash
git add src/types/editor.ts src/lib/renderPipeline.ts src/lib/renderPipeline.test.ts
git commit -m "Add editor types and non-destructive cropBuffer"
```

---

### Task 3: Color adjustments (`transformPixel`, `applyColorAdjustments`)

**Files:**
- Modify: `src/lib/renderPipeline.ts`
- Modify: `src/lib/renderPipeline.test.ts`

**Interfaces:**
- Consumes: `PixelBuffer` from `src/types/editor.ts` (Task 2), `clamp8` from
  Task 2.
- Produces: `function transformPixel(r: number, g: number, b: number,
  brightness: number, contrast: number, saturation: number): [number,
  number, number]`, `function applyColorAdjustments(buffer: PixelBuffer,
  brightness: number, contrast: number, saturation: number): PixelBuffer`.
  Formulas (neutral value is `1` for all three): brightness is multiplicative
  (`channel * brightness`), contrast pivots around mid-grey
  (`(channel - 128) * contrast + 128`), saturation interpolates toward
  ITU-R BT.601 luminance (`luminance + (channel - luminance) * saturation`).

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/renderPipeline.test.ts`:

```ts
import { applyColorAdjustments, transformPixel } from './renderPipeline'

describe('transformPixel', () => {
  it('is the identity under neutral settings', () => {
    expect(transformPixel(100, 150, 200, 1, 1, 1)).toEqual([100, 150, 200])
  })

  it('scales brightness multiplicatively', () => {
    expect(transformPixel(100, 100, 100, 1.5, 1, 1)).toEqual([150, 150, 150])
  })

  it('pushes values away from mid-grey under increased contrast', () => {
    expect(transformPixel(178, 178, 178, 1, 2, 1)).toEqual([228, 228, 228])
  })

  it('desaturates toward luminance when saturation is 0', () => {
    const [r, g, b] = transformPixel(200, 100, 50, 1, 1, 0)
    expect(r).toBeCloseTo(124.2, 5)
    expect(g).toBeCloseTo(124.2, 5)
    expect(b).toBeCloseTo(124.2, 5)
  })
})

describe('applyColorAdjustments', () => {
  it('leaves pixels unchanged under neutral settings', () => {
    const buffer = { width: 1, height: 1, data: new Uint8ClampedArray([100, 150, 200, 128]) }
    const result = applyColorAdjustments(buffer, 1, 1, 1)
    expect(Array.from(result.data)).toEqual([100, 150, 200, 128])
  })

  it('applies brightness multiplicatively and clamps at 255', () => {
    const buffer = { width: 1, height: 1, data: new Uint8ClampedArray([200, 200, 200, 255]) }
    const result = applyColorAdjustments(buffer, 2, 1, 1)
    expect(Array.from(result.data)).toEqual([255, 255, 255, 255])
  })

  it('preserves alpha and does not mutate the source buffer', () => {
    const source = new Uint8ClampedArray([10, 10, 10, 42])
    const buffer = { width: 1, height: 1, data: source }
    const result = applyColorAdjustments(buffer, 1.5, 1, 1)
    expect(result.data[3]).toBe(42)
    expect(source[0]).toBe(10)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/renderPipeline.test.ts`
Expected: FAIL — `transformPixel` and `applyColorAdjustments` are not exported.

- [ ] **Step 3: Implement in `src/lib/renderPipeline.ts`**

Add below `cropBuffer`:

```ts
export function transformPixel(
  r: number,
  g: number,
  b: number,
  brightness: number,
  contrast: number,
  saturation: number
): [number, number, number] {
  let nr = r * brightness
  let ng = g * brightness
  let nb = b * brightness

  nr = (nr - 128) * contrast + 128
  ng = (ng - 128) * contrast + 128
  nb = (nb - 128) * contrast + 128

  const luminance = 0.299 * nr + 0.587 * ng + 0.114 * nb
  nr = luminance + (nr - luminance) * saturation
  ng = luminance + (ng - luminance) * saturation
  nb = luminance + (nb - luminance) * saturation

  return [clamp8(nr), clamp8(ng), clamp8(nb)]
}

export function applyColorAdjustments(
  buffer: PixelBuffer,
  brightness: number,
  contrast: number,
  saturation: number
): PixelBuffer {
  const data = new Uint8ClampedArray(buffer.data)
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = transformPixel(data[i], data[i + 1], data[i + 2], brightness, contrast, saturation)
    data[i] = r
    data[i + 1] = g
    data[i + 2] = b
  }
  return { data, width: buffer.width, height: buffer.height }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/renderPipeline.test.ts`
Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/renderPipeline.ts src/lib/renderPipeline.test.ts
git commit -m "Add brightness/contrast/saturation pixel math"
```

---

### Task 4: Filters (`applyFilter`)

**Files:**
- Modify: `src/lib/renderPipeline.ts`
- Modify: `src/lib/renderPipeline.test.ts`

**Interfaces:**
- Consumes: `PixelBuffer`, `FilterType`, `clamp8` (Task 2).
- Produces: `function applyFilter(buffer: PixelBuffer, filter: FilterType): PixelBuffer`.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/renderPipeline.test.ts`:

```ts
import { applyFilter } from './renderPipeline'

describe('applyFilter', () => {
  it('passes pixels through unchanged for "none"', () => {
    const buffer = { width: 1, height: 1, data: new Uint8ClampedArray([10, 20, 30, 255]) }
    const result = applyFilter(buffer, 'none')
    expect(Array.from(result.data)).toEqual([10, 20, 30, 255])
    expect(result.data).not.toBe(buffer.data)
  })

  it('converts every channel to luminance for "greyscale"', () => {
    const buffer = { width: 1, height: 1, data: new Uint8ClampedArray([200, 100, 50, 255]) }
    const result = applyFilter(buffer, 'greyscale')
    expect(result.data[0]).toBe(result.data[1])
    expect(result.data[1]).toBe(result.data[2])
    expect(result.data[0]).toBeCloseTo(124, 0)
    expect(result.data[3]).toBe(255)
  })

  it('applies the sepia matrix and clamps at 255', () => {
    const buffer = { width: 1, height: 1, data: new Uint8ClampedArray([255, 255, 255, 255]) }
    const result = applyFilter(buffer, 'sepia')
    expect(result.data[0]).toBe(255)
    expect(result.data[1]).toBe(255)
    expect(result.data[2]).toBeCloseTo(239, 0)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/renderPipeline.test.ts`
Expected: FAIL — `applyFilter` is not exported.

- [ ] **Step 3: Implement in `src/lib/renderPipeline.ts`**

```ts
export function applyFilter(buffer: PixelBuffer, filter: FilterType): PixelBuffer {
  const data = new Uint8ClampedArray(buffer.data)
  if (filter === 'none') {
    return { data, width: buffer.width, height: buffer.height }
  }

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]

    if (filter === 'greyscale') {
      const luminance = clamp8(0.299 * r + 0.587 * g + 0.114 * b)
      data[i] = luminance
      data[i + 1] = luminance
      data[i + 2] = luminance
    } else if (filter === 'sepia') {
      data[i] = clamp8(0.393 * r + 0.769 * g + 0.189 * b)
      data[i + 1] = clamp8(0.349 * r + 0.686 * g + 0.168 * b)
      data[i + 2] = clamp8(0.272 * r + 0.534 * g + 0.131 * b)
    }
  }

  return { data, width: buffer.width, height: buffer.height }
}
```

Update the type-only import at the top of the file to include `FilterType`:

```ts
import type { FilterType, PixelBuffer, Rect } from '../types/editor'
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/renderPipeline.test.ts`
Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/renderPipeline.ts src/lib/renderPipeline.test.ts
git commit -m "Add greyscale and sepia filters"
```

---

### Task 5: `renderPipeline` composition

**Files:**
- Modify: `src/lib/renderPipeline.ts`
- Modify: `src/lib/renderPipeline.test.ts`

**Interfaces:**
- Consumes: `cropBuffer`, `applyColorAdjustments`, `applyFilter` (Tasks 2-4),
  `EditorSettings`, `createDefaultSettings` (Task 2).
- Produces: `function renderPipeline(source: PixelBuffer, settings:
  EditorSettings): PixelBuffer` — this is the single function later reused by
  `PreviewCanvas.vue` (Task 8) and `ExportBar.vue` (Task 11) for preview,
  export, and JSON-replay parity.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/renderPipeline.test.ts`:

```ts
import { renderPipeline } from './renderPipeline'
import { createDefaultSettings } from '../types/editor'
import type { EditorSettings } from '../types/editor'

describe('renderPipeline', () => {
  it('composes crop, color adjustments, and filter in sequence', () => {
    const source = {
      width: 2,
      height: 1,
      data: new Uint8ClampedArray([
        50, 50, 50, 255,
        100, 100, 100, 255,
      ]),
    }
    const settings: EditorSettings = {
      crop: { x: 1, y: 0, width: 1, height: 1 },
      brightness: 2,
      contrast: 1,
      saturation: 1,
      filter: 'greyscale',
    }

    const result = renderPipeline(source, settings)

    expect(result.width).toBe(1)
    expect(result.height).toBe(1)
    expect(Array.from(result.data)).toEqual([200, 200, 200, 255])
  })

  it('is a no-op end-to-end under default settings', () => {
    const source = { width: 1, height: 1, data: new Uint8ClampedArray([10, 20, 30, 255]) }
    const result = renderPipeline(source, createDefaultSettings())
    expect(Array.from(result.data)).toEqual([10, 20, 30, 255])
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/renderPipeline.test.ts`
Expected: FAIL — `renderPipeline` is not exported.

- [ ] **Step 3: Implement in `src/lib/renderPipeline.ts`**

```ts
import type { EditorSettings, PixelBuffer, Rect, FilterType } from '../types/editor'

export function renderPipeline(source: PixelBuffer, settings: EditorSettings): PixelBuffer {
  const cropped = cropBuffer(source, settings.crop)
  const adjusted = applyColorAdjustments(cropped, settings.brightness, settings.contrast, settings.saturation)
  return applyFilter(adjusted, settings.filter)
}
```

Update the type-only import at the top of the file to include `EditorSettings`:

```ts
import type { EditorSettings, FilterType, PixelBuffer, Rect } from '../types/editor'
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/renderPipeline.test.ts`
Expected: PASS — all tests green (full pipeline suite).

- [ ] **Step 5: Commit**

```bash
git add src/lib/renderPipeline.ts src/lib/renderPipeline.test.ts
git commit -m "Compose crop, color adjustments, and filter into renderPipeline"
```

---

### Task 6: Pinia store (`useImageEditorStore`)

**Files:**
- Create: `src/stores/imageEditor.ts`
- Create: `src/stores/imageEditor.test.ts`

**Interfaces:**
- Consumes: `EditorSettings`, `FilterType`, `Rect`, `createDefaultSettings`
  (Task 2).
- Produces: `interface OriginalImage { bitmap: ImageBitmap; width: number;
  height: number; fileName: string; mimeType: string }`, and
  `useImageEditorStore()` exposing state `original: OriginalImage | null`,
  `settings: EditorSettings`, `showingOriginal: boolean`, and actions
  `loadImage(original: OriginalImage)`, `setCrop(rect: Rect | null)`,
  `resetCrop()`, `setBrightness(value: number)`, `setContrast(value:
  number)`, `setSaturation(value: number)`, `setFilter(value: FilterType)`,
  `resetAll()`, `toggleViewOriginal()`. Consumed by `ImageUploader.vue`
  (Task 7), `PreviewCanvas.vue` (Task 8), `AdjustmentPanel.vue` (Task 9),
  `CropStage.vue` (Task 10), `ExportBar.vue` (Task 11).

- [ ] **Step 1: Write the failing tests**

Create `src/stores/imageEditor.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/stores/imageEditor.test.ts`
Expected: FAIL — `src/stores/imageEditor.ts` does not exist.

- [ ] **Step 3: Implement `src/stores/imageEditor.ts`**

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/stores/imageEditor.test.ts`
Expected: PASS — all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/stores/imageEditor.ts src/stores/imageEditor.test.ts
git commit -m "Add Pinia store for the editor's settings-object state"
```

---

### Task 7: `ImageUploader.vue`

**Files:**
- Create: `src/components/ImageUploader.vue`

**Interfaces:**
- Consumes: `useImageEditorStore` (Task 6), `store.loadImage(original: OriginalImage)`.
- Produces: an uploader component. After a file is picked, `store.original`
  becomes non-null — this is what `App.vue` (Task 12) uses to decide whether
  to show the rest of the editor.

- [ ] **Step 1: Create `src/components/ImageUploader.vue`**

```vue
<script setup lang="ts">
import { ref, watch } from 'vue'
import { useImageEditorStore } from '../stores/imageEditor'

const store = useImageEditorStore()
const selectedFile = ref<File[]>([])

watch(selectedFile, async (files) => {
  const file = files[0]
  if (!file) return

  const bitmap = await createImageBitmap(file)
  store.loadImage({
    bitmap,
    width: bitmap.width,
    height: bitmap.height,
    fileName: file.name,
    mimeType: file.type,
  })

  selectedFile.value = []
})
</script>

<template>
  <v-file-input v-model="selectedFile" label="Upload image" accept="image/*" />
</template>
```

- [ ] **Step 2: Verify the project still type-checks and builds**

Run: `npm run build`
Expected: no type errors, build succeeds.

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, open the printed local URL in a browser, use the file
input to pick a JPEG/PNG. Expected: no console errors; component accepts the
file (visual confirmation of the effect on-screen arrives once
`PreviewCanvas` exists in Task 8/12 — for now, absence of errors is the bar).

- [ ] **Step 4: Commit**

```bash
git add src/components/ImageUploader.vue
git commit -m "Add ImageUploader component"
```

---

### Task 8: `PreviewCanvas.vue`

**Files:**
- Create: `src/components/PreviewCanvas.vue`

**Interfaces:**
- Consumes: `useImageEditorStore` (Task 6, fields `original`, `settings`,
  `showingOriginal`), `renderPipeline` (Task 5), `PixelBuffer` (Task 2).
- Produces: a `<canvas>` that always shows the current derived preview —
  either the raw original (`showingOriginal`) or `renderPipeline(previewSource,
  settings)` — recomputed from a cached downscaled copy of the original
  (longest side capped at 1200px) so slider drags stay smooth. `ExportBar.vue`
  (Task 11) does its own full-resolution pass; it does not read this
  component's cache.

- [ ] **Step 1: Create `src/components/PreviewCanvas.vue`**

```vue
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
  if (!canvas || !original.value) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  let result: PixelBuffer
  if (showingOriginal.value) {
    result = bitmapToPixelBuffer(original.value.bitmap, PREVIEW_MAX_DIMENSION)
  } else {
    if (!previewSource.value) return
    result = renderPipeline(previewSource.value, settings.value)
  }

  canvas.width = result.width
  canvas.height = result.height
  ctx.putImageData(new ImageData(result.data, result.width, result.height), 0, 0)
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
```

- [ ] **Step 2: Verify the project still type-checks and builds**

Run: `npm run build`
Expected: no type errors, build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/PreviewCanvas.vue
git commit -m "Add PreviewCanvas rendering the derived pipeline output"
```

---

### Task 9: `AdjustmentPanel.vue`

**Files:**
- Create: `src/components/AdjustmentPanel.vue`

**Interfaces:**
- Consumes: `useImageEditorStore` (Task 6) actions `setBrightness`,
  `setContrast`, `setSaturation`, `setFilter`; `FilterType` (Task 2).
- Produces: the slider/filter controls that mutate `settings` through the
  store's actions (not direct state writes), matching the store's documented
  action-based interface.

- [ ] **Step 1: Create `src/components/AdjustmentPanel.vue`**

```vue
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
```

- [ ] **Step 2: Verify the project still type-checks and builds**

Run: `npm run build`
Expected: no type errors, build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/AdjustmentPanel.vue
git commit -m "Add AdjustmentPanel sliders and filter select"
```

---

### Task 10: `CropStage.vue`

**Files:**
- Create: `src/components/CropStage.vue`

**Interfaces:**
- Consumes: `useImageEditorStore` (Task 6, `original`, action `setCrop`),
  `cropperjs` default export `Cropper`.
- Produces: an interactive crop overlay. `cropper.getData(true)` already
  returns coordinates in the original image's natural pixel space (cropperjs
  handles the display-to-natural conversion internally), so the values are
  stored into `settings.crop` as-is, with no manual scale math needed.

- [ ] **Step 1: Create `src/components/CropStage.vue`**

```vue
<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.css'
import { storeToRefs } from 'pinia'
import { useImageEditorStore } from '../stores/imageEditor'

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

watch(
  original,
  (value) => {
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
  },
  { immediate: true }
)

onBeforeUnmount(destroyCropper)
</script>

<template>
  <div class="crop-stage">
    <img ref="imageRef" alt="Crop source" />
  </div>
</template>

<style scoped>
.crop-stage img {
  display: block;
  max-width: 100%;
}
</style>
```

- [ ] **Step 2: Verify the project still type-checks and builds**

Run: `npm run build`
Expected: no type errors, build succeeds. If `@types/cropperjs` does not
match the installed `cropperjs` version's actual shape, fix the type error
here (e.g. by adjusting the `CropperOptions`/`getData` usage) before moving on.

- [ ] **Step 3: Commit**

```bash
git add src/components/CropStage.vue
git commit -m "Add CropStage using cropperjs for non-destructive crop selection"
```

---

### Task 11: `ExportBar.vue`

**Files:**
- Create: `src/components/ExportBar.vue`

**Interfaces:**
- Consumes: `useImageEditorStore` (Task 6: `original`, `settings`, actions
  `resetAll`, `toggleViewOriginal`), `renderPipeline` (Task 5), `PixelBuffer`
  (Task 2).
- Produces: Reset / View original / Download image / Download JSON controls.
  The JSON payload shape is `{ version: 1, sourceImage: { fileName, width,
  height }, operations: EditorSettings }` — `operations` is exactly
  `settings`, so replay is `renderPipeline(originalPixels, operations)`.

- [ ] **Step 1: Create `src/components/ExportBar.vue`**

```vue
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useImageEditorStore } from '../stores/imageEditor'
import { renderPipeline } from '../lib/renderPipeline'
import type { PixelBuffer } from '../types/editor'

const store = useImageEditorStore()
const { original, settings } = storeToRefs(store)

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
  ctx.putImageData(new ImageData(result.data, result.width, result.height), 0, 0)

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
    <v-btn :disabled="!original" @click="onToggleViewOriginal">View original</v-btn>
    <v-btn :disabled="!original" color="primary" @click="exportImage">Download image</v-btn>
    <v-btn :disabled="!original" @click="exportOperationsJson">Download JSON</v-btn>
  </div>
</template>
```

- [ ] **Step 2: Verify the project still type-checks and builds**

Run: `npm run build`
Expected: no type errors, build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/ExportBar.vue
git commit -m "Add ExportBar for reset, view-original, and export actions"
```

---

### Task 12: Wire `App.vue`, write the README, and run the manual QA checklist

**Files:**
- Modify: `src/App.vue`
- Create: `README.md`

**Interfaces:**
- Consumes: every component from Tasks 7-11.
- Produces: the fully wired application and the manual QA sign-off for the
  whole golden path described in the spec.

- [ ] **Step 1: Replace `src/App.vue`**

```vue
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
```

- [ ] **Step 2: Create `README.md`**

```markdown
# Pet Photo Editor

Non-destructive, browser-based image editor (Vue 3 + Vuetify 3 + Pinia + TypeScript).

## Run

npm i
npm run dev

## Design

See `docs/superpowers/specs/2026-07-04-image-editor-design.md` for the full
design rationale (edit model, render pipeline, JSON export/replay shape).

In short: the original image is loaded once and never mutated. All edits
live in one settings object (`crop`, `brightness`, `contrast`, `saturation`,
`filter`) in a Pinia store. A single pure function, `renderPipeline`, derives
the visible image from the original + settings, and is reused unchanged for
the live preview, the exported PNG, and (via the bonus JSON export) replay
against the original.

## Tests

npm run test
```

- [ ] **Step 3: Verify the full build and test suite**

Run: `npm run build`
Expected: no type errors, build succeeds.

Run: `npm run test`
Expected: all `renderPipeline` and store tests pass.

- [ ] **Step 4: Manual QA checklist**

Run: `npm run dev`, open the printed local URL in a browser, and verify each
of the following:

1. Upload an image via the file input → it appears in both the crop stage and the preview.
2. Drag the crop rectangle to a smaller region → the preview updates to show only the cropped area.
3. Move the brightness slider → the preview visibly brightens/darkens in real time.
4. Move the contrast slider → the preview visibly changes contrast in real time.
5. Move the saturation slider → the preview visibly changes color intensity in real time.
6. Select "Greyscale", then "Sepia" from the filter dropdown → the preview updates accordingly.
7. Click "View original" → the untouched original is shown; click again → all edits (crop, sliders, filter) are still applied exactly as before.
8. Click "Reset" → crop clears and sliders return to neutral (1/1/1) and filter returns to "None"; the original image itself still displays correctly.
9. Reapply some edits, then click "Download image" → a PNG downloads and visually matches the current preview.
10. Click "Download JSON" → a `.json` file downloads containing `version`, `sourceImage`, and `operations` matching the current settings.

- [ ] **Step 5: Commit**

```bash
git add src/App.vue README.md
git commit -m "Wire full editor UI and document setup/design"
```
