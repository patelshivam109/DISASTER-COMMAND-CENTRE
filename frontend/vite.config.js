import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

function getProxyTarget(configuredApiUrl) {
  const normalizedApiUrl = configuredApiUrl.trim().replace(/\/$/, "");
  if (!normalizedApiUrl) {
    return "http://localhost:5000";
  }

  return normalizedApiUrl.endsWith("/api")
    ? normalizedApiUrl.slice(0, -4)
    : normalizedApiUrl;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api": {
          target: getProxyTarget(env.VITE_API_URL || ""),
          changeOrigin: true,
        },
      },
    },
  };
});
