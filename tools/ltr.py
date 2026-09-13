# -*- coding: utf-8 -*-
"""tools/ltr.py — generate css/ltr.css: for every rule in every sheet that assumes RTL
(physical offsets, asymmetric 4-value shorthands, text-align left/right,
translateX steps, directional gradients and positions, floats), emit the
mirrored declarations under html[dir="ltr"], inside the same @media, in the
same cascade layer when the source rule is layered.

Explicit direction: values (isolated numbers, the players) are left alone;
the arrow blade gets an explicit flip at the end.

Run it after any change to a sheet, before tools/chrome.py:
    python tools/ltr.py && python tools/chrome.py
"""
import io
import os
import re
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

ORDER = ['base', 'header', 'widgets', 'footer', 'components', 'chrome', 'feed', 'mark', 'brief', 'gallery', 'player', 'system-states', 'responsive']
sheets = ['css/%s.css' % n for n in ORDER if os.path.exists('css/%s.css' % n)]
sheets += sorted('css/pages/' + f for f in os.listdir('css/pages') if f.endswith('.css'))

SWAP = {'left': 'right', 'right': 'left'}
PHYS = {'margin-left': 'margin-right', 'margin-right': 'margin-left', 'padding-left': 'padding-right', 'padding-right': 'padding-left',
        'border-left': 'border-right', 'border-right': 'border-left', 'border-left-color': 'border-right-color', 'border-right-color': 'border-left-color',
        'border-left-width': 'border-right-width', 'border-right-width': 'border-left-width', 'left': 'right', 'right': 'left'}
RESET = {'margin-left': '0', 'margin-right': '0', 'padding-left': '0', 'padding-right': '0', 'border-left': '0', 'border-right': '0',
         'border-left-color': 'transparent', 'border-right-color': 'transparent', 'border-left-width': '0', 'border-right-width': '0', 'left': 'auto', 'right': 'auto'}


def split_decls(body):
    out, cur, depth, q = [], '', 0, None
    for ch in body:
        if q:
            cur += ch
            if ch == q: q = None
            continue
        if ch in '"\'': q = ch; cur += ch; continue
        if ch == '(': depth += 1
        elif ch == ')': depth -= 1
        if ch == ';' and depth == 0:
            out.append(cur); cur = ''
        else:
            cur += ch
    if cur.strip(): out.append(cur)
    res = []
    for d in out:
        if ':' not in d: continue
        p, v = d.split(':', 1)
        res.append((p.strip(), v.strip()))
    return res



def top_split(val):
    """Split a value on whitespace outside parentheses, so a calc() or var()
    stays one token."""
    out, buf, depth = [], '', 0
    for ch in val:
        if ch == '(':
            depth += 1
        elif ch == ')':
            depth -= 1
        if ch.isspace() and depth == 0:
            if buf:
                out.append(buf)
            buf = ''
        else:
            buf += ch
    if buf:
        out.append(buf)
    return out

def mirror(prop, val):
    """return a list of (prop, val) for LTR, or [] when nothing is direction-bound"""
    imp = ''
    if '!important' in val:
        val = val.replace('!important', '').strip(); imp = '!important'
    out = []
    if prop in PHYS:
        out.append((PHYS[prop], val + imp)); out.append((prop, RESET[prop] + imp))
        return out
    if prop in ('margin', 'padding', 'inset', 'border-width', 'border-style', 'border-color'):
        vals = top_split(val)   # `0 calc(50% - 50vw)` is two values, not four
        if len(vals) == 4 and vals[1] != vals[3]:
            out.append((prop, ' '.join([vals[0], vals[3], vals[2], vals[1]]) + imp))
        return out
    if prop == 'direction' and val.strip() == 'rtl':
        return [(prop, 'ltr' + imp)]
    if prop == 'text-align' and val in SWAP:
        return [(prop, SWAP[val] + imp)]
    if prop in ('float', 'clear') and val in SWAP:
        return [(prop, SWAP[val] + imp)]
    if prop == 'transform' and 'translateX(' in val:
        nv = re.sub(r'translateX\(\s*(-?[\d.]+)(px|%|em|rem)\s*\)', lambda m: 'translateX(%s%s)' % (('-' + m.group(1)) if not m.group(1).startswith('-') else m.group(1)[1:], m.group(2)), val)
        return [(prop, nv + imp)] if nv != val else []
    if prop in ('background', 'background-image') and re.search(r'to (left|right)\b', val):
        nv = re.sub(r'to (left|right)\b', lambda m: 'to ' + SWAP[m.group(1)], val)
        return [(prop, nv + imp)]
    if prop in ('background-position', 'object-position') and re.search(r'\b(left|right)\b', val):
        nv = re.sub(r'\b(left|right)\b', lambda m: SWAP[m.group(1)], val)
        return [(prop, nv + imp)]
    if prop == 'transform-origin' and re.search(r'\b(left|right)\b', val):
        nv = re.sub(r'\b(left|right)\b', lambda m: SWAP[m.group(1)], val)
        return [(prop, nv + imp)]
    return out


