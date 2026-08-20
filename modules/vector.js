import { CONFIG } from './config.js';
let loading = null;
async function ensureImageTracer() {
  if (window.ImageTracer) return window.ImageTracer;
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script'); s.src = CONFIG.vectorScript; s.async = true;
      s.onload = () => window.ImageTracer ? resolve(window.ImageTracer) : reject(new Error('ImageTracer no está disponible.'));
      s.onerror = () => reject(new Error('No se pudo cargar el vectorizador. Revisa tu conexión.'));
      document.head.appendChild(s);
    });
  }
  return loading;
}
export async function vectorize(imageData, preset = 'posterized2') {
  const ImageTracer = await ensureImageTracer();
  const opts = {
    posterized2: { colorsampling: 2, numberofcolors: 6, ltres: 1, qtres: 1, strokewidth: 0, pathomit: 8, blurradius: 0 },
    sharp: { colorsampling: 2, numberofcolors: 8, ltres: 0.5, qtres: 0.8, strokewidth: 0, pathomit: 4, blurradius: 0 },
    detailed: { colorsampling: 2, numberofcolors: 12, ltres: 0.6, qtres: 0.8, strokewidth: 0, pathomit: 2, blurradius: 0 }
  }[preset] || {};
  return ImageTracer.imagedataToSVG(imageData, opts);
}
