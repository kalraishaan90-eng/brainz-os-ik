const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'Eduvia.html');
let html = fs.readFileSync(filePath, 'utf8');

const target = `function configuredAllowedDomains() {
  return [SCHOOL_SETTINGS.email_domain].filter(Boolean).map(domain => domain.trim().toLowerCase());
}
async function refreshAllowedSchoolDomains() {
  return configuredAllowedDomains();
}`;

const targetCRLF = target.replace(/\n/g, '\r\n');

const replacement = `function configuredAllowedDomains() {
  const domains = [];
  if (Array.isArray(SCHOOL_SETTINGS.allowed_domains) && SCHOOL_SETTINGS.allowed_domains.length > 0) {
    domains.push(...SCHOOL_SETTINGS.allowed_domains);
  }
  if (SCHOOL_SETTINGS.email_domain) {
    domains.push(SCHOOL_SETTINGS.email_domain);
  }
  return [...new Set(domains.map(d => String(d).trim().toLowerCase()).filter(Boolean))];
}
async function refreshAllowedSchoolDomains() {
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
  return configuredAllowedDomains();
}`;

const replacementCRLF = replacement.replace(/\n/g, '\r\n');

if (html.includes(targetCRLF)) {
  html = html.replace(targetCRLF, replacementCRLF);
  fs.writeFileSync(filePath, html, 'utf8');
  console.log('Successfully replaced CRLF version');
} else if (html.includes(target)) {
  html = html.replace(target, replacement);
  fs.writeFileSync(filePath, html, 'utf8');
  console.log('Successfully replaced LF version');
} else {
  console.error('Target not found in Eduvia.html');
}
