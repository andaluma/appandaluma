// ── CONFIG ────────────────────────────────────────────────
// Same Firebase PROJECT as the Planner/CRM (andaluma-planner), its own
// registered Firebase APP ("Andaluma Kids", appId below).
var fbConfig = {
  apiKey:'AIzaSyAeYXakpwzgmbl0_Spf2phpBlXjYe_9STA',
  authDomain:'andaluma-planner.firebaseapp.com',
  databaseURL:'https://andaluma-planner-default-rtdb.firebaseio.com',
  projectId:'andaluma-planner',
  storageBucket:'andaluma-planner.firebasestorage.app',
  messagingSenderId:'87759928843',
  appId:'1:87759928843:web:8a0281d7ff900173d9110e'
};

// Static profile metadata — two fixed children, no authoring UI needed,
// same spirit as CRM_CATS being hardcoded rather than fetched.
var PROFILES = [
  {
    id:'luka', name:'Luka', birthYear:2019, companionId:'comet',
    companionName:'Comet', subjectsLabel:'Math &middot; Reading &middot; Writing',
    subjects:[{id:'math',label:'Math'},{id:'reading',label:'Reading'},{id:'writing',label:'Writing'}]
  },
  {
    id:'maia', name:'Maia', birthYear:2021, companionId:'stella',
    companionName:'Stella', subjectsLabel:'Counting &middot; Letters',
    subjects:[{id:'math',label:'Counting'},{id:'letters',label:'Letters'}]
  }
];

// ── STATE ─────────────────────────────────────────────────
var kidsDB = null;
var kidsStreaks = {};  // {profileId: {current, longest, lastActiveDate}}
var kidsDoneToday = {}; // {profileId: bool}
var kidsProgress = {}; // {profileId: {subjectId: {topicId: progressRecord}}}
var currentProfileId = null;
var currentSubjectId = null;
var currentTopic = null;
var currentQueue = [];
var currentQueueIdx = 0;
var currentSessionStats = {correct:0, total:0};

// ── UTILS ─────────────────────────────────────────────────
function kp2(n){ return n<10?'0'+n:''+n; }
function kDateOffset(days){
  var d = new Date();
  d.setDate(d.getDate() + days);
  return d.getFullYear()+'-'+kp2(d.getMonth()+1)+'-'+kp2(d.getDate());
}
function kToday(){ return kDateOffset(0); }
function kAge(birthYear){ return new Date().getFullYear()-birthYear; }
function findProfile(id){
  for(var i=0;i<PROFILES.length;i++) if(PROFILES[i].id===id) return PROFILES[i];
  return null;
}

// ── SOUND ─────────────────────────────────────────────────
// Plain oscillator tones, no audio files — fits the no-build stack.
// A miss gets one short neutral tone, never a buzzer: same no-red-X
// rule as the visuals, just in sound.
var Sound = {
  ctx: null,
  ensure: function(){
    if(!Sound.ctx){
      try{ Sound.ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch(ex){ /* no Web Audio support — sound is a nice-to-have, never required */ }
    }
    return Sound.ctx;
  },
  tone: function(freq, duration, gain, delay){
    setTimeout(function(){
      var ctx = Sound.ensure();
      if(!ctx) return;
      try{
        var osc = ctx.createOscillator();
        var g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        g.gain.value = gain;
        osc.connect(g); g.connect(ctx.destination);
        osc.start();
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
        osc.stop(ctx.currentTime + duration);
      }catch(ex){ /* ignore */ }
    }, delay || 0);
  },
  correct: function(){
    Sound.tone(523.25, 0.12, 0.09, 0);   // C5
    Sound.tone(659.25, 0.15, 0.09, 90);  // E5 — a small two-note "got it"
  },
  miss: function(){
    Sound.tone(330, 0.16, 0.05, 0); // one soft, neutral tone — not descending, not a buzzer
  },
  mastered: function(){
    Sound.tone(523.25, 0.12, 0.09, 0);   // C
    Sound.tone(659.25, 0.12, 0.09, 100); // E
    Sound.tone(784, 0.22, 0.09, 200);    // G — a little three-note fanfare
  }
};

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
    }).catch(function(err){ console.error('kids_sessions write failed:', err); });
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
  currentProfileId = id;
  var p = findProfile(id);
  document.getElementById('picker-screen').hidden = true;
  document.getElementById('home-screen').hidden = false;
  renderHomeStreak();
  selectSubjectTab(p.subjects[0].id);
}

