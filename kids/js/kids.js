// ── CONFIG ────────────────────────────────────────────────
// Same Firebase PROJECT as the Planner/CRM (andaluma-planner), but its own
// registered Firebase APP — register a new Web app for "Andaluma Kids" in
// the andaluma-planner Firebase console and paste its appId below.
// TODO(André): replace KIDS_APP_ID with the real value once registered.
var fbConfig = {
  apiKey:'AIzaSyAeYXakpwzgmbl0_Spf2phpBlXjYe_9STA',
  authDomain:'andaluma-planner.firebaseapp.com',
  databaseURL:'https://andaluma-planner-default-rtdb.firebaseio.com',
  projectId:'andaluma-planner',
  storageBucket:'andaluma-planner.firebasestorage.app',
  messagingSenderId:'87759928843',
  appId:'REPLACE_WITH_KIDS_APP_ID'
};

// Static profile metadata — two fixed children, no authoring UI needed,
// same spirit as CRM_CATS being hardcoded rather than fetched.
var PROFILES = [
  {
    id:'luka', name:'Luka', birthYear:2019, companionId:'comet',
    companionName:'Comet', subjectsLabel:'Math &middot; Reading &middot; Writing'
  },
  {
    id:'maia', name:'Maia', birthYear:2021, companionId:'stella',
    companionName:'Stella', subjectsLabel:'Counting &middot; Letters'
  }
];

// ── STATE ─────────────────────────────────────────────────
var kidsDB = null;
var kidsStreaks = {};  // {profileId: {current, longest, lastActiveDate}}
var kidsDoneToday = {}; // {profileId: bool}
var currentProfileId = null;

// ── UTILS ─────────────────────────────────────────────────
function kp2(n){ return n<10?'0'+n:''+n; }
function kToday(){ var d=new Date(); return d.getFullYear()+'-'+kp2(d.getMonth()+1)+'-'+kp2(d.getDate()); }
function kAge(birthYear){ return new Date().getFullYear()-birthYear; }
function findProfile(id){
  for(var i=0;i<PROFILES.length;i++) if(PROFILES[i].id===id) return PROFILES[i];
  return null;
}

