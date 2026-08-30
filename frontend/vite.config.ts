import react from "@vitejs/plugin-react";
import { loadEnv } from 'vite';
import { defineConfig } from "vitest/config";
import { activityDevPlugin } from './server/activity-dev.mjs';

export default defineConfig(({ mode }) => ({
  plugins: [react(), activityDevPlugin(loadEnv(mode, '.', ''))],
  server: {
    proxy: {
      "/api/genlayer": {
        target: "https://studio.genlayer.com",
        changeOrigin: true,
        rewrite: () => "/api",
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    css: true,
  },
}));
