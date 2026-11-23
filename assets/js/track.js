/* M.I.E. Logistics — Track my vehicle.
   Looks up a shipment in assets/data/shipments.json by SHA-256(reference | last 4 phone digits).
   The data file never holds names or phone numbers. Update it with: python3 src/shipment.py */
(() => {
  const form = document.getElementById('trackForm');
  if (!form) return;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const ORDER = ['confirmed', 'collected', 'in_transit', 'out_for_delivery', 'delivered'];
  const LABEL = { confirmed: 'Booking confirmed', collected: 'Collected', in_transit: 'In transit', out_for_delivery: 'Out for delivery', delivered: 'Delivered' };
  const ALONG = { confirmed: 0, collected: .04, in_transit: .5, out_for_delivery: .9, delivered: 1 };
  const CITIES = {
    durban: [31.03, -29.86], umhlanga: [31.08, -29.73], ballito: [31.21, -29.54], pietermaritzburg: [30.38, -29.6], 'richards bay': [32.04, -28.78], newcastle: [29.93, -27.76],
    johannesburg: [28.05, -26.2], sandton: [28.06, -26.11], midrand: [28.13, -25.99], centurion: [28.19, -25.86], pretoria: [28.19, -25.75], rustenburg: [27.24, -25.67],
    'cape town': [18.42, -33.92], stellenbosch: [18.86, -33.93], paarl: [18.97, -33.73], george: [22.46, -33.96],
    gqeberha: [25.6, -33.96], 'port elizabeth': [25.6, -33.96], 'east london': [27.91, -33.02], mthatha: [28.78, -31.59],
    bloemfontein: [26.21, -29.12], welkom: [26.73, -27.98], kimberley: [24.76, -28.74], upington: [21.26, -28.45],
    polokwane: [29.45, -23.9], mbombela: [30.97, -25.47], nelspruit: [30.97, -25.47]
  };

  const sha256 = async s => {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  };
  const fmtDT = v => v ? new Date(v).toLocaleString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
  const fmtD = v => v ? new Date(v + 'T00:00').toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' }) : 'We\'ll confirm with you';

  /* prefill the reference from ?ref= (never the phone digits) */
  const qRef = new URLSearchParams(location.search).get('ref');
  if (qRef) form.elements.ref.value = qRef.toUpperCase().slice(0, 20);

  $('#tkDemo').addEventListener('click', () => { form.elements.ref.value = 'MIE-DEMO1'; form.elements.last4.value = '0000'; form.requestSubmit(); });

  const clear = f => { f.classList.remove('is-error'); $('.err', f)?.remove(); };
  form.addEventListener('input', e => { const f = e.target.closest('.field'); if (f) clear(f); });
  const fail = (inp, msg) => { const f = inp.closest('.field'); clear(f); f.classList.add('is-error'); const m = document.createElement('span'); m.className = 'err'; m.textContent = msg; f.appendChild(m); inp.focus(); };

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const ref = form.elements.ref.value.replace(/\s+/g, '').toUpperCase();
    const last4 = form.elements.last4.value.replace(/\D/g, '');
    if (!ref) return fail(form.elements.ref, 'Please enter your booking reference.');
    if (last4.length !== 4) return fail(form.elements.last4, 'Enter exactly 4 digits.');
    const btn = $('button[type=submit]', form); btn.disabled = true; btn.firstChild.textContent = 'Checking… ';
    let sh = null;
    try {
      const [key, res] = await Promise.all([sha256(`${ref}|${last4}`), fetch('assets/data/shipments.json?t=' + Date.now(), { cache: 'no-store' })]);
      if (res.ok) { const db = await res.json(); sh = db.shipments && db.shipments[key]; }
    } catch (err) { /* treated as not found */ }
    btn.disabled = false; btn.firstChild.textContent = 'Track my car ';
    show(ref, sh);
  });

  function show(ref, sh) {
    const box = $('#trackResult'), found = $('#tkFound'), missing = $('#tkMissing');
    box.hidden = false; found.hidden = !sh; missing.hidden = !!sh;
    if (sh) render(ref, sh);
    const target = sh ? found : missing;
    requestAnimationFrame(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    if (window.gsap && !matchMedia('(prefers-reduced-motion: reduce)').matches) gsap.fromTo(target, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: .8, ease: 'expo.out' });
  }

  function render(ref, sh) {
    const idx = Math.max(0, ORDER.indexOf(sh.status));
    $('#tkRef').textContent = ref;
    $('#tkDemoBadge').hidden = !sh.demo;
    $('#tkFrom').textContent = sh.from; $('#tkTo').textContent = sh.to;
    $('#tkStatus').textContent = LABEL[sh.status] || 'Booking confirmed';
    $('#tkStatusPill').classList.toggle('is-done', sh.status === 'delivered');
    $('#tkEta').textContent = sh.status === 'delivered' ? 'Delivered' : fmtD(sh.eta);
    $('#tkCars').textContent = sh.cars ? String(sh.cars) : '—';
    $('#tkUpdated').textContent = fmtDT(sh.updated) || '—';
    const note = $('#tkNote'); note.hidden = !sh.note; note.textContent = sh.note || '';
    $('#tkWa').href = 'https://wa.me/27736977731?text=' + encodeURIComponent(`Hi M.I.E., please share the live location for booking ${ref}.`);
    $$('#tkSteps li').forEach((li, i) => {
      li.classList.toggle('is-done', i < idx || sh.status === 'delivered');
      li.classList.toggle('is-now', i === idx && sh.status !== 'delivered');
      const t = sh.history && sh.history[li.dataset.s];
      $('time', li).textContent = t ? fmtDT(t) : '';
      if (t) $('time', li).setAttribute('datetime', t); else $('time', li).removeAttribute('datetime');
    });
    const p = ALONG[sh.status] ?? 0;
    const fill = $('#tkFill'), truck = $('#tkTruck');
    fill.style.transform = 'scaleX(0)'; truck.style.left = '0px';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      fill.style.transform = `scaleX(${p})`;
      truck.style.left = `calc(${p * 100}% - ${p * truck.offsetWidth}px)`;
    }));
    drawMap(sh, p);
  }

  function drawMap(sh, p) {
    const svg = $('#tkMap'), M = window.ZA_MAP, wrap = svg.closest('.tk-map');
    const a = CITIES[(sh.from || '').toLowerCase().trim()], b = CITIES[(sh.to || '').toLowerCase().trim()];
    if (!M || !a || !b) { wrap.hidden = true; return; }
    wrap.hidden = false;
    const { k, minx, miny, s, ox, oy } = M.proj;
    const P = (lon, lat) => [(lon * k - minx) * s + ox, (-lat - miny) * s + oy];
    const [x1, y1] = P(...a), [x2, y2] = P(...b);
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1, bend = .16;
    const cx = mx - dy * bend, cy = my + dx * bend;
    const d = `M${x1.toFixed(1)} ${y1.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
    const provs = Object.keys(M.provinces);
    let h = `<defs><pattern id="tkdots" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1" fill="rgba(255,255,255,.16)"/></pattern>`;
    provs.forEach((pv, i) => { h += `<mask id="tkm${i}" maskUnits="userSpaceOnUse" x="0" y="0" width="640" height="560"><rect width="100%" height="100%" fill="#fff"/><path d="${M.provinces[pv]}" fill="#000"/></mask>`; });
    h += '</defs>';
    provs.forEach((pv, i) => { h += `<path class="tk-prov" d="${M.provinces[pv]}"/><path class="tk-provline" d="${M.provinces[pv]}" mask="url(#tkm${i})"/>`; });
    h += `<path class="tk-route-all" d="${d}"/><path class="tk-route-done" id="tkDone" d="${d}"/>`;
    h += `<circle class="tk-city" cx="${x1}" cy="${y1}" r="6"/><circle class="tk-city" cx="${x2}" cy="${y2}" r="6"/>`;
    h += `<text class="tk-label" x="${x1 + 12}" y="${y1 + 4}">${String(sh.from).toUpperCase()}</text><text class="tk-label" x="${x2 + 12}" y="${y2 + 4}">${String(sh.to).toUpperCase()}</text>`;
    h += `<g id="tkPos"><circle class="tk-pos-ring" r="10"/><circle class="tk-pos" r="7"/></g>`;
    svg.innerHTML = h;
    const done = $('#tkDone'), L = done.getTotalLength();
    done.style.strokeDasharray = L; done.style.strokeDashoffset = L;
    const pos = $('#tkPos');
    const place = t => { const pt = done.getPointAtLength(L * t); pos.setAttribute('transform', `translate(${pt.x} ${pt.y})`); done.style.strokeDashoffset = L * (1 - t); };
    if (window.gsap && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const o = { t: 0 }; place(0);
      gsap.to(o, { t: p, duration: 2, delay: .3, ease: 'power2.inOut', onUpdate: () => place(o.t) });
    } else place(p);
  }

  if (qRef) form.elements.last4.focus();
})();
