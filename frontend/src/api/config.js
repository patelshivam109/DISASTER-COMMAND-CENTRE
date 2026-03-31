const fallbackApiUrl = "https://disaster-command-centre.onrender.com";
const configuredApiUrl = (import.meta.env.VITE_API_URL || fallbackApiUrl).replace(/\/$/, "");

export const API_BASE_URL = configuredApiUrl.endsWith("/api")
  ? configuredApiUrl
  : `${configuredApiUrl}/api`;
export const AUTH_API_BASE_URL = `${API_BASE_URL}/auth`;
