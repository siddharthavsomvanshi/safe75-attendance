import { useState } from "react";
import type { ScheduleEntry } from "../../types/kiet";
import type { SubjectSummary } from "../../App";
import { Calendar, Sparkles } from "../Icons";

interface BunkableDay {
  dateKey: string;
  label: string;
  entries: ScheduleEntry[];
}

interface OverallSummary {
  present: number;
  total: number;
}

interface SubjectRecoveryResult {
  id: string;
  title: string;
  courseCode: string;
  componentName: string;
  componentCount: number;
  currentPercentage: number;
  projectedPercentage: number;
  classesAdded: number;
  isSafe: boolean;
}

interface RedemptionArcProps {
  data: OverallSummary | null;
  schedule: BunkableDay[];
  subjectSummaries?: SubjectSummary[];
}

function normalizeIdentifier(value: string | null | undefined): string {
  return (value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function RedemptionArc({ data, schedule, subjectSummaries }: RedemptionArcProps) {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [result, setResult] = useState<{
    percentage: number;
    classesAdded: number;
    subjectResults: SubjectRecoveryResult[];
  } | null>(null);

  const handleCalculate = () => {
    if (!selectedDate || !data) {
      setResult(null);
      return;
    }

    const currentAttended = data.present;
    const currentTotal = data.total;

    let classesAdded = 0;
    const relevantDays = schedule.filter((day) => day.dateKey <= selectedDate);

    // Use the exact same filtered and grouped calendar schedule as Attendance Sniper
    for (const day of relevantDays) {
      classesAdded += day.entries.length;
    }

    const futureTotal = currentTotal + classesAdded;
    const futureAttended = currentAttended + classesAdded;
    const futurePercentage = futureTotal > 0 ? (futureAttended / futureTotal) * 100 : 0;

    const subjectResults: SubjectRecoveryResult[] = (subjectSummaries ?? []).map((subject) => {
      let subjectClassesAdded = 0;
      const normCourseCode = normalizeIdentifier(subject.courseCode);
      const normCompName = normalizeIdentifier(subject.componentName);

      for (const day of relevantDays) {
        for (const entry of day.entries) {
          const entryCourseCode = normalizeIdentifier(entry.courseCode);
          if (entryCourseCode !== normCourseCode) {
            continue;
          }

          if (subject.componentCount > 1) {
            const entryCompName = normalizeIdentifier(entry.courseCompName);
            if (entryCompName !== normCompName) {
              continue;
            }
          }

          subjectClassesAdded += 1;
        }
      }

      const currentPresent = subject.present;
      const currentTot = subject.total;
      const currentPercentage = subject.percentage;

      const projectedPresent = currentPresent + subjectClassesAdded;
      const projectedTotal = currentTot + subjectClassesAdded;
      const projectedPercentage =
        subjectClassesAdded === 0
          ? currentPercentage
          : projectedTotal > 0
            ? (projectedPresent / projectedTotal) * 100
            : 0;

      const isSafe = projectedPercentage >= 75;

      return {
        id: subject.id,
        title: subject.title,
        courseCode: subject.courseCode,
        componentName: subject.componentName,
        componentCount: subject.componentCount,
        currentPercentage,
        projectedPercentage,
        classesAdded: subjectClassesAdded,
        isSafe,
      };
    });

    setResult({ percentage: futurePercentage, classesAdded, subjectResults });
  };

  return (
    <div
      className="surface-card rise-in"
      style={{
        display: "grid",
        gap: 12,
        padding: "16px 18px",
        borderRadius: 14,
        border: "1px solid var(--border)",
        background: "var(--bg-card)",
      }}
    >
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
          Attendance recovery
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: 13, margin: "3px 0 0" }}>
          See where your attendance lands if you attend every class until a selected date.
        </p>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input
          className="standard-input"
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid var(--border)",
            fontSize: 13,
            outline: "none",
            background: "var(--bg-card)",
            color: "var(--text-primary)",
            fontFamily: "inherit",
          }}
        />
        <button
          className="action-button action-button--primary"
          type="button"
          onClick={handleCalculate}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Sparkles size={14} />
          <span>Preview</span>
        </button>
      </div>

      {result !== null && (
        <div style={{ display: "grid", gap: 14, marginTop: 4 }}>
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 10,
              background: "var(--bg-card-subtle)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              fontSize: 14,
            }}
          >
            If you attend every class until {new Date(selectedDate).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}{" "}
            your attendance reaches{" "}
            <strong style={{ fontSize: 16, fontVariantNumeric: "tabular-nums" }}>
              {result.percentage.toFixed(1)}%
            </strong>
            <div style={{ fontSize: 12, marginTop: 3, color: "var(--text-muted)" }}>
              +{result.classesAdded} classes added
            </div>
          </div>

          {result.subjectResults.length > 0 && (
            <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 14,
                  color: "var(--text-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>Subject-wise recovery</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)" }}>
                  {result.subjectResults.length} subject{result.subjectResults.length === 1 ? "" : "s"}
                </span>
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                {result.subjectResults.map((subj) => {
                  const displayName =
                    subj.componentCount > 1 && subj.componentName
                      ? `${subj.title} (${subj.componentName})`
                      : subj.title;

                  return (
                    <div
                      key={subj.id}
                      className="surface-card interactive-row"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid var(--border)",
                        background: "var(--bg-card-subtle)",
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ display: "grid", gap: 2, minWidth: 160, flex: "1 1 200px" }}>
                        <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)" }}>
                          {displayName}
                        </span>
                        {subj.courseCode && (
                          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                            {subj.courseCode}
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                          flexWrap: "wrap",
                          justifyContent: "flex-end",
                          marginLeft: "auto",
                        }}
                      >
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
                            {subj.currentPercentage.toFixed(1)}% → {subj.projectedPercentage.toFixed(1)}%
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                            {subj.classesAdded > 0
                              ? `+${subj.classesAdded} class${subj.classesAdded === 1 ? "" : "es"}`
                              : "No classes"}
                          </div>
                        </div>

                        <span
                          className={`status-badge ${subj.isSafe ? "status-badge--success" : "status-badge--danger"}`}
                          style={{
                            minWidth: 80,
                            textAlign: "center",
                            fontSize: 11,
                            padding: "3px 8px",
                          }}
                        >
                          {subj.isSafe ? "Safe" : "Below 75%"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
