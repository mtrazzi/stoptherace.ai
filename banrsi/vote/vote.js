// Ban RSI photo face-off: show two photos, the visitor taps the one they'd rather click on, repeat.
// Each pick goes to the vote API (window.VOTE_API, the aitreatymarch-vote Cloudflare Worker, album "banrsi").
// "Top picks" ranks the photos with rank.js (Bradley–Terry fit + bootstrap).
(function () {
  const { album, count } = window.VOTE;
  const API = (window.VOTE_API || '').replace(/\/$/, '');
  const ids = Array.from({ length: count }, (_, i) => `${album}-${String(i + 1).padStart(3, '0')}`);
  const src = id => `/banrsi/vote/p/${id}.webp?v=2`;   // bump v when the photo files change (watermark added: v=2)
  const TOPK = window.VOTE.topK || 3;
  const $ = s => document.querySelector(s);

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };
  let voter = store.get('vote-voter', null);
  if (!voter) { voter = Math.random().toString(36).slice(2) + Date.now().toString(36); store.set('vote-voter', voter); }

  const myVotesKey = `vote-${album}-mine`;
  let myVotes = store.get(myVotesKey, []);          // [[winner, loser], ...] — kept for the offline fallback
  const key = p => [...p].sort().join('|');
  const seenPairs = new Set(myVotes.map(key));
  const shows = Object.fromEntries(ids.map(id => [id, 0]));

  // No right-click / drag / long-press save on the photos.
  document.addEventListener('contextmenu', e => { if (e.target.closest('.pick, .tile')) e.preventDefault(); });
  document.addEventListener('dragstart', e => { if (e.target.closest('.pick, .tile')) e.preventDefault(); });

  async function getJSON(path) {
    if (!API) return null;
    try { const r = await fetch(`${API}${path}`, { cache: 'no-store' }); return r.ok ? await r.json() : null; } catch { return null; }
  }

  // ---------- voting ----------
  const pickA = $('#pickA'), pickB = $('#pickB');
  let current = null, next = null, busy = false;
  const allPairs = count * (count - 1) / 2;
  const taken = p => seenPairs.has(key(p)) || (current && key(p) === key(current));

  // Unseen pairs, least-shown photos first, picked at random from the best third.
  function makePair() {
    const open = [];
    for (let i = 0; i < count; i++) for (let j = i + 1; j < count; j++)
      if (!taken([ids[i], ids[j]])) open.push([ids[i], ids[j]]);
    if (!open.length) return null;
    open.sort((x, y) => (shows[x[0]] + shows[x[1]]) - (shows[y[0]] + shows[y[1]]) || Math.random() - 0.5);
    const pool = open.slice(0, Math.max(1, Math.ceil(open.length / 3)));
    const pr = pool[Math.floor(Math.random() * pool.length)];
    return Math.random() < 0.5 ? pr : [pr[1], pr[0]];
  }

  const ratio = {};
  const preload = pair => Promise.all(pair.map(id => new Promise(res => {
    if (ratio[id]) return res();
    const i = new Image();
    i.onload = () => { ratio[id] = i.naturalWidth / i.naturalHeight; res(); };
    i.onerror = () => { ratio[id] = 1.5; res(); };
    i.src = src(id);
  })));

  // Give both photos the same height, as big as fits, so neither looks "bigger" and none is cropped.
  function layout() {
    if (!current || current.some(id => !ratio[id])) return;
    const box = $('.pair'), W = box.clientWidth, gap = 12;
    const stacked = window.innerWidth <= 700;
    const [r1, r2] = current.map(id => ratio[id]);
    const top = box.getBoundingClientRect().top + window.scrollY;
    let h;
    if (stacked) {
      const avail = Math.max(440, window.innerHeight - Math.min(top, 160) - 70);
      h = Math.min(W / Math.max(r1, r2), (avail - 10) / 2);
    } else {
      const avail = Math.max(320, Math.min(window.innerHeight - 150, 760));
      h = Math.min((W - gap) / (r1 + r2), avail);
    }
    [pickA, pickB].forEach((el, i) => { el.style.height = h + 'px'; el.style.width = h * [r1, r2][i] + 'px'; });
  }
  window.addEventListener('resize', layout);

  function show(pair) {
    current = pair;
    $('#done').hidden = !!pair; $('.pair').hidden = !pair; $('#skip').hidden = !pair;
    if (!pair) { document.body.classList.remove('loading'); return; }
    preload(pair).then(() => {
      if (current !== pair) return;
      [pickA, pickB].forEach((el, i) => {
        el.classList.remove('won', 'lost');
        el.querySelector('.photo').style.backgroundImage = `url("${src(pair[i])}")`;
      });
      layout();
      document.body.classList.remove('loading');
    });
    next = makePair();
    if (next) preload(next);
  }

  async function choose(i) {
    if (busy || !current) return;
    busy = true;
    const winner = current[i], loser = current[1 - i];
    [pickA, pickB][i].classList.add('won');
    [pickA, pickB][1 - i].classList.add('lost');
    record(winner, loser);
    await Promise.all([next ? preload(next) : 0, new Promise(r => setTimeout(r, 260))]);
    show(next);
    busy = false;
  }
  function skip() {
    if (busy || !current) return;
    current.forEach(id => shows[id]++);
    seenPairs.add(key(current));   // don't offer the same pair again this visit
    show(next || makePair());
  }

  function record(winner, loser) {
    shows[winner]++; shows[loser]++;
    seenPairs.add(key([winner, loser]));
    myVotes.push([winner, loser]); store.set(myVotesKey, myVotes.slice(-2000));
    updateCount();
    if (API) fetch(`${API}/vote`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
      body: JSON.stringify({ album, winner, loser, voter }),
    }).catch(() => {});
  }
  function updateCount() {
    $('#count').textContent = myVotes.length;
    $('#toTop').hidden = myVotes.length < Math.min(10, allPairs);
  }

  // ---------- top picks ----------
  const pctTxt = p => p >= 0.995 ? '>99%' : p < 0.01 ? '<1%' : `${Math.round(p * 100)}%`;
  function verdict(r) {
    if (r.shows < 10) return ['early', 'Too early'];
    if (r.pTop >= 0.9) return ['safe', 'Safe pick'];
    if (r.pTop >= 0.5) return ['likely', `Likely top ${TOPK}`];
    if (r.pTop < 0.02 && r.high < 50) return ['skip', 'Skip'];
    return ['', ''];
  }
  async function renderTop() {
    const grid = $('#grid');
    grid.innerHTML = '<p class="empty">Loading…</p>';
    let d = await getJSON(`/pairs?album=${album}`), local = false;
    if (!d) {
      local = true;
      const m = {}; for (const [w, l] of myVotes) m[w + '|' + l] = (m[w + '|' + l] || 0) + 1;
      d = { pairs: Object.entries(m).map(([k, n]) => [...k.split('|'), n]), votes: myVotes.length, voters: myVotes.length ? 1 : 0 };
    }
    $('#boardMeta').textContent = local
      ? 'Your picks only (live tally not reachable)'
      : `${(d.votes || 0).toLocaleString()} votes · ${(d.voters || 0).toLocaleString()} people voting`;
    if (!d.votes) { grid.innerHTML = '<p class="empty">No votes yet.</p>'; return; }
    await new Promise(r => setTimeout(r, 0));   // let "Loading…" paint before the number crunching
    const rows = window.rankPhotos(ids, d.pairs, { topK: TOPK }).filter(r => r.shows > 0);
    grid.innerHTML = rows.map((r, i) => {
      const [cls, label] = verdict(r);
      return `
      <figure class="tile">
        <div class="img"><div class="photo" style="background-image:url('${src(r.id)}')"></div><div class="shield"></div>
          <span class="rank">${i + 1}</span>${label ? `<span class="badge ${cls}">${label}</span>` : ''}</div>
        <figcaption>
          <div class="score"><b>${Math.round(r.score)}</b><span>likely ${Math.round(r.low)}–${Math.round(r.high)}</span></div>
          <div class="range" aria-hidden="true"><i style="left:${r.low}%;width:${Math.max(1, r.high - r.low)}%"></i><u style="left:${r.score}%"></u></div>
          <dl><div><dt>Chance #1</dt><dd>${pctTxt(r.pFirst)}</dd></div><div><dt>Top ${TOPK}</dt><dd>${pctTxt(r.pTop)}</dd></div><div><dt>Won</dt><dd>${r.wins}/${r.shows}</dd></div></dl>
          <span class="pid">Photo #${ids.indexOf(r.id) + 1}</span>
        </figcaption>
      </figure>`;
    }).join('');
  }

  // ---------- views ----------
  function route() {
    const top = location.hash === '#top';
    $('#voteView').hidden = top; $('#topView').hidden = !top;
    document.querySelectorAll('[data-view]').forEach(a => a.toggleAttribute('aria-current', (a.dataset.view === 'top') === top));
    if (top) renderTop(); else if (!current) show(makePair());
    window.scrollTo(0, 0);
  }

  pickA.addEventListener('click', () => choose(0));
  pickB.addEventListener('click', () => choose(1));
  $('#skip').addEventListener('click', skip);
  document.addEventListener('keydown', e => {
    if (location.hash === '#top' || e.metaKey || e.ctrlKey) return;
    if (e.key === 'ArrowLeft' || e.key === '1') choose(0);
    else if (e.key === 'ArrowRight' || e.key === '2') choose(1);
    else if (e.key === 's' || e.key === ' ') { e.preventDefault(); skip(); }
  });
  window.addEventListener('hashchange', route);

  // Seed exposure counts from the live tally so new visitors see under-voted photos first.
  getJSON(`/stats?album=${album}`).then(s => { if (s) for (const [id, p] of Object.entries(s.photos || {})) if (id in shows) shows[id] += p.shows / Math.max(1, s.voters); });
  updateCount();
  route();
})();
