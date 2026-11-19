-- 20261120000000_create_ats_tables.sql
-- Migration: ATS Candidate Mappings & Synchronization Logs for Greenhouse & Lever

-- 1. Table: ats_candidate_mappings
-- Maps an internal candidate to an external candidate and optional application/opportunity in an ATS provider.
CREATE TABLE IF NOT EXISTS public.ats_candidate_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('greenhouse', 'lever')),
    external_candidate_id TEXT NOT NULL,
    external_application_id TEXT, -- Opportunity ID in Lever, Application ID in Greenhouse
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_candidate_provider UNIQUE (candidate_id, provider)
);

-- Index for lookup by external candidate / application ID
CREATE INDEX IF NOT EXISTS idx_ats_candidate_mappings_lookup 
ON public.ats_candidate_mappings (provider, external_candidate_id);

CREATE INDEX IF NOT EXISTS idx_ats_candidate_mappings_candidate_id 
ON public.ats_candidate_mappings (candidate_id);

-- 2. Table: ats_sync_logs
-- Tracks each synchronization attempt of a finalized interview report to an ATS.
CREATE TABLE IF NOT EXISTS public.ats_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('greenhouse', 'lever')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed')),
    attempt_count INTEGER DEFAULT 1,
    external_record_reference TEXT, -- e.g., created note ID or activity ID
    http_status INTEGER,
    sanitized_error_message TEXT,
    last_attempted_at TIMESTAMPTZ DEFAULT now(),
    successful_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_interview_provider UNIQUE (interview_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_ats_sync_logs_interview_id 
ON public.ats_sync_logs (interview_id);

CREATE INDEX IF NOT EXISTS idx_ats_sync_logs_status 
ON public.ats_sync_logs (status);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.ats_candidate_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ats_sync_logs ENABLE ROW LEVEL SECURITY;

-- 4. Admin RLS Policies
-- Only authenticated users with admin role can view or manage ATS data.
CREATE POLICY "Admins can view and manage ats_candidate_mappings"
ON public.ats_candidate_mappings
FOR ALL
TO authenticated
USING (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
)
WITH CHECK (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
);

CREATE POLICY "Admins can view and manage ats_sync_logs"
ON public.ats_sync_logs
FOR ALL
TO authenticated
USING (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
)
WITH CHECK (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
);
