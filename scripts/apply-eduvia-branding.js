const fs = require('fs');
const path = require('path');

const targetFiles = ['Eduvia.html', 'BrainzOS.html', 'Campusly.html'];

targetFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping missing file: ${file}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Update favicon link
  content = content.replace(
    /<link id="brand-favicon"[^>]*>/i,
    '<link id="brand-favicon" rel="icon" type="image/png" href="assets/eduvia-mark.png" data-brand-favicon />'
  );

  // 2. Add .brand-crest img and update .brand-crest CSS
  const crestCssRegex = /\.brand-crest\s*\{[^}]*\}/;
  if (crestCssRegex.test(content)) {
    const newCrestCss = `.brand-crest {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      background: var(--color-surface-white);
      color: var(--color-ink);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-heading);
      font-weight: 600;
      font-size: 1.35rem;
      border: 1px solid rgba(65, 71, 81, 0.12);
      box-shadow: 0 4px 14px rgba(65, 71, 81, 0.08);
      overflow: hidden;
      flex-shrink: 0;
      padding: 2px;
    }

    .brand-crest img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      border-radius: 10px;
      display: block;
    }`;
    content = content.replace(crestCssRegex, newCrestCss);
  }

  // 3. Update HTML brand crests
  content = content.replace(
    /<div class="brand-crest" aria-hidden="true" data-brand-mark>[^<]*<\/div>/g,
    '<div class="brand-crest" aria-hidden="true" data-brand-mark><img src="assets/eduvia-mark.png" alt="Eduvia" /></div>'
  );

  content = content.replace(
    /<div class="brand-crest" data-brand-mark>[^<]*<\/div>/g,
    '<div class="brand-crest" data-brand-mark><img src="assets/eduvia-mark.png" alt="Eduvia" /></div>'
  );

  content = content.replace(
    /<div id="preview-sidebar-crest"[^>]*>[^<]*<\/div>/g,
    '<div id="preview-sidebar-crest" class="brand-crest" style="width: 40px; height: 40px; font-size: 1.2rem; background: var(--color-surface-white); color: #FFFFFF; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border-radius: var(--radius-sm); overflow: hidden; padding: 2px;" data-preview-brand-mark><img src="assets/eduvia-mark.png" alt="Eduvia" style="width:100%;height:100%;object-fit:contain;" /></div>'
  );

  // 4. Update BRAND_DEFAULTS: logo_url
  content = content.replace(
    /logo_url:\s*null,/,
    "logo_url: 'assets/eduvia-mark.png',"
  );

  // 5. Update BRAND_DEFAULTS: tagline to Institutional Learning & Operations if it was Senior Secondary
  content = content.replace(
    /tagline:\s*['"]Senior Secondary['"],/,
    "tagline: 'Institutional Learning & Operations',"
  );

  // 6. Update applySchoolBranding fallback logic
  const oldFaviconLogic = /const favicon = document\.getElementById\('brand-favicon'\);[\s\S]*?favicon\.href = `data:image\/svg\+xml,\$\{encodeURIComponent\(svg\)\}`;[\s\S]*?\}/;
  if (oldFaviconLogic.test(content)) {
    const newFaviconLogic = `const favicon = document.getElementById('brand-favicon');
  if (favicon) {
    if (SCHOOL_SETTINGS.logo_url) {
      favicon.href = SCHOOL_SETTINGS.logo_url;
      favicon.type = SCHOOL_SETTINGS.logo_url.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
    } else {
      favicon.href = 'assets/eduvia-mark.png';
      favicon.type = 'image/png';
    }
  }`;
    content = content.replace(oldFaviconLogic, newFaviconLogic);
  }

  // Update querySelectorAll('[data-brand-mark]') fallback to ensure logo_url defaults to assets/eduvia-mark.png
  const oldMarkLogic = /document\.querySelectorAll\('\[data-brand-mark\]'\)\.forEach\(node => \{[\s\S]*?if \(SCHOOL_SETTINGS\.logo_url\) \{[\s\S]*?\} else \{[\s\S]*?node\.textContent = product\.charAt\(0\)\.toUpperCase\(\);[\s\S]*?\}[\s\S]*?\}\);/;
  if (oldMarkLogic.test(content)) {
    const newMarkLogic = `document.querySelectorAll('[data-brand-mark]').forEach(node => {
    const logoSrc = SCHOOL_SETTINGS.logo_url || 'assets/eduvia-mark.png';
    if (logoSrc) {
      node.textContent = '';
      const img = document.createElement('img');
      img.src = logoSrc;
      img.alt = \`\${SCHOOL_SETTINGS.school_name || product} logo\`;
      img.referrerPolicy = 'no-referrer';
      img.onerror = () => { node.textContent = product.charAt(0).toUpperCase(); };
      node.appendChild(img);
    } else {
      node.textContent = product.charAt(0).toUpperCase();
    }
  });`;
    content = content.replace(oldMarkLogic, newMarkLogic);
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Successfully updated branding in ${file}`);
});
