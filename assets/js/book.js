/* M.I.E. Logistics — booking wizard (4 steps, sends the booking to WhatsApp) */
(() => {
  const form = document.getElementById('bookForm');
  if (!form) return;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const steps = $$('.bk-step', form);
  const labels = $$('.bk-progress__steps li');
  const fill = $('#bkFill'), truck = $('#bkTruck');
  const back = $('#bkBack'), next = $('#bkNext'), send = $('#bkSend'), note = $('#bkNote');
  const carsBox = $('#bkCars'), addCar = $('#bkAddCar');
  const KEY = 'mie-booking-draft';
  const NEXT_LABEL = ['Next: Cars', 'Next: Your details', 'Next: Confirm'];
  const TYPES = ['Sedan', 'Hatchback', 'SUV', 'Bakkie', 'Supercar / prestige', 'Classic', 'Other'];
  let step = 0;

  /* ---------- dates: no past collection dates ---------- */
  const dateIn = form.elements.date;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const iso = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  dateIn.min = iso(today);

  /* ---------- car cards ---------- */
  let carCount = 0;
  const carTpl = (i, v = {}) => `
    <div class="bk-car" data-car>
      <div class="bk-car__head"><b>Car <span class="bk-car__n">${i + 1}</span></b><button type="button" class="bk-link bk-car__rm" aria-label="Remove this car">Remove</button></div>
      <div class="form__row">
        <label class="field"><span>Make &amp; model</span><input name="car_model" placeholder="e.g. BMW X3" value="${esc(v.model || '')}" required></label>
        <label class="field"><span>Year <em>(optional)</em></span><input name="car_year" inputmode="numeric" maxlength="4" placeholder="e.g. 2022" value="${esc(v.year || '')}"></label>
      </div>
      <div class="form__row">
        <label class="field"><span>Type</span><select name="car_type">${TYPES.map(t => `<option${t === v.type ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
        <div class="field"><span>Does it drive?</span>
          <div class="bk-seg bk-seg--sm" role="radiogroup" aria-label="Does car ${i + 1} drive?">
            <label><input type="radio" name="car_runs_${i}" value="Runs" ${v.runs !== 'Non-runner' ? 'checked' : ''}><span>Yes, it runs</span></label>
            <label><input type="radio" name="car_runs_${i}" value="Non-runner" ${v.runs === 'Non-runner' ? 'checked' : ''}><span>Non-runner</span></label>
          </div>
        </div>
      </div>
    </div>`;
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  const renumber = () => {
    $$('[data-car]', carsBox).forEach((c, i) => {
      $('.bk-car__n', c).textContent = i + 1;
      $$('input[type=radio]', c).forEach(r => (r.name = 'car_runs_' + i));
      $('.bk-car__rm', c).hidden = $$('[data-car]', carsBox).length === 1;
    });
    addCar.hidden = $$('[data-car]', carsBox).length >= 10;
  };
  const addCarCard = (v) => {
    carsBox.insertAdjacentHTML('beforeend', carTpl(carCount++, v));
    renumber();
    const card = carsBox.lastElementChild;
    if (window.gsap && !matchMedia('(prefers-reduced-motion: reduce)').matches) gsap.from(card, { opacity: 0, y: 20, duration: .5, ease: 'expo.out' });
    return card;
  };
  addCar.addEventListener('click', () => { const c = addCarCard(); $('input', c).focus(); save(); });
  carsBox.addEventListener('click', e => {
    const rm = e.target.closest('.bk-car__rm'); if (!rm) return;
    rm.closest('[data-car]').remove(); renumber(); save(); summary();
  });

  /* ---------- customer type ---------- */
  const company = $('.bk-company');
  const syncType = () => { const v = form.elements.ctype.value; company.hidden = v === 'Private owner'; $('input', company).required = v !== 'Private owner'; };
  form.addEventListener('change', e => { if (e.target.name === 'ctype') syncType(); });

  /* ---------- swap ---------- */
  $('#bkSwap').addEventListener('click', () => {
    const f = form.elements;
    [f.from.value, f.to.value] = [f.to.value, f.from.value];
    [f.fromAddr.value, f.toAddr.value] = [f.toAddr.value, f.fromAddr.value];
    summary(); save();
  });

  /* ---------- data ---------- */
  const collect = () => {
    const f = form.elements;
    const cars = $$('[data-car]', carsBox).map(c => ({
      model: $('[name=car_model]', c).value.trim(),
      year: $('[name=car_year]', c).value.trim(),
      type: $('[name=car_type]', c).value,
      runs: ($('input[type=radio]:checked', c) || {}).value || 'Runs'
    }));
    return {
      from: f.from.value.trim(), to: f.to.value.trim(), fromAddr: f.fromAddr.value.trim(), toAddr: f.toAddr.value.trim(),
      date: f.date.value, flexible: f.flexible.checked, cars,
      ctype: f.ctype.value, name: f.name.value.trim(), phone: f.phone.value.trim(), email: f.email.value.trim(),
      company: f.company.value.trim(), notes: f.notes.value.trim()
    };
  };
  const fmtDate = v => { if (!v) return '—'; const d = new Date(v + 'T00:00'); return d.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }); };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(collect())); } catch (e) {} };
  const restore = () => {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    if (!d) { addCarCard(); return; }
    const f = form.elements;
    ['from', 'to', 'fromAddr', 'toAddr', 'name', 'phone', 'email', 'company', 'notes'].forEach(k => { if (d[k]) f[k].value = d[k]; });
    if (d.date && d.date >= dateIn.min) f.date.value = d.date;
    f.flexible.checked = !!d.flexible;
    if (d.ctype) $$('[name=ctype]', form).forEach(r => (r.checked = r.value === d.ctype));
    (d.cars && d.cars.length ? d.cars : [{}]).forEach(c => addCarCard(c));
    if (d.from || d.name) note.textContent = 'We restored your unfinished booking from this device.';
  };

  /* ---------- summary ---------- */
  const summary = () => {
    const d = collect();
    $('#sumFrom').textContent = d.from || '—';
    $('#sumTo').textContent = d.to || '—';
    $('#sumDate').textContent = d.date ? fmtDate(d.date) + (d.flexible ? ' (flexible)' : '') : '—';
    const named = d.cars.filter(c => c.model);
    $('#sumCars').textContent = named.length ? named.length + ' · ' + named.map(c => c.model).join(', ') : (d.cars.length ? d.cars.length + ' car' + (d.cars.length > 1 ? 's' : '') : '—');
    $('#sumWho').textContent = d.ctype + (d.company && d.ctype !== 'Private owner' ? ' · ' + d.company : '');
  };
  form.addEventListener('input', () => { summary(); save(); });
  form.addEventListener('change', () => { summary(); save(); });

  /* ---------- validation ---------- */
  const clear = f => { f.classList.remove('is-error'); $('.err', f)?.remove(); $('input,select,textarea', f)?.removeAttribute('aria-invalid'); };
  form.addEventListener('input', e => { const f = e.target.closest('.field'); if (f) clear(f); });
  const error = (input, msg) => {
    const f = input.closest('.field'); clear(f);
    f.classList.add('is-error'); input.setAttribute('aria-invalid', 'true');
    const m = document.createElement('span'); m.className = 'err'; m.textContent = msg; f.appendChild(m);
  };
  const validate = i => {
    let first = null;
    const fail = (inp, msg) => { error(inp, msg); first = first || inp; };
    $$('input, select, textarea', steps[i]).forEach(inp => {
      if (inp.type === 'radio' || inp.closest('[hidden]')) return;
      const f = inp.closest('.field'); if (f) clear(f);
      if (inp.required && inp.type === 'checkbox' && !inp.checked) return fail(inp, 'Please tick this box to continue.');
      if (inp.required && inp.type !== 'checkbox' && !inp.value.trim()) return fail(inp, 'Please fill this in.');
      if (inp.name === 'date' && inp.value && inp.value < inp.min) return fail(inp, 'Please choose today or a later date.');
      if (inp.name === 'phone' && inp.value && inp.value.replace(/\D/g, '').length < 9) return fail(inp, 'Please enter a valid phone number.');
      if (inp.name === 'email' && inp.value && !/^\S+@\S+\.\S+$/.test(inp.value)) return fail(inp, 'Please enter a valid email or leave it empty.');
      if (inp.name === 'car_year' && inp.value && !/^(19|20)\d\d$/.test(inp.value)) return fail(inp, 'Use a 4-digit year, e.g. 2022.');
    });
    if (i === 0 && !first) {
      const f = form.elements;
      if (f.from.value.trim() && f.from.value.trim().toLowerCase() === f.to.value.trim().toLowerCase() && !f.fromAddr.value && !f.toAddr.value) fail(f.to, 'Pick-up and drop-off are the same. Add the addresses if it is a local move.');
    }
    if (first) { first.focus(); note.textContent = 'A few details need your attention. Check the fields marked in red.'; }
    return !first;
  };

  /* ---------- review ---------- */
  const review = () => {
    const d = collect();
    const row = (k, v) => `<div><dt>${k}</dt><dd>${esc(v || '—')}</dd></div>`;
    $('#bkReview').innerHTML =
      row('From', d.from + (d.fromAddr ? ' · ' + d.fromAddr : '')) +
      row('To', d.to + (d.toAddr ? ' · ' + d.toAddr : '')) +
      row('Collection', fmtDate(d.date) + (d.flexible ? ' (flexible)' : '')) +
      row('Cars', d.cars.map((c, i) => `${i + 1}. ${c.model}${c.year ? ' (' + c.year + ')' : ''}, ${c.type}${c.runs === 'Non-runner' ? ', non-runner' : ''}`).join('\n')) +
      row('Customer', d.ctype + (d.company && d.ctype !== 'Private owner' ? ' · ' + d.company : '')) +
      row('Contact', [d.name, d.phone, d.email].filter(Boolean).join(' · ')) +
      (d.notes ? row('Notes', d.notes) : '');
  };

  /* ---------- step navigation ---------- */
  const go = (i, focus = true) => {
    const prev = step; step = i;
    steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
    labels.forEach((l, k) => { l.classList.toggle('is-active', k === i); l.classList.toggle('is-done', k < i); });
    back.hidden = i === 0;
    next.hidden = i === steps.length - 1;
    send.hidden = i !== steps.length - 1;
    if (i < steps.length - 1) next.firstChild.textContent = NEXT_LABEL[i] + ' ';
    if (i === steps.length - 1) review();
    const p = i / (steps.length - 1);
    fill.style.transform = `scaleX(${p})`;
    truck.style.left = `calc(${p * 100}% - ${p * truck.offsetWidth}px)`;
    if (window.gsap && prev !== i && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.fromTo(steps[i], { opacity: 0, x: i > prev ? 40 : -40 }, { opacity: 1, x: 0, duration: .55, ease: 'expo.out' });
    }
    if (focus) { const t = $('.bk-step__title', steps[i]); t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); form.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    note.textContent = i === steps.length - 1 ? 'Opens WhatsApp with your booking filled in. Nothing is sent until you press send there.' : 'Your answers are saved on this device until you send them.';
  };
  next.addEventListener('click', () => { if (validate(step)) go(step + 1); });
  back.addEventListener('click', () => go(step - 1));
  labels.forEach((l, k) => { l.addEventListener('click', () => { if (k < step) go(k); }); });

  /* ---------- send ---------- */
  form.addEventListener('submit', e => {
    e.preventDefault();
    for (let i = 0; i < steps.length; i++) if (!validate(i)) { go(i); validate(i); return; }
    const d = collect();
    const ref = 'MIE-' + Date.now().toString(36).toUpperCase().slice(-6);
    const lines = [
      `New booking request (${ref})`,
      '',
      `From: ${d.from}${d.fromAddr ? ', ' + d.fromAddr : ''}`,
      `To: ${d.to}${d.toAddr ? ', ' + d.toAddr : ''}`,
      `Collection date: ${fmtDate(d.date)}${d.flexible ? ' (flexible)' : ''}`,
      '',
      `Cars (${d.cars.length}):`,
      ...d.cars.map((c, i) => `${i + 1}. ${c.model}${c.year ? ' (' + c.year + ')' : ''}, ${c.type}${c.runs === 'Non-runner' ? ', NON-RUNNER' : ''}`),
      '',
      `Customer: ${d.ctype}${d.company && d.ctype !== 'Private owner' ? ' (' + d.company + ')' : ''}`,
      `Name: ${d.name}`,
      `Phone: ${d.phone}`,
      d.email ? `Email: ${d.email}` : '',
      d.notes ? `Notes: ${d.notes}` : ''
    ].filter((l, i, a) => l !== '' || (a[i - 1] !== '' && i > 0));
    const url = 'https://wa.me/27736977731?text=' + encodeURIComponent(lines.join('\n'));
    window.open(url, '_blank', 'noopener');
    $('#bkRef').textContent = ref;
    $('#bkWaLink').href = url;
    const tl = $('#bkTrackLink'); if (tl) tl.href = 'track.html?ref=' + encodeURIComponent(ref);
    try { localStorage.removeItem(KEY); } catch (e) {}
    steps.forEach(s => (s.hidden = true));
    $('.bk-nav', form).hidden = true; note.hidden = true;
    $('#bkDone').hidden = false; $('#bkDone').focus();
    fill.style.transform = 'scaleX(1)'; truck.style.left = 'calc(100% - 96px)';
    labels.forEach(l => { l.classList.remove('is-active'); l.classList.add('is-done'); });
  });
  $('#bkNew').addEventListener('click', () => { try { localStorage.removeItem(KEY); } catch (e) {} location.reload(); });

  /* ---------- init ---------- */
  restore(); syncType(); summary(); go(0, false);
})();
