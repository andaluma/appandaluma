// ── FINANCE MODULE ────────────────────────────────────────
// Powers both the "Finance" tab inside the app (index.html, #finance-view)
// and the standalone finance.html page. Both host pages load this file and
// call renderFinance() into a shared '#finance-root' container — the
// rendering logic is identical either way, only the surrounding chrome
// differs. Reads/writes its own Firebase nodes (income, goals,
// settings/finance) and reads expenses/fixedExpenses independently (does
// NOT depend on money.js / MS, since finance.html doesn't load it).

// ── CONSTANTS ─────────────────────────────────────────────
var FIN_CURRENCIES = ['EUR', 'USD', 'IDR'];
var FIN_GOAL_COLORS = { emergency_fund: 'var(--teal)', christmas_peru: 'var(--coral)' };
var FIN_DEFAULT_GOALS = {
  emergency_fund: { id: 'emergency_fund', name: 'Emergency Fund', targetAmount: 10000, currentAmount: 0, color: 'teal', createdAt: Date.now() },
  christmas_peru: { id: 'christmas_peru', name: 'Christmas Peru', targetAmount: 3500, currentAmount: 0, color: 'coral', createdAt: Date.now() }
};
var FIN_DEPOSIT_ACCOUNTS = [
  { id: 'andre-wise', l: 'André · Wise' },
  { id: 'daniella-wise', l: 'Daniella · Wise' },
  { id: 'andre-revolut', l: 'André · Revolut' },
  { id: 'daniella-revolut', l: 'Daniella · Revolut' },
  { id: 'andre-global66', l: 'André · Global66' },
  { id: 'daniella-global66', l: 'Daniella · Global66' },
  { id: 'andaluma', l: 'Andaluma' }
];

// ── STATE ─────────────────────────────────────────────────
var FS = {
  income: {},
  goals: {},
  settings: { monthlyBudget: 3000, exchangeRates: {}, ratesUpdatedAt: null, hourlyRate: 25 },
  expenses: {},
  fixedExpenses: {},
  loaded: { income: false, goals: false, settings: false, expenses: false, fixedExpenses: false },
  permissionError: false
};
var finMonth = null;       // selected 'YYYY-MM', set on first render
var finHowOpen = false;    // "How to get there" collapsible
var finAllocPct = 50;      // surplus-allocation slider (% to Emergency Fund)

// ── FIREBASE ──────────────────────────────────────────────
function loadFinanceData(){
  if(!db || offline){
    FS.loaded = { income:true, goals:true, settings:true, expenses:true, fixedExpenses:true };
    renderFinance();
    return;
  }
  function permErr(){ FS.permissionError = true; renderFinance(); }
  db.ref('income').on('value', function(snap){
    FS.income = snap.val() || {};
    FS.loaded.income = true;
    renderFinance();
  }, permErr);
  db.ref('goals').on('value', function(snap){
    var v = snap.val();
    if(!v || !Object.keys(v).length){
      // Seed the two default goals once, so they become real editable records.
      db.ref('goals').set(FIN_DEFAULT_GOALS);
      FS.goals = FIN_DEFAULT_GOALS;
    } else {
      FS.goals = v;
    }
    FS.loaded.goals = true;
    renderFinance();
  }, permErr);
  db.ref('settings/finance').on('value', function(snap){
    var v = snap.val() || {};
    FS.settings = {
      monthlyBudget: (v.monthlyBudget != null) ? v.monthlyBudget : 3000,
      exchangeRates: v.exchangeRates || {},
      ratesUpdatedAt: v.ratesUpdatedAt || null,
      hourlyRate: (v.hourlyRate != null) ? v.hourlyRate : 25
    };
    FS.loaded.settings = true;
    finRefreshRatesIfStale();
    renderFinance();
  }, permErr);
  db.ref('expenses').on('value', function(snap){
    FS.expenses = snap.val() || {};
    FS.loaded.expenses = true;
    renderFinance();
  }, permErr);
  db.ref('fixedExpenses').on('value', function(snap){
    FS.fixedExpenses = snap.val() || {};
    FS.loaded.fixedExpenses = true;
    renderFinance();
  }, permErr);
}

function finPersistIncome(id, record){ if(db && !offline) db.ref('income/'+id).set(record); }
function finRemoveIncome(id){ if(db && !offline) db.ref('income/'+id).remove(); }
function finPersistGoal(id, goal){ if(db && !offline) db.ref('goals/'+id).set(goal); }
function finPersistSettings(){ if(db && !offline) db.ref('settings/finance').set(FS.settings); }

// ── CURRENCY CONVERSION ──────────────────────────────────
// Rates are cached in Firebase (settings/finance/exchangeRates) and only
// refetched when older than 7 days — not on every entry, per spec.
function finRefreshRatesIfStale(){
  if(!db || offline) return;
  var last = FS.settings.ratesUpdatedAt;
  var staleMs = 7*24*60*60*1000;
  if(last && (Date.now() - last) < staleMs) return;
  fetch('https://api.frankfurter.dev/v1/latest?from=EUR&to=USD,IDR')
    .then(function(r){ return r.json(); })
    .then(function(data){
      var r = data.rates || {};
      var rates = {};
      if(r.USD) rates.USD = Math.round((1/r.USD)*1e8)/1e8;
      if(r.IDR) rates.IDR = Math.round((1/r.IDR)*1e8)/1e8;
      FS.settings.exchangeRates = rates;
      FS.settings.ratesUpdatedAt = Date.now();
      finPersistSettings();
      renderFinance();
    })
    .catch(function(){ /* keep whatever rates we already had */ });
}

