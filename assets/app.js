// Shared: does the user prefer reduced motion? Scroll-driven flourishes below honor this.
var PREFERS_REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Scroll reveal ----------
(function () {
  var els = document.querySelectorAll('[data-reveal]');
  if (!('IntersectionObserver' in window)) {
    els.forEach(function (el) { el.classList.add('in'); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  els.forEach(function (el) { io.observe(el); });
})();

// ---------- Before / After sliders ----------
(function () {
  document.querySelectorAll('[data-ba]').forEach(function (slider) {
    var after = slider.querySelector('.ba-after');
    var handle = slider.querySelector('.ba-handle');
    var dragging = false;

    function setPos(clientX) {
      var rect = slider.getBoundingClientRect();
      var pct = ((clientX - rect.left) / rect.width) * 100;
      pct = Math.max(0, Math.min(100, pct));
      after.style.clipPath = 'inset(0 ' + (100 - pct) + '% 0 0)';
      handle.style.left = pct + '%';
    }
    function start(e) { dragging = true; setPos((e.touches ? e.touches[0] : e).clientX); }
    function move(e) { if (dragging) setPos((e.touches ? e.touches[0] : e).clientX); }
    function end() { dragging = false; }

    slider.addEventListener('mousedown', start);
    slider.addEventListener('touchstart', start, { passive: true });
    window.addEventListener('mousemove', move);
    window.addEventListener('touchmove', move, { passive: true });
    window.addEventListener('mouseup', end);
    window.addEventListener('touchend', end);
  });
})();

// ---------- Countdown ----------
(function () {
  var cd = document.getElementById('countdown');
  if (!cd) return;
  var deadline = new Date(cd.getAttribute('data-deadline')).getTime();
  var elDays = cd.querySelector('[data-days]'),
      elHours = cd.querySelector('[data-hours]'),
      elMins = cd.querySelector('[data-mins]'),
      elSecs = cd.querySelector('[data-secs]');
  // Guard the cells BEFORE tick() dereferences them. An empty #countdown (e.g. the
  // waitlist page) would otherwise throw a TypeError at load and halt every IIFE below.
  if (!elDays || !elHours || !elMins || !elSecs) return;
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function tick() {
    var diff = Math.max(0, deadline - Date.now());
    var s = Math.floor(diff / 1000);
    elDays.textContent = pad(Math.floor(s / 86400));
    elHours.textContent = pad(Math.floor((s % 86400) / 3600));
    elMins.textContent = pad(Math.floor((s % 3600) / 60));
    elSecs.textContent = pad(s % 60);
  }
  tick();
  setInterval(tick, 1000);
})();

// ---------- Waitlist form ----------
(function () {
  var form = document.getElementById('waitlistForm');
  if (!form) return;
  var msg = document.getElementById('waitlistMsg');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (msg) { msg.textContent = "You're on the list. We'll email you the moment the app is ready."; msg.style.color = 'var(--accent)'; }
    form.querySelector('input[type="email"]').value = '';
  });
})();

// ---------- Cookie banner ----------
(function () {
  var banner = document.getElementById('cookieBanner');
  if (!banner) return;
  if (localStorage.getItem('dp_cookie')) { banner.classList.add('hide'); return; }
  function dismiss(v) { localStorage.setItem('dp_cookie', v); banner.classList.add('hide'); }
  var a = document.getElementById('cookieAccept'), d = document.getElementById('cookieDecline');
  if (a) a.addEventListener('click', function () { dismiss('accept'); });
  if (d) d.addEventListener('click', function () { dismiss('decline'); });
})();

// ---------- Typed text rotator ----------
(function () {
  var el = document.querySelector('.typed');
  if (!el) return;
  var words;
  try { words = JSON.parse(el.getAttribute('data-typed')); }
  catch (e) { return; }
  var w = 0, c = 0, deleting = false;

  function tick() {
    var word = words[w];
    el.textContent = word.slice(0, c);
    if (!deleting) {
      if (c < word.length) { c++; setTimeout(tick, 75); }
      else { deleting = true; setTimeout(tick, 1400); }
    } else {
      if (c > 0) { c--; setTimeout(tick, 40); }
      else { deleting = false; w = (w + 1) % words.length; setTimeout(tick, 250); }
    }
  }
  tick();
})();

// ---------- Horizontal-scroll-on-vertical-scroll (sticky carousel) ----------
(function () {
  if (!window.matchMedia('(min-width: 901px)').matches) return;
  if (PREFERS_REDUCED_MOTION) return; // CSS un-pins the carousel into native horizontal scroll
  var sections = document.querySelectorAll('[data-hscroll]');
  sections.forEach(function (section) {
    var driver = section.querySelector('.hscroll-driver');
    var track = section.querySelector('[data-hscroll-track]');
    if (!driver || !track) return;
    var rafId = null, lastTx = NaN;
    function update() {
      var r = driver.getBoundingClientRect();
      var runway = r.height - window.innerHeight;
      if (runway <= 0) return;
      var progress = -r.top / runway;
      progress = Math.max(0, Math.min(1, progress));
      var maxTx = Math.max(0, track.scrollWidth - window.innerWidth);
      var tx = -progress * maxTx;
      if (tx !== lastTx) { track.style.transform = 'translate3d(' + tx + 'px,0,0)'; lastTx = tx; }
    }
    function onScroll() { if (rafId) return; rafId = requestAnimationFrame(function () { rafId = null; update(); }); }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  });
})();

// ---------- How it works — pill accordion ----------
(function () {
  var section = document.getElementById('how');
  if (!section) return;
  var steps = Array.prototype.slice.call(section.querySelectorAll('.hiw-step'));
  var pills = Array.prototype.slice.call(section.querySelectorAll('.hiw-pill'));
  var arrows = Array.prototype.slice.call(section.querySelectorAll('.hiw-arrow'));
  var stageImgs = Array.prototype.slice.call(section.querySelectorAll('.hiw-stage-img'));
  if (!steps.length) return;
  var active = 0;
  // the in-card image is only shown on mobile (display:none on desktop) — don't fetch it
  // on desktop, where it would duplicate the stage image's loremflickr request.
  var isMobile = function () { return window.matchMedia('(max-width: 900px)').matches; };
  function loadImg(img) {
    if (img && img.dataset.src) { img.src = img.dataset.src; delete img.dataset.src; }
  }
  function loadCardImg(step) {
    if (isMobile()) loadImg(step.querySelector('.hiw-card-img'));
  }
  function setActive(idx) {
    if (idx < 0) idx = steps.length - 1;
    if (idx >= steps.length) idx = 0;
    active = idx;
    steps.forEach(function (s, i) { s.classList.toggle('is-open', i === idx); });
    pills.forEach(function (p, i) { p.setAttribute('aria-expanded', i === idx ? 'true' : 'false'); });
    stageImgs.forEach(function (img, i) { img.classList.toggle('is-active', i === idx); });
    loadImg(stageImgs[idx]);
    loadImg(stageImgs[idx + 1]); // preload the next step for a snappy crossfade
    // mobile: image lives inside the card — load it when the step opens
    loadCardImg(steps[idx]);
  }
  pills.forEach(function (p, i) { p.addEventListener('click', function () { setActive(i); }); });
  arrows.forEach(function (a) {
    a.addEventListener('click', function () {
      var dir = parseInt(a.getAttribute('data-dir'), 10) || 1;
      setActive(active + dir);
    });
  });
  // load the initially-open step's in-card image (mobile)
  loadCardImg(steps[active]);
})();

// ---------- See it — full-screen scroll-expand video (desktop only) ----------
(function () {
  if (!window.matchMedia('(min-width: 901px)').matches) return;
  if (PREFERS_REDUCED_MOTION) return; // leave the video full-bleed (clip-path unset), no scroll animation
  var driver = document.querySelector('[data-seeit]');
  var video = document.querySelector('[data-seeit-video]');
  if (!driver || !video) return;
  var rafId = null;
  function update() {
    var r = driver.getBoundingClientRect();
    var runway = r.height - window.innerHeight;
    if (runway <= 0) return;
    var p = Math.max(0, Math.min(1, -r.top / runway));
    var pp = Math.min(1, p / 0.6);          // reach full-bleed at 60%, hold after
    var v = 16 * (1 - pp), h = 22 * (1 - pp), rad = 48 * (1 - pp);
    video.style.clipPath = 'inset(' + v + '% ' + h + '% round ' + rad + 'px)';
  }
  function onScroll() { if (rafId) return; rafId = requestAnimationFrame(function () { rafId = null; update(); }); }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
})();

// ---------- See it — play button: restart with sound ----------
(function () {
  var video = document.querySelector('[data-seeit-video]');
  var btn = document.getElementById('seeitPlay');
  if (!video || !btn) return;
  btn.addEventListener('click', function () {
    video.loop = false;
    video.muted = false;
    video.controls = true;       // native scrubber + play/pause + timeline
    video.currentTime = 0;
    var p = video.play();
    if (p && p.catch) p.catch(function () {});
    btn.classList.add('is-hidden');
  });
  video.addEventListener('ended', function () {
    // restore the silent looping backdrop and re-arm the play button
    video.controls = false;
    video.muted = true;
    video.loop = true;
    var p = video.play();
    if (p && p.catch) p.catch(function () {});
    btn.classList.remove('is-hidden');
  });
})();

// ---------- Try it — scroll-driven tablet grow ----------
(function () {
  if (!window.matchMedia('(min-width: 901px)').matches) return;
  if (PREFERS_REDUCED_MOTION) return; // leave the tablet at its natural static size, no scroll grow
  var driver = document.querySelector('[data-testgrow]');
  var media = document.querySelector('[data-testgrow-media] img');
  if (!driver || !media) return;
  var copy = driver.querySelector('.test-copy');
  // start (small, upper-right) -> end (big, centred + slightly below)
  var sTx = 24, sTy = -10, sSc = 0.52;
  var eTx = 0,  eTy = 8,   eSc = 1.12;
  var rafId = null;
  function update() {
    var r = driver.getBoundingClientRect();
    var runway = r.height - window.innerHeight;
    if (runway <= 0) return;
    var p = Math.max(0, Math.min(1, -r.top / runway));
    var e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; // easeInOutQuad
    var tx = sTx + (eTx - sTx) * e;
    var ty = sTy + (eTy - sTy) * e;
    var sc = sSc + (eSc - sSc) * e;
    media.style.transform = 'translate3d(' + tx + '%,' + ty + '%,0) scale(' + sc + ')';
    if (copy) {
      // fade the heading out as the tablet grows to fill the screen
      var o = 1 - Math.max(0, Math.min(1, (p - 0.3) / 0.3));
      copy.style.opacity = o;
      copy.style.transform = 'translateY(' + (-24 * (1 - o)) + 'px)';
    }
  }
  function onScroll() { if (rafId) return; rafId = requestAnimationFrame(function () { rafId = null; update(); }); }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
})();

// ---------- Brand logo: morph from hero into the top bar on scroll ----------
(function () {
  var morph = document.getElementById('brandMorph');
  var anchor = document.getElementById('heroLogoAnchor');
  var navBrand = document.querySelector('.nav-brand');
  var hero = document.querySelector('.section-header');
  if (!morph || !anchor || !navBrand || !hero) return;

  var bigX, bigY, bigW, bigH, navX, navY, navH, runway, forceDock = false;
  function metrics() {
    var a = anchor.getBoundingClientRect();
    bigX = a.left;
    bigY = a.top + window.scrollY;   // viewport Y when scrollY === 0
    bigW = a.width; bigH = a.height;
    navH = 24; // target logo height in the top bar (px)
    var endW = bigH > 0 ? bigW * (navH / bigH) : 0;
    var nb = navBrand.getBoundingClientRect(); // centre anchor in the fixed bar
    navX = (window.innerWidth - endW) / 2;      // perfectly centered horizontally
    navY = nb.top + (nb.height - navH) / 2;     // vertically centered in the bar
    runway = hero.offsetHeight * 0.62; // morph completes partway through the hero
    if (bigW > 0 && bigH > 0) {
      morph.style.width = bigW + 'px';
      morph.style.height = bigH + 'px';
    }
  }
  function update() {
    if (!(bigH > 0) || !(runway > 0)) return;
    var p = forceDock ? 1 : Math.max(0, Math.min(1, window.scrollY / runway));
    var e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; // easeInOutQuad
    var s = 1 + (navH / bigH - 1) * e;
    var x = bigX + (navX - bigX) * e;
    var y = bigY + (navY - bigY) * e;
    morph.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) scale(' + s + ')';
    morph.style.opacity = '1';
  }
  var rafId = null;
  function onScroll() { morph.classList.remove('is-snapping'); if (rafId) return; rafId = requestAnimationFrame(function () { rafId = null; update(); }); }
  function refresh() { metrics(); update(); }
  // Allow the burger menu to dock the logo into the top bar even at scroll 0.
  window.__brandMorphDock = function (on) { forceDock = !!on; morph.classList.add('is-snapping'); update(); };
  refresh();
  // Reduced motion: render the static hero logo once and skip the scroll-driven morph
  // (the burger can still dock it via __brandMorphDock).
  if (!PREFERS_REDUCED_MOTION) window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', refresh);
  window.addEventListener('load', refresh); // image dimensions settle after load
})();

