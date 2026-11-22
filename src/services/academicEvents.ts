import { supabase } from '../lib/supabase';
import { getStudentExamSchedule, normalizeBranch, normalizeSemester } from '../data/mse2Datesheet';
import type { ScheduleEntry, StudentDetails } from '../types/kiet';
import {
  formatIsoDate,
  projectMirroredDayClasses,
  getUpcomingClasses,
  getWeeklyClasses,
  type DaySwapConfig,
  type ScheduleFilterOptions,
} from '../utils/date';

export type AcademicEventType = 'holiday' | 'working_day' | 'day_swap';
export type MirrorDay = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY';

export interface AcademicEvent {
  id: string;
  title: string;
  event_type: AcademicEventType;
  start_date: string; // "YYYY-MM-DD"
  end_date: string;   // "YYYY-MM-DD"
  is_off_day: boolean;
  affected_branches: string[]; // e.g. ['ALL'] or ['CSEAIML', 'IT']
  affected_semesters: string[]; // e.g. ['ALL'] or ['1', '3', '5', '7']
  mirror_day?: MirrorDay | null;
  notes?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

const CACHE_KEY = 'safe75_academic_events_cache';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Checks whether an academic event applies to a specific student based on branch & semester.
 */
export function isEventApplicableToStudent(
  event: AcademicEvent,
  studentBranchRaw?: string | null,
  studentSemesterRaw?: string | number | null
): boolean {
  if (!event.is_active) return false;

  // 1. Branch matching
  const branches = event.affected_branches || ['ALL'];
  let branchMatches = branches.includes('ALL');
  if (!branchMatches && studentBranchRaw) {
    const studentNormBranch = normalizeBranch(studentBranchRaw);
    branchMatches = branches.some((b) => {
      if (b === 'ALL') return true;
      const eventNormBranch = normalizeBranch(b);
      return (
        eventNormBranch === studentNormBranch ||
        studentNormBranch.includes(eventNormBranch) ||
        eventNormBranch.includes(studentNormBranch)
      );
    });
  }

  // 2. Semester matching
  const semesters = event.affected_semesters || ['ALL'];
  let semesterMatches = semesters.includes('ALL');
  if (!semesterMatches && studentSemesterRaw !== undefined && studentSemesterRaw !== null) {
    const studentNormSem = String(normalizeSemester(String(studentSemesterRaw)));
    semesterMatches = semesters.some((s) => {
      if (s === 'ALL') return true;
      return String(normalizeSemester(s)) === studentNormSem;
    });
  }

  return branchMatches && semesterMatches;
}

/**
 * Non-blocking, cached fetch for all active academic events.
 * Safe for client consumption with offline localStorage fallback.
 */
export async function fetchActiveAcademicEvents(): Promise<AcademicEvent[]> {
  // Check cached events first
  try {
    const cachedRaw = localStorage.getItem(CACHE_KEY);
    if (cachedRaw) {
      const cached = JSON.parse(cachedRaw) as { timestamp: number; events: AcademicEvent[] };
      // If cache is fresh (< 30 min), return immediately while revalidating in background
      if (cached && Array.isArray(cached.events)) {
        const isFresh = Date.now() - (cached.timestamp || 0) < CACHE_TTL_MS;
        if (isFresh && cached.events.length >= 0) {
          // Trigger silent background update
          void refreshCacheSilently();
          return cached.events;
        }
      }
    }
  } catch (cacheErr) {
    console.warn('Could not read academic events cache:', cacheErr);
  }

  // Fetch live from Supabase
  try {
    const { data, error } = await supabase
      .from('academic_events')
      .select('*')
      .eq('is_active', true)
      .order('start_date', { ascending: true });

    if (error) {
      console.warn('Supabase academic_events query returned error:', error.message);
      return getCachedEventsFallback();
    }

    const events = (data || []) as AcademicEvent[];
    // Cache for offline resilience
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ timestamp: Date.now(), events })
      );
    } catch {
      // Ignore quota storage errors
    }

    return events;
  } catch (networkErr) {
    console.warn('Network error fetching academic_events, falling back to cache:', networkErr);
    return getCachedEventsFallback();
  }
}

async function refreshCacheSilently(): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('academic_events')
      .select('*')
      .eq('is_active', true)
      .order('start_date', { ascending: true });

    if (!error && data) {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ timestamp: Date.now(), events: data })
      );
    }
  } catch {
    // Non-fatal background fetch
  }
}

function getCachedEventsFallback(): AcademicEvent[] {
  try {
    const cachedRaw = localStorage.getItem(CACHE_KEY);
    if (cachedRaw) {
      const cached = JSON.parse(cachedRaw) as { events: AcademicEvent[] };
      if (Array.isArray(cached?.events)) {
        return cached.events;
      }
    }
  } catch {
    // Return empty fallback
  }
  return [];
}

// ============================================================================
// Admin Management API
// ============================================================================

