// ── CONFIG ────────────────────────────────────────────────
var CRM_CATS = [
  {id:'re_partners',   label:'RE Partners',         color:'#0A7A88'},
  {id:'re_clients',    label:'RE Clients',           color:'#E04F28'},
  {id:'friends_money', label:'Friends w/ Money',     color:'#B83368'},
  {id:'service',       label:'Service Providers',    color:'#C98A10'},
  {id:'vae',           label:'VAE Testament',        color:'#2D5C3A'},
  {id:'uae_pw',        label:'UAE Property Wills',   color:'#7A3D8A'},
  {id:'glamping',      label:'Glamping/Hospitality', color:'#8A6A2A'},
  {id:'others',        label:'Others',               color:'#7A6E5A'},
];
var CRM_LOCS  = ['Bali','Lombok','Saba','Emirates','Netherlands','Nomads'];
var CRM_TEMPS = [
  {id:'hot',    label:'Hot',     color:'#E04F28'},
  {id:'warm',   label:'Warm',    color:'#C98A10'},
  {id:'cold',   label:'Cold',    color:'#0A7A88'},
  {id:'someday',label:'Someday', color:'#7A6E5A'},
];
var CAT_COLORS = ['#E04F28','#B83368','#0A7A88','#C98A10','#2D5C3A','#7A6E5A','#7A3D8A','#8A6A2A','#1A1208'];

// ── STATE ─────────────────────────────────────────────────
var crmDB        = null;
var crmContacts  = {};
var crmCustomCats= {};
var crmLoaded    = false;
var crmFilter    = {search:'', loc:'', cat:'', temp:''};
var cms          = {}; // contact modal state
var cmsNewCatColor = CAT_COLORS[0];

