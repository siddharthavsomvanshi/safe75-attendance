import React from "react";
import { Panel, EmptyMessage } from "../components/UI";
import { Clock, MapPin, User } from "../components/Icons";
import type { ScheduleEntry } from "../types/kiet";
import type { StudentExamInfo } from "../data/mse2Datesheet";
import { formatScheduleDay, formatScheduleTime, parseKietDateTime } from "../utils/date";

export interface CalendarData {
  upcomingClasses: ScheduleEntry[];
  currentWeekFullClasses: ScheduleEntry[];
  studentExamInfo?: StudentExamInfo | null;
}

export function CalendarPage({ data }: { data: CalendarData }) {
  const groupedClasses = data.currentWeekFullClasses.reduce((acc, cls) => {
    const dayLabel = formatScheduleDay(cls.start);
    if (!acc[dayLabel]) acc[dayLabel] = [];
    acc[dayLabel].push(cls);
    return acc;
  }, {} as Record<string, ScheduleEntry[]>);

  const dayLabels = Object.keys(groupedClasses);
  dayLabels.sort((a, b) => {
    return parseKietDateTime(groupedClasses[a][0].start).getTime() - parseKietDateTime(groupedClasses[b][0].start).getTime();
  });

  return (
    <section style={{ display: "grid", gap: 14 }}>
      <Panel
        title="Weekly Timetable"
        subtitle="Your complete schedule for the current week."
      >
        {dayLabels.length === 0 ? (
          <EmptyMessage message="No classes found for this week." />
        ) : (
          <div className="schedule-scroll-container">
            <div style={{ display: "flex", gap: 14, minWidth: "max-content", paddingBottom: 6 }}>
              {dayLabels.map((dayLabel) => {
                const [weekday, datePart] = dayLabel.split(",");

                return (
                  <div key={dayLabel} className="schedule-day-column" style={{ width: 280, display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ 
                      fontWeight: 700, 
                      fontSize: 14, 
                      color: "var(--text-primary)",
                      borderBottom: "1.5px solid var(--border)", 
                      paddingBottom: 8, 
                      marginBottom: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between"
                    }}>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>{weekday}</span>
                      {datePart && (
                        <span className="status-badge status-badge--neutral" style={{ fontSize: 11, padding: "2px 6px" }}>
                          {datePart.trim()}
                        </span>
                      )}
                    </div>
                    
                    {groupedClasses[dayLabel].map((entry) => (
                      <div
                        className="standard-card schedule-reference-card interactive-row"
                        key={`${entry.courseCode ?? "holiday"}-${entry.start}-${entry.end}`}
                        style={{
                          display: "grid",
                          gap: 6,
                          padding: "12px 14px",
                          borderRadius: 10,
                          border: "1px solid var(--border)",
                          background: "var(--bg-card)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 10,
                            alignItems: "start",
                          }}
                        >
                          <div style={{ display: "grid", gap: 2 }}>
                            <strong style={{ lineHeight: 1.3, fontSize: 14, color: "var(--text-primary)" }}>
                              {entry.courseName ?? entry.title}
                            </strong>
                            <div style={{ color: "var(--text-secondary)", fontSize: 12, fontWeight: 500 }}>
                              {(entry.courseCode ?? "NA") + " • " + (entry.courseCompName ?? "CLASS")}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--text-muted)", fontSize: 12, fontWeight: 500, marginTop: 2 }}>
                          <Clock size={12} style={{ color: "var(--primary)" }} />
                          <span>{formatScheduleTime(entry.start)} - {formatScheduleTime(entry.end)}</span>
                        </div>
                        
                        <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 2 }}>
                          {entry.classRoom && (
                            <div style={{ color: "var(--text-secondary)", fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}>
                              <MapPin size={12} style={{ color: "var(--text-muted)" }} />
                              <span>{entry.classRoom}</span>
                            </div>
                          )}
                          <div style={{ color: "var(--text-secondary)", fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}>
                            <User size={12} style={{ color: "var(--text-muted)" }} />
                            <span>{entry.facultyName || "Faculty unavailable"}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Panel>
    </section>
  );
}
