function weekDays(off){var t=new Date(),dow=t.getDay(),mon=new Date(t);mon.setDate(t.getDate()-((dow+6)%7)+off*7);var r=[];for(var i=0;i<7;i++){var d=new Date(mon);d.setDate(mon.getDate()+i);r.push(d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate()));}return r;}
function dayName(str){return['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][(new Date(str+'T12:00:00').getDay()+6)%7];}
function dayNum(str){return new Date(str+'T12:00:00').getDate();}
function fmtDay(str){return new Date(str+'T12:00:00').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'});}

// ── TASK CRUD ────────────────────────────────────────────
function addTask(t){
  var id=uid();
  t.id=id;t.status='todo';t.rolled=false;t.rollCount=0;t.createdAt=Date.now();
  S.tasks[id]=t;persist();renderAll();
}

function addTaskBoth(t){
  var id1=uid(), id2=uid();
  var t1=Object.assign({},t,{id:id1,owner:'andre',status:'todo',rolled:false,rollCount:0,createdAt:Date.now()});
  var t2=Object.assign({},t,{id:id2,owner:'daniella',status:'todo',rolled:false,rollCount:0,createdAt:Date.now()+1});
  S.tasks[id1]=t1;S.tasks[id2]=t2;persist();renderAll();
}

function updTask(id,chg){if(!S.tasks[id])return;Object.assign(S.tasks[id],chg);persist();renderAll();}
function delTask(id){delete S.tasks[id];persist();renderAll();}

function cycleStatus(id,recurDate){
  if(recurDate){
    var k=id+'_'+recurDate,ov=S.tasks[k],cur=ov?ov.status:'todo';
    var nxt={todo:'inprogress',inprogress:'done',done:'todo'}[cur]||'inprogress';
    if(nxt==='todo')delete S.tasks[k];
    else S.tasks[k]={id:k,status:nxt,_ov:true,parent:id,date:recurDate};
    persist();renderAll();
  }else{
    var t=S.tasks[id];if(!t)return;
    updTask(id,{status:{todo:'inprogress',inprogress:'done',done:'todo'}[t.status]||'inprogress'});
  }
}

function openRoll(id){
  var t=S.tasks[id]; if(!t) return;
  var days=[];
  for(var i=1;i<=14;i++){
    var d=addDays(t.date||S.date,i);
    var dt=new Date(d+'T12:00:00');
    var label=dt.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});
    days.push({d:d,l:label});
  }
  var chips=days.map(function(day){
    return '<div class="dchip roll-day-chip" data-d="'+day.d+'" style="padding:10px 14px;font-size:13px">'+day.l+'</div>';
  }).join('');
  openModal(
    '<div class="mhandle"></div>'+
    '<div class="mtitle">Move to which day?</div>'+
    '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px">'+chips+'</div>'
  );
  setTimeout(function(){
    document.querySelectorAll('.roll-day-chip').forEach(function(el){
      el.addEventListener('click',function(){
        var nd=this.getAttribute('data-d');
        rollTaskToDate(id,nd);
        closeModal();
      });
    });
  },50);
}

function rollTaskToDate(id,newDate){
  var t=S.tasks[id];if(!t)return;
  var nid=uid();
  S.tasks[nid]=Object.assign({},t,{id:nid,date:newDate,status:'todo',rolled:true,rollCount:(t.rollCount||0)+1,createdAt:Date.now()});
  S.tasks[id].status='done';persist();renderAll();
}

function rollTask(id){
  var t=S.tasks[id];if(!t)return;
  var nid=uid(),nd=addDays(t.date||S.date,1);
  S.tasks[nid]=Object.assign({},t,{id:nid,date:nd,status:'todo',rolled:true,rollCount:(t.rollCount||0)+1,createdAt:Date.now()});
  S.tasks[id].status='done';persist();renderAll();
}

function splitTask(id,t1,t2,d2){
  var t=S.tasks[id];if(!t)return;
  S.tasks[id].title=t1;
  var nid=uid();
  S.tasks[nid]=Object.assign({},t,{id:nid,title:t2,date:d2||t.date,status:'todo',rolled:(d2&&d2!==t.date),rollCount:0,createdAt:Date.now()+1});
  persist();renderAll();
}

function tasksForDate(date){
  var res=[],own=S.owner;
  Object.values(S.tasks).forEach(function(t){
    if(t._ov)return;
    if(own!=='both'&&t.owner!==own)return;
    if(t.recurring){
      var ok=false;
      if(t.recurType==='daily'&&t.date&&t.date<=date)ok=true;
      else if(t.recurType==='weekly'&&t.date&&t.date<=date&&t.recurDays){
        var dow=(new Date(date+'T12:00:00').getDay());
        if(t.recurDays.indexOf(dow)>=0)ok=true;
      }
      if(ok){var k=t.id+'_'+date,ov=S.tasks[k];res.push(Object.assign({},t,ov||{},{_ri:true,_rd:date,status:ov?ov.status:(t.status||'todo')}));}
    }else if(t.date===date){res.push(t);}
  });
  var ord={todo:0,inprogress:1,done:2};
  res.sort(function(a,b){return(ord[a.status]||0)-(ord[b.status]||0);});
  return res;
}

function somedayTasks(){
  var own=S.owner;
  return Object.values(S.tasks).filter(function(t){return!t._ov&&(own==='both'||t.owner===own)&&!t.date&&!t.recurring;});
}

function vLabel(v){return{andaluma:'Andaluma',vae:'VAE',baraca:'Baraca',personal:'Personal','andaluma2':'Andaluma'}[v]||v;}

// ── RENDER TASKS ─────────────────────────────────────────
function renderAll(){renderHdr();renderOwner();renderWeek();renderDay();}

function renderHdr(){
  var gcalId=ls('andaluma-gcal');
  var gcalBtn=gcalId?('<button class="btn-gcal'+(gcalToken?' connected':'')+'" onclick="connectGcal()">'+(gcalToken?'📅 Cal ✓':'📅 Calendar')+'</button>'):'';
  var sync=db&&!offline?'● synced':'○ local';
  var tz=TZS.map(function(t){return'<div class="tz-pill" style="background:'+t.bg+'"><div class="tz-lbl">'+t.l+'</div><div class="tz-time">'+tzTime(t.z)+'</div></div>';}).join('');
  document.getElementById('hdr').innerHTML=
    '<div class="hdr-top">'+
    '<div class="hdr-logo-grid">'+
    '<div class="hdr-tile" style="background:var(--coral)">An</div>'+
    '<div class="hdr-tile" style="background:var(--berry)">Da</div>'+
    '<div class="hdr-tile" style="background:var(--teal)">Lu</div>'+
    '<div class="hdr-tile" style="background:var(--amber)">Ma</div>'+
    '</div>'+
    '<div class="hdr-right">'+
    '<div class="tz-pills-wrap">'+tz+'</div>'+
    gcalBtn+'<div class="hdr-sync">'+sync+'</div><button class="gear-btn" onclick="openSettings()">&#9881;&#65039;</button></div>'+
    '</div>';
}

function renderOwner(){
  var os=[{id:'andre',l:'André'},{id:'daniella',l:'Daniella'},{id:'both',l:'Both'}];
  var btns=os.map(function(o){return'<button class="obtn'+(S.owner===o.id?' on':'')+'" data-o="'+o.id+'" onclick="setOwner(''+o.id+'')">'+o.l+'</button>';}).join('');
  document.getElementById('owner-wrap').innerHTML='<div class="owner-bar">'+btns+'</div>';
}

function renderWeek(){
  var days=weekDays(S.wkOff),today=td();
  var h='<button class="wk-arr" onclick="shiftWk(-1)">‹</button>';
  days.forEach(function(d){
    var sel=d===S.date,tod=d===today;
    var tasks=tasksForDate(d);
    var vs={};tasks.forEach(function(t){if(t.venture)vs[t.venture]=true;});
    var dots=Object.keys(vs).slice(0,4).map(function(v){return'<div class="wk-vdot" style="background:'+(VCOL[v]||'#999')+'"></div>';}).join('');
    h+='<div class="wk-day'+(sel?' sel':'')+(tod&&!sel?' tod':'')+'" onclick="selDate(''+d+'')">'+
      '<div class="wk-dn">'+dayName(d)+'</div>'+
      '<div class="wk-num">'+dayNum(d)+'</div>'+
      '<div class="wk-dots">'+dots+'</div>'+
      '</div>';
  });
  h+='<button class="wk-arr" onclick="shiftWk(1)">›</button>';
  document.getElementById('week-wrap').innerHTML=h;
}

function renderTaskItem(t){
  var v=t.venture||'personal',st=t.status||'todo',cb=st==='done'?'✓':'';
  var tags='<span class="vbadge" data-v="'+e(v)+'">'+e(vLabel(v))+'</span>';
  if(t.rolled)tags+='<span class="tag-roll">↩'+(t.rollCount>1?' '+t.rollCount+'×':'')+'</span>';
  if(t.recurring||t._ri)tags+='<span class="tag-rec">↻</span>';
  if(S.owner==='both')tags+='<span class="tag-own" data-o="'+e(t.owner||'andre')+'">'+(t.owner==='daniella'?'D':'A')+'</span>';
var cbc=t._ri?'cycleStatus(''+t.id+'',''+e(t._rd||'')+'')':'cycleStatus(''+t.id+'','')';
  return'<div class="ti '+st+(t.rolled?' rolled':'')+'" data-v="'+e(v)+'">'+
    '<div class="ti-accent"></div>'+
    '<div class="ti-inner">'+
    '<button class="ti-cb" onclick="'+cbc+'">'+cb+'</button>'+
    '<div class="ti-body"><div class="ti-title">'+e(t.title)+'</div><div class="ti-tags">'+tags+'</div></div>'+
    '<button class="ti-more" onclick="openMenu(''+e(t.id)+'')">⋯</button>'+
    '</div></div>';
}

function renderDay(){
  var tasks=tasksForDate(S.date),sd=somedayTasks();
  var done=tasks.filter(function(t){return t.status==='done';}).length;
  var d=new Date(S.date+'T12:00:00');
  var h='';
  if(S.calEvs.length){
    h+='<div class="sec-divider"><div class="sec-divider-lbl" style="color:var(--teal)">Calendar</div><div class="sec-divider-line" style="background:rgba(10,122,136,0.2)"></div></div>';
    S.calEvs.forEach(function(ev){var t=ev.start&&ev.start.dateTime?new Date(ev.start.dateTime).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',hour12:false}):'All day';h+='<div class="cal-ev"><div class="cal-time">'+e(t)+'</div><div class="cal-title">'+e(ev.summary||'')+'</div></div>';});
  }
  h+='<div class="day-hdr"><div class="day-title">'+e(d.toLocaleDateString('en-GB',{weekday:'long'}))+'</div>'+
    '<div class="day-meta">'+e(d.toLocaleDateString('en-GB',{day:'numeric',month:'short'}))+
    (tasks.length?' · '+done+'/'+tasks.length+' done':'')+'</div></div>';
  h+='<div class="tlist">';
  if(!tasks.length)h+='<div class="empty"><div class="empty-icon">✦</div><div class="empty-txt">Nothing here.<br>Tap <strong>+</strong> to add a task.</div></div>';
  else tasks.forEach(function(t){h+=renderTaskItem(t);});
  h+='</div>';
  h+='<div class="someday-hdr"><div class="someday-title">Someday</div>'+
    '<button class="someday-toggle" onclick="toggleSD()">'+(S.showSD?'Hide':'Show ('+sd.length+')')+'</button></div>';
  if(S.showSD){
    h+='<div class="tlist" style="padding-top:0">';
    if(!sd.length)h+='<div class="empty"><div class="empty-txt">Nothing in someday yet.</div></div>';
    else sd.forEach(function(t){h+=renderTaskItem(t);});
    h+='</div>';
  }
  document.getElementById('day-view').innerHTML=h;
}

function setOwner(o){S.owner=o;renderOwner();renderWeek();renderDay();}
function selDate(d){S.date=d;var days=weekDays(S.wkOff);if(days.indexOf(d)<0){var diff=Math.round((new Date(d+'T12:00:00')-new Date())/604800000);S.wkOff=Math.round(diff);}if(gcalToken)fetchCal(d);renderWeek();renderDay();}
function shiftWk(dir){S.wkOff+=dir;renderWeek();}
function toggleSD(){S.showSD=!S.showSD;renderDay();}

// ── ADD / EDIT TASK MODALS ────────────────────────────────
function openAdd(pre){
  mst={title:pre||'',venture:'andaluma',owner:S.owner==='both'?'both':S.owner,date:S.date,someday:false,rec:false,recType:'daily',recDays:[],manualDate:''};
  drawAdd();
}

function drawAdd(){
  var m=mst;
  var vs=[{id:'andaluma',l:'Andaluma'},{id:'vae',l:'VAE'},{id:'baraca',l:'Baraca'},{id:'personal',l:'Personal'}];
  var os=[{id:'andre',l:'André'},{id:'daniella',l:'Daniella'},{id:'both',l:'Both'}];
  var wds=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var vch=vs.map(function(v){return'<div class="vchip'+(m.venture===v.id?' on':'')+'" data-v="'+v.id+'" onclick="mst.venture=''+v.id+'';drawAdd()">'+v.l+'</div>';}).join('');
  var och=os.map(function(o){return'<div class="ochip'+(m.owner===o.id?' on':'')+'" data-o="'+o.id+'" onclick="mst.owner=''+o.id+'';drawAdd()">'+o.l+'</div>';}).join('');
  var reh='';
  if(m.rec){
    reh='<div class="recopts">'+
      '<div class="recopt'+(m.recType==='daily'?' on':'')+'" onclick="mst.recType='daily';drawAdd()">Daily</div>'+
      '<div class="recopt'+(m.recType==='weekly'?' on':'')+'" onclick="mst.recType='weekly';drawAdd()">Weekly</div>'+
      '<div class="recopt'+(m.recType==='manual'?' on':'')+'" onclick="mst.recType='manual';drawAdd()">Specific date</div>'+
      '</div>';
    if(m.recType==='weekly'){
      reh+='<div class="daychips">'+wds.map(function(d,i){return'<div class="dchip'+(m.recDays.indexOf(i)>=0?' on':'')+'" onclick="tRD('+i+')">'+d+'</div>';}).join('')+'</div>';
    }
    if(m.recType==='manual'){
      reh+='<div style="margin-top:8px"><input type="date" class="fdate" id="t-manual-date" value="'+e(m.manualDate)+'" onchange="mst.manualDate=this.value;mst.date=this.value"></div>';
    }
  }
  openModal(
    '<div class="mhandle"></div><div class="mtitle">New task</div>'+
    '<div class="fg"><label class="flbl">Title</label><div class="imic">'+
    '<input type="text" class="finput" id="t-title" value="'+e(m.title)+'" placeholder="What needs doing?" oninput="mst.title=this.value">'+
    '<button class="micbtn" id="t-mic" onclick="voiceForInput()">🎤</button></div></div>'+
    '<div class="fg"><label class="flbl">Venture</label><div class="vgrid">'+vch+'</div></div>'+
    '<div class="fg"><label class="flbl">For</label><div class="ochips">'+och+'</div></div>'+
    '<div class="fg"><label class="flbl">Date</label>'+
    '<input type="date" class="fdate" id="t-date" value="'+(m.someday?'':m.date)+'" onchange="mst.date=this.value" '+(m.someday||m.recType==='manual'&&m.rec?'disabled':'')+'>'+
    '<label class="sdcheck"><input type="checkbox" '+(m.someday?'checked':'')+' onchange="mst.someday=this.checked;drawAdd()"> No date yet — Someday</label></div>'+
    '<div class="fg"><div class="recrow"><button class="sw'+(m.rec?' on':'')+'" onclick="mst.rec=!mst.rec;drawAdd()"></button><span>Recurring</span></div>'+reh+'</div>'+
    '<button class="btn-pri" onclick="submitAdd()">Add task</button>'
  );
  setTimeout(function(){var el=document.getElementById('t-title');if(el)el.focus();},80);
}

function tRD(i){var idx=mst.recDays.indexOf(i);if(idx>=0)mst.recDays.splice(idx,1);else mst.recDays.push(i);drawAdd();}

function submitAdd(){
  var title=(document.getElementById('t-title')||{}).value||mst.title;
  if(!title.trim()){alert('Enter a title.');return;}
  var date=mst.someday?null:(mst.date||S.date);
  var task={
    title:title.trim(),venture:mst.venture,
    date:mst.rec&&mst.recType==='manual'?(mst.manualDate||S.date):date,
    recurring:mst.rec&&mst.recType!=='manual',
    recurType:mst.rec&&mst.recType!=='manual'?mst.recType:null,
    recurDays:mst.rec&&mst.recType==='weekly'?mst.recDays:null,
    notes:''
  };
  if(mst.owner==='both'){
    addTaskBoth(task);
  }else{
    task.owner=mst.owner;
    addTask(task);
  }
  closeModal();
}

function openMenu(id){
  var t=S.tasks[id];if(!t)return;
  var isAndre = t.owner==='andre';
  var newOwner = isAndre ? 'daniella' : 'andre';
  var acts=[
    {ic:'↩',l:'Roll to another day',bg:'rgba(201,138,16,0.1)',col:'var(--amber)',fn:'openRoll(''+id+'')'},
    {ic:'✂',l:'Split task',bg:'rgba(10,122,136,0.1)',col:'var(--teal)',fn:'openSplit(''+id+'')'},
    {ic:'✏',l:'Edit',bg:'var(--sand)',col:'var(--dark)',fn:'openEdit(''+id+'')'},
    {ic:'→',l:'Move to Someday',bg:'var(--sand)',col:'var(--muted)',fn:'updTask(''+id+'',{date:null});closeModal()'},
    {ic:isAndre?'👩':'👨',l:isAndre?'Move to Daniella':'Move to André',bg:isAndre?'rgba(184,51,104,0.1)':'rgba(224,79,40,0.1)',col:isAndre?'var(--berry)':'var(--coral)',fn:'updTask(''+id+'',{owner:"'+newOwner+'"});closeModal()'},
    {ic:'🗑',l:'Delete',bg:'rgba(192,57,43,0.08)',col:'#C0392B',fn:'doDelete(''+id+'')'},
  ];
  var menuHtml = '<div class="mhandle"></div>'+
    '<div style="font-family:Playfair Display,serif;font-size:17px;margin-bottom:3px">'+e(t.title)+'</div>'+
    '<div style="font-size:11px;color:var(--muted);margin-bottom:20px">'+vLabel(t.venture)+(t.date?' &middot; '+t.date:'')+'</div>'+
    '<div class="alist">';
  acts.forEach(function(a,i){
    menuHtml += '<div class="aitem'+(a.col==='#C0392B'?' danger':'')+'" data-mi="'+i+'"><div class="aicon" style="background:'+a.bg+';color:'+a.col+'">'+a.ic+'</div>'+a.l+'</div>';
  });
  menuHtml += '</div>';
  openModal(menuHtml);
  document.querySelectorAll('.aitem[data-mi]').forEach(function(el){
    el.addEventListener('click', function(){
      var idx = parseInt(this.getAttribute('data-mi'));
      eval(acts[idx].fn);
    });
  });
}

function doDelete(id){var t=S.tasks[id];if(t&&confirm('Delete "'+t.title+'"?')){delTask(id);closeModal();}}

function openSplit(id){
  var t=S.tasks[id];if(!t)return;
  openModal('<div class="mhandle"></div><div class="mtitle">Split task</div>'+
    '<div class="fg"><label class="flbl">Part 1 — stays on '+t.date+'</label>'+
    '<input type="text" class="finput" id="sp1" value="'+e(t.title)+'"></div>'+
    '<div class="fg"><label class="flbl">Part 2</label>'+
    '<input type="text" class="finput" id="sp2" placeholder="Second part..."></div>'+
    '<div class="fg"><label class="flbl">Part 2 goes to</label>'+
    '<div class="split2">'+
    '<button style="background:var(--sand);color:var(--dark)" onclick="doSplit(''+id+'','same')">Same day</button>'+
    '<button style="background:var(--coral);color:white" onclick="doSplit(''+id+'','next')">Next day</button>'+
    '</div></div>');
}

function doSplit(id,when){
  var t1=(document.getElementById('sp1')||{}).value||'';
  var t2=(document.getElementById('sp2')||{}).value||'';
  if(!t1.trim()||!t2.trim()){alert('Both parts need a title.');return;}
  var t=S.tasks[id],d2=when==='next'?addDays(t.date||S.date,1):(t.date||S.date);
  splitTask(id,t1.trim(),t2.trim(),d2);closeModal();
}

function openEdit(id){
  var t=S.tasks[id];if(!t)return;
  openModal('<div class="mhandle"></div><div class="mtitle">Edit task</div>'+
    '<div class="fg"><label class="flbl">Title</label><input type="text" class="finput" id="ed-t" value="'+e(t.title)+'"></div>'+
    '<div class="fg"><label class="flbl">Date</label><input type="date" class="fdate" id="ed-d" value="'+(t.date||'')+'"></div>'+
    '<button class="btn-pri" onclick="doEdit(''+id+'')">Save</button>');
}

function doEdit(id){
  var title=(document.getElementById('ed-t')||{}).value||'';
  var date=(document.getElementById('ed-d')||{}).value||null;
  if(!title.trim()){alert('Title required.');return;}
  updTask(id,{title:title.trim(),date:date||null});closeModal();
}

// ── VOICE INPUT ──────────────────────────────────────────
function startVoice(){openAdd('');setTimeout(voiceForInput,300);}
function voiceForInput(){
  var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){alert('Voice input not supported in this browser. Try Chrome.');return;}
  var btn=document.getElementById('t-mic');
  if(btn){btn.textContent='⏹';btn.classList.add('listening');}
  recog=new SR();recog.lang='en-US';recog.interimResults=false;recog.maxAlternatives=1;
  recog.onresult=function(ev){var txt=ev.results[0][0].transcript;var inp=document.getElementById('t-title');if(inp){inp.value=txt;mst.title=txt;}if(btn){btn.textContent='🎤';btn.classList.remove('listening');}};
  recog.onerror=recog.onend=function(){if(btn){btn.textContent='🎤';btn.classList.remove('listening');}};
  recog.start();
}

// ── GOOGLE CALENDAR ──────────────────────────────────────
var gcalTC=null;
function connectGcal(){
  var cid=ls('andaluma-gcal');
  if(!cid){
    var newId=prompt('Enter your Google Calendar OAuth Client ID:');
    if(!newId)return;
    lss('andaluma-gcal',newId.trim());
    cid=newId.trim();
  }
  if(!window.google||!window.google.accounts){alert('Google library not loaded. Check internet connection.');return;}
  if(!gcalTC){
    gcalTC=google.accounts.oauth2.initTokenClient({
      client_id:cid,
      scope:'https://www.googleapis.com/auth/calendar.readonly',
      callback:function(r){if(!r.error){gcalToken=r.access_token;fetchCal(S.date);renderHdr();}}
    });
  }
  gcalTC.requestAccessToken();
}

function fetchCal(date){
  if(!gcalToken)return;
  var s=new Date(date+'T00:00:00').toISOString(),en=new Date(date+'T23:59:59').toISOString();
  fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin='+encodeURIComponent(s)+'&timeMax='+encodeURIComponent(en)+'&singleEvents=true&orderBy=startTime',{headers:{Authorization:'Bearer '+gcalToken}})
  .then(function(r){return r.json();}).then(function(data){S.calEvs=data.items||[];renderDay();}).catch(function(){});
}

