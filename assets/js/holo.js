/* M.I.E. Logistics — hologram hero.
   Renders the real truck footage through a WebGL shader that edge-detects it live
   and dissolves it into a glowing blue point-cloud, then cross-dissolves to the aerial shot.
   Exposes window.MIE_HOLO.set({ mix, swap, zoom }) for the scroll timeline in site.js. */
(() => {
  const canvas = document.getElementById('holoGL');
  const vA = document.getElementById('holoA');
  const vB = document.getElementById('holoB');
  if (!canvas || !vA) return;
  const section = canvas.closest('.holo');
  const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: false });
  if (!gl) { section.classList.add('holo--fallback'); return; }

  const VERT = `attribute vec2 p; varying vec2 vUv; void main(){ vUv = p*.5+.5; gl_Position = vec4(p,0.,1.); }`;
  const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uA, uB;
uniform vec2 uRes, uVA, uVB;
uniform float uMix, uSwap, uTime, uZoom, uPan;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.03; a*=.5; } return v; }
float lum(vec3 c){ return dot(c, vec3(.299,.587,.114)); }
vec2 cover(vec2 uv, vec2 vid){
  float ra = uRes.x/uRes.y, rv = vid.x/vid.y;
  vec2 s = ra > rv ? vec2(1., rv/ra) : vec2(ra/rv, 1.);
  vec2 c = (uv - .5) * s / uZoom + .5;
  c.x += uPan;
  return c;
}
float L(sampler2D t, vec2 uv){ return lum(texture2D(t, uv).rgb); }
vec3 holo(sampler2D t, vec2 uv, vec2 tx, float seed){
  float a=L(t,uv+tx*vec2(-1., 1.)), b=L(t,uv+tx*vec2(0., 1.)), c=L(t,uv+tx*vec2(1., 1.));
  float d=L(t,uv+tx*vec2(-1., 0.)),                             f=L(t,uv+tx*vec2(1., 0.));
  float g=L(t,uv+tx*vec2(-1.,-1.)), h=L(t,uv+tx*vec2(0.,-1.)), i=L(t,uv+tx*vec2(1.,-1.));
  float gx = (c+2.*f+i)-(a+2.*d+g), gy = (g+2.*h+i)-(a+2.*b+c);
  float e = smoothstep(.10, .55, length(vec2(gx,gy)));
  vec2 cell = floor(gl_FragCoord.xy / 2.);
  float r = hash(cell + floor(uTime*10.) + seed);
  float pts = step(.58, r);
  float base = L(t, uv);
  vec3 blue = vec3(.33,.63,1.);
  vec3 col = blue * (e*.85 + e*pts*1.9);
  col += vec3(.06,.13,.32) * base * .55;
  col += blue * step(.997, hash(cell*.37 + floor(uTime*3.))) * .8 * base;   /* drifting sparks */
  col += vec3(.03,.06,.14) * (.5+.5*sin(gl_FragCoord.y*1.4 - uTime*7.)) * .5;  /* scanlines */
  return col;
}
void main(){
  vec2 uvA = cover(vUv, uVA);
  vec3 real = texture2D(uA, uvA).rgb;
  vec3 col = real;
  if (uMix > .001) {
    vec3 hA = holo(uA, uvA, 1.4/uVA, 0.);
    float n = fbm(vUv*vec2(5.5,3.6) + vec2(0., uTime*.05));
    float th = uMix*1.25 - .12;
    float m = smoothstep(n-.012, n+.012, th);
    float d = abs(n-th);
    float live = step(uMix, .999);
    float band = (1.-smoothstep(0., .012, d)) * live;
    vec2 pc = floor(gl_FragCoord.xy / 2.);
    float spark = step(.82, hash(pc + floor(uTime*24.))) * (1.-smoothstep(0., .07, d)) * step(th, n) * live;
    col = mix(real, hA, m) + band*vec3(.55,.8,1.)*1.2 + spark*vec3(.6,.85,1.)*1.6;
  }
  if (uSwap > .001) {
    vec2 uvB = cover(vUv, uVB);
    vec3 hB = holo(uB, uvB, 1.4/uVB, 9.);
    float n2 = fbm(vUv*5. + 7.3);
    float th2 = uSwap*1.25 - .12;
    float m2 = smoothstep(n2-.015, n2+.015, th2);
    float d2 = abs(n2-th2);
    float live2 = step(uSwap, .999);
    vec2 pc2 = floor(gl_FragCoord.xy / 2.);
    float spark2 = step(.82, hash(pc2 + floor(uTime*24.) + 3.)) * (1.-smoothstep(0., .07, d2)) * step(th2, n2) * live2;
    col = mix(col, hB, m2) + (1.-smoothstep(0., .012, d2))*live2*vec3(.55,.8,1.) + spark2*vec3(.6,.85,1.)*1.4;
  }
  col *= smoothstep(1.25, .35, length((vUv-.5)*vec2(1.1,1.)));
  gl_FragColor = vec4(col, 1.);
}`;

  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (e) { console.warn('holo shader', e); section.classList.add('holo--fallback'); return; }
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = n => gl.getUniformLocation(prog, n);
  const u = { A: U('uA'), B: U('uB'), res: U('uRes'), vA: U('uVA'), vB: U('uVB'), mix: U('uMix'), swap: U('uSwap'), time: U('uTime'), zoom: U('uZoom'), pan: U('uPan') };

  const mkTex = unit => {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([8, 9, 11, 255]));
    return t;
  };
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  const tA = mkTex(0), tB = mkTex(1);
  gl.uniform1i(u.A, 0); gl.uniform1i(u.B, 1);

  const state = { mix: 0, swap: 0, zoom: 1, pan: 0 };
  let w = 0, h = 0, visible = true, ready = false;
  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    w = Math.round(canvas.clientWidth * dpr); h = Math.round(canvas.clientHeight * dpr);
    canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h);
  };
  resize(); addEventListener('resize', resize);
  new IntersectionObserver(es => { visible = es[0].isIntersecting; visible ? play() : pause(); }).observe(section);
  const play = () => { [vA, vB].forEach(v => v && v.play().catch(() => {})); };
  const pause = () => { [vA, vB].forEach(v => v && v.pause()); };
  const upload = (tex, unit, v) => {
    if (!v || v.readyState < 2) return false;
    gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, v);
    return true;
  };
  const t0 = performance.now();
  const frame = () => {
    requestAnimationFrame(frame);
    if (!visible) return;
    const okA = upload(tA, 0, vA);
    if (state.swap > .001) upload(tB, 1, vB);
    if (okA && !ready) { ready = true; section.classList.add('holo--ready'); }
    gl.uniform2f(u.res, w, h);
    gl.uniform2f(u.vA, vA.videoWidth || 1280, vA.videoHeight || 716);
    gl.uniform2f(u.vB, (vB && vB.videoWidth) || 1280, (vB && vB.videoHeight) || 716);
    gl.uniform1f(u.mix, state.mix); gl.uniform1f(u.swap, state.swap);
    gl.uniform1f(u.zoom, state.zoom); gl.uniform1f(u.pan, state.pan);
    gl.uniform1f(u.time, (performance.now() - t0) / 1000);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
  play();
  frame();
  window.MIE_HOLO = { state, set: o => Object.assign(state, o) };
})();
