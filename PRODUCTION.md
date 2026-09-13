# PRODUCTION.md — دليل تركيب ثيم شهاب على لارافيل

> **لمن هذا الملف:** لي أنا (Claude) ولك يوم التركيب. كل ما اتركن للإنتاج موجود هنا بعقده الدقيق: نقاط الـAPI، أشكال الـJSON، hooks الماركب اللي الـJS بيقرأها، القيم اللي لازم تتبدّل، ترتيب الشغل، واختبارات القبول. الواجهة الستاتيكية في هذا الريبو **جاهزة كما هي**؛ الإنتاج = تغذيتها بالبيانات الحقيقية على نفس العقود، لا إعادة كتابتها.

الحالة وقت كتابة الملف (5 سبتمبر 2026): المراحل الأربعة منفّذة ومفحوصة على 1280 و375 (README قسم «ما الجديد»). كل شيء بيشتغل محليًا على `serve.py` اللي بيقلّد الباك-إند. الإنتاج يستبدل `serve.py` بلارافيل، ويبقي الفرونت زي ما هو.

---

## 0. القرارات الثابتة (لا تُعاد مناقشتها)

- **الفرونت لا يتغيّر عند البورت.** كل صفحة HTML هنا تتحوّل لـBlade view **بنفس الماركب حرفيًا**، والفرق الوحيد إن الداتا تيجي من الـCMS بدل ما تكون مكتوبة في الملف.
- **مفيش build step.** لا Vite ولا npm. الأصول تُخدم كما هي مع `?v=N` للكاش (انظر §7).
- **مكتبات الفرونت مقفولة:** Vidstack 1.15.6 (ESM، `type="module"` إجباري)، hls.js 1.7.2، Swiper 14.2، PhotoSwipe 5، Leaflet 1.9.4. لا تُضاف مكتبة.
- **قناة حية واحدة** (SSE) لكل «حي» في الموقع. لا polling ولا قناة لكل ودجت.
- `partials/header.html` و`partials/footer.html` هما مصدر الحقيقة للهيدر والفوتر → يتحوّلوا لـ`layouts/partials/header.blade.php` و`footer.blade.php` مرة واحدة.
- الوقت في الماركب دايمًا `<time datetime="ISO">` (الفرونت بيحوّله لنسبي). `data-sh-ago` كان حل النموذج الستاتيكي بس؛ **في الإنتاج لا يُستخدم**.

---

## 1. القيم اللي لازم تتبدّل (ENV / config)

| المفتاح | مكانه الحالي | القيمة في الإنتاج |
|---|---|---|
| `APP_URL` | `tools/chrome.py` → `SITE = 'https://shehabnews.com/'` | نفس الدومين النهائي. كل canonical/OG/JSON-LD بتتبني عليه |
| `SH_ASSET_VERSION` | `tools/chrome.py` → `V` + `sw.js` → `VERSION = 'sh-NNN'` | رقم واحد يُرفع مع كل نشر (Blade helper `sh_v()` يطبعه على كل `?v=`) |
| `SH_LIVE_SOURCES` | `live.html` / `now.html` → `data-sh-sources="a.m3u8|b.m3u8|c.mp4"` | بث شهاب الحقيقي أولًا، بديل ثانٍ، إعادة محلية أخيرة. يُحقن من الـCMS (شاشة «البث») |
| `SH_LIVE_ON_AIR` | `serve.py` → `DemoFeed.on_air` | فلاغ حقيقي من غرفة الأخبار (يقود زر «بث مباشر» والشريط المرصوف) |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | `serve.py` → `/api/push/key` بيرجّع `{"key": ""}` | مفاتيح `web-push` (§4.5). لو فاضي الفرونت بيشتغل بإشعارات محلية فقط |
| `MEILISEARCH_HOST` / `MEILISEARCH_KEY` | `search_local.py` | Laravel Scout + Meilisearch (§4.3) |
| `SH_TILES_URL` | `js/map.js` → `TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'` | بلاطات ذاتية (Protomaps PMTiles أو OpenFreeMap) بتسميات عربية. OSM العام **ممنوع** في الإنتاج (سياسة استخدام) |
| `SH_WEATHER_SOURCE` / `SH_FX_SOURCE` | `js/widgets.js` → `wxLoad()` / `fxLoad()` (Open-Meteo + currency-api) | يفضلوا كما هم لو مقبول؛ أو بدّل الدالتين لمصدر مدفوع. **العرض لا يتغيّر** |
| `SH_ADS_*` | `.sh-ad--leader/--inline/--box` مواضع فاضية | أكواد AdSense/Jubna (§8) |
| `SH_ANALYTICS_ID` | مفيش | GA4 واحد فقط، محكوم بالموافقة (§8) |
| الشبكات الاجتماعية | `partials/footer.html`, `index.html` (سكشن Social), `tools/chrome.py` → `sameAs` | الروابط الحالية هي روابط الموقع القديم. راجعها مع العميل مرة واحدة |
| RSS | `https://shehabnews.com/rss/category/all` في الهيدر والفوتر وJSON-LD | مسار RSS الجديد |
| EN | `https://shehabnews.com/post/category/35/EN` | مسار النسخة الإنجليزية الجديد أو يُشال |
| بريد الوكالة | `author.html` (رابط «البريد» → `contact.html`) | `mailto:` الحقيقي لو مطلوب |

