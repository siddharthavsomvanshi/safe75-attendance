-- ==============================================================================
-- Migration: Create system_incidents table for Safe75
-- Tracks CyberVidya upstream outages, 403 blocks, timeouts, and proxy health
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.system_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upstream TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  status_code INT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for chronological queries
CREATE INDEX IF NOT EXISTS idx_system_incidents_created_at ON public.system_incidents(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.system_incidents ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- 1. Insert policy: Proxy can log incidents
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'system_incidents'
      AND policyname = 'Allow insert system_incidents'
  ) THEN
    CREATE POLICY "Allow insert system_incidents"
      ON public.system_incidents
      FOR INSERT
      WITH CHECK (true);
  END IF;

  -- 2. Read policy: Authenticated admin users can view incident logs
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'system_incidents'
      AND policyname = 'Admin read system_incidents'
  ) THEN
    CREATE POLICY "Admin read system_incidents"
      ON public.system_incidents
      FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- Grant permissions to Supabase roles
GRANT ALL ON TABLE public.system_incidents TO anon, authenticated, service_role;
