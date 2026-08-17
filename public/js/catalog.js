const CATEGORY_LABELS = {
  uniformes_clinicos: 'Uniformes clínicos',
  chaquetas: 'Chaquetas'
};
const GENDER_LABELS = { hombre: 'Hombre', mujer: 'Mujer' };

let state = { category: null, gender: null };
let currentItems = [];

function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 2200);
}
function money(n){ return '$' + Number(n||0).toLocaleString('es-CL'); }
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function openOverlay(id){ document.getElementById(id).classList.add('show'); }
function closeOverlay(id){ document.getElementById(id).classList.remove('show'); }
document.querySelectorAll('[data-close]').forEach(b=>{
  b.addEventListener('click', e=> e.target.closest('.overlay').classList.remove('show'));
});
document.querySelectorAll('.overlay').forEach(o=>{
  o.addEventListener('click', e=>{ if(e.target===o) o.classList.remove('show'); });
});

function renderCrumbs(){
  const el = document.getElementById('crumbs');
  const parts = [`<button id="crumbHome">Catálogo</button>`];
  if(state.category){
    parts.push('<span class="sep">/</span>');
    parts.push(state.gender
      ? `<button id="crumbCat">${CATEGORY_LABELS[state.category]}</button>`
      : `<span>${CATEGORY_LABELS[state.category]}</span>`);
  }
  if(state.gender){
    parts.push('<span class="sep">/</span>');
    parts.push(`<span>${GENDER_LABELS[state.gender]}</span>`);
  }
  el.innerHTML = parts.join(' ');
  const home = document.getElementById('crumbHome');
  if(home) home.addEventListener('click', ()=>{ state = {category:null, gender:null}; render(); });
  const cat = document.getElementById('crumbCat');
  if(cat) cat.addEventListener('click', ()=>{ state.gender = null; render(); });
}

function render(){
  renderCrumbs();
  const footer = document.getElementById('brandsFooter');
  if(!state.category){
    footer.style.display = 'block';
    return renderCategoryLevel();
  }
  footer.style.display = 'none';
  if(!state.gender) return renderGenderLevel();
  return renderItemsLevel();
}

function renderCategoryLevel(){
  document.getElementById('content').innerHTML = `
    <div class="section-grid">
      <button class="section-card" data-cat="uniformes_clinicos">
        <div class="section-card-img"><img src="/img/uniformes.jpg" alt="Uniformes clínicos"></div>
        <div class="section-card-body">
          <div class="eyebrow">Sección</div>
          <h3>Uniformes clínicos</h3>
          <p>Ver hombre / mujer</p>
        </div>
      </button>
      <button class="section-card" data-cat="chaquetas">
        <div class="section-card-img"><img src="/img/chaquetas.jpg" alt="Chaquetas"></div>
        <div class="section-card-body">
          <div class="eyebrow">Sección</div>
          <h3>Chaquetas</h3>
          <p>Ver hombre / mujer</p>
        </div>
      </button>
    </div>
  `;
  document.querySelectorAll('[data-cat]').forEach(b=>{
    b.addEventListener('click', ()=>{ state.category = b.dataset.cat; render(); });
  });
}

function renderGenderLevel(){
  document.getElementById('content').innerHTML = `
    <div class="back-row"><button class="btn btn-outline" id="backBtn">← Volver</button></div>
    <div class="section-grid">
      <button class="section-card" data-gender="hombre">
        <div class="section-card-body">
          <div class="eyebrow">${CATEGORY_LABELS[state.category]}</div>
          <h3>Hombre</h3>
        </div>
      </button>
      <button class="section-card" data-gender="mujer">
        <div class="section-card-body">
          <div class="eyebrow">${CATEGORY_LABELS[state.category]}</div>
          <h3>Mujer</h3>
        </div>
      </button>
    </div>
  `;
  document.getElementById('backBtn').addEventListener('click', ()=>{ state.category = null; render(); });
  document.querySelectorAll('[data-gender]').forEach(b=>{
    b.addEventListener('click', ()=>{ state.gender = b.dataset.gender; render(); });
  });
}

async function renderItemsLevel(){
  document.getElementById('content').innerHTML = `
    <div class="back-row"><button class="btn btn-outline" id="backBtn">← Volver</button></div>
    <div class="toolbar">
      <input class="search" id="search" placeholder="Buscar por nombre…">
      <div class="count" id="count">cargando…</div>
    </div>
    <div class="grid" id="grid"></div>
  `;
  document.getElementById('backBtn').addEventListener('click', ()=>{ state.gender = null; render(); });
  try{
    const res = await fetch(`/api/items?category=${state.category}&gender=${state.gender}`);
    const data = await res.json();
    currentItems = data.items || [];
  }catch(e){
    currentItems = [];
    toast('No se pudo cargar el catálogo.');
  }
  paintGrid(currentItems);
  document.getElementById('search').addEventListener('input', e=>{
    const q = e.target.value.trim().toLowerCase();
    paintGrid(currentItems.filter(i => (i.name||'').toLowerCase().includes(q)));
  });
}