---

## 2. الاستضافة (nginx / Apache خلف لارافيل)

### 2.1 هيدرز الكاش
```
# HTML: لا يُكاش على المتصفح (الـSW بيعمل network-first بنفسه)
Cache-Control: no-cache
# كل أصل عليه ?v=N: سنة كاملة
Cache-Control: public, max-age=31536000, immutable
# فيديو/HLS: Range إجباري + CORS لو على دومين آخر
Accept-Ranges: bytes
```
`serve.py` بيبعت `Cache-Control: no-store` للتطوير بس. **الإنتاج عكسه.**

### 2.2 SSE (`/api/events`)
```nginx
location /api/events {
    proxy_pass http://app;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_buffering off;          # وإلا الأحداث تتجمّع
    proxy_cache off;
    proxy_read_timeout 3600s;
    add_header X-Accel-Buffering no;
}
```
لارافيل: `StreamedResponse` مع `Content-Type: text/event-stream`, `Cache-Control: no-cache`, وتعطيل output buffering (`ob_implicit_flush`, `@ob_end_flush` في اللوب). PHP-FPM يحتاج عدد workers كافٍ (كل اتصال SSE = worker محجوز)؛ لو الحمل عالي انقل القناة لـ**Laravel Reverb** ونفس أسماء الأحداث تتبعت عبر `Echo` (تعديل `js/feed.js` سطر الاتصال فقط: `connect()`).

### 2.3 MIME
`.webmanifest` → `application/manifest+json`، `.geojson` → `application/geo+json`، `.m3u8` → `application/vnd.apple.mpegurl`، `.m4s` → `video/iso.segment`، `.vtt` → `text/vtt`، `.woff2` → `font/woff2`، `.svg` → `image/svg+xml`. (نفس القائمة في `serve.py` أعلى الملف.)

### 2.4 HTTPS إجباري
Service Worker وPush وGeolocation وWeb Share لا تعمل إلا على https. `sw.js` لازم يُخدم من **جذر** الدومين (scope `/`).

### 2.5 HTTP/2 + Early Hints (اختياري)
الهيد فيه `preload` لأربعة خطوط. لو السيرفر يدعم `103 Early Hints` ابعتها منه.

---

## 3. البورت إلى Blade

### 3.1 الهيكل
```
resources/views/
  layouts/app.blade.php            ← <html lang="ar" dir="rtl"> + <x-seo> + CSS list + <div class="sh-page"> + @include header + @yield + @include footer + scripts
  layouts/partials/header.blade.php   ← من partials/header.html حرفيًا
  layouts/partials/footer.blade.php   ← من partials/footer.html حرفيًا (فيه الـdock والـtotop والـconsent)
  components/seo.blade.php            ← يطبع ما يطبعه tools/chrome.py::build_head()
  pages/*.blade.php                   ← صفحة لكل ملف HTML (الجدول تحت)
```
`shorts.blade.php` و`offline.blade.php` **بلا** الهيدر والفوتر (قائمة `NO_CHROME` في `tools/chrome.py`).

### 3.2 ترتيب CSS و JS (لا يتغيّر)
CSS بالترتيب: `fonts, transition, tokens, base, header, widgets, footer, components, chrome, feed, [أوراق الصفحة], mark, responsive (دائمًا الأخير قبل brief), brief`. أوراق الفيديو: `vidstack/theme.css, vidstack/layouts/video.css, player.css` قبل ورقة الصفحة. الخريطة: `leaflet.css` قبل `pages/map.css`.

JS: `ui, chrome, feed, app, responsive, widgets, brief, searchbox, push, pwa` ثم إضافات الصفحة. **`assets/vendor/vidstack/vidstack.js` دائمًا `type="module"`**، الباقي `defer`. (القائمة الفعلية: `CORE_SCRIPTS` في `tools/chrome.py`.)

