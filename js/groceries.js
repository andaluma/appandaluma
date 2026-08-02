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

// ── SEED CATALOG ──────────────────────────────────────────
// Recovered from the WhatsApp shopping lists, Dec 2025 to Jul 2026, which were
// a mix of English, Spanish and Dutch. Spanish names are folded into their
// English equivalent rather than kept as duplicates: palta = avocado,
// avena = oats, piña = pineapple, sponche = sponge, guantes = gloves,
// molde = sandwich loaf.
//
// Format: name | aisle | unit | times bought | days since last bought
//
// The counts are how often each item actually appeared across those lists, so
// the "add from recent" sheet is useful on day one instead of after a month of
// use. Bread, eggs and soda water top it because they genuinely recur most.
//
// Durables at the bottom carry 0 buys on purpose. The recent sheet only shows
// items bought at least once, so a laptop or a bike stays out of the weekly
// reminder while still autocompleting if you type it.
var GROC_SEED = [
  // Produce
  'Potato|produce|kg|4|12',      'Banana|produce|pcs|2|13',
  'Red onion|produce|pcs|2|4',   'White onion|produce|pcs|1|13',
  'Pineapple|produce|pcs|3|13',  'Avocado|produce|pcs|3|4',
  'Tomato|produce|pcs|2|12',     'Papaya|produce|pcs|1|13',
  'Carrot|produce|pcs|1|18',     'Ginger|produce|pcs|1|12',
  'Lime|produce|pcs|1|4',        'Frying banana|produce|pcs|1|13',
  'Fruit (mixed)|produce|pcs|3|4','Mixed berries|produce|pcs|1|11',
  // Bakery
  'Bread|bakery|pcs|5|4',        'Ciabatta|bakery|pcs|1|18',
  'Sandwich bread|bakery|pcs|1|18',
  // Dairy and eggs
  'Milk|dairy|L|3|18',           'Chocolate milk|dairy|L|1|18',
  'Butter|dairy|pcs|3|4',        'Eggs|dairy|pcs|4|4',
  // Meat and fish
  'Chicken|meatfish|kg|3|4',     'Minced meat|meatfish|kg|1|19',
  'Pork|meatfish|kg|1|19',       'Ham|meatfish|pcs|1|19',
  'Hotdog|meatfish|pcs|1|19',    'Meat|meatfish|kg|3|4',
  // Pantry
  'Rice|pantry|g|1|13',          'Pasta|pantry|pcs|2|13',
  'Flour|pantry|g|2|13',         'Sugar|pantry|g|2|18',
  'Olive oil|pantry|pcs|3|18',   'Salt|pantry|pcs|2|12',
  'Tomato sauce|pantry|pcs|2|19','Tuna|pantry|pcs|2|19',
  'Lentils|pantry|pcs|1|19',     'Beans|pantry|pcs|1|4',
  'Oats|pantry|pcs|2|4',         'Peanut butter|pantry|pcs|1|13',
  'Honey|pantry|pcs|1|4',        'Soy sauce|pantry|pcs|1|4',
  'Tortillas|pantry|pcs|3|4',    'Baking powder|pantry|pcs|1|7',
  'Food colouring|pantry|pcs|1|4',
  // Snacks
  'Dried mango|snacks|pcs|2|18', 'Chips|snacks|pcs|1|150',
  // Drinks
  'Soda water|drinks|L|5|4',
  // Household
  'Toilet paper|household|pcs|2|12','Kitchen paper|household|pcs|1|4',
  'Detergent|household|pcs|2|150', 'Dish soap|household|pcs|1|220',
  'Sponge|household|pcs|1|220',    'Plastic gloves|household|pcs|1|220',
  'A4 paper|household|pcs|1|202',  'Washing line rope|household|pcs|1|150',
  'Washing clips|household|pcs|1|150',
  // Personal care
  'Shower cap|care|pcs|1|220',   'Kids toothbrushes|care|pcs|1|4',
  // One-offs: typeable, but kept out of the recent sheet by the zero count
  'Floaties|other|pcs|0|0',      'Kids bathroom stool|other|pcs|0|0',
  'Laptop stand|other|pcs|0|0',  'Hangers|other|pcs|0|0',
  'Storage box|other|pcs|0|0',   'Gas cooker|other|pcs|0|0',
  'Bicycle seat|other|pcs|0|0',  'Bicycle|other|pcs|0|0',
  'Towels|other|pcs|0|0',        'Cutting board|other|pcs|0|0',
  'SIM card|other|pcs|0|0',      'Desk chair|other|pcs|0|0',
  'Laptop|other|pcs|0|0',
];
var GROC_SEED_VERSION = 1;
var grocSeedTried = false;