def mirror_all(decls):
    """whole-rule mirror: when a rule sets both sides (left AND right, or both
    margins) the values swap; a lone side moves over and its origin resets"""
    props = dict(decls)
    out, done = [], set()
    for p, v in decls:
        if p in PHYS:
            partner = PHYS[p]
            if partner in props:
                if p in done:
                    continue
                out.append((partner, props[p])); out.append((p, props[partner]))
                done.add(p); done.add(partner)
            else:
                out.extend(mirror(p, v))
            continue
        out.extend(mirror(p, v))
    return out


def walk(css, layer=None, media=None, acc=None):
    """recursive rule walk; acc collects (layer, media, selector, decls)"""
    i = 0; n = len(css)
    while i < n:
        j = css.find('{', i)
        if j < 0: break
        k = j; lvl = 0
        while k < n:
            if css[k] == '{': lvl += 1
            elif css[k] == '}':
                lvl -= 1
                if lvl == 0: break
            k += 1
        head = re.sub(r'/\*.*?\*/', '', css[i:j], flags=re.S).strip()
        body = css[j + 1:k]
        if head.startswith('@media') or head.startswith('@supports'):
            walk(body, layer, head if media is None else media + ' and ' + head.replace('@media', '').strip(), acc)
        elif head.startswith('@layer') and body.strip():
            walk(body, head.replace('@layer', '').strip(), media, acc)
        elif head.startswith('@'):
            pass
        else:
            acc.append((layer, media, head, body))
        i = k + 1
    return acc


out = ['/* شهاب — LTR mirror. Generated by genltr.py from every sheet: each rule that',
       '   assumes RTL is mirrored here under html[dir="ltr"], in the same @media and',
       '   the same cascade layer. Load it last. Do not edit by hand: re-run the',
       '   generator after a sheet changes. Logical properties elsewhere flip on',
       '   their own; explicit direction: values (isolated numerals, the players) stay. */', '']
DIR_RTL = re.compile(r'(?:html)?\[dir="rtl"\]\s*')
count = 0
for sh in sheets:
    css = re.sub(r'/\*.*?\*/', '', io.open(sh, encoding='utf-8').read(), flags=re.S)
    rules = walk(css, None, None, [])
    # a rule with an [dir="rtl"] sibling that sets the same property to a *different*
    # value was authored LTR-first: the sibling is the RTL correction, so the base
    # rule already says what LTR wants and must not be mirrored again. When the two
    # agree the sibling is merely redundant and the base is RTL like everything else.
    rtl_sib = {}
    for layer, media, sel, body in rules:
        if DIR_RTL.search(sel):
            key = (media, ','.join(DIR_RTL.sub('', s).strip() for s in sel.split(',')))
            rtl_sib.setdefault(key, {}).update(dict(split_decls(body)))
    block = []
    for layer, media, sel, body in rules:
        if sel.startswith('html[dir="ltr"]') or DIR_RTL.search(sel):
            continue
        decls = split_decls(body)
        # `direction: ltr` isolates a latin or numeric run and reads the same in
        # both languages, so it is left alone — and so is the text alignment of
        # the rule that carries it. `direction: rtl` is the page direction
        # restated inside a player, a toast or a shadow tree, and has to flip:
        # without it an English line there renders with its punctuation reversed.
        isolated = any(p == 'direction' and v.strip().startswith('ltr') for p, v in decls)
        decls = [(p, v) for p, v in decls
                 if not (p == 'direction' and v.strip().startswith('ltr'))
                 and not (isolated and p == 'text-align')]
        sib = rtl_sib.get((media, ','.join(x.strip() for x in sel.split(','))), {})
        decls = [(p, v) for p, v in decls if not (p in sib and sib[p] != v)]
        m = mirror_all(decls)
        if not m:
            continue
        sels = ', '.join('html[dir="ltr"] ' + s.strip() for s in sel.split(','))
        line = '%s{%s}' % (sels, ';'.join('%s:%s' % d for d in m))
        if media:
            line = '%s{%s}' % (media, line)
        block.append((layer, line)); count += 1
    if block:
        out.append('/* ---- %s ---- */' % sh)
        plain = [l for lay, l in block if not lay]
        out.extend(plain)
        for lay in sorted(set(lay for lay, l in block if lay)):
            out.append('@layer %s{' % lay)
            out.extend('  ' + l for lay2, l in block if lay2 == lay)
            out.append('}')
        out.append('')

