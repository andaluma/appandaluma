// ── SPACED REVIEW SCHEDULER ──────────────────────────────────
// Stamps when a freshly-mastered topic should resurface. Phase 1 only
// stamps reviewDueAt on mastery; mixing due topics back into a live
// session queue is Phase 2 (SessionBuilder.build gets a review pool then).
var Scheduler = {
  REVIEW_DAYS: [1, 3, 7, 14],

  stampOnMastery: function(progress, nowTs){
    var stage = progress.reviewStage || 0;
    var days = Scheduler.REVIEW_DAYS[Math.min(stage, Scheduler.REVIEW_DAYS.length - 1)];
    progress.reviewDueAt = nowTs + days * 24 * 60 * 60 * 1000;
    return progress;
  },

  isDue: function(progress, nowTs){
    return !!(progress && progress.reviewDueAt && progress.reviewDueAt <= nowTs);
  }
};