function finToEUR(amount, currency){
  amount = parseFloat(amount) || 0;
  if(currency === 'EUR') return amount;
  var rate = FS.settings.exchangeRates[currency];
  if(!rate) return amount; // no rate yet — safest fallback is 1:1, flagged in UI via missing rate footer
  return Math.round(amount * rate * 100) / 100;
}

// ── DATE / MONTH / WEEK HELPERS ──────────────────────────
function finCurrentMonthKey(){ var d=new Date(); return d.getFullYear()+'-'+p2(d.getMonth()+1); }
function finMonthLabel(mk){
  var d = new Date(parseInt(mk.substr(0,4),10), parseInt(mk.substr(5,2),10)-1, 1);
  return d.toLocaleDateString('en-GB',{month:'long',year:'numeric'});
}
function finDaysInMonth(mk){
  var y=parseInt(mk.substr(0,4),10), m=parseInt(mk.substr(5,2),10);
  return new Date(y, m, 0).getDate();
}
function finIsCurrentMonth(mk){ return mk === finCurrentMonthKey(); }
function finShiftMonth(mk, delta){
  var y=parseInt(mk.substr(0,4),10), m=parseInt(mk.substr(5,2),10)-1;
  var d=new Date(y, m+delta, 1);
  return d.getFullYear()+'-'+p2(d.getMonth()+1);
}
// ISO 8601 week number, 'YYYY-WW'
function finIsoWeekKey(dateObj){
  var d = new Date(Date.UTC(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()));
  var dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  var firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  var week = 1 + Math.round(((d - firstThursday) / 86400000 - 3 + (firstThursday.getUTCDay() + 6) % 7) / 7);
  return d.getUTCFullYear() + '-' + (week < 10 ? '0' + week : week);
}
function finLastWeekKey(){
  var d = new Date(); d.setDate(d.getDate() - 7);
  return finIsoWeekKey(d);
}
function finIsMonday(){ return new Date().getDay() === 1; }

// ── TARGET MATH (survival / full target / months remaining) ──
var FIN_SURVIVAL_TARGET = 3000;
var FIN_YEAR_EXTRA_NEEDED = 13500;
var FIN_YEAR = 2026;

function finMonthsRemainingInYear(){
  var now = new Date();
  if(now.getFullYear() > FIN_YEAR) return 0;
  if(now.getFullYear() < FIN_YEAR) return 12;
  return 12 - now.getMonth(); // inclusive of current month (getMonth is 0-indexed)
}
// How much of the €13,500 "extra" pool has already been banked in months
// that are now fully over — confirmed income only, whatever each of those
// months cleared above the €3,000 survival line (never negative per month).
// A month with no logged income contributes 0, not a penalty — we just
// don't know, so it's treated as neutral, not as a miss.
function finBankedExtraFromCompletedMonths(){
  var curKey = finCurrentMonthKey();
  var byMonth = {};
  Object.values(FS.income).forEach(function(i){
    if(i.type !== 'actual') return;
    if(!i.month || i.month.substr(0,4) !== String(FIN_YEAR)) return;
    if(i.month >= curKey) return; // only fully-completed months count
    byMonth[i.month] = (byMonth[i.month]||0) + (i.amountEUR||0);
  });
  var total = 0;
  Object.keys(byMonth).forEach(function(mk){
    total += Math.max(byMonth[mk] - FIN_SURVIVAL_TARGET, 0);
  });
  return total;
}
// Extra needed per month, from here to the end of the year, adjusted for
// what's already banked. A shortfall in an earlier month raises this for
// every month that follows; a strong month eases it. This is what makes a
// missed August target actually show up in September's number instead of
// silently disappearing.
function finExtraPerMonth(){
  var months = finMonthsRemainingInYear();
  if(months <= 0) return 0;
  var remaining = Math.max(FIN_YEAR_EXTRA_NEEDED - finBankedExtraFromCompletedMonths(), 0);
  return remaining / months;
}
function finFullTarget(){ return FIN_SURVIVAL_TARGET + finExtraPerMonth(); }
function finRenderBankedNote(){
  var curKey = finCurrentMonthKey();
  if(curKey <= FIN_YEAR+'-01') return ''; // no completed months yet to report on
  var banked = finBankedExtraFromCompletedMonths();
  var remaining = Math.max(FIN_YEAR_EXTRA_NEEDED - banked, 0);
  return '<div class="fin-target-banked-note">€'+fmtEUR(banked)+' of the €'+fmtEUR(FIN_YEAR_EXTRA_NEEDED)+
    ' already banked from earlier months — €'+fmtEUR(remaining)+' left, which is why the monthly figure above moves.</div>';
}

// ── MONTH DATA AGGREGATION ────────────────────────────────
function finIncomeForMonth(mk){ return Object.values(FS.income).filter(function(i){ return i.month === mk; }); }
function finIncomeActualEUR(mk){
  return finIncomeForMonth(mk).filter(function(i){ return i.type==='actual'; })
    .reduce(function(s,i){ return s + (i.amountEUR||0); }, 0);
}
function finIncomeProjectedEUR(mk){
  return finIncomeForMonth(mk).filter(function(i){ return i.type==='projected'; })
    .reduce(function(s,i){ return s + (i.amountEUR||0); }, 0);
}

