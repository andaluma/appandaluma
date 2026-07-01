// ── HABIT CONFIG ─────────────────────────────────────────
var HABITS = [
  {id:'new_contact',    label:'New contact',              icon:'👤', days:[1,2,3,4,5], requiresLog:true},
  {id:'catchup_contact',label:'Catch up',                 icon:'💬', days:[1,2,3,4,5], requiresLog:true},
  {id:'reading',        label:'30 min reading',           icon:'📚', days:[0,1,2,3,4,5,6], requiresLog:false, wildcard:true},
  {id:'newsletter',     label:'Newsletter page',          icon:'📰', days:[3],          requiresLog:false},
  {id:'reel_andaluma',  label:'Reel: Andaluma',           icon:'🎬', weekly:true,       requiresLog:false},
  {id:'reel_vae',       label:'Reel: VAE Testament',      icon:'🎬', weekly:true,       requiresLog:false},
  {id:'reel_uaepw',     label:'Reel: UAE Property Wills', icon:'🎬', weekly:true,       requiresLog:false},
];

// ── STATE ─────────────────────────────────────────────────
var habitData        = {};
var contactData      = {};
var habitsLoaded     = false;
var selectedHabitDate = td();

// ── FIREBASE ─────────────────────────────────────────────
function loadHabitsData(){
  if(!db||offline){ habitsLoaded=true; renderHabitBanner(); return; }
  db.ref('habits').on('value',function(snap){
    habitData=snap.val()||{};
    habitsLoaded=true;
    renderHabits();
    renderHabitBanner();
  });
  db.ref('contacts').on('value',function(snap){
    contactData=snap.val()||{};
    renderHabits();
  });
}

// ── HELPERS ───────────────────────────────────────────────
function findHabit(id){
  for(var i=0;i<HABITS.length;i++) if(HABITS[i].id===id) return HABITS[i];
  return null;
}

function getWeekStartFor(dateStr){
  var d=new Date((dateStr||td())+'T12:00:00');
  var dow=d.getDay();
  var back=dow===0?6:dow-1;
  var m=new Date(d.getTime()-back*86400000);
  return m.getFullYear()+'-'+p2(m.getMonth()+1)+'-'+p2(m.getDate());
}

function getWeekStart(){ return getWeekStartFor(td()); }

function getHabitsForDate(dateStr){
  var dow=new Date((dateStr||td())+'T12:00:00').getDay();
  return HABITS.filter(function(h){
    if(h.weekly) return true;
    return h.days&&h.days.indexOf(dow)>=0;
  });
}

function getTodaysHabits(){ return getHabitsForDate(td()); }

function isHabitDone(id, dateStr){
  dateStr=dateStr||td();
  var h=findHabit(id); if(!h) return false;
  var k=h.weekly?getWeekStartFor(dateStr):dateStr;
  return !!(habitData[k]&&habitData[k][id]&&habitData[k][id].done);
}

function setHabitDone(id, done, extra, dateStr){
  dateStr=dateStr||td();
  var h=findHabit(id); if(!h||!habitsLoaded) return;
  var k=h.weekly?getWeekStartFor(dateStr):dateStr;
  if(!habitData[k]) habitData[k]={};
  if(!habitData[k][id]) habitData[k][id]={done:false,notes:''};
  habitData[k][id].done=done;
  if(extra) Object.keys(extra).forEach(function(x){ habitData[k][id][x]=extra[x]; });
  if(db&&!offline) db.ref('habits/'+k+'/'+id).set(habitData[k][id]);
  renderHabits();
  renderHabitBanner();
}

// Day X of 90 — based on earliest date key in habitData
function getStreakDay(){
  var dates=Object.keys(habitData).sort();
  if(!dates.length) return 1;
  var start=new Date(dates[0]+'T12:00:00');
  var today=new Date(td()+'T12:00:00');
  return Math.min(Math.round((today-start)/86400000)+1, 90);
}

function getProgressFor(dateStr){
  var hab=getHabitsForDate(dateStr);
  var done=hab.filter(function(h){ return isHabitDone(h.id, dateStr); }).length;
  return {done:done, total:hab.length};
}

function getTodayProgress(){ return getProgressFor(td()); }

function formatHabitDate(dateStr){
  if(dateStr===td()) return 'Today';
  var d=new Date(dateStr+'T12:00:00');
  var days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return days[d.getDay()]+' '+d.getDate()+' '+months[d.getMonth()];
}

function shiftHabitDay(delta){
  var d=new Date(selectedHabitDate+'T12:00:00');
  d.setDate(d.getDate()+delta);
  var next=d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate());
  if(next>td()) return;
  selectedHabitDate=next;
  renderHabits();
}

// ── BANNER + BADGE ────────────────────────────────────────
function renderHabitBanner(){
  var banner=document.getElementById('habit-banner');
  var badge =document.getElementById('habit-badge');
  var p=getTodayProgress();
  var rem=p.total-p.done;
  var show=rem>0&&p.total>0;
  if(banner){
    banner.style.display=show?'flex':'none';
    if(show) banner.textContent=rem+' habit'+(rem===1?'':'s')+' left today — tap to open';
  }
  if(badge) badge.style.display=show?'block':'none';
}

