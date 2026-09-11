// ── CONTENT: Maia · Letters ───────────────────────────────────
// Recognition → letter-to-picture → sight words, tap/match only, no
// writing yet (per the brief). Picture options and sight words are
// drawn from her actual theme (unicorns, rainbows, crowns, stars) via
// ExerciseUI.icon — a handful of neutral icons (cat, dog, sun, moon,
// balloon) round out the distractor set.
var CONTENT = window.CONTENT || {};
CONTENT.maia = CONTENT.maia || {};

function letterExercise(letter, options){
  return {
    type: 'match-select',
    prompt: {kind: 'letter', value: letter},
    options: options.map(function(l){ return {value: l, kind: 'letter'}; }),
    answer: letter
  };
}
function pictureMatchExercise(letter, answerIcon, distractorIcons){
  var opts = [answerIcon].concat(distractorIcons).map(function(k){ return {value: k, kind: 'picture'}; });
  return {
    type: 'match-select',
    prompt: {kind: 'letter', value: letter},
    options: opts,
    answer: answerIcon
  };
}
function sightWordExercise(icon, word, distractorWords){
  var opts = [word].concat(distractorWords).map(function(w){ return {value: w, kind: 'word'}; });
  return {
    type: 'match-select',
    prompt: {kind: 'picture', value: icon},
    options: opts,
    answer: word
  };
}
// Bridge between "letter to picture" and full sight-word reading: given
// a picture, tap the letter its name starts with. Same first-sound
// pairing as pictureMatchExercise, just reversed — more letter practice
// before asking her to recognize a whole written word.
function letterStartExercise(icon, letter, distractorLetters){
  var opts = [letter].concat(distractorLetters).map(function(l){ return {value: l, kind: 'letter'}; });
  return {
    type: 'match-select',
    prompt: {kind: 'picture', value: icon},
    options: opts,
    answer: letter
  };
}

CONTENT.maia.letters = [
  {
    id: 'letters-recognition', title: 'Match the Letter', icon: 'Aa', prerequisiteId: null,
    masteryRule: {type: 'streak', n: 5},
    exercises: [
      letterExercise('A', ['E', 'A', 'O']),
      letterExercise('S', ['S', 'Z', 'X']),
      letterExercise('B', ['D', 'P', 'B']),
      letterExercise('M', ['N', 'M', 'W']),
      letterExercise('C', ['C', 'G', 'O']),
      letterExercise('U', ['V', 'W', 'U']),
      letterExercise('R', ['P', 'R', 'B']),
      letterExercise('T', ['T', 'L', 'F'])
    ]
  },
  {
    id: 'letters-to-picture', title: 'Letter to Picture', icon: 'B', prerequisiteId: 'letters-recognition',
    masteryRule: {type: 'streak', n: 5},
    exercises: [
      pictureMatchExercise('C', 'crown', ['dog', 'sun']),
      pictureMatchExercise('R', 'rainbow', ['cat', 'moon']),
      pictureMatchExercise('S', 'sun', ['crown', 'dog']),
      pictureMatchExercise('H', 'heart', ['rainbow', 'cat']),
      pictureMatchExercise('W', 'wand', ['balloon', 'moon']),
      pictureMatchExercise('D', 'dog', ['star', 'crown']),
      pictureMatchExercise('M', 'moon', ['balloon', 'cat']),
      pictureMatchExercise('B', 'balloon', ['wand', 'sun'])
    ]
  },
  {
    id: 'letters-starting-sound', title: 'Starts With', icon: '&#128269;', prerequisiteId: 'letters-to-picture',
    masteryRule: {type: 'streak', n: 5},
    exercises: [
      letterStartExercise('crown', 'C', ['O', 'G']),
      letterStartExercise('rainbow', 'R', ['P', 'B']),
      letterStartExercise('sun', 'S', ['Z', 'X']),
      letterStartExercise('heart', 'H', ['N', 'M']),
      letterStartExercise('wand', 'W', ['V', 'U']),
      letterStartExercise('dog', 'D', ['B', 'P']),
      letterStartExercise('moon', 'M', ['N', 'W']),
      letterStartExercise('balloon', 'B', ['D', 'P'])
    ]
  },
  {
    id: 'letters-sight-words', title: 'Sight Words', icon: '&#9733;', prerequisiteId: 'letters-starting-sound',
    masteryRule: {type: 'accuracy', minAttempts: 10, threshold: 0.8},
    exercises: [
      sightWordExercise('crown', 'crown', ['star', 'dog']),
      sightWordExercise('rainbow', 'rainbow', ['moon', 'cat']),
      sightWordExercise('star', 'star', ['crown', 'wand']),
      sightWordExercise('heart', 'heart', ['rainbow', 'sun']),
      sightWordExercise('unicorn', 'unicorn', ['dog', 'balloon']),
      sightWordExercise('wand', 'wand', ['star', 'moon']),
      sightWordExercise('crown', 'crown', ['heart', 'cat']),
      sightWordExercise('unicorn', 'unicorn', ['rainbow', 'star']),
      sightWordExercise('star', 'star', ['balloon', 'dog']),
      sightWordExercise('heart', 'heart', ['crown', 'moon'])
    ]
  }
];
