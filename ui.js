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

// ── CHECKPOINT TITLE ──
const TITLE_ZONES = [
  { start: -0.1, end: 0.20, text: 'About' },
  { start: 0.20, end: 0.40, text: 'Art' },
  { start: 0.40, end: 0.60, text: 'Projects' },
  { start: 0.60, end: 0.80, text: 'Experience' },
  { start: 0.80, end: 1.10, text: 'Connect' },
];
const titleEl = document.getElementById('checkpoint-title');
let _lastTitle = '';
function updateCheckpointTitle(raw) {
  const fade = 0.08;
  const zone = TITLE_ZONES.find(z => raw >= z.start && raw < z.end);
  if (!zone) { titleEl.style.opacity = '0'; return; }
  if (zone.text !== _lastTitle) {
    _lastTitle = zone.text;
    titleEl.textContent = zone.text;
  }
  const fadeIn  = Math.min((raw - zone.start) / fade, 1);
  const fadeOut = Math.min((zone.end - raw) / fade, 1);
  titleEl.style.opacity = Math.min(fadeIn, fadeOut).toFixed(3);
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
