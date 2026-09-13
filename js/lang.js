/* شهاب — language switch (js/lang.js).

   The choice lives in localStorage['sh-lang'] ('ar' | 'en'). A tiny prelude
   in <head> (written by tools/chrome.py) applies it before paint so the page
   never flashes the other direction:
       html[lang="en"][dir="ltr"]  →  css/ltr.css mirrors every RTL-bound rule.

   This file wires the two buttons in the topbar, and in English mode swaps
   the strings of the shared chrome (header, ticker, footer) through
   data-i18n / data-i18n-placeholder / data-i18n-aria keys. Page content is
   the agency's Arabic demo copy and stays as it is; the production build
   renders English content from the CMS and needs only the same keys.

   Switching reloads the page: Swiper and the players read dir at start, so a
   reload is the honest way to remount them in the other direction. */
(function () {
  'use strict';
  var KEY = 'sh-lang';
  var html = document.documentElement;

  var EN = {
    // topbar
    'lang.rss': 'RSS feed', 'lang.group': 'Language', 'skip': 'Skip to content', 'logo.alt': 'Shehab',
    // masthead
    'live': 'Live',
    'now': 'Now',
    'brief': 'Audio brief',
    'search.ph': 'Search Shehab', 'sx.results': 'results',
    'search.btn': 'Search',
    'logo': 'Shehab — Home',
    // nav
    'nav.home': 'Home', 'nav.palestine': 'Palestine', 'nav.gaza': 'Gaza', 'nav.westbank': 'West Bank', 'nav.jerusalem': 'Jerusalem',
    'nav.prisoners': 'Prisoners', 'nav.inside': '48 Palestinians', 'nav.statements': 'Exclusive statements', 'nav.reports': 'Special reports',
    'nav.arab': 'Arab', 'nav.world': 'World', 'nav.israeli': 'Israeli', 'nav.translations': 'Translations', 'nav.shlomo': 'Shlomo News',
    'nav.sport': 'Sport', 'nav.opinion': 'Opinion', 'nav.media': 'Media', 'nav.video': 'Video', 'nav.livestream': 'Live stream',
    'nav.reels': 'Shehab Reels', 'nav.shorts': 'Shorts', 'nav.photos': 'Photos', 'nav.infographics': 'Infographics', 'nav.files': 'Shehab Files',
    'nav.data': 'Data', 'nav.datadesk': 'Data desk', 'nav.map': 'Violations map', 'nav.coverage': 'Live coverage', 'nav.agency': 'The agency',
    'nav.about': 'About us', 'nav.sections': 'Sections', 'nav.authors': 'Writers', 'nav.archive': 'Archive', 'nav.newsletter': 'Newsletter',
    'nav.saved': 'Saved', 'nav.contact': 'Contact us', 'nav.more': 'More', 'nav.search': 'Search', 'nav.tag': 'Tag page', 'nav.watch': 'Watch a video',
    'nav.privacy': 'Privacy policy', 'nav.terms': 'Terms of use', 'nav.states': 'Site states', 'nav.404': 'Page not found', 'nav.offline': 'Offline',
    'nav.systemstates': 'System states', 'nav.menu': 'Sections',
    // ticker
    'ticker.tag': 'Breaking', 'brief.len': '3 min', 'ticker.prev': 'Previous', 'ticker.pause': 'Pause', 'ticker.next': 'Next', 'ticker.close': 'Close',
    // footer
    'foot.tagline': 'A Palestinian news agency working around the clock to bring the picture from the Palestinian, Arab and international scenes.',
    'foot.play': 'Shehab on Google Play', 'foot.install': 'Install Shehab on your device',
    'foot.sections': 'Sections', 'foot.content': 'Content', 'foot.agency': 'The agency', 'foot.newsletter': 'Newsletter',
    'foot.coverages': 'Live coverages', 'foot.editorial': 'Editorial policy', 'foot.team': 'Editorial team', 'foot.rss': 'RSS',
    'foot.nl.text': 'The latest news and the top files in your inbox every morning.', 'foot.nl.ph': 'Your email', 'foot.nl.btn': 'Subscribe',
    'foot.telegram': 'Telegram channel', 'foot.whatsapp': 'WhatsApp channel', 'foot.push': 'Breaking alerts', 'foot.always': 'Continuous coverage around the clock',
    'foot.copy': 'Shehab News Agency © ', 'foot.rights': ' — All rights reserved', 'foot.english': 'عربي',
    'foot.facebook': 'Facebook', 'foot.x': 'X', 'foot.instagram': 'Instagram', 'foot.youtube': 'YouTube', 'foot.tiktok': 'TikTok',
    'foot.tg': 'Telegram', 'foot.wa': 'WhatsApp',
    'dock.live': 'Live', 'dock.onair': 'On air now', 'dock.title': 'Shehab Live — from Gaza', 'dock.watching': ' watching · ', 'dock.watch': 'Watch',
    'dock.aria': 'Live stream now', 'totop': 'Back to top',
    'consent.title': 'Privacy on Shehab',
    'consent.text': 'We use the cookies the site needs to run, and optional ones for statistics and advertising. You can change your choice any time from the',
    'consent.link': 'privacy policy', 'consent.essential': 'Essential only', 'consent.all': 'Accept all'
  };


  /* ---- page content -------------------------------------------------------
     The chrome translates by key. Everything else translates by its own Arabic
     text: js/i18n-en.js maps each string the site shows to its English twin, so
     no page markup carries translation attributes and the reference pages stay
     byte-identical. Strings the dictionary does not know are left in Arabic. */
  var DICT = null, busy = false;
  var ATTRS = ['alt', 'title', 'aria-label', 'placeholder'];
  var SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, CODE: 1 };
  // the switch says عربي / EN in both languages: never translate its own labels
  function switchLabel(n) { return !!(n && n.closest && n.closest('[data-sh-lang]')); }

  /* Composed strings: the scripts glue words to numbers, so the whole string is
     never a dictionary key. Split it on the separators the site uses, translate
     each piece, and accept the result only when every Arabic piece was known —
     an ordinary sentence keeps one unknown word and is left in Arabic. */
  var ARABIC = /[\u0600-\u06FF]/;
  var SEP = /(\s*[·—|،,]\s*|\s+[-]\s+|\s*\/\s*|:\s+)/;

  function look(k) {
    if (!k) return null;
    var v = DICT[k];
    if (v != null) return v;
    v = DICT[k.replace(/^[\s·—|،,\-]+|[\s·—|،,\-]+$/g, '')];
    return v == null ? null : v;
  }

  function piece(s) {
    // "منذ 9 د" / "تحديث 11:30" / "الرطوبة 24%" — words around numbers
    var v = look(s);
    if (v != null) return v;
    if (!ARABIC.test(s)) return s;
    if (s.length > 90) return null;
    var ok = true, ar = 0;
    var out = s.replace(/[\u0600-\u06FF]+(?:[ \u00a0][\u0600-\u06FF]+)*/g, function (w) {
      ar++;
      var t = look(w);
      if (t != null) return t;
      var words = w.split(/[ \u00a0]+/);
      if (words.length > 1 && words.length <= 4) {   // "الطقس في القدس"
        var parts = [], good = true;
        for (var i = 0; i < words.length; i++) {
          var x = look(words[i]);
          if (x == null) { good = false; break; }
          parts.push(x);
        }
        if (good) return parts.join(' ');
      }
      ok = false;
      return w;
    });
    return ok && ar ? out.replace(/\u060c/g, ',') : null;
  }

  var AGO = { '\u062f': 'min', '\u062f\u0642\u064a\u0642\u0629': 'minute', '\u062f\u0642\u0627\u0626\u0642': 'minutes',
              '\u0633': 'h', '\u0633\u0627\u0639\u0629': 'hour', '\u0633\u0627\u0639\u0627\u062a': 'hours',
              '\u064a\u0648\u0645': 'day', '\u0623\u064a\u0627\u0645': 'days', '\u0623\u0633\u0628\u0648\u0639': 'week',
              '\u0623\u0633\u0627\u0628\u064a\u0639': 'weeks', '\u0634\u0647\u0631': 'month', '\u0634\u0647\u0648\u0631': 'months',
              '\u0633\u0646\u0629': 'year', '\u0633\u0646\u0648\u0627\u062a': 'years' };

  function composed(s) {
    var v = look(s);
    if (v != null) return v;
    // "منذ 9 د" -> "9 min ago": English puts the number and the unit first
    var ago = s.match(/^\u0645\u0646\u0630\s+(\d+)\s*([\u0600-\u06FF]+)$/);
    if (ago && AGO[ago[2]]) return ago[1] + ' ' + AGO[ago[2]] + ' ago';
    // 11:35 ص / 10:06 م -> am / pm, before the words are looked up
    s = s.replace(/(\d{1,2}:\d{2})\s*ص(?![؀-ۿ])/g, '$1 am')
         .replace(/(\d{1,2}:\d{2})\s*م(?![؀-ۿ])/g, '$1 pm');
    v = look(s);
    if (v != null) return v;
    if (s.length > 160) return null;
    // "<label><sep><the rest>": translate the label, then the rest as a whole
    var lead = /^([^:·—|]{1,40})(:\s+|\s*[·—|]\s*)([\s\S]+)$/.exec(s);
    if (lead) {
      var head = look(lead[1]);
      if (head != null) {
        var rest = composed(lead[3]);
        if (rest != null) {
          return lead[1].match(/^\s*/)[0] + head + lead[1].match(/\s*$/)[0] + lead[2] + rest;
        }
      }
    }
    var parts = s.split(SEP);
    if (parts.length < 2) return piece(s);
    var out = '', hit = false;
    for (var i = 0; i < parts.length; i++) {
      if (i % 2) { out += parts[i]; continue; }        // the separator itself
      var p = parts[i].trim();
      if (!p) { out += parts[i]; continue; }
      var t = piece(p);
      if (t == null) return null;
      if (t !== p) hit = true;
      out += parts[i].replace(p, t);
    }
    return hit ? out.replace(/،/g, ',') : null;
  }

  function tr(s) {
    if (!DICT || !s) return null;
    var k = s.replace(/\s+/g, ' ').trim();
    if (!k || k.length > 1200) return null;
    var v = composed(k);
    if (v == null || v === k) return null;
    return s.match(/^\s*/)[0] + v + s.match(/\s*$/)[0];
  }

  function walk(root) {
    if (!DICT || !root) return;
    busy = true;
    try {
      if (root.nodeType === 3) {
        if (switchLabel(root.parentNode)) return;
        var t = tr(root.nodeValue); if (t != null) root.nodeValue = t;
      }
      else if (root.nodeType === 1) {
        var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
          acceptNode: function (n) {
            return SKIP[n.parentNode && n.parentNode.nodeName] || switchLabel(n.parentNode)
              ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
          }
        });
        var n, hits = [];
        while ((n = w.nextNode())) hits.push(n);
        for (var i = 0; i < hits.length; i++) { var v = tr(hits[i].nodeValue); if (v != null) hits[i].nodeValue = v; }
        var els = root.querySelectorAll('[alt],[title],[aria-label],[placeholder]');
        var all = root.matches && root.matches('[alt],[title],[aria-label],[placeholder]') ? [root].concat([].slice.call(els)) : els;
        for (var j = 0; j < all.length; j++) {
          for (var a = 0; a < ATTRS.length; a++) {
            var cur = all[j].getAttribute(ATTRS[a]);
            if (cur) { var e = tr(cur); if (e != null) all[j].setAttribute(ATTRS[a], e); }
          }
        }
      }
    } finally { busy = false; }
  }

  function watch() {
    if (!window.MutationObserver) return;
    new MutationObserver(function (recs) {
      if (busy || !DICT) return;
      for (var i = 0; i < recs.length; i++) {
        var r = recs[i];
        if (r.type === 'characterData') walk(r.target);
        else if (r.type === 'attributes') {
          // the clock, the weather and the rates write their labels after load
          var cur = r.target.getAttribute(r.attributeName);
          if (cur) { var e = tr(cur); if (e != null) { busy = true; r.target.setAttribute(r.attributeName, e); busy = false; } }
        } else for (var j = 0; j < r.addedNodes.length; j++) walk(r.addedNodes[j]);
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true,
                                attributes: true, attributeFilter: ATTRS });
  }

  function current() {
    try { return localStorage.getItem(KEY) === 'en' ? 'en' : 'ar'; } catch (e) { return 'ar'; }
  }

  function firstText(el) {
    for (var i = 0; i < el.childNodes.length; i++) {
      var n = el.childNodes[i];
      if (n.nodeType === 3 && n.nodeValue.trim()) return n;
    }
    return null;
  }

  function apply(lang) {
    var en = lang === 'en';
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      var t = firstText(el);
      if (!t) return;
      if (!el.hasAttribute('data-ar')) el.setAttribute('data-ar', t.nodeValue);
      var v = en ? EN[key] : el.getAttribute('data-ar');
      if (v != null) t.nodeValue = v;
    });
    ['placeholder', 'aria-label', 'title', 'alt'].forEach(function (attr) {
      var dataName = 'data-i18n-' + (attr === 'aria-label' ? 'aria' : attr);
      document.querySelectorAll('[' + dataName + ']').forEach(function (el) {
        var key = el.getAttribute(dataName);
        var cache = 'data-ar-' + (attr === 'aria-label' ? 'aria' : attr);
        if (!el.hasAttribute(cache)) el.setAttribute(cache, el.getAttribute(attr) || '');
        var v = en ? EN[key] : el.getAttribute(cache);
        if (v != null) el.setAttribute(attr, v);
      });
    });
    document.querySelectorAll('[data-sh-lang]').forEach(function (b) {
      var on = b.getAttribute('data-sh-lang') === lang;
      b.classList.toggle('sh-lang__opt--on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function set(lang) {
    try { localStorage.setItem(KEY, lang); } catch (e) {}
    html.lang = lang;
    html.dir = lang === 'en' ? 'ltr' : 'rtl';
    location.reload();
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-sh-lang]');
    if (!b) return;
    e.preventDefault();
    var lang = b.getAttribute('data-sh-lang');
    if (lang !== current()) set(lang);
  });

  /* the tab, and the title a shared link carries */
  function title() {
    var t = tr(document.title);
    if (t != null) document.title = t;
    document.querySelectorAll('meta[property="og:title"], meta[name="twitter:title"], meta[property="og:description"], meta[name="description"]').forEach(function (m) {
      var v = tr(m.getAttribute('content') || '');
      if (v != null) m.setAttribute('content', v);
    });
    // the search page rewrites its own title after load
    var el = document.querySelector('title');
    if (el && window.MutationObserver && !el.__shWatched) {
      el.__shWatched = true;
      new MutationObserver(function () {
        if (busy) return;
        var t2 = tr(document.title);
        if (t2 != null && t2 !== document.title) { busy = true; document.title = t2; busy = false; }
      }).observe(el, { childList: true, characterData: true, subtree: true });
    }
  }

  function start() {
    var lang = current();
    apply(lang);
    if (lang === 'en') {
      DICT = window.SH_I18N_EN || null;
      walk(document.body);
      title();
      watch();
    }
    document.documentElement.removeAttribute('data-i18n-wait');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

  window.ShLang = { get: current, set: set, apply: apply, EN: EN, walk: walk, dict: function () { return DICT; } };
})();
