const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.resolve(__dirname, '../Eduvia.html'), 'utf8');
const lines = content.split('\n');

const concatHits = [];
lines.forEach((line, idx) => {
  if (line.includes('innerHTML') && (line.includes('+') || line.includes('concat'))) {
    if (!line.includes('//') && !line.includes('/*')) {
      concatHits.push({ lineNum: idx + 1, line: line.trim() });
    }
  }
});

console.log("String concatenation in innerHTML:", concatHits.length);
concatHits.forEach(c => console.log(`L${c.lineNum}: ${c.line.slice(0, 120)}`));
