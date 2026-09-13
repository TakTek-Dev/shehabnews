#!/usr/bin/env python3
"""شهاب — sync the page chrome: <head>, header, footer, scripts.

For every route page this script
  * rebuilds <head> from PAGES below: real <title>/description, canonical,
    OG/Twitter, icons + manifest, RSS, font preloads, the page's own stylesheet
    list (kept), Speculation Rules and JSON-LD by page type;
  * replaces the header with partials/header.html and the footer with
    partials/footer.html (between the sh:header / sh:footer comment markers;
    a page that lost them gets the blocks re-inserted at the page frame);
  * normalises the script list: ui.js, chrome.js, feed.js, app.js,
    responsive.js, widgets.js, brief.js, then the page's own extras in order;
  * gives the first <main> id="main", demotes any second <main> to <div>,
    stamps data-sh-page on <body>, and bumps ?v= on every asset.

Reference pages (homepage-v2/v3/v4, loader, system-states) are left alone.

Usage:  python tools/chrome.py
"""
import os, re, json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

V = '263'
SITE = 'https://shehabnews.com/'
ORG = 'وكالة شهاب للأنباء'
OG_IMG = SITE + 'assets/images/og-default.jpg'

# page -> (title, description, type, section-hint)
PAGES = {
    'index':       ('آخر أخبار فلسطين لحظة بلحظة', 'وكالة أنباء فلسطينية مستقلة تنقل أخبار غزة والقدس والضفة لحظة بلحظة: تغطية حية، تقارير خاصة، تصريحات، فيديو، ريلز، وبث مباشر.', 'home', None),
    'article':     (None, None, 'article', 'palestine'),
    'category':    (None, 'آخر الأخبار والتقارير من غزة لحظة بلحظة: الميدان، وقف إطلاق النار، الوضع الإنساني، وإعادة الإعمار.', 'collection', 'palestine'),
    'coverage':    (None, 'تغطية حية متجددة: التسلسل الزمني، أبرز التطورات، الخلفية، والأرقام. تتحدّث تلقائيًا.', 'liveblog', None),
    'tag':         (None, 'كل المواد المنشورة تحت هذا الوسم في شهاب.', 'collection', None),
    'archive':     ('أرشيف الأخبار', 'تصفّح أرشيف شهاب بالتاريخ: كل الأخبار والتقارير منذ التأسيس.', 'collection', None),
    'video':       ('الفيديو', 'مكتبة فيديو شهاب: البرامج، التغطيات المصوّرة، الترجمات، والأكثر مشاهدة.', 'collection', None),
    'video-watch': (None, 'شاهد على شهاب.', 'video', None),
    'live':        ('البث المباشر', 'بث شهاب المباشر من غزة على مدار الساعة، مع جدول برامج اليوم وآخر التحديثات على الهواء.', 'live', None),
    'reels':       ('ريلز شهاب', 'مقاطع قصيرة من برامج شهاب: سين صريح، أخبار شلومو، قصة صورة، الحكاية، حديث اليوم.', 'collection', None),
    'shorts':      ('شورتس شهاب', 'مقاطع رأسية قصيرة من شهاب بملء الشاشة.', 'collection', None),
    'photos':      ('الصور', 'عدسة شهاب: ألبومات مصوّرة وانفوجرافيك من فلسطين.', 'gallery', None),
    'files':       ('ملفات شهاب', 'ملفات شهاب والتغطيات المعمّقة: وثائق، خرائط، وخطوط زمنية.', 'collection', None),
    'author':      (None, 'مواد الكاتب على شهاب.', 'profile', None),
    'search':      ('البحث', 'ابحث في أخبار وتقارير وصور وفيديوهات شهاب.', 'search', None),
    'sections':    ('أقسام شهاب', 'خريطة أقسام شهاب ومكاتبها وفريق التحرير.', 'collection', None),
    'about':       ('من نحن', 'وكالة شهاب للأنباء: من نحن، سياسة التحرير، وفريق العمل.', 'about', None),
    'contact':     ('تواصل معنا', 'راسل فريق شهاب: التحرير، الإعلانات، والشراكات.', 'contact', None),
    'newsletter':  ('النشرة البريدية', 'آخر الأخبار وأبرز الملفات في بريدك كل صباح.', 'page', None),
    'privacy':     ('سياسة الخصوصية', 'كيف تتعامل شهاب مع بياناتك وملفات تعريف الارتباط.', 'page', None),
    'terms':       ('شروط الاستخدام', 'شروط استخدام موقع وخدمات وكالة شهاب للأنباء.', 'page', None),
    '404':         ('الصفحة غير موجودة', 'يبدو أن هذه الصفحة خرجت من التغطية.', 'error', None),
    'offline':     ('غير متصل', 'هذه الصفحة محفوظة على جهازك من آخر زيارة.', 'error', None),
    'system-states': ('شهاب — System States', 'مرجع حالات الواجهة: فارغ، تحميل، خطأ، ونماذج.', 'error', None),
    'now':         ('الآن — غرفة أخبار شهاب', 'شاشة واحدة لكل ما يحدث الآن: البث، التحديثات الحية، الخريطة، والأرقام.', 'liveblog', None),
    'map':         ('خريطة الخروقات', 'كل خرق وثّقته شهاب على خريطة القطاع والضفة بالتاريخ والموقع والمصدر.', 'page', None),
    'data':        ('مكتب البيانات', 'أرقام الحرب والوضع الإنساني في غزة والضفة بالمصادر، محدّثة.', 'page', None),
    'saved':       ('المحفوظات', 'المواد التي حفظتها لتقرأها لاحقًا.', 'page', None),
    'hero-options': ('مقترحات هيرو الرئيسية', 'ثلاثة مقترحات لصدر الصفحة الرئيسية: خبر كبير وأربعة أخبار بارزة، بثلاث فكرات مختلفة.', 'page', None),
}
NO_CHROME = {'shorts', 'offline', 'system-states'}   # immersive / standalone pages keep their own frame
CORE_SCRIPTS = ['js/ui.js', 'js/lang.js', 'js/chrome.js', 'js/feed.js', 'js/app.js', 'js/responsive.js', 'js/widgets.js', 'js/livebox.js', 'js/brief.js', 'js/searchbox.js', 'js/push.js', 'js/pwa.js']
PRELOAD_FONTS = ['assets/fonts/almarai-400-arabic.woff2', 'assets/fonts/almarai-700-arabic.woff2',
                 'assets/fonts/almarai-800-arabic.woff2', 'assets/fonts/noto-naskh-arabic-arabic.woff2']
