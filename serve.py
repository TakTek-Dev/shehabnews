#!/usr/bin/env python3
"""شهاب — static dev server with HTTP Range support and the live channel.

`python -m http.server` ignores Range requests, so Chrome reports MP4/WebM
files as unseekable (video.seekable is empty): the progress bar cannot scrub
and Vidstack sees a zero duration. Production servers (nginx / Apache /
Laravel) serve ranges; this one does the same locally, adds the HLS / WebVTT
MIME types and disables caching so `?v=N` bumps are never needed while
developing.

It also stands in for the Laravel endpoints the front end talks to:

    GET  /api/events      Server-Sent Events: the live channel (js/feed.js)
    GET  /api/now.json    a snapshot of the same feed
    POST /api/*           accepted with {"ok": true} (newsletter, push, …)

The events come from DemoFeed below: a scripted newsroom that emits an update
every ~25-35s, a breaking story now and then, live-state pulses, a story
update for article 163540 and a reshuffled top list. In production the same
event names come from Laravel (StreamedResponse or Reverb).

Usage:  python serve.py [port]        (default: $PORT, else 5599)
"""
import http.server, mimetypes, os, re, sys, json, time, threading, random, datetime

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get('PORT') or 5599)   # arg > $PORT > 5599
mimetypes.add_type('application/vnd.apple.mpegurl', '.m3u8')
mimetypes.add_type('video/iso.segment', '.m4s')
mimetypes.add_type('video/mp2t', '.ts')
mimetypes.add_type('text/vtt', '.vtt')
mimetypes.add_type('video/webm', '.webm')
mimetypes.add_type('video/mp4', '.mp4')
mimetypes.add_type('font/woff2', '.woff2')
mimetypes.add_type('image/svg+xml', '.svg')
mimetypes.add_type('image/webp', '.webp')
mimetypes.add_type('text/javascript', '.js')
mimetypes.add_type('application/manifest+json', '.webmanifest')
mimetypes.add_type('application/geo+json', '.geojson')


