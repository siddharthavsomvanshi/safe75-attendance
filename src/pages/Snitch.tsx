import { useState, useMemo } from "react";
import emailjs from "@emailjs/browser";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Panel } from "../components/UI";
import {
  Send,
  AlertTriangle,
  CheckCircle2,
  Info,
  Lock,
  ChevronDown,
  ChevronUp,
  Copy,
  CheckCheck,
} from "../components/Icons";
import type { StudentDetails } from "../types/kiet";
import type { StudentContext } from "../App";

const SERVICE_ID = "service_74zznfb";
const TEMPLATE_ID = "template_bl3ru6b";
const PUBLIC_KEY = "my0XXtzejINkKbVI_";

export interface SnitchProps {
  attendance?: StudentDetails | null;
  studentContext?: StudentContext | null;
}

export type IssueCategory =
  | "proxy_login"
  | "timetable_desync"
  | "attendance_mismatch"
  | "component_missing"
  | "app_malfunction"
  | "feature_request"
  | "other";

const ISSUE_CATEGORIES: { id: IssueCategory; label: string; priority: "high" | "medium" | "low" }[] = [
  { id: "attendance_mismatch", label: "🔢 Calculation Discrepancy (Safe bunks or 75% math error)", priority: "high" },
  { id: "component_missing", label: "📑 Missing Subject Component (Lab / Tutorial missing)", priority: "high" },
  { id: "timetable_desync", label: "📅 Timetable Desync (Wrong lecture timings or absent entries)", priority: "medium" },
  { id: "proxy_login", label: "🔑 Proxy / Login Failure (OTP, 401 Unauthorized, Timeouts)", priority: "high" },
  { id: "app_malfunction", label: "⚠️ App Malfunction or UI Crash", priority: "medium" },
  { id: "feature_request", label: "💡 Feature Request / Improvement Idea", priority: "low" },
  { id: "other", label: "❓ Other Inquiry", priority: "low" },
];

const inputStyle = {
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  fontSize: 14,
  width: "100%",
  background: "var(--bg-card)",
  outline: "none",
  color: "var(--text-primary)",
  fontWeight: 400,
  fontFamily: "inherit",
  boxSizing: "border-box" as const,
};

