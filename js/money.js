// ── CURRENCIES ───────────────────────────────────────────
var CURRENCIES = [
  'EUR','USD','GBP','AED','JPY','KRW','TWD','VND','CNY',
  'MXN','CAD','PEN','AUD','CHF','SGD','THB','IDR','MYR',
  'PHP','INR','BRL','COP','CLP','TRY','NOK','SEK','DKK',
  'NZD','ZAR','HKD','SAR','QAR','KWD','BHD','MNT','RUB','GEL'
];

// ── FIREBASE MONEY DATA ──────────────────────────────────
// Guard: true only after all three nodes have delivered their first snapshot.
// persistMoney / persistExpense / removeExpense are no-ops until this is true,
// preventing startup race conditions from wiping data.
var moneyDataLoaded = false;

function loadMoneyData(){
  if(db && !offline){
    var _t=false, _e=false, _f=false;
    function _checkLoaded(){ if(_t&&_e&&_f) moneyDataLoaded=true; }
    db.ref('trips').on('value', function(snap){
      MS.trips = snap.val()||{};
      if(!_t){ _t=true; _checkLoaded(); }
      if(!MS.activeTripId) autoSelectTrip();
      renderMoney(); renderInsights();
    });
    db.ref('expenses').on('value', function(snap){
      MS.expenses = snap.val()||{};
      if(!_e){ _e=true; _checkLoaded(); }
      renderMoney(); renderInsights();
    });
    db.ref('fixedExpenses').on('value', function(snap){
      MS.fixedExpenses = snap.val()||{};
      if(!_f){ _f=true; _checkLoaded(); }
      renderMoney();
    });
  } else {
    moneyDataLoaded = true; // offline mode — no Firebase writes anyway
  }
}

// Saves trips + fixedExpenses. Expenses are written individually via persistExpense/removeExpense.
function persistMoney(){
  if(db && !offline && moneyDataLoaded){
    db.ref('trips').set(MS.trips);
    db.ref('fixedExpenses').set(MS.fixedExpenses);
  }
}

// Write a single expense record — never touches any other record.
function persistExpense(id){
  if(db && !offline && moneyDataLoaded && MS.expenses[id]){
    db.ref('expenses').child(id).set(MS.expenses[id]);
  }
}

// Remove a single expense record — never touches any other record.
function removeExpense(id){
  if(db && !offline && moneyDataLoaded){
    db.ref('expenses').child(id).remove();
  }
}

function muid(){ return 'e'+Date.now().toString(36)+Math.random().toString(36).substr(2,4); }

// ── RENDER MONEY TAB ─────────────────────────────────────
function renderMoney(){
  renderTripBar();
  renderMoneyDayBar();
  renderMoneyContent();
}

var showPastTrips = false;
function togglePastTrips(){ showPastTrips = !showPastTrips; renderTripBar(); }

function renderTripBar(){
  var el = document.getElementById('money-trip-bar');
  if(!el) return;
  var today = td();
  var trips = Object.values(MS.trips);
  trips.sort(function(a,b){
    var aActive = a.id === MS.activeTripId, bActive = b.id === MS.activeTripId;
    if(aActive && !bActive) return -1;
    if(!aActive && bActive) return 1;
    return (b.startDate||'') > (a.startDate||'') ? 1 : -1;
  });
  var visible = trips.filter(function(t){
    if(t.id === MS.activeTripId) return true;
    if(showPastTrips) return true;
    var end = t.endDate || t.startDate;
    return !end || end >= today;
  });
  var hiddenCount = trips.length - visible.length;
  var html = '<div class="trip-bar">';
  visible.forEach(function(t){
    var on = t.id === MS.activeTripId;
    html += '<button class="trip-chip'+(on?' on':'')+'" onclick="setActiveTrip(\''+e(t.id)+'\')">'+e(t.name)+'</button>';
  });
  html += '<button class="trip-chip add" onclick="openAddTrip()">+ Trip</button>';
  if(hiddenCount > 0 || showPastTrips){
    html += '<button class="trip-chip past-toggle" onclick="togglePastTrips()">'+(showPastTrips ? 'Hide past' : hiddenCount+' past')+'</button>';
  }
  // Insights icon — right-aligned in the trip bar
  html += '<button class="trip-chip" onclick="showInsights()" title="Insights" style="margin-left:auto;background:rgba(10,122,136,0.18);color:rgba(255,255,255,0.75)">◑ Insights</button>';
  html += '</div>';
  el.innerHTML = html;
}

function isBizTrip(t){ return t.name && /business/i.test(t.name); }

function autoSelectTrip(){
  var today = td();
  var trips = Object.values(MS.trips);
  var travel = trips.filter(function(t){ return !isBizTrip(t); });
  var current = travel.find(function(t){
    return t.startDate && t.startDate <= today && (!t.endDate || t.endDate >= today);
  });
  if(current){ MS.activeTripId = current.id; return; }
  var past = travel.filter(function(t){ return t.startDate && t.startDate <= today; });
  past.sort(function(a,b){ return (b.startDate||'')>(a.startDate||'') ? 1 : -1; });
  if(past.length){ MS.activeTripId = past[0].id; return; }
  var future = travel.filter(function(t){ return t.startDate && t.startDate > today; });
  future.sort(function(a,b){ return (a.startDate||'')>(b.startDate||'') ? 1 : -1; });
  if(future.length){ MS.activeTripId = future[0].id; return; }
  if(trips.length){ MS.activeTripId = trips[0].id; }
}

function exportBackup(){
  var data = { exportDate: new Date().toISOString(), tasks: S.tasks, trips: MS.trips, expenses: MS.expenses, fixedExpenses: MS.fixedExpenses };
  var blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'andaluma-backup-' + td() + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

function openSettings(){
  openModal('<div class="mhandle"></div><div class="mtitle">Settings</div>'+
    '<div class="alist">'+
    '<div class="aitem" onclick="exportBackup()"><div class="aicon" style="background:rgba(10,122,136,0.08);color:#0A7A88">⬇️</div>Download backup JSON</div>'+
    '</div>'+
    '<div style="font-size:11px;color:var(--muted);line-height:1.6;margin-top:12px">Your data is automatically backed up in Firebase.</div>'
  );
}

function setActiveTrip(id){ MS.activeTripId = id; renderMoney(); }

function renderMoneyDayBar(){
  var el = document.getElementById('money-day-bar');
  if(!el) return;
  var trip = MS.activeTripId ? MS.trips[MS.activeTripId] : null;
  var budget = trip ? (trip.dailyBudget || 80) : 80;
  var dayExps = expensesForDay(MS.moneyDate);
  var spent = dayExps.reduce(function(s,ex){ return s + (ex.eurAmount||0); }, 0);
  var pct = Math.min(100, Math.round(spent/budget*100));
  var color = pct > 100 ? '#C0392B' : pct > 80 ? '#C98A10' : '#2D5C3A';
  var today = td();
  var days = [];
  for(var i=13; i>=0; i--) days.push(addDays(today, -i));
  var stripH = '<div class="mday-strip" id="mday-strip-inner">';
  days.forEach(function(d){
    var sel = d===MS.moneyDate, tod = d===today;
    var dn = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(d+'T12:00:00').getDay()];
    var num = new Date(d+'T12:00:00').getDate();
    stripH += '<div class="mday-item'+(sel?' sel':'')+(tod&&!sel?' tod':'')+'" onclick="selMoneyDate(\''+d+'\')">'+
      '<div class="mday-dn">'+dn+'</div><div class="mday-num">'+num+'</div></div>';
  });
  stripH += '</div>';
  var d = new Date(MS.moneyDate+'T12:00:00');
  var label = d.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'short'});
  el.innerHTML = stripH+
    '<div class="money-day-hdr"><div class="money-day-title">'+e(label)+'</div></div>'+
    '<div class="budget-bar-wrap">'+
    '<div class="budget-bar-bg"><div class="budget-bar-fill" style="width:'+pct+'%;background:'+color+'"></div></div>'+
    '<div class="budget-bar-lbl"><span>€'+spent.toFixed(0)+' spent</span><span>€'+budget+'/day budget</span></div>'+
    '</div>';
  setTimeout(function(){
    var strip = document.getElementById('mday-strip-inner');
    if(!strip) return;
    var sel = strip.querySelector('.sel');
    if(sel) sel.scrollIntoView({inline:'center', block:'nearest'});
  }, 0);
}