# ====================================================================== feed
class DemoFeed:
    """Numbered events in a ring buffer, so a reconnecting client
    (Last-Event-ID) gets what it missed."""
    POOL = [
        ('غزة', 'مراسل شهاب: قصف مدفعي يستهدف شرق مدينة خانيونس', 'article.html'),
        ('الضفة', 'قوات الاحتلال تقتحم بلدة عزون شرق قلقيلية وتنصب حاجزًا على مدخلها', 'article.html'),
        ('القدس', 'مستوطنون يقتحمون باحات المسجد الأقصى بحماية شرطة الاحتلال', 'article.html'),
        ('غزة', 'الصحة: 3 شهداء وعدد من الإصابات وصلوا مستشفى ناصر خلال الساعة الماضية', 'article.html'),
        ('الأسرى', 'نادي الأسير: الاحتلال يعتقل 14 مواطنًا من الضفة بينهم أسرى محررون', 'article.html'),
        ('لبنان', 'غارة إسرائيلية تستهدف سيارة على طريق النبطية جنوبي لبنان', 'article.html'),
        ('غزة', 'الدفاع المدني: انتشال 4 جثامين من تحت أنقاض منزل في جباليا', 'article.html'),
        ('الضفة', 'إصابات بالاختناق خلال مواجهات في بلدة كفر قدوم شرق قلقيلية', 'article.html'),
        ('دولي', 'الأونروا: مخزون الدقيق في غزة يكفي أسبوعًا واحدًا فقط', 'article.html'),
        ('إسرائيلي', 'القناة 12: اجتماع أمني مصغّر الليلة لبحث الرد على «خروقات» في القطاع', 'article.html'),
    ]
    BREAKING = [
        ('مراسل شهاب: شهيدان بقصف من مسيّرة استهدفت مجموعة مواطنين غرب النصيرات', 'coverage.html'),
        ('الاحتلال يعلن بدء عملية عسكرية موسّعة في مخيم طولكرم', 'coverage.html'),
        ('صفارات الإنذار تدوّي في مستوطنات غلاف غزة', 'coverage.html'),
    ]
    STORY = [
        'وزارة الأوقاف تؤكد لشهاب أن عدد المساجد المدمّرة بلغ 1,246 مسجدًا',
        'مصادر طبية: ارتفاع عدد شهداء قصف جباليا إلى 5',
        'الأونروا تطالب بتحقيق مستقل في استهداف تجمعات الأطفال',
    ]
    TOP = [   # five stories for the «أبرز» list on now.html (the homepage has no top list), with the parts feed.js swaps
        {'t': 'لبنان: ارتفاع حصيلة العدوان الإسرائيلي إلى 4350 شهيدًا و12310 جرحى', 'img': 'https://commons.wikimedia.org/wiki/Special:FilePath/Beirut%20skyline.jpg?width=500', 'by': 'محمد مصطفى شاهين', 'avatar': 'https://shehabnews.com/thumb/300x300/uploads/images/2026/07/ngA17.jpg', 'date': '5 سبتمبر 2026'},
        {'t': 'نعيم: هدم مقر الأونروا بالقدس جريمة حرب وانتهاك صارخ للقانون الدولي', 'img': 'https://commons.wikimedia.org/wiki/Special:FilePath/Kalandia%20checkpoint.jpg?width=500', 'by': 'هلال نصار', 'avatar': 'https://shehabnews.com/thumb/300x300/uploads/images/2022/12/A5qYA.png', 'date': '5 سبتمبر 2026'},
        {'t': 'قناة عبرية: وفد أمريكي يوبخ مسؤولًا إسرائيليًا بسبب عنف المستوطنين بالضفة', 'img': 'https://commons.wikimedia.org/wiki/Special:FilePath/Knesset%20Building%20%28South%20Side%29.JPG?width=500', 'by': 'د. إياد القرا', 'avatar': 'https://shehabnews.com/thumb/300x300/uploads/images/2022/11/EX8f6.png', 'date': '5 سبتمبر 2026'},
        {'t': 'عُمان ترجح إعلان ممر مؤقت في هرمز قريبًا', 'img': 'https://commons.wikimedia.org/wiki/Special:FilePath/Strait%20of%20hormuz.jpg?width=500', 'by': 'د. إياد القرا', 'avatar': 'https://shehabnews.com/thumb/300x300/uploads/images/2022/11/EX8f6.png', 'date': '5 سبتمبر 2026'},
        {'t': 'قوات الاحتلال تفرج عن القيادي رأفت ناصيف من طولكرم', 'img': 'https://commons.wikimedia.org/wiki/Special:FilePath/Tulkarm%202.jpg?width=500', 'by': 'د. أميرة فؤاد النحال', 'avatar': 'https://shehabnews.com/thumb/300x300/uploads/images/2024/10/1Shl3.jpg', 'date': '5 سبتمبر 2026'},
    ]
    LIVE = {'title': 'شهاب مباشر — بث من غزة', 'href': 'live.html'}

    def __init__(self):
        self.lock = threading.Lock()
        self.rnd = random.Random(7)
        self.n = 0
        self.ring = []
        self.i = 0
        self.tick = 0
        self.slot = None
        self.viewers = 3218
        self.on_air = True

    @staticmethod
    def now():
        return datetime.datetime.now().astimezone().isoformat(timespec='seconds')

    def hello(self):
        return dict(self.LIVE, now=self.now(), on_air=self.on_air, viewers=self.viewers)

    def snapshot(self):
        return {'now': self.now(), 'on_air': self.on_air, 'viewers': self.viewers,
                'recent': [{'id': i, 'type': t, 'data': d} for i, t, d in self.ring[-12:]]}

    def interval(self):
        return 20 if self.tick < 2 else 32

    def missed(self, last):
        """A reconnecting client gets everything after its Last-Event-ID; a fresh
        page gets only the last two updates, never old breaking/story events."""
        if last is None:
            return [e for e in self.ring if e[1] == 'update'][-2:]
        try:
            last = int(last or 0)
        except ValueError:
            last = 0
        return [e for e in self.ring if e[0] > last]

    def _push(self, typ, data):
        self.n += 1
        e = (self.n, typ, data)
        self.ring.append(e)
        if len(self.ring) > 80:
            self.ring.pop(0)
        return e

    def since(self, eid):
        return [e for e in self.ring if e[0] > eid]

    def step(self):
        """Generate the next batch once per interval slot, whoever asks first."""
        with self.lock:
            slot = int(time.time() // self.interval())
            if self.slot == slot:
                return
            self.slot = slot
            self.tick += 1
            cat, t, href = self.POOL[self.i % len(self.POOL)]
            self.i += 1
            at = self.now()
            self._push('update', {'id': 'u%d' % (self.n + 1), 't': t, 'cat': cat, 'href': href, 'at': at})
            self.viewers = max(900, self.viewers + self.rnd.randint(-60, 80))
            self._push('live-state', dict(self.LIVE, on_air=self.on_air, viewers=self.viewers))
            if self.tick % 4 == 0:
                bt, bh = self.BREAKING[(self.tick // 4 - 1) % len(self.BREAKING)]
                self._push('breaking', {'id': 'b%d' % (self.n + 1), 't': bt, 'href': bh, 'at': self.now()})
                self._push('ticker', {'t': bt, 'href': bh, 'at': self.now()})   # the ticker carries breaking only
            if self.tick % 3 == 0:
                self._push('story', {'id': '163540', 't': self.STORY[(self.tick // 3 - 1) % len(self.STORY)], 'at': self.now()})
            if self.tick % 5 == 0:
                top = self.TOP[:]
                self.rnd.shuffle(top)
                self._push('top', {'items': [dict(x, href='article.html') for x in top]})


FEED = DemoFeed()


class RangeHandler(http.server.SimpleHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'

    def end_headers(self):
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    # ------------------------------------------------------------- API stubs
    def _json(self, obj, status=200):
        payload = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_POST(self):
        length = int(self.headers.get('Content-Length') or 0)
        body = self.rfile.read(length) if length else b''
        if self.path.startswith('/api/'):
            return self._json({'ok': True, 'endpoint': self.path, 'received': len(body)})
        self.send_error(404)

    def do_GET(self):
        path = self.path.split('?')[0]
        if path == '/api/events':
            return self.sse()
        if path == '/api/now.json':
            return self._json(FEED.snapshot())
        if path == '/api/search':
            from urllib.parse import urlparse, parse_qs
            import search_local
            qs = parse_qs(urlparse(self.path).query)
            q = (qs.get('q') or [''])[0]
            try:
                limit = int((qs.get('limit') or ['8'])[0])
            except ValueError:
                limit = 8
            return self._json(search_local.search(q, max(1, min(limit, 60))))
        if path == '/api/push/key':
            return self._json({'key': ''})          # no VAPID key locally: the client shows local notifications only
        return super().do_GET()

    def sse(self):
        """The live channel: one connection, typed events, replay on reconnect."""
        self.send_response(200)
        self.send_header('Content-Type', 'text/event-stream; charset=utf-8')
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('X-Accel-Buffering', 'no')
        self.end_headers()

        def emit(eid, typ, data):
            self.wfile.write(('id: %s\nevent: %s\ndata: %s\n\n' % (eid, typ, json.dumps(data, ensure_ascii=False))).encode('utf-8'))
            self.wfile.flush()

        try:
            self.wfile.write(b'retry: 4000\n\n')
            emit(FEED.n, 'hello', FEED.hello())
            sent = FEED.n
            for eid, typ, data in FEED.missed(self.headers.get('Last-Event-ID')):
                emit(eid, typ, data)
                sent = max(sent, eid)
            while True:
                for _ in range(15):
                    time.sleep(1)
                    FEED.step()
                    for eid, typ, data in FEED.since(sent):
                        emit(eid, typ, data)
                        sent = eid
                self.wfile.write(b': ping\n\n')
                self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError, OSError):
            return

    # ------------------------------------------------------------ ranges
    def send_head(self):
        path = self.translate_path(self.path)
        if os.path.isdir(path) or not os.path.exists(path):
            return super().send_head()
        m = re.match(r'bytes=(\d*)-(\d*)$', self.headers.get('Range', '') or '')
        if not m:
            return super().send_head()
        size = os.path.getsize(path)
        start, end = m.group(1), m.group(2)
        if start == '' and end == '':
            return super().send_head()
        if start == '':                     # suffix range: last N bytes
            length = min(int(end), size)
            start, end = size - length, size - 1
        else:
            start = int(start)
            end = min(int(end), size - 1) if end else size - 1
        if start >= size or start > end:
            self.send_response(416)
            self.send_header('Content-Range', f'bytes */{size}')
            self.send_header('Content-Length', '0')
            self.end_headers()
            return None
        f = open(path, 'rb')
        f.seek(start)
        self.send_response(206)
        self.send_header('Content-Type', self.guess_type(path))
        self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.send_header('Content-Length', str(end - start + 1))
        self.end_headers()
        self._range_left = end - start + 1
        return f

    def copyfile(self, source, outputfile):
        left = getattr(self, '_range_left', None)
        if left is None:
            return super().copyfile(source, outputfile)
        while left > 0:
            chunk = source.read(min(65536, left))
            if not chunk:
                break
            outputfile.write(chunk)
            left -= len(chunk)
        self._range_left = None

    def log_message(self, fmt, *args):
        if args and ('/assets/video/' in str(args[0]) or '/api/events' in str(args[0])):
            return                          # segments and the SSE stream are noisy
        super().log_message(fmt, *args)


if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass
    print(f'Shehab dev server (HTTP ranges + SSE on) -> http://localhost:{PORT}/')
    http.server.ThreadingHTTPServer(('', PORT), RangeHandler).serve_forever()
