// ── EXERCISE RUNNER: DISPATCHER ──────────────────────────────
// No red anywhere: a miss gets a neutral "let's look again" beat, a
// correct answer gets a sunshine glow. Each renderer (match-select,
// sequence-tap, spell-tiles) owns its own tap handling and calls the
// shared window.finishExercise(correct) once its exercise is answered
// — kids.js owns everything after that (mastery, persistence, review
// scheduling, session pacing), unchanged regardless of type.
var ExerciseUI = {
  star: '<svg width="30" height="30" viewBox="0 0 24 24" fill="#FFC24B"><path d="M12 2l2.9 6.6L22 9.6l-5 4.9L18.4 22 12 18.3 5.6 22 7 14.5l-5-4.9 7.1-1z"/></svg>',

  // Minimal built-in icon set for the "picture" prompt/option kind.
  // Themed picture assets per subject are a content phase, not this one.
  icon: function(key){
    var icons = {
      star: '<svg width="40" height="40" viewBox="0 0 24 24" fill="#FFC24B"><path d="M12 2l2.9 6.6L22 9.6l-5 4.9L18.4 22 12 18.3 5.6 22 7 14.5l-5-4.9 7.1-1z"/></svg>',
      heart: '<svg width="40" height="40" viewBox="0 0 24 24" fill="#E0409C"><path d="M12 21s-7.5-4.6-10-9.3C.5 8 2.6 4.5 6 4.5c2 0 3.5 1 6 3.6 2.5-2.6 4-3.6 6-3.6 3.4 0 5.5 3.5 4 7.2C19.5 16.4 12 21 12 21z"/></svg>'
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
