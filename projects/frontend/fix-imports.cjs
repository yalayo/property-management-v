const fs = require('fs');
const path = require('path');
const base = path.join(__dirname, 'ui/pages');

function collectTsx(dir) {
  const result = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) result.push(...collectTsx(full));
    else if (f.endsWith('.tsx') || f.endsWith('.ts')) result.push(full);
  }
  return result;
}

// Fix mixed-quote imports: from "ANYTHING' -> from "ANYTHING"
// Only on lines that begin with 'import' to avoid touching JSX content
let fixed = 0;
for (const f of collectTsx(base)) {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  let changed = false;
  const newLines = lines.map(line => {
    // Match: import ... from "...';  (double-quote open, single-quote close)
    if (/^import\s/.test(line) && line.includes('from "') && line.includes("';")) {
      const fixed_line = line.replace(/from "([^"]+)';(\s*)$/, 'from "$1";$2');
      if (fixed_line !== line) { changed = true; return fixed_line; }
    }
    return line;
  });
  if (changed) {
    fs.writeFileSync(f, newLines.join('\n'));
    fixed++;
    console.log('fixed:', path.relative(base, f));
  }
}
console.log('Total fixed:', fixed);
