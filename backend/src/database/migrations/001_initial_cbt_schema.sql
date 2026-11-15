-- =============================================================================
-- High-Precision Dual-Mode CBT & Exam Creation Portal
-- Database Migration 001: Initial Schema Definition (PostgreSQL 14+)
-- =============================================================================

-- Enable pgcrypto / uuid-ossp for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. Administrative Security & Authentication Tier
-- =============================================================================

CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, -- Argon2id hashed
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'SUPER_ADMIN' CHECK (role IN ('SUPER_ADMIN', 'EXAM_MANAGER', 'AUDITOR')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    failed_login_attempts INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ NULL,
    totp_secret TEXT NULL,
    totp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    last_login_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);

-- Cryptographically bound Refresh Tokens (Rotated on each renewal)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    token_hash TEXT UNIQUE NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_admin ON refresh_tokens(admin_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);

-- Admin Audit Logs (Strict accountability for exam publishing & credential modifications)
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
    action VARCHAR(64) NOT NULL,
    resource_type VARCHAR(64) NOT NULL,
    resource_id VARCHAR(128) NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    metadata JSONB NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON admin_audit_logs(created_at);

-- =============================================================================
-- 2. Dual-Mode Examination Master Schemas
-- =============================================================================

CREATE TABLE IF NOT EXISTS exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_code VARCHAR(64) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    mode VARCHAR(32) NOT NULL CHECK (mode IN ('JSON_TEMPLATE', 'RAW_PDF_MEDIA')),
    total_time_minutes INT NOT NULL CHECK (total_time_minutes > 0),
    passing_score_percentage NUMERIC(5,2) NOT NULL DEFAULT 60.00,
    shuffle_questions BOOLEAN NOT NULL DEFAULT FALSE,
    shuffle_options BOOLEAN NOT NULL DEFAULT FALSE,
    raw_pdf_path TEXT NULL,
    raw_pdf_filename VARCHAR(255) NULL,
    raw_pdf_total_pages INT NULL,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID REFERENCES admins(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exams_code ON exams(exam_code);
CREATE INDEX IF NOT EXISTS idx_exams_mode ON exams(mode);
CREATE INDEX IF NOT EXISTS idx_exams_is_published ON exams(is_published);

-- Exam Sections (Sectional Architecture with independent passing criteria)
CREATE TABLE IF NOT EXISTS exam_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    sequence_order INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
    total_marks NUMERIC(6,2) NOT NULL DEFAULT 0.00,
    passing_threshold_marks NUMERIC(6,2) NOT NULL DEFAULT 0.00,
    shuffle_items BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(exam_id, sequence_order)
);

CREATE INDEX IF NOT EXISTS idx_exam_sections_exam_id ON exam_sections(exam_id);

-- Exam Items (Supports both text-based questions and raw PDF cropped items)
CREATE TABLE IF NOT EXISTS exam_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES exam_sections(id) ON DELETE CASCADE,
    item_index INT NOT NULL,
    stem TEXT NOT NULL,
    passage_context TEXT NULL,
    pdf_page_reference INT NULL,
    pdf_bounding_box JSONB NULL, -- Coordinates: { "x": float, "y": float, "w": float, "h": float }
    media_audio_url TEXT NULL,
    media_audio_single_play BOOLEAN NOT NULL DEFAULT FALSE,
    media_illustration_url TEXT NULL,
    fixed_marks NUMERIC(5,2) NOT NULL DEFAULT 1.00 CHECK (fixed_marks >= 0.0),
    negative_marks NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (negative_marks >= 0.0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(section_id, item_index)
);

CREATE INDEX IF NOT EXISTS idx_exam_items_section_id ON exam_items(section_id);

-- Item Multiple-Choice Options
CREATE TABLE IF NOT EXISTS item_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES exam_items(id) ON DELETE CASCADE,
    sequence_order INT NOT NULL,
    identifier VARCHAR(8) NOT NULL, -- e.g., 'A', 'B', 'C', 'D'
    content_text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(item_id, sequence_order),
    UNIQUE(item_id, identifier)
);

CREATE INDEX IF NOT EXISTS idx_item_options_item_id ON item_options(item_id);

-- =============================================================================
-- 3. Candidate Delivery & Exam Session Tier (Decoupled Candidate Environment)
-- =============================================================================

CREATE TABLE IF NOT EXISTS candidate_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE RESTRICT,
    candidate_identifier VARCHAR(100) NOT NULL, -- National ID, Roll Number, or Registration Key
    candidate_name VARCHAR(150) NOT NULL,
    session_token_hash TEXT UNIQUE NOT NULL,
    current_section_index INT NOT NULL DEFAULT 1,
    status VARCHAR(32) NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'SECTION_LOCKED', 'COMPLETED', 'ABORTED', 'TIMED_OUT')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ NULL,
    last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    client_ip VARCHAR(45) NULL,
    user_agent TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_candidate_sessions_token ON candidate_sessions(session_token_hash);
CREATE INDEX IF NOT EXISTS idx_candidate_sessions_exam ON candidate_sessions(exam_id);

-- Candidate Section Progression State
CREATE TABLE IF NOT EXISTS candidate_section_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES candidate_sessions(id) ON DELETE CASCADE,
    section_id UUID NOT NULL REFERENCES exam_sections(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at TIMESTAMPTZ NULL,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    time_spent_seconds INT NOT NULL DEFAULT 0,
    UNIQUE(session_id, section_id)
);

-- Granular Item-level Candidate Responses
CREATE TABLE IF NOT EXISTS candidate_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES candidate_sessions(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES exam_items(id) ON DELETE CASCADE,
    selected_option_id UUID REFERENCES item_options(id) ON DELETE SET NULL,
    is_flagged_for_review BOOLEAN NOT NULL DEFAULT FALSE,
    time_spent_seconds INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(session_id, item_id)
);

-- Finalized Exam Graded Result Archive
CREATE TABLE IF NOT EXISTS candidate_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID UNIQUE NOT NULL REFERENCES candidate_sessions(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE RESTRICT,
    candidate_identifier VARCHAR(100) NOT NULL,
    candidate_name VARCHAR(150) NOT NULL,
    total_raw_score NUMERIC(7,2) NOT NULL,
    total_max_score NUMERIC(7,2) NOT NULL,
    percentage_score NUMERIC(5,2) NOT NULL,
    is_passed BOOLEAN NOT NULL,
    section_breakdown JSONB NOT NULL,
    verification_hash VARCHAR(64) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_candidate_results_exam ON candidate_results(exam_id);
CREATE INDEX IF NOT EXISTS idx_candidate_results_verify ON candidate_results(verification_hash);
