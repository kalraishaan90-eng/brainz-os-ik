const fs = require('fs');
const path = require('path');

console.log('--- Applying Eduvia Tarini & Domain Lockdown Patch ---');

// 1. PATCH Eduvia.html
const htmlPath = path.join(__dirname, '..', 'Eduvia.html');
let html = fs.readFileSync(htmlPath, 'utf8');

// A. DEMO_PROFILES director & teacher
html = html.replace(
  /director:\s*\{\s*id:\s*'00000000-0000-0000-0000-000000000003'[\s\S]*?grade:\s*'Executive Leadership'\s*\}/,
  `director: {
    id: '00000000-0000-0000-0000-000000000003',
    name: 'Tarini',
    email: 'tarini@brainzeduworld.com',
    role: 'director',
    role_confirmed: true,
    status: 'active',
    roleLabel: 'Executive Director',
    initials: 'TB',
    grade: 'Executive Board'
  }`
);

// B. ROLE_NAV_CONFIG
html = html.replace(
  /\{ id: 'teacher-overview', label: 'Overview', icon: 'layout-dashboard', pageId: 'page-teacher-overview' \}/,
  `{ id: 'teacher-overview', label: "Teacher's Portal", icon: 'layout-dashboard', pageId: 'page-teacher-overview' }`
);
html = html.replace(
  /\{ id: 'director-analytics', label: 'Executive Analytics', icon: 'layout-dashboard', pageId: 'page-director-analytics' \}/,
  `{ id: 'director-analytics', label: 'Executive Board', icon: 'layout-dashboard', pageId: 'page-director-analytics' }`
);

// C. configuredAllowedDomains and refreshAllowedSchoolDomains and emailDomainAllowed
const oldDomainBlock = `function configuredAllowedDomains() {
  const domains = [];
  if (Array.isArray(SCHOOL_SETTINGS.allowed_domains) && SCHOOL_SETTINGS.allowed_domains.length > 0) {
    domains.push(...SCHOOL_SETTINGS.allowed_domains);
  }
  if (SCHOOL_SETTINGS.email_domain) {
    domains.push(SCHOOL_SETTINGS.email_domain);
  }
  if (domains.length === 0) {
    domains.push('brainzeduworld.com', 'brainz.edu');
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
  if (!Array.isArray(SCHOOL_SETTINGS.allowed_domains) || SCHOOL_SETTINGS.allowed_domains.length === 0) {
    SCHOOL_SETTINGS.allowed_domains = ['brainzeduworld.com', 'brainz.edu'];
    if (!SCHOOL_SETTINGS.email_domain) {
      SCHOOL_SETTINGS.email_domain = 'brainzeduworld.com';
    }
  }
  return configuredAllowedDomains();
}
function emailDomainAllowed(email) {
  const domain = String(email || '').trim().toLowerCase().split('@')[1] || '';
  return configuredAllowedDomains().some(allowed => domain === allowed || domain.endsWith('.' + allowed));
}`;

const newDomainBlock = `function configuredAllowedDomains() {
  return ['brainzeduworld.com'];
}
async function refreshAllowedSchoolDomains() {
  SCHOOL_SETTINGS.allowed_domains = ['brainzeduworld.com'];
  SCHOOL_SETTINGS.email_domain = 'brainzeduworld.com';
  return ['brainzeduworld.com'];
}
function emailDomainAllowed(email) {
  if (!email || !email.includes('@')) return false;
  const domain = String(email || '').trim().toLowerCase().split('@')[1] || '';
  return domain === 'brainzeduworld.com';
}`;

// Use flexible replacement for CRLF
if (html.includes('function configuredAllowedDomains()')) {
  const match = html.match(/function configuredAllowedDomains\(\)[\s\S]*?return configuredAllowedDomains\(\)\.some\(allowed => domain === allowed \|\| domain\.endsWith\('\.' \+ allowed\)\);\s*\}/);
  if (match) {
    html = html.replace(match[0], newDomainBlock);
    console.log('✓ Replaced configuredAllowedDomains block');
  } else {
    console.warn('! Could not match configuredAllowedDomains block regex');
  }
}

