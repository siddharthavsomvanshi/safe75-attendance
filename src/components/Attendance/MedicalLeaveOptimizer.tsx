import React, { useMemo, useState } from "react";
import type { OverallSummary, SubjectSummary } from "../../utils/attendanceCalculations";
import type { DayStreakRecord, SubjectAbsencesByDate } from "../../utils/streak";
import {
  findOptimalMedicalLeaveWindows,
  formatMedicalApplicationNote,
  MedicalLeaveAlternative,
} from "../../utils/medicalLeaveOptimizer";
import { EmptyMessage } from "../UI";

export interface MedicalLeaveOptimizerProps {
  streakDayData: Record<string, DayStreakRecord>;
  streakSubjectAbsencesByDate: SubjectAbsencesByDate;
  subjectSummaries: SubjectSummary[];
  overallSummary: OverallSummary | null;
  streakLoading: boolean;
  studentName?: string;
  registrationNumber?: string;
  activeStartDate?: string;
  activeEndDate?: string;
  onApplyWindow: (startDate: string, endDate: string) => void;
}

export function MedicalLeaveOptimizer({
  streakDayData,
  streakSubjectAbsencesByDate,
  subjectSummaries,
  overallSummary,
  streakLoading,
  studentName,
  registrationNumber,
  activeStartDate,
  activeEndDate,
  onApplyWindow,
}: MedicalLeaveOptimizerProps) {
  // Configurable options
  const [targetAttendance, setTargetAttendance] = useState<number | null>(75);
  const [lookbackDays, setLookbackDays] = useState<number>(45);
  const [maxConsecutiveDays, setMaxConsecutiveDays] = useState<number>(7);
  const [expandedAlternativeId, setExpandedAlternativeId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Compute alternatives using our algorithm
  const alternatives = useMemo(() => {
    return findOptimalMedicalLeaveWindows({
      streakDayData,
      streakSubjectAbsencesByDate,
      subjectSummaries,
      overallSummary,
      options: {
        targetPercentage: targetAttendance,
        lookbackDays,
        maxConsecutiveDays,
        minConsecutiveDays: 2,
        maxAlternatives: 4,
      },
    });
  }, [
    streakDayData,
    streakSubjectAbsencesByDate,
    subjectSummaries,
    overallSummary,
    targetAttendance,
    lookbackDays,
    maxConsecutiveDays,
  ]);

  const currentPercentage = overallSummary?.percentage ?? 0;
  const currentPresent = overallSummary?.present ?? 0;
  const currentTotal = overallSummary?.total ?? 0;

  // Needed classes to reach target
  const targetRequiredClasses = useMemo(() => {
    if (!targetAttendance || currentTotal === 0) return 0;
    const targetRatio = targetAttendance / 100;
    // targetRatio <= (currentPresent + X) / currentTotal => X >= targetRatio * currentTotal - currentPresent
    const needed = Math.ceil(targetRatio * currentTotal - currentPresent);
    return Math.max(0, needed);
  }, [targetAttendance, currentPresent, currentTotal]);

  const handleCopyNote = (alt: MedicalLeaveAlternative) => {
    const note = formatMedicalApplicationNote({
      alternative: alt,
      studentName,
      registrationNumber,
    });
    navigator.clipboard.writeText(note).then(() => {
      setCopiedId(alt.id);
      setTimeout(() => setCopiedId(null), 2500);
    });
  };

  const getBadgeStyle = (variant: string) => {
    switch (variant) {
      case "primary":
        return {
          background: "var(--primary)",
          color: "var(--text-on-primary)",
        };
      case "success":
        return {
          background: "var(--success-soft)",
          color: "var(--success)",
          border: "1px solid var(--success)",
        };
      case "warning":
        return {
          background: "var(--warning-soft)",
          color: "var(--warning)",
          border: "1px solid var(--warning)",
        };
      case "info":
        return {
          background: "var(--info-soft)",
          color: "var(--info)",
          border: "1px solid var(--info)",
        };
      default:
        return {
          background: "var(--secondary-soft)",
          color: "var(--secondary)",
        };
    }
  };

  if (streakLoading && Object.keys(streakDayData).length === 0) {
    return (
      <div style={{ padding: "20px 0" }}>
        <EmptyMessage message="Scanning attendance history for consecutive absence gaps..." />
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* Interactive Controls & Filters */}
      <div
        className="surface-card"
        style={{
          display: "grid",
          gap: 16,
          padding: 18,
          borderRadius: 20,
          border: "1px solid var(--border)",
          background: "var(--bg-card-subtle)",
        }}
      >
        {/* Row 1: Target Attendance Selection */}
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <label style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>
              🎯 Target Overall Attendance
            </label>
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              Current: <strong style={{ color: currentPercentage >= 75 ? "var(--success)" : "var(--danger)" }}>{currentPercentage.toFixed(1)}%</strong>
              {targetAttendance && currentPercentage < targetAttendance && targetRequiredClasses > 0 && (
                <span> (Needs ~{targetRequiredClasses} missed classes recovered)</span>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {[
              { label: "75% (Safe Criteria)", value: 75 },
              { label: "80% (First Class)", value: 80 },
              { label: "85% (Distinction)", value: 85 },
              { label: "Max Boost (No Target)", value: null },
            ].map((option) => {
              const isSelected = targetAttendance === option.value;
              return (
                <button
                  key={String(option.value)}
                  type="button"
                  onClick={() => setTargetAttendance(option.value)}
                  style={{
                    padding: "7px 14px",
                    borderRadius: 999,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    border: `1.5px solid ${isSelected ? "var(--primary)" : "var(--border)"}`,
                    background: isSelected ? "var(--primary-soft)" : "var(--bg-card)",
                    color: isSelected ? "var(--primary)" : "var(--text-secondary)",
                    transition: "all 0.15s ease",
                  }}
                >
                  {option.label}
                </button>
              );
            })}

            {/* Custom Target Number Input */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Custom:</span>
              <input
                type="number"
                min="50"
                max="99"
                value={targetAttendance ?? ""}
                placeholder="75"
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setTargetAttendance(isNaN(val) ? null : val);
                }}
                style={{
                  width: 60,
                  padding: "5px 8px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--bg-card)",
                  color: "var(--text-primary)",
                  fontSize: 13,
                  fontWeight: 700,
                  textAlign: "center",
                }}
              />
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)" }}>%</span>
            </div>
          </div>
        </div>

        {/* Row 2: Secondary Constraints (Lookback & Max Certificate Length) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 14,
            paddingTop: 12,
            borderTop: "1px solid var(--border)",
          }}
        >
          {/* Lookback Window */}
          <div style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>
              📅 History Lookback Window
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              {[
                { label: "Last 30 Days", val: 30 },
                { label: "Last 45 Days", val: 45 },
                { label: "Last 60 Days", val: 60 },
              ].map((item) => (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => setLookbackDays(item.val)}
                  style={{
                    flex: 1,
                    padding: "5px 10px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    border: `1px solid ${lookbackDays === item.val ? "var(--primary)" : "var(--border)"}`,
                    background: lookbackDays === item.val ? "var(--primary-soft)" : "var(--bg-card)",
                    color: lookbackDays === item.val ? "var(--primary)" : "var(--text-secondary)",
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Max Certificate Duration */}
          <div style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>
              🏥 Max Certificate Duration
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              {[
                { label: "Up to 3 Days", val: 3 },
                { label: "Up to 5 Days", val: 5 },
                { label: "Up to 7 Days", val: 7 },
                { label: "All Spans", val: 30 },
              ].map((item) => (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => setMaxConsecutiveDays(item.val)}
                  style={{
                    flex: 1,
                    padding: "5px 8px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    border: `1px solid ${maxConsecutiveDays === item.val ? "var(--primary)" : "var(--border)"}`,
                    background: maxConsecutiveDays === item.val ? "var(--primary-soft)" : "var(--bg-card)",
                    color: maxConsecutiveDays === item.val ? "var(--primary)" : "var(--text-secondary)",
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Alternative Recommendations List */}
      {alternatives.length === 0 ? (
        <EmptyMessage message="No consecutive absence gaps found matching these filters. Try expanding the lookback window or certificate duration." />
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: "var(--text-primary)" }}>
              ✨ Recommended Medical Leave Windows ({alternatives.length} Alternatives)
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
              Ranked by consecutive absence density & attendance boost
            </div>
          </div>

          <div style={{ display: "grid", gap: 14 }}>
            {alternatives.map((alt, index) => {
              const isSelected = activeStartDate === alt.startDate && activeEndDate === alt.endDate;
              const isExpanded = expandedAlternativeId === alt.id;
              const badgeStyle = getBadgeStyle(alt.badge.variant);

              return (
                <div
                  key={alt.id}
                  className={`standard-card rise-in ${isSelected ? "surface-card--highlight" : ""}`}
                  style={{
                    borderRadius: 18,
                    padding: 18,
                    border: isSelected ? "2px solid var(--primary)" : "1px solid var(--border)",
                    background: isSelected ? "var(--primary-soft)" : "var(--bg-card)",
                    display: "grid",
                    gap: 14,
                    transition: "all 0.2s ease",
                  }}
                >
                  {/* Top Bar: Option label, Badge, & Duration */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                    <div style={{ display: "grid", gap: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 800,
                            padding: "3px 8px",
                            borderRadius: 6,
                            background: "var(--secondary-soft)",
                            color: "var(--text-secondary)",
                          }}
                        >
                          Option {index + 1}
                        </span>
                        <strong style={{ fontSize: 18, color: "var(--text-primary)" }}>
                          {alt.label}
                        </strong>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            padding: "3px 10px",
                            borderRadius: 999,
                            ...badgeStyle,
                          }}
                        >
                          {alt.badge.label}
                        </span>
                      </div>
                      <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                        {alt.fullLabel} • <strong>{alt.calendarDays} calendar days</strong> ({alt.classDaysCount} instruction days)
                      </div>
                    </div>

                    {/* Target / Threshold Pill */}
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {alt.reachesTarget ? (
                        <span
                          className="status-badge"
                          style={{
                            padding: "6px 12px",
                            borderRadius: 999,
                            background: "var(--success-soft)",
                            color: "var(--success)",
                            fontWeight: 800,
                            fontSize: 12,
                          }}
                        >
                          🎯 Reaches {alt.targetPercentage}% Target!
                        </span>
                      ) : alt.rescuesOverall ? (
                        <span
                          className="status-badge"
                          style={{
                            padding: "6px 12px",
                            borderRadius: 999,
                            background: "var(--info-soft)",
                            color: "var(--info)",
                            fontWeight: 800,
                            fontSize: 12,
                          }}
                        >
                          🛡️ Crosses 75% Safe Line!
                        </span>
                      ) : (
                        <span
                          className="status-badge"
                          style={{
                            padding: "6px 12px",
                            borderRadius: 999,
                            background: "var(--warning-soft)",
                            color: "var(--warning)",
                            fontWeight: 700,
                            fontSize: 12,
                          }}
                        >
                          +{alt.percentageGain.toFixed(1)}% Boost
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Impact Highlights Grid */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                      gap: 10,
                      padding: "12px 14px",
                      borderRadius: 14,
                      background: isSelected ? "var(--bg-card)" : "var(--bg-card-subtle)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                        New Attendance
                      </div>
                      <div style={{ fontSize: 17, fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "baseline", gap: 6 }}>
                        <span>{alt.projectedPercentage.toFixed(1)}%</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--success)" }}>
                          (+{alt.percentageGain.toFixed(1)}%)
                        </span>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                        Classes Recovered
                      </div>
                      <div style={{ fontSize: 17, fontWeight: 800, color: "var(--primary)" }}>
                        +{alt.missedClassesRecovered} classes
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                        Saved Subjects
                      </div>
                      <div style={{ fontSize: 17, fontWeight: 800, color: alt.rescuedSubjectsCount > 0 ? "var(--success)" : "var(--text-secondary)" }}>
                        {alt.rescuedSubjectsCount > 0 ? `${alt.rescuedSubjectsCount} rescued ≥75%` : "Safe margin up"}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                        Absence Density
                      </div>
                      <div style={{ fontSize: 17, fontWeight: 800, color: "var(--text-secondary)" }}>
                        {alt.efficiency.toFixed(1)} classes/day
                      </div>
                    </div>
                  </div>

                  {/* Actions & Detail Toggle */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() => onApplyWindow(alt.startDate, alt.endDate)}
                        style={{
                          padding: "8px 16px",
                          borderRadius: 10,
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: "pointer",
                          border: "none",
                          background: isSelected ? "var(--success)" : "var(--primary)",
                          color: "var(--text-on-primary)",
                          boxShadow: "var(--shadow-xs)",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {isSelected ? "✓ Active in Preview" : "👉 Apply This Window"}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyNote(alt)}
                        style={{
                          padding: "8px 14px",
                          borderRadius: 10,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                          border: "1px solid var(--border)",
                          background: "var(--bg-card)",
                          color: "var(--text-secondary)",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {copiedId === alt.id ? "✓ Copied Note!" : "📋 Copy Leave Note"}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedAlternativeId(isExpanded ? null : alt.id)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        border: "none",
                        background: "transparent",
                        color: "var(--primary)",
                      }}
                    >
                      {isExpanded ? "Hide Breakdown ▲" : "View Breakdown ▼"}
                    </button>
                  </div>

                  {/* Expanded Breakdown Accordion */}
                  {isExpanded && (
                    <div
                      style={{
                        display: "grid",
                        gap: 14,
                        paddingTop: 12,
                        borderTop: "1px dashed var(--border)",
                      }}
                    >
                      {/* Day-by-Day Absences */}
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "var(--text-primary)" }}>
                          📅 Daily Absences in This Consecutive Window:
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {alt.dailyBreakdown.map((day) => (
                            <div
                              key={day.dateKey}
                              style={{
                                padding: "6px 10px",
                                borderRadius: 8,
                                background: day.missed > 0 ? "var(--danger-soft)" : "var(--bg-card)",
                                border: `1px solid ${day.missed > 0 ? "var(--danger)" : "var(--border)"}`,
                                fontSize: 12,
                                display: "grid",
                                gap: 2,
                              }}
                            >
                              <strong>{day.label} ({day.weekday})</strong>
                              <span style={{ color: day.missed > 0 ? "var(--danger)" : "var(--text-muted)" }}>
                                {day.missed > 0 ? `Missed ${day.missed} of ${day.total}` : "Attended all"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Subject-Wise Recovery */}
                      {alt.subjectImpacts.length > 0 && (
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "var(--text-primary)" }}>
                            📚 Subject-Wise Recovery:
                          </div>
                          <div style={{ display: "grid", gap: 6 }}>
                            {alt.subjectImpacts.map((subj) => (
                              <div
                                key={subj.id}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  padding: "6px 10px",
                                  borderRadius: 8,
                                  background: subj.rescued ? "var(--success-soft)" : "var(--bg-card)",
                                  border: `1px solid ${subj.rescued ? "var(--success)" : "var(--border)"}`,
                                  fontSize: 12,
                                }}
                              >
                                <span style={{ fontWeight: 600 }}>
                                  {subj.title} <span style={{ color: "var(--text-muted)" }}>({subj.courseCode || subj.componentName})</span>
                                </span>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <span style={{ color: "var(--primary)", fontWeight: 700 }}>
                                    +{subj.missedRecovered} present
                                  </span>
                                  <span>
                                    {subj.currentPercentage.toFixed(1)}% → <strong>{subj.newPercentage.toFixed(1)}%</strong>
                                  </span>
                                  {subj.rescued && (
                                    <span style={{ color: "var(--success)", fontWeight: 800 }}>
                                      RESCUED ≥75%
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
