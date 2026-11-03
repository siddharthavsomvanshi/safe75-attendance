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
  const { endpoint } = body;

  if (!endpoint || typeof endpoint !== "string") {
    res.status(400).json({ error: "Invalid request. Required field: endpoint (string)." });
    return;
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    res.status(500).json({ error: "Supabase environment configuration missing." });
    return;
  }

  // 3. Disable ONLY the matching subscription for this student
  try {
    const { data, error } = await supabase
      .from("push_subscriptions")
      .update({
        enabled: false,
        updated_at: new Date().toISOString(),
      })
      .eq("user_hash", userHash)
      .eq("endpoint", endpoint.trim())
      .select("id");

    if (error) {
      console.error("Failed to disable push subscription in Supabase:", error);
      res.status(500).json({ error: "Failed to unsubscribe device.", details: error.message });
      return;
    }

    res.status(200).json({
      ok: true,
      disabledCount: data?.length || 0,
    });
  } catch (dbErr) {
    console.error("Database connection error in unsubscribe handler:", dbErr);
    res.status(500).json({
      error: "Database operation failed.",
      message: dbErr instanceof Error ? dbErr.message : String(dbErr),
    });
  }
}
