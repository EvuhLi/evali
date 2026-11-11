history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf7f3eb);
scene.fog = new THREE.FogExp2(0xf7f3eb, 0.04);

const W = window.innerWidth, H = window.innerHeight;
const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 2000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(W, H);
document.body.appendChild(renderer.domElement);

const HM_FILE = "hm.png";

const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xfff8f0, 1.8);
dirLight.position.set(8, 20, 10);
scene.add(dirLight);

// --- INK CURSOR ---
function initInkCursor() {
  document.documentElement.style.cursor = 'none';
  document.body.style.cursor = 'none';
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  c.style.position = 'fixed';
  c.style.inset = '0';
  c.style.zIndex = '9998';
  c.style.pointerEvents = 'none';
  document.body.appendChild(c);
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  const resizeCursorCanvas = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = window.innerWidth * dpr;
    c.height = window.innerHeight * dpr;
    c.style.width = window.innerWidth + 'px';
    c.style.height = window.innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resizeCursorCanvas();
  window.addEventListener('resize', resizeCursorCanvas);
  const nodes = [];
  let lastX = null, lastY = null, lastT = null, targetX = 0, targetY = 0, dropX = 0, dropY = 0, dropVisible = false;
  let headingX = 1, headingY = 0, speedEma = 0;
  let isHovering = false, hoverT = 0;
  let isTyping = false, typingT = 0;
  const TTL = 340, MAX_R = 4.5, MAX_DOT_GAP = 8, N_BLOB = 10;

  // deterministic pseudo-random per node index, so bristle jitter doesn't flicker frame to frame
  const bristleJitter = (i) => {
    const s = Math.sin(i * 12.9898) * 43758.5453;
    return (s - Math.floor(s)) * 2 - 1;
  };

  const addPoint = (x, y, t, speedPxMs) => {
    // pressure/speed model: a slow-moving brush lays down more ink (wide), a fast
    // flick thins out and starts to fray — the same behavior real ink does.
    const speedFactor = 1.35 - Math.min(speedPxMs / 1.8, 1) * 0.85;
    if (lastX !== null) {
      const dx = x - lastX, dy = y - lastY, dist = Math.hypot(dx, dy);
      if (dist > MAX_DOT_GAP) {
        const steps = Math.ceil(dist / MAX_DOT_GAP);
        for (let i = 1; i < steps; i++) {
          const f = i / steps;
          nodes.push({ x: lastX + dx * f, y: lastY + dy * f, born: t, speedFactor, jitter: bristleJitter(nodes.length) });
        }
      }
    }
    nodes.push({ x, y, born: t, speedFactor, jitter: bristleJitter(nodes.length) });
    if (nodes.length > 400) nodes.splice(0, nodes.length - 400);
    lastX = x; lastY = y;
  };

  window.addEventListener('pointermove', (e) => {
    const now = performance.now();
    targetX = e.clientX; targetY = e.clientY;
    if (!dropVisible) { dropX = targetX; dropY = targetY; dropVisible = true; lastT = now; }
    const dt = Math.max(now - (lastT ?? now), 1);
    const dx = lastX === null ? 0 : targetX - lastX;
    const dy = lastX === null ? 0 : targetY - lastY;
    const dist = Math.hypot(dx, dy);
    const speedPxMs = dist / dt;
    if (dist > 0.5) {
      const inv = 1 / dist;
      headingX += (dx * inv - headingX) * 0.35;
      headingY += (dy * inv - headingY) * 0.35;
    }
    speedEma += (speedPxMs - speedEma) * 0.3;
    addPoint(targetX, targetY, now, speedPxMs);
    lastT = now;
  });

  document.addEventListener('pointerover', (e) => {
    const el = e.target.closest('a, button, [role="button"], .cp-item, .art-frame, .cp-marker, #modal-close, .exp-project');
    isHovering = !!el;
  });

  document.addEventListener('focusin',    (e) => { if (e.target.matches('input, textarea')) isTyping = true; });
  document.addEventListener('focusout',   (e) => { if (e.target.matches('input, textarea')) isTyping = false; });
  document.addEventListener('pointerover', (e) => { if (e.target.matches('input, textarea')) isTyping = true; });
  document.addEventListener('pointerout',  (e) => { if (e.target.matches('input, textarea') && !e.target.matches(':focus')) isTyping = false; });

  const draw = () => {
    const now = performance.now(), t = now * 0.001;
    ctx.clearRect(0, 0, c.width / dpr, c.height / dpr);

    hoverT  += ((isHovering ? 1 : 0) - hoverT)  * 0.12;
    typingT += ((isTyping   ? 1 : 0) - typingT)  * 0.08;
    speedEma += (0 - speedEma) * 0.15; // settle the nib back to round when idle

    while (nodes.length && now - nodes[0].born > TTL) nodes.shift();

    // brush width at a node: age taper (ink drying/lifting) × speed taper (pressure) × bristle jitter
    const nodeWidth = (n, age) => {
      const ageTaper = Math.pow(Math.max(0, 1 - age), 0.6);
      const w = MAX_R * 2 * ageTaper * n.speedFactor;
      return Math.max(0, w + n.jitter * w * 0.22);
    };

    const trailAlpha = (1 - hoverT * 0.85) * (1 - typingT * 0.95);
    ctx.lineJoin = 'round';
    for (let i = 1; i < nodes.length; i++) {
      const a = nodes[i - 1], b = nodes[i];
      const ageA = (now - a.born) / TTL, ageB = (now - b.born) / TTL;
      const wA = nodeWidth(a, ageA), wB = nodeWidth(b, ageB);
      if (wA < 0.35 && wB < 0.35) continue;

      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
      const px = -dy / len, py = dx / len;
      const segAlpha = 0.9 * trailAlpha;

      // tapered ribbon quad instead of a fixed-width stroke — this is what makes it
      // read as a brush pulling ink rather than a uniform pen line
      ctx.beginPath();
      ctx.moveTo(a.x + px * wA / 2, a.y + py * wA / 2);
      ctx.lineTo(b.x + px * wB / 2, b.y + py * wB / 2);
      ctx.lineTo(b.x - px * wB / 2, b.y - py * wB / 2);
      ctx.lineTo(a.x - px * wA / 2, a.y - py * wA / 2);
      ctx.closePath();
      ctx.fillStyle = `rgba(16,18,22,${segAlpha})`;
      ctx.fill();

      // dry-brush fraying near the tail: a couple of thin split bristles peel off
      // the sides once the stroke has thinned past ~55% of its width
      if (wB < MAX_R * 0.9 && ageB > 0.35) {
        const frayAlpha = segAlpha * 0.45;
        ctx.strokeStyle = `rgba(16,18,22,${frayAlpha})`;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(a.x + px * wA * 0.7, a.y + py * wA * 0.7);
        ctx.lineTo(b.x + px * wB * 1.4, b.y + py * wB * 1.4);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(a.x - px * wA * 0.7, a.y - py * wA * 0.7);
        ctx.lineTo(b.x - px * wB * 1.4, b.y - py * wB * 1.4);
        ctx.stroke();
      }
    }

    if (dropVisible) {
      dropX = targetX; dropY = targetY;

      const blobAlpha = (1 - hoverT) * (1 - typingT);
      if (blobAlpha > 0.01) {
        // squash the nib along the direction of travel — a brush pressed and
        // dragged elongates; held still it settles back into a round dot
        const stretch = Math.min(speedEma * 1.1, 1.6);
        const angle = Math.atan2(headingY, headingX);
        ctx.save();
        ctx.translate(dropX, dropY);
        ctx.rotate(angle);
        ctx.scale(1 + stretch * 0.55, 1 - stretch * 0.22);
        ctx.beginPath();
        for (let i = 0; i < N_BLOB; i++) {
          const a2 = (i / N_BLOB) * Math.PI * 2;
          const r = MAX_R * (1 + (Math.sin(a2 * 2 + t * 2.2) * 0.13));
          ctx.lineTo(Math.cos(a2) * r, Math.sin(a2) * r);
        }
        ctx.closePath();
        ctx.fillStyle = `rgba(14,16,20,${0.94 * blobAlpha})`;
        ctx.fill();
        ctx.restore();
      }

      // open ring on hover (suppressed while typing)
      if (hoverT > 0.01) {
        const ringAlpha = hoverT * (1 - typingT * 0.9);
        const ringR = MAX_R + hoverT * 16;
        ctx.beginPath();
        ctx.arc(dropX, dropY, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(14,16,20,${0.55 * ringAlpha})`;
        ctx.lineWidth = 1 + hoverT * 0.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(dropX, dropY, 2 * (1 - hoverT * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(14,16,20,${0.7 * ringAlpha})`;
        ctx.fill();
      }

      // typing cursor: blinking editorial caret in accent red
      if (typingT > 0.01) {
        const blink = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 1.1);
        const caretAlpha = typingT * (0.35 + 0.65 * blink);
        const barH = 22 * typingT;
        const serifW = 5 * typingT;

        ctx.strokeStyle = `rgba(139,0,0,${caretAlpha})`;
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';

        // vertical bar
        ctx.beginPath();
        ctx.moveTo(dropX, dropY - barH / 2);
        ctx.lineTo(dropX, dropY + barH / 2);
        ctx.stroke();

        // top serif
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(dropX - serifW, dropY - barH / 2);
        ctx.lineTo(dropX + serifW, dropY - barH / 2);
        ctx.stroke();

        // bottom serif
        ctx.beginPath();
        ctx.moveTo(dropX - serifW, dropY + barH / 2);
        ctx.lineTo(dropX + serifW, dropY + barH / 2);
        ctx.stroke();
      }
    }

    requestAnimationFrame(draw);
  };
  draw();
}
initInkCursor();

