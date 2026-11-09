import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// These are injected at build time (see infra/docker/frontend.Dockerfile).
const apiUrl = process.env.VITE_API_URL ?? "http://localhost:8000";
const wsUrl = process.env.VITE_WS_URL ?? "ws://localhost:8000";
const schoolappWorkerUrl =
  process.env.VITE_SCHOOLAPP_WORKER_URL ?? "https://schoolapp-worker.example.workers.dev";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "autoUpdate",
      injectRegister: "auto",
      manifest: {
        name: "FAME — Recruitment Queue",
        short_name: "FAME",
        description: "Recruitment queue and candidate attribution platform.",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  define: {
    __WS_URL__: JSON.stringify(wsUrl),
    __SCHOOLAPP_WORKER_URL__: JSON.stringify(schoolappWorkerUrl),
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": { target: apiUrl, changeOrigin: true },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
  },
});