// Replicates the fixed-expense recurrence math from js/money.js
// (fxOccurrencesInMonth / getFixedAmountForMonth) so "spent this month" is
// accurate without depending on money.js being loaded on this page.
function finFxOccurrencesInMonth(fx, monthKey){
  var period = fx.period || 'monthly';
  var startDate = fx.startDate || null;
  if(startDate && monthKey < startDate.substr(0,7)) return 0;
  if(period === 'monthly') return 1;
  if(!startDate) return 1;
  var periodDays = period === 'weekly' ? 7 : 28;
  var y=parseInt(monthKey.substr(0,4)), mo=parseInt(monthKey.substr(5,2))-1;
  var monthStart=new Date(y,mo,1), monthEnd=new Date(y,mo+1,0,23,59,59);
  var start=new Date(startDate+'T12:00:00');
  if(start > monthEnd) return 0;
  var cur=new Date(start);
  while(cur < monthStart) cur = new Date(cur.getTime()+periodDays*86400000);
  var count=0;
  while(cur <= monthEnd){ count++; cur = new Date(cur.getTime()+periodDays*86400000); }
  return count;
}
function finFxAmountForMonth(fx, monthKey){
  var occ = finFxOccurrencesInMonth(fx, monthKey);
  if(!occ) return 0;
  if(fx.fixedType === 'hard') return (fx.amount||0) * occ;
  return (fx.confirmedMonths && fx.confirmedMonths[monthKey]) ? fx.confirmedMonths[monthKey] : 0;
}
function finSpentForMonth(mk){
  var total = Object.values(FS.expenses).filter(function(e){ return e.date && e.date.startsWith(mk); })
    .reduce(function(s,e){ return s + (e.eurAmount||0); }, 0);
  Object.values(FS.fixedExpenses).forEach(function(fx){ total += finFxAmountForMonth(fx, mk); });
  return Math.round(total*100)/100;
}
function finExpenseCategoryCount(mk){
  var cats = {};
  Object.values(FS.expenses).filter(function(e){ return e.date && e.date.startsWith(mk); }).forEach(function(e){ cats[e.category]=true; });
  Object.values(FS.fixedExpenses).forEach(function(fx){ if(finFxAmountForMonth(fx,mk)>0) cats[fx.category]=true; });
  return Object.keys(cats).length;
}

// ── PACE INDICATOR ────────────────────────────────────────
function finPace(actualEUR, target){
  var now = new Date();
  var mk = finCurrentMonthKey();
  var dim = finDaysInMonth(mk);
  var dayOfMonth = now.getDate();
  var expected = (dayOfMonth/dim) * target;
  var delta = actualEUR - expected;
  var tolerance = target * 0.05; // within 5% of pace counts as "on track"
  var status = 'On track';
  if(delta > tolerance) status = 'Ahead';
  else if(delta < -tolerance) status = 'Behind';
  return { status: status, delta: Math.round(delta), expected: Math.round(expected) };
}

