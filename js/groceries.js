// ── GROCERY LIST ──────────────────────────────────────────
// Two Firebase nodes under groceries/:
//   catalog/{id}  every product ever added, with how often and when last bought
//   list/{id}     what is on the list right now
//
// The catalog is what makes "add from recent" work without any extra bookkeeping:
// every item you add is remembered, so the reminder list builds itself.
//
// Designed with the meal planner in mind (next phase):
//   - items carry a unit, so a recipe can say 500 g rice rather than 2 rice
//   - adding an item that is already listed merges quantities instead of
//     creating a duplicate row
//   - list items record a `source`, so a meal's ingredients can later be
//     identified and pulled back out as a group

// Category order is deliberately the order you walk a shop, not alphabetical.
// Alphabetical would send you back and forth across the store.
var GROC_CATS = [
  {id:'produce',   label:'Produce',       icon:'🥬', color:'#2D5C3A'},
  {id:'bakery',    label:'Bakery',        icon:'🥖', color:'#C98A10'},
  {id:'dairy',     label:'Dairy & eggs',  icon:'🥚', color:'#0A7A88'},
  {id:'meatfish',  label:'Meat & fish',   icon:'🐟', color:'#E04F28'},
  {id:'frozen',    label:'Frozen',        icon:'🧊', color:'#1B3D6B'},
  {id:'pantry',    label:'Pantry',        icon:'🍚', color:'#7A6E5A'},
  {id:'snacks',    label:'Snacks',        icon:'🍫', color:'#B83368'},
  {id:'drinks',    label:'Drinks',        icon:'🧃', color:'#0A7A88'},
  {id:'household', label:'Household',     icon:'🧻', color:'#7A6E5A'},
  {id:'care',      label:'Personal care', icon:'🧴', color:'#B83368'},
  {id:'other',     label:'Other',         icon:'•',  color:'#7A6E5A'},
];
var GROC_UNITS = ['pcs','g','kg','ml','L','pack','bunch','box'];

// ── STATE ─────────────────────────────────────────────────
var grocCatalog = {};
var grocList    = {};
var grocLoaded  = false;
var grocQuery   = '';
var gms         = {};   // new-item modal state
var grocPicks   = {};   // ticked rows in the "add from recent" sheet

// ── FIREBASE ──────────────────────────────────────────────
function loadGroceriesData(){
  if(!db || offline){
    // Offline: fall back to the last known list so a shop with no signal
    // still shows something useful.
    try{
      grocCatalog = JSON.parse(localStorage.getItem('andaluma-groc-catalog')||'{}');
      grocList    = JSON.parse(localStorage.getItem('andaluma-groc-list')||'{}');
    }catch(ex){ grocCatalog={}; grocList={}; }
    grocLoaded = true;
    renderGroceries();
    renderGrocBadge();
    return;
  }
  db.ref('groceries/catalog').on('value',function(snap){
    grocCatalog = snap.val()||{};
    lss('andaluma-groc-catalog', JSON.stringify(grocCatalog));
    if(grocLoaded) renderGrocList();
  });
  db.ref('groceries/list').on('value',function(snap){
    grocList = snap.val()||{};
    lss('andaluma-groc-list', JSON.stringify(grocList));
    grocLoaded = true;
    renderGrocList();
    renderGrocBadge();
  });
}

function grocPersistList(id){
  lss('andaluma-groc-list', JSON.stringify(grocList));
  if(db && !offline) db.ref('groceries/list/'+id).set(grocList[id] || null);
}
function grocPersistCatalog(id){
  lss('andaluma-groc-catalog', JSON.stringify(grocCatalog));
  if(db && !offline) db.ref('groceries/catalog/'+id).set(grocCatalog[id] || null);
}

// ── HELPERS ───────────────────────────────────────────────
function grocUid(){ return 'g'+Date.now().toString(36)+Math.random().toString(36).substr(2,4); }
function grocCat(id){
  for(var i=0;i<GROC_CATS.length;i++) if(GROC_CATS[i].id===id) return GROC_CATS[i];
  return GROC_CATS[GROC_CATS.length-1];   // Other
}
// Loose match so "Milk", "milk " and "MILK" are the same product.
function grocNorm(s){ return String(s||'').trim().toLowerCase().replace(/\s+/g,' '); }

