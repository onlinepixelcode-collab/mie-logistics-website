/* M.I.E. Logistics — site engine (v2) */
(() => {
  const root = document.documentElement;
  const page = document.body.dataset.page || '';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  if (!hasGsap) root.classList.remove('js');
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (!location.hash) scrollTo(0, 0);
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ---------- small facts ---------- */
  const year = new Date().getFullYear();
  $$('.year').forEach(n => (n.textContent = year));
  $$('[data-count-from]').forEach(n => { n.dataset.to = year - Number(n.dataset.countFrom); n.textContent = n.dataset.to; });

  /* ---------- footer: live yard status in South African time ---------- */
  const openEl = $('#openNow'), openDot = $('#openDot');
  if (openEl) {
    const HOURS = { 1: [8, 17], 2: [8, 17], 3: [8, 17], 4: [8, 17], 5: [8, 17], 6: [8, 13] };   // 0 = Sunday, closed
    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const pad = n => String(n).padStart(2, '0') + ':00';
    const update = () => {
      let parts;
      try {
        parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Johannesburg', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' })
          .formatToParts(new Date()).map(p => [p.type, p.value]));
      } catch (e) { return; }
      const day = DAYS.indexOf(parts.weekday), mins = (+parts.hour) * 60 + (+parts.minute);
      const today = HOURS[day];
      if (today && mins >= today[0] * 60 && mins < today[1] * 60) {
        openEl.textContent = `Open now · until ${pad(today[1])}`;
        openDot.className = 'foot__dot is-open';
      } else {
        let d = day, label = 'today';
        if (today && mins < today[0] * 60) { /* opens later today */ }
        else { for (let i = 1; i <= 7; i++) { d = (day + i) % 7; if (HOURS[d]) break; } label = d === (day + 1) % 7 ? 'tomorrow' : DAYS[d]; }
        openEl.textContent = `Closed · opens ${label} ${pad(HOURS[d][0])}`;
        openDot.className = 'foot__dot is-closed';
      }
    };
    update(); setInterval(update, 60000);
  }

  /* ---------- theme toggle ---------- */
  const themeBtn = $('#themeToggle');
  const syncThemeBtn = () => {
    const light = root.getAttribute('data-theme') === 'light';
    if (themeBtn) themeBtn.setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
    const meta = $('meta[name="theme-color"]'); if (meta) meta.content = light ? '#f5f4f0' : '#0a0c0f';
  };
  syncThemeBtn();
  if (themeBtn) themeBtn.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    root.classList.add('theme-anim');
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('mie-theme', next); } catch (e) {}
    syncThemeBtn();
    setTimeout(() => root.classList.remove('theme-anim'), 600);
  });

  /* ---------- nav + menu ---------- */
  const nav = $('#nav'), burger = $('#burger'), menu = $('#menu');
  let lenis = null, lastY = 0;
  const setMenu = open => {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
    if (lenis) open ? lenis.stop() : lenis.start();
    if (open && hasGsap && !reduce) gsap.from('.menu__links a', { y: 60, opacity: 0, stagger: .06, duration: .8, ease: 'expo.out' });
  };
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); burger.focus(); } });
  const onScroll = () => {
    const y = scrollY;
    nav.classList.toggle('is-solid', y > 40);   // header stays pinned (sticky) at all times
    lastY = y;
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ---------- showreel videos play only while on screen ---------- */
  const reelVids = $$('.reel__item video');
  if (reelVids.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting && !reduce) { e.target.preload = 'auto'; e.target.play().catch(() => {}); } else e.target.pause();
    }), { threshold: .25 });
    reelVids.forEach(v => io.observe(v));
  }

  /* ---------- page-specific builders that do not need GSAP ---------- */
  buildMap();
  setupForm();
  setupChat();

  /* ---------- page transitions ---------- */
  const curtain = $('.curtain'), cA = $('.curtain__a'), cB = $('.curtain__b'), cWord = $('.curtain__b span');
  if (curtain && hasGsap) curtain.style.animation = 'none';   // script is in charge, cancel the CSS safety net
  const isInternal = a => {
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return false;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return false;
    if (url.pathname === location.pathname) return false;          // same page (hash links)
    return /\.html?$|\/$/.test(url.pathname);
  };
  if (hasGsap && !reduce) {
    document.addEventListener('click', e => {
      const a = e.target.closest('a');
      if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0 || !isInternal(a)) return;
      e.preventDefault();
      if (!menu.hidden) setMenu(false);
      gsap.timeline({ onComplete: () => (location.href = a.href) })
        .set([cA, cB], { transformOrigin: 'bottom', scaleY: 0 })
        .set(cWord, { opacity: 0, '--p': '100%' })
        .to(cA, { scaleY: 1, duration: .55, ease: 'expo.inOut' })
        .to(cB, { scaleY: 1, duration: .55, ease: 'expo.inOut' }, '-=.4')
        .to(cWord, { opacity: 1, duration: .2 }, '-=.15');
    });
    addEventListener('pageshow', e => { if (e.persisted) gsap.set([cA, cB], { scaleY: 0 }); });
  }

  if (!hasGsap) return;
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.clearScrollMemory('manual');   // always start a page at the top (unless a #hash is targeted)
  if (!location.hash) scrollTo(0, 0);

  /* ---------- smooth scroll ---------- */
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ lerp: .09, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    const t = id === '#top' ? document.body : $(id);
    if (!t) return;
    e.preventDefault();
    lenis ? lenis.scrollTo(t === document.body ? 0 : t, { duration: 1.4 }) : t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }));

  /* ---------- split headings into words ---------- */
  $$('[data-split]').forEach(el => {
    const walk = node => {
      [...node.childNodes].forEach(ch => {
        if (ch.nodeType === 3) {
          const frag = document.createDocumentFragment();
          ch.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'w';
            const i = document.createElement('span'); i.textContent = part; w.appendChild(i); frag.appendChild(w);
          });
          ch.replaceWith(frag);
        } else if (ch.nodeType === 1 && ch.tagName !== 'BR') walk(ch);
      });
    };
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    walk(el);
    $$('.w', el).forEach(w => w.setAttribute('aria-hidden', 'true'));
  });

  /* ---------- intro / entrance ---------- */
  const enter = () => {
    if (reduce) { gsap.set('[data-enter]', { opacity: 1, y: 0 }); return; }
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.to('.line>[data-enter]', { y: 0, duration: 1.4, stagger: .09 })
      .fromTo('[data-enter]:not(.line>[data-enter])', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1.1, stagger: .08 }, '-=1.1');
    if ($('.hero__media img, .hero__media video')) tl.fromTo('.hero__media img, .hero__media video', { scale: 1.25 }, { scale: 1.04, duration: 2.4, ease: 'power3.out' }, 0);
  };
  if (reduce) { gsap.set([cA, cB], { scaleY: 0 }); enter(); }
  else {
    const first = !sessionStorage.getItem('mieIntro');
    try { sessionStorage.setItem('mieIntro', '1'); } catch (e) {}
    gsap.set([cA, cB], { transformOrigin: 'top', scaleY: 1 });
    const tl = gsap.timeline({ delay: .1 });
    if (first) {
      const p = { v: 0 };
      tl.to(p, { v: 100, duration: 1.6, ease: 'power2.inOut', onUpdate: () => cWord.style.setProperty('--p', p.v + '%') });
    } else {
      cWord.style.setProperty('--p', '100%');
    }
    tl.to(cWord, { y: -40, opacity: 0, duration: .5, ease: 'power2.in' })
      .to(cB, { scaleY: 0, duration: .9, ease: 'expo.inOut' }, '-=.15')
      .to(cA, { scaleY: 0, duration: .9, ease: 'expo.inOut' }, '-=.75')
      .add(enter, '-=.6');
  }

  /* ---------- progress bar ---------- */
  gsap.to('.progress span', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .3 } });

  /* ---------- cursor (buttons stay put on hover: no magnetic pull) ---------- */
  if (fine && !reduce) {
    const cur = $('.cursor'), dot = $('.cursor__dot'), ring = $('.cursor__ring');
    const dx = gsap.quickTo(dot, 'x', { duration: .1 }), dy = gsap.quickTo(dot, 'y', { duration: .1 });
    const rx = gsap.quickTo(ring, 'x', { duration: .45, ease: 'power3' }), ry = gsap.quickTo(ring, 'y', { duration: .45, ease: 'power3' });
    addEventListener('pointermove', e => { dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); });
    document.addEventListener('pointerover', e => cur.classList.toggle('is-hover', !!e.target.closest('a,button,.card,summary,.cities li,input,select,textarea')));
  }

  if (reduce) { gsap.set('[data-reveal], [data-reveal] img', { clearProps: 'all' }); return; }

  /* ---------- reveals ---------- */
  $$('[data-split]').forEach(el => {
    if (el.closest('.phero__in, .hero__in')) return;
    gsap.from($$('.w>span', el), { yPercent: 110, duration: 1.2, ease: 'expo.out', stagger: .05, scrollTrigger: { trigger: el, start: 'top 85%' } });
  });
  $$('[data-reveal="img"]').forEach(el => {
    const img = $('img, iframe', el);
    gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 85%' } })
      .to(el, { clipPath: 'inset(0% 0 0 0)', duration: 1.4, ease: 'expo.inOut' })
      .to(img, { scale: 1, duration: 1.8, ease: 'expo.out' }, 0);
  });
  ScrollTrigger.batch('[data-reveal]:not([data-reveal="img"])', {
    start: 'top 88%',
    onEnter: els => gsap.to(els, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: .1 })
  });
  $$('.count').forEach(el => {
    if (el.closest('.phero__in')) return;
    const o = { v: 0 }, to = +el.dataset.to;
    ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => gsap.to(o, { v: to, duration: 1.8, ease: 'power3.out', onUpdate: () => (el.textContent = Math.round(o.v)) }) });
  });

  /* ---------- parallax ---------- */
  $$('.cta__bg img, .tracking__media img, .quote__bg img').forEach(img => {
    gsap.fromTo(img, { yPercent: -8, scale: 1.15 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: img.closest('section'), start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  $$('.phero__media img').forEach(img => gsap.to(img, { yPercent: 12, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }));

  /* ---------- home hero: frame shrinks as you scroll ---------- */
  if ($('.hero')) {
    gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
      .to('.hero__frame', { clipPath: 'inset(4% 3% 10% 3% round 28px)', ease: 'none' }, 0)
      .to('.hero__in', { yPercent: -30, opacity: 0, ease: 'none' }, 0)
      .to('.hero__strip', { opacity: 0, ease: 'none' }, 0);
  }

  const mm = gsap.matchMedia();

  /* ---------- journey: pinned cinematic chapters ---------- */
  if ($('.journey')) {
    const chs = $$('.ch'), jcs = $$('.jc'), navs = $$('#journeyNav li'), bar = $('#journeyBar');
    const n = chs.length;
    // optional scroll-scrubbed videos
    const vids = chs.map(ch => {
      if (!ch.dataset.video) return null;
      const v = document.createElement('video');
      Object.assign(v, { muted: true, playsInline: true, preload: 'auto', src: ch.dataset.video });
      v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
      v.setAttribute('aria-hidden', 'true');
      v.className = 'ch__video';
      $('img', ch).after(v);
      v.addEventListener('loadeddata', () => v.classList.add('is-ready'), { once: true });
      v.load();
      return v;
    });
    let active = -1;
    const setActive = i => {
      if (i === active) return; active = i;
      jcs.forEach((el, k) => el.classList.toggle('is-active', k === i));
      navs.forEach((el, k) => el.classList.toggle('is-active', k === i));
    };
    setActive(0);
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: '.journey', pin: '.journey__pin', start: 'top top', end: () => '+=' + innerHeight * n * 1.1,
        scrub: .6, anticipatePin: 1, invalidateOnRefresh: true, refreshPriority: -1,
        onUpdate: self => {
          const p = self.progress;
          bar.style.transform = `scaleX(${p})`;
          setActive(Math.min(n - 1, Math.floor(p * n + .15)));
          vids.forEach((v, k) => {
            if (!v || !v.duration) return;
            const local = gsap.utils.clamp(0, 1, p * n - k + .3);
            const t = local * (v.duration - .05);
            if (Math.abs(v.currentTime - t) > .03) v.currentTime = t;
          });
        }
      }
    });
    chs.forEach((ch, k) => {
      const media = () => $$('img, video', ch);
      if (k > 0) tl.fromTo(ch, { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: .5, ease: 'power2.inOut' }, k - .5);
      tl.fromTo(media(), { scale: 1.22 }, { scale: 1.02, duration: 1.5 }, Math.max(0, k - .5));
      tl.fromTo($('.hud', ch), { opacity: 0 }, { opacity: 1, duration: .3 }, Math.max(0, k - .2));
      if (ch.querySelector('.hud__wire')) tl.fromTo($$('.hud__wire path, .hud__wire circle', ch), { strokeDasharray: 1400, strokeDashoffset: 1400 }, { strokeDashoffset: 0, duration: .6 }, k - .1);
    });
    tl.to({}, { duration: .3 });
  }

  /* ---------- v3: hologram hero ---------- */
  if ($('.holo')) {
    $$('[data-type]').forEach(el => {
      const walk = node => [...node.childNodes].forEach(ch => {
        if (ch.nodeType === 3) {
          const f = document.createDocumentFragment();
          ch.textContent.split(/(\s+)/).forEach(word => {
            if (!word) return;
            if (/^\s+$/.test(word)) { f.appendChild(document.createTextNode(' ')); return; }
            const wsp = document.createElement('span'); wsp.className = 'tw';
            [...word].forEach(c => { const sp = document.createElement('span'); sp.className = 'tc'; sp.textContent = c; wsp.appendChild(sp); });
            f.appendChild(wsp);
          });
          ch.replaceWith(f);
        } else if (ch.nodeType === 1) walk(ch);
      });
      walk(el);
    });
    const cells = $$('.holo__grid i');
    const htl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: '.holo', pin: '.holo__pin', start: 'top top', end: () => '+=' + innerHeight * 3.4, scrub: .8, anticipatePin: 1, invalidateOnRefresh: true }
    });
    htl.to('.holo__stage--0', { opacity: 0, y: -80, duration: 1.2, ease: 'power2.in' }, 1)
      .to('.holo .hud--hero', { opacity: 0, duration: .6 }, 1.4)
      .to('#holoA', { scale: 1.14, duration: 5 }, 1)
      .to('.holo__dim', { opacity: 1, duration: 1.5 }, 2)
      .to('.holo__stage--1', { opacity: 1, duration: .2 }, 3.3)
      .to('.holo__stage--1 .tc', { opacity: 1, duration: .05, stagger: .035 }, 3.3)
      .to('.holo__stage--1', { opacity: 0, y: -60, duration: .6 }, 5.5)
      .to('.holo__b', { opacity: 1, duration: 1.4, ease: 'power1.inOut' }, 5.6)
      .fromTo('.holo__b', { scale: 1.1 }, { scale: 1, duration: 3 }, 5.6)
      .to('.holo__stage--2', { opacity: 1, duration: .2 }, 6.9)
      .to('.holo__stage--2 .tc', { opacity: 1, duration: .05, stagger: .035 }, 6.9)
      .from('.holo__readout span', { opacity: 0, y: 20, stagger: .12, duration: .3 }, 7.9)
      .to('.holo__stage--2', { opacity: 0, duration: .5 }, 9)
      .to(cells, { scale: 1.06, duration: .9, ease: 'power2.inOut', stagger: { each: .012, from: 'center', grid: 'auto' } }, 9.1);
  }

  /* ---------- statement: words light up ---------- */
  $$('[data-highlight]').forEach(el => {
    const walk = node => [...node.childNodes].forEach(ch => {
      if (ch.nodeType === 3) {
        const f = document.createDocumentFragment();
        ch.textContent.split(/(\s+)/).forEach(w => { if (!w) return; if (/^\s+$/.test(w)) { f.appendChild(document.createTextNode(w)); return; } const sp = document.createElement('span'); sp.className = 'sw'; sp.textContent = w; f.appendChild(sp); });
        ch.replaceWith(f);
      } else if (ch.nodeType === 1) walk(ch);
    });
    walk(el);
    const words = $$('.sw', el);
    ScrollTrigger.create({ trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true, onUpdate: self => { const n = Math.round(self.progress * words.length); words.forEach((w, i) => w.classList.toggle('on', i < n)); } });
  });

  /* ---------- side truck drives in ---------- */
  if ($('.side')) {
    const stl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: '.side', pin: '.side__pin', start: 'top top', end: () => '+=' + innerHeight * 1.4, scrub: .8, invalidateOnRefresh: true } });
    stl.fromTo('.side__stage', { x: () => -innerWidth * 1.15 }, { x: 0, duration: 6, ease: 'power3.out' }, 0)
      .fromTo('.side__word', { xPercent: 10 }, { xPercent: -30, duration: 10 }, 0)
      .fromTo('.side__road', { backgroundPositionX: '0px' }, { backgroundPositionX: '-900px', duration: 6, ease: 'power3.out' }, 0)
      .to('.side__truck', { y: -3, duration: .3, yoyo: true, repeat: 9, ease: 'sine.inOut' }, 0)
      .to({}, { duration: 4 });
  }

  /* ---------- road: top-down truck follows the path ---------- */
  if ($('#roadSvg')) {
    const svg = $('#roadSvg'), path = $('#roadPath'), cab = $('#roadCab'), trailer = $('#roadTrailer'), cards = $$('.rcard'), pins = $$('.road__pins circle'), roadHead = $('.road__head');
    const total = path.getTotalLength();
    /* articulated truck, in road (SVG) units. Source images are 230px wide:
       cab 205px tall with the hitch 192px from its nose; trailer 1153px tall with the hitch 7px from its front. */
    const TW = 56, k = TW / 230;
    const CAB_H = 205 * k, CAB_HITCH = 192 * k, TR_H = 1153 * k, TR_HITCH = 7 * k;
    const FRONT_AXLE = CAB_HITCH - 8;   // steering axle sits just behind the nose
    const REAR_AXLE = TR_H * .82;        // trailer axles near the back of the trailer
    const l0 = REAR_AXLE + 140, l1 = total - 600;
    let scale = 1;
    const measure = () => {
      const W = Math.max(innerWidth, 900); scale = W / 1000; svg.style.width = W + 'px';
      const w = TW * scale;
      cab.style.width = trailer.style.width = w + 'px';
      cab.style.transformOrigin = `${w / 2}px ${CAB_HITCH * scale}px`;
      trailer.style.transformOrigin = `${w / 2}px ${TR_HITCH * scale}px`;
    };
    measure(); addEventListener('resize', measure);
    cards.forEach((c, i) => { const pt = path.getPointAtLength(l0 + (l1 - l0) * +c.dataset.at); if (pins[i]) { pins[i].setAttribute('cx', pt.x); pins[i].setAttribute('cy', pt.y); } });
    const deg = (a, b) => Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI + 90;
    const draw = p => {
      const Lk = l0 + (l1 - l0) * p;                                   // hitch position along the road
      const hitch = path.getPointAtLength(Lk);
      const front = path.getPointAtLength(Math.min(total, Lk + FRONT_AXLE));
      const rear = path.getPointAtLength(Math.max(0, Lk - REAR_AXLE));
      const cabAng = deg(hitch, front);                                // cab points at where the steering axle is
      const trAng = deg(rear, hitch);                                  // trailer is dragged by the hitch, so it lags on curves
      const sx = hitch.x * scale, sy = hitch.y * scale;
      const camX = innerWidth >= 900 ? 0 : innerWidth / 2 - sx;
      const camY = innerHeight * .56 - sy;
      svg.style.transform = `translate3d(${camX}px,${camY}px,0)`;
      const w = TW * scale, kx = sx + camX, ky = innerHeight * .56;
      cab.style.transform = `translate3d(${kx - w / 2}px,${ky - CAB_HITCH * scale}px,0) rotate(${cabAng}deg)`;
      trailer.style.transform = `translate3d(${kx - w / 2}px,${ky - TR_HITCH * scale}px,0) rotate(${trAng}deg)`;
      if (roadHead) roadHead.style.opacity = 1 - gsap.utils.clamp(0, 1, (p - .1) / .06);
      cards.forEach(c => { const d = Math.abs(p - +c.dataset.at); const o = gsap.utils.clamp(0, 1, (.12 - d) / .04); c.style.opacity = o; c.style.transform = `translateY(${(1 - o) * 30}px)`; });
    };
    draw(0);
    ScrollTrigger.create({ trigger: '.road', pin: '.road__pin', start: 'top top', end: () => '+=' + innerHeight * 4, scrub: .6, invalidateOnRefresh: true, onUpdate: self => draw(self.progress), onRefresh: self => draw(self.progress) });
  }

  /* ---------- horizontal tracks ---------- */
  const hTrack = (section, pin, track) => mm.add('(min-width: 821px)', () => {
    const el = $(track); if (!el) return;
    const dist = () => { const last = el.lastElementChild; const pad = parseFloat(getComputedStyle(el).paddingLeft) || 0; return Math.max(0, last.offsetLeft + last.offsetWidth + pad - innerWidth); };
    gsap.to(el, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: section, pin, start: 'top top', end: () => '+=' + dist(), scrub: .6, invalidateOnRefresh: true, anticipatePin: 1 } });
  });
  if ($('#track')) hTrack('.services', '.services__pin', '#track');
  if ($('#tlTrack')) hTrack('.timeline-h', '.timeline-h__pin', '#tlTrack');

  /* ---------- kinetic type reacting to scroll speed ---------- */
  const rows = $$('.kinetic__row');
  if (rows.length) {
    const state = rows.map(r => ({ r, x: 0, dir: +r.dataset.velocity || 1, w: 0 }));
    const measure = () => state.forEach(s => (s.w = s.r.scrollWidth / 2));
    measure(); addEventListener('resize', measure);
    let boost = 0;
    ScrollTrigger.create({ trigger: '.kinetic', start: 'top bottom', end: 'bottom top', onUpdate: self => { boost = gsap.utils.clamp(-12, 12, self.getVelocity() / 200); } });
    gsap.ticker.add(() => {
      boost *= .92;
      state.forEach(s => {
        s.x -= (1.2 + Math.abs(boost)) * s.dir;
        if (s.x <= -s.w) s.x += s.w; if (s.x > 0) s.x -= s.w;
        s.r.style.transform = `translate3d(${s.x}px,0,0) skewX(${-boost * s.dir * .8}deg)`;
      });
    });
  }

  /* ---------- footer: M.I.E. Logistics slides, faster when you scroll ---------- */
  const footRow = $('#footRow');
  if (footRow) {
    let fx = 0, fw = footRow.scrollWidth / 2, fboost = 0;
    addEventListener('resize', () => (fw = footRow.scrollWidth / 2));
    ScrollTrigger.create({ trigger: '.foot', start: 'top bottom', end: 'bottom top', onUpdate: self => { fboost = gsap.utils.clamp(-14, 14, self.getVelocity() / 160); } });
    let hover = false;
    footRow.parentElement.addEventListener('pointerenter', () => (hover = true));
    footRow.parentElement.addEventListener('pointerleave', () => (hover = false));
    gsap.ticker.add(() => {
      fboost *= .93;
      const speed = hover ? .25 : 1 + Math.abs(fboost);
      fx -= speed * (fboost < -0.5 ? -1 : 1);
      if (fx <= -fw) fx += fw; if (fx > 0) fx -= fw;
      footRow.style.transform = `translate3d(${fx}px,0,0) skewX(${-fboost * .6}deg)`;
    });
  }

  /* ---------- map draw-in ---------- */
  if ($('#map')) {
    const routes = $$('#map .map-route');
    routes.forEach(r => { const L = r.getTotalLength(); r.style.strokeDasharray = L; r.style.strokeDashoffset = L; });
    gsap.set('#map .map-city, #map .map-flow', { opacity: 0 });
    gsap.from('#map .prov', { opacity: 0, duration: 1, stagger: .06, ease: 'power2.out', delay: .6 });
    gsap.to(routes, { strokeDashoffset: 0, duration: 1.8, ease: 'power2.inOut', stagger: .12, delay: 1.2 });
    gsap.to('#map .map-city', { opacity: 1, duration: .5, stagger: .1, delay: 2 });
    gsap.to('#map .map-flow', { opacity: .7, duration: .8, delay: 3 });
  }

  ScrollTrigger.sort();
  ScrollTrigger.refresh();
  addEventListener('load', () => {
    if (!location.hash) { if (lenis) lenis.scrollTo(0, { immediate: true, force: true }); scrollTo(0, 0); }
    ScrollTrigger.refresh();
  });

  /* ================= helpers ================= */
  function buildMap() {
    const svg = $('#map'), M = window.ZA_MAP;
    if (!svg || !M) return;
    const { k, minx, miny, s, ox, oy } = M.proj;
    const P = (lon, lat) => [(lon * k - minx) * s + ox, (-lat - miny) * s + oy];
    const hub = P(31.03, -29.86);
    const cities = [
      { id: 'jhb', name: 'JOHANNESBURG', lon: 28.05, lat: -26.2, bend: -.18, a: 'end', dx: -12, dy: -6 },
      { id: 'jhb', name: 'PRETORIA', lon: 28.19, lat: -25.75, bend: -.2, a: 'end', dx: -12, dy: -2, small: true },
      { id: 'plk', name: 'POLOKWANE', lon: 29.45, lat: -23.9, bend: -.12, a: 'end', dx: -12, dy: 4 },
      { id: 'mbm', name: 'MBOMBELA', lon: 30.97, lat: -25.47, bend: .2, a: 'start', dx: 12, dy: 4 },
      { id: 'blm', name: 'BLOEMFONTEIN', lon: 26.21, lat: -29.12, bend: -.12, a: 'end', dx: -12, dy: 4 },
      { id: 'cpt', name: 'CAPE TOWN', lon: 18.42, lat: -33.92, bend: -.16, a: 'start', dx: 8, dy: 20 },
      { id: 'gqb', name: 'GQEBERHA', lon: 25.6, lat: -33.96, bend: -.1, a: 'middle', dx: 0, dy: 22 },
      { id: 'el', name: 'EAST LONDON', lon: 27.91, lat: -33.02, bend: -.1, a: 'start', dx: 12, dy: 16 }
    ];
    const provs = Object.keys(M.provinces);
    let h = `<defs><pattern id="dots" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1" fill="rgba(255,255,255,.18)"/></pattern>`;
    provs.forEach((p, i) => { h += `<mask id="pm${i}" maskUnits="userSpaceOnUse" x="0" y="0" width="${M.viewBox[0]}" height="${M.viewBox[1]}"><rect width="100%" height="100%" fill="#fff"/><path d="${M.provinces[p]}" fill="#000"/></mask>`; });
    h += `</defs><g class="provs">`;
    provs.forEach((p, i) => {
      h += `<g class="prov" data-prov="${p}"><path class="prov__fill" d="${M.provinces[p]}"/><path class="prov__line" d="${M.provinces[p]}" mask="url(#pm${i})"/></g>`;
    });
    h += `</g><g class="prov-labels">`;
    const nudge = { 'Gauteng': null, 'KwaZulu-Natal': [-18, -34], 'North West': [-26, 6], 'Mpumalanga': [-8, 22], 'Free State': [-6, 10], 'Limpopo': [-10, 10], 'Eastern Cape': [0, -6], 'Western Cape': [-6, 4], 'Northern Cape': [0, 0] };
    provs.forEach(p => { if (nudge[p] === null) return; const [x, y] = M.labels[p], [nx, ny] = nudge[p] || [0, 0]; h += `<text x="${(x + nx).toFixed(1)}" y="${(y + ny).toFixed(1)}" text-anchor="middle">${p.toUpperCase()}</text>`; });
    h += `</g>`;
    cities.forEach(c => {
      if (c.small) return;
      const [x, y] = P(c.lon, c.lat), mx = (hub[0] + x) / 2, my = (hub[1] + y) / 2, dx = x - hub[0], dy = y - hub[1];
      const d = `M${hub[0].toFixed(1)} ${hub[1].toFixed(1)} Q${(mx - dy * c.bend).toFixed(1)} ${(my + dx * c.bend).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
      h += `<path class="map-route" data-city="${c.id}" d="${d}"/><path class="map-flow" d="${d}"/>`;
    });
    cities.forEach(c => { const [x, y] = P(c.lon, c.lat); h += `<g class="map-city" data-city="${c.id}"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${c.small ? 3.5 : 5}"/><text x="${(x + c.dx).toFixed(1)}" y="${(y + c.dy).toFixed(1)}" text-anchor="${c.a}">${c.name}</text></g>`; });
    h += `<g class="map-hub"><circle class="ring" cx="${hub[0]}" cy="${hub[1]}" r="9"/><circle class="core" cx="${hub[0]}" cy="${hub[1]}" r="8"/><text x="${hub[0] + 16}" y="${hub[1] + 5}">DURBAN</text></g>`;
    svg.setAttribute('viewBox', `0 0 ${M.viewBox[0]} ${M.viewBox[1]}`);
    svg.innerHTML = h;
    const chips = $$('#cities li');
    const light = (id, on) => { $$(`[data-city="${id}"]`, svg).forEach(n => n.classList.toggle('is-on', on)); chips.forEach(ch => ch.classList.toggle('is-on', on && ch.dataset.city === id)); };
    chips.forEach(ch => { ch.addEventListener('mouseenter', () => light(ch.dataset.city, true)); ch.addEventListener('mouseleave', () => light(ch.dataset.city, false)); });
    const SLUG = { jhb: 'johannesburg', cpt: 'cape-town', gqb: 'gqeberha', el: 'east-london', blm: 'bloemfontein', plk: 'polokwane', mbm: 'mbombela' };
    const goRoute = id => { if (SLUG[id]) location.href = `car-transport-durban-to-${SLUG[id]}.html`; };
    chips.forEach(ch => {
      if (!SLUG[ch.dataset.city]) return;
      ch.tabIndex = 0; ch.setAttribute('role', 'link'); ch.style.cursor = 'pointer';
      ch.addEventListener('click', () => goRoute(ch.dataset.city));
      ch.addEventListener('keydown', e => { if (e.key === 'Enter') goRoute(ch.dataset.city); });
    });
    $$('.map-city', svg).forEach(g => { g.style.cursor = 'pointer'; g.addEventListener('click', () => goRoute(g.dataset.city)); });
    $$('.map-city', svg).forEach(g => { g.addEventListener('mouseenter', () => light(g.dataset.city, true)); g.addEventListener('mouseleave', () => light(g.dataset.city, false)); });
  }

  function setupForm() {
    const form = $('#quoteForm'), note = $('#formNote');
    if (!form) return;
    const clear = f => { f.classList.remove('is-error'); $('.err', f)?.remove(); $('input,select,textarea', f)?.removeAttribute('aria-invalid'); };
    form.addEventListener('input', e => { const f = e.target.closest('.field'); if (f) clear(f); });
    form.addEventListener('submit', e => {
      e.preventDefault();
      let first = null;
      $$('[required]', form).forEach(inp => {
        const f = inp.closest('.field'); clear(f);
        if (!inp.value.trim()) {
          f.classList.add('is-error'); inp.setAttribute('aria-invalid', 'true');
          const m = document.createElement('span'); m.className = 'err'; m.textContent = 'Please fill this in.'; f.appendChild(m);
          first = first || inp;
        }
      });
      if (first) { first.focus(); note.textContent = 'A few details are missing. Please check the fields marked in red.'; return; }
      const d = Object.fromEntries(new FormData(form));
      const text = ['Hi M.I.E. Logistics, I would like a quote.', '', `Name: ${d.name}`, `Phone: ${d.phone}`, `Collect from: ${d.from}`, `Deliver to: ${d.to}`, `Car(s): ${d.vehicle}`, `How many: ${d.qty}`, d.date ? `Preferred date: ${d.date}` : '', d.notes ? `Notes: ${d.notes}` : ''].filter(Boolean).join('\n');
      open('https://wa.me/27736977731?text=' + encodeURIComponent(text), '_blank', 'noopener');
      note.textContent = "WhatsApp opened with your details. Press send there and we'll reply with a price.";
    });
  }

  function setupChat() {
    const fab = $('#chatFab'), panel = $('#chatPanel'), log = $('#chatLog'), form = $('#chatForm'), input = $('#chatInput'), close = $('#chatClose'), chips = $('#chatChips');
    if (!fab) return;
    const history = [];
    const WA = 'https://wa.me/27736977731';
    const add = (who, html) => { const m = document.createElement('div'); m.className = 'msg msg--' + who; m.innerHTML = html; log.appendChild(m); log.scrollTop = log.scrollHeight; return m; };
    const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const linkify = s => esc(s).replace(/(https?:\/\/[^\s)]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>').replace(/\b(contact\.html#quote)\b/g, '<a href="$1">quote form</a>').replace(/\b(book\.html)\b/g, '<a href="$1">booking page</a>').replace(/\b(track\.html)\b/g, '<a href="$1">tracking page</a>');
    let opened = false;
    const toggle = open => {
      panel.hidden = !open; fab.setAttribute('aria-expanded', String(open));
      if (open && !opened) { opened = true; add('bot', "Hi! I'm the M.I.E. assistant. I can help with quotes, routes, insurance and tracking for moving your car anywhere in South Africa. What are you moving?"); }
      if (open) { input.focus(); if (window.gsap && !reduce) gsap.fromTo(panel, { opacity: 0, y: 20, scale: .96 }, { opacity: 1, y: 0, scale: 1, duration: .45, ease: 'expo.out' }); }
    };
    fab.addEventListener('click', () => toggle(panel.hidden));
    close.addEventListener('click', () => { toggle(false); fab.focus(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) { toggle(false); fab.focus(); } });

    const rules = [
      [/\b(hi|hello|hey|howzit|good (morning|afternoon|evening))\b/i, "Hi there! Are you looking to move one car, a few, or a full load? Tell me where it's going and I'll point you the right way."],
      [/(furniture|boxes|freight|cargo|parcel|container|household|goods|pallet|machinery|truck load of)/i, "M.I.E. Logistics only moves cars and other passenger vehicles like SUVs and bakkies, on dedicated car carriers. For anything else we're not the right fit, sorry!"],
      [/(talk to a person|human|agent|someone|speak to|call me|real person)/i, `Of course. Call or WhatsApp our team on 073 697 7731 (${WA}). We're available Mon–Fri 08:00–17:00 and Sat 08:00–13:00.`],
      [/(motorbike|motorcycle|bike|boat|caravan|trailer)/i, "We specialise in cars and other passenger vehicles like SUVs and bakkies on dedicated car carriers. For anything else, please check with our team on WhatsApp: https://wa.me/27736977731"],
      [/(non.?runner|doesn.?t start|broken|not running|won.?t start)/i, "Mark the car as a non-runner when you book (book.html) and our team will confirm how it can be loaded."],
      [/(pay|payment|deposit|invoice|eft|card)/i, "Payment details are confirmed by our team together with your quote. WhatsApp us on https://wa.me/27736977731 or call 073 697 7731."],
      [/(book|booking|reserve|schedule)/i, "You can book in four quick steps on our booking page (book.html): route, car(s), your details, then confirm. It sends the booking to us on WhatsApp and we confirm the price and collection date with you."],
      [/(quote|price|cost|how much|rate|charge|fee)/i, `Prices depend on the car, the route and the date. The quickest way is the quote form (contact.html#quote), which sends your details straight to us on WhatsApp. Or message us directly: ${WA}`],
      [/(route|area|cover|where do you|johannesburg|joburg|jhb|pretoria|cape town|gqeberha|port elizabeth|east london|bloemfontein|polokwane|mbombela|nelspruit|province|gauteng)/i, "We run door to door on all the major national routes out of Durban: Gauteng (Johannesburg and Pretoria), Cape Town, Gqeberha, East London, Bloemfontein, Polokwane and Mbombela. Not sure about your town? Ask us and we'll confirm."],
      [/(insur|git|damage|cover(ed)?|safe|scratch)/i, "Yes. All our trucks and trailers carry full comprehensive insurance plus goods-in-transit (GIT) cover, from collection to handover."],
      [/(track|where is my|update|status|gps|satellite)/i, `Every M.I.E. truck has 24-hour satellite tracking. Follow your booking on our tracking page (track.html) with your booking reference and the last 4 digits of your phone, or WhatsApp us on ${WA} for a live location.`],
      [/(hour|open|close|time|saturday|sunday|weekend)/i, "We're open Monday to Friday 08:00–17:00 and Saturday 08:00–13:00."],
      [/(address|located|where are you|yard|office|visit|directions|phoenix)/i, "Our yard is at 80 Hunslet Road, Phoenix Industrial, Durban. Directions: https://www.google.com/maps/search/?api=1&query=80+Hunslet+Road+Phoenix+Industrial+Durban"],
      [/(how long|days|transit|when will|delivery time|eta)/i, "Transit time depends on the route and the date. When you request a quote, our team confirms the collection and delivery dates with you."],
      [/(prepare|ready|before collection|keys|fuel|personal items)/i, "Before collection: remove personal belongings and loose items, note or photograph any existing marks, and give the driver the keys plus any alarm or immobiliser instructions."],
      [/(dealer|dealership|stock|branch|group)/i, "We move new and pre-owned stock between branches, groups and regions. We've worked with Bidvest McCarthy Nissan, SMG BMW, Supertech BMW and JLR. Want a quote for a dealer move?"],
      [/(fleet|company cars|corporate|business)/i, "We handle fleet roll-outs, returns and relocations, from a few cars to a full load on one truck. Tell us how many cars and the route, and we'll quote."],
      [/(supercar|lamborghini|ferrari|porsche|classic|low clearance|prestige|luxury)/i, "Supercars and collector cars are loaded carefully, strapped down on the deck and watched by satellite until they're handed over, with comprehensive and GIT cover."],
      [/(phone|call|number|whatsapp|contact|email)/i, `Call or WhatsApp us on 073 697 7731 (${WA}). We're open Mon–Fri 08:00–17:00 and Sat 08:00–13:00.`],
      [/(thank|thanks|cheers|great|awesome)/i, "My pleasure! Anything else I can help with?"]
    ];
    const local = q => { for (const [re, a] of rules) if (re.test(q)) return a; return `Good question. Our team can answer that properly. WhatsApp ${WA} or call 073 697 7731 (Mon–Fri 08:00–17:00, Sat 08:00–13:00).`; };
    const ask = async q => {
      add('me', esc(q));
      history.push({ role: 'user', content: q });
      const typing = add('bot', '<i></i><i></i><i></i>'); typing.classList.add('msg--typing');
      let reply = null;
      try {
        const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 12000);
        const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: history.slice(-12) }), signal: ctrl.signal });
        clearTimeout(t);
        if (r.ok) { const j = await r.json(); reply = j.reply || null; }
      } catch (e) { /* fall back to local answers */ }
      if (!reply) { await new Promise(r => setTimeout(r, 500)); reply = local(q); }
      typing.remove();
      history.push({ role: 'assistant', content: reply });
      add('bot', linkify(reply));
    };
    form.addEventListener('submit', e => { e.preventDefault(); const q = input.value.trim(); if (!q) return; input.value = ''; ask(q); });
    chips.addEventListener('click', e => { const b = e.target.closest('button'); if (b) ask(b.textContent); });
  }
})();
