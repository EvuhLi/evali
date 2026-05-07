// interactive.jsx — ink cursor trail + paint-your-own-mountain studio

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
      document.documentElement.style.cursor = '';
      document.body.style.cursor = '';
      return;
    }
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

    // trail nodes
    const nodes = [];
    let lastX = null, lastY = null;
    const MAX_DOT_GAP = 8;

    // spring-physics ink drop (always visible at cursor tip)
    let targetX = 0, targetY = 0;
    let dropX = 0, dropY = 0, dropVX = 0, dropVY = 0;
    let dropVisible = false;

    const onMove = (e) => {
      const el = e.target;
      const inStudio = el && el.closest && el.closest('.studio-canvas, .studio-frame');
      if (inStudio) { lastX = null; lastY = null; return; }

      const x = e.clientX, y = e.clientY;
      const t = performance.now();
      targetX = x; targetY = y;
      if (!dropVisible) { dropX = x; dropY = y; dropVisible = true; }

      if (lastX !== null) {
        const dx = x - lastX, dy = y - lastY;
        const dist = Math.hypot(dx, dy);
        if (dist > MAX_DOT_GAP) {
          const steps = Math.ceil(dist / MAX_DOT_GAP);
          for (let i = 1; i < steps; i++) {
            const f = i / steps;
            nodes.push({ x: lastX + dx * f, y: lastY + dy * f, born: t });
          }
        }
      }

      nodes.push({ x, y, born: t });
      if (nodes.length > 400) nodes.splice(0, nodes.length - 400);
      lastX = x; lastY = y;
    };
    window.addEventListener('pointermove', onMove);

    const onTouch = (e) => {
      const t = e.touches && e.touches[0];
      if (!t) return;
      onMove({ clientX: t.clientX, clientY: t.clientY, target: e.target });
    };
    window.addEventListener('touchmove', onTouch, { passive: true });

    let raf;
    const TTL = 320;  // shorter trail
    const MAX_R = 4;
    const N_BLOB = 10; // perimeter points for organic shape

    const draw = () => {
      const now = performance.now();
      const t = now * 0.001; // seconds
      ctx.clearRect(0, 0, c.width / dpr, c.height / dpr);

      while (nodes.length && now - nodes[0].born > TTL) nodes.shift();

      // trail: continuous tapered stroke
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = 1; i < nodes.length; i++) {
        const a = nodes[i - 1], b = nodes[i];
        const age = (now - b.born) / TTL;
        const w = MAX_R * 2 * Math.pow(1 - age, 0.6);
        if (w < 0.4) continue;
        const alpha = (1 - age) * 0.9;
        ctx.strokeStyle = `rgba(16,18,22,${alpha.toFixed(3)})`;
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        const next = nodes[i + 1];
        if (next) {
          ctx.quadraticCurveTo(b.x, b.y, (b.x + next.x) / 2, (b.y + next.y) / 2);
        } else {
          ctx.lineTo(b.x, b.y);
        }
        ctx.stroke();
      }

      // organic ink drop
      if (dropVisible) {
        dropX = targetX;
        dropY = targetY;

        const speed = 0;
        const baseR = MAX_R;

        // build organic perimeter: multi-frequency wobble on each point's radius
        // slower wobble when moving (inertia), more expressive when still
        const wobbleAmt = 0.13 + Math.max(0, 0.08 - speed * 0.02);
        const pts = [];
        for (let i = 0; i < N_BLOB; i++) {
          const a = (i / N_BLOB) * Math.PI * 2;
          const w = Math.sin(a * 2 + t * 2.2)  * wobbleAmt
                  + Math.sin(a * 3 - t * 1.6)  * wobbleAmt * 0.6
                  + Math.sin(a * 5 + t * 0.9)  * wobbleAmt * 0.3;
          const r = baseR * (1 + w);
          pts.push({ x: dropX + Math.cos(a) * r, y: dropY + Math.sin(a) * r });
        }

        // smooth blob path via midpoint quadratic curves
        const startMid = { x: (pts[N_BLOB-1].x + pts[0].x) / 2,
                           y: (pts[N_BLOB-1].y + pts[0].y) / 2 };
        ctx.beginPath();
        ctx.moveTo(startMid.x, startMid.y);
        for (let i = 0; i < N_BLOB; i++) {
          const p = pts[i];
          const pn = pts[(i + 1) % N_BLOB];
          ctx.quadraticCurveTo(p.x, p.y, (p.x + pn.x) / 2, (p.y + pn.y) / 2);
        }
        ctx.closePath();

        // dark ink body
        ctx.fillStyle = 'rgba(14,16,20,0.94)';
        ctx.fill();

        // dark edge ring — ink concentrates at perimeter (re-use path)
        const edgeGrad = ctx.createRadialGradient(
          dropX, dropY, baseR * 0.45,
          dropX, dropY, baseR * 1.15
        );
        edgeGrad.addColorStop(0, 'rgba(0,0,0,0)');
        edgeGrad.addColorStop(1, 'rgba(0,0,0,0.38)');
        ctx.fillStyle = edgeGrad;
        ctx.fill();

        // crisp perimeter stroke (the "ridge")
        ctx.strokeStyle = 'rgba(4,6,10,0.55)';
        ctx.lineWidth = 1.1;
        ctx.stroke();

        // specular crescent — glossy upper-left highlight
        const hx = dropX - baseR * 0.26, hy = dropY - baseR * 0.30;
        const hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, baseR * 0.58);
        hg.addColorStop(0,   'rgba(255,255,255,0.42)');
        hg.addColorStop(0.45,'rgba(255,255,255,0.11)');
        hg.addColorStop(1,   'rgba(255,255,255,0)');
        ctx.fillStyle = hg;
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
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