out += ['/* ---- hand-written: the forward arrow and the caret ---- */',
        '/* the arrow blade points left (forward in RTL); in LTR forward is right */',
        'html[dir="ltr"] .sh-more__arrow{transform:scaleX(-1)}',
        'html[dir="ltr"] .sh-more:hover .sh-more__arrow{transform:scaleX(-1) translateX(-3px)}',
        'html[dir="ltr"] .sh-lang__opt[dir="ltr"]{direction:ltr}',
        '/* the visually-hidden 1px box lands past the right edge in LTR */',
        'html[dir="ltr"] .sr-only{inset-inline-start:0}',
        '',
        '/* ---- hand-written: sideways motion. Mirroring a keyframe means negating',
        '   both the angle and the X step, so each one gets an LTR twin. Only the',
        '   two that actually run are twinned; centring translates are untouched.',
        '   The masthead meteor is not one of them: it rides an offset-path from the',
        '   right into the ش, which sits on the right of the wordmark in both',
        '   directions, so header.css serves LTR as it is. ---- */',
        '@keyframes sh-fx-marquee-ltr{from{transform:translateX(0)}to{transform:translateX(-50%)}}',
        'html[dir="ltr"] .sh-fx__track{animation-name:sh-fx-marquee-ltr}',
        '@keyframes sh-paper-out-ltr{0%{transform:translateX(-28%);opacity:0}100%{transform:translateX(0);opacity:1}}',
        'html[dir="ltr"] .sh-index-files__div-4{animation-name:sh-paper-out-ltr}',
        '',
        '/* the hub deck: what is coming waits on the reading side, so the pile, the',
        '   read card and the page-turn chevrons all flip with the page */',
        'html[dir="ltr"] .sh-hubcard{transform:translateX(calc(var(--o) * 22px)) scale(calc(1 - var(--o) * .035));transform-origin:100% 50%}',
        'html[dir="ltr"] .sh-hubcard[data-state="past"]{transform:translateX(-115%) rotate(-3deg)}',
        '@media (max-width:760px){html[dir="ltr"] .sh-hubcard{transform:translateX(calc(var(--o) * 14px)) scale(calc(1 - var(--o) * .03))}}',
        'html[dir="ltr"] .sh-hubview__chip .sh-i{transform:scaleX(-1)}',
        'html[dir="ltr"] .sh-pane__turn .sh-i{transform:scaleX(-1)}',
        '',
        '/* city and clock are adjacent spans with no whitespace between the tags:',
        '   the RTL bidi boundary spaces them, LTR runs them together */',
        'html[dir="ltr"] .sh-topbar__meta [data-sh="clock"]{margin-inline-start:6px}',
        '']
io.open('css/ltr.css', 'w', encoding='utf-8', newline='').write('\n'.join(out))
print('css/ltr.css: %d mirrored rules from %d sheets, %d bytes' % (count, len(sheets), len('\n'.join(out).encode('utf-8'))))