// ── RENDER: MAIN ENTRY POINT ──────────────────────────────
function renderFinance(){
  var el = document.getElementById('finance-root');
  if(!el) return; // not mounted on this page / tab not open
  if(!finMonth) finMonth = finCurrentMonthKey();
  if(FS.permissionError){
    el.innerHTML = '<div class="empty"><div class="empty-icon">🔒</div><div class="empty-txt">'+
      'Firebase rules for <strong>income</strong>, <strong>goals</strong>, and <strong>settings</strong> '+
      "haven't been added yet, so this can't load. See the reminder in the build notes.</div></div>";
    return;
  }
  if(!(FS.loaded.income && FS.loaded.goals && FS.loaded.settings)){
    el.innerHTML = '<div class="empty"><div class="empty-txt">Loading…</div></div>';
    return;
  }

  var mk = finMonth;
  var isCur = finIsCurrentMonth(mk);
  var actual = finIncomeActualEUR(mk);
  var projected = finIncomeProjectedEUR(mk);
  var spent = finSpentForMonth(mk);
  var budget = FS.settings.monthlyBudget;
  var remaining = budget - spent;
  var fullTarget = finFullTarget();
  var monthsRem = finMonthsRemainingInYear();
  var surplus = (actual + projected) - budget;

  var html = '';

  // ── Month selector
  html += '<div class="fin-month-nav">'+
    '<button class="fin-month-arr" onclick="finShiftSelectedMonth(-1)">‹</button>'+
    '<span class="fin-month-lbl">'+finMonthLabel(mk)+(isCur?' <span class="fin-cur-tag">current</span>':'')+'</span>'+
    '<button class="fin-month-arr" onclick="finShiftSelectedMonth(1)" '+(isCur?'disabled':'')+'>›</button>'+
    '</div>';

  // ── Weekly check-in banner (Mondays, current month only)
  if(isCur && finIsMonday()){
    html += '<div class="fin-checkin-banner" onclick="finOpenWeeklyCheckin()">'+
      '📅 Weekly check-in — log your income for last week</div>';
  }

  // ── Prominent monthly target line
  html += '<div class="fin-target-hero">'+
    '<div class="fin-target-eyebrow">Monthly income target</div>'+
    '<div class="fin-target-num">€'+fmtEUR(fullTarget)+'</div>'+
    '<div class="fin-target-sub">€'+fmtEUR(FIN_SURVIVAL_TARGET)+' survival + €'+fmtEUR(finExtraPerMonth())+' extra '+
    '(€'+fmtEUR(FIN_YEAR_EXTRA_NEEDED)+' ÷ '+monthsRem+' month'+(monthsRem===1?'':'s')+' left in '+FIN_YEAR+')</div>'+
    finRenderBankedNote()+
    '</div>';

  // ── Two target progress cards (Survival / Full target)
  html += finRenderTargetCards(mk, actual);

  // ── Pace indicator
  if(isCur) html += finRenderPace(actual);

  // ── Secondary KPI strip
  html += '<div class="fin-kpi-grid">'+
    finKpiCard('Projected additional', fmtEUR(projected), 'amber') +
    finKpiCard('Spent this month', fmtEUR(spent), 'coral') +
    finKpiCard('Budget remaining', fmtEUR(remaining), remaining<0?'coral':'teal') +
    finKpiCard('Surplus over survival', fmtEUR(surplus), surplus>0?'berry':'muted') +
    '</div>';

  // ── Spending vs budget bar
  var spendPct = Math.min(Math.round((spent/budget)*100), 100);
  var over = spent > budget;
  html += '<div class="fin-section">'+
    '<div class="fin-section-title">Spending vs €'+fmtEUR(budget)+' budget</div>'+
    '<div class="fin-bar"><div class="fin-bar-fill" style="width:'+spendPct+'%;background:'+(over?'var(--coral)':'var(--teal)')+'"></div></div>'+
    '<div class="fin-bar-sub">'+(over?'Over by €'+fmtEUR(spent-budget):'€'+fmtEUR(remaining)+' left')+'</div>'+
    '</div>';

  // ── Surplus allocation
  if(surplus > 0){
    html += finRenderAllocation(surplus);
  }

  // ── How to get there (hourly breakdown, collapsible)
  html += finRenderHourlyBreakdown(fullTarget);

  // ── Income log
  html += finRenderIncomeLog(mk);

  // ── Goals tracker
  html += finRenderGoals();

  // ── Expenses link
  html += '<div class="fin-section">'+
    '<div class="fin-exp-link" onclick="finGoToExpenses()">'+
    '<div>Spent €'+fmtEUR(spent)+' this month across '+finExpenseCategoryCount(mk)+' categories</div>'+
    '<div class="fin-exp-link-arrow">→</div>'+
    '</div></div>';

  // ── Rates footer
  html += finRenderRatesFooter();

  html += '<div style="height:24px"></div>';
  el.innerHTML = html;
}

function fmtEUR(n){
  n = Math.round((n||0)*100)/100;
  return n.toLocaleString('en-GB', {minimumFractionDigits:2, maximumFractionDigits:2});
}

function finKpiCard(label, val, color){
  return '<div class="fin-kpi" style="border-top-color:var(--'+color+')">'+
    '<div class="fin-kpi-val">€'+val+'</div><div class="fin-kpi-lbl">'+label+'</div></div>';
}

function finShiftSelectedMonth(delta){ finMonth = finShiftMonth(finMonth, delta); renderFinance(); }

// ── TARGET CARDS (Survival / Full target) ─────────────────
function finRenderTargetCards(mk, actual){
  var survivalMet = actual >= FIN_SURVIVAL_TARGET;
  var fullTarget = finFullTarget();
  var fullMet = actual >= fullTarget;

  var survivalPct = Math.min(Math.round((actual/FIN_SURVIVAL_TARGET)*100), 100);
  var fullPct = Math.min(Math.round((actual/fullTarget)*100), 100);

  var survivalCard = '<div class="fin-target-card">'+
    '<div class="fin-target-card-hdr"><span>Survival target</span><span>€'+fmtEUR(FIN_SURVIVAL_TARGET)+'</span></div>'+
    '<div class="fin-bar"><div class="fin-bar-fill" style="width:'+survivalPct+'%;background:'+(survivalMet?'var(--forest)':'var(--teal)')+'"></div></div>'+
    (survivalMet
      ? '<div class="fin-target-card-note met">✓ Covered — €'+fmtEUR(actual-FIN_SURVIVAL_TARGET)+' surplus</div>'
      : '<div class="fin-target-card-note">€'+fmtEUR(actual)+' of €'+fmtEUR(FIN_SURVIVAL_TARGET)+'</div>')+
    '</div>';

  var fullCard = '<div class="fin-target-card">'+
    '<div class="fin-target-card-hdr"><span>Full target</span><span>€'+fmtEUR(fullTarget)+'</span></div>'+
    '<div class="fin-bar"><div class="fin-bar-fill" style="width:'+fullPct+'%;background:'+(fullMet?'var(--forest)':'var(--coral)')+'"></div></div>'+
    (fullMet
      ? '<div class="fin-target-card-note met celebrate">🎉 Full target hit! €'+fmtEUR(actual-fullTarget)+' beyond</div>'
      : '<div class="fin-target-card-note">€'+fmtEUR(actual)+' of €'+fmtEUR(fullTarget)+'</div>')+
    '</div>';

  return '<div class="fin-target-grid">'+survivalCard+fullCard+'</div>';
}