function selMoneyDate(d){ MS.moneyDate = d; renderMoneyDayBar(); renderMoneyContent(); }

function expensesForDay(date){
  return Object.values(MS.expenses).filter(function(ex){
    if(ex.date !== date) return false;
    if(MS.activeTripId && ex.tripId !== MS.activeTripId) return false;
    return true;
  }).sort(function(a,b){ return (a.createdAt||0)-(b.createdAt||0); });
}

function renderMoneyContent(){
  var el = document.getElementById('money-content');
  if(!el) return;
  var exps = expensesForDay(MS.moneyDate);
  var html = '<div class="exp-list">';
  if(!exps.length){
    html += '<div style="padding:36px 20px;text-align:center"><div style="font-size:28px;margin-bottom:8px">€</div>'+
      '<div style="font-size:13px;color:var(--muted);line-height:1.6">No expenses today.<br>Tap <strong>+</strong> to add one.</div></div>';
  } else {
    exps.forEach(function(ex){
      var cat = CATS[ex.category] || CATS['Others'];
      var ownerTag = ex.owner === 'both' ? '👥' : ex.owner === 'daniella' ? 'D' : 'A';
      html += '<div class="exp-item">'+
        '<div class="exp-cat-icon" style="background:'+cat.color+'22">'+cat.icon+'</div>'+
        '<div class="exp-body"><div class="exp-title">'+e(ex.title||ex.category)+'</div>'+
        '<div class="exp-meta">'+e(ex.category)+' · '+ownerTag+(ex.notes?' · '+e(ex.notes):'')+'</div></div>'+
        '<div class="exp-amt"><div class="exp-eur" style="color:'+cat.color+'">€'+((ex.eurAmount||0).toFixed(2))+'</div>'+
        (ex.originalCurrency !== 'EUR' ? '<div class="exp-orig">'+ex.originalCurrency+' '+((ex.originalAmount||0).toFixed(0))+'</div>' : '')+
        '</div><button class="exp-more" onclick="openExpMenu(\''+e(ex.id)+'\')">⋯</button></div>';
    });
  }
  html += '</div>';
  if(MS.activeTripId){
    var preExps = Object.values(MS.expenses).filter(function(ex){ return ex.tripId === MS.activeTripId && !ex.date; });
    if(preExps.length){
      html += '<div style="padding:14px 20px 6px;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);font-weight:700">Pre-trip expenses</div>';
      html += '<div class="exp-list" style="padding-top:0">';
      preExps.forEach(function(ex){
        var cat = CATS[ex.category]||CATS['Others'];
        html += '<div class="exp-item">'+
          '<div class="exp-cat-icon" style="background:'+cat.color+'22">'+cat.icon+'</div>'+
          '<div class="exp-body"><div class="exp-title">'+e(ex.title||ex.category)+'</div>'+
          '<div class="exp-meta">'+e(ex.category)+'</div></div>'+
          '<div class="exp-amt"><div class="exp-eur" style="color:'+cat.color+'">€'+((ex.eurAmount||0).toFixed(2))+'</div></div>'+
          '<button class="exp-more" onclick="openExpMenu(\''+e(ex.id)+'\')">⋯</button></div>';
      });
      html += '</div>';
    }
  }
  html += renderFixedSection();
  el.innerHTML = html;
}

// ── ADD EXPENSE ──────────────────────────────────────────
var emst = {};
function inferTripCurrency(tripId){
  if(!tripId) return null;
  var trip = MS.trips[tripId];
  if(trip && trip.currency) return trip.currency;
  var counts = {};
  Object.values(MS.expenses).forEach(function(ex){
    if(ex.tripId===tripId && ex.originalCurrency && ex.originalCurrency!=='EUR')
      counts[ex.originalCurrency] = (counts[ex.originalCurrency]||0)+1;
  });
  var best = Object.keys(counts).sort(function(a,b){return counts[b]-counts[a];})[0];
  return best||null;
}

function openAddExpense(){
  var defCur = inferTripCurrency(MS.activeTripId) || 'EUR';
  emst = {
    title:'', category:'Food', owner: S.owner==='both'?'both':S.owner,
    currency:defCur, amount:'', note:'', date:MS.moneyDate,
    tripId: MS.activeTripId||'', preTrip:false,
    checkIn: MS.moneyDate||'', checkOut:'',
    _firstOpen: true,   // focus the amount field only on first open, not on chip redraws
  };
  drawAddExpense();
}

