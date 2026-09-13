---
name: شهاب — Shehab News Agency
description: The agency's white page — the photograph and the headline carry it, everything else is set in type; navy speaks, blue points, red is news.
colors:
  brand-navy: "#0a1a33"
  brand-navy-2: "#0f2a4f"
  brand-blue: "#1b5aa6"
  brand-blue-deep: "#164b8a"
  brand-sky: "#7ea8dd"
  surface: "#ffffff"
  surface-warm: "#fbfaf7"
  surface-soft: "#f5f7fa"
  surface-blue: "#edf2f8"
  text: "#14233a"
  text-2: "#4a5568"
  text-muted: "#5d6b7d"
  text-faint: "#8a95a6"
  border: "#d5dde8"
  border-soft: "#eef2f7"
  red: "#e0302f"
  red-soft: "#bf2f32"
  on-dark: "#ffffff"
  on-dark-80: "rgba(255,255,255,.8)"
  on-dark-72: "rgba(255,255,255,.72)"
  on-dark-60: "rgba(255,255,255,.6)"
  on-dark-30: "rgba(255,255,255,.3)"
  on-dark-line: "rgba(255,255,255,.14)"
  on-dark-08: "rgba(255,255,255,.08)"
  scrim: "rgba(10,26,51,.86)"
typography:
  display:
    fontFamily: "Neue Helvetica Arabic, Almarai, system-ui, sans-serif"
    fontSize: "clamp(30px, 3.6vw, 46px)"
    fontWeight: 800
    lineHeight: 1.32
    letterSpacing: "normal"
  headline:
    fontFamily: "Neue Helvetica Arabic, Almarai, system-ui, sans-serif"
    fontSize: "clamp(21px, 1.9vw, 25px)"
    fontWeight: 800
    lineHeight: 1.5
    letterSpacing: "normal"
  title:
    fontFamily: "Neue Helvetica Arabic, Almarai, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: 1.65
    letterSpacing: "normal"
  dek:
    fontFamily: "Neue Helvetica Arabic, Almarai, sans-serif"
    fontSize: "calc(19px * var(--reader-scale, 1))"
    fontWeight: 400
    lineHeight: 1.9
    letterSpacing: "normal"
  body:
    fontFamily: "Neue Helvetica Arabic, Almarai, sans-serif"
    fontSize: "calc(18px * var(--reader-scale, 1))"
    fontWeight: 400
    lineHeight: 2.05
    letterSpacing: "normal"
  quote:
    fontFamily: "Neue Helvetica Arabic, Almarai, system-ui, sans-serif"
    fontSize: "clamp(20px, 1.85vw, 25px)"
    fontWeight: 700
    lineHeight: 1.7
    letterSpacing: "normal"
  label:
    fontFamily: "Neue Helvetica Arabic, Almarai, system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 800
    lineHeight: 1.7
    letterSpacing: "normal"
rounded:
  none: "0"
  dot: "50%"
spacing:
  gutter: "32px"
  gutter-1200: "24px"
  gutter-640: "16px"
  gutter-380: "12px"
  para: "26px"
  section: "48px"
  band: "56px"
components:
  button-more:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.brand-navy}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "7px 12px 7px 11px"
  button-more-hover:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.brand-blue}"
  button-cta:
    backgroundColor: "{colors.brand-navy}"
    textColor: "{colors.on-dark}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 24px"
    height: "44px"
  button-cta-hover:
    backgroundColor: "{colors.brand-blue}"
  button-cta-blue:
    backgroundColor: "{colors.brand-blue}"
    textColor: "{colors.on-dark}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 22px"
    height: "44px"
  button-cta-blue-hover:
    backgroundColor: "{colors.brand-blue-deep}"
  button-share:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.brand-navy}"
    rounded: "{rounded.none}"
    size: "38px"
  button-share-hover:
    backgroundColor: "{colors.brand-navy}"
    textColor: "{colors.on-dark}"
  button-rail:
    backgroundColor: "transparent"
    textColor: "{colors.brand-navy}"
    rounded: "{rounded.none}"
    width: "56px"
    height: "54px"
  button-rail-hover:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.brand-blue}"
  button-rail-pressed:
    backgroundColor: "{colors.brand-navy}"
    textColor: "{colors.on-dark}"
  chip-category:
    backgroundColor: "{colors.brand-blue}"
    textColor: "{colors.on-dark}"
    rounded: "{rounded.none}"
    padding: "4px 12px"
  input-search:
    backgroundColor: "{colors.on-dark-08}"
    textColor: "{colors.on-dark}"
    rounded: "{rounded.none}"
    height: "38px"
  input-search-focus:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.brand-navy}"
  nav-link:
    textColor: "rgba(255,255,255,.86)"
    padding: "13px 0 11px"
  nav-link-hover:
    textColor: "{colors.on-dark}"
  pager-current:
    backgroundColor: "{colors.brand-blue}"
    textColor: "{colors.on-dark}"
    rounded: "{rounded.none}"
    size: "36px"
  toast:
    backgroundColor: "{colors.brand-navy}"
    textColor: "{colors.on-dark}"
    rounded: "{rounded.none}"
    padding: "12px 18px"
