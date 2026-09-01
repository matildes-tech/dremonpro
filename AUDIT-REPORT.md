# DREMONPRO (design-04-batch) — Adversarial Audit Report

## Executive Summary
13 findings confirmed by 3-lens adversarial verification (majority-confirmed each). The worst is a **load-time JS crash on `/waitlist/`**: an empty `#countdown` div throws a `TypeError` at parse time, halting every IIFE below it in the single shared `app.js` — which kills the burger nav (the only navigation on that subpage), the cookie banner, and the waitlist signup form (the page's primary conversion). The single highest-leverage fix is a **2-line null-guard in the countdown IIFE** (`if(!elDays||!elHours||!elMins||!elSecs) return;`): it resolves the P0 crash and hardens the whole shared script against this entire class of cascade-halt. Mix of: 1 P0, 3 P1, 7 P2, 2 P3.

---

## P0 — Crashes JS / breaks core functionality for many users

### 1. Empty `#countdown` on the waitlist page throws at load, cascade-disabling burger nav, the signup form, and the cookie banner
- **Files:** `waitlist/index.html:53` (empty `<div id="countdown" data-deadline=...>` with no cell children) · `assets/app.js:44-63, 56` (countdown IIFE)
- **Impact:** The countdown IIFE guards only `if(!cd)return`, then dereferences `elDays.textContent` in `tick()`. On `/waitlist/` the cells are absent → null deref → uncaught `TypeError` at parse time. Because `app.js` is a flat sequence of bare IIFEs with no try/catch, every IIFE below halts: the **waitlist form submit handler** (submit reloads the page, no confirmation), the **cookie banner** (Accept/Decline dead), and the **burger menu** — the *only* access to all 8 nav links on this subpage. `index.html` is unaffected (its countdown has all four cells). Reproduced live: burger does not toggle, form submit does not `preventDefault`.
- **Fix:** (1) Make the IIFE null-safe — after querying the cells add `if(!elDays||!elHours||!elMins||!elSecs) return;` before `tick()`/`setInterval`. (2) Either populate `waitlist/index.html:53` with the four `.cd-cell` spans from `index.html:56-59`, or strip `id="countdown"`/`data-deadline` from that empty div.

> Merged: `js-countdown-null-deref-1`, `countdown-empty-halt-1`, `waitlist-empty-countdown-halt-1` (same root cause, same fix).

---

## P1 — Broken on some pages / major UX or a11y

### 2. Duplicate `.form-msg` rule hides every waitlist confirmation and hint
- **Files:** `assets/style.css:777` and `:1391` (two equal-specificity `.form-msg` rules) · consumers `index.html:313`, `waitlist/index.html:74` · `assets/app.js:66-75`
- **Impact:** The later `:1391` rule (`display:none`, intended for the contact form) wins for *all* `.form-msg` elements. The waitlist hint ("One email a month…") is hidden on load, and the success message never appears — the waitlist IIFE sets only `textContent`/`color`, never `display` or `data-state`. Users get **zero feedback that the form worked**.
- **Fix:** Scope the contact variant: change `:1391`–`:1393` from `.form-msg` to `.contact-form .form-msg`. (Or have the waitlist JS set `msg.style.display='block'` / a `data-state`.)

### 3. Homepage featured blog card 404s
- **File:** `index.html:273` — `href="/blog/dremonpro-beta-june-17/"`
- **Impact:** The most prominent ("News & stories" featured) blog item links to a directory that does not exist; the four sibling rows all resolve fine. Top blog CTA on the landing page dead-ends in a 404.
- **Fix:** Repoint to an existing slug (e.g. `/blog/what-is-ai-tattoo-design-software-2026/`, which the blog index features) and sync the card title/date, or create the missing article.

### 4. Waitlist email input has no accessible name (placeholder only)
- **File:** `index.html:310` — `<input type="email" placeholder="artist@studio.com" required>`
- **Impact:** The primary lead-capture field has no `<label>`/`aria-label`/`aria-labelledby`. Screen-reader and voice-control users on the main conversion path hear only "edit text, required." Violates WCAG 1.3.1, 3.3.2, 4.1.2.
- **Fix:** `<label class="sr-only" for="wl-email">Email address</label>` + `id="wl-email"` (or `aria-label="Email address"`) on the input.

---

## P2 — Degraded experience

### 5. Footer copyright/email text fails WCAG contrast (#202020 on #000 ≈ 1.3:1)
- **File:** `assets/style.css:519` (`.foot-bottom { color: var(--grey-dark) }`) · content `index.html:351-353`
- **Impact:** Sitewide. The real copyright line and `hello@dremonpro.com` span render near-invisible (~1.3:1 vs. AA's 4.5:1). The `:792` `.foot-bottom a` override rescues only the Terms/Privacy links, not the surrounding text.
- **Fix:** Set `.foot-bottom { color: var(--grey-light) }` (#b3b3b3 ≈ 9:1).

### 6. Footer "RSS Feed" link 404s on every page
- **Files:** `index.html:349` + 26 other footers — `href="/blog/feed.xml"` (no `feed.xml` exists anywhere)
- **Impact:** Site-wide broken link (27 pages). Lower magnitude — it sits among `href="#"` placeholder social links on a pre-launch site.
- **Fix:** Generate a static `blog/feed.xml`, or remove the link from the shared footer until a feed exists.

### 7. Form success/error messages are not announced (no live region)
- **File:** `index.html:313` (`#waitlistMsg`, plain `<p>`) · `assets/app.js:72`
- **Impact:** On submit the confirmation text is swapped in with no `role="status"`/`aria-live` (none exist on the page). Screen-reader users get no feedback that signup succeeded. WCAG 4.1.3.
- **Fix:** Add `role="status" aria-live="polite"` to `#waitlistMsg` (and the contact/auth message containers).

### 8. Scroll-driven JS animations ignore `prefers-reduced-motion`
- **File:** `assets/app.js:113, 175, 222, 255` (hscroll carousel, see-it clip-path, tablet grow/parallax, brand-morph)
- **Impact:** These set `transform`/`clip-path` inline every scroll frame and gate only on `min-width:901px`. The CSS reduced-motion block (`style.css:1029`) only kills CSS animations/transitions, not JS inline styles. Reduced-motion desktop users still get full parallax/morph (WCAG 2.3.3, vestibular). The 3D-nav IIFE (`:327`) already checks the query — convention exists, just not applied here.
- **Fix:** Early-return these IIFEs when `matchMedia('(prefers-reduced-motion: reduce)').matches`, leaving content in its static end state.

### 9. Skip link bypasses the hero/`<h1>` and targets a non-focusable section; no `<main>` landmark
- **File:** `index.html:21` (`href="#product"`) · target `:65` (`<section id="product">`, no `tabindex`)
- **Impact:** "Skip to content" jumps *past* the hero `<h1>`, countdown, and primary CTA; the target `<section>` has no `tabindex` so focus may not move (only scroll). No `<main>` landmark exists anywhere. WCAG 2.4.1 / 1.3.1.
- **Fix:** Wrap hero+content in `<main id="main" tabindex="-1">` and point the skip link at `#main`.

### 10. Fullscreen nav menu does not move or trap focus when opened
- **File:** `assets/app.js:305` (`setOpen()`)
- **Impact:** Opening the opaque full-viewport overlay toggles classes/ARIA but never moves focus in or traps it; focus stays on the burger behind the overlay and Tab walks into controls hidden underneath. WCAG 2.4.3. The feature-modal IIFE (`:401/411`) does manage focus — pattern exists, omitted here.
- **Fix:** On open focus the first `.nav-menu-link`; on close return focus to the burger; trap Tab while open (keep the existing Escape handler).

### 11. Hidden mobile-only `.hiw-card-img` is fetched on desktop — duplicate loremflickr download per step
- **File:** `assets/app.js:160, 170` · `assets/style.css:618` (`.hiw-card-img{display:none}` desktop) · URLs `index.html:106` == `:139`
- **Impact:** `setActive()`/init run `loadImg()` on the in-card image at all widths even though it's `display:none` on desktop, pulling the same loremflickr URL already fetched for the stage image. Doubles request concurrency on a host noted to throttle bursts (HTTP cache mitigates repeat pixels).
- **Fix:** Guard the card-image load behind `if (window.matchMedia('(max-width:900px)').matches)`.

### 12. Waitlist `onerror` fallback can swap in the 21.7MB / 13754px `symbiote.png`
- **File:** `waitlist/index.html:83` — `<img src="/images/symbiote.webp" onerror="this.src='/images/symbiote.png'">`
- **Impact:** If the webp ever fails (CDN/MIME/4xx-5xx/old browser), the visitor downloads 21.7MB and decodes an 83-megapixel bitmap — can hang/OOM low-end mobile. Conditional path, not the default load.
- **Fix:** Point the fallback at the 89KB `symbiote.avif`, or use `<picture>` with avif/webp sources; ideally delete the raw PNG (nothing else references it).

---

## P3 — Minor

### 13. Homepage loremflickr images lack `decoding="async"` (and the eager `hiw-stage` step-0 img lacks `width`/`height`)
- **File:** `index.html:139, 106` (and blog/testimonial imgs)
- **Impact:** The how-it-works subpage twin consistently ships `loading="lazy" decoding="async" width height`; the homepage's hiw/blog/testimonial imgs ship without the decode hint. Minor consistency/decode-hygiene gap (images are below the fold, so real render impact is small).
- **Fix:** Add `decoding="async" width="900" height="1100"` to the hiw imgs and `decoding="async"` to blog/testimonial imgs, mirroring the subpage.

---

## Appendix — Refuted (did not count)
- **`data-reveal` on `#how` breaks sticky `.hiw-stage`** (`style.css`) — refuted 3/3: `[data-reveal].in{transform:none}` removes the containing block once revealed, so sticky works.
- **Duplicate `id="featModalTitle"` ×7 in feature templates** (`features/index.html`) — refuted 3/3: ids live in inert `<template>` content, never simultaneously in the live DOM.
- **All 28 `<img>` lack width/height (layout shift)** (`index.html`) — refuted 2/3: aspect ratios are reserved via CSS (`aspect-ratio`/object-fit containers), so no material CLS.