function drawAddExpense(){
  var m = emst;
  var catOpts = Object.keys(CATS).map(function(c){
    var on = c===m.category;
    return '<option value="'+e(c)+'"'+(on?' selected':'')+'>'+CATS[c].icon+' '+c+'</option>';
  }).join('');
  var tripCur = inferTripCurrency(MS.activeTripId);
  var _pinned = [];
  if(tripCur) _pinned.push(tripCur);
  if(_pinned.indexOf('EUR')<0) _pinned.push('EUR');
  if(_pinned.indexOf('USD')<0) _pinned.push('USD');
  var _rest = CURRENCIES.filter(function(c){ return _pinned.indexOf(c)<0; }).sort();
  var _allCurs = _pinned.concat(_rest);
  var trips = Object.values(MS.trips);
  var tripOpts = '<option value="">No trip</option>'+trips.map(function(t){
    return '<option value="'+e(t.id)+'"'+(t.id===m.tripId?' selected':'')+'>'+e(t.name)+'</option>';
  }).join('');
  var os = [{id:'andre',l:'André'},{id:'daniella',l:'Daniella'},{id:'both',l:'Both'}];
  var och = os.map(function(o){
    return '<div class="ochip'+(m.owner===o.id?' on':'')+'" data-o="'+o.id+'" onclick="emst.owner=\''+o.id+'\';drawAddExpense()">'+o.l+'</div>';
  }).join('');
  openModal(
    '<div class="mhandle"></div><div class="mtitle">Add expense</div>'+
    '<div class="fg"><label class="flbl">Amount</label>'+
    '<div style="display:flex;gap:8px">'+
    '<div class="curr-wrap">'+
    '<div class="curr-sel" id="curr-sel-btn" onclick="toggleCurrDD()">'+m.currency+' ▾</div>'+
    '<div class="curr-dd" id="curr-dd" style="display:none">'+
    '<input class="curr-search" id="curr-search" type="text" placeholder="Search..." oninput="filterCurrDD()" autocomplete="off">'+
    '<div class="curr-list" id="curr-list">'+
    _allCurs.map(function(c){return'<div class="curr-item'+(c===m.currency?' sel':'')+(_pinned.indexOf(c)>=0?' pinned':'')+'" onclick="pickCurr(\''+c+'\')">'+c+'</div>';}).join('')+
    '</div></div></div>'+
    '<input type="number" class="finput" id="exp-amt" placeholder="0.00" value="'+e(m.amount)+'" oninput="emst.amount=this.value" style="flex:1">'+
    '</div></div>'+
    '<div class="fg"><label class="flbl">What for</label>'+
    '<input type="text" class="finput" id="exp-title" value="'+e(m.title)+'" placeholder="Description (optional)" oninput="emst.title=this.value"></div>'+
    '<div class="fg"><label class="flbl">Category</label>'+
    '<select class="finput" onchange="emst.category=this.value;drawAddExpense()">'+catOpts+'</select></div>'+
    '<div class="fg"><label class="flbl">Paid by</label><div class="ochips">'+och+'</div></div>'+
    '<div class="fg"><label class="flbl">Trip</label>'+
    '<select class="finput" onchange="emst.tripId=this.value">'+tripOpts+'</select>'+
    '<label class="sdcheck"><input type="checkbox" '+(m.preTrip?'checked':'')+' onchange="emst.preTrip=this.checked;drawAddExpense()"> Pre-trip expense (no specific day)</label></div>'+
    (function(){
      if(m.preTrip) return '';
      if(m.category==='Accommodation'){
        var nights=0, perNightNote='';
        if(m.checkIn && m.checkOut && m.checkOut>m.checkIn){
          nights=Math.round((new Date(m.checkOut)-new Date(m.checkIn))/86400000);
          if(nights>0 && parseFloat(m.amount)>0){
            var pn=(parseFloat(m.amount)/nights).toFixed(2);
            perNightNote=' · '+m.currency+' '+pn+'/night';
          }
        }
        return '<div class="fg"><label class="flbl">Check-in date</label>'+
          '<input type="date" class="fdate" value="'+e(m.checkIn||'')+'" onchange="emst.checkIn=this.value;drawAddExpense()"></div>'+
          '<div class="fg"><label class="flbl">Check-out date</label>'+
          '<input type="date" class="fdate" value="'+e(m.checkOut||'')+'" onchange="emst.checkOut=this.value;drawAddExpense()">'+
          (nights>0?'<div style="font-size:12px;color:var(--amber);margin-top:5px;font-weight:600">'+nights+' night'+(nights===1?'':'s')+perNightNote+'</div>':'')+
          '</div>';
      }
      return '<div class="fg"><label class="flbl">Date</label><input type="date" class="fdate" value="'+e(m.date)+'" onchange="emst.date=this.value"></div>';
    })()+
    '<button class="btn-pri" onclick="submitExpense()">Add expense</button>'
  );
  if(m._firstOpen){
    m._firstOpen = false;
    setTimeout(function(){ var el=document.getElementById('exp-amt'); if(el) el.focus(); }, 80);
  }
}

function toggleCurrDD(){
  var dd=document.getElementById('curr-dd');
  if(!dd)return;
  dd.style.display=dd.style.display==='none'?'block':'none';
  if(dd.style.display==='block'){var s=document.getElementById('curr-search');if(s)s.focus();}
}
function filterCurrDD(){
  var q=(document.getElementById('curr-search')||{}).value||'';
  document.querySelectorAll('#curr-list .curr-item').forEach(function(el){
    el.style.display=el.textContent.toLowerCase().indexOf(q.toLowerCase())>=0?'':'none';
  });
}
function pickCurr(c){
  emst.currency=c;
  var btn=document.getElementById('curr-sel-btn');
  if(btn)btn.textContent=c+' ▾';
  var dd=document.getElementById('curr-dd');
  if(dd)dd.style.display='none';
  document.querySelectorAll('#curr-list .curr-item').forEach(function(el){
    el.classList.toggle('sel',el.textContent.trim()===c);
  });
}

function submitExpense(){
  var amt = parseFloat((document.getElementById('exp-amt')||{}).value||emst.amount||0);
  if(!amt){ alert('Enter an amount.'); return; }
  var title = (document.getElementById('exp-title')||{}).value||emst.title||'';
  if(emst.category==='Accommodation' && !emst.preTrip){
    if(!emst.checkIn || !emst.checkOut || emst.checkOut<=emst.checkIn){ alert('Enter valid check-in and check-out dates.'); return; }
    var nights = Math.round((new Date(emst.checkOut)-new Date(emst.checkIn))/86400000);
    if(nights<1){ alert('Check-out must be after check-in.'); return; }
    fetchRate(emst.currency, function(rate){
      var perNight = amt/nights;
      var eurPerNight = Math.round((emst.currency==='EUR' ? perNight : perNight*rate)*100)/100;
      var perNightOrig = Math.round(perNight*100)/100;
      for(var i=0;i<nights;i++){
        var day=new Date(emst.checkIn); day.setDate(day.getDate()+i);
        var dateStr=day.toISOString().slice(0,10);
        var id=muid();
        MS.expenses[id]={ id:id, title:(title.trim()||'Accommodation'), category:'Accommodation', owner:emst.owner,
          originalAmount:perNightOrig, originalCurrency:emst.currency, eurAmount:eurPerNight, lockedRate:rate,
          date:dateStr, tripId:emst.tripId||null, notes:emst.note||'', createdAt:Date.now()+i, venture:'personal', type:'expense' };
        persistExpense(id); // write each night individually — safe, never touches other records
      }
      closeModal(); renderMoney(); renderInsights();
    });
    return;
  }
  fetchRate(emst.currency, function(rate){
    var eurAmt = emst.currency==='EUR' ? amt : amt * rate;
    var id = muid();
    MS.expenses[id] = { id:id, title:title.trim(), category:emst.category, owner:emst.owner,
      originalAmount:amt, originalCurrency:emst.currency, eurAmount:Math.round(eurAmt*100)/100, lockedRate:rate,
      date:emst.preTrip?null:(emst.date||MS.moneyDate), tripId:emst.tripId||null,
      notes:emst.note||'', createdAt:Date.now(), venture:'personal', type:'expense' };
    persistExpense(id); closeModal(); renderMoney();
  });
}

// ── EXCHANGE RATES ───────────────────────────────────────
var rateCache = {};
// Fallback rates: EUR per 1 unit of foreign currency (updated June 2026)
// Used when Frankfurter is offline OR for currencies Frankfurter does not cover
// (AED, VND, PEN, KWD, BHD, SAR, QAR, COP, CLP, TWD, MNT, RUB, GEL)
var RATE_FALLBACK = {
  USD:0.859, GBP:1.156, JPY:0.00539, KRW:0.000569, TWD:0.0277, CNY:0.127,
  AED:0.234, VND:0.0000333, MXN:0.0496, CAD:0.621, PEN:0.232, AUD:0.616,
  CHF:1.096, SGD:0.672, THB:0.0264, IDR:0.0000481, MYR:0.217, PHP:0.0139,
  INR:0.00904, BRL:0.171, COP:0.000204, CLP:0.000909, TRY:0.0187, NOK:0.0927,
  SEK:0.0927, DKK:0.134, NZD:0.511, ZAR:0.0528, HKD:0.110, SAR:0.229,
  QAR:0.236, KWD:2.79, BHD:2.28, MNT:0.000249, RUB:0.0105, GEL:0.310,
};
function fetchRate(currency, cb){
  if(currency==='EUR'){ cb(1); return; }
  if(rateCache[currency]){ cb(rateCache[currency]); return; }
  fetch('https://api.frankfurter.app/latest?from='+currency+'&to=EUR')
    .then(function(r){ return r.json(); })
    .then(function(data){
      var rate = data.rates && data.rates.EUR ? data.rates.EUR : null;
      if(rate && rate > 0){ rateCache[currency] = rate; cb(rate); }
      else { cb(RATE_FALLBACK[currency] || 1); }
    })
    .catch(function(){ cb(RATE_FALLBACK[currency] || 1); });
}

