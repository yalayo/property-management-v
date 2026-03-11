const fs = require('fs');
const path = require('path');

// Component subdirs that live under ui/components/ but are wrongly imported as ../subdir/
const componentDirs = [
  'dashboard', 'landing', 'chatbot', 'layouts', 'payment',
  'tenant', 'tenants', 'files', 'onboarding', 'accounting',
  'poc', 'waiting-list'
];

const base = path.join(__dirname, 'projects/frontend/ui/pages');
let totalFixed = 0;

const files = fs.readdirSync(base).filter(f => f.endsWith('.tsx')).map(f => path.join(base, f));

for (const f of files) {
  let content = fs.readFileSync(f, 'utf8');
  let changed = false;
  for (const dir of componentDirs) {
    const wrong = `"../${dir}/`;
    const correct = `"../components/${dir}/`;
    if (content.includes(wrong)) {
      content = content.split(wrong).join(correct);
      changed = true;
    }
    // Also fix single-quote variants
    const wrongSq = `'../${dir}/`;
    const correctSq = `'../components/${dir}/`;
    if (content.includes(wrongSq)) {
      content = content.split(wrongSq).join(correctSq);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(f, content);
    totalFixed++;
    console.log('fixed:', path.basename(f));
  }
}
console.log('Total fixed:', totalFixed);
