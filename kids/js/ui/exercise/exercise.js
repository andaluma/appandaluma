// ── EXERCISE RUNNER: DISPATCHER ──────────────────────────────
// No red anywhere: a miss gets a neutral "let's look again" beat, a
// correct answer gets a sunshine glow. Each renderer (match-select,
// sequence-tap, spell-tiles) owns its own tap handling and calls the
// shared window.finishExercise(correct) once its exercise is answered
// — kids.js owns everything after that (mastery, persistence, review
// scheduling, session pacing), unchanged regardless of type.
var ExerciseUI = {
  star: '<svg width="30" height="30" viewBox="0 0 24 24" fill="#FFC24B"><path d="M12 2l2.9 6.6L22 9.6l-5 4.9L18.4 22 12 18.3 5.6 22 7 14.5l-5-4.9 7.1-1z"/></svg>',

  // Small built-in icon set for the "picture" prompt/option kind —
  // enough to cover Maia's letter-to-picture and sight-word exercises.
  // Simple flat shapes, same honest ceiling as the companion art (see
  // the plan's note on illustration quality); Phase 7 is where that
  // gets a real polish pass.
  icon: function(key){
    var icons = {
      star: '<svg width="40" height="40" viewBox="0 0 24 24" fill="#FFC24B"><path d="M12 2l2.9 6.6L22 9.6l-5 4.9L18.4 22 12 18.3 5.6 22 7 14.5l-5-4.9 7.1-1z"/></svg>',
      heart: '<svg width="40" height="40" viewBox="0 0 24 24" fill="#E0409C"><path d="M12 21s-7.5-4.6-10-9.3C.5 8 2.6 4.5 6 4.5c2 0 3.5 1 6 3.6 2.5-2.6 4-3.6 6-3.6 3.4 0 5.5 3.5 4 7.2C19.5 16.4 12 21 12 21z"/></svg>',
      crown: '<svg width="40" height="40" viewBox="0 0 24 24" fill="#FFB627"><path d="M3 17h18l-1.5-8-3.5 3-3-5-3 5-3.5-3L3 17Z"/><rect x="3" y="17" width="18" height="3" rx="1"/><circle cx="6" cy="8" r="1.3"/><circle cx="12" cy="6" r="1.3"/><circle cx="18" cy="8" r="1.3"/></svg>',
      rainbow: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M2 20a10 10 0 0 1 20 0" stroke="#E0409C" stroke-width="2.4"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0" stroke="#FFB627" stroke-width="2.4"/><path d="M7 20a5 5 0 0 1 10 0" stroke="#1FAA7A" stroke-width="2.4"/></svg>',
      wand: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M5 19l10-10" stroke="#8B5FBF" stroke-width="2.4" stroke-linecap="round"/><path d="M17 3l1.2 2.6L21 7l-2.8 1.2L17 11l-1.2-2.8L13 7l2.8-1.4Z" fill="#FFB627"/></svg>',
      unicorn: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M6 12c0-4 2.5-7 6-7s6 3 6 7-2.5 6-6 6-6-2-6-6Z" fill="#FFFDFB" stroke="#F0DCEE" stroke-width="1"/><path d="M12 3l1.4 3.6h-2.8Z" fill="#FFB627"/><circle cx="10" cy="11" r="0.9" fill="#5B2140"/><circle cx="14" cy="11" r="0.9" fill="#5B2140"/><path d="M4 9c-1.5 1-2 3-1 5 .5-2 1-3 2.5-4Z" fill="#E0409C"/></svg>',
      cat: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M6 10l-1.5-4L8 8Z" fill="#FF6B35"/><path d="M18 10l1.5-4L16 8Z" fill="#FF6B35"/><circle cx="12" cy="13" r="6" fill="#FF6B35"/><circle cx="10" cy="12.5" r="0.9" fill="#3A1F5C"/><circle cx="14" cy="12.5" r="0.9" fill="#3A1F5C"/><path d="M10.5 15.5c1 .8 2 .8 3 0" stroke="#3A1F5C" stroke-width="1" stroke-linecap="round"/></svg>',
      dog: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none"><ellipse cx="6" cy="12" rx="2.4" ry="3.6" fill="#6B3FA0"/><ellipse cx="18" cy="12" rx="2.4" ry="3.6" fill="#6B3FA0"/><circle cx="12" cy="13" r="6" fill="#6B3FA0"/><circle cx="10" cy="12.5" r="0.9" fill="#fff"/><circle cx="14" cy="12.5" r="0.9" fill="#fff"/><ellipse cx="12" cy="16" rx="1.6" ry="1.1" fill="#3A1F5C"/></svg>',
      sun: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="5" fill="#FFC24B"/><g stroke="#FFC24B" stroke-width="1.8" stroke-linecap="round"><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.5 4.5l2 2M17.5 17.5l2 2M4.5 19.5l2-2M17.5 6.5l2-2"/></g></svg>',
      moon: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M14 3a9 9 0 1 0 0 18c-3-1.5-5-5-5-9s2-7.5 5-9Z" fill="#8B5FBF"/></svg>',
      balloon: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none"><ellipse cx="12" cy="9" rx="6" ry="7" fill="#E0409C"/><path d="M12 16l-1 2 1 1 1-1Z" fill="#E0409C"/><path d="M12 19v3" stroke="#8C7F68" stroke-width="1" stroke-linecap="round"/></svg>',
      rocket: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M12 2c3 2 4.5 6 4 10H8c-.5-4 1-8 4-10Z" fill="#FF6B35"/><rect x="9.5" y="10" width="5" height="6" fill="#F4EAFB"/><path d="M8 12l-3 4 4-1Z" fill="#6B3FA0"/><path d="M16 12l3 4-4-1Z" fill="#6B3FA0"/><path d="M10.5 18l1.5 4 1.5-4Z" fill="#C4E538"/></svg>',
      fox: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M4 8l3 5-4 1Z" fill="#FF6B35"/><path d="M20 8l-3 5 4 1Z" fill="#FF6B35"/><path d="M12 5c4 0 7 3.5 7 8 0 4-3 6.5-7 6.5S5 17 5 13c0-4.5 3-8 7-8Z" fill="#FF6B35"/><path d="M12 12c2 0 3.5 1.4 3.5 3.5 0 1.8-1.5 3-3.5 3s-3.5-1.2-3.5-3C8.5 13.4 10 12 12 12Z" fill="#F4EAFB"/><circle cx="9.5" cy="12" r="0.9" fill="#3A1F5C"/><circle cx="14.5" cy="12" r="0.9" fill="#3A1F5C"/></svg>',
      medal: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M9 3l3 6 3-6" stroke="#E0409C" stroke-width="1.6" stroke-linecap="round"/><circle cx="12" cy="15" r="6" fill="#FFB627"/><circle cx="12" cy="15" r="3.4" fill="#FFF3D6"/></svg>'
    };
    return icons[key] || '';
  },

  renderers: {}, // populated below once match-select.js etc. are loaded

  render: function(item){
    var r = ExerciseUI.renderers[item.type];
    return r ? r.render(item) : '<p class="exercise-feedback">Unsupported exercise type: ' + item.type + '</p>';
  },

  renderProgress: function(done, total){
    var dots = '';
    for(var i = 0; i < total; i++){
      dots += '<span class="mp-dot' + (i < done ? ' filled' : '') + '"></span>';
    }
    return '<div class="mastery-progress">' + dots + '</div>';
  },

  renderReviewBadge: function(topicTitle){
    return '<div class="review-badge">&#8635; Quick review &middot; ' + topicTitle + '</div>';
  }
};

