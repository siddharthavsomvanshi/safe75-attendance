import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

const CRON_SECRET = process.env.CRON_SECRET || "";

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
    console.warn("Failed to set VAPID details in daily-reminder:", err);
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

function getTodayIstDateString(date: Date = new Date()): string {
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

function extractEntryDateString(value: string): string {
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

function parseKietTimeMinutes(value: string): number {
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

interface SnapshotCourseComponent {
  courseCode: string;
  courseName: string;
  courseId: number;
  componentName: string;
  courseComponentId: number;
  present: number;
  extraAttendance: number;
  total: number;
  percentage: number;
}

interface SnapshotScheduleEntry {
  courseCode: string | null;
  courseName: string | null;
  courseCompName: string | null;
  start: string;
  end: string;
  type: "CLASS" | "HOLIDAY";
  classRoom: string | null;
}

function normalizeIdentifier(value: string | null | undefined): string {
  return (value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function calculateSafeBunks(present: number, total: number): number {
  return total > 0 ? Math.max(0, Math.floor(present / 0.75 - total)) : 0;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Cron Authorization Check
  const authHeader = Array.isArray(req.headers.authorization)
    ? req.headers.authorization[0]
    : req.headers.authorization;

  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    res.status(401).json({ error: "Unauthorized. Invalid CRON_SECRET token." });
    return;
  }

  try {
    const supabase = getSupabase();
    const todayIstDate = getTodayIstDateString();

    const GLOBAL_OFF_DAYS: Record<string, string> = {
      "2026-11-06": "No Classes (College Off)",
    };

    if (GLOBAL_OFF_DAYS[todayIstDate]) {
      res.status(200).json({
        ok: true,
        todayIstDate,
        processedUsers: 0,
        message: `Skipped daily reminders: ${GLOBAL_OFF_DAYS[todayIstDate]}`,
      });
      return;
    }

    // 2. Query enabled push subscriptions
    const { data: activeSubs, error: subErr } = await supabase
      .from("push_subscriptions")
      .select("id, user_hash, student_name, endpoint, p256dh, auth")
      .eq("enabled", true);

    if (subErr) {
      console.error("Failed to query push_subscriptions:", subErr);
      res.status(500).json({ error: "Database query failed: " + subErr.message });
      return;
    }

    if (!activeSubs || activeSubs.length === 0) {
      res.status(200).json({
        ok: true,
        todayIstDate,
        processedUsers: 0,
        message: "No active push subscriptions found.",
      });
      return;
    }

    // Group subscriptions by user_hash
    const userMap = new Map<string, typeof activeSubs>();
    for (const sub of activeSubs) {
      const list = userMap.get(sub.user_hash) || [];
      list.push(sub);
      userMap.set(sub.user_hash, list);
    }

    let successUsers = 0;
    let skippedUsers = 0;
    let failedUsers = 0;

    // 3. Process each student independently
    for (const [userHash, subscriptions] of userMap.entries()) {
      const idempotencyKey = `${userHash}:${todayIstDate}:daily_attendance_plan`;
      let logId: string | null = null;

      try {
        // 4. Atomic Idempotency Claim BEFORE processing/sending
        const { data: logInsert, error: claimErr } = await supabase
          .from("notification_delivery_logs")
          .insert({
            user_hash: userHash,
            notification_date: todayIstDate,
            notification_type: "daily_attendance_plan",
            idempotency_key: idempotencyKey,
            status: "failed",
            error_message: "Processing daily attendance plan...",
          })
          .select("id")
          .single();

        if (claimErr) {
          if (claimErr.code === "23505" || claimErr.message.includes("unique")) {
            console.log(`Skipping student hash ${userHash.slice(0, 8)}... — already processed for ${todayIstDate}`);
            skippedUsers += 1;
            continue;
          }
          console.error(`Failed to claim notification log for ${userHash.slice(0, 8)}...:`, claimErr);
          failedUsers += 1;
          continue;
        }

        logId = logInsert.id;

        // 5. Query latest snapshot for student
        const { data: snapshots, error: snapErr } = await supabase
          .from("daily_attendance_snapshots")
          .select("captured_at, attendance_data, schedule_data")
          .eq("user_hash", userHash)
          .order("captured_at", { ascending: false })
          .limit(1);

        if (snapErr || !snapshots || snapshots.length === 0) {
          await supabase
            .from("notification_delivery_logs")
            .update({
              status: "skipped_no_classes",
              error_message: "No snapshot available",
            })
            .eq("id", logId);
          skippedUsers += 1;
          continue;
        }

        const snapshot = snapshots[0];
        const capturedAt = new Date(snapshot.captured_at);
        const ageHours = (Date.now() - capturedAt.getTime()) / (1000 * 60 * 60);

        let notificationTitle = "Safe75 Attendance";
        let notificationBody = "";

        if (ageHours > 72) {
          notificationBody = "Attendance data is over 3 days old. Refresh your attendance in Safe75.";
        } else {
          // 7. Today's Classes Identification (exact calendar date match, no UTC timezone drift)
          const scheduleEntries = (snapshot.schedule_data || []) as SnapshotScheduleEntry[];
          const todayClasses = scheduleEntries.filter((entry) => {
            if (entry.type === "HOLIDAY") return false;
            const entryDate = extractEntryDateString(entry.start);
            return entryDate === todayIstDate;
          });

          if (todayClasses.length === 0) {
            await supabase
              .from("notification_delivery_logs")
              .update({
                status: "skipped_no_classes",
                error_message: null,
              })
              .eq("id", logId);
            skippedUsers += 1;
            continue;
          }

          // Sort today's classes chronologically by start time
          todayClasses.sort(
            (a, b) => parseKietTimeMinutes(a.start) - parseKietTimeMinutes(b.start)
          );

          // 8. Attendance Recommendation Calculation
          const courses = (snapshot.attendance_data || []) as SnapshotCourseComponent[];

          interface ComponentState {
            courseCode: string;
            courseName: string;
            componentName: string;
            present: number;
            total: number;
            percentage: number;
            safeBunks: number;
          }

          const componentExactMap = new Map<string, ComponentState>();
          const componentCodeMap = new Map<string, ComponentState>();
          const componentNameMap = new Map<string, ComponentState>();

          for (const course of courses) {
            const safeBunks = calculateSafeBunks(course.present, course.total);
            const state: ComponentState = {
              courseCode: course.courseCode,
              courseName: course.courseName || course.courseCode || "Class",
              componentName: course.componentName || "",
              present: course.present,
              total: course.total,
              percentage: course.percentage,
              safeBunks,
            };

            const exactKey = [
              normalizeIdentifier(course.courseCode),
              normalizeIdentifier(course.componentName),
            ].join(":");
            componentExactMap.set(exactKey, state);

            const codeKey = normalizeIdentifier(course.courseCode);
            if (codeKey && !componentCodeMap.has(codeKey)) {
              componentCodeMap.set(codeKey, state);
            }

            const nameKey = normalizeIdentifier(course.courseName);
            if (nameKey && !componentNameMap.has(nameKey)) {
              componentNameMap.set(nameKey, state);
            }
          }

          const classLines: string[] = [];

          for (let i = 0; i < todayClasses.length; i++) {
            const entry = todayClasses[i];
            const lecNum = i + 1;

            const exactKey = [
              normalizeIdentifier(entry.courseCode),
              normalizeIdentifier(entry.courseCompName),
            ].join(":");
            const codeKey = normalizeIdentifier(entry.courseCode);
            const nameKey = normalizeIdentifier(entry.courseName);

            const state =
              componentExactMap.get(exactKey) ||
              (codeKey ? componentCodeMap.get(codeKey) : undefined) ||
              (nameKey ? componentNameMap.get(nameKey) : undefined);

            const subjectName =
              state?.courseName || entry.courseName || entry.courseCode || "Class";

            if (!state) {
              classLines.push(`Lec ${lecNum} (${subjectName}): Check plan in app`);
            } else if (state.percentage < 75) {
              classLines.push(`Lec ${lecNum} (${subjectName}): Attend (${Math.round(state.percentage)}%)`);
            } else if (state.safeBunks > 0) {
              classLines.push(`Lec ${lecNum} (${subjectName}): Can miss`);
              state.safeBunks -= 1;
            } else {
              classLines.push(`Lec ${lecNum} (${subjectName}): Try not to miss`);
            }
          }

          if (classLines.length === 0) {
            notificationBody = `You have ${todayClasses.length} class${todayClasses.length > 1 ? "es" : ""} scheduled today. Check Safe75.`;
          } else {
            notificationBody = classLines.join("\n");
          }

          if (ageHours >= 24) {
            notificationBody = `(Attendance checked yesterday)\n` + notificationBody;
          }
        }

        // 9. Web Push Delivery to User's Subscriptions
        const pushPayload = JSON.stringify({
          title: notificationTitle,
          body: notificationBody,
          tag: "daily-attendance-plan",
          url: "/",
        });

        let sentCount = 0;
        let expiredCount = 0;
        const pushErrors: string[] = [];

        for (const sub of subscriptions) {
          try {
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth },
              },
              pushPayload
            );
            sentCount += 1;
          } catch (pushErr: any) {
            const statusCode = pushErr?.statusCode || pushErr?.status;
            const errorMsg = pushErr instanceof Error ? pushErr.message : String(pushErr);
            pushErrors.push(`Endpoint ${sub.id.slice(0, 8)}... status ${statusCode || "err"}: ${errorMsg}`);

            if (statusCode === 404 || statusCode === 410) {
              expiredCount += 1;
              await supabase
                .from("push_subscriptions")
                .update({ enabled: false, updated_at: new Date().toISOString() })
                .eq("id", sub.id);
            }
          }
        }

        // 10. Update Delivery Log Row
        let finalStatus: "success" | "expired_subscription" | "failed" = "failed";
        let finalErrorMessage: string | null = null;

        if (sentCount > 0) {
          finalStatus = "success";
          successUsers += 1;
        } else if (expiredCount === subscriptions.length) {
          finalStatus = "expired_subscription";
          finalErrorMessage = "All push endpoints returned 404/410 (expired)";
          failedUsers += 1;
        } else {
          finalStatus = "failed";
          finalErrorMessage = pushErrors.join("; ");
          failedUsers += 1;
        }

        await supabase
          .from("notification_delivery_logs")
          .update({
            status: finalStatus,
            error_message: finalErrorMessage,
          })
          .eq("id", logId);

      } catch (userErr: any) {
        console.error(`Unexpected error processing user ${userHash.slice(0, 8)}...:`, userErr);
        failedUsers += 1;
        if (logId) {
          await supabase
            .from("notification_delivery_logs")
            .update({
              status: "failed",
              error_message: userErr instanceof Error ? userErr.message : String(userErr),
            })
            .eq("id", logId)
            .catch(() => {});
        }
      }
    }

    res.status(200).json({
      ok: true,
      todayIstDate,
      processedUsers: userMap.size,
      successUsers,
      skippedUsers,
      failedUsers,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Fatal error in daily reminder cron handler:", err);
    res.status(500).json({
      error: "Daily reminder failed: " + (err instanceof Error ? err.message : String(err)),
    });
  }
}
