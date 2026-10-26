// Asistente flotante: responde preguntas frecuentes buscando palabras clave
// en /assets/data/faq-{idioma}.json (generado desde src/content/*.js).
(() => {
  const root = document.querySelector('[data-assistant]');
  if (!root) return;

  const fab = root.querySelector('.assistant-fab');
  const panel = root.querySelector('.assistant-panel');
  const log = root.querySelector('.assistant-log');
  const form = root.querySelector('.assistant-form');
  const input = form.querySelector('input');
  const closeBtn = root.querySelector('.assistant-close');

  let data = null;
  let loading = null;
  let started = false;

  const STOP = new Set(('a al como con cual cuales de del el en es esta este hay la las le lo los me mi mis o para por pero que se si sin su sus te tengo tiene tienen tu un una uno y yo ya ' +
    'an and are be can could do does for from have i if in is it me my of on or so that the this to was we what which with you your').split(' '));

  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

  function lev(a, b) {
    const row = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      let prev = row[0];
      row[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const tmp = row[j];
        row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
        prev = tmp;
      }
    }
    return row[b.length];
  }

  // Coincidencia tolerante: plurales, conjugaciones cercanas y una letra de error.
  const tokMatch = (t, k) => t === k
    || (k.length >= 4 && t.length >= 4 && Math.abs(t.length - k.length) <= 3 && (t.startsWith(k) || k.startsWith(t)))
    || (k.length >= 5 && Math.abs(t.length - k.length) <= 1 && lev(t, k) <= 1);

  function score(text, tokens, entry) {
    const padded = ` ${text} `;
    let s = 0;
    for (const k of entry.keys) {
      if (k.includes(' ')) {
        if (padded.includes(` ${k} `)) s += 3 + k.split(' ').length * 0.5;
        else {
          const parts = k.split(' ').filter((p) => !STOP.has(p));
          if (parts.length > 1 && parts.every((p) => tokens.some((t) => tokMatch(t, p)))) s += 2;
        }
      } else if (tokens.some((t) => tokMatch(t, k))) {
        s += k.length <= 3 ? 2.5 : 2;
      }
    }
    for (const q of entry.qTokens) if (tokens.some((t) => tokMatch(t, q))) s += 0.5;
    return s;
  }

  function load() {
    if (!loading) {
      loading = fetch(root.dataset.src)
        .then((r) => r.json())
        .then((json) => {
          json.entries.forEach((e) => {
            e.keys = e.k.map(norm);
            e.qTokens = norm(e.q).split(' ').filter((t) => t.length > 3 && !STOP.has(t));
          });
          json.byId = Object.fromEntries(json.entries.map((e) => [e.id, e]));
          data = json;
          return json;
        });
    }
    return loading;
  }

  const scrollDown = () => { log.scrollTop = log.scrollHeight; };

  function addUser(text) {
    const el = document.createElement('div');
    el.className = 'msg msg-user';
    el.textContent = text;
    log.appendChild(el);
    scrollDown();
  }

  function addBot(html, extra) {
    const typing = document.createElement('div');
    typing.className = 'typing';
    typing.setAttribute('aria-hidden', 'true');
    typing.innerHTML = '<span></span><span></span><span></span>';
    log.appendChild(typing);
    scrollDown();
    setTimeout(() => {
      typing.remove();
      const el = document.createElement('div');
      el.className = 'msg msg-bot';
      el.innerHTML = html;
      log.appendChild(el);
      if (extra) log.appendChild(extra);
      scrollDown();
    }, 420 + Math.min(html.length, 400));
  }

  function chips(entries, label, extraLink) {
    const wrap = document.createElement('div');
    wrap.className = 'msg msg-chips';
    if (label) {
      const l = document.createElement('p');
      l.className = 'msg-chips-label';
      l.textContent = label;
      wrap.appendChild(l);
    }
    if (extraLink) wrap.appendChild(extraLink);
    entries.filter(Boolean).forEach((e) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = e.q;
      b.addEventListener('click', () => { addUser(e.q); reply(e); });
      wrap.appendChild(b);
    });
    return wrap;
  }

  const topicChips = () => chips(data.topics.map((id) => data.byId[id]), data.ui.topicsLabel);

  function reply(entry, related = []) {
    addBot(entry.a, related.length ? chips(related, data.ui.related) : null);
  }

  function handoffLink(question) {
    const a = document.createElement('a');
    a.className = 'chip chip-wa';
    a.href = `https://wa.me/${data.whatsapp}?text=${encodeURIComponent(data.ui.handoffMsg + question)}`;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = data.ui.handoff;
    return a;
  }

  function answer(question) {
    const text = norm(question);
    if (!text) return;
    const words = text.split(' ');
    const tokens = words.filter((t) => !STOP.has(t));

    if (words.length <= 3 && /^(hola|buenas|buenos|saludos|hi|hello|hey|good)\b/.test(text)) {
      addBot(data.ui.hello, topicChips());
      return;
    }
    if (words.length <= 5 && /\b(gracias|thanks|thank|thx)\b/.test(text)) {
      addBot(data.ui.thanks);
      return;
    }

    const ranked = data.entries
      .map((e) => ({ e, s: score(text, tokens, e) }))
      .filter((r) => r.s >= 2)
      .sort((a, b) => b.s - a.s);

    if (!ranked.length) {
      addBot(data.ui.fallback, chips(data.topics.map((id) => data.byId[id]), data.ui.topicsLabel, handoffLink(question)));
      return;
    }
    const [best, ...rest] = ranked;
    const related = rest.filter((r) => r.s >= Math.max(2, best.s * 0.5)).slice(0, 2).map((r) => r.e);
    reply(best.e, related);
  }

  function open() {
    panel.hidden = false;
    fab.setAttribute('aria-expanded', 'true');
    load().then(() => {
      if (!started) {
        started = true;
        addBot(data.ui.greeting, topicChips());
      }
    }).catch(() => {});
    setTimeout(() => input.focus(), 60);
  }

  function close() {
    panel.hidden = true;
    fab.setAttribute('aria-expanded', 'false');
    fab.focus();
  }

  fab.addEventListener('click', open);
  fab.addEventListener('pointerenter', load, { once: true });
  closeBtn.addEventListener('click', close);
  panel.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    input.value = '';
    addUser(q);
    load().then(() => answer(q));
  });
})();
