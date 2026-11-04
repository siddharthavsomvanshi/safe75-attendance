import type { OverallSummary, SubjectSummary } from "./attendanceCalculations";
import type { DayStreakRecord, SubjectAbsencesByDate } from "./streak";

export interface MedicalLeaveDay {
  dateKey: string;
  label: string;
  weekday: string;
  total: number;
  attended: number;
  missed: number;
}

export interface SubjectImpactDetail {
  id: string;
  title: string;
  courseCode: string;
  componentName: string;
  currentPercentage: number;
  newPercentage: number;
  missedRecovered: number;
  wasRisky: boolean;
  rescued: boolean;
}

export interface AlternativeBadge {
  label: string;
  variant: "primary" | "success" | "warning" | "info" | "neutral";
  description: string;
}

export interface MedicalLeaveAlternative {
  id: string;
  startDate: string;
  endDate: string;
  label: string;            // e.g. "28 Nov – 30 Nov"
  fullLabel: string;        // e.g. "Thu, 28 Nov – Sat, 30 Nov 2026"
  badge: AlternativeBadge;
  calendarDays: number;     // Total calendar days (inclusive)
  classDaysCount: number;   // Number of active class days in the window
  absentDaysCount: number;  // Days with recorded missed classes
  missedClassesRecovered: number;
  currentPercentage: number;
  projectedPercentage: number;
  percentageGain: number;
  reachesTarget: boolean;
  targetPercentage: number | null;
  rescuesOverall: boolean;  // Brought overall from <75% to >=75%
  rescuedSubjectsCount: number;
  stillRiskySubjectsCount: number;
  efficiency: number;       // Missed classes per calendar day
  isPureConsecutive: boolean;
  subjectImpacts: SubjectImpactDetail[];
  dailyBreakdown: MedicalLeaveDay[];
}

export interface MedicalLeaveOptimizerOptions {
  targetPercentage?: number | null; // e.g. 75, 80, or null for max recovery
  lookbackDays?: number;           // e.g. 30, 45, 60, or 90
  maxConsecutiveDays?: number;     // e.g. 3, 5, 7, 10, or 30
  minConsecutiveDays?: number;     // e.g. 1 or 2
  maxAlternatives?: number;        // default: at least 3, up to 5
}

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatShortDateRange(startDateKey: string, endDateKey: string): string {
  if (!startDateKey || !endDateKey) return "";
  const [y1, m1, d1] = startDateKey.split("-").map(Number);
  const [y2, m2, d2] = endDateKey.split("-").map(Number);
  const date1 = new Date(y1, m1 - 1, d1);
  const date2 = new Date(y2, m2 - 1, d2);

  const month1 = date1.toLocaleDateString("en-IN", { month: "short" });
  const month2 = date2.toLocaleDateString("en-IN", { month: "short" });

  if (startDateKey === endDateKey) {
    return `${d1} ${month1}`;
  }

  if (m1 === m2 && y1 === y2) {
    return `${d1} ${month1} – ${d2} ${month2}`;
  }

  return `${d1} ${month1} – ${d2} ${month2}`;
}

export function formatFullDateRange(startDateKey: string, endDateKey: string): string {
  if (!startDateKey || !endDateKey) return "";
  const [y1, m1, d1] = startDateKey.split("-").map(Number);
  const [y2, m2, d2] = endDateKey.split("-").map(Number);
  const date1 = new Date(y1, m1 - 1, d1);
  const date2 = new Date(y2, m2 - 1, d2);

  const f1 = date1.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  if (startDateKey === endDateKey) return f1;

  const f2 = date2.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return `${f1} – ${f2}`;
}

function getSubjectKey(subject: SubjectSummary): string {
  return `${subject.courseId}:${subject.courseComponentId}`;
}

function getCalendarDayDifference(startKey: string, endKey: string): number {
  const start = parseDateKey(startKey).getTime();
  const end = parseDateKey(endKey).getTime();
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
}

/**
 * Finds and scores the best consecutive medical leave windows in the past 30-50 days.
 * Returns at least 3 distinct alternatives ranked by impact, target achievement, and efficiency.
 */
