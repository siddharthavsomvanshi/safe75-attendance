import React from "react";
import { Bell, Info, X, Target, Clock, Sparkles } from "./Icons";

interface NotificationGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnable?: () => void;
  isEnabled?: boolean;
}

export function NotificationGuideModal({
  isOpen,
  onClose,
  onEnable,
  isEnabled,
}: NotificationGuideModalProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        animation: "fadeIn 0.2s ease-out",
      }}
    >
      <div
        className="rise-in"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          width: "95%",
          maxWidth: 540,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "var(--shadow-md)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--bg-card-subtle)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "var(--primary-soft)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--primary)",
              }}
            >
              <Info size={16} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                How Morning Briefings Work
              </h3>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>
                Automated daily recommendations delivered straight to your device
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="action-button action-button--secondary"
            style={{ padding: "4px 8px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            <X size={12} />
            <span>Close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "18px 20px", display: "grid", gap: 16 }}>
          {/* Live Lock Screen Notification Preview Mockup */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 6 }}>
              Sample 8:00 AM Morning Briefing
            </div>

            <div
              style={{
                background: "#0f172a",
                borderRadius: 12,
                padding: "14px 16px",
                color: "#f8fafc",
                boxShadow: "var(--shadow-sm)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              {/* Notification Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      background: "var(--primary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Target size={11} style={{ color: "#fff" }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#f8fafc" }}>Safe75 Briefing</span>
                </div>
                <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>8:00 AM IST</span>
              </div>

              {/* Notification Body Content */}
              <div style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.5, display: "grid", gap: 3 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: "#34d399", fontWeight: 600 }}>Period 1 (DBMS):</span>
                  <span>Safe to miss</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: "#f87171", fontWeight: 600 }}>Period 2 (OS):</span>
                  <span>Must attend (72.0%)</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: "#fbbf24", fontWeight: 600 }}>Period 3 (CN):</span>
                  <span>Caution (1 bunk left)</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3-Step Process Explanation */}
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
              How the System Operates
            </div>

            {/* Step 1 */}
            <div
              style={{
                display: "flex",
                gap: 12,
                padding: "10px 12px",
                borderRadius: 10,
                background: "var(--bg-card-subtle)",
                border: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  background: "var(--primary)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                1
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                  Daily Sync After College
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2, lineHeight: 1.4 }}>
                  Opening Safe75 refreshes your latest attendance numbers from CyberVidya and stores them securely.
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div
              style={{
                display: "flex",
                gap: 12,
                padding: "10px 12px",
                borderRadius: 10,
                background: "var(--bg-card-subtle)",
                border: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  background: "var(--primary)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                2
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                  Automated 8:00 AM Calculation
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2, lineHeight: 1.4 }}>
                  The engine matches today's timetable periods against your subject margins and computes whether you can bunk safely.
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div
              style={{
                display: "flex",
                gap: 12,
                padding: "10px 12px",
                borderRadius: 10,
                background: "var(--bg-card-subtle)",
                border: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  background: "var(--primary)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                3
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                  Morning Device Push
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2, lineHeight: 1.4 }}>
                  Before leaving for campus, your lock screen tells you exactly which lectures need your presence.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid var(--border)",
            background: "var(--bg-card-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="action-button action-button--secondary"
            style={{ padding: "6px 14px", fontSize: 12 }}
          >
            Got it
          </button>

          {!isEnabled && onEnable && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEnable();
              }}
              className="action-button action-button--primary"
              style={{ padding: "7px 16px", fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5 }}
            >
              <Bell size={13} />
              <span>Enable Notifications</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