---

# Design System: شهاب — Shehab News Agency

## Overview

**Creative North Star: "The Field Desk"**

A correspondent's desk at a Palestinian news agency: the photograph laid flat on white paper, the headline written over it in a heavy hand, the figures and the quote typed beside it, nothing framed. The page is white and dense the way a newspaper page is dense — it fills its width with real content and sizes every block to its importance — and it separates things with air, type scale and the picture, never with lines or boxes. Two colours do the talking: navy for whatever speaks (headlines, fills, the one dark band on a page) and brand blue for whatever points (links, the ش blade, the current state, the hover). Red is reserved for news itself: breaking and live.

One Arabic face does all the work: Neue Helvetica Arabic, the face shehabnews.com itself serves. Its Bold names things — headlines, labels, buttons, captions, numerals — and its Regular is what gets read: deks and paragraphs on a measure of about sixty characters with generous leading and a reader-controlled scale. The calligraphic ش blade traced from the wordmark is the only ornament the system allows; it marks a heading, ends a report, counts the pictures and, as its arrow variant, points forward (leftward, this being an RTL page).

The system is phone-first and laptop-demo second: everything is verified at 375 and 1280. Corners are square, surfaces are flat, photographs are shown whole inside frames that take the picture's ratio, and every veil laid over a photograph is navy, never black. Confirmed rejections: decorative hairlines, card top-rules, ghost numerals, decorative circles, framed panels and any second dark band — the client reads those as machine output.

**Key Characteristics:**
- White page, one navy band at most, tonal tints (soft, warm, blue) instead of boxes
- Navy speaks, blue points, red is news; hover on white goes to blue, hover on the blue chrome goes to white
- Neue Helvetica Arabic throughout: Bold for naming, Regular for reading, equal-width numerals
- Square corners, flat surfaces, photographs whole at fixed ratios on a navy-2 ground
- The ش blade as the single ornament, in four sizes and one arrow variant
- Arabic RTL with logical properties; 44px targets and a 12px text floor on phones

## Colors

A small, levelled palette: a white canvas with three tints, a navy/blue/sky brand trio, three text weights, two lines, and an editorial red pair — every colour has a job and nine greys were refused on purpose.

### Primary
- **Shehab Navy** (`{colors.brand-navy}`): the voice of the page — article headline and section headings, the avatar tile, filled CTAs, the toast, the footer, the one full-bleed band per page, and every veil laid over a photograph. Pressed state of the reader rail and the share squares.
- **Deep Navy** (`{colors.brand-navy-2}`): the ground behind every photograph frame while it loads, the topbar, and surfaces inside dark blocks.
- **Brand Blue** (`{colors.brand-blue}`): the pointer — the masthead, links, the ش mark, the endmark, the active picture mark, the pull-quote glyph, the current pager cell, the category chip, tags, selected states and the hover colour of anything on white. Text and mark colour of blue meta lines.
- **Pressed Blue** (`{colors.brand-blue-deep}`): the one hover/pressed for blue-filled controls.
- **Sky** (`{colors.brand-sky}`): text, marks, outlines and focus rings on navy; the 3px reading-progress bar; hover colour of titles on a navy band.

### Secondary
- **Breaking Red** (`{colors.red}`): breaking only — the ticker tag, the hero badge, the live dot beside "يحدث الآن" and the next-read band.
- **Live Red** (`{colors.red-soft}`): the live word and its dot, the masthead "بث مباشر" button, the "آخر تحديث" note, the timeline mark.

