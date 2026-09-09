// ── EXERCISE TYPE: spell-tiles ───────────────────────────────
// Hear and/or see a prompt, tap letter tiles in order to spell it.
// Covers Luka's word-writing; phrase-writing chains this across word
// slots (later phase). Audio uses the browser's built-in
// SpeechSynthesisUtterance — see the plan's Decisions on why.
var SpellTiles = {
  _item: null,
  _picked: '',
  _used: {},

  render: function(item){
    SpellTiles._item = item;
    SpellTiles._picked = '';
    SpellTiles._used = {};
    if(item.prompt.kind !== 'image') setTimeout(SpellTiles.replay, 300);
    return SpellTiles._html();
  },

  _html: function(){
    var item = SpellTiles._item;
    var answer = item.answer;
    var slots = '';
    for(var i = 0; i < answer.length; i++){
      slots += '<span class="seq-slot">' + (SpellTiles._picked[i] || '') + '</span>';
    }
    var bank = item.letterBank.map(function(letter, idx){
      var used = SpellTiles._used[idx];
      return '<button class="seq-tile' + (used ? ' used' : '') + '" type="button" ' +
        (used ? 'disabled' : 'onclick="SpellTiles.tapLetter(' + idx + ')"') + '>' + letter + '</button>';
    }).join('');
    var imageHtml = item.prompt.imageId ? '<div class="prompt-picture">' + ExerciseUI.icon(item.prompt.imageId) + '</div>' : '';
    var replayBtn = item.prompt.kind !== 'image'
      ? '<button class="replay-btn" type="button" onclick="SpellTiles.replay()">&#128266; Hear it again</button>'
      : '';
    return (
      imageHtml + replayBtn +
      '<p class="exercise-prompt">Spell it</p>' +
      '<div class="seq-slots">' + slots + '</div>' +
      '<div class="seq-bank">' + bank + '</div>' +
      '<p class="exercise-feedback" id="exercise-feedback"></p>'
    );
  },

  replay: function(){
    try{
      if('speechSynthesis' in window){
        var u = new SpeechSynthesisUtterance(SpellTiles._item.prompt.word);
        u.rate = 0.85;
        window.speechSynthesis.speak(u);
      }
    }catch(ex){ /* TTS unavailable — the image prompt still carries the exercise */ }
  },

  tapLetter: function(idx){
    if(SpellTiles._used[idx]) return;
    SpellTiles._used[idx] = true;
    SpellTiles._picked += SpellTiles._item.letterBank[idx];
    document.getElementById('exercise-body').innerHTML = SpellTiles._html();
    var answer = SpellTiles._item.answer;
    if(SpellTiles._picked.length < answer.length) return;

    var correct = (SpellTiles._picked === answer);
    document.querySelectorAll('.seq-tile').forEach(function(b){ b.disabled = true; });
    document.getElementById('exercise-feedback').textContent = correct
      ? 'Got it!'
      : 'Nice try — it&rsquo;s spelled ' + answer + '.';
    window.finishExercise(correct);
  }
};