function finRenderPace(actual){
  var survPace = finPace(actual, FIN_SURVIVAL_TARGET);
  var fullPace = finPace(actual, finFullTarget());
  function badge(p, label){
    var cls = p.status==='Ahead'?'ahead':(p.status==='Behind'?'behind':'ontrack');
    return '<div class="fin-pace-item">'+
      '<span class="fin-pace-badge '+cls+'">'+p.status+'</span>'+
      '<span class="fin-pace-lbl">'+label+' pace</span>'+
      '</div>';
  }
  return '<div class="fin-pace-row">'+badge(survPace,'Survival')+badge(fullPace,'Full target')+'</div>';
}

// ── SURPLUS ALLOCATION ────────────────────────────────────
function finRenderAllocation(surplus){
  var goals = Object.values(FS.goals);
  var gA = goals[0], gB = goals[1];
  if(!gA || !gB) return '';
  var pctA = finAllocPct, pctB = 100-finAllocPct;
  var amtA = Math.round(surplus*pctA)/100, amtB = Math.round(surplus*pctB)/100;
  return '<div class="fin-section">'+
    '<div class="fin-section-title">Allocate €'+fmtEUR(surplus)+' surplus</div>'+
    '<input type="range" min="0" max="100" value="'+finAllocPct+'" class="fin-slider" oninput="finAllocPct=parseInt(this.value);finUpdateAllocPreview('+surplus+')">'+
    '<div class="fin-alloc-preview" id="fin-alloc-preview">'+
    '<span>'+e(gA.name)+': €'+fmtEUR(amtA)+'</span><span>'+e(gB.name)+': €'+fmtEUR(amtB)+'</span></div>'+
    '<button class="btn-pri" onclick="finConfirmAllocation('+surplus+',\''+gA.id+'\',\''+gB.id+'\')">Log to goals</button>'+
    '</div>';
}
function finUpdateAllocPreview(surplus){
  var goals=Object.values(FS.goals); var gA=goals[0], gB=goals[1]; if(!gA||!gB) return;
  var amtA=Math.round(surplus*finAllocPct)/100, amtB=Math.round(surplus*(100-finAllocPct))/100;
  var prev=document.getElementById('fin-alloc-preview');
  if(prev) prev.innerHTML='<span>'+e(gA.name)+': €'+fmtEUR(amtA)+'</span><span>'+e(gB.name)+': €'+fmtEUR(amtB)+'</span>';
}
function finConfirmAllocation(surplus, idA, idB){
  var amtA=Math.round(surplus*finAllocPct)/100, amtB=Math.round(surplus*(100-finAllocPct))/100;
  if(FS.goals[idA]){ FS.goals[idA].currentAmount=(FS.goals[idA].currentAmount||0)+amtA; finPersistGoal(idA, FS.goals[idA]); }
  if(FS.goals[idB]){ FS.goals[idB].currentAmount=(FS.goals[idB].currentAmount||0)+amtB; finPersistGoal(idB, FS.goals[idB]); }
  renderFinance();
}

// ── HOW TO GET THERE (hourly breakdown) ──────────────────
function finRenderHourlyBreakdown(fullTarget){
  var rate = FS.settings.hourlyRate || 25;
  var hoursPerMonth = rate>0 ? Math.round(fullTarget/rate) : 0;
  var hoursPerPersonPerWeek = Math.round((hoursPerMonth/4/2)*10)/10;
  var html = '<div class="fin-section">'+
    '<div class="fin-how-hdr" onclick="finToggleHow()">'+
    '<span class="fin-section-title" style="margin:0">How to get there</span>'+
    '<span class="fin-how-chevron">'+(finHowOpen?'▾':'▸')+'</span>'+
    '</div>';
  if(finHowOpen){
    html += '<div class="fin-how-body">'+
      '<div class="fg" style="margin-bottom:12px">'+
      '<label class="flbl">Average hourly rate</label>'+
      '<input type="number" class="finput" style="max-width:120px" value="'+rate+'" onchange="finSetHourlyRate(this.value)">'+
      '</div>'+
      '<div class="fin-how-line">€'+fmtEUR(fullTarget)+' needed → <strong>'+hoursPerMonth+' hours/month</strong> → <strong>'+hoursPerPersonPerWeek+' hrs/person/week</strong> at €'+rate+'/hr</div>'+
      '<div class="fin-how-note">One real estate commission can significantly change these numbers.</div>'+
      '</div>';
  }
  html += '</div>';
  return html;
}
function finToggleHow(){ finHowOpen = !finHowOpen; renderFinance(); }
function finSetHourlyRate(v){
  var n = parseFloat(v); if(isNaN(n) || n<=0) return;
  FS.settings.hourlyRate = n; finPersistSettings(); renderFinance();
}

