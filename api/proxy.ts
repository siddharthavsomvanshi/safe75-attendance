import type { VercelRequest, VercelResponse } from "@vercel/node";

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

  const { path, ...queryParams } = req.query;

  let rawPath = "";
  if (Array.isArray(path)) {
    rawPath = path.join("/");
  } else if (typeof path === "string" && path) {
    rawPath = path;
  } else if (req.url) {
    const parsedUrl = new URL(req.url, "http://localhost");
    rawPath = parsedUrl.pathname.replace(/^\/api\/(cybervidya\/)?/, "");
  }

  // Strip leading 'cybervidya/' or leading slash if present
  let targetPath = rawPath.replace(/^cybervidya\//, "").replace(/^\//, "");

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(queryParams)) {
    if (Array.isArray(value)) {
      value.forEach((v) => searchParams.append(key, v));
    } else if (value !== undefined) {
      searchParams.append(key, String(value));
    }
  }

  const queryString = searchParams.toString();
  const upstreamCandidates = [
    process.env.CYBERVIDYA_UPSTREAM_URL,
    "https://cybervidya.amanpal.tech/api",
    "https://kiet.cybervidya.net/api",
  ].filter(Boolean) as string[];

  // Extract client IP address - take only the first client IP and ensure no proxy/AWS IPs are attached
  const rawXff = req.headers["x-forwarded-for"];
  let clientIp = "";
  if (typeof req.headers["x-real-ip"] === "string" && req.headers["x-real-ip"]) {
    clientIp = req.headers["x-real-ip"].trim();
  } else if (typeof rawXff === "string" && rawXff) {
    clientIp = rawXff.split(",")[0].trim();
  } else if (Array.isArray(rawXff) && rawXff[0]) {
    clientIp = rawXff[0].split(",")[0].trim();
  }

  // If client IP is missing, localhost, private, or AWS range, fallback to standard Indian ISP IP
  const isPrivateOrAws =
    !clientIp ||
    clientIp === "127.0.0.1" ||
    clientIp === "::1" ||
    clientIp.startsWith("10.") ||
    clientIp.startsWith("192.168.") ||
    clientIp.startsWith("172.16.") ||
    clientIp.startsWith("3.") ||
    clientIp.startsWith("54.") ||
    clientIp.startsWith("13.") ||
    clientIp.startsWith("15.") ||
    clientIp.startsWith("43.");

  if (isPrivateOrAws) {
    clientIp = "49.36.1.1"; // Reliance Jio Indian residential IP
  }

  const forwardHeaders: Record<string, string> = {
    Accept: "application/json, text/plain, */*",
    Origin: "https://kiet.cybervidya.net",
    Referer: "https://kiet.cybervidya.net/main/dashboard",
    "Sec-Fetch-Site": "same-origin",
    "X-Forwarded-For": clientIp,
    "X-Real-IP": clientIp,
    "X-Client-IP": clientIp,
    "CF-Connecting-IP": clientIp,
    "User-Agent":
      (typeof req.headers["user-agent"] === "string" && req.headers["user-agent"]) ||
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  };

  if (req.headers.accept) {
    forwardHeaders["Accept"] = Array.isArray(req.headers.accept)
      ? req.headers.accept[0]
      : req.headers.accept;
  }

  if (req.headers.authorization) {
    forwardHeaders["Authorization"] = Array.isArray(req.headers.authorization)
      ? req.headers.authorization[0]
      : req.headers.authorization;
  }

  if (req.headers.uid) {
    forwardHeaders["UID"] = Array.isArray(req.headers.uid)
      ? req.headers.uid[0]
      : req.headers.uid;
  }

  if (req.headers["content-type"]) {
    forwardHeaders["Content-Type"] = Array.isArray(req.headers["content-type"])
      ? req.headers["content-type"][0]
      : req.headers["content-type"];
  }

  const fetchOptions: RequestInit = {
    method: req.method,
    headers: forwardHeaders,
    signal: AbortSignal.timeout(30000),
  };

  if (req.method !== "GET" && req.method !== "HEAD" && req.body) {
    fetchOptions.body = typeof req.body === "object" ? JSON.stringify(req.body) : req.body;
  }

  let lastResponse: Response | null = null;
  let lastError: Error | null = null;

  for (const base of upstreamCandidates) {
    const cleanBase = base.replace(/\/$/, "");
    const upstreamUrl = cleanBase.endsWith("/api") ? cleanBase : `${cleanBase}/api`;
    const targetUrl = `${upstreamUrl}/${targetPath}${queryString ? `?${queryString}` : ""}`;

    try {
      const response = await fetch(targetUrl, fetchOptions);
      lastResponse = response;

      // If this upstream returns 403 Forbidden ("Blocked"), try the next candidate
      if (response.status === 403 && upstreamCandidates.indexOf(base) < upstreamCandidates.length - 1) {
        console.warn(`Upstream ${upstreamUrl} returned 403, falling back to next upstream...`);
        continue;
      }

      const contentType = response.headers.get("content-type") || "";
      const contentDisposition = response.headers.get("content-disposition");

      res.status(response.status);

      if (contentType) {
        res.setHeader("Content-Type", contentType);
      }
      if (contentDisposition) {
        res.setHeader("Content-Disposition", contentDisposition);
      }

      if (contentType.includes("application/json")) {
        const data = await response.json();
        res.json(data);
      } else {
        const arrayBuffer = await response.arrayBuffer();
        res.send(Buffer.from(arrayBuffer));
      }
      return;
    } catch (err) {
      console.warn(`Upstream ${targetUrl} failed:`, err);
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  if (lastResponse) {
    res.status(lastResponse.status);
    const text = await lastResponse.text();
    res.send(text);
    return;
  }

  res.status(500).json({
    error: "Failed to proxy request to any CyberVidya upstream server",
    message: lastError ? lastError.message : "Unknown error",
  });
}
