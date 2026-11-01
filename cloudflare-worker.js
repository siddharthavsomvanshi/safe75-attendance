/**
 * Cloudflare Worker Proxy for CyberVidya API
 *
 * Why this is needed:
 * CyberVidya's firewall (nginx / Ubuntu) blocks Amazon Web Services (AWS) IP ranges,
 * returning "HTTP 403 Forbidden" with body "Blocked".
 * Because Vercel Serverless Functions run on AWS Lambda, direct proxy requests from
 * Vercel are blocked.
 * Cloudflare edge IP ranges (AS13335) are NOT blocked by CyberVidya.
 *
 * Deployment (takes ~1 minute on Cloudflare's free tier):
 * 1. Log in to https://dash.cloudflare.com -> Workers & Pages -> Create Application -> Create Worker.
 * 2. Name it "cybervidya-proxy".
 * 3. Paste this code and click "Deploy".
 * 4. Copy your worker URL (e.g., https://cybervidya-proxy.<subdomain>.workers.dev).
 * 5. In your Vercel Dashboard -> Project Settings -> Environment Variables, add:
 *      CYBERVIDYA_UPSTREAM_URL = https://cybervidya-proxy.<subdomain>.workers.dev/api
 * 6. Redeploy on Vercel. Direct in-app login will work seamlessly!
 */

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "X-Requested-With, Content-Type, Authorization, Origin, Accept, uid, UID",
        },
      });
    }

    const url = new URL(request.url);
    const targetUrl = `https://kiet.cybervidya.net${url.pathname}${url.search}`;

    const headers = new Headers(request.headers);
    headers.set("Origin", "https://kiet.cybervidya.net");
    headers.set("Referer", "https://kiet.cybervidya.net/main/dashboard");
    headers.set("Sec-Fetch-Site", "same-origin");
    headers.delete("Host");

    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
    });

    const newHeaders = new Headers(response.headers);
    newHeaders.set("Access-Control-Allow-Origin", "*");
    newHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    newHeaders.set("Access-Control-Allow-Headers", "X-Requested-With, Content-Type, Authorization, Origin, Accept, uid, UID");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  },
};
