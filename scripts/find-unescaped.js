const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.resolve(__dirname, '../Eduvia.html'), 'utf8');
const lines = content.split('\n');

const unescapedInterpolations = [];

lines.forEach((line, idx) => {
  if (line.includes('innerHTML') && line.includes('${')) {
    const vars = line.match(/\${([^}]+)}/g) || [];
    vars.forEach(v => {
      const expr = v.slice(2, -1).trim();
      if (!expr.includes('escapeHtml(') && 
          !expr.startsWith('escapeHtml') && 
          !expr.includes('? \'') && 
          !expr.includes('? \"') && 
          !/^[0-9+*\/ -]+$/.test(expr) &&
          !['i', 'index', 'idx', 'count', 'total', 'length'].includes(expr)) {
        unescapedInterpolations.push({ lineNum: idx + 1, expr, line: line.trim() });
      }
    });
  }
});

console.log("Unescaped interpolations in innerHTML:", unescapedInterpolations.length);
unescapedInterpolations.slice(0, 50).forEach(u => {
  console.log(`L${u.lineNum}: ${u.expr}  -->  ${u.line.slice(0, 100)}`);
});