// ── TRIP MANAGEMENT ──────────────────────────────────────
function openAddTrip(){
  var currOpts = CURRENCIES.map(function(c){ return '<option'+(c==='EUR'?' selected':'')+'>'+c+'</option>'; }).join('');
  openModal(
    '<div class="mhandle"></div><div class="mtitle">New trip</div>'+
    '<div class="fg"><label class="flbl">Destination</label><input type="text" class="finput" id="trip-name" placeholder="e.g. South Korea"></div>'+
    '<div class="fg"><label class="flbl">Local currency</label><select class="finput" id="trip-currency">'+currOpts+'</select></div>'+
    '<div class="fg"><label class="flbl">Daily budget (EUR)</label><input type="number" class="finput" id="trip-budget" placeholder="80" value="80"></div>'+
    '<div class="fg"><label class="flbl">Start date</label><input type="date" class="fdate" id="trip-start" value="'+td()+'"></div>'+
    '<div class="fg"><label class="flbl">End date <span style="font-weight:400;font-size:10px">(optional)</span></label><input type="date" class="fdate" id="trip-end"></div>'+
    '<button class="btn-pri" onclick="submitTrip()">Create trip</button>'
  );
}

function submitTrip(){
  var name = (document.getElementById('trip-name')||{}).value||'';
  if(!name.trim()){ alert('Enter a destination.'); return; }
  var id = muid();
  MS.trips[id] = { id:id, name:name.trim(),
    currency:(document.getElementById('trip-currency')||{}).value||'EUR',
    dailyBudget:parseFloat((document.getElementById('trip-budget')||{}).value||80),
    startDate:(document.getElementById('trip-start')||{}).value||td(),
    endDate:(document.getElementById('trip-end')||{}).value||null, createdAt:Date.now() };
  MS.activeTripId = id;
  persistMoney(); closeModal(); renderMoney();
}

// ── EXP MENU ────────────────────────────────────────────
function openExpMenu(id){
  var ex = MS.expenses[id]; if(!ex) return;
  openModal('<div class="mhandle"></div>'+
    '<div style="font-family:Playfair Display,serif;font-size:17px;margin-bottom:3px">'+e(ex.title||ex.category)+'</div>'+
    '<div style="font-size:11px;color:var(--muted);margin-bottom:20px">'+e(ex.category)+' · €'+(ex.eurAmount||0).toFixed(2)+'</div>'+
    '<div class="alist">'+
    '<div class="aitem" onclick="openEditExpense(\''+id+'\')"><div class="aicon" style="background:rgba(10,122,136,0.08);color:#0A7A88">✏️</div>Edit</div>'+
    '<div class="aitem danger" onclick="delExp(\''+id+'\')"><div class="aicon" style="background:rgba(192,57,43,0.08);color:#C0392B">🗑</div>Delete</div>'+
    '</div>');
}

function delExp(id){
  if(confirm('Delete this expense?')){ removeExpense(id); delete MS.expenses[id]; closeModal(); renderMoney(); renderInsights(); }
}

var eedst = {};
function openEditExpense(id){
  var ex = MS.expenses[id]; if(!ex) return;
  eedst = { id:id, title:ex.title||'', category:ex.category||'Food', owner:ex.owner||'both',
    currency:ex.originalCurrency||'EUR', amount:ex.originalAmount||'', note:ex.notes||'',
    date:ex.date||MS.moneyDate, tripId:ex.tripId||'', preTrip:!ex.date };
  drawEditExpense();
}

function drawEditExpense(){
  var m = eedst;
  var catOpts = Object.keys(CATS).map(function(c){
    return '<option value="'+e(c)+'"'+(c===m.category?' selected':'')+'>'+CATS[c].icon+' '+c+'</option>';
  }).join('');
  var tripCur = inferTripCurrency(MS.activeTripId);
  var pinned = [];
  if(tripCur) pinned.push(tripCur);
  if(pinned.indexOf('USD')<0) pinned.push('USD');
  if(pinned.indexOf('EUR')<0) pinned.push('EUR');
  var rest = CURRENCIES.filter(function(c){ return pinned.indexOf(c)<0; }).sort();
  var currOpts = pinned.concat(rest).map(function(c){ return '<option'+(c===m.currency?' selected':'')+'>'+c+'</option>'; }).join('');
  var trips = Object.values(MS.trips);
  var tripOpts = '<option value="">No trip</option>'+trips.map(function(t){
    return '<option value="'+e(t.id)+'"'+(t.id===m.tripId?' selected':'')+'>'+e(t.name)+'</option>';
  }).join('');
  var os = [{id:'andre',l:'André'},{id:'daniella',l:'Daniella'},{id:'both',l:'Both'}];
  var och = os.map(function(o){
    return '<div class="ochip'+(m.owner===o.id?' on':'')+'" data-o="'+o.id+'" onclick="eedst.owner=\''+o.id+'\';drawEditExpense()">'+o.l+'</div>';
  }).join('');
  openModal(
    '<div class="mhandle"></div><div class="mtitle">Edit expense</div>'+
    '<div class="fg"><label class="flbl">Amount</label><div style="display:flex;gap:8px">'+
    '<select class="finput" style="width:90px;flex-shrink:0" onchange="eedst.currency=this.value">'+currOpts+'</select>'+
    '<input type="number" class="finput" id="eed-amt" placeholder="0.00" value="'+e(String(m.amount))+'" oninput="eedst.amount=this.value" style="flex:1">'+
    '</div></div>'+
    '<div class="fg"><label class="flbl">What for</label><input type="text" class="finput" id="eed-title" value="'+e(m.title)+'" placeholder="Description (optional)" oninput="eedst.title=this.value"></div>'+
    '<div class="fg"><label class="flbl">Category</label><select class="finput" onchange="eedst.category=this.value">'+catOpts+'</select></div>'+
    '<div class="fg"><label class="flbl">Paid by</label><div class="ochips">'+och+'</div></div>'+
    '<div class="fg"><label class="flbl">Trip</label><select class="finput" onchange="eedst.tripId=this.value">'+tripOpts+'</select>'+
    '<label class="sdcheck"><input type="checkbox" '+(m.preTrip?'checked':'')+' onchange="eedst.preTrip=this.checked;drawEditExpense()"> Pre-trip expense (no specific day)</label></div>'+
    (!m.preTrip ? '<div class="fg"><label class="flbl">Date</label><input type="date" class="fdate" value="'+e(m.date||'')+'" onchange="eedst.date=this.value"></div>' : '')+
    '<button class="btn-pri" onclick="submitEditExpense()">Save changes</button>'
  );
}

function submitEditExpense(){
  var id = eedst.id;
  var ex = MS.expenses[id]; if(!ex) return;
  var amt = parseFloat((document.getElementById('eed-amt')||{}).value||eedst.amount||0);
  if(!amt){ alert('Enter an amount.'); return; }
  var title = (document.getElementById('eed-title')||{}).value||eedst.title||'';
  fetchRate(eedst.currency, function(rate){
    var eurAmt = eedst.currency==='EUR' ? amt : amt * rate;
    Object.assign(MS.expenses[id], { title:title.trim(), category:eedst.category, owner:eedst.owner,
      originalAmount:amt, originalCurrency:eedst.currency, eurAmount:Math.round(eurAmt*100)/100, lockedRate:rate,
      date:eedst.preTrip?null:(eedst.date||MS.moneyDate), tripId:eedst.tripId||null, notes:eedst.note||'' });
    persistExpense(id); closeModal(); renderMoney(); renderInsights();
  });
}

