-- =============================================================================
-- Migration: 20261009000001_final_security_lockdown.sql
-- Description:
--   Comprehensive security lockdown for BrainzOS / Eduvia:
--   1. Enable and FORCE Row Level Security on EVERY table in public schema. Default deny.
--   2. Revoke all default permissions from anon & public. Grant minimum to authenticated.
--   3. Recreate all views with security_invoker = true so they obey caller's RLS.
--   4. Harden all SECURITY DEFINER functions with SET search_path = '' and fully qualified names.
--   5. Privilege escalation guard: prevent self-assigning role at signup and block
--      modification of role, id, student_id_code, house_id unless caller is director.
--   6. Column-level protection: votes derived from venture_votes only; ventures.status,
--      ventures.directors_pick, attendance_records.locked, houses.points writable only by authorized roles.
--   7. audit_logs and emergency_events: INSERT-only with verified auth.uid(), immutable (no UPDATE/DELETE),
--      SELECT restricted to directors.
--   8. substitutions: SELECT restricted to substitute_teacher_id = auth.uid() OR director.
--   9. attendance_records: locked roster cannot be updated/deleted by faculty; director override only.
--  10. Integrity constraints: unique vote per student per venture, unique attendance per student per date,
--      string length bounds, and non-null enforcement.
--  11. Realtime publication pruning to authorized channels only.
--  12. Storage buckets private enforcement with scoped path RLS.
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. ENABLE AND FORCE ROW LEVEL SECURITY ON EVERY TABLE IN PUBLIC SCHEMA
-- =============================================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
        EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY;', r.tablename);
    END LOOP;
END $$;

-- =============================================================================
-- 2. REVOKE ALL DEFAULT PERMISSIONS FROM ANON AND PUBLIC
-- =============================================================================

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, public;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, public;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon, public;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, public;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, public;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON ROUTINES FROM anon, public;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =============================================================================
-- 3. HARDENED HELPER FUNCTIONS (SET search_path = '', FULLY QUALIFIED)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_director()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'director'
          AND role_confirmed = TRUE
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'teacher'
          AND role_confirmed = TRUE
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_teacher_of(target_class_section pg_catalog.text)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_class_section pg_catalog.text;
    v_section pg_catalog.text;
BEGIN
    IF auth.uid() IS NULL OR target_class_section IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Directors have universal institutional oversight
    IF public.is_director() THEN
        RETURN TRUE;
    END IF;

    -- Query teacher's assigned class sections from profile
    SELECT class_section INTO v_class_section
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'teacher'
      AND role_confirmed = TRUE;

    IF v_class_section IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Support comma-separated assignment strings
    FOREACH v_section IN ARRAY pg_catalog.string_to_array(v_class_section, ',')
    LOOP
        IF pg_catalog.trim(v_section) = pg_catalog.trim(target_class_section) THEN
            RETURN TRUE;
        END IF;
    END LOOP;

    RETURN FALSE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.is_director() FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.is_teacher() FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.is_teacher_of(pg_catalog.text) FROM public, anon;

GRANT EXECUTE ON FUNCTION public.is_director() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_teacher() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_teacher_of(pg_catalog.text) TO authenticated;

-- =============================================================================
-- 4. PRIVILEGE ESCALATION GUARDS & PROFILE IMMUTABILITY TRIGGERS
-- =============================================================================

-- Ensure handle_new_user NEVER trusts raw_user_meta_data for user role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_role_text pg_catalog.text;
    v_name pg_catalog.text;
