import React, { useState, useEffect, useRef } from "react";

export interface SystemHealthData {
  status: "operational" | "degraded" | "down";
  latencyMs: number;
  primary?: {
    url: string;
    status: number;
    latencyMs: number;
    alive: boolean;
    error?: string | null;
  };
  backup?: {
    url: string;
    status: number;
    latencyMs: number;
    alive: boolean;
    error?: string | null;
  };
  timestamp?: string;
}

export function ERPStatusIndicator() {
  const [health, setHealth] = useState<SystemHealthData | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    async function checkHealth() {
      try {
        const res = await fetch("/api/health");
        if (!res.ok) return;
        const data = (await res.json()) as SystemHealthData;
        if (isMounted) setHealth(data);
      } catch {
        // Non-blocking, fallback to null
      }
    }

    checkHealth();
    // Re-check every 3 minutes (matches edge cache TTL)
    const interval = setInterval(checkHealth, 3 * 60 * 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Close popup on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDetails(false);
      }
    }
    if (showDetails) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showDetails]);

  if (!health) return null;

  const statusColor =
    health.status === "operational"
      ? "var(--success)"
      : health.status === "degraded"
      ? "var(--warning)"
      : "var(--danger)";

  const statusLabel =
    health.status === "operational"
      ? "ERP Online"
      : health.status === "degraded"
      ? `ERP Slow (${health.latencyMs}ms)`
      : "ERP Outage";

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setShowDetails((prev) => !prev)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 8px",
          borderRadius: 20,
          background: "var(--bg-card-subtle)",
          border: "1px solid var(--border)",
          fontSize: 11.5,
          fontWeight: 600,
          color: "var(--text-secondary)",
          cursor: "pointer",
          transition: "all 0.15s ease",
        }}
        title="Click to view CyberVidya ERP connection health"
        aria-label="ERP Health Status"
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            backgroundColor: statusColor,
            boxShadow: `0 0 6px ${statusColor}`,
            display: "inline-block",
            flexShrink: 0,
          }}
        />
        <span className="erp-status-label">{statusLabel}</span>
      </button>

      {showDetails && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 260,
            padding: 14,
            borderRadius: 12,
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.3)",
            zIndex: 1000,
            display: "grid",
            gap: 8,
            fontSize: 12,
            color: "var(--text-primary)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 12.5 }}>CyberVidya Connection</span>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                color: statusColor,
                textTransform: "uppercase",
              }}
            >
              {health.status}
            </span>
          </div>

          <div style={{ display: "grid", gap: 4, color: "var(--text-secondary)" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Round-trip Ping:</span>
              <strong style={{ color: "var(--text-primary)" }}>{health.latencyMs} ms</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Primary Upstream:</span>
              <span style={{ color: health.primary?.alive ? "var(--success)" : "var(--danger)" }}>
                {health.primary?.alive ? "Reachable" : "Blocked / Offline"}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Backup Gateway:</span>
              <span style={{ color: health.backup?.alive ? "var(--success)" : "var(--danger)" }}>
                {health.backup?.alive ? "Standby Active" : "Offline"}
              </span>
            </div>
          </div>

          <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4, marginTop: 4, background: "var(--bg-card-subtle)", padding: 8, borderRadius: 6 }}>
            {health.status === "operational"
              ? "CyberVidya ERP is responsive. Attendance sync and proxies are running normally."
              : health.status === "degraded"
              ? "High latency detected from college ERP servers. Refreshes may take an extra moment."
              : "CyberVidya servers appear to be offline or experiencing downtime. Safe75 local data is cached."}
          </div>
        </div>
      )}
    </div>
  );
}
