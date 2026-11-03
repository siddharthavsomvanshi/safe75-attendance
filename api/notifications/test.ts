import type { VercelRequest, VercelResponse } from "@vercel/node";
import webpush from "web-push";
import {
  getSupabaseClient,
  getUserHash,
  verifyCyberVidyaSession,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
  VAPID_SUBJECT,
} from "./_helpers";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  } catch (err) {
    console.warn("Failed to set VAPID details in test push:", err);
  }
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

  const supabase = getSupabaseClient();
  if (!supabase) {
    res.status(500).json({ error: "Supabase environment configuration missing." });
    return;
  }

  // 3. Query active subscriptions for student
  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_hash", userHash)
    .eq("enabled", true);

  if (error) {
    console.error("Failed to query push subscriptions:", error);
    res.status(500).json({ error: "Database query failed.", details: error.message });
    return;
  }

  if (!subscriptions || subscriptions.length === 0) {
    res.status(404).json({
      ok: false,
      message: "No active push subscriptions found for this account. Enable notifications first.",
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
      if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
        throw new Error("VAPID keys are not configured on server.");
      }

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
}
