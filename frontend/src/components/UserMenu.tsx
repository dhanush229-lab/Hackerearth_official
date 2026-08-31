import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  LogOut,
  Settings,
  User,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { cn } from "../lib/utils";
import { useToast } from "./ToastProvider";

interface UserMenuProps {
  triggerClassName?: string;
  menuClassName?: string;
  onAfterAction?: () => void;
  fullWidth?: boolean;
}

export default function UserMenu({
  triggerClassName,
  menuClassName,
  onAfterAction,
  fullWidth = false,
}: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion() ?? false;

  const { user, logout } = useAuth();
  const { showToast } = useToast();

  const displayedUsername =
    user?.name || user?.email?.split("@")[0] || "User";

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (
        rootRef.current &&
        event.target instanceof Node &&
        !rootRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const closeMenuAndNavigate = (path: string) => {
    setIsOpen(false);
    onAfterAction?.();
    navigate(path);
  };

  const handleProfile = () => {
    if (!user) return;

    const dashboardPath =
      user.role === "admin"
        ? "/admin/dashboard"
        : "/student/dashboard";

    closeMenuAndNavigate(dashboardPath);
  };

  const handleSettings = () => {
    closeMenuAndNavigate("/settings");
  };

  const handleLogout = async () => {
    setIsOpen(false);

    try {
      await logout();

      showToast({
        variant: "success",
        title: "Logged out",
        message: "You have been logged out successfully.",
      });

      onAfterAction?.();
      navigate("/login");
    } catch {
      showToast({
        variant: "error",
        title: "Logout failed",
        message: "Unable to log out cleanly. Please try again.",
      });
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div
      ref={rootRef}
      className={cn("relative", fullWidth && "w-full")}
    >
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        className={cn(
          "flex h-11 min-w-0 items-center gap-1.5 rounded-full border px-3 text-ink transition duration-200 hover:border-technical/40 hover:bg-surface-muted hover:text-ink focus-visible:outline-offset-2",
          fullWidth ? "w-full justify-between" : "max-w-44",
          triggerClassName
        )}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <User
            className="size-4 shrink-0 text-primary-text"
            aria-hidden="true"
          />

          <span
            className="truncate text-xs font-semibold xl:text-sm"
            title={displayedUsername}
          >
            {displayedUsername}
          </span>
        </span>

        {isOpen ? (
          <ChevronUp
            className="size-4 shrink-0 text-ink-muted"
            aria-hidden="true"
          />
        ) : (
          <ChevronDown
            className="size-4 shrink-0 text-ink-muted"
            aria-hidden="true"
          />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            id={menuId}
            role="menu"
            initial={
              shouldReduceMotion
                ? { opacity: 1 }
                : {
                  opacity: 0,
                  y: -6,
                  scale: 0.98,
                }
            }
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={
              shouldReduceMotion
                ? { opacity: 0 }
                : {
                  opacity: 0,
                  y: -4,
                  scale: 0.98,
                }
            }
            transition={{
              duration: shouldReduceMotion ? 0 : 0.16,
              ease: "easeOut",
            }}
            className={cn(
              "absolute right-0 top-[calc(100%+0.5rem)] z-[70] w-56 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-card border border-line-strong bg-surface/95 p-1.5 text-ink shadow-surface backdrop-blur-xl",
              fullWidth && "left-0 right-auto w-full",
              menuClassName
            )}
          >
            {/* Profile */}
            <button
              type="button"
              role="menuitem"
              onClick={handleProfile}
              className="flex min-h-11 w-full items-center gap-2 rounded-control px-3 text-left text-sm font-semibold text-ink-muted transition hover:bg-primary/10 hover:text-primary-text focus-visible:outline-offset-2"
            >
              <User
                className="size-4"
                aria-hidden="true"
              />
              Profile
            </button>

            {/* Settings */}
            <button
              type="button"
              role="menuitem"
              onClick={handleSettings}
              className="flex min-h-11 w-full items-center gap-2 rounded-control px-3 text-left text-sm font-semibold text-ink-muted transition hover:bg-primary/10 hover:text-primary-text focus-visible:outline-offset-2"
            >
              <Settings
                className="size-4"
                aria-hidden="true"
              />
              Settings
            </button>

            {/* Logout */}
            <button
              type="button"
              role="menuitem"
              onClick={() => void handleLogout()}
              className="flex min-h-11 w-full items-center gap-2 rounded-control px-3 text-left text-sm font-semibold text-ink-muted transition hover:bg-highlight/10 hover:text-highlight-text focus-visible:outline-offset-2"
            >
              <LogOut
                className="size-4"
                aria-hidden="true"
              />
              Logout
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}