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
  modalInner.innerHTML = html;
  modalOverlay.classList.add('open');
}
function closeModal() { modalOverlay.classList.remove('open', 'art-mode', 'project-mode'); }

document.querySelectorAll('.cp-item').forEach(item => {
  item.addEventListener('click', (e) => { e.stopPropagation(); openModal(item); });
});

// ── PROJECT CARD MODALS ──
const PROJECT_DATA = {
  loom: {
    title: 'Loom',
    img: 'project pics/loom.png',
    tags: ['React', 'Node.js/Express', 'Python', 'FastAPI', 'MongoDB', 'PyTorch/CLIP', 'D3.js'],
    desc: 'Hacking4Humanity Finalist — a social platform that deters art scraping with 10+ layers of protection: rate limiting, bot detection, and screenshot deterrence.',
    bullets: [
      'Built a social platform deterring art scraping with 10+ protection layers (rate limiting, bot detection, screenshot deterrence).',
      'Cut feed load 50x (5s to 100ms) via metadata/image separation, two-tier HTTP caching, and MongoDB indexing.',
      'Invited to discuss AI-driven safety with PA First Lady Lori Shapiro at the Governor\'s Residence.',
    ],
    links: [
      { label: 'GitHub', href: 'https://github.com/EvuhLi/Loom' },
      { label: 'Live Demo', href: 'https://loom-art-app.vercel.app/' },
    ],
  },
  minecraft: {
    title: 'Minecraft Live',
    img: 'project pics/minecraftlive.png',
    tags: ['Python', 'MediaPipe', 'OpenCV', 'WebSockets', 'pynput'],
    desc: 'Real-time motion controller translating 10+ body poses into Minecraft inputs at 15ms/frame (66 FPS).',
    bullets: [
      'Built a real-time motion controller translating 10+ body poses into Minecraft inputs at 15ms/frame (66 FPS).',
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
  modalOverlay.classList.add('open', 'project-mode');
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
    modalInner.innerHTML = `<img src="${img.src}" style="max-width:85vw;max-height:82vh;width:auto;height:auto;display:block;">`;
    modalOverlay.classList.add('open', 'art-mode');
  });
});
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });
document.getElementById('modal-close').addEventListener('click', closeModal);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

// ── PROGRESS MARKERS ──
document.querySelectorAll('.cp-marker').forEach(m => {
  m.addEventListener('click', () => {
    const t = parseFloat(m.dataset.target);
    window.scrollTo({ top: t * (document.body.scrollHeight - window.innerHeight), behavior: 'smooth' });
  });
});

// ── SCROLL HINT ──
(function () {
  const hint = document.getElementById('scroll-hint');
  if (!hint) return;
  const dismiss = () => {
    hint.style.animation = 'none';
    hint.style.transition = 'opacity 0.18s ease';
    hint.style.opacity = '0';
    setTimeout(() => hint.remove(), 200);
    window.removeEventListener('scroll',    dismiss);
    window.removeEventListener('wheel',     dismiss);
    window.removeEventListener('touchmove', dismiss);
  };
  window.addEventListener('scroll',    dismiss, { passive: true });
  window.addEventListener('wheel',     dismiss, { passive: true });
  window.addEventListener('touchmove', dismiss, { passive: true });
})();

// ── SCROLL ──
updateProgressBar(0);

window.addEventListener('scroll', () => {
  scrollProgress = window.scrollY / (document.body.scrollHeight - window.innerHeight);
  updateProgressBar(scrollProgress);
});


// ── GITHUB STATS ──
(async function fetchGithubStats() {
  const GITHUB_USER = 'EvuhLi';
  try {
    const [user, repos, commitSearch] = await Promise.all([
      fetch(`https://api.github.com/users/${GITHUB_USER}`).then(r => r.json()),
      fetch(`https://api.github.com/users/${GITHUB_USER}/repos?per_page=100`).then(r => r.json()),
      fetch(`https://api.github.com/search/commits?q=author:${GITHUB_USER}&per_page=1`, {
        headers: { Accept: 'application/vnd.github.cloak-preview+json' }
      }).then(r => r.json()),
    ]);

    if (typeof user.public_repos === 'number')
      document.getElementById('gh-repos').textContent = user.public_repos;

    if (typeof commitSearch.total_count === 'number') {
      const n = commitSearch.total_count;
      document.getElementById('gh-commits').textContent = n >= 1000 ? (n / 1000).toFixed(1) + 'k' : n;
    }

    if (Array.isArray(repos)) {
      const langBytes = {};
      repos.forEach(r => {
        if (r.language) langBytes[r.language] = (langBytes[r.language] || 0) + (r.size || 1);
      });
      const topLangs = Object.entries(langBytes).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([l]) => l);
      document.getElementById('gh-langs').innerHTML =
        topLangs.map(l => `<span class="gh-lang-pill">${l}</span>`).join('');
    }

    const now = new Date();
    document.getElementById('gh-updated').textContent =
      `live · ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } catch (_) {}
})();

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
  ['email-copy-btn', 'about-email-copy-btn'].forEach(id => {
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

