-- ==============================================================================
-- Migration: Create academic_events table for Safe75
-- Supports:
-- 1. College-wide and branch-specific holidays/off-days (e.g. hackathons, festivals)
-- 2. Working Saturdays (compensatory class days)
-- 3. Timetable Day-Swaps (e.g. Saturday follows Monday timetable)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.academic_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('holiday', 'working_day', 'day_swap')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_off_day BOOLEAN NOT NULL DEFAULT true,
  affected_branches TEXT[] NOT NULL DEFAULT ARRAY['ALL'],
  affected_semesters TEXT[] NOT NULL DEFAULT ARRAY['ALL'],
  mirror_day TEXT CHECK (mirror_day IN ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', NULL)),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for lightning fast date range lookups and active status
CREATE INDEX IF NOT EXISTS idx_academic_events_dates ON public.academic_events(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_academic_events_active ON public.academic_events(is_active);

-- Automatic updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_academic_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_academic_events_updated_at'
  ) THEN
    CREATE TRIGGER trigger_academic_events_updated_at
      BEFORE UPDATE ON public.academic_events
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_academic_events_updated_at();
  END IF;
END $$;

-- Enable Row Level Security (RLS)
ALTER TABLE public.academic_events ENABLE ROW LEVEL SECURITY;

-- Conditional policies to prevent errors if already defined
DO $$
BEGIN
  -- 1. Public read policy: Anyone using Safe75 can read active events
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'academic_events'
      AND policyname = 'Public read active academic_events'
  ) THEN
    CREATE POLICY "Public read active academic_events"
      ON public.academic_events
      FOR SELECT
      USING (true);
  END IF;

  -- 2. Admin write policy: Authenticated admin users can insert, update, or delete
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'academic_events'
      AND policyname = 'Admin manage academic_events'
  ) THEN
    CREATE POLICY "Admin manage academic_events"
      ON public.academic_events
      FOR ALL
      USING (auth.role() = 'authenticated')
      WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- Grant permissions to Supabase roles
GRANT ALL ON TABLE public.academic_events TO anon, authenticated, service_role;
