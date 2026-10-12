-- Expose only the configured domain allowlist to unauthenticated login clients.
CREATE OR REPLACE FUNCTION public.get_allowed_email_domains()
RETURNS TEXT[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        ARRAY(
            SELECT LOWER(TRIM(domain))
            FROM unnest(string_to_array(COALESCE((SELECT value FROM public.app_config WHERE key = 'allowed_domains' LIMIT 1), ''), ',')) AS domains(domain)
            WHERE TRIM(domain) <> ''
        ),
        ARRAY[]::TEXT[]
    );
$$;
REVOKE ALL ON FUNCTION public.get_allowed_email_domains() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_allowed_email_domains() TO anon, authenticated;

-- Signup accounts always begin as teachers. Directors are assigned explicitly by
-- the authenticated director-only provisioning endpoint at account creation.
CREATE OR REPLACE FUNCTION public.suggest_role(p_email TEXT)
RETURNS public.user_role
LANGUAGE sql
STABLE
AS $$
    SELECT 'teacher'::public.user_role;
$$;

-- Keep account creation closed when the school's allowlist is missing or empty.
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
    v_allowed_domain TEXT;
    v_allowed BOOLEAN := false;
BEGIN
    IF NEW.email IS NULL OR TRIM(NEW.email) = '' THEN
        RAISE EXCEPTION 'Registration failed: Institutional email address is required.';
    END IF;

    v_clean_email := LOWER(TRIM(NEW.email));
    NEW.email := v_clean_email;
    IF v_clean_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN
        RAISE EXCEPTION 'Registration failed: Enter a valid institutional email address.';
    END IF;
    v_domain := SPLIT_PART(v_clean_email, '@', 2);

    SELECT value INTO v_allowed_domains_raw
    FROM public.app_config WHERE key = 'allowed_domains' LIMIT 1;

    IF v_allowed_domains_raw IS NOT NULL THEN
        FOREACH v_allowed_domain IN ARRAY string_to_array(LOWER(v_allowed_domains_raw), ',') LOOP
            v_allowed_domain := TRIM(v_allowed_domain);
            IF v_allowed_domain <> '' AND (v_domain = v_allowed_domain OR v_domain LIKE '%.' || v_allowed_domain) THEN
                v_allowed := true;
                EXIT;
            END IF;
        END LOOP;
    END IF;

    IF NOT v_allowed THEN
        RAISE EXCEPTION 'Access restricted: Email domain @% is not allowed by this school. Allowed domain(s): %',
            v_domain, COALESCE(NULLIF(TRIM(v_allowed_domains_raw), ''), 'none configured');
    END IF;

    RETURN NEW;
END;
$$;
