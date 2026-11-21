// Recomputes every worked answer in the lectures and compares with the lecture value.
// Run:  node verify/verify.js
const HT = require('../js/physics.js');
const { PI, log, sqrt, tanh, cosh, sinh, exp } = { PI: Math.PI, log: Math.log, sqrt: Math.sqrt, tanh: Math.tanh, cosh: Math.cosh, sinh: Math.sinh, exp: Math.exp };

const rows = [];
function chk(name, lecture, computed, unit, tolPct = 1) {
  const diff = lecture === 0 ? 0 : ((computed - lecture) / lecture) * 100;
  rows.push({ name, lecture, computed: +computed.toPrecision(6), unit, 'diff %': +diff.toFixed(2), ok: Math.abs(diff) <= tolPct ? 'OK' : 'CHECK' });
}

// Bessel sanity (table values)
chk('I0(1)', 1.26607, HT.I0(1), '-', 0.01);
chk('I1(1)', 0.56516, HT.I1(1), '-', 0.01);
chk('K0(1)', 0.42102, HT.K0(1), '-', 0.01);
chk('K1(1)', 0.60191, HT.K1(1), '-', 0.01);
chk('K1(3)', 0.04016, HT.K1(3), '-', 0.05);
chk('eta annular -> rect as r2c/r1 -> 1', HT.etaRect(0.5 * Math.SQRT2), HT.etaAnnularFromX(0.5, 1.0005), '-', 0.5);

// ---- L1 Intro
chk('Fiberglass q/A', 22.88, 0.035 * 85 / 0.13, 'W/m2');
chk('Hot plate q', 2156, 25 * 0.5 * 0.75 * (250 - 20), 'W');
chk('Radiation q/A', 70.9e3, 5.669e-8 * (1073 ** 4 - 523 ** 4), 'W/m2');

// ---- L2 conduction
const Rcu = 0.05 / 386, Rfg = 0.025 / 0.038;
chk('Copper+fiberglass area', 159.144, 52000 * (Rcu + Rfg) / 215, 'm2');
chk('3-layer wall q/A', 419.21, 560 / (0.025 / 386 + 3.2e-3 / 0.16 + 0.05 / 0.038), 'W/m2');
const Rp = [HT.Rcyl(0.05, 0.056, 40), HT.Rcyl(0.056, 0.106, 0.2), HT.Rcyl(0.106, 0.136, 0.4)];
chk('Pipe 2 insulations q/L', 427.87, 260 / (Rp[0] + Rp[1] + Rp[2]), 'W/m');
chk('Steel sphere q', 376.8, 4 * PI * 15 * 50 / (1 / 0.02 - 1 / 0.04), 'W');
{
  const Rt = 80 / 146, R1 = HT.Rcyl(0.8, 1, 15), R2 = Rt - R1;
  const r3 = exp(R2 * 2 * PI * 0.15); // cm, r2 = 1 cm
  chk('Insulation thickness', 0.672, r3 - 1, 'cm');
}

// ---- L3 overall U, critical radius
chk('Concrete wall q/A', 31.25, 50 / (1 / 2 + 0.5 / 0.5 + 1 / 10), 'Btu/h.ft2');
{
  const ri = 0.0125, ro = 0.0133, L = 1;
  const R = 1 / (3500 * 2 * PI * ri * L) + HT.Rcyl(ri, ro, 16, L) + 1 / (7.6 * 2 * PI * ro * L);
  const Uo = 1 / (2 * PI * ro * L * R);
  chk('Tube Uo', 7.577, Uo, 'W/m2C');
  chk('Tube q', 19, 30 / R, 'W', 2);
}
{
  const rc = 0.17 / 3;
  chk('Critical radius', 5.67, rc * 100, 'cm');
  chk('q/L with critical insulation', 105.7, 2 * PI * 180 / (log(rc / 0.025) / 0.17 + 1 / (3 * rc)), 'W/m');
  chk('q/L bare pipe', 84.8, 3 * 2 * PI * 0.025 * 180, 'W/m');
}

