# BrainzOS / Eduvia — Penetration & Attack Verification Report

**Date of Execution:** October 9, 2026  
**Environment:** Institutional Local Staging & Postgres PostgREST (`http://127.0.0.1:8080`)  
**Test Suite Script:** `security/attack-test-runner.js`  
**Test Target Database Schema:** `supabase/migrations/20261009000001_final_security_lockdown.sql`  
**Overall Result:** **13/13 PASSED (100% PASS RATE)**

---

## 1. Test Personas & Actors

| Persona | Identifier (`id`) | Role | Institutional Email | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Director** | `a0000000-0000-0000-0000-000000000003` | `director` | `tarini@brainzeduworld.com` | School Executive Administrator |
| **Teacher Alpha** | `a0000000-0000-0000-0000-000000000002` | `teacher` | `teacher@brainzeduworld.com` | Class XI-B Faculty Member |
| **Teacher Beta** | `teacher-bosky-001` | `teacher` | `bosky@brainzeduworld.com` | Class XI-A Faculty Member (Cross-tenant peer) |
| **Student Alpha** | `a0000000-0000-0000-0000-000000000001` | `student` | `student@brainz.edu` | Class XII-B Student Scholar |
| **Student Beta** | `b0000000-0000-0000-0000-000000000001` | `student` | `ishaan.kalra@brainz.edu` | Class XI-B Student Scholar |
| **Anonymous** | *(None / No JWT)* | *(None)* | *(None)* | Unauthenticated public internet client |
| **Attacker** | *(Forged / Expired JWT)* | `director` *(claimed)* | `attacker@external.com` | Token forgery / replay actor |

---

## 2. Attack Execution Results Matrix

| Test ID | Attack Scenario | Attack Payload / Action | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ATT-01** | Student reads another student's attendance, grades, and submissions | Student A queries `GET /rest/v1/attendance_records?student_id=eq.studentB` and `GET /rest/v1/grades?student_id=eq.studentB` | 0 rows returned (RLS isolation) | `attendance_records`: 0 rows<br>`grades`: 0 rows | **PASS** |
| **ATT-02** | Student attempts privilege escalation & institutional record tampering | Student A sends `PATCH /rest/v1/profiles` (`role: 'director'`), `PATCH /rest/v1/houses` (`points: 9999`), `PATCH /rest/v1/attendance_records` | HTTP 403 Forbidden on all mutation endpoints | Role edit: HTTP 403<br>House edit: HTTP 403<br>Attendance edit: HTTP 403 | **PASS** |
| **ATT-03** | Student votes as another student or attempts double voting | Student A sends `POST /rest/v1/venture_votes` impersonating Student B, then votes twice for venture `v-101` | First blocked with 403; duplicate blocked with 409 Conflict | Impersonate: HTTP 403<br>Duplicate vote: HTTP 409 | **PASS** |
| **ATT-04** | Student calls director-only administrative functions | Student A sends `PATCH /rest/v1/ventures` (`status: approved`), `PATCH /rest/v1/leave_records` (`status: approved`), `POST /functions/v1/create-teacher` | HTTP 403 Forbidden on all director routes | Venture approve: HTTP 403<br>Leave approve: HTTP 403<br>Create teacher: HTTP 403 | **PASS** |
| **ATT-05** | Teacher A reads/edits Teacher B's lecture plans and leave records | Teacher A sends `GET /rest/v1/lecture_plan?teacher_id=eq.teacherB`, `PATCH /rest/v1/lecture_plan`, and `PATCH /rest/v1/leave_records` | Read returns 0 rows; writes blocked with HTTP 403 Forbidden | Read rows: 0<br>Lecture edit: HTTP 403<br>Leave edit: HTTP 403 | **PASS** |
| **ATT-06** | Teacher edits locked attendance roster vs Director override | Teacher A sends `PATCH /rest/v1/attendance_records` on record with `locked: true`; Director repeats identical PATCH | Teacher blocked with HTTP 403; Director override succeeds with HTTP 200 | Teacher edit: HTTP 403<br>Director edit: HTTP 200 | **PASS** |
| **ATT-07** | Non-substitute teacher reads faculty substitutions | Teacher B sends `GET /rest/v1/substitutions` for a substitution assigned to Teacher A | 0 rows returned | Substitutions returned: 0 rows | **PASS** |
| **ATT-08** | Mutation / deletion of immutable audit log & emergency event ledgers | Director attempts `PATCH /rest/v1/audit_logs` and `DELETE /rest/v1/audit_logs`; Teacher A attempts inserting with Director's `actor_id` | HTTP 403 Forbidden for all UPDATE/DELETE attempts; spoofed actor blocked | Audit UPDATE: HTTP 403<br>Audit DELETE: HTTP 403<br>Actor spoof: HTTP 403 | **PASS** |
| **ATT-09** | Anonymous unauthenticated probe of tables, views, RPC, and Edge Functions | Anonymous client calls `POST /rest/v1/rpc/preview_promotion`, `POST /functions/v1/create-teacher`, `GET /rest/v1/profiles`, `POST /rest/v1/broadcasts` | Sensitive RPC: 401<br>Edge Function: 401<br>Sensitive GET: 0 rows<br>Mutation: 401 | RPC: HTTP 401<br>Edge Function: HTTP 401<br>Profiles: 0 rows<br>Broadcast POST: HTTP 401 | **PASS** |
| **ATT-10** | Malicious SQL Injection & Stored XSS payload injection | Director posts broadcast with headline: `'; DROP TABLE profiles; -- <img src=x onerror=alert('XSS')>` | Payload stored safely as inert literal text; DB unharmed; rendered safely via `escapeHtml()` | Stored literally (HTTP 201). DOM verification proves zero execution; renders as inert text | **PASS** |
| **ATT-11** | Mass-assignment attack with privileged/unknown fields | Caller posts to `/functions/v1/create-teacher` with injected attributes `{ role: 'director', is_superadmin: true }` | Schema validation rejects unexpected keys with HTTP 400 Bad Request | HTTP 400 Bad Request (`Unexpected field in payload: role`) | **PASS** |
| **ATT-12** | Auth brute-force rate limit saturation test | 25 rapid authentication requests to `/auth/v1/token` within 2 seconds | Request throttling triggers HTTP 429 Too Many Requests | HTTP 429 Too Many Requests triggered on attempt 16 | **PASS** |
| **ATT-13** | Expired and forged JWT authorization probe | Caller sends request with expired JWT timestamp and forged HMAC signature | Requests rejected with HTTP 401 Unauthorized | Expired token: HTTP 401<br>Forged token: HTTP 401 | **PASS** |

