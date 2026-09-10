// ── CONTENT: Maia · Math (numbers 0–10, then a gradual step past 10) ──
// Hardcoded skill tree + exercise pool, no authoring UI (matches the
// brief). Each of the first three topics now mixes both directions —
// counting (stars → numeral) and recognition (numeral → stars) — since
// the brief treats those as one competency, not two. Ordering gets its
// own topic because it's a different interaction (sequence-tap, not a
// single tap).
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
// Recognition direction: show the numeral, tap the matching dot-count.
function recognizeExercise(numeral, starOptions){
  return {
    type: 'match-select',
    prompt: {kind: 'numeral', value: numeral},
    options: starOptions.map(function(n){ return {value: n, kind: 'stars'}; }),
    answer: numeral
  };
}
function orderExercise(shuffled, correctOrder){
  return {type: 'sequence-tap', items: shuffled, correctOrder: correctOrder};
}

CONTENT.maia.math = [
  {
    id: 'counting-3', title: 'Count to 3', icon: '3', prerequisiteId: null,
    masteryRule: {type: 'streak', n: 5},
    exercises: [
      starsExercise(0, [0, 1, 2]),
      starsExercise(1, [1, 2, 3]),
      starsExercise(2, [3, 1, 2]),
      starsExercise(3, [2, 3, 1]),
      recognizeExercise(1, [0, 1, 2]),
      starsExercise(1, [2, 1, 3]),
      recognizeExercise(3, [2, 3, 1]),
      starsExercise(3, [1, 3, 2]),
      starsExercise(2, [1, 2, 3]),
      recognizeExercise(0, [1, 0, 2])
    ]
  },
  {
    id: 'counting-5', title: 'Count to 5', icon: '5', prerequisiteId: 'counting-3',
    masteryRule: {type: 'streak', n: 5},
    exercises: [
      starsExercise(4, [3, 4, 5]),
      starsExercise(5, [4, 5, 3]),
      recognizeExercise(4, [3, 4, 5]),
      starsExercise(2, [1, 2, 3]),
      starsExercise(5, [5, 3, 4]),
      recognizeExercise(5, [4, 5, 3]),
      starsExercise(3, [2, 3, 4]),
      starsExercise(4, [4, 5, 3]),
      recognizeExercise(2, [1, 2, 3]),
      starsExercise(5, [3, 4, 5])
    ]
  },
  {
    id: 'counting-10', title: 'Count to 10', icon: '10', prerequisiteId: 'counting-5',
    masteryRule: {type: 'accuracy', minAttempts: 10, threshold: 0.8},
    exercises: [
      starsExercise(7, [6, 7, 8]),
      starsExercise(9, [8, 9, 10]),
      recognizeExercise(7, [6, 7, 8]),
      starsExercise(6, [5, 6, 7]),
      starsExercise(10, [9, 10, 8]),
      recognizeExercise(9, [8, 9, 10]),
      starsExercise(8, [7, 8, 9]),
      starsExercise(9, [9, 7, 8]),
      recognizeExercise(10, [9, 10, 8]),
      starsExercise(6, [6, 5, 7]),
      starsExercise(10, [10, 8, 9]),
      recognizeExercise(8, [7, 8, 9])
    ]
  },
  {
    id: 'ordering-10', title: 'Put Them In Order', icon: '&#8645;', prerequisiteId: 'counting-10',
    masteryRule: {type: 'streak', n: 5},
    exercises: [
      orderExercise([2, 0, 1], [0, 1, 2]),
      orderExercise([5, 3, 4], [3, 4, 5]),
      orderExercise([1, 3, 2], [1, 2, 3]),
      orderExercise([7, 5, 6], [5, 6, 7]),
      orderExercise([4, 2, 3], [2, 3, 4]),
      orderExercise([9, 7, 8], [7, 8, 9]),
      orderExercise([6, 4, 5], [4, 5, 6]),
      orderExercise([10, 8, 9], [8, 9, 10])
    ]
  },
  {
    id: 'numbers-15', title: 'Numbers to 15', icon: '15', prerequisiteId: 'ordering-10',
    masteryRule: {type: 'accuracy', minAttempts: 10, threshold: 0.8},
    exercises: [
      starsExercise(11, [10, 11, 12]),
      starsExercise(13, [12, 13, 14]),
      recognizeExercise(11, [10, 11, 12]),
      starsExercise(12, [11, 12, 13]),
      starsExercise(14, [13, 14, 15]),
      recognizeExercise(14, [13, 14, 15]),
      starsExercise(15, [14, 15, 13]),
      starsExercise(13, [13, 12, 14]),
      recognizeExercise(12, [11, 12, 13]),
      starsExercise(15, [15, 13, 14])
    ]
  }
];
