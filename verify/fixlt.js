// Escape raw "<" inside \( ... \) and $$ ... $$ math in HTML (outside <script>), so the parser doesn't eat it.
// Usage: node verify/fixlt.js *.html
const fs = require('fs');
for (const f of process.argv.slice(2)) {
  const src = fs.readFileSync(f, 'utf8');
  const parts = src.split(/(<script[\s\S]*?<\/script>)/);
  let n = 0;
  const out = parts.map((p, i) => {
    if (i % 2 === 1) return p; // script block
    return p.replace(/\\\(([\s\S]*?)\\\)|\$\$([\s\S]*?)\$\$/g, (m) => m.replace(/<(?=[^\/!a-zA-Z]|[a-zA-Z_][^>]*?\\\)|[a-zA-Z_]\b)/g, () => { n++; return '&lt;'; }));
  }).join('');
  if (n) { fs.writeFileSync(f, out); console.log(f, 'escaped', n); }
}