// ── RENDER ────────────────────────────────────────────────
function renderHabits(){
  var el=document.getElementById('habits-view');
  if(!el||el.style.display==='none') return;

  var isToday=selectedHabitDate===td();
  var day=getStreakDay();
  var p=getProgressFor(selectedHabitDate);
  var hab=getHabitsForDate(selectedHabitDate);
  var pct=Math.min(Math.round(day/90*100),100);
  var allDone=p.total>0&&p.done===p.total;

  // ── TOP CARD
  var html='<div class="hab-top">';
  html+='<div class="hab-streak-wrap">';
  html+='<div class="hab-eyebrow">90-day challenge</div>';
  html+='<div class="hab-day-num">Day '+day+' <span>of 90</span></div>';
  html+='<div class="hab-bar"><div class="hab-fill" style="width:'+pct+'%"></div></div>';
  html+='</div>';
  html+='<div class="hab-score'+(allDone?' all-done':'')+'">'+
        '<div class="hab-score-num">'+p.done+'/'+p.total+'</div>'+
        '<div class="hab-score-lbl">'+(isToday?'today':formatHabitDate(selectedHabitDate))+'</div></div>';
  html+='</div>';

  // ── DATE NAV
  html+='<div class="hab-date-nav">'+
        '<button class="hab-date-btn" onclick="shiftHabitDay(-1)">‹</button>'+
        '<span class="hab-date-lbl">'+(isToday?'Today':formatHabitDate(selectedHabitDate))+'</span>'+
        '<button class="hab-date-btn" onclick="shiftHabitDay(1)" '+(isToday?'disabled':'')+'>›</button>'+
        '</div>';

  // ── HABITS LIST
  html+='<div class="hab-list">';
  if(!hab.length){
    html+='<div class="hab-empty">No habits scheduled for this day.</div>';
  } else {
    hab.forEach(function(h){
      var done=isHabitDone(h.id, selectedHabitDate);
      html+='<div class="hab-row'+(done?' done':'')+'" onclick="toggleHabit(\''+h.id+'\')">';
      html+='<div class="hab-chk'+(done?' on':'')+'"></div>';
      html+='<div class="hab-row-lbl">'+h.icon+' '+h.label;
      if(h.weekly) html+=' <span class="hab-badge-weekly">weekly</span>';
      if(h.wildcard) html+=' <span class="hab-badge-weekly" style="background:var(--forest)">bonus</span>';
      html+='</div>';
      html+='</div>';
    });
  }
  html+='</div>';

  // ── CONTACT LOG (always shows full log regardless of selected date)
  var cons=Object.keys(contactData).map(function(k){ return contactData[k]; })
    .sort(function(a,b){ return (b.createdAt||0)-(a.createdAt||0); })
    .slice(0,30);
  var conCount=Object.keys(contactData).length;
  html+='<div class="hab-sec-title" style="margin-top:22px">Contact log '+
        '<span class="hab-sec-count">'+conCount+'</span></div>';
  if(!cons.length){
    html+='<div class="hab-empty">No contacts yet — they appear here after you tick a contact habit.</div>';
  } else {
    var today=td();
    html+='<div class="hab-con-list">';
    cons.forEach(function(c){
      var isNew=c.type==='new_contact';
      html+='<div class="hab-con-row" onclick="openEditContact(\''+c.id+'\')">';
      html+='<span class="hab-con-badge" style="background:'+(isNew?'var(--teal)':'var(--berry)')+'">'+
            (isNew?'New':'Catch-up')+'</span>';
      html+='<div class="hab-con-name">'+e(c.name||'')+'</div>';
      var meta=[];
      if(c.contactDate) meta.push(c.contactDate);
      if(c.where) meta.push(e(c.where));
      if(meta.length) html+='<div class="hab-con-meta">'+meta.join(' · ')+'</div>';
      if(c.outcome) html+='<div class="hab-con-outcome">'+e(c.outcome)+'</div>';
      if(c.followUpDate){
        var past=c.followUpDate<today;
        html+='<div class="hab-con-fu'+(past?' past':'')+'">↩ Follow up: '+c.followUpDate+'</div>';
      }
      html+='</div>';
    });
    html+='</div>';
  }
  html+='<div style="height:24px"></div>';
  el.innerHTML=html;
}

// ── ACTIONS ──────────────────────────────────────────────
function toggleHabit(id){
  var h=findHabit(id); if(!h) return;
  var done=isHabitDone(id, selectedHabitDate);
  if(!done&&h.requiresLog){
    openContactModal(id);
  } else {
    setHabitDone(id, !done, null, selectedHabitDate);
  }
}