// ---------- Burger menu ----------
(function () {
  var burger = document.getElementById('navBurger');
  var menu = document.getElementById('navMenu');
  if (!burger || !menu) return;
  function focusables() {
    return Array.prototype.slice.call(
      menu.querySelectorAll('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])')
    ).filter(function (el) { return el.offsetParent !== null || el === document.activeElement; });
  }
  function setOpen(open) {
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', open ? 'false' : 'true');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.classList.toggle('menu-open', open);
    if (window.__brandMorphDock) window.__brandMorphDock(open); // keep logo in the top bar while menu is open
    if (open) {
      var f = focusables();
      if (f.length) f[0].focus(); // move focus into the overlay
    } else {
      burger.focus(); // return focus to the control that opened it
    }
  }
  burger.addEventListener('click', function () {
    setOpen(burger.getAttribute('aria-expanded') !== 'true');
  });
  menu.addEventListener('click', function (e) {
    if (e.target.closest('a')) setOpen(false); // close after navigating
  });
  document.addEventListener('keydown', function (e) {
    if (burger.getAttribute('aria-expanded') !== 'true') return;
    if (e.key === 'Escape') { setOpen(false); return; }
    if (e.key === 'Tab') {
      // trap focus within the open overlay
      var f = focusables();
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
})();

// ---------- Burger menu — real extruded 3D text, cursor-driven tilt ----------
(function () {
  var links = Array.prototype.slice.call(document.querySelectorAll('.nav-menu-link'));
  if (!links.length) return;
  // The extruded geometry is a static visual, so it is built on every device.
  // Only the cursor-driven tilt (actual motion) is gated below.
  var canTilt = window.matchMedia('(hover: hover) and (pointer: fine)').matches
             && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var LAYERS = 22;   // number of real geometry layers (extrusion resolution)
  var MAX = 15;      // max cursor tilt in degrees

  // Build genuine stacked-layer geometry: many copies of the text at incremental
  // Z depths, graded dark->light from back to front, capped by a bright face.
  links.forEach(function (link) {
    var text = link.textContent.trim();
    link.textContent = '';
    link.classList.add('has-3d');
    var n3d = document.createElement('span');
    n3d.className = 'n3d';
    for (var i = LAYERS; i >= 1; i--) {       // deepest layer first
      var layer = document.createElement('span');
      layer.className = 'n3d-layer';
      layer.textContent = text;
      layer.style.setProperty('--i', i);
      var t = i / LAYERS;                      // 1 = back, ~0 = front
      // keep the receding body visible on the black bg: mid-grey at back -> light at front
      var g = Math.round(96 + (205 - 96) * (1 - t));
      layer.style.color = 'rgb(' + g + ',' + g + ',' + (g - 6) + ')';
      n3d.appendChild(layer);
    }
    var face = document.createElement('span'); // bright front face on top
    face.className = 'n3d-face';
    face.textContent = text;
    n3d.appendChild(face);
    link.appendChild(n3d);
  });

  // Cursor-driven tilt — because layers sit at real Z depths in a preserve-3d
  // chain, rotating the link exposes the actual extruded sides.
  // Skipped on touch devices and for reduced-motion users; the CSS shows the
  // extrusion at rest there instead, so the 3D is still visible.
  if (!canTilt) return;
  links.forEach(function (link) {
    var raf = null;
    link.addEventListener('mousemove', function (e) {
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = null;
        var r = link.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        var ry = (px * MAX * 2).toFixed(2);
        var rx = (-py * MAX * 2).toFixed(2);
        link.style.transform =
          'rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) scale(1.04)';
      });
    });
    link.addEventListener('mouseleave', function () {
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      link.style.transform = '';
    });
  });
})();

// ---------- Feature explorer modal (Features subpage) ----------
(function () {
  var modal = document.getElementById('featModal');
  if (!modal) return;
  var modalBody = document.getElementById('featModalBody');
  var closeBtn = modal.querySelector('.feat-modal-close');
  var triggers = document.querySelectorAll('.ft-row[data-feature]');
  var lastTrigger = null;

  function openModal(key) {
    var tpl = document.getElementById('feat-' + key);
    if (!tpl) return;
    modalBody.innerHTML = '';
    modalBody.appendChild(tpl.content.cloneNode(true));
    modal.removeAttribute('hidden');
    requestAnimationFrame(function () { modal.classList.add('is-open'); });
    document.body.classList.add('feat-modal-open');
    setTimeout(function () { closeBtn.focus(); }, 50);
  }
  function closeModal() {
    modal.classList.remove('is-open');
    document.body.classList.remove('feat-modal-open');
    setTimeout(function () {
      modal.setAttribute('hidden', '');
      modalBody.innerHTML = '';
      var card = modal.querySelector('.feat-modal-card');
      if (card) card.scrollTop = 0;
      if (lastTrigger && document.body.contains(lastTrigger)) lastTrigger.focus();
    }, 300);
  }
  triggers.forEach(function (t) {
    t.addEventListener('click', function (e) {
      e.preventDefault();
      lastTrigger = t;
      openModal(t.getAttribute('data-feature'));
    });
  });
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
  });
})();

