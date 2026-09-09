// ── EXERCISE TYPE: spell-tiles ───────────────────────────────
// Hear and/or see a prompt, tap letter tiles in order to spell it.
// Covers Luka's word-writing. item.answer is a single word; item.words
// is an array for phrase-writing — slots render grouped per word, but
// the completion check is still just "did the flat tap sequence match
// the joined target," so no new exercise type was needed for phrases.
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

  _target: function(){
    var item = SpellTiles._item;
    return item.words ? item.words.join('') : item.answer;
  },

  _html: function(){
    var item = SpellTiles._item;
    var words = item.words || [item.answer];
    var picked = SpellTiles._picked;
    var pos = 0;
    var groups = words.map(function(word){
      var slots = '';
      for(var i = 0; i < word.length; i++){
        slots += '<span class="seq-slot">' + (picked[pos] || '') + '</span>';
        pos++;
      }
      return '<span class="seq-word-group">' + slots + '</span>';
    }).join('');
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
      '<div class="seq-slots seq-slots-grouped">' + groups + '</div>' +
      '<div class="seq-bank">' + bank + '</div>' +
      '<p class="exercise-feedback" id="exercise-feedback"></p>'
    );
  },

  replay: function(){
    try{
      if('speechSynthesis' in window){
        var item = SpellTiles._item;
        var u = new SpeechSynthesisUtterance(item.words ? item.words.join(' ') : item.prompt.word);
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
    var target = SpellTiles._target();
    if(SpellTiles._picked.length < target.length) return;

    var correct = (SpellTiles._picked === target);
    document.querySelectorAll('.seq-tile').forEach(function(b){ b.disabled = true; });
    document.getElementById('exercise-feedback').textContent = correct
      ? 'Got it!'
      : 'Nice try — it&rsquo;s ' + (SpellTiles._item.words ? SpellTiles._item.words.join(' ') : target) + '.';
    window.finishExercise(correct);
  }
};