function grocFindCatalog(name){
  var n = grocNorm(name);
  var keys = Object.keys(grocCatalog);
  for(var i=0;i<keys.length;i++){
    if(grocNorm(grocCatalog[keys[i]].name) === n) return grocCatalog[keys[i]];
  }
  return null;
}
function grocFindListRow(name){
  var n = grocNorm(name);
  var keys = Object.keys(grocList);
  for(var i=0;i<keys.length;i++){
    if(grocNorm(grocList[keys[i]].name) === n) return grocList[keys[i]];
  }
  return null;
}

// Ranks the "add from recent" sheet. Frequently bought items float up,
// but something bought last week still beats something bought in March.
function grocScore(it){
  var days = it.lastBought ? (Date.now()-it.lastBought)/86400000 : 999;
  return (it.timesBought||0)*10 - Math.min(days, 400);
}

// "2×" for loose pieces, "500 g" for anything measured. A single piece
// needs no label at all.
function grocQtyLabel(qty, unit){
  qty = qty||1;
  if(!unit || unit==='pcs') return qty>1 ? qty+'×' : '';
  return qty+' '+unit;
}

// ── ADDING ────────────────────────────────────────────────
// Single entry point for every way an item reaches the list: typing,
// the recent sheet, and later the meal planner. Merging lives here so
// every caller gets it for free.
function grocAdd(name, category, unit, qty, source){
  name = String(name||'').trim();
  if(!name) return null;
  qty = parseFloat(qty)||1;
  unit = unit || 'pcs';

  // Keep the catalog in step, creating the entry the first time we see it.
  var cat = grocFindCatalog(name);
  if(!cat){
    var cid = grocUid();
    cat = {id:cid, name:name, category:category||'other', unit:unit, timesBought:0, lastBought:0};
    grocCatalog[cid] = cat;
    grocPersistCatalog(cid);
  } else if(category && cat.category !== category){
    cat.category = category;
    grocPersistCatalog(cat.id);
  }

  // Already on the list: add to it rather than creating a second row.
  var row = grocFindListRow(name);
  if(row){
    if(row.unit === unit) row.qty = (parseFloat(row.qty)||1) + qty;
    else row.qty = (parseFloat(row.qty)||1) + qty;  // mixed units: still one row, keep the original unit
    row.checked = false;   // re-adding something means it is wanted again
    grocPersistList(row.id);
    return row;
  }

  var id = grocUid();
  grocList[id] = {
    id:id, catalogId:cat.id, name:name, category:cat.category||'other',
    qty:qty, unit:unit, checked:false,
    source:source||'manual', addedAt:Date.now()
  };
  grocPersistList(id);
  return grocList[id];
}

function grocSetQty(id, delta){
  var r = grocList[id]; if(!r) return;
  var step = (!r.unit || r.unit==='pcs' || r.unit==='pack' || r.unit==='bunch' || r.unit==='box') ? 1
           : (r.unit==='kg' || r.unit==='L') ? 0.5 : 50;
  var next = Math.round(((parseFloat(r.qty)||1) + delta*step)*100)/100;
  if(next <= 0){ grocRemove(id); return; }
  r.qty = next;
  grocPersistList(id);
  renderGrocList();
}

function grocToggle(id){
  var r = grocList[id]; if(!r) return;
  r.checked = !r.checked;
  grocPersistList(id);
  renderGrocList();
  renderGrocBadge();
}

function grocRemove(id){
  if(!grocList[id]) return;
  delete grocList[id];
  lss('andaluma-groc-list', JSON.stringify(grocList));
  if(db && !offline) db.ref('groceries/list/'+id).remove();
  renderGrocList();
  renderGrocBadge();
}

