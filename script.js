const WHATSAPP="573224982212";

const products=[
  {id:1,name:"CAMISA 3RD DROP",category:"Camisas",price:65000,image:"imagenes/camisa-1.jpg",sizes:["S","M","L","XL","XXL"],drop:"03"},
  {id:2,name:"SACO 3RD DROP",category:"Sacos",price:75000,image:"imagenes/hoodie-1.jpg",sizes:["S","M","L","XL","XXL"],drop:"03"},
  {id:3,name:"CONJUNTO SZAS",category:"Conjuntos",price:145000,image:"imagenes/conjunto-1.jpg",sizes:["S","M","L","XL","XXL"],drop:"03"},
  {id:4,name:"CHAQUETA SZAS",category:"Sacos",price:80000,image:"imagenes/chaqueta-1.jpg",sizes:["S","M","L","XL","XXL"],drop:"03"}
];

let cart=JSON.parse(localStorage.getItem("szasCart")||"[]");
let modalProduct=null;
let modalSize=null;
let modalQty=1;

const money=n=>new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0}).format(n);
const byId=id=>products.find(p=>p.id===Number(id));

function productCard(p){
  return `<article class="product reveal">
    <div class="product-img" onclick="openProductModal(${p.id})" role="button" tabindex="0" aria-label="Ver ${p.name}">
      <img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.style.display='none';this.parentElement.innerHTML='<div class=placeholder>FOTO NO ENCONTRADA<br><br>${p.image}</div>'">
    </div>
    <div class="product-info">
      <h3>${p.name}</h3>
      <div class="product-cat">${p.category} · 3RD DROP</div>
      <div class="price">${money(p.price)}</div>
      <button class="size-preview" type="button" onclick="openProductModal(${p.id})">SELECCIONAR TALLA +</button>
      <div class="product-actions">
        <button class="add" type="button" onclick="openProductModal(${p.id})">AÑADIR</button>
        <button type="button" onclick="openProductModal(${p.id})">COMPRAR</button>
      </div>
    </div>
  </article>`;
}

function render(list=products){
  document.getElementById("products").innerHTML=list.map(productCard).join("");
  observeReveals();
}

function renderFeatured(){
  document.getElementById("featured").innerHTML=products.map(productCard).join("");
  observeReveals();
}

function openProductModal(id){
  modalProduct=byId(id); modalSize=null; modalQty=1;
  if(!modalProduct)return;
  document.getElementById("modalImage").src=modalProduct.image;
  document.getElementById("modalImage").alt=modalProduct.name;
  document.getElementById("modalTitle").textContent=modalProduct.name;
  document.getElementById("modalCategory").textContent=`${modalProduct.category} / 03`;
  document.getElementById("modalPrice").textContent=money(modalProduct.price);
  document.getElementById("modalQty").textContent=modalQty;
  document.getElementById("modalSizes").innerHTML=modalProduct.sizes.map(s=>`<button class="size-option" type="button" data-size="${s}" onclick="selectModalSize('${s}')">${s}</button>`).join("");
  const m=document.getElementById("productModal");m.classList.add("open");m.setAttribute("aria-hidden","false");document.body.style.overflow="hidden";
}

function closeProductModal(){
  const m=document.getElementById("productModal");m.classList.remove("open");m.setAttribute("aria-hidden","true");
  if(!document.querySelector(".modal.open"))document.body.style.overflow="";
}

function selectModalSize(size){
  modalSize=size;
  document.querySelectorAll(".size-option").forEach(b=>b.classList.toggle("selected",b.dataset.size===size));
}

function changeModalQty(delta){modalQty=Math.max(1,Math.min(10,modalQty+delta));document.getElementById("modalQty").textContent=modalQty;}

function addModalToCart(){
  if(!modalProduct)return;
  if(!modalSize){showToast("SELECCIONA UNA TALLA");return;}
  const key=`${modalProduct.id}-${modalSize}`;
  const item=cart.find(x=>x.key===key);
  if(item)item.qty+=modalQty;
  else cart.push({key,id:modalProduct.id,qty:modalQty,size:modalSize});
  saveCart();closeProductModal();openCart();showToast("AÑADIDO AL CARRITO");
}

function saveCart(){localStorage.setItem("szasCart",JSON.stringify(cart));updateCart();}

