/* شهاب — صفحة المشاهدة (video-watch.html) على نواة المشغّل js/player.js.

   المشغّل نفسه Vidstack بالـDefault Layout (جودات HLS، فصول على شريط
   التقدّم، ثمبنيلز، ترجمة، سرعة، PiP، ملء الشاشة، اختصارات كيبورد على مستوى
   الصفحة، وحفظ الصوت والموضع في storage). الصفحة مبنية على قواعد صفحة الخبر
   (css/pages/article.css)، والملف ده بيضيف طبقة الصفحة فقط:

     - فصول الفيديو في عمود النص من مسار الفصول نفسه (مصدر واحد للحقيقة)،
       والفصل الجاري معلّم، والضغط بيقفز ويشغّل.
     - المدة في سطر الميتا من المشغّل.
     - مشغّل مصغّر: لما المشغّل يخرج من الشاشة وهو شغّال بيتثبّت في الركن،
       بزر إغلاق (بيوقف) وزر رجوع (بيطلع لمكانه).

   الحفظ من js/article.js ([data-sh-save])، والمشاركة من js/chrome.js.

   الخطافات: [data-sh-watch] الحاوية، [data-sh-watch-player] المشغّل،
   [data-sh-watch-frame] إطار النسبة، [data-sh-watch-chapters-box] قسم الفصول
   (مخفي لحد ما المسار يحمّل) وجواه [data-sh-watch-chapters]،
   [data-sh-watch-duration]، [data-sh-watch-mini-close] / [data-sh-watch-mini-back]. */
(function () {
  'use strict';
  var root = document.querySelector('[data-sh-watch]');
  if (!root || !window.ShPlayer) return;

  var player = root.querySelector('[data-sh-watch-player]');
  var frame = root.querySelector('[data-sh-watch-frame]');
  var chaptersBox = root.querySelector('[data-sh-watch-chapters-box]');
  var chaptersList = root.querySelector('[data-sh-watch-chapters]');
  var durationEl = root.querySelector('[data-sh-watch-duration]');
  var miniClose = root.querySelector('[data-sh-watch-mini-close]');
  var miniBack = root.querySelector('[data-sh-watch-mini-back]');
  if (!player) return;

  var reduce = ShPlayer.reduceMotion;
  var fmt = ShPlayer.fmt;

  ShPlayer.ready.then(init);

  function init() {
    /* ------------------------------------------------ 1. chapters */
    var activeCue = null;
    function renderChapters(track) {
      if (!chaptersList) return;
      var cues = track ? [].slice.call(track.cues) : [];
      chaptersList.innerHTML = '';
      if (chaptersBox) chaptersBox.hidden = !cues.length;
      cues.forEach(function (cue) {
        var li = document.createElement('li');
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'sh-vw__ch';
        b.setAttribute('data-start', String(cue.startTime));
        b.innerHTML = '<span class="sh-vw__ch-t"></span><span class="sh-vw__ch-l"></span>';
        b.querySelector('.sh-vw__ch-t').textContent = fmt(cue.startTime);
        b.querySelector('.sh-vw__ch-l').textContent = cue.text;
        b.addEventListener('click', function () {
          player.currentTime = cue.startTime + 0.01;
          var p = player.play(); if (p && p.catch) p.catch(function () {});
        });
        li.appendChild(b);
        chaptersList.appendChild(li);
      });
      activeCue = null;
      paintChapter();
    }
    function paintChapter() {
      if (!chaptersList) return;
      var t = player.state.currentTime;
      var rows = chaptersList.querySelectorAll('.sh-vw__ch'), on = null;
      for (var i = rows.length - 1; i >= 0; i--) {
        if (t >= parseFloat(rows[i].getAttribute('data-start'))) { on = rows[i]; break; }
      }
      if (on === activeCue) return;
      activeCue = on;
      [].forEach.call(rows, function (r) { r.setAttribute('aria-current', r === on ? 'true' : 'false'); });
    }
    function hookChapters(track) {
      if (!track || track.kind !== 'chapters') return;
      if (track.mode === 'disabled') track.mode = 'hidden';
      if (track.readyState === 2) renderChapters(track);
      else track.addEventListener('load', function () { renderChapters(track); });
    }
    player.textTracks.addEventListener('add', function (e) { hookChapters(e.detail); });
    var existing = player.textTracks.getByKind('chapters');
    if (existing.length) hookChapters(existing[0]);
    player.addEventListener('time-update', paintChapter);

    /* ------------------------------------------------ 2. duration */
    player.addEventListener('duration-change', function () {
      if (durationEl && player.state.duration > 0) durationEl.textContent = fmt(player.state.duration);
    });

    /* ------------------------------------------------ 3. mini player */
    var miniOn = false, away = false;
    function mini(on) {
      if (on === miniOn) return;
      miniOn = on;
      root.toggleAttribute('data-mini', on);
      if (miniClose) miniClose.hidden = !on;
      if (miniBack) miniBack.hidden = !on;
    }
    if (frame && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        away = entries[0].intersectionRatio < 0.3;
        if (!away) mini(false);
        else if (!player.state.paused && !document.fullscreenElement && !player.state.pictureInPicture) mini(true);
      }, { threshold: [0, 0.3, 0.6, 1] });
      io.observe(frame);
      player.addEventListener('play', function () { if (away) mini(true); });
      player.addEventListener('playing', function () { if (away) mini(true); });
      /* on pause it stays docked until it scrolls back or gets closed */
    }
    if (miniClose) miniClose.addEventListener('click', function () { player.pause(); mini(false); });
    if (miniBack) miniBack.addEventListener('click', function () {
      mini(false);
      frame.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
    });
  }
})();
