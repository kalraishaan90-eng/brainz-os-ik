const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'Eduvia.html');
let html = fs.readFileSync(filePath, 'utf8');

// 1. Update STATE definition
const stateTarget = `const STATE = {
  currentUser: null,
  currentPage: 'page-teacher-overview',
  cmdSelectedIndex: 0,
  isSidebarOpenMobile: false,
  authMode: 'login', // 'login' | 'signup'
  selectedSignupRole: 'teacher',
  supabase: typeof supabase !== 'undefined' ? supabase : null
};`;

const stateReplacement = `const STATE = {
  currentUser: null,
  currentPage: 'page-teacher-overview',
  cmdSelectedIndex: 0,
  isSidebarOpenMobile: false,
  authMode: 'login', // 'login' | 'signup'
  selectedSignupRole: 'teacher',
  supabase: typeof supabase !== 'undefined' ? supabase : null,
  featureFlags: {
    attendance: true,
    gradebook: true,
    assignments: true,
    lecture_planner: true,
    test_schedule: true,
    leave_management: true,
    substitutions: true,
    broadcasts: true,
    school_feed: true,
    student_notes_register: true,
    houses_clubs: false,
    promotion: true
  }
};`;

html = html.replace(stateTarget.replace(/\n/g, '\r\n'), stateReplacement.replace(/\n/g, '\r\n'));
if (!html.includes('featureFlags: {')) {
  html = html.replace(stateTarget, stateReplacement);
}

// 2. Update isFeatureEnabled and loadSchoolFeatureFlags
const flagsTarget = `function isFeatureEnabled(id) { return STATE.featureFlags[id] !== false; }
function getRoleNavigation(role) {
  return (ROLE_NAV_CONFIG[role] || []).filter(item => {
    const flag = PAGE_FEATURES[item.pageId];
    return !flag || isFeatureEnabled(flag);
  });
}
async function loadSchoolFeatureFlags() {
  const client = getSupabaseClient();
  if (!client || !STATE.currentUser) return;
  const { data, error } = await client.from('feature_flags').select('id, enabled');
  if (error) { console.warn('Could not load school modules:', error.message); return; }
  if (Array.isArray(data)) data.forEach(row => {
    if (Object.prototype.hasOwnProperty.call(STATE.featureFlags, row.id)) STATE.featureFlags[row.id] = row.enabled === true;
  });
  renderSidebarNav();
}`;

const flagsReplacement = `function isFeatureEnabled(id) {
  if (!STATE.featureFlags) return id !== 'houses_clubs';
  return STATE.featureFlags[id] !== false;
}
function getRoleNavigation(role) {
  return (ROLE_NAV_CONFIG[role] || []).filter(item => {
    const flag = PAGE_FEATURES[item.pageId];
    return !flag || isFeatureEnabled(flag);
  });
}
async function loadSchoolFeatureFlags() {
  const client = getSupabaseClient();
  if (!STATE.featureFlags) {
    STATE.featureFlags = {
      attendance: true, gradebook: true, assignments: true, lecture_planner: true,
      test_schedule: true, leave_management: true, substitutions: true,
      broadcasts: true, school_feed: true, student_notes_register: true,
      houses_clubs: false, promotion: true
    };
  }
  if (!client || !STATE.currentUser) return;
  const { data, error } = await client.from('feature_flags').select('id, enabled');
  if (error) { console.warn('Could not load school modules:', error.message); return; }
  if (Array.isArray(data)) data.forEach(row => {
    STATE.featureFlags[row.id] = row.enabled === true;
  });
  renderSidebarNav();
}`;

html = html.replace(flagsTarget.replace(/\n/g, '\r\n'), flagsReplacement.replace(/\n/g, '\r\n'));
if (!html.includes('if (!STATE.featureFlags) {')) {
  html = html.replace(flagsTarget, flagsReplacement);
}

fs.writeFileSync(filePath, html, 'utf8');
console.log('Updated STATE and loadSchoolFeatureFlags successfully');