### Neutral
- **Page White** (`{colors.surface}`): the canvas, the ticker, the search field on focus, the more-button ground.
- **Warm Paper** (`{colors.surface-warm}`): editorial paper for the files shelf, dossier covers and the feature band on files pages.
- **Soft Light** (`{colors.surface-soft}`): cool tint for secondary panels, the share squares at rest, control hover, and the after-reading band at the foot of an article.
- **Blue Tint** (`{colors.surface-blue}`): functional tint — text selection, selected rows, live hover, the story-updates panel in feeds.
- **Ink** (`{colors.text}`): body copy and card titles on white.
- **Ink 2** (`{colors.text-2}`): deks, captions, context lists, secondary copy.
- **Muted** (`{colors.text-muted}`): the only muted small text — meta lines, timestamps, counters, labels (5.4:1 on white).
- **Faint** (`{colors.text-faint}`): the meta separator dot and the placeholder in the focused search field; never copy.
- **Line** (`{colors.border}`): the hairline on boxed controls (more-button, pager, folder edges) and the resting picture marks.
- **Soft Line** (`{colors.border-soft}`): row dividers inside lists — functional separation only.
- **On Dark** (`{colors.on-dark}` / `{colors.on-dark-80}` / `{colors.on-dark-72}` / `{colors.on-dark-60}`): text on navy and blue by opacity — primary, the topbar and nav hover, secondary (next-read meta, footer copy), tertiary (legal, placeholders).
- **On-Dark Outline / Line / Field** (`{colors.on-dark-30}` / `{colors.on-dark-line}` / `{colors.on-dark-08}`): 1px outlines on navy (search, brief button, next-read button, footer social), hairlines inside dark blocks, and the ground of fields on the blue chrome.
- **Scrim** (`{colors.scrim}`): the one veil under text laid directly on a picture (zoom hint, badges); gradient scrims run from `rgba(10,26,51,.96)` to transparent.

The five desk accents in `tokens.css` (politics, war, land, economy, rights) are reserved for the files desks and are painted on one data page only; they are not part of the page palette.

### Named Rules
**The Navy Speaks, Blue Points Rule.** Navy is for what speaks — headings, fills, the band; blue is for what points — links, marks, current and hover states. On white, hover goes to blue; on the blue masthead and navy chrome, hover goes to white, never to blue.

**The Red Is News Rule.** Breaking red and live red appear only on breaking and live elements. Red is never a CTA, never decoration, never a highlight.

**The One Band Rule.** A page carries at most one navy band, drawn full-bleed from inside the container with `box-shadow: 0 0 0 100vmax` and `clip-path: inset(0 -100vmax)`. A photograph under a navy scrim is a picture, not a band.

**The Navy Veil Rule.** Any veil under text on a photograph is navy at an opacity, never black; shadows may be black, scrims may not.

## Typography

**Display Font:** Neue Helvetica Arabic Bold (with Almarai, system-ui, sans-serif), self-hosted; the Bold file answers every weight from 500 to 900
**Body Font:** Neue Helvetica Arabic Regular (with Almarai, sans-serif), self-hosted; the Regular file answers 100 to 499
**Label/Mono Font:** none distinct — labels are the Bold with `font-variant-numeric: tabular-nums`

The face is Monotype's *Helvetica Neue ME for SKY W21*, the two files shehabnews.com serves, used under the agency's licence with Monotype: it is not a free font and must not leave Shehab's sites. Almarai stays in every stack as the fallback; Noto Naskh Arabic, the former reading face, is retired (September 2026).

**Character:** One modern Arabic sans, the agency's own, in two weights. The weight is the hierarchy: the eye finds the Bold lines (headline, headings, labels, numerals) at a glance and settles into the Regular paragraphs for the long read. The face is never tracked or uppercased.