// ── UTILS ─────────────────────────────────────────────────
function ctd(){ var n=new Date(); return n.getFullYear()+'-'+cp2(n.getMonth()+1)+'-'+cp2(n.getDate()); }
function cp2(n){ return n<10?'0'+n:''+n; }
function cuid(){ return 'crm'+Date.now().toString(36)+Math.random().toString(36).substr(2,5); }
function ce(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// ── INIT ──────────────────────────────────────────────────
function crmInit(){
  if(localStorage.getItem('andaluma-auth') !== 'ok'){
    document.getElementById('pin-screen').style.display = 'flex';
    document.getElementById('crm-app').style.display    = 'none';
    return;
  }
  crmBoot();
}

function crmBoot(){
  document.getElementById('pin-screen').style.display = 'none';
  document.getElementById('crm-app').style.display    = 'flex';
  try{
    var fbConfig={apiKey:'AIzaSyAeYXakpwzgmbl0_Spf2phpBlXjYe_9STA',authDomain:'andaluma-planner.firebaseapp.com',
      databaseURL:'https://andaluma-planner-default-rtdb.firebaseio.com',projectId:'andaluma-planner',
      storageBucket:'andaluma-planner.firebasestorage.app',messagingSenderId:'87759928843',
      appId:'1:87759928843:web:052df60638080d9ad9110e'};
    if(!firebase.apps.length) firebase.initializeApp(fbConfig);
    crmDB = firebase.database();
    crmDB.ref('crm_contacts').on('value',function(snap){
      crmContacts = snap.val()||{};
      crmLoaded   = true;
      renderCRM();
    });
    crmDB.ref('crm_categories').on('value',function(snap){
      crmCustomCats = snap.val()||{};
      if(crmLoaded) renderCRM();
    });
  }catch(ex){ crmLoaded=true; renderCRM(); }
}

// ── CATEGORIES ────────────────────────────────────────────
function getAllCats(){
  var all = CRM_CATS.slice();
  Object.keys(crmCustomCats).forEach(function(k){ all.push(crmCustomCats[k]); });
  return all;
}
function findCat(id){
  var all=getAllCats();
  for(var i=0;i<all.length;i++) if(all[i].id===id) return all[i];
  return null;
}
function findTemp(id){
  for(var i=0;i<CRM_TEMPS.length;i++) if(CRM_TEMPS[i].id===id) return CRM_TEMPS[i];
  return null;
}

// ── FILTER ────────────────────────────────────────────────
function getFiltered(){
  var arr=Object.keys(crmContacts).map(function(k){ return crmContacts[k]; });
  if(crmFilter.search){
    var s=crmFilter.search.toLowerCase();
    arr=arr.filter(function(c){
      return (c.name||'').toLowerCase().indexOf(s)>=0||
             (c.email||'').toLowerCase().indexOf(s)>=0||
             (c.phone||'').toLowerCase().indexOf(s)>=0;
    });
  }
  if(crmFilter.loc)  arr=arr.filter(function(c){ return (c.locations||[]).indexOf(crmFilter.loc)>=0; });
  if(crmFilter.cat)  arr=arr.filter(function(c){ return (c.categories||[]).indexOf(crmFilter.cat)>=0; });
  if(crmFilter.temp) arr=arr.filter(function(c){ return c.temperature===crmFilter.temp; });
  arr.sort(function(a,b){ return (b.createdAt||0)-(a.createdAt||0); });
  return arr;
}
function toggleFilter(type,val){
  crmFilter[type] = crmFilter[type]===val ? '' : val;
  renderCRM();
}

// ── RENDER ────────────────────────────────────────────────
function renderCRM(){
  if(!crmLoaded) return;
  renderFilterBar();
  var contacts = getFiltered();
  var el = document.getElementById('crm-list');
  if(!el) return;
  var total = Object.keys(crmContacts).length;
  if(!contacts.length){
    el.innerHTML = '<div class="crm-empty">'+(total?'No matches — clear a filter to see contacts.':'No contacts yet.\nTap + to add your first one.')+'</div>';
    return;
  }
  var countLabel = contacts.length+(total!==contacts.length?' of '+total:'')+' contact'+(contacts.length!==1?'s':'');
  el.innerHTML = '<div class="crm-count">'+countLabel+'</div>'+contacts.map(cardHTML).join('');
}

function renderFilterBar(){
  var fb=document.getElementById('crm-filters'); if(!fb) return;
  var html='<div class="crm-filter-row">';
  CRM_TEMPS.forEach(function(t){
    var on=crmFilter.temp===t.id;
    html+='<button class="crm-chip'+(on?' on':'')+'" style="'+(on?'background:'+t.color+';border-color:'+t.color:'border-color:'+t.color+';color:'+t.color)+'" onclick="toggleFilter(\'temp\',\''+t.id+'\')">'+t.label+'</button>';
  });
  html+='</div><div class="crm-filter-row" style="margin-top:6px">';
  CRM_LOCS.forEach(function(l){
    var on=crmFilter.loc===l;
    html+='<button class="crm-chip'+(on?' on':'')+'" onclick="toggleFilter(\'loc\',\''+l+'\')">'+l+'</button>';
  });
  html+='</div>';
  fb.innerHTML=html;
}

function cardHTML(c){
  var tm=findTemp(c.temperature);
  var dot=tm?'<span class="crm-temp-dot" style="background:'+tm.color+'"></span>':'';
  var badge=tm?'<span class="crm-temp-badge" style="background:'+tm.color+'">'+tm.label+'</span>':'';
  var catTags=(c.categories||[]).map(function(id){
    var cat=findCat(id); if(!cat) return '';
    return '<span class="crm-tag" style="background:'+cat.color+'18;color:'+cat.color+';border-color:'+cat.color+'40">'+ce(cat.label)+'</span>';
  }).join('');
  var locTags=(c.locations||[]).map(function(l){
    return '<span class="crm-tag crm-tag-loc">'+l+'</span>';
  }).join('');
  var today=ctd();
  var lastStr=c.lastContact?'<span class="crm-meta-item">Last: '+c.lastContact+'</span>':'';
  var nextStr=c.nextContact?'<span class="crm-meta-item'+(c.nextContact<today?' crm-overdue':'')+'">Next: '+c.nextContact+'</span>':'';
  return '<div class="crm-card" onclick="openDetail(\''+ce(c.id)+'\')">'
    +'<div class="crm-card-top"><div class="crm-card-name">'+dot+ce(c.name||'')+'</div>'+badge+'</div>'
    +(catTags||locTags?'<div class="crm-tags">'+catTags+locTags+'</div>':'')
    +((lastStr||nextStr)?'<div class="crm-meta">'+lastStr+nextStr+'</div>':'')
    +'</div>';
}

// ── CONTACT DETAIL ────────────────────────────────────────
function openDetail(id){
  var c=crmContacts[id]; if(!c) return;
  openModal(buildDetailHTML(id));
}

function buildDetailHTML(id){
  var c=crmContacts[id]; if(!c) return '';
  var tm=findTemp(c.temperature);
  var catTags=(c.categories||[]).map(function(cid){
    var cat=findCat(cid); if(!cat) return '';
    return '<span class="crm-tag" style="background:'+cat.color+'18;color:'+cat.color+';border-color:'+cat.color+'40">'+ce(cat.label)+'</span>';
  }).join('');
  var locTags=(c.locations||[]).map(function(l){
    return '<span class="crm-tag crm-tag-loc">'+l+'</span>';
  }).join('');
  var today=ctd();
  var html='<div class="mhandle"></div>';
  html+='<div class="crm-detail-hdr"><div class="crm-detail-name">'+ce(c.name||'')+'</div>';
  if(tm) html+='<span class="crm-temp-badge" style="background:'+tm.color+'">'+tm.label+'</span>';
  html+='</div>';
  if(catTags||locTags) html+='<div class="crm-tags" style="padding:0 20px 12px">'+catTags+locTags+'</div>';
  var infos=[];
  if(c.phone){
    var wp=c.phone.replace(/[^\d]/g,'');
    infos.push(
      '<div class="crm-phone-row">'+
      '<a class="crm-info-link" href="tel:'+ce(c.phone)+'">📞 '+ce(c.phone)+'</a>'+
      '<a class="crm-wa-btn" href="whatsapp://send?phone='+wp+'" title="WhatsApp">'+
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.978-1.41A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" fill="#25D366"/><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="white"/></svg>'+
        ' WA</a>'+
      '<a class="crm-wa-btn crm-wa-biz" href="whatsappbusiness://send?phone='+wp+'" title="WhatsApp Business">'+
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.978-1.41A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" fill="#128C7E"/><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="white"/></svg>'+
        ' Biz</a>'+
      '</div>'
    );
  }
  if(c.email) infos.push('<a class="crm-info-link" href="mailto:'+ce(c.email)+'">✉️ '+ce(c.email)+'</a>');
  if(c.website) infos.push('<a class="crm-info-link" href="'+ce(c.website)+'" target="_blank">🌐 '+ce(c.website)+'</a>');
  if(infos.length) html+='<div class="crm-info-list">'+infos.join('')+'</div>';
  if(c.lastContact||c.nextContact){
    html+='<div class="crm-date-row">';
    if(c.lastContact) html+='<div class="crm-date-item"><div class="crm-date-lbl">Last contact</div><div class="crm-date-val">'+c.lastContact+'</div></div>';
    if(c.nextContact) html+='<div class="crm-date-item"><div class="crm-date-lbl">Next contact</div><div class="crm-date-val'+(c.nextContact<today?' crm-overdue':'')+'">'+c.nextContact+'</div></div>';
    html+='</div>';
  }
  var comments=(c.comments||[]).slice().reverse();
  html+='<div class="crm-sec-title">Comments <span class="crm-sec-count">'+comments.length+'</span></div>';
  html+='<div class="crm-comment-add">'
    +'<textarea class="crm-comment-input" id="new-comment-txt" placeholder="Add a note…" rows="2"></textarea>'
    +'<button class="crm-comment-btn" onclick="addComment(\''+id+'\')">Add</button>'
    +'</div>';
  if(comments.length){
    html+='<div class="crm-comments">';
    comments.forEach(function(cm){
      var d=new Date(cm.createdAt||0);
      var dStr=d.getDate()+' '+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]+' '+d.getFullYear();
      html+='<div class="crm-comment"><div class="crm-comment-date">'+dStr+'</div><div class="crm-comment-text">'+ce(cm.text)+'</div></div>';
    });
    html+='</div>';
  }
  html+='<div class="crm-detail-actions">'
    +'<button class="btn-sec" style="flex:1" onclick="openEditContact(\''+id+'\')">Edit</button>'
    +'<button class="btn-pri" style="width:auto;flex:2;margin:0" onclick="closeModal()">Done</button>'
    +'</div><div style="height:20px"></div>';
  return html;
}

