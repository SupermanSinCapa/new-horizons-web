// Genera el sitio estático en dist/ a partir de src/site.js y src/content/{es,en}.js.
// Uso: `node build.js` (o `npm run build`). Sin dependencias externas.
const fs = require('fs');
const path = require('path');

const site = require('./src/site');
const LANGS = { es: require('./src/content/es'), en: require('./src/content/en') };
const SRC = path.join(__dirname, 'src');
const OUT = process.env.OUT_DIR ? path.resolve(process.env.OUT_DIR) : path.join(__dirname, 'dist');
const VERSION = Date.now().toString(36);
// Para publicar dentro de una subcarpeta (p. ej. GitHub Pages): BASE_PATH=new-horizons-web
// (sin barra inicial: la terminal de Git en Windows convierte "/algo" en una ruta de disco).
const BASE = process.env.BASE_PATH ? `/${process.env.BASE_PATH.replace(/^\/+|\/+$/g, '')}` : '';
// Versión de prueba: pide a los buscadores que no la indexen.
const PREVIEW = process.env.PREVIEW === '1';

// IDs de las secciones del inicio, por idioma (se usan en los enlaces del menú).
const IDS = {
  es: { coverages: 'coberturas', why: 'por-que', steps: 'como-funciona', about: 'quienes-somos', reviews: 'resenas', instagram: 'instagram', carriers: 'aseguradoras', contact: 'contacto' },
  en: { coverages: 'coverage', why: 'why-us', steps: 'how-it-works', about: 'about-us', reviews: 'reviews', instagram: 'instagram', carriers: 'carriers', contact: 'contact' },
};

const google = {
  reviews: `https://search.google.com/local/reviews?placeid=${site.placeId}`,
  write: `https://search.google.com/local/writereview?placeid=${site.placeId}`,
  directions: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(site.mapQuery)}&destination_place_id=${site.placeId}`,
  embed: (lang) => `https://maps.google.com/maps?q=${encodeURIComponent(site.mapQuery)}&hl=${lang}&z=16&output=embed`,
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pad = (n) => String(n).padStart(2, '0');
const wa = (text) => `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`;
const ext = 'target="_blank" rel="noopener"';

// Fotos de Unsplash servidas desde su CDN en varios tamaños.
const photo = (id, w) => `https://images.unsplash.com/${id}?w=${w}&q=70&auto=format&fit=crop`;
function img(id, { sizes = '100vw', widths = [640, 1024, 1600, 2200], alt = '', cls = '', eager = false } = {}) {
  const srcset = widths.map((w) => `${photo(id, w)} ${w}w`).join(', ');
  return `<img${cls ? ` class="${cls}"` : ''} src="${esc(photo(id, widths[1]))}" srcset="${esc(srcset)}" sizes="${sizes}" alt="${esc(alt)}"${eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async">`;
}

// Evita que "SR-22" / "FR-44" se partan al final de una línea.
const nobr = (s) => s.replace(/\b(SR|FR)-(\d+)/g, '<span class="nowrap">$1-$2</span>');

// Resalta con degradado la parte indicada del título (p. ej. "nuestra prioridad.").
const highlight = (title, part) => (part && title.includes(part) ? title.replace(part, `<span class="text-gradient">${part}</span>`) : title);

const svg = (body, { fill = false } = {}) =>
  `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" ${fill ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"'}>${body}</svg>`;

