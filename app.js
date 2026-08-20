const $=id=>document.getElementById(id);
const canvas=$("canvas"),ctx=canvas.getContext("2d",{willReadFrequently:true});
let original=null, originalData=null, state={brightness:0,contrast:0,saturation:0,sharpness:0,zoom:1,halftone:false,halfInvert:false};
let half={dot:6,contrast:50,density:100,angle:45,pattern:"circle"}, lastSvg="";

function toast(msg){let t=document.querySelector(".toast");if(!t){t=document.createElement("div");t.className="toast";document.body.appendChild(t)}t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1800)}
function setBusy(v){$("processing").style.display=v?"flex":"none"}
function sync(){["brightness","contrast","saturation","sharpness"].forEach(k=>{$(k).value=state[k];$(k+"Out").textContent=state[k]});updatePrint()}
function loadFile(file){
 if(!file||!file.type.startsWith("image/"))return toast("FORMATO NO COMPATIBLE");
 const r=new FileReader();r.onload=()=>{const img=new Image();img.onload=()=>{original=img;originalData=null;canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;$("fileName").textContent=file.name.toUpperCase();$("imageInfo").textContent=`${img.naturalWidth} × ${img.naturalHeight} PX`;$("emptyState").style.display="none";canvas.style.display="block";state={...state,brightness:0,contrast:0,saturation:0,sharpness:0,halftone:false};sync();render();toast("IMAGEN CARGADA")};img.src=r.result};r.readAsDataURL(file);
}
function baseImage(){ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(original,0,0);return ctx.getImageData(0,0,canvas.width,canvas.height)}
function render(){if(!original)return;setBusy(true);requestAnimationFrame(()=>{let im=baseImage(),d=im.data;const b=state.brightness*2.55,c=state.contrast,f=(259*(c+255))/(255*(259-c));for(let i=0;i<d.length;i+=4){let r=(d[i]-128)*f+128+b,g=(d[i+1]-128)*f+128+b,bl=(d[i+2]-128)*f+128+b;if(state.saturation){let gr=.299*r+.587*g+.114*bl,s=1+state.saturation/100;r=gr+(r-gr)*s;g=gr+(g-gr)*s;bl=gr+(bl-gr)*s}d[i]=Math.max(0,Math.min(255,r));d[i+1]=Math.max(0,Math.min(255,g));d[i+2]=Math.max(0,Math.min(255,bl))}ctx.putImageData(im,0,0);if(state.sharpness)sharpen(state.sharpness/100);setBusy(false);updatePrint()})}
function sharpen(k){const src=ctx.getImageData(0,0,canvas.width,canvas.height),out=ctx.createImageData(src.width,src.height),a=src.data,b=out.data,w=src.width,h=src.height,idx=(x,y)=>(y*w+x)*4;for(let y=0;y<h;y++)for(let x=0;x<w;x++){let p=idx(x,y);for(let c=0;c<3;c++){let v=a[p+c]*(1+4*k);if(x)v-=a[idx(x-1,y)+c]*k;if(x<w-1)v-=a[idx(x+1,y)+c]*k;if(y)v-=a[idx(x,y-1)+c]*k;if(y<h-1)v-=a[idx(x,y+1)+c]*k;b[p+c]=Math.max(0,Math.min(255,v))}b[p+3]=a[p+3]}ctx.putImageData(out,0,0)}
function current(){return ctx.getImageData(0,0,canvas.width,canvas.height)}

["brightness","contrast","saturation","sharpness"].forEach(k=>$(k).addEventListener("input",e=>{state[k]=+e.target.value;$(`${k}Out`).textContent=e.target.value;render()}));
function action(a){
 if(!original)return toast("SUBE UNA IMAGEN PRIMERO");
 if(a==="reset"){state={...state,brightness:0,contrast:0,saturation:0,sharpness:0,halftone:false};sync();render();return}
 setBusy(true);setTimeout(()=>{
  let im=current(),d=im.data,w=im.width,h=im.height;
  if(a==="grayscale"||a==="threshold"||a==="invert"){for(let i=0;i<d.length;i+=4){if(a==="grayscale"){let g=.299*d[i]+.587*d[i+1]+.114*d[i+2];d[i]=d[i+1]=d[i+2]=g}else if(a==="threshold"){let g=(.299*d[i]+.587*d[i+1]+.114*d[i+2])>128?255:0;d[i]=d[i+1]=d[i+2]=g}else{d[i]=255-d[i];d[i+1]=255-d[i+1];d[i+2]=255-d[i+2]}}ctx.putImageData(im,0,0)}
  else if(a==="background")removeBackground();
  else if(a==="cutout")cutout();
  else if(a==="autocrop")autoCrop();
  else if(a==="upscale")upscale();
  else if(a==="layers")rgbLayers();
  else if(a==="vectorize")vectorize();
  setBusy(false)
 },20)
}
document.querySelectorAll("[data-action]").forEach(b=>b.onclick=()=>action(b.dataset.action));

