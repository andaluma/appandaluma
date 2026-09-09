// ── SESSION QUEUE BUILDER ────────────────────────────────────
// Phase 1: a shuffled pass over the active topic's own exercise pool.
// Phase 2 extends this to mix in ~1-in-4 due-review exercises from
// already-mastered topics, per the plan's "spaced review, not a
// separate mode" decision.
var SessionBuilder = {
  build: function(topic){
    var pool = topic.exercises.slice();
    for(var i = pool.length - 1; i > 0; i--){
      var j = Math.floor(Math.random() * (i + 1));
      var t = pool[i]; pool[i] = pool[j]; pool[j] = t;
    }
    return pool;
  }
};