BEGIN
    -- Determine role solely via server-side suggest_role based on email domain/rules
    v_role_text := public.suggest_role(NEW.email)::pg_catalog.text;
    
    -- If rule does not match teacher or director, default to unconfirmed student record
    IF v_role_text NOT IN ('teacher', 'director') THEN
        v_role_text := 'student';
    END IF;

    v_name := pg_catalog.coalesce(
        pg_catalog.nullif(pg_catalog.trim(NEW.raw_user_meta_data->>'full_name'), ''),
        pg_catalog.split_part(NEW.email, '@', 1)
    );

    INSERT INTO public.profiles (
        id, 
        full_name, 
        role, 
        role_confirmed, 
        email, 
        created_at, 
        updated_at
    )
    VALUES (
        NEW.id, 
        v_name, 
        v_role_text, 
        FALSE, 
        pg_catalog.lower(NEW.email), 
        pg_catalog.now(), 
        pg_catalog.now()
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        updated_at = pg_catalog.now();

    RETURN NEW;
END;
$$;

-- BEFORE UPDATE trigger on public.profiles:
-- Rejects any change to role, id, student_id_code, house_id unless caller is director
CREATE OR REPLACE FUNCTION public.prevent_unauthorized_profile_modifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_is_dir BOOLEAN;
BEGIN
    v_is_dir := public.is_director();

    -- Primary key ID is strictly immutable for everyone
    IF NEW.id IS DISTINCT FROM OLD.id THEN
        RAISE EXCEPTION 'Permission Denied: User profile ID is strictly immutable.';
    END IF;

    -- If caller is Director, permit role and structural administrative updates
    IF v_is_dir THEN
        -- Guard against setting director role to non-authorized emails
        IF NEW.role = 'director' AND OLD.role != 'director' THEN
            IF pg_catalog.lower(pg_catalog.coalesce(NEW.email, '')) != (
                SELECT pg_catalog.lower(value) 
                FROM public.app_config 
                WHERE key = 'director_email' 
                LIMIT 1
            ) THEN
                RAISE EXCEPTION 'Permission Denied: Only institutional Director email in app_config can hold the director role.';
            END IF;
        END IF;

        NEW.updated_at := pg_catalog.now();
        RETURN NEW;
    END IF;

    -- Non-directors: Cannot alter role under ANY circumstances
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        RAISE EXCEPTION 'Permission Denied: You cannot modify your own role (attempted % -> %). Contact School Director.', OLD.role, NEW.role;
    END IF;

    -- Non-directors: Cannot alter role_confirmed status
    IF NEW.role_confirmed IS DISTINCT FROM OLD.role_confirmed THEN
        RAISE EXCEPTION 'Permission Denied: Only Director can confirm or alter account approval status.';
    END IF;

    -- Non-directors: Cannot modify student_id_code
    IF NEW.student_id_code IS DISTINCT FROM OLD.student_id_code THEN
        RAISE EXCEPTION 'Permission Denied: Institutional student ID code is immutable.';
    END IF;

    -- Non-directors: Cannot modify house or house_id
    IF (to_jsonb(NEW) ? 'house_id') AND ((to_jsonb(NEW)->>'house_id') IS DISTINCT FROM (to_jsonb(OLD)->>'house_id')) THEN
        RAISE EXCEPTION 'Permission Denied: Institutional house assignment cannot be modified.';
    END IF;

    IF (to_jsonb(NEW) ? 'house') AND ((to_jsonb(NEW)->>'house') IS DISTINCT FROM (to_jsonb(OLD)->>'house')) THEN
        RAISE EXCEPTION 'Permission Denied: Institutional house assignment cannot be modified.';
    END IF;

    -- Non-directors: Cannot alter auth-linked email on profile
    IF (to_jsonb(NEW) ? 'email') AND ((to_jsonb(NEW)->>'email') IS DISTINCT FROM (to_jsonb(OLD)->>'email')) THEN
        RAISE EXCEPTION 'Permission Denied: Registered institutional email address cannot be changed.';
    END IF;

    -- Teachers updating student profiles: only allowed for students in taught sections
    IF public.is_teacher() AND OLD.role IN ('student', 'record') THEN
        IF OLD.class_section IS NULL OR NOT public.is_teacher_of(OLD.class_section) THEN
            RAISE EXCEPTION 'Permission Denied: Teachers can only edit student records in their assigned classes.';
        END IF;
        NEW.updated_at := pg_catalog.now();
        RETURN NEW;
    END IF;

    -- Students: cannot alter their class_section
    IF OLD.role IN ('student', 'record') THEN
        IF NEW.class_section IS DISTINCT FROM OLD.class_section AND OLD.class_section IS NOT NULL THEN
            RAISE EXCEPTION 'Permission Denied: Students cannot modify their class section.';
        END IF;
    END IF;

    NEW.updated_at := pg_catalog.now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_unauthorized_profile_modifications ON public.profiles;
CREATE TRIGGER trg_prevent_unauthorized_profile_modifications
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.prevent_unauthorized_profile_modifications();

-- =============================================================================
-- 5. RECREATE VIEWS WITH security_invoker = true
-- =============================================================================

CREATE OR REPLACE VIEW public.daily_attendance_summary 
WITH (security_invoker = true) AS
SELECT 
    date,
    class_section,
    COUNT(*) AS total_students,
    COUNT(*) FILTER (WHERE status = 'present') AS present_count,
    COUNT(*) FILTER (WHERE status = 'absent') AS absent_count,
    COUNT(*) FILTER (WHERE status = 'late') AS late_count,
    ROUND(
        (COUNT(*) FILTER (WHERE status = 'present')::NUMERIC / NULLIF(COUNT(*), 0)::NUMERIC) * 100, 
        1
    ) AS attendance_rate
FROM public.attendance_records
GROUP BY date, class_section;

CREATE OR REPLACE VIEW public.teacher_leave_summary 
WITH (security_invoker = true) AS
SELECT 
    teacher_id,
    COUNT(*) AS total_requests,
    COUNT(*) FILTER (WHERE status = 'approved') AS approved_requests,
    COUNT(*) FILTER (WHERE status = 'pending') AS pending_requests,
    COUNT(*) FILTER (WHERE status = 'rejected') AS rejected_requests,
    COALESCE(SUM(days_count) FILTER (WHERE status = 'approved'), 0) AS approved_days_taken
FROM public.leave_records
GROUP BY teacher_id;

CREATE OR REPLACE VIEW public.teacher_attendance_today 
WITH (security_invoker = true) AS
SELECT 
    p.id AS teacher_id,
    p.full_name AS teacher_name,
    p.class_section,
    CASE 
        WHEN lr.id IS NOT NULL THEN 'on_leave'
        ELSE 'present'
    END AS attendance_status,
    lr.leave_type,
    lr.substitute_teacher_id
FROM public.profiles p
LEFT JOIN public.leave_records lr 
    ON lr.teacher_id = p.id 
   AND lr.status = 'approved'
   AND CURRENT_DATE BETWEEN lr.start_date AND lr.end_date
WHERE p.role = 'teacher' 
  AND p.role_confirmed = TRUE;

CREATE OR REPLACE VIEW public.daily_attendance_by_group 
WITH (security_invoker = true) AS
SELECT 
    ar.date,
    ar.class_section,
    ar.attendance_group,
    COUNT(*) AS total_students,
    COUNT(*) FILTER (WHERE ar.status = 'present') AS present_count,
    COUNT(*) FILTER (WHERE ar.status = 'absent') AS absent_count,
    COUNT(*) FILTER (WHERE ar.status = 'late') AS late_count,
    ROUND(
        (COUNT(*) FILTER (WHERE ar.status = 'present')::NUMERIC / NULLIF(COUNT(*), 0)::NUMERIC) * 100, 
        1
    ) AS attendance_rate
FROM public.attendance_records ar
GROUP BY ar.date, ar.class_section, ar.attendance_group;

CREATE OR REPLACE VIEW public.student_record_summary 
WITH (security_invoker = true) AS
SELECT 
    p.id AS student_id,
    p.full_name,
    p.student_id_code,
    p.class_section,
    p.house,
    COALESCE(att.attendance_rate, 0) AS attendance_rate,
    COALESCE(notes_count.total_notes, 0) AS confidential_notes_count
FROM public.profiles p
LEFT JOIN (
    SELECT 
        student_id,
        ROUND((COUNT(*) FILTER (WHERE status = 'present')::NUMERIC / NULLIF(COUNT(*), 0)::NUMERIC) * 100, 1) AS attendance_rate
    FROM public.attendance_records
    GROUP BY student_id
) att ON att.student_id = p.id
LEFT JOIN (
    SELECT student_id, COUNT(*) AS total_notes
    FROM public.student_notes
    GROUP BY student_id
) notes_count ON notes_count.student_id = p.id
WHERE p.role IN ('student', 'record');

-- =============================================================================
-- 6. IMMUTABLE AUDIT LOGS & EMERGENCY EVENTS ENFORCEMENT
-- =============================================================================

CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RAISE EXCEPTION 'Audit ledger records are strictly immutable: UPDATE and DELETE operations are forbidden.';
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_immutable
    BEFORE UPDATE OR DELETE ON public.audit_logs
    FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation();

DROP TRIGGER IF EXISTS trg_emergency_events_immutable ON public.emergency_events;
CREATE TRIGGER trg_emergency_events_immutable
    BEFORE UPDATE OR DELETE ON public.emergency_events
    FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation();

-- Ensure actor_id on audit_logs and emergency_events matches auth.uid()
CREATE OR REPLACE FUNCTION public.enforce_audit_actor_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF auth.uid() IS NOT NULL THEN
        NEW.actor_id := auth.uid();
    ELSIF NEW.actor_id IS NULL THEN
        RAISE EXCEPTION 'Actor ID is required for audit recording.';
    END IF;
    NEW.created_at := pg_catalog.now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_audit_actor ON public.audit_logs;
CREATE TRIGGER trg_enforce_audit_actor
    BEFORE INSERT ON public.audit_logs
    FOR EACH ROW EXECUTE FUNCTION public.enforce_audit_actor_id();

DROP TRIGGER IF EXISTS trg_enforce_emergency_actor ON public.emergency_events;
CREATE TRIGGER trg_enforce_emergency_actor
    BEFORE INSERT ON public.emergency_events
    FOR EACH ROW EXECUTE FUNCTION public.enforce_audit_actor_id();

-- RLS for audit_logs: SELECT director only; INSERT authenticated actor; no UPDATE/DELETE
DROP POLICY IF EXISTS "audit_logs_select_director" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
CREATE POLICY "audit_logs_select_director"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (public.is_director());

DROP POLICY IF EXISTS "audit_logs_insert_authenticated" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_authenticated"
    ON public.audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (actor_id = auth.uid());

-- RLS for emergency_events: SELECT director and teacher; INSERT director only; no UPDATE/DELETE
DROP POLICY IF EXISTS "emergency_events_select" ON public.emergency_events;
CREATE POLICY "emergency_events_select"
    ON public.emergency_events FOR SELECT
    TO authenticated
    USING (public.is_director() OR public.is_teacher());

DROP POLICY IF EXISTS "emergency_events_insert_director" ON public.emergency_events;
CREATE POLICY "emergency_events_insert_director"
    ON public.emergency_events FOR INSERT
    TO authenticated
    WITH CHECK (public.is_director() AND actor_id = auth.uid());

-- =============================================================================
-- 7. COLUMN-LEVEL PROTECTION & ATTENDANCE LOCK ENFORCEMENT
-- =============================================================================

-- ventures: votes can ONLY be updated via venture_votes trigger, never directly
CREATE OR REPLACE FUNCTION public.prevent_manual_venture_vote_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF pg_catalog.pg_trigger_depth() = 1 THEN
        IF NEW.votes IS DISTINCT FROM OLD.votes THEN
            RAISE EXCEPTION 'Permission Denied: Venture vote counts are derived exclusively from venture_votes.';
        END IF;
    END IF;

    -- status and directors_pick can ONLY be altered by the Director
    IF (NEW.status IS DISTINCT FROM OLD.status OR NEW.directors_pick IS DISTINCT FROM OLD.directors_pick) THEN
        IF NOT public.is_director() THEN
            RAISE EXCEPTION 'Permission Denied: Only the Director can change venture status or set Directors Pick.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_manual_venture_vote_tampering ON public.ventures;
CREATE TRIGGER trg_prevent_manual_venture_vote_tampering
    BEFORE UPDATE ON public.ventures
    FOR EACH ROW EXECUTE FUNCTION public.prevent_manual_venture_vote_tampering();

-- attendance_records: locked rosters cannot be updated or deleted by teachers
CREATE OR REPLACE FUNCTION public.prevent_locked_attendance_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF OLD.locked = TRUE AND NOT public.is_director() THEN
        RAISE EXCEPTION 'Permission Denied: Attendance record is locked. Only Director can unlock or modify locked rosters.';
    END IF;

    -- Only director can change the 'locked' flag itself
    IF NEW.locked IS DISTINCT FROM OLD.locked AND NOT public.is_director() THEN
        RAISE EXCEPTION 'Permission Denied: Only Director can lock or unlock attendance records.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_locked_attendance_tampering ON public.attendance_records;
CREATE TRIGGER trg_prevent_locked_attendance_tampering
    BEFORE UPDATE ON public.attendance_records
    FOR EACH ROW EXECUTE FUNCTION public.prevent_locked_attendance_tampering();

DROP TRIGGER IF EXISTS trg_prevent_locked_attendance_delete ON public.attendance_records;
CREATE TRIGGER trg_prevent_locked_attendance_delete
    BEFORE DELETE ON public.attendance_records
    FOR EACH ROW EXECUTE FUNCTION public.prevent_locked_attendance_tampering();

-- RLS Update for attendance_records enforcing lock status
DROP POLICY IF EXISTS "attendance_records_update" ON public.attendance_records;
CREATE POLICY "attendance_records_update"
    ON public.attendance_records FOR UPDATE
    TO authenticated
    USING (
        public.is_director() 
        OR (public.is_teacher() AND NOT locked AND public.is_teacher_of(class_section))
    )
    WITH CHECK (
        public.is_director() 
        OR (public.is_teacher() AND NOT locked AND public.is_teacher_of(class_section))
    );

DROP POLICY IF EXISTS "attendance_records_delete" ON public.attendance_records;
CREATE POLICY "attendance_records_delete"
    ON public.attendance_records FOR DELETE
    TO authenticated
    USING (
        public.is_director() 
        OR (public.is_teacher() AND NOT locked AND public.is_teacher_of(class_section))
    );

-- houses: points can only be updated by Director
DROP POLICY IF EXISTS "houses_update_director" ON public.houses;
CREATE POLICY "houses_update_director"
    ON public.houses FOR UPDATE
    TO authenticated
    USING (public.is_director())
    WITH CHECK (public.is_director());

-- =============================================================================
-- 8. SUBSTITUTIONS STRICT ACCESS CONTROL
-- =============================================================================

DROP POLICY IF EXISTS "substitutions_select" ON public.substitutions;
DROP POLICY IF EXISTS "substitutions_select_assigned_or_director" ON public.substitutions;
CREATE POLICY "substitutions_select_assigned_or_director"
    ON public.substitutions FOR SELECT
    TO authenticated
    USING (
        public.is_director()
        OR substitute_teacher_id = auth.uid()
    );

-- =============================================================================
-- 9. DATA INTEGRITY CONSTRAINTS & LIMITS
-- =============================================================================

-- Ensure 1 vote per student per venture
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_venture_votes_student_venture'
    ) THEN
        ALTER TABLE public.venture_votes 
        ADD CONSTRAINT uq_venture_votes_student_venture UNIQUE (venture_id, student_id);
    END IF;
