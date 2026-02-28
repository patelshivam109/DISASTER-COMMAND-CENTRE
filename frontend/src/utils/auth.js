export const getStoredUser = () => {
  try {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
};

export const isLoggedIn = () => Boolean(getStoredUser());

export const getUserRole = () => {
  const storedRole = (localStorage.getItem("userRole") || "volunteer").toLowerCase();
  return storedRole === "admin" ? "admin" : "volunteer";
};

export const isAdmin = () => getUserRole() === "admin";

export const buildRoleHeaders = (headers = {}) => {
  if (!isLoggedIn()) {
    return headers;
  }

  return {
    ...headers,
    "X-Role": getUserRole(),
  };
};