export async function fetchAllAcademicEventsAdmin(): Promise<AcademicEvent[]> {
  const { data, error } = await supabase
    .from('academic_events')
    .select('*')
    .order('start_date', { ascending: false });

  if (error) throw error;
  return (data || []) as AcademicEvent[];
}

export async function createAcademicEvent(
  payload: Omit<AcademicEvent, 'id' | 'created_at' | 'updated_at'>
): Promise<AcademicEvent> {
  const { data, error } = await supabase
    .from('academic_events')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  // Invalidate local cache
  localStorage.removeItem(CACHE_KEY);
  return data as AcademicEvent;
}

export async function updateAcademicEvent(
  id: string,
  updates: Partial<AcademicEvent>
): Promise<void> {
  const { error } = await supabase
    .from('academic_events')
    .update(updates)
    .eq('id', id);

  if (error) throw error;
  localStorage.removeItem(CACHE_KEY);
}

export async function deleteAcademicEvent(id: string): Promise<void> {
  const { error } = await supabase
    .from('academic_events')
    .delete()
    .eq('id', id);

  if (error) throw error;
  localStorage.removeItem(CACHE_KEY);
}

// ============================================================================
// Schedule Resolution & Dynamic Timetable Projection
// ============================================================================

export interface StudentScheduleContextResult {
  examInfo: ReturnType<typeof getStudentExamSchedule>;
  applicableEvents: AcademicEvent[];
  customExcludedDates: Set<string>;
  allowedSaturdayDates: Set<string>;
  daySwaps: DaySwapConfig[];
  upcomingClasses: ScheduleEntry[];
  fullWeekClasses: ScheduleEntry[];
  allFutureClasses: ScheduleEntry[];
}

export function computeStudentScheduleContext(
  attendanceData: StudentDetails | null,
  rawCurrentWeek: ScheduleEntry[],
  rawFutureWeeks: ScheduleEntry[],
  academicEvents: AcademicEvent[],
  saturdaySimulator?: { enabled: boolean; mirrorDay: MirrorDay; saturdayDateIso: string } | null
): StudentScheduleContextResult {
  const examInfo = getStudentExamSchedule(attendanceData);
  const applicableEvents = academicEvents.filter((ev) =>
    isEventApplicableToStudent(ev, attendanceData?.branchShortName, attendanceData?.semesterName)
  );

  const customExcludedDates = new Set<string>(examInfo.allExcludedDates);
  const allowedSaturdayDates = new Set<string>();
  const daySwaps: DaySwapConfig[] = [];

  for (const ev of applicableEvents) {
    if (ev.is_off_day) {
      // Exclude all dates from start_date to end_date (inclusive)
      const cur = new Date(ev.start_date + 'T00:00:00');
      const end = new Date(ev.end_date + 'T00:00:00');
      while (cur <= end) {
        customExcludedDates.add(formatIsoDate(cur));
        cur.setDate(cur.getDate() + 1);
      }
    } else if (ev.event_type === 'working_day' || ev.event_type === 'day_swap') {
      const cur = new Date(ev.start_date + 'T00:00:00');
      const end = new Date(ev.end_date + 'T00:00:00');
      while (cur <= end) {
        const dateIso = formatIsoDate(cur);
        if (cur.getDay() === 6) {
          allowedSaturdayDates.add(dateIso);
        }
        if (ev.mirror_day) {
          daySwaps.push({ date: dateIso, mirrorDay: ev.mirror_day });
        }
        cur.setDate(cur.getDate() + 1);
      }
    }
  }

  // Student's local Working Saturday simulator toggle
  if (saturdaySimulator && saturdaySimulator.enabled) {
    allowedSaturdayDates.add(saturdaySimulator.saturdayDateIso);
    daySwaps.push({
      date: saturdaySimulator.saturdayDateIso,
      mirrorDay: saturdaySimulator.mirrorDay,
    });
  }

  // Current week projection
  const mirroredCurrentWeek = projectMirroredDayClasses(rawCurrentWeek, daySwaps);
  const enrichedCurrentWeekRaw = [...rawCurrentWeek, ...mirroredCurrentWeek];

  const filterOptions: ScheduleFilterOptions = {
    customExcludedDates,
    allowedSaturdayDates,
  };

  const upcomingClasses = getUpcomingClasses(enrichedCurrentWeekRaw, filterOptions);
  const fullWeekClasses = getWeeklyClasses(enrichedCurrentWeekRaw, filterOptions);

  // Future weeks projection
  const sourceFuture = rawFutureWeeks.length > 0 ? rawFutureWeeks : enrichedCurrentWeekRaw;
  const mirroredFuture = projectMirroredDayClasses(sourceFuture, daySwaps);
  const enrichedFutureRaw = [...sourceFuture, ...mirroredFuture];
  const allFutureClasses = getUpcomingClasses(enrichedFutureRaw, filterOptions);

  return {
    examInfo,
    applicableEvents,
    customExcludedDates,
    allowedSaturdayDates,
    daySwaps,
    upcomingClasses,
    fullWeekClasses,
    allFutureClasses,
  };
}
