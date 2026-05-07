// ── UTILITIES ────────────────────────────────────────────
function ls(k){try{return localStorage.getItem(k);}catch(e){return null;}}
function lss(k,v){try{localStorage.setItem(k,v);}catch(e){}}
function td(){var n=new Date();return n.getFullYear()+'-'+p2(n.getMonth()+1)+'-'+p2(n.getDate());}
function p2(n){return n<10?'0'+n:''+n;}
function addDays(str,d){var dt=new Date(str+'T12:00:00');dt.setDate(dt.getDate()+d);return dt.getFullYear()+'-'+p2(dt.getMonth()+1)+'-'+p2(dt.getDate());}
function uid(){return Date.now().toString(36)+Math.random().toString(36).substr(2,5);}
function e(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

// ── GLOBAL STATE ─────────────────────────────────────────
var S={date:td(),owner:'andre',wkOff:0,tasks:{},calEvs:[],showSD:false};
var db=null,offline=false,gcalToken=null,mst={};

var VCOL={andaluma:'#E04F28',vae:'#0A7A88',baraca:'#C98A10',personal:'#B83368','andaluma2':'#E04F28'};

var TZS=[{l:'NL',z:'Europe/Amsterdam',bg:'rgba(224,79,40,0.25)'},{l:'DXB',z:'Asia/Dubai',bg:'rgba(201,138,16,0.25)'},{l:'KR',z:'Asia/Seoul',bg:'rgba(10,122,136,0.25)'}];
function tzTime(z){try{return new Date().toLocaleTimeString('en-GB',{timeZone:z,hour:'2-digit',minute:'2-digit',hour12:false});}catch(e){return'--:--';}}

// ── CATEGORY CONFIG ───────────────────────────────────────
var CATS = {
  'Food':                   {icon:'🍽️', color:'#E04F28'},
  'Going out':              {icon:'🍷', color:'#B83368'},
  'Accommodation':          {icon:'🏠', color:'#0A7A88'},
  'Transport (local)':      {icon:'🚕', color:'#C98A10'},
  'Long distance travel':   {icon:'✈️', color:'#2D5C3A'},
  'Shopping':               {icon:'🛍️', color:'#7A6E5A'},
  'Clothing':               {icon:'👕', color:'#B83368'},
  'Sightseeing & activities':{icon:'🗺️', color:'#0A7A88'},
  'Insurance & subscriptions':{icon:'🔒', color:'#C98A10'},
  'Health & medical':       {icon:'💊', color:'#E04F28'},
  'Work & business':        {icon:'💼', color:'#2D5C3A'},
  'Vehicle':                {icon:'🚗', color:'#7A6E5A'},
  'Family support':         {icon:'❤️', color:'#B83368'},
  'Others':                 {icon:'•',  color:'#7A6E5A'},
};

// ── MONEY STATE ───────────────────────────────────────────
var MS = {
  trips: {},
  expenses: {},
  fixedExpenses: {},
  activeTripId: null,
  moneyDate: td(),
};

// ── INIT / BOOT ───────────────────────────────────────────
function init(){
  if(ls('andaluma-auth') !== 'ok'){
    document.getElementById('pin-screen').style.display='flex';
    document.getElementById('setup').style.display='none';
    document.getElementById('app').style.display='none';
    return;
  }
  afterPin();
}

function afterPin(){
  var fbConfig = {
    apiKey:'AIzaSyAeYXakpwzgmbl0_Spf2phpBlXjYe_9STA',
    authDomain:'andaluma-planner.firebaseapp.com',
    databaseURL:'https://andaluma-planner-default-rtdb.firebaseio.com',
    projectId:'andaluma-planner',
    storageBucket:'andaluma-planner.firebasestorage.app',
    messagingSenderId:'87759928843',
    appId:'1:87759928843:web:052df60638080d9ad9110e'
  };
  lss('andaluma-fb', JSON.stringify(fbConfig));
  loadLocal();
  boot();
  try{
    if(!firebase.apps.length) firebase.initializeApp(fbConfig);
    db = firebase.database();
    db.ref('tasks').on('value',function(snap){
      S.tasks=snap.val()||{};
      lss('andaluma-tasks',JSON.stringify(S.tasks));
      rolloverPastTasks();
      renderAll();
    });
    loadMoneyData();
  }catch(ex){ db=null; rolloverPastTasks(); renderAll(); }
}

// ── PIN FUNCTIONS ────────────────────────────────────────
var PIN = '1213';
var pinEntry = '';

function checkAuth(){ return ls('andaluma-auth') === 'ok'; }

function showPin(){
  document.getElementById('pin-screen').style.display = 'flex';
  document.getElementById('setup').style.display = 'none';
  document.getElementById('app').style.display = 'none';
}

function pinKey(n){
  if(pinEntry.length >= 4) return;
  pinEntry += String(n);
  updatePinDots();
  if(pinEntry.length === 4) setTimeout(checkPin, 100);
}

function pinDel(){
  pinEntry = pinEntry.slice(0, -1);
  updatePinDots();
  document.getElementById('pin-error').textContent = '';
}

function updatePinDots(){
  var dots = document.querySelectorAll('.pdot');
  dots.forEach(function(d, i){
    if(i < pinEntry.length) d.classList.add('filled');
    else d.classList.remove('filled');
  });
}

function checkPin(){
  if(pinEntry === PIN){
    lss('andaluma-auth', 'ok');
    document.getElementById('pin-screen').style.display = 'none';
    afterPin();
  } else {
    document.getElementById('pin-error').textContent = 'Wrong PIN. Try again.';
    pinEntry = '';
    updatePinDots();
  }
}

function handlePinInput(ev){
  var btn = ev.target;
  while(btn && !btn.getAttribute('data-n') && btn !== document.body){
    btn = btn.parentElement;
  }
  if(!btn || !btn.getAttribute('data-n')) return;
  var ps = document.getElementById('pin-screen');
  if(!ps || ps.style.display === 'none') return;
  ev.preventDefault();
  var n = btn.getAttribute('data-n');
  if(n === 'del') pinDel();
  else pinKey(parseInt(n));
}
document.addEventListener('click', handlePinInput);
document.addEventListener('touchend', handlePinInput, {passive:false});

document.addEventListener('keydown', function(ev){
  var ps = document.getElementById('pin-screen');
  if(!ps || ps.style.display === 'none') return;
  if(ev.key >= '0' && ev.key <= '9') pinKey(parseInt(ev.key));
  if(ev.key === 'Backspace') pinDel();
});

document.addEventListener('DOMContentLoaded', function(){ init(); });

// ── SETUP ────────────────────────────────────────────────
function doSetup(){
  var raw=document.getElementById('fb-in').value.trim();
  var gcid=document.getElementById('gcal-in').value.trim();
  try{
    var cfg=JSON.parse(raw);
    lss('andaluma-fb',JSON.stringify(cfg));
    if(gcid)lss('andaluma-gcal',gcid);
    initApp();
  }catch(e){alert('Invalid JSON — copy the full config object from Firebase.');}
}

function skipSetup(){offline=true;lss('andaluma-fb','offline');loadLocal();rolloverPastTasks();boot();}

function startFB(cfg){
  try{
    firebase.initializeApp(cfg);
    db=firebase.database();
    loadLocal();
    boot();
    db.ref('tasks').on('value',function(snap){
      S.tasks=snap.val()||{};
      lss('andaluma-tasks',JSON.stringify(S.tasks));
      rolloverPastTasks();
      renderAll();
    });
  }catch(e){offline=true;loadLocal();rolloverPastTasks();boot();}
}

function boot(){
  document.getElementById('setup').style.display='none';
  var app=document.getElementById('app');
  app.style.display='flex';app.style.height='100%';app.style.flexDirection='column';
  renderAll();
  setInterval(renderHdr,30000);
}

function persist(){if(db&&!offline)db.ref('tasks').set(S.tasks);else lss('andaluma-tasks',JSON.stringify(S.tasks));}
function loadLocal(){try{var s=ls('andaluma-tasks');S.tasks=s?JSON.parse(s):{};}catch(e){S.tasks={};}}

// ── MODAL ────────────────────────────────────────────────
function openModal(html){
  document.getElementById('mcontent').innerHTML=html;
  document.getElementById('modal-overlay').style.display='flex';
  // Push a history entry so the Android back button closes the modal
  history.pushState({modal:true},'');
}
function closeModal(){
  document.getElementById('modal-overlay').style.display='none';
  mst={};
  // Pop the history entry we pushed, but suppress the tab-switch side-effect
  // (same pattern as hideInsights — programmatic close must not switch tabs)
  if(history.state&&history.state.modal){
    _suppressNextBackTabSwitch=true;
    history.back();
  }
}
function bgClose(ev){if(ev.target===document.getElementById('modal-overlay'))closeModal();}

// ── ANDROID BACK BUTTON ──────────────────────────────────
// Flag to suppress the tab-switch when hideInsights() calls history.back()
var _suppressNextBackTabSwitch = false;

window.addEventListener('popstate',function(){
  // 1. Modal open?
  var ov=document.getElementById('modal-overlay');
  if(ov&&ov.style.display!=='none'){ ov.style.display='none'; mst={}; return; }
  // 2. Insights overlay open (shown from within Money tab)?
  var iv=document.getElementById('insights-view');
  if(iv&&iv.style.display!=='none'){
    iv.style.display='none';
    var mv=document.getElementById('money-view');
    if(mv) mv.style.display='flex';
    return;
  }
  // 3. hideInsights() just fired history.back() — don't also jump to Tasks
  if(_suppressNextBackTabSwitch){ _suppressNextBackTabSwitch=false; return; }
  // 4. Non-tasks tab → return to Tasks
  if(currentTab!=='tasks') _switchTabUI('tasks');
});

// ── TAB SWITCHING ────────────────────────────────────────
var currentTab = 'tasks';

// Internal: updates UI only, no history push (used by popstate handler)
function _switchTabUI(tab){
  currentTab = tab;
  // Always hide the insights overlay when switching nav tabs
  var iv=document.getElementById('insights-view');
  if(iv) iv.style.display='none';
  ['tasks','money','converter'].forEach(function(t){
    var v = document.getElementById(t+'-view');
    var b = document.getElementById('nav-'+t);
    if(v) v.style.display = t===tab ? 'flex' : 'none';
    if(b) b.className = 'nav-btn'+(t===tab?' on':'');
  });
  var fab=document.getElementById('fab'), mic=document.getElementById('fab-mic');
  if(tab==='tasks'){ fab.style.display='flex'; mic.style.display='flex'; }
  else if(tab==='money'){ fab.style.display='flex'; mic.style.display='none'; fab.textContent='+'; }
  else { fab.style.display='none'; mic.style.display='none'; }
  if(tab==='money') renderMoney();
  if(tab==='converter'){ if(!convRatesFetched) fetchConvRates(); else renderConverter(); }
}

function switchTab(tab) {
  // Push a history entry when leaving tasks so back button returns here
  if(tab!=='tasks') history.pushState({tab:tab},'');
  _switchTabUI(tab);
}

function fabAction(){
  if(currentTab==='tasks') openAdd();
  else if(currentTab==='money') openAddExpense();
}
