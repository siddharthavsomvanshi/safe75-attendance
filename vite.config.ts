import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "dev-notifications-handler",
      apply: "serve",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && req.url.startsWith("/api/notifications/")) {
            res.setHeader("Content-Type", "application/json");
            if (req.url.includes("/test")) {
              res.end(
                JSON.stringify({
                  ok: true,
                  sentCount: 1,
                  message: "Local dev mode: test push handled.",
                })
              );
              return;
            }
            res.end(JSON.stringify({ ok: true, enabled: true }));
            return;
          }
          next();
        });
      },
    },
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "autoUpdate",
      includeAssets: ["favicon.png"],
      manifest: {
        name: "Safe75 Attendance",
        short_name: "Safe75",
        description: "Smart Attendance Tracker & Academic Planning Suite",
        theme_color: "#ffffff",
        background_color: "#f8fafc",
        display: "standalone",
        icons: [
          {
            src: "favicon.png",
            sizes: "192x192 512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api/cybervidya": {
        target: "https://kiet.cybervidya.net/api",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/cybervidya/, ""),
      },
    },
  },
});
