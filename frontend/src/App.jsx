import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Outlet, Navigate, useLocation } from "react-router-dom";
import AppShell from "./components/AppShell";
import { API_BASE_URL } from "./api/config";

import Dashboard from "./pages/dashboard";
import Disasters from "./pages/disasters";
import Resources from "./pages/resources";
import Volunteers from "./pages/volunteers";
import Login from "./pages/login";
import Signup from "./pages/signup";
import ResetPassword from "./pages/reset-password";
import ApiTest from "./pages/api-test";

function PublicLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

function RequireAuth({ children }) {
  const location = useLocation();
  const hasUser = Boolean(localStorage.getItem("user"));

  if (!hasUser) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
          message: "Login required to access this area.",
        }}
      />
    );
  }

  return children;
}

function ProtectedLayout() {
  return (
    <RequireAuth>
      <PublicLayout />
    </RequireAuth>
  );
}

function BackendStatusBanner() {
  const [message, setMessage] = useState("Connecting to backend...");
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let isMounted = true;

    async function checkBackend() {
      try {
        const response = await fetch(`${API_BASE_URL}/test`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Error connecting to backend");
        }

        if (isMounted) {
          setMessage(data.message || "Backend is working");
          setStatus("success");
        }
      } catch {
        if (isMounted) {
          setMessage("Error connecting to backend");
          setStatus("error");
        }
      }
    }

    checkBackend();

    return () => {
      isMounted = false;
    };
  }, []);

  const bannerClass =
    status === "error"
      ? "bg-red-100 text-red-700 border-red-200"
      : status === "success"
        ? "bg-emerald-100 text-emerald-700 border-emerald-200"
        : "bg-amber-100 text-amber-700 border-amber-200";

  return (
    <div className={`border-b px-4 py-3 text-sm font-medium ${bannerClass}`}>
      {message}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <BackendStatusBanner />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/api-test" element={<ApiTest />} />

        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/disasters" element={<Disasters />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/volunteers" element={<Volunteers />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