// --- MOUNTAIN SHADERS ---
const surfaceVert = `
  uniform sampler2D heightMap;
  uniform float displacementScale;
  varying float vHeight;
  varying float vBleed;
  void main() {
    vec2 sampleUv = uv;
    float h = texture2D(heightMap, sampleUv).r;
    vHeight = h;
    float eps = 1.0/512.0;
    float hL = texture2D(heightMap, sampleUv + vec2(-eps, 0.0)).r;
    float hR = texture2D(heightMap, sampleUv + vec2( eps, 0.0)).r;
    float hD = texture2D(heightMap, sampleUv + vec2(0.0, -eps)).r;
    float hU = texture2D(heightMap, sampleUv + vec2(0.0,  eps)).r;
    float ridge = clamp((hL + hR + hD + hU - 4.0 * h) * -50.0, 0.0, 1.0);
    float slope = clamp(abs(hL - hR) + abs(hU - hD), 0.0, 1.0);
    vBleed = ridge + (slope * 0.2);
    vec3 displaced = position + normal * h * displacementScale;
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(displaced, 1.0);
  }
`;

const surfaceFrag = `
  varying float vHeight;
  varying float vBleed;
  uniform float mistLevel;
  void main() {
    vec3 paper = vec3(0.97, 0.95, 0.92);
    vec3 inkBlack = vec3(0.02, 0.02, 0.03);
    float sharpRidge = smoothstep(0.4, 0.8, vBleed);
    float washIntensity = vBleed * 1.5;
    float layeredWash = floor(washIntensity * 3.0) / 3.0;
    layeredWash = clamp(layeredWash, 0.0, 0.5);
    float finalIntensity = max(sharpRidge, layeredWash);
    finalIntensity *= smoothstep(0.05, 0.35, vHeight);
    finalIntensity = mix(finalIntensity, 1.0, pow(vHeight, 4.0) * 0.6);
    vec3 finalColor = mix(paper, inkBlack, clamp(finalIntensity, 0.0, 1.0));
    float alpha = smoothstep(mistLevel, mistLevel + 0.2, vHeight);
    alpha = mix(0.0, alpha, smoothstep(0.0, 0.15, vHeight));
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

const bgMountainFrag = `
  varying float vHeight;
  varying float vBleed;
  uniform float mistLevel;
  uniform vec3 inkColor;
  uniform vec3 contourColor;
  void main() {
    float alpha = smoothstep(mistLevel, mistLevel + 0.09, vHeight);
    if (alpha <= 0.0) discard;
    float contour = smoothstep(0.16, 0.7, vBleed);
    float highInk = smoothstep(0.45, 0.95, vHeight) * 0.18;
    vec3 color = mix(inkColor, contourColor, contour);
    color = mix(color, contourColor, highInk);
    gl_FragColor = vec4(color, alpha);
  }
