// ── EXERCISE TYPE: match-select ──────────────────────────────
// Generalizes Phase 1's count-select: show a prompt (stars, a numeral,
// a letter, a word, a picture, or an equation), tap the matching
// option among 3. Covers Maia's counting/recognition/letters/sight-
// words and Luka's arithmetic/multiplication/reading-comprehension.
var MatchSelect = {
  _item: null,

  render: function(item){
    MatchSelect._item = item;
    var opts = item.options.map(function(opt, idx){
      return '<button class="opt-btn" type="button" data-idx="' + idx + '" onclick="MatchSelect.tap(' + idx + ')">' +
        MatchSelect._optionLabel(opt) + '</button>';
    }).join('');
    return (
      MatchSelect._promptHtml(item.prompt) +
      '<p class="exercise-prompt">' + MatchSelect._question(item.prompt) + '</p>' +
      '<div class="opt-row" id="opt-row">' + opts + '</div>' +
      '<p class="exercise-feedback" id="exercise-feedback"></p>'
    );
  },

  _promptHtml: function(prompt){
    if(prompt.kind === 'stars'){
      var stars = '';
      for(var i = 0; i < prompt.value; i++) stars += ExerciseUI.star;
      return '<div class="star-cluster" aria-hidden="true">' + stars + '</div>';
    }
    if(prompt.kind === 'picture'){
      return '<div class="prompt-picture">' + ExerciseUI.icon(prompt.value) + '</div>';
    }
    if(prompt.kind === 'letter'){
      return '<div class="prompt-big-text prompt-letter">' + prompt.value + '</div>';
    }
    if(prompt.kind === 'word'){
      return '<div class="prompt-big-text prompt-word">' + prompt.value + '</div>';
    }
    // numeral, equation
    return '<div class="prompt-big-text">' + prompt.value + '</div>';
  },
  _question: function(prompt){
    if(prompt.kind === 'stars') return 'How many?';
    if(prompt.kind === 'equation') return 'What&rsquo;s the answer?';
    if(prompt.kind === 'picture') return 'Which one?';
    return 'Tap the match';
  },
  _optionLabel: function(opt){
    return opt.kind === 'picture' ? ExerciseUI.icon(opt.value) : opt.value;
  },

  tap: function(idx){
    var item = MatchSelect._item;
    var opt = item.options[idx];
    var correct = (opt.value === item.answer);
    document.querySelectorAll('#opt-row .opt-btn').forEach(function(btn, i){
      btn.disabled = true;
      if(item.options[i].value === item.answer) btn.classList.add('correct');
      else if(i === idx) btn.classList.add('miss');
    });
    document.getElementById('exercise-feedback').textContent = correct
      ? 'Got it!'
      : 'Nice try — it&rsquo;s ' + item.answer + '.';
    window.finishExercise(correct);
  }
};
