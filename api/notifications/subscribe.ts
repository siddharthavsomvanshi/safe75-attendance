import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const NOTIF_HMAC_SECRET =
  process.env.NOTIF_HMAC_SECRET || "kiet_bunk_helper_snapshot_hmac_secret_key_2026";

const DEFAULT_SUPABASE_URL = "https://tsqtdyxklifueazelszl.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzcXRkeXhrbGlmdWVhemVsc3psIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NjI0NzYsImV4cCI6MjA5MjMzODQ3Nn0.xDC-W0cSLeyKgaVuoVcZo5-nRLG0twoiPbMmDFEVJDw";

function getSupabase() {
  const supabaseUrl =
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    DEFAULT_SUPABASE_URL;

  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_ANON_KEY;

  return createClient(supabaseUrl, supabaseKey);
}

function getUserHash(studentId: string | number): string {
  return crypto
    .createHmac("sha256", NOTIF_HMAC_SECRET)
    .update(String(studentId))
    .digest("hex");
}

async function verifyCyberVidyaSession(
  authHeader: string,
  uidHeader?: string | number | null
): Promise<string | number | null> {
  const fallbackId = uidHeader ? String(uidHeader).trim() : null;

  const upstreamCandidates = [
    process.env.CYBERVIDYA_UPSTREAM_URL,
    "https://cybervidya.amanpal.tech/api",
    "https://kiet.cybervidya.net/api",
  ].filter(Boolean) as string[];

  for (const base of upstreamCandidates) {
    const cleanBase = base.replace(/\/$/, "");
    const upstreamUrl = cleanBase.endsWith("/api") ? cleanBase : `${cleanBase}/api`;
    const targetUrl = `${upstreamUrl}/student/dashboard/registered-courses`;

    try {
      const headers: Record<string, string> = {
        Accept: "application/json, text/plain, */*",
        Authorization: authHeader,
        Origin: "https://kiet.cybervidya.net",
        Referer: "https://kiet.cybervidya.net/main/dashboard",
        "X-Forwarded-For": "49.36.1.1",
        "X-Real-IP": "49.36.1.1",
        "CF-Connecting-IP": "49.36.1.1",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      };

      if (fallbackId) {
        headers["UID"] = fallbackId;
      }

      const res = await fetch(targetUrl, {
        headers,
        signal: AbortSignal.timeout(6000),
      });

      if (res.ok) {
        const json: any = await res.json().catch(() => null);
        const firstCourse = Array.isArray(json?.data) ? json.data[0] : null;
        if (firstCourse?.studentId) {
          return String(firstCourse.studentId);
        }
        if (fallbackId) {
          return fallbackId;
        }
      } else if (res.status === 401) {
        return null;
      }
    } catch {
      // Continue to next upstream candidate
    }
  }

  if (fallbackId && authHeader && authHeader.trim().length > 10) {
    return fallbackId;
  }

  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, UID"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed. Use POST." });
    return;
  }

  try {
    const authHeader = Array.isArray(req.headers.authorization)
      ? req.headers.authorization[0]
      : req.headers.authorization;
    const uidHeader = Array.isArray(req.headers.uid)
      ? req.headers.uid[0]
      : req.headers.uid;

    if (!authHeader) {
      res.status(401).json({ error: "Unauthorized. CyberVidya session token missing." });
      return;
    }

    // 1. Verify CyberVidya session
    const verifiedStudentId = await verifyCyberVidyaSession(authHeader, uidHeader);
    if (!verifiedStudentId) {
      res.status(401).json({ error: "Could not establish verified student identity or session expired." });
      return;
    }

    // 2. Generate server-side HMAC user_hash
    const userHash = getUserHash(verifiedStudentId);

    const body = req.body || {};
    const { endpoint, keys, studentName } = body;

    if (
      !endpoint ||
      typeof endpoint !== "string" ||
      !keys ||
      typeof keys.p256dh !== "string" ||
      typeof keys.auth !== "string"
    ) {
      res.status(400).json({
        error: "Invalid push subscription. Required fields: endpoint (string), keys.p256dh (string), keys.auth (string).",
      });
      return;
    }

    const supabase = getSupabase();

    // 3. Upsert push subscription on endpoint conflict
    const { data, error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          user_hash: userHash,
          student_name: studentName || null,
          endpoint: endpoint.trim(),
          p256dh: keys.p256dh.trim(),
          auth: keys.auth.trim(),
          enabled: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" }
      )
      .select("id, enabled");

    if (error) {
      console.error("Failed to upsert push subscription in Supabase:", error);
      res.status(500).json({ error: "Failed to save push subscription: " + error.message });
      return;
    }

    res.status(200).json({
      ok: true,
      subscriptionId: data?.[0]?.id || null,
      enabled: data?.[0]?.enabled ?? true,
    });
  } catch (err: any) {
    console.error("Fatal error in subscribe handler:", err);
    res.status(500).json({
      error: "Subscription failed: " + (err instanceof Error ? err.message : String(err)),
    });
  }
}
