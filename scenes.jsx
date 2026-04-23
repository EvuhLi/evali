// scenes.jsx — parallax scenes & ambient FX
// Exposes: Scene, useReveal, useScrollY

const { useEffect, useState, useRef, useLayoutEffect } = React;

// ─────────────────────────────────────────────────────────────
// scroll position (shared)
let _scrollListeners = new Set();
let _scrollY = 0;
let _scrollHooked = false;
function _hookScroll() {
  if (_scrollHooked) return;
  _scrollHooked = true;
  const onScroll = () => {
    _scrollY = window.scrollY || window.pageYOffset || 0;
    _scrollListeners.forEach((cb) => cb(_scrollY));
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

  const local = y - base;

  return (
    <div className="scene" ref={sceneRef}>
      {layers.map((L, i) => {
        const dy = -local * (L.speed ?? 0.2) * parallaxStrength;
        const dx = (L.driftX ?? 0) * parallaxStrength;
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
    </div>
  );
}

Object.assign(window, { Scene, useScrollY, useReveal });
