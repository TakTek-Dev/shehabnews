/* شهاب — قارئ المقال (article.html, Phase 3).

     progress   a 3px bar under the header that fills as the reader scrolls
                (CSS scroll-driven animation where supported, rAF otherwise)
     reader     the toolbar in the intro: حجم الخط (نفس الثلاث درجات اللي في التوب-بار،
                محفوظة)، استمع (يسلّم فقرات المقال لمشغّل الموجز js/brief.js)،
                حفظ (المحفوظات في localStorage، صفحة saved.html)، طباعة
     zoom       the lead figure opens in PhotoSwipe (js/gallery.js handles the
                [data-sh-pswp] wall once the anchor carries data-pswp-*)
     save       delegated: any [data-sh-save] with data-sh-save-* attributes

   Hooks: article[data-sh-story], [data-sh-reader], [data-sh-font="-|0|+"],
   [data-sh-listen], [data-sh-save], .sh-article-article-body__p-1 */
(function () {
  'use strict';
  var art = document.querySelector('article[data-sh-story]');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k)); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }

  /* ----------------------------------------------------------- progress -- */
  function progress() {
    if (!art) return;
    var bar = document.createElement('div');
    bar.className = 'sh-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
    if (window.CSS && CSS.supports && CSS.supports('animation-timeline: scroll()')) { bar.setAttribute('data-css', ''); return; }
    var ticking = false;
    function paint() {
      ticking = false;
      var max = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, window.scrollY / max) : 0) + ')';
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(paint); } }, { passive: true });
    paint();
  }

  /* ---------------------------------------------------------- font size -- */
  /* The toolbar's أ+ / أ- step the same three sizes the topbar control offers
     -- small, medium, large -- on the same attribute and the same stored key,
     so the site has one type size and not a reader-only second one. The dek
     and the body take it through --reader-scale, which css/pages/article.css
     derives from the attribute, with a little more headroom at «كبير». */
  var TYPE = ['sm', 'md', 'lg'], TYPE_PCT = { sm: '92%', md: '100%', lg: '120%' };
  function fontSize() {
    var bar = document.querySelector('[data-sh-reader]');
    if (!bar) return;
    function current() { var t = store('sh-type'); return t === 'sm' || t === 'lg' ? t : 'md'; }
    function paint() {
      var t = current(), i = TYPE.indexOf(t);
      bar.querySelectorAll('[data-sh-font]').forEach(function (b) {
        var k = b.getAttribute('data-sh-font');
        b.disabled = (k === '-' && i === 0) || (k === '+' && i === TYPE.length - 1);
      });
      var lbl = bar.querySelector('[data-sh-font-label]');
      if (lbl) lbl.textContent = TYPE_PCT[t];
    }
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('[data-sh-font]');
      if (!b) return;
      var i = TYPE.indexOf(current()), k = b.getAttribute('data-sh-font');
      var t = TYPE[k === '+' ? Math.min(TYPE.length - 1, i + 1) : k === '-' ? Math.max(0, i - 1) : 1];
      if (window.ShWidgets && ShWidgets.typeSet) ShWidgets.typeSet(t);
      else {
        if (t === 'md') document.documentElement.removeAttribute('data-sh-type');
        else document.documentElement.setAttribute('data-sh-type', t);
        store('sh-type', t);
      }
      paint();
    });
    document.addEventListener('sh-type:change', paint);
    paint();
  }

  /* ------------------------------------------------------------- listen -- */
  function listen() {
    var btn = document.querySelector('[data-sh-listen]');
    if (!btn || !art) return;
    btn.addEventListener('click', function () {
      var title = (document.querySelector('h1') || {}).textContent || '';
      var cat = (art.querySelector('.sh-link') || {}).textContent || 'شهاب';
      var paras = [].slice.call(art.querySelectorAll('.sh-art__dek, .sh-art__body > p'))
        .map(function (p) { return p.textContent.replace(/\s+/g, ' ').trim(); }).filter(Boolean);
      var items = [{ c: cat.trim(), time: '', href: location.pathname, t: title.trim(), say: title.trim() }]
        .concat(paras.map(function (p, k) { return { c: cat.trim(), time: '', href: location.pathname, t: 'الفقرة ' + (k + 1), say: p }; }));
      document.dispatchEvent(new CustomEvent('sh-brief:play', { detail: { id: 'article:' + art.getAttribute('data-sh-story'), edition: 'استمع للمقال', items: items } }));
      btn.setAttribute('aria-pressed', 'true');
    });
  }

  /* --------------------------------------------------------------- save -- */
  function saved() { return store('sh-saved') || []; }
  function isSaved(href) { return saved().some(function (x) { return x.href === href; }); }
  function paintSave(btn) {
    var href = btn.getAttribute('data-sh-save') || location.pathname;
    var on = isSaved(href);
    btn.setAttribute('aria-pressed', String(on));
    ShUI.setIcon(btn.querySelector('.sh-i'), 'bookmark', on ? 'solid' : 'regular');
    var l = btn.querySelector('[data-sh-save-label]');
    if (l) l.textContent = on ? 'محفوظ' : 'حفظ';
  }
  function save() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-sh-save]');
      if (!btn) return;
      e.preventDefault();
      var href = btn.getAttribute('data-sh-save') || location.pathname;
      var list = saved();
      if (isSaved(href)) {
        list = list.filter(function (x) { return x.href !== href; });
        ShUI.toast('اتشال من المحفوظات');
      } else {
        list.unshift({
          href: href,
          t: btn.getAttribute('data-sh-save-title') || (document.querySelector('h1') || {}).textContent.trim() || document.title,
          cat: btn.getAttribute('data-sh-save-cat') || ((art && art.querySelector('.sh-link')) || {}).textContent || '',
          at: new Date().toISOString()
        });
        if (list.length > 200) list.length = 200;
        ShUI.toast('اتحفظ في المحفوظات');
      }
      store('sh-saved', list);
      document.querySelectorAll('[data-sh-save]').forEach(paintSave);
    });
    document.querySelectorAll('[data-sh-save]').forEach(paintSave);
  }

  /* -------------------------------------------------------------- print -- */
  function print() {
    var b = document.querySelector('[data-sh-print]');
    if (b) b.addEventListener('click', function () { window.print(); });
  }

  /* ------------------------------------------------------------- scenes -- */
  /* the sticky picture pane follows the reading: the last [data-sh-scene-at]
     above the viewport's upper half names the picture; CSS does the crossfade */
  function scenes() {
    var pane = document.querySelector('[data-sh-pane]');
    if (!pane || !art) return;
    var ats = [].slice.call(art.querySelectorAll('[data-sh-scene-at]'));
    var num = pane.querySelector('[data-sh-pane-n]');
    var shots = [].slice.call(pane.querySelectorAll('.sh-pane__shot'));
    if (!ats.length) return;
    var mq = window.matchMedia('(min-width: 1000px)');
    var cur = null, ticking = false;
    function paint() {
      ticking = false;
      if (!mq.matches) return;
      var line = window.innerHeight * 0.45, n = ats[0].getAttribute('data-sh-scene-at');
      ats.forEach(function (el) { if (el.getBoundingClientRect().top < line) n = el.getAttribute('data-sh-scene-at'); });
      if (n === cur) return;
      cur = n;
      pane.setAttribute('data-scene', n);
      if (num) num.textContent = n;
      shots.forEach(function (s) {
        var on = s.getAttribute('data-sh-shot') === n;
        if (on) { s.removeAttribute('tabindex'); s.removeAttribute('aria-hidden'); }
        else { s.setAttribute('tabindex', '-1'); s.setAttribute('aria-hidden', 'true'); }
      });
    }
    function tick() { if (!ticking) { ticking = true; requestAnimationFrame(paint); } }
    window.addEventListener('scroll', tick, { passive: true });
    window.addEventListener('resize', tick);
    paint();
  }

  function init() { progress(); fontSize(); listen(); save(); print(); scenes(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