### 3.3 الصفحات ونوع الـJSON-LD
| view | مصدر HTML | نوع الصفحة | JSON-LD | إضافات JS/CSS |
|---|---|---|---|---|
| home | `index.html` | home | WebSite + SearchAction, NewsMediaOrganization | photoswipe + gallery.js |
| article | `article.html` | article | NewsArticle + BreadcrumbList | photoswipe + gallery.js + `article.js` |
| category / tag / archive / sections / files / video / reels / shorts | نفس الأسماء | collection | CollectionPage + Breadcrumb | reels/shorts: vidstack (module) + swiper + player.js + reels.js/shorts.js |
| coverage | `coverage.html` | liveblog | LiveBlogPosting (+ `liveBlogUpdate[]` من التحديثات) | — |
| video-watch | `video-watch.html` | video | VideoObject | vidstack + player.js + watch.js |
| live | `live.html` | live | BroadcastEvent + VideoObject | vidstack + player.js + live.js |
| photos | `photos.html` | gallery | ImageGallery | — |
| author | `author.html` | profile | ProfilePage + Person | — |
| search | `search.html` | search (noindex) | — | `search.js` |
| now | `now.html` | liveblog | LiveBlogPosting | vidstack + player.js + live.js + leaflet + figures.js + map.js + now.js |
| map | `map.html` | page | WebPage | leaflet + figures.js + map.js |
| data | `data.html` | page | WebPage (+ `Dataset` لكل رقم لاحقًا) | figures.js + data.js |
| saved | `saved.html` | page (noindex) | — | saved.js |
| about / contact / newsletter / privacy / terms / 404 | نفس الأسماء | about / contact / page / page / page / error | AboutPage / ContactPage / WebPage | — |

الحقول الثابتة في JSON-LD الحالي (`datePublished`, `dateModified`, `articleSection`, `image`, `author`) **placeholder** في `tools/chrome.py::jsonld()` → في `<x-seo>` تيجي من الموديل. لا تنسَ `dateModified` الحقيقي: الفرونت بيحدّث النص فقط عند تحديث القصة.

### 3.4 ما تطبعه كل صفحة من الـBody
- `<body data-sh-page="{{ $page }}">` (أسماء الصفحات كما في الجدول). صفحات الأقسام تضيف `data-sh-section="palestine|arab|world|israeli|sport|opinion"` عشان النافبار يعلّم القسم الجاري (`js/chrome.js::navCurrent`).
- `live` و`now` تضيف `data-sh-page-live` (يمنع الشريط المرصوف على صفحة البث نفسها).

### 3.5 Speculation Rules
`<x-seo>` يطبع نفس القاعدة: prerender لكل `/*.html` (في الإنتاج: كل الروابط الداخلية) **ماعدا** صفحات الفيديو والخريطة: `live, reels, shorts, video-watch, now, map`. لو مسارات الإنتاج بلا `.html` عدّل `href_matches` لمسارات المقالات/الأقسام فقط.

---

## 4. عقود الـAPI (يجب أن تُنفَّذ بنفس الشكل حرفيًا)

الفرونت بينادي المسارات **نسبية** (`api/events`) — يعني تحت نفس الأصل. لو الـAPI على دومين آخر: CORS + بدّل الـprefix في `feed.js`, `searchbox.js`, `search.js`, `push.js`, `chrome.js` (فورم النشرة), `figures.js`, `map.js`.

### 4.1 `GET /api/events` — Server-Sent Events
هيدرز: `text/event-stream; charset=utf-8`, `Cache-Control: no-cache`, `X-Accel-Buffering: no`. أول سطر `retry: 4000`. كل حدث له `id:` تصاعدي (رقم) وبيتعاد على `Last-Event-ID` من ring buffer (آخر 80 على الأقل). **الاتصال الجديد بلا `Last-Event-ID` ياخد آخر تحديثين فقط، ولا يأخذ عاجل قديم** (وإلا كل زائر يشوف شريط عاجل منتهي).

| `event:` | `data:` (JSON) | من يستهلكه |
|---|---|---|
| `hello` | `{"now": ISO, "on_air": bool, "viewers": int, "title": "…", "href": "live"}` | حالة البث الأولية |
| `update` | `{"id": "u123", "t": "العنوان", "cat": "غزة", "href": "/post/…", "at": ISO}` | كل `[data-sh-feed="updates"]` (رئيسية، تغطية، الآن) |
| `ticker` | `{"t": "…", "href": "…", "at": ISO}` | شريط العاجل (يتقدّم للأول، سقف 12) |
| `breaking` | `{"id": "b123", "t": "…", "href": "…", "at": ISO}` | الشريط الأحمر + توست + إعلان `aria-live` + إشعار محلي لو مفعّل. يُبعت **مرة واحدة** لكل خبر (الـid هو اللي يمنع التكرار وبيتحفظ في `sessionStorage` عند الإغلاق) |
| `top` | `{"items": [{"t": "…", "href": "…", "img": "…", "by": "…", "avatar": "…", "date": "…"}, …]}` | «أبرز الأخبار» (بيملى الصفوف الموجودة بالترتيب: 3 في الرئيسية، 5 في now) |
| `live-state` | `{"on_air": bool, "viewers": int, "title": "…", "href": "…"}` | زر البث، الشريط المرصوف، عدّاد المشاهدين في live/now |
| `story` | `{"id": "163540", "t": "نص التحديث", "at": ISO}` | بانر «تحدّث هذا الخبر» في `article[data-sh-story="163540"]` |
| `incident` | Feature GeoJSON كاملة (§4.7) | الخريطة تضيف النقطة فورًا (مقترح، غير مُنفَّذ على السيرفر التجريبي) |

