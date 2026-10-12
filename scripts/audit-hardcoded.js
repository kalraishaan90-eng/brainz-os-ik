const fs = require('fs');

const files = ['Eduvia.html', 'academic-setup.js'];
const searchPatterns = [
  /\bXI-[AB]\b/i,
  /\bXII-[AB]\b/i,
  /\bX-[AB]\b/i,
  /\bClass XI\b/i,
  /\bClass XII\b/i,
  /\bPolitical Science\b/i,
  /\bEconomics\b/i,
  /\bCBSE\b/i,
  /\bICSE\b/i
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  console.log(`\n=== Scanning ${file} ===`);
  let matchesFound = 0;
  lines.forEach((line, idx) => {
    searchPatterns.forEach(pattern => {
      if (pattern.test(line)) {
        // Exclude preset data definitions in academic-setup or comments/helpers if expected
        console.log(`Line ${idx + 1} matches ${pattern}: ${line.trim()}`);
        matchesFound++;
      }
    });
  });
  console.log(`Total pattern matches in ${file}: ${matchesFound}`);
});
