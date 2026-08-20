import { CONFIG } from "./modules/config.js";
import { History } from "./modules/history.js";
import { applyHalftone } from "./modules/halftone.js";
import { vectorize } from "./modules/vector.js";
import { blobToImage, canvasFromImage, downloadBlob, cloneImageData } from "./modules/utils.js";
import { removeBackground, aiUpscale } from "./modules/ai.js";

const $=id=>document.getElementById(id);
const canvas=$("canvas"),ctx=canvas.getContext("2d",{willReadFrequently:true});
const compareCanvas=$("compareCanvas"),compareCtx=compareCanvas.getContext("2d");
const history=new History(25);
let original=null, originalName="SZAS", currentMode="READY", zoom=1, compareOn=false, lastSvg="";
let settings={brightness:0,contrast:0,saturation:0,sharpness:0};
let half={dot:6,contrast:50,density:100,angle:45,pattern:"circle",invert:false};
let processing=false;

function toast(message){const el=document.createElement("div");el.className="toast";el.textContent=message;document.body.appendChild(el);setTimeout(()=>el.classList.add("show"),10);setTimeout(()=>{el.classList.remove("show");setTimeout(()=>el.remove(),250)},1900)}
function setBusy(show,title="PROCESANDO",text="Local / GPU cuando está disponible"){processing=show;$("busy").style.display=show?"flex":"none";$("busyTitle").textContent=title;$("busyText").textContent=text}
function requireImage(){if(!original){toast("SUBE UNA IMAGEN PRIMERO");return false}return true}
function syncImageInfo(){if(!canvas.width)return;$("imageInfo").textContent=`${canvas.width} × ${canvas.height} PX`;updatePrint()}
function fit(){zoom=1;canvas.style.transform="scale(1)";$("zoomLabel").textContent="100%"}
function setCanvasFrom(img){canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0);canvas.style.display="block";$("emptyState").style.display="none";syncImageInfo();fit()}
function currentData(){return ctx.getImageData(0,0,canvas.width,canvas.height)}
function commit(){if(!canvas.width)return;history.push(currentData());}
function replaceWithImage(img){commit();setCanvasFrom(img);currentMode="EDITED";$("modeInfo").textContent=currentMode}
function resetToOriginal(){if(!original)return;commit();setCanvasFrom(original);settings={brightness:0,contrast:0,saturation:0,sharpness:0};syncSliders();currentMode="ORIGINAL";$("modeInfo").textContent=currentMode}
function renderAdjustments(){
 if(!original)return;
 const im=currentData(),d=im.data,b=settings.brightness*2.55,c=settings.contrast,f=(259*(c+255))/(255*(259-c)),s=1+settings.saturation/100;
 for(let i=0;i<d.length;i+=4){
  let r=(d[i]-128)*f+128+b,g=(d[i+1]-128)*f+128+b,bl=(d[i+2]-128)*f+128+b;
  const gray=.299*r+.587*g+.114*bl;r=gray+(r-gray)*s;g=gray+(g-gray)*s;bl=gray+(bl-gray)*s;
  d[i]=Math.max(0,Math.min(255,r));d[i+1]=Math.max(0,Math.min(255,g));d[i+2]=Math.max(0,Math.min(255,bl))
 }
 ctx.putImageData(im,0,0);if(settings.sharpness)applySharpen(settings.sharpness/100);currentMode="ADJUSTED";$("modeInfo").textContent=currentMode
}
function applySharpen(k){const src=currentData(),out=ctx.createImageData(src.width,src.height),a=src.data,b=out.data,w=src.width,h=src.height,idx=(x,y)=>(y*w+x)*4;for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p=idx(x,y);for(let c=0;c<3;c++){let v=a[p+c]*(1+4*k);if(x)v-=a[idx(x-1,y)+c]*k;if(x<w-1)v-=a[idx(x+1,y)+c]*k;if(y)v-=a[idx(x,y-1)+c]*k;if(y<h-1)v-=a[idx(x,y+1)+c]*k;b[p+c]=Math.max(0,Math.min(255,v))}b[p+3]=a[p+3]}ctx.putImageData(out,0,0)}
function syncSliders(){["brightness","contrast","saturation","sharpness"].forEach(k=>{$(k).value=settings[k];$(k+"Out").textContent=settings[k]})}
function actionSimple(name){
 if(!requireImage())return;commit();const im=currentData(),d=im.data;
 if(name==="grayscale"){for(let i=0;i<d.length;i+=4){const g=.299*d[i]+.587*d[i+1]+.114*d[i+2];d[i]=d[i+1]=d[i+2]=g}}
 if(name==="threshold"){for(let i=0;i<d.length;i+=4){const g=(.299*d[i]+.587*d[i+1]+.114*d[i+2])>128?255:0;d[i]=d[i+1]=d[i+2]=g}}
 if(name==="invert"){for(let i=0;i<d.length;i+=4){d[i]=255-d[i];d[i+1]=255-d[i+1];d[i+2]=255-d[i+2]}}
 ctx.putImageData(im,0,0);currentMode=name.toUpperCase();$("modeInfo").textContent=currentMode
}
function edgeClean(){
 if(!requireImage())return;commit();const im=currentData(),d=im.data,w=im.width,h=im.height;
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const p=(y*w+x)*4;if(d[p+3]>0&&d[p+3]<255){let a=0;for(let yy=-1;yy<=1;yy++)for(let xx=-1;xx<=1;xx++)a+=d[((y+yy)*w+x+xx)*4+3];d[p+3]=Math.max(d[p+3],Math.round(a/9))}}
 ctx.putImageData(im,0,0);toast("BORDES SUAVIZADOS")
}
function cutout(){
 if(!requireImage())return;commit();const im=currentData(),d=im.data;for(let i=0;i<d.length;i+=4){const g=.299*d[i]+.587*d[i+1]+.114*d[i+2];d[i+3]=g>128?255:0}ctx.putImageData(im,0,0);currentMode="CALADO";$("modeInfo").textContent=currentMode
}
function autocrop(){
 if(!requireImage())return;const im=currentData(),d=im.data,w=im.width,h=im.height;let minX=w,minY=h,maxX=-1,maxY=-1;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p=(y*w+x)*4;if(d[p+3]>10){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y)}}
 if(maxX<0){toast("NO HAY CONTENIDO VISIBLE");return}commit();const tmp=document.createElement("canvas");tmp.width=maxX-minX+1;tmp.height=maxY-minY+1;tmp.getContext("2d").putImageData(ctx.getImageData(minX,minY,tmp.width,tmp.height),0,0);canvas.width=tmp.width;canvas.height=tmp.height;ctx.drawImage(tmp,0,0);syncImageInfo();toast("RECORTADO AL CONTENIDO")
}
async function doAI(type){
 if(!requireImage()||processing)return;setBusy(true,"IA / PROCESANDO","La primera ejecución descarga y guarda el modelo en el navegador.");
 try{
  let sourceCanvas=canvas;
  if(type==="upscale" && Math.max(canvas.width,canvas.height)>CONFIG.maxAIInput){sourceCanvas=canvasFromImage(canvas,CONFIG.maxAIInput*CONFIG.maxAIInput);toast("ENTRADA IA LIMITADA A 1024 PX PARA EVITAR FALLOS DE MEMORIA")}
  const blob=type==="remove"?await removeBackground(sourceCanvas,()=>{}):await aiUpscale(sourceCanvas,()=>{});
  const img=await blobToImage(blob);commit();setCanvasFrom(img);currentMode=type==="remove"?"AI BG REMOVED":"AI UPSCALED 4×";$("modeInfo").textContent=currentMode;toast(type==="remove"?"FONDO ELIMINADO CON IA":"IMAGEN AMPLIADA CON IA")
 }catch(err){console.error(err);toast("IA NO DISPONIBLE: "+(err?.message||"ERROR DESCONOCIDO"))}
 finally{setBusy(false)}
}
function enhance(){if(!requireImage())return;commit();settings={...settings,contrast:Math.min(35,settings.contrast+15),sharpness:Math.max(45,settings.sharpness)};renderAdjustments();syncSliders();toast("MEJORA DE DETALLE APLICADA")}
function denoise(){if(!requireImage())return;commit();const im=currentData(),d=im.data,w=im.width,h=im.height,out=ctx.createImageData(w,h),o=out.data;for(let y=0;y<h;y++)for(let x=0;x<w;x++){let sums=[0,0,0,0],n=0;for(let yy=-1;yy<=1;yy++)for(let xx=-1;xx<=1;xx++){const X=Math.max(0,Math.min(w-1,x+xx)),Y=Math.max(0,Math.min(h-1,y+yy)),p=(Y*w+X)*4;for(let c=0;c<4;c++)sums[c]+=d[p+c];n++}const p=(y*w+x)*4;for(let c=0;c<4;c++)o[p+c]=sums[c]/n}ctx.putImageData(out,0,0);toast("RUIDO REDUCIDO")}
async function vectorizeAction(){
 if(!requireImage())return;setBusy(true,"VECTORIZANDO","Trazado local / SVG");
 try{const max=900,scale=Math.min(1,max/Math.max(canvas.width,canvas.height)),tmp=document.createElement("canvas");tmp.width=Math.max(1,Math.round(canvas.width*scale));tmp.height=Math.max(1,Math.round(canvas.height*scale));tmp.getContext("2d").drawImage(canvas,0,0,tmp.width,tmp.height);lastSvg=vectorize(tmp.getContext("2d").getImageData(0,0,tmp.width,tmp.height),"posterized2");openSvgModal(lastSvg);toast("SVG VECTORIAL GENERADO")}catch(e){console.error(e);toast("NO SE PUDO VECTORIZAR")}finally{setBusy(false)}
}
function openSvgModal(svg){$("modalContent").innerHTML=`<div class="modal-title">VECTOR / SVG READY</div><div style="background:#fff;min-height:240px;display:flex;align-items:center;justify-content:center;overflow:auto">${svg}</div><div class="modal-actions"><button id="modalSvgDownload">DESCARGAR SVG</button></div>`;$("modal").classList.add("open");$("modalSvgDownload").onclick=()=>downloadBlob(new Blob([svg],{type:"image/svg+xml"}),`${originalName}-vector.svg`)}
function channels(){
 if(!requireImage())return;const im=currentData(),w=im.width,h=im.height,channels=[];
 for(let ci=0;ci<3;ci++){const c=document.createElement("canvas");c.width=w;c.height=h;const x=c.getContext("2d"),o=x.createImageData(w,h);for(let i=0;i<im.data.length;i+=4){const v=im.data[i+ci];o.data[i]=o.data[i+1]=o.data[i+2]=v;o.data[i+3]=255}x.putImageData(o,0,0);channels.push(c)}
 $("modalContent").innerHTML=`<div class="modal-title">DESCOMPONER / RGB</div><div class="channel-grid">${channels.map((c,i)=>`<div class="channel-card"><span>CANAL ${["R","G","B"][i]}</span><div class="chcanvas" data-i="${i}"></div><button data-ch="${i}">DESCARGAR PNG</button></div>`).join("")}</div>`;$("modal").classList.add("open");
 channels.forEach((c,i)=>$("modalContent").querySelector(`[data-i="${i}"]`).appendChild(c));$("modalContent").querySelectorAll("[data-ch]").forEach(b=>b.onclick=()=>channels[+b.dataset.ch].toBlob(blob=>downloadBlob(blob,`${originalName}-${["R","G","B"][+b.dataset.ch]}.png`)))
}
function applyHalf(){
 if(!requireImage())return;commit();setBusy(true,"SEMITONO","Generando trama");
 requestAnimationFrame(()=>{const out=applyHalftone(canvas,half);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(out,0,0);currentMode="HALFTONE";$("modeInfo").textContent=currentMode;setBusy(false);toast("SEMITONO APLICADO")})
}
function updatePrint(){
 const cm=+$("printWidth").value||30,cmh=+$("printHeight").value||30,dpi=+$("dpi").value||300,w=Math.round(cm/2.54*dpi),h=Math.round(cmh/2.54*dpi);$("printResolution").textContent=`${w} × ${h} PX`;
 if(!canvas.width){$("printStatus").textContent="—";$("printStatus").className="";$("printMeter").style.width="0";return}
 const ratio=Math.min(canvas.width/w,canvas.height/h),ok=ratio>=1;$("printStatus").textContent=ok?"RESOLUCIÓN ADECUADA":`FALTAN ${Math.max(1,Math.round((1-ratio)*100))}% DE RESOLUCIÓN`;$("printStatus").className=ok?"ok":"bad";$("printMeter").style.width=Math.min(100,Math.round(ratio*100))+"%"
}
function downloadCurrent(){if(!requireImage())return;canvas.toBlob(b=>downloadBlob(b,`${originalName}-SZAS.png`),"image/png")}
function compare(){
 if(!requireImage())return;compareOn=!compareOn;if(compareOn){compareCanvas.width=canvas.width;compareCanvas.height=canvas.height;compareCtx.clearRect(0,0,compareCanvas.width,compareCanvas.height);compareCtx.drawImage(original,0,0,compareCanvas.width,compareCanvas.height);compareCanvas.style.display="block";compareCanvas.style.maxWidth="86%";compareCanvas.style.maxHeight="88%"}else compareCanvas.style.display="none";toast(compareOn?"ORIGINAL / COMPARACIÓN":"COMPARACIÓN CERRADA")
}
function loadFile(file){
 if(!file)return;
 if(file.size>20*1024*1024){toast("IMAGEN DEMASIADO GRANDE · MÁX. 20 MB");return}
 const type=(file.type||"").toLowerCase();
 if(!["image/png","image/jpeg","image/webp"].includes(type)){toast("SOLO PNG / JPG / WEBP");return}
 const reader=new FileReader();reader.onload=()=>{const img=new Image();img.onload=()=>{original=img;originalName=(file.name||"SZAS").replace(/\.[^.]+$/,"");history.clear();setCanvasFrom(img);$("fileName").textContent=(file.name||"IMAGEN").toUpperCase();currentMode="ORIGINAL";$("modeInfo").textContent=currentMode;toast("IMAGEN CARGADA")};img.onerror=()=>toast("ARCHIVO DE IMAGEN INVÁLIDO");img.src=reader.result};reader.onerror=()=>toast("NO SE PUDO LEER EL ARCHIVO");reader.readAsDataURL(file)
}

