/* شهاب — الفيديو (video.html): the programme rows.

   Each [data-sh-vrow] is a native horizontal scroller ([data-sh-vrow-track]) with
   two buttons ([data-sh-vrow-prev] / [data-sh-vrow-next]) and a strip of page
   marks ([data-sh-vrow-dots]). A page is as many episodes as the row shows at
   once: the buttons move one page, a mark jumps to its page, and both follow
   the scroller when a finger or a trackpad moves it instead. The row reads the
   way the page does — in Arabic "next" travels left, where scrollLeft runs
   negative — and a reader who asked for less motion gets the jump, not the
   glide. The pictures, the times and the live link need nothing from here.
   (The hooks are data-sh-vrow*, apart from js/app.js's data-sh-car carousel.) */
(function () {
  'use strict';
  var cars = document.querySelectorAll('[data-sh-vrow]');
  if (!cars.length) return;
  var still = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  Array.prototype.forEach.call(cars, function (car) {
    var track = car.querySelector('[data-sh-vrow-track]');
    var prev = car.querySelector('[data-sh-vrow-prev]');
    var next = car.querySelector('[data-sh-vrow-next]');
    var dots = car.querySelector('[data-sh-vrow-dots]');
    if (!track || !track.children.length) return;
    var items = track.children;
    var pages = 0, current = -1, queued = false;

    function forward() { return getComputedStyle(track).direction === 'rtl' ? -1 : 1; }
    // one episode's width and the gap after it, measured rather than assumed
    function slot() {
      var a = items[0].getBoundingClientRect();
      if (items.length < 2) return a.width || 1;
      return Math.abs(items[1].getBoundingClientRect().left - a.left) || a.width || 1;
    }
    function gap() { return parseFloat(getComputedStyle(track).columnGap) || 0; }
    function perView() { return Math.max(1, Math.round((track.clientWidth + gap()) / slot())); }
    function room() { return Math.max(0, track.scrollWidth - track.clientWidth); }
    function at() { return Math.abs(track.scrollLeft); }
    function pageAt() {
      var x = at(), end = room();
      if (end - x <= 2) return pages - 1;
      return Math.min(pages - 1, Math.round(x / (perView() * slot())));
    }
    function go(page) {
      page = Math.max(0, Math.min(pages - 1, page));
      var x = Math.min(page * perView() * slot(), room());
      track.scrollTo({ left: forward() * x, behavior: still && still.matches ? 'auto' : 'smooth' });
    }
    function label(i) {
      return document.documentElement.lang === 'en'
        ? 'Page ' + (i + 1) + ' of ' + pages
        : 'الصفحة ' + (i + 1) + ' من ' + pages;
    }

    function build() {
      var n = Math.max(1, Math.ceil(items.length / perView()));
      if (n === pages) return;
      pages = n;
      current = -1;
      if (!dots) return;
      dots.textContent = '';
      if (pages < 2) return;
      for (var i = 0; i < pages; i++) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'sh-vx-car__dot';
        b.setAttribute('data-sh-vrow-page', String(i));
        b.setAttribute('aria-label', label(i));
        dots.appendChild(b);
      }
    }

    function paint() {
      queued = false;
      var x = at(), end = room();
      if (prev) prev.disabled = x <= 2;
      if (next) next.disabled = end - x <= 2;
      var page = pageAt();
      if (page === current) return;
      current = page;
      if (!dots) return;
      Array.prototype.forEach.call(dots.children, function (d, i) {
        d.setAttribute('aria-current', i === page ? 'true' : 'false');
      });
    }
    function schedule() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(paint);
    }

    if (prev) prev.addEventListener('click', function () { go(pageAt() - 1); });
    if (next) next.addEventListener('click', function () { go(pageAt() + 1); });
    if (dots) dots.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-sh-vrow-page]');
      if (b) go(parseInt(b.getAttribute('data-sh-vrow-page'), 10));
    });
    track.addEventListener('scroll', schedule, { passive: true });

    function refresh() { build(); current = -1; paint(); }
    if (window.ResizeObserver) new ResizeObserver(refresh).observe(track);
    else window.addEventListener('resize', refresh);
    refresh();
  });
})();
