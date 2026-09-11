// ── EXERCISE TYPE: sequence-tap ──────────────────────────────
// Tap items in the correct order. Covers Maia's number ordering and
// Luka's jumbled-sentence ordering — same interaction, numeral tiles
// vs. word tiles. Narrated on entry (never reveals the answer, just
// the instruction) for anyone who can't read "Tap them in order" yet.
var SequenceTap = {
  _item: null,
  _picked: [],
  _used: {},

  render: function(item){
    SequenceTap._item = item;
    item.items = ExerciseUI.shuffle(item.items);
    SequenceTap._picked = [];
    SequenceTap._used = {};
    setTimeout(function(){ Speech.say(SequenceTap._speakText()); }, 350);
    return SequenceTap._html();
  },

  _speakText: function(){
    var isNumbers = typeof SequenceTap._item.items[0] === 'number';
    return isNumbers ? 'Tap them in order, smallest to biggest.' : 'Put them in order.';
  },

  _html: function(){
    var item = SequenceTap._item;
    var slots = '';
    for(var i = 0; i < item.items.length; i++){
      slots += '<span class="seq-slot">' + (SequenceTap._picked[i] !== undefined ? SequenceTap._picked[i] : '') + '</span>';
    }
    var bank = item.items.map(function(val, idx){
      var used = SequenceTap._used[idx];
      return '<button class="seq-tile' + (used ? ' used' : '') + '" type="button" ' +
        (used ? 'disabled' : 'onclick="SequenceTap.tapBank(' + idx + ')"') + '>' + val + '</button>';
    }).join('');
    return (
      '<button class="replay-btn" type="button" onclick="Speech.say(SequenceTap._speakText())">&#128266; Hear it again</button>' +
      '<p class="exercise-prompt">Tap them in order</p>' +
      '<div class="seq-slots">' + slots + '</div>' +
      '<div class="seq-bank">' + bank + '</div>' +
      '<p class="exercise-feedback" id="exercise-feedback"></p>'
    );
  },

  tapBank: function(idx){
    if(SequenceTap._used[idx]) return;
    SequenceTap._used[idx] = true;
    SequenceTap._picked.push(SequenceTap._item.items[idx]);
    document.getElementById('exercise-body').innerHTML = SequenceTap._html();
    if(SequenceTap._picked.length < SequenceTap._item.items.length) return;

    var correctOrder = SequenceTap._item.correctOrder;
    var correct = SequenceTap._picked.every(function(v, i){ return v === correctOrder[i]; });
    document.querySelectorAll('.seq-tile').forEach(function(b){ b.disabled = true; });
    document.getElementById('exercise-feedback').textContent = correct
      ? 'Got it!'
      : 'Nice try — the order is ' + correctOrder.join(', ') + '.';
    correct ? Sound.correct() : Sound.miss();
    window.finishExercise(correct);
  }
};
