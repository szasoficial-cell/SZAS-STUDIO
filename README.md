# SZAS STUDIO — V3 FINAL BASE

Static GitHub Pages application for image preparation, DTF and local browser AI.

## Included
- Reliable JPG/PNG/WEBP import with click + drag/drop.
- Safety limit: 20 MB input and 36 MP canvas.
- Non-destructive adjustment sliders with proper preview/commit behavior.
- Undo/redo.
- Local grayscale, threshold, invert, denoise, enhancement, edge cleanup, alpha cutout and autocrop.
- DTF halftone: dot size, contrast, density, angle, circle/square/diamond patterns, inversion and presets.
- Print check in cm/DPI.
- PNG export.
- RGB channel separation.
- SVG vectorization loaded only when requested.
- AI background removal with `xrds/isnet-general-onnx-int8` (MIT).
- AI 4× super-resolution with `onnx-community/swin2SR-realworld-sr-x4-64-bsrgan-psnr-ONNX` (Apache-2.0).

## AI behavior
AI is not bundled into the repository. Transformers.js and the selected ONNX model are downloaded by the browser only when the user activates an AI feature. The image is passed to the in-browser model; the project does not include an upload endpoint.

The first AI run can be slow and requires internet access. WebGPU is attempted first when available, with WASM/CPU fallback.

## GitHub Pages
Upload the files at the repository root. Keep the `modules/` folder exactly as provided. Then enable GitHub Pages from the `main` branch and `/ (root)`.

## Important production note
AI quality and speed depend on browser, GPU, available memory and network. The app reports errors instead of silently pretending an AI operation succeeded.