---

## 3. Detailed Attack Vector Walkthrough

### Scenario 1: Cross-Student Record Privacy (ATT-01)
- **Description:** Student Alpha attempts to harvest attendance history and academic grades belonging to Student Beta.
- **Payload:** `GET /rest/v1/attendance_records?student_id=eq.b0000000-0000-0000-0000-000000000001`
- **Defense Mechanism:** The PostgreSQL Row-Level Security policy (`attendance_records_student_read`) and the application proxy enforce `auth.uid() = student_id`. Because Student Alpha's JWT `sub` is `a0000000-0000-0000-0000-000000000001`, the query evaluated to an empty result set (`[]`).
- **Verdict:** **PASS** (Zero rows leaked).

### Scenario 2: Student Privilege Escalation (ATT-02)
- **Description:** Student Alpha attempts to promote their account to `director` via `PATCH /rest/v1/profiles`.
- **Payload:** `PATCH /rest/v1/profiles?id=eq.a0000000-0000-0000-0000-000000000001` with body `{"role":"director"}`.
- **Defense Mechanism:** Database trigger `prevent_unauthorized_profile_modifications` and the server-side profile guard inspect the caller role. If `callerRole !== 'director'`, any mutation targeting `role`, `id`, `student_id_code`, or `house_id` raises an exception and yields HTTP 403 Forbidden.
- **Verdict:** **PASS** (Role update rejected with 403).

### Scenario 3: Double Voting & Impersonation (ATT-03)
- **Description:** Student attempts to vote on behalf of a peer, and attempts to vote twice on the same venture.
- **Payload:** `POST /rest/v1/venture_votes` with `{ venture_id: 'v-101', student_id: 'b0000000-0000-0000-0000-000000000001' }`.
- **Defense Mechanism:** The system verifies `student_id === callerUser.id`, returning 403 when impersonating. Unique composite constraint `(venture_id, student_id)` prevents subsequent votes with HTTP 409 Conflict.
- **Verdict:** **PASS** (Impersonation blocked 403; duplicate vote blocked 409).

### Scenario 4: Teacher Isolation & Locked Attendance (ATT-05, ATT-06, ATT-07)
- **Description:** Teacher Alpha probes Teacher Beta's lecture plans and leave records; attempts to alter locked attendance records.
- **Payload:** `PATCH /rest/v1/attendance_records?id=eq.att-locked-record-1` with `{ status: 'absent' }`.
- **Defense Mechanism:** The RLS policy and server check inspect `locked = true`. Faculty members cannot update or delete locked attendance. Only the Director role is permitted to override locked attendance.
- **Verdict:** **PASS** (Teacher modification blocked 403; Director override succeeded 200).

### Scenario 5: Audit Log Immutability (ATT-08)
- **Description:** Even Director accounts cannot rewrite or delete historical audit entries.
- **Payload:** `PATCH /rest/v1/audit_logs?id=eq.audit-log-immut-1` with `{ action: 'WIPED' }`.
- **Defense Mechanism:** Trigger `prevent_audit_logs_tampering` unconditionally aborts any `UPDATE` or `DELETE` statement on `audit_logs` and `emergency_events`.
- **Verdict:** **PASS** (Both UPDATE and DELETE returned HTTP 403 Forbidden).
