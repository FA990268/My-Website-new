-- =============================================================================
-- Supabase Migration 003: Student Auth Sessions & Test Activity Tracking
-- =============================================================================

-- Enforce unique registration_no (case-insensitive, trimmed) so each
-- Registration Number maps cleanly to one candidate account.
CREATE UNIQUE INDEX IF NOT EXISTS idx_candidate_registrations_reg_unique
    ON public.candidate_registrations (lower(trim(registration_no)));

-- 1. Server-side revocable student sessions (hashed opaque tokens)
CREATE TABLE IF NOT EXISTS public.student_sessions (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    candidate_id bigint NOT NULL REFERENCES public.candidate_registrations(id) ON DELETE CASCADE,
    session_token_hash text NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
    revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_student_sessions_candidate_id
    ON public.student_sessions (candidate_id);
CREATE INDEX IF NOT EXISTS idx_student_sessions_expires_at
    ON public.student_sessions (expires_at);

ALTER TABLE public.student_sessions ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.student_sessions TO service_role;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'student_sessions'
          AND policyname = 'Deny direct student_sessions access'
    ) THEN
        CREATE POLICY "Deny direct student_sessions access"
            ON public.student_sessions
            FOR ALL
            TO anon, authenticated
            USING (false)
            WITH CHECK (false);
    END IF;
END $$;

-- 2. Student test attempts & activity log
CREATE TABLE IF NOT EXISTS public.student_test_attempts (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    candidate_id bigint NOT NULL REFERENCES public.candidate_registrations(id) ON DELETE CASCADE,
    registration_no text NOT NULL,
    exam_type text NOT NULL CHECK (exam_type IN ('cbt', 'model')),
    exam_id text,
    exam_title text NOT NULL,
    scaled_score integer NOT NULL CHECK (scaled_score >= 0 AND scaled_score <= 250),
    max_score integer NOT NULL DEFAULT 250,
    pass_mark integer NOT NULL DEFAULT 200,
    is_passed boolean NOT NULL DEFAULT false,
    total_correct integer NOT NULL DEFAULT 0,
    total_questions integer NOT NULL DEFAULT 0,
    section_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
    completed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_test_attempts_candidate_completed
    ON public.student_test_attempts (candidate_id, completed_at DESC);

ALTER TABLE public.student_test_attempts ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.student_test_attempts TO service_role;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'student_test_attempts'
          AND policyname = 'Deny direct student_test_attempts access'
    ) THEN
        CREATE POLICY "Deny direct student_test_attempts access"
            ON public.student_test_attempts
            FOR ALL
            TO anon, authenticated
            USING (false)
            WITH CHECK (false);
    END IF;
END $$;

-- 3. Internal helper to assemble authenticated candidate profile + test stats + history
CREATE OR REPLACE FUNCTION public._build_student_profile_payload(p_candidate_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_candidate jsonb;
    v_stats jsonb;
    v_history jsonb;
BEGIN
    SELECT jsonb_build_object(
        'id', c.id,
        'full_name', c.full_name,
        'registration_no', c.registration_no,
        'date_of_birth', c.date_of_birth,
        'test_location', c.test_location,
        'nationality', c.nationality,
        'sex', c.sex,
        'photo_url', c.photo_url,
        'created_at', c.created_at
    )
    INTO v_candidate
    FROM public.candidate_registrations c
    WHERE c.id = p_candidate_id;

    IF v_candidate IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT jsonb_build_object(
        'total_tests', COALESCE(COUNT(*), 0),
        'passed_tests', COALESCE(COUNT(*) FILTER (WHERE is_passed), 0),
        'best_score', MAX(scaled_score),
        'average_score', CASE WHEN COUNT(*) > 0 THEN ROUND(AVG(scaled_score))::integer ELSE NULL END
    )
    INTO v_stats
    FROM public.student_test_attempts
    WHERE candidate_id = p_candidate_id;

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', t.id,
                'exam_type', t.exam_type,
                'exam_id', t.exam_id,
                'exam_title', t.exam_title,
                'scaled_score', t.scaled_score,
                'max_score', t.max_score,
                'pass_mark', t.pass_mark,
                'is_passed', t.is_passed,
                'total_correct', t.total_correct,
                'total_questions', t.total_questions,
                'section_breakdown', t.section_breakdown,
                'completed_at', t.completed_at
            )
            ORDER BY t.completed_at DESC, t.id DESC
        ),
        '[]'::jsonb
    )
    INTO v_history
    FROM (
        SELECT *
        FROM public.student_test_attempts
        WHERE candidate_id = p_candidate_id
        ORDER BY completed_at DESC, id DESC
        LIMIT 50
    ) t;

    RETURN jsonb_build_object(
        'candidate', v_candidate,
        'stats', v_stats,
        'history', v_history
    );
