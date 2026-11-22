import type { ScheduleEntry } from "../types/kiet";
import { GLOBAL_HOLIDAYS } from "../data/mse2Datesheet";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

const TIME_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  hour: "numeric",
  minute: "2-digit",
});

export function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getWeekRange(baseDate: Date, weekOffset = 0) {
  const date = new Date(baseDate);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + weekOffset * 7);

  const dayIndex = date.getDay();
  const start = new Date(date);
  start.setDate(date.getDate() - dayIndex);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return {
    weekStartDate: formatIsoDate(start),
    weekEndDate: formatIsoDate(end),
  };
}

export function getCurrentWeekSaturdayIso(baseDate = new Date()): string {
  const d = new Date(baseDate);
  const day = d.getDay();
  const diff = (6 - day + 7) % 7;
  d.setDate(d.getDate() + diff);
  return formatIsoDate(d);
}

export function normalizeIsoDateString(dateInput: string | Date | null | undefined): string | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return null;
    return formatIsoDate(dateInput);
  }

  const str = String(dateInput).trim();
  // 1. ISO format: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = isoMatch[2].padStart(2, "0");
    const day = isoMatch[3].padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // 2. Indian format: DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, "0");
    const month = dmyMatch[2].padStart(2, "0");
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return formatIsoDate(parsed);
  }

  return null;
}

export function parseKietDateTime(value: string): Date {
  if (!value || typeof value !== "string") {
    return new Date();
  }

  // ISO date format: YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS
  const isoMatch = value.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    const hours = isoMatch[4] ? Number(isoMatch[4]) : 0;
    const minutes = isoMatch[5] ? Number(isoMatch[5]) : 0;
    const seconds = isoMatch[6] ? Number(isoMatch[6]) : 0;
    return new Date(year, month - 1, day, hours, minutes, seconds);
  }

  // Indian date format: DD/MM/YYYY or DD-MM-YYYY HH:MM:SS
  const dmyMatch = value.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const month = Number(dmyMatch[2]);
    const year = Number(dmyMatch[3]);
    const hours = dmyMatch[4] ? Number(dmyMatch[4]) : 0;
    const minutes = dmyMatch[5] ? Number(dmyMatch[5]) : 0;
    const seconds = dmyMatch[6] ? Number(dmyMatch[6]) : 0;
    return new Date(year, month - 1, day, hours, minutes, seconds);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export interface ScheduleFilterOptions {
  customExcludedDates?: Set<string>;
  allowedSaturdayDates?: Set<string>;
}

function parseFilterOptions(arg?: Set<string> | ScheduleFilterOptions): ScheduleFilterOptions {
  if (!arg) return {};
  if (arg instanceof Set) {
    return { customExcludedDates: arg };
  }
  return arg;
}

export const DAY_NAME_TO_INDEX: Record<string, number> = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

export interface DaySwapConfig {
  date: string; // Target date "YYYY-MM-DD" (e.g. Saturday 2026-11-28)
  mirrorDay: string; // "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY"
}

/**
 * Projects a target weekday's classes onto another day (e.g. Saturday follows Monday's timetable).
 * Clones the schedule entries with updated timestamps and synthetic unique IDs.
 */
export function projectMirroredDayClasses(
  entries: ScheduleEntry[],
  daySwaps: DaySwapConfig[]
): ScheduleEntry[] {
  if (!daySwaps || daySwaps.length === 0) return [];

  const syntheticEntries: ScheduleEntry[] = [];

  for (const swap of daySwaps) {
    const targetDateIso = swap.date;
    const targetDayIndex = DAY_NAME_TO_INDEX[swap.mirrorDay.toUpperCase()];
    if (targetDayIndex === undefined) continue;

    const [tYear, tMonth, tDay] = targetDateIso.split("-").map(Number);
    if (!tYear || !tMonth || !tDay) continue;

    // Find entries that match the mirror day
    // First, look within the same week
    const targetDateObj = new Date(tYear, tMonth - 1, tDay);
    const { weekStartDate, weekEndDate } = getWeekRange(targetDateObj, 0);

    let templateClasses = entries.filter((e) => {
      if (e.type !== "CLASS") return false;
      const eDate = formatIsoDate(parseKietDateTime(e.start));
      const eDay = parseKietDateTime(e.start).getDay();
      return eDay === targetDayIndex && eDate >= weekStartDate && eDate <= weekEndDate;
    });

    // If no classes found in the same week (e.g. future week or partial timetable),
    // find any template classes with that day of week from available entries
    if (templateClasses.length === 0) {
      templateClasses = entries.filter((e) => {
        if (e.type !== "CLASS") return false;
        return parseKietDateTime(e.start).getDay() === targetDayIndex;
      });
      // Deduplicate by courseCode and time slot so we only clone 1 day's worth
      const seenSlots = new Set<string>();
      templateClasses = templateClasses.filter((e) => {
        const sTime = parseKietDateTime(e.start);
        const slotKey = `${e.courseCode}-${sTime.getHours()}:${sTime.getMinutes()}`;
        if (seenSlots.has(slotKey)) return false;
        seenSlots.add(slotKey);
        return true;
      });
    }

    for (let i = 0; i < templateClasses.length; i++) {
      const orig = templateClasses[i];
      const origStart = parseKietDateTime(orig.start);
      const origEnd = parseKietDateTime(orig.end);

      const startIso = `${targetDateIso} ${String(origStart.getHours()).padStart(2, "0")}:${String(origStart.getMinutes()).padStart(2, "0")}:${String(origStart.getSeconds()).padStart(2, "0")}`;
      const endIso = `${targetDateIso} ${String(origEnd.getHours()).padStart(2, "0")}:${String(origEnd.getMinutes()).padStart(2, "0")}:${String(origEnd.getSeconds()).padStart(2, "0")}`;

      syntheticEntries.push({
        ...orig,
        id: `synth-${targetDateIso}-${orig.courseCode || "cls"}-${i}`,
        start: startIso,
        end: endIso,
        dateTime: startIso,
        type: "CLASS",
      });
    }
  }

  return syntheticEntries;
}

