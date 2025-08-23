/* =========================
   BIEN.JS — détail d’un bien (buy | rent | commercial)
   Dépend de window.supabase (fourni par supabaseClient.js)
   ========================= */

// -------- Utils ----------
function isMobile(){return window.matchMedia("(max-width:700px)").matches;}
function AED(n){const x=Number(n);return Number.isFinite(x)?`AED ${x.toLocaleString()}`:'';}
function getQS(n){return new URLSearchParams(location.search).get(n);}
function q(name){if(!name)return null;return /[\s()\-]/.test(name)?`"${String(name).replace(/"/g,'""')}"`:name;}


// --- Basemap EN (fallback raster si pas de clé)
const EN_TILE_URL =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const EN_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> & <a href="https://carto.com/attributions">CARTO</a>';

// Mets ta clé MapTiler ici pour labels 100% EN à tous les zooms
const MAPTILER_KEY = ""; // ex: "AbCdEfGh..."

function addEnglishBasemap(map){
  if (MAPTILER_KEY && L.maplibreGL) {
    // Style vectoriel MapTiler avec langue forcée en anglais
    L.maplibreGL({
      style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}&language=en`,
      attribution: '&copy; MapTiler &copy; OpenStreetMap contributors'
    }).addTo(map);
  } else {
    // Fallback raster (peut repasser en langue locale en zoom fort)
    L.tileLayer(EN_TILE_URL, { attribution: EN_ATTR, maxZoom: 20 }).addTo(map);
    if (!MAPTILER_KEY) {
      console.warn("MAPTILER_KEY vide: impossible de garantir l’anglais à tous les zooms (fallback CARTO).");
    }
    if (!L.maplibreGL) {
      console.warn("Plugin leaflet-maplibre-gl manquant: fallback CARTO.");
    }
  }
}


// -------- Détection de colonnes ----------
async function detectCols(table){
  const { data, error } = await window.supabase.from(table).select("*").limit(1);
  if (error) throw error;
  const row = data?.[0] || {};
  const has  = k => Object.prototype.hasOwnProperty.call(row, k);
  const pick = (...c) => c.find(has);

  return {
    id:           pick("id","uuid"),
    title:        pick("title","titre","name"),
    propertyType: pick("property_type","property type"),
    bedrooms:     pick("bedrooms","rooms"),
    bathrooms:    pick("bathrooms"),
    price:        pick("price"),
    sqft:         pick("sqft","sqft (m²)"),
    photo:        pick("photo_bien_url","photo_url","image_url","image"),
    description:  pick("description","property details","property_details","details"),
    created_at:   pick("created_at"),
    agent_id:     pick("agent_id"),

    // 👇 NOUVEAU: on détecte la colonne "localisation" (avec ou sans faute)
    localisationAccueil: pick("localisation accueil","localisation acceuil","localisation_accueil")
  };
}


// -------- Lecture d’un bien ----------
async function fetchOneById(table, id){
  const cols = await detectCols(table);
  const fields = [
    cols.id, cols.title, cols.propertyType, cols.bedrooms, cols.bathrooms,
    cols.price, cols.sqft, cols.photo, cols.description, cols.created_at,
    cols.agent_id,
    cols.localisationAccueil             // 👈 on l’inclut SI elle existe
  ].filter(Boolean).map(q).join(",");

  const { data, error } = await window.supabase
    .from(table)
    .select(fields)
    .eq(cols.id, id)
    .single();

  if (error) throw error;
  return { data, cols };
}


// secours: dernier bien si pas d’id
async function fetchLatest(table){
  const cols = await detectCols(table);
  const fields = [
    cols.id, cols.title, cols.propertyType, cols.bedrooms, cols.bathrooms,
    cols.price, cols.sqft, cols.photo, cols.description, cols.created_at,
    cols.agent_id,
    cols.localisationAccueil             // 👈 idem
  ].filter(Boolean).map(q).join(",");

  const orderCol = cols.created_at || cols.id;
  const { data, error } = await window.supabase
    .from(table)
    .select(fields)
    .order(orderCol, { ascending:false })
    .limit(1);

  if (error) throw error;
  return { data: data?.[0], cols };
}


// -------- Agent ----------
async function fetchAgent(agentId){
  if(!agentId) return null;
  const sel='id,name,phone,email,whatsapp,photo_agent_url,rating';
  const {data,error}=await window.supabase.from('agent').select(sel).eq('id',agentId).single();
  if(error) return null;
  return data;
}

// -------- Similaires ----------
async function fetchSimilar(table,currentId,cols,limit=12){
  const fields=[cols.id,cols.title,cols.propertyType,cols.price,cols.sqft,cols.photo,cols.bedrooms,cols.bathrooms,cols.created_at]
    .filter(Boolean).map(q).join(",");
  const orderCol=cols.created_at||cols.id;
  const {data,error}=await window.supabase.from(table).select(fields).neq(cols.id,currentId).order(orderCol,{ascending:false}).limit(limit);
  if(error) return [];
  return (data||[]).map(r=>({
    id:r[cols.id],
    title:r[cols.title]||"",
    images:[ r[cols.photo] || "https://via.placeholder.com/400x300" ],
    price:r[cols.price],
    bedrooms:r[cols.bedrooms],
    bathrooms:r[cols.bathrooms],
    size:r[cols.sqft],
    source:table
  }));
}


/* =========================
   Données UI (remplies dynamiquement)
   ========================= */
const propertyData = {
  price: "",
  bedrooms: "",
  bathrooms: "",
  size: "",
  location: "",      // titre/heading existant
  locationText: "",  // NOUVEAU : texte "localisation accueil" à afficher sous le prix
  description: "",
  images: [],
  propertyType: "Apartment"
};
let agentData = null;
let currentIndex = 0;





// ========== CAROUSEL PRINCIPAL ==========
function updateMainCarousel(){
  const mainImage=document.getElementById('main-image');
  const thumb1=document.getElementById('thumb1');
  const thumb2=document.getElementById('thumb2');
  const count=Math.max(propertyData.images.length,1);
  mainImage.src=propertyData.images[currentIndex]||"https://via.placeholder.com/800x500";
  thumb1.src=propertyData.images[(currentIndex+1)%count]||mainImage.src;
  thumb2.src=propertyData.images[(currentIndex+2)%count]||mainImage.src;
  const countOverlay=document.querySelector('.image-count-overlay');
  if(countOverlay){
    if(count>1){countOverlay.style.display='';countOverlay.style.background='rgba(0,0,0,0.7)';countOverlay.style.padding='8px 16px';countOverlay.innerHTML=`📷 ${count}`;}
    else{countOverlay.style.display='none';countOverlay.style.background='none';countOverlay.style.padding='0';countOverlay.innerHTML='';}
  }
  updateCarouselIndicators();
}
function updateCarouselIndicators(){
  const indicators=document.getElementById('carousel-indicators'); if(!indicators) return;
  indicators.innerHTML='';
  for(let i=0;i<Math.max(propertyData.images.length,1);i++){
    const dot=document.createElement('div');
    dot.className='carousel-indicator-dot'+(i===currentIndex?' active':'');
    dot.addEventListener('click',(e)=>{e.stopPropagation();currentIndex=i;updateMainCarousel();});
    indicators.appendChild(dot);
  }
}
function openLightbox(index){
  const prev=document.getElementById('lightbox-bien'); if(prev) prev.remove();
  let current=index;
  const lb=document.createElement('div');
  lb.id='lightbox-bien';
  lb.style.cssText='position:fixed;z-index:9999;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.95);display:flex;align-items:center;justify-content:center;';
  const img=document.createElement('img');
  img.src=propertyData.images[current]||"https://via.placeholder.com/1200x800";
  img.style.cssText='max-width:90vw;max-height:90vh;border-radius:12px;box-shadow:0 0 40px #0008;background:white;touch-action:pan-y;';
  lb.appendChild(img);
  const mk=(txt,css,on)=>{const b=document.createElement('button');b.textContent=txt;b.style.cssText=css;b.onclick=(e)=>{e.stopPropagation();on();};return b;};
  lb.appendChild(mk("❮",'position:absolute;left:2vw;top:50%;transform:translateY(-50%);background:none;border:none;color:#fff;font-size:4rem;cursor:pointer;opacity:.7;',()=>{current=(current-1+propertyData.images.length)%propertyData.images.length;img.src=propertyData.images[current];}));
  lb.appendChild(mk("❯",'position:absolute;right:2vw;top:50%;transform:translateY(-50%);background:none;border:none;color:#fff;font-size:4rem;cursor:pointer;opacity:.7;',()=>{current=(current+1)%propertyData.images.length;img.src=propertyData.images[current];}));
  lb.onclick=()=>{document.body.removeChild(lb);};
  document.body.appendChild(lb);
}
function createMainArrows(){
  if(isMobile()){const ex=document.getElementById('main-arrows-bien'); if(ex) ex.remove(); return;}
  let arrowsDiv=document.getElementById('main-arrows-bien'); if(arrowsDiv) arrowsDiv.remove();
  arrowsDiv=document.createElement('div');
  arrowsDiv.id='main-arrows-bien';
  arrowsDiv.style.cssText='position:absolute;width:100%;top:45%;left:0;display:flex;justify-content:space-between;pointer-events:none;';
  const mk=(txt,side,on)=>{const b=document.createElement('button');b.textContent=txt;b.style.cssText=`pointer-events:auto;margin-${side}:8px;background:rgba(255,255,255,0.8);border:none;border-radius:50%;font-size:2rem;width:48px;height:48px;cursor:pointer;box-shadow:0 2px 8px #0002;`;b.onclick=(e)=>{e.stopPropagation();on();};return b;};
  arrowsDiv.appendChild(mk('❮','left',()=>{currentIndex=(currentIndex-1+Math.max(propertyData.images.length,1))%Math.max(propertyData.images.length,1);updateMainCarousel();}));
  arrowsDiv.appendChild(mk('❯','right',()=>{currentIndex=(currentIndex+1)%Math.max(propertyData.images.length,1);updateMainCarousel();}));
  const mount=document.querySelector('.main-and-thumbs'); mount.style.position='relative'; mount.appendChild(arrowsDiv);
}
function setupCarouselEvents(){
  document.getElementById('main-image').onclick=()=>openLightbox(currentIndex);
  document.getElementById('thumb1').onclick=()=>{currentIndex=(currentIndex+1)%Math.max(propertyData.images.length,1);updateMainCarousel();};
  document.getElementById('thumb2').onclick=()=>{currentIndex=(currentIndex+2)%Math.max(propertyData.images.length,1);updateMainCarousel();};
}

// ========== AGENT ==========
function renderAgentInfo(){
  const container=document.getElementById('agent-contact-card-container');
  if(!agentData){ container.innerHTML=""; return; }
  container.innerHTML=`
    <div class="agent-contact-card">
      <div class="contact-buttons">
        ${agentData.phoneNumber?`<button class="call-btn" onclick="window.location.href='tel:${agentData.phoneNumber}'">📞 Call</button>`:""}
        ${agentData.whatsappNumber?`<button class="whatsapp-btn" onclick="window.open('https://wa.me/${String(agentData.whatsappNumber).replace(/\D/g,'')}', '_blank')">💬 WhatsApp</button>`:""}
      </div>
      <div class="agent-profile">
        <img src="${agentData.photo || 'https://via.placeholder.com/96'}" alt="Agent photo" />
        <div class="agent-details">
          <strong>${agentData.name || ''}</strong><br />
          ${agentData.rating?`⭐ ${agentData.rating}`:""}
        </div>
      </div>
    </div>
  `;
}

// ========== Similaires ==========
function createSimilarPropertyCard(p){
  const card=document.createElement('div'); card.classList.add('similar-property-card');
  const imagesContainer=document.createElement('div'); imagesContainer.classList.add('similar-property-carousel-images');
  (p.images||[]).forEach((src,i)=>{const img=document.createElement('img'); img.src=src; if(i===0) img.classList.add('active'); imagesContainer.appendChild(img);});
  const btns=document.createElement('div'); btns.classList.add('similar-property-carousel-buttons');
  const prevBtn=document.createElement('button'); prevBtn.textContent='‹';
  const nextBtn=document.createElement('button'); nextBtn.textContent='›';
  btns.appendChild(prevBtn); btns.appendChild(nextBtn); imagesContainer.appendChild(btns);
  let i=0; const imgs=imagesContainer.querySelectorAll('img');
  prevBtn.addEventListener('click',e=>{e.stopPropagation();imgs[i].classList.remove('active');i=(i-1+imgs.length)%imgs.length;imgs[i].classList.add('active');});
  nextBtn.addEventListener('click',e=>{e.stopPropagation();imgs[i].classList.remove('active');i=(i+1)%imgs.length;imgs[i].classList.add('active');});
  const info=document.createElement('div'); info.classList.add('similar-property-info');
  info.innerHTML=`<h4>${p.title || ''}</h4><p>${AED(p.price)}</p>`;
  card.appendChild(imagesContainer); card.appendChild(info);
  card.style.cursor="pointer";
  card.addEventListener('click',()=>{
    sessionStorage.setItem('selected_property', JSON.stringify({ id:p.id, type:p.source }));
    window.location.href=`bien.html?id=${encodeURIComponent(p.id)}&type=${encodeURIComponent(p.source)}`;
  });
  return card;
}

// Swipe mobile
function setupMobileSwipeOnMainImage(){
  const mainImage=document.getElementById('main-image'); let startX=0,isTouch=false;
  mainImage.addEventListener('touchstart',e=>{isTouch=true;startX=e.touches[0].clientX;});
  mainImage.addEventListener('touchend',e=>{if(!isTouch) return; const dx=e.changedTouches[0].clientX-startX; if(Math.abs(dx)>40){ currentIndex=(currentIndex+(dx<0?1:-1)+Math.max(propertyData.images.length,1))%Math.max(propertyData.images.length,1); updateMainCarousel(); } isTouch=false;});
}



// --- Geocode ultra-light depuis "localisation accueil" (approx EN)
async function geocodeSimple(place){
  const q = (place || "").toString().trim();
  if (!q) return { lat: 25.2048, lng: 55.2708 }; // Dubai center

  const url = 'https://nominatim.openstreetmap.org/search'
            + '?format=json&limit=1&accept-language=en'
            + '&q=' + encodeURIComponent(q + ', Dubai, UAE');

  try{
    const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!r.ok) throw new Error('geocode http');
    const j = await r.json();
    if (j && j[0]) return { lat: Number(j[0].lat), lng: Number(j[0].lon) };
  }catch(e){ /* silencieux */ }

  return { lat: 25.2048, lng: 55.2708 }; // fallback
}


/* =========================
   MAIN
   ========================= */
async function main(){
  // Contexte (id/type)
  let id = getQS('id'); let type = getQS('type');
  if(!id || !type){
    try{
      const saved = JSON.parse(sessionStorage.getItem('selected_property') || '{}');
      if(saved?.id && saved?.type){ id = saved.id; type = saved.type; }
    }catch{}
  }
  const allowed = ['buy','rent','commercial'];
  if(!type || !allowed.includes(type)) type = 'buy';

  // Charge le bien
  let rec, cols;
  try{
    if(id){ const r = await fetchOneById(type, id); rec = r.data; cols = r.cols; }
    else { const r = await fetchLatest(type); rec = r.data; cols = r.cols; id = rec?.[cols.id]; }
  }catch(e){ console.error("Load error:", e); }

  // Normalise pour l’UI
// Normalise pour l’UI
let images = [];
if (rec){
  const rawImg = cols.photo ? rec[cols.photo] : null;
  images = Array.isArray(rawImg) ? rawImg : (rawImg ? [rawImg] : []);
  propertyData.images = images.length ? images : ["https://via.placeholder.com/800x500"];

  // H2 (titre d’annonce)
  propertyData.location = rec[cols.title] || "Dubai";

  const priceRaw = cols.price ? rec[cols.price] : null;
  propertyData.price = AED(priceRaw) + (type === 'rent' && priceRaw ? ' /year' : '');

  propertyData.bedrooms  = cols.bedrooms  ? (rec[cols.bedrooms]  ?? '') : '';
  propertyData.bathrooms = cols.bathrooms ? (rec[cols.bathrooms] ?? '') : '';
  propertyData.size      = (cols.sqft && rec[cols.sqft]) ? `${rec[cols.sqft]} sqft` : '';
  propertyData.propertyType = cols.propertyType ? (rec[cols.propertyType] || 'Apartment') : 'Apartment';

  // Description (ou fallback)
  const dbDesc = cols.description ? (rec[cols.description] || "") : "";
  propertyData.description = dbDesc || [
    propertyData.propertyType || "Property",
    propertyData.bedrooms ? `• ${propertyData.bedrooms} BR` : "",
    propertyData.bathrooms ? `• ${propertyData.bathrooms} BA` : "",
    propertyData.size ? `• ${propertyData.size}` : ""
  ].filter(Boolean).join(" ");

  // 👇 Localisation accueil (lu dans le même SELECT principal)
  propertyData.locationText = cols.localisationAccueil ? (rec[cols.localisationAccueil] || "") : "";
} else {
  // Fallback total
  propertyData.images = ["https://via.placeholder.com/800x500"];
  propertyData.location = "Dubai";
  propertyData.locationText = "";
  propertyData.description = "";
}


  // Agent
  let ag = null;
  try{
    const agentId = cols?.agent_id ? rec?.[cols.agent_id] : null;
    ag = await fetchAgent(agentId);
  }catch{}
  agentData = ag ? {
    name: ag.name || "",
    rating: ag.rating || "",
    photo: ag.photo_agent_url || "",
    phoneNumber: ag.phone || "",
    whatsappNumber: ag.whatsapp || ag.phone || ""
  } : null;

  // Rendu UI
  updateMainCarousel(); createMainArrows(); setupCarouselEvents(); setupMobileSwipeOnMainImage();

  const info = document.getElementById('property-info');
  info.innerHTML = `
    <h2>${propertyData.location}</h2>
    <div class="price">${propertyData.price}</div>
${propertyData.locationText
  ? `<p class="location-line"><i class="fas fa-map-marker-alt" style="margin-right:8px;color:#555;"></i>${propertyData.locationText}</p>`
  : ""}


    <div class="details">
      ${propertyData.bedrooms!=='' ? `<span>🛏️ ${propertyData.bedrooms} Bedrooms</span>`:''}
      ${propertyData.bathrooms!=='' ? `<span>🛁 ${propertyData.bathrooms} Bathrooms</span>`:''}
      ${propertyData.size ? `<span>📐 ${propertyData.size}</span>`:''}
    </div>
    ${propertyData.description ? `<p style="margin-top:20px;">${propertyData.description}</p>`:""}
  `;
  document.getElementById('property-description').textContent = propertyData.description || "";
  document.getElementById('detail-property-type').textContent = propertyData.propertyType || "";
  document.getElementById('detail-property-size').textContent = propertyData.size || "";
  document.getElementById('detail-bedrooms').textContent = propertyData.bedrooms || "";
  document.getElementById('detail-bathrooms').textContent = propertyData.bathrooms || "";
  renderAgentInfo();

  // Similaires
  const wrap = document.querySelector('.similar-properties-wrapper'); wrap.innerHTML = "";
  const sims = await fetchSimilar(type, rec?.[cols?.id], cols || {}, 12);
  sims.forEach(p => wrap.appendChild(createSimilarPropertyCard(p)));

   // Map (géocodée depuis "localisation accueil")
  {
    const mapEl = document.getElementById("map");
    if (mapEl) {
      mapEl.style.height = "400px";

      const placeQuery = propertyData.locationText || propertyData.location || "Dubai";

      let lat = 25.2048, lng = 55.2708;
      try {
        const p = await geocodeSimple(placeQuery);
        if (p && Number.isFinite(p.lat) && Number.isFinite(p.lng)) {
          lat = p.lat; lng = p.lng;
        }
      } catch (_) {}
     
      const m = L.map("map").setView([lat, lng], 13);
      L.tileLayer(EN_TILE_URL, { attribution: EN_ATTR, maxZoom: 20 }).addTo(m);

      const marker = L.marker([lat, lng]).addTo(m);
      const popupHtml = `
        <div style="min-width:180px">
          <div style="font-weight:700;margin-bottom:4px">${propertyData.location || ""}</div>
          ${propertyData.locationText ? `<div style="color:#666"><i class="fa-solid fa-location-dot"></i> ${propertyData.locationText}</div>` : ""}
          ${propertyData.price ? `<div style="margin-top:6px;color:#ff8800;font-weight:700">${propertyData.price}</div>` : ""}
        </div>
      `;
      marker.bindPopup(popupHtml).openPopup();
    }
  }
} //  ←←←  AJOUTE CETTE ACCOLADE pour fermer async function main()



// Resize flèches
window.addEventListener('resize', createMainArrows);

// Burger + dropdown (inchangé)
document.addEventListener('DOMContentLoaded', function(){
  const burger=document.getElementById('burgerMenu');
  const nav=document.querySelector('.all-button');
  burger?.addEventListener('click',()=>{
    nav.classList.toggle('mobile-open');
    document.body.style.overflow = nav.classList.contains('mobile-open') ? 'hidden' : '';
    function closeMenu(e){ if(!nav.contains(e.target) && !burger.contains(e.target)){ nav.classList.remove('mobile-open'); document.body.style.overflow=''; } }
    if(nav.classList.contains('mobile-open')) setTimeout(()=>document.addEventListener('click',closeMenu,{once:true}),0);
  });
  document.querySelectorAll('.all-button a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('mobile-open');document.body.style.overflow='';}));
  const buyDropdown=document.getElementById('buyDropdown');
  const mainBuyBtn=document.getElementById('mainBuyBtn');
  mainBuyBtn.addEventListener('click',e=>{e.preventDefault();buyDropdown.classList.toggle('open');});
  document.addEventListener('click',e=>{if(!buyDropdown.contains(e.target)) buyDropdown.classList.remove('open');});

  // go!
  main().catch(console.error);
});