`;

const bgOutlineVert = `
  uniform sampler2D heightMap;
  uniform float displacementScale;
  varying float vHeight;
  void main() {
    float h = texture2D(heightMap, uv).r;
    vHeight = h;
    vec3 displaced = position + normal * h * displacementScale + normal * 0.22;
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(displaced, 1.0);
  }
`;

const bgOutlineFrag = `
  varying float vHeight;
  uniform float mistLevel;
  uniform vec3 contourColor;
  void main() {
    float alpha = smoothstep(mistLevel, mistLevel + 0.09, vHeight);
    if (alpha <= 0.0) discard;
    gl_FragColor = vec4(contourColor, alpha);
  }
`;

// --- BIRDS ---
const birdClusters = [];
const sphereMat = new THREE.MeshBasicMaterial({ color: 0x010102, transparent: true, opacity: 0.95, side: THREE.DoubleSide });
const makeHalfOvalGeo = (side) => {
  const shape = new THREE.Shape();
  shape.moveTo(0, -1); shape.quadraticCurveTo(side, -1, side, 0); shape.quadraticCurveTo(side, 1, 0, 1); shape.lineTo(0, -1);
  return new THREE.ShapeGeometry(shape, 8);
};
const leftWingGeo = makeHalfOvalGeo(-1), rightWingGeo = makeHalfOvalGeo(1);

const createBirdCluster = (centerX, centerY, centerZ) => {
  const cluster = new THREE.Group(); cluster.position.set(centerX, 0, centerZ);
  cluster.userData.heightOffset = centerY;
  for (let i = 0; i < 8; i++) {
    const s = new THREE.Group();
    const lP = new THREE.Group(), rP = new THREE.Group();
    lP.add(new THREE.Mesh(leftWingGeo, sphereMat)); rP.add(new THREE.Mesh(rightWingGeo, sphereMat));
    s.add(lP, rP);
    s.position.set((Math.random() - 0.5) * 3, 0, (Math.random() - 0.5) * 3);
    s.scale.set(0.08, 0.02, 0.02);
    s.userData = { phase: Math.random() * 6.2, speed: 1.0 + Math.random(), lW: lP, rW: rP };
    cluster.add(s);
  }
  cluster.renderOrder = 999; scene.add(cluster); birdClusters.push(cluster);
};
createBirdCluster(4, 0, 2); createBirdCluster(-5, -1, 4);

// --- ASSET LOADER ---
let trail = null;
let surfaceCurve = null;

// Flags rise slowly out of the mountain as the red trail draws toward them.
// `at` is the flag's position along the trail (the trail is drawn up to scrollProgress).
const popFlags = []; // { group, at, baseY, t }
const FLAG_SINK = 2.0;      // how far below the surface a flag waits
const FLAG_RISE_SPAN = 0.08; // scroll distance over which it rises, ending as the line arrives
function registerPopFlag(group, at) {
  popFlags.push({ group, at, baseY: group.position.y, t: 0 });
  group.position.y -= FLAG_SINK;
  group.visible = false;
}
function updatePopFlags(raw) {
  popFlags.forEach(f => {
    const target = THREE.MathUtils.smootherstep(raw, f.at - FLAG_RISE_SPAN, f.at);
    f.t += (target - f.t) * 0.045; // slow, soft follow — no overshoot
    const e = 1 - Math.pow(1 - f.t, 3); // ease-out: settles gently at the top
    f.group.position.y = f.baseY - FLAG_SINK * (1 - e);
    f.group.visible = f.t > 0.002;
  });
}
// ── INK BANNER FLAGS ──
// Cinnabar silk banners with a hand-inked border: rugged torn edge, a bold brush outline
// that swells with pressure and breaks into dry-brush streaks, pigment pooling at the edge,
// paper grain, and soft shading in the folds as they wave.
const FLAG_W = 1.5, FLAG_H = 0.75, POLE_H = 1;
const FLAG_SCALE = 1.45; // overall size of each flag (pole + banner)

function _flagRng(seed) { // mulberry32 — deterministic per flag
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function makeFlagTexture(label, seed) {
  const W = 1024, H = 512;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const rnd = _flagRng(seed * 9301 + 49297);

  // cinnabar ground
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#a6271e');
  g.addColorStop(0.45, '#b02a20');
  g.addColorStop(1, '#8c1d16');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // uneven pigment: soft dark and light washes
  for (let i = 0; i < 16; i++) {
    const x = rnd() * W, y = rnd() * H, r = 90 + rnd() * 240;
    const dark = rnd() < 0.55;
    const a = 0.05 + rnd() * 0.08;
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, dark ? `rgba(72,8,5,${a})` : `rgba(220,92,70,${a})`);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);
  }

  // silk / paper fibres
  ctx.lineCap = 'round';
  for (let i = 0; i < 1100; i++) {
    const x = rnd() * W, y = rnd() * H, len = 6 + rnd() * 26, ang = rnd() * Math.PI;
    ctx.strokeStyle = rnd() < 0.6 ? 'rgba(255,228,210,0.05)' : 'rgba(60,4,2,0.06)';
    ctx.lineWidth = 0.6 + rnd() * 0.8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(ang + 0.4) * len * 0.5, y + Math.sin(ang + 0.4) * len * 0.5,
                         x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    ctx.stroke();
  }

  // the flags are seen from behind, so mirror everything typographic
  ctx.save();
  ctx.translate(W, 0);
  ctx.scale(-1, 1);

  const cream = a => `rgba(248,240,226,${a})`;

  // fine inner rule
  ctx.strokeStyle = cream(0.32);
  ctx.lineWidth = 2;
  ctx.strokeRect(104, 92, W - 208, H - 184);

  // label — spaced small caps, sized to fit
  const spacing = 0.08;
  let size = 240;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  const measure = s => {
    ctx.font = `600 ${s}px "Cormorant Garamond", Georgia, serif`;
    return ctx.measureText(label).width + s * spacing * (label.length - 1);
  };
  while (measure(size) > W - 260 && size > 40) size -= 4;
  ctx.font = `600 ${size}px "Cormorant Garamond", Georgia, serif`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const total = measure(size);
  const ty = H / 2 - size * 0.08;
  let x = (W - total) / 2;
  ctx.fillStyle = cream(0.95);
  ctx.shadowColor = 'rgba(50,0,0,0.35)';
  ctx.shadowOffsetY = 2;
  for (const ch of label) {
    ctx.fillText(ch, x, ty);
    x += ctx.measureText(ch).width + size * spacing;
  }
  ctx.shadowColor = 'transparent';

  // hairline rule with a centred diamond
  const ry = ty + size * 0.56, half = Math.min(total * 0.42, 190), cx = W / 2;
  ctx.strokeStyle = cream(0.55);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(cx - half, ry); ctx.lineTo(cx - 16, ry);
  ctx.moveTo(cx + 16, ry);   ctx.lineTo(cx + half, ry);
  ctx.stroke();
  ctx.fillStyle = cream(0.7);
  ctx.beginPath();
  ctx.moveTo(cx, ry - 7); ctx.lineTo(cx + 7, ry); ctx.lineTo(cx, ry + 7); ctx.lineTo(cx - 7, ry);
  ctx.closePath(); ctx.fill();
  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

const INK_FLAG_VERT = `
  uniform float uTime, uAmplitude, uFrequency, uPhase;
  varying vec2 vUv;
  varying float vSlope;
  void main() {
    vUv = uv;
    vec3 pos = position;
    float anchor = 1.0 - vUv.x;
    float t = uTime + uPhase;
    float a1 = pos.x * uFrequency + t, a2 = pos.x * uFrequency * 1.5 + t * 1.2;
    float wave = sin(a1) + sin(a2);
    pos.z += wave * anchor * uAmplitude;
    pos.y += sin(pos.x * uFrequency * 0.9 + t * 0.85) * anchor * uAmplitude * 0.12;
    // slope of the cloth along x, used to shade the folds
    vSlope = (cos(a1) + 1.5 * cos(a2)) * uFrequency * anchor * uAmplitude;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const INK_FLAG_FRAG = `
  uniform sampler2D uTexture;
  uniform float uSeed;
  varying vec2 vUv;
  varying float vSlope;

  float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vn(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h(i), h(i + vec2(1.0, 0.0)), f.x), mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  // rugged, torn edge: stacked sines give sharp jagged teeth
  float torn(float u, float s) {
    return sin(u * 31.0 + s) * 0.014 + sin(u * 67.0 + s * 0.7) * 0.007 + sin(u * 113.0 + s * 1.9) * 0.003;
  }

  void main() {
    vec3 color = texture2D(uTexture, vUv).rgb;
    float x = vUv.x, y = vUv.y, s = uSeed * 17.0;

    // edges (y offsets doubled: the flag is 2:1, so this keeps the border even)
    float eL = 0.02 + torn(y, s);
    float eR = 0.955 - torn(y, s + 2.0);
    float eB = 0.03 + torn(x * 0.87, s + 4.0);
    float eT = 0.96 - torn(x * 0.81, s + 6.0);
    float alpha = smoothstep(eL - 0.006, eL + 0.004, x) * smoothstep(eR + 0.006, eR - 0.004, x)
                * smoothstep(eB - 0.01, eB + 0.007, y) * smoothstep(eT + 0.01, eT - 0.007, y);

    // distance in from the edge, in equal physical units
    float dx = min(x - eL, eR - x);
    float dy = min(y - eB, eT - y) * 0.5;
    float d = min(dx, dy);

    // pigment pools toward the edge, like watercolour drying
    color *= 1.0 - 0.2 * (1.0 - smoothstep(0.0, 0.1, d));

    // brush outline: pressure swells along the stroke, dry-brush streaks break it in places
    float along = dx < dy ? y * 0.5 : x;
    float w = 0.024 + (vn(vec2(along * 7.0, s + 9.0)) - 0.5) * 0.014 + sin(along * 61.0 + s) * 0.003;
    float stroke = 1.0 - smoothstep(w, w + 0.006, d);
    float dry = smoothstep(0.55, 0.85, vn(vec2(along * 4.5, s + 11.0)));
    float streak = smoothstep(0.35, 0.7, vn(vec2(along * 40.0, d * 900.0)));
    float ink = 1.0 - dry * streak * 0.45;
    color = mix(color, vec3(0.07, 0.06, 0.055), stroke * ink * 0.96);

    // light falling across the folds, with a faint silk sheen on the crests
    float sl = clamp(vSlope, -1.0, 1.0);
    color *= 1.0 + sl * 0.14;
    color += vec3(1.0, 0.9, 0.85) * pow(max(sl, 0.0), 3.0) * 0.06;

    // paper grain
    color *= 0.975 + 0.05 * h(floor(vUv * vec2(700.0, 350.0)));

    gl_FragColor = vec4(color, alpha);
  }
`;

const flagMats = [];
// Builds a pole + banner; the group is positioned at `base` (+ `offset`) and rises at `at`.
function makeInkFlag({ label, seed, base, offset, rotY, meshPos, at }) {
  const group = new THREE.Group();
  group.position.set(base.x + offset[0], base.y + offset[1], base.z + offset[2]);
  group.scale.setScalar(FLAG_SCALE);

  const inkMat = new THREE.MeshBasicMaterial({ color: 0x15110d });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.03, POLE_H, 10), inkMat);
  pole.position.y = POLE_H / 2;
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.038, 14, 10), inkMat);
  finial.position.y = POLE_H + 0.03;
  group.add(pole, finial);

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime:      { value: 0.0 },
      uAmplitude: { value: 0.15 },
      uFrequency: { value: 2.6 },
      uPhase:     { value: seed * 1.7 },
      uSeed:      { value: seed },
      uTexture:   { value: makeFlagTexture(label, seed) },
    },
    vertexShader: INK_FLAG_VERT,
    fragmentShader: INK_FLAG_FRAG,
    transparent: true,
    side: THREE.DoubleSide,
  });
  flagMats.push(mat);

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(FLAG_W, FLAG_H, 48, 24), mat);
  mesh.rotation.y = rotY;
  mesh.position.set(meshPos[0], POLE_H - FLAG_H * 0.55, meshPos[1]);
  group.add(mesh);

  scene.add(group);
  registerPopFlag(group, at);
  return group;
}

