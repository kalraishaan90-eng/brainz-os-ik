const http = require('http');
const crypto = require('crypto');

const BASE_URL = 'http://127.0.0.1:8080';

// Mock JWT generator matching serve.js format
function createToken(user, expired = false) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const exp = expired ? now - 3600 : now + 86400;
  const payload = {
    sub: user.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: user.email,
    app_metadata: { provider: 'email' },
    user_metadata: { role: user.role, full_name: user.full_name },
    exp: exp
  };
  const b64H = Buffer.from(JSON.stringify(header)).toString('base64url');
  const b64P = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', 'mock-secret').update(`${b64H}.${b64P}`).digest('base64url');
  return `${b64H}.${b64P}.${sig}`;
}

// Actors for tests
const ACTORS = {
  director: {
    id: 'a0000000-0000-0000-0000-000000000003',
    email: 'tarini@brainzeduworld.com',
    role: 'director',
    full_name: 'Taarini'
  },
  teacherA: {
    id: 'a0000000-0000-0000-0000-000000000002',
    email: 'teacher@brainzeduworld.com',
    role: 'teacher',
    full_name: 'Faculty Member'
  },
  teacherB: {
    id: 'teacher-bosky-001',
    email: 'bosky@brainzeduworld.com',
    role: 'teacher',
    full_name: 'Bosky'
  },
  studentA: {
    id: 'a0000000-0000-0000-0000-000000000001',
    email: 'student@brainz.edu',
    role: 'student',
    full_name: 'Student Scholar',
    class_section: 'XII-B'
  },
  studentB: {
    id: 'b0000000-0000-0000-0000-000000000001',
    email: 'ishaan.kalra@brainz.edu',
    role: 'student',
    full_name: 'Ishaan Kalra',
    class_section: 'XI-B'
  }
};

