-- =============================================================================
-- Migration: Add student branch and roll number to daily_attendance_snapshots
-- Project: Safe75 Attendance
-- Target Database: Supabase PostgreSQL
-- =============================================================================

-- 1. Add roll_number column (Student University Roll Number / Registration Number)
ALTER TABLE daily_attendance_snapshots
ADD COLUMN IF NOT EXISTS roll_number TEXT;

-- 2. Add branch column (Student Academic Department / Branch e.g. CSE, IT, CS, AIML)
ALTER TABLE daily_attendance_snapshots
ADD COLUMN IF NOT EXISTS branch TEXT;

-- 3. Document columns
COMMENT ON COLUMN daily_attendance_snapshots.roll_number IS 'Student University Roll Number / Registration Number';
COMMENT ON COLUMN daily_attendance_snapshots.branch IS 'Student Academic Department / Branch (e.g. CSE, IT, CS, AIML)';

-- 4. Create indexes for quick lookup/reporting by roll number or branch
CREATE INDEX IF NOT EXISTS idx_snapshots_roll_number ON daily_attendance_snapshots(roll_number);
CREATE INDEX IF NOT EXISTS idx_snapshots_branch ON daily_attendance_snapshots(branch);