function addComment(id){
  var c=crmContacts[id]; if(!c) return;
  var txt=((document.getElementById('new-comment-txt')||{}).value||'').trim();
  if(!txt) return;
  if(!c.comments) c.comments=[];
  c.comments.push({text:txt, createdAt:Date.now()});
  c.lastContact=ctd();
  if(crmDB) crmDB.ref('crm_contacts/'+id).set(c);
  document.getElementById('crm-modal-content').innerHTML=buildDetailHTML(id);
}

// ── ADD / EDIT FORM ───────────────────────────────────────
function openAddContact(prefill){
  cms=prefill||{id:cuid(),name:'',phone:'',email:'',website:'',locations:[],categories:[],temperature:'warm',comments:[],lastContact:'',nextContact:'',createdAt:Date.now()};
  openModal(buildFormHTML());
}

function openEditContact(id){
  var c=crmContacts[id]; if(!c) return;
  cms=JSON.parse(JSON.stringify(c));
  document.getElementById('crm-modal-content').innerHTML=buildFormHTML();
}

function buildFormHTML(){
  var isEdit=!!(crmContacts[cms.id]);
  var all=getAllCats();
  var html='<div class="mhandle"></div><div class="mtitle">'+(isEdit?'Edit contact':'New contact')+'</div>';
  if('contacts' in navigator && 'ContactsManager' in window){
    html+='<button class="crm-phone-btn" onclick="pickFromPhone()">📱 Import from phone contacts</button>';
  }
  html+='<div class="fg"><label class="flbl">Name *</label><input class="finput" id="cf-name" value="'+ce(cms.name||'')+'" placeholder="Full name"></div>';
  html+='<div class="fg"><label class="flbl">Phone</label><input class="finput" type="tel" id="cf-phone" value="'+ce(cms.phone||'')+'" placeholder="+1 234 567 890"></div>';
  html+='<div class="fg"><label class="flbl">Email</label><input class="finput" type="email" id="cf-email" value="'+ce(cms.email||'')+'" placeholder="name@email.com"></div>';
  html+='<div class="fg"><label class="flbl">Website</label><input class="finput" type="url" id="cf-website" value="'+ce(cms.website||'')+'" placeholder="https://"></div>';
  // Temperature
  html+='<div class="fg"><label class="flbl">Temperature</label><div class="crm-temp-sel">';
  CRM_TEMPS.forEach(function(t){
    var on=cms.temperature===t.id;
    html+='<button class="crm-temp-opt'+(on?' on':'')+'" style="'+(on?'background:'+t.color+';color:white;border-color:'+t.color:'')+'" onclick="cms.temperature=\''+t.id+'\';document.getElementById(\'crm-modal-content\').innerHTML=buildFormHTML()">'+t.label+'</button>';
  });
  html+='</div></div>';
  // Locations
  html+='<div class="fg"><label class="flbl">Locations</label><div class="crm-chip-grid">';
  CRM_LOCS.forEach(function(l){
    var on=(cms.locations||[]).indexOf(l)>=0;
    html+='<button class="crm-chip'+(on?' on':'')+'" onclick="cmsToggle(\'locations\',\''+l+'\')">'+l+'</button>';
  });
  html+='</div></div>';
  // Categories
  html+='<div class="fg"><label class="flbl">Categories</label><div class="crm-chip-grid">';
  all.forEach(function(cat){
    var on=(cms.categories||[]).indexOf(cat.id)>=0;
    html+='<button class="crm-chip'+(on?' on':'')+'" style="'+(on?'background:'+cat.color+'25;color:'+cat.color+';border-color:'+cat.color:'border-color:'+cat.color+'60;color:'+cat.color)+'" onclick="cmsToggle(\'categories\',\''+cat.id+'\')">'+ce(cat.label)+'</button>';
  });
  html+='</div><button class="crm-add-cat-btn" onclick="openAddCat()">+ New category</button></div>';
  // Dates
  html+='<div style="display:flex;gap:10px;padding:0 20px;margin-bottom:14px">';
  html+='<div style="flex:1"><label class="flbl">Last contact</label><input class="fdate" type="date" id="cf-last" value="'+ce(cms.lastContact||'')+'"></div>';
  html+='<div style="flex:1"><label class="flbl">Next contact</label><input class="fdate" type="date" id="cf-next" value="'+ce(cms.nextContact||'')+'"></div>';
  html+='</div>';
  if(isEdit){
    html+='<div style="display:flex;gap:10px;margin:0 20px 16px">';
    html+='<button class="btn-sec" style="flex:1;color:var(--coral);border-color:var(--coral)" onclick="deleteCRMContact(\''+cms.id+'\')">Delete</button>';
    html+='<button class="btn-pri" style="width:auto;flex:2;margin:0" onclick="submitContact()">Save</button>';
    html+='</div>';
  } else {
    html+='<button class="btn-pri" onclick="submitContact()">Save contact</button>';
  }
  html+='<div style="height:16px"></div>';
  return html;
}

