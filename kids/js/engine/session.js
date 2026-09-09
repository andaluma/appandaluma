// ── SESSION QUEUE BUILDER ────────────────────────────────────
// Builds the live exercise queue for one sitting: the active topic's
// own pool, plus roughly 1-in-4 slots pulled from due review topics
// (per the plan's "spaced review, not a separate mode"). extend() adds
// another shuffled pass when a struggling child needs more reps before
// the topic is mastered — the adaptive-difficulty half of Phase 2.
var SessionBuilder = {
  MAX_EXERCISES: 16,

  _shuffle: function(arr){
    var out = arr.slice();
    for(var i = out.length - 1; i > 0; i--){
      var j = Math.floor(Math.random() * (i + 1));
      var t = out[i]; out[i] = out[j]; out[j] = t;
    }
    return out;
  },

  // reviewPool: [{exercise, topicId}, ...] — one sampled exercise per due topic.
  build: function(topic, reviewPool){
    var primary = SessionBuilder._shuffle(topic.exercises).map(function(ex){
      return {exercise: ex, topicId: topic.id, isReview: false};
    });
    if(!reviewPool || !reviewPool.length) return primary;

    var merged = [];
    var rIdx = 0;
    for(var i = 0; i < primary.length; i++){
      merged.push(primary[i]);
      if((i + 1) % 4 === 0){
        merged.push(reviewPool[rIdx % reviewPool.length]);
        rIdx++;
      }
    }
    return merged;
  },

  // Another shuffled pass over the same topic — used when the queue
  // ran out but mastery hasn't been reached yet.
  extend: function(topic){
    return SessionBuilder._shuffle(topic.exercises).map(function(ex){
      return {exercise: ex, topicId: topic.id, isReview: false};
    });
  }
};