// ---------- Use-cases carousel arrows ----------
(function () {
  var track = document.getElementById('ucTrack');
  if (!track) return;
  var prev = document.getElementById('ucPrev');
  var next = document.getElementById('ucNext');
  function step() {
    var card = track.querySelector('.uc-card');
    var gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap || '18') || 18;
    return (card ? card.getBoundingClientRect().width : 320) + gap;
  }
  function go(dir) { track.scrollBy({ left: dir * step(), behavior: 'smooth' }); }
  if (prev) prev.addEventListener('click', function () { go(-1); });
  if (next) next.addEventListener('click', function () { go(1); });
  function update() {
    var max = track.scrollWidth - track.clientWidth;
    if (prev) prev.disabled = track.scrollLeft <= 2;
    if (next) next.disabled = track.scrollLeft >= max - 2;
  }
  track.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  track.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
  });
  update();
})();

// ---------- Pricing billing toggle ----------
(function () {
  var wrap = document.getElementById('billingToggle');
  if (!wrap) return;
  var m = document.getElementById('toggleMonthly');
  var y = document.getElementById('toggleYearly');
  var amts = document.querySelectorAll('#pricingTrack .amt');
  function set(mode) {
    var yearly = mode === 'yearly';
    m.classList.toggle('active', !yearly);
    y.classList.toggle('active', yearly);
    m.setAttribute('aria-pressed', !yearly);
    y.setAttribute('aria-pressed', yearly);
    amts.forEach(function (a) {
      var v = yearly ? a.getAttribute('data-y') : a.getAttribute('data-m');
      if (v != null) a.textContent = v;
    });
  }
  m.addEventListener('click', function () { set('monthly'); });
  y.addEventListener('click', function () { set('yearly'); });
})();

