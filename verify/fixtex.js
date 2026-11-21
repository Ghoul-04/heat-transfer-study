// Fix KaTeX "superscript after spacing" issue:  "\,^\circ" -> "\,{}^\circ"
// Usage: node verify/fixtex.js file1.html file2.html ...
const fs = require('fs');
for (const f of process.argv.slice(2)) {
  let s = fs.readFileSync(f, 'utf8');
  const before = s;
  s = s.replace(/\\([, ;!]|quad)\^\\circ/g, (m, sp) => '\\' + sp + '{}^\\circ');
  if (s !== before) { fs.writeFileSync(f, s); console.log('fixed', f); }
}
