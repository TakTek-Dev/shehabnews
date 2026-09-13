/* شهاب — ShUI: the small shared toolkit every other script leans on.

   Loaded first on every page (before app.js). Nothing here touches the DOM at
   load time; it only exposes window.ShUI:

     ShUI.icon(name[, style][, cls])   -> '<svg class="sh-i …"><use href="…#s-name"></use></svg>'
     ShUI.setIcon(el, name[, style])   swap the glyph of an existing .sh-i svg
     ShUI.esc(text)                    HTML-escape
     ShUI.toast(text[, ms])            one live-region toast for the whole site
     ShUI.relTime(date[, now])         'منذ 12 د' / 'منذ 3 س' / 'أمس' / date
     ShUI.absTime(date)                'الجمعة 5 سبتمبر 2026 · 10:32 م'
     ShUI.paintTimes(root)             fill every <time datetime> under root
     ShUI.prerendering()               true while the page is being prerendered

   The icon sprite is assets/images/icons.svg (built by tools/icons.py);
   ids are s-<name> (solid), r-<name> (regular), b-<name> (brands). */
(function () {
  'use strict';
  var SPRITE = 'assets/images/icons.svg';
  var P = { solid: 's', regular: 'r', brands: 'b' };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function icon(name, style, cls) {
    if (style && !P[style]) { cls = style; style = 'solid'; }
    var id = (P[style || 'solid']) + '-' + name;
    return '<svg class="sh-i' + (cls ? ' ' + esc(cls) : '') + '" aria-hidden="true" focusable="false"><use href="' + SPRITE + '#' + id + '"></use></svg>';
  }

  function setIcon(el, name, style) {
    if (!el) return;
    var use = el.querySelector ? el.querySelector('use') : null;
    if (!use) { el.innerHTML = icon(name, style); return; }
    use.setAttribute('href', SPRITE + '#' + P[style || 'solid'] + '-' + name);
  }

  /* ---- toast: one element, role=status, re-used by every page script ---- */
  var toastEl = null, toastTimer = null;
  function toast(text, ms) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'sh-toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = text;
    toastEl.setAttribute('data-on', '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.removeAttribute('data-on'); }, ms || 1800);
  }

  /* ---- time ---- */
  var LOCALE = 'ar-EG-u-nu-latn';
  var fmtAbs = null, fmtDay = null, fmtRel = null, fmtDate = null;
  function absTime(d) {
    if (!fmtAbs) fmtAbs = new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' });
    return fmtAbs.format(d).replace(/،\s*/g, ' · ').replace(/\s+في\s+/, ' · ');
  }
  function relTime(d, now) {
    now = now || Date.now();
    var diff = Math.round((now - d.getTime()) / 60000);           // minutes
    if (diff < 1) return 'الآن';
    if (diff < 60) return 'منذ ' + diff + ' د';
    var h = Math.round(diff / 60);
    if (h < 24) return 'منذ ' + h + ' س';
    var days = Math.round(h / 24);
    if (days === 1) return 'أمس';
    if (days < 7) return 'منذ ' + days + ' أيام';
    if (!fmtDay) fmtDay = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'long' });
    return fmtDay.format(d);
  }
  function dayDate(d) {   // 31 أغسطس 2026: a date that has to keep its year
    if (!fmtDate) fmtDate = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' });
    return fmtDate.format(d);
  }
  function clock(d) {
    if (!fmtRel) fmtRel = new Intl.DateTimeFormat(LOCALE, { hour: 'numeric', minute: '2-digit' });
    return fmtRel.format(d);
  }
  /* <time datetime="ISO"> gets its text (relative when < 24h), a title with the
     full date, and refreshes every minute. data-sh-ago="N" (minutes) is the
     static build's stand-in for a real timestamp: it synthesises datetime at
     load so the demo never goes stale. data-sh-format="clock" keeps HH:MM;
     data-sh-format="date" writes the day, the month and the year (a library
     whose videos span years must not drop the year). */
  function paintTimes(root) {
    var now = Date.now();
    [].forEach.call((root || document).querySelectorAll('time'), function (t) {
      var ago = t.getAttribute('data-sh-ago');
      if (ago !== null && !t.getAttribute('datetime')) {
        t.setAttribute('datetime', new Date(now - parseFloat(ago) * 60000).toISOString());
      }
      var iso = t.getAttribute('datetime');
      if (!iso) return;
      var d = new Date(iso);
      if (isNaN(d)) return;
      var fmt = t.getAttribute('data-sh-format') || 'rel';
      t.title = absTime(d);
      if (fmt === 'clock') t.textContent = clock(d);
      else if (fmt === 'abs') t.textContent = absTime(d);
      else if (fmt === 'date') t.textContent = dayDate(d);
      else t.textContent = relTime(d, now);
    });
  }

  function prerendering() { return !!document.prerendering; }

  window.ShUI = { icon: icon, setIcon: setIcon, esc: esc, toast: toast, relTime: relTime, absTime: absTime, clock: clock, paintTimes: paintTimes, prerendering: prerendering };
})();
