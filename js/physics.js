/* Heat-transfer physics helpers — shared by the website and verify/verify.js */
(function (root) {
  'use strict';
  var PI = Math.PI;

  /* Modified Bessel functions (Abramowitz & Stegun 9.8.1–9.8.8) */
  function I0(x) {
    var ax = Math.abs(x), t;
    if (ax <= 3.75) {
      t = (x / 3.75) * (x / 3.75);
      return 1 + t * (3.5156229 + t * (3.0899424 + t * (1.2067492 + t * (0.2659732 + t * (0.0360768 + t * 0.0045813)))));
    }
    t = 3.75 / ax;
    return (Math.exp(ax) / Math.sqrt(ax)) * (0.39894228 + t * (0.01328592 + t * (0.00225319 + t * (-0.00157565 + t * (0.00916281 + t * (-0.02057706 + t * (0.02635537 + t * (-0.01647633 + t * 0.00392377))))))));
  }
  function I1(x) {
    var ax = Math.abs(x), t, r;
    if (ax <= 3.75) {
      t = (x / 3.75) * (x / 3.75);
      return x * (0.5 + t * (0.87890594 + t * (0.51498869 + t * (0.15084934 + t * (0.02658733 + t * (0.00301532 + t * 0.00032411))))));
    }
    t = 3.75 / ax;
    r = (Math.exp(ax) / Math.sqrt(ax)) * (0.39894228 + t * (-0.03988024 + t * (-0.00362018 + t * (0.00163801 + t * (-0.01031555 + t * (0.02282967 + t * (-0.02895312 + t * (0.01787654 + t * -0.00420059))))))));
    return x < 0 ? -r : r;
  }
  function K0(x) {
    var t;
    if (x <= 2) {
      t = x * x / 4;
      return -Math.log(x / 2) * I0(x) + (-0.57721566 + t * (0.42278420 + t * (0.23069756 + t * (0.03488590 + t * (0.00262698 + t * (0.00010750 + t * 0.0000074))))));
    }
    t = 2 / x;
    return (Math.exp(-x) / Math.sqrt(x)) * (1.25331414 + t * (-0.07832358 + t * (0.02189568 + t * (-0.01062446 + t * (0.00587872 + t * (-0.00251540 + t * 0.00053208))))));
  }
  function K1(x) {
    var t;
    if (x <= 2) {
      t = x * x / 4;
      return Math.log(x / 2) * I1(x) + (1 / x) * (1 + t * (0.15443144 + t * (-0.67278579 + t * (-0.18156897 + t * (-0.01919402 + t * (-0.00110404 + t * -0.00004686))))));
    }
    t = 2 / x;
    return (Math.exp(-x) / Math.sqrt(x)) * (1.25331414 + t * (0.23498619 + t * (-0.03655620 + t * (0.01504268 + t * (-0.00780353 + t * (0.00325614 + t * -0.00068245))))));
  }

  /* scaled versions: sI(x) = I(x) e^-x , sK(x) = K(x) e^x */
  function sI0(x) { return x > 3.75 ? I0(x) * Math.exp(-x) : I0(x) * Math.exp(-x); }
  function sI1(x) { return I1(x) * Math.exp(-x); }
  function sK0(x) { return K0(x) * Math.exp(x); }
  function sK1(x) { return K1(x) * Math.exp(x); }
  /* for large x the polynomial already carries e^±x; recompute without it to avoid Inf*0 */
  function big(fn, x, sgn) {
    var t, p;
    if (fn === 'I0') { t = 3.75 / x; p = (0.39894228 + t * (0.01328592 + t * (0.00225319 + t * (-0.00157565 + t * (0.00916281 + t * (-0.02057706 + t * (0.02635537 + t * (-0.01647633 + t * 0.00392377)))))))); }
    else if (fn === 'I1') { t = 3.75 / x; p = (0.39894228 + t * (-0.03988024 + t * (-0.00362018 + t * (0.00163801 + t * (-0.01031555 + t * (0.02282967 + t * (-0.02895312 + t * (0.01787654 + t * -0.00420059)))))))); }
    else if (fn === 'K0') { t = 2 / x; p = (1.25331414 + t * (-0.07832358 + t * (0.02189568 + t * (-0.01062446 + t * (0.00587872 + t * (-0.00251540 + t * 0.00053208)))))); }
    else { t = 2 / x; p = (1.25331414 + t * (0.23498619 + t * (-0.03655620 + t * (0.01504268 + t * (-0.00780353 + t * (0.00325614 + t * -0.00068245)))))); }
    return p / Math.sqrt(x);
  }
  sI0 = function (x) { return x > 3.75 ? big('I0', x) : I0(x) * Math.exp(-x); };
  sI1 = function (x) { return x > 3.75 ? big('I1', x) : I1(x) * Math.exp(-x); };
  sK0 = function (x) { return x > 2 ? big('K0', x) : K0(x) * Math.exp(x); };
  sK1 = function (x) { return x > 2 ? big('K1', x) : K1(x) * Math.exp(x); };

  var HT = {
    PI: PI,
    sigma: 5.669e-8,
    I0: I0, I1: I1, K0: K0, K1: K1,

    /* thermal resistances */
    Rwall: function (dx, k, A) { return dx / (k * (A || 1)); },
    Rcyl: function (ri, ro, k, L) { return Math.log(ro / ri) / (2 * PI * k * (L || 1)); },
    Rsph: function (r1, r2, k) { return (1 / r1 - 1 / r2) / (4 * PI * k); },
    Rconv: function (h, A) { return 1 / (h * (A || 1)); },
    parallel: function () {
      var s = 0;
      for (var i = 0; i < arguments.length; i++) s += 1 / arguments[i];
      return 1 / s;
    },

    /* fins */
    finM: function (h, P, k, A) { return Math.sqrt(h * P / (k * A)); },
    /* q for the three cases; o = {h,P,k,A,theta0,L} */
    finQ: function (cs, o) {
      var m = Math.sqrt(o.h * o.P / (o.k * o.A));
      var M = Math.sqrt(o.h * o.P * o.k * o.A) * o.theta0;
      if (cs === 1) return M;
      if (cs === 2) return M * Math.tanh(m * o.L);
      var hmk = o.h / (m * o.k), mL = m * o.L;
      return M * (Math.sinh(mL) + hmk * Math.cosh(mL)) / (Math.cosh(mL) + hmk * Math.sinh(mL));
    },
    /* theta/theta0 along the fin */
    finProfile: function (cs, m, L, x, hmk) {
      if (cs === 1) return Math.exp(-m * x);
      if (cs === 2) return Math.cosh(m * (L - x)) / Math.cosh(m * L);
      return (Math.cosh(m * (L - x)) + hmk * Math.sinh(m * (L - x))) / (Math.cosh(m * L) + hmk * Math.sinh(m * L));
    },
    etaRect: function (mLc) { return mLc < 1e-9 ? 1 : Math.tanh(mLc) / mLc; },
    /* Figure 1 (triangular profile): x = L^{3/2}(h/kAm)^{1/2} = mL with m = sqrt(2h/kt) */
    etaTriangular: function (x) { return x < 1e-9 ? 1 : I1(2 * x) / (x * I0(2 * x)); },
    /* exact annular-fin efficiency (adiabatic tip at r2c) */
    etaAnnular: function (r1, r2c, m) {
      var a = m * r1, b = m * r2c;
      if (b - a < 1e-9) return 1;
      /* exponentially-scaled form to avoid overflow: divide num & den by e^(b-a) */
      var E = Math.exp(2 * (a - b));
      var num = sK1(a) * sI1(b) - sI1(a) * sK1(b) * E;
      var den = sI0(a) * sK1(b) * E + sK0(a) * sI1(b);
      return (2 * r1 / m) / (r2c * r2c - r1 * r1) * num / den;
    },
    /* Figure-axis helpers: x = Lc^{3/2} (h/(k Am))^{1/2} with Am = t Lc  =>  mLc = x*sqrt(2) */
    chartX: function (Lc, h, k, t) { return Math.pow(Lc, 1.5) * Math.sqrt(h / (k * t * Lc)); },
    etaRectFromX: function (x) { return HT.etaRect(x * Math.SQRT2); },
    etaAnnularFromX: function (x, ratio) {
      if (x < 1e-9) return 1;
      if (ratio <= 1.0001) return HT.etaRect(x * Math.SQRT2);
      var mLc = x * Math.SQRT2;
      var mr1 = mLc / (ratio - 1);
      var r1 = 1, m = mr1, r2c = ratio;
      return HT.etaAnnular(r1, r2c, m);
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = HT;
  else root.HT = HT;
})(this);
