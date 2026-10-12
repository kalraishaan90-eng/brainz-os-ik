const fs = require('fs');
const path = require('path');

const SECRET_PATTERNS = [
  { name: 'Supabase Service Role JWT', regex: /eyJ[a-zA-Z0-9_\-]{20,}\.[a-zA-Z0-9_\-]{20,}\.[a-zA-Z0-9_\-]{20,}/g, test: (match, content) => {
      try {
        const parts = match.split('.');
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        return payload.role === 'service_role';
      } catch (e) {
        return false;
      }
    }
  },
  { name: 'Private Key PEM', regex: /-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g },
  { name: 'AWS Access Key ID', regex: /\b(AKIA|ABIA|ACCA|ASIA)[0-9A-Z]{16}\b/g },
  { name: 'GitHub Personal Access Token', regex: /\b(ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36,255}\b/g },
  { name: 'Generic High-Entropy API Secret Assignment', regex: /(?:api_key|apiKey|secret_key|secretKey|access_token|private_key)\s*=\s*['"][a-zA-Z0-9_\-]{32,}['"]/gi }
];

const IGNORE_DIRS = ['node_modules', '.git', 'test-results', 'playwright-report', '_backup_lockdown_pre'];
const IGNORE_FILES = ['package-lock.json'];

let findings = [];

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(process.cwd(), fullPath);

    if (entry.isDirectory()) {
      if (IGNORE_DIRS.includes(entry.name)) continue;
      scanDir(fullPath);
    } else if (entry.isFile()) {
      if (IGNORE_FILES.includes(entry.name)) continue;
      // Skip binary files
      const ext = path.extname(entry.name).toLowerCase();
      if (['.png', '.jpg', '.jpeg', '.svg', '.woff', '.woff2', '.ttf', '.eot', '.ico', '.pdf', '.zip'].includes(ext)) continue;

      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        SECRET_PATTERNS.forEach(pat => {
          let m;
          const r = new RegExp(pat.regex);
          while ((m = r.exec(content)) !== null) {
            let isRealSecret = true;
            if (pat.test) {
              isRealSecret = pat.test(m[0], content);
            }
            if (isRealSecret) {
              const lineNo = content.slice(0, m.index).split('\n').length;
              findings.push({
                file: relPath,
                line: lineNo,
                pattern: pat.name,
                matchPreview: m[0].slice(0, 20) + '...'
              });
            }
          }
        });
      } catch (e) {}
    }
  }
}

console.log('--- Scanning repository for exposed secrets ---');
scanDir(process.cwd());
console.log(`Scan completed. Total leaked secret findings: ${findings.length}`);
if (findings.length > 0) {
  findings.forEach(f => console.log(`[ALERT] ${f.file}:${f.line} - ${f.pattern} (${f.matchPreview})`));
  process.exit(1);
} else {
  console.log('Clean scan: 0 leaked credentials or high-entropy secrets found in codebase.');
  process.exit(0);
}
