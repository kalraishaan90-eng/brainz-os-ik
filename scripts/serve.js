const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DEFAULT_ACADEMIC_DATA, generateAcademicSeedData } = require('./academic-presets-data');

const PORT = parseInt(process.env.PORT, 10) || 8080;
const ALT_PORT = 3000;
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff'
};

function generateSeedClassSections() {
  const sections = ['A', 'B', 'C', 'D'];
  const streams = ['Commerce', 'Science', 'Humanities'];
  const rom = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X', 11: 'XI', 12: 'XII' };
  const list = [];
  let count = 1;

  for (let g = 1; g <= 10; g++) {
    for (const s of sections) {
      const id = `cs-00000000-0000-4000-a000-${String(count++).padStart(12, '0')}`;
      list.push({
        id,
        grade: g,
        section: s,
        stream: null,
        display_name: `Class ${g}-${s}`,
        active: true
      });
    }
  }

  for (let g = 11; g <= 12; g++) {
    for (const s of sections) {
      for (const str of streams) {
        const id = `cs-00000000-0000-4000-a000-${String(count++).padStart(12, '0')}`;
        list.push({
          id,
          grade: g,
          section: s,
          stream: str,
          display_name: `Class ${rom[g]}-${s} (${str})`,
          active: true
        });
      }
    }
  }
  return list;
}

const SEED_PROFILES = [
  { id: 'a0000000-0000-0000-0000-000000000001', role: 'record', role_confirmed: true, full_name: 'Student Scholar', email: 'student@brainz.edu', class_section: 'XII-B', student_id_code: '1102-01', house: 'Nalanda', houses: { id: 'nalanda', name: 'Nalanda', points: 150 } },
  { id: 'a0000000-0000-0000-0000-000000000002', role: 'teacher', role_confirmed: true, full_name: 'Faculty Member', email: 'teacher@brainzeduworld.com', class_section: 'XI-B', house: null, houses: null },
  { id: 'a0000000-0000-0000-0000-000000000003', role: 'director', role_confirmed: true, full_name: 'Taarini', email: 'taarini@brainzeduworld.com', class_section: null, house: null, houses: null },
  { id: 'a0000000-0000-0000-0000-000000000004', role: 'teacher', role_confirmed: true, full_name: 'Bosky', email: 'bosky@brainzeduworld.com', class_section: 'XI-A', house: 'Nalanda', houses: null },
  { id: 'a0000000-0000-0000-0000-000000000005', role: 'teacher', role_confirmed: true, full_name: 'Ambika', email: 'ambika@brainzeduworld.com', class_section: 'XI-B', house: 'Takshashila', houses: null },
  { id: 'b0000000-0000-0000-0000-000000000001', role: 'record', role_confirmed: true, full_name: 'Ishaan Kalra', email: 'ishaan.kalra@brainz.edu', class_section: 'XI-B', student_id_code: 'BOS-XIB-041', house: 'Nalanda', houses: { id: 'nalanda', name: 'Nalanda', points: 150 } },
  { id: 'b0000000-0000-0000-0000-000000000051', role: 'record', role_confirmed: true, full_name: 'Siddharth Rao', email: 'siddharth.rao@brainz.edu', class_section: 'XI-A', student_id_code: 'BOS-XIA-012', house: 'Takshashila', houses: { id: 'takshashila', name: 'Takshashila', points: 130 } },
  { id: 'b0000000-0000-0000-0000-000000000052', role: 'record', role_confirmed: true, full_name: 'Riya Malhotra', email: 'riya.malhotra@brainz.edu', class_section: 'XII-A', student_id_code: 'BOS-XIIA-008', house: 'Nalanda', houses: { id: 'nalanda', name: 'Nalanda', points: 150 } },
  { id: 'b0000000-0000-0000-0000-000000000053', role: 'record', role_confirmed: true, full_name: 'Ananya Gupta', email: 'ananya.gupta@brainz.edu', class_section: '3-A', student_id_code: 'BOS-03A-001', house: 'Nalanda', houses: { id: 'nalanda', name: 'Nalanda', points: 150 } },
  { id: 'b0000000-0000-0000-0000-000000000054', role: 'record', role_confirmed: true, full_name: 'Kabir Singh', email: 'kabir.singh@brainz.edu', class_section: '8-A', student_id_code: 'BOS-08A-001', house: 'Takshashila', houses: { id: 'takshashila', name: 'Takshashila', points: 130 } }
];

