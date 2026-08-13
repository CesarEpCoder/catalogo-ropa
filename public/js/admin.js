const CATEGORY_LABELS = { uniformes_clinicos: 'Uniformes clínicos', chaquetas: 'Chaquetas' };
const GENDER_LABELS = { hombre: 'Hombre', mujer: 'Mujer' };

let allItems = [];
let editingId = null;
let pendingFiles = [];   // fotos nuevas seleccionadas, aún no guardadas
let existingImages = []; // fotos que ya tenía la prenda (solo al editar)
let keepPublicIds = [];  // cuáles de las existingImages se conservan
const MAX_IMAGES = 6;

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

async function checkSession(){
  try{
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if(res.ok){ showAdmin(); } else { showLogin(); }
  }catch(e){ showLogin(); }
}

function showLogin(){
  document.getElementById('loginView').style.display = 'block';
  document.getElementById('adminView').style.display = 'none';
  document.getElementById('btnLogout').style.display = 'none';
}
function showAdmin(){
  document.getElementById('loginView').style.display = 'none';
  document.getElementById('adminView').style.display = 'block';
  document.getElementById('btnLogout').style.display = 'inline-block';
  loadItems();
}

document.getElementById('loginBtn').addEventListener('click', doLogin);
document.getElementById('loginPass').addEventListener('keydown', e=>{ if(e.key==='Enter') doLogin(); });

async function doLogin(){
  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;
  document.getElementById('loginErr').style.display = 'none';
  try{
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password })
    });
    if(!res.ok){
      const data = await res.json().catch(()=>({}));
      document.getElementById('loginErr').textContent = data.error || 'Usuario o contraseña incorrectos.';
      document.getElementById('loginErr').style.display = 'block';
      return;
    }
    document.getElementById('loginPass').value = '';
    showAdmin();
  }catch(e){
    document.getElementById('loginErr').textContent = 'No se pudo conectar con el servidor.';
    document.getElementById('loginErr').style.display = 'block';
  }
}

document.getElementById('btnLogout').addEventListener('click', async ()=>{
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  showLogin();
});

async function loadItems(){
  document.getElementById('adminCount').textContent = 'cargando…';
  try{
    const res = await fetch('/api/items', { credentials: 'include' });
    const data = await res.json();
    allItems = data.items || [];
  }catch(e){
    allItems = [];
    toast('No se pudo cargar el listado.');
  }
  paintAdminList(allItems);
}

function paintAdminList(list){
  document.getElementById('adminCount').textContent = list.length + ' prenda' + (list.length===1?'':'s');
  const wrap = document.getElementById('adminList');
  if(list.length===0){
    wrap.innerHTML = '<p style="font-size:13px;color:rgba(27,31,42,0.5);">Todavía no hay prendas cargadas.</p>';
    return;
  }
  wrap.innerHTML = list.map(i => `
    <div class="admin-row">
      <img src="${(i.images && i.images[0]) ? i.images[0].url : ''}">
      <div class="grow">${escapeHtml(i.name)}<small>${CATEGORY_LABELS[i.category]} · ${GENDER_LABELS[i.gender]} · ${money(i.price)} · stock ${i.stock} · ${(i.images||[]).length} foto${(i.images||[]).length===1?'':'s'}</small></div>
      <button class="icon-btn" data-edit="${i._id}">✎</button>
      <button class="icon-btn" data-del="${i._id}">🗑</button>
    </div>
  `).join('');
  wrap.querySelectorAll('[data-edit]').forEach(b=> b.addEventListener('click', ()=> loadIntoForm(b.dataset.edit)));
  wrap.querySelectorAll('[data-del]').forEach(b=> b.addEventListener('click', ()=> deleteItem(b.dataset.del)));
}

document.getElementById('adminSearch').addEventListener('input', e=>{
  const q = e.target.value.trim().toLowerCase();
  paintAdminList(allItems.filter(i => (i.name||'').toLowerCase().includes(q)));
});

document.getElementById('uploadBox').addEventListener('click', ()=> document.getElementById('fileInput').click());
document.getElementById('fileInput').addEventListener('change', e=>{
  const files = Array.from(e.target.files || []);
  const totalCount = existingImages.filter(img=>keepPublicIds.includes(img.publicId)).length + pendingFiles.length;
  const room = MAX_IMAGES - totalCount;
  if(room <= 0){ toast('Ya tienes el máximo de 6 fotos.'); e.target.value=''; return; }
  pendingFiles.push(...files.slice(0, room));
  e.target.value = ''; // permite volver a elegir aunque sea el mismo archivo
  renderThumbs();
});