// Runs once, only into an empty catalog. If there is already real history the
// version marker is set and nothing is written, so this can never overwrite
// items you have built up yourself.
function grocMaybeSeed(){
  if(grocSeedTried || !db || offline) return;
  grocSeedTried = true;
  db.ref('groceries/seedVersion').once('value', function(snap){
    if((snap.val()||0) >= GROC_SEED_VERSION) return;
    if(Object.keys(grocCatalog).length){
      db.ref('groceries/seedVersion').set(GROC_SEED_VERSION);
      return;
    }
    var batch = {}, now = Date.now();
    GROC_SEED.forEach(function(row){
      var p = row.split('|');
      var id = 'seed_'+p[0].toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
      var times = parseInt(p[3],10)||0;
      batch[id] = {
        id:id, name:p[0], category:p[1], unit:p[2],
        timesBought: times,
        lastBought: times>0 ? now - (parseInt(p[4],10)||0)*86400000 : 0
      };
    });
    db.ref('groceries/catalog').update(batch);
    db.ref('groceries/seedVersion').set(GROC_SEED_VERSION);
  });
}

// ── STATE ─────────────────────────────────────────────────
var grocCatalog = {};
var grocList    = {};
var grocLoaded  = false;
var grocQuery   = '';
var gms         = {};   // new-item modal state
var grocPicks   = {};   // ticked rows in the "add from recent" sheet
var grocSecOpen = {};   // which aisles are expanded there, kept across reopens

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
    grocMaybeSeed();   // first run only, and only into an empty catalog
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

// Grouped by aisle, collapsed by default. Eleven headers fit on one screen, so
// you get the whole map at a glance and open only the aisles you need, instead
// of scrolling one flat list of sixty items.
function buildGrocRecent(){
  var all = Object.keys(grocCatalog).map(function(k){ return grocCatalog[k]; })
    .filter(function(it){ return (it.timesBought||0) > 0; });

  var html = '<div class="mhandle"></div><div class="mtitle">Add from recent</div>';
  if(!all.length){
    html += '<div class="groc-empty" style="padding:24px 20px">Nothing remembered yet.<br>'+
      'Once you tick items off and tap <strong>Done shopping</strong>, they show up here.</div>'+
      '<button class="btn-pri" onclick="closeModal()">Close</button><div style="height:16px"></div>';
    return html;
  }

  var anyOpen = GROC_CATS.some(function(c){ return grocSecOpen[c.id]; });
  html += '<div class="groc-recent-sub">'+
    '<span>Your usual shop, by aisle. Tap an aisle to open it.</span>'+
    '<button class="groc-expand-all" onclick="grocAllSections('+(anyOpen?'false':'true')+')">'+
      (anyOpen?'Collapse all':'Expand all')+'</button></div>';

  html += '<div class="groc-recent-list">';
  GROC_CATS.forEach(function(c){
    var items = all.filter(function(it){ return (it.category||'other')===c.id; })
      .sort(function(a,b){ return grocScore(b)-grocScore(a); });
    if(!items.length) return;
    var open = !!grocSecOpen[c.id];
    var picked = items.filter(function(it){ return grocPicks[it.id]; }).length;

    html += '<div class="groc-rec-sec">'+
      '<div class="groc-rec-hd" onclick="grocSecToggle(\''+c.id+'\')">'+
        '<span class="groc-rec-hd-ic">'+c.icon+'</span>'+
        '<span class="groc-rec-hd-lbl" style="color:'+c.color+'">'+e(c.label)+'</span>'+
        '<span class="groc-rec-hd-n" id="grn-'+c.id+'">'+grocSecCount(picked, items.length)+'</span>'+
        '<span class="groc-rec-hd-ar'+(open?' open':'')+'" id="gra-'+c.id+'">›</span>'+
      '</div>'+
      '<div class="groc-rec-items" id="grb-'+c.id+'" style="display:'+(open?'block':'none')+'">';

    items.forEach(function(it){
      var on = !!grocPicks[it.id];
      var onList = !!grocFindListRow(it.name);
      html += '<div class="groc-rec'+(on?' on':'')+'" id="grr-'+e(it.id)+'" '+
          'onclick="grocPick(\''+e(it.id)+'\')">'+
        '<button class="groc-chk'+(on?' on':'')+'">'+(on?'✓':'')+'</button>'+
        '<div class="groc-rec-body">'+
          '<div class="groc-rec-name">'+e(it.name)+
            (onList?'<span class="groc-rec-already">on list</span>':'')+'</div>'+
          '<div class="groc-rec-meta">bought '+(it.timesBought||0)+'×'+
            (it.lastBought?' · '+grocAgo(it.lastBought):'')+'</div>'+
        '</div></div>';
    });
    html += '</div></div>';
  });
  html += '</div>';

  html += '<button class="btn-pri" id="groc-add-btn" onclick="addGrocPicks()">'+
    grocAddBtnLabel()+'</button><div style="height:16px"></div>';
  return html;
}

