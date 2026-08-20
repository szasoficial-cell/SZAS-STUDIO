import { CONFIG } from './config.js';
let transformersPromise = null, bgPromise = null, upscalePromise = null;
async function getTransformers() {
  if (!transformersPromise) transformersPromise = import(`https://cdn.jsdelivr.net/npm/@huggingface/transformers@${CONFIG.transformersVersion}`);
  return transformersPromise;
}
async function makePipeline(task, model, onProgress = () => {}) {
  const { pipeline } = await getTransformers();
  const webgpu = !!navigator.gpu;
  const attempts = webgpu
    ? [{ device: 'webgpu', dtype: 'q8' }, { device: 'webgpu' }, { device: 'wasm', dtype: 'q8' }]
    : [{ device: 'wasm', dtype: 'q8' }, { device: 'wasm' }];
  let last;
  for (const opts of attempts) { try { return await pipeline(task, model, { ...opts, progress_callback: onProgress }); } catch (e) { last = e; } }
  throw last || new Error('No se pudo iniciar el motor de IA.');
}
async function rawToCanvas(raw) {
  if (!raw || !raw.data || !raw.width || !raw.height) throw new Error('El modelo no devolvió una imagen válida.');
  const channels = raw.channels || 3, out = document.createElement('canvas'); out.width = raw.width; out.height = raw.height;
  const imageData = new ImageData(out.width, out.height), src = raw.data;
  for (let i = 0, p = 0; i < src.length; i += channels, p += 4) { imageData.data[p] = src[i]; imageData.data[p + 1] = channels > 1 ? src[i + 1] : src[i]; imageData.data[p + 2] = channels > 2 ? src[i + 2] : src[i]; imageData.data[p + 3] = channels > 3 ? src[i + 3] : 255; }
  out.getContext('2d').putImageData(imageData, 0, 0); return out;
}
export async function removeBackground(canvas, onProgress = () => {}) {
  if (!bgPromise) bgPromise = makePipeline('background-removal', CONFIG.backgroundModel, onProgress).catch(e => { bgPromise = null; throw e; });
  const pipe = await bgPromise; onProgress('IA / SEGMENTANDO');
  const out = await pipe(canvas);
  const raw = Array.isArray(out) ? out[0] : out;
  return rawToCanvas(raw);
}
export async function aiUpscale(canvas, onProgress = () => {}) {
  if (!upscalePromise) upscalePromise = makePipeline('image-to-image', CONFIG.upscaleModel, onProgress).catch(e => { upscalePromise = null; throw e; });
  const pipe = await upscalePromise; onProgress('IA / SUPER-RESOLUCIÓN');
  const out = await pipe(canvas);
  const raw = Array.isArray(out) ? out[0] : out;
  return rawToCanvas(raw);
}