// ---- L4 heat generation
{
  const qg = 2000 / (PI * 0.002 ** 2 * 0.5);
  chk('Heater wire q_dot', 0.318e9, qg, 'W/m3');
  chk('Heater wire T0', 126, qg * 0.002 ** 2 / (4 * 15) + 105, 'C');
}
{
  const Tw = 20 + 2122 / (89 * PI * 0.02 * 1);
  const qg = 2122 / (PI / 4 * 0.02 ** 2 * 1);
  chk('Rod Tw', 399.6, Tw, 'C', 0.1);
  chk('Rod T0', 410.159, qg * 0.01 ** 2 / (4 * 16) + Tw, 'C', 0.1);
  // with pi = 3.14 as in the lecture
  const Tw314 = 20 + 2122 / (89 * 3.14 * 0.02), qg314 = 2122 / (3.14 / 4 * 0.02 ** 2);
  chk('Rod T0 (pi=3.14)', 410.159, qg314 * 1e-4 / 64 + Tw314, 'C', 0.05);
}
{
  const Re = 70e-6 * 100 / (PI * 0.15 ** 2); // ohm (cm units)
  const q = 200 ** 2 * Re;
  const Tw = 110 + q / (4000 * PI * 3e-3 * 1);
  const qg = q / (PI * 1.5e-3 ** 2 * 1);
  chk('Wire resistance', 0.099, Re, 'ohm');
  chk('Wire q', 3960, q, 'W');
  chk('Stainless wire Tw', 215, Tw, 'C');
  chk('Stainless wire q_dot', 560.2e6, qg, 'W/m3');
  chk('Stainless wire T0', 231.6, qg * 1.5e-3 ** 2 / (4 * 19) + Tw, 'C');
}

// ---- L5 fins
{
  const d = 0.025, A = PI / 4 * d * d, P = PI * d;
  chk('Copper rod P', 0.0785, P, 'm');
  chk('Copper rod fin q (case 1)', 11.2, sqrt(3.5 * P * 372 * A) * 50, 'W');
}
{
  const m = sqrt(2 * 10 / (200 * 0.003)), Lc = 0.075 + 0.0015;
  chk('Al thin fin m', 5.774, m, '1/m');
  chk('Al thin fin q', 359, m * 200 * 3e-3 * 250 * tanh(m * Lc), 'W');
}
{
  const r = 0.1875 / 12, d = 0.375 / 12, L = 4 / 12, k = 132, h = 1.5;
  const m = sqrt(2 * h / (k * r)), A = PI / 4 * d * d;
  chk('Al pin m', 1.206, m, '1/ft');
  chk('Al pin cosh(mL)', 1.0819, cosh(m * L), '-');
  const M = k * A * m * 130;
  chk('Al pin q (a) case 2', 6.055, M * tanh(m * L), 'Btu/h');
  const Lc = L + d / 4;
  const qb_corr = M * tanh(m * Lc);
  const hmk = h / (m * k);
  const qb_exact = M * (sinh(m * L) + hmk * cosh(m * L)) / (cosh(m * L) + hmk * sinh(m * L));
  chk('Al pin q (b) corrected length', 6.18, qb_corr, 'Btu/h');
  chk('Al pin q (b) exact case 3', 6.18, qb_exact, 'Btu/h');
  console.log('  (b) tip T, case 2 =', (70 + 130 / cosh(m * L)).toFixed(2), 'F;  case 3 exact =', (70 + 130 / (cosh(m * L) + hmk * sinh(m * L))).toFixed(2), 'F;  h/mk =', hmk.toFixed(5), ' denom =', (cosh(m * L) + hmk * sinh(m * L)).toFixed(5));
}

// ---- L6 fin efficiency
{
  const Lc = 0.0155, r1 = 0.0125, r2c = r1 + Lc, t = 0.001, h = 130, k = 200;
  const x = HT.chartX(Lc, h, k, t);
  chk('Circ. fin chart parameter (lecture 0.369)', 0.369, x, '-', 1);
  const m = sqrt(2 * h / (k * t));
  const eta = HT.etaAnnular(r1, r2c, m);
  chk('Circ. fin eta (exact Bessel vs chart 0.82)', 0.82, eta, '-', 3);
  const qmax = 2 * PI * h * (r2c ** 2 - r1 ** 2) * 145;
  chk('Circ. fin q_max', 74.35, qmax, 'W');
  chk('Circ. fin q_actual (eta=0.82)', 60.97, 0.82 * qmax, 'W');
  console.log('  exact-eta q_actual =', (eta * qmax).toFixed(2), 'W, eta =', eta.toFixed(4));
}
{
  const t = 0.5e-3, L = 0.05, h = 30, k = 200, Lc = L + t / 2;
  const m = sqrt(2 * h / (k * t));
  chk('250 fins m', 24.5, m, '1/m');
  chk('250 fins mLc', 1.23, m * Lc, '-');
  const qfin = k * (1 * t) * m * tanh(m * Lc);
  chk('250 fins q_fin / theta', 2.06, qfin, 'W/C');
  const tot = 250 * qfin + h * (1 - 250 * t) * 1;
  chk('250 fins total / theta', 541.25, tot, 'W/C');
  chk('250 fins ratio (h=40 without)', 13.53, tot / 40, '-');
}