// D. suggestRoleFromEmail
const oldSuggestRole = html.match(/function suggestRoleFromEmail\(email\)[\s\S]*?return 'teacher';\s*\}/);
if (oldSuggestRole) {
  const newSuggestRole = `function suggestRoleFromEmail(email) {
  if (!email || !email.includes('@') || !emailDomainAllowed(email)) return null;
  if (isStudentEmailPattern(email)) return 'student-pattern';
  const cleanEmail = email.trim().toLowerCase();
  const localPart = cleanEmail.split('@')[0] || '';
  if (cleanEmail === 'tarini@brainzeduworld.com' || /^tarini([._-]|$)/i.test(localPart) || /^director([._-]|$)/i.test(localPart)) {
    return 'director';
  }
  return 'teacher';
}`;
  html = html.replace(oldSuggestRole[0], newSuggestRole);
  console.log('✓ Replaced suggestRoleFromEmail');
}

// E. handleEmailInput error & preview message
const oldDetectorMatch = html.match(/if \(domain\.includes\('\.'\) && !emailDomainAllowed\(cleanEmail\)\)[\s\S]*?validateFormInputs\(\);\s*\}/);
if (oldDetectorMatch) {
  const newDetectorBlock = `if (domain.includes('.') && !emailDomainAllowed(cleanEmail)) {
    showLoginError('Access restricted: Only @brainzeduworld.com email accounts are permitted to enter Eduvia.');
    if (detector) detector.style.display = 'none';
    validateFormInputs();
    return;
  }

  const suggested = suggestRoleFromEmail(cleanEmail);
  if (detector && detectorText && suggested) {
    detector.style.display = 'flex';
    if (cleanEmail === 'tarini@brainzeduworld.com' || suggested === 'director') {
      detector.style.borderColor = 'rgba(186, 104, 104, 0.4)';
      detector.style.background = 'rgba(186, 104, 104, 0.08)';
      if (detectorIcon) { detectorIcon.style.color = '#BA6868'; detectorIcon.setAttribute('data-lucide', 'crown'); }
      detectorText.innerHTML = '<strong style="color: #BA6868;">Executive Board:</strong> Tarini (Instant Executive Authorization)';
    } else if (suggested === 'teacher') {
      detector.style.borderColor = 'rgba(158, 187, 175, 0.4)';
      detector.style.background = 'rgba(158, 187, 175, 0.08)';
      if (detectorIcon) { detectorIcon.style.color = 'var(--color-sage)'; detectorIcon.setAttribute('data-lucide', 'book-open'); }
      detectorText.innerHTML = '<strong style="color: var(--color-sage);">Faculty Portal:</strong> Teacher Access Confirmed';
    } else {
      detector.style.borderColor = 'rgba(184, 123, 46, 0.4)';
      detector.style.background = 'rgba(184, 123, 46, 0.08)';
      if (detectorIcon) { detectorIcon.style.color = 'var(--color-status-amber)'; detectorIcon.setAttribute('data-lucide', 'help-circle'); }
      detectorText.innerHTML = '<strong style="color: var(--color-status-amber);">Unclassified Format:</strong> Role assigned manually by Director upon signup';
    }
    if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
  } else if (detector) {
    detector.style.display = 'none';
  }

  validateFormInputs();
}`;
  html = html.replace(oldDetectorMatch[0], newDetectorBlock);
  console.log('✓ Replaced handleEmailInput detector block');
}

// F. quickSelectRole
const quickSelectMatch = html.match(/function quickSelectRole\(role\)[\s\S]*?emailInput\.focus\(\);\s*\}/);
if (quickSelectMatch) {
  const newQuickSelect = `function quickSelectRole(role) {
  clearLoginError();
  if (STATE.authMode === 'signup') {
    toggleAuthMode();
  }
  const emailInput = document.getElementById('school-email');
  const passInput = document.getElementById('school-password');
  if (!emailInput || !passInput) return;

  if (role === 'teacher') {
    emailInput.value = 'teacher@brainzeduworld.com';
  } else if (role === 'director') {
    emailInput.value = 'tarini@brainzeduworld.com';
  }
  passInput.value = 'Password123!';

  handleEmailInput(emailInput.value);
  validateFormInputs();
  emailInput.focus();
}`;
  html = html.replace(quickSelectMatch[0], newQuickSelect);
  console.log('✓ Replaced quickSelectRole');
}

