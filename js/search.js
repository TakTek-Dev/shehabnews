/* شهاب — البحث (search.html).

   Phase 1: the page works without a backend. The query comes from ?q=, the
   count is the real number of results on the page, and the filters — the
   sections (any number of them), the kinds, a date range and the sort —
   filter and sort the static list in place. Their state lives in the URL
   (?q=…&sec=غزة,دولي&kind=news,report&from=2026-09-01&to=2026-09-13&sort=old)
   so a filtered search can be shared and, later, read by the backend as it
   is. While a filter is on every batch shows and the pager steps aside;
   clearing the filters puts the batches back as they were shipped. The words
   of the query are marked where they occur in a result's title and summary.

   Phase 3 adds the instant search layer (js/searchbox.js) and, when
   /api/search answers, replaces the static list with live results — the same
   apply() below draws both.

   Hooks: [data-sh-search] the head's form, [data-sh-search-q] its input,
   [data-sh-search-term], [data-sh-search-count], [data-sh-search-empty];
   [data-sh-sf] the filter column with [data-sh-sf-secs] (one chip per section
   the results name, built here), [data-sh-sf-all], [data-sh-sf-kind=
   "news|report|analysis|story"], [data-sh-sf-from], [data-sh-sf-to],
   [data-sh-sf-quick="1|7|30|year"] and [data-sh-sf-toggle] (the phone fold);
   over the results [data-sh-ssort], [data-sh-sf-applied], [data-sh-sf-clear];
   [data-sh-pager-list] > [data-sh-page] > a.sh-se-item, each result carrying
   data-sh-section, its kind in .sh-se-item__kind and a <time data-sh-ago> (or
   datetime). [data-sh-trend] links in the head mark the query being read. */
