const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.resolve(__dirname, '../academic-setup.js'), 'utf8');

const regex = /(?:innerHTML|insertAdjacentHTML\s*\([^,]+,)\s*`([\s\S]*?)`/g;
let match;
const issues = [];

while ((match = regex.exec(content)) !== null) {
  const tpl = match[1];
  const offset = match.index;
  const lineNum = content.slice(0, offset).split('\n').length;
  
  const varMatches = tpl.matchAll(/\${([^}]+)}/g);
  for (const vm of varMatches) {
    const expr = vm[1].trim();
    if (!expr.includes('esc(') && 
        !expr.startsWith('esc') && 
        !expr.includes('escapeHtml(') && 
        !expr.includes('?') && 
        !/^[0-9+*\/ -]+$/.test(expr) &&
        !['i', 'index', 'idx', 'count', 'total', 'length', 'badgeHtml', 'statusBadge', 'badge', 'actionBtn', 'avatarHtml', 'rows', 'html', 'tableRows', 'optionsHtml', 'cardsHtml', 'contentHtml', 'itemsHtml', 'bodyHtml', 'headHtml', 'summaryHtml'].includes(expr)) {
      issues.push({ lineNum, expr });
    }
  }
}

console.log("Issues in academic-setup.js:", issues.length);
issues.forEach(iss => console.log(`L${iss.lineNum}: \${${iss.expr}}`));
