-- =============================================================================
-- Supabase Migration 002: Candidate Registrations & Photo Storage
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.candidate_registrations (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name text NOT NULL,
    registration_no text NOT NULL,
    date_of_birth date NOT NULL,
    test_location text NOT NULL DEFAULT 'Bangladesh',
    nationality text NOT NULL DEFAULT 'Bangladesh',
    sex text NOT NULL DEFAULT 'Female',
    photo_url text,
    created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'candidate_registrations_sex_check'
          AND conrelid = 'public.candidate_registrations'::regclass
    ) THEN
        ALTER TABLE public.candidate_registrations
        ADD CONSTRAINT candidate_registrations_sex_check CHECK (sex IN ('Female', 'Male'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_candidate_registrations_reg_no
    ON public.candidate_registrations (registration_no);
CREATE INDEX IF NOT EXISTS idx_candidate_registrations_created_at
    ON public.candidate_registrations (created_at DESC);

ALTER TABLE public.candidate_registrations ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT INSERT ON TABLE public.candidate_registrations TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.candidate_registrations_id_seq TO anon, authenticated;
GRANT ALL ON TABLE public.candidate_registrations TO service_role;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'candidate_registrations'
          AND policyname = 'Allow candidate registration inserts'
    ) THEN
        CREATE POLICY "Allow candidate registration inserts"
            ON public.candidate_registrations
            FOR INSERT
            TO anon, authenticated
            WITH CHECK (
                char_length(trim(full_name)) > 0
                AND char_length(trim(registration_no)) > 0
                AND sex IN ('Female', 'Male')
            );
    END IF;
END $$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'candidate-photos',
    'candidate-photos',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND policyname = 'Allow candidate photo uploads'
    ) THEN
        CREATE POLICY "Allow candidate photo uploads"
            ON storage.objects
            FOR INSERT
            TO anon, authenticated
            WITH CHECK (bucket_id = 'candidate-photos');
    END IF;
END $$;