export function findOptimalMedicalLeaveWindows({
  streakDayData,
  streakSubjectAbsencesByDate,
  subjectSummaries,
  overallSummary,
  options = {},
}: {
  streakDayData: Record<string, DayStreakRecord>;
  streakSubjectAbsencesByDate: SubjectAbsencesByDate;
  subjectSummaries: SubjectSummary[];
  overallSummary: OverallSummary | null;
  options?: MedicalLeaveOptimizerOptions;
}): MedicalLeaveAlternative[] {
  if (!overallSummary || overallSummary.total === 0 || subjectSummaries.length === 0) {
    return [];
  }

  const {
    targetPercentage = 75,
    lookbackDays = 45,
    maxConsecutiveDays = 7,
    minConsecutiveDays = 2,
    maxAlternatives = 4,
  } = options;

  const effectiveTarget = typeof targetPercentage === "number" && targetPercentage > 0 ? targetPercentage : 75;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = formatIsoDate(today);

  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - lookbackDays);
  const cutoffKey = formatIsoDate(cutoff);

  // 1. Gather all past calendar days with recorded attendance in the lookback period
  const recordedDays = Object.values(streakDayData)
    .filter((d) => d.dateKey >= cutoffKey && d.dateKey < todayKey && /^\d{4}-\d{2}-\d{2}$/.test(d.dateKey))
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));

  if (recordedDays.length === 0) {
    return [];
  }

  // Create quick lookup for day records
  const dayMap = new Map<string, DayStreakRecord>();
  for (const d of recordedDays) {
    dayMap.set(d.dateKey, d);
  }

  // Identify all days with at least 1 missed class
  const absentDays = recordedDays
    .map((d) => ({
      dateKey: d.dateKey,
      total: d.total,
      attended: d.attended,
      missed: Math.max(0, d.total - d.attended),
    }))
    .filter((d) => d.missed > 0);

  if (absentDays.length === 0) {
    return [];
  }

  // 2. Identify natural absence clusters
  // Two absent days belong to the same cluster if calendar distance <= 3 days (allowing weekends)
  // and there is no intervening day where the student attended all classes with 0 missed.
  const clusters: Array<typeof absentDays> = [];
  let currentCluster: typeof absentDays = [];

  for (let i = 0; i < absentDays.length; i++) {
    const current = absentDays[i];
    if (currentCluster.length === 0) {
      currentCluster.push(current);
      continue;
    }

    const prev = currentCluster[currentCluster.length - 1];
    const dayGap = getCalendarDayDifference(prev.dateKey, current.dateKey);

    // Check if any intervening day was 100% attended
    let hasFullAttendedDayInBetween = false;
    if (dayGap > 1) {
      const prevDate = parseDateKey(prev.dateKey);
      for (let step = 1; step < dayGap; step++) {
        const midDate = new Date(prevDate);
        midDate.setDate(midDate.getDate() + step);
        const midKey = formatIsoDate(midDate);
        const midRecord = dayMap.get(midKey);
        if (midRecord && midRecord.total > 0 && midRecord.attended === midRecord.total) {
          hasFullAttendedDayInBetween = true;
          break;
        }
      }
    }

    if (dayGap <= 3 && !hasFullAttendedDayInBetween) {
      currentCluster.push(current);
    } else {
      clusters.push(currentCluster);
      currentCluster = [current];
    }
  }

  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  // 3. Helper to score and evaluate a candidate window [startDateKey, endDateKey]
  function evaluateWindow(startKey: string, endKey: string): MedicalLeaveAlternative | null {
    const calendarDays = getCalendarDayDifference(startKey, endKey) + 1;
    if (calendarDays < 1) return null;

    // Collect all recorded days in [startKey, endKey]
    const startDate = parseDateKey(startKey);
    const windowDays: MedicalLeaveDay[] = [];
    let windowMissed = 0;
    let windowClassDays = 0;
    let windowAbsentDays = 0;
    let hasFullyAttendedDay = false;

    for (let step = 0; step < calendarDays; step++) {
      const curDate = new Date(startDate);
      curDate.setDate(curDate.getDate() + step);
      const dateKey = formatIsoDate(curDate);
      const rec = dayMap.get(dateKey);

      const total = rec ? rec.total : 0;
      const attended = rec ? rec.attended : 0;
      const missed = rec ? Math.max(0, rec.total - rec.attended) : 0;

      if (total > 0) {
        windowClassDays++;
        if (missed > 0) {
          windowAbsentDays++;
          windowMissed += missed;
        } else if (attended === total) {
          hasFullyAttendedDay = true;
        }
      }

      windowDays.push({
        dateKey,
        label: curDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        weekday: curDate.toLocaleDateString("en-IN", { weekday: "short" }),
        total,
        attended,
        missed,
      });
    }

    if (windowMissed === 0) return null;

    const currentPresent = overallSummary!.present;
    const currentTotal = overallSummary!.total;
    const currentPercentage = overallSummary!.percentage;

    const newPresent = currentPresent + windowMissed;
    const projectedPercentage = currentTotal > 0 ? (newPresent / currentTotal) * 100 : 0;
    const percentageGain = projectedPercentage - currentPercentage;
    const reachesTarget = projectedPercentage >= effectiveTarget;
    const rescuesOverall = currentPercentage < 75 && projectedPercentage >= 75;

    // Subject breakdown
    let rescuedSubjectsCount = 0;
    let stillRiskySubjectsCount = 0;

    const subjectImpacts: SubjectImpactDetail[] = subjectSummaries.map((subject) => {
      const subjectKey = getSubjectKey(subject);
      let subjectMissed = 0;

      for (const day of windowDays) {
        if (day.missed > 0) {
          const missedInSubject = streakSubjectAbsencesByDate[day.dateKey]?.[subjectKey] ?? 0;
          subjectMissed += missedInSubject;
        }
      }

      const subjNewPresent = subject.present + subjectMissed;
      const subjNewPercentage = subject.total > 0 ? (subjNewPresent / subject.total) * 100 : 0;
      const wasRisky = subject.percentage < 75;
      const isRescued = wasRisky && subjNewPercentage >= 75;
      const stillRisky = wasRisky && subjNewPercentage < 75;

      if (isRescued) rescuedSubjectsCount++;
      if (stillRisky) stillRiskySubjectsCount++;

      return {
        id: subject.id,
        title: subject.title,
        courseCode: subject.courseCode,
        componentName: subject.componentName,
        currentPercentage: subject.percentage,
        newPercentage: subjNewPercentage,
        missedRecovered: subjectMissed,
        wasRisky,
        rescued: isRescued,
      };
    });

    const efficiency = windowMissed / Math.max(1, calendarDays);

    return {
      id: `${startKey}_${endKey}`,
      startDate: startKey,
      endDate: endKey,
      label: formatShortDateRange(startKey, endKey),
      fullLabel: formatFullDateRange(startKey, endKey),
      badge: { label: "Alternative", variant: "neutral", description: "" },
      calendarDays,
      classDaysCount: windowClassDays,
      absentDaysCount: windowAbsentDays,
      missedClassesRecovered: windowMissed,
      currentPercentage,
      projectedPercentage,
      percentageGain,
      reachesTarget,
      targetPercentage: effectiveTarget,
      rescuesOverall,
      rescuedSubjectsCount,
      stillRiskySubjectsCount,
      efficiency,
      isPureConsecutive: !hasFullyAttendedDay,
      subjectImpacts: subjectImpacts.filter((s) => s.missedRecovered > 0),
      dailyBreakdown: windowDays.filter((d) => d.total > 0),
    };
  }

  // 4. Generate candidate windows from clusters and sliding spans
  const candidatePool: MedicalLeaveAlternative[] = [];
  const seenWindowKeys = new Set<string>();

  function registerCandidate(cand: MedicalLeaveAlternative | null) {
    if (!cand) return;
    if (seenWindowKeys.has(cand.id)) return;
    seenWindowKeys.add(cand.id);
    candidatePool.push(cand);
  }

  // For each cluster:
  for (const cluster of clusters) {
    const clusterStart = cluster[0].dateKey;
    const clusterEnd = cluster[cluster.length - 1].dateKey;
    const clusterSpan = getCalendarDayDifference(clusterStart, clusterEnd) + 1;

    // A) If the cluster fits within maxConsecutiveDays, add the full cluster window
    if (clusterSpan <= maxConsecutiveDays && clusterSpan >= minConsecutiveDays) {
      registerCandidate(evaluateWindow(clusterStart, clusterEnd));
    }

    // B) Sub-windows of lengths between minConsecutiveDays and maxConsecutiveDays
    // within this cluster
    for (let i = 0; i < cluster.length; i++) {
      for (let j = i; j < cluster.length; j++) {
        const sKey = cluster[i].dateKey;
        const eKey = cluster[j].dateKey;
        const span = getCalendarDayDifference(sKey, eKey) + 1;

        if (span >= minConsecutiveDays && span <= maxConsecutiveDays) {
          registerCandidate(evaluateWindow(sKey, eKey));
        }
      }
    }
  }

  // C) Fallback if very few candidates found (e.g. single day absences)
  if (candidatePool.length < 3) {
    for (let i = 0; i < absentDays.length; i++) {
      const sKey = absentDays[i].dateKey;
      // Single day candidate
      registerCandidate(evaluateWindow(sKey, sKey));

      // Adjacent absent pair if within maxConsecutiveDays
      if (i + 1 < absentDays.length) {
        const eKey = absentDays[i + 1].dateKey;
        const span = getCalendarDayDifference(sKey, eKey) + 1;
        if (span <= maxConsecutiveDays) {
          registerCandidate(evaluateWindow(sKey, eKey));
        }
      }
    }
  }

  if (candidatePool.length === 0) {
    return [];
  }

  // 5. Deduplicate and select distinct alternative clusters
  // We want at least 3 alternatives that offer real variety (e.g. different date ranges or strategies).
  // First, sort all candidates by composite score:
  // (reachesTarget? 1000 : 0) + (rescuedSubjectsCount * 50) + (missedRecovered * 10) + efficiency
  function scoreCandidate(c: MedicalLeaveAlternative): number {
    let score = c.missedClassesRecovered * 10 + c.efficiency * 5;
    if (c.reachesTarget) score += 200;
    if (c.rescuesOverall) score += 150;
    score += c.rescuedSubjectsCount * 40;
    if (c.isPureConsecutive) score += 30;
    return score;
  }

  candidatePool.sort((a, b) => scoreCandidate(b) - scoreCandidate(a));

  const selectedAlternatives: MedicalLeaveAlternative[] = [];

  // Helper to check overlap with already selected windows
  function getOverlapRatio(a: MedicalLeaveAlternative, b: MedicalLeaveAlternative): number {
    const startA = parseDateKey(a.startDate).getTime();
    const endA = parseDateKey(a.endDate).getTime();
    const startB = parseDateKey(b.startDate).getTime();
    const endB = parseDateKey(b.endDate).getTime();

    const overlapStart = Math.max(startA, startB);
    const overlapEnd = Math.min(endA, endB);

    if (overlapEnd < overlapStart) return 0;
    const overlapDays = (overlapEnd - overlapStart) / (1000 * 60 * 60 * 24) + 1;
    const minDays = Math.min(a.calendarDays, b.calendarDays);
    return overlapDays / minDays;
  }

  // Step 1: Pick non-overlapping windows first (from distinct absence events)
  for (const cand of candidatePool) {
    if (selectedAlternatives.length >= maxAlternatives) break;
    const overlaps = selectedAlternatives.some((sel) => getOverlapRatio(sel, cand) > 0.4);
    if (!overlaps) {
      selectedAlternatives.push(cand);
    }
  }

  // Step 2: If we still don't have at least 3 alternatives, relax overlap to provide options of different lengths
  // (e.g. a 3-day quick fix vs a 5-day max boost)
  if (selectedAlternatives.length < 3) {
    for (const cand of candidatePool) {
      if (selectedAlternatives.length >= maxAlternatives) break;
      const alreadyIncluded = selectedAlternatives.some((sel) => sel.id === cand.id);
      if (!alreadyIncluded) {
        selectedAlternatives.push(cand);
      }
    }
  }

  // 6. Assign tailored archetype badges to the alternatives
  if (selectedAlternatives.length > 0) {
    // Find index of max boost
    let maxBoostIdx = 0;
    for (let i = 1; i < selectedAlternatives.length; i++) {
      if (selectedAlternatives[i].missedClassesRecovered > selectedAlternatives[maxBoostIdx].missedClassesRecovered) {
        maxBoostIdx = i;
      }
    }

    // Find index of shortest reaching target
    let shortestTargetIdx = -1;
    for (let i = 0; i < selectedAlternatives.length; i++) {
      if (selectedAlternatives[i].reachesTarget) {
        if (shortestTargetIdx === -1 || selectedAlternatives[i].calendarDays < selectedAlternatives[shortestTargetIdx].calendarDays) {
          shortestTargetIdx = i;
        }
      }
    }

    selectedAlternatives.forEach((alt, idx) => {
      if (idx === 0) {
        alt.badge = {
          label: "Top Recommended",
          variant: "primary",
          description: "Best balance of attendance boost and medical leave feasibility",
        };
      } else if (idx === maxBoostIdx && alt.missedClassesRecovered > selectedAlternatives[0].missedClassesRecovered) {
        alt.badge = {
          label: "Maximum Recovery Boost",
          variant: "success",
          description: `Recovers the most missed classes (+${alt.missedClassesRecovered}) in a single certificate`,
        };
      } else if (idx === shortestTargetIdx && shortestTargetIdx !== 0) {
        alt.badge = {
          label: "Fastest Target Reach",
          variant: "info",
          description: `Hits ${effectiveTarget}% in just ${alt.calendarDays} consecutive days`,
        };
      } else if (alt.calendarDays <= 3) {
        alt.badge = {
          label: "Quick 3-Day Window",
          variant: "warning",
          description: "Short doctor prescription window with high density of missed classes",
        };
      } else {
        alt.badge = {
          label: `Alternative Window ${idx + 1}`,
          variant: "neutral",
          description: "Distinct consecutive absence gap in recent weeks",
        };
      }
    });
  }

  return selectedAlternatives;
}