// ── MONTHLY FIXED EXPENSES ───────────────────────────────
var fixedSectionOpen = true;

function getCurrentMonthKey(){ var d=new Date(); return d.getFullYear()+'-'+(('0'+(d.getMonth()+1)).slice(-2)); }

// Count how many times a fixed expense falls within a calendar month.
// period: 'monthly' = 1 (if month >= startMonth), 'weekly' = every 7 days, '4weekly' = every 28 days.
// Returns 0 if the startDate is after this month.
function fxOccurrencesInMonth(fx, monthKey){
  var period = fx.period || 'monthly';
  var startDate = fx.startDate || null;

  // If startDate is set and after this month → 0
  if(startDate && monthKey < startDate.substr(0,7)) return 0;

  if(period === 'monthly') return 1;

  // Weekly / 4-weekly: count actual occurrence dates within the month
  // Requires a startDate to anchor the cycle; fall back to 1 if missing
  if(!startDate) return 1;

  var periodDays = period === 'weekly' ? 7 : 28;
  var y = parseInt(monthKey.substr(0,4)), mo = parseInt(monthKey.substr(5,2))-1;
  var monthStart = new Date(y, mo, 1);
  var monthEnd   = new Date(y, mo+1, 0, 23, 59, 59);
  var start = new Date(startDate+'T12:00:00');
  if(start > monthEnd) return 0;

  // Advance from startDate to first occurrence on or after monthStart
  var cur = new Date(start);
  while(cur < monthStart) cur = new Date(cur.getTime() + periodDays*86400000);

  var count = 0;
  while(cur <= monthEnd){ count++; cur = new Date(cur.getTime() + periodDays*86400000); }
  return count;
}

function getFixedAmountForMonth(fx, monthKey){
  var occ = fxOccurrencesInMonth(fx, monthKey);
  if(!occ) return 0;
  if(fx.fixedType === 'hard') return (fx.amount || 0) * occ;
  // soft: confirmedMonths stores the monthly total the user confirmed
  return (fx.confirmedMonths && fx.confirmedMonths[monthKey]) ? fx.confirmedMonths[monthKey] : 0;
}

function isFixedConfirmedForMonth(fx, monthKey){
  var occ = fxOccurrencesInMonth(fx, monthKey);
  if(!occ) return true; // not active this month → treat as confirmed (no pending dot)
  if(fx.fixedType === 'hard') return true;
  return !!(fx.confirmedMonths && fx.confirmedMonths[monthKey]);
}

function fixedTotalForMonth(monthKey){
  return Object.values(MS.fixedExpenses).reduce(function(s,fx){ return s+getFixedAmountForMonth(fx,monthKey); }, 0);
}

function variableTotalForMonth(monthKey){
  return Object.values(MS.expenses).reduce(function(s,ex){
    if(!ex.date || ex.date.substr(0,7)!==monthKey) return s;
    return s+(ex.eurAmount||0);
  }, 0);
}

function fixedByCategoryForMonth(monthKey){
  var cats={};
  Object.values(MS.fixedExpenses).forEach(function(fx){
    var amt=getFixedAmountForMonth(fx,monthKey); if(!amt) return;
    var cat=fx.category||'Others'; cats[cat]=(cats[cat]||0)+amt;
  });
  return cats;
}


function renderFixedSection(){
  var monthKey=getCurrentMonthKey();
  var items=Object.values(MS.fixedExpenses).sort(function(a,b){return(a.createdAt||0)-(b.createdAt||0);});
  var total=items.reduce(function(s,fx){return s+getFixedAmountForMonth(fx,monthKey);},0);
  var hasUnconfirmed=items.some(function(fx){return fx.fixedType==='soft'&&!isFixedConfirmedForMonth(fx,monthKey);});
  var html='<div class="fixed-section"><div class="fixed-hdr">'+
    '<div class="fixed-hdr-title">Monthly Fixed'+(total?'<span style="font-weight:400;color:var(--dark)"> €'+total.toFixed(0)+'</span>':'')+
    (hasUnconfirmed?'<span style="color:var(--amber);font-size:8px">●</span>':'')+'</div>'+
    '<div class="fixed-hdr-right"><button class="fixed-add-btn" onclick="openAddFixed()">+</button>'+
    '<button class="fixed-toggle-btn" onclick="toggleFixedSection()">'+(fixedSectionOpen?'▲':'▼')+'</button></div></div>';
  if(fixedSectionOpen){
    if(!items.length){
      html+='<div style="font-size:12px;color:var(--muted);padding:6px 0 12px;line-height:1.6">No fixed expenses yet.<br>Tap + to add Netflix, Spotify, insurance…</div>';
    } else {
      items.forEach(function(fx){
        var cat=CATS[fx.category]||CATS['Others'],confirmed=isFixedConfirmedForMonth(fx,monthKey);
        var occ=fxOccurrencesInMonth(fx,monthKey);
        var amt=getFixedAmountForMonth(fx,monthKey),isHard=fx.fixedType==='hard',pending=!isHard&&!confirmed;
        var periodLbl={monthly:'monthly','4weekly':'4-weekly',weekly:'weekly'}[fx.period||'monthly']||'monthly';
        var hasFxCur=isHard&&fx.originalCurrency&&fx.originalCurrency!=='EUR';
        // Show original currency amount for non-EUR; multiply by occurrences for weekly/4-weekly
        var amtStr = hasFxCur
          ? fx.originalCurrency+' '+(fx.originalAmount||0).toFixed(2)+(occ>1?'×'+occ:'')
          : (isHard&&occ>1?'€'+(fx.amount||0).toFixed(2)+'×'+occ:'€'+amt.toFixed(2));
        html+='<div class="fixed-item'+(pending?' soft-pending':'')+'" onclick="editFixed(\''+e(fx.id)+'\')">';
        html+='<div class="fixed-icon" style="background:'+cat.color+'22">'+cat.icon+'</div>';
        html+='<div class="fixed-body"><div class="fixed-name">'+e(fx.name)+'</div><div class="fixed-sub">'+e(fx.category)+' · '+(isHard?periodLbl:'varies')+'</div></div>';
        if(pending) html+='<button class="fixed-confirm-btn" onclick="event.stopPropagation();confirmSoftFixed(\''+e(fx.id)+'\')">Confirm</button>';
        else html+='<div class="fixed-amt" style="color:'+(isHard?'var(--muted)':'var(--teal)')+'">'+amtStr+'</div>';
        html+='</div>';
      });
    }
  }
  html+='</div>';
  return html;
}

function toggleFixedSection(){ fixedSectionOpen=!fixedSectionOpen; renderMoneyContent(); }

function fxCurrencyOpts(selected){
  return CURRENCIES.map(function(c){
    return '<option value="'+c+'"'+(c===(selected||'EUR')?' selected':'')+'>'+c+'</option>';
  }).join('');
}

