-- =============================================================================
-- Migration: Create feedback_reports (Snitch Discrepancy & Bug Ticket Hub)
-- Project: Safe75 Attendance (KIET Attendance Dashboard)
-- Target Database: Supabase PostgreSQL
-- =============================================================================

-- Ensure pgcrypto extension is available for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Create the table in public schema
CREATE TABLE IF NOT EXISTS public.feedback_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_type TEXT NOT NULL, 
    -- 'proxy_login': Proxy / Login Failure (OTP, 401, timeout)
    -- 'timetable_desync': Timetable Desync (Classes on wrong day/time)
    -- 'attendance_mismatch': Calculation Discrepancy (Safe bunks / 75% formula)
    -- 'component_missing': Missing Subject Component (Lab, Tut, Theory)
    -- 'app_malfunction': App Malfunction or UI Crash
    -- 'feature_request': Feature Request or Suggestion
    -- 'other': General Inquiry
    
    title TEXT,
    message TEXT NOT NULL,
    user_email TEXT,
    
    status TEXT NOT NULL DEFAULT 'open', 
    -- 'open', 'investigating', 'resolved', 'closed'
    
    priority TEXT NOT NULL DEFAULT 'medium', 
    -- 'low', 'medium', 'high', 'critical'
    
    admin_notes TEXT,
    diagnostics JSONB, 
    -- Anonymized attendance snapshot, branch, semester, course codes, app version, device OS
    
    device_info JSONB, 
    -- User agent, screen resolution, standalone/PWA flag
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Indexes for fast filtering in Admin Panel
CREATE INDEX IF NOT EXISTS idx_feedback_status ON public.feedback_reports(status);
CREATE INDEX IF NOT EXISTS idx_feedback_issue_type ON public.feedback_reports(issue_type);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback_reports(created_at DESC);

-- 3. Auto-update timestamp function and trigger
CREATE OR REPLACE FUNCTION public.feedback_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'feedback_reports'
    ) THEN
        DROP TRIGGER IF EXISTS trg_feedback_reports_updated_at ON public.feedback_reports;
        CREATE TRIGGER trg_feedback_reports_updated_at
        BEFORE UPDATE ON public.feedback_reports
        FOR EACH ROW
        EXECUTE FUNCTION public.feedback_update_timestamp();
    END IF;
END $$;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.feedback_reports ENABLE ROW LEVEL SECURITY;

-- 5. Row Level Security Policies
DO $$
BEGIN
    -- Policy 1: Allow any user (anonymous or student) to submit reports
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'feedback_reports' 
        AND policyname = 'Allow anonymous report submission'
    ) THEN
        CREATE POLICY "Allow anonymous report submission"
        ON public.feedback_reports FOR INSERT
        TO anon, authenticated
        WITH CHECK (true);
    END IF;

    -- Policy 2: Allow authenticated admins to view reports
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'feedback_reports' 
        AND policyname = 'Allow admin read feedback reports'
    ) THEN
        CREATE POLICY "Allow admin read feedback reports"
        ON public.feedback_reports FOR SELECT
        TO authenticated
        USING (true);
    END IF;

    -- Policy 3: Allow authenticated admins to update reports (status & notes)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'feedback_reports' 
        AND policyname = 'Allow admin update feedback reports'
    ) THEN
        CREATE POLICY "Allow admin update feedback reports"
        ON public.feedback_reports FOR UPDATE
        TO authenticated
        USING (true);
    END IF;

    -- Policy 4: Allow authenticated admins to delete reports
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'feedback_reports' 
        AND policyname = 'Allow admin delete feedback reports'
    ) THEN
        CREATE POLICY "Allow admin delete feedback reports"
        ON public.feedback_reports FOR DELETE
        TO authenticated
        USING (true);
    END IF;
END $$;