NO_PRERENDER = ['/live.html', '/reels.html', '/shorts.html', '/video-watch.html', '/now.html', '/map.html']

HEAD_RX = re.compile(r'<head>.*?</head>', re.S)
# runs before any stylesheet: the stored language sets lang/dir on <html>, so an
# English visitor never sees an RTL flash. js/lang.js owns the switch itself.
LANG_PRELUDE = ('<script>(function(){try{if(localStorage.getItem("sh-lang")==="en"){'
                'var h=document.documentElement;h.lang="en";h.dir="ltr";h.setAttribute("data-i18n-wait","");'
                'document.write(\'<script src="js/i18n-en.js?v=%s"><\\/script>\');'
                'setTimeout(function(){h.removeAttribute("data-i18n-wait")},1500)}}catch(e){}})()</script>' % V)
# and the stored type size lands on <html> the same way, so css/type.css applies
# from the first paint instead of a beat after it
TYPE_PRELUDE = ('<script>(function(){try{var t=(localStorage.getItem("sh-type")||"").replace(/"/g,"");'
                'if(t==="sm"||t==="lg")document.documentElement.setAttribute("data-sh-type",t)}catch(e){}})()</script>')
HEADER_MARK = re.compile(r'<!-- sh:header -->.*?<!-- /sh:header -->', re.S)
FOOTER_MARK = re.compile(r'<!-- sh:footer -->.*?<!-- /sh:footer -->', re.S)
HEADER_TAG = re.compile(r'<header[^>]*data-screen-label="Header"[^>]*>.*?</header>', re.S)
FOOTER_TAG = re.compile(r'<footer[^>]*data-screen-label="Footer"[^>]*>.*?</footer>', re.S)


def text(s):
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', s)).strip()


def first(rx, s, flags=re.S):
    m = re.search(rx, s, flags)
    return m.group(1) if m else None


