import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const SERVER_PORT = process.env.WORKBENCH_PORT ?? "5175";

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH ?? "/",
  server: {
    port: 5174,
    host: "127.0.0.1",
    proxy: {
      "/api": {
        target: `http://127.0.0.1:${SERVER_PORT}`,
        changeOrigin: false,
      },
    },
  },
});
