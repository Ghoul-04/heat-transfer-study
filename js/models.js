/* Interactive models — each registered as HTModels[name](element) */
(function () {
  'use strict';
  var H = window.HT;
  var M = window.HTModels = {};
  var NS = 'http://www.w3.org/2000/svg';

  /* ---------- helpers ---------- */
  function fmt(v, sig) {
    sig = sig || 4;
    if (v == null || !isFinite(v)) return '—';
    var a = Math.abs(v);
    if (a !== 0 && (a >= 1e6 || a < 1e-3)) return v.toExponential(2).replace('e+', '×10^').replace('e-', '×10^-');
    return Number(v.toPrecision(sig)).toLocaleString('en-US', { maximumFractionDigits: 6 });
  }
  M.fmt = fmt;
  function S(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function T(parent, x, y, txt, attrs) {
    var a = { x: x, y: y }; for (var k in attrs) a[k] = attrs[k];
    var t = S('text', a, parent); t.textContent = txt; return t;
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function hex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
  var STOPS = [[0, '#2f6fd0'], [0.35, '#35b6c9'], [0.6, '#f2c94c'], [0.8, '#f0862f'], [1, '#d7301f']];
  function tcolor(f) {
    f = Math.max(0, Math.min(1, f));
    for (var i = 1; i < STOPS.length; i++) {
      if (f <= STOPS[i][0]) {
        var a = STOPS[i - 1], b = STOPS[i], t = (f - a[0]) / (b[0] - a[0]);
        var ca = hex(a[1]), cb = hex(b[1]);
        return 'rgb(' + Math.round(lerp(ca[0], cb[0], t)) + ',' + Math.round(lerp(ca[1], cb[1], t)) + ',' + Math.round(lerp(ca[2], cb[2], t)) + ')';
      }
    }
    return STOPS[STOPS.length - 1][1];
  }
  M.tcolor = tcolor;

  function frame(el) {
    var title = el.getAttribute('data-title') || 'Interactive model';
    el.classList.add('model');
    el.innerHTML = '<div class="mh"><h3>' + title + '</h3><span class="badge p4">🎛️ تفاعلي</span></div><div class="mb"></div>';
    return el.querySelector('.mb');
  }
  function ctl(parent, o) {
    var w = document.createElement('div'); w.className = 'ctl';
    var id = 'c' + Math.random().toString(36).slice(2, 8);
    w.innerHTML = '<label for="' + id + '">' + o.label + '</label><output></output><input type="range" id="' + id + '">';
    var inp = w.querySelector('input'), out = w.querySelector('output');
    inp.min = o.min; inp.max = o.max; inp.step = o.log ? 'any' : (o.step || 'any');
    /* keep the exact value (e.g. lecture defaults) until the user drags */
    var cur = o.value;
    function fromInput() { var v = +inp.value; if (o.log) { v = Math.pow(10, v); var p = Math.pow(10, Math.floor(Math.log10(v)) - 2); v = Math.round(v / p) * p; } return v; }
    function val() { return cur; }
    function show() { out.textContent = (o.f ? o.f(cur) : fmt(cur, 4)) + (o.unit ? ' ' + o.unit : ''); }
    inp.value = o.log ? Math.log10(o.value) : o.value;
    show();
    inp.addEventListener('input', function () { cur = fromInput(); show(); if (o.on) o.on(); });
    parent.appendChild(w);
    return { get: val, set: function (v) { cur = v; inp.value = o.log ? Math.log10(v) : v; show(); }, el: w, input: inp };
  }
  function seg(parent, opts, cur, on) {
    var d = document.createElement('div'); d.className = 'seg';
    opts.forEach(function (o) {
      var b = document.createElement('button'); b.type = 'button'; b.innerHTML = o[1]; b.dataset.v = o[0];
      if (o[0] === cur) b.className = 'on';
      b.addEventListener('click', function () {
        d.querySelectorAll('button').forEach(function (x) { x.className = ''; }); b.className = 'on'; on(o[0]);
      });
      d.appendChild(b);
    });
    parent.appendChild(d); return d;
  }
  function readout(parent) {
    var d = document.createElement('div'); d.className = 'readout'; parent.appendChild(d);
    return function (items) {
      d.innerHTML = items.map(function (it) {
        return '<div class="r' + (it[2] ? ' hl' : '') + '"><span class="k">' + it[0] + '</span><span class="v">' + it[1] + '</span></div>';
      }).join('');
    };
  }
  function svgPoint(svg, e) {
    var p = svg.createSVGPoint();
    var src = e.touches ? e.touches[0] : e;
    p.x = src.clientX; p.y = src.clientY;
    return p.matrixTransform(svg.getScreenCTM().inverse());
  }
  function niceStep(span, n) {
    var raw = span / (n || 5), mag = Math.pow(10, Math.floor(Math.log10(raw))), r = raw / mag;
    return (r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10) * mag;
  }
  /* plot frame */
  function Plot(svg, o) {
    var W = o.W || 640, Hh = o.H || 320, m = o.m || { l: 58, r: 16, t: 16, b: 44 };
    var x0 = o.x[0], x1 = o.x[1], y0 = o.y[0], y1 = o.y[1];
    this.sx = function (v) { return m.l + (v - x0) / (x1 - x0) * (W - m.l - m.r); };
    this.sy = function (v) { return Hh - m.b - (v - y0) / (y1 - y0) * (Hh - m.t - m.b); };
    this.ix = function (px) { return x0 + (px - m.l) / (W - m.l - m.r) * (x1 - x0); };
    this.m = m; this.W = W; this.H = Hh;
    var g = S('g', { class: 'grid' }, svg), self = this;
    var xs = o.xt || niceStep(x1 - x0, 6), ys = o.yt || niceStep(y1 - y0, 5);
    for (var v = Math.ceil(x0 / xs) * xs; v <= x1 + 1e-9; v += xs) {
      S('line', { x1: self.sx(v), x2: self.sx(v), y1: m.t, y2: Hh - m.b }, g);
      T(svg, self.sx(v), Hh - m.b + 16, o.xf ? o.xf(v) : fmt(v, 3), { class: 'tick', 'text-anchor': 'middle' });
    }
    for (v = Math.ceil(y0 / ys) * ys; v <= y1 + 1e-9; v += ys) {
      S('line', { x1: m.l, x2: W - m.r, y1: self.sy(v), y2: self.sy(v) }, g);
      T(svg, m.l - 6, self.sy(v) + 4, o.yf ? o.yf(v) : fmt(v, 3), { class: 'tick', 'text-anchor': 'end' });
    }
    S('line', { x1: m.l, x2: W - m.r, y1: Hh - m.b, y2: Hh - m.b, class: 'axis' }, svg);
    S('line', { x1: m.l, x2: m.l, y1: m.t, y2: Hh - m.b, class: 'axis' }, svg);
    if (o.xl) T(svg, (m.l + W - m.r) / 2, Hh - 6, o.xl, { class: 'lab', 'text-anchor': 'middle' });
    if (o.yl) T(svg, 14, (m.t + Hh - m.b) / 2, o.yl, { class: 'lab', 'text-anchor': 'middle', transform: 'rotate(-90 14 ' + ((m.t + Hh - m.b) / 2) + ')' });
    this.g = S('g', {}, svg);
  }
  Plot.prototype.line = function (pts, style, parent) {
    var self = this, d = pts.map(function (p, i) { return (i ? 'L' : 'M') + self.sx(p[0]).toFixed(2) + ' ' + self.sy(p[1]).toFixed(2); }).join(' ');
    return S('path', { d: d, fill: 'none', style: style || 'stroke:var(--accent);stroke-width:2.5' }, parent || this.g);
  };
  function zz(x1, x2, y, amp) {
    amp = amp || 9; var w = x2 - x1, a = x1 + w * 0.2, b = x2 - w * 0.2, n = 6, d = 'M' + x1 + ' ' + y + ' H' + a;
    for (var i = 0; i < n; i++) d += ' L' + (a + (b - a) * (i + 0.5) / n) + ' ' + (y + (i % 2 ? amp : -amp));
    return d + ' L' + b + ' ' + y + ' H' + x2;
  }

  /* =====================================================================
     1) Multi-layer wall builder
     ===================================================================== */
  M.wall = function (el) {
    var b = frame(el);
    var MAT = { 'Copper': 386, 'Asbestos': 0.16, 'Fiberglass': 0.038, 'Concrete': 1.2, 'Brick': 0.7, 'Steel': 45, 'Gypsum': 0.05 };
    var COL = ['#c98a4b', '#9aa7b5', '#e7c35a', '#86b36f', '#b483c9', '#6fa8c9'];
    var layers = [{ dx: 2.5, k: 386, n: 'Copper' }, { dx: 0.32, k: 0.16, n: 'Asbestos' }, { dx: 5, k: 0.038, n: 'Fiberglass' }];
    b.innerHTML = '<div class="grid two"><div class="ctrls" data-c></div><div><svg class="viz" viewBox="0 0 640 330" data-s role="img" aria-label="Temperature profile through the wall"></svg><div data-share></div><div data-ro></div></div></div>';
    var c = b.querySelector('[data-c]'), svg = b.querySelector('[data-s]'), ro = readout(b.querySelector('[data-ro]'));
    var share = b.querySelector('[data-share]');
    var pre = document.createElement('div'); pre.style.cssText = 'display:grid;gap:6px';
    pre.innerHTML = '<b style="font-size:.88rem">أمثلة جاهزة:</b>'; c.appendChild(pre);
    var Th, Tc, conv, hA, hB;
    seg(pre, [['l3', '3 طبقات (المحاضرة)'], ['cu', 'نحاس + فايبر'], ['bw', 'جدار Q2 + حمل']], 'l3', function (v) {
      if (v === 'l3') { layers = [{ dx: 2.5, k: 386, n: 'Copper' }, { dx: 0.32, k: 0.16, n: 'Asbestos' }, { dx: 5, k: 0.038, n: 'Fiberglass' }]; Th.set(580); Tc.set(20); conv.checked = false; }
      if (v === 'cu') { layers = [{ dx: 5, k: 386, n: 'Copper' }, { dx: 2.5, k: 0.038, n: 'Fiberglass' }]; Th.set(250); Tc.set(35); conv.checked = false; }
      if (v === 'bw') { layers = [{ dx: 15.24, k: 1.2, n: 'Concrete' }, { dx: 5.08, k: 0.038, n: 'Fiberglass' }, { dx: 0.9525, k: 0.05, n: 'Gypsum' }]; Th.set(22.2); Tc.set(-6.7); conv.checked = true; hA.set(11.4); hB.set(39.7); }
      buildRows(); render();
    });
    Th = ctl(c, { label: 'درجة الجهة الحارة \\(T_{hot}\\)', min: -20, max: 600, step: 0.1, value: 580, unit: '°C', on: render });
    Tc = ctl(c, { label: 'درجة الجهة الباردة \\(T_{cold}\\)', min: -20, max: 300, step: 0.1, value: 20, unit: '°C', on: render });
    var cw = document.createElement('label'); cw.className = 'understood'; cw.innerHTML = '<input type="checkbox"> أضف حمل حراري (موائع) على الجهتين'; c.appendChild(cw);
    conv = cw.querySelector('input'); conv.addEventListener('change', render);
    hA = ctl(c, { label: '\\(h_{hot}\\)', min: 1, max: 200, step: 0.1, value: 10, unit: 'W/m²°C', on: render });
    hB = ctl(c, { label: '\\(h_{cold}\\)', min: 1, max: 200, step: 0.1, value: 25, unit: 'W/m²°C', on: render });
    var list = document.createElement('div'); list.className = 'layer-list'; c.appendChild(list);
    var add = document.createElement('button'); add.className = 'btn small'; add.type = 'button'; add.textContent = '➕ أضف طبقة';
    add.addEventListener('click', function () { if (layers.length < 6) { layers.push({ dx: 2, k: 1, n: 'Layer ' + (layers.length + 1) }); buildRows(); render(); } });
    c.appendChild(add);
    function buildRows() {
      list.innerHTML = '';
      layers.forEach(function (L, i) {
        var r = document.createElement('div'); r.className = 'layer-row';
        r.innerHTML = '<span class="sw" style="background:' + COL[i % COL.length] + '"></span>' +
          '<div><label>Δx (cm) — ' + L.n + '</label><input type="number" min="0.01" step="0.01" value="' + L.dx + '" data-dx></div>' +
          '<div><label>k (W/m·°C)</label><input type="number" min="0.001" step="any" value="' + L.k + '" data-k></div>' +
          '<button class="icon-btn" type="button" aria-label="حذف" style="width:34px;height:34px">✕</button>';
        r.querySelector('[data-dx]').addEventListener('input', function (e) { var v = parseFloat(e.target.value); if (v > 0) { L.dx = v; render(); } });
        r.querySelector('[data-k]').addEventListener('input', function (e) { var v = parseFloat(e.target.value); if (v > 0) { L.k = v; render(); } });
        r.querySelector('button').addEventListener('click', function () { if (layers.length > 1) { layers.splice(i, 1); buildRows(); render(); } });
        list.appendChild(r);
      });
    }
    function render() {
      hA.el.style.display = hB.el.style.display = conv.checked ? '' : 'none';
      var R = [], names = [];
      if (conv.checked) { R.push(1 / hA.get()); names.push('1/h_hot'); }
      layers.forEach(function (L) { R.push(L.dx / 100 / L.k); names.push(L.n); });
      if (conv.checked) { R.push(1 / hB.get()); names.push('1/h_cold'); }
      var Rt = R.reduce(function (a, b) { return a + b; }, 0), th = Th.get(), tc = Tc.get(), q = (th - tc) / Rt;
      var temps = [th]; R.forEach(function (r) { temps.push(temps[temps.length - 1] - q * r); });
      /* draw */
      clear(svg);
      var X0 = 56, X1 = 620, Y0 = 26, Y1 = 290, fz = conv.checked ? 60 : 0;
      var tot = layers.reduce(function (a, L) { return a + L.dx; }, 0), avail = X1 - X0 - 2 * fz;
      var minW = 26, wsum = 0, ws = layers.map(function (L) { var w = Math.max(minW, L.dx / tot * avail); wsum += w; return w; });
      ws = ws.map(function (w) { return w / wsum * avail; });
      var tmin = Math.min(th, tc), tmax = Math.max(th, tc), pad = (tmax - tmin) * 0.08 || 1;
      function sy(t) { return Y1 - (t - (tmin - pad)) / ((tmax + pad) - (tmin - pad)) * (Y1 - Y0); }
      function tf(t) { return (t - tmin) / ((tmax - tmin) || 1); }
      var xs = [X0 + fz], x = X0 + fz;
      if (conv.checked) {
        S('rect', { x: X0, y: Y0, width: fz, height: Y1 - Y0, fill: tcolor(1), opacity: .14 }, svg);
        S('rect', { x: X1 - fz, y: Y0, width: fz, height: Y1 - Y0, fill: tcolor(0), opacity: .14 }, svg);
        T(svg, X0 + fz / 2, Y1 + 18, 'fluid', { class: 'tick', 'text-anchor': 'middle' });
        T(svg, X1 - fz / 2, Y1 + 18, 'fluid', { class: 'tick', 'text-anchor': 'middle' });
      }
      layers.forEach(function (L, i) {
        var ti = conv.checked ? i + 1 : i;
        var mid = (temps[ti] + temps[ti + 1]) / 2;
        S('rect', { x: x, y: Y0, width: ws[i], height: Y1 - Y0, fill: COL[i % COL.length], opacity: .28, stroke: COL[i % COL.length], 'stroke-width': 1.5 }, svg);
        S('rect', { x: x, y: Y1 - 8, width: ws[i], height: 8, fill: tcolor(tf(mid)) }, svg);
        T(svg, x + ws[i] / 2, Y1 + 18, L.n.length > 10 ? L.n.slice(0, 9) + '…' : L.n, { class: 'tick', 'text-anchor': 'middle' });
        x += ws[i]; xs.push(x);
      });
      /* profile */
      var pts = [];
      if (conv.checked) {
        var a = X0, w1 = xs[0];
        pts.push('M' + a + ' ' + sy(temps[0]) + ' L' + (w1 - 26) + ' ' + sy(temps[0]) + ' Q' + (w1 - 6) + ' ' + sy(temps[0]) + ' ' + w1 + ' ' + sy(temps[1]));
        for (var i = 1; i < xs.length; i++) pts.push('L' + xs[i] + ' ' + sy(temps[i + 1]));
        var last = xs[xs.length - 1], tl = temps[temps.length - 2], tE = temps[temps.length - 1];
        pts.push('Q' + (last + 6) + ' ' + sy(tE) + ' ' + (last + 26) + ' ' + sy(tE) + ' L' + X1 + ' ' + sy(tE));
      } else {
        for (i = 0; i < xs.length; i++) pts.push((i ? 'L' : 'M') + xs[i] + ' ' + sy(temps[i]));
      }
      S('path', { d: pts.join(' '), fill: 'none', style: 'stroke:var(--accent);stroke-width:3;stroke-linejoin:round' }, svg);
      var off = conv.checked ? 1 : 0;
      for (i = 0; i < xs.length; i++) {
        var tt = temps[i + off];
        S('circle', { cx: xs[i], cy: sy(tt), r: 4.5, style: 'fill:var(--surface);stroke:var(--accent);stroke-width:2' }, svg);
        T(svg, xs[i] + (i === xs.length - 1 ? -4 : 4), sy(tt) - 9, fmt(tt, 4) + '°', { class: 'tick', 'text-anchor': i === xs.length - 1 ? 'end' : 'start', style: 'font-weight:700;fill:var(--text)' });
      }
      if (conv.checked) {
        T(svg, X0 + 4, sy(temps[0]) - 8, 'T∞,hot ' + fmt(temps[0], 4) + '°', { class: 'tick' });
        T(svg, X1 - 4, sy(temps[temps.length - 1]) + 16, fmt(temps[temps.length - 1], 4) + '° T∞,cold', { class: 'tick', 'text-anchor': 'end' });
      }
      var ar = S('line', { x1: X0 + 10, x2: X1 - 16, y1: 14, y2: 14, class: 'flow-arrow', style: 'stroke:var(--accent);stroke-width:3;stroke-dasharray:10 14' }, svg);
      S('path', { d: 'M' + (X1 - 16) + ' 8 L' + (X1 - 4) + ' 14 L' + (X1 - 16) + ' 20 Z', style: 'fill:var(--accent)' }, svg);
      T(svg, X0 + 10, 30, 'q', { style: 'font-weight:800;fill:var(--accent)' });
      /* share bar */
      share.innerHTML = '<div style="font-size:.85rem;font-weight:700;margin:6px 0 4px">مين المقاومة المسيطرة؟ (حصة كل R من المجموع)</div><div style="display:flex;height:26px;border-radius:8px;overflow:hidden;direction:ltr">' +
        R.map(function (r, i) {
          var p = r / Rt * 100, isConv = conv.checked && (i === 0 || i === R.length - 1);
          var col = isConv ? (i === 0 ? '#e66a4a' : '#4a8be6') : COL[(conv.checked ? i - 1 : i) % COL.length];
          return '<div title="' + names[i] + ' ' + p.toFixed(1) + '%" style="width:' + p + '%;background:' + col + ';color:#111;font:700 11px Inter;display:grid;place-items:center;overflow:hidden;white-space:nowrap">' + (p > 9 ? p.toFixed(0) + '%' : '') + '</div>';
        }).join('') + '</div>';
      var items = R.map(function (r, i) { return ['R ' + names[i], fmt(r, 4) + ' m²°C/W']; });
      items.push(['ΣR', fmt(Rt, 4) + ' m²°C/W', 1]);
      items.push(['q/A = ΔT/ΣR', fmt(q, 4) + ' W/m²', 1]);
      if (conv.checked) items.push(['U = 1/ΣR', fmt(1 / Rt, 4) + ' W/m²°C', 1]);
      ro(items);
    }
    buildRows(); render();
    var ps = el.getAttribute('data-preset');
    if (ps) { var pb = pre.querySelector('button[data-v="' + ps + '"]'); if (pb) pb.click(); }
    window.HTMath(el);
  };

  /* =====================================================================
     2) Series–parallel circuit for Problem Q1
     ===================================================================== */
  M.q1circuit = function (el) {
    var b = frame(el);
    b.innerHTML = '<div class="grid two"><div class="ctrls" data-c></div><div><svg class="viz" viewBox="0 0 640 400" data-s role="img" aria-label="Series-parallel thermal circuit"></svg><div data-ro></div></div></div>';
    var c = b.querySelector('[data-c]'), svg = b.querySelector('[data-s]'), ro = readout(b.querySelector('[data-ro]'));
    var kA = ctl(c, { label: '\\(k_A\\)', min: 1, max: 400, step: 1, value: 150, unit: 'W/m°C', on: render });
    var kB = ctl(c, { label: '\\(k_B\\)', min: 1, max: 400, step: 1, value: 30, unit: 'W/m°C', on: render });
    var kD = ctl(c, { label: '\\(k_D\\)', min: 1, max: 400, step: 1, value: 70, unit: 'W/m°C', on: render });
    var kC = ctl(c, { label: '\\(k_C\\)', min: 1, max: 400, step: 1, value: 50, unit: 'W/m°C', on: render });
    var T1 = ctl(c, { label: '\\(T_1\\)', min: 100, max: 600, step: 1, value: 370, unit: '°C', on: render });
    var T2 = ctl(c, { label: '\\(T_2\\)', min: 0, max: 100, step: 1, value: 66, unit: '°C', on: render });
    c.insertAdjacentHTML('beforeend', '<p style="font-size:.85rem;color:var(--muted);margin:0">الأبعاد ثابتة من السؤال: A و C مساحتهم 0.1 m²، و B و D كل وحدة 0.05 m².</p>');
    function render() {
      var RA = 0.025 / (kA.get() * 0.1), RB = 0.075 / (kB.get() * 0.05), RD = 0.075 / (kD.get() * 0.05), RC = 0.05 / (kC.get() * 0.1);
      var Rp = H.parallel(RB, RD), Rt = RA + Rp + RC, dT = T1.get() - T2.get(), q = dT / Rt;
      var Ta = T1.get() - q * RA, Tb = Ta - q * Rp, qB = (Ta - Tb) / RB, qD = (Ta - Tb) / RD;
      clear(svg);
      /* wall sketch */
      var y0 = 18, y1 = 150, xA = 120, xB = 170, xC = 330, xE = 400;
      var tf = function (t) { return (t - T2.get()) / (dT || 1); };
      S('rect', { x: xA, y: y0, width: xB - xA, height: y1 - y0, fill: tcolor(tf((T1.get() + Ta) / 2)), opacity: .55, style: 'stroke:var(--text)' }, svg);
      S('rect', { x: xB, y: y0, width: xC - xB, height: (y1 - y0) / 2, fill: tcolor(tf((Ta + Tb) / 2)), opacity: .45, style: 'stroke:var(--text)' }, svg);
      S('rect', { x: xB, y: (y0 + y1) / 2, width: xC - xB, height: (y1 - y0) / 2, fill: tcolor(tf((Ta + Tb) / 2)), opacity: .6, style: 'stroke:var(--text)' }, svg);
      S('rect', { x: xC, y: y0, width: xE - xC, height: y1 - y0, fill: tcolor(tf((Tb + T2.get()) / 2)), opacity: .55, style: 'stroke:var(--text)' }, svg);
      [['A', (xA + xB) / 2, (y0 + y1) / 2], ['B', (xB + xC) / 2, y0 + 38], ['D', (xB + xC) / 2, y1 - 26], ['C', (xC + xE) / 2, (y0 + y1) / 2]].forEach(function (p) {
        T(svg, p[1], p[2], p[0], { 'text-anchor': 'middle', style: 'font-weight:800;font-size:18px' });
      });
      T(svg, xA - 8, (y0 + y1) / 2, T1.get() + '°C', { 'text-anchor': 'end', style: 'font-weight:700;fill:var(--accent)' });
      T(svg, xE + 8, (y0 + y1) / 2, T2.get() + '°C', { style: 'font-weight:700;fill:var(--cold)' });
      T(svg, (xA + xB) / 2, y1 + 16, '2.5 cm', { class: 'tick', 'text-anchor': 'middle' });
      T(svg, (xB + xC) / 2, y1 + 16, '7.5 cm', { class: 'tick', 'text-anchor': 'middle' });
      T(svg, (xC + xE) / 2, y1 + 16, '5 cm', { class: 'tick', 'text-anchor': 'middle' });
      /* circuit */
      var cy = 290, up = 240, dn = 345, xa0 = 40, xa1 = 150, xs = 175, xp0 = 215, xp1 = 385, xm = 425, xc0 = 450, xc1 = 560, xe = 600;
      var wq = function (v) { return Math.max(1.5, Math.min(9, 9 * v / q)); };
      var st = 'fill:none;stroke:var(--text);stroke-width:2.2;stroke-linejoin:round';
      S('rect', { x: xs + 16, y: up - 34, width: xm - xs - 32, height: dn - up + 62, rx: 14, class: 'pulse', style: 'fill:var(--violet-soft);stroke:var(--violet);stroke-width:2;stroke-dasharray:6 5' }, svg);
      S('path', { d: zz(xa0 + 10, xa1, cy), style: st }, svg);
      S('path', { d: 'M' + xa1 + ' ' + cy + ' H' + xs + ' V' + up + ' H' + xp0 + ' M' + xs + ' ' + cy + ' V' + dn + ' H' + xp0, style: st }, svg);
      S('path', { d: zz(xp0, xp1, up), style: st }, svg);
      S('path', { d: zz(xp0, xp1, dn), style: st }, svg);
      S('path', { d: 'M' + xp1 + ' ' + up + ' H' + xm + ' V' + dn + ' H' + xp1 + ' M' + xm + ' ' + cy + ' H' + xc0, style: st }, svg);
      S('path', { d: zz(xc0, xc1, cy), style: st }, svg);
      S('line', { x1: xc1, x2: xe, y1: cy, y2: cy, style: st }, svg);
      /* flow arrows */
      S('line', { x1: xp0 + 8, x2: xp1 - 8, y1: up - 18, y2: up - 18, class: 'flow-arrow', style: 'stroke:var(--accent);stroke-dasharray:10 14;stroke-width:' + wq(qB) }, svg);
      S('line', { x1: xp0 + 8, x2: xp1 - 8, y1: dn + 18, y2: dn + 18, class: 'flow-arrow', style: 'stroke:var(--accent);stroke-dasharray:10 14;stroke-width:' + wq(qD) }, svg);
      S('line', { x1: xa0 + 14, x2: xa1 - 10, y1: cy - 22, y2: cy - 22, class: 'flow-arrow', style: 'stroke:var(--accent);stroke-dasharray:10 14;stroke-width:9' }, svg);
      S('line', { x1: xc0 + 10, x2: xc1 - 10, y1: cy - 22, y2: cy - 22, class: 'flow-arrow', style: 'stroke:var(--accent);stroke-dasharray:10 14;stroke-width:9' }, svg);
      [[xa0, T1.get(), 'T₁'], [xs, Ta, ''], [xm, Tb, ''], [xe, T2.get(), 'T₂']].forEach(function (n, i) {
        S('circle', { cx: n[0], cy: cy, r: 6, style: 'fill:' + (i === 0 ? 'var(--accent)' : i === 3 ? 'var(--cold)' : 'var(--text)') }, svg);
        T(svg, n[0] + (i === 1 ? -8 : i === 2 ? 8 : 0), i === 1 || i === 2 ? cy + 22 : cy + 26, (n[2] ? n[2] + ' ' : '') + fmt(n[1], 4) + '°C', { class: 'tick', 'text-anchor': i === 1 ? 'end' : i === 2 ? 'start' : 'middle', style: 'font-weight:700;fill:var(--text)' });
      });
      T(svg, (xa0 + xa1) / 2 + 5, cy + 26, 'R_A = ' + fmt(RA, 3), { class: 'tick', 'text-anchor': 'middle' });
      T(svg, (xp0 + xp1) / 2, up - 32, 'R_B = ' + fmt(RB, 3) + '   q_B = ' + fmt(qB, 4) + ' W', { class: 'tick', 'text-anchor': 'middle', style: 'fill:var(--text)' });
      T(svg, (xp0 + xp1) / 2, dn + 42, 'R_D = ' + fmt(RD, 3) + '   q_D = ' + fmt(qD, 4) + ' W', { class: 'tick', 'text-anchor': 'middle', style: 'fill:var(--text)' });
      T(svg, (xc0 + xc1) / 2, cy + 26, 'R_C = ' + fmt(RC, 3), { class: 'tick', 'text-anchor': 'middle' });
      T(svg, xm - 4, up - 40, 'B ∥ D', { 'text-anchor': 'end', style: 'font-weight:800;fill:var(--violet)' });
      ro([
        ['R_A', fmt(RA, 4) + ' °C/W'], ['R_B', fmt(RB, 4) + ' °C/W'], ['R_D', fmt(RD, 4) + ' °C/W'], ['R_C', fmt(RC, 4) + ' °C/W'],
        ['R_B∥R_D = 1/(1/R_B+1/R_D)', fmt(Rp, 4) + ' °C/W', 1], ['R_total', fmt(Rt, 4) + ' °C/W', 1],
        ['q = ΔT/R_total', fmt(q, 5) + ' W', 1], ['q_B + q_D', fmt(qB, 4) + ' + ' + fmt(qD, 4)]
      ]);
    }
    render();
    window.HTMath(el);
  };

  /* =====================================================================
     3) Pipe cross-section: hi -> wall -> insulation -> ho
     ===================================================================== */
  M.pipe = function (el) {
    var b = frame(el);
    b.innerHTML = '<div class="grid two"><div class="ctrls" data-c></div><div><svg class="viz" viewBox="0 0 640 330" data-s role="img" aria-label="Pipe cross-section with temperature profile"></svg><div data-share></div><div data-ro></div></div></div>';
    var c = b.querySelector('[data-c]'), svg = b.querySelector('[data-s]'), ro = readout(b.querySelector('[data-ro]')), share = b.querySelector('[data-share]');
    var pre = document.createElement('div'); pre.style.cssText = 'display:grid;gap:6px'; pre.innerHTML = '<b style="font-size:.88rem">أمثلة جاهزة:</b>'; c.appendChild(pre);
    var Ti, To, hi, ho, ri, tw, kw, ti, ki;
    seg(pre, [['tube', 'أنبوب الماء (U₀)'], ['ins', 'نفسه + عازل 2 سم'], ['crit', 'مثال الحرج']], 'tube', function (v) {
      if (v === 'tube') { Ti.set(50); To.set(20); hi.set(3500); ho.set(7.6); ri.set(1.25); tw.set(0.8); kw.set(16); ti.set(0); ki.set(0.17); }
      if (v === 'ins') { Ti.set(50); To.set(20); hi.set(3500); ho.set(7.6); ri.set(1.25); tw.set(0.8); kw.set(16); ti.set(2); ki.set(0.04); }
      if (v === 'crit') { Ti.set(200); To.set(20); hi.set(5000); ho.set(3); ri.set(2.45); tw.set(0.5); kw.set(40); ti.set(3.17); ki.set(0.17); }
      render();
    });
    Ti = ctl(c, { label: 'حرارة المائع الداخلي \\(T_A\\)', min: 0, max: 400, step: 1, value: 50, unit: '°C', on: render });
    To = ctl(c, { label: 'حرارة الهواء الخارجي \\(T_B\\)', min: -20, max: 100, step: 1, value: 20, unit: '°C', on: render });
    hi = ctl(c, { label: '\\(h_i\\) (داخل)', min: 1, max: 4, step: 0.01, value: 3500, log: true, unit: 'W/m²°C', on: render, f: function (v) { return fmt(v, 3); } });
    ho = ctl(c, { label: '\\(h_o\\) (خارج)', min: 0, max: 3, step: 0.01, value: 7.6, log: true, unit: 'W/m²°C', on: render, f: function (v) { return fmt(v, 3); } });
    ri = ctl(c, { label: 'نصف القطر الداخلي \\(r_i\\)', min: 0.2, max: 10, step: 0.05, value: 1.25, unit: 'cm', on: render });
    tw = ctl(c, { label: 'سمك جدار الأنبوب', min: 0.1, max: 20, step: 0.1, value: 0.8, unit: 'mm', on: render });
    kw = ctl(c, { label: '\\(k\\) جدار الأنبوب', min: 1, max: 400, step: 1, value: 16, unit: 'W/m°C', on: render });
    ti = ctl(c, { label: 'سمك العازل', min: 0, max: 10, step: 0.05, value: 0, unit: 'cm', on: render });
    ki = ctl(c, { label: '\\(k\\) العازل', min: 0.02, max: 1, step: 0.01, value: 0.17, unit: 'W/m°C', on: render });
    function render() {
      var r1 = ri.get() / 100, r2 = r1 + tw.get() / 1000, r3 = r2 + ti.get() / 100, L = 1;
      var Ri = 1 / (hi.get() * 2 * Math.PI * r1 * L), Rw = H.Rcyl(r1, r2, kw.get(), L), Rins = ti.get() > 0 ? H.Rcyl(r2, r3, ki.get(), L) : 0, Ro = 1 / (ho.get() * 2 * Math.PI * r3 * L);
      var Rt = Ri + Rw + Rins + Ro, dT = Ti.get() - To.get(), q = dT / Rt;
      var Tsi = Ti.get() - q * Ri, Tso = Tsi - q * Rw, Tins = Tso - q * Rins;
      var Ai = 2 * Math.PI * r1 * L, Ao = 2 * Math.PI * r3 * L;
      var Ui = 1 / (Ai * Rt), Uo = 1 / (Ao * Rt);
      var tf = function (t) { return (t - To.get()) / (dT || 1); };
      clear(svg);
      var cx = 160, cy = 165, Rmax = 140, sc = function (r) { return 22 + (Rmax - 22) * (r / r3); };
      S('circle', { cx: cx, cy: cy, r: Rmax + 12, fill: tcolor(0), opacity: .12 }, svg);
      if (r3 > r2) S('circle', { cx: cx, cy: cy, r: sc(r3), fill: tcolor(tf((Tso + Tins) / 2)), opacity: .75, style: 'stroke:var(--text);stroke-width:1' }, svg);
      S('circle', { cx: cx, cy: cy, r: sc(r2), fill: '#8a96a3', style: 'stroke:var(--text);stroke-width:1' }, svg);
      S('circle', { cx: cx, cy: cy, r: sc(r1), fill: tcolor(tf(Ti.get())), style: 'stroke:var(--text);stroke-width:1' }, svg);
      if (r3 > r2) {
        var hatch = S('circle', { cx: cx, cy: cy, r: (sc(r2) + sc(r3)) / 2, fill: 'none', style: 'stroke:rgba(255,255,255,.35);stroke-width:' + (sc(r3) - sc(r2)) + ';stroke-dasharray:2 6' }, svg);
      }
      T(svg, cx, cy + 4, 'T_A', { 'text-anchor': 'middle', style: 'font-weight:800;fill:#fff' });
      var qmaxRef = 1 / (1 / (hi.get() * Ai) + 1e-9);
      var wq = Math.max(1.5, Math.min(7, 1.5 + Math.log10(1 + q) * 1.6));
      for (var i = 0; i < 8; i++) {
        var a = i * Math.PI / 4 + Math.PI / 8, x1 = cx + Math.cos(a) * (sc(r1) - 6), y1 = cy + Math.sin(a) * (sc(r1) - 6), x2 = cx + Math.cos(a) * (Rmax + 6), y2 = cy + Math.sin(a) * (Rmax + 6);
        S('line', { x1: x1, y1: y1, x2: x2, y2: y2, class: 'flow-arrow', style: 'stroke:var(--accent);stroke-linecap:round;stroke-dasharray:8 16;stroke-width:' + wq, opacity: .85 }, svg);
      }
      T(svg, cx, 18, 'q/L = ' + fmt(q, 4) + ' W/m', { 'text-anchor': 'middle', style: 'font-weight:800;fill:var(--accent)' });
      /* T(r) profile */
      var p = new Plot(svg, { W: 640, H: 330, m: { l: 362, r: 14, t: 26, b: 44 }, x: [0, r3 * 100 * 1.25], y: [Math.min(To.get(), Ti.get()) - 2, Math.max(To.get(), Ti.get()) + 2], xl: 'r (cm)', yl: '' });
      T(svg, 370, 18, 'T(r) °C', { class: 'lab' });
      var pts = [[0, Ti.get()], [r1 * 100 * 0.8, Ti.get()], [r1 * 100, Tsi]];
      for (var j = 1; j <= 10; j++) { var r = r1 + (r2 - r1) * j / 10; pts.push([r * 100, Tsi - (Tsi - Tso) * Math.log(r / r1) / Math.log(r2 / r1)]); }
      if (r3 > r2) for (j = 1; j <= 24; j++) { r = r2 + (r3 - r2) * j / 24; pts.push([r * 100, Tso - (Tso - Tins) * Math.log(r / r2) / Math.log(r3 / r2)]); }
      pts.push([r3 * 100 * 1.08, To.get() + (Tins - To.get()) * 0.15]); pts.push([r3 * 100 * 1.25, To.get()]);
      S('rect', { x: p.sx(r1 * 100), y: p.m.t, width: Math.max(1, p.sx(r2 * 100) - p.sx(r1 * 100)), height: p.H - p.m.t - p.m.b, fill: '#8a96a3', opacity: .35 }, p.g);
      if (r3 > r2) S('rect', { x: p.sx(r2 * 100), y: p.m.t, width: p.sx(r3 * 100) - p.sx(r2 * 100), height: p.H - p.m.t - p.m.b, fill: '#e7c35a', opacity: .25 }, p.g);
      p.line(pts, 'stroke:var(--accent);stroke-width:2.6');
      /* share bar */
      var parts = [['1/hᵢAᵢ', Ri, '#e66a4a'], ['pipe wall', Rw, '#8a96a3'], ['insulation', Rins, '#e7c35a'], ['1/hₒAₒ', Ro, '#4a8be6']].filter(function (x) { return x[1] > 0; });
      share.innerHTML = '<div style="font-size:.85rem;font-weight:700;margin:6px 0 4px">حصة كل مقاومة — لاحظ مين المسيطر 👇</div><div style="display:flex;height:28px;border-radius:8px;overflow:hidden;direction:ltr">' +
        parts.map(function (x) { var pc = x[1] / Rt * 100; return '<div title="' + x[0] + ' ' + pc.toFixed(1) + '%" style="width:' + pc + '%;background:' + x[2] + ';color:#111;font:700 11px Inter;display:grid;place-items:center;overflow:hidden;white-space:nowrap">' + (pc > 12 ? x[0] + ' ' + pc.toFixed(0) + '%' : '') + '</div>'; }).join('') + '</div>';
      ro([
        ['Rᵢ = 1/(hᵢ2πrᵢL)', fmt(Ri, 4) + ' °C/W'], ['R wall = ln(r₂/r₁)/2πkL', fmt(Rw, 4) + ' °C/W'], ['R insulation', fmt(Rins, 4) + ' °C/W'], ['Rₒ = 1/(hₒ2πrₒL)', fmt(Ro, 4) + ' °C/W'],
        ['ΣR', fmt(Rt, 4) + ' °C/W', 1], ['q (L = 1 m)', fmt(q, 4) + ' W', 1], ['Uᵢ = 1/(AᵢΣR)', fmt(Ui, 4) + ' W/m²°C', 1], ['Uₒ = 1/(AₒΣR)', fmt(Uo, 4) + ' W/m²°C', 1],
        ['T inner surface', fmt(Tsi, 4) + ' °C'], ['T pipe outer', fmt(Tso, 4) + ' °C'], ['T outer surface', fmt(Tins, 4) + ' °C'], ['UᵢAᵢ = UₒAₒ ?', fmt(Ui * Ai, 4) + ' = ' + fmt(Uo * Ao, 4)]
      ]);
    }
    render();
    window.HTMath(el);
  };

  /* =====================================================================
     4) Critical radius
     ===================================================================== */
  M.critical = function (el) {
    var b = frame(el);
    b.innerHTML = '<div class="grid two"><div class="ctrls" data-c></div><div><svg class="viz" viewBox="0 0 640 330" data-s role="img" aria-label="Heat loss versus outer radius" style="touch-action:none;cursor:ew-resize"></svg><div data-v></div><div data-ro></div></div></div>';
    var c = b.querySelector('[data-c]'), svg = b.querySelector('[data-s]'), ro = readout(b.querySelector('[data-ro]')), verdict = b.querySelector('[data-v]');
    var k = ctl(c, { label: '\\(k\\) العازل', min: 0.02, max: 1, step: 0.01, value: 0.17, unit: 'W/m°C', on: render });
    var h = ctl(c, { label: '\\(h\\) الخارجي', min: 1, max: 40, step: 0.5, value: 3, unit: 'W/m²°C', on: render });
    var ri = ctl(c, { label: 'نصف قطر الأنبوب \\(r_i\\)', min: 0.2, max: 8, step: 0.05, value: 2.5, unit: 'cm', on: render });
    var Ti = ctl(c, { label: '\\(T_i\\)', min: 30, max: 400, step: 1, value: 200, unit: '°C', on: render });
    var Tinf = ctl(c, { label: '\\(T_\\infty\\)', min: -10, max: 50, step: 1, value: 20, unit: '°C', on: render });
    var rof = ctl(c, { label: '🖐️ نصف القطر الخارجي للعازل \\(r_o\\) (اسحب هنا أو على الرسم)', min: 0, max: 1, step: 0.001, value: 0.5, on: render, f: function () { return fmt(curRo * 100, 4) + ' cm'; } });
    var curRo = 0.0567, xmax = 0.17;
    function qL(r) { var r1 = ri.get() / 100; return 2 * Math.PI * (Ti.get() - Tinf.get()) / (Math.log(r / r1) / k.get() + 1 / (r * h.get())); }
    function render() {
      var r1 = ri.get() / 100, rc = k.get() / h.get();
      xmax = Math.max(3 * rc, 4 * r1);
      curRo = r1 + (xmax - r1) * rof.get();
      rof.set(rof.get());
      var pts = [], ymax = 0, ymin = Infinity;
      for (var i = 0; i <= 160; i++) { var r = r1 + (xmax - r1) * i / 160; var v = qL(r); pts.push([r * 100, v]); ymax = Math.max(ymax, v); ymin = Math.min(ymin, v); }
      var qbare = qL(r1);
      clear(svg);
      var p = new Plot(svg, { x: [r1 * 100, xmax * 100], y: [0, ymax * 1.12], xl: 'outer radius of insulation  r_o (cm)', yl: 'q/L (W/m)' });
      S('line', { x1: p.sx(r1 * 100), x2: p.sx(xmax * 100), y1: p.sy(qbare), y2: p.sy(qbare), style: 'stroke:var(--muted);stroke-dasharray:5 5;stroke-width:1.5' }, p.g);
      T(p.g, p.sx(xmax * 100) - 4, p.sy(qbare) - 6, 'bare pipe', { class: 'tick', 'text-anchor': 'end' });
      /* shade region where insulation increases loss */
      var cross = null;
      for (i = 1; i < pts.length; i++) if (pts[i][1] < qbare && pts[i - 1][1] >= qbare) { cross = pts[i][0]; break; }
      if (rc > r1) {
        var x2 = cross || xmax * 100;
        S('rect', { x: p.sx(r1 * 100), y: p.m.t, width: p.sx(x2) - p.sx(r1 * 100), height: p.H - p.m.t - p.m.b, style: 'fill:var(--danger)', opacity: .08 }, p.g);
        T(p.g, p.sx(r1 * 100) + 6, p.H - p.m.b - 8, 'insulation INCREASES loss', { class: 'tick', style: 'fill:var(--danger);font-weight:700' });
        S('line', { x1: p.sx(rc * 100), x2: p.sx(rc * 100), y1: p.m.t, y2: p.H - p.m.b, style: 'stroke:var(--violet);stroke-width:2;stroke-dasharray:6 4' }, p.g);
        T(p.g, p.sx(rc * 100) + 6, p.m.t + 12, 'r_c = k/h = ' + fmt(rc * 100, 3) + ' cm', { style: 'font-size:12px;font-weight:800;fill:var(--violet)' });
      }
      p.line(pts, 'stroke:var(--accent);stroke-width:3');
      S('circle', { cx: p.sx(curRo * 100), cy: p.sy(qL(curRo)), r: 8, style: 'fill:var(--accent);stroke:var(--surface);stroke-width:3' }, p.g);
      var qc = qL(curRo);
      verdict.innerHTML = '<div class="callout ' + (qc > qbare ? 'danger' : 'tip') + '" style="margin:8px 0">' +
        (rc <= r1 ? '✅ هنا \\(r_c \\le r_i\\): أي سمك عازل راح يقلل الفقد من أول طبقة.' :
          (qc > qbare ? '🔥 العازل بهذا السمك <b>يزيد</b> الفقد! <span class="num">(' + fmt(qc, 4) + ' &gt; ' + fmt(qbare, 4) + ' W/m)</span> — لأن \\(r_o\\) بعده ما عبر النقطة اللي يرجع بيها الفقد لقيمة الأنبوب العاري.' :
            '✅ العازل هنا يقلل الفقد <span class="num">(' + fmt(qc, 4) + ' &lt; ' + fmt(qbare, 4) + ' W/m)</span>.')) + '</div>';
      window.HTMath(verdict);
      ro([['r_c = k/h', fmt(rc * 100, 4) + ' cm', 1], ['q/L at r_c (max)', rc > r1 ? fmt(qL(rc), 4) + ' W/m' : '— (r_c < r_i)', 1], ['q/L bare pipe', fmt(qbare, 4) + ' W/m'], ['q/L at your r_o', fmt(qc, 4) + ' W/m', 1], ['insulation thickness', fmt((curRo - r1) * 100, 3) + ' cm']]);
      svg._p = p;
    }
    function drag(e) {
      var p = svg._p; if (!p) return;
      var pt = svgPoint(svg, e), r = p.ix(pt.x) / 100, r1 = ri.get() / 100;
      var f = (r - r1) / (xmax - r1); rof.set(Math.max(0, Math.min(1, f))); render(); e.preventDefault();
    }
    var down = false;
    svg.addEventListener('pointerdown', function (e) { down = true; svg.setPointerCapture(e.pointerId); drag(e); });
    svg.addEventListener('pointermove', function (e) { if (down) drag(e); });
    svg.addEventListener('pointerup', function () { down = false; });
    /* start at r_c */
    (function () { var r1 = ri.get() / 100, rc = k.get() / h.get(), xm = Math.max(3 * rc, 4 * r1); rof.set((rc - r1) / (xm - r1)); })();
    render();
    window.HTMath(el);
  };

  /* =====================================================================
     5) Heat generation: wall / cylinder / sphere
     ===================================================================== */
  M.hgen = function (el) {
    var b = frame(el);
    b.innerHTML = '<div class="grid two"><div class="ctrls" data-c></div><div><div data-eq class="eq"></div><svg class="viz" viewBox="0 0 640 320" data-s role="img" aria-label="Parabolic temperature profile"></svg><div data-cmp></div><div data-ro></div></div></div>';
    var c = b.querySelector('[data-c]'), svg = b.querySelector('[data-s]'), ro = readout(b.querySelector('[data-ro]')), eq = b.querySelector('[data-eq]'), cmp = b.querySelector('[data-cmp]');
    var A = function (n, d) { var v = el.getAttribute('data-' + n); return v == null ? d : (isNaN(+v) ? v : +v); };
    var geo = A('geo', 'cyl'), mode = A('mode', 'tw');
    seg(c, [['wall', 'جدار (2)'], ['cyl', 'أسطوانة (4)'], ['sph', 'كرة (6)']], geo, function (v) { geo = v; render(); });
    seg(c, [['tw', '\\(T_w\\) معلومة'], ['h', 'أحسب \\(T_w\\) من \\(h\\)']], mode, function (v) { mode = v; render(); });
    var qg = ctl(c, { label: 'التوليد الحجمي \\(\\dot q\\)', min: 4, max: 9.5, step: 0.01, value: A('q', 3.18e8), log: true, unit: 'W/m³', on: render, f: function (v) { return v.toExponential(2); } });
    var k = ctl(c, { label: '\\(k\\)', min: 0.5, max: 400, step: 0.5, value: A('k', 15), unit: 'W/m°C', on: render });
    var R = ctl(c, { label: 'نصف القطر \\(R\\) (أو نصف السمك \\(L\\))', min: 0.5, max: 50, step: 0.1, value: A('r', 2), unit: 'mm', on: render });
    var Tw = ctl(c, { label: '\\(T_w\\)', min: 0, max: 500, step: 1, value: A('tw', 105), unit: '°C', on: render });
    var h = ctl(c, { label: '\\(h\\)', min: 1, max: 10000, step: 1, value: A('h', 4000), unit: 'W/m²°C', on: render });
    var Tinf = ctl(c, { label: '\\(T_\\infty\\)', min: 0, max: 300, step: 1, value: A('tinf', 110), unit: '°C', on: render });
    var N = { wall: 2, cyl: 4, sph: 6 }, NH = { wall: 1, cyl: 2, sph: 3 };
    function render() {
      Tw.el.style.display = mode === 'tw' ? '' : 'none';
      h.el.style.display = Tinf.el.style.display = mode === 'h' ? '' : 'none';
      var n = N[geo], Rm = R.get() / 1000, q = qg.get(), kk = k.get();
      var tw = mode === 'tw' ? Tw.get() : Tinf.get() + q * Rm / (NH[geo] * h.get());
      var dTc = q * Rm * Rm / (n * kk), T0 = tw + dTc;
      var tx = function (v, s) { var f = fmt(v, s); var i = f.indexOf('×10^'); return i < 0 ? f.replace(/,/g, '{,}') : f.slice(0, i) + '\\times10^{' + f.slice(i + 4) + '}'; };
      eq.innerHTML = window.HTtex('T_0=\\frac{\\dot q\\,R^2}{' + n + 'k}+T_w=\\frac{(' + tx(q, 3) + ')(' + tx(Rm, 3) + ')^2}{' + n + '(' + tx(kk, 3) + ')}+' + tx(tw, 4) + '=\\mathbf{' + tx(T0, 5) + '\\ {}^\\circ C}', true);
      clear(svg);
      var p = new Plot(svg, { x: [-R.get(), R.get()], y: [tw - dTc * 0.15 - (mode === 'h' ? (tw - Tinf.get()) * 0.0 : 0), T0 + dTc * 0.2], xl: (geo === 'wall' ? 'x' : 'r') + ' (mm)', yl: 'T (°C)' });
      /* body tint */
      var steps = 40;
      for (var i = 0; i < steps; i++) {
        var xa = -R.get() + 2 * R.get() * i / steps, xb = xa + 2 * R.get() / steps, xm = (xa + xb) / 2;
        var t = T0 - dTc * (xm / R.get()) * (xm / R.get());
        S('rect', { x: p.sx(xa), y: p.m.t, width: p.sx(xb) - p.sx(xa) + .5, height: p.H - p.m.t - p.m.b, fill: tcolor((t - tw) / (dTc || 1) * 0.8 + 0.2), opacity: .28 }, p.g);
      }
      var pts = [];
      for (i = 0; i <= 120; i++) { var x = -R.get() + 2 * R.get() * i / 120; pts.push([x, T0 - dTc * (x / R.get()) * (x / R.get())]); }
      p.line(pts, 'stroke:var(--accent);stroke-width:3');
      S('circle', { cx: p.sx(0), cy: p.sy(T0), r: 6, style: 'fill:var(--accent)' }, p.g);
      T(p.g, p.sx(0), p.sy(T0) - 12, 'T₀ = ' + fmt(T0, 5) + ' °C (max)', { 'text-anchor': 'middle', style: 'font-weight:800;font-size:13px;fill:var(--accent)' });
      [-R.get(), R.get()].forEach(function (x, j) {
        S('circle', { cx: p.sx(x), cy: p.sy(tw), r: 5, style: 'fill:var(--cold)' }, p.g);
        T(p.g, p.sx(x) + (j ? -6 : 6), p.sy(tw) - 8, 'T_w ' + fmt(tw, 4), { class: 'tick', 'text-anchor': j ? 'end' : 'start', style: 'fill:var(--cold);font-weight:700' });
      });
      /* compare 2-4-6 */
      var vals = [['wall', 2], ['cylinder', 4], ['sphere', 6]].map(function (g) { return [g[0], g[1], q * Rm * Rm / (g[1] * kk)]; });
      var mx = vals[0][2];
      cmp.innerHTML = '<div style="font-size:.85rem;font-weight:700;margin:4px 0">نفس \\(\\dot q, k, R\\): كم يرتفع المركز فوق السطح؟ (قاعدة 2‑4‑6)</div>' + vals.map(function (v) {
        return '<div style="display:flex;align-items:center;gap:8px;direction:ltr;font:600 12px Inter;margin:3px 0"><span style="width:70px">' + v[0] + ' /' + v[1] + 'k</span><div style="flex:1;background:var(--surface-2);border-radius:6px;height:16px"><div style="height:100%;width:' + (v[2] / mx * 100) + '%;background:' + (N[geo] === v[1] ? 'var(--accent)' : 'var(--surface-3)') + ';border-radius:6px"></div></div><span style="width:80px;text-align:right">' + fmt(v[2], 4) + ' °C</span></div>';
      }).join('');
      window.HTMath(cmp);
      var items = [['T₀ − T_w = q̇R²/' + n + 'k', fmt(dTc, 4) + ' °C', 1], ['T₀ (center, max)', fmt(T0, 5) + ' °C', 1], ['T_w (surface)', fmt(tw, 5) + ' °C']];
      if (mode === 'h') items.push(['T_w = T∞ + q̇R/' + NH[geo] + 'h', fmt(tw, 5) + ' °C']);
      var vol = geo === 'wall' ? 2 * Rm : geo === 'cyl' ? Math.PI * Rm * Rm : 4 / 3 * Math.PI * Rm * Rm * Rm;
      items.push(['q generated ' + (geo === 'wall' ? '(per m² of face, both halves)' : geo === 'cyl' ? '(per m length)' : '(whole sphere)'), fmt(q * vol, 4) + (geo === 'wall' ? ' W/m²' : geo === 'cyl' ? ' W/m' : ' W')]);
      ro(items);
    }
    render();
    window.HTMath(el);
  };

  /* =====================================================================
     6) Single fin
     ===================================================================== */
  M.fin = function (el) {
    var b = frame(el);
    b.innerHTML = '<div class="grid two"><div class="ctrls" data-c></div><div><svg class="viz" viewBox="0 0 640 120" data-bar role="img" aria-label="Fin temperature colour map"></svg><svg class="viz" viewBox="0 0 640 300" data-s role="img" aria-label="theta over theta0 along the fin"></svg><div data-ro></div></div></div>';
    var c = b.querySelector('[data-c]'), bar = b.querySelector('[data-bar]'), svg = b.querySelector('[data-s]'), ro = readout(b.querySelector('[data-ro]'));
    var shape = 'rect', cs = 3;
    seg(c, [['rect', 'مستطيلة رقيقة'], ['pin', 'دبوس (أسطواني)']], shape, function (v) { shape = v; tt.el.querySelector('label').innerHTML = v === 'rect' ? 'السمك \\(t\\)' : 'القطر \\(d\\)'; window.HTMath(tt.el); render(); });
    seg(c, [['1', 'Case 1 طويلة جداً'], ['2', 'Case 2 نهاية معزولة'], ['3', 'Case 3 حمل من النهاية']], '3', function (v) { cs = +v; render(); });
    var h = ctl(c, { label: '\\(h\\)', min: 1, max: 300, step: 0.5, value: 10, unit: 'W/m²°C', on: render });
    var k = ctl(c, { label: '\\(k\\)', min: 5, max: 400, step: 1, value: 200, unit: 'W/m°C', on: render });
    var L = ctl(c, { label: 'الطول \\(L\\)', min: 0.5, max: 40, step: 0.1, value: 7.5, unit: 'cm', on: render });
    var tt = ctl(c, { label: 'السمك \\(t\\)', min: 0.2, max: 25, step: 0.1, value: 3, unit: 'mm', on: render });
    var T0 = ctl(c, { label: '\\(T_0\\) القاعدة', min: 30, max: 500, step: 1, value: 300, unit: '°C', on: render });
    var Tf = ctl(c, { label: '\\(T_\\infty\\)', min: 0, max: 100, step: 1, value: 50, unit: '°C', on: render });
    c.insertAdjacentHTML('beforeend', '<p style="font-size:.82rem;color:var(--muted);margin:0">الزعنفة المستطيلة محسوبة لكل 1 m عرض (z = 1 m) مثل مثال الألمنيوم بالمحاضرة.</p>');
    var grad = null;
    function render() {
      var LL = L.get() / 100, t = tt.get() / 1000, A, P, m, Lc;
      if (shape === 'rect') { A = 1 * t; P = 2 * 1; m = Math.sqrt(2 * h.get() / (k.get() * t)); Lc = LL + t / 2; }
      else { A = Math.PI * t * t / 4; P = Math.PI * t; m = Math.sqrt(4 * h.get() / (k.get() * t)); Lc = LL + t / 4; }
      var th0 = T0.get() - Tf.get(), o = { h: h.get(), P: P, k: k.get(), A: A, theta0: th0, L: LL };
      var q1 = H.finQ(1, o), q2 = H.finQ(2, o), q3 = H.finQ(3, o), q2c = Math.sqrt(h.get() * P * k.get() * A) * th0 * Math.tanh(m * Lc);
      var hmk = h.get() / (m * k.get());
      var qs = { 1: q1, 2: q2, 3: q3 };
      var eta = H.etaRect(m * Lc);
      /* colour bar */
      clear(bar);
      var defs = S('defs', {}, bar), gid = 'g' + Math.random().toString(36).slice(2, 7);
      grad = S('linearGradient', { id: gid, x1: 0, x2: 1, y1: 0, y2: 0 }, defs);
      for (var i = 0; i <= 20; i++) {
        var f = H.finProfile(cs, m, LL, LL * i / 20, hmk);
        S('stop', { offset: (i / 20 * 100) + '%', 'stop-color': tcolor(f) }, grad);
      }
      S('rect', { x: 10, y: 10, width: 34, height: 100, rx: 4, fill: tcolor(1), style: 'stroke:var(--text)' }, bar);
      T(bar, 27, 64, 'base', { 'text-anchor': 'middle', transform: 'rotate(-90 27 60)', style: 'font-size:11px;fill:#fff;font-weight:700' });
      var fh = shape === 'rect' ? 26 : 34;
      S('rect', { x: 44, y: 60 - fh / 2, width: 560, height: fh, rx: shape === 'pin' ? fh / 2 : 3, fill: 'url(#' + gid + ')', style: 'stroke:var(--text);stroke-width:1' }, bar);
      for (i = 0; i < 7; i++) {
        var xx = 70 + i * 80;
        S('path', { d: 'M' + xx + ' ' + (60 - fh / 2 - 4) + ' v-22', class: 'flow-arrow', style: 'stroke:var(--accent);stroke-width:2;stroke-dasharray:4 6', opacity: Math.max(.2, H.finProfile(cs, m, LL, LL * (xx - 44) / 560, hmk)) }, bar);
        S('path', { d: 'M' + xx + ' ' + (60 + fh / 2 + 4) + ' v22', class: 'flow-arrow', style: 'stroke:var(--accent);stroke-width:2;stroke-dasharray:4 6', opacity: Math.max(.2, H.finProfile(cs, m, LL, LL * (xx - 44) / 560, hmk)) }, bar);
      }
      T(bar, 610, 64, 'tip', { style: 'font-size:11px', class: 'tick' });
      T(bar, 50, 112, 'T₀ = ' + T0.get() + '°C', { class: 'tick' });
      T(bar, 600, 112, 'T_tip = ' + fmt(Tf.get() + th0 * H.finProfile(cs, m, LL, LL, hmk), 4) + '°C', { class: 'tick', 'text-anchor': 'end' });
      /* theta plot */
      clear(svg);
      var p = new Plot(svg, { H: 300, x: [0, L.get()], y: [0, 1], xl: 'x (cm)', yl: 'θ/θ₀' });
      var cols = { 1: 'var(--cold)', 2: 'var(--ok)', 3: 'var(--accent)' };
      [1, 2, 3].forEach(function (cc) {
        var pts = [];
        for (var j = 0; j <= 100; j++) { var x = LL * j / 100; pts.push([x * 100, H.finProfile(cc, m, LL, x, hmk)]); }
        p.line(pts, 'stroke:' + cols[cc] + ';stroke-width:' + (cc === cs ? 3.5 : 1.8) + (cc === cs ? '' : ';stroke-dasharray:6 5;opacity:.8'));
      });
      [['Case 1: e^(−mx)', 1], ['Case 2: insulated tip', 2], ['Case 3: convecting tip', 3]].forEach(function (l, j) {
        T(p.g, p.sx(L.get()) - 6, p.m.t + 14 + j * 16, l[0], { 'text-anchor': 'end', style: 'font-size:12px;font-weight:' + (l[1] === cs ? 800 : 500) + ';fill:' + cols[l[1]] });
      });
      ro([
        ['m = √(hP/kA)', fmt(m, 4) + ' 1/m', 1], ['mL', fmt(m * LL, 4)], ['L_c = L + ' + (shape === 'rect' ? 't/2' : 'd/4'), fmt(Lc * 100, 4) + ' cm'], ['mL_c', fmt(m * Lc, 4)],
        ['q Case 1 = √(hPkA)·θ₀', fmt(q1, 4) + ' W', cs === 1], ['q Case 2 = …·tanh(mL)', fmt(q2, 4) + ' W', cs === 2], ['q Case 3 (exact)', fmt(q3, 4) + ' W', cs === 3], ['q Case 2 with L_c (≈ Case 3)', fmt(q2c, 4) + ' W'],
        ['η = tanh(mL_c)/mL_c', fmt(eta * 100, 3) + ' %', 1], ['is it "long"? (mL > 3?)', m * LL > 3 ? 'yes ⇒ Case 1 OK' : 'no']
      ]);
    }
    render();
    window.HTMath(el);
  };

  /* =====================================================================
     Efficiency chart (Figures 1 & 2), shared by fig1, fig2, finnedtube
     ===================================================================== */
  var FIG2_COLS = ['#d9481f', '#e08a1e', '#2f9e6b', '#2563b8', '#7c4dd6'];
  function effChart(svg, kind, opts) {
    opts = opts || {};
    clear(svg);
    var xmax = kind === 1 ? 2.5 : 3;
    var p = new Plot(svg, { W: 640, H: 340, x: [0, xmax], y: [0, 1], xt: 0.5, yt: 0.1, xl: 'L_c^{3/2} (h / k A_m)^{1/2}', yl: 'Fin efficiency η_f' });
    var curves = [];
    if (kind === 1) {
      curves.push({ name: 'rectangular', f: function (x) { return H.etaRectFromX(x); }, col: '#d9481f' });
      curves.push({ name: 'triangular', f: function (x) { return H.etaTriangular(x); }, col: '#2563b8' });
    } else {
      [1, 2, 3, 4, 5].forEach(function (r, i) { curves.push({ name: 'r2c/r1 = ' + r, r: r, f: function (x) { return H.etaAnnularFromX(x, r); }, col: FIG2_COLS[i] }); });
      if (opts.ratio && [1, 2, 3, 4, 5].indexOf(opts.ratio) < 0) curves.push({ name: 'r2c/r1 = ' + fmt(opts.ratio, 3), f: function (x) { return H.etaAnnularFromX(x, opts.ratio); }, col: 'var(--text)', dash: true });
    }
    curves.forEach(function (cv) {
      var pts = [];
      for (var i = 0; i <= 150; i++) { var x = xmax * i / 150; pts.push([x, cv.f(x)]); }
      p.line(pts, 'stroke:' + cv.col + ';stroke-width:' + (cv.dash ? 2.5 : 2.2) + (cv.dash ? ';stroke-dasharray:7 5' : ''));
      if (kind === 2 && cv.r) T(p.g, p.sx(xmax) - 2, p.sy(cv.f(xmax)) - 4, String(cv.r), { 'text-anchor': 'end', style: 'font-size:12px;font-weight:800;fill:' + cv.col });
    });
    if (kind === 1) {
      T(p.g, p.sx(2.45), p.sy(H.etaTriangular(2.45)) - 8, 'triangular', { 'text-anchor': 'end', style: 'font-size:12px;font-weight:700;fill:#2563b8' });
      T(p.g, p.sx(2.45), p.sy(H.etaRectFromX(2.45)) + 16, 'rectangular', { 'text-anchor': 'end', style: 'font-size:12px;font-weight:700;fill:#d9481f' });
    } else {
      T(p.g, p.sx(2.2), p.sy(0.62), 'r2c / r1', { style: 'font-size:12px;font-weight:700;fill:var(--muted)' });
    }
    var hov = S('g', { style: 'pointer-events:none' }, svg);
    if (opts.point) {
      var px = p.sx(Math.min(opts.point[0], xmax)), py = p.sy(opts.point[1]);
      S('line', { x1: px, x2: px, y1: p.sy(0), y2: py, style: 'stroke:var(--accent);stroke-dasharray:4 4;stroke-width:1.5' }, svg);
      S('line', { x1: p.sx(0), x2: px, y1: py, y2: py, style: 'stroke:var(--accent);stroke-dasharray:4 4;stroke-width:1.5' }, svg);
      S('circle', { cx: px, cy: py, r: 7, class: 'pulse', style: 'fill:var(--accent);stroke:var(--surface);stroke-width:3' }, svg);
      T(svg, px + 10, py - 10, 'η = ' + fmt(opts.point[1] * 100, 3) + '%', { style: 'font-weight:800;font-size:13px;fill:var(--accent)' });
    }
    return { p: p, curves: curves, hov: hov, xmax: xmax };
  }
  function attachHover(svg, wrap, ch) {
    var tip = document.createElement('div'); tip.className = 'chart-tip'; tip.style.display = 'none'; wrap.appendChild(tip);
    function move(e) {
      var c = svg._ch; if (!c) return;
      var pt = svgPoint(svg, e), x = c.p.ix(pt.x);
      if (x < 0 || x > c.xmax) { tip.style.display = 'none'; clear(c.hov); return; }
      clear(c.hov);
      S('line', { x1: c.p.sx(x), x2: c.p.sx(x), y1: c.p.m.t, y2: c.p.H - c.p.m.b, style: 'stroke:var(--muted);stroke-width:1' }, c.hov);
      var html = '<b>x = ' + x.toFixed(3) + '</b>';
      c.curves.forEach(function (cv) {
        var v = cv.f(x);
        S('circle', { cx: c.p.sx(x), cy: c.p.sy(v), r: 4.5, style: 'fill:' + cv.col + ';stroke:var(--surface);stroke-width:2' }, c.hov);
        html += '<br><span style="color:' + cv.col + '">●</span> ' + cv.name + ': <b>' + (v * 100).toFixed(1) + '%</b>';
      });
      tip.innerHTML = html; tip.style.display = '';
      var r = svg.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
      var src = e.touches ? e.touches[0] : e;
      var left = src.clientX - wr.left + 14, top = src.clientY - wr.top - 10;
      if (left > wr.width - 190) left = src.clientX - wr.left - 190;
      tip.style.left = left + 'px'; tip.style.top = Math.max(0, top) + 'px';
    }
    svg.addEventListener('pointermove', move);
    svg.addEventListener('pointerdown', move);
    svg.addEventListener('pointerleave', function () { tip.style.display = 'none'; if (svg._ch) clear(svg._ch.hov); });
  }

  M.fig1 = function (el) {
    var b = frame(el);
    b.innerHTML = '<div class="rel" data-w><svg class="viz" viewBox="0 0 640 340" data-s role="img" aria-label="Figure 1: efficiency of straight fins" style="touch-action:pan-y"></svg></div><div class="ctrls" data-c style="margin-top:8px"></div><div data-ro></div>';
    var svg = b.querySelector('[data-s]'), c = b.querySelector('[data-c]'), ro = readout(b.querySelector('[data-ro]'));
    var X = ctl(c, { label: 'قيمة المحور الأفقي \\(L_c^{3/2}(h/kA_m)^{1/2}\\)', min: 0, max: 2.5, step: 0.005, value: 0.5, on: render });
    function render() {
      var x = X.get(), er = H.etaRectFromX(x), et = H.etaTriangular(x);
      svg._ch = effChart(svg, 1, { point: [x, er] });
      ro([['η rectangular = tanh(mL_c)/mL_c', fmt(er * 100, 4) + ' %', 1], ['η triangular', fmt(et * 100, 4) + ' %'], ['mL_c = √2 · x', fmt(x * Math.SQRT2, 4)]]);
    }
    attachHover(svg, b.querySelector('[data-w]'));
    render(); window.HTMath(el);
  };
  M.fig2 = function (el) {
    var b = frame(el);
    b.innerHTML = '<div class="rel" data-w><svg class="viz" viewBox="0 0 640 340" data-s role="img" aria-label="Figure 2: efficiency of circumferential fins" style="touch-action:pan-y"></svg></div><div class="ctrls" data-c style="margin-top:8px"></div><div data-ro></div>';
    var svg = b.querySelector('[data-s]'), c = b.querySelector('[data-c]'), ro = readout(b.querySelector('[data-ro]'));
    var X = ctl(c, { label: 'المحور الأفقي \\(L_c^{3/2}(h/kA_m)^{1/2}\\)', min: 0, max: 3, step: 0.001, value: +(el.getAttribute('data-x') || 0.395), on: render });
    var Rr = ctl(c, { label: 'النسبة \\(r_{2c}/r_1\\)', min: 1, max: 5, step: 0.01, value: +(el.getAttribute('data-r') || 2.24), on: render });
    function render() {
      var x = X.get(), r = Rr.get(), e = H.etaAnnularFromX(x, r);
      svg._ch = effChart(svg, 2, { ratio: r, point: [x, e] });
      ro([['η (exact, Bessel)', fmt(e * 100, 4) + ' %', 1], ['r2c / r1', fmt(r, 3)], ['x', fmt(x, 4)]]);
    }
    attachHover(svg, b.querySelector('[data-w]'));
    render(); window.HTMath(el);
  };

  /* =====================================================================
     7) Finned tube (pseudo-3D)
     ===================================================================== */
  M.finnedtube = function (el) {
    var b = frame(el);
    b.innerHTML = '<div class="grid two"><div class="ctrls" data-c></div><div><svg class="viz" viewBox="0 0 640 250" data-t role="img" aria-label="Finned tube drawing"></svg><div data-ro></div><div class="rel" data-w><svg class="viz" viewBox="0 0 640 340" data-s role="img" aria-label="Operating point on Figure 2" style="touch-action:pan-y"></svg></div></div></div>';
    var c = b.querySelector('[data-c]'), tsvg = b.querySelector('[data-t]'), svg = b.querySelector('[data-s]'), ro = readout(b.querySelector('[data-ro]'));
    var pre = document.createElement('div'); pre.style.cssText = 'display:grid;gap:6px'; pre.innerHTML = '<b style="font-size:.88rem">أمثلة جاهزة:</b>'; c.appendChild(pre);
    var d, D, t, s, h, k, T0, Tf;
    seg(pre, [['q5', 'Q5 (أنبوب البخار)'], ['q4', 'Q4 (100 زعنفة)']], 'q5', function (v) {
      if (v === 'q5') { d.set(3); D.set(6); t.set(2); s.set(3); h.set(60); k.set(180); T0.set(120); Tf.set(25); }
      else { d.set(2.5); D.set(4.5); t.set(2); s.set(8); h.set(50); k.set(204); T0.set(180); Tf.set(20); }
      render();
    });
    d = ctl(c, { label: 'قطر الأنبوب \\(d = 2r_1\\)', min: 1, max: 10, step: 0.1, value: 3, unit: 'cm', on: render });
    D = ctl(c, { label: 'القطر الخارجي للزعنفة \\(2r_2\\)', min: 1.5, max: 20, step: 0.1, value: 6, unit: 'cm', on: render });
    t = ctl(c, { label: 'سمك الزعنفة \\(t\\)', min: 0.2, max: 6, step: 0.1, value: 2, unit: 'mm', on: render });
    s = ctl(c, { label: 'المسافة بين الزعانف \\(s\\)', min: 0.5, max: 50, step: 0.5, value: 3, unit: 'mm', on: render });
    h = ctl(c, { label: '\\(h\\)', min: 5, max: 300, step: 1, value: 60, unit: 'W/m²°C', on: render });
    k = ctl(c, { label: '\\(k\\)', min: 10, max: 400, step: 1, value: 180, unit: 'W/m°C', on: render });
    T0 = ctl(c, { label: '\\(T_0\\)', min: 40, max: 400, step: 1, value: 120, unit: '°C', on: render });
    Tf = ctl(c, { label: '\\(T_\\infty\\)', min: 0, max: 60, step: 1, value: 25, unit: '°C', on: render });
    c.insertAdjacentHTML('beforeend', '<p style="font-size:.82rem;color:var(--muted);margin:0">طول الأنبوب 1 m. عدد الزعانف = 1/(s+t) (طريقة Q5).</p>');
    function render() {
      if (D.get() <= d.get() + 0.05) D.set(d.get() + 0.1);
      var r1 = d.get() / 200, r2 = D.get() / 200, tt = t.get() / 1000, ss = s.get() / 1000, th = T0.get() - Tf.get();
      var n = Math.floor(1 / (ss + tt) + 1e-9), L = r2 - r1, Lc = L + tt / 2, r2c = r1 + Lc, m = Math.sqrt(2 * h.get() / (k.get() * tt));
      var x = H.chartX(Lc, h.get(), k.get(), tt), ratio = r2c / r1, eta = H.etaAnnular(r1, r2c, m);
      var qmax = 2 * Math.PI * h.get() * (r2c * r2c - r1 * r1) * th, qfin = eta * qmax;
      var Ab = Math.PI * 2 * r1 * Math.max(0, 1 - n * tt), qb = h.get() * Ab * th, qw = n * qfin + qb, qwo = h.get() * Math.PI * 2 * r1 * 1 * th;
      /* drawing */
      clear(tsvg);
      var x0 = 40, x1 = 600, cy = 125, R1 = 22 + 18 * (r1 / r2) , R2 = 100, ry = 0.32;
      var drawN = Math.min(n, 44), step = (x1 - x0 - 30) / Math.max(1, drawN);
      S('rect', { x: x0 - 20, y: cy - R1, width: x1 - x0 + 40, height: 2 * R1, fill: tcolor(1), style: 'stroke:var(--text);stroke-width:1' }, tsvg);
      S('ellipse', { cx: x0 - 20, cy: cy, rx: R1 * ry, ry: R1, fill: tcolor(.92), style: 'stroke:var(--text);stroke-width:1' }, tsvg);
      var defs = S('defs', {}, tsvg), gid = 'fg' + Math.random().toString(36).slice(2, 7);
      var rg = S('radialGradient', { id: gid, cx: '50%', cy: '50%', r: '50%' }, defs);
      var hmk = 0; /* tip temperature estimate using straight-fin profile with Lc */
      var tipF = 1 / Math.cosh(m * Lc);
      S('stop', { offset: (R1 / R2 * 100) + '%', 'stop-color': tcolor(1) }, rg);
      S('stop', { offset: '100%', 'stop-color': tcolor(Math.max(0, tipF)) }, rg);
      for (var i = 0; i < drawN; i++) {
        var fx = x0 + 10 + i * step;
        S('ellipse', { cx: fx, cy: cy, rx: R2 * ry, ry: R2, fill: 'url(#' + gid + ')', style: 'stroke:rgba(0,0,0,.35);stroke-width:.8' }, tsvg);
      }
      S('rect', { x: x1 + 4, y: cy - R1, width: 16, height: 2 * R1, fill: tcolor(1) }, tsvg);
      S('ellipse', { cx: x1 + 20, cy: cy, rx: R1 * ry, ry: R1, fill: tcolor(1), style: 'stroke:var(--text);stroke-width:1' }, tsvg);
      T(tsvg, 320, 18, n + ' fins  ·  pitch ' + fmt((ss + tt) * 1000, 3) + ' mm' + (n > drawN ? '  (drawing ' + drawN + ')' : ''), { 'text-anchor': 'middle', style: 'font-weight:800;font-size:13px' });
      T(tsvg, 320, 244, 'tip/base temperature ratio ≈ ' + fmt(tipF, 3), { 'text-anchor': 'middle', class: 'tick' });
      /* chart */
      svg._ch = effChart(svg, 2, { ratio: ratio, point: [x, eta] });
      ro([
        ['n = 1/(s+t)', String(n)], ['L = r₂ − r₁', fmt(L * 100, 4) + ' cm'], ['L_c = L + t/2', fmt(Lc * 100, 4) + ' cm'], ['r₂c/r₁', fmt(ratio, 4)],
        ['x = L_c^{3/2}(h/kA_m)^{1/2}', fmt(x, 4)], ['η (Bessel)', fmt(eta * 100, 4) + ' %', 1], ['q_max per fin', fmt(qmax, 4) + ' W'], ['q per fin = η·q_max', fmt(qfin, 4) + ' W'],
        ['q between fins', fmt(qb, 4) + ' W'], ['q with fins', fmt(qw, 5) + ' W', 1], ['q without fins', fmt(qwo, 4) + ' W'], ['ε = q_with / q_without', fmt(qw / qwo, 4), 1]
      ]);
    }
    attachHover(svg, b.querySelector('[data-w]'));
    render(); window.HTMath(el);
  };

  /* =====================================================================
     Extra: radial resistances (cylinder vs sphere vs wall) — for lecture 2
     ===================================================================== */
  M.kvar = function (el) {
    var b = frame(el);
    b.innerHTML = '<div class="grid two"><div class="ctrls" data-c></div><div><svg class="viz" viewBox="0 0 640 300" data-s></svg><div data-ro></div></div></div>';
    var c = b.querySelector('[data-c]'), svg = b.querySelector('[data-s]'), ro = readout(b.querySelector('[data-ro]'));
    var k0 = ctl(c, { label: '\\(k_0\\)', min: 0.1, max: 100, step: 0.1, value: 10, unit: 'W/m°C', on: render });
    var be = ctl(c, { label: '\\(\\beta\\)', min: -0.002, max: 0.004, step: 0.0001, value: 0.002, unit: '1/°C', on: render, f: function (v) { return v.toFixed(4); } });
    var T1 = ctl(c, { label: '\\(T_1\\)', min: 0, max: 500, step: 1, value: 300, unit: '°C', on: render });
    var T2 = ctl(c, { label: '\\(T_2\\)', min: 0, max: 500, step: 1, value: 50, unit: '°C', on: render });
    var dx = ctl(c, { label: '\\(\\Delta x\\)', min: 1, max: 50, step: 0.5, value: 10, unit: 'cm', on: render });
    function render() {
      var a = T1.get(), bb = T2.get(), B = be.get(), K = k0.get(), X = dx.get() / 100;
      var km = K * (1 + B * (a + bb) / 2), q = km * (a - bb) / X;
      clear(svg);
      var p = new Plot(svg, { H: 300, x: [0, dx.get()], y: [Math.min(a, bb) - 5, Math.max(a, bb) + 5], xl: 'x (cm)', yl: 'T (°C)' });
      /* exact profile: k0[(T + B T²/2)] linear in x */
      var F = function (T) { return T + B * T * T / 2; }, F1 = F(a), F2 = F(bb), pts = [], lin = [];
      for (var i = 0; i <= 60; i++) {
        var xi = i / 60, Fx = F1 + (F2 - F1) * xi, Tx;
        Tx = Math.abs(B) < 1e-9 ? Fx : (-1 + Math.sqrt(Math.max(0, 1 + 2 * B * Fx))) / B;
        pts.push([xi * dx.get(), Tx]); lin.push([xi * dx.get(), a + (bb - a) * xi]);
      }
      p.line(lin, 'stroke:var(--muted);stroke-width:1.5;stroke-dasharray:6 5');
      p.line(pts, 'stroke:var(--accent);stroke-width:3');
      T(p.g, p.sx(dx.get()) - 4, p.m.t + 14, 'β > 0 ⇒ curve bulges up (k bigger where hot)', { 'text-anchor': 'end', class: 'tick' });
      ro([['k_m = k₀[1 + β(T₁+T₂)/2]', fmt(km, 4) + ' W/m°C', 1], ['q/A = k_m (T₁−T₂)/Δx', fmt(q, 5) + ' W/m²', 1], ['q/A if β = 0', fmt(K * (a - bb) / X, 5) + ' W/m²']]);
    }
    render(); window.HTMath(el);
  };
})();