const icon = {
  arrow: svg('<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>'),
  external: svg('<path d="M7 17 17 7"/><path d="M8 7h9v9"/>'),
  phone: svg('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>'),
  chat: svg('<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z"/><path d="M8 12h.01M12 12h.01M16 12h.01"/>'),
  close: svg('<path d="M18 6 6 18M6 6l12 12"/>'),
  instagram: svg('<rect x="2.5" y="2.5" width="19" height="19" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>'),
  facebook: svg('<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>'),
  calendar: svg('<rect x="3" y="4.5" width="18" height="17" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>'),
  pin: svg('<path d="M20 10c0 5-5.5 10.2-7.4 11.8a1 1 0 0 1-1.2 0C9.5 20.2 4 15 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>'),
  car: svg('<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>'),
  van: svg('<path d="M3 6h11a2 2 0 0 1 2 2v9H3z"/><path d="M16 9h3l3 4v4h-6"/><circle cx="7" cy="17.5" r="2"/><circle cx="18" cy="17.5" r="2"/>'),
  truck: svg('<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.6a1 1 0 0 0-.2-.6l-3.5-4.4a1 1 0 0 0-.8-.4H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>'),
  home: svg('<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .7-1.5l7-6a2 2 0 0 1 2.6 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
  shield: svg('<path d="M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z"/>'),
  shieldCheck: svg('<path d="M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>'),
  alert: svg('<path d="m21.7 18-8-14a2 2 0 0 0-3.5 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3"/><path d="M12 9v4M12 17h.01"/>'),
  gem: svg('<path d="M6 3h12l4 6-10 13L2 9z"/><path d="M11 3 8 9l4 13 4-13-3-6M2 9h20"/>'),
  sailboat: svg('<path d="M22 18H2a4 4 0 0 0 4 4h12a4 4 0 0 0 4-4z"/><path d="M21 14 10 2 3 14z"/><path d="M10 2v16"/>'),
  users: svg('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>'),
  building: svg('<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2M10 6h4M10 10h4M10 14h4M10 18h4"/>'),
  hardhat: svg('<path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"/><path d="M14 6a6 6 0 0 1 6 6v3M4 15v-3a6 6 0 0 1 6-6"/><rect x="2" y="15" width="20" height="4" rx="1"/>'),
  fileCheck: svg('<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m9 15 2 2 4-4"/>'),
  umbrella: svg('<path d="M22 12a10 10 0 0 0-20 0z"/><path d="M12 12v8a2 2 0 0 0 4 0M12 2v1"/>'),
  wrench: svg('<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>'),
  package: svg('<path d="M11 21.7a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7z"/><path d="M12 22V12M3.3 7l8.7 5 8.7-5M7.5 4.3l9 5.1"/>'),
  warehouse: svg('<path d="M22 8.4V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.4a2 2 0 0 1 1.3-1.9l8-3.2a2 2 0 0 1 1.4 0l8 3.2A2 2 0 0 1 22 8.4z"/><path d="M6 18h12M6 14h12"/><rect x="6" y="10" width="12" height="12"/>'),
  waves: svg('<path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>'),
  key: svg('<path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4M21 2l-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/>'),
  caravan: svg('<rect x="2" y="9" width="4" height="4"/><rect x="10" y="9" width="4" height="10"/><path d="M18 19V9a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v8a2 2 0 0 0 2 2h2M10 19h12v-2"/><circle cx="8" cy="19" r="2"/>'),
  badge: svg('<path d="M3.9 8.6a4 4 0 0 1 4.7-4.8 4 4 0 0 1 6.8 0 4 4 0 0 1 4.8 4.8 4 4 0 0 1 0 6.7 4 4 0 0 1-4.8 4.8 4 4 0 0 1-6.7 0 4 4 0 0 1-4.8-4.8 4 4 0 0 1 0-6.7z"/><path d="m9 12 2 2 4-4"/>'),
  languages: svg('<path d="m5 8 6 6M4 14l6-6 2-3M2 5h12M7 2h1M22 22l-5-10-5 10M14 18h6"/>'),
  play: svg('<path d="M7 4.5v15l12-7.5z"/>', { fill: true }),
  google: '<svg class="icon icon-google" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z"/><path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8z"/><path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.8 3.6-4.9 6.7-4.9z"/></svg>',
  whatsapp: svg('<path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.59-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.08-.13-.27-.2-.57-.35m-5.42 7.4h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88a9.82 9.82 0 0 1 6.99 2.9 9.82 9.82 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.88 9.88m8.41-18.3A11.81 11.81 0 0 0 12.05 0C5.5 0 .16 5.33.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.33 11.89-11.89a11.82 11.82 0 0 0-3.48-8.41"/>', { fill: true }),
};

// Ícono de cada cobertura según su nombre (en español o inglés). El orden importa.
const ICON_RULES = [
  [/alto riesgo|high-risk|high risk/i, 'alert'],
  [/clásic|classic/i, 'gem'],
  [/recreativ|recreational/i, 'sailboat'],
  [/mayores|senior/i, 'users'],
  [/exenci|exemption/i, 'fileCheck'],
  [/workers|compensaci/i, 'hardhat'],
  [/auto comercial|commercial auto/i, 'van'],
  [/paraguas|umbrella/i, 'umbrella'],
  [/primaria|primary/i, 'shield'],
  [/físicos|physical/i, 'wrench'],
  [/carga para|motor truck cargo/i, 'package'],
  [/sin carga|non-trucking|bobtail/i, 'truck'],
  [/transportistas|truckers/i, 'warehouse'],
  [/general liability|civil general/i, 'building'],
  [/inundaci|flood/i, 'waves'],
  [/alquiler|renters/i, 'key'],
  [/móviles|mobile/i, 'caravan'],
  [/propietarios|homeowners/i, 'home'],
  [/estándar|standard/i, 'badge'],
];
const iconFor = (text) => icon[(ICON_RULES.find(([re]) => re.test(text)) || [null, 'shieldCheck'])[1]];
const COVERAGE_ICONS = { auto: 'car', commercial: 'truck', property: 'home' };
const WHY_ICONS = ['shieldCheck', 'languages', 'car', 'pin'];

// ---------- Piezas compartidas ----------

const head = (n, label) =>
  `<p class="section-head reveal"><span class="section-num">${pad(n)}</span><span class="section-label">${label}</span></p>`;

const eyebrow = (text, cls = '') => `<p class="eyebrow${cls}"><span class="eyebrow-dot" aria-hidden="true"></span>${text}</p>`;

const ctaButtons = (c, waText) => `
      <a class="btn btn-solid" href="${wa(waText)}" ${ext}>${icon.whatsapp}<span>${c.ui.whatsapp}</span></a>
      <a class="btn btn-outline" href="tel:${site.phone.tel}">${icon.phone}<span>${c.ui.call} ${site.phone.display}</span></a>`;

const orbs = '<div class="hero-orbs" aria-hidden="true"><span></span><span></span><span></span></div>';

const statsList = (stats) => `<dl class="stats">
      ${stats.map(([v, k]) => `<div class="stat"><dt class="stat-label">${k}</dt><dd class="stat-value" data-count="${esc(v)}">${v}</dd></div>`).join('\n      ')}
    </dl>`;

function quickCard(c) {
  const q = c.ui.quick;
  return `<aside class="hero-card reveal">
      <p class="hero-card-title">${q.title}</p>
      <p class="hero-card-text">${q.text}</p>
      <div class="quick-grid">
        ${Object.entries(COVERAGE_ICONS).map(([k, ic]) => `<a class="quick" href="${wa(c[k].hero.wa)}" ${ext}>${icon[ic]}<span>${c.ui.nav[k]}</span></a>`).join('\n        ')}
      </div>
      <a class="hero-rating" href="${google.reviews}" ${ext}>${icon.google}<span class="hero-rating-score">${site.rating.value}</span><span class="stars" aria-hidden="true">★★★★★</span><span class="hero-rating-count">${c.home.reviews.count}</span></a>
    </aside>`;
}

const metaCard = (meta) => `<dl class="hero-card hero-meta reveal">
      ${meta.map(([k, v]) => `<div class="meta-item"><dt class="meta-label">${k}</dt><dd class="meta-value">${v}</dd></div>`).join('\n      ')}
    </dl>`;

function rotator(c) {
  const r = c.ui.rotator;
  return `<p class="hero-rotator reveal">${r.before ? `${r.before} ` : ''}<span class="rotator" data-words="${esc(JSON.stringify(r.words))}">${r.words[0]}</span> ${r.after}</p>`;
}

function hero(c, h, { waText, lines, photoId, isHome }) {
  const lineLinks = (lines || [])
    .map(([label, href]) => `<a href="${href}">${label}</a>`)
    .join('<span class="sep" aria-hidden="true">/</span>');
  return `
<section class="hero${isHome ? ' hero--home' : ' hero--page'}" aria-labelledby="hero-title">
  <div class="hero-media" aria-hidden="true">${img(photoId, { eager: true })}</div>
  ${orbs}
  <div class="container hero-grid">
    <div class="hero-content">
      ${eyebrow(h.label, ' reveal')}
      <h1 class="hero-title reveal" id="hero-title">${highlight(h.title, h.highlight)}</h1>
      ${isHome ? rotator(c) : ''}
      ${lineLinks ? `<p class="hero-lines reveal">${lineLinks}</p>` : ''}
      <p class="hero-sub reveal">${h.sub}</p>
      <div class="hero-cta reveal">${ctaButtons(c, waText)}
      </div>
    </div>
    ${isHome ? quickCard(c) : metaCard(h.meta)}
  </div>
</section>`;
}

// Tarjetas de coberturas con ícono (páginas de servicios).
const list = (items) => `
    <ul class="card-grid">
      ${items.map((it, i) => `<li class="card spotlight reveal">
        <div class="card-top"><span class="icon-bubble">${iconFor(`${it.title} ${it.tag}`)}</span><span class="card-num">${pad(i + 1)}</span></div>
        <h3 class="card-title">${it.title}</h3>
        <p class="card-tag">${it.tag}</p>
        <p class="card-text">${it.text}</p>
      </li>`).join('\n      ')}
    </ul>`;

function photoBand({ id, photoId, label, heading, text, buttons }) {
  return `
<section class="band band--photo"${id ? ` id="${id}"` : ''}>
  <div class="band-media" aria-hidden="true">${img(photoId, { sizes: '100vw', widths: [800, 1400, 2000] })}</div>
  <div class="container band-inner">
    <div>
      ${eyebrow(label, ' reveal')}
      <h2 class="band-heading reveal">${nobr(heading)}</h2>
    </div>
    <div class="band-body reveal">
      <p>${text}</p>
      <div class="btn-row">${buttons}</div>
    </div>
  </div>
</section>`;
}

function ctaBand(c, waText) {
  const b = c.ui.ctaBand;
  return `
<section class="cta-band">
  ${orbs}
  <div class="container">
    ${eyebrow(b.label, ' reveal')}
    <h2 class="cta-heading reveal">${b.heading}</h2>
    <p class="cta-text reveal">${b.text}</p>
    <div class="cta-actions reveal">${ctaButtons(c, waText)}
    </div>
  </div>
</section>`;
}

// Fotos del equipo: si el archivo existe en assets/img/team se usa; si no, un espacio con iniciales.
const TEAM_DIR = path.join(SRC, 'assets/img/team');
const hasPhoto = (file) => Boolean(file) && fs.existsSync(path.join(TEAM_DIR, file));
const initials = (name) => name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('');

function portrait(c, name, file, cls) {
  if (hasPhoto(file)) return `<img class="${cls}" src="/assets/img/team/${file}" alt="${esc(name)}" loading="lazy" decoding="async">`;
  return `<div class="${cls} photo-placeholder" role="img" aria-label="${esc(name)}">
          <span class="ph-initials">${initials(name)}</span><span class="ph-note">${c.ui.photoSoon}</span>
        </div>`;
}

function groupPhoto(c, caption) {
  const inner = hasPhoto(site.groupPhoto)
    ? `<img src="/assets/img/team/${site.groupPhoto}" alt="${esc(caption)}" loading="lazy" decoding="async">`
    : `<div class="photo-placeholder" role="img" aria-label="${esc(caption)}"><span class="ph-initials">NH</span><span class="ph-note">${c.ui.photoSoon}</span></div>`;
  return `<figure class="group-photo reveal">${inner}<figcaption>${caption}</figcaption></figure>`;
}

function header(c, key) {
  const other = c.lang === 'es' ? LANGS.en : LANGS.es;
  const ids = IDS[c.lang];
  const r = c.routes;
  const link = (href, label, k) => `<li><a class="nav-link" href="${href}"${k === key ? ' aria-current="page"' : ''}>${label}</a></li>`;
  return `
<a class="skip-link" href="#main">${c.ui.skip}</a>
<header class="nav" id="nav">
  <div class="nav-inner">
    <a class="nav-logo" href="${r.home}" aria-label="New Horizons Insurance — ${c.ui.home}">
      <img src="/assets/img/logo-symbol-light.svg" alt="" width="44" height="29">
      <span class="nav-logo-text" aria-hidden="true"><span class="nav-logo-name">New Horizons</span><span class="nav-logo-sub">Insurance Inc.</span></span>
    </a>
    <nav class="nav-menu" id="nav-menu" aria-label="${c.ui.navLabel}">
      <ul>
        ${link(r.auto, c.ui.nav.auto, 'auto')}
        ${link(r.commercial, c.ui.nav.commercial, 'commercial')}
        ${link(r.property, c.ui.nav.property, 'property')}
        ${link(r.about, c.ui.nav.about, 'about')}
        ${link(`${r.home}#${ids.reviews}`, c.ui.nav.reviews)}
        ${link(`${r.home}#${ids.contact}`, c.ui.nav.contact)}
      </ul>
      <div class="nav-menu-extra">
        <a class="btn btn-solid" href="${wa(c.ui.waDefault)}" ${ext}>${icon.whatsapp}<span>${c.ui.whatsapp}</span></a>
        <a class="btn btn-outline" href="tel:${site.phone.tel}">${icon.phone}<span>${c.ui.call} ${site.phone.display}</span></a>
      </div>
    </nav>
    <div class="nav-actions">
      <a class="nav-lang" href="${other.routes[key] || other.routes.home}" hreflang="${other.lang}" lang="${other.lang}" aria-label="${c.ui.switchLabel}">${c.ui.switchShort}</a>
      <a class="btn btn-solid btn-sm nav-cta" href="${wa(c.ui.waDefault)}" ${ext}>${icon.whatsapp}<span>${c.ui.whatsappShort}</span></a>
      <button class="nav-toggle" type="button" aria-controls="nav-menu" aria-expanded="false" aria-label="${c.ui.menuOpen}" data-open="${c.ui.menuOpen}" data-close="${c.ui.menuClose}"><span></span><span></span><span></span></button>
    </div>
  </div>
</header>`;
}

function footer(c, key) {
  const other = c.lang === 'es' ? LANGS.en : LANGS.es;
  const f = c.ui.footer;
  const a = site.address;
  return `
<footer class="footer">
  <div class="container">
    <div class="footer-top">
      <div class="footer-brand">
        <img src="/assets/img/logo-full-light.svg" alt="New Horizons Insurance Inc." width="190" height="109" loading="lazy">
        <p>${f.tagline}</p>
      </div>
      <nav class="footer-col" aria-label="${f.coverages}">
        <p class="footer-label">${f.coverages}</p>
        <ul>
          <li><a href="${c.routes.auto}">${c.home.coverages.items.auto.title}</a></li>
          <li><a href="${c.routes.commercial}">${c.home.coverages.items.commercial.title}</a></li>
          <li><a href="${c.routes.property}">${c.home.coverages.items.property.title}</a></li>
          <li><a href="${c.routes.about}">${c.ui.nav.about}</a></li>
        </ul>
      </nav>
      <div class="footer-col">
        <p class="footer-label">${f.contact}</p>
        <ul>
          <li><a href="${site.maps}" ${ext}>${a.street}<br>${a.city}, ${a.region} ${a.zip}</a></li>
          <li><a href="tel:${site.phone.tel}">${site.phone.display}</a></li>
          <li><a href="mailto:${site.email}">${site.email}</a></li>
          ${c.ui.hours.map(([d, h]) => `<li>${d}: ${h}</li>`).join('\n          ')}
          <li><a href="${site.calendly}" ${ext}>${c.ui.booking}</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <p class="footer-label">${f.follow}</p>
        <ul>
          <li><a class="footer-social" href="${site.social.instagram}" ${ext}>${icon.instagram}<span>Instagram</span></a></li>
          <li><a class="footer-social" href="${site.social.facebook}" ${ext}>${icon.facebook}<span>Facebook</span></a></li>
        </ul>
      </div>
    </div>
    <p class="footer-legal">${f.legal}</p>
    <div class="footer-bottom">
      <span>© <span data-year>${new Date().getFullYear()}</span> ${site.name} ${f.rights}</span>
      <a href="${other.routes[key] || other.routes.home}" hreflang="${other.lang}" lang="${other.lang}">${c.ui.switchTo}</a>
    </div>
  </div>
</footer>`;
}

function assistant(c) {
  const a = c.assistant;
  return `
<div class="assistant" data-assistant data-src="/assets/data/faq-${c.lang}.json?v=${VERSION}">
  <button class="assistant-fab" type="button" aria-expanded="false" aria-controls="assistant-panel">${icon.chat}<span>${a.open}</span></button>
  <section class="assistant-panel" id="assistant-panel" role="dialog" aria-labelledby="assistant-title" hidden>
    <header class="assistant-head">
      <img src="/assets/img/logo-symbol-light.svg" alt="" width="42" height="28">
      <div>
        <p class="assistant-title" id="assistant-title">${a.title}</p>
        <p class="assistant-sub"><span class="assistant-dot" aria-hidden="true"></span>${a.subtitle}</p>
      </div>
      <button class="assistant-close" type="button" aria-label="${a.close}">${icon.close}</button>
    </header>
    <div class="assistant-log" role="log" aria-live="polite"></div>
    <form class="assistant-form" autocomplete="off">
      <label class="sr-only" for="assistant-input">${a.inputLabel}</label>
      <input id="assistant-input" name="q" type="text" placeholder="${a.placeholder}" maxlength="200" enterkeyhint="send">
      <button type="submit" aria-label="${a.send}">${icon.arrow}</button>
    </form>
    <div class="assistant-foot">
      <a href="${wa(c.ui.waDefault)}" ${ext}>${icon.whatsapp}<span>WhatsApp</span></a>
      <a href="tel:${site.phone.tel}">${icon.phone}<span>${site.phone.display}</span></a>
    </div>
    <p class="assistant-disclaimer">${a.disclaimer}</p>
  </section>
</div>`;
}

function jsonLd(c) {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'InsuranceAgency',
    name: site.name,
    url: site.url + c.routes.home,
    logo: `${site.url}/assets/img/og-logo.png`,
    image: `${site.url}/assets/img/og-logo.png`,
    telephone: site.phone.tel,
    email: site.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: site.address.street,
      addressLocality: site.address.city,
      addressRegion: site.address.region,
      postalCode: site.address.zip,
      addressCountry: site.address.country,
    },
    openingHoursSpecification: site.hours.map((h) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: h.days, opens: h.opens, closes: h.closes })),
    areaServed: { '@type': 'City', name: 'Tampa' },
    knowsLanguage: ['es', 'en'],
    sameAs: [site.social.instagram, site.social.facebook],
  };
  return `<script type="application/ld+json">${JSON.stringify(ld)}</script>`;
}

const FONTS = 'https://fonts.googleapis.com/css2?family=Antic+Didone&family=Noto+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300&family=Space+Grotesk:wght@500;600;700&display=swap';

function layout(c, key, body) {
  const page = c[key];
  const url = site.url + c.routes[key];
  const alt = (lang) => site.url + LANGS[lang].routes[key];
  return `<!doctype html>
<html lang="${c.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(page.meta.title)}</title>
<meta name="description" content="${esc(page.meta.description)}">
${PREVIEW ? '<meta name="robots" content="noindex">\n' : ''}<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="es" href="${alt('es')}">
<link rel="alternate" hreflang="en" href="${alt('en')}">
<link rel="alternate" hreflang="x-default" href="${alt('es')}">
<meta name="theme-color" content="#05070D">
<meta property="og:type" content="website">
<meta property="og:site_name" content="New Horizons Insurance">
<meta property="og:title" content="${esc(page.meta.title)}">
<meta property="og:description" content="${esc(page.meta.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${site.url}/assets/img/og-logo.png">
<meta property="og:locale" content="${c.ogLocale}">
<meta name="twitter:card" content="summary">
<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preconnect" href="https://images.unsplash.com">
<link rel="stylesheet" href="${FONTS}">
<link rel="stylesheet" href="/assets/css/styles.css?v=${VERSION}">
<script>document.documentElement.classList.add('js')</script>
${jsonLd(c)}
</head>
<body data-page="${key}">
${header(c, key)}
<main id="main">
${body}
</main>
${footer(c, key)}
${assistant(c)}
<script src="/assets/js/main.js?v=${VERSION}" defer></script>
<script src="/assets/js/assistant.js?v=${VERSION}" defer></script>
</body>
</html>
`;
}

// ---------- Páginas ----------

function homePage(c) {
  const h = c.home;
  const ids = IDS[c.lang];
  const r = c.routes;
  const ig = site.instagram;

  const stats = `
<section class="stats-strip" aria-label="${esc(c.about.intro.label)}">
  <div class="container">
    ${statsList(c.about.intro.stats)}
  </div>
</section>`;

  const coverages = `
<section class="section" id="${ids.coverages}">
  <div class="container">
    ${head(1, h.coverages.label)}
    <h2 class="section-heading reveal">${h.coverages.heading}</h2>
    <div class="cov-grid">
      ${Object.entries(COVERAGE_ICONS).map(([k, ic]) => {
        const it = h.coverages.items[k];
        return `<a class="cov-card spotlight reveal" href="${r[k]}">
        <div class="cov-media">${img(site.photos[k].card, { sizes: '(max-width: 900px) 100vw, 33vw', widths: [480, 800, 1200] })}</div>
        <div class="cov-body">
          <div class="cov-top"><span class="icon-bubble">${icon[ic]}</span><span class="cov-kicker">${it.kicker}</span></div>
          <h3 class="cov-title">${it.title}</h3>
          <p class="cov-text">${it.text}</p>
          <ul class="cov-points">${it.points.map((p) => `<li>${p}</li>`).join('')}</ul>
          <span class="cov-link">${c.ui.seeCoverages} ${icon.arrow}</span>
        </div>
      </a>`;
      }).join('\n      ')}
    </div>
  </div>
</section>`;

  const why = `
<section class="section section--glow" id="${ids.why}">
  <div class="container">
    ${head(2, h.why.label)}
    <h2 class="sr-only">${h.why.label}</h2>
    <div class="bento">
      <div class="bento-stat reveal">
        <p class="big-number" data-count="${esc(h.why.big)}">${h.why.big}</p>
        <p class="big-text">${h.why.bigText}</p>
        <figure class="quote">
          <blockquote>“${h.why.quote.text}”</blockquote>
          <figcaption>${h.why.quote.by} — ${h.why.quote.role}</figcaption>
        </figure>
      </div>
      ${h.why.items.map((it, i) => `<article class="bento-card spotlight reveal">
        <span class="icon-bubble">${icon[WHY_ICONS[i]]}</span>
        <h3 class="bento-title">${it.title}</h3>
        <p class="bento-tag">${it.tag}</p>
        <p class="bento-text">${it.text}</p>
      </article>`).join('\n      ')}
    </div>
  </div>
</section>`;

  const sr22 = photoBand({
    photoId: site.photos.sr22,
    label: h.sr22.label,
    heading: h.sr22.heading,
    text: h.sr22.text,
    buttons: `<a class="btn btn-solid" href="${wa(h.sr22.wa)}" ${ext}>${icon.whatsapp}<span>${c.ui.whatsapp}</span></a>
        <a class="btn btn-outline" href="${r.auto}#${c.auto.sr22.id}">${h.sr22.more} ${icon.arrow}</a>`,
  });

  const steps = `
<section class="section" id="${ids.steps}">
  <div class="container">
    ${head(3, h.steps.label)}
    <h2 class="sr-only">${h.steps.label}</h2>
    <ol class="steps">
      ${h.steps.items.map((s, i) => `<li class="step spotlight reveal"><span class="step-num">${pad(i + 1)}</span><p class="step-title">${s.title}</p><p class="step-text">${s.text}</p></li>`).join('\n      ')}
    </ol>
  </div>
</section>`;

  const about = `
<section class="section section--glow" id="${ids.about}">
  <div class="container">
    ${head(4, h.about.label)}
    <div class="about-teaser">
      ${groupPhoto(c, c.about.team.groupCaption)}
      <div class="about-teaser-body reveal">
        <h2 class="feature-heading">${h.about.heading}</h2>
        <p>${h.about.text}</p>
        <a class="btn btn-outline" href="${r.about}">${h.about.cta} ${icon.arrow}</a>
      </div>
    </div>
  </div>
</section>`;

  const reviews = `
<section class="section" id="${ids.reviews}">
  <div class="container">
    ${head(5, h.reviews.label)}
    <div class="split split--reviews">
      <div class="split-aside rating-card reveal">
        <p class="rating-source">${icon.google}<span>Google</span></p>
        <p class="big-number" data-count="${site.rating.value}">${site.rating.value}</p>
        <p class="stars" role="img" aria-label="${site.rating.value} / 5">★★★★★</p>
        <p class="rating-count">${h.reviews.count}</p>
        <div class="rating-links">
          <a class="btn btn-solid" href="${google.write}" ${ext}>${h.reviews.write}</a>
          <a class="link-arrow" href="${google.reviews}" ${ext}>${h.reviews.link} ${icon.external}</a>
        </div>
      </div>
      <div>
        <h2 class="section-heading reveal">${h.reviews.heading}</h2>
        ${h.reviews.note ? `<p class="review-note reveal">${h.reviews.note}</p>` : ''}
        <ul class="review-grid">
          ${h.reviews.items.map((rv) => `<li class="review-card spotlight reveal">
            <div class="review-top"><span class="stars" role="img" aria-label="5 / 5">★★★★★</span>${icon.google}</div>
            <blockquote><p>${rv.text}</p></blockquote>
            <p class="review-author"><span class="avatar" aria-hidden="true">${initials(rv.by)}</span><span><span class="review-by">${rv.by}</span><span class="review-source">${h.reviews.source}</span></span></p>
          </li>`).join('\n          ')}
        </ul>
      </div>
    </div>
  </div>
</section>`;

  // Sin feed propio se muestra el perfil oficial de Instagram (últimos posts, se actualiza solo).
  const feed = ig.feedUrl
    ? `<div class="ig-grid" data-ig-feed="${esc(ig.feedUrl)}" data-ig-types="${esc(JSON.stringify(h.instagram.types))}"></div>`
    : `<div class="ig-embed"><iframe src="https://www.instagram.com/${ig.handle}/embed/" title="${esc(h.instagram.frameTitle)}" loading="lazy" scrolling="no"></iframe></div>`;
  const instagram = `
<section class="section section--glow" id="${ids.instagram}">
  <div class="container">
    ${head(6, h.instagram.label)}
    <div class="ig-layout">
      <div class="ig-intro reveal">
        <h2 class="feature-heading">${h.instagram.heading}</h2>
        <p>${h.instagram.text}</p>
        <a class="btn btn-solid" href="${ig.url}" ${ext}>${icon.instagram}<span>${h.instagram.follow}</span></a>
        <p class="ig-handle">@${ig.handle}</p>
      </div>
      <div class="reveal">${feed}</div>
    </div>
  </div>
</section>`;

  // Aseguradoras en dos filas que se desplazan en sentidos opuestos (cada lista va
  // duplicada para que el movimiento sea continuo; la copia se oculta a lectores de pantalla).
  const half = Math.ceil(site.carriers.length / 2);
  // Sin loading="lazy": el navegador no detecta los logos que entran deslizándose y quedaban vacíos.
  const logo = (ca) => `<li class="logo-item" title="${esc(ca.name)}"><img src="/assets/img/carriers/${ca.logo}" alt="${esc(ca.name)}" decoding="async"${ca.zoom ? ` style="--zoom:${ca.zoom}"` : ''}></li>`;
  const carriers = `
<section class="section section--compact" id="${ids.carriers}">
  <div class="container">
    ${head(7, h.carriers.label)}
    <h2 class="section-heading reveal">${h.carriers.heading}</h2>
  </div>
  <div class="marquee reveal">
    ${[site.carriers.slice(0, half), site.carriers.slice(half)].map((row, i) => `<div class="marquee-row${i ? ' marquee-row--reverse' : ''}">
      <ul class="marquee-track">${row.map(logo).join('')}</ul>
      <ul class="marquee-track" aria-hidden="true">${row.map(logo).join('')}</ul>
    </div>`).join('\n    ')}
  </div>
</section>`;

  const contact = contactSection(c, 8, ids.contact);

  return hero(c, h.hero, { waText: c.ui.waDefault, photoId: site.photos.hero, isHome: true })
    + stats + coverages + why + sr22 + steps + about + reviews + instagram + carriers + contact;
}

// Contacto: formulario que arma un mensaje de WhatsApp + mapa + datos de la oficina.
function contactSection(c, n, id) {
  const f = c.ui.form;
  const a = site.address;
  const msg = esc(JSON.stringify(f.msg));
  return `
<section class="section contact-section" id="${id}">
  <div class="container">
    ${head(n, c.home.contact.label)}
    <h2 class="section-heading reveal">${c.home.contact.heading}</h2>
    <div class="contact-layout">
      <form class="contact-form reveal" data-wa-form data-wa="${site.whatsapp}" data-msg="${msg}" novalidate>
        ${eyebrow(f.label)}
        <h3 class="form-heading">${f.heading}</h3>
        <div class="field">
          <label for="cf-name">${f.name}</label>
          <input id="cf-name" name="name" type="text" autocomplete="name" required>
        </div>
        <div class="field-row">
          <div class="field">
            <label for="cf-phone">${f.phone}</label>
            <input id="cf-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" required>
          </div>
          <div class="field">
            <label for="cf-email">${f.email}</label>
            <input id="cf-email" name="email" type="email" autocomplete="email">
          </div>
        </div>
        <div class="field">
          <label for="cf-type">${f.type}</label>
          <select id="cf-type" name="type">${f.typeOptions.map((o) => `<option>${o}</option>`).join('')}</select>
        </div>
        <fieldset class="field">
          <legend>${f.pref}</legend>
          <div class="choice-row">
            ${f.prefOptions.map((o, i) => `<label class="choice"><input type="radio" name="pref" value="${esc(o)}"${i === 0 ? ' checked' : ''}><span>${o}</span></label>`).join('\n            ')}
          </div>
        </fieldset>
        <div class="field">
          <label for="cf-message">${f.message}</label>
          <textarea id="cf-message" name="message" rows="4" placeholder="${esc(f.messagePlaceholder)}"></textarea>
        </div>
        <p class="form-error" role="alert" hidden>${f.required}</p>
        <button class="btn btn-solid" type="submit">${icon.whatsapp}<span>${f.submit}</span></button>
        <p class="form-note">${f.note}</p>
      </form>
      <div class="contact-side reveal">
        <div class="map">
          <iframe src="${google.embed(c.lang)}" title="${esc(c.ui.mapTitle)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>
          <svg class="map-pin" viewBox="0 0 34 44" aria-hidden="true" focusable="false"><path d="M17 1C8.2 1 1 8 1 16.8 1 28.5 17 43 17 43s16-14.5 16-26.2C33 8 25.8 1 17 1z" fill="#D4AE68" stroke="#05070D" stroke-width="1.5"/><circle cx="17" cy="16.5" r="6" fill="#05070D"/></svg>
        </div>
        <dl class="contact-list">
          <div class="contact-item">
            <dt>${c.ui.labels.office}</dt>
            <dd>${a.street}<br>${a.city}, ${a.region} ${a.zip}
              <span class="contact-links"><a class="link-arrow" href="${google.directions}" ${ext}>${icon.pin} ${c.ui.directions}</a></span></dd>
          </div>
          <div class="contact-item">
            <dt>${c.ui.labels.phone}</dt>
            <dd><a href="tel:${site.phone.tel}">${site.phone.display}</a><a class="contact-sub" href="mailto:${site.email}">${site.email}</a>
              <span class="contact-links"><a class="link-arrow" href="${wa(c.ui.waDefault)}" ${ext}>${icon.whatsapp} WhatsApp</a><a class="link-arrow" href="${site.calendly}" ${ext}>${icon.calendar} ${c.ui.booking}</a></span></dd>
          </div>
          <div class="contact-item">
            <dt>${c.ui.labels.hours}</dt>
            <dd>${c.ui.hours.map(([d, hrs]) => `<span class="hours-row"><span>${d}</span><span>${hrs}</span></span>`).join('')}</dd>
          </div>
        </dl>
      </div>
    </div>
  </div>
</section>`;
}

function autoPage(c) {
  const p = c.auto;
  const tiers = `
<section class="section" id="${p.tiers.id}">
  <div class="container">
    ${head(1, p.tiers.label)}
    <h2 class="section-heading reveal">${p.tiers.heading}</h2>
    <div class="tiers">
      ${p.tiers.items.map((t, i) => {
        const featured = i === p.tiers.items.length - 1;
        return `<article class="tier spotlight${featured ? ' tier--featured' : ''} reveal">
        <p class="tier-top"><span class="section-num">${pad(i + 1)}</span><span class="tier-tag">${t.tag}</span></p>
        ${featured ? `<span class="tier-badge">${c.ui.recommended}</span>` : ''}
        <h3 class="tier-name">${t.name}</h3>
        <dl>
          <dt>${p.tiers.includes}</dt><dd>${t.includes}</dd>
          <dt>${p.tiers.for}</dt><dd>${t.for}</dd>
        </dl>
      </article>`;
      }).join('\n      ')}
    </div>
  </div>
</section>`;

  const glossary = `
<section class="section section--glow" id="${p.glossary.id}">
  <div class="container">
    ${head(2, p.glossary.label)}
    <h2 class="section-heading reveal">${p.glossary.heading}</h2>
    <dl class="glossary">
      ${p.glossary.items.map((g) => `<div class="gloss-row spotlight reveal"><dt><span class="gloss-term">${g.term}</span><span class="gloss-name">${g.name}</span></dt><dd>${g.text}</dd></div>`).join('\n      ')}
    </dl>
    <p class="note reveal"><span>${p.glossary.noteLabel}</span>${p.glossary.note}</p>
  </div>
</section>`;

  const nonOwner = `
<section class="section" id="${p.nonOwner.id}">
  <div class="container">
    ${head(3, p.nonOwner.label)}
    <div class="feature feature--media">
      <div class="feature-body reveal">
        <h2 class="feature-heading">${p.nonOwner.heading}</h2>
        <p>${p.nonOwner.text}</p>
        <a class="btn btn-solid" href="${wa(p.nonOwner.wa)}" ${ext}>${icon.whatsapp}<span>${p.nonOwner.cta}</span></a>
      </div>
      <div class="feature-photo reveal">${img(site.photos.auto.card, { sizes: '(max-width: 1100px) 100vw, 50vw', widths: [640, 1000, 1400] })}</div>
    </div>
  </div>
</section>`;

  const profiles = `
<section class="section section--glow" id="${p.profiles.id}">
  <div class="container">
    ${head(4, p.profiles.label)}
    <h2 class="section-heading reveal">${p.profiles.heading}</h2>
    ${list(p.profiles.items)}
  </div>
</section>`;

  const s = p.sr22;
  const sr22 = `
<section class="section" id="${s.id}">
  <div class="container">
    ${head(5, s.label)}
    <div class="feature">
      <h2 class="feature-heading reveal">${s.heading}</h2>
      <div class="feature-body reveal"><p>${s.text}</p></div>
    </div>
    <div class="table-wrap reveal">
      <table class="compare">
        <thead><tr><td></td><th scope="col">SR-22</th><th scope="col">FR-44</th></tr></thead>
        <tbody>
          ${s.rows.map(([k, a, b]) => `<tr><th scope="row">${k}</th><td>${a}</td><td>${b}</td></tr>`).join('\n          ')}
        </tbody>
      </table>
    </div>
    <div class="group-cta reveal">
      <a class="btn btn-solid" href="${wa(s.wa)}" ${ext}>${icon.whatsapp}<span>${s.cta}</span></a>
      <a class="btn btn-outline" href="tel:${site.phone.tel}">${icon.phone}<span>${c.ui.call} ${site.phone.display}</span></a>
    </div>
  </div>
</section>`;

  return hero(c, p.hero, { waText: p.hero.wa, lines: p.hero.lines, photoId: site.photos.auto.hero })
    + tiers + glossary + nonOwner + profiles + sr22 + ctaBand(c, p.hero.wa);
}

function groupsPage(c, key) {
  const p = c[key];
  let n = 0;
  const groups = p.groups.map((g, i) => `
<section class="section${i % 2 ? ' section--glow' : ''}" id="${g.id}">
  <div class="container">
    ${head(++n, g.label)}
    <h2 class="section-heading reveal">${g.heading}</h2>
    ${list(g.items)}
    <div class="group-cta reveal">
      <a class="btn btn-solid" href="${wa(g.wa)}" ${ext}>${icon.whatsapp}<span>${c.ui.whatsapp}</span></a>
    </div>
  </div>
</section>`).join('');

  const hu = p.hurricane;
  const hurricane = hu ? photoBand({
    id: hu.id,
    photoId: site.photos.hurricane,
    label: `${pad(++n)} — ${hu.label}`,
    heading: hu.heading,
    text: hu.text,
    buttons: `<a class="btn btn-solid" href="${wa(hu.wa)}" ${ext}>${icon.whatsapp}<span>${hu.cta}</span></a>`,
  }) : '';

  return hero(c, p.hero, { waText: p.hero.wa, lines: p.hero.lines, photoId: site.photos[key].hero })
    + groups + hurricane + ctaBand(c, p.hero.wa);
}

function aboutPage(c) {
  const p = c.about;
  const intro = `
<section class="section" id="${p.intro.id}">
  <div class="container">
    ${head(1, p.intro.label)}
    <div class="feature feature--top">
      <h2 class="feature-heading reveal">${p.intro.heading}</h2>
      <div class="feature-body reveal">${p.intro.paragraphs.map((t) => `<p>${t}</p>`).join('')}</div>
    </div>
    <div class="reveal">${statsList(p.intro.stats)}</div>
  </div>
</section>`;

  const maria = site.team.find((m) => m.id === 'maria');
  const m = p.maria;
  const mariaSection = `
<section class="section section--glow" id="${m.id}">
  <div class="container">
    ${head(2, m.label)}
    <div class="profile">
      <div class="profile-photo reveal">${portrait(c, maria.name, maria.photo, 'portrait portrait--large')}</div>
      <div class="profile-body reveal">
        ${eyebrow(m.role)}
        <h2 class="feature-heading">${maria.name}</h2>
        ${m.bio.map((t) => `<p>${t}</p>`).join('')}
        <figure class="quote"><blockquote>“${m.quote}”</blockquote><figcaption>${maria.name}</figcaption></figure>
        <a class="btn btn-solid" href="${wa(m.wa)}" ${ext}>${icon.whatsapp}<span>${m.cta}</span></a>
      </div>
    </div>
  </div>
</section>`;

  const t = p.team;
  const team = `
<section class="section" id="${t.id}">
  <div class="container">
    ${head(3, t.label)}
    <h2 class="section-heading reveal">${t.heading}</h2>
    ${groupPhoto(c, t.groupCaption)}
    <ul class="team-grid">
      ${site.team.map((mem) => {
        const info = t.members[mem.id] || {};
        return `<li class="team-card spotlight reveal">
        ${portrait(c, mem.name, mem.photo, 'portrait')}
        <div class="team-body">
          <h3 class="team-name">${mem.name}</h3>
          <p class="team-role">${info.role || c.ui.profileSoon}</p>
          ${info.text ? `<p class="team-text">${info.text}</p>` : ''}
        </div>
      </li>`;
      }).join('\n      ')}
    </ul>
  </div>
</section>`;

  return hero(c, p.hero, { waText: p.hero.wa, lines: p.hero.lines, photoId: site.photos.about })
    + intro + mariaSection + team + ctaBand(c, p.hero.wa);
}

function notFoundPage() {
  const es = LANGS.es;
  const en = LANGS.en;
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Página no encontrada · Page not found | New Horizons Insurance</title>
<meta name="robots" content="noindex">
<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${FONTS}">
<link rel="stylesheet" href="/assets/css/styles.css?v=${VERSION}">
</head>
<body>
<main class="hero hero--page" id="main">
  ${orbs}
  <div class="container">
    ${eyebrow('Error 404')}
    <h1 class="hero-title">Página no encontrada.<br><span class="text-gradient" lang="en">Page not found.</span></h1>
    <div class="hero-cta">
      <a class="btn btn-solid" href="${es.routes.home}">${es.ui.home}</a>
      <a class="btn btn-outline" href="${en.routes.home}" lang="en">${en.ui.home}</a>
    </div>
  </div>
</main>
</body>
</html>
`;
}

// ---------- Archivos auxiliares ----------

function faqJson(c) {
  const a = c.assistant;
  const fill = (s) => s
    .replace(/\{maps\}/g, site.maps)
    .replace(/\{tel\}/g, site.phone.tel)
    .replace(/\{phone\}/g, site.phone.display)
    .replace(/\{auto\}/g, c.routes.auto)
    .replace(/\{commercial\}/g, c.routes.commercial)
    .replace(/\{property\}/g, c.routes.property)
    .replace(/\{about\}/g, c.routes.about)
    .replace(/\{calendly\}/g, site.calendly);
  return JSON.stringify({
    lang: c.lang,
    whatsapp: site.whatsapp,
    ui: {
      greeting: a.greeting, hello: a.hello, thanks: a.thanks, fallback: a.fallback,
      handoff: a.handoff, handoffMsg: a.handoffMsg, related: a.related, topicsLabel: a.topicsLabel,
    },
    topics: a.topics,
    entries: a.entries.map((e) => ({ id: e.id, q: e.q, k: e.k, a: fill(e.a) })),
  });
}

function favicon() {
  const src = fs.readFileSync(path.join(SRC, 'assets/img/logo-symbol-light.svg'), 'utf8');
  const [x, y, w, h] = src.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
  const size = Math.max(w, h) * 1.3;
  const ox = x - (size - w) / 2;
  const oy = y - (size - h) / 2;
  const inner = src.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${ox} ${oy} ${size} ${size}"><rect x="${ox}" y="${oy}" width="${size}" height="${size}" fill="#091A3F"/>${inner}</svg>`;
}

function sitemap() {
  const keys = ['home', 'auto', 'commercial', 'property', 'about'];
  const urls = [];
  for (const lang of Object.keys(LANGS)) {
    for (const k of keys) {
      const alts = Object.keys(LANGS).map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${site.url}${LANGS[l].routes[k]}"/>`).join('\n');
      urls.push(`  <url>\n    <loc>${site.url}${LANGS[lang].routes[k]}</loc>\n${alts}\n  </url>`);
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`;
}

function write(rel, content) {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, withBase(rel, content));
}

// Antepone BASE a los enlaces internos ("/..."), también dentro de las respuestas del asistente.
function withBase(rel, content) {
  if (!BASE) return content;
  if (rel.endsWith('.html')) return content.replace(/(href|src|data-src)="\/(?!\/)/g, `$1="${BASE}/`);
  if (rel.endsWith('.json')) return content.replace(/href=\\"\/(?!\/)/g, `href=\\"${BASE}/`);
  return content;
}

// ---------- Compilación ----------

// Reintentos: el servidor local puede estar compilando al mismo tiempo.
fs.rmSync(OUT, { recursive: true, force: true, maxRetries: 5, retryDelay: 150 });
fs.cpSync(path.join(SRC, 'assets'), path.join(OUT, 'assets'), { recursive: true });

for (const c of Object.values(LANGS)) {
  const pages = {
    home: homePage(c),
    auto: autoPage(c),
    commercial: groupsPage(c, 'commercial'),
    property: groupsPage(c, 'property'),
    about: aboutPage(c),
  };
  for (const [key, body] of Object.entries(pages)) {
    write(path.join(c.routes[key], 'index.html'), layout(c, key, body));
  }
  write(`assets/data/faq-${c.lang}.json`, faqJson(c));
}

write('404.html', notFoundPage());
write('assets/img/favicon.svg', favicon());
write('sitemap.xml', sitemap());
write('robots.txt', PREVIEW ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\n\nSitemap: ${site.url}/sitemap.xml\n`);
write('.nojekyll', '');

console.log(`[build] ${new Date().toLocaleTimeString()} — dist/ listo (${Object.keys(LANGS).length} idiomas)`);
