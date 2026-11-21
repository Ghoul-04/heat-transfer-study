// One-off content upgrade (v5): TL;DR boxes, "simple" explanations, notes from student sheets, home banner, formula additions.
const fs = require('fs');
const rd = f => fs.readFileSync(f, 'utf8');
const wr = (f, s) => fs.writeFileSync(f, s);
function ins(file, anchor, html, where = 'before') {
  let s = rd(file);
  if (s.includes(html.slice(0, 60))) { console.log('skip (exists)', file); return; }
  const i = s.indexOf(anchor);
  if (i < 0) { console.log('!! anchor not found', file, anchor.slice(0, 40)); return; }
  s = where === 'before' ? s.slice(0, i) + html + s.slice(i) : s.slice(0, i + anchor.length) + html + s.slice(i + anchor.length);
  wr(file, s); console.log('ok', file);
}
const TOC = '<div data-toc></div>\n</div>';
const tldr = items => '\n\n<div class="tldr">\n<b>⚡ الخلاصة بـ 30 ثانية</b>\n<ul>\n' + items.map(x => '<li>' + x + '</li>').join('\n') + '\n</ul>\n</div>';

ins('intro.html', TOC, tldr([
  '3 طرق: <b>توصيل</b> \\(q=-kA\\,\\frac{dT}{dx}\\)، <b>حمل</b> \\(q=hA(T_w-T_\\infty)\\)، <b>إشعاع</b> \\(q=\\varepsilon\\sigma A(T_1^4-T_2^4)\\).',
  'الإشعاع <b>دائماً بالكلفن</b>، و \\(\\sigma=5.669\\times10^{-8}\\).',
  'إذا k مو معطى: خذ <b>متوسط الحرارة</b> \\((T_1+T_2)/2\\) واقرا k من الجدول.',
  'فرق الفهرنهايت = 1.8 × فرق السيليزي (بدون +32).'
]), 'after');
ins('conduction.html', TOC, tldr([
  'كل طبقة = مقاومة: جدار \\(\\frac{\\Delta x}{kA}\\)، أسطوانة \\(\\frac{\\ln(r_o/r_i)}{2\\pi kL}\\)، كرة \\(\\frac{1/r_1-1/r_2}{4\\pi k}\\).',
  'ورا بعض ← <b>توالي</b> (نجمع). فوق بعض ← <b>توازي</b> (نجمع المقلوب).',
  '\\(q=\\Delta T/\\sum R\\)، وبعدها ترجع تحسب حرارة كل واجهة: \\(T_{n+1}=T_n-qR_n\\).',
  'إذا المطلوب <b>السمك</b>: \\(R_{total}\\) ← اطرح المعروف ← r ← السمك = \\(r_3-r_2\\).'
]), 'after');
ins('overall-u.html', TOC, tldr([
  'إذا السؤال بيه <b>h</b> ← حمل + توصيل: أضف \\(\\frac{1}{hA}\\) لكل مائع بالدائرة.',
  '\\(U=\\frac{1}{A\\sum R}\\)، والمهم \\(U_iA_i=U_oA_o\\).',
  '\\(r_c=k/h\\): إذا الأنبوب أصغر منه، العازل الرقيق <b>يزيد</b> الفقد.',
  'بعد ما تضيف عازل، الحمل الخارجي ينحسب على <b>السطح الجديد</b> (وتشيل القديم).'
]), 'after');
ins('heat-generation.html', TOC, tldr([
  'المركز <b>أحر نقطة</b>، والتوزيع قطع مكافئ: \\(\\frac{T-T_w}{T_0-T_w}=1-\\frac{r^2}{R^2}\\).',
  '<b>2‑4‑6</b>: \\(T_0=T_w+\\frac{\\dot qL^2}{2k}\\) جدار، \\(\\frac{\\dot qR^2}{4k}\\) أسطوانة، \\(\\frac{\\dot qR^2}{6k}\\) كرة.',
  '\\(T_w\\) مو معطى؟ اللي يتولد يطلع: \\(\\dot qV=hA(T_w-T_\\infty)\\).',
  'الاشتقاق: عامة ← 3 فرضيات ← شطب ← تكامل مرتين ← BCs ← C₁, C₂.'
]), 'after');
ins('fins.html', TOC, tldr([
  '\\(m=\\sqrt{hP/kA}\\): رقيقة \\(\\sqrt{2h/kt}\\)، دبوس \\(\\sqrt{2h/kr}\\).',
  'Case 1 = \\(\\sqrt{hPkA}\\,\\theta_0\\) · Case 2 = × \\(\\tanh mL\\) · Case 3 = Case 2 بـ \\(L_c\\).',
  '\\(L_c\\): مستطيلة \\(L+t/2\\)، دبوس \\(L+d/4\\) (= \\(L+r/2\\)).',
  'A = مساحة <b>المقطع</b>، P = <b>المحيط</b>.'
]), 'after');
ins('fin-efficiency.html', TOC, tldr([
  '\\(q_{actual}=\\eta\\,q_{max}\\). η من المنحنى أو \\(\\tanh(mL_c)/mL_c\\).',
  'محور المنحنى: \\(L_c^{3/2}(h/kA_m)^{1/2}\\)، \\(A_m=tL_c\\) (المثلثية: \\(L_c=L,\\ A_m=\\tfrac t2L_c\\)).',
  'دائرية: \\(q_{max}=2\\pi h(r_{2c}^2-r_1^2)\\theta_0\\)، \\(r_{2c}=r_1+L_c\\).',
  'مصفوفة: \\(q=Nq_{fin}+hA_{between}\\theta_0\\)، و \\(\\varepsilon=q_{with}/q_{without}\\).'
]), 'after');
ins('problems.html', TOC, tldr([
  'Q1 توالي + توازي · Q2 جدار بحمل (Btu) · Q3 كرة تولد حرارة · Q4 و Q5 زعانف دائرية.',
  'وفوقهن: <a href="past-exams.html">أسئلة السنين محلولة</a> و <a href="cram.html">قسم الحصرة</a>.'
]), 'after');

