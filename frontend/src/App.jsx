import { BrowserRouter, Routes, Route, Outlet, Navigate, useLocation } from "react-router-dom";
import AppShell from "./components/AppShell";

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

export default function App() {
  return (
    <BrowserRouter>
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