function upscale(){const nw=Math.min(canvas.width*4,12000),nh=Math.round(canvas.height*nw/canvas.width),tmp=document.createElement("canvas");tmp.width=nw;tmp.height=nh;const c=tmp.getContext("2d");c.imageSmoothingEnabled=true;c.imageSmoothingQuality="high";c.drawImage(canvas,0,0,nw,nh);canvas.width=nw;canvas.height=nh;ctx.drawImage(tmp,0,0);$("imageInfo").textContent=`${nw} × ${nh} PX`;toast("AMPLIADO 4×")}
function removeBackground(){let im=current(),d=im.data,w=im.width,h=im.height;const corners=[[0,0],[w-1,0],[0,h-1],[w-1,h-1]];let avg=[0,0,0];for(const [x,y] of corners){let p=(y*w+x)*4;avg[0]+=d[p];avg[1]+=d[p+1];avg[2]+=d[p+2]}avg=avg.map(v=>v/4);const tol=48;for(let i=0;i<d.length;i+=4){let dist=Math.hypot(d[i]-avg[0],d[i+1]-avg[1],d[i+2]-avg[2]);if(dist<tol)d[i+3]=0;else if(dist<tol+35)d[i+3]=Math.round((dist-tol)/35*255)}ctx.putImageData(im,0,0);toast("FONDO REMOVIDO · AUTO")}
function cutout(){let im=current(),d=im.data;for(let i=0;i<d.length;i+=4){let g=.299*d[i]+.587*d[i+1]+.114*d[i+2];d[i+3]=g>128?255:0}ctx.putImageData(im,0,0);toast("CALADO APLICADO")}
function autoCrop(){let im=current(),d=im.data,w=im.width,h=im.height,minX=w,minY=h,maxX=-1,maxY=-1;for(let y=0;y<h;y++)for(let x=0;x<w;x++){let p=(y*w+x)*4;if(d[p+3]>12){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y)}}if(maxX<0)return toast("NO HAY CONTENIDO");const tmp=document.createElement("canvas");tmp.width=maxX-minX+1;tmp.height=maxY-minY+1;tmp.getContext("2d").putImageData(ctx.getImageData(minX,minY,tmp.width,tmp.height),0,0);canvas.width=tmp.width;canvas.height=tmp.height;ctx.drawImage(tmp,0,0);$("imageInfo").textContent=`${canvas.width} × ${canvas.height} PX`;toast("RECORTADO AL CONTENIDO")}
function rgbLayers(){const im=current(),d=im.data,w=im.width,h=im.height;const names=["R","G","B"];lastSvg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`;for(let i=0;i<3;i++){const c=document.createElement("canvas");c.width=w;c.height=h;const x=c.getContext("2d"),o=x.createImageData(w,h);for(let p=0;p<d.length;p+=4){o.data[p+i]=d[p+i];o.data[p+3]=d[p+3]}x.putImageData(o,0,0);lastSvg+=`<g id="layer-${names[i]}"><image href="${c.toDataURL("image/png")}" width="${w}" height="${h}"/></g>`}lastSvg+="</svg>";toast("CAPAS RGB PREPARADAS · SVG")}
function vectorize(){const src=current(),w=src.width,h=src.height,maxW=260,scale=Math.min(1,maxW/w),sw=Math.max(1,Math.round(w*scale)),sh=Math.max(1,Math.round(h*scale)),tmp=document.createElement("canvas");tmp.width=sw;tmp.height=sh;const t=tmp.getContext("2d");t.drawImage(canvas,0,0,sw,sh);const d=t.getImageData(0,0,sw,sh).data;let paths="";for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){let p=(y*sw+x)*4,g=.299*d[p]+.587*d[p+1]+.114*d[p+2],a=d[p+3];if(g<145&&a>20){paths+=`<rect x="${x}" y="${y}" width="1.1" height="1.1"/>`}}lastSvg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sw} ${sh}" shape-rendering="crispEdges"><g fill="#000">${paths}</g></svg>`;toast("VECTOR PREPARADO · SVG")}
function downloadBlob(blob,name){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
$("downloadBtn").onclick=()=>{if(!original)return toast("SUBE UNA IMAGEN PRIMERO");canvas.toBlob(b=>downloadBlob(b,"SZAS-STUDIO.png"),"image/png")};
$("downloadSvgBtn").onclick=()=>{if(!lastSvg)return toast("GENERA UN SVG PRIMERO");downloadBlob(new Blob([lastSvg],{type:"image/svg+xml"}),"SZAS-STUDIO.svg")};

const dz=$("dropzone");$("fileInput").onchange=e=>loadFile(e.target.files[0]);["dragenter","dragover"].forEach(x=>dz.addEventListener(x,e=>{e.preventDefault();dz.classList.add("drag")}));["dragleave","drop"].forEach(x=>dz.addEventListener(x,e=>{e.preventDefault();dz.classList.remove("drag")}));dz.addEventListener("drop",e=>loadFile(e.dataTransfer.files[0]));

function zoom(n){state.zoom=Math.max(.25,Math.min(5,state.zoom*n));canvas.style.transform=`scale(${state.zoom})`;$("zoomOutLabel").textContent=Math.round(state.zoom*100)+"%"}
$("zoomIn").onclick=()=>zoom(1.25);$("zoomOut").onclick=()=>zoom(.8);$("fitBtn").onclick=()=>{state.zoom=1;canvas.style.transform="scale(1)";$("zoomOutLabel").textContent="100%"};
$("compareBtn").onclick=()=>{if(!original)return toast("SUBE UNA IMAGEN PRIMERO");let c=$("compareCanvas");c.width=canvas.width;c.height=canvas.height;c.getContext("2d").drawImage(original,0,0,canvas.width,canvas.height);c.style.display=c.style.display==="block"?"none":"block";c.style.maxWidth="88%";c.style.maxHeight="88%";toast(c.style.display==="block"?"ORIGINAL SUPERPUESTO":"COMPARACIÓN OCULTA")};

$("halftoneBtn").onclick=()=>$("halftonePanel").scrollIntoView({behavior:"smooth",block:"center"});
$("dotSize").oninput=e=>{half.dot=+e.target.value;$("dotOut").textContent=e.target.value};
$("halfContrast").oninput=e=>{half.contrast=+e.target.value;$("halfContrastOut").textContent=e.target.value};
$("density").oninput=e=>{half.density=+e.target.value;$("densityOut").textContent=e.target.value};
$("angle").oninput=e=>{half.angle=+e.target.value;$("angleOut").textContent=e.target.value+"°"};
$("pattern").onchange=e=>half.pattern=e.target.value;
$("halfInvert").onclick=()=>{state.halfInvert=!state.halfInvert;$("halfInvert").textContent=state.halfInvert?"SÍ":"NO";$("halfInvertOut").textContent=state.halfInvert?"SÍ":"NO"};
document.querySelectorAll("[data-preset]").forEach(b=>b.onclick=()=>{const p=b.dataset.preset;const vals=p==="dark"?[5,70,100,45]:p==="photo"?[4,45,90,45]:[3,85,100,45];[$("dotSize").value,$("halfContrast").value,$("density").value,$("angle").value]=vals;half={...half,dot:+vals[0],contrast:+vals[1],density:+vals[2],angle:+vals[3]};$("dotOut").textContent=vals[0];$("halfContrastOut").textContent=vals[1];$("densityOut").textContent=vals[2];$("angleOut").textContent=vals[3]+"°";toast("PRESET "+p.toUpperCase())});
$("applyHalftone").onclick=()=>{if(!original)return toast("SUBE UNA IMAGEN PRIMERO");setBusy(true);setTimeout(()=>{let src=current(),s=src.data,w=src.width,h=src.height,dot=half.dot,rad=dot/2,out=document.createElement("canvas");out.width=w;out.height=h;let o=out.getContext("2d");o.clearRect(0,0,w,h);for(let y=0;y<h;y+=dot)for(let x=0;x<w;x+=dot){let xx=Math.min(w-1,x+Math.floor(dot/2)),yy=Math.min(h-1,y+Math.floor(dot/2)),p=(yy*w+xx)*4,lum=.299*s[p]+.587*s[p+1]+.114*s[p+2];if(state.halfInvert)lum=255-lum;lum=128+(lum-128)*(1+half.contrast/100);let size=Math.max(0,rad*(1-lum/255)*2)*(half.density/100);if(size>.25){o.beginPath();if(half.pattern==="circle")o.arc(x+rad,y+rad,size,0,Math.PI*2);else if(half.pattern==="square")o.rect(x+rad-size,y+rad-size,size*2,size*2);else{o.moveTo(x+rad,y+rad-size);o.lineTo(x+rad+size,y+rad);o.lineTo(x+rad,y+rad+size);o.lineTo(x+rad-size,y+rad);o.closePath()}o.fillStyle=`rgba(0,0,0,${s[p+3]/255})`;o.fill()}}ctx.clearRect(0,0,w,h);ctx.drawImage(out,0,0);state.halftone=true;setBusy(false);toast("SEMITONO APLICADO")},20)};

function updatePrint(){const cm=+($("printWidth").value||30),cmh=+($("printHeight").value||30),dpi=+$("dpi").value||300,w=Math.round(cm/2.54*dpi),h=Math.round(cmh/2.54*dpi);$("printResolution").textContent=`${w} × ${h} PX`;const ok=original&&canvas.width>=w&&canvas.height>=h;$("printStatus").textContent=original?(ok?"RESOLUCIÓN ADECUADA":"RESOLUCIÓN INSUFICIENTE"):"—";$("printStatus").className=original?(ok?"ok":"bad"):""}
["printWidth","printHeight","dpi"].forEach(id=>$(id).addEventListener("input",updatePrint));updatePrint();
