import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "./src") },
      {
        find: /^lucide-react$/,
        replacement: path.resolve(__dirname, "./src/lib/lucide-react.tsx"),
      },
      {
        find: "lucide-react-upstream",
        replacement: path.resolve(__dirname, "./node_modules/lucide-react"),
      },
      {
        find: /^recharts$/,
        replacement: path.resolve(__dirname, "./src/lib/recharts.tsx"),
      },
      {
        find: "recharts-upstream",
        replacement: path.resolve(__dirname, "./node_modules/recharts"),
      },
    ],
  },
  server: {
    host: true,
    port: 3000,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8001",
        changeOrigin: true,
      },
    },
  },
});