function renderThumbs(){
  document.getElementById('uploadLabel').textContent = 'Toca para agregar fotos';

  const existWrap = document.getElementById('existingThumbs');
  existWrap.innerHTML = existingImages
    .filter(img => keepPublicIds.includes(img.publicId))
    .map(img => `
      <div class="thumb">
        <img src="${img.url}">
        <span class="thumb-tag">actual</span>
        <button type="button" class="thumb-remove" data-remove-existing="${img.publicId}">×</button>
      </div>
    `).join('');
  existWrap.querySelectorAll('[data-remove-existing]').forEach(b=>{
    b.addEventListener('click', ()=>{
      keepPublicIds = keepPublicIds.filter(id => id !== b.dataset.removeExisting);
      renderThumbs();
    });
  });

  const pendWrap = document.getElementById('pendingThumbs');
  pendWrap.innerHTML = '';
  pendingFiles.forEach((file, idx) => {
    const div = document.createElement('div');
    div.className = 'thumb';
    div.innerHTML = `<img><span class="thumb-tag">nueva</span><button type="button" class="thumb-remove" data-remove-pending="${idx}">×</button>`;
    const reader = new FileReader();
    reader.onload = ev => { div.querySelector('img').src = ev.target.result; };
    reader.readAsDataURL(file);
    pendWrap.appendChild(div);
  });
  pendWrap.querySelectorAll('[data-remove-pending]').forEach(b=>{
    b.addEventListener('click', ()=>{
      pendingFiles.splice(Number(b.dataset.removePending), 1);
      renderThumbs();
    });
  });
}

document.getElementById('saveItem').addEventListener('click', async ()=>{
  const name = document.getElementById('fName').value.trim();
  if(!name){ toast('Ponle un nombre a la prenda.'); return; }

  const fd = new FormData();
  fd.append('name', name);
  fd.append('category', document.getElementById('fCat').value);
  fd.append('gender', document.getElementById('fGender').value);
  fd.append('size', document.getElementById('fSize').value.trim());
  fd.append('color', document.getElementById('fColor').value.trim());
  fd.append('price', document.getElementById('fPrice').value || 0);
  fd.append('stock', document.getElementById('fStock').value || 0);
  fd.append('notes', document.getElementById('fNotes').value.trim());
  pendingFiles.forEach(file => fd.append('images', file));
  if(editingId) fd.append('keepImages', JSON.stringify(keepPublicIds));

  const url = editingId ? `/api/items/${editingId}` : '/api/items';
  const method = editingId ? 'PUT' : 'POST';

  try{
    const res = await fetch(url, { method, credentials: 'include', body: fd });
    if(!res.ok){
      const data = await res.json().catch(()=>({}));
      toast(data.error || 'No se pudo guardar.');
      return;
    }
    toast(editingId ? 'Prenda actualizada.' : 'Prenda agregada.');
    clearFormFields();
    await loadItems();
  }catch(e){
    toast('Error de conexión al guardar.');
  }
});

document.getElementById('clearForm').addEventListener('click', clearFormFields);
function clearFormFields(){
  editingId = null;
  pendingFiles = [];
  existingImages = [];
  keepPublicIds = [];
  document.getElementById('formTitle').textContent = 'Agregar prenda';
  ['fName','fSize','fColor','fPrice','fStock','fNotes'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('fCat').value = 'uniformes_clinicos';
  document.getElementById('fGender').value = 'hombre';
  renderThumbs();
}

function loadIntoForm(id){
  const i = allItems.find(x=>x._id===id);
  if(!i) return;
  editingId = id;
  pendingFiles = [];
  existingImages = i.images || [];
  keepPublicIds = existingImages.map(img => img.publicId);
  document.getElementById('formTitle').textContent = 'Editar prenda';
  document.getElementById('fName').value = i.name||'';
  document.getElementById('fCat').value = i.category;
  document.getElementById('fGender').value = i.gender;
  document.getElementById('fSize').value = i.size||'';
  document.getElementById('fColor').value = i.color||'';
  document.getElementById('fPrice').value = i.price||'';
  document.getElementById('fStock').value = i.stock||'';
  document.getElementById('fNotes').value = i.notes||'';
  renderThumbs();
  window.scrollTo(0,0);
}

async function deleteItem(id){
  try{
    const res = await fetch(`/api/items/${id}`, { method: 'DELETE', credentials: 'include' });
    if(!res.ok){ toast('No se pudo eliminar.'); return; }
    toast('Prenda eliminada.');
    if(editingId===id) clearFormFields();
    await loadItems();
  }catch(e){
    toast('Error de conexión al eliminar.');
  }
}

checkSession();