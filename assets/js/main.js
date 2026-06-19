const main = document.getElementById('projects-main');
const lightbox = document.getElementById('lightbox');
const lightboxClose = document.getElementById('lightbox-close');
const lbImg = document.getElementById('lb-img');
const lbPrev = document.getElementById('lb-prev');
const lbNext = document.getElementById('lb-next');

let lbImages = [];
let lbIndex = 0;

// ── Lightbox ──────────────────────────────────────────────
function openLightbox(images, index) {
  lbImages = images;
  lbIndex = index;
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

// ── Helpers ───────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-MY', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
}

// ── Render section ─────────────────────────────────────────
function renderSection(project) {
  const section = document.createElement('section');
  section.className = 'project-section';

  const images = project.images || [];
  const tags = (project.tags || []).map(t => `<span class="tag">${t}</span>`).join('');

  let galleryClass = 'project-gallery';
  if (images.length === 1) galleryClass += ' single';
  else if (images.length === 2) galleryClass += ' double';

  const galleryHTML = images.map((src, i) =>
    `<img class="gallery-img" src="${src}" alt="${project.title} — image ${i + 1}" loading="lazy">`
  ).join('');

  section.innerHTML = `
    <div class="project-inner">
      <div class="project-meta">
        <div class="project-date">${formatDate(project.date)}</div>
        <h2 class="project-title">${project.title}</h2>
        ${tags ? `<div class="project-tags">${tags}</div>` : ''}
        ${project.description ? `<p class="project-desc">${project.description}</p>` : ''}
      </div>
      ${images.length ? `<div class="${galleryClass}">${galleryHTML}</div>` : ''}
    </div>
  `;

  section.querySelectorAll('.gallery-img').forEach((img, i) => {
    img.addEventListener('click', () => openLightbox(images, i));
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

    valid.forEach(p => main.appendChild(renderSection(p)));

  } catch {
    main.innerHTML = '<p class="empty-state">Projects coming soon — check back after our next build session!</p>';
  }
}

loadProjects();