function paintGrid(list){
  const grid = document.getElementById('grid');
  document.getElementById('count').textContent = list.length + ' prenda' + (list.length===1?'':'s');
  if(list.length===0){
    grid.innerHTML = '<div class="empty" style="grid-column:1/-1;"><h2>Sin prendas todavía</h2><p>Aún no hay stock cargado en esta sección.</p></div>';
    return;
  }
  grid.innerHTML = list.map(i => `
    <div class="tag-card" data-id="${i._id}">
      <div class="tag-img-wrap">${(i.images && i.images[0]) ? `<img src="${i.images[0].url}">` : `<span class="ph">sin foto</span>`}</div>
      <div class="tag-name">${escapeHtml(i.name||'Sin nombre')}</div>
      <div class="tag-meta">${i.size ? 'TALLA ' + escapeHtml(i.size) : ''}</div>
      <div class="tag-bottom">
        <div class="tag-price">${money(i.price)}</div>
        <div class="badge ${Number(i.stock)>0 ? 'ok':'no'}">${Number(i.stock)>0 ? 'Disponible' : 'Agotado'}</div>
      </div>
    </div>
  `).join('');
  grid.querySelectorAll('.tag-card').forEach(card=>{
    card.addEventListener('click', ()=> openDetail(card.dataset.id));
  });
}

function openDetail(id){
  const i = currentItems.find(x=>x._id===id);
  if(!i) return;
  const images = (i.images && i.images.length) ? i.images : [];

  const mainImg = images[0] ? images[0].url : '';
  const thumbsHtml = images.length > 1
    ? `<div class="gallery-thumbs">${images.map((img, idx) => `<img src="${img.url}" data-idx="${idx}" class="${idx===0?'active':''}">`).join('')}</div>`
    : '';

  document.getElementById('detailContent').innerHTML = `
    <div>
      <div class="gallery-main">${mainImg ? `<img id="galleryMainImg" src="${mainImg}">` : ''}</div>
      ${thumbsHtml}
    </div>
    <div class="detail-info">
      <div class="cat">${CATEGORY_LABELS[i.category]} · ${GENDER_LABELS[i.gender]}</div>
      <h2>${escapeHtml(i.name||'Sin nombre')}</h2>
      <div class="detail-row"><span>Talla</span><span>${escapeHtml(i.size||'—')}</span></div>
      <div class="detail-row"><span>Color</span><span>${escapeHtml(i.color||'—')}</span></div>
      <div class="detail-row"><span>Precio</span><span>${money(i.price)}</span></div>
      <div class="detail-row"><span>Stock</span><span>${Number(i.stock)||0} unidades</span></div>
      ${i.notes ? `<div class="detail-row"><span>Notas</span><span>${escapeHtml(i.notes)}</span></div>` : ''}
      <div class="whatsapp-cta">
        <span>¿Te gustó el producto? Escríbeme por WhatsApp para coordinar</span>
        <svg class="wa-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12.002 2C6.478 2 2 6.478 2 12c0 1.987.586 3.834 1.594 5.383L2 22l4.735-1.559A9.953 9.953 0 0 0 12.002 22C17.526 22 22 17.523 22 12S17.526 2 12.002 2zm0 18.06a8.03 8.03 0 0 1-4.099-1.124l-.294-.175-2.81.925.929-2.735-.191-.281A8.05 8.05 0 1 1 20.06 12a8.06 8.06 0 0 1-8.058 8.06z"/>
        </svg>
      </div>
    </div>
  `;

  let activeIdx = 0;

  document.querySelectorAll('.gallery-thumbs img').forEach(thumb=>{
    thumb.addEventListener('click', ()=>{
      activeIdx = Number(thumb.dataset.idx);
      document.getElementById('galleryMainImg').src = images[activeIdx].url;
      document.querySelectorAll('.gallery-thumbs img').forEach(t=>t.classList.remove('active'));
      thumb.classList.add('active');
    });
  });

  const mainImgEl = document.getElementById('galleryMainImg');
  if(mainImgEl){
    mainImgEl.addEventListener('click', ()=> openZoom(images, activeIdx));
  }

  openOverlay('detailOverlay');
}

function openZoom(images, startIdx){
  let idx = startIdx;
  const zoomImg = document.getElementById('zoomImg');
  const stage = document.getElementById('zoomStage');
  const thumbsWrap = document.getElementById('zoomThumbs');

  function setImage(newIdx){
    idx = newIdx;
    zoomImg.src = images[idx].url;
    stage.classList.remove('zoomed');
    zoomImg.style.transform = 'scale(1)';
    thumbsWrap.querySelectorAll('img').forEach((t,i)=> t.classList.toggle('active', i===idx));
  }

  thumbsWrap.innerHTML = images.length > 1
    ? images.map((img, i) => `<img src="${img.url}" data-idx="${i}">`).join('')
    : '';
  thumbsWrap.querySelectorAll('img').forEach(t=>{
    t.addEventListener('click', e=>{ e.stopPropagation(); setImage(Number(t.dataset.idx)); });
  });

  setImage(idx);

  stage.onclick = (e) => {
    if(stage.classList.contains('zoomed')){
      stage.classList.remove('zoomed');
      zoomImg.style.transform = 'scale(1)';
    } else {
      const rect = zoomImg.getBoundingClientRect();
      const originX = ((e.clientX - rect.left) / rect.width) * 100;
      const originY = ((e.clientY - rect.top) / rect.height) * 100;
      zoomImg.style.transformOrigin = `${originX}% ${originY}%`;
      stage.classList.add('zoomed');
      zoomImg.style.transform = 'scale(2.2)';
    }
  };

  openOverlay('zoomOverlay');
}

document.getElementById('btnQr').addEventListener('click', ()=>{
  const url = window.location.origin;
  document.getElementById('qrUrl').textContent = url;
  const qrDiv = document.getElementById('qrcode');
  qrDiv.innerHTML = '';
  new QRCode(qrDiv, { text: url, width: 180, height: 180, colorDark: '#1B1F2A', colorLight: '#F6F3EA' });
  openOverlay('qrOverlay');
});
document.getElementById('copyLink').addEventListener('click', ()=>{
  navigator.clipboard.writeText(window.location.origin).then(()=> toast('Link copiado.'));
});

render();