// ── COMPANION ART ─────────────────────────────────────────
function companionSvg(companionId, size){
  size = size || 118;
  if(companionId==='comet'){
    return '<svg class="companion" width="'+size+'" height="'+size+'" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'+
      '<ellipse cx="66" cy="124" rx="34" ry="6" fill="#3A1F5C" opacity=".08"/>'+
      '<path d="M96 30c14 2 24 12 26 26-8-4-13-6-19-6 4 5 6 10 6 16-7-6-12-9-19-10 2 6 2 11 0 16-4-9-8-14-15-18 2-9 8-17 21-24Z" fill="#FF6B35"/>'+
      '<path d="M100 38c9 2 15 9 16 18-5-3-8-4-12-4 2 3 4 7 4 11-5-4-8-6-12-7 1 4 1 7 0 11-3-6-5-10-10-13 1-6 5-12 14-16Z" fill="#C4E538" opacity=".9"/>'+
      '<path d="M38 50 L26 20 L56 38Z" fill="#6B3FA0"/>'+
      '<path d="M40 44 L33 26 L50 38Z" fill="#F4EAFB"/>'+
      '<path d="M27 22l6 3-4 5Z" fill="#FF6B35"/>'+
      '<path d="M66 32c21 0 33 15 33 34 0 21-14 35-33 35S33 87 33 66c0-19 12-34 33-34Z" fill="#6B3FA0"/>'+
      '<path d="M66 63c11 0 17 7 17 17 0 9-7 15-17 15s-17-6-17-15c0-10 6-17 17-17Z" fill="#F4EAFB"/>'+
      '<path d="M40 46c9-5 17-6 26-6s17 1 26 6" stroke="#FF6B35" stroke-width="3" stroke-linecap="round" fill="none"/>'+
      '<circle cx="56" cy="62" r="3.6" fill="#3A1F5C"/><circle cx="76" cy="62" r="3.6" fill="#3A1F5C"/>'+
      '<circle cx="57.4" cy="60.6" r="1.1" fill="#fff"/><circle cx="77.4" cy="60.6" r="1.1" fill="#fff"/>'+
      '<path d="M62 76h8l-4 4Z" fill="#3A1F5C"/>'+
      '<path d="M46 92c7 5 21 6 30-1l3 9c-12 8-27 7-37 0Z" fill="#FF6B35"/>'+
      '<path d="M64 96l4 6-6 1Z" fill="#C4E538"/>'+
      '<path d="M18 66l2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#C4E538"/>'+
      '<path d="M104 98l1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6Z" fill="#FF6B35"/>'+
    '</svg>';
  }
  if(companionId==='stella'){
    return '<svg class="companion" width="'+size+'" height="'+size+'" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'+
      '<ellipse cx="70" cy="124" rx="32" ry="6" fill="#5B2140" opacity=".08"/>'+
      '<path d="M16 96q52 30 108 2" stroke="#8B5FBF" stroke-width="3" stroke-linecap="round" fill="none" opacity=".5"/>'+
      '<path d="M20 88q48 26 100 2" stroke="#E0409C" stroke-width="3" stroke-linecap="round" fill="none" opacity=".5"/>'+
      '<path d="M112 92l1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6Z" fill="#FFB627"/>'+
      '<path d="M22 78l1.4 3.4 3.4 1.4-3.4 1.4-1.4 3.4-1.4-3.4-3.4-1.4 3.4-1.4Z" fill="#1FAA7A"/>'+
      '<path d="M46 44 L38 24 L58 38Z" fill="#FFFDFB" stroke="#F0DCEE" stroke-width="1.6"/>'+
      '<path d="M94 44 L102 24 L82 38Z" fill="#FFFDFB" stroke="#F0DCEE" stroke-width="1.6"/>'+
      '<path d="M70 30c20 0 32 16 32 38 0 20-13 34-32 34S38 88 38 68c0-22 12-38 32-38Z" fill="#FFFDFB" stroke="#F0DCEE" stroke-width="2"/>'+
      '<path d="M70 64c10 0 16 7 16 16 0 8-7 14-16 14s-16-6-16-14c0-9 6-16 16-16Z" fill="#FBEEF7"/>'+
      '<circle cx="60" cy="64" r="3.6" fill="#5B2140"/><circle cx="80" cy="64" r="3.6" fill="#5B2140"/>'+
      '<circle cx="61.4" cy="62.6" r="1.1" fill="#fff"/><circle cx="81.4" cy="62.6" r="1.1" fill="#fff"/>'+
      '<circle cx="52" cy="73" r="4.5" fill="#E0409C" opacity=".3"/><circle cx="88" cy="73" r="4.5" fill="#E0409C" opacity=".3"/>'+
      '<path d="M46 58l1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1Z" fill="#FFB627"/>'+
      '<path d="M94 58l1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1Z" fill="#FFB627"/>'+
      '<path d="M38 48c-11 6-15 19-9 32 4-10 6-14 14-19Z" fill="#E0409C"/>'+
      '<path d="M34 64c-8 9-9 22-1 32 2-11 3-16 10-23Z" fill="#8B5FBF"/>'+
      '<path d="M39 82c-6 10-4 22 5 29 0-11 0-17 5-24Z" fill="#1FAA7A"/>'+
      '<path d="M58 22l4 8 6-10 4 10 6-8 2 12H56Z" fill="#FFB627"/>'+
      '<path d="M70 8l7 22h-14Z" fill="#FFB627"/>'+
      '<path d="M70 8l2.4 6 3-1.3-2 6.3 3-1-2 6-2.4-4Z" fill="#fff" opacity=".45"/>'+
      '<path d="M70 0l2.2 5.4 5.4 2.2-5.4 2.2-2.2 5.4-2.2-5.4-5.4-2.2 5.4-2.2Z" fill="#FFB627"/>'+
    '</svg>';
  }
  return '';
}

// ── INIT ──────────────────────────────────────────────────
function kidsInit(){
  renderPicker();
  try{
    if(!firebase.apps.length) firebase.initializeApp(fbConfig);
    kidsDB = firebase.database();
    PROFILES.forEach(function(p){
      kidsDB.ref('kids_streaks/'+p.id).on('value', function(snap){
        kidsStreaks[p.id] = snap.val() || {current:0, longest:0, lastActiveDate:null};
        renderPicker();
      });
      kidsDB.ref('kids_sessions/'+p.id+'/'+kToday()).on('value', function(snap){
        kidsDoneToday[p.id] = !!snap.val();
        renderPicker();
      });
    });
  }catch(ex){ /* offline/blocked — picker still works, just no live streaks */ }
}

