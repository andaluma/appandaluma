// ── CONTENT: Luka · Reading ───────────────────────────────────
// A short passage (shown once via the passage screen, not an
// exercise itself) followed by a small pool of match-select
// comprehension questions using the "question" prompt kind.
var CONTENT = window.CONTENT || {};
CONTENT.luka = CONTENT.luka || {};

function comprehensionExercise(questionText, answer, options){
  return {
    type: 'match-select',
    prompt: {kind: 'question', value: questionText},
    options: options,
    answer: answer
  };
}
function pic(v){ return {value: v, kind: 'picture'}; }
function word(v){ return {value: v, kind: 'word'}; }

CONTENT.luka.reading = [
  {
    id: 'reading-fox', title: 'The Fast Fox', icon: 'Fox', prerequisiteId: null,
    masteryRule: {type: 'streak', n: 3},
    passage: {
      iconId: 'fox',
      sentences: ['A fox runs fast.', 'The fox sees a rocket.', 'The fox is not scared.']
    },
    exercises: [
      comprehensionExercise('What runs fast in the story?', 'fox', [pic('fox'), pic('dog'), pic('cat')]),
      comprehensionExercise('What did the fox see?', 'rocket', [pic('rocket'), pic('star'), pic('moon')]),
      comprehensionExercise('How did the fox feel?', 'not scared', [word('not scared'), word('sad'), word('tired')])
    ]
  },
  {
    id: 'reading-comet', title: 'The Speedy Comet', icon: '&#9733;',
    prerequisiteId: 'reading-fox',
    masteryRule: {type: 'streak', n: 3},
    passage: {
      iconId: 'star',
      sentences: ['Comet zooms past a star.', 'Comet is very fast.', 'Comet loves to race.']
    },
    exercises: [
      comprehensionExercise('What does Comet love to do?', 'race', [word('race'), word('sleep'), word('hide')]),
      comprehensionExercise('What does Comet zoom past?', 'a star', [word('a star'), word('a tree'), word('a house')]),
      comprehensionExercise('How fast is Comet?', 'very fast', [word('very fast'), word('very slow'), word('a little fast')])
    ]
  },
  {
    id: 'reading-race', title: 'Race Day', icon: '1st', prerequisiteId: 'reading-comet',
    masteryRule: {type: 'accuracy', minAttempts: 8, threshold: 0.75},
    passage: {
      iconId: 'medal',
      sentences: ['Luka watches a race.', 'The cars go fast.', 'Luka cheers for his favorite car.']
    },
    exercises: [
      comprehensionExercise('What does Luka watch?', 'a race', [word('a race'), word('a movie'), word('a game')]),
      comprehensionExercise('How do the cars go?', 'fast', [word('fast'), word('slow'), word('backward')]),
      comprehensionExercise('What does Luka do?', 'cheers', [word('cheers'), word('sleeps'), word('reads')])
    ]
  }
];
