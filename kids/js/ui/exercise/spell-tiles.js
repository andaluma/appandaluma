// ── EXERCISE TYPE: spell-tiles ───────────────────────────────
// Hear and/or see a prompt, tap letter tiles in order to spell it.
// Covers Luka's word-writing. item.answer is a single word; item.words
// is an array for phrase-writing — slots render grouped per word, but
// the completion check is still just "did the flat tap sequence match
// the joined target," so no new exercise type was needed for phrases.
var SpellTiles = {
  _item: null,
  _pickedIndices: [], // bank indices in tap order, not just letters — a
                       // word can repeat a letter, so undo needs to know
                       // exactly which physical tile to give back.
  _used: {},

  render: function(item){
    SpellTiles._item = item;
    item.letterBank = ExerciseUI.shuffle(item.letterBank);
    SpellTiles._pickedIndices = [];
    SpellTiles._used = {};
    if(item.prompt.kind !== 'image') setTimeout(SpellTiles.replay, 300);
    return SpellTiles._html();
  },

  _pickedString: function(){
    return SpellTiles._pickedIndices.map(function(i){ return SpellTiles._item.letterBank[i]; }).join('');
  },

  _target: function(){
    var item = SpellTiles._item;
    return item.words ? item.words.join('') : item.answer;
  },

  _html: function(){
    var item = SpellTiles._item;
    var words = item.words || [item.answer];
    var picked = SpellTiles._pickedString();
    var target = SpellTiles._target();
    var done = picked.length >= target.length;
    var pos = 0;
    var groups = words.map(function(word){
      var slots = '';
      for(var i = 0; i < word.length; i++){
        var isLast = !done && pos === picked.length - 1;
        slots += '<span class="seq-slot' + (isLast ? ' seq-slot-erasable' : '') + '"' +
          (isLast ? ' onclick="SpellTiles.undoLast()"' : '') + '>' + (picked[pos] || '') + '</span>';
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
    var eraseBtn = (!done && picked.length)
      ? '<button class="replay-btn erase-btn" type="button" onclick="SpellTiles.undoLast()">&#9003; Erase last letter</button>'
      : '';
    return (
      imageHtml + replayBtn +
      '<p class="exercise-prompt">Spell it</p>' +
      '<div class="seq-slots seq-slots-grouped">' + groups + '</div>' +
      '<div class="seq-bank">' + bank + '</div>' +
      eraseBtn +
      '<p class="exercise-feedback" id="exercise-feedback"></p>'
    );
  },

  replay: function(){
    var item = SpellTiles._item;
    Speech.say(item.words ? item.words.join(' ') : item.prompt.word);
  },

  tapLetter: function(idx){
    if(SpellTiles._used[idx]) return;
    SpellTiles._used[idx] = true;
    SpellTiles._pickedIndices.push(idx);
    document.getElementById('exercise-body').innerHTML = SpellTiles._html();
    var target = SpellTiles._target();
    var picked = SpellTiles._pickedString();
    if(picked.length < target.length) return;

    var correct = (picked === target);
    document.querySelectorAll('.seq-tile').forEach(function(b){ b.disabled = true; });
    document.getElementById('exercise-feedback').textContent = correct
      ? 'Got it!'
      : 'Nice try — it&rsquo;s ' + (SpellTiles._item.words ? SpellTiles._item.words.join(' ') : target) + '.';
    correct ? Sound.correct() : Sound.miss();
    window.finishExercise(correct);
  },

  // Give the most recently tapped tile back to the bank. Only reachable
  // before the word is fully spelled — _html() stops rendering the
  // erase button and the last slot's tap target the moment the answer
  // is submitted, so this can't undo a result that's already scored.
  undoLast: function(){
    if(!SpellTiles._pickedIndices.length) return;
    var lastIdx = SpellTiles._pickedIndices.pop();
    delete SpellTiles._used[lastIdx];
    document.getElementById('exercise-body').innerHTML = SpellTiles._html();
  }
};
