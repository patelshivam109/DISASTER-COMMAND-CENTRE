const configuredApiUrl = (import.meta.env.VITE_API_URL || "").trim().replace(/\/$/, "");

export const API_BASE_URL = configuredApiUrl
  ? configuredApiUrl.endsWith("/api")
    ? configuredApiUrl
    : `${configuredApiUrl}/api`
  : "/api";
export const AUTH_API_BASE_URL = `${API_BASE_URL}/auth`;