function cmsToggle(field,val){
  cms[field]=cms[field]||[];
  var idx=cms[field].indexOf(val);
  if(idx>=0) cms[field].splice(idx,1); else cms[field].push(val);
  document.getElementById('crm-modal-content').innerHTML=buildFormHTML();
}

function submitContact(){
  var name=((document.getElementById('cf-name')||{}).value||'').trim();
  if(!name){ alert('Enter a name.'); return; }
  cms.name    = name;
  cms.phone   = ((document.getElementById('cf-phone')||{}).value||'').trim();
  cms.email   = ((document.getElementById('cf-email')||{}).value||'').trim();
  cms.website = ((document.getElementById('cf-website')||{}).value||'').trim();
  var prevNext = cms.nextContact;
  cms.lastContact = ((document.getElementById('cf-last')||{}).value||'');
  cms.nextContact = ((document.getElementById('cf-next')||{}).value||'');
  if(!cms.createdAt) cms.createdAt=Date.now();
  cms.updatedAt=Date.now();
  crmContacts[cms.id]=cms;
  if(crmDB) crmDB.ref('crm_contacts/'+cms.id).set(cms);
  if(cms.nextContact && cms.nextContact!==prevNext){
    createPlannerTask('Follow up: '+cms.name, cms.nextContact, cms.id);
  }
  closeModal();
  cms={};
}

