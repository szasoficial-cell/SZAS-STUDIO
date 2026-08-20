export function cloneImageData(im) { return new ImageData(new Uint8ClampedArray(im.data), im.width, im.height); }
export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
export function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('El navegador no pudo decodificar la imagen.')); };
    img.src = url;
  });
}
export function imageDataToCanvas(im) {
  const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
  c.getContext('2d').putImageData(im, 0, 0); return c;
}
export function canvasToBlob(canvas, type = 'image/png', quality = 1) {
  return new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('No se pudo crear el archivo.')), type, quality));
}
export function fitCanvasSize(width, height, maxPixels) {
  const pixels = width * height;
  if (pixels <= maxPixels) return { width, height, scale: 1 };
  const scale = Math.sqrt(maxPixels / pixels);
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)), scale };
}
export function resizeCanvas(source, width, height) {
  const out = document.createElement('canvas'); out.width = width; out.height = height;
  const c = out.getContext('2d'); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high'; c.drawImage(source, 0, 0, width, height); return out;
}
