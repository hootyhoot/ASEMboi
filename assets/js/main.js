const main = document.getElementById('projects-main');
const lightbox = document.getElementById('lightbox');
const lightboxClose = document.getElementById('lightbox-close');
const lbImg = document.getElementById('lb-img');
const lbPrev = document.getElementById('lb-prev');
const lbNext = document.getElementById('lb-next');
const backToTop = document.getElementById('back-to-top');
const dock = document.getElementById('project-dock');
const hero = document.querySelector('.hero');

// ── Hero circle arc ────────────────────────────────────────
// ellipse() has independent rx/ry, so the dome shape changes with viewport.
// circle() with a JS-computed radius gives a true single-radius arc.
// For dome height h spanning full viewport width w: R = w²/(8h) + h/2
// Center placed cy = R−h pixels below the element bottom so the arc
// just touches the element's top-center and bottom-corners.
function updateHeroCurve() {
  const w = window.innerWidth;
  const h = 60;
  const R = Math.round(w * w / (8 * h) + h / 2);
  hero.style.setProperty('--hero-R',  R + 'px');
  hero.style.setProperty('--hero-cy', (R - h) + 'px');
}
updateHeroCurve();
window.addEventListener('resize', updateHeroCurve, { passive: true });

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
const MAG_MAX = 2.5;

let dockData = [];
let dockResizeTimer = null;
let dockResizeHandler = null;

function bSize() { return window.innerWidth < 640 ? 32 : 44; }
function bGap()  { return window.innerWidth < 640 ?  8 : 14; }
function magRadius() { return Math.max(60, window.innerWidth * 0.12); }

function buildDock(projects) {
  dock.innerHTML = '';
  dockData = [];

  if (dockResizeHandler) window.removeEventListener('resize', dockResizeHandler);
  dockResizeHandler = () => {
    clearTimeout(dockResizeTimer);
    dockResizeTimer = setTimeout(layoutDock, 120);
  };
  window.addEventListener('resize', dockResizeHandler, { passive: true });

  projects.forEach((project, i) => {
    const btn = document.createElement('button');
    btn.className = 'dock-bubble';
    btn.textContent = i + 1;
    btn.setAttribute('aria-label', `Jump to project: ${project.title}`);
    btn.addEventListener('click', () => {
      document.getElementById(`project-${i}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    dock.appendChild(btn);
    dockData.push({ el: btn, baseMarginBottom: 0, baseSize: bSize() });
  });

  layoutDock();
  dock.addEventListener('mousemove', onDockMove);
  dock.addEventListener('mouseleave', onDockLeave);
}

function layoutDock() {
  const n = dockData.length;
  if (!n) return;

  const size  = bSize();
  const gap   = bGap();
  const totalW = n * size + (n - 1) * gap;
  const halfW  = totalW / 2;
  const ci    = (n - 1) / 2;
  const vw    = window.innerWidth;

  // The hero circle chord equals the viewport width at its base, so its
  // apparent visual radius (half-chord) = vw/2 — NOT the mathematical
  // radius of curvature (vw²/480), which is huge and gives a near-zero drop.
  // Inner-curve formula: R_visual_dock = vw/2 − 90 (90 px separation).
  // refX capped at 150 px: once halfW > 150 (≥ 6 desktop bubbles) arcDrop
  // responds only to viewport width, not item count.
  const R_visual = Math.max(vw / 2 - 90, 100) * 0.67;
  const refX     = Math.min(halfW, 150);
  const arcDrop  = Math.min(size * 0.55, (refX * refX) / (2 * R_visual));

  dock.style.height = `${Math.ceil(size + 32 + arcDrop)}px`;
  dock.style.gap    = `${gap}px`;

  dockData.forEach((bd, i) => {
    // Index-based arc: normalise by bubble index, not screen position.
    // Edge bubbles sit at index 0 and n−1 → normI = ±1 → drop = arcDrop.
    // This is constant regardless of how many items exist, fixing the
    // "more items = more apparent curve" artefact of the x-position formula.
    const normI = n > 1 ? (i - ci) / ci : 0;
    const drop  = arcDrop * normI * normI;
    const mb    = arcDrop - drop;   // center: arcDrop (highest); edges: 0

    bd.baseMarginBottom = mb;
    bd.baseSize = size;
    bd.el.classList.remove('dock-resetting');
    bd.el.style.width        = `${size}px`;
    bd.el.style.height       = `${size}px`;
    bd.el.style.marginBottom = `${mb}px`;
    bd.el.style.fontSize     = `${Math.round(size * 0.33)}px`;
  });
}

function onDockMove(e) {
  const n = dockData.length;
  if (!n) return;

  const rect   = dock.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const size   = dockData[0].baseSize;
  const gap    = bGap();
  const totalW = n * size + (n - 1) * gap;
  const halfW  = totalW / 2;
  const dockCx = dock.offsetWidth / 2;
  const radius = magRadius();

  dockData.forEach((bd, i) => {
    bd.el.classList.remove('dock-resetting');
    // Distance from cursor to each bubble's BASE center — stable reference,
    // prevents feedback loop from shifted positions feeding back into scale calc
    const baseCx = dockCx - halfW + i * (size + gap) + size / 2;
    const dist = Math.abs(mouseX - baseCx);
    const t  = Math.max(0, 1 - dist / radius);
    const s  = 1 + (MAG_MAX - 1) * Math.pow(t, 1.5);
    const vs = size * s;

    bd.el.style.width        = `${vs}px`;
    bd.el.style.height       = `${vs}px`;
    bd.el.style.marginBottom = `${bd.baseMarginBottom}px`;
    bd.el.style.fontSize     = `${Math.round(vs * 0.33)}px`;
  });
}

function onDockLeave() {
  dockData.forEach(bd => {
    bd.el.classList.add('dock-resetting');
    bd.el.style.width        = `${bd.baseSize}px`;
    bd.el.style.height       = `${bd.baseSize}px`;
    bd.el.style.marginBottom = `${bd.baseMarginBottom}px`;
    bd.el.style.fontSize     = `${Math.round(bd.baseSize * 0.33)}px`;
  });
}

// ── Video visibility (pause when scrolled off-screen) ─────
const videoObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    const v = entry.target;
    if (entry.isIntersecting) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  });
}, { threshold: 0.15 });

function observeVideos(container) {
  container.querySelectorAll('video.gallery-video').forEach(v => videoObserver.observe(v));
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

    valid.forEach((p, i) => {
      const section = renderSection(p, i);
      main.appendChild(section);
      observeVideos(section);
    });
    buildDock(valid);

  } catch {
    main.innerHTML = '<p class="empty-state">Projects coming soon — check back after our next build session!</p>';
  }
}

loadProjects();