function grocSecCount(picked, total){
  return picked>0 ? picked+' / '+total : ''+total;
}
function grocAddBtnLabel(){
  var n = Object.keys(grocPicks).length;
  return n ? 'Add '+n+' item'+(n===1?'':'s') : 'Select items to add';
}

function grocSecToggle(cid){
  grocSecOpen[cid] = !grocSecOpen[cid];
  var body = document.getElementById('grb-'+cid);
  var arrow = document.getElementById('gra-'+cid);
  if(body)  body.style.display = grocSecOpen[cid] ? 'block' : 'none';
  if(arrow) arrow.className = 'groc-rec-hd-ar'+(grocSecOpen[cid]?' open':'');
}

function grocAllSections(open){
  GROC_CATS.forEach(function(c){ grocSecOpen[c.id] = !!open; });
  document.getElementById('mcontent').innerHTML = buildGrocRecent();
}

function grocAgo(ts){
  var d = Math.floor((Date.now()-ts)/86400000);
  if(d <= 0) return 'today';
  if(d === 1) return 'yesterday';
  if(d < 14) return d+' days ago';
  if(d < 60) return Math.round(d/7)+' weeks ago';
  return Math.round(d/30)+' months ago';
}

// Touches only the three things that changed: the row, its aisle count, and the
// footer button. Rebuilding the sheet here would throw away your scroll position
// and close every section you had opened, on every single tap.
function grocPick(cid){
  var it = grocCatalog[cid]; if(!it) return;
  var on = !grocPicks[cid];
  if(on) grocPicks[cid] = true; else delete grocPicks[cid];

  var row = document.getElementById('grr-'+cid);
  if(row){
    row.className = 'groc-rec'+(on?' on':'');
    var box = row.querySelector('.groc-chk');
    if(box){ box.className = 'groc-chk'+(on?' on':''); box.textContent = on?'✓':''; }
  }

  var catId = it.category||'other';
  var lbl = document.getElementById('grn-'+catId);
  if(lbl){
    var inCat = Object.keys(grocCatalog).map(function(k){ return grocCatalog[k]; })
      .filter(function(x){ return (x.category||'other')===catId && (x.timesBought||0)>0; });
    var picked = inCat.filter(function(x){ return grocPicks[x.id]; }).length;
    lbl.textContent = grocSecCount(picked, inCat.length);
    lbl.className = 'groc-rec-hd-n'+(picked>0?' has':'');
  }

  var btn = document.getElementById('groc-add-btn');
  if(btn) btn.textContent = grocAddBtnLabel();
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