function openAddFixed(){
  var catOpts=Object.keys(CATS).map(function(c){
    return '<option value="'+e(c)+'"'+(c==='Insurance & subscriptions'?' selected':'')+'>'+CATS[c].icon+' '+c+'</option>';
  }).join('');
  var today=new Date().toISOString().slice(0,10);
  openModal('<div class="mhandle"></div><div class="mtitle">New fixed expense</div>'+
    '<div class="fg"><label class="flbl">Name</label><input type="text" class="finput" id="fx-name" placeholder="e.g. Netflix, Spotify…"></div>'+
    '<div class="fg"><label class="flbl">Category</label><select class="finput" id="fx-cat">'+catOpts+'</select></div>'+
    '<div class="fg"><label class="flbl">Starts from</label><input type="date" class="finput" id="fx-start" value="'+today+'"></div>'+
    '<div class="fg"><label class="flbl">Recurrence</label><select class="finput" id="fx-period">'+
    '<option value="monthly">Monthly</option>'+
    '<option value="4weekly">Every 4 weeks</option>'+
    '<option value="weekly">Weekly</option>'+
    '</select></div>'+
    '<div class="fg"><label class="flbl">Type</label><div style="display:flex;gap:8px">'+
    '<label id="fx-lbl-hard" style="flex:1;display:flex;align-items:center;gap:7px;background:rgba(10,122,136,0.08);border:2px solid var(--teal);border-radius:9px;padding:10px 12px;cursor:pointer;font-size:12px;font-weight:600">'+
    '<input type="radio" name="fx-type" value="hard" checked onchange="fxTypeChange(this)"> Fixed amount</label>'+
    '<label id="fx-lbl-soft" style="flex:1;display:flex;align-items:center;gap:7px;background:white;border:2px solid var(--sand);border-radius:9px;padding:10px 12px;cursor:pointer;font-size:12px;font-weight:600">'+
    '<input type="radio" name="fx-type" value="soft" onchange="fxTypeChange(this)"> Confirm monthly</label>'+
    '</div></div>'+
    '<div class="fg" id="fx-amt-wrap"><label class="flbl">Amount per occurrence</label>'+
    '<div style="display:flex;gap:8px">'+
    '<input type="number" class="finput" id="fx-amount" placeholder="0.00" step="0.01" inputmode="decimal" style="flex:1">'+
    '<select class="finput" id="fx-currency" style="width:88px">'+fxCurrencyOpts('EUR')+'</select>'+
    '</div></div>'+
    '<button class="btn-pri" onclick="submitFixed()">Add</button>');
}

function fxTypeChange(radio){
  var hard=document.getElementById('fx-lbl-hard'),soft=document.getElementById('fx-lbl-soft'),wrap=document.getElementById('fx-amt-wrap');
  if(radio.value==='soft'){
    if(hard){hard.style.background='white';hard.style.borderColor='var(--sand)';}
    if(soft){soft.style.background='rgba(10,122,136,0.08)';soft.style.borderColor='var(--teal)';}
    if(wrap) wrap.style.display='none';
  } else {
    if(hard){hard.style.background='rgba(10,122,136,0.08)';hard.style.borderColor='var(--teal)';}
    if(soft){soft.style.background='white';soft.style.borderColor='var(--sand)';}
    if(wrap) wrap.style.display='';
  }
}

function submitFixed(){
  var name=(document.getElementById('fx-name')||{}).value||'';
  if(!name.trim()){alert('Enter a name.');return;}
  var cat=(document.getElementById('fx-cat')||{}).value||'Others';
  var typeEl=document.querySelector('input[name="fx-type"]:checked');
  var fxType=typeEl?typeEl.value:'hard';
  var startDate=(document.getElementById('fx-start')||{}).value||new Date().toISOString().slice(0,10);
  var period=(document.getElementById('fx-period')||{}).value||'monthly';
  var id='fx'+Date.now().toString(36)+Math.random().toString(36).substr(2,4);
  if(fxType==='soft'){
    MS.fixedExpenses[id]={id:id,name:name.trim(),category:cat,fixedType:'soft',period:period,startDate:startDate,amount:0,confirmedMonths:{},createdAt:Date.now()};
    persistMoney(); closeModal(); renderMoneyContent();
    return;
  }
  var origAmt=parseFloat((document.getElementById('fx-amount')||{}).value||0);
  if(!origAmt){alert('Enter an amount.');return;}
  var currency=(document.getElementById('fx-currency')||{}).value||'EUR';
  fetchRate(currency,function(rate){
    var eurAmt=currency==='EUR'?origAmt:Math.round(origAmt*rate*100)/100;
    MS.fixedExpenses[id]={id:id,name:name.trim(),category:cat,fixedType:'hard',period:period,startDate:startDate,
      originalAmount:origAmt,originalCurrency:currency,lockedRate:rate,
      amount:eurAmt,confirmedMonths:{},createdAt:Date.now()};
    persistMoney(); closeModal(); renderMoneyContent();
  });
}

function confirmSoftFixed(id){
  var fx=MS.fixedExpenses[id]; if(!fx) return;
  var monthKey=getCurrentMonthKey();
  var prevEur=fx.confirmedMonths&&Object.values(fx.confirmedMonths).slice(-1)[0];
  // Suggest last confirmed EUR value; currency defaults to original currency if set
  var defCur=fx.originalCurrency||'EUR';
  openModal('<div class="mhandle"></div><div class="mtitle">'+e(fx.name)+'</div>'+
    '<div style="font-size:13px;color:var(--muted);margin-bottom:18px">'+new Date().toLocaleDateString('en-GB',{month:'long',year:'numeric'})+'</div>'+
    '<div class="fg"><label class="flbl">Amount this month</label>'+
    '<div style="display:flex;gap:8px">'+
    '<input type="number" class="finput" id="fx-confirm-amt" placeholder="0.00" step="0.01" inputmode="decimal"'+(prevEur?' value="'+prevEur+'"':'')+' autofocus style="flex:1">'+
    '<select class="finput" id="fx-confirm-cur" style="width:88px">'+fxCurrencyOpts(defCur)+'</select>'+
    '</div></div>'+
    '<button class="btn-pri" onclick="submitConfirmSoft(\''+id+'\',\''+monthKey+'\')">Confirm</button>');
}

function submitConfirmSoft(id,monthKey){
  var fx=MS.fixedExpenses[id]; if(!fx) return;
  var amt=parseFloat((document.getElementById('fx-confirm-amt')||{}).value||0);
  if(!amt){alert('Enter an amount.');return;}
  var currency=(document.getElementById('fx-confirm-cur')||{}).value||'EUR';
  fetchRate(currency,function(rate){
    var eurAmt=currency==='EUR'?amt:Math.round(amt*rate*100)/100;
    if(!fx.confirmedMonths) fx.confirmedMonths={};
    fx.confirmedMonths[monthKey]=eurAmt;
    persistMoney(); closeModal(); renderMoneyContent();
  });
}

function editFixed(id){
  var fx=MS.fixedExpenses[id]; if(!fx) return;
  var monthKey=getCurrentMonthKey();
  var softUnconfirmed=fx.fixedType==='soft'&&!isFixedConfirmedForMonth(fx,monthKey);
  var amtLabel=fx.fixedType==='hard'
    ? (fx.originalCurrency&&fx.originalCurrency!=='EUR'
        ? fx.originalCurrency+' '+(fx.originalAmount||0).toFixed(2)+' · €'+(fx.amount||0).toFixed(2)
        : '€'+(fx.amount||0).toFixed(2)+' fixed')
    : 'varies monthly';
  openModal('<div class="mhandle"></div>'+
    '<div style="font-family:Playfair Display,serif;font-size:17px;margin-bottom:3px">'+e(fx.name)+'</div>'+
    '<div style="font-size:11px;color:var(--muted);margin-bottom:20px">'+e(fx.category)+' · '+amtLabel+'</div>'+
    '<div class="alist">'+
    '<div class="aitem" onclick="closeModal();setTimeout(function(){openEditFixed(\''+id+'\')},80)"><div class="aicon" style="background:var(--sand);color:var(--dark)">✏️</div>Edit</div>'+
    (softUnconfirmed?'<div class="aitem" onclick="closeModal();setTimeout(function(){confirmSoftFixed(\''+id+'\')},80)"><div class="aicon" style="background:rgba(201,138,16,0.08);color:var(--amber)">✓</div>Confirm this month</div>':'')+
    (fx.fixedType==='soft'&&!softUnconfirmed?'<div class="aitem" onclick="closeModal();setTimeout(function(){confirmSoftFixed(\''+id+'\')},80)"><div class="aicon" style="background:rgba(10,122,136,0.08);color:var(--teal)">↺</div>Edit this month\'s amount</div>':'')+
    '<div class="aitem danger" onclick="deleteFixed(\''+id+'\')"><div class="aicon" style="background:rgba(192,57,43,0.08);color:#C0392B">🗑</div>Delete</div></div>');
}

