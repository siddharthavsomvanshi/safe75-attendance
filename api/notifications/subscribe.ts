import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  getSupabaseClient,
  getUserHash,
  verifyCyberVidyaSession,
} from "./_helpers";

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

  const supabase = getSupabaseClient();
  if (!supabase) {
    res.status(500).json({ error: "Supabase environment configuration missing." });
    return;
  }

  // 3. Upsert push subscription on endpoint conflict
  try {
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
      res.status(500).json({ error: "Failed to save push subscription.", details: error.message });
      return;
    }

    res.status(200).json({
      ok: true,
      subscriptionId: data?.[0]?.id || null,
      enabled: data?.[0]?.enabled ?? true,
    });
  } catch (dbErr) {
    console.error("Database connection error in subscribe handler:", dbErr);
    res.status(500).json({
      error: "Database operation failed.",
      message: dbErr instanceof Error ? dbErr.message : String(dbErr),
    });
  }
}
