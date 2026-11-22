import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // Edge Caching: 60 seconds on Vercel CDN to protect serverless quotas from excessive polling
  const forceFresh = req.query.fresh === "1";
  if (!forceFresh) {
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=120");
  } else {
    res.setHeader("Cache-Control", "no-store, max-age=0");
  }

  const primaryUrl = process.env.CYBERVIDYA_UPSTREAM_URL || "https://kiet.cybervidya.net/api";
  const backupUrl = "https://cybervidya.amanpal.tech/api";

  const pingUpstream = async (url: string) => {
    const startTime = Date.now();
    try {
      const response = await fetch(url, {
        method: "HEAD",
        headers: {
          Origin: "https://kiet.cybervidya.net",
          Referer: "https://kiet.cybervidya.net/main/dashboard",
          "User-Agent": "Mozilla/5.0 Safe75-HealthCheck/1.0",
        },
        signal: AbortSignal.timeout(5000),
      });

      const latencyMs = Date.now() - startTime;
      // Any response under 500 means the server is reachable and active (even 401/403/404 means the gateway is alive)
      const isAlive = response.status < 500 && response.status !== 403;

      return {
        url,
        status: response.status,
        latencyMs,
        alive: isAlive,
        error: null,
      };
    } catch (err: any) {
      return {
        url,
        status: 0,
        latencyMs: Date.now() - startTime,
        alive: false,
        error: err.name === "TimeoutError" ? "Upstream Timeout (>5s)" : err.message || "Unreachable",
      };
    }
  };

  const [primaryResult, backupResult] = await Promise.all([
    pingUpstream(primaryUrl),
    pingUpstream(backupUrl),
  ]);

  let overallStatus: "operational" | "degraded" | "down" = "operational";

  if (!primaryResult.alive && !backupResult.alive) {
    overallStatus = "down";
  } else if (!primaryResult.alive || primaryResult.latencyMs > 900) {
    overallStatus = "degraded";
  }

  const effectiveLatency = primaryResult.alive ? primaryResult.latencyMs : backupResult.latencyMs;

  res.status(200).json({
    status: overallStatus,
    latencyMs: effectiveLatency,
    primary: primaryResult,
    backup: backupResult,
    timestamp: new Date().toISOString(),
  });
}