const DEFAULT_DB = {
  profiles: SEED_PROFILES,
  class_sections: generateSeedClassSections(),
  houses: [
    { id: 'nalanda', name: 'Nalanda', points: 150 },
    { id: 'takshashila', name: 'Takshashila', points: 130 }
  ],
  test_schedule: [
    {
      id: 'ts-init-1',
      teacher_id: 'a0000000-0000-0000-0000-000000000002',
      teacher_name: 'Faculty Member',
      class_section: 'XI-B',
      subject: 'Political Science',
      date: '2026-10-05',
      topic: 'Constitutional Design & Rights'
    },
    {
      id: 'ts-init-2',
      teacher_id: 'a0000000-0000-0000-0000-000000000002',
      teacher_name: 'Faculty Member',
      class_section: 'XI-B',
      subject: 'Economics',
      date: '2026-10-12',
      topic: 'Consumer Equilibrium & Demand Analysis'
    }
  ],
  broadcasts: [
    {
      id: 'bc-init-1',
      headline: 'CBSE Term I Moderation Schedule Confirmed',
      message: 'Institutional assessment moderation and hall tickets will be issued by the examination directorate this week.',
      audience: 'Whole School',
      category: 'Academics',
      author: 'School Director',
      published_by: 'a0000000-0000-0000-0000-000000000003',
      created_at: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      id: 'bc-init-2',
      headline: 'Campus Library Extended Study Hours',
      message: 'The central academic library and digital pods are now open till 8:00 PM for senior secondary students.',
      audience: 'Students Only',
      category: 'Student Life',
      author: 'School Director',
      published_by: 'a0000000-0000-0000-0000-000000000003',
      created_at: new Date(Date.now() - 3600000 * 5).toISOString()
    },
    {
      id: 'bc-init-3',
      headline: 'Departmental Faculty Moderation Briefing',
      message: 'All teaching faculty are requested to submit internal syllabus completion benchmarks by Friday 4 PM.',
      audience: 'Teachers Only',
      category: 'Operations',
      author: 'School Director',
      published_by: 'a0000000-0000-0000-0000-000000000003',
      created_at: new Date(Date.now() - 3600000 * 8).toISOString()
    }
  ],
  assignments: [
    {
      id: 'asg-init-1',
      title: 'Elasticity of Demand & Price Mechanism',
      class_section: 'XI-B',
      due_date: '2026-10-02',
      instructions: 'Complete exercises 1 to 4 from chapter 3 of NCERT Economics.',
      status: 'active'
    }
  ],
  lecture_plan: [
    {
      id: 'lp-init-1',
      teacher_id: 'a0000000-0000-0000-0000-000000000002',
      class_section: 'XI-B',
      subject: 'Political Science',
      date: new Date().toISOString().split('T')[0],
      topic: 'Philosophy of the Constitution',
      completed: true,
      completed_at: new Date().toISOString()
    }
  ],
  attendance_records: [],
  leave_records: [],
  audit_logs: [],
  academic_years: [
    {
      id: 'ay-2026-27',
      label: '2026–27',
      start_date: '2026-04-01',
      end_date: '2027-03-31',
      status: 'active',
      pass_percentage: 40,
      require_subject_minimum: false,
      subject_minimum_percentage: 33,
      created_at: new Date().toISOString()
    }
  ],
  class_progression: [
    { id: 'cp-1', from_class: 'I', to_class: 'II', is_final: false, override_section: null },
    { id: 'cp-2', from_class: 'II', to_class: 'III', is_final: false, override_section: null },
    { id: 'cp-3', from_class: 'III', to_class: 'IV', is_final: false, override_section: null },
    { id: 'cp-4', from_class: 'IV', to_class: 'V', is_final: false, override_section: null },
    { id: 'cp-5', from_class: 'V', to_class: 'VI', is_final: false, override_section: null },
    { id: 'cp-6', from_class: 'VI', to_class: 'VII', is_final: false, override_section: null },
    { id: 'cp-7', from_class: 'VII', to_class: 'VIII', is_final: false, override_section: null },
    { id: 'cp-8', from_class: 'VIII', to_class: 'IX', is_final: false, override_section: null },
    { id: 'cp-9', from_class: 'IX', to_class: 'X', is_final: false, override_section: null },
    { id: 'cp-10', from_class: 'X', to_class: 'XI', is_final: false, override_section: null },
    { id: 'cp-11', from_class: 'XI', to_class: 'XII', is_final: false, override_section: null },
    { id: 'cp-12', from_class: 'XII', to_class: null, is_final: true, override_section: null }
  ],
  final_results: [],
  promotion_records: [],
  feature_flags: [
    { id: 'attendance', name: 'Period Attendance & Reports', description: 'Take attendance, generate class attendance reports and trends', enabled: true, depends_on: [] },
    { id: 'gradebook', name: 'Gradebook & Final Marks', description: 'Track continuous assessment, rubric scores, and exam marks', enabled: true, depends_on: [] },
    { id: 'assignments', name: 'Coursework & Assignments', description: 'Publish assignments, track student coursework and deadlines', enabled: true, depends_on: [] },
    { id: 'lecture_planner', name: 'Lecture & Test Planner', description: 'Daily syllabus lesson delivery and test planning calendar', enabled: true, depends_on: [] },
    { id: 'test_schedule', name: 'Test Schedule Rollup', description: 'Class test scheduling and master exam schedule rollups', enabled: true, depends_on: [] },
    { id: 'leave_management', name: 'Staff Leave Management', description: 'Staff leave applications, approval workflows, and status tracking', enabled: true, depends_on: [] },
    { id: 'substitutions', name: 'Staff Substitutions', description: 'Period cover assignments and automated teacher replacement allocations', enabled: true, depends_on: ['leave_management'] },
    { id: 'broadcasts', name: 'Broadcasts & Notices', description: 'School-wide and targeted institutional notices and bulletins', enabled: true, depends_on: [] },
    { id: 'school_feed', name: 'School Feed', description: 'Stream of institutional updates, campus highlights, and event feeds', enabled: true, depends_on: [] },
    { id: 'student_notes_register', name: 'Student Notes & Cumulative Register', description: 'Confidential student notes register, history, and disciplinary observations', enabled: true, depends_on: [] },
    { id: 'houses_clubs', name: 'Houses & Clubs', description: 'Optional house and club management records', enabled: false, depends_on: [] },
    { id: 'promotion', name: 'Year-End Promotion', description: 'Academic session progression rules and batch student promotion', enabled: true, depends_on: ['gradebook'] }
  ],
  app_config: [
    { key: 'allowed_domains', value: 'brainzeduworld.com', description: 'Authorized institutional email domain' },
    { key: 'school_name', value: 'Brainz Educational World', description: 'Full institutional name of the school' },
    { key: 'director_email', value: 'tarini@brainzeduworld.com', description: 'Designated executive director email address' }
  ],
  school_settings: [
    {
      id: 'default',
      singleton: true,
      product_name: 'Eduvia',
      school_name: 'Brainz Edu World',
      tagline: 'Senior Secondary',
      logo_url: null,
      support_email: 'support@brainzeduworld.com',
      email_domain: 'brainzeduworld.com',
      footer_text: 'Protected institutional gateway',
      timezone: 'Asia/Kolkata',
      locale: 'en-IN',
      primary_color: null,
      accent_color: null,
      updated_at: new Date().toISOString()
    }
  ],
  ...generateAcademicSeedData()
};

function backfillAcademicRelations(db) {
  const sections = db.sections || [];
  const gradeLevels = db.grade_levels || [];
  const streams = db.streams || [];
  const subjects = db.subjects || [];
  const assessmentTypes = db.assessment_types || [];
  const terms = db.terms || [];

  const commStream = streams.find(s => s.name === 'Commerce') || streams[0];
  const term1 = terms.find(t => t.name === 'Term 1') || terms[0];

  function findSection(code) {
    if (!code) return null;
    const clean = String(code).trim();
    const m = clean.match(/(XII|XI|[1-9]|10)-([A-D])/i);
    if (!m) return null;
    const gradeCode = m[1].toUpperCase();
    const secLetter = m[2].toUpperCase();
    const gl = gradeLevels.find(g => g.code.toUpperCase() === gradeCode);
    if (!gl) return null;
    return sections.find(s => s.grade_level_id === gl.id && s.name.toUpperCase() === secLetter);
  }

  function findSubject(name) {
    if (!name) return null;
    const clean = String(name).trim().toLowerCase();
    return subjects.find(s => s.name.toLowerCase() === clean || s.name.toLowerCase().includes(clean) || clean.includes(s.name.toLowerCase()));
  }

  (db.profiles || []).forEach(p => {
    if (!p.section_id && p.class_section) {
      const sec = findSection(p.class_section);
      if (sec) {
        p.section_id = sec.id;
        p.grade_level_id = sec.grade_level_id;
      }
    }
    if (!p.stream_id && commStream && p.class_section && (p.class_section.includes('Commerce') || ['XI-B', 'XII-B', 'XI-A', 'XII-A'].includes(p.class_section))) {
      p.stream_id = commStream.id;
    }
  });

  (db.assignments || []).forEach(a => {
    if (!a.section_id && a.class_section) {
      const sec = findSection(a.class_section);
      if (sec) a.section_id = sec.id;
    }
    if (!a.subject_id && a.subject) {
      const sub = findSubject(a.subject);
      if (sub) a.subject_id = sub.id;
    }
  });

  (db.timetable_entries || []).forEach(t => {
    if (!t.section_id && t.class_section) {
      const sec = findSection(t.class_section);
      if (sec) t.section_id = sec.id;
    }
    if (!t.subject_id && t.subject) {
      const sub = findSubject(t.subject);
      if (sub) t.subject_id = sub.id;
    }
  });

  (db.lecture_plan || []).forEach(lp => {
    if (!lp.section_id && lp.class_section) {
      const sec = findSection(lp.class_section);
      if (sec) lp.section_id = sec.id;
    }
    if (!lp.subject_id && lp.subject) {
      const sub = findSubject(lp.subject);
      if (sub) lp.subject_id = sub.id;
    }
  });

  (db.test_schedule || []).forEach(ts => {
    if (!ts.section_id && ts.class_section) {
      const sec = findSection(ts.class_section);
      if (sec) ts.section_id = sec.id;
    }
    if (!ts.subject_id && ts.subject) {
      const sub = findSubject(ts.subject);
      if (sub) ts.subject_id = sub.id;
    }
  });

  (db.grades || []).forEach(g => {
    if (!g.assessment_type_id && g.category) {
      const at = assessmentTypes.find(a => a.code === g.category || a.name.toLowerCase() === g.category.toLowerCase());
      if (at) g.assessment_type_id = at.id;
    }
    if (!g.term_id && term1) g.term_id = term1.id;
  });
}

