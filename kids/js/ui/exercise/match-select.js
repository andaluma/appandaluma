// ── EXERCISE TYPE: match-select ──────────────────────────────
// Generalizes Phase 1's count-select: show a prompt (stars, a numeral,
// a letter, a word, a picture, or an equation), tap the matching
// option among 3. Covers Maia's counting/recognition/letters/sight-
// words and Luka's arithmetic/multiplication/reading-comprehension.
//
// Narration: Maia can't read the on-screen question yet, so every
// prompt is also spoken aloud (auto-played, with a replay button) —
// never the answer options, only the question itself.
var MatchSelect = {
  _item: null,

  render: function(item){
    MatchSelect._item = item;
    item.options = ExerciseUI.shuffle(item.options);
    var opts = item.options.map(function(opt, idx){
      var cls = 'opt-btn' + (opt.kind === 'word' ? ' opt-btn-word' : '');
      return '<button class="' + cls + '" type="button" data-idx="' + idx + '" onclick="MatchSelect.tap(' + idx + ')">' +
        MatchSelect._optionLabel(opt) + '</button>';
    }).join('');
    setTimeout(function(){ Speech.say(MatchSelect._speakText(item.prompt)); }, 350);
    return (
      MatchSelect._promptHtml(item.prompt) +
      '<button class="replay-btn" type="button" onclick="Speech.say(MatchSelect._speakText(MatchSelect._item.prompt))">&#128266; Hear it again</button>' +
      '<p class="exercise-prompt">' + MatchSelect._question(item.prompt) + '</p>' +
      '<div class="opt-row" id="opt-row">' + opts + '</div>' +
      '<p class="exercise-feedback" id="exercise-feedback"></p>'
    );
  },

  _promptHtml: function(prompt){
    if(prompt.kind === 'stars'){
      if(prompt.value === 0){
        return '<div class="star-cluster star-cluster-empty" aria-hidden="true">' + ExerciseUI.starGhost + '</div>';
      }
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
    if(prompt.kind === 'question'){
      return '<p class="prompt-question-text">' + prompt.value + '</p>';
    }
    // numeral, equation
    return '<div class="prompt-big-text">' + prompt.value + '</div>';
  },
  _question: function(prompt){
    if(prompt.kind === 'stars') return 'How many?';
    if(prompt.kind === 'equation') return 'What&rsquo;s the answer?';
    if(prompt.kind === 'numeral' && MatchSelect._item.options[0].kind === 'stars') return 'Which shows this many?';
    if(prompt.kind === 'letter' && MatchSelect._item.options[0].kind === 'picture') return 'Which one starts with this letter?';
    if(prompt.kind === 'picture' && MatchSelect._item.options[0].kind === 'letter') return 'Which letter does it start with?';
    if(prompt.kind === 'picture') return 'Which one?';
    if(prompt.kind === 'question') return 'Tap the answer';
    return 'Tap the match';
  },
  // The spoken version — a full sentence, and for numeral/letter kinds
  // it says the prompt's own value, since that value is the question
  // itself here, never an answer option. The letter and picture prompts
  // each cover two different tasks that share the same prompt.kind —
  // matching the same letter vs. finding which picture starts with it,
  // and (here) finding which picture matches a whole word vs. which
  // letter it starts with — and need different wording for each, or
  // "find the letter d" is nonsense when there's no letter d on screen.
  _speakText: function(prompt){
    if(prompt.kind === 'stars') return 'How many? Count the stars.';
    if(prompt.kind === 'numeral' && MatchSelect._item.options[0].kind === 'stars') return 'Which one shows the number ' + prompt.value + '?';
    if(prompt.kind === 'numeral') return 'Find the number ' + prompt.value + '.';
    if(prompt.kind === 'equation') return 'What is ' + Speech.clean(prompt.value) + '?';
    if(prompt.kind === 'letter' && MatchSelect._item.options[0].kind === 'picture') return 'Which picture starts with the letter ' + prompt.value + '?';
    if(prompt.kind === 'letter') return 'Find the letter ' + prompt.value + '.';
    if(prompt.kind === 'picture' && MatchSelect._item.options[0].kind === 'letter') return 'Which letter does this start with?';
    if(prompt.kind === 'picture') return 'Which word matches the picture?';
    if(prompt.kind === 'word') return 'Find the matching word.';
    if(prompt.kind === 'question') return Speech.clean(prompt.value);
    return 'Tap the match.';
  },
  _optionLabel: function(opt){
    if(opt.kind === 'picture') return ExerciseUI.icon(opt.value);
    if(opt.kind === 'stars') return MatchSelect._miniDots(opt.value);
    return opt.value;
  },
  // Small dot grid (not full star shapes) so up to ~10 fit legibly
  // inside a single option button — a five-frame layout reads faster
  // at a glance than a scattered cluster at this size.
  _miniDots: function(n){
    var dots = '';
    for(var i = 0; i < n; i++) dots += '<span class="opt-star-dot"></span>';
    return '<span class="opt-stars">' + dots + '</span>';
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
    correct ? Sound.correct() : Sound.miss();
    window.finishExercise(correct);
  }
};