### Hierarchy
- **Display** (800, `clamp(30px, 3.6vw, 46px)`, 1.32, `text-wrap: balance`): the article headline in navy on white; on a navy hero it grows to `clamp(36px, 3.8vw, 52px)` at 1.15 in white. On phones `clamp(26px, 7.4vw, 30px)` at 1.4.
- **Headline** (800, `clamp(21px, 1.9vw, 25px)`, 1.5): section headings inside the report and the page's section heads (19–24px), always navy, always with the 16×13 blue ش blade in front of them.
- **Title** (700, 14.5–17px, 1.5–1.65, `text-wrap: pretty`): story titles on tiles and rows — navy or ink at rest, blue on hover; the lead tile of a grid takes 800.
- **Dek** (Regular 400, `19px × --reader-scale`, 1.9, ink 2, `max-width: 56ch`): the standfirst under the headline; 16.5px on phones.
- **Body** (Regular 400, `18px × --reader-scale`, 2.05, ink): paragraphs on a column of at most 542px (about sixty characters); the lede is 1.1em at 1.95 in navy; 17px at 1.95 on phones.
- **Quote** (Bold, `clamp(20px, 1.85vw, 25px)`, 1.7, navy): the one highlighted line in a report, led by a 30px blue quote glyph.
- **Label** (Bold, 11–12.5px, 1.7, muted or blue, tabular numerals): meta lines, captions (12.5px ink 2), counters, rail labels, chips. Rises to 12.5px on phones; nothing under 12px there.
- **Figure numerals** (Bold, navy, 1.05em inside reading lists; 22px blue in ranked lists; 34–40px for years and file numbers): the number leads the sentence.

### Named Rules
**The One Face Rule.** Neue Helvetica Arabic everywhere. The Bold for anything that names — headline, headings, labels, buttons, captions, numerals; the Regular for anything that is read — deks and paragraphs. Never the reverse, and never a second family on a page.

**The Sixty Characters Rule.** Reading text sits on a measure of about sixty characters with line-height of 1.9 or more, and it scales with the reader: `--reader-scale` steps 0.92 / 1 / 1.12 / 1.26 multiply body and dek only.

**The Tabular Rule.** Neue Helvetica Arabic's digits are equal-width by default (every Latin digit is 1139 units; the font carries `pnum` but no `tnum`), so `tabular-nums` is declared as intent but moves nothing today; a number that must hold its width while it ticks (a clock, a counter) gets a fixed-width cell. Every Latin or numeric run inside Arabic (counters like "1 / 3", currency pairs, file numbers) is isolated with `direction: ltr; unicode-bidi: isolate`.

## Layout

The container is 1400px (1336px of content) with a `--sh-gutter` of 32px that steps to 24px under 1200, 16px under 640 and 12px under 380; content fills 1366–1536 laptops and stays framed on 1920. The page is RTL: all offsets are logical (`inset-inline-start`, `margin-inline`), every grid child carries `min-width: 0`, and SVG icons size from the font-size of their line (`1em`, `currentColor`).

Shared breakpoints, content-driven: 1200 (gutters tighten), 1024 (fixed sidebars leave the side), 900 (nav becomes touch navigation), 640 (every multi-column grid becomes one column), 380 (smallest supported width). Page sheets add their own where the layout breaks — the article's split screen exists from 1000px up.

Spatial model on a report: a two-column split of `minmax(0, 624px) minmax(0, 1fr)` with a 52px gap (584px / 40px under 1200). The text column is itself `56px minmax(0, 1fr)` with a 26px gap — a vertical tool rail on the far right, the words beside it. Both the rail and the picture pane are sticky at `calc(var(--sh-compact-h, 100px) + 26px)`, the compact header's height plus one column gap. Under 1000px the pane disappears, the pictures return to the text as figures, and on phones the order is headline, dek, byline, the lead photograph edge to edge (negative gutter margins), then the tools in one row, then the body.

Rhythm is set by the type, not a scale: paragraphs 26px apart (22 on phones); headings 44px above and 16px below; the quote and the context block 40px clear; 34px before the tags; 48px before a related grid; 56px before a band. Section heads are a baseline-aligned flex row with 8px below and no rule. Grids are dense: 3 columns at 24–28px gaps on laptops, a 12-column editorial grid for the photo desk, 4 columns for archives — all to one column at 640 (related tiles become a 136px picture beside the title at 760).

Density is the newspaper's: no blank areas, no oversized blocks, titles only unless a dek earns its place, and real photographs shown whole.

### Named Rules
**The Sticky Offset Rule.** Anything pinned sits at `calc(var(--sh-compact-h, 100px) + 26px)` — the compact header plus one column gap — so pinned things never hide behind the chrome.

**The Min-Width-Zero Rule.** Every grid and flex child that holds text gets `min-width: 0`; a headline may never widen a column.

## Elevation & Depth

