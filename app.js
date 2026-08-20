const $=id=>document.getElementById(id);
const canvas=$("canvas"),ctx=canvas.getContext("2d",{willReadFrequently:true});
let original=null, state={brightness:0,contrast:0,saturation:0,sharpness:0,scale:1,zoom:1,halftone:false,halfInvert:false};
let half={dot:6,contrast:50,angle:45};

function toast(msg){let t=document.querySelector(".toast");if(!t){t=document.createElement("div");t.className="toast";document.body.appendChild(t)}t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1800)}
function setBusy(v){$("processing").style.display=v?"flex":"none"}

function loadFile(file){
 if(!file||!file.type.startsWith("image/")) return toast("FORMATO NO COMPATIBLE");
 const reader=new FileReader();
 reader.onload=()=>{const img=new Image();img.onload=()=>{original=img;state={...state,brightness:0,contrast:0,saturation:0,sharpness:0,halftone:false};canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;$("fileName").textContent=file.name.toUpperCase();$("imageInfo").textContent=`${img.naturalWidth} × ${img.naturalHeight} PX`;$("emptyState").style.display="none";canvas.style.display="block";syncControls();render();toast("IMAGEN CARGADA")};img.src=reader.result};
 reader.readAsDataURL(file);
}
function drawBase(){
 ctx.clearRect(0,0,canvas.width,canvas.height);
 ctx.drawImage(original,0,0);
 let img=ctx.getImageData(0,0,canvas.width,canvas.height),d=img.data;
 const b=state.brightness*2.55,c=state.contrast;
 const factor=(259*(c+255))/(255*(259-c));
 for(let i=0;i<d.length;i+=4){
   let r=d[i],g=d[i+1],bl=d[i+2];
   r=(r-128)*factor+128+b;g=(g-128)*factor+128+b;bl=(bl-128)*factor+128+b;
   if(state.saturation!==0){
     const gray=.299*r+.587*g+.114*bl, s=1+state.saturation/100;
     r=gray+(r-gray)*s;g=gray+(g-gray)*s;bl=gray+(bl-gray)*s;
   }
   d[i]=Math.max(0,Math.min(255,r));d[i+1]=Math.max(0,Math.min(255,g));d[i+2]=Math.max(0,Math.min(255,bl));
 }
 ctx.putImageData(img,0,0);
 if(state.sharpness>0) sharpen(state.sharpness/100);
 if(state.halftone) applyHalftone(false);
}
function sharpen(amount){
 const src=ctx.getImageData(0,0,canvas.width,canvas.height),out=ctx.createImageData(src.width,src.height),a=src.data,b=out.data,w=src.width,h=src.height;
 const k=amount, idx=(x,y)=>(y*w+x)*4;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p=idx(x,y);for(let c=0;c<3;c++){let v=a[p+c]*(1+4*k);if(x>0)v-=a[idx(x-1,y)+c]*k;if(x<w-1)v-=a[idx(x+1,y)+c]*k;if(y>0)v-=a[idx(x,y-1)+c]*k;if(y<h-1)v-=a[idx(x,y+1)+c]*k;b[p+c]=Math.max(0,Math.min(255,v))}b[p+3]=a[p+3]}
 ctx.putImageData(out,0,0);
}
function render(){if(!original)return;setBusy(true);requestAnimationFrame(()=>{drawBase();setBusy(false)})}
function syncControls(){
 ["brightness","contrast","saturation","sharpness"].forEach(k=>{$(k).value=state[k];$(k+"Out").textContent=state[k]});
 $("scale").value=state.scale*100;$("scaleOut").textContent=Math.round(state.scale*100)+"%";
}
["brightness","contrast","saturation","sharpness"].forEach(k=>$(k).addEventListener("input",e=>{state[k]=+e.target.value;$(k+"Out").textContent=e.target.value;render()}));
$("scale").addEventListener("input",e=>{state.scale=+e.target.value/100;$("scaleOut").textContent=e.target.value+"%";canvas.style.transform=`scale(${state.scale*state.zoom})`});
$("zoomIn").onclick=()=>zoom(1.25);$("zoomOut").onclick=()=>zoom(.8);$("fitBtn").onclick=()=>{state.zoom=1;canvas.style.transform=`scale(${state.scale})`;$("zoomOutLabel").textContent="100%"};
function zoom(n){state.zoom=Math.max(.25,Math.min(5,state.zoom*n));canvas.style.transform=`scale(${state.scale*state.zoom})`;$("zoomOutLabel").textContent=Math.round(state.zoom*100)+"%"}

