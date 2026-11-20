-- 20261120000001_add_demo_ats.sql
-- Migration: Add Demo ATS Provider and demo_ats_records Table

-- 1. Update check constraints on existing tables to allow 'demo' as a provider
ALTER TABLE public.ats_candidate_mappings 
DROP CONSTRAINT IF EXISTS ats_candidate_mappings_provider_check;

ALTER TABLE public.ats_candidate_mappings 
ADD CONSTRAINT ats_candidate_mappings_provider_check 
CHECK (provider IN ('greenhouse', 'lever', 'demo'));

ALTER TABLE public.ats_sync_logs 
DROP CONSTRAINT IF EXISTS ats_sync_logs_provider_check;

ALTER TABLE public.ats_sync_logs 
ADD CONSTRAINT ats_sync_logs_provider_check 
CHECK (provider IN ('greenhouse', 'lever', 'demo'));

-- 2. Create demo_ats_records table
CREATE TABLE IF NOT EXISTS public.demo_ats_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
    candidate_name TEXT NOT NULL,
    candidate_email TEXT,
    overall_score NUMERIC(5,2) NOT NULL,
    skill_scores JSONB DEFAULT '[]'::jsonb, -- Array of { skill, score, maxScore, feedback }
    strengths JSONB DEFAULT '[]'::jsonb,
    weaknesses JSONB DEFAULT '[]'::jsonb,
    ai_recommendation TEXT NOT NULL CHECK (ai_recommendation IN ('Hire', 'Hold', 'Reject')),
    final_human_decision TEXT NOT NULL CHECK (final_human_decision IN ('Hire', 'Hold', 'Reject')),
    evaluation_feedback TEXT,
    received_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_demo_ats_interview UNIQUE (interview_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_demo_ats_records_candidate_id 
ON public.demo_ats_records (candidate_id);

CREATE INDEX IF NOT EXISTS idx_demo_ats_records_interview_id 
ON public.demo_ats_records (interview_id);

CREATE INDEX IF NOT EXISTS idx_demo_ats_records_received_at 
ON public.demo_ats_records (received_at DESC);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.demo_ats_records ENABLE ROW LEVEL SECURITY;

-- 4. Admin-Only RLS Policies
CREATE POLICY "Admins can view and manage demo_ats_records"
ON public.demo_ats_records
FOR ALL
TO authenticated
USING (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
)
WITH CHECK (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
);
