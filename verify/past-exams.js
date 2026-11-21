// Recomputes the past-exam questions (Final 05/01/2026, Seasonal 23/11/2025, spherical-tank question).
// Run: node verify/past-exams.js
const PI = Math.PI, ln = Math.log, sqrt = Math.sqrt, tanh = Math.tanh;
const out = {};
const r4 = v => +v.toFixed(4);

// Final 2026 Q1-C: radiation between two black planes, area = surface of 0.7 m sphere, 10 & 52 C
{
  const A = 4 * PI * 0.35 ** 2, s = 5.669e-8;
  out['F26 Q1C A'] = r4(A);
  out['F26 Q1C q (W)'] = r4(s * A * (325 ** 4 - 283 ** 4));
  out['F26 Q1C q with 273.15'] = r4(s * A * (325.15 ** 4 - 283.15 ** 4));
}
// Final 2026 Q2: SS sphere k=18, d=6.5 cm, Tinf=23, h=25, qdot=1.38e6
{
  const R = 0.0325, k = 18, h = 25, Ti = 23, qd = 1.38e6;
  const q = qd * 4 / 3 * PI * R ** 3, Tw = Ti + q / (h * 4 * PI * R * R), T0 = qd * R * R / (6 * k) + Tw;
  const r = 0.0166, T = Tw + (T0 - Tw) * (1 - (r / R) ** 2);
  Object.assign(out, { 'F26 Q2 q (W)': r4(q), 'F26 Q2 Tw': r4(Tw), 'F26 Q2 T0': r4(T0), 'F26 Q2 T(1.66cm)': r4(T), 'F26 Q2 T0-Tw': r4(T0 - Tw) });
}
// Final 2026 Q3: pin fins, Ts=110, L=3 cm, d=0.25 cm, k=236, pitch 0.65 cm, Tinf=33, h=36, plate 1.2x1.2
{
  const Ts = 110, Ti = 33, th = Ts - Ti, L = 0.03, d = 0.0025, r = d / 2, k = 236, h = 36, p = 0.0065;
  const A = PI / 4 * d * d, m = sqrt(2 * h / (k * r)), Lc = L + d / 4;
  const qfin = k * A * m * th * tanh(m * Lc);
  const Nreal = 1.44 / p ** 2, Nint = Math.floor(1.2 / p) ** 2;
  const f = N => { const Ab = 1.44 - N * A; const qb = h * Ab * th; const qw = N * qfin + qb; return { N: r4(N), Ab: r4(Ab), qb: r4(qb), qw: r4(qw), eps: r4(qw / (h * 1.44 * th)) }; };
  Object.assign(out, { 'F26 Q3 m': r4(m), 'F26 Q3 Lc': r4(Lc), 'F26 Q3 mLc': r4(m * Lc), 'F26 Q3 qfin': r4(qfin), 'F26 Q3 eta_fin': r4(tanh(m * Lc) / (m * Lc)), 'F26 Q3 q_without': r4(h * 1.44 * th) });
  out['F26 Q3 N=A/p^2'] = f(Nreal);
  out['F26 Q3 N=floor^2'] = f(Nint);
}
// Seasonal 2025 Q1: cast steel pipe k=58, OD 240, t=32 mm, Tw=16, Ta=-9, hi=32000, ho=22; insul OD 450 & 550, k=0.06
{
  const r1 = 0.088, r2 = 0.12, r3 = 0.225, r4_ = 0.275, k = 58, ki = 0.06, hi = 32000, ho = 22, dT = 25;
  const Ri = 1 / (hi * 2 * PI * r1), Rw = ln(r2 / r1) / (2 * PI * k), Ro_bare = 1 / (ho * 2 * PI * r2);
  const R3 = ln(r3 / r2) / (2 * PI * ki), R4 = ln(r4_ / r3) / (2 * PI * ki), Ro = 1 / (ho * 2 * PI * r4_);
  const Rb = Ri + Rw + Ro_bare, Rins = Ri + Rw + R3 + R4 + Ro;
  Object.assign(out, { 'S25 Q1 Ri': +Ri.toExponential(4), 'S25 Q1 Rw': +Rw.toExponential(4), 'S25 Q1 Ro bare': r4(Ro_bare), 'S25 Q1 R bare tot': r4(Rb), 'S25 Q1 q bare W/m': r4(dT / Rb),
    'S25 Q1 R3': r4(R3), 'S25 Q1 R4': r4(R4), 'S25 Q1 Ro ins': r4(Ro), 'S25 Q1 R ins tot': r4(Rins), 'S25 Q1 q ins W/m': r4(dT / Rins), 'S25 Q1 reduction %': r4(100 * (1 - Rb / Rins)),
    'S25 Q1 rc = k/h (m)': r4(ki / ho) });
}
// Seasonal 2025 Q2: bar 16x185 mm at 110, Tinf 30, pin fins k=70, d=7.5 mm, L=17 mm, h=14, effectiveness 4.445 -> N
{
  const th = 80, k = 70, d = 0.0075, r = d / 2, L = 0.017, h = 14, A = PI / 4 * d * d, Ab = 0.016 * 0.185;
  const m = sqrt(2 * h / (k * r));
  const solve = Lx => { const qf = k * A * m * th * tanh(m * Lx); const qwo = h * Ab * th; const N = (4.445 * qwo - qwo) / (qf - h * A * th); return { qfin: r4(qf), qwo: r4(qwo), N: r4(N) }; };
  Object.assign(out, { 'S25 Q2 m': r4(m), 'S25 Q2 (L) case2': solve(L), 'S25 Q2 (Lc=L+d/4)': solve(L + d / 4) });
}
// Spherical tank: D=1.2 m, Ts=140, h=30, Tinf=15, urethane k=0.018, outer surface <= 40 C
{
  const r1 = 0.6, k = 0.018, h = 30;
  // (140-40)*4πk/(1/r1-1/r2) = h 4π r2^2 (40-15)  -> 100k/(1/r1 - 1/r2) = 25 h r2^2
  // => 100k = 25h r2^2/r1 - 25 h r2  -> (25h/r1) r2^2 - 25h r2 - 100k = 0
  const a = 25 * h / r1, b = -25 * h, c = -100 * k;
  const r2 = (-b + sqrt(b * b - 4 * a * c)) / (2 * a);
  const q1 = h * 4 * PI * r1 * r1 * 125, q2 = h * 4 * PI * r2 * r2 * 25;
  Object.assign(out, { 'Tank r2': r4(r2), 'Tank thickness mm': r4((r2 - r1) * 1000), 'Tank q1 W': r4(q1), 'Tank q2 W': r4(q2), 'Tank reduction %': r4(100 * (q1 - q2) / q1), 'Tank rc sphere 2k/h': r4(2 * k / h) });
}
console.log(JSON.stringify(out, null, 1));
