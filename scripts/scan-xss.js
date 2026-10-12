const fs = require('fs');

function checkFile(filename) {
  if (!fs.existsSync(filename)) return;
  const content = fs.readFileSync(filename, 'utf8');
  const lines = content.split('\n');
  const findings = [];

  lines.forEach((line, idx) => {
    // Check if line assigns to innerHTML or insertAdjacentHTML or outerHTML
    if (/(innerHTML|outerHTML|insertAdjacentHTML)\s*[\+=]/.test(line)) {
      // Find all ${...} interpolations in this line
      const matches = line.match(/\$\{([^}]+)\}/g);
      if (matches) {
        matches.forEach(m => {
          const inner = m.slice(2, -1).trim();
          // Safe patterns
          const isSafe = /^(escapeHtml|escapeAttr|sanitizeUrl|encodeURIComponent|Number|Boolean|parseInt|Math\.|[a-zA-Z0-9_]+\.length|Date|JSON\.stringify)/.test(inner)
            || inner.includes('escapeHtml(')
            || inner.includes('sanitizeUrl(')
            || inner.endsWith(' ? "" : ""')
            || /^['"`][^'"`]*['"`]$/.test(inner);
          if (!isSafe) {
            findings.push({ file: filename, line: idx + 1, expr: m, snippet: line.trim() });
          }
        });
      }
    }
    // Also check eval or new Function
    if (/\beval\s*\(/.test(line)) {
      findings.push({ file: filename, line: idx + 1, expr: 'eval()', snippet: line.trim() });
    }
    if (/new\s+Function\s*\(/.test(line)) {
      findings.push({ file: filename, line: idx + 1, expr: 'new Function()', snippet: line.trim() });
    }
  });

  console.log(`=== ${filename}: ${findings.length} findings ===`);
  findings.forEach(f => {
    console.log(`Line ${f.line}: ${f.expr} -> ${f.snippet.slice(0, 110)}`);
  });
}

checkFile('Eduvia.html');
checkFile('Campusly.html');
checkFile('BrainzOS.html');