Keep-alive: سطر تعليق `: ping` كل 15 ثانية.
المرجع التنفيذي: `serve.py::RangeHandler.sse` + `DemoFeed`. في لارافيل: Job ينشر على Redis pub/sub، والـcontroller يستهلكه ويبثّه.

### 4.2 `GET /api/now.json`
`{"now": ISO, "on_air": bool, "viewers": int, "recent": [{"id": int, "type": "update|breaking|…", "data": {…}}]}` — لقطة للصفحات التي تفتح قبل الاتصال (غير مستهلكة حاليًا؛ احتياطي لـ`now`).

### 4.3 `GET /api/search?q=&limit=8`
```json
{"q": "غزة", "total": 66, "hits": [
  {"t": "العنوان", "href": "/post/163540/…", "cat": "غزة", "type": "news|report|analysis|video|photo|file|coverage", "at": "ISO"}
]}
```
(`ago` بالدقائق مقبول بدل `at` — نموذجي فقط.) التطبيع المطلوب في المحرك: إزالة التشكيل والتطويل، توحيد الألف/التاء المربوطة/الألف المقصورة، مطابقة بادئة الكلمة، تحمّل خطأ إملائي واحد. **Meilisearch** بيعملها جاهزة (`typoTolerance`, `stopWords`, `searchableAttributes: [title, kicker]`, `sortableAttributes: [published_at]`, `rankingRules` مع `published_at:desc`). Laravel Scout: `Post::search($q)->take($limit)` ثم `map` للشكل أعلاه. المرجع: `search_local.py` (يوضّح التطبيع والترتيب).

صفحة البحث (`search.js`) حاليًا تفلتر القائمة الستاتيكية؛ في الإنتاج الـview تطبع نتائج الطلب الأول من السيرفر بنفس الماركب (`a.sh-search-search-body__a-1` + `.sh-link` كيكر + `<time datetime>`), والـJS يكمّل الفلاتر على ما اتطبع. الفلاتر `?type=news|report&sort=old&page=N` روابط حقيقية بالفعل.

### 4.4 `POST /api/newsletter`
`multipart/form-data` حقل `email`. يرجّع `200 {"ok": true}` أو `422 {"ok": false, "error": "…"}`. الفرونت (`js/chrome.js::newsletter`) يعتبر أي غير-2xx فشلًا ويكتب رسالة عامة. اربطه بـMailchimp/Sendy + double opt-in.

### 4.5 Push
- `GET /api/push/key` → `{"key": "<VAPID public key base64url>"}`. لو `key` فاضي: الفرونت يعمل **local mode** (إشعار من الـSW عند حدث `breaking` والتبويب مخفي) — يعني مفيش إشعارات والموقع مقفول.
- `POST /api/push/subscribe` ← جسم `PushSubscription` (`{endpoint, keys:{p256dh, auth}}`) — خزّنه مع `user_agent` و`created_at`.
- `POST /api/push/unsubscribe` ← `{"endpoint": "…"}`.
- الإرسال: `minishlink/web-push` (PHP) أو `laravel-notification-channels/webpush`. الحمولة اللي `sw.js::push` بيفهمها:
  ```json
  {"title": "عاجل | شهاب", "body": "نص الخبر", "url": "/post/…", "tag": "sh-breaking"}
  ```
  (`t`/`href` مقبولين كبدائل لـ`body`/`url`.) ابعت العاجل **فقط**، بحد أقصى متفق عليه يوميًا، مع `TTL` قصير (ساعة).

### 4.6 `data/figures.json` → `GET /api/figures`
```json
{"updated": ISO, "demo": false,
 "figures": {"martyrs": {"label": "شهيدًا في غزة", "value": 66148, "delta": 17, "deltaLabel": "منذ أمس",
                         "unit": "", "source": "وزارة الصحة بغزة", "asOf": "5 سبتمبر 2026", "series": [14 قيمة يومية]},
             "days": {"label": "…", "since": "2023-10-07", "source": "حساب تلقائي"}},
 "groups": [{"title": "الضحايا في غزة", "keys": ["martyrs", "injured", …]}]}
```
`since` = يُحسب في المتصفح. `series` اختيارية (sparkline). المفاتيح المستخدمة في الماركب الآن: `days, ceasefire, martyrs, injured, children, missing, displaced, shelter, housing, hospitals, schools, mosques, trucks, flour_days, wb_martyrs, wb_detained, prisoners, settler_attacks, incidents, incidents_24h`. الـCMS: شاشة «مكتب البيانات» = جدول أرقام بمصدر وتاريخ، والـendpoint يبني الملف (كاش 5 دقائق). خلّي `demo: false` عشان ملاحظة «أرقام توضيحية» تختفي من `data.html`.

