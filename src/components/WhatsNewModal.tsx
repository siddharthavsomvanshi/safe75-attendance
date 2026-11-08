import React, { useState, useEffect } from "react";
import { Bell, Ticket, Sparkles, X, Info } from "./Icons";

const CURRENT_WHATS_NEW_VERSION = "2.1";
const STORAGE_KEY = "kiet_seen_whats_new_version";

interface WhatsNewModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onOpenGuide?: () => void;
}

export function WhatsNewModal({ isOpen: overrideIsOpen, onClose, onOpenGuide }: WhatsNewModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (overrideIsOpen !== undefined) {
      setIsOpen(overrideIsOpen);
      return;
    }

    try {
      const seenVersion = localStorage.getItem(STORAGE_KEY);
      if (seenVersion !== CURRENT_WHATS_NEW_VERSION) {
        setIsOpen(true);
      }
    } catch {
      // Ignore storage errors
    }
  }, [overrideIsOpen]);

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, CURRENT_WHATS_NEW_VERSION);
    } catch {
      // Ignore storage errors
    }
    setIsOpen(false);
    if (onClose) onClose();
  };

  const handleLearnNotifications = () => {
    handleDismiss();
    if (onOpenGuide) onOpenGuide();
  };

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
          maxWidth: 480,
          overflow: "hidden",
          boxShadow: "var(--shadow-md)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header Banner */}
        <div
          style={{
            padding: "20px 22px 18px",
            background: "var(--bg-card-subtle)",
            borderBottom: "1px solid var(--border)",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                background: "var(--primary-soft)",
                color: "var(--primary)",
                padding: "2px 7px",
                borderRadius: 4,
              }}
            >
              Update v{CURRENT_WHATS_NEW_VERSION}
            </span>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
              Release Notes
            </span>
          </div>

          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
            New Features & Improvements
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "4px 0 0 0" }}>
            New tools designed to keep your attendance above 75% with zero guesswork.
          </p>
        </div>

        {/* Modal Content Items */}
        <div style={{ padding: "18px 22px", display: "grid", gap: 12 }}>
          {/* Feature 1: Notifications */}
          <div
            style={{
              display: "flex",
              gap: 12,
              padding: "12px",
              borderRadius: 10,
              background: "var(--bg-card-subtle)",
              border: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: "var(--primary-soft)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--primary)",
                flexShrink: 0,
              }}
            >
              <Bell size={18} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                Daily 8:00 AM Attendance Briefings
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2, lineHeight: 1.4 }}>
                Personalized morning guidance on classes you can safely skip or must attend to stay safe.
              </div>
            </div>
          </div>

          {/* Feature 2: Official Hall Tickets */}
          <div
            style={{
              display: "flex",
              gap: 12,
              padding: "12px",
              borderRadius: 10,
              background: "var(--bg-card-subtle)",
              border: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: "var(--success-soft)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--success)",
                flexShrink: 0,
              }}
            >
              <Ticket size={18} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                Direct CyberVidya Admit Cards
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2, lineHeight: 1.4 }}>
                Fetch and download official PDF hall tickets for all your exam sessions directly inside the app.
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div
          style={{
            padding: "14px 22px",
            borderTop: "1px solid var(--border)",
            background: "var(--bg-card-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={handleLearnNotifications}
            className="action-button action-button--secondary"
            style={{ padding: "6px 12px", fontSize: 12, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 5 }}
          >
            <Info size={12} />
            <span>How notifications work</span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="action-button action-button--primary"
            style={{ padding: "7px 16px", fontSize: 13, fontWeight: 600 }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
