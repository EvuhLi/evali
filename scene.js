history.scrollRestoration = 'manual';
window.scrollTo(100, 100);

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
  let lastX = null, lastY = null, targetX = 0, targetY = 0, dropX = 0, dropY = 0, dropVisible = false;
  let isHovering = false, hoverT = 0;
  let isTyping = false, typingT = 0;
  const TTL = 320, MAX_R = 4, MAX_DOT_GAP = 8, N_BLOB = 10;

  const addPoint = (x, y, t) => {
    if (lastX !== null) {
      const dx = x - lastX, dy = y - lastY, dist = Math.hypot(dx, dy);
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

  window.addEventListener('pointermove', (e) => {
    targetX = e.clientX; targetY = e.clientY;
    if (!dropVisible) { dropX = targetX; dropY = targetY; dropVisible = true; }
    addPoint(targetX, targetY, performance.now());
  });

  document.addEventListener('pointerover', (e) => {
    const el = e.target.closest('a, button, [role="button"], .cp-item, .art-frame, .cp-marker, #modal-close');
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

    while (nodes.length && now - nodes[0].born > TTL) nodes.shift();

    const trailAlpha = (1 - hoverT * 0.85) * (1 - typingT * 0.95);
    for (let i = 1; i < nodes.length; i++) {
      const b = nodes[i], age = (now - b.born) / TTL, w = MAX_R * 2 * Math.pow(1 - age, 0.6);
      if (w < 0.4) continue;
      ctx.strokeStyle = `rgba(16,18,22,${(1 - age) * 0.9 * trailAlpha})`;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(nodes[i - 1].x, nodes[i - 1].y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    if (dropVisible) {
      dropX = targetX; dropY = targetY;

      const blobAlpha = (1 - hoverT) * (1 - typingT);
      if (blobAlpha > 0.01) {
        ctx.beginPath();
        for (let i = 0; i < N_BLOB; i++) {
          const a = (i / N_BLOB) * Math.PI * 2;
          const r = MAX_R * (1 + (Math.sin(a * 2 + t * 2.2) * 0.13));
          ctx.lineTo(dropX + Math.cos(a) * r, dropY + Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fillStyle = `rgba(14,16,20,${0.94 * blobAlpha})`;
        ctx.fill();
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
let flagMat = null;
let flagMat2 = null;
let flagMat3 = null;
let flagMat4 = null;
let flagMat5 = null;
const TRAIL_N = 120;
const loader = new THREE.TextureLoader();
loader.load(HM_FILE, (heightTex) => {
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

  // --- FLAG AT PEAK ---
  const peak = surfacePoints[surfacePoints.length - 1];

  // Flagpole
  const POLE_H = 1;
  const poleGeo = new THREE.CylinderGeometry(0.03, 0.05, POLE_H, 8);
  const poleMat = new THREE.MeshBasicMaterial({ color: 0x1a0f06 });
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.y = POLE_H / 2; // local — relative to group
  const connectFlag = new THREE.Group();
  connectFlag.position.set(peak.x, peak.y, peak.z);
  connectFlag.add(pole);
  scene.add(connectFlag);

  // CanvasTexture — "CONNECT" on parchment
  const FLAG_W = 1.5, FLAG_H = .75;
  const texC = document.createElement('canvas');
  texC.width = 512; texC.height = 218;
  const texCtx = texC.getContext('2d');

  // trail red #B22222
  const grad = texCtx.createLinearGradient(0, 0, 512, 218);
  grad.addColorStop(0,   '#9e1c1c');
  grad.addColorStop(0.5, '#B22222');
  grad.addColorStop(1,   '#8e1818');
  texCtx.fillStyle = grad;
  texCtx.fillRect(0, 0, 512, 218);

  // subtle grain lines
  texCtx.strokeStyle = 'rgba(255,220,200,0.06)';
  texCtx.lineWidth = 1;
  for (let y = 0; y < 218; y += 6) {
    texCtx.beginPath(); texCtx.moveTo(0, y); texCtx.lineTo(512, y); texCtx.stroke();
  }

  // text — white on red
  texCtx.save();
  texCtx.translate(512, 0);
  texCtx.scale(-1, 1);
  texCtx.font = '600 88px "Inter", "Helvetica Neue", sans-serif';
  texCtx.textAlign = 'center';
  texCtx.textBaseline = 'middle';
  texCtx.fillStyle = 'rgba(249,247,242,0.92)';
  texCtx.fillText('CONNECT', 256, 109);
  texCtx.strokeStyle = 'rgba(249,247,242,0.30)';
  texCtx.lineWidth = 1.5;
  texCtx.beginPath(); texCtx.moveTo(60, 155); texCtx.lineTo(452, 155); texCtx.stroke();
  texCtx.restore();

  const flagTex = new THREE.CanvasTexture(texC);

  // Flag shaders
  const flagVert = `
    uniform float uTime;
    uniform float uAmplitude;
    uniform float uFrequency;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      vec3 pos = position;
      // dual sine for organic, non-robotic wind — anchored at uv.x = 0 (left/pole side)
      float wave = sin(pos.x * uFrequency + uTime)
                 + sin(pos.x * uFrequency * 1.5 + uTime * 1.2);
      float anchor = 1.0 - vUv.x; // 0 at pole, 1 at free end
      pos.z += wave * anchor * uAmplitude;
      // slight vertical breathe
      pos.y += sin(pos.x * uFrequency * 0.9 + uTime * 0.85) * anchor * uAmplitude * 0.12;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `;

  const flagFrag = `
    uniform sampler2D uTexture;
    varying vec2 vUv;
    void main() {
      vec4 tex = texture2D(uTexture, vUv);
      vec3 red = vec3(0.698, 0.133, 0.133); // #B22222 — trail red
      vec3 color = mix(red, tex.rgb, 0.92);

      // torn / hand-cut edge: high-freq sine noise on each border
      float nx = sin(vUv.y * 31.0) * 0.014 + sin(vUv.y * 67.0) * 0.007;
      float ny = sin(vUv.x * 27.0) * 0.013 + sin(vUv.x * 53.0) * 0.008;
      float edgeL = smoothstep(0.00 + nx, 0.05 + nx, vUv.x);
      float edgeR = smoothstep(1.00 - nx, 0.90 - nx, vUv.x);
      float edgeB = smoothstep(0.00 + ny, 0.06 + ny, vUv.y);
      float edgeT = smoothstep(1.00 - ny, 0.91 - ny, vUv.y);
      float alpha = edgeL * edgeR * edgeB * edgeT;

      // vignette darkening toward torn edges
      float vign = 1.0 - (1.0 - edgeL) * 0.6 - (1.0 - edgeR) * 0.4;
      color *= vign;

      gl_FragColor = vec4(color, alpha * 0.96);
    }
  `;

  flagMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime:      { value: 0.0 },
      uAmplitude: { value: 0.16 },
      uFrequency: { value: 2.8 },
      uTexture:   { value: flagTex },
    },
    vertexShader:   flagVert,
    fragmentShader: flagFrag,
    transparent: true,
    side: THREE.DoubleSide,
  });

  const flagGeo = new THREE.PlaneGeometry(FLAG_W, FLAG_H, 40, 20);
  const flagMesh = new THREE.Mesh(flagGeo, flagMat);
  flagMesh.rotation.y = 7 * Math.PI / 4;
  flagMesh.position.set(-0.5, POLE_H - FLAG_H * 0.55, -FLAG_W / 2 + 0.3); // local — relative to group
  connectFlag.add(flagMesh);

  // --- EXPERIENCE FLAG — 70% along the trail ---
  const expPoint = surfacePoints[Math.floor(0.70 * (TRAIL_N - 1))];

  const expPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.05, POLE_H, 8),
    new THREE.MeshBasicMaterial({ color: 0x1a0f06 })
  );
  expPole.position.y = POLE_H / 2; // local — relative to group
  const experienceFlag = new THREE.Group();
  experienceFlag.position.set(expPoint.x - 1.1, expPoint.y - 3, expPoint.z - 0.8);
  experienceFlag.add(expPole);
  scene.add(experienceFlag);

  // Canvas texture — "EXPERIENCE"
  const texC2 = document.createElement('canvas');
  texC2.width = 512; texC2.height = 218;
  const tc2 = texC2.getContext('2d');
  const grad2 = tc2.createLinearGradient(0, 0, 512, 218);
  grad2.addColorStop(0,   '#9e1c1c');
  grad2.addColorStop(0.5, '#B22222');
  grad2.addColorStop(1,   '#8e1818');
  tc2.fillStyle = grad2;
  tc2.fillRect(0, 0, 512, 218);
  tc2.strokeStyle = 'rgba(255,220,200,0.06)';
  tc2.lineWidth = 1;
  for (let yi = 0; yi < 218; yi += 6) {
    tc2.beginPath(); tc2.moveTo(0, yi); tc2.lineTo(512, yi); tc2.stroke();
  }
  tc2.save();
  tc2.translate(512, 0);
  tc2.scale(-1, 1);
  tc2.font = '600 62px "Inter", "Helvetica Neue", sans-serif';
  tc2.textAlign = 'center';
  tc2.textBaseline = 'middle';
  tc2.fillStyle = 'rgba(249,247,242,0.92)';
  tc2.fillText('EXPERIENCE', 256, 105);
  tc2.strokeStyle = 'rgba(249,247,242,0.30)';
  tc2.lineWidth = 1.5;
  tc2.beginPath(); tc2.moveTo(40, 150); tc2.lineTo(472, 150); tc2.stroke();
  tc2.restore();
  const flagTex2 = new THREE.CanvasTexture(texC2);

  const expFlagVert = `
    uniform float uTime; uniform float uAmplitude; uniform float uFrequency;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      vec3 pos = position;
      float anchor = 1.0 - vUv.x;
      float wave = sin(pos.x * uFrequency + uTime) + sin(pos.x * uFrequency * 1.5 + uTime * 1.2);
      pos.z += wave * anchor * uAmplitude;
      pos.y += sin(pos.x * uFrequency * 0.9 + uTime * 0.85) * anchor * uAmplitude * 0.12;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `;
  const expFlagFrag = `
    uniform sampler2D uTexture;
    varying vec2 vUv;
    void main() {
      vec4 tex = texture2D(uTexture, vUv);
      vec3 red = vec3(0.698, 0.133, 0.133);
      vec3 color = mix(red, tex.rgb, 0.92);
      float nx = sin(vUv.y * 31.0) * 0.014 + sin(vUv.y * 67.0) * 0.007;
      float ny = sin(vUv.x * 27.0) * 0.013 + sin(vUv.x * 53.0) * 0.008;
      float alpha = smoothstep(0.00+nx,0.05+nx,vUv.x) * smoothstep(1.00-nx,0.90-nx,vUv.x)
                  * smoothstep(0.00+ny,0.06+ny,vUv.y) * smoothstep(1.00-ny,0.91-ny,vUv.y);
      gl_FragColor = vec4(color, alpha * 0.96);
    }
  `;
  flagMat2 = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0.0 }, uAmplitude: { value: 0.16 }, uFrequency: { value: 2.8 }, uTexture: { value: flagTex2 } },
    vertexShader: expFlagVert, fragmentShader: expFlagFrag,
    transparent: true, side: THREE.DoubleSide,
  });

  const expFlagGeo = new THREE.PlaneGeometry(FLAG_W, FLAG_H, 40, 20);
  const expFlagMesh = new THREE.Mesh(expFlagGeo, flagMat2);
  expFlagMesh.rotation.y = Math.PI / 4;
  expFlagMesh.position.set(-0.5, POLE_H - FLAG_H * 0.55, -FLAG_W / 2 + 1.2); // local — relative to group
  experienceFlag.add(expFlagMesh);


  // --- ABOUT FLAG — start of trail ---
  const aboutPoint = surfacePoints[0];

  const aboutPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.05, POLE_H, 8),
    new THREE.MeshBasicMaterial({ color: 0x1a0f06 })
  );
  aboutPole.position.y = POLE_H / 2;
  const aboutFlagGroup = new THREE.Group();
  aboutFlagGroup.position.set(aboutPoint.x, aboutPoint.y, aboutPoint.z);
  aboutFlagGroup.add(aboutPole);
  scene.add(aboutFlagGroup);

  // Canvas texture — "ABOUT"
  const texC3 = document.createElement('canvas');
  texC3.width = 512; texC3.height = 218;
  const tc3 = texC3.getContext('2d');
  const grad3 = tc3.createLinearGradient(0, 0, 512, 218);
  grad3.addColorStop(0,   '#9e1c1c');
  grad3.addColorStop(0.5, '#B22222');
  grad3.addColorStop(1,   '#8e1818');
  tc3.fillStyle = grad3;
  tc3.fillRect(0, 0, 512, 218);
  tc3.strokeStyle = 'rgba(255,220,200,0.06)';
  tc3.lineWidth = 1;
  for (let yi = 0; yi < 218; yi += 6) {
    tc3.beginPath(); tc3.moveTo(0, yi); tc3.lineTo(512, yi); tc3.stroke();
  }
  tc3.save();
  tc3.translate(512, 0);
  tc3.scale(-1, 1);
  tc3.font = '600 88px "Inter", "Helvetica Neue", sans-serif';
  tc3.textAlign = 'center';
  tc3.textBaseline = 'middle';
  tc3.fillStyle = 'rgba(249,247,242,0.92)';
  tc3.fillText('ABOUT', 256, 105);
  tc3.strokeStyle = 'rgba(249,247,242,0.30)';
  tc3.lineWidth = 1.5;
  tc3.beginPath(); tc3.moveTo(60, 150); tc3.lineTo(452, 150); tc3.stroke();
  tc3.restore();

  flagMat3 = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0.0 }, uAmplitude: { value: 0.16 }, uFrequency: { value: 2.8 }, uTexture: { value: new THREE.CanvasTexture(texC3) } },
    vertexShader: expFlagVert, fragmentShader: expFlagFrag,
    transparent: true, side: THREE.DoubleSide,
  });

  const aboutFlagMesh = new THREE.Mesh(new THREE.PlaneGeometry(FLAG_W, FLAG_H, 40, 20), flagMat3);
  aboutFlagMesh.rotation.y = 5*Math.PI / 4;
  aboutFlagMesh.position.set(-0.5 + 1, POLE_H - FLAG_H * 0.55, -FLAG_W / 2 + 0.3);
  aboutFlagGroup.add(aboutFlagMesh);

  // --- ART FLAG — 30% along the trail ---
  const artPoint = surfacePoints[Math.floor(0.30 * (TRAIL_N - 1))];

  const artPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.05, POLE_H, 8),
    new THREE.MeshBasicMaterial({ color: 0x1a0f06 })
  );
  artPole.position.y = POLE_H / 2;
  const artFlagGroup = new THREE.Group();
  artFlagGroup.position.set(artPoint.x + 0.3, artPoint.y, artPoint.z + 0.9);
  artFlagGroup.add(artPole);
  scene.add(artFlagGroup);

  const texC4 = document.createElement('canvas');
  texC4.width = 512; texC4.height = 218;
  const tc4 = texC4.getContext('2d');
  const grad4 = tc4.createLinearGradient(0, 0, 512, 218);
  grad4.addColorStop(0,   '#9e1c1c');
  grad4.addColorStop(0.5, '#B22222');
  grad4.addColorStop(1,   '#8e1818');
  tc4.fillStyle = grad4;
  tc4.fillRect(0, 0, 512, 218);
  tc4.strokeStyle = 'rgba(255,220,200,0.06)';
  tc4.lineWidth = 1;
  for (let yi = 0; yi < 218; yi += 6) {
    tc4.beginPath(); tc4.moveTo(0, yi); tc4.lineTo(512, yi); tc4.stroke();
  }
  tc4.save();
  tc4.translate(512, 0);
  tc4.scale(-1, 1);
  tc4.font = '600 88px "Inter", "Helvetica Neue", sans-serif';
  tc4.textAlign = 'center';
  tc4.textBaseline = 'middle';
  tc4.fillStyle = 'rgba(249,247,242,0.92)';
  tc4.fillText('ART', 256, 105);
  tc4.strokeStyle = 'rgba(249,247,242,0.30)';
  tc4.lineWidth = 1.5;
  tc4.beginPath(); tc4.moveTo(60, 150); tc4.lineTo(452, 150); tc4.stroke();
  tc4.restore();

  flagMat4 = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0.0 }, uAmplitude: { value: 0.16 }, uFrequency: { value: 2.8 }, uTexture: { value: new THREE.CanvasTexture(texC4) } },
    vertexShader: expFlagVert, fragmentShader: expFlagFrag,
    transparent: true, side: THREE.DoubleSide,
  });

  const artFlagMesh = new THREE.Mesh(new THREE.PlaneGeometry(FLAG_W, FLAG_H, 40, 20), flagMat4);
  artFlagMesh.rotation.y = 3 * Math.PI / 4;
  artFlagMesh.position.set(0.4, POLE_H - FLAG_H * 0.55, -FLAG_W / 2 + 1.2);
  artFlagGroup.add(artFlagMesh);


  // --- PROJECTS FLAG — 50% along the trail ---
  const projPoint = surfacePoints[Math.floor(0.50 * (TRAIL_N - 1))];

  const projPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.05, POLE_H, 8),
    new THREE.MeshBasicMaterial({ color: 0x1a0f06 })
  );
  projPole.position.y = POLE_H / 2;
  const projFlagGroup = new THREE.Group();
  projFlagGroup.position.set(projPoint.x - 0.7, projPoint.y - 1.3, projPoint.z + 1.4);
  projFlagGroup.add(projPole);
  scene.add(projFlagGroup);

  const texC5 = document.createElement('canvas');
  texC5.width = 512; texC5.height = 218;
  const tc5 = texC5.getContext('2d');
  const grad5 = tc5.createLinearGradient(0, 0, 512, 218);
  grad5.addColorStop(0,   '#9e1c1c');
  grad5.addColorStop(0.5, '#B22222');
  grad5.addColorStop(1,   '#8e1818');
  tc5.fillStyle = grad5;
  tc5.fillRect(0, 0, 512, 218);
  tc5.strokeStyle = 'rgba(255,220,200,0.06)';
  tc5.lineWidth = 1;
  for (let yi = 0; yi < 218; yi += 6) {
    tc5.beginPath(); tc5.moveTo(0, yi); tc5.lineTo(512, yi); tc5.stroke();
  }
  tc5.save();
  tc5.translate(512, 0);
  tc5.scale(-1, 1);
  tc5.font = '600 72px "Inter", "Helvetica Neue", sans-serif';
  tc5.textAlign = 'center';
  tc5.textBaseline = 'middle';
  tc5.fillStyle = 'rgba(249,247,242,0.92)';
  tc5.fillText('PROJECTS', 256, 105);
  tc5.strokeStyle = 'rgba(249,247,242,0.30)';
  tc5.lineWidth = 1.5;
  tc5.beginPath(); tc5.moveTo(40, 150); tc5.lineTo(472, 150); tc5.stroke();
  tc5.restore();

  flagMat5 = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0.0 }, uAmplitude: { value: 0.16 }, uFrequency: { value: 2.8 }, uTexture: { value: new THREE.CanvasTexture(texC5) } },
    vertexShader: expFlagVert, fragmentShader: expFlagFrag,
    transparent: true, side: THREE.DoubleSide,
  });

  const projFlagMesh = new THREE.Mesh(new THREE.PlaneGeometry(FLAG_W, FLAG_H, 40, 20), flagMat5);
  projFlagMesh.rotation.y = Math.PI / 2;
  projFlagMesh.position.set(0, POLE_H - FLAG_H * 0.55, -FLAG_W / 2 + 1.4);
  projFlagGroup.add(projFlagMesh);

});

