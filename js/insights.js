// ── INSIGHTS CHART BUILDER ──────────────────────────────
var IC_COLORS = ['#E04F28','#0A7A88','#C98A10','#B83368','#2D5C3A','#7A6E5A'];

var _icSaved = {};
try{ _icSaved = JSON.parse(ls('andaluma-ic')||'{}'); }catch(e){}
var IC = {
  period:      _icSaved.period      || 'this-month',
  customStart: _icSaved.customStart || '',
  customEnd:   _icSaved.customEnd   || '',
  expType:     _icSaved.expType     || 'all',
  ventures:    _icSaved.ventures    || [],
  tripId:      _icSaved.tripId      || 'all',
  owner:       _icSaved.owner       || 'all',
  filtersOpen: false,
};

function saveIC(){
  lss('andaluma-ic', JSON.stringify({
    period:IC.period, customStart:IC.customStart, customEnd:IC.customEnd,
    expType:IC.expType, ventures:IC.ventures, tripId:IC.tripId, owner:IC.owner
  }));
}
function icSet(key,val){ IC[key]=val; saveIC(); renderInsights(); }
function icToggleVenture(v){
  var i=IC.ventures.indexOf(v);
  if(i>=0) IC.ventures.splice(i,1); else IC.ventures.push(v);
  saveIC(); renderInsights();
}
function icToggleFilters(){ IC.filtersOpen=!IC.filtersOpen; renderInsights(); }

function icPeriodDates(){
  var n=new Date(), y=n.getFullYear(), m=n.getMonth()+1, today=td();
  switch(IC.period){
    case 'this-month':  return {s:y+'-'+p2(m)+'-01', e:today};
    case 'last-month':  var lm=m===1?{y:y-1,m:12}:{y:y,m:m-1}; return {s:lm.y+'-'+p2(lm.m)+'-01',e:lm.y+'-'+p2(lm.m)+'-31'};
    case '3m':          return {s:addDays(today,-90),e:today};
    case '6m':          return {s:addDays(today,-180),e:today};
    case 'this-year':   return {s:y+'-01-01',e:today};
    case 'all':         return {s:'2000-01-01',e:'2099-12-31'};
    case 'custom':      return {s:IC.customStart||today,e:IC.customEnd||today};
    default:            return {s:y+'-'+p2(m)+'-01',e:today};
  }
}

function icMonthsInPeriod(s,e){
  var months=[], cur=new Date(s.substr(0,7)+'-15'), end=new Date(e.substr(0,7)+'-15');
  while(cur<=end){ months.push(cur.getFullYear()+'-'+p2(cur.getMonth()+1)); cur.setMonth(cur.getMonth()+1); }
  return months;
}

function icVentureOf(ex){
  if(!ex.tripId) return 'personal';
  var t=MS.trips[ex.tripId];
  if(!t) return 'personal';
  if(t.venture) return t.venture;
  if(/business/i.test(t.name)) return 'andaluma';
  return 'personal';
}