$("fileInput").onchange=e=>loadFile(e.target.files[0]);
const dz=$("dropzone");["dragenter","dragover"].forEach(x=>dz.addEventListener(x,e=>{e.preventDefault();dz.classList.add("drag")}));["dragleave","drop"].forEach(x=>dz.addEventListener(x,e=>{e.preventDefault();dz.classList.remove("drag")}));dz.addEventListener("drop",e=>loadFile(e.dataTransfer.files[0]));

document.querySelectorAll("[data-action]").forEach(btn=>btn.onclick=()=>{if(!original)return toast("SUBE UNA IMAGEN PRIMERO");const a=btn.dataset.action;if(a==="reset"){state={...state,brightness:0,contrast:0,saturation:0,sharpness:0,halftone:false};syncControls();render();return}drawBase();let im=ctx.getImageData(0,0,canvas.width,canvas.height),d=im.data;
for(let i=0;i<d.length;i+=4){if(a==="grayscale"){let g=.299*d[i]+.587*d[i+1]+.114*d[i+2];d[i]=d[i+1]=d[i+2]=g}else if(a==="threshold"){let g=(.299*d[i]+.587*d[i+1]+.114*d[i+2])>128?255:0;d[i]=d[i+1]=d[i+2]=g}else if(a==="invert"){d[i]=255-d[i];d[i+1]=255-d[i+1];d[i+2]=255-d[i+2]}}ctx.putImageData(im,0,0)});

$("halftoneBtn").onclick=()=>{$("halftonePanel").scrollIntoView({behavior:"smooth",block:"center"});toast("AJUSTA TU SEMITONO")};
$("dotSize").oninput=e=>{half.dot=+e.target.value;$("dotOut").textContent=e.target.value};
$("halfContrast").oninput=e=>{half.contrast=+e.target.value;$("halfContrastOut").textContent=e.target.value};
$("angle").oninput=e=>{half.angle=+e.target.value;$("angleOut").textContent=e.target.value+"°"};
$("halfInvert").onclick=()=>{state.halfInvert=!state.halfInvert;$("halfInvert").textContent=state.halfInvert?"SÍ":"NO";$("halfInvertOut").textContent=state.halfInvert?"SÍ":"NO"};

function applyHalftone(redraw=true){
 if(!original)return toast("SUBE UNA IMAGEN PRIMERO");
 if(redraw)drawBase();
 const src=ctx.getImageData(0,0,canvas.width,canvas.height),s=src.data,w=canvas.width,h=canvas.height;
 const out=document.createElement("canvas");out.width=w;out.height=h;const octx=out.getContext("2d");octx.fillStyle="rgba(0,0,0,0)";octx.clearRect(0,0,w,h);
 const dot=Math.max(2,half.dot), rad=dot/2, angle=half.angle*Math.PI/180;
 const cos=Math.cos(angle),sin=Math.sin(angle);
 for(let y=0;y<h;y+=dot)for(let x=0;x<w;x+=dot){
   let xx=Math.min(w-1,x+Math.floor(dot/2)),yy=Math.min(h-1,y+Math.floor(dot/2)),p=(yy*w+xx)*4;
   let lum=.299*s[p]+.587*s[p+1]+.114*s[p+2]; if(state.halfInvert)lum=255-lum;
   lum=128+(lum-128)*(1+half.contrast/100);
   let size=Math.max(0,rad*(1-lum/255)*2);
   if(size>.25){octx.beginPath();octx.arc(x+rad,y+rad,size,0,Math.PI*2);octx.fillStyle=`rgba(0,0,0,${s[p+3]/255})`;octx.fill()}
 }
 ctx.clearRect(0,0,w,h);ctx.drawImage(out,0,0);state.halftone=true;
}
$("applyHalftone").onclick=()=>{setBusy(true);setTimeout(()=>{applyHalftone(true);setBusy(false);toast("SEMITONO APLICADO")},20)};

$("downloadBtn").onclick=()=>{
 if(!original)return toast("SUBE UNA IMAGEN PRIMERO");
 const a=document.createElement("a");a.download="SZAS-STUDIO-"+Date.now()+".png";a.href=canvas.toDataURL("image/png");a.click();toast("PNG EXPORTADO");
};
