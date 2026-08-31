import { useEffect, useRef, useState, type FC, type FocusEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Home, Menu, Moon, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import UserMenu from './UserMenu';
import logo from '../assets/image.png';

interface NavbarProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

const navItems = [
  { name: 'Events', href: '/events' },
  { name: 'Leaderboard', href: '/leaderboard' },
  { name: 'Team', href: '/team' },
  { name: 'Domains', href: '/domains' },
  { name: 'Contact', href: '/contact' },
] as const;

const adminNavItems = [
  { name: 'Events', href: '/events' },
  { name: 'Leaderboard', href: '/leaderboard' },
  { name: 'Team', href: '/team' },
  { name: 'Admin', href: '/admin/dashboard' },
  { name: 'Contact', href: '/contact' },
] as const;

const studentDashboardNavItems = [
  { name: 'Dashboard', href: '/student/dashboard' },
  { name: 'Events & Tasks', target: 'student-events-tasks' },
  { name: 'Resources', target: 'student-resources' },
  { name: 'My Domains', target: 'student-domains' },
  { name: 'Leaderboard', href: '/leaderboard' },
  { name: 'Contact', href: '/contact' },
] as const;

const Navbar: FC<NavbarProps> = ({ onToggleSidebar, sidebarOpen }) => {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [containsFocus, setContainsFocus] = useState(false);
  const [activeDashboardSection, setActiveDashboardSection] = useState('student-dashboard-top');
  const lastScrollY = useRef(0);
  const navRef = useRef<HTMLElement>(null);
  const shouldReduceMotion = useReducedMotion() ?? false;
  const { user, isAuthenticated } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { pathname } = useLocation();
  const isStudentDashboard = pathname.startsWith('/student/dashboard');
  const mainNavItems = user?.role === 'admin' ? adminNavItems : navItems;

  useEffect(() => {
    const scrollContainer = document.getElementById('scroll-container');
    const scrollTarget: HTMLElement | Window = scrollContainer ?? window;
    const getScrollPosition = () => scrollContainer?.scrollTop ?? window.scrollY;

    const handleScroll = () => {
      const currentScrollY = getScrollPosition();
      setScrolled(currentScrollY > 12);

      if (currentScrollY > lastScrollY.current && currentScrollY > 120) {
        setHidden(true);
      } else if (currentScrollY < lastScrollY.current) {
        setHidden(false);
      }

      lastScrollY.current = currentScrollY;
    };

    handleScroll();
    scrollTarget.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollTarget.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setHidden(false);
  }, [pathname]);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  const scrollToDashboardSection = (target: string) => {
    setActiveDashboardSection(target);
    document.getElementById(target)?.scrollIntoView({
      behavior: shouldReduceMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  const handleBlurCapture = (event: FocusEvent<HTMLElement>) => {
    const nextTarget = event.relatedTarget;
    if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
      setContainsFocus(false);
    }
  };

  const effectivelyHidden = hidden && !containsFocus;
  const hoverLiftClass = shouldReduceMotion ? '' : 'hover:-translate-y-0.5';

  const controlSurfaceClass = scrolled
    ? 'border-dream/40 bg-glass/90 shadow-glass backdrop-blur-lg'
    : 'border-line/70 bg-glass/75 shadow-soft backdrop-blur-md';

  const inactivePillClass = `border-transparent bg-transparent text-ink-muted ${hoverLiftClass} hover:border-dream/30 hover:bg-dream-soft/35 hover:text-ink`;
  const activePillClass =
    'border-dream/40 bg-gradient-to-r from-primary/15 via-dream/10 to-technical/10 text-primary-text shadow-soft';

  return (
    <motion.nav
      ref={navRef}
      aria-label="Primary navigation"
      className="pointer-events-none fixed inset-x-0 top-0 z-50 w-full"
      initial={shouldReduceMotion ? false : { opacity: 0, y: -18 }}
      animate={{ opacity: 1, y: effectivelyHidden ? -104 : 0 }}
      transition={{
        duration: shouldReduceMotion || containsFocus ? 0 : 0.42,
        ease: [0.16, 1, 0.3, 1],
      }}
      onFocusCapture={() => setContainsFocus(true)}
      onBlurCapture={handleBlurCapture}
    >
      <div className="site-container-wide px-3 py-2.5 sm:px-6 lg:py-4">
        <div className="ui-nav-glass pointer-events-auto relative flex min-w-0 items-center justify-between gap-2 overflow-visible rounded-[1.6rem] px-2 py-2 sm:gap-3 lg:px-3 xl:px-4">
          <span
            className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-dream/70 to-transparent"
            aria-hidden="true"
          />
          <Link
            to="/"
            className="group flex min-w-0 flex-1 items-center gap-2 rounded-2xl px-1 focus-visible:outline-offset-4 sm:gap-3 lg:flex-none"
            aria-label="HackerEarth Hub-NMAMIT home"
          >
            <span
              className={`flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-dream/30 bg-gradient-to-br from-dream/35 via-glass to-technical/30 p-0.5 shadow-glow transition duration-300 group-hover:border-dream/60 sm:size-12 ${
                shouldReduceMotion ? '' : 'group-hover:-translate-y-0.5'
              }`}
            >
              <img
                src={logo}
                alt="HackerEarth Logo"
                className="size-full rounded-full object-cover"
              />
            </span>
            <span className="min-w-0 max-w-full font-display text-[0.7rem] font-semibold leading-[1.1] tracking-[-0.025em] text-ink sm:text-sm lg:max-w-36 lg:truncate lg:whitespace-nowrap xl:max-w-none xl:text-base">
              HackerEarth Hub-NMAMIT
            </span>
          </Link>

          <div
            className={`pointer-events-auto ml-auto min-w-0 items-center gap-2 xl:gap-3 ${
              isStudentDashboard ? 'hidden xl:flex' : 'hidden lg:flex'
            }`}
          >
            {isStudentDashboard ? (
              <div className="flex min-w-0 shrink items-center gap-0.5 rounded-2xl border border-line/60 bg-surface-muted/55 p-1 shadow-soft">
                {studentDashboardNavItems.map((item) => {
                  const isDisabled = 'disabled' in item && item.disabled;
                  const isSectionItem = 'target' in item;
                  const isLinkItem = 'href' in item;
                  const active = isDisabled
                    ? false
                    : isSectionItem
                      ? activeDashboardSection === item.target
                      : isLinkItem
                        ? isActive(item.href)
                        : false;
                  const className = `relative flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-xl border px-2 py-2 text-[0.625rem] font-semibold transition duration-200 focus-visible:outline-offset-2 xl:px-3 xl:text-xs ${
                    isDisabled
                      ? 'cursor-not-allowed select-none border-transparent text-ink-subtle opacity-60'
                      : active
                        ? activePillClass
                        : inactivePillClass
                  }`;

                  return isDisabled ? (
                    <span
                      key={item.name}
                      aria-disabled="true"
                      title="Temporarily unavailable"
                      className={className}
                    >
                      {item.name}
                    </span>
                  ) : isSectionItem ? (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => scrollToDashboardSection(item.target)}
                      aria-current={active ? 'location' : undefined}
                      className={className}
                    >
                      {item.name}
                    </button>
                  ) : isLinkItem ? (
                    <Link key={item.name} to={item.href} className={className}>
                      {item.name}
                    </Link>
                  ) : (
                    null
                  );
                })}
              </div>
            ) : (
              <div className="flex min-w-0 shrink items-center gap-0.5 rounded-2xl border border-line/60 bg-surface-muted/55 p-1 shadow-soft xl:gap-1">
                {!isAuthenticated && (
                  <Link
                    to="/"
                    aria-label="Home"
                    title="Home"
                    aria-current={isActive('/') ? 'page' : undefined}
                    className={`relative flex size-11 shrink-0 items-center justify-center rounded-xl border transition duration-200 focus-visible:outline-offset-2 ${
                      isActive('/') ? activePillClass : inactivePillClass
                    }`}
                  >
                    <Home className="size-4" aria-hidden="true" />
                  </Link>
                )}

                {mainNavItems.map((item) => {
                  const isDisabled = 'disabled' in item && item.disabled;
                  if (isDisabled) {
                    return (
                      <span
                        key={item.name}
                        aria-disabled="true"
                        title="Temporarily unavailable"
                        className="relative flex min-h-11 shrink-0 cursor-not-allowed select-none items-center whitespace-nowrap rounded-xl border border-transparent px-2.5 py-2 text-[0.6875rem] font-semibold text-ink-subtle opacity-60 xl:px-4 xl:text-sm"
                      >
                        {item.name}
                      </span>
                    );
                  }

                  if (!('href' in item)) return null;

                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={`relative flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-xl border px-2.5 py-2 text-[0.6875rem] font-semibold transition duration-200 focus-visible:outline-offset-2 xl:px-4 xl:text-sm ${
                        active ? activePillClass : inactivePillClass
                      }`}
                    >
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            )}

            <div className="flex min-w-0 shrink-0 items-center gap-2">
              <button
                onClick={toggleTheme}
                aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                className={`flex size-11 shrink-0 items-center justify-center rounded-full border text-ink-muted transition duration-200 ${hoverLiftClass} hover:border-dream/50 hover:bg-dream-soft/40 hover:text-primary-text focus-visible:outline-offset-2 ${controlSurfaceClass}`}
                type="button"
              >
                {isDark ? (
                  <Sun className="size-5" aria-hidden="true" />
                ) : (
                  <Moon className="size-5" aria-hidden="true" />
                )}
              </button>

              {isAuthenticated ? (
                <UserMenu
                  triggerClassName={`max-w-32 xl:max-w-48 ${controlSurfaceClass} ${hoverLiftClass}`}
                />
              ) : (
                <Link
                  to="/login"
                  className={`inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-dream/50 bg-gradient-to-r from-primary via-dream to-technical px-4 text-xs font-semibold text-ink-inverse shadow-glow transition duration-200 ${hoverLiftClass} hover:brightness-105 focus-visible:outline-offset-2 xl:px-5 xl:text-sm`}
                >
                  Login
                </Link>
              )}
            </div>
          </div>

          <div
            className={`pointer-events-auto shrink-0 items-center gap-2 ${
              isStudentDashboard ? 'flex xl:hidden' : 'flex lg:hidden'
            }`}
          >
            <button
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className={`flex size-11 shrink-0 items-center justify-center rounded-full border text-ink-muted transition duration-200 hover:border-dream/50 hover:bg-dream-soft/40 hover:text-primary-text focus-visible:outline-offset-2 ${controlSurfaceClass}`}
              type="button"
            >
              {isDark ? (
                <Sun className="size-5" aria-hidden="true" />
              ) : (
                <Moon className="size-5" aria-hidden="true" />
              )}
            </button>

            <button
              onClick={onToggleSidebar}
              className={`flex size-11 shrink-0 items-center justify-center rounded-full border text-ink-muted transition duration-200 hover:border-dream/50 hover:bg-dream-soft/40 hover:text-primary-text focus-visible:outline-offset-2 ${controlSurfaceClass}`}
              aria-label="Open navigation menu"
              aria-controls="sidebar-navigation"
              aria-expanded={sidebarOpen}
              aria-haspopup="dialog"
              title="Menu"
              type="button"
            >
              <Menu className="size-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