function icBuildData(){
  var dates=icPeriodDates(), byCat={}, catExps={};
  var showDaily  = IC.expType==='all'||IC.expType==='daily'||IC.expType==='both';
  var showFixed  = IC.expType==='all'||IC.expType==='fixed'||IC.expType==='both';
  var needVenture = IC.ventures.length>0;

  // Daily/travel expenses
  if(showDaily){
    Object.values(MS.expenses).forEach(function(ex){
      if(!ex.eurAmount) return;
      if(ex.date && (ex.date<dates.s || ex.date>dates.e)) return;
      if(!ex.date && IC.period!=='all') return; // pre-trip expenses only in "all"
      if(IC.tripId!=='all' && ex.tripId!==IC.tripId) return;
      if(IC.owner!=='all' && ex.owner!=='all' && ex.owner!==IC.owner) return;
      if(needVenture && IC.ventures.indexOf(icVentureOf(ex))<0) return;
      var c=ex.category||'Others';
      byCat[c]=(byCat[c]||0)+(ex.eurAmount||0);
      if(!catExps[c]) catExps[c]=[];
      catExps[c].push(ex);
    });
  }

  // Fixed monthly expenses
  if(showFixed && IC.tripId==='all'){
    var months=icMonthsInPeriod(dates.s,dates.e);
    Object.values(MS.fixedExpenses).forEach(function(fx){
      if(IC.owner!=='all' && IC.owner!=='andre') return; // fixed are personal/both
      months.forEach(function(mk){
        var amt=getFixedAmountForMonth(fx,mk);
        if(!amt) return;
        var c=fx.category||'Others';
        byCat[c]=(byCat[c]||0)+amt;
        if(!catExps[c]) catExps[c]=[];
        catExps[c].push({id:fx.id+'_'+mk, title:fx.name, category:c, eurAmount:amt, date:mk+'-01', _isFixed:true});
      });
    });
  }

  var total=Object.values(byCat).reduce(function(s,v){return s+v;},0);
  var cats=Object.keys(byCat).sort(function(a,b){return byCat[b]-byCat[a];});
  return {byCat:byCat, catExps:catExps, cats:cats, total:total};
}

function polarToXY(cx,cy,r,angleDeg){
  var rad=(angleDeg-90)*Math.PI/180;
  return {x:cx+r*Math.cos(rad), y:cy+r*Math.sin(rad)};
}

function icArcPath(cx,cy,outerR,innerR,a1,a2){
  if(a2-a1>=360) a2=a1+359.99;
  var o1=polarToXY(cx,cy,outerR,a1), o2=polarToXY(cx,cy,outerR,a2);
  var i1=polarToXY(cx,cy,innerR,a2), i2=polarToXY(cx,cy,innerR,a1);
  var lg=a2-a1>180?1:0;
  return 'M'+o1.x.toFixed(2)+' '+o1.y.toFixed(2)+
    ' A'+outerR+' '+outerR+' 0 '+lg+' 1 '+o2.x.toFixed(2)+' '+o2.y.toFixed(2)+
    ' L'+i1.x.toFixed(2)+' '+i1.y.toFixed(2)+
    ' A'+innerR+' '+innerR+' 0 '+lg+' 0 '+i2.x.toFixed(2)+' '+i2.y.toFixed(2)+'Z';
}

function renderICDonut(data){
  if(!data.total) return '<div class="ic-donut-empty">No expenses for this period</div>';
  var cx=120,cy=120,outerR=108,innerR=68,size=240;
  var cursor=0, paths='', labels='';
  data.cats.forEach(function(c,i){
    var pct=data.byCat[c]/data.total;
    var sweep=pct*360;
    var a1=cursor, a2=cursor+sweep;
    var color=IC_COLORS[i%IC_COLORS.length];
    var safe=c.replace(/'/g,"\\'").replace(/"/g,'&quot;');
    paths+='<path d="'+icArcPath(cx,cy,outerR,innerR,a1,a2)+'" fill="'+color+'" data-cat="'+safe+'" onclick="icDrilldown(\''+safe+'\')" style="cursor:pointer;transition:opacity 0.1s" onmouseenter="this.style.opacity=\'0.82\'" onmouseleave="this.style.opacity=\'1\'"><title>'+safe+': €'+Math.round(data.byCat[c])+' ('+Math.round(pct*100)+'%)</title></path>';
    // % label inside slice if big enough
    if(pct>0.07){
      var mid=cursor+sweep/2;
      var lpt=polarToXY(cx,cy,(outerR+innerR)/2,mid);
      labels+='<text x="'+lpt.x.toFixed(1)+'" y="'+lpt.y.toFixed(1)+'" text-anchor="middle" dominant-baseline="central" font-family="DM Sans,sans-serif" font-size="10" font-weight="700" fill="white" pointer-events="none">'+Math.round(pct*100)+'%</text>';
    }
    cursor+=sweep;
  });
  var totalFmt='€'+Math.round(data.total).toLocaleString();
  return '<div class="ic-donut-wrap">'+
    '<svg viewBox="0 0 '+size+' '+size+'" xmlns="http://www.w3.org/2000/svg">'+paths+labels+
    '<circle cx="'+cx+'" cy="'+cy+'" r="'+(innerR-2)+'" fill="var(--cream)" pointer-events="none"/>'+
    '</svg>'+
    '<div class="ic-donut-center">'+
      '<div class="ic-donut-total">'+totalFmt+'</div>'+
      '<div class="ic-donut-lbl">total</div>'+
    '</div>'+
  '</div>';
}

