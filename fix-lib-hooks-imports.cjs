const fs = require('fs');
const path = require('path');

// Files in pages/*.tsx (depth 1) use ../../lib/ and ../../hooks/ but should use ../lib/ and ../hooks/
// Files in pages/admin/*.tsx (depth 2) correctly use ../../lib/ and ../../hooks/
// Files in pages/accounting/**/*.tsx (depth 3+) need to be handled separately

const base = path.join(__dirname, 'projects/frontend/ui/pages');
let totalFixed = 0;

// Only direct children of pages/ (not subdirectories)
const files = fs.readdirSync(base)
  .filter(f => f.endsWith('.tsx') || f.endsWith('.ts'))
  .map(f => path.join(base, f));

for (const f of files) {
  let content = fs.readFileSync(f, 'utf8');
  let changed = false;

  // ../../lib/ -> ../lib/
  if (content.includes('../../lib/')) {
    content = content.split('../../lib/').join('../lib/');
    changed = true;
  }
  // ../../hooks/ -> ../hooks/  (not needed for admin which correctly uses ../../ but
  // these are pages/ files, not admin/)
  if (content.includes('../../hooks/')) {
    content = content.split('../../hooks/').join('../hooks/');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(f, content);
    totalFixed++;
    console.log('fixed:', path.basename(f));
  }
}
console.log('Total fixed:', totalFixed);