function selectSubjectTab(subjectId){
  currentSubjectId = subjectId;
  var p = findProfile(currentProfileId);
  var tabs = p.subjects.map(function(s){
    var on = s.id === subjectId ? ' on ' + p.id : '';
    return '<button class="subject-tab' + on + '" type="button" onclick="selectSubjectTab(\'' + s.id + '\')">' + s.label + '</button>';
  }).join('');

  var body = '<div class="home-hdr">' +
    '<div class="home-companion-mini">' + companionSvg(p.companionId, 64) + '</div>' +
    '<h2 class="home-greeting">Hi ' + p.name + '!</h2>' +
    '</div>' +
    '<div class="subject-tabs">' + tabs + '</div>';

  var topics = CONTENT[p.id] && CONTENT[p.id][subjectId];
  if(!topics){
    body += '<div class="coming-soon">' + p.companionName + ' is still learning this subject &mdash; it\'s coming in a later phase.</div>';
    document.getElementById('home-body').innerHTML = body;
    return;
  }

  if(kidsDB && !(kidsProgress[p.id] && kidsProgress[p.id][subjectId])){
    kidsDB.ref('kids_progress/' + p.id + '/' + subjectId).on('value', function(snap){
      kidsProgress[p.id] = kidsProgress[p.id] || {};
      kidsProgress[p.id][subjectId] = snap.val() || {};
      if(currentProfileId === p.id && currentSubjectId === subjectId) renderMap();
    });
  }
  body += '<div id="map-container">' + mapHtml(topics, p) + '</div>';
  document.getElementById('home-body').innerHTML = body;
}

function mapHtml(topics, p){
  var progress = (kidsProgress[p.id] && kidsProgress[p.id][currentSubjectId]) || {};
  return MapUI.render(topics, progress, p.id);
}
function renderMap(){
  var el = document.getElementById('map-container');
  if(!el) return;
  var p = findProfile(currentProfileId);
  var topics = CONTENT[p.id][currentSubjectId];
  el.innerHTML = mapHtml(topics, p);
}

// ── TOPIC PREVIEW ────────────────────────────────────────────
function findTopic(topics, id){
  for(var i=0;i<topics.length;i++) if(topics[i].id===id) return topics[i];
  return null;
}
function onTopicNodeClick(topicId){
  var p = findProfile(currentProfileId);
  var topics = CONTENT[p.id][currentSubjectId];
  var topic = findTopic(topics, topicId);
  var progress = (kidsProgress[p.id] && kidsProgress[p.id][currentSubjectId] && kidsProgress[p.id][currentSubjectId][topicId]) || null;
  var status = Mastery.statusFor(topic, kidsProgress[p.id] && kidsProgress[p.id][currentSubjectId]);
  var body =
    '<div class="sheet-handle-companion">' + companionSvg(p.companionId, 90) + '</div>' +
    '<h3>' + topic.title + '</h3>' +
    (status === 'mastered'
      ? '<p>' + p.companionName + ' says you&rsquo;ve got this one! Tap to practice again any time.</p>'
      : '<p>Count the stars and tap the matching number.</p>') +
    '<button class="go-pill ' + p.id + '" type="button" onclick="startSession(\'' + topicId + '\')">Start</button>';
  document.getElementById('topic-preview-content').innerHTML = body;
  document.getElementById('topic-preview').hidden = false;
}
function closeTopicPreview(){
  document.getElementById('topic-preview').hidden = true;
}

