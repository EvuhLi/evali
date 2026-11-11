// ── SCROLL PACING ──
// The scene works in "raw" progress (0–1). Physical scrolling is stretched through the
// Projects and Experience sections so their cards don't fly past: each of those raw
// ranges gets SLOWDOWN× more scroll distance, and the page is made taller to match.
const PROJECTS_SLOWDOWN   = 2.5;
const EXPERIENCE_SLOWDOWN = 2.5;
const PACE_BASE_VH = 700; // original #scroll-space height
// [raw start, raw end, slowdown] — everything outside these ranges keeps its old pace
const PACE_SEGMENTS = (() => {
  const slow = [[0.42, 0.60, PROJECTS_SLOWDOWN], [0.62, 0.80, EXPERIENCE_SLOWDOWN]];
  const segs = []; let r = 0;
  slow.forEach(([r0, r1, k]) => { if (r0 > r) segs.push([r, r0, 1]); segs.push([r0, r1, k]); r = r1; });
  if (r < 1) segs.push([r, 1, 1]);
  const total = segs.reduce((t, [r0, r1, k]) => t + (r1 - r0) * k, 0);
  let p = 0;
  return { total, segs: segs.map(([r0, r1, k]) => { const p0 = p; p += (r1 - r0) * k / total; return { r0, r1, p0, p1: p }; }) };
})();
document.getElementById('scroll-space').style.height = ((PACE_BASE_VH - 100) * PACE_SEGMENTS.total + 100) + 'vh';

function physicalToRaw(p) {
  for (const s of PACE_SEGMENTS.segs) if (p <= s.p1) return s.r0 + (p - s.p0) / (s.p1 - s.p0) * (s.r1 - s.r0);
  return 1;
}
function rawToPhysical(r) {
  for (const s of PACE_SEGMENTS.segs) if (r <= s.r1) return s.p0 + (r - s.r0) / (s.r1 - s.r0) * (s.p1 - s.p0);
  return 1;
}

// ── PROGRESS BAR ──
// maps scroll progress to bar display progress so dots align with fill
function scrollToDisplay(raw) {
  const pts = [[0.00, 0.00], [0.30, 0.25], [0.50, 0.50], [0.70, 0.75], [1.00, 1.00]];
  for (let i = 1; i < pts.length; i++) {
    const [r0, d0] = pts[i-1], [r1, d1] = pts[i];
    if (raw <= r1) return d0 + (raw - r0) / (r1 - r0) * (d1 - d0);
  }
  return 1;
}
const _markers = [...document.querySelectorAll('.cp-marker')];
const _markerPos = _markers.map(m => parseFloat(m.style.left) / 100);
function updateProgressBar(raw) {
  const display = scrollToDisplay(raw);
  document.getElementById('progress-fill').style.width = (display * 100) + '%';
  _markers.forEach((m, i) => {
    const lo = i === 0 ? -Infinity : (_markerPos[i-1] + _markerPos[i]) / 2;
    const hi = i === _markers.length - 1 ? Infinity : (_markerPos[i] + _markerPos[i+1]) / 2;
    m.classList.toggle('active', display >= lo && display < hi);
  });
}

// ── MODAL ──
const modalOverlay = document.getElementById('modal-overlay');
const modalInner   = document.getElementById('modal-inner');

function openModal(item) {
  const role     = item.querySelector('.cp-role')?.textContent?.trim() || '';
  const placeEl  = item.querySelector('.cp-place');
  const detailEl = item.querySelector('.cp-detail');
  let html = `<h2>${role}</h2>`;
  if (placeEl)  html += `<div class="modal-place">${placeEl.innerHTML}</div>`;
  if (detailEl) html += detailEl.innerHTML;
  setModalMode(null);
  modalInner.innerHTML = html;
  modalOverlay.classList.add('open');
}
// Keep the mode class (art / project) until the fade-out finishes — removing it
// immediately restyles the card mid-fade, which made closing look glitchy.
let modalCloseTimer = null;
function setModalMode(mode) {
  clearTimeout(modalCloseTimer);
  modalOverlay.classList.remove('art-mode', 'project-mode');
  if (mode) modalOverlay.classList.add(mode);
}
function closeModal() {
  if (!modalOverlay.classList.contains('open')) return;
  modalOverlay.classList.remove('open');
  clearTimeout(modalCloseTimer);
  modalCloseTimer = setTimeout(() => {
    modalOverlay.classList.remove('art-mode', 'project-mode');
    modalInner.innerHTML = '';
  }, 400);
}

