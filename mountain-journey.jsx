// mountain-journey.jsx — scroll-driven Three.js ink-wash mountain

(function () {
  const { useEffect, useRef, useState } = React;

  if (!window.THREE) {
    window.MountainJourney = function () { return null; };
    return;
  }

  const THREE = window.THREE;

  // ── Experience camps ─────────────────────────────────────────
  const CAMPS = [
    { p: 0.04, label: 'Base Camp', role: 'Carnegie Mellon University',
      detail: 'B.S. CS & Information Systems  ·  GPA 3.77  ·  Dean\'s List', side: 'right' },
    { p: 0.26, label: 'Camp Ⅰ', role: 'Instructor · Code Ninjas',
      detail: 'Taught programming fundamentals to students ages 7–14. Designed curriculum and led after-school sessions.', side: 'left' },
    { p: 0.52, label: 'Camp Ⅱ', role: 'Resident Assistant · CMU',
      detail: 'Supported 35 residents through community building, individual check-ins, and campus programming.', side: 'right' },
    { p: 0.75, label: 'Camp Ⅲ', role: 'Teaching Assistant · CMU SCS',
      detail: 'Office hours and grading for 80+ students across algorithms and data structures courses.', side: 'left' },
    { p: 0.96, label: '✦  Summit', role: 'SWE Intern · CTAT, CMU',
      detail: 'Building educational software at the CTAT lab within CMU SCS. Open to Summer 2026 internships.', side: 'right' },
  ];

  // ── Camp panel ───────────────────────────────────────────────
  function CampPanel({ camp, progress }) {
    const dist = Math.abs(progress - camp.p);
    const opacity = Math.max(0, 1 - dist / 0.10);

    return (
      <div style={{
        position: 'absolute',
        [camp.side]: '6%',
        top: '50%',
        transform: `translateY(-50%) translateX(${opacity < 0.01 ? (camp.side === 'left' ? '-12px' : '12px') : '0'})`,
        width: 'min(300px, 36vw)',
        opacity,
        transition: 'opacity 80ms, transform 80ms',
        pointerEvents: 'none',
        zIndex: 10,
      }}>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.22em',
          color: 'var(--cinnabar)', textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
        }}>
          <span style={{ width: 18, height: 1, background: 'var(--cinnabar)', display: 'inline-block' }}/>
          {camp.label}
        </div>
        <div style={{
          fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 19,
          color: 'var(--ink-1)', lineHeight: 1.3, marginBottom: 8,
        }}>
          {camp.role}
        </div>
        <div style={{ fontFamily: 'var(--body)', fontSize: 13.5, color: 'var(--ink-3)', lineHeight: 1.65 }}>
          {camp.detail}
        </div>
      </div>
    );
  }

  // ── Three.js helpers ─────────────────────────────────────────

  function makeToonGrad() {
    const c = document.createElement('canvas');
    c.width = 4; c.height = 1;
    const cx = c.getContext('2d');
    [['#080a0e', 0], ['#201e1a', 1], ['#4c4840', 2], ['#989088', 3]].forEach(([col, x]) => {
      cx.fillStyle = col; cx.fillRect(x, 0, 1, 1);
    });
    const t = new THREE.CanvasTexture(c);
    t.magFilter = t.minFilter = THREE.NearestFilter;
    return t;
  }

  // ── Noise helpers (no library needed) ──────────────────────
  // Smooth value noise: bilinear interpolation over a hash grid
  function valueNoise(x, z) {
    const ix = Math.floor(x), iz = Math.floor(z);
    const fx = x - ix,        fz = z - iz;
    // Smoothstep — same curve used in the simplex-noise approach
    const ux = fx * fx * (3 - 2 * fx);
    const uz = fz * fz * (3 - 2 * fz);
    const h = (n) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
    const a = h(ix     + iz     * 137);
    const b = h(ix + 1 + iz     * 137);
    const c = h(ix     + (iz+1) * 137);
    const d = h(ix + 1 + (iz+1) * 137);
    return (a*(1-ux)*(1-uz) + b*ux*(1-uz) + c*(1-ux)*uz + d*ux*uz) * 2 - 1; // −1…1
  }

  // Fractional Brownian Motion — same layered octave approach as the code you shared
  function fbm(x, z) {
    return valueNoise(x,        z)        * 1.000  // large features  (like noise2D * 2)
         + valueNoise(x * 2.1,  z * 2.1)  * 0.500  // medium features (like noise2D * 1)
         + valueNoise(x * 4.3,  z * 4.3)  * 0.250  // fine detail     (like noise2D * 0.5)
         + valueNoise(x * 8.7,  z * 8.7)  * 0.125; // micro texture
  }

  // Build a cone peak displaced with fBm + ridge pattern
  // seed offsets the noise so each mountain looks unique
  function buildPeak(h, r, segs, disp, seed = 0) {
    const geo = new THREE.ConeGeometry(r, h, segs, segs * 4);
    const pos = geo.attributes.position;
    const sx = seed * 3.73, sz = seed * 2.17; // per-mountain noise offset

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const t = (y + h / 2) / h;  // 0 = base, 1 = tip

      if (t > 0.94) continue;     // keep tip sharp

      const falloff = Math.pow(1 - t, 0.65); // displacement fades toward summit

      // Ridge pattern: 3–4 prominent ridges radiating from peak (like real mountains)
      const angle = Math.atan2(z, x);
      const ridgeN = 3 + (seed & 1);
      const ridge  = 0.45 + Math.abs(Math.cos(angle * ridgeN + seed)) * 0.55;

      // Large-scale shape (low frequency) — drives the overall silhouette
      const dx1 = fbm(x * 0.20 + sx,     z * 0.20 + sz)     * disp * falloff * ridge;
      const dz1 = fbm(x * 0.20 + sx + 5, z * 0.20 + sz + 3) * disp * falloff * ridge;

      // Fine surface detail (high frequency) — cliffs, rocky texture
      const dx2 = fbm(x * 0.55 + sx + 9,  z * 0.55 + sz + 7)  * disp * 0.28 * falloff;
      const dz2 = fbm(x * 0.55 + sx + 13, z * 0.55 + sz + 11) * disp * 0.28 * falloff;

      // Vertical jag — makes the ridgeline uneven rather than a smooth taper
      const dy  = fbm(x * 0.40 + sx + 2,  z * 0.40 + sz + 6)  * disp * 0.20 * (1 - t) * ridge;

      pos.setX(i, x + dx1 + dx2);
      pos.setY(i, y + dy);
      pos.setZ(i, z + dz1 + dz2);
    }

    geo.computeVertexNormals();
    return geo;
  }

  // ── Main component ───────────────────────────────────────────
  function MountainJourney() {
    const wrapRef   = useRef(null);
    const canvasRef = useRef(null);
    const progRef   = useRef(0);
    const [progress, setProgress] = useState(0);
    const scrollY = useScrollY();

    // ── Three.js setup ───────────────────────────────────────
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0xf0ebe0, 0.013);

      const cam = new THREE.PerspectiveCamera(58, 1, 0.1, 200);

      const setSize = () => {
        const w = canvas.clientWidth, h = canvas.clientHeight;
        renderer.setSize(w, h, false);
        cam.aspect = w / h;
        cam.updateProjectionMatrix();
      };
      setSize();
      window.addEventListener('resize', setSize);

      const grad = makeToonGrad();
      const toon = (hex) => new THREE.MeshToonMaterial({ color: hex, gradientMap: grad });
      const outline = (hex) => new THREE.MeshBasicMaterial({ color: hex, side: THREE.BackSide });

      // Add a mountain: displaced cone + slightly scaled outline for ink edge
      const addMtn = (h, r, segs, disp, fill, edge, [px, py, pz], seed = 0) => {
        const geo = buildPeak(h, r, segs, disp, seed);
        const mesh = new THREE.Mesh(geo, toon(fill));
        mesh.position.set(px, py, pz);
        scene.add(mesh);
        const ol = new THREE.Mesh(geo, outline(edge));
        ol.scale.setScalar(1.045);
        ol.position.set(px, py, pz);
        scene.add(ol);
      };

      // addMtn(h, r, segs, disp, fill, edge, [x,y,z], seed)
      // Higher segs + more disp = richer fBm surface detail

      // Foreground main peak — highest resolution, most displacement
      addMtn(22, 6.5, 14, 3.2, 0x191714, 0x050608, [0,  0,  0], 0);
      // Mid-distance peaks
      addMtn(17, 5.0, 10, 2.4, 0x323028, 0x0d0c0a, [-9, -3, -7], 1);
      addMtn(15, 4.5, 10, 2.1, 0x3a362e, 0x0d0c0a, [ 8, -4, -9], 2);
      // Far background peaks (lighter, lower res — naturally soft from fog)
      addMtn(12, 3.8,  8, 1.4, 0x686460, 0x201e1c, [-5, -5, -16], 3);
      addMtn(11, 3.5,  8, 1.3, 0x706c64, 0x201e1c, [ 7, -6, -18], 4);
      addMtn(10, 3.2,  7, 1.1, 0x78746e, 0x201e1c, [-13,-5, -13], 5);

      scene.add(new THREE.AmbientLight(0xede8e0, 1.6));
      const dir = new THREE.DirectionalLight(0xfff8f0, 3.2);
      dir.position.set(8, 20, 12);
      scene.add(dir);

      // Camera winds around the peak while ascending.
      // Main cone: tip at y=+11, base at y=−11.
      const camPath = new THREE.CatmullRomCurve3([
        new THREE.Vector3( 14,  -9,  10),  // 0%   ground-level, front-right
        new THREE.Vector3(  4,  -5,  17),  //      sweep to front
        new THREE.Vector3( -8,  -1,  14),  //      front-left
        new THREE.Vector3(-17,   4,   2),  //      full left face
        new THREE.Vector3(-14,   9,  -8),  //      back-left, rising
        new THREE.Vector3(  0,  14, -15),  //      directly behind, high
        new THREE.Vector3( 12,  17,  -6),  //      back-right
        new THREE.Vector3( 16,  19,   5),  //      right face, near top
        new THREE.Vector3(  5,  21,  12),  // 100% front-right, summit level
      ]);

      // Where the camera looks — drifts from mountain body up to peak
      const lookPath = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, -3, 0),
        new THREE.Vector3(0,  2, 0),
        new THREE.Vector3(0,  7, 0),
        new THREE.Vector3(0, 11, 0),
      ]);

      // Initialise camera at path start
      const p0 = camPath.getPoint(0);
      cam.position.copy(p0);
      cam.lookAt(lookPath.getPoint(0));

      let raf;
      const tick = () => {
        raf = requestAnimationFrame(tick);
        const p = Math.max(0, Math.min(1, progRef.current));
        const cp = camPath.getPoint(p);
        const lp = lookPath.getPoint(p);
        // Gentle lerp — smooths out scroll jank, gives cinematic feel
        cam.position.lerp(cp, 0.09);
        cam.lookAt(lp);
        renderer.render(scene, cam);
      };
      tick();

      return () => {
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', setSize);
        renderer.dispose();
      };
    }, []);

    // ── Scroll → progress ────────────────────────────────────
    useEffect(() => {
      if (!wrapRef.current) return;
      const el = wrapRef.current;
      // getBoundingClientRect().top + scrollY = absolute top (scroll-invariant)
      const top = el.getBoundingClientRect().top + window.scrollY;
      const p = Math.max(0, Math.min(1, (scrollY - top) / (el.offsetHeight - window.innerHeight)));
      progRef.current = p;
      setProgress(p);
    }, [scrollY]);

    const pct = Math.round(progress * 100);

    return (
      <div ref={wrapRef} style={{ height: '280vh', position: 'relative' }}>
        <div style={{
          position: 'sticky', top: 0, height: '100vh',
          overflow: 'hidden', background: 'var(--paper)',
        }}>
          <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />

          {/* Section label */}
          <div style={{ position: 'absolute', top: 32, left: '5%', zIndex: 20, pointerEvents: 'none' }}>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.25em',
              color: 'var(--ink-3)', textTransform: 'uppercase',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <span style={{ width: 36, height: 1, background: 'var(--cinnabar)', display: 'inline-block' }}/>
              The Ascent
            </div>
            <h2 style={{
              fontFamily: 'var(--serif)', fontStyle: 'italic',
              fontSize: 'clamp(26px,3.8vw,50px)', color: 'var(--ink-1)',
              marginTop: 12, lineHeight: 1.1,
            }}>
              From base camp<br/>to summit.
            </h2>
          </div>

          {/* Camp panels */}
          {CAMPS.map((c, i) => <CampPanel key={i} camp={c} progress={progress} />)}

          {/* Ascent progress indicator */}
          <div style={{
            position: 'absolute', bottom: 28, left: '50%',
            transform: 'translateX(-50%)', zIndex: 20,
            pointerEvents: 'none', textAlign: 'center',
          }}>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.3em',
              color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 8,
            }}>
              {progress < 0.04 ? '↓ scroll to ascend'
                : progress > 0.95 ? '✦ summit reached'
                : `${pct}% ascended`}
            </div>
            <div style={{ height: 1, width: 80, background: 'var(--rule)', position: 'relative', margin: '0 auto' }}>
              <div style={{
                position: 'absolute', left: 0, top: 0, height: '100%',
                width: `${pct}%`, background: 'var(--cinnabar)',
              }}/>
            </div>
          </div>
        </div>
      </div>
    );
  }

  Object.assign(window, { MountainJourney });
})();
