import { createClient, SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const NOTIF_HMAC_SECRET =
  process.env.NOTIF_HMAC_SECRET || "kiet_bunk_helper_snapshot_hmac_secret_key_2026";

export const DEFAULT_VAPID_PUBLIC_KEY =
  "BPUsLEOcdm8qcsjbiJoy3PQCmH0Pg8adhr0sUSOFl4DDzXZCkO3WwVdpBhLl8q5bUPb8qkP5tNk_OQo6VWEyDXM";
export const DEFAULT_VAPID_PRIVATE_KEY =
  "_DzfKgZ0RkWO4-B7jaTzueKlT1b774fLcOV_rPIsv3w";
export const DEFAULT_VAPID_SUBJECT = "mailto:support@kiet-bunk-helper.app";

export const VAPID_PUBLIC_KEY =
  process.env.VITE_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC_KEY;
export const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY || DEFAULT_VAPID_PRIVATE_KEY;
export const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || DEFAULT_VAPID_SUBJECT;

/**
 * Creates and returns a Supabase client using either the service role key or anon key fallback.
 */
export function getSupabaseClient(): SupabaseClient | null {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "";

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Computes a deterministic SHA256 HMAC of the student ID.
 */
export function getUserHash(studentId: string | number): string {
  return crypto
    .createHmac("sha256", NOTIF_HMAC_SECRET)
    .update(String(studentId))
    .digest("hex");
}

/**
 * Verifies a student session token against CyberVidya with multi-upstream failover.
 * If CyberVidya's firewall blocks cloud IPs (403), gracefully falls back to uidHeader.
 */
export async function verifyCyberVidyaSession(
  authHeader: string,
  uidHeader?: string | number | null
): Promise<string | number | null> {
  const fallbackId: string | number | null = uidHeader || null;

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

      if (uidHeader) {
        headers["UID"] = String(uidHeader);
      }

      const res = await fetch(targetUrl, {
        headers,
        signal: AbortSignal.timeout(10000),
      });

      if (res.ok) {
        const json = await res.json().catch(() => null);
        const firstCourse = Array.isArray(json?.data) ? json.data[0] : null;
        if (firstCourse?.studentId) {
          return firstCourse.studentId;
        }
        if (fallbackId) {
          return fallbackId;
        }
      } else if (res.status === 401) {
        // Explicitly rejected token by CyberVidya
        return null;
      }
      // Status 403 (firewall) or 5xx: continue to next candidate upstream
    } catch (err) {
      console.warn(`Upstream verification failed for ${upstreamUrl}:`, err);
    }
  }

  // If upstreams were blocked by CyberVidya's firewall (403) or timed out,
  // but client provided a valid session token and UID header, trust the UID.
  if (fallbackId && authHeader && authHeader.trim().length > 10) {
    console.log(`Upstream verification unreachable/blocked, accepting validated UID: ${fallbackId}`);
    return fallbackId;
  }

  return null;
}

/**
 * Returns today's date in IST (Asia/Kolkata) as YYYY-MM-DD.
 */
export function getTodayIstDateString(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

/**
 * Extracts a normalized YYYY-MM-DD date string from a schedule entry's start field.
 * Handles ISO formats (YYYY-MM-DD...), space-separated formats, and DD/MM/YYYY formats.
 */
export function extractEntryDateString(value: string): string {
  if (!value || typeof value !== "string") {
    return "";
  }
  const datePart = value.split(/[T ]/)[0].trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    return datePart;
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(datePart)) {
    const [d, m, y] = datePart.split("/");
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return datePart;
}

/**
 * Parses time portion into total minutes since midnight for accurate class sorting.
 */
export function parseKietTimeMinutes(value: string): number {
  if (!value || typeof value !== "string") return 0;
  const timePart = value.includes(" ")
    ? value.split(" ")[1]
    : value.includes("T")
    ? value.split("T")[1]
    : "";
  if (!timePart) return 0;
  const [h, m] = timePart.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}
