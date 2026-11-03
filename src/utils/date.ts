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

export function parseKietDateTime(value: string): Date {
  if (!value || typeof value !== "string") {
    return new Date();
  }

  // ISO date format: YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [datePart, timePart] = value.split(/[T ]/);
    const [year, month, day] = datePart.split("-").map(Number);
    if (timePart && timePart.includes(":")) {
      const [hours, minutes, seconds] = timePart.split(":").map(Number);
      return new Date(year, month - 1, day, hours || 0, minutes || 0, seconds || 0);
    }
    return new Date(year, month - 1, day);
  }

  // KIET date format: DD/MM/YYYY HH:MM:SS
  const [datePart, timePart] = value.split(" ");
  if (datePart && datePart.includes("/")) {
    const [day, month, year] = datePart.split("/").map(Number);
    if (timePart && timePart.includes(":")) {
      const [hours, minutes, seconds] = timePart.split(":").map(Number);
      return new Date(year, month - 1, day, hours || 0, minutes || 0, seconds || 0);
    }
    return new Date(year, month - 1, day);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function getUpcomingClasses(
  entries: ScheduleEntry[],
  customExcludedDates?: Set<string>,
): ScheduleEntry[] {
  const now = Date.now();
  const seen = new Set<string>();

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
      
      // Exclude weekend entries (Saturday = 6, Sunday = 0) as no actual classes occur on weekends
      const startDate = parseKietDateTime(entry.start);
      const dayOfWeek = startDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) return false;

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
  customExcludedDates?: Set<string>,
): ScheduleEntry[] {
  const seen = new Set<string>();

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

      // Exclude weekend entries (Saturday = 6, Sunday = 0) as no actual classes occur on weekends
      const startDate = parseKietDateTime(entry.start);
      const dayOfWeek = startDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) return false;
      
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

export function getPreviousWorkingDay(date: Date): Date {
  const prev = new Date(date);
  prev.setDate(prev.getDate() - 1);
  
  if (prev.getDay() === 0) { // Sunday
    prev.setDate(prev.getDate() - 2);
  } else if (prev.getDay() === 6) { // Saturday
    prev.setDate(prev.getDate() - 1);
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
