/* Shared page shell, content expanders, progress tracking */
(function () {
  'use strict';

  /* ---------- safe storage ---------- */
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
  };
  window.HTStore = store;

  var NAV = [
    { id: 'home', href: 'index.html', n: '0', ar: 'الرئيسية وخريطة الامتحان' },
    { group: 'المحاضرات' },
    { id: 'intro', href: 'intro.html', n: '1', ar: 'مقدمة: طرق انتقال الحرارة', p: 'p5' },
    { id: 'conduction', href: 'conduction.html', n: '2', ar: 'التوصيل أحادي البعد', p: 'p4' },
    { id: 'overall', href: 'overall-u.html', n: '3', ar: 'المعامل الكلي U ونصف القطر الحرج', p: 'p1' },
    { id: 'generation', href: 'heat-generation.html', n: '4', ar: 'توليد الحرارة الداخلي', p: 'p3' },
    { id: 'fins', href: 'fins.html', n: '5', ar: 'الزعانف (Fins)', p: 'p2' },
    { id: 'efficiency', href: 'fin-efficiency.html', n: '6', ar: 'كفاءة وفعالية الزعانف', p: 'p2' },
    { group: 'الامتحان' },
    { id: 'problems', href: 'problems.html', n: '7', ar: 'أسئلة الأستاذ Q1–Q5 ⭐', p: 'pstar' },
    { id: 'formulas', href: 'formulas.html', n: '8', ar: 'ورقة القوانين (للطباعة)' },
    { id: 'review', href: 'review.html', n: '8', ar: 'الفخاخ الشائعة + كويز 15 سؤال' }
  ];
  var PAGES = NAV.filter(function (x) { return x.id; });
  window.HTNav = PAGES;

  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'text') e.textContent = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    if (html != null) e.innerHTML = html;
    return e;
  }

  /* ---------- progress ---------- */
  function progress() { return store.get('ht-progress', {}); }
  function setDone(id, v) { var p = progress(); if (v) p[id] = true; else delete p[id]; store.set('ht-progress', p); updateProgressUI(); }
  function pct() {
    var p = progress(), ids = PAGES.filter(function (x) { return x.id !== 'home'; });
    var d = ids.filter(function (x) { return p[x.id]; }).length;
    return { done: d, total: ids.length, pct: Math.round(100 * d / ids.length) };
  }
  window.HTProgress = { get: progress, set: setDone, pct: pct };
  function updateProgressUI() {
    var s = pct();
    document.querySelectorAll('[data-progress-bar]').forEach(function (b) { b.style.width = s.pct + '%'; });
    document.querySelectorAll('[data-progress-text]').forEach(function (t) { t.textContent = s.done + ' / ' + s.total + ' أقسام (' + s.pct + '%)'; });
    var p = progress();
    document.querySelectorAll('.nav a[data-id]').forEach(function (a) {
      var dd = a.querySelector('.done-dot');
      if (dd) dd.textContent = p[a.getAttribute('data-id')] ? '✔' : '';
    });
    var db = document.querySelector('[data-done-btn]');
    if (db) {
      var id = document.body.getAttribute('data-page');
      db.textContent = p[id] ? '✔ خلصت هذا القسم (اضغط للإلغاء)' : '✅ خلصت هذا القسم — علّمه';
      db.classList.toggle('ok', !!p[id]);
      db.classList.toggle('primary', !p[id]);
    }
  }

  /* ---------- theme ---------- */
  function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    store.set('ht-theme', t);
    var b = document.getElementById('themeBtn');
    if (b) b.textContent = t === 'dark' ? '☀️' : '🌙';
    document.dispatchEvent(new CustomEvent('ht-theme'));
  }

  /* ---------- shell ---------- */
  function buildShell() {
    var page = document.body.getAttribute('data-page') || 'home';
    var embed = /[?&]embed=1/.test(location.search);
    if (embed) { document.body.classList.add('embed'); return; }
    var main = document.getElementById('content');

    var top = el('header', { class: 'topbar' });
    top.innerHTML =
      '<button class="icon-btn menu-btn" id="menuBtn" aria-label="القائمة">☰</button>' +
      '<div class="brand">🔥 انتقال الحرارة <small>Heat Transfer · 3rd stage</small></div>' +
      '<button class="icon-btn" id="themeBtn" aria-label="الوضع الليلي">🌙</button>';

    var side = el('nav', { class: 'sidebar', id: 'sidebar', 'aria-label': 'الأقسام' });
    var html = '<div class="prog"><b>تقدّمك</b><div class="progress" style="margin:6px 0"><span data-progress-bar></span></div><small data-progress-text></small></div><div class="nav">';
    NAV.forEach(function (x) {
      if (x.group) { html += '<div class="group">' + x.group + '</div>'; return; }
      html += '<a href="' + x.href + '" data-id="' + x.id + '"' + (x.id === page ? ' class="active" aria-current="page"' : '') + '>' +
        '<span class="n">' + x.n + '</span><span class="t">' + x.ar + '</span><span class="done-dot"></span></a>';
    });
    html += '</div>';
    side.innerHTML = html;

    var shell = el('div', { class: 'shell' });
    main.parentNode.insertBefore(shell, main);
    shell.appendChild(side);
    shell.appendChild(main);
    document.body.insertBefore(top, shell);
    document.body.appendChild(el('div', { class: 'scrim', id: 'scrim' }));

    if (page !== 'formulas') {
      var fab = el('button', { class: 'fab', id: 'fab', 'aria-label': 'ورقة القوانين' }, '📄 القوانين');
      document.body.appendChild(fab);
      var dr = el('aside', { class: 'drawer', id: 'drawer', 'aria-label': 'ورقة القوانين' });
      dr.innerHTML = '<div class="dh"><b>📄 ورقة القوانين</b><a class="btn small" href="formulas.html">فتح كصفحة / طباعة</a><button class="icon-btn" id="drawerClose" aria-label="إغلاق">✕</button></div>';
      document.body.appendChild(dr);
      fab.addEventListener('click', function () {
        if (!dr.querySelector('iframe')) { var f = el('iframe', { src: 'formulas.html?embed=1', title: 'Formula sheet', loading: 'lazy' }); dr.appendChild(f); }
        document.body.classList.add('sheet-open');
      });
      document.getElementById('drawerClose').addEventListener('click', function () { document.body.classList.remove('sheet-open'); });
    }

    document.getElementById('menuBtn').addEventListener('click', function () { document.body.classList.toggle('nav-open'); });
    document.getElementById('scrim').addEventListener('click', function () { document.body.classList.remove('nav-open', 'sheet-open'); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') document.body.classList.remove('nav-open', 'sheet-open'); });
    var tb = document.getElementById('themeBtn');
    tb.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? '☀️' : '🌙';
    tb.addEventListener('click', function () { setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'); });

    /* done button + pager */
    var wrap = main.querySelector('.wrap') || main;
    if (page !== 'home' && page !== 'formulas') {
      var bar = el('div', { class: 'done-bar' });
      var b = el('button', { class: 'btn primary', 'data-done-btn': '' });
      b.addEventListener('click', function () { setDone(page, !progress()[page]); });
      bar.appendChild(b);
      wrap.appendChild(bar);
    }
    var i = PAGES.findIndex(function (x) { return x.id === page; });
    var pager = el('div', { class: 'pager' });
    if (i > 0) pager.innerHTML += '<a href="' + PAGES[i - 1].href + '"><small>→ السابق</small>' + PAGES[i - 1].ar + '</a>';
    if (i < PAGES.length - 1) pager.innerHTML += '<a href="' + PAGES[i + 1].href + '" style="text-align:left"><small>التالي ←</small>' + PAGES[i + 1].ar + '</a>';
    wrap.appendChild(pager);
  }

  /* ---------- page TOC ---------- */
  function buildToc() {
    var holder = document.querySelector('[data-toc]');
    if (!holder) return;
    var hs = document.querySelectorAll('section.topic > h2[id]');
    var ul = el('ul', { class: 'toc' });
    hs.forEach(function (h) {
      var t = h.getAttribute('data-short') || h.textContent.replace(/\s+/g, ' ').trim();
      var li = el('li'); li.innerHTML = '<a href="#' + h.id + '"></a>'; li.firstChild.textContent = t; ul.appendChild(li);
    });
    holder.appendChild(ul);
  }

  /* ---------- formula blocks ---------- */
  function expandFormulas() {
    document.querySelectorAll('.f').forEach(function (f) {
      if (f.dataset.done) return; f.dataset.done = 1;
      var name = f.getAttribute('data-name');
      var what = f.querySelector('.what'), when = f.querySelector('.when'), hint = f.querySelector('.hint');
      var m = el('div', { class: 'meaning' });
      if (what) m.appendChild(what);
      var sym = f.getAttribute('data-sym');
      if (sym) {
        var rows = sym.split(';').map(function (r) { return r.split('|').map(function (s) { return s.trim(); }); }).filter(function (r) { return r[0]; });
        var t = '<div class="tbl-wrap"><table class="sym"><thead><tr><th>Symbol</th><th>المعنى بالعربي</th><th>SI unit</th></tr></thead><tbody>';
        rows.forEach(function (r) { t += '<tr><td>\\(' + r[0] + '\\)</td><td>' + (r[1] || '') + '</td><td>' + (r[2] || '—') + '</td></tr>'; });
        t += '</tbody></table></div>';
        m.insertAdjacentHTML('beforeend', t);
      }
      if (when) m.appendChild(when);
      if (hint) m.appendChild(hint);
      f.appendChild(m);
      if (name) f.insertAdjacentHTML('afterbegin', '<div class="f-name">' + name + '</div>');
    });
  }

  /* ---------- examples ---------- */
  var HEADS = {
    given: ['1', 'المعطيات', 'Given'],
    find: ['2', 'المطلوب', 'Find'],
    strategy: ['3', 'الفكرة', 'Strategy'],
    steps: ['4', 'خطوات الحل', 'Steps']
  };
  function expandExamples() {
    var ticks = store.get('ht-ex', {});
    document.querySelectorAll('.ex').forEach(function (ex) {
      if (ex.dataset.done) return; ex.dataset.done = 1;
      var sol = ex.querySelector('.sol');
      if (!sol) return;
      Object.keys(HEADS).forEach(function (k) {
        var part = sol.querySelector(':scope > .' + k);
        if (!part) return;
        var h = HEADS[k];
        part.insertAdjacentHTML('beforebegin', '<div class="h"><span class="k">' + h[0] + '</span>' + h[1] + ' <span class="en">' + h[2] + '</span></div>');
      });
      var ans = sol.querySelector(':scope > .ans');
      if (ans) ans.insertAdjacentHTML('beforebegin', '<div class="h"><span class="k">5</span>الجواب النهائي <span class="en">Final answer</span></div>');
      var chk = sol.querySelector(':scope > .check');
      if (chk) chk.insertAdjacentHTML('beforebegin', '<div class="h"><span class="k">6</span>هل الجواب منطقي؟ <span class="en">Sanity check</span></div>');
      var trap = sol.querySelector(':scope > .trap');
      if (trap) trap.insertAdjacentHTML('beforebegin', '<div class="h"><span class="k">7</span>انتبه للفخ <span class="en">Common trap</span></div>');
      /* given table */
      var g = sol.querySelector('.given[data-rows]');
      if (g) {
        var rows = g.getAttribute('data-rows').split(';').map(function (r) { return r.split('|').map(function (s) { return s.trim(); }); }).filter(function (r) { return r[0]; });
        var t = '<div class="tbl-wrap"><table><thead><tr><th>Qty</th><th>As given</th><th>In SI / used</th></tr></thead><tbody>';
        rows.forEach(function (r) { t += '<tr><td>\\(' + r[0] + '\\)</td><td>' + (r[1] || '') + '</td><td>' + (r[2] || r[1] || '') + '</td></tr>'; });
        g.innerHTML = t + '</tbody></table></div>' + g.innerHTML;
      }
      /* tools */
      var id = ex.id || ('ex-' + Math.random().toString(36).slice(2));
      var tools = el('div', { class: 'ex-tools' });
      var btn = el('button', { class: 'btn primary', type: 'button', 'aria-expanded': 'false' }, '👀 اعرض الحل');
      var tryMsg = el('span', { style: 'font-size:.88rem;color:var(--muted)' }, '✍️ جرّب تحله بالورقة أول، بعدين افتح الحل.');
      var lab = el('label', { class: 'understood' }, '<input type="checkbox"> فهمته');
      var cb = lab.querySelector('input');
      cb.checked = !!ticks[id];
      cb.addEventListener('change', function () { var t = store.get('ht-ex', {}); if (cb.checked) t[id] = true; else delete t[id]; store.set('ht-ex', t); });
      btn.addEventListener('click', function () {
        var open = ex.classList.toggle('open');
        btn.innerHTML = open ? '🙈 اخفِ الحل — جرّب بنفسك' : '👀 اعرض الحل';
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        tryMsg.style.display = open ? 'none' : '';
        if (open) document.dispatchEvent(new CustomEvent('ht-reveal', { detail: ex }));
      });
      tools.appendChild(btn); tools.appendChild(tryMsg); tools.appendChild(lab);
      sol.parentNode.insertBefore(tools, sol);
      if (ex.hasAttribute('data-open')) btn.click();
    });
  }

  /* ---------- thermal circuits ---------- */
  function zig(color) {
    return '<svg viewBox="0 0 100 48" preserveAspectRatio="none" aria-hidden="true"><path d="M0 24 H22 L27 12 L35 36 L43 12 L51 36 L59 12 L67 36 L73 24 H100" fill="none" stroke="' + (color || 'currentColor') + '" stroke-width="2.4" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>';
  }
  window.HTZig = zig;
  function expandCircuits() {
    document.querySelectorAll('.circuit[data-nodes]').forEach(function (c) {
      if (c.dataset.done) return; c.dataset.done = 1;
      var nodes = c.getAttribute('data-nodes').split('|');
      var res = (c.getAttribute('data-res') || '').split('|');
      var inner = el('div', { class: 'inner' });
      nodes.forEach(function (n, i) {
        var cls = 'node' + (i === 0 ? ' hot' : (i === nodes.length - 1 ? ' cold' : ''));
        inner.insertAdjacentHTML('beforeend', '<div class="' + cls + '"><span class="dot"></span><span class="nl">\\(' + n.trim() + '\\)</span></div>');
        if (i < nodes.length - 1) inner.insertAdjacentHTML('beforeend', '<div class="res">' + zig() + '<span class="rl">\\(' + (res[i] || '').trim() + '\\)</span></div>');
      });
      c.appendChild(inner);
      if (c.hasAttribute('data-q')) c.insertAdjacentHTML('afterend', '<div class="qarrow">q ⟶ ' + c.getAttribute('data-q') + '</div>');
    });
  }

  /* ---------- math ---------- */
  function renderMath(root) {
    if (!window.renderMathInElement) return;
    window.renderMathInElement(root || document.body, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '\\(', right: '\\)', display: false }
      ],
      throwOnError: false,
      ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'option', 'input']
    });
  }
  window.HTMath = renderMath;
  window.HTtex = function (tex, display) {
    try { return window.katex ? window.katex.renderToString(tex, { throwOnError: false, displayMode: !!display }) : tex; } catch (e) { return tex; }
  };

  function init() {
    buildShell();
    buildToc();
    expandFormulas();
    expandExamples();
    expandCircuits();
    renderMath(document.getElementById('content') || document.body);
    updateProgressUI();
    if (window.HTModels) {
      document.querySelectorAll('[data-model]').forEach(function (m) {
        var fn = window.HTModels[m.getAttribute('data-model')];
        if (fn) { try { fn(m); } catch (e) { m.insertAdjacentHTML('beforeend', '<p style="color:var(--danger)">Model error: ' + e.message + '</p>'); if (window.console) console.error(e); } }
      });
    }
    if (window.HTPage) try { window.HTPage(); } catch (e) { console.error(e); }
    /* close drawer when navigating */
    document.querySelectorAll('.sidebar a').forEach(function (a) { a.addEventListener('click', function () { document.body.classList.remove('nav-open'); }); });
    if (location.hash) { var t = document.getElementById(location.hash.slice(1)); if (t) setTimeout(function () { t.scrollIntoView(); }, 50); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
