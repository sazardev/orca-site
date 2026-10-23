/* Orca — alpha site. No dependencies. One scroll listener drives every scene through --p. */
(() => {
  const d = document, root = d.documentElement;
  const $ = (s, el = d) => el.querySelector(s), $$ = (s, el = d) => [...el.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
  };
  root.classList.remove('no-js');

  /* theme + motion */
  const saved = store.get('orca-theme');
  if (saved) root.dataset.theme = saved;
  if (store.get('orca-motion') === 'full') root.dataset.motion = 'full';
  const dark = () => root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  $$('[data-theme-toggle]').forEach((b) => b.addEventListener('click', () => {
    const next = dark() ? 'light' : 'dark';
    root.dataset.theme = next; store.set('orca-theme', next);
    b.setAttribute('aria-pressed', String(next === 'dark'));
  }));
  $$('[data-motion-toggle]').forEach((b) => {
    const sync = () => { b.textContent = root.dataset.motion === 'full' ? 'Full motion: on' : 'Full motion: off'; };
    sync();
    b.addEventListener('click', () => {
      if (root.dataset.motion === 'full') { delete root.dataset.motion; store.set('orca-motion', ''); } else { root.dataset.motion = 'full'; store.set('orca-motion', 'full'); }
      sync(); frame();
    });
  });

  /* words: wrap for the scroll-read effect */
  $$('[data-words]').forEach((el) => {
    const nodes = [...el.childNodes]; let i = 0; const frag = d.createDocumentFragment();
    const wrap = (text, host) => text.split(/(\s+)/).forEach((t) => {
      if (!t) return;
      if (/^\s+$/.test(t)) { host.append(t); return; }
      const s = d.createElement('span'); s.className = 'w'; s.style.setProperty('--i', i++); s.textContent = t; host.append(s);
    });
    nodes.forEach((n) => {
      if (n.nodeType === 3) wrap(n.textContent, frag);
      else { const c = n.cloneNode(false); wrap(n.textContent, c); frag.append(c); }
    });
    el.replaceChildren(frag);
    el.style.setProperty('--n', i);
    el.setAttribute('aria-label', el.textContent);
    $$('.w', el).forEach((w) => w.setAttribute('aria-hidden', 'true'));
  });

  /* scenes: progress 0..1 as CSS variable --p
     pass: enters to leaves · sticky: through a tall section · exit: from the top of the page · read: top at 85% to 30% */
  const scenes = $$('[data-scene]'), live = new Set();
  const io = new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? live.add(e.target) : live.delete(e.target))), { rootMargin: '25% 0px' });
  scenes.forEach((s) => io.observe(s));
  const gauge = $('.gauge span'); let lastM = -1;
  const navEl = $('.nav');
  const steps = new Map();
  function frame() {
    pending = false;
    const vh = innerHeight, y = scrollY;
    const page = clamp(y / Math.max(1, root.scrollHeight - vh));
    root.style.setProperty('--page', page.toFixed(4));
    if (gauge) { const m = Math.round(page * 200); if (m !== lastM) { lastM = m; gauge.textContent = m + ' m'; } }
    navEl && navEl.classList.toggle('solid', y > 40);
    live.forEach((el) => {
      const r = el.getBoundingClientRect(), mode = el.dataset.scene; let p;
      if (mode === 'sticky') p = -r.top / Math.max(1, r.height - vh);
      else if (mode === 'exit') p = -r.top / Math.max(1, r.height);
      else if (mode === 'read') p = (vh * 0.85 - r.top) / (vh * 0.55);
      else p = (vh - r.top) / (vh + r.height);
      p = clamp(p); el.style.setProperty('--p', p.toFixed(4));
      const fn = steps.get(el); if (fn) fn(p);
    });
  }
  let pending = false;
  const tick = () => { if (!pending) { pending = true; requestAnimationFrame(frame); } };
  addEventListener('scroll', tick, { passive: true }); addEventListener('resize', tick);

  /* reveals */
  const rv = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); rv.unobserve(e.target); } }), { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
  $$('[data-reveal], .track').forEach((el) => rv.observe(el));

  /* redacted lines open as they are read */
  const rd = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { setTimeout(() => e.target.classList.add('open'), +e.target.dataset.delay || 0); rd.unobserve(e.target); } }), { threshold: 0.8 });
  $$('.redact').forEach((el) => { el.style.setProperty('--r', 0); rd.observe(el); });

  /* flow diagram: three steps through a tall sticky scene */
  const flow = $('.flow');
  if (flow) {
    const lis = $$('.steps li', flow), groups = $$('[data-s]', flow);
    steps.set(flow, (p) => {
      const s = Math.min(3, Math.floor(p * 3.2) + 1);
      lis.forEach((li, i) => li.classList.toggle('on', i + 1 <= s && i + 1 === s));
      groups.forEach((g) => g.classList.toggle('on', +g.dataset.s <= s));
    });
  }

  /* story: the card in the middle of the screen picks the phone's screen */
  const cards = $$('.story .card'), screens = $$('.screens .screen');
  if (cards.length) {
    const pick = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      const i = cards.indexOf(e.target);
      cards.forEach((c, k) => c.classList.toggle('on', k === i));
      screens.forEach((s, k) => s.classList.toggle('on', k === i));
    }), { rootMargin: '-42% 0px -42% 0px' });
    cards.forEach((c) => pick.observe(c));
    cards[0].classList.add('on'); screens[0] && screens[0].classList.add('on');
  }

  /* palette demo */
  const PAL = {
    japandi: ['Japandi', ['#F5F1EA', '#FFFFFF', '#2B2B2B', '#666666', '#76665A', '#4F7A55', '#A0522D', '#DDD6CB'], ['#1F1C19', '#2A2622', '#ECE6DC', '#A89E92', '#B8A694', '#8FB093', '#D9946F', '#3D3731']],
    moss: ['Moss', ['#F1F3EC', '#FFFFFF', '#25291F', '#5E6556', '#4F6B45', '#3F7A4A', '#A0522D', '#D5DACB'], ['#1A1D17', '#23271F', '#E6EADF', '#A3AB98', '#A7C49A', '#8FC49A', '#E0976F', '#353B2E']],
    slate: ['Slate', ['#EEF1F4', '#FFFFFF', '#1F2630', '#596373', '#3D5A80', '#3E7B55', '#A8432F', '#D3D9E0'], ['#151A21', '#1E252E', '#E3E8EF', '#9AA6B5', '#9DB7D9', '#85BE9A', '#E58F7B', '#2E3744']],
    plum: ['Plum', ['#F3EEF3', '#FFFFFF', '#2A2230', '#66596D', '#6B4B7D', '#47794F', '#A0522D', '#DDD2DE'], ['#1C171F', '#261F2A', '#EBE4EE', '#AD9FB4', '#C6A6D9', '#8DBF95', '#E39A74', '#3A3040']],
    ocean: ['Ocean', ['#EEF5F5', '#FFFFFF', '#14292B', '#4B6366', '#0F6B73', '#2F7A4D', '#A8432F', '#CFE0E1'], ['#0F1A1C', '#172529', '#E0EEEF', '#93AEB1', '#6FC4CC', '#86C99D', '#E8917E', '#27393D']],
    ember: ['Ember', ['#F8F1EC', '#FFFFFF', '#2E211B', '#6B5A50', '#A94E0A', '#4E7A3F', '#9E2A2B', '#E6D8CC'], ['#1E1814', '#2A211B', '#F0E6DC', '#B0A093', '#F0A060', '#93C47D', '#E8928A', '#41342B']],
    rose: ['Rose', ['#F9EFF1', '#FFFFFF', '#2D1F23', '#6D5A60', '#9F2F57', '#3F7A52', '#A33A1F', '#EAD6DB'], ['#1D1417', '#291D21', '#F2E5E8', '#B39BA2', '#F29BB5', '#8CC49C', '#E69A78', '#40303A']],
    nord: ['Nord', ['#ECEFF4', '#FFFFFF', '#2E3440', '#5A667A', '#4C6A94', '#4E7B4A', '#A5444F', '#D8DEE9'], ['#2E3440', '#3B4252', '#ECEFF4', '#A9B4C6', '#88C0D0', '#A3BE8C', '#E59AA0', '#4C566A']],
  };
  const KEYS = ['bg', 'card', 'ink', 'muted', 'accent', 'ok', 'danger', 'line'], NAMES = ['Paper', 'Card', 'Ink', 'Muted', 'Accent', 'Moss', 'Clay', 'Line'];
  const palBox = $('#pal');
  if (palBox) {
    let id = 'japandi', mode = 'light', round = 1.1, dens = 1;
    const sw = $('#sw');
    const apply = () => {
      const c = PAL[id][mode === 'light' ? 1 : 2];
      KEYS.forEach((k, i) => root.style.setProperty('--m-' + k, c[i]));
      root.style.setProperty('--m-on', mode === 'light' ? '#FFFFFF' : c[0]);
      root.style.setProperty('--m-r', round + 'em'); root.style.setProperty('--dens', dens);
      sw.innerHTML = c.map((h, i) => { const lum = parseInt(h.slice(1, 3), 16) * .3 + parseInt(h.slice(3, 5), 16) * .59 + parseInt(h.slice(5, 7), 16) * .11; return `<div style="--c:${h};--tc:${lum > 140 ? '#2B2B2B' : '#fff'}"><b>${NAMES[i]}</b>${h}</div>`; }).join('');
      $$('button', palBox).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === id)));
      $$('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
      $$('[data-round]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.round === round)));
      $$('[data-dens]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.dens === dens)));
    };
    palBox.innerHTML = Object.entries(PAL).map(([k, v]) => `<button type="button" data-id="${k}" aria-pressed="false" style="--a:${v[1][4]};--b:${v[1][0]}"><i></i>${v[0]}</button>`).join('');
    palBox.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { id = b.dataset.id; apply(); } });
    $$('[data-mode]').forEach((b) => b.addEventListener('click', () => { mode = b.dataset.mode; apply(); }));
    $$('[data-round]').forEach((b) => b.addEventListener('click', () => { round = +b.dataset.round; apply(); }));
    $$('[data-dens]').forEach((b) => b.addEventListener('click', () => { dens = +b.dataset.dens; apply(); }));
    apply();
  }

  /* bubbles rising in the deep */
  $$('.bubbles').forEach((box) => {
    const n = innerWidth < 700 ? 9 : 18;
    for (let i = 0; i < n; i++) {
      const b = d.createElement('i'), s = 6 + Math.random() * 26;
      b.style.cssText = `--x:${(Math.random() * 100).toFixed(1)}%;--s:${s.toFixed(0)}px;--t:${(14 + Math.random() * 16).toFixed(1)}s;--dl:${(-Math.random() * 24).toFixed(1)}s`;
      box.append(b);
    }
  });

  /* copy buttons */
  $$('.copy').forEach((b) => b.addEventListener('click', async () => {
    const text = $('pre', b.parentElement).innerText.replace(/\n$/, '');
    try { await navigator.clipboard.writeText(text); b.textContent = 'Copied'; } catch { b.textContent = 'Press ⌘/Ctrl+C'; }
    setTimeout(() => { b.textContent = 'Copy'; }, 1800);
  }));

  /* doc rail */
  const rail = $$('.rail a'), docSteps = $$('.dstep');
  if (rail.length) {
    const spy = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) rail.forEach((a) => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id));
    }), { rootMargin: '-30% 0px -60% 0px' });
    docSteps.forEach((s) => spy.observe(s));
  }

  const yr = $('[data-year]'); if (yr) yr.textContent = new Date().getFullYear();
  frame();
})();