// ── PICKER ────────────────────────────────────────────────
function renderPicker(){
  var html = PROFILES.map(function(p){
    var streak = (kidsStreaks[p.id] && kidsStreaks[p.id].current) || 0;
    var doneToday = !!kidsDoneToday[p.id];
    return (
      '<button class="profile-card '+p.id+'" type="button" onclick="selectProfile(\''+p.id+'\')">'+
        '<span class="card-accent"></span>'+
        '<div class="card-body">'+
          (doneToday
            ? '<span class="done-ribbon">&#10003; Done today</span>'
            : '<span class="streak-pill">&#9733; '+streak+' day streak</span>') +
          companionSvg(p.companionId, 118) +
          '<p class="kid-name">'+p.companionName+'</p>'+
          '<p class="kid-meta">'+p.name+' &middot; '+kAge(p.birthYear)+' &middot; '+p.subjectsLabel+'</p>'+
          '<span class="go-pill">Let&rsquo;s go!</span>'+
        '</div>'+
      '</button>'
    );
  }).join('');
  document.getElementById('profile-cards').innerHTML = html;
}

function selectProfile(id){
  currentProfileId = id;
  if(kidsDB){
    kidsDB.ref('kids_sessions/'+id+'/'+kToday()).update({
      started: firebase.database.ServerValue.TIMESTAMP
    });
  }
  showHome(id);
}

// ── SCREENS ───────────────────────────────────────────────
function showPicker(){
  document.getElementById('picker-screen').hidden = false;
  document.getElementById('home-screen').hidden = true;
  document.getElementById('parent-dashboard').style.display = 'none';
}
function showHome(id){
  var p = findProfile(id);
  document.getElementById('home-companion').innerHTML = companionSvg(p.companionId, 140);
  document.getElementById('home-greeting').textContent = 'Hi ' + p.name + '!';
  document.getElementById('picker-screen').hidden = true;
  document.getElementById('home-screen').hidden = false;
}
function renderDashboard(){
  var html = PROFILES.map(function(p){
    var s = kidsStreaks[p.id] || {current:0, longest:0};
    return (
      '<div class="dash-card">'+
        '<h3>'+p.name+' &middot; '+p.companionName+'</h3>'+
        '<div class="stat">Current streak: '+s.current+' days</div>'+
        '<div class="stat">Longest streak: '+s.longest+' days</div>'+
        '<div class="stat">Subjects: '+p.subjectsLabel+'</div>'+
      '</div>'
    );
  }).join('');
  document.getElementById('dash-cards').innerHTML = html;
}

// ── PARENT PIN GATE (separate from the Planner/CRM PIN) ────
var _KIDS_PARENT_PIN = '4471'; // TODO(André): change this to your own parent PIN
var _pinEntry = '';
function showPinScreen(){
  _pinEntry = '';
  updPinDots();
  document.getElementById('pin-error').textContent = '';
  document.getElementById('pin-screen').hidden = false;
}
function hidePinScreen(){
  document.getElementById('pin-screen').hidden = true;
}
function pinKey(n){
  if(_pinEntry.length>=4) return;
  _pinEntry += String(n);
  updPinDots();
  if(_pinEntry.length===4) setTimeout(checkPin,100);
}
function pinDel(){
  _pinEntry = _pinEntry.slice(0,-1);
  updPinDots();
  document.getElementById('pin-error').textContent = '';
}
function updPinDots(){
  document.querySelectorAll('.pdot').forEach(function(d,i){
    i<_pinEntry.length ? d.classList.add('filled') : d.classList.remove('filled');
  });
}
function checkPin(){
  if(_pinEntry===_KIDS_PARENT_PIN){
    hidePinScreen();
    document.getElementById('picker-screen').hidden = true;
    document.getElementById('home-screen').hidden = true;
    document.getElementById('parent-dashboard').style.display = 'flex';
    renderDashboard();
  } else {
    document.getElementById('pin-error').textContent = 'Wrong PIN. Try again.';
    _pinEntry = '';
    updPinDots();
  }
}
document.addEventListener('click', function(ev){
  var btn = ev.target;
  while(btn && !btn.getAttribute('data-n') && btn!==document.body) btn = btn.parentElement;
  if(!btn || !btn.getAttribute('data-n')) return;
  var ps = document.getElementById('pin-screen');
  if(!ps || ps.hidden) return;
  ev.preventDefault();
  var n = btn.getAttribute('data-n');
  n==='del' ? pinDel() : pinKey(parseInt(n));
});
document.addEventListener('keydown', function(ev){
  var ps = document.getElementById('pin-screen');
  if(!ps || ps.hidden) return;
  if(ev.key>='0' && ev.key<='9') pinKey(parseInt(ev.key));
  if(ev.key==='Backspace') pinDel();
  if(ev.key==='Escape') hidePinScreen();
});

document.addEventListener('DOMContentLoaded', kidsInit);