// ── INCOME LOG ─────────────────────────────────────────────
function finRenderIncomeLog(mk){
  var entries = finIncomeForMonth(mk).sort(function(a,b){ return (b.createdAt||0)-(a.createdAt||0); });
  var html = '<div class="fin-section">'+
    '<div class="fin-section-title-row">'+
    '<div class="fin-section-title" style="margin:0">Income log</div>'+
    '<button class="fin-add-btn" onclick="finOpenAddIncome()">+ Add income</button>'+
    '</div>';
  if(!entries.length){
    html += '<div class="empty"><div class="empty-txt">No income logged for this month yet.</div></div>';
  } else {
    html += '<div class="fin-income-list">';
    entries.forEach(function(inc){ html += finRenderIncomeRow(inc); });
    html += '</div>';
  }
  html += '</div>';
  return html;
}
function finRenderIncomeRow(inc){
  var isProj = inc.type === 'projected';
  var av = inc.person === 'daniella' ? 'D' : 'A';
  var avColor = inc.person === 'daniella' ? 'var(--berry)' : 'var(--coral)';
  var acc = FIN_DEPOSIT_ACCOUNTS.filter(function(a){ return a.id===inc.depositedTo; })[0];
  return '<div class="fin-inc-row'+(isProj?' projected':'')+'" onclick="finOpenIncomeMenu(\''+inc.id+'\')">'+
    '<div class="fin-inc-av" style="background:'+avColor+'">'+av+'</div>'+
    '<div class="fin-inc-body">'+
    '<div class="fin-inc-title">'+e(inc.description||inc.client||'Income')+
    (isProj?' <span class="fin-badge-projected">estimated</span>':' <span class="fin-badge-actual">confirmed</span>')+'</div>'+
    '<div class="fin-inc-meta">'+e(inc.client||'')+(acc?' · '+acc.l:'')+(inc.paymentType?' · '+inc.paymentType:'')+'</div>'+
    '</div>'+
    '<div class="fin-inc-amt">'+
    '<div class="fin-inc-eur">€'+fmtEUR(inc.amountEUR)+'</div>'+
    (inc.currency!=='EUR'?'<div class="fin-inc-orig">'+inc.amount+' '+inc.currency+'</div>':'')+
    '</div>'+
    (isProj?'<button class="fixed-confirm-btn" onclick="event.stopPropagation();finConfirmIncome(\''+inc.id+'\')">Confirm</button>':'')+
    '</div>';
}
function finOpenIncomeMenu(id){
  var inc = FS.income[id]; if(!inc) return;
  openModal(
    '<div class="mhandle"></div><div class="mtitle">'+e(inc.description||'Income')+'</div>'+
    (inc.type==='projected'?'<div class="aitem" onclick="closeModal();finConfirmIncome(\''+id+'\')">✓ Confirm as actual</div>':'')+
    '<div class="aitem" onclick="closeModal();finDeleteIncome(\''+id+'\')" style="color:var(--coral)">🗑 Delete</div>'
  );
}
function finDeleteIncome(id){ delete FS.income[id]; finRemoveIncome(id); renderFinance(); }
function finConfirmIncome(id){
  var inc = FS.income[id]; if(!inc) return;
  inc.type='actual'; inc.confirmedAt=Date.now();
  FS.income[id]=inc; finPersistIncome(id, inc); renderFinance();
}

// ── ADD INCOME MODAL ──────────────────────────────────────
var fims = {}; // Add-Income modal state
function finOpenAddIncome(prefill){
  fims = Object.assign({
    person:'andre', type:'projected', amount:'', currency:'EUR', description:'', client:'',
    paymentType:'hourly', hoursWorked:'', depositedTo:'andre-wise', period: finMonth
  }, prefill||{});
  openModal(finBuildAddIncomeForm());
  setTimeout(function(){ var n=document.getElementById('fin-desc'); if(n) n.focus(); },80);
}
function finBuildAddIncomeForm(){
  var html = '<div class="mhandle"></div><div class="mtitle">Add income</div>';
  html += '<div class="fg"><label class="flbl">For period</label>'+
    '<input type="month" class="finput" id="fin-period" value="'+e(fims.period)+'" onchange="finFimsSync();fims.period=this.value"></div>';
  html += '<div class="fg"><label class="flbl">Person</label><div class="vgrid">'+
    ['andre','daniella'].map(function(p){
      return '<button class="vchip'+(fims.person===p?' on':'')+'" onclick="finFimsSet(\'person\',\''+p+'\')">'+(p==='andre'?'André':'Daniella')+'</button>';
    }).join('')+'</div></div>';
  html += '<div class="fg"><label class="flbl">Type</label><div class="vgrid">'+
    ['projected','actual'].map(function(t){
      return '<button class="vchip'+(fims.type===t?' on':'')+'" onclick="finFimsSet(\'type\',\''+t+'\')">'+(t==='projected'?'Estimated':'Confirmed')+'</button>';
    }).join('')+'</div></div>';
  html += '<div class="fg"><label class="flbl">Description</label><input type="text" class="finput" id="fin-desc" value="'+e(fims.description)+'" placeholder="What is this for?"></div>';
  html += '<div class="fg"><label class="flbl">Client</label><input type="text" class="finput" id="fin-client" value="'+e(fims.client)+'" placeholder="Client / source"></div>';
  html += '<div class="fg"><label class="flbl">Payment type</label><div class="vgrid">'+
    ['hourly','commission','fixed'].map(function(t){
      return '<button class="vchip'+(fims.paymentType===t?' on':'')+'" onclick="finFimsSet(\'paymentType\',\''+t+'\')">'+t+'</button>';
    }).join('')+'</div></div>';
  if(fims.paymentType==='hourly'){
    html += '<div class="fg"><label class="flbl">Hours worked</label><input type="number" class="finput" id="fin-hours" value="'+e(fims.hoursWorked)+'" placeholder="0"></div>';
  }
  html += '<div class="fg"><label class="flbl">Amount</label><div style="display:flex;gap:8px">'+
    '<input type="number" class="finput" id="fin-amount" value="'+e(fims.amount)+'" placeholder="0.00" style="flex:1">'+
    '<select class="finput" id="fin-currency" style="width:88px">'+FIN_CURRENCIES.map(function(c){return '<option value="'+c+'"'+(fims.currency===c?' selected':'')+'>'+c+'</option>';}).join('')+'</select>'+
    '</div></div>';
  html += '<div class="fg"><label class="flbl">Deposited to</label><select class="finput" id="fin-deposit">'+
    FIN_DEPOSIT_ACCOUNTS.map(function(a){return '<option value="'+a.id+'"'+(fims.depositedTo===a.id?' selected':'')+'>'+a.l+'</option>';}).join('')+
    '</select></div>';
  html += '<button class="btn-pri" onclick="finSaveIncome()">Save income</button>';
  return html;
}
function finFimsSet(field, val){ finFimsSync(); fims[field]=val; document.getElementById('mcontent').innerHTML=finBuildAddIncomeForm(); }
function finFimsSync(){
  var d=document.getElementById('fin-desc'); if(d) fims.description=d.value;
  var c=document.getElementById('fin-client'); if(c) fims.client=c.value;
  var h=document.getElementById('fin-hours'); if(h) fims.hoursWorked=h.value;
  var a=document.getElementById('fin-amount'); if(a) fims.amount=a.value;
  var cur=document.getElementById('fin-currency'); if(cur) fims.currency=cur.value;
  var dep=document.getElementById('fin-deposit'); if(dep) fims.depositedTo=dep.value;
  var per=document.getElementById('fin-period'); if(per && per.value) fims.period=per.value;
}
function finSaveIncome(){
  finFimsSync();
  var amt = parseFloat(fims.amount)||0;
  if(amt<=0){ alert('Enter an amount.'); return; }
  var now = new Date();
  var id = 'inc'+Date.now().toString(36)+Math.random().toString(36).substr(2,4);
  var record = {
    id: id, person: fims.person, type: fims.type,
    amount: amt, currency: fims.currency, amountEUR: finToEUR(amt, fims.currency),
    description: fims.description||'', client: fims.client||'',
    paymentType: fims.paymentType, hoursWorked: fims.hoursWorked?parseFloat(fims.hoursWorked):null,
    month: fims.period, week: finIsoWeekKey(now),
    depositedTo: fims.depositedTo,
    confirmedAt: fims.type==='actual' ? Date.now() : null,
    createdAt: Date.now()
  };
  FS.income[id]=record; finPersistIncome(id, record);
  closeModal(); renderFinance();
}

