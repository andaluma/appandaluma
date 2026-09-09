// ── EXERCISE RUNNER RENDERER ─────────────────────────────────
// No red anywhere: a miss gets a neutral "let's look again" beat, a
// correct answer gets a sunshine glow. Feedback state is applied via
// CSS classes kids.js toggles after an answer.
var ExerciseUI = {
  star: '<svg width="30" height="30" viewBox="0 0 24 24" fill="#FFC24B"><path d="M12 2l2.9 6.6L22 9.6l-5 4.9L18.4 22 12 18.3 5.6 22 7 14.5l-5-4.9 7.1-1z"/></svg>',

  renderProgress: function(done, total){
    var dots = '';
    for(var i = 0; i < total; i++){
      dots += '<span class="mp-dot' + (i < done ? ' filled' : '') + '"></span>';
    }
    return '<div class="mastery-progress">' + dots + '</div>';
  },

  render: function(exercise){
    var stars = '';
    for(var i = 0; i < exercise.count; i++) stars += this.star;
    var opts = exercise.options.map(function(n){
      return '<button class="opt-btn" type="button" data-n="' + n + '" onclick="onAnswerTap(' + n + ')">' + n + '</button>';
    }).join('');
    return (
      '<div class="star-cluster" aria-hidden="true">' + stars + '</div>' +
      '<p class="exercise-prompt">How many?</p>' +
      '<div class="opt-row" id="opt-row">' + opts + '</div>' +
      '<p class="exercise-feedback" id="exercise-feedback"></p>'
    );
  }
};