function openContactModal(habitId){
  var h=findHabit(habitId);
  openModal(
    '<div class="mhandle"></div>'+
    '<div class="mtitle">'+(h?h.label:'Log contact')+'</div>'+
    '<div class="fg"><label class="flbl">Name *</label>'+
    '<input type="text" class="finput" id="ct-name" placeholder="Who did you connect with?"></div>'+
    '<div class="fg"><label class="flbl">Where</label>'+
    '<input type="text" class="finput" id="ct-where" placeholder="LinkedIn, phone, event…"></div>'+
    '<div class="fg"><label class="flbl">Outcome</label>'+
    '<textarea class="finput" id="ct-outcome" placeholder="What happened?" style="height:80px;resize:none"></textarea></div>'+
    '<div class="fg"><label class="flbl">Follow-up date <span style="font-weight:400;text-transform:none;letter-spacing:0;font-size:10px">(optional)</span></label>'+
    '<input type="date" class="fdate" id="ct-followup"></div>'+
    '<button class="btn-pri" onclick="submitContact(\''+habitId+'\')">Save &amp; mark done</button>'
  );
  setTimeout(function(){ var n=document.getElementById('ct-name'); if(n) n.focus(); },80);
}

function submitContact(habitId){
  var name=((document.getElementById('ct-name')||{}).value||'').trim();
  if(!name){ alert('Enter a name.'); return; }
  var where=((document.getElementById('ct-where')||{}).value||'').trim();
  var outcome=((document.getElementById('ct-outcome')||{}).value||'').trim();
  var fu=((document.getElementById('ct-followup')||{}).value||'');

  var cid='ct'+Date.now().toString(36)+Math.random().toString(36).substr(2,4);
  var con={id:cid, name:name, type:habitId, where:where, outcome:outcome,
           contactDate:selectedHabitDate, followUpDate:fu||null, createdAt:Date.now()};
  contactData[cid]=con;
  if(db&&!offline) db.ref('contacts/'+cid).set(con);

  // Auto-create or update CRM contact
  if(db&&!offline){
    db.ref('crm_contacts').orderByChild('name').equalTo(name).once('value',function(snap){
      var existing=snap.val();
      var existingId=existing?Object.keys(existing)[0]:null;
      if(existingId){
        var ec=existing[existingId];
        if(!ec.comments) ec.comments=[];
        ec.comments.push({text:(habitId==='catchup_contact'?'Catch-up':'New contact')+' logged via Habits',createdAt:Date.now()});
        ec.lastContact=td();
        db.ref('crm_contacts/'+existingId).set(ec);
      } else {
        db.ref('crm_contacts/'+cid).set({id:cid,name:name,phone:'',email:'',website:'',
          locations:[],categories:[],temperature:'warm',
          comments:[{text:(habitId==='new_contact'?'New contact':'Catch-up')+' logged via Habits',createdAt:Date.now()}],
          lastContact:td(),nextContact:'',habitContactId:cid,createdAt:Date.now()});
      }
    });
  }

  setHabitDone(habitId, true, {notes:name, contactId:cid}, selectedHabitDate);

  if(fu && typeof S!=='undefined' && typeof persist==='function'){
    var tid=uid();
    S.tasks[tid]={id:tid, text:'Follow up: '+name, date:fu,
                  owner:S.owner==='both'?'andre':S.owner,
                  venture:'personal', done:false, createdAt:Date.now()};
    persist();
    if(typeof renderAll==='function') renderAll();
  }
  closeModal();
  renderHabits();
}

function openEditContact(cid){
  var c=contactData[cid]; if(!c) return;
  openModal(
    '<div class="mhandle"></div>'+
    '<div class="mtitle">Edit contact</div>'+
    '<div class="fg"><label class="flbl">Name</label>'+
    '<input type="text" class="finput" id="ct-name" value="'+e(c.name||'')+'"></div>'+
    '<div class="fg"><label class="flbl">Where</label>'+
    '<input type="text" class="finput" id="ct-where" value="'+e(c.where||'')+'"></div>'+
    '<div class="fg"><label class="flbl">Outcome</label>'+
    '<textarea class="finput" id="ct-outcome" style="height:80px;resize:none">'+e(c.outcome||'')+'</textarea></div>'+
    '<div class="fg"><label class="flbl">Follow-up date</label>'+
    '<input type="date" class="fdate" id="ct-followup" value="'+e(c.followUpDate||'')+'"></div>'+
    '<button class="btn-pri" onclick="saveEditContact(\''+cid+'\')">Save changes</button>'
  );
}

function saveEditContact(cid){
  var c=contactData[cid]; if(!c) return;
  c.name=((document.getElementById('ct-name')||{}).value||c.name).trim();
  c.where=((document.getElementById('ct-where')||{}).value||'').trim();
  c.outcome=((document.getElementById('ct-outcome')||{}).value||'').trim();
  c.followUpDate=(document.getElementById('ct-followup')||{}).value||null;
  if(db&&!offline) db.ref('contacts/'+cid).set(c);
  closeModal();
  renderHabits();
}