function updateCart(){
  document.getElementById("cartCount").textContent=cart.reduce((a,b)=>a+b.qty,0);
  const box=document.getElementById("cartItems");
  if(!cart.length){box.innerHTML='<div class="cart-empty">TU CARRITO ESTÁ VACÍO.<br><br>Explora el 3RD DROP y selecciona tu talla.</div>';document.getElementById("cartTotal").textContent=money(0);return;}
  let total=0;
  box.innerHTML=cart.map((item,index)=>{
    const p=byId(item.id);if(!p)return "";
    total+=p.price*item.qty;
    return `<div class="cart-row">
      <img src="${p.image}" alt="${p.name}" loading="lazy">
      <div><h4>${p.name}</h4><p>Talla ${item.size} · ${money(p.price)}</p>
        <div class="qty-controls"><button type="button" onclick="changeCartQty(${index},-1)">−</button><span>${item.qty}</span><button type="button" onclick="changeCartQty(${index},1)">+</button></div>
      </div>
      <button class="remove" type="button" onclick="removeItem(${index})">ELIMINAR</button>
    </div>`;
  }).join("");
  document.getElementById("cartTotal").textContent=money(total);
}

function changeCartQty(index,delta){
  if(!cart[index])return;
  cart[index].qty+=delta;
  if(cart[index].qty<=0)cart.splice(index,1);
  saveCart();
}

function removeItem(index){cart.splice(index,1);saveCart();showToast("PRODUCTO ELIMINADO");}

function openCart(){document.getElementById("cart").classList.add("open");document.getElementById("cart").setAttribute("aria-hidden","false");document.getElementById("overlay").classList.add("open");updateCart();}
function closeCart(){document.getElementById("cart").classList.remove("open");document.getElementById("cart").setAttribute("aria-hidden","true");document.getElementById("overlay").classList.remove("open");}

function checkout(){
  if(!cart.length){showToast("TU CARRITO ESTÁ VACÍO");return;}
  document.getElementById("checkoutModal").classList.add("open");
  document.getElementById("checkoutModal").setAttribute("aria-hidden","false");
  document.body.style.overflow="hidden";
}

function closeCheckout(){
  const m=document.getElementById("checkoutModal");m.classList.remove("open");m.setAttribute("aria-hidden","true");
  if(!document.querySelector(".modal.open"))document.body.style.overflow="";
}

function buildWhatsAppMessage(data){
  const lines=cart.map(item=>{const p=byId(item.id);return `• ${p.name} — Talla ${item.size} × ${item.qty} = ${money(p.price*item.qty)}`;}).join("\n");
  const total=cart.reduce((sum,item)=>sum+byId(item.id).price*item.qty,0);
  return `Hola SZAS, quiero realizar este pedido:\n\n${lines}\n\nTOTAL: ${money(total)}\n\nDATOS DEL CLIENTE\nNombre: ${data.name}\nWhatsApp: ${data.phone}\nCiudad: ${data.city}\nDirección: ${data.address}${data.note?`\nNota: ${data.note}`:""}`;
}

document.getElementById("checkoutForm").addEventListener("submit",e=>{
  e.preventDefault();
  const data={
    name:document.getElementById("customerName").value.trim(),
    phone:document.getElementById("customerPhone").value.trim(),
    city:document.getElementById("customerCity").value.trim(),
    address:document.getElementById("customerAddress").value.trim(),
    note:document.getElementById("customerNote").value.trim()
  };
  const text=buildWhatsAppMessage(data);
  window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`,"_blank");
});

document.querySelectorAll(".filter").forEach(btn=>btn.addEventListener("click",()=>{
  document.querySelectorAll(".filter").forEach(x=>x.classList.remove("active"));btn.classList.add("active");
  const cat=btn.dataset.cat;render(cat==="Todos"?products:products.filter(p=>p.category===cat));
}));

document.querySelectorAll(".size-tab").forEach(btn=>btn.addEventListener("click",()=>{
  document.querySelectorAll(".size-tab").forEach(x=>x.classList.remove("active"));btn.classList.add("active");
  document.querySelectorAll(".guide-panel").forEach(x=>x.classList.remove("active"));
  document.getElementById(btn.dataset.sizeGuide==="camisa"?"guideCamisa":"guideSaco").classList.add("active");
}));

document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeProductModal();closeCheckout();closeCart();}});

document.querySelectorAll(".product-img").forEach(el=>el.addEventListener("keydown",e=>{if(e.key==="Enter")el.click();}));

function showToast(message){const t=document.getElementById("toast");t.textContent=message;t.classList.add("show");clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>t.classList.remove("show"),2200);}

function observeReveals(){
  const items=document.querySelectorAll(".reveal:not(.visible)");
  if(!("IntersectionObserver" in window)){items.forEach(x=>x.classList.add("visible"));return;}
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add("visible");observer.unobserve(entry.target);}}),{threshold:.08});
  items.forEach(x=>observer.observe(x));
}

render();renderFeatured();updateCart();observeReveals();