const camPath = new THREE.CatmullRomCurve3([
  new THREE.Vector3(15, 3, 15), new THREE.Vector3(-12, 12, 12),
  new THREE.Vector3(-15, 18, -8), new THREE.Vector3(8, 22, -5)
]);

function remapScroll(raw) {
  const segs = [
    [0.00, 0.02, 0.00, 0.10],  // arrive at About
    [0.02, 0.18, 0.10, 0.11],  // pause — About
    [0.18, 0.22, 0.11, 0.30],  // move to Art
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

const ANCHORS = ['cp1', 'cp-github', 'cp-art', 'cp2', 'cp3', 'cp2b', 'cp3b', 'cp-connect-left', 'cp-connect'];
const ANCHOR_ZONES = {
  'cp1':             [-0.1, 0.20],
  'cp-github':       [-0.1, 0.20],
  'cp-art':          [0.20, 0.40],
  'cp3':             [0.40, 0.60],
  'cp3b':            [0.40, 0.60],
  'cp2':             [0.60, 0.80],
  'cp2b':            [0.60, 0.80],
  'cp-connect-left': [0.80, 1.1],
  'cp-connect':      [0.80, 1.1],
};
function updateAnchors() {
  const raw = scrollProgress;
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
}

// scrollProgress is written by ui.js and read here each frame
let scrollProgress = 0;

function animate() {
  requestAnimationFrame(animate);
  const clock = performance.now() * 0.001;
  const p = Math.min(Math.max(remapScroll(scrollProgress), 0), 0.99);
  camera.position.lerp(camPath.getPoint(p), 0.06);
  camera.lookAt(0, p * 10, 0);

  // zoom out as the camera reaches the mountain peak (scrollProgress → 1.0)
  const zoomT = THREE.MathUtils.smoothstep(scrollProgress, 0.80, 1.00);
  const targetFov = THREE.MathUtils.lerp(42, 55, zoomT);
  camera.fov += (targetFov - camera.fov) * 0.05;
  camera.updateProjectionMatrix();

  if (trail) trail.geometry.setDrawRange(0, Math.floor(scrollProgress * trail.geometry.index.count));
  if (flagMat) flagMat.uniforms.uTime.value = clock;
  if (flagMat2) flagMat2.uniforms.uTime.value = clock;
  if (flagMat3) flagMat3.uniforms.uTime.value = clock;
  if (flagMat4) flagMat4.uniforms.uTime.value = clock;
  if (flagMat5) flagMat5.uniforms.uTime.value = clock;


  updateAnchors();

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
