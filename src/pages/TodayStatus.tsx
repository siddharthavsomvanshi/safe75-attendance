import React, { useState, useEffect, useCallback } from "react";
import { fetchScheduleUnified, fetchDatewiseAttendanceUnified } from "../services/cybervidyaApi";
import { getWeekRange, parseKietDateTime, formatIsoDate, getPreviousWorkingDay, formatDisplayDate, matchesScheduleTimeSlot, normalizeIsoDateString } from "../utils/date";
import type { StudentContext } from "../App";
import type { StudentDetails, ScheduleEntry, DatewiseAttendanceBucket } from "../types/kiet";
import { GLOBAL_HOLIDAYS } from "../data/mse2Datesheet";
import type { StudentExamInfo } from "../data/mse2Datesheet";
import { Notice, StatusCard, secondaryButtonStyle } from "../App";
import { Panel } from "../components/UI";
import { formatScheduleTime } from "../utils/date";

export interface TodayStatusProps {
  attendance: StudentDetails | null;
  studentContext: StudentContext | null;
  studentExamInfo?: StudentExamInfo | null;
}

type TodayClass = {
  entry: ScheduleEntry;
  courseId: number | null;
  courseComponentId: number | null;
  attendanceStatus: string | null;
  isLoading: boolean;
  error: string | null;
};

// Module-level cache to persist across component remounts during the same day
let moduleScheduleCaches: Record<string, ScheduleEntry[]> = {};
let moduleAttendanceCache: Record<string, DatewiseAttendanceBucket[]> = {};
let moduleLastFetchDateIso: string | null = null;