ExerciseUI.renderers = {
  'match-select': MatchSelect,
  'sequence-tap': SequenceTap,
  'spell-tiles': SpellTiles
};

// ── SPEECH ────────────────────────────────────────────────────
// Shared narration for anyone who can't read the prompt yet (Maia,
// mainly, but any exercise can use it). Speaks the question, never the
// answer options. Browser TTS voice quality/gender varies by device —
// this just prefers a voice that sounds like it belongs to a woman when
// one is available, matching what was asked for; it can't guarantee one
// on every tablet.
var Speech = {
  _voice: null,
  _pickVoice: function(){
    if(Speech._voice) return Speech._voice;
    if(!('speechSynthesis' in window)) return null;
    var voices = window.speechSynthesis.getVoices() || [];
    if(!voices.length) return null;
    var femaleHints = ['female','samantha','victoria','karen','moira','tessa','fiona','zira','susan','allison','ava','serena','kate','joanna','salli','kimberly'];
    var en = voices.filter(function(v){ return /^en/i.test(v.lang); });
    var pool = en.length ? en : voices;
    var pick = null;
    for(var i = 0; i < pool.length; i++){
      var n = pool[i].name.toLowerCase();
      if(femaleHints.some(function(h){ return n.indexOf(h) >= 0; })){ pick = pool[i]; break; }
    }
    Speech._voice = pick || pool[0];
    return Speech._voice;
  },
  say: function(text){
    try{
      if(!('speechSynthesis' in window) || !text) return;
      var u = new SpeechSynthesisUtterance(text);
      var v = Speech._pickVoice();
      if(v) u.voice = v;
      u.rate = 0.88;
      u.pitch = 1.05;
      window.speechSynthesis.cancel(); // don't stack overlapping utterances
      window.speechSynthesis.speak(u);
    }catch(ex){ /* TTS unavailable — the visuals still carry the exercise */ }
  },
  // Turns display strings with HTML entities (equation prompts use
  // &times;/&minus; for the visible × and −) into speakable text.
  clean: function(s){
    return String(s)
      .replace(/&times;/g, ' times ')
      .replace(/&minus;/g, ' minus ')
      .replace(/&ndash;/g, '-')
      .replace(/&rsquo;/g, "'")
      .replace(/<[^>]+>/g, '');
  }
};
if('speechSynthesis' in window){
  window.speechSynthesis.onvoiceschanged = function(){ Speech._voice = null; };
}
