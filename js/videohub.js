/* شهاب — مكتبة الفيديو (video.html).

   The live card beside the lead video keeps its viewers in step with the feed
   (the same live-state the docked bar and the live modal read), and says so
   when the channel is off air. The library's tabs are js/app.js tabs(), the
   times js/ui.js, and the card opens the stream through js/livebox.js.

   Hooks: [data-sh-vh-live] the card, [data-sh-vh-viewers] its count. */
(function () {
  'use strict';
  var card = document.querySelector('[data-sh-vh-live]');
  if (!card) return;
  var num = card.querySelector('[data-sh-vh-viewers]');
  function fmt(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function paint(e) {
    var d = (e && e.detail) || {};
    if (num && typeof d.viewers === 'number') num.textContent = fmt(d.viewers);
    if (typeof d.on_air === 'boolean') card.toggleAttribute('data-off-air', !d.on_air);
  }
  document.addEventListener('sh-feed:live-state', paint);
  document.addEventListener('sh-feed:hello', paint);
})();
