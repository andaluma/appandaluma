// ── CONTENT: Luka · Math (double digits → 100, then +/- and ×) ──
// Hardcoded skill tree + exercise pool, no authoring UI. A topic's
// pool can freely mix match-select and sequence-tap items — the
// engine only ever sees a boolean "correct," never the exercise
// shape, so mixing types within one topic costs nothing.
var CONTENT = window.CONTENT || {};
CONTENT.luka = CONTENT.luka || {};

function numeralRecognizeExercise(value, options){
  return {
    type: 'match-select',
    prompt: {kind: 'numeral', value: value},
    options: options.map(function(n){ return {value: n, kind: 'numeral'}; }),
    answer: value
  };
}
function orderExercise(shuffled, correctOrder){
  return {type: 'sequence-tap', items: shuffled, correctOrder: correctOrder};
}
function equationExercise(equationText, answer, options){
  return {
    type: 'match-select',
    prompt: {kind: 'equation', value: equationText},
    options: options.map(function(n){ return {value: n, kind: 'numeral'}; }),
    answer: answer
  };
}

CONTENT.luka.math = [
  {
    id: 'numbers-100', title: 'Numbers to 100', icon: '100', prerequisiteId: null,
    masteryRule: {type: 'streak', n: 5},
    exercises: [
      numeralRecognizeExercise(47, [47, 74, 17]),
      orderExercise([63, 29, 81], [29, 63, 81]),
      numeralRecognizeExercise(56, [56, 65, 55]),
      orderExercise([45, 72, 18], [18, 45, 72]),
      numeralRecognizeExercise(82, [82, 28, 81]),
      orderExercise([90, 34, 67], [34, 67, 90]),
      numeralRecognizeExercise(39, [39, 93, 38]),
      orderExercise([12, 56, 38], [12, 38, 56]),
      numeralRecognizeExercise(64, [64, 46, 69]),
      orderExercise([77, 23, 50], [23, 50, 77]),
      numeralRecognizeExercise(91, [91, 19, 90]),
      numeralRecognizeExercise(25, [25, 52, 24]),
      orderExercise([88, 41, 15], [15, 41, 88]),
      numeralRecognizeExercise(78, [78, 87, 79])
    ]
  },
  {
    id: 'add-sub-100', title: 'Add &amp; Subtract', icon: '+&minus;', prerequisiteId: 'numbers-100',
    masteryRule: {type: 'accuracy', minAttempts: 10, threshold: 0.8},
    exercises: [
      equationExercise('23 + 14', 37, [37, 36, 38]),
      equationExercise('45 + 32', 77, [77, 78, 76]),
      equationExercise('58 &minus; 23', 35, [35, 34, 36]),
      equationExercise('16 + 53', 69, [69, 68, 70]),
      equationExercise('76 &minus; 41', 35, [35, 36, 34]),
      equationExercise('27 + 41', 68, [68, 67, 69]),
      equationExercise('89 &minus; 55', 34, [34, 33, 35]),
      equationExercise('38 + 20', 58, [58, 59, 57]),
      equationExercise('64 &minus; 28', 36, [36, 35, 37]),
      equationExercise('92 &minus; 47', 45, [45, 44, 46]),
      equationExercise('50 &minus; 26', 24, [24, 23, 25])
    ]
  },
  {
    id: 'mult-2-5', title: 'Times Tables 2&ndash;5', icon: '&times;', prerequisiteId: 'add-sub-100',
    masteryRule: {type: 'accuracy', minAttempts: 10, threshold: 0.8},
    exercises: [
      equationExercise('2 &times; 3', 6, [6, 5, 7]),
      equationExercise('3 &times; 4', 12, [12, 11, 13]),
      equationExercise('4 &times; 5', 20, [20, 19, 21]),
      equationExercise('5 &times; 2', 10, [10, 9, 11]),
      equationExercise('2 &times; 7', 14, [14, 13, 15]),
      equationExercise('3 &times; 6', 18, [18, 17, 19]),
      equationExercise('4 &times; 4', 16, [16, 15, 17]),
      equationExercise('5 &times; 5', 25, [25, 24, 26]),
      equationExercise('3 &times; 3', 9, [9, 8, 10]),
      equationExercise('2 &times; 9', 18, [18, 16, 20])
    ]
  }
];
