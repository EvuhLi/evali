// scenes.jsx — parallax scenes & ambient FX
// Exposes: Scene, Mist, Birds, River, Brushstroke, useReveal, useScrollY

const { useEffect, useState, useRef, useLayoutEffect } = React;

// ─────────────────────────────────────────────────────────────
// scroll position (shared)
let _scrollListeners = new Set();
let _scrollY = 0;
let _scrollHooked = false;
function _hookScroll() {
  if (_scrollHooked) return;
  _scrollHooked = true;
  let ticking = false;
  const onScroll = () => {
    _scrollY = window.scrollY || window.pageYOffset || 0;
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(() => {
        _scrollListeners.forEach((cb) => cb(_scrollY));
        ticking = false;
      });
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}
function useScrollY() {
  const [y, setY] = useState(_scrollY);
  useEffect(() => { _hookScroll(); _scrollListeners.add(setY); return () => _scrollListeners.delete(setY); }, []);
  return y;
}

// reveal on enter viewport
function useReveal(opts = {}) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setSeen(true); });
    }, { threshold: opts.threshold ?? 0.18, rootMargin: opts.rootMargin ?? '0px' });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return [ref, seen];
}

// ─────────────────────────────────────────────────────────────
// Parallax Scene — renders ink layers in a section's absolute scene container.
// Each layer has: src, speed (multiplier of scrollY offset, 0=fixed, 1=normal),
// pos {top,bottom,left,right}, height, opacity, scale, sideX (left/right anchor).
function Scene({ layers, mistOpacity = 1, intensity = 1, parallaxStrength = 1 }) {
  const sceneRef = useRef(null);
  const [base, setBase] = useState(0);
  const y = useScrollY();

  useLayoutEffect(() => {
    if (!sceneRef.current) return;
    const measure = () => {
      const r = sceneRef.current.getBoundingClientRect();
      setBase(window.scrollY + r.top);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // local scroll position relative to scene start
  const local = y - base;

  return (
    <div className="scene" ref={sceneRef}>
      {layers.map((L, i) => {
        const dy = -local * (L.speed ?? 0.2) * parallaxStrength;
        const dx = (L.driftX ?? 0) * parallaxStrength;
        // default: contain (preserve aspect) so feathered edges show — never cover
        const style = {
          backgroundImage: `url("${L.src}")`,
          backgroundPosition: L.bgPos || `${L.anchorX || 'center'} ${L.anchorY || 'bottom'}`,
          backgroundSize: L.size || 'contain',
          backgroundRepeat: 'no-repeat',
          opacity: L.opacity ?? 1,
          transform: `translate3d(${dx}px, ${dy}px, 0) scale(${L.scale ?? 1})`,
          transformOrigin: L.origin || 'center bottom',
          mixBlendMode: L.blend || 'multiply',
          filter: L.filter,
          width: L.width || '100%',
          height: L.height || '120%',
          top: L.top, bottom: L.bottom ?? '-10%',
          left: L.left, right: L.right,
        };
        return <div key={i} className="layer" style={style} />;
      })}
      {mistOpacity > 0 && <Mist opacity={mistOpacity} intensity={intensity} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Mist — soft drifting paper-color clouds
function Mist({ opacity = 1, intensity = 1 }) {
  // 4 mist bands at various depths/speeds
  const bands = [
    { top: '12%', height: '38%', dur: 90,  amp: 60,  o: .55, blur: 14 },
    { top: '38%', height: '34%', dur: 130, amp: 90,  o: .75, blur: 18 },
    { top: '58%', height: '34%', dur: 70,  amp: 50,  o: .85, blur: 10 },
    { top: '74%', height: '30%', dur: 110, amp: 70,  o: .9,  blur: 22 },
  ];
  return (
    <>
      {bands.map((b, i) => (
        <div key={i}
          className="mist-band"
          style={{
            position: 'absolute',
            left: '-10%', right: '-10%',
            top: b.top, height: b.height,
            opacity: b.o * opacity,
            filter: `blur(${b.blur}px)`,
            mixBlendMode: 'screen',
            backgroundImage: `radial-gradient(60% 50% at 50% 50%, rgba(244,239,227,.95), rgba(244,239,227,0) 70%)`,
            backgroundRepeat: 'repeat-x',
            backgroundSize: `${50 + i*20}% 100%`,
            animation: `mistDrift${i} ${b.dur / Math.max(intensity, .01)}s linear infinite`,
            willChange: 'transform',
          }}
        />
      ))}
      <style>{`
        @keyframes mistDrift0 { from{transform:translateX(-10%)} to{transform:translateX(10%)} }
        @keyframes mistDrift1 { from{transform:translateX(8%)}  to{transform:translateX(-12%)} }
        @keyframes mistDrift2 { from{transform:translateX(-6%)} to{transform:translateX(14%)} }
        @keyframes mistDrift3 { from{transform:translateX(12%)} to{transform:translateX(-8%)} }
      `}</style>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Birds — small SVG silhouettes flapping & gliding across the scene
function Birds({ count = 5, intensity = 1, region = { top: 8, h: 32 } }) {
  // generate stable random params
  const birds = React.useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const r = (a, b) => a + Math.random() * (b - a);
      return {
        id: i,
        top: r(region.top, region.top + region.h),
        scale: r(0.6, 1.4),
        dur: r(28, 60),
        delay: -r(0, 50),
        flap: r(0.45, 0.9),
        dir: Math.random() < .5 ? 1 : -1,
      };
    });
  }, [count, region.top, region.h]);

  if (intensity <= 0) return null;

  return (
    <div className="birds">
      {birds.map((b) => (
        <div key={b.id}
          className="bird"
          style={{
            top: `${b.top}%`,
            left: b.dir > 0 ? '-6%' : '106%',
            transform: `scale(${b.scale}) ${b.dir < 0 ? 'scaleX(-1)' : ''}`,
            animation: `birdFly${b.dir > 0 ? 'R' : 'L'} ${b.dur / Math.max(intensity, .01)}s linear ${b.delay}s infinite`,
          }}
        >
          <svg viewBox="0 0 40 14" preserveAspectRatio="none">
            <path className="bird-wing"
              d="M 2 8 Q 10 0 20 7 Q 30 0 38 8"
              stroke="#1b1d22" strokeWidth="1.4" fill="none"
              strokeLinecap="round" strokeLinejoin="round"
              style={{ animation: `flap ${b.flap}s ease-in-out infinite` }}
            />
          </svg>
        </div>
      ))}
      <style>{`
        @keyframes birdFlyR {
          0%   { transform: translate(0vw,    0px); }
          50%  { transform: translate(60vw,  -30px); }
          100% { transform: translate(120vw,  10px); }
        }
        @keyframes birdFlyL {
          0%   { transform: translate(0vw,     0px) scaleX(-1); }
          50%  { transform: translate(-60vw, -30px) scaleX(-1); }
          100% { transform: translate(-120vw,  10px) scaleX(-1); }
        }
        @keyframes flap {
          0%, 100% { d: path("M 2 8 Q 10 0 20 7 Q 30 0 38 8"); }
          50%      { d: path("M 2 6 Q 10 12 20 6 Q 30 12 38 6"); }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// River — flowing ink ribbon (animated SVG paths)
function River({ y = '70%', height = '14%', intensity = 1 }) {
  return (
    <svg className="river-svg" preserveAspectRatio="none"
         style={{ top: y, height, position: 'absolute', left: 0, right: 0 }}
         viewBox="0 0 1200 200">
      <defs>
        <linearGradient id="riverFade" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"   stopColor="#1b1d22" stopOpacity="0"/>
          <stop offset="50%"  stopColor="#1b1d22" stopOpacity=".55"/>
          <stop offset="100%" stopColor="#1b1d22" stopOpacity="0"/>
        </linearGradient>
      </defs>
      {[0, 1, 2, 3, 4].map((i) => (
        <path key={i}
          d={`M -200 ${80 + i*16} C 200 ${60 + i*14}, 600 ${110 + i*12}, 1000 ${70 + i*16} S 1600 ${100 + i*10}, 1800 ${90 + i*14}`}
          stroke="url(#riverFade)"
          strokeWidth={i % 2 === 0 ? 1.2 : 0.6}
          fill="none"
          opacity={0.2 + i*0.1}
          style={{
            strokeDasharray: '8 14',
            animation: `riverFlow ${(20 - i*2) / Math.max(intensity, .01)}s linear infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes riverFlow {
          from { stroke-dashoffset: 0; }
          to   { stroke-dashoffset: -800; }
        }
      `}</style>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Brushstroke — draws a path as it enters viewport
function Brushstroke({ d, width = 2, viewBox = "0 0 400 80", style }) {
  const [ref, seen] = useReveal({ threshold: 0.4 });
  return (
    <svg ref={ref} viewBox={viewBox} style={style} preserveAspectRatio="none">
      <path d={d} className={`draw-stroke ${seen ? 'in' : ''}`}
            strokeWidth={width} pathLength="1" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Reveal wrapper — fades up children when in view
function Reveal({ children, delay = 0, as: As = 'div', ...rest }) {
  const [ref, seen] = useReveal({ threshold: 0.2 });
  return (
    <As ref={ref} className={`fade-up ${seen ? 'in' : ''} ${rest.className || ''}`}
        style={{ ...rest.style, transitionDelay: `${delay}ms` }}>
      {children}
    </As>
  );
}

Object.assign(window, { Scene, Mist, Birds, River, Brushstroke, Reveal, useScrollY, useReveal });
