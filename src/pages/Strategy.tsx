import React, { useMemo, useState, useEffect } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import {
  ProgressBar,
  Metric,
  RecoveryNote,
  secondaryButtonStyle,
} from "../App";
import { Panel, EmptyMessage } from "../components/UI";
import { RedemptionArc } from "../components/Attendance/RedemptionArc";
import { MedicalLeaveOptimizer } from "../components/Attendance/MedicalLeaveOptimizer";
import {
  Sparkles,
  Calendar,
  Target,
  Stethoscope,
  TrendingUp,
  ChevronDown,
  ChevronUp,
} from "../components/Icons";
import type {
  OverallSummary,
  BunkableDay,
  SubjectSummary,
  WholeDayPlanSummary,
  StudentContext,
} from "../App";
import type { StudentDetails } from "../types/kiet";
import type { DayStreakRecord, SubjectAbsencesByDate } from "../utils/streak";

function formatDateKeyLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(year, month - 1, day));
}

function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type LeaveRescueIntensity = "high" | "medium" | "low";

type LeaveRescueDay = {
  dateKey: string;
  label: string;
  total: number;
  attended: number;
  missed: number;
  intensity: LeaveRescueIntensity;
};

type LeaveRescueImpactSubject = {
  id: string;
  title: string;
  courseCode: string;
  componentName: string;
  oldPercentage: number;
  newPercentage: number;
  total: number;
  oldPresent: number;
  newPresent: number;
  addedPresent: number;
  wasRisky: boolean;
  crossesThreshold: boolean;
  stillRisky: boolean;
};

type LeaveRescueImpactSummary = {
  oldPercentage: number;
  newPercentage: number;
  oldPresent: number;
  newPresent: number;
  total: number;
  addedPresent: number;
  impactedSubjects: LeaveRescueImpactSubject[];
  unchangedSubjectsCount: number;
  crossesThresholdCount: number;
  stillRiskyCount: number;
};

function getLeaveRescueIntensity(missed: number): LeaveRescueIntensity {
  if (missed >= 4) {
    return "high";
  }

  if (missed >= 2) {
    return "medium";
  }

  return "low";
}

function getLeaveRescueTheme(intensity: LeaveRescueIntensity) {
  if (intensity === "high") {
    return {
      label: "High impact",
      color: "var(--danger)",
      borderClass: "border-l-danger",
      badgeBackground: "var(--danger-soft)",
    };
  }

  if (intensity === "medium") {
    return {
      label: "Medium impact",
      color: "var(--warning)",
      borderClass: "border-l-warning",
      badgeBackground: "var(--warning-soft)",
    };
  }

  return {
    label: "Low impact",
    color: "var(--success)",
    borderClass: "border-l-success",
    badgeBackground: "var(--success-soft)",
  };
}

function getAttendanceSubjectKey(
  subject: Pick<SubjectSummary, "courseId" | "courseComponentId">,
): string {
  return `${subject.courseId}:${subject.courseComponentId}`;
}

function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

function getLeaveRescueImpactTheme(subject: LeaveRescueImpactSubject) {
  if (subject.crossesThreshold) {
    return {
      label: "Now safe",
      color: "var(--success)",
      borderClass: "border-l-success",
      border: "1px solid var(--border)",
      background: "var(--bg-card)",
      badgeBackground: "var(--success-soft)",
    };
  }

  if (subject.stillRisky) {
    return {
      label: "Still risky",
      color: "var(--warning)",
      borderClass: "border-l-warning",
      border: "1px solid var(--border)",
      background: "var(--bg-card)",
      badgeBackground: "var(--warning-soft)",
    };
  }

  return {
    label: "Improved",
    color: "var(--primary)",
    borderClass: "border-l-primary",
    border: "1px solid var(--border)",
    background: "var(--bg-card)",
    badgeBackground: "var(--primary-soft)",
  };
}

export interface StrategyData {
  bunkableDays: BunkableDay[];
  selectedBunkDates: Set<string>;
  selectedBunkCutoffDateKey: string | null;
  overallWholeDayPlan: WholeDayPlanSummary | null;
  wholeDayPlanSummaries: WholeDayPlanSummary[];
  overallSummary: OverallSummary | null;
  subjectSummaries: SubjectSummary[];
  streakDayData: Record<string, DayStreakRecord>;
  streakSubjectAbsencesByDate: SubjectAbsencesByDate;
  streakLoading: boolean;
  streakIsReliable: boolean;
  isSyncingFuture?: boolean;
  studentDetails?: StudentDetails | null;
  studentContext?: StudentContext | null;
}

export interface StrategyHandlers {
  handleWholeDayToggle: (dateKey: string) => void;
}

/* =========================================================================
   COMPACT MASTER-DETAIL SUBJECT TABLE (SOLUTION 2)
   ========================================================================= */

