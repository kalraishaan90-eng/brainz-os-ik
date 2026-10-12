const fs = require('fs');

// 1. Ensure window.ROLE_NAV_CONFIG is exported
let html = fs.readFileSync('Eduvia.html', 'utf8');

// Ensure window.ROLE_NAV_CONFIG is exported
if (html.includes('const ROLE_NAV_CONFIG = {') && !html.includes('window.ROLE_NAV_CONFIG = ROLE_NAV_CONFIG;')) {
  html = html.replace('const ROLE_NAV_CONFIG = {', 'const ROLE_NAV_CONFIG = window.ROLE_NAV_CONFIG = {');
  console.log('Exported window.ROLE_NAV_CONFIG');
}

fs.writeFileSync('Eduvia.html', html, 'utf8');

// 2. Fix academic-setup.js installNavigation
let js = fs.readFileSync('academic-setup.js', 'utf8');
js = js.replace(
  "if (typeof ROLE_NAV_CONFIG === 'undefined' || !ROLE_NAV_CONFIG.director) return;\r\n    const dirNav = ROLE_NAV_CONFIG.director;",
  "const navConfig = (typeof ROLE_NAV_CONFIG !== 'undefined' ? ROLE_NAV_CONFIG : (window.ROLE_NAV_CONFIG || null));\r\n    if (!navConfig || !navConfig.director) return;\r\n    const dirNav = navConfig.director;"
);
js = js.replace(
  "if (typeof ROLE_NAV_CONFIG === 'undefined' || !ROLE_NAV_CONFIG.director) return;\n    const dirNav = ROLE_NAV_CONFIG.director;",
  "const navConfig = (typeof ROLE_NAV_CONFIG !== 'undefined' ? ROLE_NAV_CONFIG : (window.ROLE_NAV_CONFIG || null));\n    if (!navConfig || !navConfig.director) return;\n    const dirNav = navConfig.director;"
);
fs.writeFileSync('academic-setup.js', js, 'utf8');
console.log('academic-setup.js updated.');
