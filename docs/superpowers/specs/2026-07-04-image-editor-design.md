# Image Editor — Design Spec

Date: 2026-07-04

## Context

Test task: a small browser-based, non-destructive image editor (Vue 3 + Vuetify 3 +
Pinia + TypeScript) for the printing industry. Upload → crop → live
brightness/contrast/saturation adjustments → export. Bonus: at least one filter,
and exporting the applied operations as replayable JSON.

The task explicitly states the evaluation focus is *how edits are modeled*, not
pixel manipulation per se. This spec documents that model and the surrounding
architecture.

## Goals

- Non-destructive editing: the original image is never mutated; the preview and
  export are always derived from it.
- Edits are independent, parametric values (not an append-only history/op-stack).
- Preview and export are visually identical by construction (same render code path).
- Crop and the bonus filter both participate in the same non-destructive model.
- Bonus JSON export fully describes the applied edits well enough to reproduce
  the result by re-running them against the original.

## Non-goals

- Persistence across page reloads (session-only state).
- Undo/redo history or reordering of operations.
- Multiple simultaneous crops/filters (each field holds at most one value).
- Automated end-to-end/UI test suite (given the ~1 day scope); only the pure
  pixel-math pipeline gets unit tests.

## Architecture

### Components

- `ImageUploader` — file input; decodes the uploaded `File` into an
  `ImageBitmap` and hands it to the store.
- `CropStage` — interactive crop UI (cropperjs) layered over a display of the
  original image. Used only to *pick* a rectangle; produces no pixels itself.
- `AdjustmentPanel` — Vuetify sliders for brightness/contrast/saturation, a
  filter select, and the crop trigger.
- `PreviewCanvas` — the single `<canvas>` that renders either the pipeline
  output or (when toggled) the raw original.
- `ExportBar` — Reset, View original (toggle), Download image, Download JSON.

### State (Pinia store `useImageEditorStore`)

```
original: { bitmap: ImageBitmap, width: number, height: number,
            fileName: string, mimeType: string }   // immutable once loaded

settings: {
  crop: { x: number, y: number, width: number, height: number } | null
  brightness: number   // neutral = 1
  contrast: number     // neutral = 1
  saturation: number   // neutral = 1
  filter: 'none' | 'greyscale' | 'sepia'
}

showingOriginal: boolean   // transient UI flag, does not touch `settings`
```

Actions: `loadImage(file)`, `setCrop(rect)`, `resetCrop()`, `setBrightness(v)`,
`setContrast(v)`, `setSaturation(v)`, `setFilter(v)`, `resetAll()`,
`toggleViewOriginal()`.

`settings` is a fixed-shape object, not a list: each field is independently
readable/resettable, and slider changes overwrite a field rather than
appending a step. This directly satisfies "edits are independent and not
order-bound" — a user can set brightness, then crop, then clear only the
crop, without disturbing brightness.

## Render pipeline

A single pure function is the heart of the model:

```
renderPipeline(sourceImageData: ImageData, settings: Settings): ImageData
```

Steps, always applied in this fixed internal order (independent of the order
the user touched controls in the UI):

1. **Crop** — extract the sub-rectangle from the source, or the full frame if
   `crop` is `null`.
2. **Brightness / contrast / saturation** — per-pixel color math over the
   cropped `ImageData`.
3. **Filter** — greyscale/sepia as a final per-pixel transform, if set.

This function is the *only* place pixel math happens. It is reused for:

- **Live preview** — run against a cached, downscaled copy of the original
  (longest side ≤ 1200px, computed once on load), re-run on slider input
  throttled via `requestAnimationFrame`.
- **Export** — run once, on demand, against the full-resolution original.

Because both paths call the same function, preview and export cannot drift
apart numerically.

## Crop integration

cropperjs is used purely as an interactive rectangle-selection overlay on a
display-scaled rendering of the original. On confirm, its rectangle is
converted from display coordinates back into the original's natural pixel
coordinates and stored as `settings.crop`. cropperjs's own internal cropped
canvas output is discarded — `renderPipeline` always re-crops from the true
original. This is what keeps crop non-destructive and freely re-editable
(changing or clearing the crop is just replacing/nulling one field).

## View original vs. Reset

These are deliberately two different actions:

- **View original** (`showingOriginal`) — a transient toggle. While active,
  `PreviewCanvas` renders the untouched original bitmap directly; `settings`
  is neither read nor mutated. Toggling off resumes rendering from the
  current `settings`.
- **Reset** (`resetAll()`) — destructively clears `settings` back to defaults
  (`crop: null`, neutral brightness/contrast/saturation, `filter: 'none'`).
  The original bitmap itself is never touched by either action.

## Export

On "Download image": run `renderPipeline` once against the full-resolution
original with the current `settings`, draw the result to an off-DOM canvas
sized to the (possibly cropped) output dimensions, and trigger a download via
`canvas.toBlob()` (PNG by default).

## Bonus: JSON operations export

```json
{
  "version": 1,
  "sourceImage": { "fileName": "cat.jpg", "width": 4032, "height": 3024 },
  "operations": {
    "crop": { "x": 100, "y": 50, "width": 3000, "height": 2200 },
    "brightness": 1.15,
    "contrast": 1.05,
    "saturation": 0.9,
    "filter": "sepia"
  }
}
```

`operations` is exactly the shape of `settings`. Replaying means: load the
original referenced by `sourceImage`, then call `renderPipeline(original,
operations)` — the identical function used for live preview and export.
Because there is only one implementation of the pixel math, fidelity between
"what you saw", "what you exported", and "what replay reproduces" is
guaranteed by construction rather than by keeping two implementations in
sync.

## Testing

Given the ~1 day scope, prioritize manually verifying the golden path
(upload → crop → adjust → view original → reset → export) over an automated
UI suite. Add unit tests for the pure pixel-math steps inside
`renderPipeline` (crop extraction, brightness/contrast/saturation, filters),
since that function is the part being evaluated as "the model".

## Open risks

- Per-pixel loops in plain JS for brightness/contrast/saturation/filter on a
  1200px preview should be comfortably fast; if profiling shows otherwise,
  the fallback is a smaller preview cap, not a different architecture.
- cropperjs's coordinate system must be verified against whatever scaling
  factor is used to display the original in `CropStage`, to avoid off-by-scale
  errors when converting back to natural pixel coordinates.
