export function applyHalftone(sourceCanvas, { dot = 6, contrast = 50, density = 100, angle = 45, pattern = 'circle', invert = false } = {}) {
  const w = sourceCanvas.width, h = sourceCanvas.height;
  const src = sourceCanvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h);
  const out = document.createElement('canvas'); out.width = w; out.height = h;
  const c = out.getContext('2d');
  c.save(); c.translate(w / 2, h / 2); c.rotate(angle * Math.PI / 180); c.translate(-w / 2, -h / 2);
  const radius = dot / 2, factor = 1 + contrast / 100;
  for (let y = -dot; y < h + dot; y += dot) {
    for (let x = -dot; x < w + dot; x += dot) {
      const sx = Math.max(0, Math.min(w - 1, Math.round(x + radius)));
      const sy = Math.max(0, Math.min(h - 1, Math.round(y + radius)));
      const p = (sy * w + sx) * 4;
      let lum = 0.299 * src.data[p] + 0.587 * src.data[p + 1] + 0.114 * src.data[p + 2];
      if (invert) lum = 255 - lum;
      lum = Math.max(0, Math.min(255, 128 + (lum - 128) * factor));
      const size = Math.max(0, radius * (1 - lum / 255) * 2 * density / 100);
      if (size < 0.25) continue;
      c.fillStyle = `rgba(0,0,0,${src.data[p + 3] / 255})`; c.beginPath();
      if (pattern === 'square') c.rect(x + radius - size, y + radius - size, size * 2, size * 2);
      else if (pattern === 'diamond') { c.moveTo(x + radius, y + radius - size); c.lineTo(x + radius + size, y + radius); c.lineTo(x + radius, y + radius + size); c.lineTo(x + radius - size, y + radius); c.closePath(); }
      else c.arc(x + radius, y + radius, size, 0, Math.PI * 2);
      c.fill();
    }
  }
  c.restore(); return out;
}
