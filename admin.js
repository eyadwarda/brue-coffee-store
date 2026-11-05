const money=n=>"EGP "+Number(n).toLocaleString("en-EG"),$=s=>document.querySelector(s);
let orders=[],products=[];
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
async function api(url,options={}){const response=await fetch(url,{...options,headers:{"Content-Type":"application/json",...(options.headers||{})}});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||"Request failed.");return data;}
function showDashboard(){$("#loginPanel").hidden=true;$("#dashboard").hidden=false;loadOrders();loadProducts();loadSiteSettingsAdmin();}
function showLogin(){$("#dashboard").hidden=true;$("#loginPanel").hidden=false;}

const settingSections=[
["Brand & navigation",[
["brandName","Store name","text"],["contactEmail","Contact email","email"],["contactPhone","Contact phone","text"],["whatsappNumber","WhatsApp number (international digits)","text"]]],
["Hero section",[
["heroEyebrow","Small heading","text"],["heroTitle","Main headline (new line = next line)","textarea"],["heroText","Description","textarea"],["heroButton","Button text","text"],["heroImage","Hero image URL (HTTPS)","url"],["heroNote","Side note","textarea"],["heroIndex","Bottom caption","text"],["showHeroNote","Show side note","checkbox"]]],
["Shop section",[
["shopEyebrow","Small heading","text"],["shopTitle","Section title","textarea"],["shopDescription","Description","textarea"],["introItems","Announcement strip (one phrase per line)","textarea"],["showIntro","Show announcement strip","checkbox"]]],
["Our story",[
["showStory","Show story section","checkbox"],["storyEyebrow","Small heading","text"],["storyTitle","Title","textarea"],["storyText","Description","textarea"],["storyImage","Story image URL (HTTPS)","url"],["storyFeature1","Feature 1","textarea"],["storyFeature2","Feature 2","textarea"],["storyFeature3","Feature 3","textarea"]]],
["Newsletter & footer",[
["showNewsletter","Show newsletter section","checkbox"],["newsletterEyebrow","Newsletter small heading","text"],["newsletterTitle","Newsletter title","textarea"],["newsletterText","Newsletter description","textarea"],["footerTagline","Footer tagline","text"],["contactEmail","Contact email","email"],["contactPhone","Contact phone","text"],["whatsappNumber","WhatsApp number","text"]]],
["Colors & typography",[
["background","Page background","color"],["textColor","Main text","color"],["accent","Accent color","color"],["cardColor","Cards / sections","color"],["buttonColor","Buttons","color"],["buttonText","Button text","color"],["newsletterColor","Newsletter background","color"],["bodyFont","Body font","select",["DM Sans","Montserrat","Poppins","Lora","Playfair Display","Cormorant Garamond"]],["headingFont","Headings font","select",["DM Sans","Montserrat","Poppins","Lora","Playfair Display","Cormorant Garamond"]]]],
["Sizes & layout",[
["baseFontSize","Base text size (px)","number"],["heroFontSize","Hero title size (px)","number"],["sectionFontSize","Section title size (px)","number"],["productImageHeight","Product image height (px)","number"],["contentWidth","Content width (px)","number"],["productColumns","Product columns (1–4)","number"],["sectionSpacing","Section vertical spacing (px)","number"]]],
["Custom section 1",[
["customBlock1Enabled","Show this section","checkbox"],["customBlock1Title","Title","textarea"],["customBlock1Text","Text","textarea"],["customBlock1Image","Image URL (HTTPS, optional)","url"]]],
["Custom section 2",[
["customBlock2Enabled","Show this section","checkbox"],["customBlock2Title","Title","textarea"],["customBlock2Text","Text","textarea"],["customBlock2Image","Image URL (HTTPS, optional)","url"]]],
["Custom section 3",[
["customBlock3Enabled","Show this section","checkbox"],["customBlock3Title","Title","textarea"],["customBlock3Text","Text","textarea"],["customBlock3Image","Image URL (HTTPS, optional)","url"]]]
];
let siteSettings={};
function renderSiteSettings(){
 const root=$("#siteSettingsForm");
 root.innerHTML=settingSections.map(([title,fields])=>'<section class="settings-card"><h3>'+esc(title)+'</h3><div class="settings-fields">'+fields.map(([key,label,type,options])=>{
 const value=siteSettings[key]??"";
 if(type==="checkbox")return '<label class="check wide"><input type="checkbox" data-setting="'+key+'" '+(value?'checked':'')+'> '+esc(label)+'</label>';
 if(type==="textarea")return '<label class="wide">'+esc(label)+'<textarea rows="3" data-setting="'+key+'">'+esc(value)+'</textarea></label>';
 if(type==="select")return '<label>'+esc(label)+'<select data-setting="'+key+'">'+options.map(x=>'<option '+(value===x?'selected':'')+'>'+esc(x)+'</option>').join("")+'</select></label>';
 return '<label>'+esc(label)+'<input type="'+type+'" data-setting="'+key+'" value="'+esc(value)+'" '+(type==="number"?'step="1"':'')+'></label>';
 }).join("")+'</div></section>').join("");
}
async function loadSiteSettingsAdmin(){
 try{const d=await api("/api/site-settings");siteSettings=d.settings||{};renderSiteSettings();$("#settingsStatus").textContent="Settings loaded. Changes are not live until you save.";}catch(e){$("#settingsStatus").textContent=e.message;}
}
async function saveSiteSettingsAdmin(){
 const button=$("#saveSiteSettings");button.disabled=true;button.textContent="Saving…";$("#settingsStatus").textContent="";
 try{
  const payload={...siteSettings};
  document.querySelectorAll("[data-setting]").forEach(el=>{const key=el.dataset.setting;payload[key]=el.type==="checkbox"?el.checked:el.type==="number"?Number(el.value):el.value;});
  const d=await api("/api/admin/site-settings",{method:"PUT",body:JSON.stringify(payload)});
  siteSettings=d.settings||payload;renderSiteSettings();$("#settingsStatus").textContent="Saved successfully. Refresh your storefront to see the changes.";
 }catch(e){$("#settingsStatus").textContent=e.message;}finally{button.disabled=false;button.textContent="Save website";}
}
$("#saveSiteSettings").onclick=saveSiteSettingsAdmin;