The page is flat. Depth comes from four things: the photograph itself, the navy-2 ground it loads on, the one navy band, and the three tints (soft, warm, blue) laid on white without borders. Nothing that sits in the flow casts a shadow. Shadows belong only to things that float above the page — the nav dropdown, the toast, the to-top control, the skip link, lightbox and hub frames — and to the "print" objects of the files world (a hero cover, a feature cover, a folder on its shelf), where the shadow is part of the metaphor. Text laid on a picture always sits on a navy gradient scrim, and a badge on a picture sits on a navy plate.

### Shadow Vocabulary
- **Float** (`box-shadow: 0 14px 30px rgba(10,26,51,.28)`): the nav dropdown; the toast uses `0 12px 32px rgba(10,26,51,.3)`, the to-top control `0 8px 24px rgba(10,26,51,.18)`.
- **Lift** (`box-shadow: 0 10px 24px rgba(10,26,51,.16)`): a collection cover at rest; it rises 3px on hover.
- **Print** (`box-shadow: 0 30px 56px -26px rgba(10,26,51,.5)`): a cover object on a light band; on the navy hero `0 34px 70px -24px rgba(0,0,0,.75)`.
- **Paper** (`box-shadow: 0 1px 2px rgba(10,26,51,.06), 0 10px 20px -14px rgba(10,26,51,.22)`): a folder standing on its shelf; deepens to `-14px .28` when open.
- **Overlay frame** (`box-shadow: 0 30px 80px rgba(0,0,0,.38)`): a modal frame over the `rgba(10,26,51,.7)` blurred veil.
- **Band bleed** (`box-shadow: 0 0 0 100vmax <band colour>` + `clip-path: inset(0 -100vmax)`): not a shadow — the device that lets a band run full-bleed from inside the container.

### Named Rules
**The Flat Page Rule.** Surfaces in the flow have no shadow, no border and no frame. A shadow means the thing is above the page or is a physical print; nothing else earns one.

## Shapes

Square. `border-radius` is 0 everywhere; the only circles are live dots (5–7px), the pulse rings around them and the binder rings — the shape means "alive" or "bound", never "soft". Boxed controls take a 1px line in `{colors.border}` on white or `{colors.on-dark-30}` on navy; the current or hovered control fills solid.

Photographs live in frames that take the picture's ratio, not the viewport's: 3:2 for the report's pictures and its sticky stage, 16:9 for story tiles, 16:10 for related tiles, 4:3 for thirds and phone leads, 4:5 and 3:4 for covers, 21:9 for a major picture. The frame is `overflow: hidden` on a navy-2 ground; the picture fills it with `object-fit: cover` and an authored `object-position`; a picture is never stretched and never cropped to fill a viewport.

The ش blade is the house glyph: the three dots of the wordmark's ش, applied as a CSS mask so any `background` colour paints it. It comes in four sizes — 12×10 and 13×11 (endmark, inline before a link), 14×12 (pane marks, labels on dark), 16×13 (the `--md` mark before a heading) — and one arrow variant (14px wide, aspect 100:41.59) that points forward, i.e. leftward, and steps 3px forward on hover. Below 8px the old rotated square remains as a bullet (4–6px), never as a mark. The one permitted rule-line is the intro signature: a 2px ink rule with a 120px blue segment and a 6px rotated square, at most once per page on the page's intro head.

Tabs and tags are cut with `clip-path` rather than drawn with radius: the ticker's breaking tag carries a 10px notch, a folder tab is a trapezoid, a brand tab is a parallelogram.

### Named Rules
**The Square Rule.** No radius, anywhere. A circle is a live dot, a ring, or the play disc — the one round control, always on a picture: 56px in brand blue with a soft navy shadow on a stage (`.sh-vid__big`), 24–48px as a hairline disc on the navy scrim on a card (`.sh-reels-grid__play`), blue on hover. Nothing else is round.

**The Whole Photograph Rule.** The frame takes the picture's ratio; the picture fills the frame on a navy-2 ground. Never stretched, never cropped to fit a viewport, never a decorative crop.

**The One Ornament Rule.** The ش blade is the only ornament — before a heading, at the end of a report, as the picture counter, as the forward arrow. No other glyph, rule, circle or flourish decorates a page.

## Components

Everything on the page is set in type on white; controls are square, flat and typed in the Bold; state is shown by swapping navy and blue, never by a radius or a shadow.