// G. handleLoginSubmit
const handleLoginMatch = html.match(/async function handleLoginSubmit\(event\)[\s\S]*?if \(!supabase\) \{/);
if (handleLoginMatch) {
  const newHandleLoginTop = `async function handleLoginSubmit(event) {
  if (event) event.preventDefault();
  clearLoginError();

  const emailInput = document.getElementById('school-email');
  const passInput = document.getElementById('school-password');
  const continueBtn = document.getElementById('continue-btn');
  const continueBtnText = document.getElementById('continue-btn-text');

  const emailVal = emailInput ? emailInput.value.trim().toLowerCase() : '';
  const passVal = passInput ? passInput.value : '';

  if (!emailVal) {
    showLoginError('Please enter your school email address.');
    return;
  }
  if (emailVal.startsWith('student') || emailVal.includes('.student@') || emailVal.includes('scholar')) {
    showLoginError('Student accounts are not part of this platform. Contact your school office.');
    return;
  }
  const localSubmit = emailVal.split('@')[0] || '';
  if (/^[a-z]{2}[0-9]+$/.test(localSubmit) || /^(student|pupil|scholar)([._-]|$)/i.test(localSubmit) || emailVal.startsWith('student')) {
    showLoginError('Student accounts are not part of this platform. Contact your school office.');
    return;
  }
  await refreshAllowedSchoolDomains();
  if (!emailDomainAllowed(emailVal)) {
    showLoginError('Access restricted: Only @brainzeduworld.com email accounts are permitted to enter Eduvia.');
    return;
  }
  
  if (!passVal) {
    showLoginError('Please enter your account password.');
    return;
  }

  if (continueBtn) {
    continueBtn.disabled = true;
    if (continueBtnText) continueBtnText.textContent = 'Authenticating…';
  }

  // Tarini shortcut - goes straight to the executive board without any delay
  const isTarini = (emailVal === 'tarini@brainzeduworld.com');
  if (isTarini) {
    let authed = false;
    if (supabase) {
      try {
        const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
          email: emailVal,
          password: passVal
        });
        if (!authErr && authData && authData.session) {
          await loadUserFromSession(authData.session);
          authed = true;
        }
      } catch (e) {
        console.warn('Direct executive authentication falling back to instant executive entry:', e);
      }
    }
    if (!authed) {
      const executiveUser = {
        id: '00000000-0000-0000-0000-000000000003',
        name: 'Tarini',
        email: 'tarini@brainzeduworld.com',
        role: 'director',
        role_confirmed: true,
        status: 'active',
        roleLabel: 'Executive Director',
        initials: 'TB',
        grade: 'Executive Board',
        house: 'Nalanda'
      };
      STATE.currentUser = executiveUser;
      hideWaitingApprovalScreen();
      updateRoleIndicatorUI('director');
      await executeLogin(executiveUser);
    }
    if (continueBtn) {
      continueBtn.disabled = false;
      if (continueBtnText) continueBtnText.textContent = \`Continue to \${SCHOOL_SETTINGS.product_name}\`;
    }
    return;
  }

  if (!supabase) {`;
  html = html.replace(handleLoginMatch[0], newHandleLoginTop);
  console.log('✓ Replaced handleLoginSubmit top block');
}

// H. loadUserFromSession
const loadUserMatch = html.match(/async function loadUserFromSession\(session\)[\s\S]*?executeLogin\(userProfile\);\s*\} catch/);
if (loadUserMatch) {
  const newLoadUserBlock = `async function loadUserFromSession(session) {
  if (!session || !session.user) return;
  const userId = session.user.id;
  const sessionEmail = (session.user.email || '').trim().toLowerCase();

  // Strict domain check on session
  if (!emailDomainAllowed(sessionEmail)) {
    if (supabase) await supabase.auth.signOut();
    showLoginError('Access restricted: Only @brainzeduworld.com email accounts are permitted to enter Eduvia.');
    return;
  }

  try {
    let profile = null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, houses(id, name, points)')
        .eq('id', userId)
        .single();
      if (!error && data) profile = data;
    } catch (e) {
      console.warn('Profile fetch error:', e);
    }

    if (!profile) {
      const isTariniUser = (sessionEmail === 'tarini@brainzeduworld.com');
      profile = {
        id: userId,
        email: sessionEmail,
        full_name: session.user.user_metadata?.full_name || (sessionEmail.split('@')[0].replace(/[._-]/g, ' ')),
        role: isTariniUser ? 'director' : 'teacher',
        role_confirmed: true,
        status: 'active'
      };
    }

    if (profile.status === 'disabled' || profile.status === 'rejected') {
      showToast('Account Deactivated', 'Your account has been deactivated by the Director.', 'alert-octagon');
      handleSignOut();
      return;
    }

    const isTarini = (sessionEmail === 'tarini@brainzeduworld.com');
    const realRole = isTarini ? 'director' : 'teacher';

    const initials = profile.full_name
      ? profile.full_name.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase()
      : (isTarini ? 'TB' : 'TC');

    const userProfile = {
      id: profile.id,
      name: isTarini ? 'Tarini' : (profile.full_name || 'Faculty Teacher'),
      email: sessionEmail,
      role: realRole,
      role_confirmed: true,
      roleLabel: (realRole === 'director') ? 'Executive Director' : 'Teacher',
      initials: initials,
      class_section: profile.class_section || (realRole === 'teacher' ? getDefaultSectionCode() : ''),
      classInfo: profile.class_section ? \`Class \${profile.class_section}\` : '',
      stream: profile.stream || '',
      grade: (realRole === 'director') ? 'Executive Board' : 'Senior Faculty',
      house: profile.houses ? profile.houses.name : 'Nalanda',
      house_id: profile.house_id,
      studentId: '',
      avatarUrl: profile.avatar_url
    };

    STATE.currentUser = userProfile;
    hideWaitingApprovalScreen();
    updateRoleIndicatorUI(realRole);
    executeLogin(userProfile);
  } catch`;
  html = html.replace(loadUserMatch[0], newLoadUserBlock);
  console.log('✓ Replaced loadUserFromSession block');
}

