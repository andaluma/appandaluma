// ── CONTENT: Maia · Math (counting) ──────────────────────────
// Hardcoded skill tree + exercise pool, no authoring UI (matches the
// brief). Structured enough to extract into data later. This is the
// Phase 1 vertical slice — the simplest exercise type: count the
// stars, tap the matching number.
var CONTENT = window.CONTENT || {};
CONTENT.maia = CONTENT.maia || {};
CONTENT.maia.math = [
  {
    id: 'counting-3', title: 'Count to 3', icon: '3', prerequisiteId: null,
    masteryRule: {type: 'streak', n: 5},
    exercises: [
      {count: 1, options: [1, 2, 3]},
      {count: 2, options: [3, 1, 2]},
      {count: 3, options: [2, 3, 1]},
      {count: 1, options: [2, 1, 3]},
      {count: 3, options: [1, 3, 2]},
      {count: 2, options: [1, 2, 3]},
      {count: 1, options: [3, 2, 1]},
      {count: 3, options: [3, 1, 2]}
    ]
  },
  {
    id: 'counting-5', title: 'Count to 5', icon: '5', prerequisiteId: 'counting-3',
    masteryRule: {type: 'streak', n: 5},
    exercises: [
      {count: 4, options: [3, 4, 5]},
      {count: 5, options: [4, 5, 3]},
      {count: 2, options: [1, 2, 3]},
      {count: 5, options: [5, 3, 4]},
      {count: 3, options: [2, 3, 4]},
      {count: 4, options: [4, 5, 3]},
      {count: 5, options: [3, 4, 5]},
      {count: 4, options: [5, 4, 3]}
    ]
  },
  {
    id: 'counting-10', title: 'Count to 10', icon: '10', prerequisiteId: 'counting-5',
    masteryRule: {type: 'accuracy', minAttempts: 10, threshold: 0.8},
    exercises: [
      {count: 7, options: [6, 7, 8]},
      {count: 9, options: [8, 9, 10]},
      {count: 6, options: [5, 6, 7]},
      {count: 10, options: [9, 10, 8]},
      {count: 8, options: [7, 8, 9]},
      {count: 9, options: [9, 7, 8]},
      {count: 6, options: [6, 5, 7]},
      {count: 10, options: [10, 8, 9]},
      {count: 7, options: [8, 7, 6]},
      {count: 8, options: [8, 6, 7]}
    ]
  }
];