END;
$$;

REVOKE ALL ON FUNCTION public._build_student_profile_payload(bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._build_student_profile_payload(bigint) TO service_role;

-- 4. Public Student Login RPC (Full Name + Registration Number)
CREATE OR REPLACE FUNCTION public.student_login(p_full_name text, p_registration_no text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_norm_name text;
    v_norm_reg text;
    v_candidate_id bigint;
    v_token text;
    v_hash text;
    v_expires_at timestamptz;
    v_payload jsonb;
BEGIN
    v_norm_name := lower(regexp_replace(trim(coalesce(p_full_name, '')), '\s+', ' ', 'g'));
    v_norm_reg := lower(trim(coalesce(p_registration_no, '')));

    IF v_norm_name = '' OR v_norm_reg = '' THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Full Name and Registration Number are required.');
    END IF;

    SELECT c.id
    INTO v_candidate_id
    FROM public.candidate_registrations c
    WHERE lower(regexp_replace(trim(c.full_name), '\s+', ' ', 'g')) = v_norm_name
      AND lower(trim(c.registration_no)) = v_norm_reg
    ORDER BY c.id DESC
    LIMIT 1;

    IF v_candidate_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Invalid Full Name or Registration Number.');
    END IF;

    v_token := encode(extensions.gen_random_bytes(32), 'hex');
    v_hash := encode(extensions.digest(convert_to(v_token, 'UTF8'), 'sha256'), 'hex');
    v_expires_at := now() + interval '30 days';

    INSERT INTO public.student_sessions (candidate_id, session_token_hash, expires_at)
    VALUES (v_candidate_id, v_hash, v_expires_at);

    v_payload := public._build_student_profile_payload(v_candidate_id);

    RETURN jsonb_build_object(
        'ok', true,
        'token', v_token,
        'expires_at', v_expires_at
    ) || v_payload;
END;
$$;

REVOKE ALL ON FUNCTION public.student_login(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.student_login(text, text) TO anon, authenticated, service_role;

-- 5. Session Validation & Profile Activity Fetch RPC
CREATE OR REPLACE FUNCTION public.student_get_session(p_session_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_clean_token text;
    v_hash text;
    v_candidate_id bigint;
    v_expires_at timestamptz;
    v_payload jsonb;
BEGIN
    v_clean_token := trim(coalesce(p_session_token, ''));
    IF v_clean_token = '' THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Missing session token.');
    END IF;

    v_hash := encode(extensions.digest(convert_to(v_clean_token, 'UTF8'), 'sha256'), 'hex');

    SELECT s.candidate_id, s.expires_at
    INTO v_candidate_id, v_expires_at
    FROM public.student_sessions s
    WHERE s.session_token_hash = v_hash
      AND s.revoked_at IS NULL
      AND s.expires_at > now()
    LIMIT 1;

    IF v_candidate_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Session expired or logged out.');
    END IF;

    v_payload := public._build_student_profile_payload(v_candidate_id);
    IF v_payload IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Candidate account not found.');
    END IF;

    RETURN jsonb_build_object(
        'ok', true,
        'expires_at', v_expires_at
    ) || v_payload;
END;
$$;

REVOKE ALL ON FUNCTION public.student_get_session(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.student_get_session(text) TO anon, authenticated, service_role;

-- 6. Server-Side Session Revocation RPC (Logout)
CREATE OR REPLACE FUNCTION public.student_logout(p_session_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_clean_token text;
    v_hash text;
BEGIN
    v_clean_token := trim(coalesce(p_session_token, ''));
    IF v_clean_token <> '' THEN
        v_hash := encode(extensions.digest(convert_to(v_clean_token, 'UTF8'), 'sha256'), 'hex');
        UPDATE public.student_sessions
        SET revoked_at = now()
        WHERE session_token_hash = v_hash
          AND revoked_at IS NULL;
    END IF;

    RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.student_logout(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.student_logout(text) TO anon, authenticated, service_role;

-- 7. Authenticated Test Attempt Recording RPC
CREATE OR REPLACE FUNCTION public.record_student_test_attempt(
    p_session_token text,
    p_exam_type text,
    p_exam_id text,
    p_exam_title text,
    p_scaled_score integer,
    p_max_score integer DEFAULT 250,
    p_pass_mark integer DEFAULT 200,
    p_is_passed boolean DEFAULT false,
    p_total_correct integer DEFAULT 0,
    p_total_questions integer DEFAULT 0,
    p_section_breakdown jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_clean_token text;
    v_hash text;
    v_candidate_id bigint;
    v_reg_no text;
    v_type text;
    v_score integer;
    v_payload jsonb;
BEGIN
    v_clean_token := trim(coalesce(p_session_token, ''));
    IF v_clean_token = '' THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Authentication required.');
    END IF;

    v_hash := encode(extensions.digest(convert_to(v_clean_token, 'UTF8'), 'sha256'), 'hex');

    SELECT s.candidate_id, c.registration_no
    INTO v_candidate_id, v_reg_no
    FROM public.student_sessions s
    JOIN public.candidate_registrations c ON c.id = s.candidate_id
    WHERE s.session_token_hash = v_hash
      AND s.revoked_at IS NULL
      AND s.expires_at > now()
    LIMIT 1;

    IF v_candidate_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Session expired or invalid.');
    END IF;

    v_type := CASE WHEN lower(trim(coalesce(p_exam_type, ''))) = 'model' THEN 'model' ELSE 'cbt' END;
    v_score := GREATEST(0, LEAST(250, COALESCE(p_scaled_score, 0)));

    INSERT INTO public.student_test_attempts (
        candidate_id,
        registration_no,
        exam_type,
        exam_id,
        exam_title,
        scaled_score,
        max_score,
        pass_mark,
        is_passed,
        total_correct,
        total_questions,
        section_breakdown
    ) VALUES (
        v_candidate_id,
        v_reg_no,
        v_type,
        nullif(trim(coalesce(p_exam_id, '')), ''),
        COALESCE(nullif(trim(coalesce(p_exam_title, '')), ''), 'JFT-Basic Exam'),
        v_score,
        GREATEST(1, COALESCE(p_max_score, 250)),
        GREATEST(0, COALESCE(p_pass_mark, 200)),
        COALESCE(p_is_passed, false),
        GREATEST(0, COALESCE(p_total_correct, 0)),
        GREATEST(0, COALESCE(p_total_questions, 0)),
        COALESCE(p_section_breakdown, '{}'::jsonb)
    );

    v_payload := public._build_student_profile_payload(v_candidate_id);
    RETURN jsonb_build_object('ok', true) || v_payload;
END;
$$;

REVOKE ALL ON FUNCTION public.record_student_test_attempt(text, text, text, text, integer, integer, integer, boolean, integer, integer, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_student_test_attempt(text, text, text, text, integer, integer, integer, boolean, integer, integer, jsonb) TO anon, authenticated, service_role;
