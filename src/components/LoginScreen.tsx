import React, { useState, useEffect } from "react";
import { loginDirect, verifyOtpDirect, clearStoredSession } from "../services/cybervidyaApi";
import { AlertTriangle, Eye, EyeOff, ShieldCheck } from "./Icons";

interface LoginScreenProps {
  initialError?: string | null;
  onSuccess: () => void;
  onClearSession?: () => void;
}

export function LoginScreen({ initialError, onSuccess, onClearSession }: LoginScreenProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [otpMessage, setOtpMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError || null);

  useEffect(() => {
    if (initialError) {
      setError(initialError);
    }
  }, [initialError]);

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Please enter your Student ID / Roll Number and Password.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const result = await loginDirect(username, password);

      if (result.ok) {
        setLoading(false);
        onSuccess();
        return;
      }

      if (result.requiresOtp && result.transactionId) {
        setTransactionId(result.transactionId);
        setOtpMessage(result.message || "OTP sent to your registered mobile/email.");
        setLoading(false);
        return;
      }

      setError(result.error || "Login failed. Please check your credentials.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!otp.trim() || !transactionId) {
      setError("Please enter the 6-digit OTP.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const result = await verifyOtpDirect(transactionId, otp);

      if (result.ok) {
        setLoading(false);
        onSuccess();
        return;
      }

      setError(result.error || "Invalid OTP. Please try again.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setTransactionId(null);
    setOtpMessage(null);
    setError(null);
    setOtp("");
  }

  return (
    <div style={{ maxWidth: 400, margin: "32px auto", padding: "0 12px" }}>
      <section
        className="premium-panel rise-in"
        style={{
          padding: "26px 24px",
          borderRadius: 14,
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        {/* Branding Header */}
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <img
            src="/favicon.png"
            alt="Safe75 Attendance logo"
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              objectFit: "contain",
              marginBottom: 12,
              border: "1px solid var(--border)",
            }}
          />
          <h1
            style={{
              margin: "0 0 4px 0",
              fontSize: 20,
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.025em",
            }}
          >
            Safe75 Attendance
          </h1>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 13, lineHeight: 1.5 }}>
            {transactionId
              ? otpMessage || "Enter the 6-digit OTP sent to your registered contacts"
              : "Enter your Student ID and CyberVidya credentials to sync."}
          </p>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              backgroundColor: "var(--danger-soft)",
              border: "1px solid var(--danger-border)",
              color: "var(--danger)",
              fontSize: 12.5,
              marginBottom: 16,
              lineHeight: 1.5,
              textAlign: "left",
            }}
          >
            <div style={{ fontWeight: 650, marginBottom: 3, display: "flex", alignItems: "center", gap: 6 }}>
              <AlertTriangle size={14} />
              <span>{error.includes("403") || error.includes("firewall") ? "CyberVidya Cloud Firewall (403)" : "Authentication Notice"}</span>
            </div>
            <div>{error}</div>
            <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => {
                  clearStoredSession();
                  setError(null);
                  if (onClearSession) onClearSession();
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted)",
                  fontSize: 11.5,
                  textDecoration: "underline",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Clear saved session & reset
              </button>
            </div>
            {(error.includes("403") || error.includes("firewall")) && (
              <div
                style={{
                  marginTop: 8,
                  paddingTop: 8,
                  borderTop: "1px solid var(--danger-border)",
                  fontSize: 11.5,
                  color: "var(--text-muted)",
                }}
              >
                <p style={{ margin: "0 0 4px 0", fontWeight: 600, color: "var(--text-primary)" }}>
                  Resolution steps:
                </p>
                <ul style={{ margin: 0, paddingLeft: 16, lineHeight: 1.5 }}>
                  <li>
                    CyberVidya blocks direct cloud logins.
                  </li>
                  <li>
                    <strong>Chrome extension:</strong> Load the <code>extension/chrome</code> folder unpacked in <code>chrome://extensions</code> to connect directly.
                  </li>
                  <li>
                    <strong>Proxy login:</strong> Deploy <code>cloudflare-worker.js</code> and configure <code>CYBERVIDYA_UPSTREAM_URL</code>.
                  </li>
                </ul>
              </div>
            )}
          </div>
        )}

        {!transactionId ? (
          /* Credentials Form */
          <form onSubmit={handleLoginSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label
                htmlFor="cybervidya-rollno"
                style={{
                  display: "block",
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  marginBottom: 5,
                }}
              >
                Student ID / Roll Number
              </label>
              <input
                id="cybervidya-rollno"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. 2300290100000"
                disabled={loading}
                required
                className="standard-input"
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: 8,
                  fontSize: 14,
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label
                htmlFor="cybervidya-pass"
                style={{
                  display: "block",
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  marginBottom: 5,
                }}
              >
                CyberVidya Password
              </label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input
                  id="cybervidya-pass"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  disabled={loading}
                  required
                  className="standard-input"
                  style={{
                    width: "100%",
                    padding: "9px 38px 9px 12px",
                    borderRadius: 8,
                    fontSize: 14,
                    boxSizing: "border-box",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                  style={{
                    position: "absolute",
                    right: 8,
                    background: "none",
                    border: "none",
                    padding: 4,
                    cursor: "pointer",
                    color: "var(--text-muted)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="action-button action-button--primary"
              disabled={loading}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                marginTop: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: loading ? "wait" : "pointer",
                opacity: loading ? 0.75 : 1,
              }}
            >
              {loading ? "Authenticating..." : "Login"}
            </button>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>
              <ShieldCheck size={13} />
              <span>100% Client-Side Privacy • Credentials never stored off-device</span>
            </div>
          </form>
        ) : (
          /* OTP Form */
          <form onSubmit={handleOtpSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label
                htmlFor="cybervidya-otp-input"
                style={{
                  display: "block",
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  marginBottom: 6,
                  textAlign: "center",
                }}
              >
                6-Digit Security OTP
              </label>
              <input
                id="cybervidya-otp-input"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                disabled={loading}
                maxLength={6}
                required
                autoFocus
                className="standard-input"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 8,
                  fontSize: 18,
                  letterSpacing: 4,
                  textAlign: "center",
                  boxSizing: "border-box",
                  fontVariantNumeric: "tabular-nums",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="action-button action-button--secondary"
                onClick={handleReset}
                disabled={loading}
                style={{ flex: 1, padding: "10px", fontSize: 13, borderRadius: 8 }}
              >
                Back
              </button>
              <button
                type="submit"
                className="action-button action-button--primary"
                disabled={loading}
                style={{
                  flex: 2,
                  padding: "10px",
                  fontSize: 13.5,
                  fontWeight: 600,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {loading ? "Verifying..." : "Verify OTP"}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