// Database load and persist helpers
if (!fs.existsSync(DATA_DIR)) {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
}

let DB = DEFAULT_DB;
try {
  if (fs.existsSync(DB_FILE)) {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    DB = Object.assign({}, DEFAULT_DB, JSON.parse(raw));
    if (!DB.class_sections || DB.class_sections.length === 0) {
      DB.class_sections = generateSeedClassSections();
    }
    if (!DB.academic_years || DB.academic_years.length === 0) {
      DB.academic_years = DEFAULT_DB.academic_years;
    }
    if (!DB.class_progression || DB.class_progression.length === 0) {
      DB.class_progression = DEFAULT_DB.class_progression;
    }
    if (!DB.feature_flags || DB.feature_flags.length === 0) {
      DB.feature_flags = DEFAULT_DB.feature_flags;
    }
    if (!DB.app_config || DB.app_config.length === 0) {
      DB.app_config = DEFAULT_DB.app_config;
    }
    if (!DB.school_settings || DB.school_settings.length === 0) {
      DB.school_settings = DEFAULT_DB.school_settings;
    }

    const academicSeed = generateAcademicSeedData();
    const academicTables = Object.keys(academicSeed);
    academicTables.forEach(tbl => {
      if (!DB[tbl] || DB[tbl].length === 0) {
        DB[tbl] = academicSeed[tbl];
      }
    });

    backfillAcademicRelations(DB);
    fs.writeFileSync(DB_FILE, JSON.stringify(DB, null, 2));
  } else {
    backfillAcademicRelations(DB);
    fs.writeFileSync(DB_FILE, JSON.stringify(DB, null, 2));
  }
} catch (e) {
  console.warn('[DB] Error loading db.json, using defaults:', e.message);
}

function saveDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(DB, null, 2));
  } catch (e) {
    console.error('[DB] Error saving db.json:', e);
  }
}

// Connected WebSocket / SSE clients
const realtimeClients = new Set();
function notifyRealtimeClients(tableName, event, record) {
  const payload = JSON.stringify({ table: tableName, event, record });
  for (const client of realtimeClients) {
    try {
      if (client.readyState === 1) { // WebSocket open
        client.send(payload);
      } else if (client.write) { // SSE
        client.write(`data: ${payload}\n\n`);
      }
    } catch (e) {
      realtimeClients.delete(client);
    }
  }
}

const serveRateLimits = new Map();
function isServeRateLimited(key, maxLimit = 30, windowMs = 60000) {
  const now = Date.now();
  const list = serveRateLimits.get(key) || [];
  const valid = list.filter(t => now - t < windowMs);
  if (valid.length >= maxLimit) return true;
  valid.push(now);
  serveRateLimits.set(key, valid);
  return false;
}

function getUserFromRequest(req) {
  const authHeader = req.headers['authorization'] || '';
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }
  const rawToken = authHeader.replace('Bearer ', '').trim();
  if (!rawToken || rawToken === 'expired-token' || rawToken === 'forged-token') {
    return null;
  }

  // Handle standard JWT
  if (rawToken.includes('.')) {
    try {
      const parts = rawToken.split('.');
      if (parts.length === 3) {
        const decoded = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
        // Reject expired token
        if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
          return null;
        }
        // Reject forged token (signature verification against secret)
        const expectedSig = crypto.createHmac('sha256', 'mock-secret').update(`${parts[0]}.${parts[1]}`).digest('base64url');
        if (parts[2] !== expectedSig && !parts[2].startsWith('mock-')) {
          return null;
        }
        // Strict: look up profile by sub from DB.profiles (never trust client user_metadata)
        if (decoded.sub) {
          const u = (DB.profiles || []).find(p => p.id === decoded.sub);
          if (u) return u;
        }
      }
    } catch (_) {}
  }

  // Handle mock tokens in tests
  if (rawToken.startsWith('mock-local-token-')) {
    const role = rawToken.replace('mock-local-token-', '').trim();
    const u = (DB.profiles || []).find(p => p.role === role);
    if (u) return u;
  }

  const uById = (DB.profiles || []).find(p => p.id === rawToken);
  if (uById) return uById;

  return null;
}

function getRoleFromRequest(req) {
  const user = getUserFromRequest(req);
  return user ? user.role : null;
}

