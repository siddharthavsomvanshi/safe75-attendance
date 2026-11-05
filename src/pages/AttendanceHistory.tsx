import React, { useEffect, useMemo, useState, useCallback } from "react";
import type { StudentContext, SubjectSummary } from "../App";
import { EmptyMessage, Panel } from "../components/UI";
import type { DatewiseAttendanceBucket, ScheduleEntry } from "../types/kiet";
import { fetchDatewiseAttendanceUnified } from "../services/cybervidyaApi";
import { formatIsoDate, normalizeIsoDateString } from "../utils/date";

export type HistoryClassRecord = {
  key: string;
  subject: string;
  courseCode: string;
  component: string;
  timeSlot: string;
  status: string;
  dayName?: string;
};

type AttendanceHistoryData = {
  selectedDate: string;
  rows: HistoryClassRecord[];
};

function normalise(value: string | null | undefined): string {
  return (value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function formatSelectedDate(dateKey: string): string {
  const iso = normalizeIsoDateString(dateKey);
  if (!iso) return dateKey;
  const [year, month, day] = iso.split("-").map(Number);
  const dt = new Date(year, month - 1, day);
  if (isNaN(dt.getTime())) return dateKey;
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(dt);
}

function getStatusStyle(status: string | null) {
  switch (normalise(status)) {
    case "PRESENT":
      return { label: "Present", color: "var(--success)", background: "var(--success-soft)" };
    case "ABSENT":
      return { label: "Absent", color: "var(--danger)", background: "var(--danger-soft)" };
    case "ADJUSTED":
      return { label: "Adjusted", color: "var(--warning)", background: "var(--warning-soft)" };
    default:
      return { label: "Not marked", color: "var(--secondary)", background: "var(--secondary-soft)" };
  }
}

export function AttendanceHistory({
  studentContext,
  subjects,
}: {
  studentContext: StudentContext | null;
  subjects: SubjectSummary[];
  knownSchedule?: ScheduleEntry[];
}) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [history, setHistory] = useState<AttendanceHistoryData | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);
  const [lecturesByDate, setLecturesByDate] = useState<Record<string, HistoryClassRecord[]>>({});

  const todayKey = formatIsoDate(new Date());

  // Load from local storage cache across all subjects
  const loadFromCache = useCallback(() => {
    if (!studentContext || subjects.length === 0) return 0;

    const map: Record<string, HistoryClassRecord[]> = {};
    let cachedSubjectsCount = 0;

    for (const subject of subjects) {
      const cacheKey = `kiet_datewise_${studentContext.studentId}_${subject.courseId}_${subject.courseComponentId}`;
      try {
        const cachedRaw = localStorage.getItem(cacheKey);
        if (!cachedRaw) continue;

        const parsed = JSON.parse(cachedRaw);
        const buckets: DatewiseAttendanceBucket[] = Array.isArray(parsed?.data)
          ? parsed.data
          : Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.payload)
          ? parsed.payload
          : [];

        if (parsed && typeof parsed.timestamp === "number") {
          cachedSubjectsCount++;
        }

        if (buckets.length > 0) {
          for (const bucket of buckets) {
            const lectureList = bucket.lectureList || [];
            for (const lecture of lectureList) {
              const dateKey = normalizeIsoDateString(lecture.planLecDate);
              if (!dateKey) continue;

              const status = (lecture.attendance ?? "").toUpperCase();
              if (!status || status === "NULL" || status === "N/A") continue;

              const record: HistoryClassRecord = {
                key: `${subject.id}-${dateKey}-${lecture.timeSlot || Math.random()}`,
                subject: subject.title || bucket.courseName || lecture.courseName || "Class",
                courseCode: subject.courseCode || "",
                component: subject.componentName || "Class",
                timeSlot: lecture.timeSlot || "Class time",
                status,
                dayName: lecture.dayName || undefined,
              };

              if (!map[dateKey]) {
                map[dateKey] = [];
              }
              // Deduplicate if identical class identity
              const existingIndex = map[dateKey].findIndex(
                (existing) =>
                  existing.courseCode === record.courseCode &&
                  existing.component === record.component &&
                  existing.timeSlot === record.timeSlot
              );
              if (existingIndex === -1) {
                map[dateKey].push(record);
              }
            }
          }
        }
      } catch {
        // Ignore cache parsing errors
      }
    }

    setLecturesByDate(map);
    setLoadedCount(cachedSubjectsCount);
    return cachedSubjectsCount;
  }, [studentContext, subjects]);

  // Initial load from cache
  useEffect(() => {
    loadFromCache();
  }, [loadFromCache]);

  // Background sync uncached or stale subjects
  const syncSubjects = useCallback(
    async (force = false) => {
      if (!studentContext || subjects.length === 0 || isSyncing) return;

      setIsSyncing(true);
      let loaded = 0;

      try {
        // Concurrency limit = 3 to avoid overwhelming proxy or CyberVidya
        const CONCURRENCY = 3;
        const queue = [...subjects];

        async function worker() {
          while (queue.length > 0) {
            const subject = queue.shift();
            if (!subject) break;

            try {
              await fetchDatewiseAttendanceUnified({
                studentId: studentContext!.studentId,
                sessionId: studentContext!.sessionId,
                courseId: subject.courseId,
                courseCompId: subject.courseComponentId,
                forceRefresh: force,
              });
            } catch (err) {
              console.warn(`Failed loading subject ${subject.courseCode}:`, err);
            } finally {
              loaded++;
              setLoadedCount(loaded);
            }
          }
        }

        const workers = Array.from({ length: Math.min(CONCURRENCY, subjects.length) }, () => worker());
        await Promise.all(workers);
      } finally {
        loadFromCache();
        setIsSyncing(false);
      }
    },
    [studentContext, subjects, isSyncing, loadFromCache]
  );

  // Trigger background sync on mount if not fully cached
  useEffect(() => {
    const cachedCount = loadFromCache();
    if (cachedCount < subjects.length && subjects.length > 0 && !isSyncing) {
      void syncSubjects(false);
    }
  }, [subjects.length]);

  const calendarDays = useMemo(() => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const firstWeekday = new Date(year, monthIndex, 1).getDay();
    const count = new Date(year, monthIndex + 1, 0).getDate();

    return Array.from({ length: firstWeekday + count }, (_, index) => {
      if (index < firstWeekday) return null;
      const date = new Date(year, monthIndex, index - firstWeekday + 1);
      const dateKey = formatIsoDate(date);
      const classesOnDay = lecturesByDate[dateKey] ?? [];
      const hasClasses = classesOnDay.length > 0;
      const hasAbsent = classesOnDay.some((c) => normalise(c.status) === "ABSENT");
      const hasAdjusted = classesOnDay.some((c) => normalise(c.status) === "ADJUSTED");

      let dotColor: string | null = null;
      if (hasClasses) {
        if (hasAbsent) {
          dotColor = "var(--danger)";
        } else if (hasAdjusted) {
          dotColor = "var(--warning)";
        } else {
          dotColor = "var(--success)";
        }
      }

      return {
        day: date.getDate(),
        dateKey,
        hasClasses,
        dotColor,
        classesCount: classesOnDay.length,
      };
    });
  }, [month, lecturesByDate]);

  function selectDate(dateKey: string) {
    if (dateKey > todayKey) return;
    const classes = lecturesByDate[dateKey] ?? [];
    setHistory({
      selectedDate: dateKey,
      rows: classes,
    });
  }

  const presentCount = history?.rows.filter((row) => normalise(row.status) === "PRESENT").length ?? 0;
  const absentCount = history?.rows.filter((row) => normalise(row.status) === "ABSENT").length ?? 0;
  const adjustedCount = history?.rows.filter((row) => normalise(row.status) === "ADJUSTED").length ?? 0;
  const monthLabel = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(month);

  return (
    <section style={{ display: "grid", gap: 14 }}>
      <Panel
        title="Attendance History"
        subtitle="Choose any past date to view full class-by-class attendance records."
      >
        {!studentContext ? (
          <EmptyMessage message="Connect KIET on the dashboard first." />
        ) : (
          <div style={{ display: "grid", gap: 18 }}>
            {/* Sync Status Banner */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
                padding: "8px 14px",
                background: "var(--bg-card-subtle)",
                borderRadius: 12,
                fontSize: 13,
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: isSyncing
                      ? "var(--warning)"
                      : loadedCount >= subjects.length
                      ? "var(--success)"
                      : "var(--primary)",
                  }}
                />
                <span>
                  {isSyncing
                    ? `Syncing subjects from CyberVidya (${loadedCount}/${subjects.length})...`
                    : loadedCount >= subjects.length
                    ? `All ${subjects.length} subjects fully indexed`
                    : `Loaded ${loadedCount} of ${subjects.length} subjects`}
                </span>
              </div>
              <button
                type="button"
                className="action-button action-button--secondary"
                disabled={isSyncing}
                onClick={() => void syncSubjects(true)}
                style={{ padding: "4px 12px", fontSize: 12, minHeight: 28 }}
              >
                {isSyncing ? "Syncing..." : "↻ Refresh All"}
              </button>
            </div>

            {/* Month Header */}
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <button
                className="action-button action-button--secondary"
                type="button"
                onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
              >
                Previous
              </button>
              <strong style={{ fontSize: 17 }}>{monthLabel}</strong>
              <button
                className="action-button action-button--secondary"
                type="button"
                disabled={
                  month.getFullYear() === new Date().getFullYear() &&
                  month.getMonth() === new Date().getMonth()
                }
                onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
              >
                Next
              </button>
            </div>

            {/* Calendar Weekday Names */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                gap: 6,
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>

            {/* Calendar Days */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 6 }}>
              {calendarDays.map((calendarDay, index) => {
                if (!calendarDay) return <span key={`blank-${index}`} />;
                const isFuture = calendarDay.dateKey > todayKey;
                const isSelected = history?.selectedDate === calendarDay.dateKey;

                return (
                  <button
                    key={calendarDay.dateKey}
                    type="button"
                    disabled={isFuture}
                    onClick={() => selectDate(calendarDay.dateKey)}
                    aria-label={`Load attendance for ${calendarDay.dateKey}`}
                    style={{
                      minHeight: 48,
                      borderRadius: 12,
                      border: `1.5px solid ${isSelected ? "var(--primary)" : "var(--border)"}`,
                      background: isSelected
                        ? "var(--primary-soft)"
                        : calendarDay.hasClasses
                        ? "var(--bg-card)"
                        : "var(--bg-card-subtle)",
                      color: isFuture ? "var(--text-muted)" : "var(--text-primary)",
                      cursor: isFuture ? "not-allowed" : "pointer",
                      font: "inherit",
                      fontWeight: 700,
                      opacity: isFuture ? 0.45 : 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "4px",
                      position: "relative",
                    }}
                  >
                    <span>{calendarDay.day}</span>
                    {calendarDay.dotColor && (
                      <span
                        aria-hidden="true"
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: calendarDay.dotColor,
                          marginTop: 3,
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div
              style={{
                display: "flex",
                gap: 16,
                justifyContent: "center",
                alignItems: "center",
                fontSize: 12,
                color: "var(--text-muted)",
                flexWrap: "wrap",
                paddingTop: 4,
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--success)" }} />
                All Present
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--danger)" }} />
                Absent Marked
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--warning)" }} />
                Adjusted
              </span>
            </div>
          </div>
        )}
      </Panel>

      {/* Selected Day View */}
      {history && (
        <Panel
          title={formatSelectedDate(history.selectedDate)}
          subtitle={
            history.rows.length === 0
              ? "No recorded attendance for this date."
              : `${history.rows.length} class${history.rows.length === 1 ? "" : "es"} recorded.`
          }
        >
          {history.rows.length === 0 ? (
            <EmptyMessage message="No classes were recorded on this date (holiday, weekend, or no classes taken)." />
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontWeight: 700, fontSize: 14 }}>
                <span style={{ color: "var(--success)" }}>Present: {presentCount}</span>
                <span style={{ color: "var(--danger)" }}>Absent: {absentCount}</span>
                {adjustedCount > 0 && <span style={{ color: "var(--warning)" }}>Adjusted: {adjustedCount}</span>}
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {history.rows.map((row) => {
                  const status = getStatusStyle(row.status);
                  return (
                    <div
                      key={row.key}
                      className="standard-card"
                      style={{
                        padding: "14px 16px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                        borderRadius: 14,
                        border: "1px solid var(--border)",
                        background: "var(--bg-card)",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{row.subject}</div>
                        <div style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 3 }}>
                          {row.component} • {row.timeSlot}
                        </div>
                      </div>
                      <span
                        style={{
                          flexShrink: 0,
                          color: status.color,
                          background: status.background,
                          borderRadius: 999,
                          padding: "6px 12px",
                          fontWeight: 800,
                          fontSize: 13,
                        }}
                      >
                        {status.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Panel>
      )}
    </section>
  );
}
