const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.resolve(__dirname, '../Eduvia.html'), 'utf8');

// Match any innerHTML = `...` or insertAdjacentHTML(..., `...`)
const regex = /(?:innerHTML|insertAdjacentHTML\s*\([^,]+,)\s*`([\s\S]*?)`/g;
let match;
let count = 0;
const issues = [];

while ((match = regex.exec(content)) !== null) {
  const tpl = match[1];
  const offset = match.index;
  const lineNum = content.slice(0, offset).split('\n').length;
  
  const varMatches = tpl.matchAll(/\${([^}]+)}/g);
  for (const vm of varMatches) {
    const expr = vm[1].trim();
    // Check if it looks unescaped
    if (!expr.includes('escapeHtml(') && 
        !expr.startsWith('escapeHtml') && 
        !expr.includes('escapeAttr(') &&
        !expr.includes('?') && 
        !/^[0-9+*\/ -]+$/.test(expr) &&
        !['i', 'index', 'idx', 'count', 'total', 'length', 'badgeHtml', 'statusBadge', 'badge', 'actionBtn', 'avatarHtml', 'rows', 'html', 'tableRows', 'optionsHtml', 'cardsHtml', 'contentHtml', 'itemsHtml'].includes(expr)) {
      issues.push({ lineNum, expr });
    }
  }
}

console.log("Total potential unescaped in multiline templates:", issues.length);
issues.forEach(iss => console.log(`L${iss.lineNum}: \${${iss.expr}}`));