export function getUpcomingClasses(
  entries: ScheduleEntry[],
  filterInput?: Set<string> | ScheduleFilterOptions,
): ScheduleEntry[] {
  const now = Date.now();
  const seen = new Set<string>();
  const { customExcludedDates, allowedSaturdayDates } = parseFilterOptions(filterInput);

  // 1. Identify any dates that have exams planned in CyberVidya raw schedule entries.
  const examDates = new Set<string>();
  for (const entry of entries) {
    const isExam = [entry.title, entry.courseName, entry.type].some(
      val => val && String(val).toLowerCase().includes("exam")
    );
    if (isExam) {
      examDates.add(formatIsoDate(parseKietDateTime(entry.start)));
    }
  }

  return entries
    .filter((entry) => {
      const eventDate = formatIsoDate(parseKietDateTime(entry.start));

      // Global off-days / holidays (e.g. 2026-11-06)
      if (GLOBAL_HOLIDAYS[eventDate]) {
        return false;
      }

      // Branch/semester specific exam dates or other exclusions
      if (customExcludedDates && customExcludedDates.has(eventDate)) {
        return false;
      }

      // Exclude ANY event occurring on an exam date found in entries
      if (examDates.has(eventDate)) {
        return false;
      }
      
      // Exclude non-class entries
      if (entry.type !== "CLASS") return false;
      
      // Weekend filter: Sunday is always excluded. Saturday is excluded UNLESS explicitly allowed as a working Saturday.
      const startDate = parseKietDateTime(entry.start);
      const dayOfWeek = startDate.getDay();
      if (dayOfWeek === 0) return false;
      if (dayOfWeek === 6) {
        if (!allowedSaturdayDates || !allowedSaturdayDates.has(eventDate)) {
          return false;
        }
      }

      return true;
    })
    .filter((entry) => parseKietDateTime(entry.end).getTime() >= now)
    .filter((entry) => {
      const key = `${entry.courseCode ?? "na"}-${entry.start}-${entry.end}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .sort(
      (left, right) =>
        parseKietDateTime(left.start).getTime() - parseKietDateTime(right.start).getTime(),
    );
}

export function getWeeklyClasses(
  entries: ScheduleEntry[],
  filterInput?: Set<string> | ScheduleFilterOptions,
): ScheduleEntry[] {
  const seen = new Set<string>();
  const { customExcludedDates, allowedSaturdayDates } = parseFilterOptions(filterInput);

  // 1. Identify any dates that have exams planned.
  const examDates = new Set<string>();
  for (const entry of entries) {
    const isExam = [entry.title, entry.courseName, entry.type].some(
      val => val && String(val).toLowerCase().includes("exam")
    );
    if (isExam) {
      examDates.add(formatIsoDate(parseKietDateTime(entry.start)));
    }
  }

  return entries
    .filter((entry) => {
      const eventDate = formatIsoDate(parseKietDateTime(entry.start));

      // Global off-days / holidays (e.g. 2026-11-06)
      if (GLOBAL_HOLIDAYS[eventDate]) {
        return false;
      }

      // Branch/semester specific exam dates or other exclusions
      if (customExcludedDates && customExcludedDates.has(eventDate)) {
        return false;
      }

      // Exclude ANY event occurring on an event/exam date
      if (examDates.has(eventDate)) {
        return false;
      }
      
      // Exclude non-class entries
      if (entry.type !== "CLASS") return false;

      // Weekend filter: Sunday is always excluded. Saturday is excluded UNLESS explicitly allowed as a working Saturday.
      const startDate = parseKietDateTime(entry.start);
      const dayOfWeek = startDate.getDay();
      if (dayOfWeek === 0) return false;
      if (dayOfWeek === 6) {
        if (!allowedSaturdayDates || !allowedSaturdayDates.has(eventDate)) {
          return false;
        }
      }
      
      return true;
    })
    .filter((entry) => {
      const key = `${entry.courseCode ?? "na"}-${entry.start}-${entry.end}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .sort(
      (left, right) =>
        parseKietDateTime(left.start).getTime() - parseKietDateTime(right.start).getTime(),
    );
}

export function formatScheduleDay(value: string): string {
  return DATE_FORMATTER.format(parseKietDateTime(value));
}

export function formatScheduleTime(value: string): string {
  return TIME_FORMATTER.format(parseKietDateTime(value));
}

export function formatCapturedAt(timestamp: number | null): string {
  if (!timestamp) {
    return "Not captured yet";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
}

export function getPreviousWorkingDay(date: Date, isSaturdayWorking = false): Date {
  const prev = new Date(date);
  prev.setDate(prev.getDate() - 1);
  
  if (prev.getDay() === 0) { // Sunday
    if (isSaturdayWorking) {
      prev.setDate(prev.getDate() - 1); // Saturday was working
    } else {
      prev.setDate(prev.getDate() - 2); // Fall back to Friday
    }
  } else if (prev.getDay() === 6) { // Saturday
    if (!isSaturdayWorking) {
      prev.setDate(prev.getDate() - 1); // Fall back to Friday
    }
  }
  
  return prev;
}

export function formatDisplayDate(date: Date): string {
  return DATE_FORMATTER.format(date);
}

export function parseTimeToMinutes(timeStr: string | null | undefined): number | null {
  if (!timeStr || typeof timeStr !== "string") return null;
  // Clean whitespace, narrow non-breaking spaces (\u202F), and non-breaking spaces (\u00A0)
  const cleaned = timeStr.trim().replace(/[\u202F\u00A0\s]+/g, " ");
  const match = cleaned.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3] ? match[3].toUpperCase() : null;

  if (meridiem === "PM" && hours !== 12) {
    hours += 12;
  } else if (meridiem === "AM" && hours === 12) {
    hours = 0;
  }

  return hours * 60 + minutes;
}

export function matchesScheduleTimeSlot(
  scheduleStart: string,
  scheduleEnd: string | null | undefined,
  lectureTimeSlot: string | null | undefined
): boolean {
  if (!lectureTimeSlot || !scheduleStart) return false;

  const startDateObj = parseKietDateTime(scheduleStart);
  const schedStartMinutes = startDateObj.getHours() * 60 + startDateObj.getMinutes();

  const endDateObj = scheduleEnd ? parseKietDateTime(scheduleEnd) : null;
  const schedEndMinutes = endDateObj
    ? endDateObj.getHours() * 60 + endDateObj.getMinutes()
    : schedStartMinutes + 50;

  // Split lecture time slot by "-" or "to"
  const slotParts = lectureTimeSlot.split(/[-–—]|(?:\bto\b)/i).map((s) => s.trim());
  if (slotParts.length === 0) return false;

  const slotStartMinutes = parseTimeToMinutes(slotParts[0]);
  if (slotStartMinutes === null) {
    // Fallback: substring check if format is non-standard
    const kietTimeStart = new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
      .format(startDateObj)
      .toUpperCase()
      .replace(/[\u202F\u00A0\s]+/g, " ");
    const normalizedSlot = lectureTimeSlot.toUpperCase().replace(/[\u202F\u00A0\s]+/g, " ");
    return normalizedSlot.includes(kietTimeStart);
  }

  const slotEndMinutes =
    slotParts.length > 1 ? parseTimeToMinutes(slotParts[1]) : slotStartMinutes + 50;

  // 1. Direct start match within 15 mins (e.g. 09:00 vs 09:05)
  if (Math.abs(schedStartMinutes - slotStartMinutes) <= 15) {
    return true;
  }

  // 2. Overlap / Containment (for multi-period labs or block classes)
  // e.g. Lab from 09:00 AM - 10:40 AM covers Period 1 (09:00-09:50) and Period 2 (09:50-10:40)
  if (slotEndMinutes !== null) {
    if (schedStartMinutes >= slotStartMinutes - 5 && schedStartMinutes < slotEndMinutes - 5) {
      return true;
    }
  }

  return false;
}