// End of a shop: banked items leave the list and teach the catalog.
// This is what makes the recent sheet smarter every week.
function grocDone(){
  var ids = Object.keys(grocList).filter(function(k){ return grocList[k].checked; });
  if(!ids.length){ alert('Nothing is ticked off yet.'); return; }
  if(!confirm('Clear '+ids.length+' ticked item'+(ids.length===1?'':'s')+' and remember them for next time?')) return;
  ids.forEach(function(id){
    var r = grocList[id];
    var cat = grocCatalog[r.catalogId] || grocFindCatalog(r.name);
    if(cat){
      cat.timesBought = (cat.timesBought||0)+1;
      cat.lastBought  = Date.now();
      grocPersistCatalog(cat.id);
    }
    delete grocList[id];
    if(db && !offline) db.ref('groceries/list/'+id).remove();
  });
  lss('andaluma-groc-list', JSON.stringify(grocList));
  renderGrocList();
  renderGrocBadge();
}

// ── BADGE ─────────────────────────────────────────────────
function renderGrocBadge(){
  var b = document.getElementById('groc-badge');
  if(!b) return;
  var open = Object.keys(grocList).filter(function(k){ return !grocList[k].checked; }).length;
  b.style.display = open>0 ? 'block' : 'none';
}

// ── RENDER ────────────────────────────────────────────────
// The shell is drawn once and kept. A Firebase update repaints only the list,
// so a background sync can never wipe out what you are half-way through typing.
function renderGroceries(){
  var el = document.getElementById('groceries-view');
  if(!el || el.style.display==='none') return;
  if(!document.getElementById('groc-body')){
    el.innerHTML =
      '<div class="groc-head">'+
        '<div class="groc-title">Shopping list</div>'+
        '<button class="groc-recent-btn" onclick="openGrocRecent()">↺ Add from recent</button>'+
      '</div>'+
      '<div class="groc-addwrap">'+
        '<input type="text" class="groc-input" id="groc-input" autocomplete="off" '+
          'placeholder="Type to add an item…" '+
          'oninput="grocOnType(this.value)" onkeydown="grocKey(event)">'+
        '<div class="groc-suggest" id="groc-suggest"></div>'+
      '</div>'+
      '<div id="groc-body"></div>';
  }
  renderGrocList();
}

function grocOnType(v){
  grocQuery = v;
  renderGrocSuggest();
}

// Enter adds the top suggestion, or the typed text if there is none.
function grocKey(ev){
  if(ev.key !== 'Enter') return;
  ev.preventDefault();
  var q = grocQuery.trim();
  if(!q) return;
  var hit = grocFindCatalog(q) || grocSuggestions()[0];
  if(hit) grocAddFromCatalog(hit.id);
  else openGrocNew(q);
}

function grocSuggestions(){
  var q = grocNorm(grocQuery);
  if(!q) return [];
  return Object.keys(grocCatalog).map(function(k){ return grocCatalog[k]; })
    .filter(function(it){ return grocNorm(it.name).indexOf(q) >= 0; })
    .sort(function(a,b){ return grocScore(b)-grocScore(a); })
    .slice(0,8);
}

