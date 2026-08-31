"use client"
import { Mail, Phone, MapPin } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { ContactForm } from './ContactForm';
import PageTransition from '../components/ui/PageTransition';
import SectionReveal from '../components/ui/SectionReveal';

const contactMethodStyles = [
  {
    card: 'border-dream/25 hover:border-dream/50',
    line: 'via-dream/70',
    icon: 'border-dream/25 bg-dream/10 text-dream-text',
    link: 'text-dream-text',
  },
  {
    card: 'border-rose/25 hover:border-rose/50',
    line: 'via-rose/70',
    icon: 'border-rose/25 bg-rose/10 text-rose-text',
    link: 'text-rose-text',
  },
  {
    card: 'border-technical/25 hover:border-technical/50',
    line: 'via-technical/70',
    icon: 'border-technical/25 bg-technical/10 text-technical-text',
    link: 'text-technical-text',
  },
] as const;

const Contact = () => {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const contactMethods = [
    {
      icon: Mail,
      title: "Email Us",
      label: "Email",
      contact: "hackerearth.nmamit@nitte.edu.in",
      href: "mailto:hackerearth.nmamit@nitte.edu.in",
    },
    {
      icon: Phone,
      title: "Call Us",
      label: "Phone",
      contact: "+91 8792051545",
      href: "tel:8792051545",
    },
    {
      icon: MapPin,
      title: "Visit Us",
      label: "Visit Us",
      contact: "Nitte Mahalinga Adyantaya Memorial Institute of Technology - NMAMIT, Nitte, Karkala Taluk, Udupi District, Karnataka - 574110, India",
      href: "https://www.google.com/maps/search/?api=1&query=Nitte+Mahalinga+Adyantaya+Memorial+Institute+of+Technology+NMAMIT+Nitte+Karnataka+574110",
    }
  ];

  return (
    <PageTransition className="relative isolate min-h-screen overflow-hidden bg-transparent text-ink transition-colors duration-500">
      <main className="section-glow-cyan min-h-screen overflow-hidden">
        <div className="site-container-wide section-space pt-24 lg:pt-section">
          {/* Hero Section */}
          <SectionReveal variant="slide-up" className="mx-auto max-w-3xl text-center">
            <header>
              <h1 className="section-heading">
                <span className="text-gradient-subtle">Get in Touch</span>
              </h1>
            </header>
          </SectionReveal>

          <div className="mt-12 grid items-start gap-10 lg:mt-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)] lg:gap-12">
            {/* Contact Form Card */}
            <SectionReveal
              variant="slide-left"
              delay={0.04}
              className="min-w-0"
              aria-labelledby="contact-form-heading"
            >
              <section aria-labelledby="contact-form-heading">
                <div className="mb-6 sm:mb-8">
                  <h2 id="contact-form-heading" className="font-display text-title text-ink">
                    Get in Touch
                  </h2>
                  <p className="mt-3 max-w-2xl leading-relaxed text-ink-muted">
                    Have questions or ideas? Let's talk! We're always open to discussing new opportunities.
                  </p>
                </div>

                <div className="ui-panel-glass top-border-accent-cyan border-dream/25 p-5 sm:p-8">
                  <ContactForm />
                </div>
              </section>
            </SectionReveal>

            {/* Contact Information */}
            <SectionReveal
              variant="slide-right"
              delay={0.08}
              className="min-w-0"
            >
              <aside aria-labelledby="contact-methods-heading">
                <div className="mb-6 sm:mb-8">
                  <h2 id="contact-methods-heading" className="font-display text-title text-ink">
                    Let's Connect
                  </h2>
                  <p className="mt-3 leading-relaxed text-ink-muted">
                    Prefer other ways to reach out? Here's how you can connect with us.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                  {contactMethods.map((method, i) => {
                    const Icon = method.icon;
                    const styles = contactMethodStyles[i];
                    return (
                      <motion.article
                        key={method.title}
                        initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        whileHover={shouldReduceMotion
                          ? undefined
                          : {
                            y: -4,
                            transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] }
                          }
                        }
                        transition={{
                          duration: shouldReduceMotion ? 0 : 0.5,
                          delay: shouldReduceMotion ? 0 : i * 0.05,
                          ease: [0.16, 1, 0.3, 1]
                        }}
                        viewport={{ once: true }}
                        className={`ui-card-glass group relative min-w-0 overflow-hidden p-4 transition duration-300 ease-out-expo hover:shadow-glow sm:p-5 ${styles.card}`}
                      >
                        <div
                          className={`absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent to-transparent ${styles.line}`}
                          aria-hidden="true"
                        />
                        <div className="flex min-w-0 items-start gap-3">
                          <div
                            className={`flex size-11 shrink-0 items-center justify-center rounded-control border ${styles.icon} ${shouldReduceMotion
                                ? ''
                                : 'transition-transform duration-200 group-hover:translate-x-0.5'
                              }`}
                          >
                            <Icon className="size-5" aria-hidden="true" />
                          </div>
                          <div className="min-w-0 pt-0.5">
                            {method.label !== method.title && (
                              <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-ink-subtle">
                                {method.label}
                              </p>
                            )}
                            <h3 className="font-display text-base font-semibold text-ink">
                              {method.title}
                            </h3>
                            <a
                              href={method.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`mt-1 inline-flex min-h-11 max-w-full items-center break-words text-sm font-semibold leading-relaxed underline decoration-current/35 underline-offset-4 focus-visible:outline-offset-2 ${styles.link}`}
                            >
                              {method.contact}
                            </a>
                          </div>
                        </div>
                      </motion.article>
                    );
                  })}
                </div>
              </aside>
            </SectionReveal>
          </div>
        </div>
      </main>
    </PageTransition>
  );

};

export default Contact;