// ── SESSION / EXERCISE RUNNER ────────────────────────────────
function currentProgressRecordFor(topicId){
  var p = findProfile(currentProfileId);
  return (kidsProgress[p.id] && kidsProgress[p.id][currentSubjectId] && kidsProgress[p.id][currentSubjectId][topicId]) || Mastery.blank();
}
function persistProgress(topicId, progress){
  var p = findProfile(currentProfileId);
  kidsProgress[p.id] = kidsProgress[p.id] || {};
  kidsProgress[p.id][currentSubjectId] = kidsProgress[p.id][currentSubjectId] || {};
  kidsProgress[p.id][currentSubjectId][topicId] = progress;
  if(kidsDB){
    kidsDB.ref('kids_progress/' + p.id + '/' + currentSubjectId + '/' + topicId).set(progress)
      .catch(function(err){ console.error('kids_progress write failed:', err); });
  }
}
// Due-for-review topics in this subject, one sampled exercise each —
// mixed roughly 1-in-4 into the session by SessionBuilder.build.
function buildReviewPool(subjectTopics, excludeTopicId){
  var now = Date.now();
  var pool = [];
  subjectTopics.forEach(function(t){
    if(t.id === excludeTopicId) return;
    var progress = currentProgressRecordFor(t.id);
    if(progress.status === 'mastered' && Scheduler.isDue(progress, now)){
      var ex = t.exercises[Math.floor(Math.random() * t.exercises.length)];
      pool.push({exercise: ex, topicId: t.id, isReview: true});
    }
  });
  return pool;
}
function startSession(topicId){
  closeTopicPreview();
  var p = findProfile(currentProfileId);
  var subjectTopics = CONTENT[p.id][currentSubjectId];
  currentTopic = findTopic(subjectTopics, topicId);
  var reviewPool = buildReviewPool(subjectTopics, topicId);
  currentQueue = SessionBuilder.build(currentTopic, reviewPool);
  currentQueueIdx = 0;
  currentSessionStats = {correct:0, total:0};
  document.getElementById('home-screen').hidden = true;
  if(currentTopic.passage){
    showPassageScreen(currentTopic.passage);
  } else {
    beginExercises();
  }
}
// A reading topic shows its short passage once, before the normal
// comprehension-question queue — a content wrapper, not a fourth
// exercise type.
function showPassageScreen(passage){
  var p = findProfile(currentProfileId);
  document.getElementById('passage-companion').innerHTML = companionSvg(p.companionId, 80);
  document.getElementById('passage-icon').innerHTML = passage.iconId ? ExerciseUI.icon(passage.iconId) : '';
  document.getElementById('passage-text').innerHTML = passage.sentences.map(function(s){ return '<p>' + s + '</p>'; }).join('');
  document.getElementById('passage-screen').hidden = false;
}
function exitPassage(){
  document.getElementById('passage-screen').hidden = true;
  document.getElementById('home-screen').hidden = false;
}
function beginExercises(){
  var p = findProfile(currentProfileId);
  document.getElementById('passage-screen').hidden = true;
  document.getElementById('exercise-topic-title').textContent = currentTopic.title;
  document.getElementById('exercise-companion').innerHTML = companionSvg(p.companionId, 72);
  document.getElementById('exercise-screen').hidden = false;
  renderCurrentExercise();
}
function renderCurrentExercise(){
  var item = currentQueue[currentQueueIdx];
  if(item.isReview){
    var reviewTopic = findTopic(CONTENT[findProfile(currentProfileId).id][currentSubjectId], item.topicId);
    document.getElementById('exercise-progress').innerHTML = ExerciseUI.renderReviewBadge(reviewTopic.title);
  } else {
    var label = Mastery.progressLabel(currentProgressRecordFor(currentTopic.id), currentTopic.masteryRule);
    document.getElementById('exercise-progress').innerHTML = ExerciseUI.renderProgress(label.done, label.total);
  }
  document.getElementById('exercise-body').innerHTML = ExerciseUI.render(item.exercise);
}
// Called by whichever exercise renderer (match-select, sequence-tap,
// spell-tiles) just finished — it already showed its own feedback and
// disabled its own inputs. Everything from here is type-agnostic:
// mastery, persistence, adaptive requeue, review scheduling, pacing.
function finishExercise(correct){
  var item = currentQueue[currentQueueIdx];
  currentSessionStats.total++;
  if(correct) currentSessionStats.correct++;

  // Credit today's streak the moment any exercise is answered — not
  // only when a full session finishes. A child who does a few exercises
  // and then taps "Stop" partway through still showed up today; the old
  // code only credited a streak on endSession(), which meant that very
  // normal usage pattern never counted.
  updateStreak(currentProfileId);

  var justMastered = false;
  if(item.isReview){
    var reviewProgress = currentProgressRecordFor(item.topicId);
    Scheduler.advanceReview(reviewProgress, correct, Date.now());
    persistProgress(item.topicId, reviewProgress);
  } else {
    var progress = Mastery.evaluate(currentProgressRecordFor(currentTopic.id), correct, currentTopic.masteryRule, Date.now());
    if(progress.justMastered) Scheduler.stampOnMastery(progress, Date.now());
    persistProgress(currentTopic.id, progress);
    justMastered = progress.justMastered;

    // Adaptive difficulty: a miss brings this exact exercise back a few
    // slots later in the same session, instead of only relying on
    // reaching the end of the pool again.
    if(!correct && !justMastered && currentQueue.length < SessionBuilder.MAX_EXERCISES){
      var reinsertAt = Math.min(currentQueueIdx + 3, currentQueue.length);
      currentQueue.splice(reinsertAt, 0, {exercise: item.exercise, topicId: currentTopic.id, isReview: false});
    }
  }

  setTimeout(function(){
    if(justMastered){ endSession(true); return; }
    currentQueueIdx++;
    if(currentQueueIdx >= currentQueue.length){
      // Struggling: not mastered yet and there's session room left —
      // give more reps instead of ending on an unfinished topic.
      if(currentSessionStats.total < SessionBuilder.MAX_EXERCISES){
        currentQueue = currentQueue.concat(SessionBuilder.extend(currentTopic));
        renderCurrentExercise();
        return;
      }
      endSession(false);
      return;
    }
    renderCurrentExercise();
  }, 1100);
}
// A real session just happened — count it toward today's streak.
// Runs at most once per profile per day; a gap of a day or more
// restarts the count instead of accusing anyone of "breaking" one.
function updateStreak(profileId){
  var today = kToday();
  var prev = kidsStreaks[profileId] || {current:0, longest:0, lastActiveDate:null};
  if(prev.lastActiveDate === today) return;
  var newCurrent = (prev.lastActiveDate === kDateOffset(-1)) ? (prev.current || 0) + 1 : 1;
  var updated = {current: newCurrent, longest: Math.max(prev.longest || 0, newCurrent), lastActiveDate: today};
  kidsStreaks[profileId] = updated;
  if(kidsDB){
    kidsDB.ref('kids_streaks/' + profileId).set(updated)
      .catch(function(err){ console.error('kids_streaks write failed:', err); });
  }
  renderPicker(); // reflect immediately, don't wait on a DB round-trip
  // home-screen is hidden during a session — closeSessionComplete()
  // calls renderHomeStreak() once it's shown again.
}
function endSession(mastered){
  var p = findProfile(currentProfileId);
  if(mastered) Sound.mastered();
  document.getElementById('exercise-screen').hidden = true;
  document.getElementById('complete-companion').innerHTML = companionSvg(p.companionId, 130);
  document.getElementById('complete-title').textContent = mastered
    ? currentTopic.title + ' mastered!'
    : 'Nice practice!';
  document.getElementById('complete-recap').textContent = mastered
    ? p.companionName + ' says the next topic just unlocked. ' + currentSessionStats.correct + ' of ' + currentSessionStats.total + ' correct this round.'
    : 'You got ' + currentSessionStats.correct + ' of ' + currentSessionStats.total + ' — every try teaches ' + p.companionName + ' something. Come back soon to keep going.';
  document.getElementById('session-complete-screen').hidden = false;
}
function exitExercise(){
  document.getElementById('exercise-screen').hidden = true;
  document.getElementById('home-screen').hidden = false;
}
function closeSessionComplete(){
  document.getElementById('session-complete-screen').hidden = true;
  document.getElementById('home-screen').hidden = false;
  renderMap();
  renderHomeStreak();
}
function renderHomeStreak(){
  var streak = (kidsStreaks[currentProfileId] && kidsStreaks[currentProfileId].current) || 0;
  document.getElementById('home-streak').innerHTML = '<span class="streak-pill">&#9733; ' + streak + ' day streak</span>';
}
// Dashboard reads every subject a profile has, not just whichever tab
// was last opened — attach any progress listeners that selectSubjectTab
// hasn't gotten to yet, then render once the (already-cached) data is
// in kidsProgress. Firebase listeners are async, so this renders with
// whatever's loaded so far and re-renders as more comes in.
function loadAllProgress(){
  if(!kidsDB) return;
  PROFILES.forEach(function(p){
    p.subjects.forEach(function(s){
      if(!CONTENT[p.id] || !CONTENT[p.id][s.id]) return;
      if(kidsProgress[p.id] && kidsProgress[p.id][s.id]) return;
      kidsDB.ref('kids_progress/' + p.id + '/' + s.id).on('value', function(snap){
        kidsProgress[p.id] = kidsProgress[p.id] || {};
        kidsProgress[p.id][s.id] = snap.val() || {};
        if(document.getElementById('parent-dashboard').style.display !== 'none') renderDashboard();
      });
    });
  });
}
// Per-subject summary: current topic, mastered count, 7-day accuracy,
// and topics that could use more practice (an active topic where the
// last few attempts are under 60% — never called "failing").
function subjectSummary(profileId, subjectId){
  var topics = CONTENT[profileId] && CONTENT[profileId][subjectId];
  if(!topics) return null;
  var progress = (kidsProgress[profileId] && kidsProgress[profileId][subjectId]) || {};
  var masteredCount = 0, currentTopicTitle = null;
  var weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  var weekAttempts = [];
  var stuck = [];
  topics.forEach(function(t){
    var p = progress[t.id];
    var status = Mastery.statusFor(t, progress);
    if(status === 'mastered') masteredCount++;
    else if(status === 'active' && !currentTopicTitle) currentTopicTitle = t.title;
    if(p && p.attempts && p.attempts.length){
      p.attempts.forEach(function(a){ if(a.ts >= weekAgo) weekAttempts.push(a); });
      if(status === 'active' && p.attempts.length >= 4){
        var recent = p.attempts.slice(-6);
        var acc = recent.filter(function(a){ return a.correct; }).length / recent.length;
        if(acc < 0.6) stuck.push(t.title);
      }
    }
  });
  if(!currentTopicTitle) currentTopicTitle = (masteredCount === topics.length) ? 'All mastered!' : topics[0].title;
  var accuracy = weekAttempts.length
    ? Math.round(100 * weekAttempts.filter(function(a){ return a.correct; }).length / weekAttempts.length)
    : null;
  return {
    masteredCount: masteredCount, totalTopics: topics.length,
    currentTopicTitle: currentTopicTitle,
    accuracy: accuracy, weekAttemptCount: weekAttempts.length,
    stuck: stuck
  };
}
function renderDashboard(){
  loadAllProgress();
  var html = PROFILES.map(function(p){
    var s = kidsStreaks[p.id] || {current: 0, longest: 0};
    var subjectRows = p.subjects.map(function(subj){
      var sum = subjectSummary(p.id, subj.id);
      if(!sum) return '<div class="dash-subject"><strong>' + subj.label + '</strong><span class="muted">Coming soon</span></div>';
      var accuracyText = sum.accuracy === null
        ? 'No practice yet this week'
        : sum.accuracy + '% correct this week (' + sum.weekAttemptCount + ' tries)';
      var stuckText = sum.stuck.length
        ? '<div class="dash-stuck">Could use more practice: ' + sum.stuck.join(', ') + '</div>'
        : '';
      return (
        '<div class="dash-subject">' +
          '<strong>' + subj.label + '</strong>' +
          '<span>' + sum.masteredCount + '/' + sum.totalTopics + ' mastered &middot; on ' + sum.currentTopicTitle + '</span>' +
          '<span class="muted">' + accuracyText + '</span>' +
          stuckText +
        '</div>'
      );
    }).join('');
    return (
      '<div class="dash-card">' +
        '<h3>' + p.name + ' &middot; ' + p.companionName + '</h3>' +
        '<div class="stat">Streak: ' + s.current + ' days (longest ' + (s.longest || 0) + ')</div>' +
        subjectRows +
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