def jsonld(page, typ, title, desc, url, html):
    org = {'@type': 'NewsMediaOrganization', 'name': ORG, 'url': SITE,
           'logo': {'@type': 'ImageObject', 'url': SITE + 'assets/images/icon-512.png', 'width': 512, 'height': 512},
           'sameAs': ['https://www.facebook.com/sahpp2023', 'https://twitter.com/ShehabAgency', 'https://www.instagram.com/shehabagency/',
                      'https://www.youtube.com/channel/UChvBXfexWtP5gdGZespJnZw', 'https://t.me/ShehabTelegram', 'https://www.tiktok.com/@shehab_news']}
    crumbs = {'@type': 'BreadcrumbList', 'itemListElement': [
        {'@type': 'ListItem', 'position': 1, 'name': 'الرئيسية', 'item': SITE},
        {'@type': 'ListItem', 'position': 2, 'name': title, 'item': url}]}
    graph = []
    if typ == 'home':
        graph.append({'@type': 'WebSite', 'name': ORG, 'url': SITE, 'inLanguage': 'ar',
                      'potentialAction': {'@type': 'SearchAction', 'target': {'@type': 'EntryPoint', 'urlTemplate': SITE + 'search.html?q={search_term_string}'}, 'query-input': 'required name=search_term_string'}})
        graph.append(org)
    elif typ == 'article':
        img = first(r'class="sh-article-lead-image__span-1">\s*<img[^>]*src="([^"]+)"', html) or OG_IMG
        graph.append({'@type': 'NewsArticle', 'headline': title, 'description': desc, 'image': [img],
                      'datePublished': '2026-09-02T22:06:00+03:00', 'dateModified': '2026-09-02T22:06:00+03:00',
                      'author': {'@type': 'Organization', 'name': 'فريق التقارير — شهاب', 'url': SITE + 'author.html'},
                      'publisher': org, 'mainEntityOfPage': {'@type': 'WebPage', '@id': url},
                      'articleSection': 'غزة', 'inLanguage': 'ar', 'isAccessibleForFree': True})
        graph.append(crumbs)
    elif typ == 'liveblog':
        graph.append({'@type': 'LiveBlogPosting', 'headline': title, 'description': desc, 'url': url,
                      'coverageStartTime': '2026-09-02T06:00:00+03:00', 'datePublished': '2026-09-02T06:00:00+03:00',
                      'dateModified': '2026-09-05T12:00:00+03:00', 'publisher': org, 'inLanguage': 'ar'})
        graph.append(crumbs)
    elif typ == 'video':
        graph.append({'@type': 'VideoObject', 'name': title, 'description': desc, 'thumbnailUrl': [SITE + 'assets/images/video-poster-alhikaya.webp'],
                      'uploadDate': '2026-09-03T23:45:00+03:00', 'publisher': org, 'inLanguage': 'ar', 'url': url})
        graph.append(crumbs)
    elif typ == 'live':
        graph.append({'@type': 'BroadcastEvent', 'name': title, 'description': desc, 'isLiveBroadcast': True,
                      'startDate': '2026-09-05T06:00:00+03:00', 'url': url, 'publishedOn': {'@type': 'BroadcastService', 'name': 'شهاب مباشر', 'broadcaster': org}})
        graph.append(crumbs)
    elif typ == 'gallery':
        graph.append({'@type': 'ImageGallery', 'name': title, 'description': desc, 'url': url, 'publisher': org})
        graph.append(crumbs)
    elif typ == 'profile':
        graph.append({'@type': 'ProfilePage', 'mainEntity': {'@type': 'Person', 'name': title, 'worksFor': org, 'url': url}})
        graph.append(crumbs)
    elif typ == 'about':
        graph.append({'@type': 'AboutPage', 'name': title, 'url': url, 'mainEntity': org})
    elif typ == 'contact':
        graph.append({'@type': 'ContactPage', 'name': title, 'url': url, 'mainEntity': org})
    elif typ in ('collection', 'search'):
        graph.append({'@type': 'CollectionPage', 'name': title, 'description': desc, 'url': url, 'publisher': org, 'inLanguage': 'ar'})
        graph.append(crumbs)
    elif typ == 'page':
        graph.append({'@type': 'WebPage', 'name': title, 'description': desc, 'url': url, 'publisher': org, 'inLanguage': 'ar'})
        graph.append(crumbs)
    if not graph:
        return ''
    return '<script type="application/ld+json">' + json.dumps({'@context': 'https://schema.org', '@graph': graph}, ensure_ascii=False) + '</script>'


