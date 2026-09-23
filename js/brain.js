/**
 * Pieza50 — brain.js v4
 * Premium neural-network brain. Fine botanical lines, pistachio/sage/gold palette.
 * Scroll drives Y rotation (0→360°) + progressive connection activation.
 */
(function () {
  'use strict';

  const canvas    = document.getElementById('brain-canvas');
  const container = document.getElementById('brainContainer');
  if (!canvas || !container) return;
  const ctx = canvas.getContext('2d');

  // ── Palette ───────────────────────────────────────────────────────────
  const PISTACHIO = [201, 221, 181]; // #C9DDB5
  const SAGE      = [175, 200, 165]; // #AFC8A5
  const GOLD_C    = [244, 215, 122]; // #F4D77A

  function rgba(c, a) {
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a.toFixed(3) + ')';
  }

  // ── Seeded RNG ────────────────────────────────────────────────────────
  function makeRng(seed) {
    let a = seed | 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ── Brain surface radius ──────────────────────────────────────────────
  function brainR(phi, theta) {
    const xn = Math.sin(phi) * Math.cos(theta);
    const yn = Math.cos(phi);
    const zn = Math.sin(phi) * Math.sin(theta);
    const f1 = Math.sin(xn * 3.5 + yn * 2.2) * Math.cos(zn * 2.6) * 0.26;
    const f2 = Math.cos(yn * 6.0 + zn * 3.4) * Math.sin(xn * 3.8) * 0.18;
    const f3 = Math.sin(zn * 8.5 + xn * 5.2) * Math.cos(yn * 4.8) * 0.12;
    const f4 = Math.cos(xn * 12.5 + yn * 7.8) * Math.sin(zn * 11.5) * 0.07;
    const fissure = Math.exp(-Math.pow(Math.cos(theta), 2) * 16) * 0.35;
    return 1 + f1 + f2 + f3 + f4 - fissure;
  }

  // ── Random surface sampling → nodes ──────────────────────────────────
  function buildNodes(count) {
    const rng   = makeRng(137);
    const nodes = [];
    while (nodes.length < count) {
      const u     = rng() * 2 - 1;
      const phi   = Math.acos(-u);
      const theta = rng() * Math.PI * 2;
      const r     = brainR(phi, theta);

      let ox    = r * Math.sin(phi) * Math.cos(theta) * 1.38;
      let oy    = r * Math.cos(phi) * 0.72;
      const oz  = r * Math.sin(phi) * Math.sin(theta) * 0.95;

      if (Math.sqrt(ox * ox + oz * oz) < 0.30) continue;
      if (oy < -0.26) {
        const t = Math.min(1, (-oy - 0.26) / 0.5);
        oy = -0.26 - t * 0.10;
      }

      const rand   = rng();
      const isGold = rand < 0.13;
      const isSage = rand < 0.58;

      nodes.push({
        ox, oy, oz, px: 0, py: 0, depth: 0,
        isGold,
        color: isGold ? GOLD_C : (isSage ? SAGE : PISTACHIO),
        size:  isGold ? (1.6 + rng() * 1.0) : (0.7 + rng() * 0.7),
        phase: rng(),
      });
    }
    return nodes;
  }

  // ── Build connection pool ─────────────────────────────────────────────
  function buildConns(nodes) {
    const rng     = makeRng(42);
    const conns   = [];
    const perNode = new Array(nodes.length).fill(0);
    const MAX_PER = 5;
    const MAX_D   = 0.48;

    for (let i = 0; i < nodes.length; i++) {
      if (perNode[i] >= MAX_PER) continue;
      for (let j = i + 1; j < nodes.length; j++) {
        if (perNode[j] >= MAX_PER) continue;
        const dx = nodes[i].ox - nodes[j].ox;
        const dy = nodes[i].oy - nodes[j].oy;
        const dz = nodes[i].oz - nodes[j].oz;
        const d  = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d < MAX_D) {
          const isGoldConn = nodes[i].isGold || nodes[j].isGold;
          conns.push({
            i, j, d,
            phase: Math.max(nodes[i].phase, nodes[j].phase),
            color: isGoldConn ? GOLD_C : (rng() < 0.5 ? SAGE : PISTACHIO),
          });
          perNode[i]++;
          perNode[j]++;
        }
      }
    }
    return conns;
  }

  // ── Satellite dots around the brain ──────────────────────────────────
  function buildSatellites() {
    const rng = makeRng(77);
    return Array.from({ length: 14 }, function () {
      const ang  = rng() * Math.PI * 2;
      const vert = (rng() - 0.5) * Math.PI;
      const dist = 1.65 + rng() * 0.45;
      return {
        ox:    dist * Math.cos(vert) * Math.cos(ang),
        oy:    dist * Math.sin(vert) * 0.65,
        oz:    dist * Math.cos(vert) * Math.sin(ang),
        px: 0, py: 0, depth: 0,
        r:     0.4 + rng() * 1.2,
        color: rng() < 0.35 ? GOLD_C : (rng() < 0.5 ? SAGE : PISTACHIO),
        alpha: 0.25 + rng() * 0.35,
      };
    });
  }

  // ── Transform ─────────────────────────────────────────────────────────
  const FOV = 5.2;

  function xform(pt, sRX, cRX, sRY, cRY, cx, cy, sc) {
    let x = pt.ox, y = pt.oy, z = pt.oz;
    let t = x * cRY + z * sRY;
    z = -x * sRY + z * cRY; x = t;
    t = y * cRX - z * sRX;
    z = y * sRX + z * cRX; y = t;
    const inv = FOV / (FOV + z + 0.001);
    pt.px    = cx + x * inv * sc;
    pt.py    = cy - y * inv * sc;
    pt.depth = z;
  }

  function xformAll(arr, sRX, cRX, sRY, cRY, cx, cy, sc) {
    for (let i = 0; i < arr.length; i++) xform(arr[i], sRX, cRX, sRY, cRY, cx, cy, sc);
  }

  // ── Render ────────────────────────────────────────────────────────────
  function render(W, H, nodes, conns, sats, sp) {
    ctx.clearRect(0, 0, W, H);

    // Scroll-driven visual params
    const sinPi     = Math.sin(sp * Math.PI);
    const connAct   = 0.32 + sinPi * 0.52;  // fraction of connections shown
    const lineAlpha = 0.22 + sinPi * 0.18;
    const nodeAlpha = 0.60 + sinPi * 0.30;
    const goldPulse = 0.55 + sinPi * 0.40;
    const lw        = 0.35 + sinPi * 0.15;

    // 1 — Satellite dots
    for (let k = 0; k < sats.length; k++) {
      const s   = sats[k];
      const inv = FOV / (FOV + s.depth + 0.001);
      ctx.globalAlpha = s.alpha * (0.45 + sinPi * 0.25);
      ctx.fillStyle   = rgba(s.color, 1);
      ctx.beginPath();
      ctx.arc(s.px, s.py, Math.max(1, s.r * inv), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 2 — Neural connections (progressive activation with scroll)
    ctx.lineWidth = lw;
    for (let k = 0; k < conns.length; k++) {
      const c = conns[k];
      if (c.phase > connAct) continue;
      const a  = nodes[c.i], b = nodes[c.j];
      const dz = (a.depth + b.depth) * 0.5;
      const df = Math.max(0.25, 1 - dz / 1.4 * 0.45);
      ctx.strokeStyle = rgba(c.color, lineAlpha * df);
      ctx.beginPath();
      ctx.moveTo(a.px, a.py);
      ctx.lineTo(b.px, b.py);
      ctx.stroke();
    }

    // 3 — Nodes
    for (let i = 0; i < nodes.length; i++) {
      const nd  = nodes[i];
      const inv = FOV / (FOV + nd.depth + 2.5);
      const df  = Math.max(0.30, 1 - nd.depth / 1.4 * 0.38);
      let alpha, r;
      if (nd.isGold) {
        alpha = goldPulse * df;
        r     = Math.max(1.5, nd.size * inv * 3.8);
      } else {
        alpha = nodeAlpha * df;
        r     = Math.max(0.7, nd.size * inv * 3.0);
      }
      ctx.globalAlpha = Math.min(0.98, alpha);
      ctx.fillStyle   = rgba(nd.color, 1);
      ctx.beginPath();
      ctx.arc(nd.px, nd.py, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ── Setup ─────────────────────────────────────────────────────────────
  const nodes = buildNodes(200);
  const conns = buildConns(nodes);
  const sats  = buildSatellites();

  let W = 0, H = 0, dpr = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W   = container.clientWidth;
    H   = container.clientHeight;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  new ResizeObserver(resize).observe(container);

  // Smooth scroll (lerp)
  let scrollTarget = 0, scrollCurrent = 0;
  window.addEventListener('scroll', function () {
    const maxS = Math.max(1, document.body.scrollHeight - window.innerHeight);
    scrollTarget = window.scrollY / maxS;
  }, { passive: true });

  const t0 = performance.now();

  function frame(now) {
    requestAnimationFrame(frame);
    if (W === 0 || H === 0) return;

    // Luxurious lerp — scroll feels intentional, not mechanical
    scrollCurrent += (scrollTarget - scrollCurrent) * 0.06;

    const sp = scrollCurrent;
    const t  = (now - t0) * 0.001;

    // Y: full 360° over scroll range; tiny idle drift when still
    const ry = sp * Math.PI * 2 + t * 0.04 - 0.30;
    const rx = 0.10 + Math.sin(t * 0.22) * 0.03;

    const sRX = Math.sin(rx), cRX = Math.cos(rx);
    const sRY = Math.sin(ry), cRY = Math.cos(ry);
    const cx    = W * 0.50;
    const cy    = H * 0.50;
    const scale = Math.min(W, H) * 0.30;

    xformAll(nodes, sRX, cRX, sRY, cRY, cx, cy, scale);
    xformAll(sats,  sRX, cRX, sRY, cRY, cx, cy, scale);

    render(W, H, nodes, conns, sats, sp);
  }

  requestAnimationFrame(frame);
})();
