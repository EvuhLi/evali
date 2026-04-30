// interactive.jsx — ink cursor trail

const { useEffect: useEff, useRef: useR, useState: useS } = React;

// ─────────────────────────────────────────────────────────────
// InkCursor — a brush trail that follows the cursor.
// Each move drops a "node"; nodes connect into smooth bezier strokes
// whose width tapers with cursor speed (slow = fat, fast = thin) and
// whose alpha fades over ~1.4s. Strokes are drawn to a canvas overlay.
function InkCursor({ enabled = true }) {
  const canvasRef = useR(null);
  useEff(() => {
    if (!enabled) {
      // restore default cursor when disabled
      document.documentElement.style.cursor = '';
      document.body.style.cursor = '';
      return;
    }
    // hide native cursor everywhere; brush trail replaces it
    document.documentElement.style.cursor = 'none';
    document.body.style.cursor = 'none';
    const c = canvasRef.current;
    const ctx = c.getContext('2d');
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width  = window.innerWidth  * dpr;
      c.height = window.innerHeight * dpr;
      c.style.width  = window.innerWidth + 'px';
      c.style.height = window.innerHeight + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    // node = { x, y, w, life, born }
    const nodes = [];
    let lastX = null, lastY = null, lastT = 0;

    const onMove = (e) => {
      // suppress trail when over the studio canvas — let the user see the real brush there
      const el = e.target;
      if (el && el.closest && el.closest('.studio-canvas, .studio-frame')) {
        lastX = null; lastY = null;
        return;
      }
      const x = e.clientX, y = e.clientY;
      const t = performance.now();
      let w = 8;
      if (lastX !== null) {
        const dx = x - lastX, dy = y - lastY, dt = Math.max(1, t - lastT);
        const speed = Math.hypot(dx, dy) / dt; // px/ms
        // slow = thick (real brush pressure), fast = thin
        w = Math.max(1.2, 9 - speed * 6);
      }
      nodes.push({ x, y, w, born: t });
      // limit
      if (nodes.length > 220) nodes.splice(0, nodes.length - 220);
      lastX = x; lastY = y; lastT = t;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('pointermove', onMove);

    const onTouch = (e) => {
      const t = e.touches && e.touches[0];
      if (!t) return;
      onMove({ clientX: t.clientX, clientY: t.clientY });
    };
    window.addEventListener('touchmove', onTouch, { passive: true });

    let raf;
    const TTL = 1400;
    const draw = () => {
      const now = performance.now();
      // soft erase (fade existing pixels)
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      ctx.fillRect(0, 0, c.width / dpr, c.height / dpr);
      ctx.globalCompositeOperation = 'source-over';

      // cull old
      while (nodes.length && now - nodes[0].born > TTL) nodes.shift();

      // draw stroke as a series of quadratic curves between consecutive nodes
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = 1; i < nodes.length; i++) {
        const a = nodes[i - 1], b = nodes[i];
        const ageA = (now - a.born) / TTL;
        const ageB = (now - b.born) / TTL;
        const alpha = (1 - (ageA + ageB) / 2) * 0.55;
        if (alpha <= 0) continue;
        const w = (a.w + b.w) / 2 * (1 - (ageA + ageB) / 2);
        if (w < 0.3) continue;

        const inkColor = getComputedStyle(document.documentElement)
          .getPropertyValue('--ink-1').trim() || '#1b1d22';

        ctx.strokeStyle = `rgba(27,29,34,${alpha.toFixed(3)})`;
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        // smooth midpoint curve
        const next = nodes[i + 1];
        if (next) {
          const mx = (b.x + next.x) / 2;
          const my = (b.y + next.y) / 2;
          ctx.quadraticCurveTo(b.x, b.y, mx, my);
        } else {
          ctx.lineTo(b.x, b.y);
        }
        ctx.stroke();

        // occasional ink fleck for texture
        if (Math.random() < 0.04 && w > 2) {
          ctx.fillStyle = `rgba(27,29,34,${(alpha*0.7).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(b.x + (Math.random()-.5)*w, b.y + (Math.random()-.5)*w,
                  Math.random()*w*0.35, 0, Math.PI*2);
          ctx.fill();
        }
      }

      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('touchmove', onTouch);
      document.documentElement.style.cursor = '';
      document.body.style.cursor = '';
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <canvas ref={canvasRef}
      style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    />
  );
}

Object.assign(window, { InkCursor });