// ── WEEKLY CHECK-IN ────────────────────────────────────────
var wcms = {};
function finOpenWeeklyCheckin(){
  var lastEntries = Object.values(FS.income).sort(function(a,b){return (b.createdAt||0)-(a.createdAt||0);});
  function lastRateFor(person){ var m=lastEntries.filter(function(i){return i.person===person && i.paymentType==='hourly';})[0]; return m && m.amount && m.hoursWorked ? Math.round((m.amount/m.hoursWorked)*100)/100 : 25; }
  wcms = {
    andre:{ hours:'', rate:lastRateFor('andre'), currency:'EUR', client:'' },
    daniella:{ hours:'', rate:lastRateFor('daniella'), currency:'EUR', client:'' }
  };
  openModal(finBuildWeeklyCheckinForm());
}
function finBuildWeeklyCheckinForm(){
  var wk = finLastWeekKey();
  var html = '<div class="mhandle"></div><div class="mtitle">Weekly check-in</div>'+
    '<div class="fin-how-note" style="margin-bottom:16px">Logging income for last week ('+wk+') as projected — confirm once paid.</div>';
  ['andre','daniella'].forEach(function(p){
    var s = wcms[p];
    var invoice = (parseFloat(s.hours)||0) * (parseFloat(s.rate)||0);
    html += '<div class="fg" style="border-top:1px solid var(--sand);padding-top:14px;margin-top:6px">'+
      '<label class="flbl">'+(p==='andre'?'André':'Daniella')+'</label>'+
      '<div style="display:flex;gap:8px;margin-bottom:8px">'+
      '<input type="number" class="finput" placeholder="Hours" value="'+e(s.hours)+'" oninput="wcmsSync();wcms[\''+p+'\'].hours=this.value;finRefreshCheckinPreview(\''+p+'\')" id="wc-'+p+'-hours" style="flex:1">'+
      '<input type="number" class="finput" placeholder="Rate/hr" value="'+e(s.rate)+'" oninput="wcmsSync();wcms[\''+p+'\'].rate=this.value;finRefreshCheckinPreview(\''+p+'\')" id="wc-'+p+'-rate" style="flex:1">'+
      '<select class="finput" id="wc-'+p+'-currency" style="width:80px">'+FIN_CURRENCIES.map(function(c){return '<option value="'+c+'"'+(s.currency===c?' selected':'')+'>'+c+'</option>';}).join('')+'</select>'+
      '</div>'+
      '<input type="text" class="finput" placeholder="Client name" value="'+e(s.client)+'" oninput="wcmsSync()" id="wc-'+p+'-client" style="margin-bottom:8px">'+
      '<div class="fin-how-line" id="wc-'+p+'-preview">= '+(s.currency)+' '+(Math.round(invoice*100)/100)+' invoice</div>'+
      '</div>';
  });
  html += '<button class="btn-pri" onclick="finSaveWeeklyCheckin()">Save as projected</button>';
  return html;
}
function wcmsSync(){
  ['andre','daniella'].forEach(function(p){
    var h=document.getElementById('wc-'+p+'-hours'), r=document.getElementById('wc-'+p+'-rate'),
        c=document.getElementById('wc-'+p+'-currency'), cl=document.getElementById('wc-'+p+'-client');
    if(h) wcms[p].hours=h.value; if(r) wcms[p].rate=r.value;
    if(c) wcms[p].currency=c.value; if(cl) wcms[p].client=cl.value;
  });
}
function finRefreshCheckinPreview(p){
  var s=wcms[p]; var invoice=(parseFloat(s.hours)||0)*(parseFloat(s.rate)||0);
  var prev=document.getElementById('wc-'+p+'-preview');
  if(prev) prev.textContent='= '+s.currency+' '+(Math.round(invoice*100)/100)+' invoice';
}
function finSaveWeeklyCheckin(){
  wcmsSync();
  var wk = finLastWeekKey();
  var mk = finCurrentMonthKey();
  ['andre','daniella'].forEach(function(p){
    var s=wcms[p];
    var hours=parseFloat(s.hours)||0, rate=parseFloat(s.rate)||0;
    if(hours<=0 || rate<=0) return;
    var amt=Math.round(hours*rate*100)/100;
    var id='inc'+Date.now().toString(36)+Math.random().toString(36).substr(2,4)+p[0];
    var record={
      id:id, person:p, type:'projected', amount:amt, currency:s.currency, amountEUR:finToEUR(amt,s.currency),
      description:'Weekly check-in', client:s.client||'', paymentType:'hourly', hoursWorked:hours,
      month:mk, week:wk, depositedTo:p+'-wise', confirmedAt:null, createdAt:Date.now()
    };
    FS.income[id]=record; finPersistIncome(id, record);
  });
  closeModal(); renderFinance();
}