const fileInput=$("fileInput");
const dz=$("dropzone");
fileInput.addEventListener("change",e=>{const file=e.target.files?.[0];if(file)loadFile(file);e.target.value=""});
["dragenter","dragover"].forEach(t=>dz.addEventListener(t,e=>{e.preventDefault();e.stopPropagation();dz.classList.add("drag")}));
["dragleave","drop"].forEach(t=>dz.addEventListener(t,e=>{e.preventDefault();e.stopPropagation();dz.classList.remove("drag")}));
dz.addEventListener("drop",e=>{const file=e.dataTransfer?.files?.[0];if(file)loadFile(file)});
["dragenter","dragover","drop"].forEach(t=>document.addEventListener(t,e=>{if(t!=="drop")e.preventDefault()}));

document.querySelectorAll("[data-action]").forEach(b=>b.onclick=()=>{const a=b.dataset.action;if(a==="aiRemove")doAI("remove");else if(a==="aiUpscale")doAI("upscale");else if(a==="enhance")enhance();else if(a==="denoise")denoise();else if(a==="vectorize")vectorizeAction();else if(a==="channels")channels();else if(a==="cutout")cutout();else if(a==="autocrop")autocrop();else if(a==="edgeClean")edgeClean();else if(["grayscale","threshold","invert"].includes(a))actionSimple(a);else if(a==="reset")resetToOriginal()});
["brightness","contrast","saturation","sharpness"].forEach(k=>$(k).addEventListener("input",e=>{settings[k]=+e.target.value;$(`${k}Out`).textContent=e.target.value;if(!processing){commit();renderAdjustments()}}));
$("zoomIn").onclick=()=>{zoom=Math.min(4,zoom*1.25);canvas.style.transform=`scale(${zoom})`;$("zoomLabel").textContent=Math.round(zoom*100)+"%"};
$("zoomOut").onclick=()=>{zoom=Math.max(.25,zoom/1.25);canvas.style.transform=`scale(${zoom})`;$("zoomLabel").textContent=Math.round(zoom*100)+"%"};
$("fit").onclick=fit;$("compare").onclick=compare;
$("undo").onclick=()=>{if(!canvas.width)return;const out=history.undo(currentData());if(out){ctx.putImageData(out,0,0);syncImageInfo();toast("DESHECHO")}};
$("redo").onclick=()=>{if(!canvas.width)return;const out=history.redo(currentData());if(out){ctx.putImageData(out,0,0);syncImageInfo();toast("REHECHO")}};
document.querySelectorAll("[data-jump]").forEach(b=>b.onclick=()=>document.getElementById(b.dataset.jump)?.scrollIntoView({behavior:"smooth",block:"start"}));
$("applyHalftone").onclick=applyHalf;
$("halfInvert").onclick=()=>{half.invert=!half.invert;$("halfInvert").querySelector("b").textContent=half.invert?"SÍ":"NO"};
$("dotSize").oninput=e=>{half.dot=+e.target.value;$("dotOut").textContent=e.target.value};
$("halfContrast").oninput=e=>{half.contrast=+e.target.value;$("halfContrastOut").textContent=e.target.value};
$("density").oninput=e=>{half.density=+e.target.value;$("densityOut").textContent=e.target.value};
$("angle").oninput=e=>{half.angle=+e.target.value;$("angleOut").textContent=e.target.value+"°"};
$("pattern").onchange=e=>half.pattern=e.target.value;
document.querySelectorAll("[data-preset]").forEach(b=>b.onclick=()=>{const p=b.dataset.preset;const v={dark:[5,75,100,45,"circle"],photo:[4,45,95,45,"circle"],high:[3,88,100,45,"square"],mono:[6,95,90,0,"circle"]}[p];[half.dot,half.contrast,half.density,half.angle,half.pattern]=v;[$("dotSize").value,$("halfContrast").value,$("density").value,$("angle").value]=v.slice(0,4);$("pattern").value=v[4];$("dotOut").textContent=v[0];$("halfContrastOut").textContent=v[1];$("densityOut").textContent=v[2];$("angleOut").textContent=v[3]+"°";toast("PRESET "+p.toUpperCase())});
$("printWidth").oninput=updatePrint;$("printHeight").oninput=updatePrint;$("dpi").onchange=updatePrint;
$("dtfPreset").onchange=e=>{const p=e.target.value;if(p==="photo"){$("dpi").value=300;half={...half,dot:4,contrast:45,density:95}}if(p==="dark")half={...half,dot:5,contrast:80,density:100};if(p==="line")half={...half,dot:3,contrast:95,density:100};if(p==="standard")half={...half,dot:6,contrast:55,density:100};toast("PRESET DE IMPRESIÓN APLICADO")};
$("downloadPng").onclick=downloadCurrent;$("downloadSvg").onclick=()=>{if(!lastSvg){toast("GENERA UN SVG PRIMERO");return}downloadBlob(new Blob([lastSvg],{type:"image/svg+xml"}),`${originalName}-SZAS.svg`)};
$("modalClose").onclick=()=>$("modal").classList.remove("open");$("modal").addEventListener("click",e=>{if(e.target===$("modal"))$("modal").classList.remove("open")});
syncSliders();updatePrint();
