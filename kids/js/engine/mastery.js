// ── MASTERY ENGINE ───────────────────────────────────────────
// Pure logic: given a topic's current progress and the result of one
// attempt, decides the new progress. No DOM, no Firebase — kids.js wires
// the result into RTDB and the UI.
var Mastery = {

  blank: function(){
    return {status:'active', correctStreak:0, attempts:[], masteredAt:null, lastSeenAt:null, reviewDueAt:null, reviewStage:0};
  },

  // masteryRule: {type:'streak', n} or {type:'accuracy', minAttempts, threshold}
  evaluate: function(progress, correct, masteryRule, nowTs){
    progress = progress || Mastery.blank();
    var attempts = (progress.attempts || []).slice();
    attempts.push({correct: !!correct, ts: nowTs});
    if(attempts.length > 20) attempts = attempts.slice(attempts.length - 20);

    var correctStreak = correct ? (progress.correctStreak || 0) + 1 : 0;
    var wasMastered = progress.status === 'mastered';
    var mastered = wasMastered;

    if(!wasMastered){
      if(masteryRule.type === 'streak'){
        mastered = correctStreak >= masteryRule.n;
      } else if(masteryRule.type === 'accuracy'){
        var correctCount = attempts.filter(function(a){ return a.correct; }).length;
        mastered = attempts.length >= masteryRule.minAttempts &&
                   (correctCount / attempts.length) >= masteryRule.threshold;
      }
    }

    var justMastered = mastered && !wasMastered;
    return {
      status: mastered ? 'mastered' : 'active',
      correctStreak: correctStreak,
      attempts: attempts,
      masteredAt: justMastered ? nowTs : (progress.masteredAt || null),
      lastSeenAt: nowTs,
      reviewDueAt: progress.reviewDueAt || null,
      reviewStage: progress.reviewStage || 0,
      justMastered: justMastered
    };
  },

  // Derives a topic's state when no (or an incomplete) progress record exists yet.
  statusFor: function(topic, progressBySubject){
    var p = progressBySubject && progressBySubject[topic.id];
    if(p && p.status) return p.status;
    if(!topic.prerequisiteId) return 'active';
    var prereq = progressBySubject && progressBySubject[topic.prerequisiteId];
    return (prereq && prereq.status === 'mastered') ? 'active' : 'locked';
  },

  progressLabel: function(progress, masteryRule){
    progress = progress || Mastery.blank();
    if(masteryRule.type === 'streak'){
      return {done: progress.correctStreak || 0, total: masteryRule.n};
    }
    var attempts = progress.attempts || [];
    return {done: attempts.length, total: masteryRule.minAttempts};
  }
};
