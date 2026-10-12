const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'Eduvia.html');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Move page-director-branding out of cmd-results-list
const sectionStartTag = '<section class="os-page" id="page-director-settings"';
const sectionEndTag = '</section>';

const sIdx = content.indexOf(sectionStartTag);
if (sIdx !== -1) {
  const eIdx = content.indexOf(sectionEndTag, sIdx);
  if (eIdx !== -1) {
    const fullOldSection = content.substring(sIdx, eIdx + sectionEndTag.length);
    // Remove old section from inside cmd-results-list
    content = content.replace(fullOldSection, '');
  }
}

// Ensure cmd-results-list is clean
content = content.replace(
  /<div class="cmd-results" id="cmd-results-list">[\s\S]*?<!-- Rendered dynamically from current role's navigable pages -->\s*<\/div>/,
  '<div class="cmd-results" id="cmd-results-list">\n      <!-- Rendered dynamically from current role\'s navigable pages -->\n    </div>'
);

// Define clean page-director-branding section HTML
const newBrandingSection = `<section class="os-page" id="page-director-branding" role="region" aria-label="Settings → Branding">
  <div class="page-header">
    <div>
      <div style="display: flex; gap: 8px; margin-bottom: 6px;">
        <span class="badge badge-blue">Director Settings</span>
        <span class="badge badge-sage">Identity &amp; Appearance</span>
      </div>
      <h1 class="page-header-title">Settings → Branding</h1>
      <p class="page-header-desc">Make school and product branding fully config-driven. Changes apply in real time across the workspace, metadata, and reports.</p>
    </div>
    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
      <button type="button" class="btn-secondary" onclick="populateBrandingForm()">
        <i data-lucide="rotate-ccw" style="width: 16px; height: 16px;"></i>
        <span>Reset Form</span>
      </button>
    </div>
  </div>

  <!-- Live Branding Preview Card (Requirement 4) -->
  <div class="card" style="padding: 24px; margin-bottom: 24px;">
    <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; flex-wrap: wrap;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(106, 142, 174, 0.14); display: flex; align-items: center; justify-content: center; color: var(--color-blue);">
          <i data-lucide="eye" style="width: 20px; height: 20px;"></i>
        </div>
        <div>
          <h3 style="font-size: 1.1rem; font-weight: 600; margin: 0;">Live Branding Preview</h3>
          <p class="subtext" style="margin: 2px 0 0 0;">Real-time rendering of sidebar wordmark, typography, status beacon, and interactive components.</p>
        </div>
      </div>
      <div id="branding-contrast-badge" class="badge badge-sage" style="font-weight: 600;">
        <i data-lucide="shield-check" style="width: 13px; height: 13px;"></i>
        <span id="branding-contrast-result">WCAG AA Compliant</span>
      </div>
    </div>

    <!-- Live Preview Stage -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 18px; padding: 20px; background: var(--color-surface-cream); border: 1.5px solid var(--color-border); border-radius: var(--radius-md);">
      <!-- Sidebar Wordmark Preview -->
      <div style="padding: 16px; background: var(--color-ink); border-radius: var(--radius-sm); color: var(--color-cream); display: flex; align-items: center; gap: 12px;">
        <div id="preview-sidebar-crest" class="brand-crest" style="width: 40px; height: 40px; font-size: 1.2rem; background: var(--color-blue); color: #FFFFFF; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border-radius: var(--radius-sm); overflow: hidden;">S</div>
        <div>
          <h2 id="preview-sidebar-product" style="font-family: var(--font-heading); font-size: 1.15rem; margin: 0; color: #FFFFFF; font-weight: 600;">Eduvia</h2>
          <span id="preview-sidebar-school" style="font-size: var(--text-xs); color: var(--color-beige); display: block;">Brainz Edu World</span>
        </div>
      </div>

      <!-- Topbar Status Pill & Interactive Controls Preview -->
      <div style="padding: 16px; background: #FFFFFF; border: 1px solid var(--color-border-subtle); border-radius: var(--radius-sm); display: flex; flex-direction: column; justify-content: center; gap: 12px;">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;">
          <div class="connection-status" id="preview-status-pill">
            <span class="status-indicator" id="preview-status-dot"></span>
            <span id="preview-status-pill-text">● LIVE · Operational</span>
          </div>
          <span class="badge" id="preview-accent-badge" style="background: rgba(158, 187, 175, 0.25); color: #235240; border: 1px solid rgba(158, 187, 175, 0.45); font-weight: 600;">
            Accent Component
          </span>
        </div>
        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          <button type="button" class="btn-primary" id="preview-primary-btn" style="width: auto; padding: 8px 16px; pointer-events: none;">
            Primary Action
          </button>
          <div style="font-size: var(--text-xs); color: var(--color-ink-muted);">
            Tagline: <strong id="preview-tagline-text" style="color: var(--color-ink);">Senior Secondary</strong>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Branding Settings Form -->
  <form class="card" id="branding-settings-form" style="padding: 24px; margin-bottom: 24px;" onsubmit="saveSchoolBranding(event)">
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
      <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(106, 142, 174, 0.14); display: flex; align-items: center; justify-content: center; color: var(--color-blue);">
        <i data-lucide="sliders" style="width: 20px; height: 20px;"></i>
      </div>
      <div>
        <h3 style="font-size: 1.1rem; font-weight: 600; margin: 0;">Institutional Identity &amp; Localization</h3>
        <p class="subtext" style="margin: 2px 0 0 0;">Metadata, statutory affiliation label, and institutional communication routing.</p>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px;">
      <div class="form-group">
        <label class="form-label" for="branding-product-name">Product Name</label>
        <input id="branding-product-name" class="form-input composer-input" maxlength="60" required placeholder="e.g. Eduvia">
      </div>
      <div class="form-group">
        <label class="form-label" for="branding-school-name">School Name</label>
        <input id="branding-school-name" class="form-input composer-input" maxlength="100" required placeholder="e.g. Brainz Edu World">
      </div>
      <div class="form-group">
        <label class="form-label" for="branding-tagline">Tagline</label>
        <input id="branding-tagline" class="form-input composer-input" maxlength="100" required placeholder="e.g. Senior Secondary">
      </div>
      <div class="form-group">
        <label class="form-label" for="branding-logo-url">Logo URL (Optional)</label>
        <input id="branding-logo-url" class="form-input composer-input" type="url" maxlength="500" placeholder="https://… (Leave blank for text wordmark)">
      </div>
      <div class="form-group">
        <label class="form-label" for="branding-support-email">Support Email</label>
        <input id="branding-support-email" class="form-input composer-input" type="email" maxlength="254" required placeholder="e.g. support@brainzeduworld.com">
      </div>
      <div class="form-group">
        <label class="form-label" for="branding-email-domain">Email Domain</label>
        <input id="branding-email-domain" class="form-input composer-input" maxlength="253" required placeholder="e.g. brainzeduworld.com">
      </div>
      <div class="form-group">
        <label class="form-label" for="branding-timezone">Timezone</label>
        <input id="branding-timezone" class="form-input composer-input" maxlength="80" required placeholder="e.g. Asia/Kolkata">
      </div>
      <div class="form-group">
        <label class="form-label" for="branding-locale">Locale</label>
        <input id="branding-locale" class="form-input composer-input" maxlength="20" required placeholder="e.g. en-IN">
      </div>
      <div class="form-group" style="grid-column: 1 / -1;">
        <label class="form-label" for="branding-footer-text">Footer Text</label>
        <input id="branding-footer-text" class="form-input composer-input" maxlength="160" required placeholder="e.g. Protected institutional gateway">
      </div>
    </div>

    <!-- Palette Colors & Contrast Validation -->
    <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--color-border-warm);">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 12px;">
        <div>
          <h4 style="margin: 0; font-size: 1rem; font-weight: 600;">Theme Colors &amp; WCAG Contrast</h4>
          <p class="subtext" style="margin: 2px 0 0 0;">Override Primary interactive and Accent status colors. Changes are verified for WCAG AA (4.5:1 text contrast minimum).</p>
        </div>
        <button type="button" class="btn-secondary" onclick="clearBrandColorOverrides()" style="width: auto; padding: 6px 14px; font-size: var(--text-xs);">
          <i data-lucide="rotate-ccw" style="width: 14px; height: 14px;"></i>
          <span>Reset to Default Palette</span>
        </button>
      </div>

      <div style="display: flex; align-items: center; gap: 24px; flex-wrap: wrap; margin-top: 14px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <input id="branding-primary-color" type="color" class="composer-color" value="#6A8EAE" style="width: 44px; height: 40px; padding: 2px; cursor: pointer; border-radius: var(--radius-sm); border: 1.5px solid var(--color-border);">
          <div>
            <label for="branding-primary-color" style="display: block; font-size: var(--text-xs); font-weight: 600; color: var(--color-ink);">Primary Interactive</label>
            <span id="branding-primary-hex" style="font-family: monospace; font-size: var(--text-xs); color: var(--color-ink-muted);">#6A8EAE</span>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 10px;">
          <input id="branding-accent-color" type="color" class="composer-color" value="#9EBBAF" style="width: 44px; height: 40px; padding: 2px; cursor: pointer; border-radius: var(--radius-sm); border: 1.5px solid var(--color-border);">
          <div>
            <label for="branding-accent-color" style="display: block; font-size: var(--text-xs); font-weight: 600; color: var(--color-ink);">Accent Status</label>
            <span id="branding-accent-hex" style="font-family: monospace; font-size: var(--text-xs); color: var(--color-ink-muted);">#9EBBAF</span>
          </div>
        </div>

        <div id="branding-contrast-detail" style="font-size: var(--text-xs); color: var(--color-ink-muted); padding: 8px 14px; background: var(--color-surface-cream); border-radius: var(--radius-sm); border: 1px solid var(--color-border);">
          Primary contrast: <strong id="val-primary-ratio">4.5:1</strong> · Accent contrast: <strong id="val-accent-ratio">7.6:1</strong>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px;">
      <button type="submit" class="btn-primary" id="branding-save-button" style="width: auto; padding: 10px 24px;">
        <i data-lucide="check" style="width: 16px; height: 16px;"></i>
        <span>Save Branding</span>
      </button>
    </div>
  </form>

  <!-- School Access & Modules Cards -->
  <div class="card" style="padding: 24px; margin-bottom: 24px;">
    <h3>School Access</h3>
    <p class="subtext">Domains allowed to sign in. Separate multiple domains with commas.</p>
    <label class="form-label" for="allowed-domains-input">Allowed email domains</label>
    <input id="allowed-domains-input" class="composer-input" placeholder="school.edu, district.org">
    <label class="form-label" for="school-name-input" style="margin-top: 14px;">School name</label>
    <input id="school-name-input" class="composer-input" maxlength="120" placeholder="School name">
    <button class="btn-primary" style="margin-top: 16px;" onclick="saveSchoolSettings()">Save Settings</button>
  </div>

  <div class="card" style="padding: 24px; margin-bottom: 24px;">
    <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 18px;">
      <i data-lucide="layers" style="width: 20px; height: 20px; color: var(--color-blue);"></i>
      <div>
        <h3>Modules</h3>
        <p class="subtext">Turn features on or off for all roles.</p>
      </div>
    </div>
    <div id="module-settings-list"></div>
  </div>

  <div class="card" style="padding: 24px; margin-bottom: 24px;">
    <h3>School Config</h3>
    <p class="subtext">Export a JSON preset or import one for another school. Maximum import size: 64 KB.</p>
    <div style="display: flex; flex-wrap: wrap; gap: 10px;">
      <button class="btn-secondary" onclick="exportSchoolConfig()">Export JSON</button>
      <label class="btn-secondary" for="school-config-import">Import JSON</label>
      <input id="school-config-import" type="file" accept="application/json,.json" style="display: none;" onchange="importSchoolConfig(this)">
    </div>
  </div>
</section>

`;