/**
 * Formats a clean, professional medical leave application note that
 * the student can copy and submit or use as reference for a medical certificate.
 */
export function formatMedicalApplicationNote({
  alternative,
  studentName,
  registrationNumber,
}: {
  alternative: MedicalLeaveAlternative;
  studentName?: string;
  registrationNumber?: string;
}): string {
  const lines: string[] = [];

  lines.push("--- MEDICAL LEAVE ATTENDANCE ADJUSTMENT REFERENCE ---");
  if (studentName) lines.push(`Student: ${studentName}`);
  if (registrationNumber) lines.push(`Registration No: ${registrationNumber}`);
  lines.push(`Requested Period: ${alternative.fullLabel}`);
  lines.push(`Duration: ${alternative.calendarDays} calendar day(s) (${alternative.classDaysCount} instruction day(s))`);
  lines.push(`Missed Classes Covered: ${alternative.missedClassesRecovered} lecture(s)`);
  lines.push("");
  lines.push("PROJECTED ATTENDANCE IMPACT:");
  lines.push(`Overall Attendance: ${alternative.currentPercentage.toFixed(1)}% -> ${alternative.projectedPercentage.toFixed(1)}% (+${alternative.percentageGain.toFixed(1)}%)`);
  if (alternative.targetPercentage) {
    lines.push(`Target Attendance (${alternative.targetPercentage}%): ${alternative.reachesTarget ? "ACHIEVED" : "Not fully reached"}`);
  }
  lines.push("");
  lines.push("SUBJECT-WISE ATTENDANCE RECOVERY:");
  for (const subj of alternative.subjectImpacts) {
    const status = subj.rescued ? " [RESCUED >=75%]" : subj.newPercentage >= 75 ? " [SAFE]" : "";
    lines.push(`- ${subj.title} (${subj.courseCode || subj.componentName}): +${subj.missedRecovered} classes (${subj.currentPercentage.toFixed(1)}% -> ${subj.newPercentage.toFixed(1)}%)${status}`);
  }
  lines.push("");
  lines.push("DAILY ABSENCE BREAKDOWN:");
  for (const day of alternative.dailyBreakdown) {
    lines.push(`- ${day.label} (${day.weekday}): Missed ${day.missed} of ${day.total} class(es)`);
  }
  lines.push("-----------------------------------------------------");

  return lines.join("\n");
}