// ── GOALS TRACKER ──────────────────────────────────────────
function finRenderGoals(){
  var goals = Object.values(FS.goals).sort(function(a,b){ return (a.createdAt||0)-(b.createdAt||0); });
  if(!goals.length) return '';
  var html = '<div class="fin-section"><div class="fin-section-title">Goals</div><div class="fin-goals-grid">';
  goals.forEach(function(g){ html += finRenderGoalCard(g); });
  html += '</div></div>';
  return html;
}
function finRenderGoalCard(g){
  var color = FIN_GOAL_COLORS[g.id] || 'var(--muted)';
  var pct = Math.min(Math.round(((g.currentAmount||0)/g.targetAmount)*100), 100);
  var remaining = Math.max(g.targetAmount - (g.currentAmount||0), 0);
  var eta = finGoalETA(g);
  return '<div class="fin-goal-card">'+
    '<div class="fin-goal-name">'+e(g.name)+'</div>'+
    '<div class="fin-bar"><div class="fin-bar-fill" style="width:'+pct+'%;background:'+color+'"></div></div>'+
    '<div class="fin-goal-nums"><span>€'+fmtEUR(g.currentAmount||0)+'</span><span class="fin-goal-target">of €'+fmtEUR(g.targetAmount)+'</span></div>'+
    (remaining>0 ? '<div class="fin-goal-remaining">€'+fmtEUR(remaining)+' to go'+(eta?' · '+eta:'')+'</div>' : '<div class="fin-goal-remaining met">✓ Goal reached</div>')+
    '<div class="fin-goal-add"><input type="number" class="finput" placeholder="Record a transfer (€)" id="fin-goal-add-'+g.id+'"><button class="fin-goal-add-btn" onclick="finAddGoalTransfer(\''+g.id+'\')">Add</button></div>'+
    '</div>';
}
function finGoalETA(g){
  var months = Math.max((Date.now()-(g.createdAt||Date.now()))/(30.44*86400000), 0.1);
  var avgMonthly = (g.currentAmount||0)/months;
  if(avgMonthly <= 0) return null;
  var monthsToGo = Math.ceil(Math.max(g.targetAmount-(g.currentAmount||0),0)/avgMonthly);
  if(monthsToGo <= 0) return null;
  var d = new Date(); d.setMonth(d.getMonth()+monthsToGo);
  return '~'+d.toLocaleDateString('en-GB',{month:'short',year:'numeric'})+' at current pace';
}
function finAddGoalTransfer(id){
  var input=document.getElementById('fin-goal-add-'+id); if(!input) return;
  var amt=parseFloat(input.value); if(!amt || amt<=0) return;
  var g=FS.goals[id]; if(!g) return;
  g.currentAmount=(g.currentAmount||0)+amt; finPersistGoal(id, g); renderFinance();
}

// ── EXPENSES LINK ──────────────────────────────────────────
function finGoToExpenses(){
  if(typeof switchTab === 'function' && document.getElementById('money-view')){
    switchTab('money');
  } else {
    window.location.href = 'https://app.andaluma.com';
  }
}

// ── RATES FOOTER ────────────────────────────────────────────
function finRenderRatesFooter(){
  var r = FS.settings.exchangeRates || {};
  var when = FS.settings.ratesUpdatedAt ? new Date(FS.settings.ratesUpdatedAt).toLocaleDateString('en-GB',{day:'numeric',month:'short'}) : '—';
  var parts = FIN_CURRENCIES.filter(function(c){return c!=='EUR';}).map(function(c){
    return '1 '+c+' = €'+(r[c]?r[c].toFixed(c==='IDR'?6:4):'—');
  });
  return '<div class="fin-rates-footer">Rates as of '+when+' · '+parts.join(' · ')+'</div>';
}
