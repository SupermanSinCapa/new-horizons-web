// Navegación, animaciones de entrada y feed de Instagram.
(() => {
  const nav = document.getElementById('nav');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Menú móvil a pantalla completa
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.getElementById('nav-menu');
  const setMenu = (open) => {
    toggle.classList.toggle('active', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? toggle.dataset.close : toggle.dataset.open);
    menu.classList.toggle('open', open);
    document.body.classList.toggle('menu-open', open);
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('open')) { setMenu(false); toggle.focus(); }
  });
  window.matchMedia('(min-width: 1181px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  // Aparición al hacer scroll, escalonada entre elementos hermanos
  const items = document.querySelectorAll('.reveal');
  items.forEach((el) => {
    const siblings = [...el.parentElement.children].filter((c) => c.classList.contains('reveal'));
    if (siblings.length > 2) el.style.transitionDelay = `${Math.min(siblings.indexOf(el), 5) * 80}ms`;
  });
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach((el) => io.observe(el));
  } else {
    items.forEach((el) => el.classList.add('visible'));
  }

  document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  // Formulario de contacto: arma el mensaje y lo abre en WhatsApp (no se guarda nada en el sitio).
  document.querySelectorAll('[data-wa-form]').forEach((form) => {
    const tpl = JSON.parse(form.dataset.msg);
    const error = form.querySelector('.form-error');
    const fill = (s, data) => s.replace(/\{(\w+)\}/g, (_, k) => data[k]);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = Object.fromEntries([...new FormData(form)].map(([k, v]) => [k, String(v).trim()]));
      const missing = ['name', 'phone'].filter((k) => !data[k]);
      form.querySelectorAll('[required]').forEach((el) => el.setAttribute('aria-invalid', String(missing.includes(el.name))));
      error.hidden = missing.length === 0;
      if (missing.length) { form.querySelector(`[name="${missing[0]}"]`).focus(); return; }
      const lines = [
        fill(tpl.hello, data),
        fill(tpl.type, data),
        fill(tpl.phone, data),
        data.email && fill(tpl.email, data),
        data.pref && fill(tpl.pref, data),
        data.message && `\n${data.message}`,
      ].filter(Boolean);
      const url = `https://wa.me/${form.dataset.wa}?text=${encodeURIComponent(lines.join('\n'))}`;
      if (!window.open(url, '_blank', 'noopener')) window.location.href = url;
    });
  });

  // Feed de Instagram (Behold.so). Sin URL configurada se quedan las publicaciones de respaldo.
  const grid = document.querySelector('[data-ig-feed]');
  if (!grid || !grid.dataset.igFeed) return;
  const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const isSafe = (u, host) => { try { const url = new URL(u); return url.protocol === 'https:' && (!host || url.hostname.endsWith(host)); } catch { return false; } };
  fetch(grid.dataset.igFeed)
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((data) => {
      const types = JSON.parse(grid.dataset.igTypes || '{}');
      const posts = (Array.isArray(data) ? data : data.posts || [])
        .map((p) => ({
          href: p.permalink,
          img: (p.sizes && (p.sizes.medium || p.sizes.small || {}).mediaUrl) || p.thumbnailUrl || p.mediaUrl,
          video: /VIDEO|REEL/i.test(p.mediaType || ''),
          caption: (p.prunedCaption || p.caption || '').slice(0, 140),
        }))
        .filter((p) => isSafe(p.href, 'instagram.com') && isSafe(p.img))
        .slice(0, 6);
      if (!posts.length) return;
      grid.innerHTML = posts.map((p) => `
        <a class="ig-tile ig-tile--media visible" href="${escAttr(p.href)}" target="_blank" rel="noopener">
          <img src="${escAttr(p.img)}" alt="${escAttr(p.caption)}" loading="lazy">
          <span class="ig-type">${p.video ? types.reel : types.post}</span>
        </a>`).join('');
    })
    .catch(() => { /* se mantienen las publicaciones de respaldo */ });
})();