### 4.7 `data/incidents.geojson` → `GET /api/incidents?days=30`
FeatureCollection؛ كل Feature:
```json
{"type": "Feature", "geometry": {"type": "Point", "coordinates": [lon, lat]},
 "properties": {"id": "i001", "t": "العنوان", "type": "قصف|إطلاق نار|اقتحام|اعتقال|هدم|استيطان",
                "area": "غزة|الضفة|القدس", "place": "خانيونس", "at": ISO, "source": "مراسل شهاب",
                "href": "/post/…", "casualties": 0}}
```
الأنواع والألوان في `js/map.js::COLOR` — أي نوع جديد لازم يتضاف هناك. الـCMS: حقلان على الخبر (نوع الخرق + موقع على خريطة) + صلاحية «إضافة للخريطة». الإحداثيات على مستوى البلدة لا المنزل (سلامة المصادر).

### 4.8 `data/search-index.json`
نموذجي فقط (`tools/search_index.py`). **يُلغى** في الإنتاج لصالح Meilisearch.

---

## 5. عقود الماركب (ما تطبعه الـviews عشان الـJS يشتغل)

### 5.1 الهيدر
- التيكر: `<a data-sh="ticker" data-items='[{"t":"…","href":"…","at":"ISO"}, …]'>` + `[data-sh="ticker-title"]` + `<time data-sh="ticker-time" data-sh-format="clock">` + `[data-sh="ticker-count"]` + أزرار `ticker-prev/pause/next`. أول عنصر مطبوع في الـHTML كمان (SEO).
- التاريخ/الساعة: `[data-sh="date"]`, `[data-sh="hijri"]`, `[data-sh="clock"]` (توقيت القدس، `app.js::paintDate`).
- الطقس: `<span data-sh-weather data-sh-city="jerusalem" data-sh-cities="jerusalem,gaza,ramallah,hebron,nablus">`; العملات: `<div data-sh-fx data-sh-pairs="USD:ILS,…" data-sh-speed="26">`. في الأعمدة: `data-sh-variant="card"`.
- الموجز الصوتي: زر `.sh-brief-btn` + `<span data-sh-brief='{"edition":"نشرة 5 سبتمبر","items":[{"c":"غزة","time":"10:32 م","href":"/post/…","t":"العنوان كما يُعرض","say":"الجملة كما تُنطق"}]}' hidden>` — `say` **يُكتب للنطق** (أرقام بالحروف، جمل قصيرة). مصدره: حقل «نص الموجز» في الخبر أو توليد من المحرر.
- البحث: الفورم `[data-sh-search-form]` + `[data-sh-search-input]` (لا تغيّرهم).
- الشريط الأحمر `[data-sh-breaking]` والـ`[data-sh-announce]` موجودين في البارشال فاضيين.

### 5.2 الرئيسية
- عمود «آخر التحديثات»: `<div class="sh-index-hero__div-8" data-sh-feed="updates" data-sh-feed-max="6">` وبداخله `<template data-sh-feed-tpl>` بصف واحد فيه `{href}`, `{cat}`, `{t}` و`<time data-sh-time-slot>` (الـJS يبدّل `data-sh-time-slot` بـ`datetime`). الصفوف الأولى تُطبع من السيرفر بنفس الماركب.
- قائمة التغطية الحية: نفس الشيء على `.sh-index-live-coverage__div-10` مع `data-sh-feed-head` على الفاصل الأول (يفضل ثابتًا فوق).
- «أبرز الأخبار» (بلا عنوان ظاهر؛ الاسم في `aria-label` على الـ`aside`): `<ol data-sh-feed="top">` بثلاثة صفوف، كل صف `<a>` فيه `[data-sh-top-img]` و`[data-sh-top-t]` و`[data-sh-top-by]` و`[data-sh-top-face]` و`[data-sh-top-date]`. على الديسكتوب العنوان وحده فوق الصورة؛ سطر الكاتب والتاريخ بيظهر في صفوف الموبايل.
- «محاور اليوم»: `<template data-sh-hub-source>` فيه كل أخبار اليوم كـ`<a data-sh-item data-sh-cat="فلسطين" data-sh-time="09:31 م" data-sh-image="…" data-sh-credit="…" href="…">العنوان</a>`، وكل محور `<a data-sh-hub data-sh-filter="فلسطين|القدس|غزة" data-sh-cover="…">`. (`data-sh-time` هنا `HH:MM م` لأن `app.js::hubs` بيرتّب بيها؛ يقبل غيابها.)
- «ملفات خاصة»: `article.sh-binder` + `[data-sh-binder-inside]` (الوثائق مخفية بالماركب؛ `app.js::binders` يقرأها). «ملفات شهاب» الأكورديون: `div.sh-file[data-sh-state="open|live|closed|upcoming"]`.
- الفيديو: `[data-sh-vid]` + قائمة `[data-sh-vid-item data-sh-src data-sh-poster data-sh-chip data-sh-meta]`.
- «غزة»: `<section data-sh-gaza data-sh-since="2023-10-07">`.
- أي `<time datetime>` في الكروت يتحدّث نسبيًا تلقائيًا؛ `data-sh-format="clock"` للساعة فقط، `"abs"` للتاريخ الكامل.