// ---------- Contact form ----------
(function () {
  var form = document.getElementById('contactForm');
  if (!form) return;
  var msg = document.getElementById('contactMsg');
  function show(state, text) { msg.setAttribute('data-state', state); msg.textContent = text; }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var fd = new FormData(form);
    var name = (fd.get('name') || '').toString().trim();
    var email = (fd.get('email') || '').toString().trim();
    var message = (fd.get('message') || '').toString().trim();
    if (!name || !email || !message) { show('error', 'Please fill in name, email, and message.'); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { show('error', 'Please enter a valid email address.'); return; }
    show('success', "Thanks! We'll reply within one business day.");
    form.reset();
  });
})();

// ---------- Blog topic chips ----------
(function () {
  var chips = document.querySelectorAll('.mck-chip');
  if (!chips.length) return;
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      chips.forEach(function (c) { c.classList.remove('is-active'); c.setAttribute('aria-pressed', 'false'); });
      chip.classList.add('is-active');
      chip.setAttribute('aria-pressed', 'true');
    });
  });
})();

// ---------- Auth forms (magic-link + SSO placeholder) ----------
(function () {
  function wireMagicLink(formId, msgId) {
    var form = document.getElementById(formId);
    if (!form) return;
    var msg = document.getElementById(msgId);
    var btn = form.querySelector('button[type=submit]');
    var btnText = btn ? btn.textContent : '';
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var emailEl = form.querySelector('input[type=email]');
      var email = (emailEl ? emailEl.value : '').trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        if (msg) { msg.textContent = 'Please enter a valid email address.'; msg.className = 'auth-msg error'; }
        if (emailEl) emailEl.focus();
        return;
      }
      if (btn) { btn.disabled = true; btn.textContent = 'Sending\u2026'; }
      setTimeout(function () {
        if (msg) {
          msg.textContent = 'Check your inbox \u2014 we sent a sign-in link to ' + email + '. The link expires in 10 minutes.';
          msg.className = 'auth-msg ok';
        }
        if (btn) btn.textContent = 'Link sent';
        form.reset();
      }, 600);
    });
  }
  wireMagicLink('loginForm', 'loginMsg');
  wireMagicLink('signupForm', 'signupMsg');

  ['ssoApple', 'ssoGoogle'].forEach(function (id) {
    var b = document.getElementById(id);
    if (!b) return;
    b.addEventListener('click', function () {
      var msg = document.getElementById('loginMsg') || document.getElementById('signupMsg');
      if (msg) { msg.textContent = 'Single sign-on arrives with public launch. Use your studio email for now.'; msg.className = 'auth-msg'; }
    });
  });
})();

// ---------- Cookie preference panel ----------
(function () {
  var btn = document.getElementById('savePrefsBtn');
  if (!btn) return;
  var status = document.getElementById('prefStatus');
  btn.addEventListener('click', function () {
    if (status) {
      status.textContent = 'Preferences saved.';
      setTimeout(function () { status.textContent = ''; }, 3000);
    }
  });
})();

// ---------- Two-apps cards: read-more toggle (mobile) ----------
(function () {
  var btns = document.querySelectorAll('.app-readmore');
  if (!btns.length) return;
  btns.forEach(function (b) {
    b.addEventListener('click', function () {
      var card = b.closest('.app-card');
      if (!card) return;
      var open = card.classList.toggle('is-expanded');
      b.setAttribute('aria-expanded', open ? 'true' : 'false');
      b.textContent = open ? 'Read less' : 'Read more';
    });
  });
})();
