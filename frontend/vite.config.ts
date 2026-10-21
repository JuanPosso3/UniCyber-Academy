import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    // El frontend llama a /api y Vite lo reenvía al backend real.
    // Así la cookie HttpOnly se emite y se envía en el mismo origen
    // (localhost:5173) durante el desarrollo.
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
