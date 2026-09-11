// ── EXERCISE RUNNER: DISPATCHER ──────────────────────────────
// No red anywhere: a miss gets a neutral "let's look again" beat, a
// correct answer gets a sunshine glow. Each renderer (match-select,
// sequence-tap, spell-tiles) owns its own tap handling and calls the
// shared window.finishExercise(correct) once its exercise is answered
// — kids.js owns everything after that (mastery, persistence, review
// scheduling, session pacing), unchanged regardless of type.
var ExerciseUI = {
  star: '<svg width="30" height="30" viewBox="0 0 24 24" fill="#FFC24B"><path d="M12 2l2.9 6.6L22 9.6l-5 4.9L18.4 22 12 18.3 5.6 22 7 14.5l-5-4.9 7.1-1z"/></svg>',
  // Outline-only "ghost" star for the zero-stars prompt — a blank box
  // reads as broken/loading, not "the answer is zero," especially since
  // 0 is itself one of the numeral options a kid could tap.
  starGhost: '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#8C7F68" stroke-width="1.5" stroke-dasharray="3 2" opacity=".55"><path d="M12 2l2.9 6.6L22 9.6l-5 4.9L18.4 22 12 18.3 5.6 22 7 14.5l-5-4.9 7.1-1z"/></svg>',

  // Fisher-Yates on a copy — used to randomize option/tile order at
  // render time so the correct answer never sits in the same spot
  // exercise after exercise (content authors it in a fixed order; a
  // kid can and will memorize screen position instead of the concept).
  shuffle: function(arr){
    var out = arr.slice();
    for(var i = out.length - 1; i > 0; i--){
      var j = Math.floor(Math.random() * (i + 1));
      var t = out[i]; out[i] = out[j]; out[j] = t;
    }
    return out;
  },

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
      unicorn: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M6 12c0-4 2.5-7 6-7s6 3 6 7-2.5 6-6 6-6-2-6-6Z" fill="#F4EAFB" stroke="#C9A0DE" stroke-width="1.4"/><path d="M12 3l1.4 3.6h-2.8Z" fill="#FFB627"/><circle cx="10" cy="11" r="0.9" fill="#5B2140"/><circle cx="14" cy="11" r="0.9" fill="#5B2140"/><path d="M4 9c-1.5 1-2 3-1 5 .5-2 1-3 2.5-4Z" fill="#E0409C"/></svg>',
      // Gray, pointy-eared, with whiskers — kept visually distinct from
      // fox (orange, longer snout) since both appear together as answer
      // options in the same reading-comprehension exercise.
      cat: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M6 9l-2-5 4.5 3Z" fill="#8C8C9E"/><path d="M18 9l2-5-4.5 3Z" fill="#8C8C9E"/><circle cx="12" cy="13" r="6" fill="#9B9BAE"/><circle cx="10" cy="12.5" r="0.9" fill="#2B2B3A"/><circle cx="14" cy="12.5" r="0.9" fill="#2B2B3A"/><path d="M10.5 15.3c1 .8 2 .8 3 0" stroke="#2B2B3A" stroke-width="1" stroke-linecap="round"/><g stroke="#2B2B3A" stroke-width="0.6" stroke-linecap="round"><path d="M5.5 14h3M5.8 15.6l2.7-.9M18.5 14h-3M18.2 15.6l-2.7-.9"/></g></svg>',
      // Warm brown, floppy ears, a visible pale muzzle with a nose —
      // the previous version was a single-tone purple blob with no
      // muzzle/nose, unreadable as a dog at a glance (real feedback:
      // "not sure what the middle is").
      dog: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M5 7c-1.5 1-2 4-.5 6.5l3.5-2.5Z" fill="#A9714A"/><path d="M19 7c1.5 1 2 4 .5 6.5l-3.5-2.5Z" fill="#A9714A"/><circle cx="12" cy="13" r="6" fill="#C48A5C"/><ellipse cx="12" cy="16" rx="3.2" ry="2.4" fill="#F4EAFB"/><ellipse cx="12" cy="15.3" rx="0.9" ry="0.7" fill="#3A1F5C"/><circle cx="9.7" cy="12" r="0.9" fill="#3A1F5C"/><circle cx="14.3" cy="12" r="0.9" fill="#3A1F5C"/></svg>',
      sun: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="5" fill="#FFC24B"/><g stroke="#FFC24B" stroke-width="1.8" stroke-linecap="round"><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.5 4.5l2 2M17.5 17.5l2 2M4.5 19.5l2-2M17.5 6.5l2-2"/></g></svg>',
      moon: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M14 3a9 9 0 1 0 0 18c-3-1.5-5-5-5-9s2-7.5 5-9Z" fill="#8B5FBF"/></svg>',
      balloon: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none"><ellipse cx="12" cy="9" rx="6" ry="7" fill="#E0409C"/><path d="M12 16l-1 2 1 1 1-1Z" fill="#E0409C"/><path d="M12 19v3" stroke="#8C7F68" stroke-width="1" stroke-linecap="round"/></svg>',
      rocket: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M12 2c3 2 4.5 6 4 10H8c-.5-4 1-8 4-10Z" fill="#FF6B35"/><rect x="9.5" y="10" width="5" height="6" fill="#F4EAFB"/><path d="M8 12l-3 4 4-1Z" fill="#6B3FA0"/><path d="M16 12l3 4-4-1Z" fill="#6B3FA0"/><path d="M10.5 18l1.5 4 1.5-4Z" fill="#C4E538"/></svg>',
      fox: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M4 8l3 5-4 1Z" fill="#FF6B35"/><path d="M20 8l-3 5 4 1Z" fill="#FF6B35"/><path d="M12 5c4 0 7 3.5 7 8 0 4-3 6.5-7 6.5S5 17 5 13c0-4.5 3-8 7-8Z" fill="#FF6B35"/><path d="M12 12c2 0 3.5 1.4 3.5 3.5 0 1.8-1.5 3-3.5 3s-3.5-1.2-3.5-3C8.5 13.4 10 12 12 12Z" fill="#F4EAFB"/><circle cx="9.5" cy="12" r="0.9" fill="#3A1F5C"/><circle cx="14.5" cy="12" r="0.9" fill="#3A1F5C"/></svg>',
      medal: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M9 3l3 6 3-6" stroke="#E0409C" stroke-width="1.6" stroke-linecap="round"/><circle cx="12" cy="15" r="6" fill="#FFB627"/><circle cx="12" cy="15" r="3.4" fill="#FFF3D6"/></svg>',
      comet: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M4 20c4-2 6-6 8-8" stroke="#FF6B35" stroke-width="2" stroke-linecap="round" opacity=".5"/><circle cx="15" cy="9" r="4" fill="#6B3FA0"/><circle cx="15" cy="9" r="1.6" fill="#C4E538"/></svg>',
      // A simple side-view skateboard silhouette (deck + two wheels) —
      // the previous boot-on-a-blade version read as an unrecognizable
      // blob at icon size.
      // A bare deck-and-wheels bar (the previous version) still read as
      // ambiguous at icon size ("not very clear what it is" — real
      // feedback). A boot-shaped upper is the part that actually signals
      // "skate" the way the skateboard-bar version didn't.
      skate: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M5 15V8c0-1.7 1.3-3 3-3h4l7 5v5Z" fill="#4FB8E0"/><path d="M3 15h17a2 2 0 0 1 2 2 1 1 0 0 1-1 1H3a2 2 0 0 1-2-2 1 1 0 0 1 2-1Z" fill="#3A1F5C"/><circle cx="7" cy="20" r="1.8" fill="#3A1F5C"/><circle cx="17" cy="20" r="1.8" fill="#3A1F5C"/></svg>',
      planet: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="5.5" fill="#8B5FBF"/><ellipse cx="12" cy="12" rx="10" ry="3" fill="none" stroke="#FFB627" stroke-width="1.8" transform="rotate(-18 12 12)"/></svg>'
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
// answer options, always in English regardless of what other language
// voices the device happens to have installed — the curriculum text is
// English, and a mismatched voice reads it in the wrong language's
// phonetics (garbled, half-Spanish-sounding, on a device set up for a
// Spanish-speaking household with no English TTS voice installed). This
// just prefers a voice that sounds like it belongs to a woman when one
// is available and upbeat, matching what was asked for; it can't
// guarantee one on every device.
var Speech = {
  _voice: null,
  _pickVoice: function(){
    if(Speech._voice) return Speech._voice;
    if(!('speechSynthesis' in window)) return null;
    var voices = window.speechSynthesis.getVoices() || [];
    if(!voices.length) return null;
    var en = voices.filter(function(v){ return /^en/i.test(v.lang); });
    // No English voice installed at all — leave it unset rather than
    // substituting a Spanish (or other) voice to read English text with.
    // u.lang on the utterance still tells the browser what to attempt.
    if(!en.length) return null;
    // A device can have more than one voice tagged "en" — a proper
    // network voice (Google's) alongside a low-quality local/offline
    // engine that's still technically English but reads with an accent
    // bleeding in from the OS's own language. Prefer the named engine
    // when there's a choice, since picking whichever "en" voice happens
    // to come first in the list isn't reliable across devices.
    var google = en.filter(function(v){ return /google/i.test(v.name); });
    var pool = google.length ? google : en;
    var femaleHints = ['female','samantha','victoria','karen','moira','tessa','fiona','zira','susan','allison','ava','serena','kate','joanna','salli','kimberly'];
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
      u.lang = 'en-US';
      var v = Speech._pickVoice();
      if(v) u.voice = v;
      u.rate = 0.95;
      u.pitch = 1.15; // a bit brighter/happier than a flat, neutral reading
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
