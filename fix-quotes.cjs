const fs = require('fs');
const path = require('path');

function collectTsx(dir) {
  const result = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) result.push(...collectTsx(full));
    else if (f.endsWith('.tsx') || f.endsWith('.ts')) result.push(full);
  }
  return result;
}

const base = path.join(__dirname, 'projects/frontend/ui/pages');
let totalFixed = 0;

for (const f of collectTsx(base)) {
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  let changed = false;
  const newLines = lines.map((line) => {
    // Fix: "text' -> "text" when closing char is ; , } ) or whitespace
    if (line.includes('"') && line.includes("'")) {
      const n = line.replace(/"([^"'\n]*)'(?=[;,})\]\s])/g, '"$1"');
      if (n !== line) {
        changed = true;
        return n;
      }
    }
    return line;
  });
  if (changed) {
    fs.writeFileSync(f, newLines.join('\n'));
    totalFixed++;
    console.log('fixed:', path.relative(base, f));
  }
}
console.log('Total files fixed:', totalFixed);