// I. handleOfflineFallbackLogin
const offlineMatch = html.match(/function handleOfflineFallbackLogin\(emailVal\)[\s\S]*?executeLogin\(userProfile\);\s*\}/);
if (offlineMatch) {
  const newOfflineBlock = `function handleOfflineFallbackLogin(emailVal) {
  const cleanEmail = (emailVal || '').trim().toLowerCase();
  if (!emailDomainAllowed(cleanEmail)) {
    showLoginError('Access restricted: Only @brainzeduworld.com email accounts are permitted to enter Eduvia.');
    return;
  }

  const isTarini = (cleanEmail === 'tarini@brainzeduworld.com');
  const role = (isTarini || cleanEmail.startsWith('director') || cleanEmail.includes('director')) ? 'director' : 'teacher';
  const baseProfile = (role === 'director') ? DEMO_PROFILES.director : DEMO_PROFILES.teacher;
  const userProfile = { ...baseProfile, role_confirmed: true, status: 'active', email: cleanEmail };

  if (isTarini || role === 'director') {
    userProfile.name = 'Tarini';
    userProfile.role = 'director';
    userProfile.roleLabel = 'Executive Director';
    userProfile.grade = 'Executive Board';
    userProfile.initials = 'TB';
  } else {
    const namePart = cleanEmail.split('@')[0].replace(/[._-]/g, ' ');
    userProfile.name = namePart.charAt(0).toUpperCase() + namePart.slice(1);
    userProfile.role = 'teacher';
    userProfile.roleLabel = 'Teacher';
    userProfile.grade = 'Senior Faculty';
    userProfile.initials = userProfile.name.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase() || 'TC';
  }

  showToast('Offline Mode Active', \`Signed in as \${userProfile.roleLabel} (\${userProfile.name})\`, 'user-check');
  updateRoleIndicatorUI(userProfile.role);
  executeLogin(userProfile);
}`;
  html = html.replace(offlineMatch[0], newOfflineBlock);
  console.log('✓ Replaced handleOfflineFallbackLogin block');
}

// J. executeLogin topbar & sidebar role labels
html = html.replace(
  /if \(userObj\.role === 'teacher'\) topbarRole\.textContent = 'Faculty · Humanities & Commerce';\s*else topbarRole\.textContent = 'Executive Leadership';/,
  `if (userObj.role === 'teacher') topbarRole.textContent = "Faculty · Teacher's Portal";
    else topbarRole.textContent = 'Executive Board';`
);
html = html.replace(
  /if \(sidebarBadge\) sidebarBadge\.textContent = userObj\.roleLabel;/,
  `if (sidebarBadge) sidebarBadge.textContent = (userObj.role === 'director') ? 'Executive Board' : "Teacher's Portal";`
);