// "simple" explanations
ins('overall-u.html', '<div class="model" data-model="pipe"', '<div class="simple">نفس الحرارة q تطلع من الأنبوب، بس تگدر "توزعها" على مساحتين: الداخلية (أصغر) أو الخارجية (أكبر). مثل نفس الراتب تقسمه على عدد أيام مختلف: تقسم على عدد أقل ← الرقم اليومي أكبر. فـ \\(U_i\\) دائماً أكبر من \\(U_o\\)، بس \\(U_iA_i=U_oA_o\\) نفس الشي.</div>\n');
ins('fins.html', '<div class="model" data-model="fin"', '<div class="simple">تخيل الزعنفة <b>صوندة ماي مثقوبة</b>: الماي (الحرارة) يدخل من القاعدة، ويخر من الثقوب على طولها (الحمل). <b>Case 1</b>: صوندة طويلة كلش — آخرها ما يوصله ماي. <b>Case 2</b>: آخرها مسدود (معزول). <b>Case 3</b>: آخرها مفتوح ويخر منه شوية — فنطوّلها شوية (\\(L_c\\)) ونعاملها مسدودة. و <b>m</b> = شكد الثقوب كثيرة: m كبير ← الماي يخلص بسرعة.</div>\n');
ins('fin-efficiency.html', '<div class="model" data-model="fig1"', '<div class="simple">المنحنى مثل <b>جدول جاهز</b>: الدكتور حسبلك المعادلات الصعبة (Bessel) ورسمها. أنت بس تحسب رقم واحد (x) وتعرف أي خط (النسبة \\(r_{2c}/r_1\\))، تصعد من x للخط، وتروح يسار تقرا η. خلص. والكفاءة دائماً أقل من 1 لأن آخر الزعنفة أبرد من قاعدتها.</div>\n');
ins('heat-generation.html', '<section class="topic">\n<h2 id="wall"', '<div class="simple">ليش المركز أحر؟ تخيل <b>قاعة مزدحمة</b> وكل شخص يطلع حرارة: اللي واگف بالباب (السطح) يبرد بسرعة لأن الهواء قريب، بس اللي بالنص لازم حرارته تعبر كل الناس حتى تطلع. فالمركز أحر شي. والكرة تبرد أسرع من الجدار لأن الحرارة عندها 3 اتجاهات تطلع منها (لهذا 6 مو 2).</div>\n\n');

