let products=[];
const $=s=>document.querySelector(s),money=n=>"EGP "+Number(n).toLocaleString("en-EG");
let cart=JSON.parse(localStorage.getItem("brue_cart")||"{}");
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function save(){localStorage.setItem("brue_cart",JSON.stringify(cart));renderCart();}
function total(){return products.reduce((s,p)=>s+p.price*(cart[p.id]||0),0);}
function renderProducts(){
 const grid=$("#productGrid");if(!products.length){grid.innerHTML='<p class="muted">No products are available right now.</p>';return;}
 grid.innerHTML=products.map(p=>'<article class="product-card"><div class="product-image">'+(p.image?'<img src="'+esc(p.image)+'" alt="'+esc(p.name)+'" loading="lazy">':'')+(p.tag?'<span class="product-tag">'+esc(p.tag)+'</span>':'')+'</div><div class="product-info"><h3>'+esc(p.name)+'</h3><p>'+esc(p.description)+'</p><div class="product-bottom"><span class="price">'+money(p.price)+' <small> / '+esc(p.weight)+'</small></span><button class="add-button" data-add="'+esc(p.id)+'" '+(p.stock<1?'disabled':'')+'>'+(p.stock<1?'SOLD OUT':'ADD TO BAG +')+'</button></div></div></article>').join("");
 document.querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>{const p=products.find(x=>x.id===b.dataset.add);if(!p||p.stock<1)return;cart[p.id]=(cart[p.id]||0)+1;save();showToast("Added to your bag");});
}
function renderCart(){
 for(const id of Object.keys(cart)){const p=products.find(x=>x.id===id);if(!p||p.stock<1)delete cart[id];else if(cart[id]>p.stock)cart[id]=p.stock;}
 localStorage.setItem("brue_cart",JSON.stringify(cart));const count=Object.values(cart).reduce((a,b)=>a+b,0);
 $("#cartCount").textContent=count;$("#cartSubtotal").textContent=money(total());$("#checkoutTotal").textContent=money(total());
 const rows=products.filter(p=>cart[p.id]).map(p=>'<div class="cart-row"><div><strong>'+esc(p.name)+'</strong><small>'+money(p.price)+' · '+esc(p.weight)+'</small></div><div class="qty-controls"><button data-dec="'+esc(p.id)+'">−</button><span>'+cart[p.id]+'</span><button data-inc="'+esc(p.id)+'" '+(cart[p.id]>=p.stock?'disabled':'')+'>+</button></div></div>').join("");
 $("#cartItems").innerHTML=rows||'<p class="muted">Your bag is waiting for something good.</p>';
 document.querySelectorAll("[data-dec]").forEach(b=>b.onclick=()=>{cart[b.dataset.dec]--;if(!cart[b.dataset.dec])delete cart[b.dataset.dec];save();});
 document.querySelectorAll("[data-inc]").forEach(b=>b.onclick=()=>{const p=products.find(x=>x.id===b.dataset.inc);if(p&&cart[p.id]<p.stock){cart[p.id]++;save();}});
 $("#checkoutButton").disabled=count===0;$("#checkoutButton").style.opacity=count===0?".45":"1";
}
function closeCart(){$("#overlay").classList.remove("active");$("#cartDrawer").classList.remove("active");}
function showToast(t){const el=$("#toast");el.textContent=t;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),3500);}
$("#openCart").onclick=()=>{$("#overlay").classList.add("active");$("#cartDrawer").classList.add("active");};
$("#closeCart").onclick=closeCart;$("#overlay").onclick=closeCart;
$("#checkoutButton").onclick=()=>{if(!total())return;closeCart();$("#checkoutModal").classList.add("active");};
$("#closeCheckout").onclick=()=>$("#checkoutModal").classList.remove("active");
$("#checkoutModal").onclick=e=>{if(e.target.id==="checkoutModal")$("#checkoutModal").classList.remove("active");};
$("#checkoutForm").onsubmit=async e=>{
 e.preventDefault();if(!total())return;const form=e.target,button=form.querySelector('button[type="submit"]'),data=Object.fromEntries(new FormData(form).entries());
 const items=products.filter(p=>cart[p.id]).map(p=>({id:p.id,qty:cart[p.id]}));button.disabled=true;button.textContent="Sending order…";
 try{const response=await fetch("/api/orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({customer:data,items})});const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(result.error||"Could not place your order.");cart={};save();form.reset();$("#checkoutModal").classList.remove("active");showToast("Order received — thank you! Reference: "+String(result.orderId||"").slice(0,8));await loadProducts();}
 catch(error){showToast(error.message||"Connection error. Please try again.");}finally{button.disabled=false;button.textContent="Place order ↗";}
};
$("#newsletterForm").onsubmit=e=>{e.preventDefault();showToast("Thanks for joining the brüe letter!");e.target.reset();};
function setText(id,value){const el=$("#"+id);if(el&&value!=null)el.textContent=String(value).replace(/\\n/g,"\n");}
function applySiteSettings(s){
 if(!s)return;
 setText("heroEyebrow",s.heroEyebrow);setText("heroTitle",s.heroTitle);setText("heroText",s.heroText);setText("heroButton",s.heroButton+" ↗");setText("heroNote",s.heroNote);setText("heroIndex",s.heroIndex);
 setText("shopEyebrow",s.shopEyebrow);setText("shopTitle",s.shopTitle);setText("shopDescription",s.shopDescription);
 setText("storyEyebrow",s.storyEyebrow);setText("storyTitle",s.storyTitle);setText("storyText",s.storyText);setText("storyFeature1",s.storyFeature1);setText("storyFeature2",s.storyFeature2);setText("storyFeature3",s.storyFeature3);
 setText("newsletterEyebrow",s.newsletterEyebrow);setText("newsletterTitle",s.newsletterTitle);setText("newsletterText",s.newsletterText);setText("footerTagline",s.footerTagline);
 const brand=String(s.brandName||"brüe");for(const id of ["brandLogo","footerLogo"]){const el=$("#"+id);if(el)el.textContent=brand+".";}
 const email=$("#contactEmail");if(email){email.textContent=s.contactEmail;email.href="mailto:"+s.contactEmail;}
 const phone=$("#contactPhone");if(phone){phone.textContent=s.contactPhone;phone.href="tel:"+s.contactPhone.replace(/[^0-9+]/g,"");}
 const wa=$("#contactWhatsapp");if(wa){wa.href="https://wa.me/"+String(s.whatsappNumber||"").replace(/[^0-9]/g,"");}
 const hero=$("#heroButton");if(hero)hero.href="#shop";
 const heroPhoto=document.querySelector(".hero-photo");if(heroPhoto&&s.heroImage)heroPhoto.style.backgroundImage='linear-gradient(90deg,#1d1511 0%,transparent 28%),url("'+String(s.heroImage).replace(/["\\\\]/g,"")+'")';
 const storyImage=$("#storyImage");if(storyImage&&s.storyImage)storyImage.style.backgroundImage='url("'+String(s.storyImage).replace(/["\\\\]/g,"")+'")';
 const intro=$("#introStrip");if(intro){const introLines=String(s.introItems||"").replace(/\\n/g,"\n").split(/\n+/).map(x=>x.trim()).filter(Boolean);intro.innerHTML=introLines.map(x=>'<span>'+esc(x)+'</span>').join('<span>•</span>');intro.hidden=!s.showIntro;}
 const story=document.querySelector(".story");if(story)story.hidden=!s.showStory;
 let custom=document.getElementById("customContentBlocks");if(!custom){custom=document.createElement("div");custom.id="customContentBlocks";const main=document.querySelector("main");const news=$("#newsletterSection");if(main&&news)main.insertBefore(custom,news);}
 if(custom){custom.innerHTML=[1,2,3].filter(i=>s["customBlock"+i+"Enabled"]).map(i=>'<section class="custom-content-block"><div class="custom-content-copy"><p class="eyebrow">BRÜE JOURNAL</p><h2>'+esc(s["customBlock"+i+"Title"]||"")+'</h2><p>'+esc(s["customBlock"+i+"Text"]||"")+'</p></div>'+(s["customBlock"+i+"Image"]?'<img src="'+esc(s["customBlock"+i+"Image"])+'" alt="">':'')+'</section>').join("");}
 const newsletter=$("#newsletterSection");if(newsletter)newsletter.hidden=!s.showNewsletter;
 const note=$("#heroNote");if(note)note.hidden=!s.showHeroNote;
 const root=document.documentElement,vars={"--site-bg":s.background,"--site-text":s.textColor,"--site-accent":s.accent,"--site-card":s.cardColor,"--site-button":s.buttonColor,"--site-button-text":s.buttonText,"--site-newsletter":s.newsletterColor,"--site-base-size":s.baseFontSize+"px","--site-hero-size":s.heroFontSize+"px","--site-section-size":s.sectionFontSize+"px","--site-product-image-height":s.productImageHeight+"px","--site-content-width":s.contentWidth+"px","--site-product-columns":s.productColumns,"--site-section-spacing":s.sectionSpacing+"px","--site-body-font":'"'+s.bodyFont+'",sans-serif',"--site-heading-font":'"'+s.headingFont+'",serif'};
 for(const [k,v] of Object.entries(vars))root.style.setProperty(k,v);
 let fontLink=$("#siteGoogleFonts");if(!fontLink){fontLink=document.createElement("link");fontLink.id="siteGoogleFonts";fontLink.rel="stylesheet";document.head.appendChild(fontLink);}
 const fonts=[s.bodyFont,s.headingFont].filter(f=>["DM Sans","Montserrat","Poppins","Lora","Playfair Display","Cormorant Garamond"].includes(f)).map(f=>f.replace(/ /g,"+")+":wght@400;500;600;700").join("&family=");
 fontLink.href="https://fonts.googleapis.com/css2?family="+fonts+"&display=swap";
 document.title=brand+" — A Better Kind of Brew";
}
async function loadSiteSettings(){try{const r=await fetch("/api/site-settings",{cache:"no-store"});if(!r.ok)throw new Error("settings");const d=await r.json();applySiteSettings(d.settings);}catch(e){console.error("Could not load site settings",e);}}
async function loadProducts(){try{const r=await fetch("/api/products",{cache:"no-store"});if(!r.ok)throw new Error("Could not load products.");const d=await r.json();products=Array.isArray(d.products)?d.products:[];renderProducts();renderCart();}catch(e){$("#productGrid").innerHTML='<p class="muted">Products could not be loaded. Please refresh the page.</p>';console.error(e);}}
loadSiteSettings();loadProducts();