// ─────────────────────────────────────────────────────────────
// MountainStudio — visitors paint with a real brush (variable width
// from cursor speed). Their finished piece is saved to localStorage and
// joins a "visitor gallery" rendered as small thumbnails.
function MountainStudio() {
  const canvasRef = useR(null);
  const [gallery, setGallery] = useS(() => {
    try { return JSON.parse(localStorage.getItem('eva.gallery') || '[]'); }
    catch { return []; }
  });
  const [signed, setSigned] = useS('');
  const dirtyRef = useR(false);

  // setup
  useEff(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const r = c.getBoundingClientRect();
      c.width = r.width * dpr;
      c.height = r.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paintPaper();
    };
    const paintPaper = () => {
      // creamy paper
      const g = ctx.createRadialGradient(
        c.width/(2*dpr), c.height/(2*dpr), 50,
        c.width/(2*dpr), c.height/(2*dpr), Math.max(c.width, c.height)/dpr
      );
      g.addColorStop(0, '#f8f3e6');
      g.addColorStop(1, '#ebe3cd');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, c.width/dpr, c.height/dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(c);

    // brush state
    let drawing = false;
    let lastX = 0, lastY = 0, lastT = 0, lastW = 6;

    const pos = (e) => {
      const r = c.getBoundingClientRect();
      const t = e.touches?.[0] || e;
      return [t.clientX - r.left, t.clientY - r.top, performance.now()];
    };

    const start = (e) => {
      e.preventDefault?.();
      drawing = true;
      [lastX, lastY, lastT] = pos(e);
      lastW = 8;
      dirtyRef.current = true;
    };
    const move = (e) => {
      if (!drawing) return;
      e.preventDefault?.();
      const [x, y, t] = pos(e);
      const dx = x - lastX, dy = y - lastY, dt = Math.max(1, t - lastT);
      const speed = Math.hypot(dx, dy) / dt;
      // brushstroke: slow = thick & dark, fast = thin & faint
      const w = Math.max(0.6, 12 - speed * 8);
      const alpha = Math.min(.85, 0.35 + (10 - speed * 8) * 0.05);

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      // main stroke
      ctx.strokeStyle = `rgba(24,26,30,${alpha.toFixed(3)})`;
      ctx.lineWidth = (lastW + w) / 2;
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(x, y);
      ctx.stroke();

      // dry-brush flecks
      const flecks = Math.min(4, Math.floor(speed * 12));
      for (let i = 0; i < flecks; i++) {
        const fx = x + (Math.random()-.5) * w * 1.6;
        const fy = y + (Math.random()-.5) * w * 1.6;
        const fr = Math.random() * w * 0.25;
        ctx.fillStyle = `rgba(24,26,30,${(alpha*0.4).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(fx, fy, fr, 0, Math.PI*2);
        ctx.fill();
      }

      lastX = x; lastY = y; lastT = t; lastW = w;
    };
    const end = () => { drawing = false; };

    c.addEventListener('mousedown', start);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    c.addEventListener('touchstart', start, { passive: false });
    c.addEventListener('touchmove', move, { passive: false });
    c.addEventListener('touchend', end);

    // expose helpers
    c.__clear = paintPaper;
    c.__export = () => c.toDataURL('image/png');

    return () => {
      ro.disconnect();
      c.removeEventListener('mousedown', start);
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', end);
      c.removeEventListener('touchstart', start);
      c.removeEventListener('touchmove', move);
      c.removeEventListener('touchend', end);
    };
  }, []);

  const clear = () => {
    canvasRef.current?.__clear?.();
    dirtyRef.current = false;
  };

  const sign = () => {
    if (!dirtyRef.current) return;
    const url = canvasRef.current?.__export?.();
    if (!url) return;
    // downscale to ~280px wide thumbnail to keep localStorage small
    const img = new Image();
    img.onload = () => {
      const scale = 280 / img.width;
      const w = 280, h = Math.round(img.height * scale);
      const tc = document.createElement('canvas');
      tc.width = w; tc.height = h;
      tc.getContext('2d').drawImage(img, 0, 0, w, h);
      const thumb = tc.toDataURL('image/jpeg', 0.78);
      const next = [{ thumb, at: Date.now() }, ...gallery].slice(0, 8);
      try {
        localStorage.setItem('eva.gallery', JSON.stringify(next));
        setGallery(next);
        setSigned('signed');
        setTimeout(() => setSigned(''), 1800);
      } catch {
        setSigned('full');
        setTimeout(() => setSigned(''), 1800);
      }
    };
    img.src = url;
  };

  return (
    <div className="studio">
      <div className="studio-head">
        <span className="index" style={{
          fontFamily:'var(--mono)', fontSize:11, letterSpacing:'.25em',
          color:'var(--ink-3)', textTransform:'uppercase',
          display:'flex', gap:14, alignItems:'center',
        }}>
          <span style={{width:36, height:1, background:'var(--cinnabar)'}}/> Ⅶ · The Studio
        </span>
        <h2 style={{marginTop:14}}>Leave a <em>brushstroke</em>.</h2>
        <p style={{
          color:'var(--ink-3)', fontSize:17, marginTop:10, maxWidth:'56ch',
        }}>
          Paint anything — a mountain, your initials, a stray cloud — and sign it onto the wall. Press slowly for a wet, heavy line; flick the brush for a dry, thin one.
        </p>
      </div>

      <div className="studio-frame">
        <canvas ref={canvasRef} className="studio-canvas" />
        <div className="studio-tools">
          <button onClick={clear} className="tool-btn">↻ Fresh paper</button>
          <button onClick={sign}  className="tool-btn primary">
            {signed === 'signed' ? '✓ Hung on the wall' : signed === 'full' ? 'Wall is full' : '印 Sign & hang'}
          </button>
        </div>
      </div>

      {gallery.length > 0 && (
        <div className="gallery">
          <div className="gallery-label">
            <span style={{width:24, height:1, background:'var(--rule)'}}/>
            Visitors' wall — {gallery.length} {gallery.length === 1 ? 'piece' : 'pieces'}
          </div>
          <div className="gallery-grid">
            {gallery.map((g, i) => (
              <figure key={g.at} className="gallery-item">
                <img src={g.thumb} alt={`visitor painting ${i+1}`}/>
                <figcaption>{relTime(g.at)}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function relTime(ts) {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

Object.assign(window, { InkCursor, MountainStudio });