async function loadOrders(){try{const d=await api("/api/admin/orders");orders=d.orders||[];$("#count").textContent=orders.length;$("#revenue").textContent=money(orders.reduce((s,o)=>s+Number(o.total_egp),0));$("#newCount").textContent=orders.filter(o=>o.status==="New").length;if(!orders.length){$("#orderTable").innerHTML='<div class="empty">No orders yet. New customer orders will appear here.</div>';return;}$("#orderTable").innerHTML='<table class="orders"><thead><tr><th>ORDER</th><th>CUSTOMER</th><th>ITEMS</th><th>TOTAL</th><th>STATUS</th></tr></thead><tbody>'+orders.map(o=>'<tr><td><b>'+esc(String(o.id).slice(0,8))+'</b><br><small>'+new Date(o.created_at).toLocaleString()+'</small></td><td>'+esc(o.customer_name)+'<br>'+esc(o.phone)+'<br><small>'+esc(o.governorate)+' · '+esc(o.address)+'</small>'+(o.notes?'<br><small>Note: '+esc(o.notes)+'</small>':'')+'</td><td>'+(Array.isArray(o.items)?o.items.map(i=>esc(i.name)+' × '+Number(i.qty)).join("<br>"):"")+'</td><td>'+money(o.total_egp)+'</td><td><select data-status="'+esc(o.id)+'">'+["New","Confirmed","Preparing","Out for delivery","Delivered","Cancelled"].map(s=>'<option '+(o.status===s?'selected':'')+'>'+s+'</option>').join("")+'</select></td></tr>').join("")+'</tbody></table>';document.querySelectorAll("[data-status]").forEach(el=>el.onchange=async()=>{el.disabled=true;try{await api("/api/admin/orders/"+encodeURIComponent(el.dataset.status)+"/status",{method:"PATCH",body:JSON.stringify({status:el.value})});await loadOrders();}catch(e){alert(e.message);el.disabled=false;}});}catch(e){$("#orderTable").innerHTML='<div class="empty">'+esc(e.message)+' <button id="retryOrders">Try again</button></div>';$("#retryOrders").onclick=loadOrders;}}
async function loadProducts(){try{const d=await api("/api/admin/products");products=d.products||[];renderProducts();}catch(e){$("#productList").innerHTML='<div class="empty">'+esc(e.message)+' <button id="retryProducts">Try again</button></div>';$("#retryProducts").onclick=loadProducts;}}
function renderProducts(){if(!products.length){$("#productList").innerHTML='<div class="empty">No products found.</div>';return;}$("#productList").innerHTML=products.map(p=>'<article class="admin-product">'+(p.image?'<img src="'+esc(p.image)+'?v='+Date.now()+'" alt="'+esc(p.name)+'">':'<div class="admin-product-image"></div>')+'<h3>'+esc(p.name)+'</h3><p>'+esc(p.description)+'</p><div class="meta">'+money(p.price)+' · '+esc(p.weight)+'<br>Stock: '+p.stock+' · '+esc(p.roast)+'</div><div class="product-actions"><button data-edit="'+esc(p.id)+'">Edit</button><button data-delete="'+esc(p.id)+'">Delete</button></div></article>').join("");document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>openProduct(products.find(p=>p.id===b.dataset.edit)));document.querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>deleteProduct(b.dataset.delete));}
function openProduct(p){$("#productForm").reset();$("#productError").textContent="";$("#productId").value=p?p.id:"";$("#formTitle").textContent=p?"Edit product":"Add product";$("#pName").value=p?.name||"";$("#pOrigin").value=p?.origin||"";$("#pDescription").value=p?.description||"";$("#pRoast").value=p?.roast||"";$("#pWeight").value=p?.weight||"250g";$("#pPrice").value=p?.price??"";$("#pStock").value=p?.stock??"0";$("#pTag").value=p?.tag||"";$("#pImageUrl").value=p?.image?.startsWith("https://")?p.image:"";$("#imagePreview").hidden=!p?.image;$("#imagePreview").src=p?.image||"";$("#productModal").classList.add("open");}
function closeProduct(){$("#productModal").classList.remove("open");}
async function deleteProduct(id){const p=products.find(x=>x.id===id);if(!p||!confirm('Delete "'+p.name+'"? Existing orders will remain saved.'))return;try{await api("/api/admin/products/"+encodeURIComponent(id),{method:"DELETE"});await loadProducts();}catch(e){alert(e.message);}}
$("#addProduct").onclick=()=>openProduct(null);$("#closeProduct").onclick=closeProduct;$("#cancelProduct").onclick=closeProduct;
$("#productModal").onclick=e=>{if(e.target.id==="productModal")closeProduct();};
$("#pImageFile").onchange=()=>{const f=$("#pImageFile").files[0];if(!f){$("#imagePreview").hidden=true;return;}if(f.size>3*1024*1024){$("#productError").textContent="Image must be smaller than 3 MB.";$("#pImageFile").value="";return;}$("#imagePreview").src=URL.createObjectURL(f);$("#imagePreview").hidden=false;};
$("#productForm").onsubmit=async e=>{e.preventDefault();const id=$("#productId").value,file=$("#pImageFile").files[0],button=$("#saveProduct");const payload={name:$("#pName").value,origin:$("#pOrigin").value,description:$("#pDescription").value,roast:$("#pRoast").value,weight:$("#pWeight").value,price:Number($("#pPrice").value),stock:Number($("#pStock").value),tag:$("#pTag").value,imageUrl:$("#pImageUrl").value};button.disabled=true;button.textContent="Saving…";$("#productError").textContent="";try{const saved=await api(id?"/api/admin/products/"+encodeURIComponent(id):"/api/admin/products",{method:id?"PUT":"POST",body:JSON.stringify(payload)});const product=saved.product;if(file){const type=file.type;if(!["image/jpeg","image/png","image/webp"].includes(type))throw new Error("Choose a JPG, PNG or WebP image.");if(file.size>3*1024*1024)throw new Error("Image must be smaller than 3 MB.");const response=await fetch("/api/admin/products/"+encodeURIComponent(product.id)+"/image",{method:"PUT",headers:{"Content-Type":type},body:file});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||"Image upload failed.");}closeProduct();await loadProducts();}catch(err){$("#productError").textContent=err.message;}finally{button.disabled=false;button.textContent="Save product";}};
$("#loginForm").onsubmit=async e=>{e.preventDefault();const button=e.target.querySelector("button");button.disabled=true;$("#loginError").textContent="";try{await api("/api/admin/login",{method:"POST",body:JSON.stringify({password:$("#adminPassword").value})});$("#adminPassword").value="";showDashboard();}catch(err){$("#loginError").textContent=err.message;}finally{button.disabled=false;}};

