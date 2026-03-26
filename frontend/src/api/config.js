const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export const API_BASE_URL = rawBaseUrl.replace(/\/$/, "");
export const AUTH_API_BASE_URL = `${API_BASE_URL}/auth`;