export function TodayStatus({ attendance, studentContext, studentExamInfo }: TodayStatusProps) {
  const [mode, setMode] = useState<"today" | "yesterday">("today");
  const [hasFetchedToday, setHasFetchedToday] = useState(false);
  const [hasFetchedYesterday, setHasFetchedYesterday] = useState(false);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [todayClasses, setTodayClasses] = useState<TodayClass[]>([]);
  const [yesterdayClasses, setYesterdayClasses] = useState<TodayClass[]>([]);

  const fetchDailyData = useCallback(async (targetMode: "today" | "yesterday", forceRefresh = false) => {
    if (!studentContext || !attendance) return;
    
    setIsLoadingSchedule(true);
    setScheduleError(null);
    try {
      const currentDateIso = formatIsoDate(new Date());
      const targetDateObj = targetMode === "today" ? new Date() : getPreviousWorkingDay(new Date());
      const targetDateIso = formatIsoDate(targetDateObj);

      // Invalidate cache if a new day has started or forceRefresh is true
      if (forceRefresh || moduleLastFetchDateIso !== currentDateIso) {
         moduleScheduleCaches = {};
         moduleAttendanceCache = {};
         moduleLastFetchDateIso = currentDateIso;
         if (forceRefresh) {
            setHasFetchedToday(false);
            setHasFetchedYesterday(false);
         }
      }

      const weekRange = getWeekRange(targetDateObj, 0);
      let schedule = moduleScheduleCaches[weekRange.weekStartDate];
      if (!schedule) {
         schedule = await fetchScheduleUnified(weekRange);
         moduleScheduleCaches[weekRange.weekStartDate] = schedule;
      }
      
      const entriesForDay = (schedule || []).filter((entry: ScheduleEntry) => {
         if (entry.type !== "CLASS") return false;
         const entryDate = formatIsoDate(parseKietDateTime(entry.start));
         return entryDate === targetDateIso;
      }).sort((a: ScheduleEntry, b: ScheduleEntry) => parseKietDateTime(a.start).getTime() - parseKietDateTime(b.start).getTime());

      // Match entries with courseId and courseCompId
      const classesWithIds: TodayClass[] = entriesForDay.map((entry: ScheduleEntry) => {
        let courseId: number | null = null;
        let courseComponentId: number | null = null;
        
        const normEntryCode = (entry.courseCode || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
        const normEntryComp = (entry.courseCompName || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

        if (attendance.attendanceCourseComponentInfoList) {
           for (const course of attendance.attendanceCourseComponentInfoList) {
             const normCourseCode = (course.courseCode || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
             if (normCourseCode === normEntryCode) {
               courseId = course.courseId;
               const comps = course.attendanceCourseComponentNameInfoList || [];
               if (comps.length === 1) {
                 courseComponentId = comps[0].courseComponentId;
                 break;
               }
               for (const comp of comps) {
                 const normComp = (comp.componentName || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
                 if (normComp === normEntryComp) {
                   courseComponentId = comp.courseComponentId;
                   break;
                 }
               }
               if (!courseComponentId && comps.length > 0) {
                 const partialMatch = comps.find((comp) => {
                   const normComp = (comp.componentName || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
                   return normComp.includes(normEntryComp) || normEntryComp.includes(normComp);
                 });
                 courseComponentId = partialMatch ? partialMatch.courseComponentId : comps[0].courseComponentId;
               }
               break;
             }
           }
        }
        
        return {
          entry,
          courseId,
          courseComponentId,
          attendanceStatus: null,
          isLoading: false,
          error: null,
        };
      });

      const setTargetClasses = targetMode === "today" ? setTodayClasses : setYesterdayClasses;
      setTargetClasses(classesWithIds);
      
      if (targetMode === "today") setHasFetchedToday(true);
      else setHasFetchedYesterday(true);
      
      // Fetch attendance for each unique component
      const uniqueComponents = new Set<string>();
      classesWithIds.forEach(c => {
         if (c.courseId && c.courseComponentId) {
             uniqueComponents.add(`${c.courseId}-${c.courseComponentId}`);
         }
      });
      
      for (const compKey of uniqueComponents) {
         if (!moduleAttendanceCache[compKey]) {
            const [cId, ccId] = compKey.split("-").map(Number);
            setTargetClasses(prev => prev.map(tc => 
               (tc.courseId === cId && tc.courseComponentId === ccId) ? { ...tc, isLoading: true, error: null } : tc
            ));
            
            try {
               const res = await fetchDatewiseAttendanceUnified({
                  studentId: studentContext.studentId,
                  sessionId: studentContext.sessionId,
                  courseId: cId,
                  courseCompId: ccId,
               });
               moduleAttendanceCache[compKey] = Array.isArray(res) ? res : (res as any)?.data || [];
            } catch (err) {
               const errorMsg = err instanceof Error ? err.message : String(err);
               setTargetClasses(prev => prev.map(tc => 
                  (tc.courseId === cId && tc.courseComponentId === ccId) ? { ...tc, isLoading: false, error: errorMsg } : tc
               ));
            }
         }
      }
      
      // Update attendanceStatus mapping
      setTargetClasses(prev => prev.map(tc => {
         if (!tc.courseId || !tc.courseComponentId) return tc;
         const compKey = `${tc.courseId}-${tc.courseComponentId}`;
         const rawBuckets = moduleAttendanceCache[compKey];
         if (!rawBuckets) return tc;
         
         const buckets = Array.isArray(rawBuckets)
           ? rawBuckets
           : Array.isArray((rawBuckets as any)?.data)
           ? (rawBuckets as any).data
           : [];
         
         const lectures = buckets.flatMap((b: DatewiseAttendanceBucket) => b.lectureList || []).filter((l) => {
            const lectureDateIso = normalizeIsoDateString(l.planLecDate);
            return lectureDateIso === targetDateIso;
         });
         
         let matchedLecture = null;
         for (const l of lectures) {
            if (matchesScheduleTimeSlot(tc.entry.start, tc.entry.end, l.timeSlot)) {
               matchedLecture = l;
               break;
            }
         }
         if (!matchedLecture && lectures.length === 1) {
            matchedLecture = lectures[0];
         }
         
         return {
            ...tc,
            isLoading: false,
            attendanceStatus: matchedLecture ? matchedLecture.attendance : null
         };
      }));
      
    } catch (error) {
      setScheduleError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoadingSchedule(false);
    }
  }, [attendance, studentContext, studentExamInfo]);

  useEffect(() => {
    if (studentContext && attendance) {
       if (mode === "today" && !hasFetchedToday) {
          fetchDailyData("today");
       } else if (mode === "yesterday" && !hasFetchedYesterday) {
          fetchDailyData("yesterday");
       }
    }
  }, [mode, hasFetchedToday, hasFetchedYesterday, fetchDailyData, studentContext, attendance]);

  const handleModeChange = (newMode: "today" | "yesterday") => {
     if (newMode !== mode) {
        setMode(newMode);
     }
  };

  if (!attendance || !studentContext) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <Notice tone="var(--danger)" background="var(--danger-soft)">
          Connect KIET on the dashboard first.
        </Notice>
      </div>
    );
  }

  const activeClasses = mode === "today" ? todayClasses : yesterdayClasses;
  const totalClasses = activeClasses.length;
  const presentCount = activeClasses.filter(c => String(c.attendanceStatus).toUpperCase() === "PRESENT").length;
  const absentCount = activeClasses.filter(c => String(c.attendanceStatus).toUpperCase() === "ABSENT").length;
  const notMarkedCount = activeClasses.filter(c => (!c.attendanceStatus || String(c.attendanceStatus).toUpperCase() === "NULL") && !c.isLoading && !c.error).length;
  
  return (
    <div className="rise-in" style={{ display: "grid", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "grid", gap: 4 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: "var(--text-primary)" }}>
            {mode === "today" ? "Today's attendance" : `Yesterday (${formatDisplayDate(getPreviousWorkingDay(new Date()))})`}
          </h1>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 15 }}>
            {mode === "today" ? "Check what's marked and what's missing." : "Review what was marked yesterday."}
          </p>
        </div>
        <button 
           className="action-button action-button--secondary"
           onClick={() => fetchDailyData(mode, true)}
           disabled={isLoadingSchedule}
           style={{ ...secondaryButtonStyle, opacity: isLoadingSchedule ? 0.7 : 1 }}
        >
          {isLoadingSchedule ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, padding: 4, background: "var(--bg-secondary)", borderRadius: 12, width: "fit-content" }}>
        <button
          onClick={() => handleModeChange("today")}
          style={{
             padding: "8px 16px",
             borderRadius: 8,
             border: "none",
             fontWeight: 600,
             fontSize: 14,
             cursor: "pointer",
             background: mode === "today" ? "var(--bg-primary)" : "transparent",
             color: mode === "today" ? "var(--text-primary)" : "var(--text-muted)",
             boxShadow: mode === "today" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
             transition: "all 0.2s ease"
          }}
        >
          Today
        </button>
        <button
          onClick={() => handleModeChange("yesterday")}
          style={{
             padding: "8px 16px",
             borderRadius: 8,
             border: "none",
             fontWeight: 600,
             fontSize: 14,
             cursor: "pointer",
             background: mode === "yesterday" ? "var(--bg-primary)" : "transparent",
             color: mode === "yesterday" ? "var(--text-primary)" : "var(--text-muted)",
             boxShadow: mode === "yesterday" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
             transition: "all 0.2s ease"
          }}
        >
          Yesterday
        </button>
      </div>

      {scheduleError && (
        <Notice tone="var(--danger)" background="var(--danger-soft)">{scheduleError}</Notice>
      )}

      {!isLoadingSchedule && totalClasses === 0 && !scheduleError && (() => {
        const targetDateObj = mode === "today" ? new Date() : getPreviousWorkingDay(new Date());
        const targetDateIso = formatIsoDate(targetDateObj);
        const holidayReason = GLOBAL_HOLIDAYS[targetDateIso];
        const matchingExamSlots = studentExamInfo?.examSlots?.filter((slot) => slot.date === targetDateIso) ?? [];

        if (holidayReason) {
          return (
            <Panel title="College Off / No Classes" subtitle={holidayReason}>
              <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 16 }}>
                🎉 <strong>{holidayReason}</strong> ({formatDisplayDate(targetDateObj)}). No lectures are scheduled for this day.
              </div>
            </Panel>
          );
        }

        if (matchingExamSlots.length > 0) {
          return (
            <Panel title="📝 MSE 2 Examination Day" subtitle={`Scheduled exams for ${formatDisplayDate(targetDateObj)}`}>
              <div style={{ display: "grid", gap: 12, padding: "8px 0" }}>
                {matchingExamSlots.map((slot, idx) => (
                  <div
                    key={idx}
                    className="standard-card border-l-primary"
                    style={{ padding: 16, display: "grid", gap: 6 }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                      <span style={{ fontWeight: 800, fontSize: 16, color: "var(--text-primary)" }}>
                        {slot.subjectName}
                      </span>
                      <span className="status-badge status-badge--info">
                        {slot.subjectCode}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 16, color: "var(--text-muted)", fontSize: 13.5, flexWrap: "wrap" }}>
                      <span>⏰ <strong>{slot.time}</strong></span>
                      {slot.mode && <span>📋 {slot.mode}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          );
        }

        return (
          <Panel title={`No classes ${mode}`} subtitle={`Nothing is scheduled for ${mode}.`}>
            <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 16 }}>
              You're all clear for {mode}.
            </div>
          </Panel>
        );
      })()}

      {totalClasses > 0 && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
            <StatusCard title="Classes" value={String(totalClasses)} tone="var(--text-primary)" />
            <StatusCard title="Present" value={String(presentCount)} tone="var(--success)" />
            <StatusCard title="Absent" value={String(absentCount)} tone="var(--danger)" />
            <StatusCard title="Not marked" value={String(notMarkedCount)} tone="var(--warning)" />
          </div>

          {(absentCount > 0 || notMarkedCount > 0) && (
            <div className={`standard-card ${absentCount > 0 ? 'border-l-danger' : 'border-l-warning'}`} style={{ padding: 16 }}>
              <h3 style={{ margin: "0 0 8px 0", color: absentCount > 0 ? "var(--danger)" : "var(--warning)", fontSize: 16 }}>Needs attention</h3>
              <ul style={{ margin: 0, paddingLeft: 20, color: absentCount > 0 ? "var(--danger)" : "var(--warning)" }}>
                {absentCount > 0 && <li>{absentCount} class{absentCount > 1 ? "es" : ""} marked absent.</li>}
                {notMarkedCount > 0 && <li>{notMarkedCount} class{notMarkedCount > 1 ? "es" : ""} not yet marked.</li>}
              </ul>
            </div>
          )}

          <Panel title={`${mode === "today" ? "Today's" : "Yesterday's"} classes`} subtitle="See what is marked for each class.">
            <div style={{ display: "grid", gap: 12 }}>
              {activeClasses.map((tc, idx) => {
                 let statusDisplay = "Not marked";
                 let statusTheme = {
                   background: "var(--warning-soft)",
                   color: "var(--warning)",
                 };
                 
                 const currentStatus = String(tc.attendanceStatus).toUpperCase();

              if (tc.isLoading) {
                    statusDisplay = "Loading";
                    statusTheme = {
                      background: "var(--secondary-soft)",
                      color: "var(--secondary)",
                    };
                 } else if (tc.error) {
                    statusDisplay = "Couldn't load";
                    statusTheme = {
                      background: "var(--danger-soft)",
                      color: "var(--danger)",
                    };
                 } else if (currentStatus === "PRESENT") {
                    statusDisplay = "Present";
                    statusTheme = {
                      background: "var(--success-soft)",
                      color: "var(--success)",
                    };
                 } else if (currentStatus === "ABSENT") {
                    statusDisplay = "Absent";
                    statusTheme = {
                      background: "var(--danger-soft)",
                      color: "var(--danger)",
                    };
                 } else if (currentStatus === "ADJUSTED") {
                    statusDisplay = "Adjusted";
                    statusTheme = {
                      background: "var(--warning-soft)",
                      color: "var(--warning)",
                    };
                 } else if (!tc.courseId || !tc.courseComponentId) {
                    statusDisplay = "Unavailable";
                    statusTheme = {
                      background: "var(--secondary-soft)",
                      color: "var(--secondary)",
                    };
                 }

                 const statusBadgeClass = tc.isLoading
                   ? "status-badge status-badge--neutral"
                   : tc.error
                     ? "status-badge status-badge--danger"
                     : currentStatus === "PRESENT"
                       ? "status-badge status-badge--success"
                       : currentStatus === "ABSENT"
                         ? "status-badge status-badge--danger"
                         : currentStatus === "ADJUSTED"
                           ? "status-badge status-badge--warning"
                           : !tc.courseId || !tc.courseComponentId
                             ? "status-badge status-badge--neutral"
                             : "status-badge status-badge--warning";

                 return (
                   <div key={idx} className="standard-card interactive-row" style={{ 
                     display: "flex", 
                     justifyContent: "space-between", 
                     alignItems: "center",
                     flexWrap: "wrap",
                     gap: 12
                   }}>
                     <div style={{ display: "grid", gap: 4 }}>
                       <div
                         style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary)" }}
                       >
                         {tc.entry.courseName || tc.entry.title}
                       </div>
                       <div style={{ fontSize: 14, color: "var(--text-muted)" }}>
                          {formatScheduleTime(tc.entry.start)} - {formatScheduleTime(tc.entry.end)} - {tc.entry.courseCode} - {tc.entry.courseCompName}
                       </div>
                     </div>
                     <div
                        className={statusBadgeClass}
                        style={{
                        padding: "6px 12px",
                        borderRadius: 999,
                        background: statusTheme.background,
                        color: statusTheme.color,
                        fontWeight: 700,
                        fontSize: 14,
                        whiteSpace: "nowrap"
                     }}
                     >
                       {statusDisplay}
                     </div>
                   </div>
                 );
              })}
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
