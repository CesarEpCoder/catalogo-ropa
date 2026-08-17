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
  if(!state.category) return renderCategoryLevel();
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
    <div class="section-grid">
      <button class="section-card" data-gender="hombre">
        <div class="eyebrow">${CATEGORY_LABELS[state.category]}</div>
        <h3>Hombre</h3>
      </button>
      <button class="section-card" data-gender="mujer">
        <div class="eyebrow">${CATEGORY_LABELS[state.category]}</div>
        <h3>Mujer</h3>
      </button>
    </div>
  `;
  document.querySelectorAll('[data-gender]').forEach(b=>{
    b.addEventListener('click', ()=>{ state.gender = b.dataset.gender; render(); });
  });
}

async function renderItemsLevel(){
  document.getElementById('content').innerHTML = `
    <div class="toolbar">
      <input class="search" id="search" placeholder="Buscar por nombre…">
      <div class="count" id="count">cargando…</div>
    </div>
    <div class="grid" id="grid"></div>
  `;
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