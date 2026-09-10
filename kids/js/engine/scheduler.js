// ── SPACED REVIEW SCHEDULER ──────────────────────────────────
// Stamps when a mastered topic should resurface, and reschedules it
// each time a review exercise for it gets answered. SessionBuilder
// mixes due topics back into a live session queue (Phase 2).
var Scheduler = {
  REVIEW_DAYS: [1, 3, 7, 14],
  DAY_MS: 24 * 60 * 60 * 1000,

  stampOnMastery: function(progress, nowTs){
    var stage = progress.reviewStage || 0;
    progress.reviewDueAt = nowTs + Scheduler.REVIEW_DAYS[Math.min(stage, Scheduler.REVIEW_DAYS.length - 1)] * Scheduler.DAY_MS;
    return progress;
  },

  isDue: function(progress, nowTs){
    return !!(progress && progress.reviewDueAt && progress.reviewDueAt <= nowTs);
  },

  // Called when a due review exercise gets answered. A correct answer
  // moves one step further out on the ladder (it's sticking); a miss
  // doesn't advance the ladder and brings the topic back tomorrow
  // instead — it needs another light touch, not a longer gap.
  advanceReview: function(progress, correct, nowTs){
    var stage = progress.reviewStage || 0;
    if(correct){
      stage = Math.min(stage + 1, Scheduler.REVIEW_DAYS.length - 1);
      progress.reviewStage = stage;
      progress.reviewDueAt = nowTs + Scheduler.REVIEW_DAYS[stage] * Scheduler.DAY_MS;
    } else {
      progress.reviewDueAt = nowTs + 1 * Scheduler.DAY_MS;
    }
    progress.lastSeenAt = nowTs;
    return progress;
  }
};
