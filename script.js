const WHATSAPP="573224982212";

const products=[
 {id:1,name:"CAMISA SZAS",category:"Camisas",price:65000,image:"imagenes/camisa-1.jpg",sizes:["S","M","L","XL"]},
 {id:2,name:"HOODIE SZAS",category:"Sacos",price:75000,image:"imagenes/hoodie-1.jpg",sizes:["S","M","L","XL"]},
 {id:3,name:"CONJUNTO SZAS",category:"Conjuntos",price:145000,image:"imagenes/conjunto-1.jpg",sizes:["S","M","L","XL"]},
 {id:4,name:"CHAQUETA SZAS",category:"Sacos",price:80000,image:"imagenes/chaqueta-1.jpg",sizes:["S","M","L","XL"]}
];

let cart=JSON.parse(localStorage.getItem("szasCart")||"[]");

const money=n=>new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0}).format(n);

function productCard(p){
 return `<article class="product">
  <div class="product-img">
   <img src="${p.image}" alt="${p.name}" onerror="this.style.display='none';this.parentElement.innerHTML='<div class=placeholder>COLOCA TU FOTO<br><br>${p.image}</div>'">
  </div>
  <div class="product-info">
   <h3>${p.name}</h3><div class="product-cat">${p.category}</div><div class="price">${money(p.price)}</div>
   <div class="product-actions">
    <button onclick="addToCart(${p.id})" class="add">AÑADIR</button>
    <button onclick="buyNow(${p.id})">COMPRAR</button>
   </div>
  </div>
 </article>`;
}
function render(list=products){document.getElementById("products").innerHTML=list.map(productCard).join("");}
function renderFeatured(){document.getElementById("featured").innerHTML=products.slice(0,4).map(productCard).join("");}
function addToCart(id){
 const p=products.find(x=>x.id===id); if(!p)return;
 const item=cart.find(x=>x.id===id);
 if(item)item.qty++; else cart.push({id,qty:1,size:p.sizes[0]});
 saveCart();openCart();
}
function removeItem(id){cart=cart.filter(x=>x.id!==id);saveCart();}
function saveCart(){localStorage.setItem("szasCart",JSON.stringify(cart));updateCart();}
function updateCart(){
 document.getElementById("cartCount").textContent=cart.reduce((a,b)=>a+b.qty,0);
 const box=document.getElementById("cartItems");
 if(!cart.length){box.innerHTML='<div style="padding:30px;color:#777;font-size:12px">Tu carrito está vacío.</div>';document.getElementById("cartTotal").textContent="$0";return;}
 let total=0;
 box.innerHTML=cart.map(item=>{
  const p=products.find(x=>x.id===item.id);total+=p.price*item.qty;
  return `<div class="cart-row"><img src="${p.image}" onerror="this.style.visibility='hidden'"><div><h4>${p.name}</h4><p>${money(p.price)} × ${item.qty}</p><button class="remove" onclick="removeItem(${p.id})">Eliminar</button></div></div>`;
 }).join("");
 document.getElementById("cartTotal").textContent=money(total);
}
function openCart(){document.getElementById("cart").classList.add("open");document.getElementById("overlay").classList.add("open");updateCart();}
function closeCart(){document.getElementById("cart").classList.remove("open");document.getElementById("overlay").classList.remove("open");}
function buyNow(id){
 const p=products.find(x=>x.id===id);
 const text=`Hola SZAS, quiero comprar: ${p.name} - ${money(p.price)}.`;
 window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`,"_blank");
}
function checkout(){
 if(!cart.length)return;
 const lines=cart.map(item=>{const p=products.find(x=>x.id===item.id);return `• ${p.name} x${item.qty} — ${money(p.price*item.qty)}`;}).join("\n");
 const total=cart.reduce((sum,item)=>{const p=products.find(x=>x.id===item.id);return sum+p.price*item.qty},0);
 const text=`Hola SZAS, quiero realizar este pedido:\n\n${lines}\n\nTotal: ${money(total)}\n\nNombre:\nCiudad:\nTalla:`;
 window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`,"_blank");
}
document.querySelectorAll(".filter").forEach(btn=>btn.addEventListener("click",()=>{
 document.querySelectorAll(".filter").forEach(x=>x.classList.remove("active"));btn.classList.add("active");
 const cat=btn.dataset.cat;render(cat==="Todos"?products:products.filter(p=>p.category===cat));
}));
render();renderFeatured();updateCart();
