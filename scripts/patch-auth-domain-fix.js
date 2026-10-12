const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const brainzHtmlPath = path.join(root, 'Eduvia.html');
const dbPath = path.join(root, 'data', 'db.json');
const servePath = path.join(root, 'scripts', 'serve.js');

// 1. Patch Eduvia.html
let html = fs.readFileSync(brainzHtmlPath, 'utf8');

// Patch SUPABASE_CONFIG
html = html.replace(
  /const SUPABASE_CONFIG = \{[\s\S]*?anonKey:[\s\S]*?\};/,
  `const SUPABASE_CONFIG = {
  url: (typeof window.EDUVIA_CONFIG !== 'undefined' && window.EDUVIA_CONFIG.SUPABASE_URL)
    || window.EDUVIA_SUPABASE_URL
    || ((typeof window !== 'undefined' && window.location && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port && window.location.port !== '8080' && window.location.port !== '3000')
        ? \`\${window.location.protocol}//\${window.location.hostname}:8080\`
        : (typeof window !== 'undefined' && window.location ? window.location.origin : 'http://localhost:8080')),
  anonKey: (typeof window.EDUVIA_CONFIG !== 'undefined' && window.EDUVIA_CONFIG.SUPABASE_ANON_KEY)
    || window.EDUVIA_SUPABASE_ANON_KEY
    || 'local-institutional-anon-key'
};`
);

// Patch BRAND_DEFAULTS
html = html.replace(
  /support_email: 'support@school\.edu',\r?\n\s*email_domain: '',/,
  `support_email: 'support@brainzeduworld.com',\n  email_domain: 'brainzeduworld.com',\n  allowed_domains: ['brainzeduworld.com', 'brainz.edu'],`
);

// Patch configuredAllowedDomains fallback
html = html.replace(
  /if \(domains\.length === 0\) \{\r?\n\s*domains\.push\('school\.edu'\);\r?\n\s*\}/,
  `if (domains.length === 0) {\n    domains.push('brainzeduworld.com', 'brainz.edu');\n  }`
);

// Patch refreshAllowedSchoolDomains
html = html.replace(
  /async function refreshAllowedSchoolDomains\(\) \{[\s\S]*?return configuredAllowedDomains\(\);\r?\n\}/,
  `async function refreshAllowedSchoolDomains() {
  try {
    const client = getSupabaseClient();
    if (client) {
      const { data } = await client.from('app_config').select('value').eq('key', 'allowed_domains').maybeSingle();
      if (data && data.value) {
        const parsed = String(data.value).split(',').map(d => d.trim().toLowerCase()).filter(Boolean);
        if (parsed.length > 0) {
          SCHOOL_SETTINGS.allowed_domains = parsed;
          if (!SCHOOL_SETTINGS.email_domain || !parsed.includes(SCHOOL_SETTINGS.email_domain)) {
            SCHOOL_SETTINGS.email_domain = parsed[0];
          }
        }
      }
    }
  } catch (e) {}
  if (!Array.isArray(SCHOOL_SETTINGS.allowed_domains) || SCHOOL_SETTINGS.allowed_domains.length === 0) {
    SCHOOL_SETTINGS.allowed_domains = ['brainzeduworld.com', 'brainz.edu'];
    if (!SCHOOL_SETTINGS.email_domain) {
      SCHOOL_SETTINGS.email_domain = 'brainzeduworld.com';
    }
  }
  return configuredAllowedDomains();
}`
);

// Patch handleOfflineFallbackLogin
html = html.replace(
  /function handleOfflineFallbackLogin\(emailVal\) \{[\s\S]*?executeLogin\(userProfile\);\r?\n\}/,
  `function handleOfflineFallbackLogin(emailVal) {
  let role = 'teacher';
  const cleanEmail = (emailVal || '').trim().toLowerCase();
  
  if (cleanEmail.startsWith('director') || cleanEmail.includes('director')) {
    role = 'director';
  } else if (cleanEmail.startsWith('teacher') || cleanEmail.includes('teacher') || cleanEmail.includes('faculty')) {
    role = 'teacher';
  } else {
    const suggested = suggestRoleFromEmail(cleanEmail);
    role = suggested || 'teacher';
  }
  const userProfile = { ...DEMO_PROFILES[role], role_confirmed: true, status: 'active' };
  if (cleanEmail) {
    userProfile.email = cleanEmail;
    const namePart = cleanEmail.split('@')[0].replace(/[._-]/g, ' ');
    userProfile.name = namePart.charAt(0).toUpperCase() + namePart.slice(1);
  }
  showToast('Offline Mode Active', \`Signed in as \${userProfile.roleLabel} (\${userProfile.name})\`, 'user-check');
  updateRoleIndicatorUI(userProfile.role);
  executeLogin(userProfile);
}`
);

