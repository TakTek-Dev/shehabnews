/* شهاب — ودجت الطقس وشريط العملات.

   مكوّنان مستقلّان بلا مكتبات، بيشتغلوا على أي عنصر في أي صفحة:

     <span data-sh-weather data-sh-city="jerusalem" data-sh-cities="jerusalem,gaza,ramallah"></span>
     <span data-sh-fx data-sh-pairs="USD:ILS,EUR:ILS,JOD:ILS,USD:EGP,XAU:USD"></span>

   الشكل: data-sh-variant="chip" (الافتراضي للطقس: أيقونة ودرجة، والضغط بيفتح
   لوحة بالتفاصيل و3 أيام وتبديل المدينة) أو "card" (بطاقة كاملة للأعمدة
   الجانبية). للعملات: "ticker" (شريط متحرّك — في RTL بيتحرّك لليمين، بيقف
   عند التحويم، وبيبقى ثابتًا قابلًا للتمرير مع prefers-reduced-motion) أو
   "card" (صفوف).

   المصادر (مجانية، بلا مفتاح، CORS مفتوح — اتأكدنا منها):
     الطقس   Open-Meteo (current + daily)، كاش 30 دقيقة لكل مدينة.
     العملات fawazahmed0/currency-api على jsdelivr (يومي، فيه الذهب XAU) —
             اليوم + أقرب يوم سابق عشان نسبة التغيّر، ثم open.er-api.com
             كبديل (بلا تغيّر)، ثم Frankfurter (أزواج رئيسية فقط). كاش 6 ساعات.
   الكاش في localStorage، والعرض stale-while-revalidate: نرسم المخزّن فورًا
   ونحدّث في الخلفية. لو كل المصادر وقعت والكاش فاضي الودجت بيتخفى بدل ما يبان
   مكسور. الأرقام لاتينية جدولية LTR زي باقي الثيم. */
