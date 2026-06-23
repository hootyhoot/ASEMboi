const main = document.getElementById('projects-main');
const lightbox = document.getElementById('lightbox');
const lightboxClose = document.getElementById('lightbox-close');
const lbImg = document.getElementById('lb-img');
const lbPrev = document.getElementById('lb-prev');
const lbNext = document.getElementById('lb-next');
const backToTop = document.getElementById('back-to-top');
const dock = document.getElementById('project-dock');

let lbImages = [];
let lbIndex = 0;

function isVideo(src) {
  return /\.(mp4|webm|mov)$/i.test(src);
}

// ── Back to top ────────────────────────────────────────────
window.addEventListener('scroll', () => {
  backToTop.classList.toggle('visible', window.scrollY > 400);
}, { passive: true });

backToTop.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ── Lightbox ──────────────────────────────────────────────
function openLightbox(images, index) {
  lbImages = images.filter(s => !isVideo(s));
  lbIndex = Math.min(index, lbImages.length - 1);
  if (!lbImages.length) return;
  lbImg.src = lbImages[lbIndex];
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
  updateLbNav();
}

function closeLightbox() {
  lightbox.classList.remove('open');
  document.body.style.overflow = '';
}

function updateLbNav() {
  lbPrev.style.opacity = lbIndex > 0 ? '1' : '0.25';
  lbNext.style.opacity = lbIndex < lbImages.length - 1 ? '1' : '0.25';
}

lightboxClose.addEventListener('click', closeLightbox);
lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
lbPrev.addEventListener('click', () => { if (lbIndex > 0) { lbIndex--; lbImg.src = lbImages[lbIndex]; updateLbNav(); } });
lbNext.addEventListener('click', () => { if (lbIndex < lbImages.length - 1) { lbIndex++; lbImg.src = lbImages[lbIndex]; updateLbNav(); } });

document.addEventListener('keydown', e => {
  if (!lightbox.classList.contains('open')) return;
  if (e.key === 'ArrowLeft') lbPrev.click();
  else if (e.key === 'ArrowRight') lbNext.click();
  else if (e.key === 'Escape') closeLightbox();
});

// ── Dock ──────────────────────────────────────────────────
const BUBBLE_SIZE = 44;
const BUBBLE_GAP  = 16;
const ARC_STEP    = 9;   // px drop per squared unit of index distance from center
const MAG_MAX     = 2.5;
const MAG_RADIUS  = 110; // px influence radius

function buildDock(projects) {
  dock.innerHTML = '';

  projects.forEach((project, i) => {
    const btn = document.createElement('button');
    btn.className = 'dock-bubble';
    btn.textContent = i + 1;
    btn.setAttribute('aria-label', `Jump to: ${project.title}`);
    btn.addEventListener('click', () => {
      document.getElementById(`project-${i}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    dock.appendChild(btn);
  });

  layoutDock();
  window.addEventListener('resize', layoutDock, { passive: true });
  dock.addEventListener('mousemove', onDockMove);
  dock.addEventListener('mouseleave', onDockLeave);
}

function layoutDock() {
  const bubbles = [...dock.querySelectorAll('.dock-bubble')];
  const n = bubbles.length;
  if (!n) return;

  const dockW   = dock.offsetWidth;
  const centerX = dockW / 2;
  const totalW  = n * BUBBLE_SIZE + (n - 1) * BUBBLE_GAP;
  const startX  = centerX - totalW / 2;
  const ci      = (n - 1) / 2; // fractional center index

  // max arc drop — resize dock height to fit
  const maxDrop = ARC_STEP * Math.pow(ci, 2);
  dock.style.height = `${BUBBLE_SIZE + maxDrop + 20}px`;

  bubbles.forEach((b, i) => {
    const x    = startX + i * (BUBBLE_SIZE + BUBBLE_GAP);
    const drop = ARC_STEP * Math.pow(i - ci, 2);
    b.style.left = `${x}px`;
    b.style.top  = `${drop}px`;
    b._cx = x + BUBBLE_SIZE / 2; // store screen-relative center for magnify
  });
}

function onDockMove(e) {
  const rect   = dock.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;

  dock.querySelectorAll('.dock-bubble').forEach(b => {
    b.classList.remove('resetting');
    const dist  = Math.abs(mouseX - b._cx);
    const t     = Math.max(0, 1 - dist / MAG_RADIUS);
    const scale = 1 + (MAG_MAX - 1) * Math.pow(t, 1.5);
    b.style.transform = `scale(${scale})`;
  });
}

function onDockLeave() {
  dock.querySelectorAll('.dock-bubble').forEach(b => {
    b.classList.add('resetting');
    b.style.transform = '';
  });
}

// ── Helpers ───────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-MY', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
}

// ── Render section ─────────────────────────────────────────
function renderSection(project, index) {
  const section = document.createElement('section');
  section.className = 'project-section';
  section.id = `project-${index}`;

  const media = project.images || [];
  const tags  = (project.tags || []).map(t => `<span class="tag">${t}</span>`).join('');

  let galleryClass = 'project-gallery';
  if (media.length === 1) galleryClass += ' single';
  else if (media.length === 2) galleryClass += ' double';

  const galleryHTML = media.map((src, i) => {
    if (isVideo(src)) {
      return `<video class="gallery-video" src="${src}" autoplay muted loop playsinline preload="auto"></video>`;
    }
    return `<img class="gallery-img" src="${src}" alt="${project.title} — image ${i + 1}" loading="lazy">`;
  }).join('');

  section.innerHTML = `
    <div class="project-inner">
      <div class="project-meta">
        <div class="project-date">${formatDate(project.date)}</div>
        <h2 class="project-title">${project.title}</h2>
        ${tags ? `<div class="project-tags">${tags}</div>` : ''}
        ${project.description ? `<p class="project-desc">${project.description}</p>` : ''}
      </div>
      ${media.length ? `<div class="${galleryClass}">${galleryHTML}</div>` : ''}
    </div>
  `;

  const imgEls  = [...section.querySelectorAll('.gallery-img')];
  const imgSrcs = media.filter(s => !isVideo(s));
  imgEls.forEach((img, i) => {
    img.addEventListener('click', () => openLightbox(imgSrcs, i));
  });

  return section;
}

// ── Load projects ──────────────────────────────────────────
async function loadProjects() {
  try {
    const indexRes = await fetch('projects/projects.json');
    if (!indexRes.ok) throw new Error();
    const slugs = await indexRes.json();

    if (!slugs.length) {
      main.innerHTML = '<p class="empty-state">Projects coming soon — check back after our next build session!</p>';
      return;
    }

    const projects = await Promise.all(
      slugs.map(async slug => {
        const res = await fetch(`projects/${slug}/meta.json`);
        if (!res.ok) return null;
        const meta = await res.json();
        const base = `projects/${slug}/images/`;
        meta.images = (meta.images || []).map(img => img.startsWith('http') ? img : base + img);
        if (meta.cover && !meta.cover.startsWith('http')) meta.cover = base + meta.cover;
        return meta;
      })
    );

    const valid = projects.filter(Boolean).sort((a, b) => new Date(b.date) - new Date(a.date));

    main.innerHTML = '';
    if (!valid.length) {
      main.innerHTML = '<p class="empty-state">Projects coming soon!</p>';
      return;
    }

    valid.forEach((p, i) => main.appendChild(renderSection(p, i)));
    buildDock(valid);

  } catch {
    main.innerHTML = '<p class="empty-state">Projects coming soon — check back after our next build session!</p>';
  }
}

loadProjects();