const TRAIL_N = 120;
const loader = new THREE.TextureLoader();
loader.load(HM_FILE, async (heightTex) => {
  // force-load the exact webfont/weight the flag canvases need — @font-face resources
  // are fetched lazily on first use, so without this the canvases can bake in a
  // fallback system font permanently (canvas text doesn't retro-update on font load)
  await Promise.all([
    document.fonts.load('600 1em "Cormorant Garamond"'),
    document.fonts.ready,
  ]).catch(() => {});
  const DISP = 20.0;
  const SEGS = 512;

  // 1. MAIN MOUNTAIN
  const geo = new THREE.PlaneGeometry(24, 24, SEGS, SEGS);
  geo.rotateX(-Math.PI / 2);

  const surfaceMat = new THREE.ShaderMaterial({
    uniforms: { heightMap: {value: heightTex}, displacementScale: {value: DISP}, mistLevel: {value: 0.01} },
    vertexShader: surfaceVert, fragmentShader: surfaceFrag,
    transparent: true, side: THREE.FrontSide
  });

  const contourMat = new THREE.ShaderMaterial({
    uniforms: { heightMap: {value: heightTex}, displacementScale: {value: DISP}, mistLevel: {value: 0.01} },
    vertexShader: `
      uniform sampler2D heightMap;
      uniform float displacementScale;
      void main() {
        float h = texture2D(heightMap, uv).r;
        vec3 displaced = position + normal * h * displacementScale + normal * 0.2;
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(displaced, 1.0);
      }
    `,
    fragmentShader: `void main() { gl_FragColor = vec4(0.0, 0.0, 0.0, 0.9); }`,
    side: THREE.BackSide, transparent: true
  });

  const mountain = new THREE.Mesh(geo, surfaceMat);
  const outline = new THREE.Mesh(geo, contourMat);
  mountain.position.y = -4; outline.position.y = -4;
  scene.add(mountain, outline);

  // 2. BACKGROUND RANGE
  const bgGeo = new THREE.PlaneGeometry(70, 35, 64, 64);
  bgGeo.rotateX(-Math.PI / 2);
  const createBgMaterial = (inkColor, contourColor) => new THREE.ShaderMaterial({
    uniforms: {
      heightMap: {value: heightTex},
      displacementScale: {value: DISP * 1},
      mistLevel: {value: 0.16},
      inkColor: {value: inkColor},
      contourColor: {value: contourColor}
    },
    vertexShader: surfaceVert, fragmentShader: bgMountainFrag,
    transparent: true, depthWrite: true, side: THREE.FrontSide
  });
  const createBgOutlineMaterial = (contourColor) => new THREE.ShaderMaterial({
    uniforms: {
      heightMap: {value: heightTex},
      displacementScale: {value: DISP * 1},
      mistLevel: {value: 0.16},
      contourColor: {value: contourColor}
    },
    vertexShader: bgOutlineVert, fragmentShader: bgOutlineFrag,
    transparent: true, depthWrite: true, side: THREE.BackSide
  });
  const bgPlacements = [
    // near ring
    [0, -15, -58, 0],
    [34, -15.2, -48, 0.45],
    [58, -15.4, -24, 0.9],
    [64, -15.2, 12, 1.35],
    [46, -15.6, 42, 1.85],
    [12, -15.1, 62, 2.45],
    [-28, -15.5, 56, 3.05],
    [-56, -15.2, 28, 3.65],
    [-62, -15.7, -12, 4.15],
    [-38, -15.3, -48, 5.45],
    // middle ring
    [0, -17, -104, 0.15],
    [58, -17.2, -86, 0.6],
    [98, -17.6, -42, 1.05],
    [108, -17.1, 18, 1.55],
    [78, -17.8, 72, 2.05],
    [22, -17.3, 106, 2.65],
    [-46, -17.7, 96, 3.2],
    [-94, -17.2, 48, 3.75],
    [-104, -17.8, -24, 4.35],
    [-62, -17.4, -86, 5.55],
    // far wash
    [0, -19.2, -162, 0.35],
    [88, -19.6, -132, 0.8],
    [148, -20, -64, 1.2],
    [154, -19.4, 42, 1.75],
    [108, -20.1, 124, 2.25],
    [28, -19.7, 158, 2.8],
    [-72, -20.2, 142, 3.35],
    [-138, -19.6, 72, 3.9],
    [-148, -20.3, -44, 4.55],
    [-88, -19.8, -132, 5.75]
  ];

  const ringOffsets = [0, Math.PI / 15, 2 * Math.PI / 15];
  bgPlacements.forEach(([x, y, z, rotY], i) => {
    const θ = ringOffsets[Math.floor(i / 10)];
    const cosT = Math.cos(θ), sinT = Math.sin(θ);
    const rx = x * cosT - z * sinT;
    const rz = x * sinT + z * cosT;
    const BG_DISTANCE_SCALE = 0.62;
    const scaledX = rx * BG_DISTANCE_SCALE;
    const scaledZ = rz * BG_DISTANCE_SCALE;
    const dist = Math.hypot(scaledX, scaledZ);
    const MIST_START = 30;
    const MIST_END   = 110;
    const TONE_NEAR  = 0.80;
    const TONE_FAR   = 0.95;
    const mist = THREE.MathUtils.clamp((dist - MIST_START) / (MIST_END - MIST_START), 0, 1);
    const tone = THREE.MathUtils.lerp(TONE_NEAR, TONE_FAR, mist);
    const inkColor = new THREE.Color(tone, tone * 0.96, tone * 0.9);
    const contourTone = Math.max(tone - 0.08, 0.28);
    const contourColor = new THREE.Color(contourTone, contourTone * 0.95, contourTone * 0.9);
    const bgM = new THREE.Mesh(bgGeo, createBgMaterial(inkColor, contourColor));
    const bgOutline = new THREE.Mesh(bgGeo, createBgOutlineMaterial(contourColor));
    bgM.position.set(scaledX, y, scaledZ);
    bgOutline.position.copy(bgM.position);
    bgM.rotation.y = rotY + θ;
    bgOutline.rotation.y = rotY + θ;
    scene.add(bgOutline, bgM);
  });

  birdClusters.forEach(c => c.position.y = DISP - 12.2 + c.userData.heightOffset);

  // Tree Groves
  const treeMat = new THREE.MeshBasicMaterial({ color: 0x0a0a0c, transparent: true, opacity: 0.8 });
  const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
  canvas.width = canvas.height = 128; ctx.drawImage(heightTex.image, 0, 0, 128, 128);
  const data = ctx.getImageData(0,0,128,128).data;
  for (let g = 0; g < 10; g++) {
    let gx = 0.15 + Math.random() * 0.7, gy = 0.15 + Math.random() * 0.7;
    for (let t = 0; t < 20; t++) {
      let tx = gx + (Math.random() - 0.5) * 0.12, ty = gy + (Math.random() - 0.5) * 0.12;
      let val = data[(Math.floor(ty*127)*128 + Math.floor(tx*127)) * 4] / 255;
      if (val > 0.04 && val < 0.8) {
        const tree = new THREE.Group();
        for (let j = 0; j < 3; j++) {
          const size = 0.08 - (j * 0.02);
          const tMesh = new THREE.Mesh(new THREE.CylinderGeometry(0, size, 0.2, 3), treeMat);
          tMesh.position.y = j * 0.12; tree.add(tMesh);
        }
        tree.position.set((tx-0.5)*24, val*DISP - 4.15, (ty-0.5)*24);
        tree.rotation.y = Math.random() * Math.PI;
        scene.add(tree);
      }
    }
  }

  // --- SPIRAL MOUNTAIN TRAIL ---
  const surfacePoints = [];
  const GEOM_SIZE = 24.0;
  const SPIRAL_TURNS = .9;
  const START_RADIUS = 6.0;
  const END_RADIUS = 0.0;

  for (let i = 0; i < TRAIL_N; i++) {
    const f = i / (TRAIL_N - 1);
    const angle = Math.PI * 0.25 + f * Math.PI * 2 * SPIRAL_TURNS;
    const radius = THREE.MathUtils.lerp(START_RADIUS, END_RADIUS, f);
    const sx = Math.cos(angle) * radius;
    const sz = Math.sin(angle) * radius;
    const tu = THREE.MathUtils.clamp((sx / GEOM_SIZE) + 0.5, 0, 1);
    const tv = THREE.MathUtils.clamp((sz / GEOM_SIZE) + 0.5, 0, 1);
    const fx = tu * 127, fz = tv * 127;
    const x0 = Math.floor(fx), z0 = Math.floor(fz);
    const h = data[(z0 * 128 + x0) * 4] / 255;
    surfacePoints.push(new THREE.Vector3(sx, (h * DISP) - 4 + 0.16, sz));
  }

  surfaceCurve = new THREE.CatmullRomCurve3(surfacePoints);
  const trailGeo = new THREE.TubeGeometry(surfaceCurve, 200, 0.05, 8, false);
  const trailMat = new THREE.MeshBasicMaterial({ color: 0xB22222, transparent: true, opacity: 0.9, depthTest: true, depthWrite: true });
  trail = new THREE.Mesh(trailGeo, trailMat);
  trail.renderOrder = 0;
  scene.add(trail);

  // --- FLAGS (rise as the red trail reaches each one) ---
  const trailAt = f => surfacePoints[Math.floor(f * (TRAIL_N - 1))];
  makeInkFlag({ label: 'ART',        seed: 1, base: trailAt(0.30), offset: [0.3, 0, 0.9],     rotY: 3 * Math.PI / 4, meshPos: [0.4, -FLAG_W / 2 + 1.2],  at: 0.30 });
  makeInkFlag({ label: 'PROJECTS',   seed: 2, base: trailAt(0.50), offset: [-0.7, -1.3, 1.4], rotY: Math.PI / 2,     meshPos: [0, -FLAG_W / 2 + 1.4],    at: 0.50 });
  makeInkFlag({ label: 'EXPERIENCE', seed: 3, base: trailAt(0.70), offset: [-1.1, -3, -0.8],  rotY: Math.PI / 4,     meshPos: [-0.5, -FLAG_W / 2 + 1.2], at: 0.70 });
  makeInkFlag({ label: 'CONNECT',    seed: 4, base: surfacePoints[surfacePoints.length - 1], offset: [0, 0, 0], rotY: 7 * Math.PI / 4, meshPos: [-0.5, -FLAG_W / 2 + 0.3], at: 0.97 });
});