$("#productsTab").onclick=()=>{setActiveTab("products");$("#ordersPanel").hidden=true;$("#productsPanel").hidden=false;$("#websitePanel").hidden=true;loadProducts();};
$("#ordersTab").onclick=()=>{setActiveTab("orders");$("#ordersPanel").hidden=false;$("#productsPanel").hidden=true;$("#websitePanel").hidden=true;};
$("#websiteTab").onclick=()=>{setActiveTab("website");$("#ordersPanel").hidden=true;$("#productsPanel").hidden=true;$("#websitePanel").hidden=false;loadSiteSettingsAdmin();};
function setActiveTab(which){["orders","products","website"].forEach(x=>$("#"+x+"Tab").classList.toggle("active",x===which));}
$("#refresh").onclick=()=>{loadOrders();loadProducts();if(!$("#websitePanel").hidden)loadSiteSettingsAdmin();};
$("#logout").onclick=async()=>{try{await api("/api/admin/logout",{method:"POST"});}catch{}showLogin();};
$("#export").onclick=()=>{const rows=[["Order","Name","Phone","Governorate","Address","Items","Total EGP","Status"],...orders.map(o=>[o.id,o.customer_name,o.phone,o.governorate,o.address,(o.items||[]).map(i=>i.name+" x"+i.qty).join("; "),o.total_egp,o.status])];const csv=rows.map(row=>row.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\n");const blob=new Blob([csv],{type:"text/csv"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="brue-orders.csv";a.click();URL.revokeObjectURL(url);};
(async()=>{try{const d=await api("/api/admin/me");if(d.authenticated)showDashboard();else showLogin();}catch{showLogin();}})();