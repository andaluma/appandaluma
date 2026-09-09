// ── CONTENT: Maia · Math (counting) ──────────────────────────
// Hardcoded skill tree + exercise pool, no authoring UI (matches the
// brief). Structured enough to extract into data later.
// Exercises are the generic "match-select" type: show a prompt
// (stars), tap the matching option among 3.
var CONTENT = window.CONTENT || {};
CONTENT.maia = CONTENT.maia || {};

function starsExercise(count, options){
  return {
    type: 'match-select',
    prompt: {kind: 'stars', value: count},
    options: options.map(function(n){ return {value: n, kind: 'numeral'}; }),
    answer: count
  };
}

CONTENT.maia.math = [
  {
    id: 'counting-3', title: 'Count to 3', icon: '3', prerequisiteId: null,
    masteryRule: {type: 'streak', n: 5},
    exercises: [
      starsExercise(1, [1, 2, 3]),
      starsExercise(2, [3, 1, 2]),
      starsExercise(3, [2, 3, 1]),
      starsExercise(1, [2, 1, 3]),
      starsExercise(3, [1, 3, 2]),
      starsExercise(2, [1, 2, 3]),
      starsExercise(1, [3, 2, 1]),
      starsExercise(3, [3, 1, 2])
    ]
  },
  {
    id: 'counting-5', title: 'Count to 5', icon: '5', prerequisiteId: 'counting-3',
    masteryRule: {type: 'streak', n: 5},
    exercises: [
      starsExercise(4, [3, 4, 5]),
      starsExercise(5, [4, 5, 3]),
      starsExercise(2, [1, 2, 3]),
      starsExercise(5, [5, 3, 4]),
      starsExercise(3, [2, 3, 4]),
      starsExercise(4, [4, 5, 3]),
      starsExercise(5, [3, 4, 5]),
      starsExercise(4, [5, 4, 3])
    ]
  },
  {
    id: 'counting-10', title: 'Count to 10', icon: '10', prerequisiteId: 'counting-5',
    masteryRule: {type: 'accuracy', minAttempts: 10, threshold: 0.8},
    exercises: [
      starsExercise(7, [6, 7, 8]),
      starsExercise(9, [8, 9, 10]),
      starsExercise(6, [5, 6, 7]),
      starsExercise(10, [9, 10, 8]),
      starsExercise(8, [7, 8, 9]),
      starsExercise(9, [9, 7, 8]),
      starsExercise(6, [6, 5, 7]),
      starsExercise(10, [10, 8, 9]),
      starsExercise(7, [8, 7, 6]),
      starsExercise(8, [8, 6, 7])
    ]
  }
];