const camPath = new THREE.CatmullRomCurve3([
  new THREE.Vector3(15, 3, 15), new THREE.Vector3(-12, 12, 12),
  new THREE.Vector3(-15, 18, -8), new THREE.Vector3(8, 22, -5)
]);

function remapScroll(raw) {
  const segs = [
    [0.00, 0.08, 0.00, 0.03],  // hero title lifts away
    [0.08, 0.22, 0.03, 0.30],  // fly up to Art
    [0.22, 0.38, 0.30, 0.31],  // pause — Art
    [0.38, 0.42, 0.31, 0.50],  // move to Projects
    [0.42, 0.58, 0.50, 0.51],  // pause — Projects
    [0.58, 0.62, 0.51, 0.70],  // move to Experience
    [0.62, 0.78, 0.70, 0.71],  // pause — Experience
    [0.78, 0.82, 0.71, 0.90],  // move to Connect
    [0.82, 1.00, 0.90, 0.99],  // pause — Connect
  ];
  for (const [r0, r1, c0, c1] of segs) {
    if (raw <= r1) return c0 + ((raw - r0) / (r1 - r0)) * (c1 - c0);
  }
  return 0.99;
}

const ANCHORS = ['cp-art', 'cp-connect-left', 'cp-connect'];
const ANCHOR_ZONES = {
  'cp-art':          [0.20, 0.40],
  'cp-connect-left': [0.80, 1.1],
  'cp-connect':      [0.80, 1.1],
};
const EXP_START  = 0.42, EXP_END  = 0.60;
const EXP2_START = 0.62, EXP2_END = 0.80;

