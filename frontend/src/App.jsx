import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import AppShell from "./components/AppShell";
import BackendStatusBanner from "./components/BackendStatusBanner";
import { RouteLoader } from "./ui/skeleton";

const Dashboard = lazy(() => import("./pages/dashboard"));
const Disasters = lazy(() => import("./pages/disasters"));
const Resources = lazy(() => import("./pages/resources"));
const Volunteers = lazy(() => import("./pages/volunteers"));
const Login = lazy(() => import("./pages/login"));
const Signup = lazy(() => import("./pages/signup"));
const ResetPassword = lazy(() => import("./pages/reset-password"));
const ApiTest = lazy(() => import("./pages/api-test"));

function PageSuspense() {
  const location = useLocation();

  return (
    <div key={location.pathname} className="page-transition">
      <Suspense fallback={<RouteLoader />}>
        <Outlet />
      </Suspense>
    </div>
  );
}

function PublicLayout() {
  return (
    <AppShell>
      <PageSuspense />
    </AppShell>
  );
}

function RequireAuth({ children }) {
  const location = useLocation();
  const hasUser = Boolean(localStorage.getItem("user"));

  if (!hasUser) {
    return (
      <Navigate
        replace
        state={{
          from: location.pathname,
          message: "Login required to access this area.",
        }}
        to="/login"
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

function StandalonePage() {
  const location = useLocation();

  return (
    <div key={location.pathname} className="page-transition">
      <Suspense fallback={<RouteLoader />}>
        <Outlet />
      </Suspense>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <BackendStatusBanner />
      <Routes>
        <Route element={<StandalonePage />}>
          <Route element={<Login />} path="/login" />
          <Route element={<Signup />} path="/signup" />
          <Route element={<ResetPassword />} path="/reset-password" />
          <Route element={<ApiTest />} path="/api-test" />
        </Route>

        <Route element={<ProtectedLayout />}>
          <Route element={<Dashboard />} path="/" />
          <Route element={<Disasters />} path="/disasters" />
          <Route element={<Resources />} path="/resources" />
          <Route element={<Volunteers />} path="/volunteers" />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