(function () {
  'use strict';

  var WX_TTL = 30 * 60e3, FX_TTL = 6 * 3600e3, TIMEOUT = 8000;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var CITIES = {
    jerusalem: { name: 'القدس', lat: 31.7683, lon: 35.2137 },
    gaza: { name: 'غزة', lat: 31.5017, lon: 34.4668 },
    ramallah: { name: 'رام الله', lat: 31.9038, lon: 35.2034 },
    hebron: { name: 'الخليل', lat: 31.5326, lon: 35.0998 },
    nablus: { name: 'نابلس', lat: 32.2211, lon: 35.2544 },
    haifa: { name: 'حيفا', lat: 32.7940, lon: 34.9896 }
  };
  var CUR = {
    USD: 'دولار', EUR: 'يورو', ILS: 'شيكل', JOD: 'دينار أردني', EGP: 'جنيه مصري', GBP: 'إسترليني',
    SAR: 'ريال سعودي', AED: 'درهم إماراتي', TRY: 'ليرة تركية', KWD: 'دينار كويتي', QAR: 'ريال قطري',
    XAU: 'أونصة الذهب', XAG: 'أونصة الفضة'
  };
  /* رموز WMO → وصف وأيقونة (نهار/ليل) */
  function wmo(code, day) {
    var c = +code, t, d, n;
    if (c === 0) { t = 'صافٍ'; d = 'fa-sun'; n = 'fa-moon'; }
    else if (c === 1) { t = 'صافٍ غالبًا'; d = 'fa-sun'; n = 'fa-moon'; }
    else if (c === 2) { t = 'غائم جزئيًا'; d = 'fa-cloud-sun'; n = 'fa-cloud-moon'; }
    else if (c === 3) { t = 'غائم'; d = n = 'fa-cloud'; }
    else if (c === 45 || c === 48) { t = 'ضباب'; d = n = 'fa-smog'; }
    else if (c >= 51 && c <= 57) { t = 'رذاذ'; d = n = 'fa-cloud-rain'; }
    else if (c >= 61 && c <= 67) { t = 'مطر'; d = n = 'fa-cloud-showers-heavy'; }
    else if (c >= 71 && c <= 77) { t = 'ثلج'; d = n = 'fa-snowflake'; }
    else if (c >= 80 && c <= 82) { t = 'زخات مطر'; d = 'fa-cloud-sun-rain'; n = 'fa-cloud-moon-rain'; }
    else if (c === 85 || c === 86) { t = 'زخات ثلج'; d = n = 'fa-snowflake'; }
    else if (c >= 95) { t = 'عاصفة رعدية'; d = n = 'fa-cloud-bolt'; }
    else { t = 'غائم'; d = n = 'fa-cloud'; }
    return { text: t, icon: (day === false ? n : d).slice(3) };
  }

  /* ------------------------------------------------------------- helpers */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k)); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  function getJSON(url) {
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = ctrl && setTimeout(function () { ctrl.abort(); }, TIMEOUT);
    return fetch(url, { signal: ctrl && ctrl.signal, cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).finally(function () { if (timer) clearTimeout(timer); });
  }
  /* الكاش أولًا (ولو قديم نعرضه ونجدّد)، والشبكة بعدين؛ onData بتتنادى مرة أو مرتين */
  function cached(key, ttl, loader, onData, onFail) {
    var c = store(key);
    if (c && c.data) onData(c.data, true);
    if (c && Date.now() - c.t < ttl) return;
    loader().then(function (d) { store(key, { t: Date.now(), data: d }); onData(d, false); })
      .catch(function (e) { if (!(c && c.data)) onFail(e); });
  }
  var nf = {};
  function num(v, digits) {
    var k = String(digits);
    if (!nf[k]) nf[k] = new Intl.NumberFormat('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
    return nf[k].format(v);
  }
  function hhmm(iso) { var d = new Date(iso); return isNaN(d) ? '' : (d.getHours() < 10 ? '0' : '') + d.getHours() + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes(); }
  function dayName(iso, i) {
    if (i === 0) return 'اليوم';
    if (i === 1) return 'غدًا';
    try { return new Intl.DateTimeFormat('ar', { weekday: 'long' }).format(new Date(iso + 'T12:00:00')); } catch (e) { return iso; }
  }

  /* ============================================================== weather */
  function wxLoad(city) {
    var c = CITIES[city];
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + c.lat + '&longitude=' + c.lon +
      '&current=temperature_2m,weather_code,is_day,wind_speed_10m,relative_humidity_2m' +
      '&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=Asia%2FJerusalem&forecast_days=3';
    return getJSON(url).then(function (j) {
      var cur = j.current, dl = j.daily;
      return {
        temp: Math.round(cur.temperature_2m), code: cur.weather_code, day: cur.is_day !== 0,
        hum: cur.relative_humidity_2m, wind: Math.round(cur.wind_speed_10m), at: cur.time,
        days: dl.time.map(function (t, i) { return { date: t, max: Math.round(dl.temperature_2m_max[i]), min: Math.round(dl.temperature_2m_min[i]), code: dl.weather_code[i] }; })
      };
    });
  }

  function weather(el) {
    var variant = el.getAttribute('data-sh-variant') || 'chip';
    var cities = (el.getAttribute('data-sh-cities') || 'jerusalem,gaza,ramallah').split(',').map(function (s) { return s.trim(); }).filter(function (k) { return CITIES[k]; });
    var city = store('sh-wx-city') || el.getAttribute('data-sh-city') || cities[0] || 'jerusalem';
    if (!CITIES[city]) city = cities[0] || 'jerusalem';
    if (cities.indexOf(city) < 0) cities.unshift(city);
    el.classList.add('sh-wx', 'sh-wx--' + variant);
    el.setAttribute('data-sh-state', 'loading');

    var open = false, data = null;

    function tabs() {
      return '<div class="sh-wx__tabs" role="tablist">' + cities.map(function (k) {
        return '<button type="button" class="sh-wx__tab" data-city="' + k + '" aria-pressed="' + (k === city) + '">' + esc(CITIES[k].name) + '</button>';
      }).join('') + '</div>';
    }
    function body(d) {
      var now = wmo(d.code, d.day);
      return '<div class="sh-wx__now">' + ShUI.icon(now.icon) + '' +
        '<b class="sh-wx__big">' + d.temp + '°</b>' +
        '<span class="sh-wx__desc">' + esc(now.text) + '<small>الرطوبة ' + d.hum + '% · الرياح ' + d.wind + ' كم/س</small></span></div>' +
        '<div class="sh-wx__days">' + d.days.map(function (x, i) {
          var w = wmo(x.code, true);
          return '<span class="sh-wx__day"><b>' + esc(dayName(x.date, i)) + '</b><span class="sh-wx__ico" title="' + esc(w.text) + '">' + ShUI.icon(w.icon) + '</span><span>' + x.max + '° <em>/ ' + x.min + '°</em></span></span>';
        }).join('') + '</div>' +
        '<div class="sh-wx__foot"><span>Open-Meteo</span><span>تحديث ' + hhmm(d.at) + '</span></div>';
    }
    function render(d) {
      data = d;
      var now = wmo(d.code, d.day), name = CITIES[city].name;
      el.setAttribute('data-sh-state', 'ready');
      if (variant === 'card') {
        el.innerHTML = '<div class="sh-wx__head"><span class="sh-wx__title">' + ShUI.icon('location-dot', 'solid') + 'الطقس في ' + esc(name) + '</span></div>' + tabs() + body(d);
        return;
      }
      var label = name + ' — ' + now.text + '، ' + d.temp + ' درجة';
      el.innerHTML = '<button type="button" class="sh-wx__btn" aria-haspopup="dialog" aria-expanded="' + open + '" aria-label="الطقس: ' + esc(label) + '" title="' + esc(label) + '">' +
        ShUI.icon(now.icon) + '<b class="sh-wx__t">' + d.temp + '°</b>' +
        (el.hasAttribute('data-sh-show-city') ? '<span class="sh-wx__city">' + esc(name) + '</span>' : '') + '</button>' +
        '<div class="sh-wx__pop" role="dialog" aria-label="الطقس في ' + esc(name) + '"' + (open ? '' : ' hidden') + '>' +
        '<div class="sh-wx__pophead"><span class="sh-wx__title">' + ShUI.icon('location-dot', 'solid') + '' + esc(name) + '</span><button type="button" class="sh-wx__close" aria-label="إغلاق">' + ShUI.icon('xmark', 'solid') + '</button></div>' +
        tabs() + body(d) + '</div>';
    }
    function load() {
      cached('sh-wx-' + city, WX_TTL, function () { return wxLoad(city); }, render, function () {
        if (!data) { el.setAttribute('data-sh-state', 'error'); el.hidden = true; }
      });
    }
    function setOpen(v) {
      open = v;
      var pop = el.querySelector('.sh-wx__pop'), btn = el.querySelector('.sh-wx__btn');
      if (pop) {
        pop.hidden = !v;
        // on narrow screens the panel is position:fixed under the chip
        var narrow = window.matchMedia && window.matchMedia('(max-width: 900px)').matches;
        pop.style.top = v && narrow && btn ? Math.round(btn.getBoundingClientRect().bottom + 8) + 'px' : '';
        // the notch points at the chip wherever the sheet ends up (RTL: measured from the right edge)
        if (v && btn) {
          var br = btn.getBoundingClientRect(), pr = pop.getBoundingClientRect();
          pop.style.setProperty('--sh-wx-notch', Math.max(12, Math.min(pr.width - 24, Math.round(pr.right - (br.left + br.width / 2) - 6))) + 'px');
        }
      }
      if (btn) btn.setAttribute('aria-expanded', String(v));
      el.toggleAttribute('data-open', v);
      // the topbar sits under the masthead's stacking context; lift it while open
      var bar = el.closest('.sh-topbar');
      if (bar) bar.toggleAttribute('data-wx-open', v);
    }
    el.addEventListener('click', function (e) {
      var tab = e.target.closest('.sh-wx__tab');
      if (tab) { city = tab.getAttribute('data-city'); store('sh-wx-city', city); el.hidden = false; load(); return; }
      if (e.target.closest('.sh-wx__close')) { setOpen(false); return; }
      if (e.target.closest('.sh-wx__btn')) { setOpen(!open); }
    });
    document.addEventListener('click', function (e) { if (open && !el.contains(e.target)) setOpen(false); });
    document.addEventListener('keydown', function (e) { if (open && e.key === 'Escape') { setOpen(false); var b = el.querySelector('.sh-wx__btn'); if (b) b.focus(); } });

    el.innerHTML = variant === 'card' ? '<span class="sh-wx__skel"></span>' : '<span class="sh-wx__btn sh-wx__btn--skel" aria-hidden="true">' + ShUI.icon('cloud') + '<b class="sh-wx__t">··</b></span>';
    load();
    setInterval(load, WX_TTL);
  }

  /* ============================================================ currencies */
  /* كل الأسعار بالنسبة للدولار: rates[X] = كم X مقابل دولار واحد */
  function fxFawaz(date) {
    return getJSON('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@' + date + '/v1/currencies/usd.min.json').then(function (j) {
      var out = {}, u = j.usd;
      for (var k in u) out[k.toUpperCase()] = u[k];
      out.USD = 1;
      return { date: j.date, rates: out };
    });
  }
  function fxLoad() {
    return fxFawaz('latest').then(function (today) {
      // أقرب يوم سابق متاح لنسبة التغيّر (بيتخطّى يوم ناقص لو حصل)
      var tries = [1, 2, 3].map(function (n) { var d = new Date(today.date + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); });
      function prev(i) {
        if (i >= tries.length) return Promise.resolve(null);
        return fxFawaz(tries[i]).catch(function () { return prev(i + 1); });
      }
      return prev(0).then(function (p) { return { date: today.date, rates: today.rates, prev: p && p.rates, source: 'currency-api' }; });
    }).catch(function () {
      return getJSON('https://open.er-api.com/v6/latest/USD').then(function (j) {
        if (j.result !== 'success') throw new Error('er-api');
        return { date: (j.time_last_update_utc || '').slice(5, 16), rates: j.rates, prev: null, source: 'exchangerate-api' };
      });
    }).catch(function () {
      return getJSON('https://api.frankfurter.dev/v1/latest?base=USD').then(function (j) {
        var r = j.rates; r.USD = 1;
        return { date: j.date, rates: r, prev: null, source: 'ECB' };
      });
    });
  }
  function pairRate(rates, base, quote) {
    if (!rates || rates[base] == null || rates[quote] == null) return null;
    return rates[quote] / rates[base];
  }
  function digits(v) { return v >= 1000 ? 0 : v >= 100 ? 1 : v >= 10 ? 2 : 3; }
  function pairLabel(base, quote) {
    if (base === 'XAU' || base === 'XAG') return CUR[base] + ' ($)';
    return (CUR[base] || base) + ' / ' + (CUR[quote] || quote);
  }

  function fx(el) {
    var variant = el.getAttribute('data-sh-variant') || 'chip';
    var pairs = (el.getAttribute('data-sh-pairs') || 'USD:ILS,EUR:ILS,JOD:ILS,USD:EGP,GBP:ILS,SAR:ILS,XAU:USD').split(',')
      .map(function (s) { var p = s.trim().toUpperCase().split(':'); return p.length === 2 ? p : null; }).filter(Boolean);
    if (!pairs.length) { el.hidden = true; return; }
    var keys = pairs.map(function (p) { return p.join(':'); });
    // the pair the chip shows: the reader's last choice, else the first one listed
    var lead = store('sh-fx-lead');
    if (keys.indexOf(lead) < 0) lead = keys[0];
    el.classList.add('sh-fx', 'sh-fx--' + variant);
    el.setAttribute('data-sh-state', 'loading');

    var open = false, data = null;

    function quote(p, d) {
      var v = pairRate(d.rates, p[0], p[1]);
      if (v == null) return null;
      var pv = d.prev ? pairRate(d.prev, p[0], p[1]) : null;
      var chg = pv ? (v - pv) / pv * 100 : null;
      var dir = chg == null ? 'flat' : Math.abs(chg) < 0.005 ? 'flat' : chg > 0 ? 'up' : 'down';
      return { key: p.join(':'), code: p[0] === 'XAU' || p[0] === 'XAG' ? p[0] + '/USD' : p[0] + '/' + p[1],
               name: pairLabel(p[0], p[1]), v: v, text: num(v, digits(v)), chg: chg, dir: dir };
    }
    function chgHtml(q, withWord) {
      if (q.chg == null) return '';
      var body = q.dir === 'flat' ? ShUI.icon('minus', 'solid') : ShUI.icon('caret-' + q.dir) + num(Math.abs(q.chg), 2) + '%';
      return '<span class="sh-fx__chg sh-fx__chg--' + q.dir + '" title="التغيّر عن اليوم السابق">' + body + '</span>' +
        (withWord && q.dir !== 'flat' ? '<span class="sh-fx__since">عن أمس</span>' : '');
    }
    function chgWords(q) {
      if (q.chg == null || q.dir === 'flat') return '';
      return ' · ' + (q.dir === 'up' ? 'ارتفع عن أمس' : 'انخفض عن أمس') + ' · ' + num(Math.abs(q.chg), 2) + '%';
    }
    function rows(qs) {
      return '<div class="sh-fx__rows" role="group" aria-label="كل الأزواج">' + qs.map(function (q) {
        return '<button type="button" class="sh-fx__row" data-pair="' + q.key + '" aria-pressed="' + (q.key === lead) + '" title="اعرض في الشريط العلوي">' +
          '<span class="sh-fx__name">' + esc(q.name) + '<small>' + esc(q.code) + '</small></span>' +
          '<b class="sh-fx__val">' + q.text + '</b>' + chgHtml(q, false) + '</button>';
      }).join('') + '</div>';
    }
    function foot(d) {
      return '<div class="sh-fx__foot"><span>المصدر: ' + esc(d.source) + '</span><span>تحديث ' + esc(d.date) + '</span></div>';
    }
    function render(d) {
      data = d;
      var qs = pairs.map(function (p) { return quote(p, d); }).filter(Boolean);
      if (!qs.length) { el.hidden = true; return; }
      var top = qs.filter(function (q) { return q.key === lead; })[0] || qs[0];
      lead = top.key;
      el.hidden = false;
      el.setAttribute('data-sh-state', 'ready');
      if (variant === 'card') {
        el.innerHTML = '<div class="sh-fx__head"><span class="sh-fx__title">' + ShUI.icon('coins', 'solid') + 'أسعار العملات</span></div>' +
          '<div class="sh-fx__list">' + qs.map(function (q) {
            return '<span class="sh-fx__item"><span class="sh-fx__pair">' + esc(q.name) + '</span><b class="sh-fx__val">' + q.text + '</b>' + chgHtml(q, false) + '</span>';
          }).join('') + '</div>' + foot(d);
        return;
      }
      var label = 'أسعار العملات · ' + top.name + ' · ' + top.text + chgWords(top);
      el.innerHTML = '<button type="button" class="sh-fx__btn" aria-haspopup="dialog" aria-expanded="' + open + '" aria-label="' + esc(label) + '" title="' + esc(label) + '">' +
        ShUI.icon('coins', 'solid') + '<span class="sh-fx__code">' + esc(top.code) + '</span><b class="sh-fx__t">' + top.text + '</b>' +
        (top.chg != null && top.dir !== 'flat' ? '<span class="sh-fx__tick sh-fx__tick--' + top.dir + '">' + ShUI.icon('caret-' + top.dir) + '</span>' : '') + '</button>' +
        '<div class="sh-fx__pop" role="dialog" aria-label="أسعار العملات"' + (open ? '' : ' hidden') + '>' +
        '<div class="sh-fx__pophead"><span class="sh-fx__title">' + ShUI.icon('coins', 'solid') + 'أسعار العملات</span><button type="button" class="sh-fx__close" aria-label="إغلاق">' + ShUI.icon('xmark', 'solid') + '</button></div>' +
        '<div class="sh-fx__lead"><b class="sh-fx__big">' + top.text + '</b><span class="sh-fx__leadname">' + esc(top.name) + '<small>' + esc(top.code) + '</small></span><span class="sh-fx__leadchg">' + chgHtml(top, true) + '</span></div>' +
        rows(qs) + foot(d) + '</div>';
    }
    function load(quiet) {
      cached('sh-fx', FX_TTL, fxLoad, render, function () {
        if (!data && !quiet) { el.setAttribute('data-sh-state', 'error'); el.hidden = true; }
      });
    }
    function setOpen(v) {
      open = v;
      var pop = el.querySelector('.sh-fx__pop'), btn = el.querySelector('.sh-fx__btn');
      if (pop) {
        pop.hidden = !v;
        // on narrow screens the sheet is position:fixed under the chip
        var narrow = window.matchMedia && window.matchMedia('(max-width: 900px)').matches;
        pop.style.top = v && narrow && btn ? Math.round(btn.getBoundingClientRect().bottom + 8) + 'px' : '';
        // the notch points at the chip wherever the sheet ends up (RTL: measured from the right edge)
        if (v && btn) {
          var br = btn.getBoundingClientRect(), pr = pop.getBoundingClientRect();
          pop.style.setProperty('--sh-fx-notch', Math.max(12, Math.min(pr.width - 24, Math.round(pr.right - (br.left + br.width / 2) - 6))) + 'px');
        }
      }
      if (btn) btn.setAttribute('aria-expanded', String(v));
      el.toggleAttribute('data-open', v);
      // the topbar sits under the masthead's stacking context; lift it while open
      var bar = el.closest('.sh-topbar');
      if (bar) bar.toggleAttribute('data-fx-open', v);
    }
    el.addEventListener('click', function (e) {
      var row = e.target.closest('.sh-fx__row');
      if (row) {
        // the chosen pair moves to the chip and is remembered; the sheet stays open.
        // render() rebuilds the sheet, which detaches this click's target, and the
        // document listener would then read it as a click outside -- so stop it here
        e.stopPropagation();
        lead = row.getAttribute('data-pair'); store('sh-fx-lead', lead);
        if (data) { render(data); setOpen(true); var again = el.querySelector('.sh-fx__row[aria-pressed="true"]'); if (again) again.focus(); }
        return;
      }
      if (e.target.closest('.sh-fx__close')) { setOpen(false); var b = el.querySelector('.sh-fx__btn'); if (b) b.focus(); return; }
      if (e.target.closest('.sh-fx__btn')) { setOpen(!open); }
    });
    document.addEventListener('click', function (e) { if (open && !el.contains(e.target)) setOpen(false); });
    document.addEventListener('keydown', function (e) { if (open && e.key === 'Escape') { setOpen(false); var b = el.querySelector('.sh-fx__btn'); if (b) b.focus(); } });

    el.innerHTML = variant === 'card' ? '<span class="sh-fx__skel" aria-hidden="true"></span>'
      : '<span class="sh-fx__btn sh-fx__btn--skel" aria-hidden="true">' + ShUI.icon('coins', 'solid') + '<b class="sh-fx__t">····</b></span>';
    load(false);
    setInterval(function () { load(true); }, FX_TTL);
  }

  /* ================================================================ boot */
  function boot() {
    document.querySelectorAll('[data-sh-weather]').forEach(weather);
    document.querySelectorAll('[data-sh-fx]').forEach(fx);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  window.ShWidgets = { weather: weather, fx: fx, cities: CITIES, currencies: CUR };
})();