### Buttons
- **Shape:** square (`0`), 1px line or solid fill, the Bold at 12–13px, 44px minimum height for filled CTAs and every target on phones.
- **More («المزيد»):** the house link — `.sh-more`: text set in the Bold at 12px in the colour of its context (navy in a section head, blue in a body), the arrow blade at 13px pointing forward after an 8px gap, 8px of vertical padding for the target. Hover: a 1px underline offset 5px and the arrow steps 3px forward. No box, no line, no ground.
- **Primary CTA:** navy fill, white label 13px 800, `0 24px`, 44px tall, the blade or arrow after the label at a 12px gap. Hover: fill turns blue and the gap opens to 18px. The blue variant (`{colors.brand-blue}` fill) hovers to pressed blue.
- **Outlined on navy:** 1px `{colors.on-dark-30}` line, white label 12.5px 800, `10px 16px`; hover fills blue with a blue line (the next-read button).
- **Square icon buttons:** 38px squares on soft light with a navy icon at 14px (share row); 44px at the article's end and on phones; hover fills navy with a white icon. Pager cells are 36px hairline squares; the current one fills blue.
- **Reader rail:** 56×54 vertical icon-over-label buttons, transparent, navy, 11px 800; hover soft ground and blue; pressed fills navy; disabled at .35 opacity. On phones the rail becomes one row of 44px pills at 12.5px.
- **Live («بث مباشر»):** live-red fill, white 13px 800, 38px tall, its icon pulsing at 2.2s.
- **Focus:** `outline: 2px solid {colors.brand-blue}; outline-offset: 2px` on light; sky on navy; white on red. Always visible, never removed.

### Chips
- **Style:** a category chip is a blue fill with white Bold at 11px, `4px 12px`, square. Tags are text only — blue 13px 700 with a `#`, 18px apart, navy on hover.
- **State:** the chip has one state; selection elsewhere is the blue tint ground or the blue underline of a tab.

### Cards / Containers
- **Corner Style:** none — a story is not a card. It is a photograph tile followed by type.
- **Background:** the tile is a navy-2 ground behind an `object-fit: cover` picture at a fixed ratio; the text below sits directly on the page.
- **Shadow Strategy:** none in the flow (see Elevation). Hover scales the picture 1.03–1.04 over 0.6–0.8s on `cubic-bezier(.2,.7,.2,1)` and turns the title blue.
- **Border:** none. Lists separate rows with a 1px `{colors.border-soft}` line or with 10px of air; row numerals lead in blue Bold.
- **Internal Padding:** 9–14px between picture, meta line (11.5px blue 700 category + muted tabular time) and title.
- **Tinted blocks:** when a block needs a ground it takes a tint — soft light for the after-reading band, warm paper for dossiers, blue tint for selection — with no border and 38–40px of block padding.

### Inputs / Fields
- **Style:** the search field on the blue masthead is 38px tall, `{colors.on-dark-08}` ground, 1px `{colors.on-dark-30}` line, white 12.5px 700 text with a `{colors.on-dark-60}` placeholder; its submit is a 38px square inside the field.
- **Focus:** the whole field turns white (`focus-within`), text and icon go navy/blue, placeholder goes faint. Hover lightens the ground to `.14` and the line to `.55`.
- **Error / Disabled:** disabled controls drop to .35 opacity with a default cursor; no error style is established.

### Navigation
- **Topbar:** navy-2, 34px, 12px text at `.8` white with tabular numerals; a segmented language switch (white cell for the current language).
- **Masthead:** the brand blue band, 88px, logo centred, live button and «الآن» to the start, brief button and search to the end; the sheen sky (arcs, meteor, stars) drawn in white at .07–.09 behind it.
- **Nav:** the Bold at 14px at `.86` white on a `{colors.on-dark-line}` top hairline, 26px apart, a 3px transparent bottom border that turns `.8` white on hover and solid white when current. Dropdowns are navy panels with a 2px blue rule at the top, 13px 700 links that fill blue on hover. Under 900px the nav becomes a touch menu driven by `data-open`.
- **Ticker:** white bar, 44px, a red notched «عاجل» tag with a pulsing white dot, one headline at 15px 700 with a tabular time and an LTR-isolated counter.
- **Progress:** a fixed 3px sky bar at the top that fills as the reader scrolls (`animation-timeline: scroll(root)` where supported).

