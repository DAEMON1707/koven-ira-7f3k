(() => {
  const C = window.GREETING;
  const $ = (s) => document.querySelector(s);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const rnd = (a, b) => a + Math.random() * (b - a);

  // ================= Sound (Web Audio, no files) =================
  const Snd = (() => {
    let ctx, master, music, sfx, noise, timer, nextT, step = 0, muted = false;
    const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

    function init() {
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
      if (ctx) { if (!muted && ctx.state !== 'running') ctx.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400; lp.connect(master);
      music = ctx.createGain(); music.gain.value = 0.17; music.connect(lp);
      sfx = ctx.createGain(); sfx.gain.value = 0.8; sfx.connect(master);
      const len = ctx.sampleRate * 2;
      noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const b = ctx.createBufferSource(); b.buffer = ctx.createBuffer(1, 1, 22050); b.connect(ctx.destination); b.start(0);
      ctx.resume();
      document.addEventListener('visibilitychange', () => {
        if (!ctx) return;
        if (document.hidden) ctx.suspend(); else if (!muted) ctx.resume();
      });
    }

    function tone({ f, to, t = 0, at, d = 0.3, type = 'sine', v = 0.3, dest, vib = false, attack = 0.008 }) {
      if (!ctx) return;
      const s = at != null ? at : ctx.currentTime + t;
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(f, s);
      if (to) o.frequency.exponentialRampToValueAtTime(to, s + d);
      if (vib) {
        const l = ctx.createOscillator(); const lg = ctx.createGain();
        l.frequency.value = 5.5; lg.gain.value = f * 0.012; l.connect(lg); lg.connect(o.frequency);
        l.start(s); l.stop(s + d + 0.05);
      }
      g.gain.setValueAtTime(0.0001, s);
      g.gain.exponentialRampToValueAtTime(v, s + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, s + d);
      o.connect(g); g.connect(dest || sfx);
      o.start(s); o.stop(s + d + 0.05);
    }

    function hiss({ t = 0, d = 0.5, v = 0.5, type = 'lowpass', f = 1000, to, q = 1, attack = 0.01 }) {
      if (!ctx) return;
      const s = ctx.currentTime + t;
      const src = ctx.createBufferSource(); src.buffer = noise; src.loop = true;
      const fl = ctx.createBiquadFilter(); fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f, s);
      if (to) fl.frequency.exponentialRampToValueAtTime(to, s + d);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, s);
      g.gain.exponentialRampToValueAtTime(v, s + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, s + d);
      src.connect(fl); fl.connect(g); g.connect(sfx);
      src.start(s); src.stop(s + d + 0.05);
    }

    // Spooky-playful waltz in D minor
    const MEL = [[69, 74, 77], [76, 74, 69], [70, 74, 79], [77, 76, 73], [74, 77, 81], [79, 77, 74], [70, 74, 76], [73, 69, null]];
    const CH = [[50, 53, 57], [50, 53, 57], [55, 58, 62], [57, 61, 64], [50, 53, 57], [58, 62, 65], [55, 58, 62], [57, 61, 64]];
    const BS = [38, 38, 43, 45, 38, 46, 43, 45];
    const Q = 0.42;
    function schedule() {
      while (nextT < ctx.currentTime + 0.25) {
        const bar = Math.floor(step / 3) % 8, beat = step % 3, loop = Math.floor(step / 24);
        if (beat === 0) tone({ at: nextT, f: hz(BS[bar]), d: Q * 1.7, type: 'triangle', v: 0.6, dest: music });
        else CH[bar].forEach((m) => tone({ at: nextT, f: hz(m), d: 0.16, type: 'square', v: 0.045, dest: music }));
        const m = MEL[bar][beat];
        if (m) tone({ at: nextT, f: hz(m + (loop % 2 ? 12 : 0)), d: Q * 0.95, type: loop % 2 ? 'sine' : 'triangle', v: 0.32, dest: music, vib: true });
        nextT += Q; step++;
      }
    }

    return {
      init,
      startMusic() { if (!ctx || timer) return; nextT = ctx.currentTime + 0.1; timer = setInterval(schedule, 60); },
      toggle() {
        muted = !muted;
        if (ctx) { if (muted) ctx.suspend(); else ctx.resume(); }
        return muted;
      },
      whoosh(d = 1.1) { hiss({ d, v: 0.55, type: 'bandpass', f: 300, to: 2600, q: 1.2, attack: d * 0.4 }); },
      crash() {
        hiss({ d: 0.45, v: 0.9, f: 1400, to: 200 });
        tone({ f: 110, to: 40, d: 0.5, v: 0.9 });
        tone({ f: 520, d: 0.25, type: 'square', v: 0.12, t: 0.05 });
        tone({ f: 790, d: 0.22, type: 'square', v: 0.09, t: 0.12 });
      },
      plop() { tone({ f: 260, to: 950, d: 0.13, v: 0.5 }); tone({ f: 130, to: 55, d: 0.25, v: 0.4 }); },
      bubble() { const f = rnd(300, 700); tone({ f, to: f * 2.2, d: 0.07, v: 0.07 }); },
      pop() { tone({ f: 600, to: 1300, d: 0.09, v: 0.3 }); },
      sparkle() { [84, 88, 91, 96, 100].forEach((m, i) => tone({ t: i * 0.06, f: hz(m), d: 0.45, type: 'triangle', v: 0.14 })); },
      murmur() { for (let i = 0; i < 4; i++) tone({ t: i * 0.09, f: rnd(480, 900), to: rnd(400, 1000), d: 0.08, type: 'triangle', v: 0.05 }); },
      cough() { hiss({ d: 0.16, v: 0.5, type: 'bandpass', f: 900, q: 2 }); hiss({ t: 0.26, d: 0.16, v: 0.45, type: 'bandpass', f: 800, q: 2 }); },
      rumble(d = 2.2) { hiss({ d, v: 0.7, f: 120, to: 900, attack: d * 0.9 }); tone({ f: 50, to: 120, d, v: 0.5, attack: d * 0.9 }); },
      boom() { hiss({ d: 2.2, v: 1.2, f: 1800, to: 70 }); tone({ f: 80, to: 25, d: 1.6, v: 1 }); },
      fanfare() {
        [62, 66, 69, 74].forEach((m, i) => { tone({ t: i * 0.14, f: hz(m), d: 0.3, type: 'triangle', v: 0.3 }); tone({ t: i * 0.14, f: hz(m), d: 0.25, type: 'square', v: 0.05 }); });
        [74, 78, 81, 86].forEach((m) => { tone({ t: 0.6, f: hz(m), d: 1.6, type: 'triangle', v: 0.18, vib: true }); });
      }
    };
  })();
  ['touchend', 'click'].forEach((e) => document.addEventListener(e, () => Snd.init(), { passive: true }));
  document.addEventListener('gesturestart', (e) => e.preventDefault());

  // ================= Art =================
  const WITCH_SVG = `
  <svg viewBox="0 0 220 200">
    <path d="M118 66 Q172 52 206 92 Q176 90 156 112 Q146 92 122 98 Z" fill="#3b1f5c"/>
    <path d="M164 126 L216 108 L219 170 L164 152 Z" fill="#d9a441"/>
    <path d="M170 130 L214 118 M170 140 L216 140 M170 148 L214 160" stroke="#a87424" stroke-width="2"/>
    <rect x="158" y="126" width="12" height="28" rx="3" fill="#7a3f14"/>
    <line x1="12" y1="146" x2="162" y2="140" stroke="#7a4a1e" stroke-width="7" stroke-linecap="round"/>
    <path d="M90 138 L76 172" stroke="#222" stroke-width="10" stroke-linecap="round"/>
    <path d="M86 146 L94 150 M82 156 L90 160 M78 166 L86 170" stroke="#e04b8a" stroke-width="4"/>
    <path d="M78 172 Q62 170 58 180 L82 180 Z" fill="#111"/>
    <path d="M94 74 Q126 70 136 102 L142 143 L84 143 Q80 110 94 74 Z" fill="#6a2c91"/>
    <path d="M104 92 Q86 116 64 140" stroke="#5a2380" stroke-width="12" fill="none" stroke-linecap="round"/>
    <circle cx="62" cy="142" r="7" fill="#9be08a"/>
    <path d="M88 48 Q122 36 134 70 Q142 96 128 108 Q124 86 114 80 Z" fill="#ff7a1a"/>
    <circle cx="100" cy="62" r="20" fill="#9be08a"/>
    <path d="M84 60 L62 70 L84 71 Z" fill="#86cf75"/>
    <circle cx="71" cy="67" r="2.2" fill="#4e8a40"/>
    <circle cx="92" cy="56" r="5" fill="#fff"/><circle cx="90.5" cy="56.5" r="2.5" fill="#222"/>
    <path d="M86 52 L96 50" stroke="#333" stroke-width="2" stroke-linecap="round"/>
    <path d="M85 76 Q93 82 100 75" stroke="#333" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <rect x="90" y="77" width="4" height="4" fill="#fff"/>
    <ellipse cx="104" cy="45" rx="36" ry="7" fill="#1d1230" transform="rotate(-10 104 45)"/>
    <path d="M85 44 Q97 20 118 0 Q124 10 112 18 Q122 30 125 40 Z" fill="#1d1230"/>
    <path d="M86 40 L124 33 L126 41 L88 47 Z" fill="#b23ad6"/>
    <rect x="101" y="35" width="8" height="8" fill="none" stroke="#ffd36b" stroke-width="2" transform="rotate(-10 105 39)"/>
  </svg>`;

  // ================= Elements =================
  const app = $('#app'), witch = $('#witch'), witchInner = $('#witchInner');
  const bubble = $('#bubble'), bubbleText = $('#bubbleText');
  const cauldron = $('#cauldron'), bubbles = $('#bubbles'), shelf = $('#shelf');
  const cardWrap = $('#cardWrap'), card = $('#card'), fx = $('#fx');
  const progress = $('#progress'), progressNum = $('#progressNum'), mute = $('#mute');
  const ING = C.ingredients;
  let busy = true, done = 0, bubbleRate = 520, bubbleTimer;
  const opened = [];

  witchInner.innerHTML = WITCH_SVG;
  $('#sootyWitch').innerHTML = WITCH_SVG;
  $('#progressTotal').textContent = ING.length;

  const sky = $('#sky');
  for (let i = 0; i < 70; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    s.style.left = rnd(0, 100) + '%'; s.style.top = rnd(0, 70) + '%';
    s.style.animationDelay = rnd(0, 3) + 's';
    if (Math.random() < 0.15) { s.style.width = s.style.height = '3px'; }
    sky.appendChild(s);
  }

  mute.addEventListener('click', (e) => { e.stopPropagation(); mute.textContent = Snd.toggle() ? '🔇' : '🔊'; });

  // ================= Speech =================
  function say(text, wait = true) {
    bubbleText.textContent = text;
    bubble.classList.remove('show');
    void bubble.offsetWidth;
    bubble.classList.add('show');
    bubble.classList.toggle('wait', wait);
    Snd.murmur();
    if (!wait) return Promise.resolve();
    return new Promise((res) => {
      let finished = false;
      const end = () => { if (finished) return; finished = true; document.removeEventListener('click', end); bubble.classList.remove('wait'); res(); };
      setTimeout(() => document.addEventListener('click', end), 700);
    });
  }
  const hush = () => bubble.classList.remove('show', 'wait');

  // ================= Bubbles =================
  function spawnBubble() {
    const b = document.createElement('div');
    b.className = 'bub';
    const sz = rnd(8, 22);
    b.style.width = b.style.height = sz + 'px';
    b.style.left = rnd(0, 100) + '%';
    bubbles.appendChild(b);
    setTimeout(() => b.remove(), 1600);
    if (Math.random() < 0.35) Snd.bubble();
  }
  function bubbleLoop() {
    spawnBubble();
    bubbleTimer = setTimeout(bubbleLoop, rnd(bubbleRate * 0.6, bubbleRate * 1.4));
  }
  function burst(n = 12) { for (let i = 0; i < n; i++) setTimeout(spawnBubble, i * 40); }

  function mouth() {
    const r = cauldron.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height * 0.36, w: r.width };
  }

  function splash(color) {
    const m = mouth();
    for (let i = 0; i < 12; i++) {
      const d = document.createElement('div');
      d.className = 'drop';
      d.style.background = color;
      d.style.left = m.x + 'px'; d.style.top = m.y + 'px';
      fx.appendChild(d);
      const dx = rnd(-m.w * 0.6, m.w * 0.6), up = rnd(60, 160);
      d.animate([
        { transform: 'translate(-50%,-50%) translate(0,0) scale(1)', opacity: 1 },
        { transform: `translate(-50%,-50%) translate(${dx * 0.6}px,${-up}px) scale(1.1)`, opacity: 1, offset: 0.45 },
        { transform: `translate(-50%,-50%) translate(${dx}px,${40}px) scale(.4)`, opacity: 0 }
      ], { duration: 900, easing: 'ease-out' }).onfinish = () => d.remove();
    }
  }

  // ================= Confetti =================
  const cv = $('#confetti'), cx = cv.getContext('2d');
  let parts = [], raf = 0;
  function sizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  sizeCanvas(); addEventListener('resize', sizeCanvas);
  function confetti(n = 80, x = innerWidth / 2, y = innerHeight * 0.4, lifeK = 1) {
    const chars = ['⭐', '✨', '🦇', '🎉', '💜', '🧹', '🎂', '🌙'];
    for (let i = 0; i < n; i++) {
      const a = rnd(0, Math.PI * 2), sp = rnd(4, 13);
      parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 6, r: rnd(0, 6), vr: rnd(-0.2, 0.2), s: rnd(16, 30), c: chars[i % chars.length], life: rnd(140, 220) * lifeK });
    }
    if (!raf) raf = requestAnimationFrame(tick);
  }
  function tick() {
    cx.clearRect(0, 0, innerWidth, innerHeight);
    parts = parts.filter((p) => p.life > 0 && p.y < innerHeight + 40);
    for (const p of parts) {
      p.vy += 0.22; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life--;
      cx.save(); cx.translate(p.x, p.y); cx.rotate(p.r);
      cx.globalAlpha = Math.min(1, p.life / 40);
      cx.font = p.s + 'px serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
      cx.fillText(p.c, 0, 0);
      cx.restore();
    }
    raf = parts.length ? requestAnimationFrame(tick) : 0;
    if (!raf) cx.clearRect(0, 0, innerWidth, innerHeight);
  }

  // ================= Pictures =================
  function picture(src, emoji, cls) {
    const box = document.createElement('div');
    const fallback = () => { box.innerHTML = `<div class="big">${emoji}</div>`; };
    if (!src) { fallback(); return box; }
    const img = new Image();
    img.className = cls;
    img.alt = '';
    img.onerror = fallback;
    img.src = src;
    box.appendChild(img);
    return box;
  }
  const preload = {};
  ING.forEach((it) => { if (it.photo) { const i = new Image(); i.onload = () => (preload[it.photo] = true); i.src = it.photo; } });

  // ================= Intro =================
  async function flyIn() {
    const W = innerWidth, H = innerHeight;
    witch.classList.add('on');
    const r = witch.getBoundingClientRect();
    const k = (x, y, rot) => ({ transform: `translate(${x - r.left}px, ${y - r.top}px) rotate(${rot}deg)` });
    Snd.whoosh(1.4);
    setTimeout(() => Snd.whoosh(1.2), 1500);
    const a1 = witch.animate([
      k(W + 40, -r.height, 15),
      { ...k(W * 0.45, H * 0.16, -5), offset: 0.28 },
      { ...k(W * 0.1, H * 0.4, -25), offset: 0.42 },
      { ...k(W * 0.35, H * 0.58, -120), offset: 0.54 },
      { ...k(W * 0.6, H * 0.38, -240), offset: 0.66 },
      { ...k(W * 0.32, H * 0.2, -360), offset: 0.8 },
      k(-r.width * 0.35, H * 0.3, -385)
    ], { duration: 3300, easing: 'ease-in-out', fill: 'forwards' });
    await a1.finished;
    Snd.crash();
    app.classList.add('shake');
    witchInner.classList.add('dizzy');
    await sleep(1300);
    app.classList.remove('shake');
    witchInner.classList.remove('dizzy');
    const a2 = witch.animate([
      k(-r.width * 0.35, H * 0.3, -385),
      { ...k(W * 0.2, H * 0.05, -350), offset: 0.5 },
      k(r.left, r.top, 0)
    ], { duration: 1500, easing: 'ease-in-out', fill: 'forwards' });
    a1.cancel();
    Snd.whoosh(1.2);
    await a2.finished;
    a2.cancel();
    witchInner.classList.add('hover');
  }

  async function startBrew(quick) {
    $('#stage').classList.remove('hidden');
    if (!quick) {
      await flyIn();
      await say(C.intro[0]);
      cauldron.classList.add('in');
      setTimeout(() => { Snd.crash(); burst(6); }, 800);
      await sleep(1000);
      await say(C.intro[1]);
      await say(C.intro[2], false);
    } else {
      witch.classList.add('on'); witchInner.classList.add('hover'); cauldron.classList.add('ready');
    }
    bubbleLoop();
    buildShelf();
    shelf.classList.add('in');
    progress.classList.add('show');
    busy = false;
  }

  $('#seal').addEventListener('click', async () => {
    Snd.init(); Snd.startMusic(); Snd.sparkle();
    mute.classList.add('show');
    $('#letter').classList.add('gone');
    $('#intro').classList.add('done');
    await sleep(900);
    $('#intro').classList.add('hidden');
    startBrew(false);
  }, { once: true });

  // ================= Brewing =================
  function buildShelf() {
    shelf.innerHTML = '';
    shelf.classList.toggle('wide', ING.length > 8);
    ING.forEach((it, i) => {
      const b = document.createElement('button');
      b.className = 'ingr';
      b.innerHTML = `<span class="e">${it.emoji}</span><span>${it.label}</span>`;
      b.addEventListener('click', (e) => { e.stopPropagation(); throwIn(i, b); });
      shelf.appendChild(b);
    });
  }

  cauldron.addEventListener('click', () => {
    if (busy) return;
    const line = C.stir[Math.floor(Math.random() * C.stir.length)];
    say(line, false);
    if (/Кха/.test(line)) Snd.cough();
    cauldron.classList.remove('jiggle'); void cauldron.offsetWidth; cauldron.classList.add('jiggle');
    burst(8);
  });

  async function throwIn(i, btn) {
    if (busy || btn.classList.contains('used')) return;
    busy = true;
    const it = ING[i];
    btn.classList.add('used');
    say(it.say, false);
    if (/Кха/.test(it.say)) setTimeout(() => Snd.cough(), 900);

    const br = btn.getBoundingClientRect(), m = mouth();
    const f = document.createElement('div');
    f.className = 'flyer'; f.textContent = it.emoji;
    const sx = br.left + br.width / 2, sy = br.top + br.height / 2;
    f.style.left = sx + 'px'; f.style.top = sy + 'px';
    fx.appendChild(f);
    const dx = m.x - sx, dy = m.y - sy, peak = Math.min(0, dy) - 130;
    Snd.pop();
    await f.animate([
      { transform: 'translate(-50%,-50%) translate(0,0) rotate(0) scale(1)' },
      { transform: `translate(-50%,-50%) translate(${dx * 0.5}px,${peak}px) rotate(220deg) scale(1.35)`, offset: 0.5 },
      { transform: `translate(-50%,-50%) translate(${dx}px,${dy}px) rotate(420deg) scale(.35)` }
    ], { duration: 800, easing: 'ease-in-out', fill: 'forwards' }).finished;
    f.remove();

    Snd.plop();
    document.documentElement.style.setProperty('--potion', it.color);
    splash(it.color);
    burst(14);
    cauldron.classList.remove('jiggle'); void cauldron.offsetWidth; cauldron.classList.add('jiggle');
    await sleep(1300);
    hush();
    showCard(i);
  }

  function showCard(i) {
    const it = ING[i];
    card.innerHTML = '';
    card.appendChild(picture(it.photo, it.emoji, 'pic'));
    card.insertAdjacentHTML('afterbegin', `<div class="quote">🧙‍♀️ «${it.say}»</div>`);
    card.insertAdjacentHTML('beforeend', `
      <div class="ing">${it.emoji} ${it.label}</div>
      <h3>${it.title}</h3>
      <p>${it.text}</p>`);
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = done + 1 < ING.length ? 'В книгу заклинаний ✓' : 'Зелье готово?..';
    btn.addEventListener('click', (e) => { e.stopPropagation(); closeCard(i); }, { once: true });
    card.appendChild(btn);
    cardWrap.classList.add('show');
    Snd.sparkle();
    const m = mouth();
    confetti(18, m.x, m.y, 0.4);
  }

  async function closeCard(i) {
    cardWrap.classList.remove('show');
    opened.push(i);
    done++;
    progressNum.textContent = done;
    bubbleRate = Math.max(150, 520 - done * 55);
    hush();
    if (done >= ING.length) { await sleep(400); finale(); }
    else busy = false;
  }

  async function finale() {
    shelf.classList.remove('in');
    await say(C.finale[0]);
    say(C.finale[1], false);
    cauldron.classList.add('overload');
    bubbleRate = 70;
    Snd.rumble(2.4);
    await sleep(2400);
    Snd.boom();
    $('#flash').classList.add('boom');
    hush();
    clearTimeout(bubbleTimer);
    const m = mouth();
    for (let p = 0; p < 9; p++) {
      const pf = document.createElement('div');
      pf.className = 'puff';
      const s = rnd(70, 130);
      pf.style.width = pf.style.height = s + 'px';
      pf.style.left = m.x - s / 2 + rnd(-70, 70) + 'px';
      pf.style.top = m.y - s / 2 + rnd(-90, 30) + 'px';
      pf.style.animationDelay = p * 60 + 'ms';
      fx.appendChild(pf);
      setTimeout(() => pf.remove(), 2600);
    }
    witch.animate([
      { transform: 'none' },
      { transform: `translate(${innerWidth}px, ${-innerHeight * 0.6}px) rotate(900deg) scale(.4)` }
    ], { duration: 1200, easing: 'ease-in', fill: 'forwards' });
    await sleep(900);
    $('#stage').classList.add('hidden');
    progress.classList.remove('show');
    await sleep(500);
    showFinal();
  }

  // ================= Final =================
  function showFinal() {
    const ph = $('#phWrap');
    ph.innerHTML = '';
    const img = new Image();
    img.alt = C.name;
    img.onerror = () => { ph.innerHTML = '<div class="ph-emoji">🧙‍♀️</div>'; };
    img.src = C.finalPhoto;
    ph.appendChild(img);
    $('#dipList').innerHTML = C.diploma.map((d) => `<li>${d}</li>`).join('');
    $('#wish').textContent = C.wish;
    $('#sign').textContent = C.from + ' 🧹';
    $('#final').classList.remove('hidden');
    $('#final').scrollTop = 0;
    Snd.fanfare();
    setTimeout(() => confetti(120, innerWidth / 2, innerHeight * 0.3), 200);
    setTimeout(() => confetti(60, innerWidth * 0.2, innerHeight * 0.5), 900);
    setTimeout(() => confetti(60, innerWidth * 0.8, innerHeight * 0.5), 1300);
  }

  $('#portrait').addEventListener('click', () => {
    const p = $('#portrait');
    p.classList.remove('wiggle'); void p.offsetWidth; p.classList.add('wiggle');
    const r = p.getBoundingClientRect();
    Snd.sparkle();
    confetti(40, r.left + r.width / 2, r.top + r.height / 2);
  });

  $('#openBook').addEventListener('click', () => {
    const list = $('#bookList');
    list.innerHTML = '';
    const order = opened.length ? opened : ING.map((_, i) => i);
    order.forEach((i) => {
      const it = ING[i];
      const row = document.createElement('div');
      row.className = 'entry';
      const th = it.photo && preload[it.photo] ? `<img class="t" src="${it.photo}" alt="">` : `<div class="t">${it.emoji}</div>`;
      row.innerHTML = `${th}<div><b>${it.title}</b><span>${it.text}</span></div>`;
      list.appendChild(row);
    });
    $('#book').classList.add('show');
  });
  $('#closeBook').addEventListener('click', () => $('#book').classList.remove('show'));
  $('#replay').addEventListener('click', () => { location.hash = ''; location.reload(); });

  // ================= Debug entry points: #brew, #card, #final =================
  const h = location.hash;
  if (h === '#brew' || h === '#card') {
    $('#intro').classList.add('hidden');
    mute.classList.add('show');
    startBrew(true).then(() => {
      if (h === '#card') { say(ING[1].say, false); showCard(1); }
      else say(C.intro[2], false);
    });
  } else if (h === '#final') {
    $('#intro').classList.add('hidden');
    showFinal();
  }
})();
