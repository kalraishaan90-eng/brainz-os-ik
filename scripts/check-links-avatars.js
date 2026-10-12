const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.resolve(__dirname, '../Eduvia.html'), 'utf8');
const links = content.match(/<a\s+[^>]*>/gi) || [];
console.log('Total <a> tags in Eduvia.html:', links.length);

const externalLinks = [];
links.forEach(l => {
  if (l.includes('target="_blank"') || l.includes("target='_blank'") || l.includes('http://') || l.includes('https://')) {
    if (!l.includes('rel="noopener noreferrer"') && !l.includes("rel='noopener noreferrer'")) {
      externalLinks.push(l);
    }
  }
});

console.log('External/target links missing rel="noopener noreferrer":', externalLinks.length);
externalLinks.forEach(l => console.log('  -> ' + l));

// Check avatar_url usage
const avatarMatches = [];
const lines = content.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('avatar_url') || l.includes('avatarUrl') || l.includes('avatar')) {
    if (l.includes('src=') || l.includes('src =')) {
      avatarMatches.push({ line: idx + 1, text: l.trim() });
    }
  }
});
console.log('\nAvatar src assignments:', avatarMatches.length);
avatarMatches.forEach(m => console.log(`  L${m.line}: ${m.text}`));