// notes from student sheets
ins('intro.html', '<article class="ex" id="ex-intro-1">', '<div class="callout tip"><span class="ttl">📌 من ملاحظات الطلاب (مفيدة بالامتحان)</span>إذا السؤال ما أعطاك k: احسب <b>متوسط الحرارة</b> \\(T_{avg}=\\frac{T_1+T_2}{2}\\) واقرا k من جدول خواص المادة عند هاي الحرارة. (هذا نفس فكرة \\(k_m\\) بواجب \\(k=k_0(1+\\beta T)\\).)</div>\n\n');
ins('fin-efficiency.html', '<li><b>مساحة المقطع الجانبي:</b> \\(A_m=t\\,L_c\\).</li>', '\n<li><b>⚠️ زعنفة مثلثية (Figure 1):</b> \\(L_c=L\\) (بدون تصحيح) و \\(A_m=\\tfrac{t}{2}L_c\\).</li>', 'after');

// home banner + map card
ins('index.html', '<div class="page-hero">', '<a class="cram-banner" href="cram.html"><span class="e">😮‍💨</span><span><b>منحصر؟ ابدأ من قسم الحصرة</b><span>أهم الأشياء مرتبة حسب أسئلة سنين الدكتور + عدّاد يگلك شكد ضامن من 10.</span></span><span class="btn primary go">⚡ يلا</span></a>\n\n');
ins('index.html', '<a href="problems.html"><div class="mt"><span class="mn">Q</span>', '<a href="past-exams.html"><div class="mt"><span class="mn">📜</span><span class="badge pstar">⭐ جديد</span></div><h3>أسئلة السنين محلولة</h3><p>نهائي 2026، فصلي 2025، الخزان الكروي، و "Give the equation".</p></a>\n  ');

// formula sheet additions
ins('formulas.html', '</div>\n\n</div>\n</div></main>', `
<div class="sc"><h3>⭐ From past exams</h3>
<div class="eq">\\(q=\\dfrac{2\\pi L(T_A-T_B)}{\\frac{1}{h_ir_1}+\\sum\\frac{\\ln(r_{i+1}/r_i)}{k_i}+\\frac{1}{h_or_n}}\\)</div>
<div class="eq">\\(T_w=T_\\infty+\\dfrac{\\dot q}{h}\\dfrac{V}{A}:\\ L\\ (\\text{wall}),\\ \\tfrac R2\\ (\\text{cyl}),\\ \\tfrac R3\\ (\\text{sph})\\)</div>
<div class="eq">\\(\\text{pin array: }N=\\dfrac{WH}{p^2},\\ \\ q_{with}=Nq_{fin}+h(A-NA_f)\\theta_0\\)</div>
<div class="eq">\\(\\text{triangular fin chart: }L_c=L,\\ A_m=\\tfrac t2L_c\\)</div>
<div class="eq">\\(r_{c,sphere}=\\dfrac{2k}{h}\\)</div>
<p>Outside the 7 lecture files but asked:</p>
<div class="eq">\\(\\text{node: }\\sum kA\\frac{T_i-T_n}{\\Delta x}=0;\\ \\text{interior }T_1+T_2+T_3+T_4-4T_n=0\\)</div>
<div class="eq">\\(\\text{semi-inf.: }\\dfrac{T-T_s}{T_i-T_s}=\\operatorname{erf}\\dfrac{x}{2\\sqrt{\\alpha\\tau}},\\ q_0=\\dfrac{kA(T_s-T_i)}{\\sqrt{\\pi\\alpha\\tau}}\\)</div>
</div>
`);

// version bump
for (const f of fs.readdirSync('.').filter(f => f.endsWith('.html'))) {
  let s = rd(f); const b = s;
  s = s.replace(/(css\/style\.css|js\/physics\.js|js\/models\.js|js\/layout\.js)(\?v=\d+)?"/g, '$1?v=5"');
  if (s !== b) wr(f, s);
}
console.log('done');
