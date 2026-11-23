/* M.I.E. Logistics — route map on the route pages: provinces + an animated Durban → destination line. */
(() => {
  const M = window.ZA_MAP;
  document.querySelectorAll('svg.route-map').forEach(svg => {
    if (!M) { svg.closest('.rt-map').hidden = true; return; }
    const { k, minx, miny, s, ox, oy } = M.proj;
    const P = (lon, lat) => [(lon * k - minx) * s + ox, (-lat - miny) * s + oy];
    const [x1, y1] = P(31.03, -29.86), [x2, y2] = P(+svg.dataset.lon, +svg.dataset.lat);
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1, bend = -.16;
    const d = `M${x1.toFixed(1)} ${y1.toFixed(1)} Q${(mx - dy * bend).toFixed(1)} ${(my + dx * bend).toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
    const provs = Object.keys(M.provinces);
    const uid = 'rm' + Math.random().toString(36).slice(2, 7);
    let h = `<defs><pattern id="${uid}d" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1" fill="rgba(255,255,255,.16)"/></pattern>`;
    provs.forEach((p, i) => { h += `<mask id="${uid}m${i}" maskUnits="userSpaceOnUse" x="0" y="0" width="640" height="560"><rect width="100%" height="100%" fill="#fff"/><path d="${M.provinces[p]}" fill="#000"/></mask>`; });
    h += '</defs>';
    provs.forEach((p, i) => { h += `<path class="tk-prov" style="fill:url(#${uid}d)" d="${M.provinces[p]}"/><path class="tk-provline" d="${M.provinces[p]}" mask="url(#${uid}m${i})"/>`; });
    h += `<path class="tk-route-all" d="${d}"/><path class="tk-route-done rm-line" d="${d}"/>`;
    h += `<circle class="tk-city" cx="${x1}" cy="${y1}" r="6"/><circle class="tk-city" cx="${x2}" cy="${y2}" r="6"/>`;
    const right = x2 < 470;
    h += `<text class="tk-label" x="${x1 + 12}" y="${y1 + 4}">DURBAN</text>`;
    h += `<text class="tk-label" x="${right ? x2 + 12 : x2 - 12}" y="${y2 + 4}" text-anchor="${right ? 'start' : 'end'}">${(svg.dataset.to || '').toUpperCase()}</text>`;
    h += `<g class="rm-truck"><circle class="tk-pos-ring" r="10"/><circle class="tk-pos" r="7"/></g>`;
    svg.innerHTML = h;
    const line = svg.querySelector('.rm-line'), dot = svg.querySelector('.rm-truck'), L = line.getTotalLength();
    const place = t => { const pt = line.getPointAtLength(L * t); dot.setAttribute('transform', `translate(${pt.x} ${pt.y})`); line.style.strokeDashoffset = L * (1 - t); };
    line.style.strokeDasharray = L;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) { place(1); return; }
    place(0);
    const io = new IntersectionObserver(es => {
      if (!es[0].isIntersecting) return;
      io.disconnect();
      const t0 = performance.now(), dur = 2200;
      const step = now => { const t = Math.min(1, (now - t0) / dur); place(t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2); if (t < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }, { threshold: .35 });
    io.observe(svg);
  });
})();
