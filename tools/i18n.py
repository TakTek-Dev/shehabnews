# -*- coding: utf-8 -*-
"""tools/i18n.py — what the English dictionary is missing.

js/i18n-en.js maps every Arabic string the site shows to its English twin, and
js/lang.js applies it when the reader has chosen English. This tool walks the
pages, the partials and the scripts, and lists the strings the dictionary does
not know yet, so a text change never silently leaves an Arabic hole.

    python tools/i18n.py            # report
    python tools/i18n.py --all      # report, including html/code fragments

Strings the dictionary cannot help with are normal: text the scripts build out
of numbers is translated piece by piece at runtime, and console messages are
never shown to a reader.
"""
import io
import json
import os
import re
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

AR = re.compile(r'[؀-ۿ]')
SKIP = re.compile(r'<(script|style)\b.*?</\1>', re.S | re.I)
ATTRS = ('alt', 'title', 'aria-label', 'placeholder')
WS = re.compile(r'\s+')
SHOW_ALL = '--all' in sys.argv


HARAKAT = re.compile('[\u064B-\u065F\u0670]')   # the copy may be written without tashkeel


def norm(s):
    return HARAKAT.sub('', WS.sub(' ', s)).strip()


dic = {}
src = io.open('js/i18n-en.js', encoding='utf-8').read()
for m in re.finditer(r'^\s*("(?:[^"\\]|\\.)*")\s*:\s*"(?:[^"\\]|\\.)*",?\s*$', src, re.M):
    dic[norm(json.loads(m.group(1)))] = True
# the chrome translates by key, not by text
chrome = set()
for part in ('header', 'footer'):
    s = io.open('partials/%s.html' % part, encoding='utf-8').read()
    for m in re.finditer(r'<[a-z][^>]*\bdata-i18n="[^"]+"[^>]*>', s):
        # the string may sit after a nested icon, so read to the element's end
        inner = s[m.end():m.end() + 500].split('</a>')[0].split('</span>')[-1].split('</button>')[0].split('</div>')[0]
        for chunk in re.split(r'<[^>]*>', inner):
            t = norm(chunk)
            if t and AR.search(t):
                chrome.add(t)

missing = []
for f in sorted(x for x in os.listdir('.') if x.endswith('.html')):
    s = io.open(f, encoding='utf-8').read()
    body = s.split('<body', 1)[-1]
    body = re.sub(r'<!--.*?-->', '', SKIP.sub('', body), flags=re.S)
    for m in re.finditer(r'>([^<>]+)<', body):
        t = norm(m.group(1))
        if t and AR.search(t) and t not in dic and t not in chrome:
            missing.append((f, t))
    for m in re.finditer(r'\b(%s)="([^"]*)"' % '|'.join(ATTRS), body):
        t = norm(m.group(2))
        if t and AR.search(t) and t not in dic and t not in chrome:
            missing.append((f, t))
for f in sorted(x for x in os.listdir('js') if x.endswith('.js') and x != 'i18n-en.js'):
    s = io.open('js/' + f, encoding='utf-8').read()
    for m in re.finditer(r"'([^'\\\n]*)'|\"([^\"\\\n]*)\"|`([^`\\]*)`", s):
        t = norm(m.group(1) or m.group(2) or m.group(3) or '')
        if t and AR.search(t) and t not in dic and t not in chrome:
            missing.append(('js/' + f, t))

SEP = re.compile(r'\s*[·—|،,]\s*|\s+-\s+|\s*/\s*')
ARRUN = re.compile(r'[؀-ۿ]+(?:[  ][؀-ۿ]+)*')


def runtime_covers(t):
    """js/lang.js also translates a string piece by piece: split on the site's
    separators, then word by word inside a short run. Mirror that here so the
    report only shows what would really stay Arabic."""
    t = re.sub(r'(\d{1,2}:\d{2})\s*[صم](?![؀-ۿ])', lambda m: m.group(1), t)
    if re.match(r'^منذ\s+\d+\s*[؀-ۿ]+$', t):
        return True
    for part in SEP.split(t):
        part = part.strip()
        if not part or not AR.search(part) or part in dic:
            continue
        ok = True
        for run in ARRUN.findall(part):
            if run in dic:
                continue
            words = run.split(' ')
            if len(words) > 4 or not all(w in dic for w in words):
                ok = False
                break
        if not ok:
            return False
    return True


seen, out = set(), []
for f, t in missing:
    if t in seen:
        continue
    seen.add(t)
    code = bool(re.search(r'<[a-z/!]|&\w+;|\{\{|\[شهاب\]', t))
    if (code or runtime_covers(t)) and not SHOW_ALL:
        continue
    out.append((f, t, code))

print('dictionary: %d strings' % len(dic))
print('unknown: %d%s' % (len(out), '' if SHOW_ALL else ' (html/code fragments hidden, use --all)'))
for f, t, code in out:
    print('  %-16s %s%s' % (f, t[:96], '   [fragment]' if code else ''))