document.querySelectorAll('.cp-item').forEach(item => {
  item.addEventListener('click', (e) => { e.stopPropagation(); openModal(item); });
});

// ── PROJECT CARD MODALS ──
const PROJECT_DATA = {
  loom: {
    title: 'Loom',
    img: 'img/projects/loom.webp',
    tags: ['React', 'Node.js/Express', 'Python', 'FastAPI', 'MongoDB', 'AWS S3', 'PyTorch', 'OpenAI CLIP'],
    desc: '1st place out of 55+ participants at Hacking4Humanity — a full-stack artist platform built to protect human-made art.',
    bullets: [
      'Placed 1st out of 55+ participants at Hacking4Humanity, building a full-stack artist platform to protect human-made art.',
      'Engineered a FastAPI ML microservice featuring ensemble bot detection (MLP, honeypots), PyTorch subperceptual perturbations for adversarial art cloaking, and OpenAI CLIP for multi-modal tagging.',
      'Cut feed delivery latency from 2.5s to 50ms using an AWS S3 and CloudFront pipeline with MongoDB keyset pagination.',
    ],
    links: [
      { label: 'GitHub', href: 'https://github.com/EvuhLi/Loom' },
      { label: 'Live Demo', href: 'https://loom-art-app.vercel.app/' },
    ],
  },
  minecraft: {
    title: 'Minecraft Live',
    img: 'img/projects/minecraftlive.webp',
    tags: ['Python', 'MediaPipe', 'OpenCV', 'WebSockets', 'pynput'],
    desc: 'Real-time motion controller translating 10+ body poses into Minecraft inputs at 66 FPS.',
    bullets: [
      'Built a real-time motion controller translating 10+ body poses into Minecraft inputs in real time at 66 FPS.',
      'Engineered a cross-platform mobile controller over WebSockets/UDP with drift calibration and dead-zone filtering.',
      'Designed a configurable, debounced gesture state machine converting noisy pose data into stable game controls.',
    ],
    links: [
      { label: 'GitHub', href: 'https://github.com/EvuhLi/MinecraftLive' },
    ],
  },
};

function openProjectModal(key) {
  const p = PROJECT_DATA[key];
  if (!p) return;
  const tagsHtml = p.tags.map(t => `<span class="pm-tag">${t}</span>`).join('');
  const bulletsHtml = p.bullets.map(b => `<li>${b}</li>`).join('');
  const linksHtml = p.links.map(l =>
    `<a href="${l.href}" target="_blank" rel="noopener" class="pm-link">${l.label} →</a>`
  ).join('');
  modalInner.innerHTML = `
    <div class="pm-img"><img src="${p.img}" alt="${p.title}"></div>
    <div class="pm-body">
      <h2 class="pm-title">${p.title}</h2>
      <div class="pm-tags">${tagsHtml}</div>
      <p class="pm-desc">${p.desc}</p>
      <ul class="pm-bullets">${bulletsHtml}</ul>
      <div class="pm-links">${linksHtml}</div>
    </div>
  `;
  setModalMode('project-mode');
  modalOverlay.classList.add('open');
}

document.querySelectorAll('.exp-card.exp-project').forEach(card => {
  card.addEventListener('click', (e) => {
    if (e.target.closest('a')) return;
    e.stopPropagation();
    openProjectModal(card.dataset.project);
  });
});
document.querySelectorAll('.art-frame').forEach(frame => {
  frame.addEventListener('click', e => {
    e.stopPropagation();
    const img = frame.querySelector('img');
    modalInner.innerHTML = `<img src="${img.dataset.full || img.src}" style="max-width:85vw;max-height:82vh;width:auto;height:auto;display:block;">`;
    setModalMode('art-mode');
    modalOverlay.classList.add('open');
  });
});
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });
document.getElementById('modal-close').addEventListener('click', closeModal);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

