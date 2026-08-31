import { useEffect, useRef, useState, type FC } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Award,
  BookOpen,
  Calendar,
  CalendarCheck,
  Code,
  Home,
  LayoutDashboard,
  Mail,
  Shapes,
  Users,
  X,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import UserMenu from './UserMenu';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const navItems = [
  { name: 'Home', path: '/', icon: Home },
  { name: 'Events', path: '/events', icon: Calendar },
  { name: 'Team', path: '/team', icon: Users },
  { name: 'Domains', path: '/domains', icon: Code },
  { name: 'Leaderboard', path: '/leaderboard', icon: Award },
  { name: 'Contact', path: '/contact', icon: Mail },
] as const;

const adminNavItems = [
  { name: 'Events', path: '/events', icon: Calendar },
  { name: 'Leaderboard', path: '/leaderboard', icon: Award },
  { name: 'Team', path: '/team', icon: Users },
  { name: 'Admin', path: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Contact', path: '/contact', icon: Mail },
] as const;

const studentDashboardNavItems = [
  { name: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
  { name: 'Events & Tasks', target: 'student-events-tasks', icon: CalendarCheck },
  { name: 'Resources', target: 'student-resources', icon: BookOpen },
  { name: 'My Domains', target: 'student-domains', icon: Shapes },
  { name: 'Leaderboard', path: '/leaderboard', icon: Award },
  { name: 'Contact', path: '/contact', icon: Mail },
] as const;

const restoreSidebarToggleFocus = () => {
  window.requestAnimationFrame(() => {
    const toggles = Array.from(
      document.querySelectorAll<HTMLButtonElement>(
        'button[aria-controls="sidebar-navigation"]',
      ),
    );
    toggles.find((toggle) => toggle.offsetParent !== null)?.focus();
  });
};

const Sidebar: FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const { pathname } = useLocation();
  const [activeDashboardSection, setActiveDashboardSection] = useState('student-dashboard-top');
  const { user, isAuthenticated } = useAuth();
  const sidebarRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const shouldReduceMotion = useReducedMotion() ?? false;
  const isStudentDashboard = pathname.startsWith('/student/dashboard');
  const displayedNavItems = isStudentDashboard
    ? studentDashboardNavItems
    : user?.role === 'admin'
      ? adminNavItems
      : navItems;

  const isActive = (path: string) =>
    path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`);

  const closeSidebar = (restoreFocus = false) => {
    setIsOpen(false);
    if (restoreFocus) restoreSidebarToggleFocus();
  };

  useEffect(() => {
    const desktopViewport = window.matchMedia(
      isStudentDashboard ? '(min-width: 1280px)' : '(min-width: 1024px)',
    );
    const closeOutsideMobile = () => {
      if (desktopViewport.matches) setIsOpen(false);
    };

    closeOutsideMobile();
    desktopViewport.addEventListener('change', closeOutsideMobile);
    return () => desktopViewport.removeEventListener('change', closeOutsideMobile);
  }, [isStudentDashboard, setIsOpen]);

  useEffect(() => {
    const desktopQuery = isStudentDashboard ? '(min-width: 1280px)' : '(min-width: 1024px)';
    if (!isOpen || window.matchMedia(desktopQuery).matches) return;

    const scrollTarget = document.getElementById('scroll-container') ?? document.body;
    const previousOverflow = scrollTarget.style.overflow;
    scrollTarget.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsOpen(false);
        restoreSidebarToggleFocus();
        return;
      }

      if (event.key !== 'Tab' || !sidebarRef.current) return;

      const focusableElements = Array.from(
        sidebarRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (!firstElement || !lastElement) {
        event.preventDefault();
        sidebarRef.current.focus();
        return;
      }

      if (!sidebarRef.current.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? lastElement : firstElement).focus();
      } else if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      scrollTarget.style.overflow = previousOverflow;
    };
  }, [isOpen, isStudentDashboard, setIsOpen]);

  const scrollToDashboardSection = (target: string) => {
    setActiveDashboardSection(target);
    closeSidebar();
    window.requestAnimationFrame(() => {
      document.getElementById(target)?.scrollIntoView({
        behavior: shouldReduceMotion ? 'auto' : 'smooth',
        block: 'start',
      });
    });
  };

  return (
    <>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            aria-hidden="true"
            className={`fixed inset-0 z-[55] bg-canvas/65 backdrop-blur-sm ${
              isStudentDashboard ? 'xl:hidden' : 'lg:hidden'
            }`}
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
            onClick={() => closeSidebar(true)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.aside
            ref={sidebarRef}
            id="sidebar-navigation"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sidebar-heading"
            tabIndex={-1}
            className={`fixed inset-y-0 left-0 z-[60] w-[min(19rem,88vw)] flex-col overflow-hidden rounded-r-panel border-r border-dream/30 bg-glass/90 text-ink shadow-glass backdrop-blur-xl ${
              isStudentDashboard ? 'flex xl:hidden' : 'flex lg:hidden'
            }`}
            initial={shouldReduceMotion ? { x: 0 } : { x: '-100%' }}
            animate={{ x: 0 }}
            exit={shouldReduceMotion ? { x: 0 } : { x: '-100%' }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.3,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <div
              className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-dream/80 to-rose/40"
              aria-hidden="true"
            />

            <div
              className="pointer-events-none absolute -left-24 top-16 size-64 rounded-full bg-dream/15 blur-3xl"
              aria-hidden="true"
            />

            <div className="relative flex h-16 shrink-0 items-center justify-between border-b border-line/70 px-3">
              <motion.div
                className="min-w-0"
                initial={shouldReduceMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: shouldReduceMotion ? 0 : 0.08,
                  duration: shouldReduceMotion ? 0 : 0.18,
                }}
              >
                <p
                  id="sidebar-heading"
                  className="truncate font-display text-sm font-semibold text-ink"
                >
                  Explore
                </p>
                <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-ink-subtle">
                  Quick navigation
                </p>
              </motion.div>

              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => closeSidebar(true)}
                className="btn btn-ghost btn-icon"
                aria-label="Close navigation menu"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <nav className="px-2 py-3" aria-label="Mobile navigation">
                <ul className="space-y-1.5">
                  {displayedNavItems.map((item) => {
                    const Icon = item.icon;
                    const isDisabled = 'disabled' in item && item.disabled;
                    const isSectionItem = 'target' in item;
                    const isPathItem = 'path' in item;
                    const active = isDisabled
                      ? false
                      : isSectionItem
                        ? activeDashboardSection === item.target
                        : isPathItem
                          ? isActive(item.path)
                          : false;
                    const itemClassName = `group relative flex min-h-12 w-full items-center overflow-hidden rounded-control border px-3 text-left shadow-none transition duration-200 ${
                      isDisabled
                        ? 'cursor-not-allowed select-none border-transparent text-ink-subtle opacity-60'
                        : active
                        ? 'border-dream/40 bg-gradient-to-r from-primary/15 via-dream/10 to-technical/10 text-primary-text shadow-soft'
                        : 'border-transparent text-ink-muted hover:border-dream/25 hover:bg-dream-soft/30 hover:text-ink'
                    }`;
                    const itemContent = (
                      <>
                        <span
                          className={`relative z-10 flex size-8 shrink-0 items-center justify-center rounded-lg transition ${
                            isDisabled
                              ? 'text-ink-subtle'
                              : active
                              ? 'bg-primary/10 text-primary-text'
                              : 'text-ink-subtle group-hover:text-ink'
                          }`}
                        >
                          <Icon className="size-5" aria-hidden="true" />
                        </span>

                        <span className="relative z-10 ml-2.5 whitespace-nowrap text-sm font-semibold">
                          {item.name}
                        </span>
                      </>
                    );

                    return (
                      <motion.li
                        key={item.name}
                        whileHover={isDisabled || shouldReduceMotion ? undefined : { x: 2 }}
                        whileTap={isDisabled || shouldReduceMotion ? undefined : { scale: 0.98 }}
                        transition={{ duration: shouldReduceMotion ? 0 : 0.16 }}
                      >
                        {isDisabled ? (
                          <span
                            aria-disabled="true"
                            title="Temporarily unavailable"
                            className={itemClassName}
                          >
                            {itemContent}
                          </span>
                        ) : isSectionItem ? (
                          <button
                            type="button"
                            onClick={() => scrollToDashboardSection(item.target)}
                            aria-label={item.name}
                            aria-current={active ? 'location' : undefined}
                            className={itemClassName}
                          >
                            {itemContent}
                          </button>
                        ) : isPathItem ? (
                          <Link
                            to={item.path}
                            onClick={() => closeSidebar()}
                            aria-label={item.name}
                            aria-current={active ? 'page' : undefined}
                            className={itemClassName}
                          >
                            {itemContent}
                          </Link>
                        ) : (
                          null
                        )}
                      </motion.li>
                    );
                  })}
                </ul>
              </nav>

              <div className="mx-2 mb-4 border-t border-line pt-4">
                {isAuthenticated ? (
                  <UserMenu
                    fullWidth
                    triggerClassName="rounded-control border-dream/25 bg-dream-soft/25 p-3 shadow-soft"
                    menuClassName="bottom-[calc(100%+0.5rem)] top-auto"
                    onAfterAction={() => setIsOpen(false)}
                  />
                ) : (
                  <Link
                    to="/login"
                    onClick={() => closeSidebar()}
                    className="btn btn-primary w-full"
                  >
                    Login
                  </Link>
                )}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