function renderICCatList(data){
  if(!data.cats.length) return '';
  var html='<div class="ic-cat-list">';
  data.cats.forEach(function(c,i){
    var pct=data.total>0?Math.round(data.byCat[c]/data.total*100):0;
    var color=IC_COLORS[i%IC_COLORS.length];
    var safe=c.replace(/'/g,"\\'");
    html+='<div class="ic-cat-row" onclick="icDrilldown(\''+safe+'\')">'+
      '<div class="ic-cat-dot" style="background:'+color+'"></div>'+
      '<div class="ic-cat-name">'+e(c)+'</div>'+
      '<div class="ic-cat-bar-wrap"><div class="ic-cat-bar" style="width:'+pct+'%;background:'+color+'"></div></div>'+
      '<div class="ic-cat-pct">'+pct+'%</div>'+
      '<div class="ic-cat-amt">€'+Math.round(data.byCat[c])+'</div>'+
    '</div>';
  });
  html+='</div>';
  return html;
}

function renderICFilters(){
  var dates=icPeriodDates();
  var periods=[
    {id:'this-month',label:'This month'},{id:'last-month',label:'Last month'},
    {id:'3m',label:'3 months'},{id:'6m',label:'6 months'},
    {id:'this-year',label:'This year'},{id:'all',label:'All time'},{id:'custom',label:'Custom'}
  ];
  var expTypes=[{id:'all',label:'All'},{id:'daily',label:'Travel'},{id:'fixed',label:'Fixed'},{id:'both',label:'Both'}];
  var ventures=[
    {id:'personal',label:'Personal',c:'berry'},{id:'andaluma',label:'Andaluma',c:'coral'},
    {id:'baraca',label:'Baraca',c:'amber'},{id:'vae',label:'VAE',c:'teal'}
  ];
  var owners=[{id:'all',label:'All'},{id:'andre',label:'André'},{id:'daniella',label:'Daniella'}];

  var pChips=periods.map(function(p){
    return '<button class="ic-chip'+(IC.period===p.id?' on':'')+'" onclick="icSet(\'period\',\''+p.id+'\')">'+p.label+'</button>';
  }).join('');

  var customDates=IC.period==='custom'?
    '<div class="ic-date-row">'+
    '<input type="date" class="ic-fdate" value="'+IC.customStart+'" onchange="icSet(\'customStart\',this.value)">'+
    '<input type="date" class="ic-fdate" value="'+IC.customEnd+'" onchange="icSet(\'customEnd\',this.value)">'+
    '</div>':'';

  var etChips=expTypes.map(function(t){
    return '<button class="ic-chip'+(IC.expType===t.id?' on':'')+'" onclick="icSet(\'expType\',\''+t.id+'\')">'+t.label+'</button>';
  }).join('');

  var vChips=ventures.map(function(v){
    var on=IC.ventures.indexOf(v.id)>=0;
    return '<button class="ic-chip'+(on?' on':'')+'"'+(on?' data-c="'+v.c+'"':'')+' onclick="icToggleVenture(\''+v.id+'\')">'+v.label+'</button>';
  }).join('');

  var tripOpts='<option value="all"'+(IC.tripId==='all'?' selected':'')+'>All trips</option>';
  Object.values(MS.trips).sort(function(a,b){return (b.startDate||'')>(a.startDate||'')?1:-1;}).forEach(function(t){
    tripOpts+='<option value="'+e(t.id)+'"'+(IC.tripId===t.id?' selected':'')+'>'+e(t.name)+'</option>';
  });

  var ownerChips=owners.map(function(o){
    return '<button class="ic-chip'+(IC.owner===o.id?' on':'')+'" onclick="icSet(\'owner\',\''+o.id+'\')">'+o.label+'</button>';
  }).join('');

  return '<div class="ic-filters">'+
    '<div class="ic-fg"><div class="ic-flbl">Time period</div><div class="ic-chips">'+pChips+'</div>'+customDates+'</div>'+
    '<div class="ic-fg"><div class="ic-flbl">Expense type</div><div class="ic-chips">'+etChips+'</div></div>'+
    '<div class="ic-fg"><div class="ic-flbl">Venture</div><div class="ic-chips">'+vChips+'</div>'+
      '<div style="font-size:10px;color:var(--muted);margin-top:4px">'+(IC.ventures.length===0?'Showing all ventures':'')+'</div></div>'+
    '<div class="ic-fg"><div class="ic-flbl">Trip</div>'+
      '<div style="position:relative"><select class="ic-select" onchange="icSet(\'tripId\',this.value)">'+tripOpts+'</select></div></div>'+
    '<div class="ic-fg"><div class="ic-flbl">Owner</div><div class="ic-chips">'+ownerChips+'</div></div>'+
  '</div>';
}

var _icData = null;
function icDrilldown(category){
  var data = _icData;
  if(!data || !data.catExps[category]) return;
  var exps = data.catExps[category];
  var cat = CATS[category]||CATS['Others'];
  var color = IC_COLORS[data.cats.indexOf(category)%IC_COLORS.length];
  var total = exps.reduce(function(s,ex){return s+(ex.eurAmount||0);},0);
  exps.sort(function(a,b){return (b.eurAmount||0)-(a.eurAmount||0);});
  var rows = exps.map(function(ex){
    var dateLabel = ex.date ? new Date(ex.date+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : 'Pre-trip';
    var trip = ex.tripId && MS.trips[ex.tripId] ? MS.trips[ex.tripId].name : (ex._isFixed?'Fixed':'');
    return '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--sand)">'+
      '<div style="flex:1;min-width:0">'+
        '<div style="font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+e(ex.title||category)+'</div>'+
        '<div style="font-size:10px;color:var(--muted);margin-top:2px">'+dateLabel+(trip?' · '+e(trip):'')+'</div>'+
      '</div>'+
      '<div style="font-size:14px;font-weight:700;color:'+color+';flex-shrink:0">€'+(ex.eurAmount||0).toFixed(2)+'</div>'+
      (!ex._isFixed?'<button onclick="openExpMenu(\''+ex.id+'\')" style="background:none;border:none;cursor:pointer;color:var(--muted);font-size:20px;padding:2px 4px;flex-shrink:0;line-height:1">⋯</button>':'')+
    '</div>';
  }).join('');
  openModal(
    '<div class="mhandle"></div>'+
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">'+
      '<div style="width:36px;height:36px;border-radius:8px;background:'+color+'22;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">'+cat.icon+'</div>'+
      '<div><div class="mtitle" style="margin-bottom:0">'+e(category)+'</div>'+
      '<div style="font-size:11px;color:var(--muted)">'+exps.length+' expense'+(exps.length!==1?'s':'')+' · €'+Math.round(total)+' total</div></div>'+
    '</div>'+rows
  );
}

function renderInsights(){
  var el = document.getElementById('insights-view');
  if(!el) return;

  // Build filtered data for chart
  _icData = icBuildData();
  var data = _icData;

  var html = '';

  // ── Interactive chart builder ──
  html += '<div class="ic-header">'+
    '<div class="ic-title">Spending</div>'+
    '<button class="ic-customize-btn" onclick="icToggleFilters()">'+
      (IC.filtersOpen ? 'Close ▴' : 'Customize ▾')+
    '</button>'+
  '</div>';
  if(IC.filtersOpen) html += renderICFilters();
  html += '<div class="ic-donut-section">'+renderICDonut(data)+'</div>';
  html += renderICCatList(data);
  html += '<div style="height:1px;background:var(--sand);margin:16px 20px 0"></div>';

  // ── All-time overview stats ──
  var allExps = Object.values(MS.expenses).filter(function(ex){ return ex.eurAmount > 0; });
  var totalEur = allExps.reduce(function(s,ex){return s+(ex.eurAmount||0);},0);
  var byCatAll = {}, byTripAll = {}, byMonthAll = {};
  allExps.forEach(function(ex){
    var c=ex.category||'Others'; byCatAll[c]=(byCatAll[c]||0)+(ex.eurAmount||0);
    var t=ex.tripId?(MS.trips[ex.tripId]?MS.trips[ex.tripId].name:'Unknown'):'General'; byTripAll[t]=(byTripAll[t]||0)+(ex.eurAmount||0);
    if(ex.date){ var m=ex.date.substr(0,7); byMonthAll[m]=(byMonthAll[m]||0)+(ex.eurAmount||0); }
  });
  var catTotalAll=Object.values(byCatAll).reduce(function(s,v){return s+v;},0);
  var tripTotal=Object.values(byTripAll).reduce(function(s,v){return s+v;},0);
  var catSortedAll=Object.keys(byCatAll).sort(function(a,b){return byCatAll[b]-byCatAll[a];});
  var tripSorted=Object.keys(byTripAll).sort(function(a,b){return byTripAll[b]-byTripAll[a];});
  var monthSorted=Object.keys(byMonthAll).sort();

  html += '<div class="ins-section">'+
    '<div class="ins-title">All-time overview</div>'+
    '<div class="ins-stat-grid">'+
    '<div class="ins-stat"><div class="ins-stat-val">€'+Math.round(totalEur).toLocaleString()+'</div><div class="ins-stat-lbl">Total tracked</div></div>'+
    '<div class="ins-stat"><div class="ins-stat-val">'+allExps.length+'</div><div class="ins-stat-lbl">Expenses</div></div>'+
    '<div class="ins-stat"><div class="ins-stat-val">'+Object.keys(MS.trips).length+'</div><div class="ins-stat-lbl">Trips</div></div>'+
    '<div class="ins-stat"><div class="ins-stat-val">'+catSortedAll.length+'</div><div class="ins-stat-lbl">Categories</div></div>'+
    '</div></div>';

  html += '<div class="ins-section"><div class="ins-title">By destination</div>';
  var tripColors=[IC_COLORS[0],IC_COLORS[1],IC_COLORS[2],IC_COLORS[3],IC_COLORS[4],IC_COLORS[5]];
  tripSorted.forEach(function(t,i){
    var pct=tripTotal>0?Math.round(byTripAll[t]/tripTotal*100):0;
    var col=tripColors[i%tripColors.length];
    html+='<div class="ins-row"><div class="ins-row-label"><div class="ins-dot" style="background:'+col+'"></div>'+e(t)+'</div>'+
      '<div class="ins-bar-wrap"><div class="ins-bar" style="width:'+pct+'%;background:'+col+'"></div></div>'+
      '<div class="ins-val">€'+Math.round(byTripAll[t])+'</div></div>';
  });
  html += '</div>';

  if(monthSorted.length){
    var maxMonth=Math.max.apply(null,monthSorted.map(function(m){return byMonthAll[m];}));
    html += '<div class="ins-section"><div class="ins-title">By month</div>';
    monthSorted.slice(-12).forEach(function(m){
      var pct=maxMonth>0?Math.round(byMonthAll[m]/maxMonth*100):0;
      var label=new Date(m+'-15').toLocaleDateString('en-GB',{month:'short',year:'numeric'});
      html+='<div class="ins-row"><div class="ins-row-label" style="min-width:60px">'+e(label)+'</div>'+
        '<div class="ins-bar-wrap"><div class="ins-bar" style="width:'+pct+'%;background:var(--coral)"></div></div>'+
        '<div class="ins-val">€'+Math.round(byMonthAll[m])+'</div></div>';
    });
    html += '</div>';
  }

  el.innerHTML = html;
}

var _ddState = {cat:'', sort:'amount-desc'};
function showCatDrilldown(category, sort){
  sort = sort || _ddState.sort || 'amount-desc';
  _ddState = {cat:category, sort:sort};
  var cat = CATS[category]||CATS['Others'];
  var exps = Object.values(MS.expenses).filter(function(ex){
    return ex.category === category && ex.eurAmount > 0;
  });
  if(sort==='amount-asc') exps.sort(function(a,b){ return (a.eurAmount||0)-(b.eurAmount||0); });
  else if(sort==='date-desc') exps.sort(function(a,b){ return (b.date||'')>(a.date||'') ? 1 : -1; });
  else exps.sort(function(a,b){ return (b.eurAmount||0)-(a.eurAmount||0); });
  var total = exps.reduce(function(s,ex){ return s+(ex.eurAmount||0); }, 0);
  var sortDefs = [{id:'amount-desc',label:'↓ Highest'},{id:'amount-asc',label:'↑ Lowest'},{id:'date-desc',label:'New → Old'}];
  var chips = sortDefs.map(function(s){
    var on = s.id===sort;
    return '<button onclick="showCatDrilldown(\''+e(category)+'\',\''+s.id+'\')" style="padding:5px 11px;border-radius:14px;border:1.5px solid '+(on?cat.color:'var(--sand)')+';background:'+(on?cat.color+'22':'transparent')+';color:'+(on?cat.color:'var(--muted)')+';font-size:11px;font-weight:600;font-family:inherit;cursor:pointer;white-space:nowrap">'+s.label+'</button>';
  }).join('');
  var rows = exps.map(function(ex){
    var dateLabel = ex.date ? new Date(ex.date+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short'}) : 'Pre-trip';
    var trip = ex.tripId && MS.trips[ex.tripId] ? MS.trips[ex.tripId].name : '';
    return '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--sand)">'+
      '<div style="flex:1;min-width:0">'+
        '<div style="font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+e(ex.title||category)+'</div>'+
        '<div style="font-size:10px;color:var(--muted);margin-top:2px">'+dateLabel+(trip?' \xb7 '+e(trip):'')+'</div>'+
      '</div>'+
      '<div style="font-size:14px;font-weight:700;color:'+cat.color+';flex-shrink:0;margin-left:8px">€'+(ex.eurAmount||0).toFixed(2)+'</div>'+
      '<button onclick="openExpMenu(\''+ex.id+'\')" style="background:none;border:none;cursor:pointer;color:var(--muted);font-size:20px;padding:2px 4px;flex-shrink:0;line-height:1">⋯</button>'+
    '</div>';
  }).join('');
  openModal(
    '<div class="mhandle"></div>'+
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">'+
      '<div style="width:36px;height:36px;border-radius:8px;background:'+cat.color+'22;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">'+cat.icon+'</div>'+
      '<div><div class="mtitle" style="margin-bottom:0">'+e(category)+'</div>'+
      '<div style="font-size:11px;color:var(--muted)">'+exps.length+' expenses \xb7 €'+Math.round(total)+' total</div></div>'+
    '</div>'+
    '<div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">'+chips+'</div>'+
    rows
  );
}
