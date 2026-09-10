// ── SKILL MAP RENDERER ───────────────────────────────────────
var MapUI = {
  // topics: content array. progressBySubject: {topicId: progressRecord}
  render: function(topics, progressBySubject, accentKey){
    return '<div class="skill-map">' + topics.map(function(topic, i){
      var status = Mastery.statusFor(topic, progressBySubject);
      var cls = 'skill-node ' + status + ' ' + (accentKey || '');
      var side = i % 2 === 0 ? 'left' : 'right';
      var inner;
      if(status === 'mastered'){
        inner = '<span class="node-badge">&#10003;</span>';
      } else if(status === 'locked'){
        inner = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="9" rx="2.5" stroke="#8C7F68" stroke-width="1.8"/><path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="#8C7F68" stroke-width="1.8" stroke-linecap="round"/></svg>';
      } else {
        inner = '<span class="node-icon">' + topic.icon + '</span>';
      }
      var clickable = status !== 'locked';
      return (
        '<div class="skill-node-row ' + side + '">' +
          (i > 0 ? '<span class="skill-connector"></span>' : '') +
          '<button class="' + cls + '" type="button"' +
            (clickable ? ' onclick="onTopicNodeClick(\'' + topic.id + '\')"' : ' disabled') + '>' +
            inner +
          '</button>' +
          '<span class="skill-node-label">' + topic.title + '</span>' +
        '</div>'
      );
    }).join('') + '</div>';
  }
};
