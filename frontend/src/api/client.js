import { API_BASE_URL } from "./config";
import { buildAuthHeaders, clearAuthSession } from "../utils/auth";

function redirectToLogin() {
  clearAuthSession();
  if (typeof window === "undefined") {
    return;
  }
  if (window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
}

export async function apiFetch(path, options = {}) {
  const requestPath = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
  const response = await fetch(requestPath, {
    ...options,
    headers: buildAuthHeaders(options.headers || {}),
  });

  if (response.status === 401) {
    redirectToLogin();
  }

  return response;
}