(function () {
  'use strict';
  var root = document.querySelector('[data-sh-search-page]');
  if (!root) return;

  var ORDER = ['غزة', 'الضفة الغربية', 'القدس', 'الأسرى', 'الداخل المحتل', 'عربي', 'دولي', 'إسرائيلي', 'رياضة', 'رأي', 'الوسائط', 'ملفات شهاب', 'البيانات'];
  var KIND = { news: 'خبر', report: 'تقرير', analysis: 'تحليل', story: 'قصة' };
  var KIND_EN = { news: 'News', report: 'Reports', analysis: 'Analysis', story: 'Stories' };
  var DAY = 864e5;
  var EN = window.ShLang && ShLang.get() === 'en';
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  var params = new URLSearchParams(location.search);
  var q = (params.get('q') || '').trim();
  var input = root.querySelector('[data-sh-search-q]');
  var terms = root.querySelectorAll('[data-sh-search-term]');
  var count = root.querySelector('[data-sh-search-count]');
  var list = root.querySelector('[data-sh-pager-list]');
  var items = list ? [].slice.call(list.querySelectorAll('a.sh-se-item')) : [];
  var empty = root.querySelector('[data-sh-search-empty]');
  var bar = root.querySelector('[data-sh-sf]');
  var pagerNav = root.querySelector('[data-sh-pager]');
  var pages = list ? [].slice.call(list.querySelectorAll('[data-sh-page]')) : [];
  if (list && !pages.length) pages = [list];
  var shipped = pages.map(function (p) { return { display: p.style.display, hidden: p.hidden }; });
  var state = { secs: [], kinds: [], from: '', to: '', sort: 'new' };

  if (input && q) input.value = q;
  var shownQ = q || (input && input.value) || 'غزة';
  [].forEach.call(terms, function (el) { el.textContent = '«' + shownQ + '»'; });
  document.title = (q ? 'نتائج البحث عن «' + q + '»' : 'البحث') + ' | وكالة شهاب للأنباء';

  /* each result names its section (data-sh-section) and its kind in the meta
     line («خبر», «تقرير», «تحليل», «قصة») */
  function kindOf(a) {
    var k = (a.querySelector('.sh-se-item__kind') || {}).textContent || '';
    if (/قصة/.test(k)) return 'story';
    if (/تقرير/.test(k)) return 'report';
    if (/تحليل|رأي/.test(k)) return 'analysis';
    return 'news';
  }
  function dateOf(a) {
    var t = a.querySelector('time[datetime]');
    if (t) return new Date(t.getAttribute('datetime')).getTime();
    var s = a.querySelector('time[data-sh-ago]');
    return s ? Date.now() - parseFloat(s.getAttribute('data-sh-ago')) * 60000 : 0;
  }
  items.forEach(function (a) {
    a.setAttribute('data-sh-kind', kindOf(a));
    a._shHome = a.closest('[data-sh-page]') || list;
  });

  /* the query's words, marked in the titles and summaries. The English layer
     swaps whole strings, so the Arabic text is left whole when it is on. */
  if (!EN && shownQ.length > 1) items.forEach(function (a) {
    [].forEach.call(a.querySelectorAll('.sh-se-item__t, .sh-se-item__dek'), function (el) {
      var t = el.textContent, i = t.indexOf(shownQ);
      if (i === -1) return;
      var html = '', from = 0;
      while (i !== -1) {
        html += esc(t.slice(from, i)) + '<mark class="sh-se-hit">' + esc(shownQ) + '</mark>';
        from = i + shownQ.length;
        i = t.indexOf(shownQ, from);
      }
      el.innerHTML = html + esc(t.slice(from));
    });
  });

  /* ---- the section chips: one per section the results name, in the site's order ---- */
  var secBox = bar && bar.querySelector('[data-sh-sf-secs]');
  var counts = {};
  items.forEach(function (a) { var s = (a.getAttribute('data-sh-section') || '').trim(); if (s) counts[s] = (counts[s] || 0) + 1; });
  var secs = ORDER.filter(function (s) { return counts[s]; })
    .concat(Object.keys(counts).filter(function (s) { return ORDER.indexOf(s) === -1; }));
  if (secBox) secs.forEach(function (s) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'sh-sf__chip';
    b.setAttribute('data-sh-sf-sec', s);
    b.setAttribute('aria-pressed', 'false');
    b.innerHTML = esc(s) + ' <b>' + counts[s] + '</b>';
    secBox.appendChild(b);
  });

  /* ---- state <-> url ---- */
  function valid(v) { return /^\d{4}-\d{2}-\d{2}$/.test(v || '') && !isNaN(Date.parse(v)) ? v : ''; }
  function read() {
    state.secs = (params.get('sec') || '').split(',').map(function (s) { return s.trim(); }).filter(function (s) { return secs.indexOf(s) !== -1; });
    state.kinds = (params.get('kind') || '').split(',').filter(function (k) { return KIND[k]; });
    state.from = valid(params.get('from'));
    state.to = valid(params.get('to'));
    fixRange();
    state.sort = params.get('sort') === 'old' ? 'old' : 'new';
  }
  function write() {
    var p = new URLSearchParams(location.search);
    function set(k, v) { if (v) p.set(k, v); else p.delete(k); }
    set('sec', state.secs.join(','));
    set('kind', state.kinds.join(','));
    set('from', state.from);
    set('to', state.to);
    set('sort', state.sort === 'old' ? 'old' : '');
    var qs = p.toString();
    try { history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash); } catch (e) {}
  }
  function fixRange() { if (state.from && state.to && state.from > state.to) { var t = state.from; state.from = state.to; state.to = t; } }
  function active() { return !!(state.secs.length || state.kinds.length || state.from || state.to); }

  /* ---- dates ---- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function dayStart(v) { return new Date(v + 'T00:00:00').getTime(); }
  function dayEnd(v) { return dayStart(v) + DAY - 1; }
  var fmt;
  function niceDay(v) {
    var d = new Date(v + 'T00:00:00');
    if (!fmt) fmt = new Intl.DateTimeFormat(EN ? 'en-GB' : 'ar-EG-u-nu-latn', { day: 'numeric', month: 'long' });
    return fmt.format(d);
  }
  function quickRange(n) {
    var today = new Date(), to = iso(today), from;
    if (n === 'year') from = to.slice(0, 4) + '-01-01';
    else { var d = new Date(); d.setDate(d.getDate() - (parseInt(n, 10) - 1)); from = iso(d); }
    return { from: from, to: to };
  }

  /* ---- filter, sort, count ---- */
  function apply() {
    var on = active(), n = 0;
    var lo = state.from ? dayStart(state.from) : -Infinity, hi = state.to ? dayEnd(state.to) : Infinity;
    items.forEach(function (a) {
      var d = dateOf(a);
      var ok = (!state.secs.length || state.secs.indexOf((a.getAttribute('data-sh-section') || '').trim()) !== -1)
        && (!state.kinds.length || state.kinds.indexOf(a.getAttribute('data-sh-kind')) !== -1)
        && d >= lo && d <= hi;
      a.hidden = !ok;
      if (ok) n++;
    });
    // while a filter is on every batch shows and the pager steps aside;
    // otherwise the batches go back to the way they were shipped
    pages.forEach(function (p, i) {
      if (on) { p.style.display = ''; p.hidden = false; }
      else { p.style.display = shipped[i].display; p.hidden = shipped[i].hidden; }
    });
    if (pagerNav) pagerNav.hidden = on;
    // the order: one list when filtering, each batch on its own otherwise
    var cmp = function (a, b) { return state.sort === 'new' ? dateOf(b) - dateOf(a) : dateOf(a) - dateOf(b); };
    if (on) items.slice().sort(cmp).forEach(function (r) { pages[0].appendChild(r); });
    else pages.forEach(function (page) {
      items.filter(function (r) { return r._shHome === page; }).sort(cmp).forEach(function (r) { page.appendChild(r); });
    });
    if (count) count.textContent = EN
      ? (n === 1 ? '1 result' : n + ' results')
      : (n ? (n === 1 ? 'نتيجة واحدة' : n === 2 ? 'نتيجتان' : n <= 10 ? n + ' نتائج' : n + ' نتيجة') : 'لا نتائج');
    if (empty) empty.hidden = n > 0;
    paint();
  }

  /* ---- the controls mirror the state ---- */
  function paint() {
    if (bar) {
      [].forEach.call(bar.querySelectorAll('[data-sh-sf-sec]'), function (b) { b.setAttribute('aria-pressed', String(state.secs.indexOf(b.getAttribute('data-sh-sf-sec')) !== -1)); });
      var all = bar.querySelector('[data-sh-sf-all]');
      if (all) all.setAttribute('aria-pressed', String(!state.secs.length));
      [].forEach.call(bar.querySelectorAll('[data-sh-sf-kind]'), function (b) { b.setAttribute('aria-pressed', String(state.kinds.indexOf(b.getAttribute('data-sh-sf-kind')) !== -1)); });
      var from = bar.querySelector('[data-sh-sf-from]'), to = bar.querySelector('[data-sh-sf-to]');
      if (from) from.value = state.from;
      if (to) to.value = state.to;
      [].forEach.call(bar.querySelectorAll('[data-sh-sf-quick]'), function (b) {
        var r = quickRange(b.getAttribute('data-sh-sf-quick'));
        b.setAttribute('aria-pressed', String(state.from === r.from && state.to === r.to));
      });
      var badge = bar.querySelector('[data-sh-sf-n]'), facets = state.secs.length + state.kinds.length + (state.from || state.to ? 1 : 0);
      if (badge) { badge.textContent = String(facets); badge.hidden = !facets; }
    }
    var sortBtn = root.querySelector('[data-sh-ssort] strong');
    if (sortBtn) sortBtn.textContent = state.sort === 'new' ? (EN ? 'Newest' : 'الأحدث') : (EN ? 'Oldest' : 'الأقدم');
    var parts = [];
    if (state.secs.length) parts.push((EN ? 'Section: ' : 'القسم: ') + state.secs.join(EN ? ', ' : '، '));
    if (state.kinds.length) parts.push((EN ? 'Type: ' : 'النوع: ') + state.kinds.map(function (k) { return EN ? KIND_EN[k] : KIND[k]; }).join(EN ? ', ' : '، '));
    if (state.from && state.to) parts.push((EN ? 'from ' : 'من ') + niceDay(state.from) + (EN ? ' to ' : ' إلى ') + niceDay(state.to));
    else if (state.from) parts.push((EN ? 'from ' : 'من ') + niceDay(state.from));
    else if (state.to) parts.push((EN ? 'until ' : 'حتى ') + niceDay(state.to));
    var applied = root.querySelector('[data-sh-sf-applied]');
    if (applied) { applied.textContent = parts.join(' · '); applied.hidden = !parts.length; }
    [].forEach.call(root.querySelectorAll('[data-sh-sf-clear]'), function (b) { if (!b.closest('[data-sh-search-empty]')) b.hidden = !active(); });
  }

  /* ---- the controls ---- */
  function toggle(arr, v) { var i = arr.indexOf(v); if (i === -1) arr.push(v); else arr.splice(i, 1); }
  function done() { write(); apply(); }
  function clear() { state.secs = []; state.kinds = []; state.from = ''; state.to = ''; done(); }
  if (bar) {
    bar.addEventListener('click', function (e) {
      var b;
      if ((b = e.target.closest('[data-sh-sf-sec]'))) { toggle(state.secs, b.getAttribute('data-sh-sf-sec')); done(); }
      else if (e.target.closest('[data-sh-sf-all]')) { state.secs = []; done(); }
      else if ((b = e.target.closest('[data-sh-sf-kind]'))) { toggle(state.kinds, b.getAttribute('data-sh-sf-kind')); done(); }
      else if ((b = e.target.closest('[data-sh-sf-quick]'))) {
        var r = quickRange(b.getAttribute('data-sh-sf-quick'));
        if (state.from === r.from && state.to === r.to) { state.from = ''; state.to = ''; }   // pressed again: off
        else { state.from = r.from; state.to = r.to; }
        done();
      }
    });
    ['from', 'to'].forEach(function (k) {
      var el = bar.querySelector('[data-sh-sf-' + k + ']');
      if (el) el.addEventListener('change', function () { state[k] = valid(el.value); fixRange(); done(); });
    });
  }
  // the sort and the clear buttons sit over the results and in the empty state
  root.addEventListener('click', function (e) {
    if (e.target.closest('[data-sh-ssort]')) { state.sort = state.sort === 'new' ? 'old' : 'new'; done(); }
    else if (e.target.closest('[data-sh-sf-clear]')) clear();
  });

  /* the head's form: a real GET that carries the filters along, and Enter on
     an empty field just puts the cursor back */
  var form = root.querySelector('[data-sh-search]');
  if (form) form.addEventListener('submit', function (e) {
    var v = (input && input.value || '').trim();
    if (!v) { e.preventDefault(); if (input) input.focus(); return; }
    var carry = { sec: state.secs.join(','), kind: state.kinds.join(','), from: state.from, to: state.to, sort: state.sort === 'old' ? 'old' : '' };
    Object.keys(carry).forEach(function (k) {
      var h = form.querySelector('input[type="hidden"][name="' + k + '"]');
      if (!carry[k]) { if (h) h.parentNode.removeChild(h); return; }
      if (!h) { h = document.createElement('input'); h.type = 'hidden'; h.name = k; form.appendChild(h); }
      h.value = carry[k];
    });
  });

  /* ---- once the filters no longer stand beside the results they fold under
     one button, and open by themselves when a filter is on ---- */
  var foldBtn = bar && bar.querySelector('[data-sh-sf-toggle]');
  var narrow = window.matchMedia ? window.matchMedia('(max-width: 900px)') : null;
  function fold(open) {
    if (!bar || !foldBtn) return;
    var closed = !open && !!(narrow && narrow.matches);
    bar.toggleAttribute('data-collapsed', closed);
    foldBtn.setAttribute('aria-expanded', String(!closed));
  }
  if (foldBtn) foldBtn.addEventListener('click', function () { fold(bar.hasAttribute('data-collapsed')); });
  if (narrow && narrow.addEventListener) narrow.addEventListener('change', function () { fold(active()); });

  /* the query being read is marked among the most searched */
  [].forEach.call(root.querySelectorAll('[data-sh-trend]'), function (a) {
    if (a.getAttribute('data-sh-trend') === shownQ) a.setAttribute('aria-current', 'true');
  });

  read();
  fold(active());
  apply();
})();