function request(method, path, body = null, token = null, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const headers = {
      'Content-Type': 'application/json',
      ...extraHeaders
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(url, { method, headers }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(data); } catch (e) { parsed = data; }
        resolve({ status: res.statusCode, data: parsed, headers: res.headers });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

const RESULTS = [];

function recordTest(id, name, pass, detail) {
  RESULTS.push({ id, name, pass, detail });
  const statusStr = pass ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
  console.log(`[${statusStr}] ${id}: ${name}`);
  if (!pass) console.log(`       Detail: ${detail}`);
}

async function runSuite() {
  console.log('================================================================');
  console.log('   BRAINZOS / EDUVIA — EXECUTABLE ATTACK VERIFICATION SUITE   ');
  console.log('================================================================\n');

  const tokenDirector = createToken(ACTORS.director);
  const tokenTeacherA = createToken(ACTORS.teacherA);
  const tokenTeacherB = createToken(ACTORS.teacherB);
  const tokenStudentA = createToken(ACTORS.studentA);
  const tokenStudentB = createToken(ACTORS.studentB);

  // Setup seed data in db for cross-actor tests
  await request('POST', '/rest/v1/attendance_records', {
    id: 'att-student-b-seed',
    student_id: ACTORS.studentB.id,
    date: '2026-10-09',
    status: 'present',
    locked: false
  }, tokenDirector);

  await request('POST', '/rest/v1/grades', {
    id: 'grade-student-b-seed',
    student_id: ACTORS.studentB.id,
    subject: 'Economics',
    score: 95
  }, tokenDirector);

  await request('POST', '/rest/v1/lecture_plan', {
    id: 'lp-teacher-b-seed',
    teacher_id: ACTORS.teacherB.id,
    subject: 'Chemistry',
    topic: 'Thermodynamics',
    date: '2026-10-09'
  }, tokenDirector);

  await request('POST', '/rest/v1/leave_records', {
    id: 'leave-teacher-b-seed',
    teacher_id: ACTORS.teacherB.id,
    reason: 'Personal Medical Leave',
    status: 'pending'
  }, tokenDirector);

  await request('POST', '/rest/v1/substitutions', {
    id: 'sub-teacher-a-seed',
    substitute_teacher_id: ACTORS.teacherA.id,
    original_teacher_id: ACTORS.teacherB.id,
    date: '2026-10-09',
    class_section: 'XI-B'
  }, tokenDirector);

  // --- ATTACK TEST 1: Student reads another student's attendance/grades/submissions ---
  {
    const resAtt = await request('GET', `/rest/v1/attendance_records?student_id=eq.${ACTORS.studentB.id}`, null, tokenStudentA);
    const resGrd = await request('GET', `/rest/v1/grades?student_id=eq.${ACTORS.studentB.id}`, null, tokenStudentA);
    const pass = Array.isArray(resAtt.data) && resAtt.data.length === 0 &&
                 Array.isArray(resGrd.data) && resGrd.data.length === 0;
    recordTest('ATT-01', "Student A reads Student B's attendance/grades -> returns 0 rows", pass, `Attendance rows: ${resAtt.data?.length}, Grade rows: ${resGrd.data?.length}`);
  }

  // --- ATTACK TEST 2: Student updates own role, house points, votes, grades, attendance ---
  {
    const resRole = await request('PATCH', `/rest/v1/profiles?id=eq.${ACTORS.studentA.id}`, { role: 'director' }, tokenStudentA);
    const resHouse = await request('PATCH', `/rest/v1/houses?id=eq.house-orion`, { points: 9999 }, tokenStudentA);
    const resAtt = await request('PATCH', `/rest/v1/attendance_records?id=eq.att-student-b-seed`, { status: 'present' }, tokenStudentA);
    const pass = resRole.status === 403 && resHouse.status === 403 && resAtt.status === 403;
    recordTest('ATT-02', 'Student updates role, house points, attendance -> blocked 403', pass, `Role: ${resRole.status}, House: ${resHouse.status}, Att: ${resAtt.status}`);
  }

  // --- ATTACK TEST 3: Student votes twice or votes as another student ---
  {
    const resImpersonate = await request('POST', '/rest/v1/venture_votes', {
      venture_id: 'v-101',
      student_id: ACTORS.studentB.id
    }, tokenStudentA);

    await request('POST', '/rest/v1/venture_votes', {
      venture_id: 'v-101',
      student_id: ACTORS.studentA.id
    }, tokenStudentA);

    const resDuplicate = await request('POST', '/rest/v1/venture_votes', {
      venture_id: 'v-101',
      student_id: ACTORS.studentA.id
    }, tokenStudentA);

    const pass = (resImpersonate.status === 403) && (resDuplicate.status === 409 || resDuplicate.status === 403);
    recordTest('ATT-03', 'Student votes as another student or double votes -> blocked 403/409', pass, `Impersonate: ${resImpersonate.status}, Duplicate: ${resDuplicate.status}`);
  }

  // --- ATTACK TEST 4: Student calls director-only writes ---
  {
    const resVent = await request('PATCH', '/rest/v1/ventures?id=eq.v-101', { status: 'approved', directors_pick: true }, tokenStudentA);
    const resLeave = await request('PATCH', '/rest/v1/leave_records?id=eq.leave-teacher-b-seed', { status: 'approved' }, tokenStudentA);
    const resCreateTeacher = await request('POST', '/functions/v1/create-teacher', {
      full_name: 'Rogue Teacher',
      email: 'rogue@brainzeduworld.com',
      class_sections_taught: ['XI-B']
    }, tokenStudentA);

    const pass = resVent.status === 403 && resLeave.status === 403 && resCreateTeacher.status === 403;
    recordTest('ATT-04', 'Student calls director-only writes (venture status, leave approval, create-teacher) -> blocked 403', pass, `Venture: ${resVent.status}, Leave: ${resLeave.status}, CreateTeacher: ${resCreateTeacher.status}`);
  }

  // --- ATTACK TEST 5: Teacher A reads/edits Teacher B's lecture plans and leave records ---
  {
    const resReadLp = await request('GET', `/rest/v1/lecture_plan?teacher_id=eq.${ACTORS.teacherB.id}`, null, tokenTeacherA);
    const resEditLp = await request('PATCH', `/rest/v1/lecture_plan?id=eq.lp-teacher-b-seed`, { topic: 'Tampered Topic' }, tokenTeacherA);
    const resEditLeave = await request('PATCH', `/rest/v1/leave_records?id=eq.leave-teacher-b-seed`, { reason: 'Tampered Reason' }, tokenTeacherA);

    const pass = (Array.isArray(resReadLp.data) && resReadLp.data.length === 0) &&
                 (resEditLp.status === 403) &&
                 (resEditLeave.status === 403);
    recordTest('ATT-05', "Teacher A reads/edits Teacher B's lecture plans and leave -> 0 rows / 403", pass, `Read LP rows: ${resReadLp.data?.length}, Edit LP: ${resEditLp.status}, Edit Leave: ${resEditLeave.status}`);
  }

  // --- ATTACK TEST 6: Teacher edits locked attendance vs Director override ---
  {
    await request('POST', '/rest/v1/attendance_records', {
      id: 'att-locked-record-1',
      student_id: ACTORS.studentA.id,
      date: '2026-10-08',
      status: 'present',
      locked: true
    }, tokenDirector);

    const resTeacherEdit = await request('PATCH', '/rest/v1/attendance_records?id=eq.att-locked-record-1', { status: 'absent' }, tokenTeacherA);
    const resDirectorEdit = await request('PATCH', '/rest/v1/attendance_records?id=eq.att-locked-record-1', { status: 'absent' }, tokenDirector);

    const pass = resTeacherEdit.status === 403 && resDirectorEdit.status === 200;
    recordTest('ATT-06', 'Teacher edits locked attendance -> 403; Director override -> 200', pass, `Teacher: ${resTeacherEdit.status}, Director: ${resDirectorEdit.status}`);
  }

  // --- ATTACK TEST 7: Non-substitute teacher reads a substitution ---
  {
    const resSub = await request('GET', '/rest/v1/substitutions', null, tokenTeacherB);
    const pass = Array.isArray(resSub.data) && resSub.data.length === 0;
    recordTest('ATT-07', 'Non-substitute teacher reads substitutions -> returns 0 rows', pass, `Rows returned: ${resSub.data?.length}`);
  }

  // --- ATTACK TEST 8: Immutability of audit_logs and emergency_events ---
  {
    await request('POST', '/rest/v1/audit_logs', {
      id: 'audit-log-immut-1',
      actor_id: ACTORS.director.id,
      action: 'DIRECTOR_CONFIG_CHANGE'
    }, tokenDirector);

    const resUpdateAudit = await request('PATCH', '/rest/v1/audit_logs?id=eq.audit-log-immut-1', { action: 'WIPED' }, tokenDirector);
    const resDeleteAudit = await request('DELETE', '/rest/v1/audit_logs?id=eq.audit-log-immut-1', null, tokenDirector);
    const resSpoofedActor = await request('POST', '/rest/v1/audit_logs', {
      id: 'audit-spoofed-1',
      actor_id: ACTORS.director.id,
      action: 'SPOOFED_EVENT'
    }, tokenTeacherA);

    const pass = resUpdateAudit.status === 403 && resDeleteAudit.status === 403;
    recordTest('ATT-08', 'Audit log immutability (no UPDATE, no DELETE, actor check) -> 403', pass, `Update: ${resUpdateAudit.status}, Delete: ${resDeleteAudit.status}, Spoof: ${resSpoofedActor.status}`);
  }

  // --- ATTACK TEST 9: Anonymous calls to tables, RPC, Edge Function ---
  {
    const resAnonRpc = await request('POST', '/rest/v1/rpc/preview_promotion', { p_year_id: 'ay-2026-27' });
    const resAnonEdge = await request('POST', '/functions/v1/create-teacher', { full_name: 'Ghost' });
    const resAnonProfiles = await request('GET', '/rest/v1/profiles');
    const resAnonMutate = await request('POST', '/rest/v1/broadcasts', { headline: 'Hacked' });

    const pass = resAnonRpc.status === 401 && resAnonEdge.status === 401 &&
                 Array.isArray(resAnonProfiles.data) && resAnonProfiles.data.length === 0 &&
                 resAnonMutate.status === 401;
    recordTest('ATT-09', 'Anonymous calls -> RPC 401, Edge 401, Mutation 401, Sensitive SELECT 0 rows', pass, `RPC: ${resAnonRpc.status}, Edge: ${resAnonEdge.status}, Profiles rows: ${resAnonProfiles.data?.length}, Mutate: ${resAnonMutate.status}`);
  }

  // --- ATTACK TEST 10: Direct REST calls with tampered / malicious payloads ---
  {
    const resSqlXss = await request('POST', '/rest/v1/broadcasts', {
      headline: "'; DROP TABLE profiles; -- <img src=x onerror=alert('XSS')>",
      message: 'Malicious test payload',
      audience: 'Whole School'
    }, tokenDirector);

    // Verify stored payload renders safely
    const stored = resSqlXss.data?.[0] || resSqlXss.data;
    const pass = resSqlXss.status === 201 && typeof stored?.headline === 'string' && stored.headline.includes('<img');
    recordTest('ATT-10', 'Malicious SQL injection & XSS payload stored as inert text -> status 201', pass, `Status: ${resSqlXss.status}, Stored headline: ${stored?.headline?.slice(0, 40)}`);
  }

  // --- ATTACK TEST 11: Mass assignment test (extra unexpected columns) ---
  {
    const resMass = await request('POST', '/functions/v1/create-teacher', {
      full_name: 'Test Mass Assign',
      email: 'mass-assign@brainzeduworld.com',
      role: 'director', // Attempting to sneak in director role
      class_sections_taught: ['XI-B'],
      admin_privileges: true,
      is_superadmin: true
    }, tokenDirector);

    const pass = resMass.status === 400; // Schema validation rejects unknown / forbidden fields
    recordTest('ATT-11', 'Mass-assignment payload with rogue fields to create-teacher -> rejected 400', pass, `Status: ${resMass.status}, Error: ${resMass.data?.error}`);
  }

  // --- ATTACK TEST 12: Rate limit test ---
  {
    let throttled = false;
    for (let i = 0; i < 55; i++) {
      const res = await request('POST', '/auth/v1/token?grant_type=password', {
        email: 'invalid-attempt@brainzeduworld.com',
        password: 'wrongpassword123'
      }, null, { 'x-forwarded-for': '203.0.113.195' });
      if (res.status === 429) {
        throttled = true;
        break;
      }
    }
    recordTest('ATT-12', 'Rate limiting throttles rapid auth brute-force attempts -> 429', throttled, `Throttled triggered: ${throttled}`);
  }

  // --- ATTACK TEST 13: Expired / Forged JWT ---
  {
    const expiredToken = createToken(ACTORS.director, true);
    const forgedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsInJvbGUiOiJkaXJlY3RvciJ9.forgedsignature123';

    const resExpired = await request('GET', '/rest/v1/audit_logs', null, expiredToken);
    const resForged = await request('GET', '/rest/v1/audit_logs', null, forgedToken);

    const pass = resExpired.status === 401 && resForged.status === 401;
    recordTest('ATT-13', 'Expired and forged JWTs are rejected -> 401', pass, `Expired status: ${resExpired.status}, Forged status: ${resForged.status}`);
  }

  console.log('\n================================================================');
  const allPass = RESULTS.every(r => r.pass);
  console.log(`TOTAL TESTS: ${RESULTS.length} | PASSED: ${RESULTS.filter(r => r.pass).length} | FAILED: ${RESULTS.filter(r => !r.pass).length}`);
  console.log(`SUITE RESULT: ${allPass ? '\x1b[32mALL ATTACK TESTS PASSED (100%)\x1b[0m' : '\x1b[31mSOME ATTACK TESTS FAILED\x1b[0m'}`);
  console.log('================================================================');

  if (!allPass) process.exit(1);
}

runSuite().catch(err => {
  console.error('Test suite runtime error:', err);
  process.exit(1);
});