### 5.3 المقال
- `<article data-sh-story="{{ $post->id }}" data-sh-share-url="{{ $url }}" data-sh-share-title="{{ $title }}">`.
- شريط الأدوات `[data-sh-reader]` كما في `article.html` (زر الحفظ يحمل `data-sh-save="{{ $url }}" data-sh-save-title data-sh-save-cat`).
- الصور: حائط PhotoSwipe واحد `[data-sh-pswp]` على `.sh-art__main` (وآخر على `.sh-pane`)، وكل صورة `<a href="{{ full }}" data-pswp-src="{{ full }}" data-pswp-width="W" data-pswp-height="H"><img …></a>` — **الأبعاد الحقيقية** ضرورية لأنيميشن PhotoSwipe.
- بانر التحديث `<aside data-sh-story-updates hidden>` + `<time data-sh-story-modified>` كما هما.
- المشاركة: `data-sh-share="x|facebook|whatsapp|telegram|copy|native"` مع `href` حقيقي (intent) كبديل بلا JS.
- «استمع للمقال» يقرأ `.sh-art__dek` ثم `.sh-art__body > p` — خلّي فقرات المتن أبناءً مباشرين لـ`.sh-art__body` (فقرة الاقتباس داخل `blockquote` لا تُقرأ).
- **اللوحة اللاصقة (ديسكتوب ≥1000px):** الصور الثلاث موجودة مرتين في الماركب: `figure.sh-art__fig[data-sh-scene="N"]` داخل النص (تظهر تحت 1000px) و`.sh-pane [data-sh-shot="N"]` في `<aside class="sh-art__pane">` (تظهر فوقها). `[data-sh-scene-at="N"]` على `header.sh-art__head` وعناوين `h2` يحدّد أي صورة تظهر عند أي فقرة؛ `js/article.js::scenes()` يكتب `data-scene` على `.sh-pane` والـCSS يعمل الـcrossfade. المقال بلا صور إضافية = مشهد واحد (اترك `data-scene="1"`).

### 5.4 التغطية الحية
الخط الزمني: `.sh-coverage-timeline__div-2` عليه `data-sh-feed="updates" data-sh-feed-count="[data-sh-cov-count]"` + template + `data-sh-feed-head` على فاصل اليوم. JSON-LD `LiveBlogPosting.liveBlogUpdate[]` من نفس القائمة.

### 5.5 الفيديو
- `<media-player data-sh-vs data-sh-sources="src1|src2|src3" …>`؛ `player.js` يجرّب بالترتيب ويبعت `sh-vs-fallback`. `data-sh-hls='{…}'` لإعدادات hls.js.
- البث: `[data-sh-live data-sh-live-started-min="N"]`، الجدول `<li data-sh-offset="دقائق من الآن" data-sh-len="دقائق">` — في الإنتاج اطبع `data-sh-offset` محسوبًا من وقت السيرفر أو غيّر `live.js::paintSchedule` ليقرأ `datetime`.
- المشاهدة: كل عنصر قائمة `data-sh-watch-item data-sh-src data-sh-poster data-sh-thumbs data-sh-chapters data-sh-captions data-sh-title data-sh-kicker`. الفصول والترجمة VTT من الـCMS (`chapters.ar.vtt`, `captions.ar.vtt`, `thumbs.vtt` + `thumbs.jpg` sprite).
- الريلز/الشورتس: `.swiper-slide[data-sh-prog="slug"][data-sh-dek="سطر وصف"]` > `media-player.sh-vs--lite[data-sh-reel]` بـ`src` MP4 رأسي 540×960 + `poster` (نفس الرابط في `.sh-lite__poster` style). في `reels.html` كمان: لوحة `[data-sh-reels-feature]` بحقول `[data-sh-f-chip|pos|title|dek|time|len|full|play-label]` وزر `[data-sh-reels-play]` (تُملأ من الشريحة النشطة، فتُطبع بقيم أول مقطع)، وبطاقات الشبكة `a.sh-reels-grid__card[data-sh-reels-go="N"][href="shorts.html#r=N"]`. البوسترات صور حقيقية 9:16 (540×960 من الـthumbnailer).

### 5.6 الخريطة ومكتب البيانات
- `<div data-sh-map data-sh-map-src="/api/incidents?days=30">` (+ `data-sh-map-mini` للمصغّرة). الفلاتر `[data-sh-map-filter="period|type|area" data-sh-map-value="…"]`.
- `[data-sh-figure="key"]`, `[data-sh-figure-delta="key"]`, `[data-sh-figure-asof="key"]`, `[data-sh-figures-updated]`, وحاوية `data.html`: `[data-sh-figures]`. `figures.js` يحمّل `data/figures.json` → غيّر المسار لـ`/api/figures` (سطر واحد).

### 5.7 عام
- الروابط الداخلية بلا `.html` في الإنتاج → عدّل `js/chrome.js::navCurrent` (يقارن آخر مقطع من المسار) و`NO_PRERENDER`.
- أي زر مشاركة/حفظ/إشعار موجود في البارشالات؛ **لا تحذف** العناصر المخفية (`[data-sh-install]`, `[data-sh-push]`, `[data-sh-livedock]`): الـJS يظهرها عند توفر الميزة.