function CompactBunkSubjectTable({
  subjects,
  cutoffDateKey,
}: {
  subjects: WholeDayPlanSummary[];
  cutoffDateKey: string | null;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
          padding: "2px 0",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
          Subject Breakdown ({subjects.length})
        </div>
        <div
          style={{
            display: "flex",
            gap: 4,
            background: "var(--bg-section)",
            padding: 3,
            borderRadius: 8,
            border: "1px solid var(--border)",
          }}
        >
          <button
            type="button"
            onClick={() => setViewMode("table")}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              border: "none",
              fontSize: 11.5,
              fontWeight: viewMode === "table" ? 650 : 500,
              cursor: "pointer",
              background: viewMode === "table" ? "var(--bg-card)" : "transparent",
              color: viewMode === "table" ? "var(--text-primary)" : "var(--text-muted)",
              boxShadow: viewMode === "table" ? "var(--shadow-xs)" : "none",
            }}
          >
            Compact Table
          </button>
          <button
            type="button"
            onClick={() => setViewMode("cards")}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              border: "none",
              fontSize: 11.5,
              fontWeight: viewMode === "cards" ? 650 : 500,
              cursor: "pointer",
              background: viewMode === "cards" ? "var(--bg-card)" : "transparent",
              color: viewMode === "cards" ? "var(--text-primary)" : "var(--text-muted)",
              boxShadow: viewMode === "cards" ? "var(--shadow-xs)" : "none",
            }}
          >
            Cards Grid
          </button>
        </div>
      </div>

      {viewMode === "table" ? (
        <div
          style={{
            display: "grid",
            gap: 6,
            maxHeight: 520,
            overflowY: "auto",
            paddingRight: 4,
          }}
        >
          {subjects.map((subject) => {
            const isExpanded = expandedId === subject.id;
            const delta = subject.afterSelectedPercentage - subject.currentPercentage;
            const isSafe = subject.afterSelectedPercentage >= 75;
            const isRecoverable = !isSafe && subject.recovery.status === "recoverable";
            const borderClass = isSafe
              ? "border-l-success"
              : isRecoverable
              ? "border-l-warning"
              : "border-l-danger";

            return (
              <div
                key={`bunk-row-${subject.id}`}
                className={`standard-card interactive-row ${borderClass}`}
                style={{
                  display: "grid",
                  gap: isExpanded ? 10 : 0,
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: isExpanded ? "var(--bg-card-subtle)" : "var(--bg-card)",
                  transition: "all 0.15s ease",
                  cursor: "pointer",
                }}
                onClick={() => toggleExpand(subject.id)}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 10,
                  }}
                >
                  {/* Left: Subject Identity */}
                  <div style={{ display: "grid", gap: 2, minWidth: 150, flex: "1 1 180px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          padding: "1px 6px",
                          borderRadius: 4,
                          background: "var(--bg-section)",
                          color: "var(--text-muted)",
                        }}
                      >
                        {subject.courseCode}
                      </span>
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 600,
                          color: "var(--text-muted)",
                          textTransform: "uppercase",
                        }}
                      >
                        {subject.componentName}
                      </span>
                    </div>
                    <div
                      style={{
                        fontWeight: 650,
                        fontSize: 13.5,
                        color: "var(--text-primary)",
                        lineHeight: 1.3,
                      }}
                    >
                      {subject.title}
                    </div>
                  </div>

                  {/* Middle / Right: Percentage & Status */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      flexWrap: "wrap",
                      marginLeft: "auto",
                    }}
                  >
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 13.5,
                          color: isSafe ? "var(--success)" : "var(--danger)",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {subject.currentPercentage.toFixed(1)}% → {subject.afterSelectedPercentage.toFixed(1)}%
                      </div>
                      <div
                        style={{
                          fontSize: 11.5,
                          color: "var(--text-muted)",
                          display: "flex",
                          gap: 6,
                          justifyContent: "flex-end",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        <span style={{ color: delta < 0 ? "var(--danger)" : "var(--text-muted)" }}>
                          {delta > 0 ? `+${delta.toFixed(1)}%` : `${delta.toFixed(1)}%`}
                        </span>
                        <span>•</span>
                        <span>{subject.selectedClassCount} missed</span>
                      </div>
                    </div>

                    <span
                      className={`status-badge ${
                        isSafe
                          ? "status-badge--success"
                          : isRecoverable
                          ? "status-badge--warning"
                          : "status-badge--danger"
                      }`}
                      style={{
                        minWidth: 76,
                        textAlign: "center",
                        fontSize: 11,
                        padding: "3px 8px",
                      }}
                    >
                      {isSafe ? "Safe ≥75%" : isRecoverable ? "Recoverable" : "Drops <75%"}
                    </span>

                    <button
                      type="button"
                      aria-label={isExpanded ? "Collapse details" : "Expand details"}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                        padding: 2,
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Detailed Area */}
                {isExpanded && (
                  <div
                    style={{
                      display: "grid",
                      gap: 10,
                      paddingTop: 10,
                      borderTop: "1px solid var(--border)",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ProgressBar
                      label="Current Standing"
                      percentage={subject.currentPercentage}
                      healthy={subject.currentPercentage >= 75}
                    />
                    <ProgressBar
                      label={`After Selected Bunks (${subject.selectedClassCount} missed)`}
                      percentage={subject.afterSelectedPercentage}
                      healthy={subject.afterSelectedPercentage >= 75}
                    />

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
                        gap: 8,
                      }}
                    >
                      <Metric
                        label="Projected Present"
                        value={`${subject.afterSelectedPresent}/${subject.afterSelectedTotal}`}
                      />
                      <Metric
                        label="Missed Bunks"
                        value={String(subject.selectedClassCount)}
                      />
                      <Metric
                        label="Attended Future"
                        value={String(subject.attendedClassCount)}
                      />
                    </div>

                    <RecoveryNote
                      recovery={subject.recovery}
                      cutoffDateKey={cutoffDateKey}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Full cards grid if user toggles view */
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 10,
            maxHeight: 620,
            overflowY: "auto",
            paddingRight: 4,
          }}
        >
          {subjects.map((subject) => (
            <div
              className="standard-card rise-in"
              key={`whole-day-${subject.id}`}
              style={{
                display: "grid",
                gap: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "baseline",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>{subject.title}</div>
                  <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
                    {subject.courseCode} - {subject.componentName}
                  </div>
                </div>
                <div style={{ display: "grid", gap: 4, justifyItems: "end" }}>
                  <strong
                    style={{
                      color:
                        subject.currentPercentage >= 75
                          ? "var(--success)"
                          : "var(--danger)",
                    }}
                  >
                    Current: {subject.currentPercentage.toFixed(1)}%
                  </strong>
                  <span
                    style={{
                      color:
                        subject.afterSelectedPercentage >= 75
                          ? "var(--success)"
                          : "var(--danger)",
                      fontWeight: 700,
                      fontSize: 13,
                    }}
                  >
                    After bunks: {subject.afterSelectedPercentage.toFixed(1)}%
                  </span>
                </div>
              </div>

              <ProgressBar
                label="Current"
                percentage={subject.currentPercentage}
                healthy={subject.currentPercentage >= 75}
              />
              <ProgressBar
                label={`After bunks (${subject.selectedClassCount} missed)`}
                percentage={subject.afterSelectedPercentage}
                healthy={subject.afterSelectedPercentage >= 75}
              />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                  gap: 10,
                  color: "var(--text-secondary)",
                  fontSize: 14,
                }}
              >
                <Metric
                  label="After"
                  value={`${subject.afterSelectedPresent}/${subject.afterSelectedTotal}`}
                />
                <Metric
                  label="Missed"
                  value={String(subject.selectedClassCount)}
                />
                <Metric
                  label="Attended"
                  value={String(subject.attendedClassCount)}
                />
              </div>

              <RecoveryNote
                recovery={subject.recovery}
                cutoffDateKey={cutoffDateKey}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CompactMedicalSubjectTable({
  subjects,
}: {
  subjects: LeaveRescueImpactSubject[];
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div style={{ display: "grid", gap: 6 }}>
      {subjects.map((subject) => {
        const isExpanded = expandedId === subject.id;
        const impactTheme = getLeaveRescueImpactTheme(subject);

        return (
          <div
            key={`medical-table-${subject.id}`}
            className={`standard-card interactive-row ${impactTheme.borderClass}`}
            style={{
              display: "grid",
              gap: isExpanded ? 10 : 0,
              padding: "10px 14px",
              borderRadius: 10,
              background: isExpanded ? "var(--bg-card-subtle)" : "var(--bg-card)",
              transition: "all 0.15s ease",
              cursor: "pointer",
            }}
            onClick={() => toggleExpand(subject.id)}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              {/* Left: Subject Info */}
              <div style={{ display: "grid", gap: 2, minWidth: 150, flex: "1 1 180px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      padding: "1px 6px",
                      borderRadius: 4,
                      background: "var(--bg-section)",
                      color: "var(--text-muted)",
                    }}
                  >
                    {subject.courseCode}
                  </span>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 600,
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                    }}
                  >
                    {subject.componentName}
                  </span>
                </div>
                <div
                  style={{
                    fontWeight: 650,
                    fontSize: 13.5,
                    color: "var(--text-primary)",
                    lineHeight: 1.3,
                  }}
                >
                  {subject.title}
                </div>
              </div>

              {/* Right: Percentage & Status */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                  marginLeft: "auto",
                }}
              >
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 13.5,
                      color: "var(--text-primary)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {formatPercentage(subject.oldPercentage)} → {formatPercentage(subject.newPercentage)}
                  </div>
                  <div style={{ fontSize: 11.5, color: impactTheme.color, fontWeight: 600 }}>
                    +{subject.addedPresent} class{subject.addedPresent === 1 ? "" : "es"} recovered
                  </div>
                </div>

                <span
                  className={`status-badge ${
                    subject.crossesThreshold
                      ? "status-badge--success"
                      : subject.stillRisky
                      ? "status-badge--warning"
                      : "status-badge--info"
                  }`}
                  style={{
                    minWidth: 76,
                    textAlign: "center",
                    fontSize: 11,
                    padding: "3px 8px",
                  }}
                >
                  {impactTheme.label}
                </span>

                <button
                  type="button"
                  aria-label={isExpanded ? "Collapse details" : "Expand details"}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    padding: 2,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>
              </div>
            </div>

            {/* Expanded view */}
            {isExpanded && (
              <div
                style={{
                  display: "grid",
                  gap: 8,
                  paddingTop: 10,
                  borderTop: "1px solid var(--border)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-secondary)" }}>
                  <span>Present classes:</span>
                  <strong>{subject.oldPresent}/{subject.total} → {subject.newPresent}/{subject.total}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-secondary)" }}>
                  <span>Net improvement:</span>
                  <strong style={{ color: impactTheme.color }}>
                    +{(subject.newPercentage - subject.oldPercentage).toFixed(1)} percentage points
                  </strong>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* =========================================================================
   MAIN STRATEGY COMPONENT WITH TOP SEGMENTED SWITCHER (SOLUTION 1)
   ========================================================================= */

export function Strategy({ data, handlers }: { data: StrategyData; handlers: StrategyHandlers }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  // Tab State: "bunk" | "medical" | "redemption"
  const initialTab = useMemo<"bunk" | "medical" | "redemption">(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "medical" || location.hash === "#medical-optimizer") return "medical";
    if (tabParam === "redemption") return "redemption";
    return "bunk";
  }, []);

  const [activeTab, setActiveTab] = useState<"bunk" | "medical" | "redemption">(initialTab);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "medical" || location.hash === "#medical-optimizer") {
      setActiveTab("medical");
    } else if (tabParam === "redemption") {
      setActiveTab("redemption");
    } else if (tabParam === "bunk") {
      setActiveTab("bunk");
    }
  }, [searchParams, location.hash]);

  const handleTabChange = (tab: "bunk" | "medical" | "redemption") => {
    setActiveTab(tab);
    setSearchParams({ tab }, { replace: true });
  };

  const [medicalLeaveStartDate, setMedicalLeaveStartDate] = useState("");
  const [medicalLeaveEndDate, setMedicalLeaveEndDate] = useState("");
  const [activeRescueTab, setActiveRescueTab] = useState<"smart" | "custom">("smart");

  const allLeaveRescueDays = useMemo<LeaveRescueDay[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayKey = formatIsoDate(today);

    return Object.values(data.streakDayData)
      .filter((day) => day.total > 0 && day.dateKey < todayKey)
      .map((day) => {
        const missed = Math.max(0, day.total - day.attended);

        return {
          dateKey: day.dateKey,
          label: formatDateKeyLabel(day.dateKey),
          total: day.total,
          attended: day.attended,
          missed,
          intensity: getLeaveRescueIntensity(missed),
        };
      })
      .filter((day) => day.missed > 0)
      .sort(
        (left, right) =>
          right.missed - left.missed ||
          right.total - left.total ||
          right.dateKey.localeCompare(left.dateKey),
      );
  }, [data.streakDayData]);

  const leaveRescueDays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(start.getDate() - 28);
    const startKey = formatIsoDate(start);

    return allLeaveRescueDays.filter((day) => day.dateKey >= startKey);
  }, [allLeaveRescueDays]);

  const medicalLeaveDateBounds = useMemo(() => {
    const dateKeys = Object.values(data.streakDayData)
      .map((day) => day.dateKey)
      .filter((dateKey) => /^\d{4}-\d{2}-\d{2}$/.test(dateKey))
      .sort();

    return {
      min: dateKeys[0] ?? "",
      max: dateKeys[dateKeys.length - 1] ?? "",
    };
  }, [data.streakDayData]);

  const selectedLeaveRescueDays = useMemo(
    () =>
      medicalLeaveStartDate && medicalLeaveEndDate
        ? allLeaveRescueDays.filter(
            (day) => day.dateKey >= medicalLeaveStartDate && day.dateKey <= medicalLeaveEndDate,
          )
        : [],
    [allLeaveRescueDays, medicalLeaveEndDate, medicalLeaveStartDate],
  );

  const featuredLeaveRescueDays = leaveRescueDays.slice(0, 3);
  const extraLeaveRescueDays = leaveRescueDays.slice(3);

  const leaveRescueImpact = useMemo<LeaveRescueImpactSummary | null>(() => {
    if (!data.overallSummary || data.subjectSummaries.length === 0 || selectedLeaveRescueDays.length === 0) {
      return null;
    }

    let addedPresent = 0;
    const subjectImpact = data.subjectSummaries.map((subject) => {
      const subjectKey = getAttendanceSubjectKey(subject);
      const addedPresentForSubject = selectedLeaveRescueDays.reduce(
        (sum, day) =>
          sum + (data.streakSubjectAbsencesByDate[day.dateKey]?.[subjectKey] ?? 0),
        0,
      );
      const newPresent = subject.present + addedPresentForSubject;
      const newPercentage = subject.total > 0 ? (newPresent / subject.total) * 100 : 0;
      const wasRisky = subject.percentage < 75;
      const crossesThreshold = wasRisky && newPercentage >= 75;
      const stillRisky = wasRisky && newPercentage < 75;

      addedPresent += addedPresentForSubject;

      return {
        id: subject.id,
        title: subject.title,
        courseCode: subject.courseCode,
        componentName: subject.componentName,
        oldPercentage: subject.percentage,
        newPercentage,
        total: subject.total,
        oldPresent: subject.present,
        newPresent,
        addedPresent: addedPresentForSubject,
        wasRisky,
        crossesThreshold,
        stillRisky,
      };
    });

    const impactedSubjects = subjectImpact
      .filter((subject) => subject.addedPresent > 0)
      .sort((left, right) => {
        const leftRank = left.crossesThreshold ? 0 : left.stillRisky ? 1 : 2;
        const rightRank = right.crossesThreshold ? 0 : right.stillRisky ? 1 : 2;

        return (
          leftRank - rightRank ||
          right.addedPresent - left.addedPresent ||
          right.newPercentage - left.newPercentage ||
          left.title.localeCompare(right.title)
        );
      });

    const oldPresent = data.overallSummary.present;
    const total = data.overallSummary.total;
    const newPresent = oldPresent + addedPresent;

    return {
      oldPercentage: data.overallSummary.percentage,
      newPercentage: total > 0 ? (newPresent / total) * 100 : 0,
      oldPresent,
      newPresent,
      total,
      addedPresent,
      impactedSubjects,
      unchangedSubjectsCount: data.subjectSummaries.length - impactedSubjects.length,
      crossesThresholdCount: impactedSubjects.filter((subject) => subject.crossesThreshold).length,
      stillRiskyCount: impactedSubjects.filter((subject) => subject.stillRisky).length,
    };
  }, [
    data.overallSummary,
    data.streakSubjectAbsencesByDate,
    data.subjectSummaries,
    selectedLeaveRescueDays,
  ]);

  function setMedicalLeaveRange(startDate: string, endDate: string) {
    setMedicalLeaveStartDate(startDate);
    setMedicalLeaveEndDate(endDate);
  }

  function clearLeaveRescueSelection() {
    setMedicalLeaveRange("", "");
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* =========================================================================
          TOP SEGMENTED SWITCHER (SOLUTION 1)
          ========================================================================= */}
      <section
        className="standard-card rise-in"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          padding: "16px 18px",
          borderRadius: 14,
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.025em" }}>
              Attendance Planner & Strategy
            </h1>
            <p style={{ margin: "3px 0 0 0", color: "var(--text-muted)", fontSize: 13 }}>
              Choose a strategic tool below to forecast bunks, optimize medical certificates, or simulate targets.
            </p>
          </div>
        </div>

        {/* 3-Pill Segmented Switcher */}
        <div
          style={{
            display: "flex",
            gap: 6,
            padding: 4,
            background: "var(--bg-section)",
            borderRadius: 10,
            border: "1px solid var(--border)",
            overflowX: "auto",
            width: "fit-content",
            maxWidth: "100%",
          }}
        >
          <button
            type="button"
            onClick={() => handleTabChange("bunk")}
            style={{
              padding: "7px 15px",
              borderRadius: 8,
              border: "none",
              fontSize: 13,
              fontWeight: activeTab === "bunk" ? 650 : 500,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              background: activeTab === "bunk" ? "var(--bg-card)" : "transparent",
              color: activeTab === "bunk" ? "var(--text-primary)" : "var(--text-muted)",
              boxShadow: activeTab === "bunk" ? "var(--shadow-xs)" : "none",
              transition: "all 0.15s ease",
              whiteSpace: "nowrap",
            }}
          >
            <Target size={14} style={{ color: activeTab === "bunk" ? "var(--primary)" : "inherit" }} />
            <span>Future Bunk Planner</span>
            {data.selectedBunkDates.size > 0 && (
              <span
                className="status-badge status-badge--primary"
                style={{ fontSize: 11, padding: "1px 6px", borderRadius: 999 }}
              >
                {data.selectedBunkDates.size}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("medical")}
            style={{
              padding: "7px 15px",
              borderRadius: 8,
              border: "none",
              fontSize: 13,
              fontWeight: activeTab === "medical" ? 650 : 500,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              background: activeTab === "medical" ? "var(--bg-card)" : "transparent",
              color: activeTab === "medical" ? "var(--text-primary)" : "var(--text-muted)",
              boxShadow: activeTab === "medical" ? "var(--shadow-xs)" : "none",
              transition: "all 0.15s ease",
              whiteSpace: "nowrap",
            }}
          >
            <Stethoscope size={14} style={{ color: activeTab === "medical" ? "var(--primary)" : "inherit" }} />
            <span>Medical Leave Rescue</span>
            {selectedLeaveRescueDays.length > 0 && (
              <span
                className="status-badge status-badge--info"
                style={{ fontSize: 11, padding: "1px 6px", borderRadius: 999 }}
              >
                {selectedLeaveRescueDays.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("redemption")}
            style={{
              padding: "7px 15px",
              borderRadius: 8,
              border: "none",
              fontSize: 13,
              fontWeight: activeTab === "redemption" ? 650 : 500,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              background: activeTab === "redemption" ? "var(--bg-card)" : "transparent",
              color: activeTab === "redemption" ? "var(--text-primary)" : "var(--text-muted)",
              boxShadow: activeTab === "redemption" ? "var(--shadow-xs)" : "none",
              transition: "all 0.15s ease",
              whiteSpace: "nowrap",
            }}
          >
            <TrendingUp size={14} style={{ color: activeTab === "redemption" ? "var(--primary)" : "inherit" }} />
            <span>100% Attendance Target</span>
          </button>
        </div>
      </section>

      {/* =========================================================================
          TAB 1: WHOLE DAY ABSENCE PLANNER
          ========================================================================= */}
      {activeTab === "bunk" && (
        <section style={{ display: "grid", gap: 14 }} className="rise-in">
          <Panel
            title="Whole Day Absence Planner"
            subtitle="Plan off-days safely without dropping below the 75% threshold."
          >
            <div className="planner-panel-shell" style={{ display: "grid", gap: 18 }}>
              <div
                className="planner-panel-toolbar"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ color: "var(--text-secondary)", fontSize: 13.5, maxWidth: "72ch" }}>
                  Pick future class dates to forecast how missing them impacts your overall and subject-level standing.
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                  gap: 20,
                  alignItems: "start",
                }}
              >
                {/* Left: Day Checklist */}
                <div style={{ display: "grid", gap: 10 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 14px",
                      borderRadius: 10,
                      background: "var(--bg-card-subtle)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <strong style={{ fontSize: 13 }}>Upcoming Class Days</strong>
                    <span className="status-badge status-badge--neutral" style={{ fontSize: 12 }}>
                      {data.selectedBunkDates.size} day{data.selectedBunkDates.size === 1 ? "" : "s"} selected
                      {data.selectedBunkCutoffDateKey
                        ? ` • thru ${formatDateKeyLabel(data.selectedBunkCutoffDateKey)}`
                        : ""}
                    </span>
                  </div>

                  {data.bunkableDays.length === 0 ? (
                    <EmptyMessage message="No upcoming class days loaded in schedule." />
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gap: 8,
                        maxHeight: 560,
                        overflowY: "auto",
                        paddingRight: 4,
                      }}
                    >
                      {data.bunkableDays.map((day) => {
                        const isSelected = data.selectedBunkDates.has(day.dateKey);

                        return (
                          <label
                            className="surface-card interactive-row"
                            key={day.dateKey}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "18px minmax(0, 1fr)",
                              gap: 12,
                              alignItems: "start",
                              padding: "12px 14px",
                              borderRadius: 12,
                              border: `1px solid ${isSelected ? "var(--primary)" : "var(--border)"}`,
                              background: isSelected ? "var(--primary-soft)" : "var(--bg-card)",
                              cursor: "pointer",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handlers.handleWholeDayToggle(day.dateKey)}
                              style={{ marginTop: 2, accentColor: "var(--primary)" }}
                            />
                            <div style={{ display: "grid", gap: 3 }}>
                              <div style={{ fontWeight: 600, fontSize: 14 }}>{day.label}</div>
                              <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                                {day.entries.length} class{day.entries.length === 1 ? "" : "es"}
                              </div>
                              <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
                                {day.entries
                                  .slice(0, 3)
                                  .map((entry) => entry.courseCode ?? entry.title)
                                  .join(", ")}
                                {day.entries.length > 3 ? "..." : ""}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right: Cumulative Impact & Master-Detail Compact Table */}
                <div style={{ display: "grid", gap: 14 }}>
                  {data.selectedBunkDates.size === 0 || !data.overallWholeDayPlan ? (
                    <EmptyMessage message="Select one or more future dates from the list to preview the bunk projection." />
                  ) : (
                    <>
                      {/* Overall Impact Card */}
                      <div
                        className="standard-card rise-in border-l-primary"
                        style={{
                          display: "grid",
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                            alignItems: "baseline",
                            flexWrap: "wrap",
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 800, fontSize: 17 }}>Overall Standing After Planned Leave</div>
                            <div style={{ color: "var(--text-muted)", fontSize: 12.5 }}>
                              Your projected attendance through the last selected day.
                            </div>
                          </div>
                          <div style={{ display: "grid", gap: 4, justifyItems: "end" }}>
                            <strong
                              style={{
                                color:
                                  data.overallWholeDayPlan.currentPercentage >= 75
                                    ? "var(--success)"
                                    : "var(--danger)",
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              Current: {data.overallWholeDayPlan.currentPercentage.toFixed(1)}%
                            </strong>
                            <span
                              style={{
                                color:
                                  data.overallWholeDayPlan.afterSelectedPercentage >= 75
                                    ? "var(--success)"
                                    : "var(--danger)",
                                fontWeight: 700,
                                fontSize: 13,
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              After leave:{" "}
                              {data.overallWholeDayPlan.afterSelectedPercentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>

                        <ProgressBar
                          label="Current Overall"
                          percentage={data.overallWholeDayPlan.currentPercentage}
                          healthy={data.overallWholeDayPlan.currentPercentage >= 75}
                        />
                        <ProgressBar
                          label={`After leave (${data.overallWholeDayPlan.selectedClassCount} classes missed)`}
                          percentage={data.overallWholeDayPlan.afterSelectedPercentage}
                          healthy={data.overallWholeDayPlan.afterSelectedPercentage >= 75}
                        />

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
                            gap: 10,
                            color: "var(--text-secondary)",
                            fontSize: 13.5,
                          }}
                        >
                          <Metric
                            label="Projected"
                            value={`${data.overallWholeDayPlan.afterSelectedPresent}/${data.overallWholeDayPlan.afterSelectedTotal}`}
                          />
                          <Metric
                            label="Missed"
                            value={String(data.overallWholeDayPlan.selectedClassCount)}
                          />
                          <Metric
                            label="Attended"
                            value={String(data.overallWholeDayPlan.attendedClassCount)}
                          />
                        </div>

                        <RecoveryNote
                          recovery={data.overallWholeDayPlan.recovery}
                          cutoffDateKey={data.selectedBunkCutoffDateKey}
                        />
                      </div>

                      {/* Compact Master-Detail Table */}
                      <CompactBunkSubjectTable
                        subjects={data.wholeDayPlanSummaries}
                        cutoffDateKey={data.selectedBunkCutoffDateKey}
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
          </Panel>
        </section>
      )}

      {/* =========================================================================
          TAB 2: SMART MEDICAL LEAVE OPTIMIZER
          ========================================================================= */}
      {activeTab === "medical" && (
        <section style={{ display: "grid", gap: 14 }} id="medical-optimizer" className="rise-in">
          <Panel
            title="Smart Medical Leave Optimizer"
            subtitle="Find the best consecutive days in the last 30–50 days to apply for medical leave and reach your target attendance."
          >
            {data.streakLoading && Object.keys(data.streakDayData).length === 0 ? (
              <EmptyMessage message="Scanning recent attendance history..." />
            ) : !data.streakIsReliable && Object.keys(data.streakDayData).length === 0 ? (
              <EmptyMessage message="Recent attendance is not available right now." />
            ) : allLeaveRescueDays.length === 0 ? (
              <EmptyMessage message="No recorded absences are available for a medical-leave calculation." />
            ) : (
              <div style={{ display: "grid", gap: 20 }}>
                {/* Sub-Tab Selector */}
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    borderBottom: "1px solid var(--border)",
                    paddingBottom: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setActiveRescueTab("smart")}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      border: `1px solid ${activeRescueTab === "smart" ? "var(--primary)" : "var(--border)"}`,
                      background: activeRescueTab === "smart" ? "var(--primary-soft)" : "var(--bg-card)",
                      color: activeRescueTab === "smart" ? "var(--primary)" : "var(--text-secondary)",
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      transition: "all 0.15s ease",
                    }}
                  >
                    <Sparkles size={14} style={{ color: "var(--primary)" }} />
                    <span>Consecutive Windows (Smart Optimization)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveRescueTab("custom")}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      border: `1px solid ${activeRescueTab === "custom" ? "var(--primary)" : "var(--border)"}`,
                      background: activeRescueTab === "custom" ? "var(--primary-soft)" : "var(--bg-card)",
                      color: activeRescueTab === "custom" ? "var(--primary)" : "var(--text-secondary)",
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      transition: "all 0.15s ease",
                    }}
                  >
                    <Calendar size={14} style={{ color: "var(--text-muted)" }} />
                    <span>Custom Range & Daily Breakdown</span>
                  </button>
                </div>

                {/* Sub-View 1: Smart Consecutive Windows */}
                {activeRescueTab === "smart" && (
                  <MedicalLeaveOptimizer
                    streakDayData={data.streakDayData}
                    streakSubjectAbsencesByDate={data.streakSubjectAbsencesByDate}
                    subjectSummaries={data.subjectSummaries}
                    overallSummary={data.overallSummary}
                    streakLoading={data.streakLoading}
                    studentName={data.studentDetails?.fullName}
                    registrationNumber={data.studentDetails?.registrationNumber}
                    activeStartDate={medicalLeaveStartDate}
                    activeEndDate={medicalLeaveEndDate}
                    onApplyWindow={(start, end) => setMedicalLeaveRange(start, end)}
                  />
                )}

                {/* Sub-View 2: Custom Date Range & Daily Picker */}
                {activeRescueTab === "custom" && (
                  <div style={{ display: "grid", gap: 18 }}>
                    <div
                      style={{
                        display: "flex",
                        gap: 12,
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ color: "var(--text-secondary)", fontSize: 13.5, maxWidth: "72ch" }}>
                        Choose your custom medical leave period. For this preview only, recorded absences in that range are treated as present.
                      </div>
                      <div
                        className="status-badge status-badge--neutral"
                        style={{
                          padding: "6px 12px",
                          borderRadius: 999,
                          fontSize: 12.5,
                          fontWeight: 700,
                        }}
                      >
                        {allLeaveRescueDays.length} missed day{allLeaveRescueDays.length === 1 ? "" : "s"} found
                      </div>
                      {selectedLeaveRescueDays.length > 0 && (
                        <div
                          className="status-badge status-badge--info"
                          style={{
                            padding: "6px 12px",
                            borderRadius: 999,
                            fontSize: 12.5,
                            fontWeight: 700,
                          }}
                        >
                          {selectedLeaveRescueDays.length} selected
                        </div>
                      )}
                    </div>

                    <div
                      className="surface-card"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                        gap: 14,
                        padding: 16,
                        borderRadius: 14,
                        border: "1px solid var(--border)",
                        background: "var(--bg-card-subtle)",
                      }}
                    >
                      <label style={{ display: "grid", gap: 7, fontWeight: 700, fontSize: 13 }}>
                        Medical leave start
                        <input
                          type="date"
                          value={medicalLeaveStartDate}
                          min={medicalLeaveDateBounds.min || undefined}
                          max={medicalLeaveEndDate || medicalLeaveDateBounds.max || undefined}
                          onChange={(event) => {
                            const startDate = event.target.value;
                            setMedicalLeaveStartDate(startDate);
                            if (medicalLeaveEndDate && startDate > medicalLeaveEndDate) {
                              setMedicalLeaveEndDate(startDate);
                            }
                          }}
                          style={{
                            font: "inherit",
                            padding: "9px 12px",
                            borderRadius: 8,
                            border: "1px solid var(--border)",
                            background: "var(--bg-card)",
                            color: "var(--text-primary)",
                          }}
                        />
                      </label>
                      <label style={{ display: "grid", gap: 7, fontWeight: 700, fontSize: 13 }}>
                        Medical leave end
                        <input
                          type="date"
                          value={medicalLeaveEndDate}
                          min={medicalLeaveStartDate || medicalLeaveDateBounds.min || undefined}
                          max={medicalLeaveDateBounds.max || undefined}
                          onChange={(event) => {
                            const endDate = event.target.value;
                            setMedicalLeaveEndDate(endDate);
                            if (medicalLeaveStartDate && endDate < medicalLeaveStartDate) {
                              setMedicalLeaveStartDate(endDate);
                            }
                          }}
                          style={{
                            font: "inherit",
                            padding: "9px 12px",
                            borderRadius: 8,
                            border: "1px solid var(--border)",
                            background: "var(--bg-card)",
                            color: "var(--text-primary)",
                          }}
                        />
                      </label>
                    </div>

                    {leaveRescueDays.length > 0 && (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                          gap: 10,
                        }}
                      >
                        {featuredLeaveRescueDays.map((day) => {
                          const theme = getLeaveRescueTheme(day.intensity);
                          const isSelected = Boolean(
                            medicalLeaveStartDate &&
                              medicalLeaveEndDate &&
                              day.dateKey >= medicalLeaveStartDate &&
                              day.dateKey <= medicalLeaveEndDate,
                          );

                          return (
                            <button
                              type="button"
                              className={`standard-card interactive-row rise-in ${theme.borderClass}`}
                              key={`leave-rescue-featured-${day.dateKey}`}
                              onClick={() => setMedicalLeaveRange(day.dateKey, day.dateKey)}
                              style={{
                                display: "grid",
                                gap: 8,
                                width: "100%",
                                textAlign: "left",
                                cursor: "pointer",
                                font: "inherit",
                                background: isSelected ? "var(--primary-soft)" : undefined,
                                borderColor: isSelected ? "var(--primary)" : undefined,
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  gap: 10,
                                  alignItems: "start",
                                  flexWrap: "wrap",
                                }}
                              >
                                <div style={{ display: "grid", gap: 2 }}>
                                  <strong style={{ fontSize: 16 }}>{day.label}</strong>
                                  <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                                    {day.dateKey}
                                  </span>
                                </div>
                                <div
                                  style={{
                                    display: "flex",
                                    gap: 6,
                                    alignItems: "center",
                                    flexWrap: "wrap",
                                    marginLeft: "auto",
                                  }}
                                >
                                  {isSelected && (
                                    <span
                                      className="status-badge"
                                      style={{
                                        padding: "4px 8px",
                                        borderRadius: 999,
                                        background: "var(--primary)",
                                        color: "var(--text-on-primary)",
                                        fontSize: 11,
                                        fontWeight: 800,
                                      }}
                                    >
                                      Selected
                                    </span>
                                  )}
                                  <span
                                    className={`status-badge ${
                                      day.intensity === "high"
                                        ? "status-badge--danger"
                                        : day.intensity === "medium"
                                        ? "status-badge--warning"
                                        : "status-badge--success"
                                    }`}
                                    style={{
                                      padding: "4px 8px",
                                      borderRadius: 999,
                                      background: theme.badgeBackground,
                                      color: theme.color,
                                      fontSize: 11,
                                      fontWeight: 800,
                                    }}
                                  >
                                    {theme.label}
                                  </span>
                                </div>
                              </div>

                              <div style={{ color: "var(--text-primary)", fontSize: 20, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
                                Missed {day.missed} of {day.total}
                              </div>
                              <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                                Attended {day.attended} class{day.attended === 1 ? "" : "es"}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Preview Container with Compact Table */}
                    <div
                      className="surface-card surface-card--highlight"
                      style={{
                        display: "grid",
                        gap: 14,
                        padding: 16,
                        borderRadius: 14,
                        border: "1px solid var(--border-strong)",
                        background: "var(--bg-card-subtle)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: 12,
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ display: "grid", gap: 3 }}>
                          <div style={{ fontWeight: 800, fontSize: 16 }}>Medical Adjustment Preview</div>
                          <div style={{ color: "var(--text-muted)", fontSize: 12.5 }}>
                            {selectedLeaveRescueDays.length === 0
                              ? "Choose a start and end date above to preview the adjustment."
                              : `Applied window: ${formatDateKeyLabel(medicalLeaveStartDate)} to ${formatDateKeyLabel(medicalLeaveEndDate)}`}
                          </div>
                        </div>
                        {selectedLeaveRescueDays.length > 0 && (
                          <button
                            type="button"
                            onClick={clearLeaveRescueSelection}
                            style={{
                              ...secondaryButtonStyle,
                              padding: "6px 12px",
                              fontSize: 12,
                              marginLeft: "auto",
                            }}
                          >
                            Clear
                          </button>
                        )}
                      </div>

                      {selectedLeaveRescueDays.length === 0 ? (
                        <EmptyMessage message="Choose both medical leave dates to preview the impact." />
                      ) : !leaveRescueImpact || !data.overallSummary ? (
                        <EmptyMessage message="Preview is not available right now." />
                      ) : leaveRescueImpact.addedPresent === 0 ? (
                        <EmptyMessage message="No absences found on those days." />
                      ) : (
                        <div style={{ display: "grid", gap: 14 }}>
                          <div style={{ display: "grid", gap: 8 }}>
                            <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 13.5 }}>
                              Overall Impact Summary
                            </div>
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                                gap: 8,
                              }}
                            >
                              <Metric
                                label="Overall"
                                value={`${formatPercentage(leaveRescueImpact.oldPercentage)} → ${formatPercentage(leaveRescueImpact.newPercentage)}`}
                              />
                              <Metric
                                label="Recovered"
                                value={String(leaveRescueImpact.addedPresent)}
                              />
                              <Metric
                                label="Present"
                                value={`${leaveRescueImpact.oldPresent} → ${leaveRescueImpact.newPresent}`}
                              />
                              <Metric
                                label="Safe Now"
                                value={String(leaveRescueImpact.crossesThresholdCount)}
                              />
                            </div>
                          </div>

                          <div style={{ display: "grid", gap: 8 }}>
                            <div
                              style={{
                                display: "flex",
                                gap: 10,
                                alignItems: "center",
                                flexWrap: "wrap",
                              }}
                            >
                              <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 13.5 }}>
                                Impacted Subjects ({leaveRescueImpact.impactedSubjects.length})
                              </div>
                              <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                                {leaveRescueImpact.unchangedSubjectsCount} unchanged
                              </span>
                              {leaveRescueImpact.stillRiskyCount > 0 && (
                                <span
                                  className="status-badge status-badge--warning"
                                  style={{
                                    padding: "3px 8px",
                                    borderRadius: 999,
                                    fontSize: 11,
                                    fontWeight: 700,
                                  }}
                                >
                                  {leaveRescueImpact.stillRiskyCount} still risky
                                </span>
                              )}
                            </div>

                            <CompactMedicalSubjectTable
                              subjects={leaveRescueImpact.impactedSubjects}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Panel>
        </section>
      )}

      {/* =========================================================================
          TAB 3: REDEMPTION ARC (100% ATTENDANCE TARGET)
          ========================================================================= */}
      {activeTab === "redemption" && (
        <section style={{ display: "grid", gap: 14 }} className="rise-in">
          <Panel
            title="100% Attendance Target (Redemption Arc)"
            subtitle="Simulate where your cumulative attendance reaches if you attend every scheduled class until a target milestone date."
          >
            <RedemptionArc
              data={data.overallSummary}
              schedule={data.bunkableDays}
              subjectSummaries={data.subjectSummaries}
            />
          </Panel>
        </section>
      )}
    </div>
  );
}
