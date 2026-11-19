// Score + confidence for the photo vote.
//
// Score: a Bradley–Terry fit — each photo gets a "strength" so that P(A beats B) = sA / (sA + sB),
// using every match-up, not just raw win counts (beating strong photos counts for more).
// Shown as 0–100: the chance the photo beats an average photo from the set.
// Each photo also gets one pretend win and one pretend loss against an average photo, so a photo
// with 2 wins from 2 doesn't jump to the top on luck.
//
// Confidence: bootstrap. Re-run the fit many times on votes resampled at random; the spread of a
// photo's score gives its likely range, and how often it lands first / in the top K (3, or 10 on
// All cities) gives "Chance #1" and "Top K".
(function (root) {
  function fit(ids, pairs, iters = 60) {
    const n = ids.length, idx = Object.fromEntries(ids.map((id, i) => [id, i]));
    const wins = new Float64Array(n).fill(1);            // prior: 1 win vs an average photo
    const games = [];                                      // [i, j, n] both orders folded together
    const m = new Map();
    for (const [w, l, c] of pairs) {
      const i = idx[w], j = idx[l];
      if (i == null || j == null || !c) continue;
      wins[i] += c;
      const k = i < j ? `${i},${j}` : `${j},${i}`;
      m.set(k, (m.get(k) || 0) + c);
    }
    for (const [k, c] of m) { const [i, j] = k.split(',').map(Number); games.push([i, j, c]); }
    let s = new Float64Array(n).fill(1);
    for (let t = 0; t < iters; t++) {
      const den = new Float64Array(n).fill(0);
      for (let i = 0; i < n; i++) den[i] = 2 / (s[i] + 1);   // prior: 2 games vs strength-1 opponent
      for (const [i, j, c] of games) { const d = c / (s[i] + s[j]); den[i] += d; den[j] += d; }
      const nxt = new Float64Array(n);
      for (let i = 0; i < n; i++) nxt[i] = wins[i] / den[i];
      // keep the average photo at strength 1 (geometric mean)
      let g = 0; for (let i = 0; i < n; i++) g += Math.log(nxt[i]); g = Math.exp(g / n);
      for (let i = 0; i < n; i++) nxt[i] /= g;
      s = nxt;
    }
    return Array.from(s, x => 100 * x / (x + 1));
  }

  // pairs: [[winner, loser, count]]. Returns rows sorted by score, best first.
  // among: only these photos are returned, and Chance #1 / top 3 are counted among them.
  function rank(ids, pairs, { resamples = 300, among = ids, topK = 3 } = {}) {
    const keep = new Set(among), sub = ids.map((id, i) => keep.has(id) ? i : -1).filter(i => i >= 0);
    const n = ids.length;
    const score = fit(ids, pairs);
    const shows = new Array(n).fill(0), wins = new Array(n).fill(0);
    const idx = Object.fromEntries(ids.map((id, i) => [id, i]));
    const votes = [];
    for (const [w, l, c] of pairs) {
      if (idx[w] == null || idx[l] == null) continue;
      wins[idx[w]] += c; shows[idx[w]] += c; shows[idx[l]] += c;
      for (let k = 0; k < c; k++) votes.push([w, l, 1]);
    }
    const samples = ids.map(() => []), first = new Array(n).fill(0), top3 = new Array(n).fill(0);
    if (votes.length) for (let r = 0; r < resamples; r++) {
      const bag = new Array(votes.length);
      for (let k = 0; k < votes.length; k++) bag[k] = votes[(Math.random() * votes.length) | 0];
      const sc = fit(ids, bag, 30);
      const order = sub.map(i => [sc[i], i]).sort((a, b) => b[0] - a[0]);
      if (order.length) first[order[0][1]]++;
      for (let k = 0; k < Math.min(topK, order.length); k++) top3[order[k][1]]++;
      sc.forEach((x, i) => samples[i].push(x));
    }
    const pct = (arr, p) => { if (!arr.length) return null; const a = [...arr].sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(p * a.length))]; };
    const R = Math.max(1, resamples), boot = votes.length && resamples > 0;
    return sub.map(i => ids[i]).map(id => [id, idx[id]]).map(([id, i]) => ({
      id, score: score[i], wins: wins[i], shows: shows[i],
      low: pct(samples[i], 0.05) ?? 0, high: pct(samples[i], 0.95) ?? 100,
      pFirst: boot ? first[i] / R : 0, pTop: boot ? top3[i] / R : 0,
    })).sort((a, b) => b.score - a.score);
  }

  root.rankPhotos = rank;
  root.fitPhotos = fit;
})(typeof window !== 'undefined' ? window : globalThis);