---

## 6. الصور

- **الصور المؤقتة اللي لازم تتبدّل:** 247 مرجعًا لـWikimedia Commons (روابط `commons.wikimedia.org/wiki/Special:FilePath/…`) + 40 مرجعًا لـ`shehabnews.com/thumb/…` (صور شهاب الحقيقية). كلها في HTML وCSS (خلفيات الهيرو والملفات).
- المقاسات المطلوبة من الـthumbnailer (كما تستخدمها القوالب): `800x450` (كروت 16:9)، `900x1120` و`450x600` (أغلفة 4:5 و3:4)، `300x300`/`400x400`/`600x600`/`800x800` (وجوه)، `960x512` و`192x128` (عدسة)، `800x520` (كاريكاتير)، `900x1200` (بوستر). أضف: `1600x900` للهيرو، `1800` عرض لصورة المقال الرئيسية (`data-pswp-*`)، `540x960` بوستر ريلز.
- التنسيق: WebP (AVIF لو الـthumbnailer يدعم) مع `<picture>`/`srcset` بثلاث عروض (`480, 960, 1600`) وسمة `sizes` حسب العمود. حاليًا الصور المحلية بـ`width/height`؛ خلّي الـCMS يطبعهم دائمًا (CLS).
- الأصول المحلية (`assets/images/*.webp`, الشعارات، `icons.svg`, أيقونات PWA, `og-default.jpg`) تُنسخ كما هي. `og-default.jpg` هو الـOG الافتراضي؛ المقال يطبع صورته.
- الأيقونات: **لا Font Awesome**. أي أيقونة جديدة: ضيفها في `tools/icons.py::RUNTIME` وشغّله (يقرأ من `tools/fonts/`) → `assets/images/icons.svg`. الاستخدام: `<svg class="sh-i"><use href="/assets/images/icons.svg#s-name"></use></svg>` أو `ShUI.icon('name')`.

---

## 7. الإصدار والكاش والـService Worker

- `?v=N` على كل CSS/JS/SVG. رقم واحد من `.env` (`SH_ASSET_VERSION`) يطبعه helper، و`sw.js` يقرأ نفس الرقم في `VERSION = 'sh-N'` (اطبع `sw.js` من Blade أو بدّل السطر في الـdeploy).
- `sw.js::SHELL` = قائمة القشرة المسبقة. حدّثها لو اتغيّرت مسارات الأصول (مسارات مطلقة `/css/…` في الإنتاج).
- `sw.js::DEV` بيخلّي localhost network-first. في الإنتاج stale-while-revalidate تلقائيًا.
- `manifest.webmanifest`: `start_url` و`scope` وshortcuts بمسارات الإنتاج (`/`, `/coverage`, `/live`, `/reels`).
- `offline.html` مستقلة (CSS داخلها) — تُخدم من الكاش عند انقطاع الشبكة. تُنسخ كما هي.
- بعد كل نشر: رفع `V` فقط. الـSW يعرض شريط «نسخة جديدة» (`js/pwa.js`).

---

## 8. الإعلانات والتحليلات والموافقة

- مواضع محجوزة بحجم ثابت (بلا CLS): `.sh-ad--leader` (970×120 / 320×100 موبايل) في الرئيسية بعد «الأبرز الآن»، `.sh-ad--inline` (728×90) داخل المقال، `.sh-ad--box` (300×250) في الشريط الجانبي. حط كود الشبكة داخل `<aside class="sh-ad …">` بدل `.sh-ad__note`.
- الموافقة: `js/chrome.js::consent` بيحط `html[data-consent="all|essential"]`. **حمّل GA/AdSense/Hotjar فقط لو `all`** (سكربت صغير في الـlayout يفحص القيمة أو يسمع `dialog close`). الموقع القديم كان يحمّل 30 سكربتًا بلا موافقة — لا نكرر.
- السيرفر لا يحتاج شيء للموافقة (localStorage).

---

## 9. ما يُحذف من الحزمة عند النشر

`serve.py`, `search_local.py`, `tools/`, `data/search-index.json`, `partials/*-v1/*-v2` (مراجع), `homepage-v2/3/4.html`, `loader.html`, `system-states.html`, `README.md` الداخلي (اختياري), `assets/video/hls/qods-night/` و`assets/video/reels/*` (فيديو تجريبي)، `data/figures.json` و`data/incidents.geojson` **لو** بقوا endpoints. الخطوط الثلاثة في `tools/fonts/` لا تُنشر.

---

## 10. ترتيب التنفيذ يوم التركيب