function openEditFixed(id){
  var fx=MS.fixedExpenses[id]; if(!fx) return;
  var period=fx.period||'monthly';
  var startDate=fx.startDate||new Date().toISOString().slice(0,10);
  var origAmt=fx.originalAmount||fx.amount||0;       // show original if stored, else EUR
  var origCur=fx.originalCurrency||'EUR';
  var catOpts=Object.keys(CATS).map(function(c){
    return '<option value="'+e(c)+'"'+(c===fx.category?' selected':'')+'>'+CATS[c].icon+' '+c+'</option>';
  }).join('');
  var periodOpts=['monthly','4weekly','weekly'].map(function(p){
    var lbl={monthly:'Monthly','4weekly':'Every 4 weeks',weekly:'Weekly'}[p];
    return '<option value="'+p+'"'+(p===period?' selected':'')+'>'+lbl+'</option>';
  }).join('');
  openModal('<div class="mhandle"></div><div class="mtitle">Edit fixed expense</div>'+
    '<div class="fg"><label class="flbl">Name</label><input type="text" class="finput" id="efx-name" value="'+e(fx.name)+'"></div>'+
    '<div class="fg"><label class="flbl">Category</label><select class="finput" id="efx-cat">'+catOpts+'</select></div>'+
    '<div class="fg"><label class="flbl">Starts from</label><input type="date" class="finput" id="efx-start" value="'+startDate+'"></div>'+
    '<div class="fg"><label class="flbl">Recurrence</label><select class="finput" id="efx-period">'+periodOpts+'</select></div>'+
    (fx.fixedType==='hard'?
      '<div class="fg"><label class="flbl">Amount per occurrence</label>'+
      '<div style="display:flex;gap:8px">'+
      '<input type="number" class="finput" id="efx-amount" value="'+origAmt+'" step="0.01" inputmode="decimal" style="flex:1">'+
      '<select class="finput" id="efx-currency" style="width:88px">'+fxCurrencyOpts(origCur)+'</select>'+
      '</div></div>':'')+
    '<button class="btn-pri" onclick="submitEditFixed(\''+id+'\')">Save</button>');
}

function submitEditFixed(id){
  var fx=MS.fixedExpenses[id]; if(!fx) return;
  var name=(document.getElementById('efx-name')||{}).value||'';
  if(!name.trim()){alert('Enter a name.');return;}
  fx.name=name.trim();
  fx.category=(document.getElementById('efx-cat')||{}).value||fx.category;
  fx.startDate=(document.getElementById('efx-start')||{}).value||fx.startDate||new Date().toISOString().slice(0,10);
  fx.period=(document.getElementById('efx-period')||{}).value||fx.period||'monthly';
  if(fx.fixedType==='hard'){
    var origAmt=parseFloat((document.getElementById('efx-amount')||{}).value||0);
    if(!origAmt){alert('Enter an amount.');return;}
    var currency=(document.getElementById('efx-currency')||{}).value||'EUR';
    fetchRate(currency,function(rate){
      fx.originalAmount=origAmt;
      fx.originalCurrency=currency;
      fx.lockedRate=rate;
      fx.amount=currency==='EUR'?origAmt:Math.round(origAmt*rate*100)/100;
      persistMoney(); closeModal(); renderMoneyContent();
    });
  } else {
    persistMoney(); closeModal(); renderMoneyContent();
  }
}

function deleteFixed(id){
  if(confirm('Delete this fixed expense?')){ delete MS.fixedExpenses[id]; persistMoney(); closeModal(); renderMoneyContent(); }
}

// ── INSIGHTS OVERLAY (accessed from Money tab) ───────────
function showInsights(){
  var mv = document.getElementById('money-view');
  var iv = document.getElementById('insights-view');
  if(mv) mv.style.display = 'none';
  if(iv){ iv.style.display = 'flex'; renderInsights(); }
  history.pushState({insights:true}, '');
}

function hideInsights(){
  var iv = document.getElementById('insights-view');
  var mv = document.getElementById('money-view');
  if(iv) iv.style.display = 'none';
  if(mv) mv.style.display = 'flex';
  // Pop the history entry we pushed, but suppress the tab-switch side-effect
  if(history.state && history.state.insights){
    _suppressNextBackTabSwitch = true;
    history.back();
  }
}

// ── CURRENCY CONVERTER ───────────────────────────────────
var convPanel = 0;
var convRates = {};
var convBase = 'EUR';
var convStarred = JSON.parse(ls('andaluma-conv-stars')||'[]');
var convValues = {};
var convLastEdited = 'EUR';
var convRatesFetched = false;
var convSearch = '';

var CONV_FLAGS = {
  EUR:'🇪🇺',USD:'🇺🇸',GBP:'🇬🇧',AED:'🇦🇪',JPY:'🇯🇵',KRW:'🇰🇷',TWD:'🇹🇼',VND:'🇻🇳',CNY:'🇨🇳',
  MXN:'🇲🇽',CAD:'🇨🇦',PEN:'🇵🇪',AUD:'🇦🇺',CHF:'🇨🇭',SGD:'🇸🇬',THB:'🇹🇭',IDR:'🇮🇩',MYR:'🇲🇾',
  PHP:'🇵🇭',INR:'🇮🇳',BRL:'🇧🇷',COP:'🇨🇴',CLP:'🇨🇱',TRY:'🇹🇷',NOK:'🇳🇴',SEK:'🇸🇪',DKK:'🇩🇰',
  NZD:'🇳🇿',ZAR:'🇿🇦',HKD:'🇭🇰',SAR:'🇸🇦',QAR:'🇶🇦',KWD:'🇰🇼',BHD:'🇧🇭',MNT:'🇲🇳',RUB:'🇷🇺',GEL:'🇬🇪'
};

function saveConvStars(){ lss('andaluma-conv-stars', JSON.stringify(convStarred)); }

function toggleConvStar(code){
  var i = convStarred.indexOf(code);
  if(i>=0) convStarred.splice(i,1);
  else convStarred.push(code);
  saveConvStars();
  convSearch = '';
  renderConverter();
}

function getConvCurrencies(){
  var pinned = ['EUR','USD'];
  var tripCur = inferTripCurrency(MS.activeTripId);
  if(tripCur && pinned.indexOf(tripCur)<0) pinned.push(tripCur);
  var starred = convStarred.filter(function(c){ return pinned.indexOf(c)<0; });
  return pinned.concat(starred);
}