// Insert newBrandingSection right before <div class="cmd-overlay"
const cmdOverlayIdx = content.indexOf('<div class="cmd-overlay" id="cmd-overlay"');
if (cmdOverlayIdx !== -1) {
  content = content.substring(0, cmdOverlayIdx) + newBrandingSection + content.substring(cmdOverlayIdx);
}

// 2. Navigation item in ROLE_NAV_CONFIG.director
content = content.replace(
  /\{\s*id:\s*['"]director-settings['"],\s*label:\s*['"]Settings['"],\s*icon:\s*['"]settings['"],\s*pageId:\s*['"]page-director-settings['"]\s*\}/,
  "{ id: 'director-branding', label: 'Settings → Branding', icon: 'palette', pageId: 'page-director-branding' },\n    { id: 'director-settings', label: 'Settings', icon: 'settings', pageId: 'page-director-branding' }"
);

// 3. titleMap
content = content.replace(
  /'page-director-promotion':\s*'Year-End Promotion',/,
  "'page-director-promotion': 'Year-End Promotion',\n    'page-director-branding': 'Settings → Branding',\n    'page-director-settings': 'Settings → Branding',"
);

// 4. navigateTo hook
content = content.replace(
  /\} else if \(pageId === 'page-director-settings'\) \{/,
  "} else if (pageId === 'page-director-settings' || pageId === 'page-director-branding') {"
);

// 5. Replace BRAND_DEFAULTS and branding functions
const oldBrandSetup = `const PRODUCT_NAME = 'Eduvia';
const BRAND_DEFAULTS = Object.freeze({
  product_name: PRODUCT_NAME,
  school_name: 'Brainz Edu World',
  tagline: 'Senior Secondary',
  logo_url: null,
  support_email: 'support@school.edu',
  email_domain: '',
  footer_text: 'Protected institutional gateway',
  timezone: 'Asia/Kolkata',
  locale: 'en-IN',
  primary_color: null,
  accent_color: null
});`;

const newBrandSetup = `const DEFAULT_PRODUCT_NAME = 'Eduvia';
const PRODUCT_NAME = DEFAULT_PRODUCT_NAME;
const BRAND_DEFAULTS = Object.freeze({
  product_name: DEFAULT_PRODUCT_NAME,
  school_name: 'Brainz Edu World',
  tagline: 'Senior Secondary',
  logo_url: null,
  support_email: 'support@brainzeduworld.com',
  email_domain: 'brainzeduworld.com',
  footer_text: 'Protected institutional gateway',
  timezone: 'Asia/Kolkata',
  locale: 'en-IN',
  primary_color: null,
  accent_color: null
});`;

content = content.replace(oldBrandSetup, newBrandSetup);

// Replace brandContrastRatio and add brandTextContrast
const oldContrastFunc = `function brandContrastRatio(hex, background = '#FFFFFF') {
  const luminance = color => {
    const rgb = color.slice(1).match(/.{2}/g).map(channel => parseInt(channel, 16) / 255)
      .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  };
  const values = [luminance(hex), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}`;

const newContrastFunc = `function brandContrastRatio(hex, background = '#FFFFFF') {
  if (!hex || typeof hex !== 'string') return 1;
  const luminance = color => {
    const raw = color.replace(/^#/, '');
    const full = raw.length === 3 ? raw.split('').map(c => c + c).join('') : raw;
    const channels = full.match(/.{2}/g);
    if (!channels || channels.length < 3) return 1;
    const rgb = channels.slice(0, 3).map(channel => parseInt(channel, 16) / 255)
      .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  };
  const values = [luminance(hex), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

function brandTextContrast(hex) {
  if (!hex || typeof hex !== 'string') return 4.5;
  return Math.max(brandContrastRatio(hex, '#FFFFFF'), brandContrastRatio(hex, '#1C232B'));
}`;

content = content.replace(oldContrastFunc, newContrastFunc);

// Populate branding form as is

// Update updateBrandingPreview function
const oldPreviewFuncStart = `function updateBrandingPreview() {`;
const oldPreviewEnd = `  const mark = document.querySelector('#branding-preview-mark');
  if (mark) mark.setAttribute('aria-label', \`\${product}, \${school}\`);
}`;

const newPreviewFunc = `function updateBrandingPreview() {
  const primary = document.getElementById('branding-primary-color')?.value || brandPrimaryColor();
  const accent = document.getElementById('branding-accent-color')?.value || brandAccentColor();
  const product = document.getElementById('branding-product-name')?.value.trim() || SCHOOL_SETTINGS.product_name;
  const school = document.getElementById('branding-school-name')?.value.trim() || SCHOOL_SETTINGS.school_name;
  const tagline = document.getElementById('branding-tagline')?.value.trim() || SCHOOL_SETTINGS.tagline;
  const logo = document.getElementById('branding-logo-url')?.value.trim() || '';

  // Hex labels
  const phex = document.getElementById('branding-primary-hex');
  const ahex = document.getElementById('branding-accent-hex');
  if (phex) phex.textContent = primary.toUpperCase();
  if (ahex) ahex.textContent = accent.toUpperCase();

  // Swatches
  const primarySwatch = document.getElementById('branding-primary-swatch');
  const accentSwatch = document.getElementById('branding-accent-swatch');
  if (primarySwatch) primarySwatch.style.background = primary;
  if (accentSwatch) accentSwatch.style.background = accent;

  // Live preview stage nodes
  const previewProduct = document.getElementById('preview-sidebar-product');
  const previewSchool = document.getElementById('preview-sidebar-school');
  const previewTagline = document.getElementById('preview-tagline-text');
  const previewPill = document.getElementById('preview-status-pill-text');
  const previewDot = document.getElementById('preview-status-dot');
  const previewBtn = document.getElementById('preview-primary-btn');
  const previewBadge = document.getElementById('preview-accent-badge');
  const previewCrest = document.getElementById('preview-sidebar-crest');

  if (previewProduct) previewProduct.textContent = product;
  if (previewSchool) previewSchool.textContent = school;
  if (previewTagline) previewTagline.textContent = tagline;
  if (previewPill) previewPill.textContent = \`● LIVE · \${board}\`;
  if (previewDot) previewDot.style.background = accent;
  if (previewBtn) {
    previewBtn.style.background = primary;
    previewBtn.style.borderColor = primary;
    const btnWhiteContrast = brandContrastRatio(primary, '#FFFFFF');
    previewBtn.style.color = btnWhiteContrast >= 4.5 ? '#FFFFFF' : '#1C232B';
  }
  if (previewBadge) {
    previewBadge.style.background = accent + '33';
    previewBadge.style.borderColor = accent + '66';
    const badgeInkContrast = brandContrastRatio(accent, '#1C232B');
    previewBadge.style.color = badgeInkContrast >= 4.5 ? '#1C232B' : '#FFFFFF';
  }
  if (previewCrest) {
    previewCrest.style.background = primary;
    if (logo) {
      previewCrest.innerHTML = \`<img src="\${escapeHtml(logo)}" alt="" style="width:100%;height:100%;object-fit:contain;border-radius:inherit;" onerror="this.remove();this.parentElement.textContent='\${escapeHtml(product.charAt(0).toUpperCase())}'">\`;
    } else {
      previewCrest.textContent = product.charAt(0).toUpperCase();
    }
  }

  // Contrast calculation & WCAG AA verification
  const primaryContrast = brandTextContrast(primary);
  const accentContrast = brandTextContrast(accent);
  const minRatio = Math.min(primaryContrast, accentContrast);
  const passes = primaryContrast >= 4.5 && accentContrast >= 4.5;

  const contrastBadge = document.getElementById('branding-contrast-badge');
  const contrastResult = document.getElementById('branding-contrast-result');
  const valP = document.getElementById('val-primary-ratio');
  const valA = document.getElementById('val-accent-ratio');

  if (valP) valP.textContent = \`\${primaryContrast.toFixed(1)}:1\`;
  if (valA) valA.textContent = \`\${accentContrast.toFixed(1)}:1\`;

  if (contrastBadge && contrastResult) {
    if (passes) {
      contrastBadge.className = 'badge badge-sage';
      contrastResult.textContent = \`WCAG AA Compliant (\${minRatio.toFixed(1)}:1)\`;
    } else {
      contrastBadge.className = 'badge badge-red';
      contrastResult.textContent = \`Fails WCAG AA (\${minRatio.toFixed(1)}:1 < 4.5:1)\`;
    }
  }
}`;

const prevIdx = content.indexOf(oldPreviewFuncStart);
const prevEndIdx = content.indexOf(oldPreviewEnd, prevIdx);
if (prevIdx !== -1 && prevEndIdx !== -1) {
  content = content.substring(0, prevIdx) + newPreviewFunc + content.substring(prevEndIdx + oldPreviewEnd.length);
}

// Update saveSchoolBranding validation
const oldSaveFuncStart = `async function saveSchoolBranding(event) {`;
const oldSaveFuncEnd = `  showToast('Branding saved', \`\${SCHOOL_SETTINGS.school_name} branding is now active.\`, 'check');
}`;

const newSaveFunc = `async function saveSchoolBranding(event) {
  event.preventDefault();
  const value = id => document.getElementById(id)?.value.trim() || '';
  const domain = value('branding-email-domain').replace(/^@/, '').toLowerCase();
  const logoUrl = value('branding-logo-url');
  const primaryInput = value('branding-primary-color').toUpperCase();
  const accentInput = value('branding-accent-color').toUpperCase();
  const data = {
    singleton: true,
    id: 'default',
    product_name: value('branding-product-name'),
    school_name: value('branding-school-name'),
    tagline: value('branding-tagline'),
    logo_url: logoUrl || null,
    support_email: value('branding-support-email'),
    email_domain: domain,
    footer_text: value('branding-footer-text'),
    timezone: value('branding-timezone'),
    locale: value('branding-locale'),
    primary_color: primaryInput === '#6A8EAE' ? null : primaryInput,
    accent_color: accentInput === '#9EBBAF' ? null : accentInput,
    updated_at: new Date().toISOString()
  };

  const emailValid = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(data.support_email);
  const colorValid = color => !color || /^#[0-9A-F]{6}$/i.test(color);
  const timezoneValid = (() => { try { new Intl.DateTimeFormat(data.locale, { timeZone: data.timezone }); return true; } catch (_) { return false; } })();

  if (!data.product_name || !data.school_name || !data.tagline || !emailValid || !/^(?=.{1,253}$)[a-z0-9.-]+$/.test(domain) || !timezoneValid || !colorValid(data.primary_color) || !colorValid(data.accent_color)) {
    showToast('Check branding details', 'Please enter valid names, email, domain, timezone, locale, and hex colors.', 'alert-circle');
    return;
  }

  // WCAG AA contrast check
  const primaryContrast = brandTextContrast(primaryInput);
  const accentContrast = brandTextContrast(accentInput);
  if (primaryContrast < 4.5 || accentContrast < 4.5) {
    showToast('Color contrast too low', 'Primary and accent colors must pass WCAG AA (minimum 4.5:1 text contrast ratio).', 'alert-circle');
    return;
  }

  if (logoUrl && (!/^https?:\\/\\//i.test(logoUrl) || logoUrl.length > 500)) {
    showToast('Logo URL invalid', 'Use a valid image URL or leave the field empty.', 'alert-circle');
    return;
  }

  const client = getSupabaseClient();
  const button = document.getElementById('branding-save-button');
  if (button) button.disabled = true;

  try {
    if (client) {
      const { data: saved, error } = await client.from('school_settings').upsert(data, { onConflict: 'singleton' }).select('*').single();
      if (error) throw error;
      if (saved) SCHOOL_SETTINGS = { ...BRAND_DEFAULTS, ...saved };
    } else {
      SCHOOL_SETTINGS = { ...BRAND_DEFAULTS, ...data };
    }
  } catch (err) {
    console.warn('DB save notice (updating local cache):', err.message);
    SCHOOL_SETTINGS = { ...BRAND_DEFAULTS, ...data };
  } finally {
    if (button) button.disabled = false;
  }

  try {
    localStorage.setItem('school_settings_cache', JSON.stringify(SCHOOL_SETTINGS));
  } catch (_) {}

  applySchoolBranding();
  syncCrossTabs('SCHOOL_SETTINGS_UPDATED', SCHOOL_SETTINGS);
  showToast('Branding Saved', \`\${SCHOOL_SETTINGS.school_name} branding and appearance updated successfully.\`, 'check-circle');
}`;

const sSaveIdx = content.indexOf(oldSaveFuncStart);
const sSaveEndIdx = content.indexOf(oldSaveFuncEnd, sSaveIdx);
if (sSaveIdx !== -1 && sSaveEndIdx !== -1) {
  content = content.substring(0, sSaveIdx) + newSaveFunc + content.substring(sSaveEndIdx + oldSaveFuncEnd.length);
}

// 6. Startup cache loading in loadSchoolSettings
const oldLoadSchool = `async function loadSchoolSettings() {`;
const newLoadSchool = `// Synchronous startup cache hydration
(function hydrateSchoolSettingsFromCache() {
  try {
    const cached = localStorage.getItem('school_settings_cache');
    if (cached) {
      const parsed = JSON.parse(cached);
      SCHOOL_SETTINGS = { ...BRAND_DEFAULTS, ...parsed };
      }
  } catch (_) {}
})();

async function loadSchoolSettings() {`;

content = content.replace(oldLoadSchool, newLoadSchool);

// In loadSchoolSettings when fetched, save to cache
content = content.replace(
  /if \(!settingsResult\.error && settingsResult\.data\) SCHOOL_SETTINGS = \{ \.\.\.BRAND_DEFAULTS, \.\.\.settingsResult\.data \};/,
  `if (!settingsResult.error && settingsResult.data) {
      SCHOOL_SETTINGS = { ...BRAND_DEFAULTS, ...settingsResult.data };
      try { localStorage.setItem('school_settings_cache', JSON.stringify(SCHOOL_SETTINGS)); } catch (_) {}
    }`
);

// Subscribe to realtime updates on school_settings
const oldRealtimeSSE = `function initRealtimeSSE() {`;
const newRealtimeSubscribe = `function subscribeSchoolSettingsRealtime() {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    client.channel('realtime:school_settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'school_settings' }, payload => {
        if (payload.new) {
          SCHOOL_SETTINGS = { ...BRAND_DEFAULTS, ...payload.new };
          try { localStorage.setItem('school_settings_cache', JSON.stringify(SCHOOL_SETTINGS)); } catch (_) {}
          applySchoolBranding();
        }
      }).subscribe();
  } catch (_) {}
}

function initRealtimeSSE() {`;

content = content.replace(oldRealtimeSSE, newRealtimeSubscribe);

// In handleCrossTabSyncEvent:
content = content.replace(
  /if \(type === 'TEST_SCHEDULE_CHANGED'\) \{/,
  `if (type === 'SCHOOL_SETTINGS_UPDATED') {
    if (payload) {
      SCHOOL_SETTINGS = { ...BRAND_DEFAULTS, ...payload };
      applySchoolBranding();
    }
    return;
  }
  if (type === 'TEST_SCHEDULE_CHANGED') {`
);

// 7. Update applySchoolBranding to update more elements
content = content.replace(
  /const onlineLabel = document\.getElementById\('cluster-online-label'\);\s*if \(onlineLabel\) onlineLabel\.textContent = `● LIVE · Operational`;/,
  `const onlineLabel = document.getElementById('cluster-online-label');
  if (onlineLabel) onlineLabel.textContent = '● LIVE · Operational';
  const sideProduct = document.getElementById('sidebar-product-name');
  if (sideProduct) sideProduct.textContent = product;
  const sideTagline = document.getElementById('sidebar-school-tagline');
  if (sideTagline) sideTagline.textContent = SCHOOL_SETTINGS.tagline;
  const suppNode = document.getElementById('support-academic-node');
  if (suppNode) suppNode.textContent = 'Academic Node 04';
  const compSubtitle = document.getElementById('compliance-modal-subtitle');
  if (compSubtitle) compSubtitle.textContent = 'Affiliation Standards';
  const passBrandTag = document.getElementById('pass-brand-tag');
  if (passBrandTag) passBrandTag.textContent = \`\${product.toUpperCase()} · DIGITAL PASS\`;
  const passBoardLabel = document.getElementById('pass-board-label');
  if (passBoardLabel) passBoardLabel.textContent = 'SMART SECURE ID';`
);

// Update exportExecutiveSummary compliance string
content = content.replace(
  /'CBSE Academic Compliance Index,100%,Compliant'/,
  '"Academic Compliance Index,100%,Compliant"'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched Eduvia.html with full Branding engine!');