const expOverlay  = document.getElementById('exp-overlay');
const expInner    = document.getElementById('exp-inner');
const exp2Overlay = document.getElementById('exp2-overlay');
const exp2Inner   = document.getElementById('exp2-inner');

function driveOverlay(overlay, inner, start, end, raw) {
  if (!overlay || !inner) return;
  const inside = raw >= start && raw < end;
  if (inside) {
    const t = (raw - start) / (end - start);
    const maxScroll = inner.scrollHeight - overlay.clientHeight;
    overlay.scrollTop = Math.max(0, t * maxScroll);
  }
  overlay.style.opacity = inside ? '1' : '0';
  overlay.classList.toggle('visible', inside);
}

function updateExpOverlay(raw) {
  driveOverlay(expOverlay,  expInner,  EXP_START,  EXP_END,  raw);
  driveOverlay(exp2Overlay, exp2Inner, EXP2_START, EXP2_END, raw);
}

const heroEl = document.getElementById('hero');
const HERO_END = 0.08;
let heroExit = 0;
function updateHero(raw) {
  if (!heroEl) return;
  const t = Math.min(Math.max(raw / HERO_END, 0), 1);
  const e = t * t * (3 - 2 * t); // smoothstep
  heroExit = e;
  heroEl.style.setProperty('--hero-exit', e.toFixed(3));
  heroEl.style.visibility = e >= 0.999 ? 'hidden' : 'visible';
}