END $$;

-- Ensure 1 attendance row per student per date
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_attendance_student_date'
    ) THEN
        ALTER TABLE public.attendance_records 
        ADD CONSTRAINT uq_attendance_student_date UNIQUE (student_id, date);
    END IF;
END $$;

-- Text length bounds & NOT NULL constraints on sensitive fields
DO $$
BEGIN
    -- broadcasts length constraints
    ALTER TABLE public.broadcasts 
        ALTER COLUMN headline SET NOT NULL;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_broadcasts_headline_len') THEN
        ALTER TABLE public.broadcasts ADD CONSTRAINT chk_broadcasts_headline_len CHECK (char_length(headline) <= 255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_broadcasts_message_len') THEN
        ALTER TABLE public.broadcasts ADD CONSTRAINT chk_broadcasts_message_len CHECK (char_length(message) <= 5000);
    END IF;

    -- assignments title bounds
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_assignments_title_len') THEN
        ALTER TABLE public.assignments ADD CONSTRAINT chk_assignments_title_len CHECK (char_length(title) <= 255);
    END IF;

    -- student notes bounds
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_student_notes_content_len') THEN
        ALTER TABLE public.student_notes ADD CONSTRAINT chk_student_notes_content_len CHECK (char_length(content) <= 5000);
    END IF;
END $$;

-- =============================================================================
-- 10. REALTIME PUBLICATIONS HARDENING
-- =============================================================================

-- Ensure realtime publication only includes tables that require live streaming:
-- broadcasts (instant school-wide announcements), audit_logs (director ledger), ventures
DO $$
BEGIN
    -- Create publication if missing
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

ALTER PUBLICATION supabase_realtime SET TABLE 
    public.broadcasts, 
    public.ventures, 
    public.audit_logs;

-- =============================================================================
-- 11. STORAGE BUCKETS PRIVACY & SCOPED RLS
-- =============================================================================

-- Make all storage buckets strictly private
UPDATE storage.buckets
SET public = FALSE
WHERE id IN ('avatars', 'assignment-attachments', 'person-documents');

-- Enforce strict path RLS on storage.objects for avatars
DROP POLICY IF EXISTS "avatars_storage_user_upload" ON storage.objects;
CREATE POLICY "avatars_storage_user_upload"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "avatars_storage_user_update" ON storage.objects;
CREATE POLICY "avatars_storage_user_update"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "avatars_storage_user_delete" ON storage.objects;
CREATE POLICY "avatars_storage_user_delete"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

COMMIT;