def build_head(page, html, old_head):
    title, desc, typ, _ = PAGES[page]
    if not title:
        title = text(first(r'<h1[^>]*>(.*?)</h1>', html) or page)
    if not desc:
        desc = text(first(r'<p class="sh-article-article-intro__p-1">(.*?)</p>', html) or '') or PAGES['index'][1]
    desc = desc[:300]
    url = SITE + ('' if page == 'index' else page + '.html')
    full = ORG + ' — ' + title if page == 'index' else title + ' | ' + ORG
    # keep the page's own stylesheet order; drop the retired ones
    links = re.findall(r'<link rel="stylesheet" href="([^"?]+)[^"]*">', old_head)
    links = [l for l in links if l not in ('css/font-awesome.css',)]
    for extra in ('css/chrome.css', 'css/feed.css'):
        if extra not in links:
            if extra == 'css/feed.css' and 'css/chrome.css' in links:
                anchor = 'css/chrome.css'
            elif 'css/components.css' in links:
                anchor = 'css/components.css'
            else:
                anchor = links[-1]
            links.insert(links.index(anchor) + 1, extra)
    for gen in ('css/type.css', 'css/ltr.css'):
        if gen in links:
            links.remove(gen)
    links.append('css/type.css')  # the type size, generated by tools/type.py
    links.append('css/ltr.css')   # the LTR mirror always loads last
    theme = '#0a1a33' if page in ('shorts', 'now') else '#1b5aa6'
    robots = 'noindex, follow' if typ in ('error', 'search') else 'index, follow, max-image-preview:large'
    ogtype = 'article' if typ == 'article' else 'website'
    out = [
        '<meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
        '<title>%s</title>' % full,
        '<meta name="description" content="%s">' % desc.replace('"', '&quot;'),
        '<meta name="robots" content="%s">' % robots,
        '<link rel="canonical" href="%s">' % url,
        '<meta name="theme-color" content="%s">' % theme,
        TYPE_PRELUDE,
        LANG_PRELUDE,
        '<meta name="color-scheme" content="light">',
        '<link rel="icon" href="assets/images/favicon.svg" type="image/svg+xml">',
        '<link rel="apple-touch-icon" href="assets/images/apple-touch-icon.png">',
        '<link rel="manifest" href="manifest.webmanifest">',
        '<meta property="og:type" content="%s">' % ogtype,
        '<meta property="og:site_name" content="%s">' % ORG,
        '<meta property="og:locale" content="ar_AR">',
        '<meta property="og:title" content="%s">' % title.replace('"', '&quot;'),
        '<meta property="og:description" content="%s">' % desc.replace('"', '&quot;'),
        '<meta property="og:url" content="%s">' % url,
        '<meta property="og:image" content="%s">' % OG_IMG,
        '<meta property="og:image:width" content="1200">',
        '<meta property="og:image:height" content="630">',
        '<meta name="twitter:card" content="summary_large_image">',
        '<meta name="twitter:site" content="@ShehabAgency">',
        '<link rel="alternate" type="application/rss+xml" title="شهاب — كل الأخبار" href="https://shehabnews.com/rss/category/all">',
        '<link rel="alternate" hreflang="ar" href="%s">' % url,
        '<link rel="alternate" hreflang="en" href="https://shehabnews.com/post/category/35/EN">',
    ]
    for f in PRELOAD_FONTS:
        out.append('<link rel="preload" href="%s" as="font" type="font/woff2" crossorigin>' % f)
    for l in links:
        out.append('<link rel="stylesheet" href="%s?v=%s">' % (l, V))
    # a page may carry its own inline style (offline.html is self-contained on
    # purpose: it is served from the cache when nothing else loads)
    for st in re.findall(r'<style>.*?</style>', old_head, re.S):
        out.append(st)
    if typ != 'error':
        rules = {'prerender': [{'where': {'and': [{'href_matches': '/*.html'}, {'not': {'href_matches': NO_PRERENDER}}]}, 'eagerness': 'moderate'}]}
        out.append('<script type="speculationrules">' + json.dumps(rules) + '</script>')
    ld = jsonld(page, typ, title, desc, url, html)
    if ld:
        out.append(ld)
    return '<head>\n' + '\n'.join(out) + '\n</head>'


def partial(name):
    s = open('partials/%s.html' % name, encoding='utf-8').read()
    if s.startswith('<!--'):
        s = s[s.index('-->') + 3:]
    return s.strip()


