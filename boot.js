(() => {
  const MAX_BYTES = 20 * 1024 * 1024;
  const MAX_PIXELS = 36_000_000;
  const $ = id => document.getElementById(id);
  const input = $('fileInput'), drop = $('dropzone'), choose = $('chooseFile'), canvas = $('canvas');
  if (!input || !drop || !canvas) return;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const setStatus = (text, cls='') => { const el=$('fileHealth'); if(el){el.textContent=text;el.className='file-health '+cls;} };
  function pick(){ input.click(); }
  choose?.addEventListener('click', e => { e.stopPropagation(); pick(); });
  drop.addEventListener('click', e => { if(e.target !== choose) pick(); });
  drop.addEventListener('keydown', e => { if(e.key==='Enter'||e.key===' '){e.preventDefault();pick();} });
  input.addEventListener('change', e => { const f=e.target.files?.[0]; if(f) handle(f); e.target.value=''; });
  ['dragenter','dragover'].forEach(t=>drop.addEventListener(t,e=>{e.preventDefault();e.stopPropagation();drop.classList.add('drag')}));
  ['dragleave','drop'].forEach(t=>drop.addEventListener(t,e=>{e.preventDefault();e.stopPropagation();drop.classList.remove('drag')}));
  drop.addEventListener('drop',e=>{const f=e.dataTransfer?.files?.[0];if(f)handle(f)});
  function handle(file){
    if(file.size>MAX_BYTES){setStatus('IMAGEN DEMASIADO GRANDE · MÁX. 20 MB','bad');return;}
    if(!['image/png','image/jpeg','image/webp'].includes((file.type||'').toLowerCase())){setStatus('SOLO PNG / JPG / WEBP','bad');return;}
    const url=URL.createObjectURL(file), img=new Image();
    img.onload=()=>{
      URL.revokeObjectURL(url);
      const scale=Math.min(1,Math.sqrt(MAX_PIXELS/(img.naturalWidth*img.naturalHeight)));
      const w=Math.max(1,Math.round(img.naturalWidth*scale)),h=Math.max(1,Math.round(img.naturalHeight*scale));
      canvas.width=w;canvas.height=h;ctx.clearRect(0,0,w,h);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(img,0,0,w,h);
      canvas.style.display='block';$('emptyState').style.display='none';$('fileName').textContent=(file.name||'IMAGEN').toUpperCase();$('imageInfo').textContent=`${w} × ${h} PX`;$('modeInfo').textContent='ORIGINAL';
      setStatus(scale<1?`REDUCIDA A ${w} × ${h} PX · LÍMITE DE SEGURIDAD`:`CARGADA · ${Math.round(file.size/1024)} KB`,'ok');
      const detail={file,imageData:ctx.getImageData(0,0,w,h)}; window.__SZAS_LAST_FILE=detail; window.dispatchEvent(new CustomEvent('szas:image-loaded',{detail}));
    };
    img.onerror=()=>{URL.revokeObjectURL(url);setStatus('ARCHIVO DE IMAGEN INVÁLIDO','bad')};
    img.src=url;
  }
  window.SZAS_BOOT={handle};
})();
