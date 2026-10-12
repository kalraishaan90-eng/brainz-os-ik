-- =============================================================================
-- Migration: 20261004000001_configurable_school_settings_and_feature_flags.sql
-- Description: Dynamic per-school feature flags table, configurable allowed domains,
--              teacher+director role assignment rules, and preset configuration support.
-- Stack: Supabase PostgreSQL
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. FEATURE_FLAGS TABLE & RLS POLICIES
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.feature_flags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    enabled BOOLEAN NOT NULL DEFAULT true,
    depends_on TEXT[] DEFAULT ARRAY[]::TEXT[],
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feature_flags_read_all" ON public.feature_flags;
CREATE POLICY "feature_flags_read_all"
    ON public.feature_flags FOR SELECT
    TO authenticated, anon
    USING (true);

DROP POLICY IF EXISTS "feature_flags_write_director" ON public.feature_flags;
CREATE POLICY "feature_flags_write_director"
    ON public.feature_flags FOR ALL
    TO authenticated
    USING (public.is_director())
    WITH CHECK (public.is_director());

-- Seed the 12 core institutional feature modules
INSERT INTO public.feature_flags (id, name, description, enabled, depends_on)
VALUES
    ('attendance', 'Period Attendance & Reports', 'Daily period attendance roll and institutional cohort summaries', true, ARRAY[]::TEXT[]),
    ('gradebook', 'Gradebook & Final Marks', 'Continuous assessment mark entry, score bands, and report cards', true, ARRAY[]::TEXT[]),
    ('assignments', 'Coursework & Assignments', 'Class homework assignments and digital submission tracking', true, ARRAY[]::TEXT[]),
    ('lecture_planner', 'Lecture & Test Planner', 'Daily syllabus tracking and upcoming class test calendar', true, ARRAY[]::TEXT[]),
    ('test_schedule', 'Test Schedule Rollup', 'Examination timetables and master test schedule rollup', true, ARRAY[]::TEXT[]),
    ('leave_management', 'Staff Leave Management', 'Faculty leave requests, approval workflow, and balance ledger', true, ARRAY[]::TEXT[]),
    ('substitutions', 'Staff Substitutions', 'Period cover assignments and automatic faculty substitution', true, ARRAY['leave_management']::TEXT[]),
    ('broadcasts', 'Broadcasts & Notices', 'School-wide and targeted institutional bulletin announcements', true, ARRAY[]::TEXT[]),
    ('school_feed', 'School-Wide Feed', 'Live campus stream of accomplishments and campus updates', true, ARRAY[]::TEXT[]),
    ('student_notes_register', 'Student Notes & Cumulative Register', 'Confidential student notes register and historical student records', true, ARRAY[]::TEXT[]),
    ('houses_clubs', 'Houses & Clubs', 'House point standings, student leadership, and club rosters', true, ARRAY[]::TEXT[]),
    ('promotion', 'Year-End Promotion', 'Batch academic progression and automated roll advancement', true, ARRAY['gradebook']::TEXT[])
ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        depends_on = EXCLUDED.depends_on;

-- -----------------------------------------------------------------------------
-- 2. APP_CONFIG EXTENSIONS: ALLOWED DOMAINS & SCHOOL METADATA
-- -----------------------------------------------------------------------------

INSERT INTO public.app_config (key, value, description)
VALUES
    ('allowed_domains', 'brainzeduworld.com, brainz.edu', 'Comma-separated authorized institutional email domains'),
    ('school_name', 'Brainz Educational World', 'Full institutional name of the school')
ON CONFLICT (key) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 3. DYNAMIC DOMAIN LOCK TRIGGER FUNCTION ON auth.users
-- -----------------------------------------------------------------------------
-- Replaces hardcoded regex with configurable allowed_domains lookup from app_config.

CREATE OR REPLACE FUNCTION public.check_user_domain_lock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_clean_email TEXT;
    v_domain TEXT;
    v_allowed_domains_raw TEXT;
    v_allowed_list TEXT[];
    v_allowed BOOLEAN := false;
    v_item TEXT;
BEGIN
    IF NEW.email IS NULL OR TRIM(NEW.email) = '' THEN
        RAISE EXCEPTION 'Registration failed: Institutional email address is required.';
    END IF;

    v_clean_email := LOWER(TRIM(NEW.email));
    NEW.email := v_clean_email;
    v_domain := SPLIT_PART(v_clean_email, '@', 2);

    -- Retrieve configured allowed domains from app_config
    SELECT value INTO v_allowed_domains_raw
    FROM public.app_config
    WHERE key = 'allowed_domains'
    LIMIT 1;

    IF v_allowed_domains_raw IS NULL OR TRIM(v_allowed_domains_raw) = '' THEN
        v_allowed_domains_raw := 'brainzeduworld.com, brainz.edu';
    END IF;

    -- Verify domain matches any comma-separated entry
    v_allowed_list := string_to_array(LOWER(v_allowed_domains_raw), ',');
    FOREACH v_item IN ARRAY v_allowed_list LOOP
        v_item := TRIM(v_item);
        IF v_item != '' AND (v_domain = v_item OR v_domain LIKE '%.' || v_item) THEN
            v_allowed := true;
            EXIT;
        END IF;
    END LOOP;

    IF NOT v_allowed THEN
        RAISE EXCEPTION 'Access restricted: Institutional email domain (@%) is not authorized. Allowed domain(s): %', v_domain, v_allowed_domains_raw;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auth_users_domain_lock ON auth.users;
CREATE TRIGGER trg_auth_users_domain_lock
    BEFORE INSERT OR UPDATE OF email ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.check_user_domain_lock();

-- -----------------------------------------------------------------------------
-- 4. SIMPLIFIED ROLE SUGGESTION: TEACHER + DIRECTOR ONLY
-- -----------------------------------------------------------------------------
-- Replaces student regex guessing. Accounts are teacher or director.
-- Director role assigned if email matches director_email in app_config;
-- all other staff accounts default to teacher (explicitly set at creation).

CREATE OR REPLACE FUNCTION public.suggest_role(p_email TEXT)
RETURNS public.user_role
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_clean_email TEXT;
    v_director_config TEXT;
    v_director_local TEXT;
    v_local TEXT;
BEGIN
    IF p_email IS NULL OR TRIM(p_email) = '' THEN
        RETURN 'teacher'::public.user_role;
    END IF;

    v_clean_email := LOWER(TRIM(p_email));
    v_local := SPLIT_PART(v_clean_email, '@', 1);

    SELECT LOWER(TRIM(value)) INTO v_director_config
    FROM public.app_config
    WHERE key = 'director_email'
    LIMIT 1;

    IF v_director_config IS NOT NULL AND v_director_config != '' THEN
        v_director_local := SPLIT_PART(v_director_config, '@', 1);
        IF v_clean_email = v_director_config OR v_local = v_director_local OR v_local = 'director' THEN
            RETURN 'director'::public.user_role;
        END IF;
    ELSIF v_local = 'director' THEN
        RETURN 'director'::public.user_role;
    END IF;

    RETURN 'teacher'::public.user_role;
END;
$$;