HEADER = partial('header')
FOOTER = partial('footer')


def sync(page):
    f = page + '.html'
    s = open(f, encoding='utf-8').read()
    # head
    m = HEAD_RX.search(s)
    if m:
        s = s[:m.start()] + build_head(page, s, m.group(0)) + s[m.end():]
    if page not in NO_CHROME:
        hblock = '<!-- sh:header -->\n' + HEADER + '\n<!-- /sh:header -->'
        fblock = '<!-- sh:footer -->\n' + FOOTER + '\n<!-- /sh:footer -->'
        s = re.sub(r'<a class="sh-skip"[^>]*>.*?</a>\s*', '', s, count=1, flags=re.S)
        if HEADER_MARK.search(s):
            s = HEADER_MARK.sub(lambda m: hblock, s, count=1)
        elif HEADER_TAG.search(s):
            s = re.sub(r'[ \t]*<!-- HEADER -->\n?', '', s)
            s = HEADER_TAG.sub(lambda m: hblock, s, count=1)
        else:
            frame = re.search(r'<div[^>]*class="sh-page"[^>]*>', s)
            if frame:
                s = s[:frame.end()] + '\n' + hblock + '\n' + s[frame.end():]
            else:
                print('  ! no page frame for the header in', f)
        if FOOTER_MARK.search(s):
            s = FOOTER_MARK.sub(lambda m: fblock, s, count=1)
        elif FOOTER_TAG.search(s):
            s = FOOTER_TAG.sub(lambda m: fblock, s, count=1)
        else:
            cut = s.find('<script src=')
            if cut < 0:
                cut = s.find('</body>')
            close = s.rfind('</div>', 0, cut)
            if close > 0:
                s = s[:close] + fblock + '\n' + s[close:]
            else:
                print('  ! no page frame for the footer in', f)
    # main landmarks
    mains = list(re.finditer(r'<main\b([^>]*)>', s))
    if mains:
        m0 = mains[0]
        if 'id=' not in m0.group(1):
            s = s[:m0.start()] + '<main id="main"' + m0.group(1) + '>' + s[m0.end():]
        mains = list(re.finditer(r'<main\b([^>]*)>', s))
        if len(mains) > 1:
            for m in reversed(mains[1:]):
                s = s[:m.start()] + '<div data-sh-main-part' + m.group(1) + '>' + s[m.end():]
            closes = [m.start() for m in re.finditer(r'</main>', s)]
            for pos in reversed(closes[1:]):
                s = s[:pos] + '</div>' + s[pos + len('</main>'):]
    # body stamp
    s = re.sub(r'<body(?![^>]*data-sh-page)([^>]*)>', lambda m: '<body data-sh-page="%s"%s>' % (page, m.group(1)), s, count=1)
    # scripts: collect, then rebuild at the end of <body>
    found = re.findall(r'<script src="([^"?]+)[^"]*"([^>]*)></script>', s)
    s = re.sub(r'[ \t]*<script src="[^"]+"[^>]*></script>\n?', '', s)
    modules = set(x for x, attrs in found if 'type="module"' in attrs or x == 'assets/vendor/vidstack/vidstack.js')   # ESM stays ESM
    scripts = [x for x, _ in found]
    extras = [x for x in scripts if x not in CORE_SCRIPTS]
    order = (CORE_SCRIPTS if page not in NO_CHROME else ['js/ui.js', 'js/lang.js']) + extras
    tags = '\n'.join('<script src="%s?v=%s" %s></script>' % (x, V, 'type="module"' if x in modules else 'defer') for x in order)
    s = re.sub(r'\s*</body>', '\n' + tags + '\n</body>', s, count=1)
    # cache-bust
    s = re.sub(r'\?v=\d+', '?v=' + V, s)
    open(f, 'w', encoding='utf-8', newline='\n').write(s)


if __name__ == '__main__':
    done = 0
    for page in PAGES:
        if os.path.exists(page + '.html'):
            sync(page)
            done += 1
    # the service worker's cache name follows the asset version
    sw = open('sw.js', encoding='utf-8').read()
    sw2 = re.sub(r"var VERSION = 'sh-[0-9]+'", "var VERSION = 'sh-%s'" % V, sw, count=1)
    if sw2 != sw:
        open('sw.js', 'w', encoding='utf-8', newline='\n').write(sw2)
    print('synced', done, 'pages; sw cache sh-%s' % V)