function deleteCRMContact(id){
  if(!confirm('Delete this contact?')) return;
  delete crmContacts[id];
  if(crmDB) crmDB.ref('crm_contacts/'+id).remove();
  closeModal();
}

// ── PHONE CONTACTS ────────────────────────────────────────
function pickFromPhone(){
  if(!('contacts' in navigator)) return;
  navigator.contacts.select(['name','tel','email'],{multiple:false}).then(function(res){
    if(!res||!res.length) return;
    var c=res[0];
    cms.name  = (c.name&&c.name[0])||cms.name;
    cms.phone = (c.tel&&c.tel[0])||cms.phone;
    cms.email = (c.email&&c.email[0])||cms.email;
    document.getElementById('crm-modal-content').innerHTML=buildFormHTML();
  }).catch(function(){});
}

// ── CATEGORY MANAGER ─────────────────────────────────────
function openCatManager(){
  var html='<div class="mhandle"></div><div class="mtitle">Manage tags</div>';
  var custom=Object.keys(crmCustomCats).map(function(k){ return crmCustomCats[k]; });
  html+='<div class="crm-sec-title">Built-in</div>';
  html+='<div style="padding:0 20px 12px;display:flex;flex-wrap:wrap;gap:6px">';
  CRM_CATS.forEach(function(cat){
    html+='<span class="crm-tag" style="background:'+cat.color+'18;color:'+cat.color+';border-color:'+cat.color+'40">'+ce(cat.label)+'</span>';
  });
  html+='</div>';
  if(custom.length){
    html+='<div class="crm-sec-title">Custom <span class="crm-sec-count">'+custom.length+'</span></div>';
    html+='<div style="padding:0 20px 12px;display:flex;flex-direction:column;gap:8px">';
    custom.forEach(function(cat){
      html+='<div style="display:flex;align-items:center;gap:10px">'
        +'<span class="crm-tag" style="background:'+cat.color+'18;color:'+cat.color+';border-color:'+cat.color+'40;flex:1">'+ce(cat.label)+'</span>'
        +'<button style="background:none;border:none;color:var(--coral);font-size:18px;line-height:1;padding:4px" onclick="deleteCustomCat(\''+cat.id+'\')">×</button>'
        +'</div>';
    });
    html+='</div>';
  }
  html+='<button class="btn-pri" onclick="openAddCat()">+ New tag</button>'
    +'<div style="height:16px"></div>';
  openModal(html);
}

function deleteCustomCat(id){
  delete crmCustomCats[id];
  if(crmDB) crmDB.ref('crm_categories/'+id).remove();
  openCatManager();
}

