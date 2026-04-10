const TOKEN_STORAGE_KEY = "token";

export const getStoredUser = () => {
  try {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
};

export const getStoredToken = () => localStorage.getItem(TOKEN_STORAGE_KEY) || "";

export const isLoggedIn = () => Boolean(getStoredToken() && getStoredUser());

export const getUserRole = () => {
  const user = getStoredUser();
  const storedRole = (user?.role || "volunteer").toLowerCase();
  return storedRole === "admin" ? "admin" : "volunteer";
};

export const isAdmin = () => getUserRole() === "admin";

export const persistAuthSession = ({ access_token: accessToken, user }) => {
  if (!accessToken || !user) {
    return;
  }

  localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
  localStorage.setItem("user", JSON.stringify(user));
};

export const clearAuthSession = () => {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem("user");
};

export const buildAuthHeaders = (headers = {}) => {
  const token = getStoredToken();
  if (!token) {
    return headers;
  }

  return {
    ...headers,
    Authorization: `Bearer ${token}`,
  };
};