1. **البيئة:** `.env` بقيم §1، HTTPS، هيدرز §2، MIME §2.3.
2. **الـlayout والبارشالات:** `app.blade.php` + `header/footer` من `partials/`. `<x-seo>` بترجمة `tools/chrome.py::build_head()` و`jsonld()` واحدًا لواحد.
3. **الصفحات:** ابدأ بـ`home → article → category → coverage → live → video-watch → search`، ثم الباقي. كل صفحة: انسخ الـHTML، استبدل الداتا الثابتة بـBlade، **لا تغيّر الكلاسات ولا الـhooks**.
4. **الـAPI:** `events` (Redis pub/sub + StreamedResponse) → `search` (Scout + Meilisearch) → `newsletter` → `push/*` → `figures` → `incidents`.
5. **الـCMS:** حقول جديدة: نوع الخبر (خبر/تقرير/تحليل)، «عاجل» (يبعث `breaking`), «تحديث خبر» (يبعث `story`), نص الموجز الصوتي (`say`), نوع الخرق + موقع (الخريطة), شاشة «مكتب البيانات», شاشة «البث» (مصادر + on_air + الجدول), برامج الريلز.
6. **الصور:** مقاسات §6 في الـthumbnailer + WebP.
7. **PWA/Push:** نسخ `sw.js`/`manifest`/`offline.html` بمسارات الإنتاج، VAPID، اختبار اشتراك حقيقي.
8. **الإعلانات/التحليلات:** §8 محكومة بالموافقة.
9. **القبول:** §11 على 1280 و375.
10. **النشر:** رفع `SH_ASSET_VERSION`، `sitemap.xml` + `news-sitemap.xml` (Google News: آخر 48 ساعة)، `robots.txt`، `rss` بالمسارات الجديدة.

---

## 11. اختبارات القبول (قبل التسليم)

لكل صفحة على 1280 و375: صفر أخطاء كونسول، صفر `href="#"`، `scrollWidth == innerWidth`، h1 واحد، `<title>` وdescription حقيقيان، JSON-LD يمرّ على Rich Results Test.

| الميزة | الاختبار |
|---|---|
| الهيدر | يثبت مضغوطًا بعد التمرير، القسم الجاري معلّم، البحث يفتح لوحة/شيت بنتائج، `/` يركّز البحث |
| القناة الحية | `[data-sh-feed-status]` = «متصل»؛ خبر جديد من الـCMS يظهر في التيكر وعمود التحديثات خلال ثوانٍ؛ «عاجل» يظهر الشريط الأحمر والتوست؛ إغلاقه لا يعود بنفس الـid |
| البث | `live.html` يشغّل HLS (720p أو أعلى)، شارة «متأخر عن البث» تظهر عند الرجوع، الشريط المرصوف يظهر على الصفحات الأخرى فقط وقت `on_air` |
| المقال | تقدّم القراءة، حجم الخط يُحفظ، «استمع» يقرأ الفقرات، «حفظ» يظهر في `saved`، تكبير الصورة، بانر «تحدّث الخبر» عند حدث `story`، الطباعة نظيفة |
| البحث | `search?q=` يطبع نتائج السيرفر؛ الفلاتر والترتيب والبحث المتقدم تعمل على المطبوع |
| الخريطة | النقاط تُحمّل من `/api/incidents`، الفلاتر تغيّر العدّ والقائمة، النقرة تفتح الخبر، البلاطات الذاتية بتسميات عربية |
| البيانات | 19+ رقمًا بمصدر وتاريخ، `demo` مخفي، الرقم في الرئيسية = الرقم في `data` |
| PWA | Lighthouse installable؛ قطع الشبكة يعرض `offline.html`؛ Push حقيقي يصل والنقر يفتح الخبر |
| النشرة | إرسال بريد صحيح → «تم الاشتراك»؛ خاطئ → رسالة خطأ بلا reload |
| الإتاحة | Tab يمر على كل شيء، skip link يعمل، التيكر يقف بالزر، لا نص أقل من 12px على الموبايل |

---

## 12. فخاخ معروفة (لا تكرّرها)

- `vidstack.js` لازم `type="module"` وإلا `SyntaxError: Cannot use import statement`. `dir="ltr"` على `<media-player>` نفسه (`player.js` بيعملها).
- Vidstack لا يبدأ التحميل والتبويب مخفي؛ اختبر البث والتبويب ظاهر.
- الـService Worker يخفي التعديلات لو الكاش قديم: ارفع `VERSION` مع كل نشر.
- بين `</header>` و`<main>` في `live/coverage/video-watch/reels/about` **محتوى حقيقي**؛ أي سكربت ينضّف الهيدر لازم يحترمه (`tools/restore_prelude.py` يسترجعه).
- `.sh-now` كلاس صفحة «الآن» و`.sh-nowlink` زر الهيدر — لا تخلط.
- `responsive.css` طبقة `@layer responsive` بـ`!important`؛ أي قاعدة موبايل جديدة لازم تدخل الطبقة نفسها وإلا تخسر.
- حدّ الخط 12px على الموبايل مولّد بـ`tools/a11y.py` بين علامتي `sh:type-floor` في `responsive.css` — لا تعدّله يدويًا.
- كل تعديل في الهيدر/الفوتر: `partials/` ثم `python tools/chrome.py`. لا تعدّل صفحة مباشرة.
