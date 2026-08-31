// src/App.tsx
import { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import ScrollToTop from "./components/ScrollTop";
import SpotlightCursor from "./components/CustomCursor";
import { ToastProvider } from "./components/ToastProvider";
import GlobalVideoBackground from "./components/ui/GlobalVideoBackground";

import Home from "./pages/Home";
import PastEvents from "./pages/Events";
import Team from "./pages/Team";
import Leaderboard from "./pages/Leaderboard";
import Domains from "./pages/Domains";
import BlogPostPage from "./pages/BlogPostPage";
import StudentDashboard from "./pages/StudentDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Contact from "./pages/Contact";
import LoginPage from "./pages/Login";
import RegisterPage from "./pages/Register";
import RegisterOtpPage from "./pages/RegisterOtp";
import ForgotPasswordPage from "./pages/ForgotPassword";
import ForgotPasswordOtpPage from "./pages/ForgotPasswordOtp";
import ChangeForgottenPasswordPage from "./pages/ChangeForgottenPassword";
import SettingsPage from "./pages/Settings";

import { AuthProvider, useAuth } from "./context/AuthContext";
import type { UserRole } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";

function AppWrapper() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAuthPage =
    location.pathname === "/login" ||
    location.pathname === "/register" ||
    location.pathname === "/register/verify-otp" ||
    location.pathname.startsWith("/forgot-password");

  const isDomainPage = location.pathname.startsWith("/domains");

  const AuthLoadingState = () => (
    <div
      className="flex min-h-screen items-center justify-center bg-canvas px-4 text-ink"
      role="status"
      aria-live="polite"
    >
      <span className="rounded-control border border-line bg-surface px-4 py-3 text-sm font-semibold shadow-soft">
        Checking your session...
      </span>
    </div>
  );

  const ProtectedRoute = () => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
      return <AuthLoadingState />;
    }

    return isAuthenticated ? (
      <Outlet />
    ) : (
      <Navigate to="/login" replace />
    );
  };

  const RoleRoute = ({ allowedRoles }: { allowedRoles: UserRole[] }) => {
    const { user, isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
      return <AuthLoadingState />;
    }

    if (!isAuthenticated || !user) {
      return <Navigate to="/login" replace />;
    }

    if (!allowedRoles.includes(user.role)) {
      return (
        <Navigate
          to={
            user.role === "admin"
              ? "/admin/dashboard"
              : "/student/dashboard"
          }
          replace
        />
      );
    }

    return <Outlet />;
  };

  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  return (
    <div
      id="scroll-container"
      className="relative h-full min-h-screen w-full overflow-y-auto text-ink transition-colors duration-300"
    >
      <div className="relative z-10 min-h-screen">
        <SpotlightCursor />

        {!isAuthPage && (
          <Navbar
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() =>
              setSidebarOpen((previous) => !previous)
            }
          />
        )}

        {!isAuthPage && (
          <Sidebar
            isOpen={sidebarOpen}
            setIsOpen={setSidebarOpen}
          />
        )}

        <main className="pt-0 transition-all duration-300 ease-in-out">
          <Routes>
            <Route path="/" element={<Home />} />

            <Route path="/events" element={<PastEvents />} />

            <Route path="/team" element={<Team />} />

            <Route path="/contact" element={<Contact />} />

            <Route path="/leaderboard" element={<Leaderboard />} />

            <Route path="/login" element={<LoginPage />} />

            <Route path="/register" element={<RegisterPage />} />

            <Route
              path="/register/verify-otp"
              element={<RegisterOtpPage />}
            />

            <Route
              path="/forgot-password"
              element={<ForgotPasswordPage />}
            />

            <Route
              path="/forgot-password/verify-otp"
              element={<ForgotPasswordOtpPage />}
            />

            <Route
              path="/forgot-password/change-password"
              element={<ChangeForgottenPasswordPage />}
            />

            <Route element={<ProtectedRoute />}>
              <Route path="/domains" element={<Domains />} />

              <Route
                path="/domains/:slug"
                element={<BlogPostPage />}
              />

              <Route
                path="/settings"
                element={<SettingsPage />}
              />
            </Route>

            <Route
              element={
                <RoleRoute allowedRoles={["student"]} />
              }
            >
              <Route
                path="/student/dashboard/*"
                element={<StudentDashboard />}
              />
            </Route>

            <Route
              element={
                <RoleRoute allowedRoles={["admin"]} />
              }
            >
              <Route
                path="/admin/dashboard/*"
                element={<AdminDashboard />}
              />
            </Route>
          </Routes>
        </main>

        {!isAuthPage && !isDomainPage && <Footer />}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <GlobalVideoBackground />

      <AuthProvider>
        <Router>
          <ToastProvider>
            <ScrollToTop />
            <AppWrapper />
          </ToastProvider>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
