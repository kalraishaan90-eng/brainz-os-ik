-- Management-only authentication with preserved student records.
-- Student data currently lives in profiles; detach student rows from auth.users before
-- deleting their credentials, then retain those rows as non-login records.

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'record';

ALTER TABLE public.profiles ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles ALTER COLUMN role DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN role TYPE TEXT USING role::TEXT;

-- Keep staff editing and promotion routines aligned with the retained record role.
DO $$
DECLARE r RECORD; v_definition TEXT;
BEGIN
    FOR r IN
        SELECT p.oid, n.nspname, p.proname
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.prokind IN ('f', 'p')
          AND pg_get_functiondef(p.oid) ~* '(old\.|new\.|p\.)?role\s*=\s*''student'''
    LOOP
        v_definition := pg_get_functiondef(r.oid);
        v_definition := regexp_replace(v_definition, '(old\.|new\.|p\.)?role(\s*)=(\s*)''student''', '\1role\2=\3''record''', 'gi');
        EXECUTE v_definition;
    END LOOP;
END $$;

UPDATE public.profiles SET role = 'record' WHERE role = 'student';

DO $$
DECLARE r RECORD; v_definition TEXT;
BEGIN
    FOR r IN
        SELECT c.oid, n.nspname, c.relname
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'v'
          AND pg_get_viewdef(c.oid, true) ~* 'role\s*=\s*''student'''
    LOOP
        v_definition := pg_get_viewdef(r.oid, true);
        v_definition := regexp_replace(v_definition, 'role(\s*)=(\s*)''student''', 'role\1=\2''record''', 'gi');
        EXECUTE format('CREATE OR REPLACE VIEW %I.%I AS %s', r.nspname, r.relname, v_definition);
    END LOOP;
END $$;
ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_check CHECK (role IN ('teacher', 'director', 'record'));
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'teacher';

DELETE FROM auth.users u
USING public.profiles p
WHERE p.id = u.id
  AND p.role = 'record';

-- Reject student or arbitrary roles for every newly created Auth account.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_role public.user_role;
    v_role_text TEXT;
    v_name TEXT;
BEGIN
    v_role_text := public.suggest_role(NEW.email)::TEXT;
    IF v_role_text NOT IN ('teacher', 'director') THEN
        RAISE EXCEPTION 'Only teacher and director accounts are supported.';
    END IF;
    v_role := v_role_text::public.user_role;
    v_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), SPLIT_PART(NEW.email, '@', 1));

    INSERT INTO public.profiles (id, full_name, role, role_confirmed, email, created_at, updated_at)
    VALUES (NEW.id, v_name, v_role::TEXT, false, LOWER(NEW.email), now(), now())
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        email = EXCLUDED.email,
        updated_at = now();
    RETURN NEW;
END;
$$;

-- Ensure staff identities have valid roles even if created outside the browser flow.
CREATE OR REPLACE FUNCTION public.prevent_student_auth_role()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_role TEXT;
BEGIN
    v_role := LOWER(COALESCE(NEW.raw_user_meta_data->>'role', public.suggest_role(NEW.email)::TEXT));
    IF v_role NOT IN ('teacher', 'director') THEN
        RAISE EXCEPTION 'Only teacher and director accounts are supported.';
    END IF;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_staff_auth_role_only ON auth.users;
CREATE TRIGGER trg_staff_auth_role_only
    BEFORE INSERT OR UPDATE OF raw_user_meta_data ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.prevent_student_auth_role();

-- Staff section scope: directors see every section; teachers see only their assigned sections.
DROP POLICY IF EXISTS "class_sections_select_authenticated" ON public.class_sections;
DROP POLICY IF EXISTS "class_sections_select_staff_scope" ON public.class_sections;
CREATE POLICY "class_sections_select_staff_scope"
    ON public.class_sections FOR SELECT TO authenticated
    USING (
        public.is_director()
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'teacher'
              AND display_name = ANY (
                  SELECT 'Class ' || TRIM(x)
                  FROM UNNEST(string_to_array(COALESCE(p.class_section, ''), ',')) AS x
              )
        )
    );

-- Replace all prior role-specific student access policies on record-bearing tables.
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN ('profiles', 'attendance_records', 'assignments', 'assignment_submissions', 'grades', 'student_notes')
    LOOP
        EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

CREATE POLICY "profiles_staff_read_scope" ON public.profiles
    FOR SELECT TO authenticated
    USING (
        id = auth.uid()
        OR public.is_director()
        OR (role = 'record' AND public.is_teacher_of(class_section))
        OR (role = 'teacher' AND public.is_teacher())
    );
CREATE POLICY "profiles_staff_update_scope" ON public.profiles
    FOR UPDATE TO authenticated
    USING (public.is_director() OR (role = 'record' AND public.is_teacher_of(class_section)))
    WITH CHECK (public.is_director() OR (role = 'record' AND public.is_teacher_of(class_section)));
CREATE POLICY "profiles_staff_insert_scope" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (public.is_director() OR (role = 'record' AND public.is_teacher_of(class_section)));
CREATE POLICY "profiles_staff_delete_scope" ON public.profiles
    FOR DELETE TO authenticated
    USING (public.is_director());

CREATE POLICY "attendance_staff_scope" ON public.attendance_records
    FOR ALL TO authenticated
    USING (
        public.is_director()
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = student_id AND p.role = 'record' AND public.is_teacher_of(p.class_section))
    )
    WITH CHECK (
        public.is_director()
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = student_id AND p.role = 'record' AND public.is_teacher_of(p.class_section))
    );
CREATE POLICY "assignments_staff_scope" ON public.assignments
    FOR ALL TO authenticated
    USING (public.is_director() OR (public.is_teacher_of(class_section) AND created_by = auth.uid()))
    WITH CHECK (public.is_director() OR (public.is_teacher_of(class_section) AND created_by = auth.uid()));
CREATE POLICY "submissions_staff_scope" ON public.assignment_submissions
    FOR ALL TO authenticated
    USING (
        public.is_director()
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = student_id AND p.role = 'record' AND public.is_teacher_of(p.class_section))
    )
    WITH CHECK (
        public.is_director()
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = student_id AND p.role = 'record' AND public.is_teacher_of(p.class_section))
    );
CREATE POLICY "grades_staff_scope" ON public.grades
    FOR ALL TO authenticated
    USING (
        public.is_director()
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = student_id AND p.role = 'record' AND public.is_teacher_of(p.class_section))
    )
    WITH CHECK (
        public.is_director()
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = student_id AND p.role = 'record' AND public.is_teacher_of(p.class_section))
    );
CREATE POLICY "student_notes_staff_scope" ON public.student_notes
    FOR ALL TO authenticated
    USING (
        public.is_director()
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = student_id AND p.role = 'record' AND public.is_teacher_of(p.class_section))
    )
    WITH CHECK (
        public.is_director()
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = student_id AND p.role = 'record' AND public.is_teacher_of(p.class_section))
    );

-- Houses and clubs remain optional director-managed records, disabled until explicitly enabled.
INSERT INTO public.feature_flags (id, name, description, enabled, depends_on)
VALUES ('houses_clubs', 'Houses & Clubs', 'Optional house and club management records', false, ARRAY[]::TEXT[])
ON CONFLICT (id) DO UPDATE SET enabled = false, description = EXCLUDED.description;

-- ventures and venture_votes remain dormant because legacy seed data and vote-count triggers reference them.
-- Digital pass has no standalone database table in this schema; its frontend is removed with the student modules.
