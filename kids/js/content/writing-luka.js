// ── CONTENT: Luka · Writing ───────────────────────────────────
// Spell a word (heard and/or shown, max 5-6 letters) -> arrange a
// jumbled 3-word phrase -> write a short phrase from letter tiles.
// The third topic reuses spell-tiles' multi-word support (item.words)
// rather than a new exercise type — see spell-tiles.js.
//
// Spell It word rule: every word here must be a single, concrete,
// literally-drawable object — the same rule real early-reader/phonics
// materials follow for their illustrated vocabulary (a picture book
// doesn't try to illustrate "zoom" or "fast," only the things doing the
// zooming). "zoom" broke this rule (an action/adverb, not a thing) and
// was the one word in this list no icon could ever make clear — swapped
// for "moon". Action/description words like "fast", "speed", "run",
// "glows" are fine in the sentence-level topics below, where they're
// part of a whole narrated phrase rather than needing their own
// standalone picture.
var CONTENT = window.CONTENT || {};
CONTENT.luka = CONTENT.luka || {};

function spellExercise(word, imageId, extraLetters){
  var bank = word.split('').concat(extraLetters || []);
  for(var i = bank.length - 1; i > 0; i--){
    var j = Math.floor(Math.random() * (i + 1));
    var t = bank[i]; bank[i] = bank[j]; bank[j] = t;
  }
  return {
    type: 'spell-tiles',
    prompt: {kind: imageId ? 'both' : 'audio', word: word, imageId: imageId},
    letterBank: bank,
    answer: word
  };
}
function phraseExercise(words, extraLetters){
  var bank = words.join('').split('').concat(extraLetters || []);
  for(var i = bank.length - 1; i > 0; i--){
    var j = Math.floor(Math.random() * (i + 1));
    var t = bank[i]; bank[i] = bank[j]; bank[j] = t;
  }
  return {
    type: 'spell-tiles',
    prompt: {kind: 'audio', word: words.join(' ')},
    words: words,
    letterBank: bank
  };
}
function orderExercise(shuffled, correctOrder){
  return {type: 'sequence-tap', items: shuffled, correctOrder: correctOrder};
}

CONTENT.luka.writing = [
  {
    id: 'spell-words', title: 'Spell It', icon: 'Aa', prerequisiteId: null,
    masteryRule: {type: 'streak', n: 5},
    exercises: [
      spellExercise('fox', 'fox', ['t', 's']),
      spellExercise('star', 'star', ['m', 'k']),
      spellExercise('moon', 'moon', ['t', 's']),
      spellExercise('comet', 'comet', ['l', 's']),
      spellExercise('skate', 'skate', ['r', 'o']),
      spellExercise('planet', 'planet', ['r']),
      spellExercise('rocket', 'rocket', ['s', 'n']),
      spellExercise('medal', 'medal', ['s', 'r'])
    ]
  },
  {
    id: 'sentence-ordering', title: 'Jumbled Words', icon: '&#8645;', prerequisiteId: 'spell-words',
    masteryRule: {type: 'streak', n: 5},
    exercises: [
      orderExercise(['runs', 'the', 'fox'], ['the', 'fox', 'runs']),
      orderExercise(['fly', 'rockets', 'fast'], ['rockets', 'fly', 'fast']),
      orderExercise(['speed', 'like', 'we'], ['we', 'like', 'speed']),
      orderExercise(['are', 'foxes', 'quick'], ['foxes', 'are', 'quick']),
      orderExercise(['glows', 'the', 'comet'], ['the', 'comet', 'glows']),
      orderExercise(['run', 'can', 'cats'], ['cats', 'can', 'run']),
      orderExercise(['rockets', 'love', 'we'], ['we', 'love', 'rockets']),
      orderExercise(['bright', 'are', 'stars'], ['stars', 'are', 'bright'])
    ]
  },
  {
    id: 'phrase-writing', title: 'Write the Phrase', icon: '&#9998;', prerequisiteId: 'sentence-ordering',
    masteryRule: {type: 'accuracy', minAttempts: 8, threshold: 0.75},
    exercises: [
      phraseExercise(['we', 'see', 'stars']),
      phraseExercise(['we', 'like', 'speed']),
      phraseExercise(['cats', 'run', 'fast']),
      phraseExercise(['rockets', 'fly', 'high']),
      phraseExercise(['we', 'love', 'foxes']),
      phraseExercise(['the', 'fox', 'zooms'])
    ]
  }
];
