/* شهاب — the live stream without a page (ShLiveBox).

   Every «بث مباشر» entry -- the masthead button, the nav's «البث المباشر»
   and the docked live bar -- carries data-sh-live-open and opens the same
   modal player here instead of leaving the page. The href stays as the
   no-JS fallback (live.html), and on the live page itself nothing is
   intercepted: that page is the stream.

   The player is Vidstack through js/player.js (ShPlayer.mount), fetched on
   the first open only: the vendor's sheets and scripts are injected then, so
   a page that never opens the stream pays nothing for it. Sources, stream
   type and poster are the live page's (LIVE below); the feed's live-state
   keeps the title and the viewers fresh. #live in the URL opens it on load,
   which is what «نسخ رابط البث» copies.

   Escape closes, Tab stays inside, focus returns to the opener; closing
   removes the player so the stream stops pulling.

   Hooks: [data-sh-live-open] any opener; the modal is built on first use.
   Exposes window.ShLiveBox = { open, close }. */
(function () {
  'use strict';
  if (!document.body || document.body.hasAttribute('data-sh-page-live')) return;

  var LIVE = {
    title: 'شهاب مباشر — بث من غزة',
    poster: 'assets/images/live-poster.webp',
    sources: 'https://stream.mux.com/v69RSHhFelSm4701snP22dYz2jICy4E4FUyk02rW4gxRM.m3u8|https://demo.unified-streaming.com/k8s/live/stable/live.isml/.m3u8|assets/video/hls/qods-night/master.m3u8'
  };
  var VENDOR_CSS = ['assets/vendor/vidstack/styles/default/theme.css', 'assets/vendor/vidstack/styles/default/layouts/video.css', 'css/player.css'];
  var VENDOR_JS = 'assets/vendor/vidstack/vidstack.js';
  var PLAYER_JS = 'js/player.js';
  var LOAD_MS = 15000;
  var V = (function () {
    var s = (document.currentScript && document.currentScript.src) || '';
    var m = /[?&]v=(\d+)/.exec(s);
    return m ? m[1] : '';
  })();
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var esc = window.ShUI ? ShUI.esc : function (s) { return String(s); };
  var icon = window.ShUI ? ShUI.icon : function () { return ''; };
  var box, els, opener, player, loading, closing;
  var live = { title: '', viewers: null };

  function fmtInt(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function shareUrl() { return location.href.replace(/#.*$/, '') + '#live'; }

  /* ----------------------------------------------------------- vendor */
  // the sheets and the two scripts, once; resolves when <media-player> is defined
  function vendor() {
    if (window.ShPlayer) return ShPlayer.ready;
    if (loading) return loading;
    loading = new Promise(function (resolve, reject) {
      var fail = function () { loading = null; reject(new Error('vendor')); };
      VENDOR_CSS.forEach(function (href) {
        if (document.querySelector('link[href^="' + href + '"]')) return;
        var l = document.createElement('link');
        l.rel = 'stylesheet';
        l.href = href + '?v=' + V;
        document.head.appendChild(l);
      });
      if (!document.querySelector('script[src^="' + VENDOR_JS + '"]')) {
        var m = document.createElement('script');
        m.type = 'module';
        m.src = VENDOR_JS + '?v=' + V;
        m.onerror = fail;
        document.head.appendChild(m);
      }
      var p = document.createElement('script');
      p.src = PLAYER_JS + '?v=' + V;
      p.onerror = fail;
      p.onload = function () { if (window.ShPlayer) ShPlayer.ready.then(resolve, fail); else fail(); };
      document.head.appendChild(p);
    });
    return loading;
  }

  /* ------------------------------------------------------------ build */
  function build() {
    box = document.createElement('div');
    box.className = 'sh-livebox';
    box.hidden = true;
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-labelledby', 'sh-livebox-title');
    box.setAttribute('data-sh-share-url', shareUrl());
    box.setAttribute('data-sh-share-title', LIVE.title);
    box.innerHTML =
      '<div class="sh-livebox__veil" data-sh-lb-close></div>' +
      '<div class="sh-livebox__frame">' +
        '<div class="sh-livebox__bar">' +
          '<span class="sh-livebox__badge"><span class="sh-livebox__dot"></span><span data-sh-lb-badge>مباشر</span></span>' +
          '<h2 class="sh-livebox__title" id="sh-livebox-title" data-sh-lb-title>' + esc(LIVE.title) + '</h2>' +
          '<span class="sh-livebox__viewers" data-sh-lb-viewers-wrap hidden>' + icon('eye', 'regular') + '<b class="sh-tnum" data-sh-lb-viewers></b>يشاهدون</span>' +
          '<button type="button" class="sh-livebox__close" data-sh-lb-close aria-label="إغلاق">' + icon('xmark') + '</button>' +
        '</div>' +
        '<div class="sh-livebox__stage" data-sh-lb-stage>' +
          '<div class="sh-livebox__wait" data-sh-lb-wait><span class="sh-livebox__spin"></span><span data-sh-lb-wait-text>جارٍ تجهيز البث…</span></div>' +
        '</div>' +
        '<div class="sh-livebox__foot">' +
          '<span class="sh-livebox__state"><span class="sh-livebox__pulse"></span><b data-sh-lb-state>على الهواء</b></span>' +
          '<button type="button" class="sh-livebox__edge" data-sh-lb-edge hidden>' + icon('forward-step') + 'العودة إلى البث الحي</button>' +
          '<span class="sh-livebox__meta">' + icon('signal') + 'الجودة <b data-sh-lb-quality>تلقائي</b></span>' +
          '<button type="button" class="sh-livebox__share" data-sh-share="copy">' + icon('link') + 'نسخ رابط البث</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(box);
    var q = function (s) { return box.querySelector(s); };
    els = { stage: q('[data-sh-lb-stage]'), wait: q('[data-sh-lb-wait]'), waitText: q('[data-sh-lb-wait-text]'),
            badge: q('[data-sh-lb-badge]'), title: q('[data-sh-lb-title]'), state: q('[data-sh-lb-state]'),
            edge: q('[data-sh-lb-edge]'), quality: q('[data-sh-lb-quality]'),
            viewers: q('[data-sh-lb-viewers]'), viewersWrap: q('[data-sh-lb-viewers-wrap]'), close: q('.sh-livebox__close') };
    [].forEach.call(box.querySelectorAll('[data-sh-lb-close]'), function (b) { b.addEventListener('click', close); });
    box.addEventListener('click', function (e) {
      if (e.target.closest('[data-sh-lb-retry]')) { e.preventDefault(); mount(); }
    });
    document.addEventListener('keydown', function (e) {
      if (box.hidden) return;
      if (e.key === 'Escape') { if (document.fullscreenElement) return; e.preventDefault(); close(); }
      else if (e.key === 'Tab') trap(e);
    });
  }

  function trap(e) {
    var f = [].slice.call(box.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])'))
      .filter(function (n) { return n.offsetParent !== null && !n.disabled && n.tabIndex !== -1; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1], cur = document.activeElement;
    if (!box.contains(cur)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && cur === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && cur === last) { e.preventDefault(); first.focus(); }
  }

  /* ----------------------------------------------------------- player */
  function waiting(on, html) {
    els.wait.hidden = !on;
    if (html != null) els.wait.innerHTML = html;
  }

  function mount() {
    if (player || box.hidden) return;
    waiting(true, '<span class="sh-livebox__spin"></span><span data-sh-lb-wait-text>جارٍ تجهيز البث…</span>');
    var timer = new Promise(function (_, reject) { setTimeout(function () { reject(new Error('timeout')); }, LOAD_MS); });
    Promise.race([vendor(), timer]).then(function () {
      if (box.hidden || player) return;                      // closed while it loaded
      var el = document.createElement('media-player');
      el.className = 'sh-livebox__player';
      el.setAttribute('data-sh-vs', '');
      el.setAttribute('title', live.title || LIVE.title);
      el.setAttribute('data-sh-sources', LIVE.sources);
      el.setAttribute('stream-type', 'live:dvr');
      el.setAttribute('live-edge-tolerance', '8');
      el.setAttribute('min-live-dvr-window', '15');
      el.setAttribute('poster', LIVE.poster);
      el.setAttribute('playsinline', '');
      el.setAttribute('crossorigin', '');
      el.setAttribute('load', 'eager');
      el.setAttribute('poster-load', 'eager');
      el.setAttribute('autoplay', '');
      el.innerHTML = '<media-provider></media-provider><media-video-layout></media-video-layout>';
      els.stage.insertBefore(el, els.wait);
      player = el;
      el.addEventListener('can-play', function () { waiting(false); }, { once: true });
      ShPlayer.mount(el).then(function () { wire(el); });
    }, function () {
      if (box.hidden) return;
      loading = null;
      waiting(true, '<span>تعذّر تحميل المشغّل. تحقّق من الاتصال ثم أعد المحاولة.</span>' +
        '<button type="button" class="sh-livebox__retry" data-sh-lb-retry>أعد المحاولة</button>');
    });
  }

  // the live page's own logic (js/live.js), on the modal's smaller bar
  function wire(el) {
    var replay = false;
    function paintEdge() {
      if (replay) return;
      var s = el.state, behind = s.live && !s.liveEdge && s.canSeek;
      box.toggleAttribute('data-behind', behind);
      els.badge.textContent = behind ? 'متأخر عن البث' : 'مباشر';
      els.state.textContent = behind ? 'تشاهد تسجيلًا متأخرًا' : 'على الهواء';
      els.edge.hidden = !behind;
    }
    ['live-change', 'live-edge-change', 'can-play', 'seeked', 'play'].forEach(function (ev) { el.addEventListener(ev, paintEdge); });
    els.edge.onclick = function () {
      el.seekToLiveEdge();
      var p = el.play(); if (p && p.catch) p.catch(function () {});
    };
    function paintQuality() {
      var s = el.state, qq = s.quality;
      els.quality.textContent = s.autoQuality ? ('تلقائي' + (qq ? ' · ' + qq.height + 'p' : '')) : (qq ? qq.height + 'p' : '—');
    }
    ['quality-change', 'auto-quality-change', 'qualities-change', 'can-play'].forEach(function (ev) { el.addEventListener(ev, paintQuality); });
    el.addEventListener('sh-vs-fallback', function (e) {
      if (!e.detail || !e.detail.last) return;
      replay = true;
      el.removeAttribute('stream-type');
      box.removeAttribute('data-behind');
      box.setAttribute('data-replay', '');
      els.badge.textContent = 'إعادة';
      els.state.textContent = 'البث متوقف مؤقتًا — تُعرض إعادة';
      els.edge.hidden = true;
    });
    paintEdge();
    paintQuality();
  }

  function unmount() {
    if (!player) return;
    try { player.pause(); } catch (e) {}
    try { if (typeof player.destroy === 'function') player.destroy(); } catch (e) {}
    if (player.parentNode) player.parentNode.removeChild(player);
    player = null;
  }

  /* ------------------------------------------------------- open / close */
  function paintLive() {
    if (!els) return;
    if (live.title) els.title.textContent = live.title;
    if (live.viewers != null) { els.viewers.textContent = fmtInt(live.viewers); els.viewersWrap.hidden = false; }
  }

  function open(from) {
    if (!box) build();
    if (!box.hidden || closing) return;
    opener = from || document.activeElement;
    box.setAttribute('data-sh-share-url', shareUrl());
    box.hidden = false;
    box.removeAttribute('data-closing');
    document.documentElement.setAttribute('data-sh-livebox-open', '');
    paintLive();
    // after the frame is painted: at load (#live) a focus set at once is lost
    requestAnimationFrame(function () { if (!box.hidden) els.close.focus(); });
    mount();
  }

  function close() {
    if (!box || box.hidden || closing) return;
    closing = true;
    box.setAttribute('data-closing', '');
    var done = function () {
      box.hidden = true;
      box.removeAttribute('data-closing');
      box.removeAttribute('data-behind');
      box.removeAttribute('data-replay');
      document.documentElement.removeAttribute('data-sh-livebox-open');
      unmount();
      els.badge.textContent = 'مباشر';
      els.state.textContent = 'على الهواء';
      els.edge.hidden = true;
      closing = false;
      if (location.hash === '#live') history.replaceState(null, '', location.pathname + location.search);
      if (opener && opener.focus) opener.focus();
    };
    if (reduce) done(); else setTimeout(done, 220);
  }

  /* ---------------------------------------------------------- openers */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-sh-live-open]');
    if (!a || e.defaultPrevented || e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    open(a);
  });
  function onLive(e) {
    var d = e.detail || {};
    if (d.title) live.title = d.title;
    if (typeof d.viewers === 'number') live.viewers = d.viewers;
    paintLive();
  }
  document.addEventListener('sh-feed:live-state', onLive);
  document.addEventListener('sh-feed:hello', onLive);
  // a shared link lands on the stream
  function fromHash() { if (location.hash === '#live') open(null); }
  window.addEventListener('hashchange', fromHash);
  fromHash();

  window.ShLiveBox = { open: open, close: close };
})();
