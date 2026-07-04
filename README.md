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
