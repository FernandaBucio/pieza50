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
  const LAT         = 22;   // latitude strips
  const LON         = 36;   // longitude strips
  const NODE_TARGET = 130;  // neural nodes
  const MAX_CONN    = 115;  // neural connections
  const CONN_DIST   = 0.56; // max distance (normalised) for connections
  const FOV         = 4.8;  // perspective field of view

  // ── Colours ───────────────────────────────────────────────────────────
  const C_WIRE   = 'rgba(45,74,62,';     // dark green (closed with opacity)
  const C_GOLD   = '#C4A840';
  const C_GREEN  = '#2D4A3E';
  const C_SAGE   = '#8FAF8C';
  const C_YELLOW = '#D4A843';

  // ── Brain surface radius (multi-octave folds + hemisphere groove) ─────
  function brainR(phi, theta) {
    const xn = Math.sin(phi) * Math.cos(theta);
    const yn = Math.cos(phi);
    const zn = Math.sin(phi) * Math.sin(theta);
    const f1 = Math.sin(xn * 2.6  + yn * 1.5) * Math.cos(zn * 1.9) * 0.17;
    const f2 = Math.cos(yn * 4.1  + zn * 2.3) * Math.sin(xn * 2.6) * 0.12;
    const f3 = Math.sin(zn * 5.6  + xn * 3.3) * Math.cos(yn * 3.1) * 0.08;
    const f4 = Math.cos(xn * 7.6  + yn * 4.9) * Math.sin(zn * 6.6) * 0.05;
    const f5 = Math.sin(yn * 9.6  + zn * 7.3) * 0.026;
    const groove = Math.exp(-Math.pow(Math.cos(theta), 2) * 8) * 0.20;
    return 1 + f1 + f2 + f3 + f4 + f5 - groove;
  }

  // ── Geometry: sphere grid → vertices + edges ──────────────────────────
  function buildGeometry() {
    const verts = [];  // {ox,oy,oz, px,py,depth}
    const edges = [];  // [i,j] pairs
    const grid  = [];  // 2-D index table [lat][lon]

    for (let la = 0; la <= LAT; la++) {
      const phi = (la / LAT) * Math.PI;
      const row = [];

      for (let lo = 0; lo < LON; lo++) {
        const theta = (lo / LON) * Math.PI * 2;
        const r     = brainR(phi, theta);
        const idx   = verts.length;
        verts.push({
          ox: r * Math.sin(phi) * Math.cos(theta) * 1.22,
          oy: r * Math.cos(phi) * 0.88,
          oz: r * Math.sin(phi) * Math.sin(theta),
          px: 0, py: 0, depth: 0,
        });
        row.push(idx);
        if (lo > 0) edges.push([idx - 1, idx]);
      }
      // Close latitude ring
      if (row.length >= 2) edges.push([row[row.length - 1], row[0]]);

      grid.push(row);

      // Longitude (vertical) edges
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
      // Skip vertices very near the poles (they cluster connections badly)
      const xzDist = Math.sqrt(v.ox * v.ox + v.oz * v.oz);
      if (xzDist < 0.55) continue;
      nodes.push({ ox: v.ox, oy: v.oy, oz: v.oz, px: 0, py: 0, depth: 0, isGold: (idx % 3 === 0) });
      idx++;
    }
    return nodes;
  }

  // ── Find neural connections (nearby node pairs, max 4 per node) ──────
  function buildConns(nodes) {
    const conns    = [];
    const perNode  = new Int32Array(nodes.length); // connection count per node
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

  // ── Floating orbs ─────────────────────────────────────────────────────
  function buildOrbs() {
    return [
      { ox: 1.82, oy:  0.42, oz:  0.10, r: 0.14, color: C_SAGE,   px:0, py:0, depth:0 },
      { ox:-1.72, oy:  0.62, oz:  0.22, r: 0.18, color: C_SAGE,   px:0, py:0, depth:0 },
      { ox: 1.62, oy: -0.92, oz: -0.14, r: 0.09, color: C_YELLOW, px:0, py:0, depth:0 },
      { ox:-1.52, oy: -0.66, oz:  0.36, r: 0.12, color: C_SAGE,   px:0, py:0, depth:0 },
      { ox: 0.92, oy:  1.58, oz:  0.46, r: 0.07, color: C_SAGE,   px:0, py:0, depth:0 },
      { ox: 0.46, oy: -1.68, oz: -0.26, r: 0.06, color: C_YELLOW, px:0, py:0, depth:0 },
      { ox:-0.96, oy:  1.38, oz: -0.46, r: 0.05, color: C_SAGE,   px:0, py:0, depth:0 },
      { ox: 2.05, oy: -0.16, oz:  0.46, r: 0.06, color: C_YELLOW, px:0, py:0, depth:0 },
      { ox:-1.32, oy: -1.22, oz: -0.36, r: 0.08, color: C_SAGE,   px:0, py:0, depth:0 },
      { ox: 1.22, oy:  1.12, oz: -0.76, r: 0.05, color: C_SAGE,   px:0, py:0, depth:0 },
      { ox:-0.32, oy:  1.82, oz:  0.32, r: 0.04, color: C_YELLOW, px:0, py:0, depth:0 },
      { ox: 2.12, oy:  0.52, oz: -0.22, r: 0.08, color: C_SAGE,   px:0, py:0, depth:0 },
    ];
  }

  // ── Transform a point (rotate + project) ─────────────────────────────
  function xform(pt, sRX, cRX, sRY, cRY, sRZ, cRZ, cx, cy, scale) {
    let x = pt.ox, y = pt.oy, z = pt.oz;

    // Y-axis rotation
    let t = x * cRY + z * sRY;
    z = -x * sRY + z * cRY;
    x = t;

    // X-axis rotation
    t = y * cRX - z * sRX;
    z = y * sRX + z * cRX;
    y = t;

    // Z-axis rotation (gentle tilt)
    t = x * cRZ - y * sRZ;
    y = x * sRZ + y * cRZ;
    x = t;

    // Perspective projection (y-flip for screen space)
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
  // Orb render order (allocated once, reused each frame)
  let orbOrder;

  function render(W, H, verts, edges, nodes, conns, orbs) {
    ctx.clearRect(0, 0, W, H);

    // 1 ── Wireframe edges
    ctx.lineWidth = 0.55;
    for (let k = 0; k < edges.length; k++) {
      const a  = verts[edges[k][0]];
      const b  = verts[edges[k][1]];
      const dz = (a.depth + b.depth) * 0.5;
      const al = (0.11 + dz * 0.025).toFixed(3);
      ctx.strokeStyle = C_WIRE + Math.max(0.03, Math.min(0.20, +al)) + ')';
      ctx.beginPath();
      ctx.moveTo(a.px, a.py);
      ctx.lineTo(b.px, b.py);
      ctx.stroke();
    }

    // 2 ── Neural connections (gold)
    ctx.strokeStyle = 'rgba(196,168,64,0.28)';
    ctx.lineWidth   = 0.9;
    for (let k = 0; k < conns.length; k++) {
      const a = nodes[conns[k][0]];
      const b = nodes[conns[k][1]];
      ctx.beginPath();
      ctx.moveTo(a.px, a.py);
      ctx.lineTo(b.px, b.py);
      ctx.stroke();
    }

    // 3 ── Floating orbs (depth-sorted copy)
    for (let i = 0; i < orbs.length; i++) orbOrder[i] = i;
    orbOrder.sort((a, b) => orbs[a].depth - orbs[b].depth);
    const scale = Math.min(W, H) * 0.38;
    ctx.globalAlpha = 0.72;
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
    ctx.globalAlpha = 0.88;
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
    // Start facing front-left (‑0.45 rad) with slight top-down tilt (+0.12)
    const ry = scrollProg * Math.PI * 4 + t * 0.09 - 0.45;
    const rx = Math.sin(t * 0.28) * 0.04 + 0.12;
    const rz = Math.cos(t * 0.18) * 0.018;

    const sRX = Math.sin(rx), cRX = Math.cos(rx);
    const sRY = Math.sin(ry), cRY = Math.cos(ry);
    const sRZ = Math.sin(rz), cRZ = Math.cos(rz);
    const cx    = W * 0.50;
    const cy    = H * 0.50;
    const scale = Math.min(W, H) * 0.38;

    transformAll(verts, sRX, cRX, sRY, cRY, sRZ, cRZ, cx, cy, scale);
    transformAll(nodes, sRX, cRX, sRY, cRY, sRZ, cRZ, cx, cy, scale);
    transformAll(orbs,  sRX, cRX, sRY, cRY, sRZ, cRZ, cx, cy, scale);

    render(W, H, verts, edges, nodes, conns, orbs);
  }

  requestAnimationFrame(frame);

})();
