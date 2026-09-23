/**
 * Pieza50 — brain.js
 * Pure Canvas 2D custom 3-D brain renderer (zero dependencies).
 * Scroll drives Y rotation; idle adds a gentle drift.
 */
(function () {
  'use strict';

  const canvas    = document.getElementById('brain-canvas');
  const container = document.getElementById('brainContainer');
  if (!canvas || !container) return;

  const ctx = canvas.getContext('2d');

  // ── Config ────────────────────────────────────────────────────────────
  const LAT         = 30;   // latitude strips (denser = more realistic)
  const LON         = 48;   // longitude strips
  const NODE_TARGET = 110;  // neural nodes
  const MAX_CONN    = 100;  // neural connections
  const CONN_DIST   = 0.55; // max distance (normalised) for connections
  const FOV         = 5.0;  // perspective field of view

  // ── Colours ───────────────────────────────────────────────────────────
  const C_WIRE   = 'rgba(45,74,62,';
  const C_GOLD   = '#C4A840';
  const C_GREEN  = '#2D4A3E';
  const C_SAGE   = '#8FAF8C';
  const C_YELLOW = '#D4A843';

  // ── Brain surface radius (stronger folds + deep interhemispheric fissure)
  function brainR(phi, theta) {
    const xn = Math.sin(phi) * Math.cos(theta);
    const yn = Math.cos(phi);
    const zn = Math.sin(phi) * Math.sin(theta);

    const f1 = Math.sin(xn * 3.5 + yn * 2.2) * Math.cos(zn * 2.6) * 0.28;
    const f2 = Math.cos(yn * 6.0 + zn * 3.4) * Math.sin(xn * 3.8) * 0.19;
    const f3 = Math.sin(zn * 8.5 + xn * 5.2) * Math.cos(yn * 4.8) * 0.13;
    const f4 = Math.cos(xn * 12.5 + yn * 7.8) * Math.sin(zn * 11.5) * 0.08;
    const f5 = Math.sin(yn * 17.0 + zn * 13.5) * 0.05;
    const f6 = Math.cos(xn * 21.0 + zn * 17.0) * 0.03;

    const fissure = Math.exp(-Math.pow(Math.cos(theta), 2) * 18) * 0.38;
    return 1 + f1 + f2 + f3 + f4 + f5 + f6 - fissure;
  }

  // ── Geometry: sphere grid → vertices + edges ──────────────────────────
  function buildGeometry() {
    const verts = [];
    const edges = [];
    const grid  = [];

    for (let la = 0; la <= LAT; la++) {
      const phi = (la / LAT) * Math.PI;
      const row = [];

      for (let lo = 0; lo < LON; lo++) {
        const theta = (lo / LON) * Math.PI * 2;
        const r     = brainR(phi, theta);
        const idx   = verts.length;

        let ox = r * Math.sin(phi) * Math.cos(theta) * 1.52;
        let oy = r * Math.cos(phi) * 0.66;
        const oz = r * Math.sin(phi) * Math.sin(theta) * 0.98;

        // Flatten inferior surface
        if (oy < -0.30) {
          const t = Math.min(1, (-oy - 0.30) / 0.55);
          oy = -0.30 - t * 0.14;
        }

        verts.push({ ox, oy, oz, px: 0, py: 0, depth: 0 });
        row.push(idx);
        if (lo > 0) edges.push([idx - 1, idx]);
      }
      if (row.length >= 2) edges.push([row[row.length - 1], row[0]]);
      grid.push(row);
      if (la > 0) {
        const prev = grid[la - 1];
        for (let j = 0; j < LON; j++) edges.push([prev[j], row[j]]);
      }
    }
    return { verts, edges };
  }

  // ── Sample neural nodes from brain surface ────────────────────────────
  function buildNodes(verts) {
    const step  = Math.max(1, Math.floor(verts.length / (NODE_TARGET * 1.4)));
    const nodes = [];
    let   idx   = 0;
    for (let i = 0; i < verts.length && nodes.length < NODE_TARGET; i += step) {
      const v = verts[i];
      if (Math.sqrt(v.ox * v.ox + v.oz * v.oz) < 0.5) continue;
      nodes.push({ ox: v.ox, oy: v.oy, oz: v.oz, px: 0, py: 0, depth: 0, isGold: (idx % 3 === 0) });
      idx++;
    }
    return nodes;
  }

  // ── Find neural connections ───────────────────────────────────────────
  function buildConns(nodes) {
    const conns    = [];
    const perNode  = new Int32Array(nodes.length);
    const MAX_NODE = 4;
    outer:
    for (let i = 0; i < nodes.length; i++) {
      if (perNode[i] >= MAX_NODE) continue;
      for (let j = i + 1; j < nodes.length; j++) {
        if (conns.length >= MAX_CONN) break outer;
        if (perNode[j] >= MAX_NODE) continue;
        const dx = nodes[i].ox - nodes[j].ox;
        const dy = nodes[i].oy - nodes[j].oy;
        const dz = nodes[i].oz - nodes[j].oz;
        if (Math.sqrt(dx*dx + dy*dy + dz*dz) < CONN_DIST) {
          conns.push([i, j]);
          perNode[i]++;
          perNode[j]++;
        }
      }
    }
    return conns;
  }

  // ── Floating orbs (tighter positions — no clipping) ───────────────────
  function buildOrbs() {
    return [
      { ox: 1.78, oy:  0.30, oz:  0.08, r: 0.12, color: C_SAGE,   px:0, py:0, depth:0 },
      { ox:-1.68, oy:  0.45, oz:  0.18, r: 0.16, color: C_SAGE,   px:0, py:0, depth:0 },
      { ox: 1.55, oy: -0.70, oz: -0.10, r: 0.08, color: C_YELLOW, px:0, py:0, depth:0 },
      { ox:-1.45, oy: -0.55, oz:  0.28, r: 0.10, color: C_SAGE,   px:0, py:0, depth:0 },
      { ox: 0.80, oy:  1.10, oz:  0.35, r: 0.06, color: C_SAGE,   px:0, py:0, depth:0 },
      { ox: 0.40, oy: -1.20, oz: -0.20, r: 0.05, color: C_YELLOW, px:0, py:0, depth:0 },
      { ox:-0.85, oy:  0.95, oz: -0.38, r: 0.04, color: C_SAGE,   px:0, py:0, depth:0 },
      { ox: 1.90, oy: -0.12, oz:  0.38, r: 0.05, color: C_YELLOW, px:0, py:0, depth:0 },
      { ox:-1.25, oy: -0.95, oz: -0.28, r: 0.07, color: C_SAGE,   px:0, py:0, depth:0 },
      { ox: 1.10, oy:  0.85, oz: -0.62, r: 0.04, color: C_SAGE,   px:0, py:0, depth:0 },
    ];
  }

  // ── Transform a point (rotate + project) ─────────────────────────────
  function xform(pt, sRX, cRX, sRY, cRY, sRZ, cRZ, cx, cy, scale) {
    let x = pt.ox, y = pt.oy, z = pt.oz;

    let t = x * cRY + z * sRY;
    z = -x * sRY + z * cRY;
    x = t;

    t = y * cRX - z * sRX;
    z = y * sRX + z * cRX;
    y = t;

    t = x * cRZ - y * sRZ;
    y = x * sRZ + y * cRZ;
    x = t;

    const inv = FOV / (FOV + z + 0.001);
    pt.px    = cx + x * inv * scale;
    pt.py    = cy - y * inv * scale;
    pt.depth = z;
  }

  function transformAll(arr, sRX, cRX, sRY, cRY, sRZ, cRZ, cx, cy, scale) {
    for (let i = 0; i < arr.length; i++) {
      xform(arr[i], sRX, cRX, sRY, cRY, sRZ, cRZ, cx, cy, scale);
    }
  }

  // ── Render a frame ────────────────────────────────────────────────────
  let orbOrder;

  function render(W, H, verts, edges, nodes, conns, orbs) {
    ctx.clearRect(0, 0, W, H);

    // 1 ── Wireframe edges
    ctx.lineWidth = 0.6;
    for (let k = 0; k < edges.length; k++) {
      const a  = verts[edges[k][0]];
      const b  = verts[edges[k][1]];
      const dz = (a.depth + b.depth) * 0.5;
      const al = Math.max(0.04, Math.min(0.28, 0.14 + dz * 0.035));
      ctx.strokeStyle = C_WIRE + al.toFixed(3) + ')';
      ctx.beginPath();
      ctx.moveTo(a.px, a.py);
      ctx.lineTo(b.px, b.py);
      ctx.stroke();
    }

    // 2 ── Neural connections (gold)
    ctx.strokeStyle = 'rgba(196,168,64,0.30)';
    ctx.lineWidth   = 0.9;
    for (let k = 0; k < conns.length; k++) {
      const a = nodes[conns[k][0]];
      const b = nodes[conns[k][1]];
      ctx.beginPath();
      ctx.moveTo(a.px, a.py);
      ctx.lineTo(b.px, b.py);
      ctx.stroke();
    }

    // 3 ── Floating orbs (depth-sorted)
    for (let i = 0; i < orbs.length; i++) orbOrder[i] = i;
    orbOrder.sort((a, b) => orbs[a].depth - orbs[b].depth);
    const scale = Math.min(W, H) * 0.30;
    ctx.globalAlpha = 0.74;
    for (let k = 0; k < orbOrder.length; k++) {
      const orb = orbs[orbOrder[k]];
      const inv = FOV / (FOV + orb.depth + 0.001);
      const r   = Math.max(3, orb.r * scale * inv);
      ctx.fillStyle = orb.color;
      ctx.beginPath();
      ctx.arc(orb.px, orb.py, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 4 ── Neural nodes
    ctx.globalAlpha = 0.90;
    for (let i = 0; i < nodes.length; i++) {
      const nd  = nodes[i];
      const inv = FOV / (FOV + nd.depth + 2.5);
      const r   = Math.max(1.5, 3.8 * inv);
      ctx.fillStyle = nd.isGold ? C_GOLD : C_GREEN;
      ctx.beginPath();
      ctx.arc(nd.px, nd.py, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ── Initialise & kick off the loop ────────────────────────────────────
  const { verts, edges } = buildGeometry();
  const nodes = buildNodes(verts);
  const conns = buildConns(nodes);
  const orbs  = buildOrbs();
  orbOrder    = orbs.map((_, i) => i);

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
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  let scrollProg = 0;
  window.addEventListener('scroll', function () {
    const maxS = Math.max(1, document.body.scrollHeight - window.innerHeight);
    scrollProg = window.scrollY / maxS;
  }, { passive: true });

  const t0 = performance.now();

  function frame(now) {
    requestAnimationFrame(frame);
    if (W === 0 || H === 0) return;

    const t  = (now - t0) * 0.001;
    const ry = scrollProg * Math.PI * 4 + t * 0.09 - 0.45;
    const rx = Math.sin(t * 0.28) * 0.04 + 0.16;
    const rz = Math.cos(t * 0.18) * 0.018;

    const sRX = Math.sin(rx), cRX = Math.cos(rx);
    const sRY = Math.sin(ry), cRY = Math.cos(ry);
    const sRZ = Math.sin(rz), cRZ = Math.cos(rz);
    const cx    = W * 0.50;
    const cy    = H * 0.50;
    const scale = Math.min(W, H) * 0.30;

    transformAll(verts, sRX, cRX, sRY, cRY, sRZ, cRZ, cx, cy, scale);
    transformAll(nodes, sRX, cRX, sRY, cRY, sRZ, cRZ, cx, cy, scale);
    transformAll(orbs,  sRX, cRX, sRY, cRY, sRZ, cRZ, cx, cy, scale);

    render(W, H, verts, edges, nodes, conns, orbs);
  }

  requestAnimationFrame(frame);

})();