function renderGrocSuggest(){
  var box = document.getElementById('groc-suggest');
  if(!box) return;
  var q = grocQuery.trim();
  if(!q){ box.innerHTML=''; box.style.display='none'; return; }
  var hits = grocSuggestions();
  var html = hits.map(function(it){
    var c = grocCat(it.category);
    return '<div class="groc-sug" onclick="grocAddFromCatalog(\''+e(it.id)+'\')">'+
      '<span class="groc-sug-ic">'+c.icon+'</span>'+
      '<span class="groc-sug-name">'+e(it.name)+'</span>'+
      '<span class="groc-sug-cat">'+e(c.label)+'</span></div>';
  }).join('');
  if(!grocFindCatalog(q)){
    html += '<div class="groc-sug groc-sug-new" onclick="openGrocNew('+JSON.stringify(q).replace(/"/g,'&quot;')+')">'+
      '<span class="groc-sug-ic">+</span>'+
      '<span class="groc-sug-name">Add “'+e(q)+'” as a new item</span></div>';
  }
  box.innerHTML = html;
  box.style.display = 'block';
}

function grocClearInput(){
  grocQuery = '';
  var i = document.getElementById('groc-input');
  if(i){ i.value=''; i.focus(); }
  renderGrocSuggest();
}

function grocAddFromCatalog(cid){
  var it = grocCatalog[cid]; if(!it) return;
  grocAdd(it.name, it.category, it.unit||'pcs', 1, 'manual');
  grocClearInput();
  renderGrocList();
  renderGrocBadge();
}

function renderGrocList(){
  var body = document.getElementById('groc-body');
  if(!body) return;
  var rows = Object.keys(grocList).map(function(k){ return grocList[k]; });

  if(!rows.length){
    body.innerHTML = '<div class="groc-empty">Nothing on the list.<br>'+
      'Type above, or tap <strong>Add from recent</strong> to pull in your usual shop.</div>';
    return;
  }

  var open = rows.filter(function(r){ return !r.checked; }).length;
  var html = '<div class="groc-count">'+open+' to get'+
    (rows.length-open>0 ? ' · '+(rows.length-open)+' in the basket' : '')+'</div>';

  // Walk the categories in aisle order and skip any that are empty.
  GROC_CATS.forEach(function(c){
    var inCat = rows.filter(function(r){ return (r.category||'other')===c.id; });
    if(!inCat.length) return;
    // Unticked first inside each aisle, then alphabetical, so the list stays
    // steady as you shop instead of reshuffling under your thumb.
    inCat.sort(function(a,b){
      if(!!a.checked !== !!b.checked) return a.checked ? 1 : -1;
      return grocNorm(a.name) < grocNorm(b.name) ? -1 : 1;
    });
    html += '<div class="groc-cat-hd" style="color:'+c.color+'">'+c.icon+' '+e(c.label)+'</div>';
    inCat.forEach(function(r){
      var ql = grocQtyLabel(r.qty, r.unit);
      html += '<div class="groc-row'+(r.checked?' done':'')+'">'+
        '<button class="groc-chk'+(r.checked?' on':'')+'" onclick="grocToggle(\''+e(r.id)+'\')">'+
          (r.checked?'✓':'')+'</button>'+
        '<div class="groc-name" onclick="grocToggle(\''+e(r.id)+'\')">'+e(r.name)+
          (ql?'<span class="groc-qty">'+e(ql)+'</span>':'')+'</div>'+
        '<div class="groc-steps">'+
          '<button class="groc-step" onclick="grocSetQty(\''+e(r.id)+'\',-1)">−</button>'+
          '<button class="groc-step" onclick="grocSetQty(\''+e(r.id)+'\',1)">+</button>'+
        '</div></div>';
    });
  });

  if(rows.length-open > 0){
    html += '<button class="groc-done-btn" onclick="grocDone()">Done shopping · clear '+
      (rows.length-open)+' ticked</button>';
  }
  html += '<div style="height:24px"></div>';
  body.innerHTML = html;
}

// ── NEW ITEM SHEET ────────────────────────────────────────
function openGrocNew(name){
  gms = {name:String(name||''), category:'other', unit:'pcs', qty:1};
  openModal(buildGrocNew());
}

function buildGrocNew(){
  var catChips = GROC_CATS.map(function(c){
    var on = gms.category===c.id;
    return '<button class="groc-chip'+(on?' on':'')+'" style="'+
      (on?'background:'+c.color+';border-color:'+c.color+';color:#fff':'border-color:'+c.color+'55;color:'+c.color)+
      '" onclick="gmsSet(\'category\',\''+c.id+'\')">'+c.icon+' '+e(c.label)+'</button>';
  }).join('');
  var unitChips = GROC_UNITS.map(function(u){
    var on = gms.unit===u;
    return '<button class="groc-chip'+(on?' on':'')+'" onclick="gmsSet(\'unit\',\''+u+'\')">'+u+'</button>';
  }).join('');
  return '<div class="mhandle"></div><div class="mtitle">New item</div>'+
    '<div class="fg"><label class="flbl">Name</label>'+
    '<input type="text" class="finput" id="gms-name" value="'+e(gms.name)+'" '+
      'oninput="gms.name=this.value" placeholder="e.g. Oat milk"></div>'+
    '<div class="fg"><label class="flbl">Aisle</label>'+
    '<div class="groc-chips">'+catChips+'</div></div>'+
    '<div class="fg"><label class="flbl">Unit</label>'+
    '<div class="groc-chips">'+unitChips+'</div></div>'+
    '<div class="fg"><label class="flbl">Quantity</label>'+
    '<input type="number" class="finput" id="gms-qty" value="'+e(gms.qty)+'" min="0" step="any" '+
      'oninput="gms.qty=this.value"></div>'+
    '<button class="btn-pri" onclick="submitGrocNew()">Add to list</button>'+
    '<div style="height:16px"></div>';
}

// Read the text fields back before repainting, otherwise tapping an aisle
// chip would wipe whatever was typed. Same trap as the CRM contact form.
function gmsSet(field, val){
  var n = document.getElementById('gms-name'); if(n) gms.name = n.value;
  var q = document.getElementById('gms-qty');  if(q) gms.qty  = q.value;
  gms[field] = val;
  document.getElementById('mcontent').innerHTML = buildGrocNew();
}

function submitGrocNew(){
  var n = document.getElementById('gms-name');
  var q = document.getElementById('gms-qty');
  var name = ((n&&n.value)||gms.name||'').trim();
  if(!name){ alert('Enter a name.'); return; }
  var qty = parseFloat((q&&q.value)||gms.qty||1)||1;
  grocAdd(name, gms.category, gms.unit, qty, 'manual');
  closeModal();
  grocClearInput();
  renderGrocList();
  renderGrocBadge();
}

// ── ADD FROM RECENT ───────────────────────────────────────
function openGrocRecent(){
  grocPicks = {};
  openModal(buildGrocRecent());
}

function buildGrocRecent(){
  var items = Object.keys(grocCatalog).map(function(k){ return grocCatalog[k]; })
    .filter(function(it){ return (it.timesBought||0) > 0; })
    .sort(function(a,b){ return grocScore(b)-grocScore(a); })
    .slice(0,60);

  var html = '<div class="mhandle"></div><div class="mtitle">Add from recent</div>';
  if(!items.length){
    html += '<div class="groc-empty" style="padding:24px 20px">Nothing remembered yet.<br>'+
      'Once you tick items off and tap <strong>Done shopping</strong>, they show up here.</div>'+
      '<button class="btn-pri" onclick="closeModal()">Close</button><div style="height:16px"></div>';
    return html;
  }

  html += '<div class="groc-recent-sub">Your usual shop, most likely first. '+
    'Tick what you need.</div><div class="groc-recent-list">';
  items.forEach(function(it){
    var c = grocCat(it.category);
    var on = !!grocPicks[it.id];
    var onList = !!grocFindListRow(it.name);
    html += '<div class="groc-rec'+(on?' on':'')+'" onclick="grocPick(\''+e(it.id)+'\')">'+
      '<button class="groc-chk'+(on?' on':'')+'">'+(on?'✓':'')+'</button>'+
      '<div class="groc-rec-body">'+
        '<div class="groc-rec-name">'+e(it.name)+
          (onList?'<span class="groc-rec-already">on list</span>':'')+'</div>'+
        '<div class="groc-rec-meta">'+c.icon+' '+e(c.label)+' · bought '+(it.timesBought||0)+'×'+
          (it.lastBought?' · '+grocAgo(it.lastBought):'')+'</div>'+
      '</div></div>';
  });
  html += '</div>';

  var n = Object.keys(grocPicks).length;
  html += '<button class="btn-pri" onclick="addGrocPicks()"'+(n?'':' disabled style="opacity:.45"')+'>'+
    (n ? 'Add '+n+' item'+(n===1?'':'s') : 'Select items to add')+'</button>'+
    '<div style="height:16px"></div>';
  return html;
}

function grocAgo(ts){
  var d = Math.floor((Date.now()-ts)/86400000);
  if(d <= 0) return 'today';
  if(d === 1) return 'yesterday';
  if(d < 14) return d+' days ago';
  if(d < 60) return Math.round(d/7)+' weeks ago';
  return Math.round(d/30)+' months ago';
}

function grocPick(cid){
  if(grocPicks[cid]) delete grocPicks[cid];
  else grocPicks[cid] = true;
  document.getElementById('mcontent').innerHTML = buildGrocRecent();
}

function addGrocPicks(){
  var ids = Object.keys(grocPicks);
  if(!ids.length) return;
  ids.forEach(function(cid){
    var it = grocCatalog[cid];
    if(it) grocAdd(it.name, it.category, it.unit||'pcs', 1, 'recent');
  });
  grocPicks = {};
  closeModal();
  renderGrocList();
  renderGrocBadge();
}