// ── CUSTOM CATEGORY ───────────────────────────────────────
function openAddCat(){
  var swatches=CAT_COLORS.map(function(col,i){
    return '<button class="crm-color-swatch'+(i===0?' on':'')+'" style="background:'+col+'" onclick="cmsNewCatColor=\''+col+'\';document.querySelectorAll(\'.crm-color-swatch\').forEach(function(b){b.classList.remove(\'on\')});this.classList.add(\'on\')"></button>';
  }).join('');
  var html='<div class="mhandle"></div><div class="mtitle">New category</div>'
    +'<div class="fg"><label class="flbl">Label</label><input class="finput" id="newcat-label" placeholder="e.g. Investors"></div>'
    +'<div class="fg"><label class="flbl">Colour</label><div class="crm-color-grid">'+swatches+'</div></div>'
    +'<button class="btn-pri" onclick="saveNewCat()">Save category</button>'
    +'<div style="height:16px"></div>';
  cmsNewCatColor=CAT_COLORS[0];
  document.getElementById('crm-modal-content').innerHTML=html;
}

function saveNewCat(){
  var label=((document.getElementById('newcat-label')||{}).value||'').trim();
  if(!label){ alert('Enter a label.'); return; }
  var id='cat'+Date.now().toString(36);
  var cat={id:id, label:label, color:cmsNewCatColor||'#7A6E5A'};
  crmCustomCats[id]=cat;
  if(crmDB) crmDB.ref('crm_categories/'+id).set(cat);
  document.getElementById('crm-modal-content').innerHTML=buildFormHTML();
}

// ── PLANNER INTEGRATION ───────────────────────────────────
function createPlannerTask(text, date, crmId){
  if(!crmDB) return;
  var tid='t'+Date.now().toString(36)+Math.random().toString(36).substr(2,4);
  crmDB.ref('tasks/'+tid).set({id:tid,text:text,date:date,owner:'andre',venture:'personal',done:false,createdAt:Date.now(),crmContactId:crmId||null});
}

// ── MODAL ─────────────────────────────────────────────────
function openModal(html){
  document.getElementById('crm-modal-content').innerHTML=html;
  document.getElementById('crm-modal').style.display='flex';
  history.pushState({modal:true},'');
}
function closeModal(){
  document.getElementById('crm-modal').style.display='none';
  if(history.state&&history.state.modal) history.back();
}
function bgClose(ev){ if(ev.target===document.getElementById('crm-modal')) closeModal(); }
window.addEventListener('popstate',function(){
  var m=document.getElementById('crm-modal');
  if(m&&m.style.display!=='none'){ m.style.display='none'; }
});

// ── PIN ────────────────────────────────────────────────────
var _PIN='1213', _pinEntry='';
function pinKey(n){ if(_pinEntry.length>=4) return; _pinEntry+=String(n); _updDots(); if(_pinEntry.length===4) setTimeout(_checkPin,100); }
function pinDel(){ _pinEntry=_pinEntry.slice(0,-1); _updDots(); document.getElementById('pin-error').textContent=''; }
function _updDots(){ document.querySelectorAll('.pdot').forEach(function(d,i){ i<_pinEntry.length?d.classList.add('filled'):d.classList.remove('filled'); }); }
function _checkPin(){
  if(_pinEntry===_PIN){ localStorage.setItem('andaluma-auth','ok'); document.getElementById('pin-screen').style.display='none'; crmBoot(); }
  else { document.getElementById('pin-error').textContent='Wrong PIN. Try again.'; _pinEntry=''; _updDots(); }
}
document.addEventListener('click',function(ev){
  var btn=ev.target; while(btn&&!btn.getAttribute('data-n')&&btn!==document.body) btn=btn.parentElement;
  if(!btn||!btn.getAttribute('data-n')) return;
  var ps=document.getElementById('pin-screen'); if(!ps||ps.style.display==='none') return;
  ev.preventDefault(); var n=btn.getAttribute('data-n'); if(n==='del') pinDel(); else pinKey(parseInt(n));
});
document.addEventListener('keydown',function(ev){
  var ps=document.getElementById('pin-screen'); if(!ps||ps.style.display==='none') return;
  if(ev.key>='0'&&ev.key<='9') pinKey(parseInt(ev.key));
  if(ev.key==='Backspace') pinDel();
});

document.addEventListener('DOMContentLoaded', crmInit);
