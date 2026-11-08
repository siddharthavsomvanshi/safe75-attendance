import React, { useEffect, useState } from "react";
import { NotificationGuideModal } from "./NotificationGuideModal";
import { Bell, Info, Sparkles } from "./Icons";
import {
  isPushSupported,
  getNotificationPermissionState,
  getVapidPublicKey,
  requestNotificationPermission,
  getExistingPushSubscription,
  subscribeToPushManager,
  registerPushSubscriptionAsync,
  unsubscribePushAsync,
  sendTestNotificationAsync,
} from "../services/notificationService";

export function NotificationBanner({ studentName }: { studentName?: string }) {
  const [supported, setSupported] = useState<boolean>(true);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  useEffect(() => {
    if (!isPushSupported()) {
      setSupported(false);
      return;
    }
    checkState();
  }, []);

  async function checkState() {
    const perm = getNotificationPermissionState();
    setPermission(perm);

    if (perm === "granted") {
      const sub = await getExistingPushSubscription();
      setIsEnabled(!!sub);
    } else {
      setIsEnabled(false);
    }
  }

  async function handleEnable() {
    setLoading(true);
    setMessage(null);
    try {
      const perm = await requestNotificationPermission();
      setPermission(perm);

      if (perm !== "granted") {
        setMessage({
          text: "Notifications are blocked in your browser settings. Please enable them in browser settings.",
          type: "error",
        });
        setIsEnabled(false);
        setLoading(false);
        return;
      }

      const vapidKey = getVapidPublicKey();
      if (!vapidKey) {
        setMessage({ text: "VAPID Public Key missing. Contact admin.", type: "error" });
        setLoading(false);
        return;
      }

      const sub = await subscribeToPushManager(vapidKey);
      if (!sub) {
        setMessage({ text: "Could not create push subscription.", type: "error" });
        setLoading(false);
        return;
      }

      const res = await registerPushSubscriptionAsync(sub, studentName);
      if (!res.ok) {
        setMessage({ text: res.error || "Failed to register subscription.", type: "error" });
        setIsEnabled(false);
      } else {
        setIsEnabled(true);
        setMessage({ text: "Daily 8:00 AM IST attendance notifications enabled!", type: "success" });
      }
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to enable notifications.",
        type: "error",
      });
      setIsEnabled(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleDisable() {
    setLoading(true);
    setMessage(null);
    try {
      const sub = await getExistingPushSubscription();
      if (sub) {
        await unsubscribePushAsync(sub);
      }
      setIsEnabled(false);
      setMessage({ text: "Daily attendance notifications disabled.", type: "info" });
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Failed to disable notifications.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleTestPush() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await sendTestNotificationAsync();
      if (res.ok) {
        setMessage({ text: "Test push notification sent!", type: "success" });
      } else {
        setMessage({ text: res.message || "Failed to send test push.", type: "error" });
      }
    } catch (err) {
      setMessage({ text: "Error sending test push.", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  if (!supported) {
    return null;
  }

  return (
    <>
      <section
        className="standard-card rise-in"
        style={{
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          marginTop: 10,
          marginBottom: 10,
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
            <Bell size={16} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
              Daily Morning Attendance Briefing (8:00 AM IST)
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {permission === "denied"
                ? "Notifications blocked in browser settings"
                : isEnabled
                ? "Daily morning attendance recommendations are active"
                : "Receive personalized morning guidance before classes start"}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setShowGuideModal(true)}
            className="action-button action-button--secondary"
            style={{
              padding: "5px 10px",
              fontSize: 12,
              fontWeight: 500,
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Info size={12} />
            <span>How it works</span>
          </button>

          {permission === "denied" ? (
            <span className="status-badge status-badge--danger" style={{ fontSize: 11, padding: "3px 8px" }}>Blocked</span>
          ) : isEnabled ? (
            <>
              <button
                type="button"
                onClick={handleTestPush}
                disabled={loading}
                className="action-button action-button--secondary"
                style={{
                  padding: "5px 10px",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: loading ? "wait" : "pointer",
                }}
              >
                Test Push
              </button>
              <button
                type="button"
                onClick={handleDisable}
                disabled={loading}
                className="action-button action-button--secondary"
                style={{
                  padding: "5px 12px",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: loading ? "wait" : "pointer",
                }}
              >
                {loading ? "Disabling..." : "Disable"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleEnable}
              disabled={loading}
              className="action-button action-button--primary"
              style={{
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 600,
                cursor: loading ? "wait" : "pointer",
              }}
            >
              {loading ? "Enabling..." : "Enable"}
            </button>
          )}
        </div>

        {message && (
          <div
            style={{
              width: "100%",
              fontSize: 12,
              marginTop: 4,
              color:
                message.type === "success"
                  ? "var(--success)"
                  : message.type === "error"
                  ? "var(--danger)"
                  : "var(--text-muted)",
            }}
          >
            {message.text}
          </div>
        )}
      </section>

      <NotificationGuideModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        onEnable={handleEnable}
        isEnabled={isEnabled}
      />
    </>
  );
}
