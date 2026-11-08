import { useState } from "react";
import emailjs from "@emailjs/browser";
import { Panel } from "../components/UI";
import { Send, AlertTriangle } from "../components/Icons";

const SERVICE_ID = "service_74zznfb";
const TEMPLATE_ID = "template_bl3ru6b";
const PUBLIC_KEY = "my0XXtzejINkKbVI_";

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

export function Snitch() {
  const [issueType, setIssueType] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!issueType || !message.trim()) {
      alert("Select an issue type and describe what happened.");
      return;
    }

    setSending(true);
    try {
      await emailjs.send(
        SERVICE_ID,
        TEMPLATE_ID,
        { type: issueType, message, user_email: email },
        PUBLIC_KEY,
      );
      alert("Thanks. Your report has been sent.");
      setIssueType("");
      setMessage("");
      setEmail("");
    } catch (err) {
      console.error("Failed to send feedback:", err);
      alert("Couldn't send the report. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section style={{ display: "grid", gap: 14 }}>
      <Panel
        title="Report Attendance Issues"
        subtitle="Notice an anomaly with your attendance? Let us know."
      >
        <div
          className="standard-card rise-in border-l-warning"
          style={{
            display: "grid",
            gap: 16,
            borderRadius: 12,
            padding: "18px 20px",
          }}
        >
          {/* Issue Type */}
          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>
              Issue Type
            </label>
            <select
              className="standard-input"
              value={issueType}
              onChange={(e) => setIssueType(e.target.value)}
              style={inputStyle}
            >
              <option value="" disabled>Select issue category</option>
              <option value="app-broke">App malfunction or crash</option>
              <option value="attendance-messed-up">Attendance count discrepancy</option>
              <option value="idea">Feature request or feedback</option>
              <option value="weird">Other inquiry</option>
            </select>
          </div>

          {/* Message */}
          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>
              Description
            </label>
            <textarea
              className="standard-input"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Provide context or details about the issue..."
              rows={6}
              style={{ ...inputStyle, resize: "vertical", minHeight: 140 }}
            />
          </div>

          {/* Email */}
          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>
              Contact Email (Optional)
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

          {/* Submit */}
          <div style={{ display: "flex", justifyContent: "flex-start", paddingTop: 4 }}>
            <button
              type="button"
              className="action-button action-button--primary"
              onClick={() => void handleSend()}
              disabled={sending}
              style={{
                padding: "9px 20px",
                fontSize: 13,
                fontWeight: 600,
                opacity: sending ? 0.7 : 1,
                cursor: sending ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Send size={13} />
              <span>{sending ? "Sending report..." : "Submit report"}</span>
            </button>
          </div>
        </div>
      </Panel>
    </section>
  );
}