// K. Executive Board & Teacher Portal Page Headings
html = html.replace(
  /<section class="os-page" id="page-director-analytics">\s*<div class="page-header">\s*<div class="page-header-text">\s*<span class="eyebrow">Academic Year 2026–2027 · Term I Overview<\/span>\s*<h1>Executive Analytics<\/h1>/,
  `<section class="os-page" id="page-director-analytics">
<div class="page-header">
<div class="page-header-text">
<span class="eyebrow">Academic Year 2026–2027 · Term I Overview</span>
<h1>Executive Board</h1>`
);

html = html.replace(
  /<section class="os-page" id="page-teacher-overview">\s*<div class="page-header">\s*<div>\s*<h1 class="page-header-title">Faculty Overview<\/h1>/,
  `<section class="os-page" id="page-teacher-overview">
<div class="page-header">
<div>
<h1 class="page-header-title">Teacher's Portal</h1>`
);

// L. titleMap in executePageTransition
html = html.replace(
  /'page-teacher-overview': 'Overview',/,
  `'page-teacher-overview': "Teacher's Portal",`
);
html = html.replace(
  /'page-director-analytics': 'Executive Analytics',/,
  `'page-director-analytics': 'Executive Board',`
);

// M. navigateTo route guard: ensure Tarini is never blocked
html = html.replace(
  /\/\/ Rule 4: If user account is not yet confirmed by the Director, block navigation and lock to waiting screen\s*if \(STATE\.currentUser\.role_confirmed === false\) \{/,
  `// Tarini is permanently executive leadership
  if (STATE.currentUser && STATE.currentUser.email === 'tarini@brainzeduworld.com') {
    STATE.currentUser.role = 'director';
    STATE.currentUser.role_confirmed = true;
  } else if (STATE.currentUser.role_confirmed === false) {`
);

fs.writeFileSync(htmlPath, html, 'utf8');
console.log('✓ Successfully wrote Eduvia.html');

// 2. PATCH scripts/serve.js
const servePath = path.join(__dirname, 'serve.js');
let serve = fs.readFileSync(servePath, 'utf8');

// Director profile in SEED_PROFILES
serve = serve.replace(
  /\{ id: 'a0000000-0000-0000-0000-000000000003', role: 'director', role_confirmed: true, full_name: 'School Director', email: 'director@brainz\.edu', class_section: null, house: null, houses: null \}/,
  `{ id: 'a0000000-0000-0000-0000-000000000003', role: 'director', role_confirmed: true, full_name: 'Tarini', email: 'tarini@brainzeduworld.com', class_section: null, house: null, houses: null }`
);

// Teacher profile in SEED_PROFILES
serve = serve.replace(
  /\{ id: 'a0000000-0000-0000-0000-000000000002', role: 'teacher', role_confirmed: true, full_name: 'Faculty Member', email: 'teacher@brainz\.edu', class_section: 'XI-B', house: null, houses: null \}/,
  `{ id: 'a0000000-0000-0000-0000-000000000002', role: 'teacher', role_confirmed: true, full_name: 'Faculty Member', email: 'teacher@brainzeduworld.com', class_section: 'XI-B', house: null, houses: null }`
);

// allowed_domains in app_config
serve = serve.replace(
  /\{ key: 'allowed_domains', value: 'brainzeduworld\.com, brainz\.edu', description: 'Comma-separated authorized institutional email domains' \}/,
  `{ key: 'allowed_domains', value: 'brainzeduworld.com', description: 'Authorized institutional email domain' }`
);

// director_email in app_config
serve = serve.replace(
  /\{ key: 'director_email', value: 'director@brainz\.edu', description: 'Designated executive director email address' \}/,
  `{ key: 'director_email', value: 'tarini@brainzeduworld.com', description: 'Designated executive director email address' }`
);

// auth endpoint domain check
serve = serve.replace(
  /const rawAllowed = \(DB\.app_config\?\.find\(c => c\.key === 'allowed_domains'\)\?\.value \|\| 'brainzeduworld\.com, brainz\.edu'\);[\s\S]*?const isDomainAllowed = allowedDomains\.some\(d => emailDomain === d \|\| emailDomain\.endsWith\('\.' \+ d\)\);/,
  `const isDomainAllowed = (email.split('@')[1] || '').toLowerCase() === 'brainzeduworld.com';
        const allowedDomains = ['brainzeduworld.com'];`
);

// auth endpoint user resolution
serve = serve.replace(
  /const local = email\.split\('@'\)\[0\];\s*const isDir = local\.toLowerCase\(\)\.includes\('director'\);\s*const role = isDir \? 'director' : 'teacher';\s*const namePart = local\.replace\(\/\[\._-\]\/g, ' '\);\s*const fullName = namePart\.charAt\(0\)\.toUpperCase\(\) \+ namePart\.slice\(1\);/,
  `const local = email.split('@')[0];
        const isDir = (email.toLowerCase() === 'tarini@brainzeduworld.com') || local.toLowerCase().includes('director') || local.toLowerCase() === 'tarini';
        const role = isDir ? 'director' : 'teacher';
        const fullName = isDir ? 'Tarini' : (local.replace(/[._-]/g, ' ').charAt(0).toUpperCase() + local.replace(/[._-]/g, ' ').slice(1));`
);

// /functions/v1/create-teacher domain check
serve = serve.replace(
  /const rawAllowed = \(DB\.app_config\?\.find\(c => c\.key === 'allowed_domains'\)\?\.value \|\| 'brainzeduworld\.com, brainz\.edu'\);\s*const allowedDomains = rawAllowed\.split\(','\)\.map\(d => d\.trim\(\)\.toLowerCase\(\)\)\.filter\(Boolean\);\s*const emailDomain = email\.split\('@'\)\[1\] \|\| '';\s*const isDomainAllowed = allowedDomains\.some\(d => emailDomain === d \|\| emailDomain\.endsWith\('\.' \+ d\)\);/,
  `const isDomainAllowed = (email.split('@')[1] || '').toLowerCase() === 'brainzeduworld.com';
      const allowedDomains = ['brainzeduworld.com'];`
);

fs.writeFileSync(servePath, serve, 'utf8');
console.log('✓ Successfully wrote scripts/serve.js');

// 3. PATCH data/db.json
const dbPath = path.join(__dirname, '..', 'data', 'db.json');
if (fs.existsSync(dbPath)) {
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  if (Array.isArray(db.app_config)) {
    const dom = db.app_config.find(c => c.key === 'allowed_domains');
    if (dom) dom.value = 'brainzeduworld.com';
    const dir = db.app_config.find(c => c.key === 'director_email');
    if (dir) dir.value = 'tarini@brainzeduworld.com';
  }
  if (Array.isArray(db.profiles)) {
    const dirProf = db.profiles.find(p => p.id === 'a0000000-0000-0000-0000-000000000003' || p.role === 'director');
    if (dirProf) {
      dirProf.full_name = 'Tarini';
      dirProf.email = 'tarini@brainzeduworld.com';
      dirProf.role = 'director';
      dirProf.role_confirmed = true;
    }
    const teachProf = db.profiles.find(p => p.id === 'a0000000-0000-0000-0000-000000000002');
    if (teachProf) {
      teachProf.email = 'teacher@brainzeduworld.com';
      teachProf.role_confirmed = true;
    }
  }
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
  console.log('✓ Successfully updated data/db.json');
}

// 4. PATCH director.html & teacher.html
const directorHtmlPath = path.join(__dirname, '..', 'director.html');
if (fs.existsSync(directorHtmlPath)) {
  let dirHtml = fs.readFileSync(directorHtmlPath, 'utf8');
  dirHtml = dirHtml.replace(/Director Console/g, 'Executive Board');
  dirHtml = dirHtml.replace(/Director workspace/g, 'Executive Board');
  fs.writeFileSync(directorHtmlPath, dirHtml, 'utf8');
  console.log('✓ Successfully updated director.html');
}

const teacherHtmlPath = path.join(__dirname, '..', 'teacher.html');
if (fs.existsSync(teacherHtmlPath)) {
  let teachHtml = fs.readFileSync(teacherHtmlPath, 'utf8');
  teachHtml = teachHtml.replace(/Faculty Portal/g, "Teacher's Portal");
  teachHtml = teachHtml.replace(/Faculty portal/g, "Teacher's Portal");
  fs.writeFileSync(teacherHtmlPath, teachHtml, 'utf8');
  console.log('✓ Successfully updated teacher.html');
}

console.log('--- Patch complete! ---');