function updateAnchors() {
  const raw = scrollProgress;
  updateHero(raw);
  const fade = 0.03;
  ANCHORS.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const zone = ANCHOR_ZONES[id];
    if (!zone) { el.style.opacity = '0'; return; }
    const [start, end] = zone;
    let opacity = 0;
    if (raw >= start && raw < end) {
      const fadeIn  = Math.min((raw - start) / fade, 1);
      const fadeOut = Math.min((end - raw) / fade, 1);
      opacity = Math.min(fadeIn, fadeOut);
    }
    el.style.opacity = opacity.toFixed(3);
    el.querySelectorAll('.cp-item, .art-frame, .art-col, .connect-card, .connect-hero').forEach(item => {
      item.style.pointerEvents = opacity > 0 ? 'auto' : 'none';
    });
  });
  updateExpOverlay(raw);
}

// scrollProgress is written by ui.js and read here each frame
let scrollProgress = 0;

function animate() {
  requestAnimationFrame(animate);
  const clock = performance.now() * 0.001;
  flagMats.forEach(m => { m.uniforms.uTime.value = clock; });
  const p = Math.min(Math.max(remapScroll(scrollProgress), 0), 0.99);
  camera.position.lerp(camPath.getPoint(p), 0.06);
  camera.lookAt(0, p * 10, 0);

  // zoom out as the camera reaches the mountain peak (scrollProgress → 1.0)
  const zoomT = THREE.MathUtils.smoothstep(scrollProgress, 0.80, 1.00);
  const targetFov = THREE.MathUtils.lerp(42, 55, zoomT);
  camera.fov += (targetFov - camera.fov) * 0.05;
  camera.updateProjectionMatrix();

  if (trail) trail.geometry.setDrawRange(0, Math.floor(scrollProgress * trail.geometry.index.count));


  updateAnchors();
  updatePopFlags(scrollProgress);


  birdClusters.forEach(cluster => {
    cluster.children.forEach(s => {
      const flap = Math.sin(clock * s.userData.speed * 8.0 + s.userData.phase);
      s.position.y = Math.sin(clock * s.userData.speed + s.userData.phase) * 0.2;
      s.userData.lW.rotation.y = flap * 0.7;
      s.userData.rW.rotation.y = -flap * 0.7;
    });
  });
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
