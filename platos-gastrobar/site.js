/* The Anchor — content config, live hours, dissolve reveals, layered parallax. */

/* ─────────────────────────────────────────────────────────
   CONTENT CONFIG — the only block to edit per business.
   hoursConfirmed MUST stay false until the real opening hours
   are confirmed with the owner. While false the page hides the
   weekly table and the live badge entirely and links to Google
   instead, so it can never publish invented hours.
   ───────────────────────────────────────────────────────── */
const CONFIG = {
  timezone: 'Europe/Madrid',
  hoursConfirmed: false,
  /* Minutes from midnight. A close value > 1440 runs past midnight.
     UNVERIFIED — Google showed "Closes 12 am" one day and "12:30 am" another. */
  hours: {
    0: [12 * 60, 24 * 60],
    1: [12 * 60, 24 * 60],
    2: [12 * 60, 24 * 60],
    3: [12 * 60, 24 * 60],
    4: [12 * 60, 24 * 60],
    5: [12 * 60, 24 * 60 + 30],
    6: [12 * 60, 24 * 60 + 30]
  }
};

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const fmt = m => {
  const h = Math.floor(m / 60) % 24, mm = m % 60;
  return `${String(h).padStart(2,'0')}.${String(mm).padStart(2,'0')}`;
};

/* Wall-clock time where the restaurant is, not where the visitor is. */
function venueNow(date = new Date()) {
  const p = new Intl.DateTimeFormat('en-GB', {
    timeZone: CONFIG.timezone, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(date);
  const get = t => p.find(x => x.type === t).value;
  return {
    day: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(get('weekday')),
    mins: +get('hour') % 24 * 60 + +get('minute')
  };
}

/* Open if inside today's range, or inside yesterday's range where it ran past midnight. */
function openState({ day, mins }, hours = CONFIG.hours) {
  const today = hours[day];
  if (today && mins >= today[0] && mins < today[1]) return { open: true, until: today[1] };
  const prev = hours[(day + 6) % 7];
  if (prev && prev[1] > 1440 && mins < prev[1] - 1440) return { open: true, until: prev[1] };
  return { open: false, until: today ? today[0] : null };
}

function paintHours() {
  if (!CONFIG.hoursConfirmed) return;   // stays hidden; Google link shows instead

  document.getElementById('hours-fallback')?.remove();
  const table = document.getElementById('hours-table');
  const badge = document.getElementById('status');
  const now = venueNow();
  const st = openState(now);

  if (badge) {
    badge.hidden = false;
    badge.dataset.state = st.open ? 'open' : 'closed';
    badge.querySelector('.status__txt').textContent =
      st.open ? `Open till ${fmt(st.until)}` : `Opens ${fmt(st.until)}`;
  }

  if (table) {
    table.hidden = false;
    const body = document.getElementById('hours-body');
    if (body && !body.childElementCount) {
      for (let i = 1; i <= 7; i++) {
        const dy = i % 7, r = CONFIG.hours[dy];
        const tr = document.createElement('tr');
        if (dy === now.day) tr.setAttribute('data-today', '');
        tr.innerHTML = `<td>${DAYS[dy]}</td><td>${r ? `${fmt(r[0])} – ${fmt(r[1])}` : 'Closed'}</td>`;
        body.appendChild(tr);
      }
    }
  }
}

/* Wrap each word in a span so headings dissolve in sequence. Preserves <br>. */
function splitWords(el) {
  const frag = document.createDocumentFragment();
  let i = 0;
  [...el.childNodes].forEach(node => {
    if (node.nodeType !== Node.TEXT_NODE) { frag.appendChild(node.cloneNode(true)); return; }
    node.textContent.split(/(\s+)/).forEach(tok => {
      if (!tok) return;
      if (!tok.trim()) { frag.appendChild(document.createTextNode(tok)); return; }
      const s = document.createElement('span');
      s.className = 'w';
      s.style.setProperty('--i', i++);
      s.textContent = tok;
      frag.appendChild(s);
    });
  });
  el.replaceChildren(frag);
  el.classList.add('sw');
  el.removeAttribute('data-r');   // the word spans own the animation now
}

function reveals() {
  if (!reduced) document.querySelectorAll('.hero__h, .mega').forEach(splitWords);

  const items = document.querySelectorAll('[data-r], .sw');
  if (reduced) { items.forEach(n => n.classList.add('in')); return; }
  items.forEach(n => n.style.setProperty('--d', n.dataset.d || 0));

  const io = new IntersectionObserver(es => {
    es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -10% 0px', threshold: .12 });

  items.forEach(n => {
    if (n.classList.contains('hero__h')) { setTimeout(() => n.classList.add('in'), 180); return; }
    io.observe(n);
  });
}

/* Layered parallax: every [data-plx] moves at its own rate off one rAF loop.
   Negative rates move against the scroll, which is what separates the depths. */
function scrollFx() {
  const layers = [...document.querySelectorAll('[data-plx]')]
    .map(el => ({ el, rate: parseFloat(el.dataset.plx) || 0 }));
  const nav = document.getElementById('nav');
  let ticking = false;

  const run = () => {
    const y = window.scrollY || document.documentElement.scrollTop;
    if (nav) nav.classList.toggle('is-stuck', y > 60);
    if (!reduced) layers.forEach(l => { l.el.style.transform = `translate3d(0, ${y * l.rate}px, 0)`; });
    ticking = false;
  };

  addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(run); }
  }, { passive: true });
  run();
}

paintHours();
setInterval(paintHours, 60000);
reveals();
scrollFx();

/* ── Self-check: append ?selftest to the URL ─────────── */
if (location.search.includes('selftest')) {
  const eq = (got, want, label) =>
    console[got === want ? 'log' : 'error'](`${got === want ? 'PASS' : 'FAIL'} ${label} — got ${got}, want ${want}`);
  const H = { 0:[720,1440], 4:[720,1440], 5:[720,1470], 6:[720,1470] };

  eq(openState({ day: 5, mins: 13 * 60 }, H).open, true,  'Fri 13:00 inside range');
  eq(openState({ day: 5, mins: 11 * 60 }, H).open, false, 'Fri 11:00 before opening');
  eq(openState({ day: 6, mins: 29 }, H).open,      true,  'Sat 00:29 — inside Friday spill');
  eq(openState({ day: 6, mins: 30 }, H).open,      false, 'Sat 00:30 — Friday closing minute, shut');
  eq(fmt(24 * 60 + 30), '00.30', 'fmt wraps past midnight');
  eq(document.getElementById('status').hidden, true, 'live badge hidden while hours unconfirmed');
  eq(!!document.getElementById('hours-fallback'), true, 'Google hours link shown instead');
}
