/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },

  plugins: [
    react(),
    visualizer({ open: true, filename: "dist/bundle-stats.html", gzipSize: true }),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: {
        enabled: false
      },
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "masked-icon.svg"],

      // Service Worker — estrategia de cache
      workbox: {
        // Cachear en instalación: JS, CSS, HTML
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // Runtime cache: llamadas a Supabase (network first, fallback a cache)
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5, // 5 minutos
              },
              networkTimeoutSeconds: 10,
            },
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "supabase-storage-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 días
              },
            },
          },
        ],
      },

      // Manifest — define cómo se ve la app instalada
      manifest: {
        name: "AxonTur — Agencia de Viajes",
        short_name: "AxonTur",
        description: "Back office y gestión operativa para agencias de viaje",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait-primary",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./src/setupTests.ts"],
  },
}));