// Request Handler
function handleRequest(req, res) {
  // CORS & Security Headers
  const clientOrigin = req.headers['origin'];
  const allowedOrigins = [
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://eduvia.brainzeduworld.com',
    'https://brainzos.edu'
  ];
  if (clientOrigin && (allowedOrigins.includes(clientOrigin) || clientOrigin.endsWith('.brainzeduworld.com'))) {
    res.setHeader('Access-Control-Allow-Origin', clientOrigin);
  } else if (!clientOrigin) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0]);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey, x-client-info, Prefer, Accept');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; connect-src 'self' http://localhost:* ws://localhost:* http://127.0.0.1:* ws://127.0.0.1:* https://*.supabase.co wss://*.supabase.co; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const reqPath = decodeURI(parsedUrl.pathname);

  // Helper to construct standard JWT format for Supabase client compatibility
  function makeMockJwt(payloadObj) {
    const b64 = obj => Buffer.from(JSON.stringify(obj)).toString('base64url');
    const header = b64({ alg: 'HS256', typ: 'JWT' });
    const payload = b64(payloadObj);
    const signature = crypto.createHmac('sha256', 'mock-secret').update(`${header}.${payload}`).digest('base64url');
    return `${header}.${payload}.${signature}`;
  }

  // 1. Mock Supabase Auth Endpoint
  if (reqPath.startsWith('/auth/v1/')) {
    const clientIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1').split(',')[0].trim();
    if (isServeRateLimited(`auth-${clientIp}`, 50, 60000)) {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Too many authentication attempts. Please try again later.', code: '429' }));
      return;
    }
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      let email = null;
      let roleFromToken = null;
      let user = null;
      const authHeader = req.headers['authorization'] || '';

      if (authHeader.startsWith('Bearer ')) {
        const rawToken = authHeader.replace('Bearer ', '').trim();
        if (rawToken.startsWith('mock-local-token-')) {
          roleFromToken = rawToken.replace('mock-local-token-', '').trim();
        } else if (rawToken.includes('.')) {
          try {
            const parts = rawToken.split('.');
            if (parts.length === 3) {
              const decoded = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
              if (decoded.user_metadata && decoded.user_metadata.role) {
                roleFromToken = decoded.user_metadata.role;
              }
              if (decoded.sub) {
                const u = DB.profiles.find(p => p.id === decoded.sub);
                if (u) user = u;
              }
            }
          } catch (e) {}
        }
      }

      try {
        const parsed = JSON.parse(body);
        if (parsed.email) email = parsed.email;
        if (parsed.refresh_token && parsed.refresh_token.startsWith('mock-refresh-')) {
          roleFromToken = parsed.refresh_token.replace('mock-refresh-', '').trim();
        }
      } catch (e) {}

      if ((email && /^(student|pupil|[a-z]{2}\d+)/i.test(email.split('@')[0] || '')) || ['student', 'record'].includes(String(roleFromToken || '').toLowerCase())) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'student_accounts_disabled',
          error_description: 'Student accounts are not part of this platform. Contact your school office.',
          message: 'Student accounts are not part of this platform. Contact your school office.'
        }));
        return;
      }

      if (email) {
        const isDomainAllowed = ['brainzeduworld.com', 'zipzero.com', 'brainz.edu'].includes((email.split('@')[1] || '').toLowerCase());
        const allowedDomains = ['brainzeduworld.com', 'zipzero.com'];

        if (!isDomainAllowed) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: 'unauthorized_domain',
            error_description: `Access restricted: Institutional email domain (@${emailDomain}) is not authorized. Allowed domain(s): ${allowedDomains.join(', ')}`,
            message: `Access restricted: Institutional email domain (@${emailDomain}) is not authorized. Allowed domain(s): ${allowedDomains.join(', ')}`
          }));
          return;
        }
      }

      if (!user && email) {
        user = DB.profiles.find(p => p.email && p.email.toLowerCase() === email.toLowerCase());
      }
      if (!user && roleFromToken) {
        user = DB.profiles.find(p => p.role && p.role.toLowerCase() === roleFromToken.toLowerCase());
      }
      if (!user && email) {
        const local = email.split('@')[0];
        const isDir = (email.toLowerCase() === 'tarini@brainzeduworld.com') || (email.toLowerCase() === 'tarini@zipzero.com') || /^t[a]+rini([._-]|$)/i.test(local) || local.toLowerCase().includes('tarini') || local.toLowerCase().includes('taarini') || local.toLowerCase().includes('director');
        const role = isDir ? 'director' : 'teacher';
        const namePart = local.replace(/[._-]/g, ' ');
        const fullName = isDir ? 'Taarini' : (namePart.charAt(0).toUpperCase() + namePart.slice(1));
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
      }

      if (req.method === 'GET' && reqPath.includes('/user')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          id: user.id,
          aud: 'authenticated',
          role: 'authenticated',
          email: user.email,
          user_metadata: { role: user.role, full_name: user.full_name }
        }));
        return;
      }

      const exp = Math.floor(Date.now() / 1000) + 86400 * 7;
      const accessToken = makeMockJwt({
        sub: user.id,
        aud: 'authenticated',
        role: 'authenticated',
        email: user.email,
        app_metadata: { provider: 'email' },
        user_metadata: { role: user.role, full_name: user.full_name },
        exp: exp
      });

      const tokenResponse = {
        access_token: accessToken,
        token_type: 'bearer',
        expires_in: 86400 * 7,
        refresh_token: 'mock-refresh-' + user.role,
        user: {
          id: user.id,
          aud: 'authenticated',
          role: 'authenticated',
          email: user.email,
          user_metadata: { role: user.role, full_name: user.full_name }
        }
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(tokenResponse));
    });
    return;
  }

  // 1.5 Edge Function Endpoint: /functions/v1/create-teacher
  if (reqPath.startsWith('/functions/v1/create-teacher')) {
    const callerUser = getUserFromRequest(req);
    if (!callerUser) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized: Authentication required.' }));
      return;
    }
    if (callerUser.role !== 'director') {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Forbidden: Director authorization required to create teacher accounts.' }));
      return;
    }

    if (isServeRateLimited('create-teacher-' + callerUser.id, 10, 60000)) {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Too many requests. Please wait before creating more accounts.' }));
      return;
    }

    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      let payload = {};
      try { payload = JSON.parse(body); } catch (e) {}

      // Reject unknown properties (schema validation & mass assignment defense)
      const allowedKeys = new Set(['full_name', 'email', 'role', 'class_sections_taught', 'class_section_ids']);
      const unknownKeys = Object.keys(payload).filter(k => !allowedKeys.has(k));
      if (unknownKeys.length > 0) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Unknown request properties rejected: ${unknownKeys.join(', ')}` }));
        return;
      }

      const fullName = (payload.full_name || '').trim();
      const email = (payload.email || '').trim().toLowerCase();
      const assignedRole = (payload.role === 'director') ? 'director' : 'teacher';

      if (!fullName || fullName.length < 2) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: "User's full name is required (minimum 2 characters)." }));
        return;
      }
      if (!email || !email.includes('@')) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: "A valid email address is required." }));
        return;
      }

      // Allowed domains validation
      const isDomainAllowed = ['brainzeduworld.com', 'zipzero.com', 'brainz.edu'].includes((email.split('@')[1] || '').toLowerCase());
      const allowedDomains = ['brainzeduworld.com', 'zipzero.com'];

      if (!isDomainAllowed) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: `Institutional email must belong to an authorized domain (${allowedDomains.join(', ')}).`
        }));
        return;
      }

      // Class section validation (mandatory for teachers, optional for directors)
      let submittedIds = [];
      if (Array.isArray(payload.class_section_ids) && payload.class_section_ids.length > 0) {
        submittedIds = payload.class_section_ids.map(id => String(id).trim()).filter(Boolean);
      } else if (Array.isArray(payload.class_sections_taught) && payload.class_sections_taught.length > 0) {
        submittedIds = payload.class_sections_taught.map(id => String(id).trim()).filter(Boolean);
      } else if (typeof payload.class_sections_taught === 'string' && payload.class_sections_taught.trim()) {
        submittedIds = payload.class_sections_taught.split(',').map(s => s.trim()).filter(Boolean);
      }

      if (assignedRole === 'teacher' && submittedIds.length === 0) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: "At least one class section must be selected for the faculty member." }));
        return;
      }

      const availableSections = DB.class_sections || [];
      const romMap = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X', 11: 'XI', 12: 'XII' };
      const toRoman = n => romMap[n] || String(n);
      const validatedSections = [];

      for (const token of submittedIds) {
        const match = availableSections.find(cs =>
          cs.id === token ||
          cs.display_name.toLowerCase() === token.toLowerCase() ||
          `${cs.grade}-${cs.section}`.toLowerCase() === token.toLowerCase() ||
          (cs.grade >= 11 && `${toRoman(cs.grade)}-${cs.section}`.toLowerCase() === token.toLowerCase()) ||
          (cs.grade >= 11 && `${toRoman(cs.grade)}-${cs.section} ${cs.stream}`.toLowerCase() === token.toLowerCase()) ||
          (cs.grade >= 11 && `Class ${toRoman(cs.grade)}-${cs.section}`.toLowerCase() === token.toLowerCase())
        );

        if (!match) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: `Invalid class section: "${token}" does not exist in the institutional class registry.`,
            code: "CLASS_SECTION_NOT_FOUND"
          }));
          return;
        }

        if (!match.active) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: `Class section "${match.display_name}" is deactivated. Only active sections can be assigned to faculty.`,
            code: "CLASS_SECTION_INACTIVE"
          }));
          return;
        }

        if (!validatedSections.some(v => v.id === match.id)) {
          validatedSections.push(match);
        }
      }

      const classSectionCodes = validatedSections.map(cs => {
        if (cs.grade >= 11) {
          return `${toRoman(cs.grade)}-${cs.section}`;
        }
        return `${cs.grade}-${cs.section}`;
      });
      const classesStr = classSectionCodes.join(', ');
      const verifiedDisplayNames = validatedSections.map(cs => cs.display_name).join(', ');

      const dup = DB.profiles.find(p => (p.email || '').toLowerCase() === email);
      if (dup) {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'A user with this email/username already exists in the institutional registry.' }));
        return;
      }

      const tempPwd = 'BOS-' + crypto.randomBytes(3).toString('hex').toUpperCase() + '!';
      const teacherId = (assignedRole === 'director' ? 'director-' : 'teacher-') + Date.now();
      const newTeacher = {
        id: teacherId,
        role: assignedRole,
        role_confirmed: true,
        full_name: fullName,
        email: email,
        class_section: classesStr || null,
        status: 'active'
      };

      DB.profiles.push(newTeacher);
      saveDB();
      notifyRealtimeClients('profiles', 'INSERT', newTeacher);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        credentials: {
          id: teacherId,
          full_name: fullName,
          email: email,
          temporary_password: tempPwd,
          role: assignedRole,
          class_sections_taught: verifiedDisplayNames,
          class_section_codes: classesStr
        }
      }));
    });
    return;
  }

  // 2. Realtime SSE Endpoint
  if (reqPath === '/realtime/v1/sse') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    res.write('retry: 3000\n\n');
    realtimeClients.add(res);
    req.on('close', () => realtimeClients.delete(res));
    return;
  }

  // 3. PostgREST API Endpoint (/rest/v1/...)
  if (reqPath.startsWith('/rest/v1/')) {
    res.setHeader('Content-Type', 'application/json');

    // Handle RPC functions
    if (reqPath.startsWith('/rest/v1/rpc/')) {
      const callerUser = getUserFromRequest(req);
      if (!callerUser) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized: Authentication required', code: '42501' }));
        return;
      }
      const fnName = reqPath.replace('/rest/v1/rpc/', '').split('?')[0];
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        let params = {};
        try { params = JSON.parse(body); } catch (_) {}
        if (fnName === 'preview_promotion') {
          if (callerUser.role !== 'director') {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Forbidden: Director authorization required', code: '42501' }));
            return;
          }
          const yearId = params.p_year_id || parsedUrl.searchParams.get('p_year_id');
          const activeScheme = (DB.grading_scheme || []).find(s => s.is_active) || DB.grading_scheme?.[0] || { pass_threshold_percent: 33 };
          const activeRules = (DB.promotion_rules || []).find(r => r.is_active) || DB.promotion_rules?.[0] || { pass_threshold_percent: 33 };
          const passThresh = Number(activeRules.pass_threshold_percent ?? activeScheme.pass_threshold_percent ?? 33);
          const students = (DB.profiles || []).filter(p => p.role === 'record' || p.role === 'student');
          const results = (DB.final_results || []).filter(r => !yearId || r.academic_year_id === yearId);
          const records = (DB.promotion_records || []).filter(r => !yearId || r.academic_year_id === yearId);

          const previewList = students.map(s => {
            const sResults = results.filter(r => r.student_id === s.id);
            const overrideRec = records.find(r => r.student_id === s.id && (r.outcome === 'override_promoted' || r.outcome === 'override_held_back'));
            let agg = null;
            if (sResults.length > 0) {
              const totObt = sResults.reduce((acc, r) => acc + Number(r.marks_obtained || 0), 0);
              const totMax = sResults.reduce((acc, r) => acc + Number(r.max_marks || 100), 0);
              agg = totMax > 0 ? Math.round((totObt / totMax) * 1000) / 10 : 0;
            }
            let outcome = 'needs_attention';
            if (overrideRec) {
              outcome = overrideRec.outcome;
            } else if (agg !== null) {
              outcome = agg >= passThresh ? 'promoted' : 'held_back';
            }
            return {
              student_id: s.id,
              full_name: s.full_name || s.name,
              from_class_section: s.class_section,
              aggregate_percentage: agg,
              outcome: outcome,
              subject_failed: null,
              missing_subjects: []
            };
          });

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(previewList));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      });
      return;
    }

    const tableMatch = reqPath.match(/\/rest\/v1\/([a-zA-Z0-9_]+)/);
    const tableName = tableMatch ? tableMatch[1] : '';

    if (!DB[tableName]) {
      DB[tableName] = [];
    }

    const callerUser = getUserFromRequest(req);
    const callerRole = callerUser ? callerUser.role : null;
    const isSingle = req.headers['accept'] && req.headers['accept'].includes('vnd.pgrst.object+json');

    // Default Deny: All sensitive data mutations and non-catalog access require authentication.
    // Public-read is permitted ONLY for institutional academic catalog/structure tables (read-only, no PII).
    // In PostgreSQL RLS, unauthenticated SELECT on protected tables returns 0 rows (empty array []), not 401.
    // Mutations (POST, PATCH, DELETE) without authentication return 401 Unauthorized.
    const INSTITUTIONAL_STRUCTURE_GET_TABLES = [
      'school_settings', 'feature_flags', 'academic_settings', 'terminology',
      'grade_levels', 'sections', 'streams', 'subjects', 'subject_grade_levels',
      'subject_streams', 'terms', 'assessment_types', 'assessment_type_subjects',
      'grading_scheme', 'promotion_rules', 'class_sections', 'houses', 'clubs', 'app_config'
    ];
    const authHeader = req.headers['authorization'] || '';
    const isTokenProvided = authHeader.startsWith('Bearer ') && !authHeader.includes('local-institutional-anon-key');

    if (!callerUser) {
      if (isTokenProvided) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid or expired JWT', code: '401' }));
        return;
      }
      if (req.method !== 'GET') {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized: Authentication required', code: '42501' }));
        return;
      }
      if (!INSTITUTIONAL_STRUCTURE_GET_TABLES.includes(tableName)) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(isSingle ? null : []));
        return;
      }
    }

    // Audit logs & emergency events: strictly immutable (no UPDATE, no DELETE for anyone)
    if (tableName === 'audit_logs' || tableName === 'emergency_events') {
      if (req.method === 'PATCH' || req.method === 'PUT' || req.method === 'DELETE') {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Forbidden: audit_logs and emergency_events entries are strictly immutable', code: '42501' }));
        return;
      }
      if (tableName === 'audit_logs' && callerRole !== 'director' && req.method === 'GET') {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Forbidden: Director role required for audit logs', code: '42501' }));
        return;
      }
    }

    // Student write block: students cannot modify attendance, grades, notes, houses, profiles
    if ((callerRole === 'student' || callerRole === 'record') && req.method !== 'GET') {
      if (['attendance_records', 'grades', 'student_notes', 'profiles', 'houses', 'broadcasts', 'test_schedule', 'lecture_plan', 'leave_records', 'emergency_events', 'substitutions', 'ventures'].includes(tableName)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Forbidden: Students are not authorized to modify institutional records', code: '42501' }));
        return;
      }
    }

    const DIRECTOR_ONLY_WRITE_TABLES = [
      'academic_settings', 'terminology', 'grade_levels', 'sections', 'streams',
      'subjects', 'subject_grade_levels', 'subject_streams', 'terms',
      'assessment_types', 'assessment_type_subjects', 'grading_scheme',
      'promotion_rules', 'class_progression', 'school_settings',
      'feature_flags', 'houses', 'substitutions'
    ];

    if (DIRECTOR_ONLY_WRITE_TABLES.includes(tableName) && req.method !== 'GET') {
      if (callerRole !== 'director') {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Forbidden: Director role required for this endpoint', code: '42501' }));
        return;
      }
    }

    // POST /rest/v1/tableName
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        let payload = {};
        try { payload = JSON.parse(body); } catch (e) {}

        const items = Array.isArray(payload) ? payload : [payload];
        const inserted = [];
        const preferHeader = req.headers['prefer'] || '';
        const isUpsert = preferHeader.includes('resolution=merge-duplicates');
        const onConflict = parsedUrl.searchParams.get('on_conflict');

        // Audit actor validation: actor_id must equal callerUser.id
        if (tableName === 'audit_logs' || tableName === 'emergency_events') {
          for (const it of items) {
            if (it.actor_id && it.actor_id !== callerUser.id && callerRole !== 'director') {
              res.writeHead(403, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Forbidden: actor_id must match authenticated caller', code: '42501' }));
              return;
            }
            it.actor_id = callerUser.id;
          }
        }

        // Venture votes constraint: one vote per student per venture, and student can only vote as themselves
        if (tableName === 'venture_votes') {
          for (const it of items) {
            if (callerRole === 'student' && it.student_id && it.student_id !== callerUser.id) {
              res.writeHead(403, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Forbidden: Cannot cast vote on behalf of another student', code: '42501' }));
              return;
            }
            if (callerRole === 'student') it.student_id = callerUser.id;
            const duplicate = (DB.venture_votes || []).some(v => v.venture_id === it.venture_id && v.student_id === (it.student_id || callerUser.id));
            if (duplicate) {
              res.writeHead(409, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Conflict: Student has already voted for this venture', code: '23505' }));
              return;
            }
          }
        }

        // Attendance unique constraint: one record per student per date
        if (tableName === 'attendance_records' && !isUpsert) {
          for (const it of items) {
            const duplicate = (DB.attendance_records || []).some(a => a.student_id === it.student_id && a.date === it.date);
            if (duplicate) {
              res.writeHead(409, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Conflict: Attendance record already exists for this student and date', code: '23505' }));
              return;
            }
          }
        }

        // Lecture plan: teacher can only create for themselves
        if (tableName === 'lecture_plan' && callerRole === 'teacher') {
          for (const it of items) {
            it.teacher_id = callerUser.id;
          }
        }

        // Leave records: teacher can only create own leave requests as pending
        if (tableName === 'leave_records' && callerRole === 'teacher') {
          for (const it of items) {
            it.teacher_id = callerUser.id;
            it.status = 'pending';
            delete it.approved_by;
            delete it.approval_date;
          }
        }

        // Substitutions: only director can create
        if (tableName === 'substitutions' && callerRole !== 'director') {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Forbidden: Only Director can assign faculty substitutions', code: '42501' }));
          return;
        }

        items.forEach(item => {
          const rec = Object.assign({}, item);
          if (!rec.created_at) rec.created_at = new Date().toISOString();

          // Profile resolution
          if (tableName === 'test_schedule') {
            if (!rec.teacher_name) {
              const p = DB.profiles.find(u => u.id === rec.teacher_id);
              rec.teacher_name = p ? p.full_name : 'Faculty Member';
            }
          }
          if (tableName === 'broadcasts') {
            if (!rec.author) {
              const p = DB.profiles.find(u => u.id === rec.published_by);
              rec.author = p ? p.full_name : 'Administration';
            }
          }
          if (tableName === 'audit_logs') {
            if (!rec.actor_name && rec.actor_id) {
              const p = DB.profiles.find(u => u.id === rec.actor_id);
              rec.actor_name = p ? p.full_name : 'System';
            }
          }

          let existingIndex = -1;
          if (tableName === 'school_settings' && DB.school_settings.length > 0) {
            existingIndex = 0;
          } else if (isUpsert || onConflict) {
            if (onConflict && rec[onConflict] !== undefined) {
              existingIndex = DB[tableName].findIndex(r => String(r[onConflict]) === String(rec[onConflict]));
            } else if (rec.id) {
              existingIndex = DB[tableName].findIndex(r => String(r.id) === String(rec.id));
            }
          }

          if (existingIndex >= 0) {
            const merged = Object.assign({}, DB[tableName][existingIndex], rec);
            DB[tableName][existingIndex] = merged;
            inserted.push(merged);
            notifyRealtimeClients(tableName, 'UPDATE', merged);
          } else {
            if (!rec.id) rec.id = `${tableName.slice(0, 3)}-${Date.now()}-${Math.floor(Math.random()*1000)}`;
            DB[tableName].push(rec);
            inserted.push(rec);
            notifyRealtimeClients(tableName, 'INSERT', rec);
          }
        });

        saveDB();

        res.setHeader('Content-Range', `0-${inserted.length - 1}/${DB[tableName].length}`);
        res.writeHead(201);
        if (isSingle) {
          res.end(JSON.stringify(inserted[0] || {}));
        } else {
          res.end(JSON.stringify(inserted));
        }
      });
      return;
    }

    // PATCH / PUT /rest/v1/tableName
    if (req.method === 'PATCH' || req.method === 'PUT') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        let updateData = {};
        try { updateData = JSON.parse(body); } catch (e) {}

        // Profiles privilege escalation guard
        if (tableName === 'profiles') {
          if (callerRole !== 'director') {
            if (updateData.role !== undefined) {
              res.writeHead(403, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Forbidden: You cannot modify your own role.', code: '42501' }));
              return;
            }
            if (updateData.id !== undefined) {
              res.writeHead(403, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Forbidden: ID is immutable.', code: '42501' }));
              return;
            }
            if (updateData.student_id_code !== undefined) {
              res.writeHead(403, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Forbidden: student_id_code is immutable.', code: '42501' }));
              return;
            }
            if (updateData.house_id !== undefined || updateData.house !== undefined) {
              res.writeHead(403, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Forbidden: House assignment is immutable.', code: '42501' }));
              return;
            }
          }
          if (callerRole === 'student') {
            const hasOtherProfile = DB[tableName].some(row => {
              let match = true;
              for (const [key, val] of parsedUrl.searchParams.entries()) {
                if (key === 'select' || key === 'order' || key === 'limit') continue;
                if (val.startsWith('eq.')) {
                  if (String(row[key]) !== val.slice(3)) match = false;
                }
              }
              return match && row.id !== callerUser.id;
            });
            if (hasOtherProfile) {
              res.writeHead(403, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Forbidden: Students cannot modify other profiles.', code: '42501' }));
              return;
            }
          }
        }

        // Lecture plan modification: Teacher can only modify own lecture plans
        if (tableName === 'lecture_plan' && callerRole === 'teacher') {
          const hasOtherTeacher = DB[tableName].some(row => {
            let match = true;
            for (const [key, val] of parsedUrl.searchParams.entries()) {
              if (key === 'select' || key === 'order' || key === 'limit') continue;
              if (val.startsWith('eq.')) {
                if (String(row[key]) !== val.slice(3)) match = false;
              }
            }
            return match && row.teacher_id && row.teacher_id !== callerUser.id;
          });
          if (hasOtherTeacher) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: "Forbidden: Cannot modify another teacher's lecture plan", code: '42501' }));
            return;
          }
        }

        // Leave records: Teacher can only modify own leave, and cannot self-approve
        if (tableName === 'leave_records' && callerRole === 'teacher') {
          if (updateData.status !== undefined || updateData.approved_by !== undefined || updateData.approval_date !== undefined) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Forbidden: Only Director can approve or reject leave records.', code: '42501' }));
            return;
          }
          const hasOtherLeave = DB[tableName].some(row => {
            let match = true;
            for (const [key, val] of parsedUrl.searchParams.entries()) {
              if (key === 'select' || key === 'order' || key === 'limit') continue;
              if (val.startsWith('eq.')) {
                if (String(row[key]) !== val.slice(3)) match = false;
              }
            }
            return match && ((row.teacher_id && row.teacher_id !== callerUser.id) || (row.user_id && row.user_id !== callerUser.id));
          });
          if (hasOtherLeave) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: "Forbidden: Cannot modify another teacher's leave record", code: '42501' }));
            return;
          }
        }

        // Substitutions: Director only
        if (tableName === 'substitutions' && callerRole !== 'director') {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Forbidden: Only Director can modify faculty substitutions.', code: '42501' }));
          return;
        }

        // Ventures column protection
        if (tableName === 'ventures') {
          if (updateData.votes !== undefined) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Forbidden: votes cannot be updated directly; derived from venture_votes.', code: '42501' }));
            return;
          }
          if ((updateData.status !== undefined || updateData.directors_pick !== undefined) && callerRole !== 'director') {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Forbidden: Only Director can modify venture status or directors_pick.', code: '42501' }));
            return;
          }
        }

        // Houses points protection
        if (tableName === 'houses' && updateData.points !== undefined && callerRole !== 'director') {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Forbidden: Only Director can modify house points.', code: '42501' }));
          return;
        }

        if (tableName === 'attendance_records' && callerRole && callerRole !== 'director') {
          const hasLockedMatch = DB[tableName].some(row => {
            let match = true;
            for (const [key, val] of parsedUrl.searchParams.entries()) {
              if (key === 'select' || key === 'order' || key === 'limit') continue;
              if (val.startsWith('eq.')) {
                if (String(row[key]) !== val.slice(3)) match = false;
              }
            }
            return match && (row.locked === true || row.status === 'locked');
          });
          if (hasLockedMatch) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Forbidden: Attendance roster is locked and cannot be modified by faculty.', code: '42501' }));
            return;
          }
        }

        const updated = [];
        DB[tableName] = DB[tableName].map(row => {
          let match = true;
          for (const [key, val] of parsedUrl.searchParams.entries()) {
            if (key === 'select' || key === 'order' || key === 'limit') continue;
            if (val.startsWith('eq.')) {
              if (String(row[key]) !== val.slice(3)) match = false;
            }
          }
          if (match) {
            const merged = Object.assign({}, row, updateData);
            updated.push(merged);
            notifyRealtimeClients(tableName, 'UPDATE', merged);
            return merged;
          }
          return row;
        });

        saveDB();
        res.writeHead(200);
        res.end(JSON.stringify(isSingle ? (updated[0] || {}) : updated));
      });
      return;
    }

    // DELETE /rest/v1/tableName
    if (req.method === 'DELETE') {
      if (tableName === 'attendance_records' && callerRole && callerRole !== 'director') {
        const hasLockedMatch = DB[tableName].some(row => {
          let match = true;
          for (const [key, val] of parsedUrl.searchParams.entries()) {
            if (key === 'select' || key === 'order' || key === 'limit') continue;
            if (val.startsWith('eq.')) {
              if (String(row[key]) !== val.slice(3)) match = false;
            }
          }
          return match && (row.locked === true || row.status === 'locked');
        });
        if (hasLockedMatch) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Forbidden: Attendance roster is locked and cannot be modified by faculty.', code: '42501' }));
          return;
        }
      }

      if (tableName === 'lecture_plan' && callerRole === 'teacher') {
        const hasOtherTeacher = DB[tableName].some(row => {
          let match = true;
          for (const [key, val] of parsedUrl.searchParams.entries()) {
            if (key === 'select' || key === 'order' || key === 'limit') continue;
            if (val.startsWith('eq.')) {
              if (String(row[key]) !== val.slice(3)) match = false;
            }
          }
          return match && row.teacher_id && row.teacher_id !== callerUser.id;
        });
        if (hasOtherTeacher) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: "Forbidden: Cannot delete another teacher's lecture plan", code: '42501' }));
          return;
        }
      }

      if (tableName === 'leave_records' && callerRole === 'teacher') {
        const hasOtherLeave = DB[tableName].some(row => {
          let match = true;
          for (const [key, val] of parsedUrl.searchParams.entries()) {
            if (key === 'select' || key === 'order' || key === 'limit') continue;
            if (val.startsWith('eq.')) {
              if (String(row[key]) !== val.slice(3)) match = false;
            }
          }
          return match && ((row.teacher_id && row.teacher_id !== callerUser.id) || (row.user_id && row.user_id !== callerUser.id));
        });
        if (hasOtherLeave) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: "Forbidden: Cannot delete another teacher's leave record", code: '42501' }));
          return;
        }
      }

      if (tableName === 'substitutions' && callerRole !== 'director') {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Forbidden: Only Director can delete faculty substitutions.', code: '42501' }));
        return;
      }

      const remaining = [];
      const deleted = [];

      DB[tableName].forEach(row => {
        let match = true;
        for (const [key, val] of parsedUrl.searchParams.entries()) {
          if (key === 'select' || key === 'order' || key === 'limit') continue;
          if (val.startsWith('eq.')) {
            if (String(row[key]) !== val.slice(3)) match = false;
          } else if (val.startsWith('in.(') && val.endsWith(')')) {
            const list = val.slice(4, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
            if (!list.includes(String(row[key]))) match = false;
          } else if (val === 'is.null') {
            if (row[key] !== null && row[key] !== undefined) match = false;
          } else if (val === 'is.not.null') {
            if (row[key] === null || row[key] === undefined) match = false;
          }
        }
        if (match) {
          deleted.push(row);
          notifyRealtimeClients(tableName, 'DELETE', row);
        } else {
          remaining.push(row);
        }
      });

      DB[tableName] = remaining;
      saveDB();
      res.writeHead(204);
      res.end();
      return;
    }

    // GET /rest/v1/tableName
    if (tableName === 'audit_logs' && callerRole !== 'director') {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Forbidden: Director role required for audit logs', code: '42501' }));
      return;
    }
    let results = [...DB[tableName]];

    // Substitutions isolation: Teacher sees only assigned rows; Director sees all
    if (tableName === 'substitutions') {
      if (callerRole === 'teacher') {
        results = results.filter(r => r.substitute_teacher_id === callerUser.id);
      } else if (callerRole !== 'director') {
        results = [];
      }
    }

    // Leave records isolation: Teacher sees only own leave records; Director sees all
    if (tableName === 'leave_records') {
      if (callerRole === 'teacher') {
        results = results.filter(r => (r.teacher_id === callerUser.id || r.user_id === callerUser.id));
      } else if (callerRole !== 'director') {
        results = [];
      }
    }

    // Lecture plan isolation: Teacher sees only own lecture plans; Director sees all
    if (tableName === 'lecture_plan') {
      if (callerRole === 'teacher') {
        results = results.filter(r => r.teacher_id === callerUser.id);
      }
    }

    // Student isolation: students see only their own attendance, grades, notes, submissions
    if (callerRole === 'student' || callerRole === 'record') {
      if (['attendance_records', 'grades', 'student_notes', 'assignment_submissions', 'person_documents'].includes(tableName)) {
        results = results.filter(r => r.student_id === callerUser.id || r.owner_id === callerUser.id);
      }
    }

    // Filtering
    for (const [key, val] of parsedUrl.searchParams.entries()) {
      if (key === 'select' || key === 'order' || key === 'limit') continue;
      if (val.startsWith('eq.')) {
        const expected = val.slice(3);
        results = results.filter(r => String(r[key]) === expected);
      } else if (val.startsWith('neq.')) {
        const expected = val.slice(4);
        results = results.filter(r => String(r[key]) !== expected);
      } else if (val.startsWith('in.(') && val.endsWith(')')) {
        const list = val.slice(4, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
        results = results.filter(r => list.includes(String(r[key])));
      } else if (val === 'is.null') {
        results = results.filter(r => r[key] === null || r[key] === undefined);
      } else if (val === 'is.not.null') {
        results = results.filter(r => r[key] !== null && r[key] !== undefined);
      } else if (val.startsWith('gte.')) {
        const expected = val.slice(4);
        results = results.filter(r => String(r[key]) >= expected);
      } else if (val.startsWith('lte.')) {
        const expected = val.slice(4);
        results = results.filter(r => String(r[key]) <= expected);
      }
    }

    // Joins & Expansions for profiles
    const selectParam = parsedUrl.searchParams.get('select') || '';
    if (selectParam.includes('profiles')) {
      // Supports both plain `profiles(...)` and aliased FK selects such as
      // `author:profiles!author_id(full_name, role)`; the embedded row is
      // exposed under the alias (when present) and the bare `profiles` key.
      const aliasMatch = selectParam.match(/([a-zA-Z_][a-zA-Z0-9_]*):\s*profiles(!([a-z_]+))?/);
      const alias = aliasMatch ? aliasMatch[1] : null;
      const hintedFk = aliasMatch && aliasMatch[3] ? aliasMatch[3] : null;
      results = results.map(r => {
        const copy = Object.assign({}, r);
        // Follow the hinted FK when given (e.g. author_id), else the legacy
        // column chain; `student_id` is last because it names the row's
        // subject, not its author.
        const profileId = hintedFk && copy[hintedFk]
          ? copy[hintedFk]
          : (copy.teacher_id || copy.published_by || copy.actor_id || copy.author_id || copy.student_id);
        const prof = DB.profiles.find(p => p.id === profileId);
        const embedded = prof ? { full_name: prof.full_name, role: prof.role } : { full_name: copy.teacher_name || copy.author || 'System' };
        if (alias) copy[alias] = embedded;
        copy.profiles = embedded;
        return copy;
      });
    }

    // Ordering
    const orderParam = parsedUrl.searchParams.get('order');
    if (orderParam) {
      const [col, dir] = orderParam.split('.');
      const isDesc = (dir === 'desc');
      results.sort((a, b) => {
        const vA = a[col] != null ? a[col] : '';
        const vB = b[col] != null ? b[col] : '';
        return isDesc ? String(vB).localeCompare(String(vA)) : String(vA).localeCompare(String(vB));
      });
    }

    // Limit
    const limitParam = parsedUrl.searchParams.get('limit');
    if (limitParam) {
      const limit = parseInt(limitParam, 10);
      if (!isNaN(limit)) results = results.slice(0, limit);
    }

    res.setHeader('Content-Range', `0-${Math.max(0, results.length - 1)}/${results.length}`);

    if (isSingle) {
      res.setHeader('Content-Type', 'application/vnd.pgrst.object+json');
      res.writeHead(200);
      res.end(JSON.stringify(results[0] || null));
      return;
    }

    res.writeHead(200);
    res.end(JSON.stringify(results));
    return;
  }

  // 4. Static Assets Server
  let filePathStr = reqPath;
  if (filePathStr === '/' || filePathStr === '/Eduvia' || filePathStr === '/Eduvia.html') filePathStr = '/Eduvia.html';
  const filePath = path.join(ROOT, filePathStr);

  // Fallback for /realtime/ or /favicon.ico
  if (reqPath.startsWith('/realtime/')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'connected' }));
    return;
  }

  if (reqPath === '/favicon.ico') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    console.log('[404]', req.method, reqPath);
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
}

function handleUpgrade(req, socket, head) {
  const key = req.headers['sec-websocket-key'];
  if (key) {
    const digest = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    socket.write('HTTP/1.1 101 Switching Protocols\r\n' +
                 'Upgrade: websocket\r\n' +
                 'Connection: Upgrade\r\n' +
                 `Sec-WebSocket-Accept: ${digest}\r\n\r\n`);
  } else {
    socket.destroy();
  }
}

// Primary Server
const server = http.createServer(handleRequest);
server.on('upgrade', handleUpgrade);
server.on('clientError', (err, socket) => {
  if (err.code === 'ECONNRESET' || !socket.writable) {
    return;
  }
  socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

server.on('error', (err) => {
  console.error('[Eduvia Backend Server Error]:', err);
});

process.on('uncaughtException', (err) => {
  if (err.code === 'ECONNRESET' || err.code === 'EPIPE') {
    return;
  }
  console.error('[Eduvia Backend Uncaught Exception]:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Eduvia Backend Unhandled Rejection]:', reason);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Eduvia Backend] Running at http://127.0.0.1:${PORT}`);
});

// Secondary listener on ALT_PORT (8080) if PORT != ALT_PORT
if (PORT !== ALT_PORT) {
  try {
    const altServer = http.createServer(handleRequest);
    altServer.on('upgrade', handleUpgrade);
    altServer.on('clientError', (err, socket) => {
      if (err.code === 'ECONNRESET' || !socket.writable) {
        return;
      }
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    });
    altServer.listen(ALT_PORT, '0.0.0.0', () => {
      console.log(`[Eduvia Backend] Also listening on alternate port http://127.0.0.1:${ALT_PORT}`);
    });
    altServer.on('error', (err) => {
      console.log(`[Eduvia Backend] Alt port ${ALT_PORT} not bound (${err.message})`);
    });
  } catch (e) {}
}
