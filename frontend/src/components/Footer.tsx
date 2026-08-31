import { Mail, MapPin, Github, Linkedin, Twitter, Instagram, Phone } from 'lucide-react';
import { Link } from 'react-router-dom'; // Use Link for internal navigation
import { useReducedMotion } from 'framer-motion';

const Footer = () => {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const socialLinks = [
    { icon: Instagram, href: "https://www.instagram.com/hackerearth_nmamit/?hl=en", label: "Instagram" },
    { icon: Github, href: "https://github.com/HackerearthHubNmamit", label: "GitHub" },
    { icon: Linkedin, href: "https://in.linkedin.com/company/hackerearth-hub-nmamit", label: "LinkedIn" },
    { icon: Twitter, href: "https://x.com/NHackerearth", label: "Twitter" }
  ];

  const quickLinks = ["Events", "Team", "Domains", "Contact"];

  return (
    <footer className="relative overflow-hidden border-t border-primary/25 bg-canvas-subtle text-ink transition-colors duration-300">
      {/* Background Text Element */}
      <div
        className="pointer-events-none absolute -bottom-8 left-1/2 z-0 -translate-x-1/2 select-none whitespace-nowrap font-display text-ink/[0.035] dark:text-ink/[0.045]"
        style={{ fontSize: 'clamp(9rem, 22vw, 15.5rem)', fontWeight: '1000' }}
        aria-hidden="true"
      >
        HackerEarth
      </div>

      <div className="site-container-wide section-space-sm relative z-10">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          {/* Column 1: Brand & Logo */}
          <div className="sm:col-span-2 lg:col-span-5">
            <div className="flex items-center gap-3 sm:gap-4">
              <img
                src="/branding/hackerearth-club-logo-with-name.svg"
                alt="HackerEarth Hub NMAMIT"
                className="h-14 w-44 rounded-control border border-primary/25 bg-white object-contain p-2 shadow-soft"
              />
            </div>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-ink-muted">
              The premier tech club of NMAMIT, under Department of Counselling and Welfare - Abhyuday Fostering innovation and competitive programming skills.
            </p>
          </div>

          {/* Column 2: Quick Links */}
          <nav className="lg:col-span-2" aria-labelledby="footer-quick-links">
            <h3 id="footer-quick-links" className="font-display text-lg font-semibold text-ink">
              Quick Links
            </h3>
            <ul className="mt-4 grid max-w-xs grid-cols-2 gap-2 sm:grid-cols-1">
              {quickLinks.map((link) => (
                <li key={link}>
                  <Link
                    to={`/${link.toLowerCase()}`}
                    className="btn btn-ghost w-full justify-start px-3 text-sm text-ink-muted underline decoration-line underline-offset-4 hover:border-technical/30 hover:text-technical-text hover:decoration-technical/60 focus-visible:border-technical/40 focus-visible:bg-surface focus-visible:text-technical-text focus-visible:decoration-technical/60 focus-visible:outline-offset-2"
                  >
                    {link}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Column 3: Contact Info */}
          <div className="min-w-0 lg:col-span-5 lg:pl-8">
            <h3 className="font-display text-lg font-semibold text-ink">
              Contact Info
            </h3>
            <div className="mt-4 space-y-2 text-sm">
              <a
                href="mailto:hackerearth.nmamit@nitte.edu.in"
                className="group flex min-h-11 min-w-0 items-center gap-3 rounded-control px-2 py-2 text-ink-muted transition-colors duration-200 hover:bg-surface-muted hover:text-technical-text focus-visible:bg-surface focus-visible:text-technical-text focus-visible:outline-offset-2"
              >
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-control border border-technical/25 bg-surface text-technical-text ${shouldReduceMotion
                    ? ''
                    : 'transition-transform duration-200 group-hover:translate-x-0.5'
                    }`}
                >
                  <Mail className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 break-words underline decoration-line underline-offset-4 group-hover:decoration-technical/60">
                  hackerearth.nmamit@nitte.edu.in
                </span>
              </a>
              <a
                href="https://www.google.com/maps/place/Nitte+Mahalinga+Adyantaya+Memorial+Institute+of+Technology"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex min-h-11 min-w-0 items-center gap-3 rounded-control px-2 py-2 text-ink-muted transition-colors duration-200 hover:bg-surface-muted hover:text-technical-text focus-visible:bg-surface focus-visible:text-technical-text focus-visible:outline-offset-2"
              >
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-control border border-technical/25 bg-surface text-technical-text ${shouldReduceMotion
                    ? ''
                    : 'transition-transform duration-200 group-hover:translate-x-0.5'
                    }`}
                >
                  <MapPin className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 break-words underline decoration-line underline-offset-4 group-hover:decoration-technical/60">
                  Nitte Mahalinga Adyantaya Memorial Institute of Technology - NMAMIT, Nitte, Karkala Taluk, Udupi District, Karnataka - 574110, India
                </span>
              </a>
              <a
                href="tel:8792051545"
                className="group flex min-h-11 min-w-0 items-center gap-3 rounded-control px-2 py-2 text-ink-muted transition-colors duration-200 hover:bg-surface-muted hover:text-technical-text focus-visible:bg-surface focus-visible:text-technical-text focus-visible:outline-offset-2"
              >
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-control border border-technical/25 bg-surface text-technical-text ${shouldReduceMotion
                    ? ''
                    : 'transition-transform duration-200 group-hover:translate-x-0.5'
                    }`}
                >
                  <Phone className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 break-words underline decoration-line underline-offset-4 group-hover:decoration-technical/60">
                  +91 8792051545
                </span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-12 flex flex-col items-center justify-between gap-5 border-t border-primary/20 pt-6 sm:flex-row">
          <p className="text-center text-sm text-ink-muted sm:text-left dark:text-ink-subtle">
            © {new Date().getFullYear()} HackerEarth Club, NMAMIT. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`btn btn-ghost btn-icon group border-line bg-surface text-ink-muted focus-visible:border-primary/50 focus-visible:text-primary-text focus-visible:outline-offset-2 ${social.label === "LinkedIn"
                  ? 'hover:border-creative/40 hover:text-creative-text'
                  : 'hover:border-technical/40 hover:text-technical-text'
                  }`}
                aria-label={social.label}
              >
                <social.icon
                  className={`size-5 ${shouldReduceMotion
                    ? ''
                    : 'transition-transform duration-200 group-hover:-translate-y-0.5'
                    }`}
                  aria-hidden="true"
                />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