// ── PROGRESS MARKERS ──
document.querySelectorAll('.cp-marker').forEach(m => {
  m.addEventListener('click', () => {
    const t = parseFloat(m.dataset.target);
    window.scrollTo({ top: rawToPhysical(t) * (document.body.scrollHeight - window.innerHeight), behavior: 'smooth' });
  });
});

// ── EXPERIENCE: split "Role · Company" into company (title) + role (subtitle) ──
document.querySelectorAll('#exp2-inner .exp-role').forEach(el => {
  const i = el.textContent.indexOf(' · ');
  if (i < 0) return;
  const role = el.textContent.slice(0, i).trim();
  const org  = el.textContent.slice(i + 3).trim();
  el.textContent = '';
  const o = document.createElement('span'); o.className = 'exp-org'; o.textContent = org;
  const r = document.createElement('span'); r.className = 'exp-position'; r.textContent = role;
  el.append(o, r);
});

// ── HERO: split the name into letters for the staggered reveal ──
(function () {
  let i = 0;
  document.querySelectorAll('#hero .hero-word').forEach(word => {
    const text = word.textContent;
    word.textContent = '';
    for (const ch of text) {
      const span = document.createElement('span');
      span.className = 'hero-char';
      span.style.setProperty('--i', i++);
      span.textContent = ch;
      word.appendChild(span);
    }
  });
})();

// ── SCROLL ──
updateProgressBar(0);

window.addEventListener('scroll', () => {
  scrollProgress = physicalToRaw(Math.min(Math.max(window.scrollY / (document.body.scrollHeight - window.innerHeight), 0), 1));
  updateProgressBar(scrollProgress);
});


// ── CONNECT FORM ──
(function () {
  const form = document.getElementById('connect-form');
  const btn  = form && form.querySelector('.connect-submit');
  if (!form) return;

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function setError(field, msg) {
    field.classList.add('invalid');
    let err = field.parentElement.querySelector('.connect-error');
    if (!err) {
      err = document.createElement('span');
      err.className = 'connect-error';
      field.parentElement.appendChild(err);
    }
    err.textContent = msg;
  }

  function clearError(field) {
    field.classList.remove('invalid');
    const err = field.parentElement.querySelector('.connect-error');
    if (err) err.remove();
  }

  // clear errors on input
  form.querySelectorAll('input, textarea').forEach(el => {
    el.addEventListener('input', () => clearError(el));
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (btn.classList.contains('sent') || btn.classList.contains('loading')) return;

    const emailEl = document.getElementById('cf-email');
    const msgEl   = document.getElementById('cf-msg');
    let valid = true;

    if (!EMAIL_RE.test(emailEl.value.trim())) {
      setError(emailEl, 'Enter a valid email address.');
      valid = false;
    }
    if (msgEl.value.trim().length < 10) {
      setError(msgEl, 'Message must be at least 10 characters.');
      valid = false;
    }
    if (!valid) return;

    btn.classList.add('loading');
    btn.disabled = true;

    try {
      const res = await fetch('https://formspree.io/f/xjglaajj', {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error('Network response was not ok');
      btn.classList.remove('loading');
      btn.classList.add('sent');
      setTimeout(() => {
        form.reset();
        btn.classList.remove('sent');
        btn.disabled = false;
      }, 3200);
    } catch (_) {
      btn.classList.remove('loading');
      btn.disabled = false;
      let err = form.querySelector('.connect-submit-error');
      if (!err) {
        err = document.createElement('p');
        err.className = 'connect-submit-error connect-error';
        err.style.textAlign = 'center';
        err.style.marginTop = '8px';
        btn.after(err);
      }
      err.textContent = 'Something went wrong — try emailing directly.';
    }
  });
})();

// ── CLIPBOARD ──
(function () {
  ['email-copy-btn'].forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText('lievayifan@gmail.com').then(() => {
        btn.classList.add('copied');
        setTimeout(() => btn.classList.remove('copied'), 1800);
      });
    });
  });
})();

