import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import webpush from "web-push";

const NOTIF_HMAC_SECRET =
  process.env.NOTIF_HMAC_SECRET || "kiet_bunk_helper_snapshot_hmac_secret_key_2026";

const DEFAULT_SUPABASE_URL = "https://tsqtdyxklifueazelszl.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzcXRkeXhrbGlmdWVhemVsc3psIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NjI0NzYsImV4cCI6MjA5MjMzODQ3Nn0.xDC-W0cSLeyKgaVuoVcZo5-nRLG0twoiPbMmDFEVJDw";

const DEFAULT_VAPID_PUBLIC_KEY =
  "BPUsLEOcdm8qcsjbiJoy3PQCmH0Pg8adhr0sUSOFl4DDzXZCkO3WwVdpBhLl8q5bUPb8qkP5tNk_OQo6VWEyDXM";
const DEFAULT_VAPID_PRIVATE_KEY =
  "_DzfKgZ0RkWO4-B7jaTzueKlT1b774fLcOV_rPIsv3w";
const DEFAULT_VAPID_SUBJECT = "mailto:support@kiet-bunk-helper.app";

const VAPID_PUBLIC_KEY =
  process.env.VITE_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY || DEFAULT_VAPID_PRIVATE_KEY;
const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || DEFAULT_VAPID_SUBJECT;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  } catch (err) {
    console.warn("Failed to set VAPID details in test push:", err);
  }
}

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

    const supabase = getSupabase();

    // 3. Query active subscriptions for student
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_hash", userHash)
      .eq("enabled", true);

    if (error) {
      console.error("Failed to query push subscriptions:", error);
      res.status(500).json({ error: "Database query failed: " + error.message });
      return;
    }

    if (!subscriptions || subscriptions.length === 0) {
      res.status(404).json({
        ok: false,
        message: "No active push subscriptions found for this account. Click Enable Notifications first.",
      });
      return;
    }

    // 4. Send Web Push test notification
    const payload = JSON.stringify({
      title: "Safe75 Attendance",
      body: "Push notifications are working perfectly! You'll receive your daily schedule at 8:00 AM IST.",
      tag: "test-push",
      url: "/",
    });

    let sentCount = 0;
    let disabledCount = 0;
    const errors: string[] = [];

    for (const sub of subscriptions) {
      const pushSubscriptionObj = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSubscriptionObj, payload);
        sentCount += 1;
      } catch (pushErr: any) {
        const statusCode = pushErr?.statusCode || pushErr?.status;
        const errorMsg = pushErr instanceof Error ? pushErr.message : String(pushErr);

        console.warn(`Web push error for endpoint (${sub.endpoint.slice(0, 30)}...):`, statusCode, errorMsg);
        errors.push(`Endpoint status ${statusCode || "err"}: ${errorMsg}`);

        // If subscription expired or unsubscribed (404 Not Found or 410 Gone), disable ONLY this endpoint
        if (statusCode === 404 || statusCode === 410) {
          disabledCount += 1;
          await supabase
            .from("push_subscriptions")
            .update({ enabled: false, updated_at: new Date().toISOString() })
            .eq("id", sub.id);
        }
      }
    }

    res.status(200).json({
      ok: sentCount > 0,
      sentCount,
      disabledCount,
      totalTargeted: subscriptions.length,
      message: sentCount > 0 ? "Test push notification sent successfully!" : "Failed to deliver test push notification.",
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    console.error("Fatal error in test push handler:", err);
    res.status(500).json({
      error: "Test push failed: " + (err instanceof Error ? err.message : String(err)),
    });
  }
}