// Replace remaining school.edu strings
html = html.replace(/placeholder="name@school\.edu"/g, 'placeholder="name@brainzeduworld.com"');
html = html.replace(/id="waiting-user-email">teacher@school\.edu</g, 'id="waiting-user-email">teacher@brainzeduworld.com<');
html = html.replace(/placeholder="e\.g\. name@school\.edu"/g, 'placeholder="e.g. name@brainzeduworld.com"');
html = html.replace(/>teacher@school\.edu</g, '>teacher@brainzeduworld.com<');
html = html.replace(/>student@school\.edu</g, '>student@brainz.edu<');
html = html.replace(/placeholder="e\.g\. support@school\.edu"/g, 'placeholder="e.g. support@brainzeduworld.com"');
html = html.replace(/placeholder="e\.g\. school\.edu"/g, 'placeholder="e.g. brainzeduworld.com"');
html = html.replace(/placeholder="school\.edu, district\.org"/g, 'placeholder="brainzeduworld.com, brainz.edu"');
html = html.replace(/>support@school\.edu</g, '>support@brainzeduworld.com<');
html = html.replace(/\(e\.g\. school\.edu\)/g, '(e.g. brainzeduworld.com)');
html = html.replace(/@school\.edu`/g, '@brainzeduworld.com`');

fs.writeFileSync(brainzHtmlPath, html, 'utf8');
console.log('Successfully patched Eduvia.html');

// 2. Patch data/db.json
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
let taarini = db.profiles.find(p => p.email && p.email.toLowerCase() === 'taarini@brainzeduworld.com');
if (!taarini) {
  taarini = {
    id: 'teacher-taarini-001',
    role: 'teacher',
    role_confirmed: true,
    status: 'active',
    full_name: 'Taarini',
    email: 'taarini@brainzeduworld.com',
    class_section: 'XI-B',
    house: null,
    houses: null,
    section_id: 'sec-xi-b',
    grade_level_id: 'gl-11',
    stream_id: 'str-comm'
  };
  db.profiles.push(taarini);
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
  console.log('Successfully added Taarini to data/db.json');
} else {
  console.log('Taarini already exists in db.json');
}

// 3. Patch scripts/serve.js to auto-provision unrecognized authorized users
let serveCode = fs.readFileSync(servePath, 'utf8');
const oldProfileFinder = `      if (!user && email) {
        user = DB.profiles.find(p => p.email.toLowerCase() === email.toLowerCase());
      }
      if (!user && roleFromToken) {
        user = DB.profiles.find(p => p.role.toLowerCase() === roleFromToken.toLowerCase());
      }
      if (!user) {
        user = DB.profiles.find(p => p.role === 'director') || DB.profiles[0];
      }`;

const newProfileFinder = `      if (!user && email) {
        user = DB.profiles.find(p => p.email && p.email.toLowerCase() === email.toLowerCase());
      }
      if (!user && roleFromToken) {
        user = DB.profiles.find(p => p.role && p.role.toLowerCase() === roleFromToken.toLowerCase());
      }
      if (!user && email) {
        const local = email.split('@')[0];
        const isDir = local.toLowerCase().includes('director');
        const role = isDir ? 'director' : 'teacher';
        const namePart = local.replace(/[._-]/g, ' ');
        const fullName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
        user = {
          id: 'user-' + crypto.randomUUID(),
          role: role,
          role_confirmed: true,
          status: 'active',
          full_name: fullName,
          email: email,
          class_section: 'XI-B',
          section_id: 'sec-xi-b',
          grade_level_id: 'gl-11',
          stream_id: 'str-comm'
        };
        DB.profiles.push(user);
        saveDB();
      }
      if (!user) {
        user = DB.profiles.find(p => p.role === 'director') || DB.profiles[0];
      }`;

if (serveCode.includes(oldProfileFinder.replace(/\n/g, '\r\n'))) {
  serveCode = serveCode.replace(oldProfileFinder.replace(/\n/g, '\r\n'), newProfileFinder.replace(/\n/g, '\r\n'));
  fs.writeFileSync(servePath, serveCode, 'utf8');
  console.log('Successfully patched scripts/serve.js (CRLF)');
} else if (serveCode.includes(oldProfileFinder)) {
  serveCode = serveCode.replace(oldProfileFinder, newProfileFinder);
  fs.writeFileSync(servePath, serveCode, 'utf8');
  console.log('Successfully patched scripts/serve.js (LF)');
} else {
  console.log('serve.js pattern check skipped or already updated');
}