export function Snitch({ attendance, studentContext }: SnitchProps) {
  const [issueType, setIssueType] = useState<IssueCategory | "">("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");

  // Diagnostics controls
  const [attachDiagnostics, setAttachDiagnostics] = useState(Boolean(attendance));
  const [includeRollNumber, setIncludeRollNumber] = useState(false);
  const [showDiagnosticsPreview, setShowDiagnosticsPreview] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);

  // Flow states
  const [sending, setSending] = useState(false);
  const [submittedReportId, setSubmittedReportId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Compute diagnostics snapshot safely
  const diagnosticsPayload = useMemo(() => {
    if (!attachDiagnostics) return null;

    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "Unknown";
    const isPwa = typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches;
    const screenRes = typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : "Unknown";

    const base = {
      appVersion: "Safe75 v2.4",
      timestamp: new Date().toISOString(),
      platform: {
        isPwa,
        screen: screenRes,
        userAgent,
      },
      session: {
        authenticated: Boolean(attendance),
        studentId: studentContext?.studentId ? String(studentContext.studentId) : null,
      },
    };

    if (!attendance) {
      return base;
    }

    const courseBreakdown = attendance.attendanceCourseComponentInfoList?.map((course) => ({
      code: course.courseCode,
      name: course.courseName,
      components: course.attendanceCourseComponentNameInfoList?.map((comp) => ({
        component: comp.componentName,
        present: comp.numberOfPresent,
        total: comp.numberOfPeriods,
        extra: comp.numberOfExtraAttendance,
        pct: comp.presentPercentage,
      })),
    }));

    return {
      ...base,
      studentMetadata: {
        branch: attendance.branchShortName || "Unknown",
        degree: attendance.degreeName || "Unknown",
        semester: attendance.semesterName || "Unknown",
        section: attendance.sectionName || "Unknown",
        ...(includeRollNumber && attendance.registrationNumber
          ? { rollNumber: attendance.registrationNumber }
          : {}),
        courseCount: attendance.attendanceCourseComponentInfoList?.length || 0,
        courses: courseBreakdown || [],
      },
    };
  }, [attachDiagnostics, includeRollNumber, attendance, studentContext]);

  function handleCopyDiagnostics() {
    if (!diagnosticsPayload) return;
    navigator.clipboard.writeText(JSON.stringify(diagnosticsPayload, null, 2));
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  }

  async function handleSend() {
    if (!issueType || !message.trim()) {
      alert("Please select an issue type and describe what happened.");
      return;
    }

    setSending(true);
    setSubmitError(null);

    const categoryConfig = ISSUE_CATEGORIES.find((c) => c.id === issueType);
    const chosenPriority = categoryConfig?.priority || "medium";
    const generatedTitle = title.trim() || `${categoryConfig?.label.split(" ")[1] || "Issue"} reported by student`;

    let reportId: string | null = null;
    let dbSuccess = false;

    // 1. Primary storage: Supabase feedback_reports table
    try {
      const payload = {
        issue_type: issueType,
        title: generatedTitle,
        message: message.trim(),
        user_email: email.trim() || null,
        status: "open",
        priority: chosenPriority,
        diagnostics: diagnosticsPayload,
        device_info: {
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
          screen: typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : null,
          isPwa: typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches,
        },
      };

      const { data, error: dbError } = await supabase
        .from("feedback_reports")
        .insert(payload)
        .select("id")
        .single();

      if (dbError) {
        console.warn("Supabase feedback_reports insert error (falling back to EmailJS):", dbError);
      } else if (data?.id) {
        reportId = data.id;
        dbSuccess = true;
      }
    } catch (err) {
      console.warn("Database submission encountered an error:", err);
    }

    // 2. Secondary dispatch: EmailJS notification
    try {
      const emailPayload = {
        type: categoryConfig?.label || issueType,
        message: `${message.trim()}\n\n[Ticket ID]: ${reportId || "Direct"}\n[Has Diagnostics]: ${Boolean(diagnosticsPayload)}`,
        user_email: email.trim() || "anonymous@safe75.app",
      };

      await emailjs.send(SERVICE_ID, TEMPLATE_ID, emailPayload, PUBLIC_KEY);
    } catch (emailErr) {
      console.warn("EmailJS alert skipped or failed:", emailErr);
      // If DB succeeded, EmailJS failure is non-fatal
      if (!dbSuccess && !reportId) {
        // Both failed
        setSubmitError("Failed to dispatch report. Please check your network and try again.");
        setSending(false);
        return;
      }
    }

    // Success transition
    setSubmittedReportId(reportId || `REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
    setSending(false);
  }

  function handleReset() {
    setIssueType("");
    setTitle("");
    setMessage("");
    setEmail("");
    setSubmittedReportId(null);
    setSubmitError(null);
  }

  return (
    <section style={{ display: "grid", gap: 14 }}>
      <Panel
        title="Report Attendance Issues & Bugs"
        subtitle="Notice an anomaly with your attendance, timetable, or calculations? Let us know."
      >
        {submittedReportId ? (
          /* Submission Confirmation View */
          <div
            className="standard-card rise-in"
            style={{
              display: "grid",
              gap: 16,
              borderRadius: 12,
              padding: "24px 20px",
              textAlign: "center",
              placeItems: "center",
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "var(--success-soft)",
                color: "var(--success)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <CheckCircle2 size={30} />
            </div>

            <div>
              <h3 style={{ margin: "0 0 6px 0", fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
                Report Submitted Successfully
              </h3>
              <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)", maxWidth: 440 }}>
                Thanks for helping keep Safe75 rock-solid. Your report has been dispatched to the admin hub for review.
              </p>
            </div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 16px",
                background: "var(--bg-section)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 13,
                color: "var(--text-secondary)",
              }}
            >
              <span>Reference Ticket ID:</span>
              <strong style={{ fontFamily: "monospace", color: "var(--text-primary)" }}>
                {submittedReportId.substring(0, 8).toUpperCase()}
              </strong>
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <button
                type="button"
                onClick={handleReset}
                className="action-button action-button--secondary"
                style={{ padding: "8px 18px", fontSize: 13 }}
              >
                Submit another report
              </button>
              <Link
                to="/"
                className="action-button action-button--primary"
                style={{ padding: "8px 20px", fontSize: 13, textDecoration: "none" }}
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        ) : (
          /* Main Submission Form */
          <div
            className="standard-card rise-in border-l-warning"
            style={{
              display: "grid",
              gap: 16,
              borderRadius: 12,
              padding: "20px 22px",
            }}
          >
            {/* Security & Privacy Notice */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "10px 14px",
                borderRadius: 8,
                background: "var(--primary-soft)",
                border: "1px solid var(--primary-border)",
                fontSize: 13,
                color: "var(--text-secondary)",
              }}
            >
              <Lock size={15} style={{ color: "var(--accent)", marginTop: 2, flexShrink: 0 }} />
              <div>
                <strong style={{ color: "var(--text-primary)" }}>Privacy Protected: </strong>
                Credentials, CyberVidya passwords, and active session tokens are strictly kept in your browser and are{" "}
                <strong>never</strong> transmitted in bug reports.
              </div>
            </div>

            {submitError && (
              <div
                className="notice-banner"
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "var(--danger-soft)",
                  color: "var(--danger)",
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <AlertTriangle size={15} />
                <span>{submitError}</span>
              </div>
            )}

            {/* Issue Category */}
            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>
                Issue Category <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <select
                className="standard-input"
                value={issueType}
                onChange={(e) => setIssueType(e.target.value as IssueCategory)}
                style={inputStyle}
                required
              >
                <option value="" disabled>
                  Select issue category...
                </option>
                {ISSUE_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Brief Title */}
            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>
                Title / Headline <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-muted)" }}>(Optional)</span>
              </label>
              <input
                className="standard-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Lab component showing 0 periods or Bunk calculation mismatch"
                style={inputStyle}
              />
            </div>

            {/* Description */}
            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>
                Description <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <textarea
                className="standard-input"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Provide details: Which subject code, date, or feature behaved unexpectedly? What was the expected versus actual result?"
                rows={5}
                style={{ ...inputStyle, resize: "vertical", minHeight: 120 }}
                required
              />
            </div>

            {/* Diagnostics Attachment Card */}
            <div
              style={{
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--bg-section)",
                padding: "14px 16px",
                display: "grid",
                gap: 10,
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={attachDiagnostics}
                    onChange={(e) => setAttachDiagnostics(e.target.checked)}
                    style={{ cursor: "pointer", width: 16, height: 16 }}
                  />
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                      Attach diagnostic snapshot (Recommended)
                    </span>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                      Includes branch, semester, course codes, and lecture count structure to immediately pinpoint formula bugs.
                    </div>
                  </div>
                </div>
              </label>

              {attachDiagnostics && attendance && (
                <div style={{ display: "grid", gap: 8, paddingTop: 4, borderTop: "1px dashed var(--border)" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12 }}>
                    <input
                      type="checkbox"
                      checked={includeRollNumber}
                      onChange={(e) => setIncludeRollNumber(e.target.checked)}
                      style={{ cursor: "pointer" }}
                    />
                    <span style={{ color: "var(--text-secondary)" }}>
                      Include student roll number (optional, for specific student account debugging)
                    </span>
                  </label>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                    <button
                      type="button"
                      onClick={() => setShowDiagnosticsPreview((prev) => !prev)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--accent)",
                        fontSize: 12,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: 0,
                        fontWeight: 600,
                      }}
                    >
                      {showDiagnosticsPreview ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      <span>{showDiagnosticsPreview ? "Hide diagnostic payload" : "Preview diagnostic payload"}</span>
                    </button>

                    {showDiagnosticsPreview && (
                      <button
                        type="button"
                        onClick={handleCopyDiagnostics}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--text-muted)",
                          fontSize: 11,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        {copiedPayload ? <CheckCheck size={12} color="var(--success)" /> : <Copy size={12} />}
                        <span>{copiedPayload ? "Copied" : "Copy JSON"}</span>
                      </button>
                    )}
                  </div>

                  {showDiagnosticsPreview && (
                    <pre
                      style={{
                        margin: 0,
                        padding: 10,
                        background: "var(--bg-card)",
                        border: "1px solid var(--border)",
                        borderRadius: 6,
                        fontSize: 11,
                        fontFamily: "monospace",
                        color: "var(--text-secondary)",
                        maxHeight: 180,
                        overflowY: "auto",
                      }}
                    >
                      {JSON.stringify(diagnosticsPayload, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>

            {/* Email Contact */}
            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>
                Contact Email <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-muted)" }}>(Optional, for resolution updates)</span>
              </label>
              <input
                className="standard-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={inputStyle}
              />
            </div>

            {/* Submit Button */}
            <div style={{ display: "flex", justifyContent: "flex-start", paddingTop: 4 }}>
              <button
                type="button"
                className="action-button action-button--primary"
                onClick={() => void handleSend()}
                disabled={sending}
                style={{
                  padding: "10px 24px",
                  fontSize: 13,
                  fontWeight: 600,
                  opacity: sending ? 0.7 : 1,
                  cursor: sending ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Send size={14} />
                <span>{sending ? "Dispatching report..." : "Submit report"}</span>
              </button>
            </div>
          </div>
        )}
      </Panel>
    </section>
  );
}
