// ── PROGRESS BAR ──
function updateProgressBar(raw) {
  document.getElementById('progress-fill').style.width = (raw * 100) + '%';
  document.querySelectorAll('.cp-marker').forEach(m => {
    const t = parseFloat(m.dataset.target);
    m.classList.toggle('active', raw >= t && raw < t + 0.10);
  });
}

// ── CHECKPOINT TITLE ──
const TITLE_ZONES = [
  { start: 0,    end: 0.18, text: 'About' },
  { start: 0.18, end: 0.36, text: 'Art' },
  { start: 0.36, end: 0.58, text: 'Projects' },
  { start: 0.58, end: 0.80, text: 'Experience' },
  { start: 0.80, end: 1.01, text: 'Connect' },
];
const titleEl = document.getElementById('checkpoint-title');
let _lastTitle = '';
function updateCheckpointTitle(raw) {
  const zone = TITLE_ZONES.find(z => raw >= z.start && raw < z.end);
  const text = zone ? zone.text : '';
  if (text !== _lastTitle) {
    _lastTitle = text;
    titleEl.textContent = text;
    titleEl.classList.toggle('visible', !!text);
  }
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
function closeModal() { modalOverlay.classList.remove('open'); }

document.querySelectorAll('.cp-item').forEach(item => {
  item.addEventListener('click', (e) => { e.stopPropagation(); openModal(item); });
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

// ── SCROLL ──
updateProgressBar(0);
updateCheckpointTitle(0);

window.addEventListener('scroll', () => {
  scrollProgress = window.scrollY / (document.body.scrollHeight - window.innerHeight);
  updateProgressBar(scrollProgress);
  updateCheckpointTitle(scrollProgress);
});

// ── TWEAKS PANEL ──
(function () {
  const panel    = document.getElementById('tweaks-panel');
  const body     = document.getElementById('tw-body');
  const closeBtn = document.getElementById('tw-close');
  const labels   = { cp1: 'About', 'cp-art': 'Art', cp2: 'Experience A', cp2b: 'Experience B', cp3: 'Projects A', cp3b: 'Projects B', cp4: 'Connect' };
  const axes     = [
    { k: 'x', min: -25, max: 25 },
    { k: 'y', min: -5,  max: 28 },
    { k: 'z', min: -25, max: 25 },
  ];

  Object.keys(labels).forEach((id, idx) => {
    const group = document.createElement('div');
    group.className = 'tw-group';
    group.innerHTML = `<h4>${idx + 1}. ${labels[id]}</h4>`;
    axes.forEach(({ k, min, max }) => {
      const row = document.createElement('div');
      row.className = 'tw-row';
      const v = ANCHOR_DEFAULTS[id][k];
      row.innerHTML = `
        <label>${k}</label>
        <input type="range" min="${min}" max="${max}" step="0.5"
               value="${v}" data-id="${id}" data-axis="${k}">
        <span class="tw-val" data-val="${id}-${k}">${v.toFixed(1)}</span>`;
      group.appendChild(row);
    });
    body.appendChild(group);
  });

  function applyEdit(id, axis, val) {
    const anchor = ANCHORS.find(a => a.id === id);
    if (anchor) anchor.pos[axis] = val;
    ANCHOR_DEFAULTS[id][axis] = val;
    const valEl = body.querySelector(`[data-val="${id}-${axis}"]`);
    if (valEl) valEl.textContent = Number(val).toFixed(1);
  }

  body.addEventListener('input', (e) => {
    const t = e.target;
    if (t.tagName !== 'INPUT') return;
    applyEdit(t.dataset.id, t.dataset.axis, parseFloat(t.value));
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits: JSON.parse(JSON.stringify(ANCHOR_DEFAULTS)) }, '*');
  });

  window.addEventListener('message', (e) => {
    if (!e.data || typeof e.data !== 'object') return;
    if (e.data.type === '__activate_edit_mode')   panel.classList.add('open');
    if (e.data.type === '__deactivate_edit_mode')  panel.classList.remove('open');
  });
  closeBtn.addEventListener('click', () => {
    panel.classList.remove('open');
    window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*');
  });
  window.parent.postMessage({ type: '__edit_mode_available' }, '*');
})();

// ── AUDIO ──
(function () {
  const audio     = document.getElementById('bg-music');
  const btn       = document.getElementById('mute-btn');
  const iconSound = document.getElementById('icon-sound');
  const iconMute  = document.getElementById('icon-mute');
  let muted = false;

  if (audio) audio.volume = 0.05;

  const startAudio = () => {
    if (audio) audio.play().catch(() => {});
    document.removeEventListener('click',   startAudio);
    document.removeEventListener('scroll',  startAudio);
    document.removeEventListener('keydown', startAudio);
  };
  document.addEventListener('click',   startAudio);
  document.addEventListener('scroll',  startAudio);
  document.addEventListener('keydown', startAudio);

  if (btn) btn.addEventListener('click', (e) => {
    e.stopPropagation();
    muted = !muted;
    if (audio) audio.muted = muted;
    iconSound.style.display = muted ? 'none' : '';
    iconMute.style.display  = muted ? ''     : 'none';
    if (!muted && audio) audio.play().catch(() => {});
  });
})();