function fetchConvRates(){
  // Seed with fallback rates for currencies Frankfurter doesn't cover (VND, IDR, etc.)
  // RATE_FALLBACK stores EUR-per-unit, converter needs units-per-EUR, so invert.
  Object.keys(RATE_FALLBACK).forEach(function(c){
    if(!convRates[c]) convRates[c] = 1 / RATE_FALLBACK[c];
  });
  convRates['EUR'] = 1;
  fetch('https://api.frankfurter.app/latest?base=EUR')
    .then(function(r){ return r.json(); })
    .then(function(data){
      var fresh = data.rates || {};
      Object.keys(fresh).forEach(function(c){ convRates[c] = fresh[c]; });
      convRates['EUR'] = 1;
      // Sync rateCache (EUR-per-unit) so expense recorder uses the same fresh rates
      Object.keys(convRates).forEach(function(c){
        if(c !== 'EUR' && convRates[c]) rateCache[c] = 1 / convRates[c];
      });
      convRatesFetched = true;
      recalcConv();
      renderConverter();
    })
    .catch(function(){
      // Frankfurter unavailable — seed rateCache from fallback-seeded convRates
      Object.keys(convRates).forEach(function(c){
        if(c !== 'EUR' && convRates[c]) rateCache[c] = 1 / convRates[c];
      });
      convRatesFetched = true;
      recalcConv();
      renderConverter();
    });
}

function recalcConv(){
  if(!convRatesFetched) return;
  var baseVal = parseFloat(String(convValues[convLastEdited]||'').replace(/,/g,''))||0;
  var baseRate = convRates[convLastEdited]||1;
  var eurVal = baseVal / baseRate;
  var currencies = getConvCurrencies();
  currencies.forEach(function(c){
    if(c === convLastEdited) return;
    var rate = convRates[c]||1;
    convValues[c] = eurVal * rate;
  });
}

function onConvInput(code, val){
  convLastEdited = code;
  // Store as a plain number (strip any commas the user may have typed)
  convValues[code] = parseFloat(String(val).replace(/,/g,''))||0;
  recalcConv();
  renderConverterValues();
}

// Strip commas when user taps a field to edit, and select all for easy overwrite
function onConvFocus(code){
  var inp = document.getElementById('conv-inp-'+code);
  if(!inp) return;
  inp.value = String(inp.value).replace(/,/g,'');
  inp.select();
}

function clearConv(){
  convValues = {};
  convLastEdited = 'EUR';
  renderConverter();
}

function clearConvRow(code){
  convValues[code] = 0;
  var inp = document.getElementById('conv-inp-'+code);
  if(inp) inp.value = '';
}

function renderConverterValues(){
  var currencies = getConvCurrencies();
  currencies.forEach(function(c){
    var inp = document.getElementById('conv-inp-'+c);
    if(!inp) return;
    if(c === convLastEdited) return;
    var v = convValues[c];
    inp.value = (v !== undefined && v !== null && v !== 0) ? formatConvVal(c, v) : '';
  });
}

function formatConvVal(code, val){
  if(val === 0 || val === undefined || val === null) return '';
  var noDecimal = ['JPY','KRW','VND','CLP','COP','IDR','MNT','RUB'];
  if(noDecimal.indexOf(code) >= 0){
    // Integer with thousands commas: 24500000 → "24,500,000"
    return Math.round(val).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  // Decimal with thousands commas: 1234.56 → "1,234.56"
  var parts = val.toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

function filterConvSearch(val){
  convSearch = val || '';
  var currencies = getConvCurrencies();
  var available = CURRENCIES.filter(function(c){ return currencies.indexOf(c)<0; });
  var q = convSearch.toLowerCase();
  var filtered = q ? available.filter(function(c){ return c.toLowerCase().indexOf(q)>=0; }) : available;
  var el = document.getElementById('conv-avail-list');
  if(!el) return;
  if(!filtered.length){
    el.innerHTML = '<div style="padding:10px 16px;font-size:12px;color:var(--muted)">No results</div>';
    return;
  }
  el.innerHTML = filtered.map(function(c){
    var flag = CONV_FLAGS[c]||'💱';
    return '<div class="conv-avail-item" onclick="toggleConvStar(\''+c+'\')">'+
      '<span class="conv-flag">'+flag+'</span>'+
      '<span class="conv-code" style="flex:1">'+c+'</span>'+
      '<span class="conv-add-btn">+</span></div>';
  }).join('');
}

function renderConverter(){
  var el = document.getElementById('converter-view');
  if(!el) return;
  var currencies = getConvCurrencies();
  var pinned = ['EUR','USD'];
  var tripCur = inferTripCurrency(MS.activeTripId);
  if(tripCur && pinned.indexOf(tripCur)<0) pinned.push(tripCur);

  var html = '<div class="conv-header">';
  html += '<div class="conv-title">Currencies</div>';
  html += '<button onclick="clearConv()" style="background:rgba(10,122,136,0.12);border:none;border-radius:8px;color:var(--teal);font-size:12px;font-weight:600;font-family:\'DM Sans\',sans-serif;padding:6px 12px;cursor:pointer;letter-spacing:0.02em">✕ Clear</button>';
  html += '</div>';

  html += '<div class="conv-board">';
  currencies.forEach(function(c){
    var isPinned = pinned.indexOf(c) >= 0;
    var flag = CONV_FLAGS[c]||'💱';
    var val = convValues[c];
    var dispVal = (val !== undefined && val !== null && val !== 0) ? formatConvVal(c, val) : '';
    html += '<div class="conv-row'+(isPinned?' pinned':'')+'">';
    if(!isPinned){
      html += '<button class="conv-star on" onclick="toggleConvStar(\''+c+'\')" title="Remove currency">✕</button>';
    }
    html += '<span class="conv-flag">'+flag+'</span>';
    html += '<span class="conv-code">'+c+'</span>';
    html += '<input class="conv-input" id="conv-inp-'+c+'" type="text" inputmode="decimal" placeholder="0" value="'+e(dispVal)+'" oninput="onConvInput(\''+c+'\',this.value)" onfocus="onConvFocus(\''+c+'\')">';
    html += '<button class="conv-clear" onclick="clearConvRow(\''+c+'\')" title="Clear">⌫</button>';
    html += '</div>';
  });
  html += '</div>';

  var available = CURRENCIES.filter(function(c){ return currencies.indexOf(c)<0; });
  if(available.length){
    html += '<div style="padding:12px 16px 6px;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);font-weight:700">Add currency</div>';
    html += '<div style="padding:0 16px 8px"><input class="curr-search" type="text" placeholder="Search..." value="'+e(convSearch)+'" oninput="filterConvSearch(this.value)" autocomplete="off" style="width:100%;box-sizing:border-box"></div>';
    var q = convSearch.toLowerCase();
    var filtered = q ? available.filter(function(c){ return c.toLowerCase().indexOf(q)>=0; }) : available;
    html += '<div class="conv-avail-list" id="conv-avail-list">';
    if(!filtered.length){
      html += '<div style="padding:10px 16px;font-size:12px;color:var(--muted)">No results</div>';
    } else {
      filtered.forEach(function(c){
        var flag = CONV_FLAGS[c]||'💱';
        html += '<div class="conv-avail-item" onclick="toggleConvStar(\''+c+'\')">'+
          '<span class="conv-flag">'+flag+'</span>'+
          '<span class="conv-code" style="flex:1">'+c+'</span>'+
          '<span class="conv-add-btn">+</span></div>';
      });
    }
    html += '</div>';
  }

  el.innerHTML = html;
}


// ── HOOK loadMoneyData INTO boot ─────────────────────────
var _origBoot = boot;
boot = function(){
  _origBoot();
  loadMoneyData();
  setTimeout(function(){ if(!MS.activeTripId) autoSelectTrip(); }, 1200);
};