// ---- Problems
{
  const RA = 0.025 / (150 * 0.1), RB = 0.075 / (30 * 0.05), RD = 0.075 / (70 * 0.05), RC = 0.05 / (50 * 0.1);
  const Rt = RA + HT.parallel(RB, RD) + RC;
  chk('Q1 R_total', 0.0266, Rt, 'C/W');
  chk('Q1 q', 11428, 304 / Rt, 'W');
  console.log('  Q1 with R rounded to 0.0266 ->', (304 / 0.0266).toFixed(1), 'W ; per unit area (A=0.1) =', (304 / Rt / 0.1).toFixed(0), 'W/m2');
}
{
  const c = 0.5781;
  const R = 0.5 + (6 / 12) / (1.2 * c) + (2 / 12) / (0.038 * c) + (3 / 8 / 12) / (0.05 * c) + 1 / 7;
  chk('Q2 R_total', 10.0314, R, 'h.ft2.F/Btu');
  chk('Q2 U', 0.0996, 1 / R, 'Btu/h.ft2.F');
  chk('Q2 q/A', 5.183, 52 / R, 'Btu/h.ft2');
}
{
  const R = 0.02, k = 16, h = 15, qg = 1e6;
  const q = qg * 4 / 3 * PI * R ** 3;
  chk('Q3 q', 33.493, q, 'W');
  const Tw = 20 + q / (h * 4 * PI * R * R);
  chk('Q3 Tw', 464.44, Tw, 'C');
  chk('Q3 T0', 468.6, qg * R * R / (6 * k) + Tw, 'C');
}
{
  const h = 50, k = 204, t = 0.002, r1 = 0.0125, L = 0.01, Lc = L + t / 2, r2c = r1 + Lc;
  const x = HT.chartX(Lc, h, k, t);
  chk('Q4 chart parameter', 0.121, x, '-');
  const eta = HT.etaAnnular(r1, r2c, sqrt(2 * h / (k * t)));
  chk('Q4 eta exact vs chart 0.95', 0.95, eta, '-', 3);
  const qmax = 2 * PI * h * (r2c ** 2 - r1 ** 2) * 160;
  chk('Q4 q_max', 19.895, qmax, 'W');
  const qb = h * PI * 0.025 * (1 - 100 * t) * 160;
  chk('Q4 q between', 502.4, qb, 'W');
  chk('Q4 total', 2392.4, 100 * 0.95 * qmax + qb, 'W');
  console.log('  Q4 exact eta =', eta.toFixed(4), ' total with exact eta =', (100 * eta * qmax + qb).toFixed(1), 'W');
}
{
  const h = 60, k = 180, t = 0.002, r1 = 0.015, r2 = 0.03, L = r2 - r1, Lc = L + t / 2, r2c = r1 + Lc, n = 1 / (0.003 + 0.002);
  chk('Q5 n', 200, n, '-');
  const x = HT.chartX(Lc, h, k, t);
  chk('Q5 chart parameter', 0.207, x, '-');
  const eta = HT.etaAnnular(r1, r2c, sqrt(2 * h / (k * t)));
  chk('Q5 eta exact vs chart 0.96', 0.96, eta, '-', 3);
  const qmax = 2 * PI * h * (r2c ** 2 - r1 ** 2) * 95;
  chk('Q5 q_max', 26.34, qmax, 'W');
  const qb = h * PI * 0.03 * 0.003 * 200 * 95;
  chk('Q5 q between', 322.164, qb, 'W');
  const qw = 200 * 0.96 * qmax + qb;
  chk('Q5 q with fins', 5382, qw, 'W');
  const qwo = h * PI * 0.03 * 1 * 95;
  chk('Q5 q without fins', 537, qwo, 'W');
  chk('Q5 effectiveness', 10.022, qw / qwo, '-');
  console.log('  Q5 exact eta =', eta.toFixed(4), ' q_with exact =', (200 * eta * qmax + qb).toFixed(1));
}

console.table(rows);
const bad = rows.filter(r => r.ok !== 'OK');
console.log(bad.length ? `\n${bad.length} value(s) differ by more than tolerance (see notes in the site).` : '\nAll values agree within tolerance.');