### The Sticky Picture Pane (signature)
The report's photograph stands still while the words scroll. A 3:2 stage on navy-2 holds the chapter pictures stacked; the chapter whose heading has passed 45% of the viewport (`data-sh-scene-at`) names the picture, and the pane crossfades to it — opacity 0.6s ease, a 1.04 → 1 settle over 1.1s on `cubic-bezier(.2,.7,.2,1)`. Under the stage: three 14×12 blades in `{colors.border}` with the current one blue, a tabular "1 / 3" counter, and the caption fading in over 0.5s with its credit after an em dash. A navy-scrim «كبّر» plate appears on hover; the stage opens in the shared lightbox.

### The Pull Quote and the Context Block (signature)
The one highlighted line in a report: a 30px blue quote glyph, the line in the Bold at `clamp(20px, 1.85vw, 25px)` navy, and a 12.5px muted attribution led by the arrow blade — 40px clear above and below, no rule, no box. The context block is a heading with the blade («سياق») over a naskh list at .9em where each sentence begins with its figure in the Bold navy tabular numerals; live figures come from `data-sh-figure`.

### Live states
A live element is a 5–7px red circle pulsing 1.4–1.6s (`sh-pulse`), beside a navy head in the Bold. On the article the story-updates block is exactly that — dot, head, list — with no tinted panel and no side stripe (feed contexts keep the blue-tint panel with a red inline-start stripe).

### Motion
Colour and background change in 0.16–0.18s ease; arrows step in 0.2s; a panel, a veil or a toast fades in 0.22–0.3s ease; anything that moves or scales rides `cubic-bezier(.2,.7,.2,1)` — 0.35–0.5s for a lift or a deck, 0.5s for a card or grid picture, 0.8–1.2s for a page's one lead picture or a crossfade settle. `prefers-reduced-motion: reduce` removes every transition, animation and hover transform, and stops every pulse.

## Do's and Don'ts

### Do:
- **Do** set every offset with logical properties (`inset-inline-start`, `margin-inline`, `padding-inline`) and isolate Latin or numeric runs with `direction: ltr; unicode-bidi: isolate`; give every SVG on the page `direction: ltr`.
- **Do** separate blocks with whitespace, type scale and the photograph; use a line only where it means something (a tab underline, a timeline, a list-row divider).
- **Do** put the 16×13 blue ش blade before a heading and the 13×11 blade at the end of a report; paint the blade with `background`, never with an image element.
- **Do** keep reading text in the Regular on a measure of about sixty characters at line-height 1.9–2.05, scaled by `--reader-scale`.
- **Do** frame every photograph at a fixed ratio on a `{colors.brand-navy-2}` ground with `object-fit: cover` and an authored `object-position`.
- **Do** draw a band full-bleed with `box-shadow: 0 0 0 100vmax` and `clip-path: inset(0 -100vmax)` — one navy band per page at most.
- **Do** give every grid child `min-width: 0`, every phone target 44px, every phone text 12px or more, and every focusable a 2px blue outline (sky on navy).
- **Do** use `tabular-nums` on every number and the Bold on every label, caption, counter and button.
- **Do** honour `prefers-reduced-motion` on every transition, animation and hover transform.
- **Do** prefix every class with `sh-`, and bump `?v=N` on every asset after any CSS or JS change.

### Don't:
- **Don't** draw decorative hairlines, card top-rules, eyebrow lines, ghost numerals, decorative circles or framed panels — the client reads them as machine output.
- **Don't** round a corner; the only circles are live dots and rings.
- **Don't** lay a black veil over a photograph; scrims are navy at an opacity.
- **Don't** use red outside breaking and live, and never as a call to action.
- **Don't** hover to blue on the blue masthead or the navy chrome — hover there goes to white.
- **Don't** add a second navy band to a page, or a shadow to anything that sits in the flow.
- **Don't** stretch, squash or viewport-crop a photograph, or fill a frame with a placeholder when there is no real picture — drop the element instead.
- **Don't** use IBM Plex Sans Arabic anywhere, and avoid Cairo; Neue Helvetica Arabic is the only face (Almarai only as its fallback), self-hosted, and never tracked or uppercased.
- **Don't** invent content: headlines, figures and pictures come from the agency's own sources.
