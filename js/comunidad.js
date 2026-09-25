(function () {
  'use strict';

  // ── Palette ──────────────────────────────────────────────────────────────
  const PISTACHIO = [201, 221, 181];
  const SAGE      = [175, 200, 165];
  const GOLD_C    = [244, 215, 122];
  const DARK      = [38, 49, 43];

  function rgba(c, a) { return `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`; }

  function makeRng(seed) {
    let a = seed | 0;
    return () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ── Page load fade-in ────────────────────────────────────────────────────
  document.body.classList.add('loaded');

  // ── Page transition on links ─────────────────────────────────────────────
  document.querySelectorAll('.pillar-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const href = e.currentTarget.href;
      document.body.style.transition = 'opacity 0.35s ease';
      document.body.style.opacity = '0';
      setTimeout(() => { window.location.href = href; }, 360);
    });
  });

  // ── Scroll progress bar ───────────────────────────────────────────────────
  const progressBar = document.querySelector('.scroll-progress-bar');
  if (progressBar) {
    window.addEventListener('scroll', () => {
      const max = Math.max(1, document.body.scrollHeight - window.innerHeight);
      progressBar.style.width = (window.scrollY / max * 100).toFixed(1) + '%';
    }, { passive: true });
  }

  // ── Hero load animations ──────────────────────────────────────────────────
  const comHero = document.querySelector('.com-hero');
  if (comHero) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { comHero.classList.add('loaded'); });
    });
  }

  // ── IntersectionObserver reveal ───────────────────────────────────────────
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.reveal-up, .reveal-fade').forEach(el => {
    revealObserver.observe(el);
  });

  // ── Hero particles canvas ────────────────────────────────────────────────
  const heroCanvas = document.getElementById('hero-particles');
  if (heroCanvas) {
    const hCtx = heroCanvas.getContext('2d');
    const rng  = makeRng(33);

    function resizeHero() {
      heroCanvas.width  = heroCanvas.offsetWidth;
      heroCanvas.height = heroCanvas.offsetHeight;
    }
    resizeHero();
    new ResizeObserver(resizeHero).observe(heroCanvas);

    const particles = Array.from({ length: 22 }, () => ({
      x:     rng(),
      y:     rng(),
      vx:    (rng() - 0.5) * 0.0003,
      vy:    (rng() - 0.5) * 0.0003,
      r:     0.8 + rng() * 2.2,
      color: rng() < 0.35 ? GOLD_C : (rng() < 0.5 ? SAGE : PISTACHIO),
      alpha: 0.15 + rng() * 0.35,
    }));

    (function hFrame() {
      requestAnimationFrame(hFrame);
      const W = heroCanvas.width, H = heroCanvas.height;
      hCtx.clearRect(0, 0, W, H);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = 1; if (p.x > 1) p.x = 0;
        if (p.y < 0) p.y = 1; if (p.y > 1) p.y = 0;
        hCtx.globalAlpha = p.alpha;
        hCtx.fillStyle   = rgba(p.color, 1);
        hCtx.beginPath();
        hCtx.arc(p.x * W, p.y * H, p.r, 0, Math.PI * 2);
        hCtx.fill();
      });
      hCtx.globalAlpha = 1;
    })();
  }

  // ── Pillar canvas visuals ─────────────────────────────────────────────────

  // BRAIN pillar: mini neural network
  function initBrainCanvas(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rng = makeRng(77);
    const nodes = Array.from({ length: 36 }, () => ({
      x: rng(), y: rng(),
      vx: (rng() - 0.5) * 0.0001,
      vy: (rng() - 0.5) * 0.0001,
      r: 1.2 + rng() * 1.8,
      isGold: rng() < 0.2,
      alpha: 0.5 + rng() * 0.45,
    }));

    function resize() {
      canvas.width  = canvas.offsetWidth  || 300;
      canvas.height = canvas.offsetHeight || 400;
    }
    resize();
    new ResizeObserver(resize).observe(canvas);

    (function frame() {
      requestAnimationFrame(frame);
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0.05) n.vx =  Math.abs(n.vx);
        if (n.x > 0.95) n.vx = -Math.abs(n.vx);
        if (n.y < 0.05) n.vy =  Math.abs(n.vy);
        if (n.y > 0.95) n.vy = -Math.abs(n.vy);
      });
      // Connections
      ctx.lineWidth = 0.5;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = (nodes[i].x - nodes[j].x) * W;
          const dy = (nodes[i].y - nodes[j].y) * H;
          const d  = Math.sqrt(dx*dx + dy*dy);
          if (d < 120) {
            const a = (1 - d / 120) * 0.25;
            ctx.strokeStyle = rgba(PISTACHIO, a);
            ctx.beginPath();
            ctx.moveTo(nodes[i].x * W, nodes[i].y * H);
            ctx.lineTo(nodes[j].x * W, nodes[j].y * H);
            ctx.stroke();
          }
        }
      }
      // Nodes
      nodes.forEach(n => {
        ctx.globalAlpha = n.alpha;
        ctx.fillStyle   = rgba(n.isGold ? GOLD_C : SAGE, 1);
        ctx.beginPath();
        ctx.arc(n.x * W, n.y * H, n.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    })();
  }

  // BODY pillar: concentric ellipses with nodes
  function initBodyCanvas(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function resize() {
      canvas.width  = canvas.offsetWidth  || 300;
      canvas.height = canvas.offsetHeight || 400;
    }
    resize();
    new ResizeObserver(resize).observe(canvas);

    const t0 = performance.now();
    (function frame(now) {
      requestAnimationFrame(frame);
      const W = canvas.width, H = canvas.height;
      const cx = W / 2, cy = H / 2;
      const t  = (now - t0) * 0.001;
      ctx.clearRect(0, 0, W, H);

      const rings = [0.18, 0.30, 0.42, 0.54];
      rings.forEach((rFrac, ri) => {
        const rx = rFrac * W, ry = rFrac * H * 0.55;
        const phase = t * 0.3 + ri * 0.6;
        // ellipse
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, phase * 0.05, 0, Math.PI * 2);
        ctx.strokeStyle = rgba(ri % 2 === 0 ? SAGE : PISTACHIO, 0.25);
        ctx.lineWidth   = 0.6;
        ctx.stroke();
        // nodes on ring
        const count = 6 + ri * 4;
        for (let k = 0; k < count; k++) {
          const angle = (k / count) * Math.PI * 2 + phase * 0.08;
          const nx = cx + Math.cos(angle) * rx;
          const ny = cy + Math.sin(angle) * ry;
          const isGold = (k + ri) % 7 === 0;
          ctx.globalAlpha = 0.55;
          ctx.fillStyle   = rgba(isGold ? GOLD_C : SAGE, 1);
          ctx.beginPath();
          ctx.arc(nx, ny, isGold ? 2.5 : 1.4, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.globalAlpha = 1;
    })();
  }

  // BEHAVIOR pillar: branching tree
  function initBehaviorCanvas(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function resize() {
      canvas.width  = canvas.offsetWidth  || 300;
      canvas.height = canvas.offsetHeight || 400;
    }
    resize();
    new ResizeObserver(resize).observe(canvas);

    const t0 = performance.now();
    function drawBranch(x, y, angle, len, depth, t) {
      if (depth === 0 || len < 3) return;
      const wave = Math.sin(t * 0.5 + depth * 1.2) * 0.04;
      const a    = angle + wave;
      const ex   = x + Math.cos(a) * len;
      const ey   = y + Math.sin(a) * len;
      const al   = 0.12 + (depth / 6) * 0.22;
      ctx.strokeStyle = rgba(depth % 2 === 0 ? PISTACHIO : GOLD_C, al);
      ctx.lineWidth   = depth * 0.5;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
      // node
      if (depth <= 2) {
        ctx.globalAlpha = 0.55;
        ctx.fillStyle   = rgba(depth === 1 ? GOLD_C : SAGE, 1);
        ctx.beginPath(); ctx.arc(ex, ey, depth === 1 ? 3 : 1.8, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
      drawBranch(ex, ey, a - 0.45, len * 0.68, depth - 1, t);
      drawBranch(ex, ey, a + 0.45, len * 0.68, depth - 1, t);
    }

    (function frame(now) {
      requestAnimationFrame(frame);
      const W = canvas.width, H = canvas.height;
      const t = (now - t0) * 0.001;
      ctx.clearRect(0, 0, W, H);
      drawBranch(W / 2, H * 0.88, -Math.PI / 2, H * 0.22, 6, t);
    })();
  }

  // WOMEN'S DATA pillar: data point grid with gaps
  function initDataCanvas(canvas) {
    if (!canvas) return;
    const ctx  = canvas.getContext('2d');
    const rng2 = makeRng(55);

    function resize() {
      canvas.width  = canvas.offsetWidth  || 300;
      canvas.height = canvas.offsetHeight || 400;
    }
    resize();
    new ResizeObserver(resize).observe(canvas);

    let W = canvas.width, H = canvas.height;
    const COLS = 10, ROWS = 14;
    const pts = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const exists = rng2() > 0.30; // 30% gap
        pts.push({
          cx: (c + 0.5) / COLS,
          cy: (r + 0.5) / ROWS,
          exists,
          isGold:   exists && rng2() < 0.12,
          alpha:    exists ? (0.3 + rng2() * 0.55) : 0,
          targetA:  exists ? (0.3 + rng2() * 0.55) : 0,
          phase:    rng2() * Math.PI * 2,
        });
      }
    }

    const t0 = performance.now();
    (function frame(now) {
      requestAnimationFrame(frame);
      W = canvas.width; H = canvas.height;
      const t = (now - t0) * 0.001;
      ctx.clearRect(0, 0, W, H);

      // connections between nearby existing points
      ctx.lineWidth = 0.4;
      for (let i = 0; i < pts.length; i++) {
        if (!pts[i].exists) continue;
        for (let j = i + 1; j < pts.length; j++) {
          if (!pts[j].exists) continue;
          const dx = (pts[i].cx - pts[j].cx) * W;
          const dy = (pts[i].cy - pts[j].cy) * H;
          const d  = Math.sqrt(dx*dx + dy*dy);
          if (d < W / COLS * 1.6) {
            ctx.strokeStyle = rgba(PISTACHIO, 0.18);
            ctx.beginPath();
            ctx.moveTo(pts[i].cx * W, pts[i].cy * H);
            ctx.lineTo(pts[j].cx * W, pts[j].cy * H);
            ctx.stroke();
          }
        }
      }

      pts.forEach(p => {
        if (!p.exists) {
          // ghost dot showing the gap
          ctx.globalAlpha = 0.10;
          ctx.fillStyle   = rgba(DARK, 1);
          ctx.beginPath(); ctx.arc(p.cx * W, p.cy * H, 1.2, 0, Math.PI * 2); ctx.fill();
          return;
        }
        const pulse = 0.85 + Math.sin(t * 0.8 + p.phase) * 0.12;
        ctx.globalAlpha = p.alpha * pulse;
        ctx.fillStyle   = rgba(p.isGold ? GOLD_C : SAGE, 1);
        ctx.beginPath();
        ctx.arc(p.cx * W, p.cy * H, p.isGold ? 2.8 : 1.8, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    })();
  }

  // Init all pillar canvases
  initBrainCanvas(document.getElementById('pillar-brain'));
  initBodyCanvas(document.getElementById('pillar-body'));
  initBehaviorCanvas(document.getElementById('pillar-behavior'));
  initDataCanvas(document.getElementById('pillar-data'));

})();
