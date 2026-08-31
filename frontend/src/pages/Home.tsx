import { useState, useEffect, useRef, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Users, Trophy, Calendar, Rocket, ChevronRight, FolderOpen } from "lucide-react";
import TypingHero from "../components/TypingHero";
import { Code } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import PageTransition from "../components/ui/PageTransition";
import SectionReveal from "../components/ui/SectionReveal";
import DomainVisualCarousel, { type DomainVisualKind } from "../components/home/DomainVisualCarousel";
import HomeTeamCollage from "../components/home/HomeTeamCollage";
import MemberExperienceMarquee, { type MemberExperience } from "../components/home/MemberExperienceMarquee";
// import CurvedHorizonGlow from '../components/CurvedHorizonGlow';
// import CurvedSectionTransition from '../components/CurvedSectionTransition';

interface EventItem {
  id: number;
  title: string;
  date: string;
  description: string;
  tags: string[];
  image: string;
}

const EventCard = ({ event, index }: { event: EventItem; index: number }) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <Link
      to={`/events/${event.id}`}
      className="group block h-full rounded-card focus-visible:outline-offset-4"
    >
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{
          duration: shouldReduceMotion ? 0 : 0.55,
          delay: shouldReduceMotion ? 0 : index * 0.08,
          ease: [0.16, 1, 0.3, 1],
        }}
        viewport={{ once: true, amount: 0.3 }}
        className={`ui-card-glass top-border-accent-primary flex h-full min-w-0 flex-col overflow-hidden border-dream/25 transition duration-300 group-hover:border-dream/50 group-hover:shadow-glow ${shouldReduceMotion ? "" : "group-hover:-translate-y-1 group-hover:scale-[1.01]"
          }`}
      >
        <div className="relative aspect-[4/3] overflow-hidden border-b border-line bg-surface-muted">
          <img
            src={event.image}
            alt={`${event.title} poster`}
            loading="lazy"
            decoding="async"
            className={`size-full object-contain transition-transform duration-500 ease-in-out ${shouldReduceMotion ? "" : "group-hover:scale-[1.02]"
              }`}
          />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-primary/15 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            aria-hidden="true"
          />
        </div>

        <div className="flex flex-1 flex-col p-5 sm:p-6">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-highlight-text">
            {event.date}
          </p>
          <h3 className="mt-2 font-display text-xl font-semibold leading-tight text-ink">
            {event.title}
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            {event.description}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {event.tags.map((tag: string) => (
              <span
                key={tag}
                className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 font-mono text-[0.65rem] font-semibold text-primary-text"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-auto flex items-center gap-1.5 pt-5 text-sm font-semibold text-primary-text">
            <span>View Details</span>
            <ArrowRight
              className={`size-4 transition-transform duration-200 ${shouldReduceMotion ? "" : "group-hover:translate-x-0.5"
                }`}
              aria-hidden="true"
            />
          </div>
        </div>
      </motion.div>
    </Link>
  );
};
// Events Data
const events: EventItem[] = [
  {
    id: 1,
    title: "The Tech Triad",
    date: "March 22, 2025",
    description: "A thrilling 3 rounds of debugging and finding clues, with a prize pool of 15k, open to all participants.",
    tags: ["Hackathon", "Competition", "Prize Pool"],
    image: "/images/techtriad.jpg",
  },
  {
    id: 2,
    title: "Tech EmpowerHER",
    date: "March 08 | 09, 2024",
    description: "An online MCQ challenge celebrating women in tech. Test your knowledge and solve encrypted clues.",
    tags: ["Online", "MCQ", "Women in Tech"],
    image: "/images/tech.jpg",
  },
  {
    id: 3,
    title: "Maze of Codes",
    date: "November 9, 2023",
    description: "An intense coding challenge in collaboration with ACSA, testing problem-solving skills to the limit.",
    tags: ["Coding", "Beginners", "On-site"],
    image: "/images/mazeofcodes.jpg",
  },
  {
    id: 4,
    title: "CodeClash",
    date: "October 05, 2024",
    description: "A coding competition with a 3k prize pool, open to all skill levels.",
    tags: ["Coding", "Beginners"],
    image: "/images/codeclash.jpg",
  },
];

// Testimonials Data
const testimonials: MemberExperience[] = [
  {
    name: "Vedant Suresh Mahalle ",
    username: "@vedantmahalle45",
    body: "Being selected as the Co-Documentation Head through HackerEarth has been an incredible opportunity to combine my technical and creative skills. From working on web, aptitude, and DSA content to collaborating on documentation and project organization, this experience has strengthened my ability to communicate ideas clearly and contribute effectively to a team. It has truly been a rewarding journey of learning, leadership, and growth.",
    img: "/testimonials_images/vedanthSM_testimonials.jpg",
  },
  {
    name: "K Vinayaka Madhava Sharma",
    username: "@vinayaka_09_2004",
    body: "The main aim helped me to join the club was for the communication and other soft skill development. Which helped alot and assuring team spirit great. The team also assure the aptitude training required for the prior clearance stage of placement drives. Thank you so much for providing me an opportunity to be an integral part of it.",
    img: "/testimonials_images/Kvinayak.jpg",
  },

  {
    name: "Pratham S Salian",
    username: "@pratham_.s._salian",
    body: "Being part of the HackerEarth Club has been an amazing experience. The coding challenges and hackathons helped me strengthen my problem-solving skills and apply concepts in real-world scenarios. Collaborating with peers also improved my teamwork and logical thinking abilities.",
    img: "testimonials_images/pratham.jpg",
  },

  {
    name: "Samrudh R Shetty",
    username: "",
    body: "I wholeheartedly endorse HackerEarth NMAMIT Hub for its exemplary coding challenges and innovative problem-solving opportunities that foster intellectual growth and excellence.",
    img: "/images/samrudh.JPG",
  },
  {
    name: "Gautham Tendulkar ",
    username: "@gauthamtendulkarr",
    body: "Great vibes, amazing people, and lots of memories that’s all that matters!",
    img: "testimonials_images/gautham.jpg",
  },
  {
    name: "Bhoomika Shenoy ",
    username: "@bhoomikashenoyy",
    body: "Being part of this club isn’t just about tech—it’s about connecting, creating, and making an impact. I’ve loved every contest, every brainstorm, and every moment.",
    img: "testimonials_images/ai_animated_g.jpg",
  },
  {
    name: "Pallavi Pai",
    username: "@pallavipai_",
    body: "Being a part of HackerEarth Hub has helped me strengthen my aptitude and foundations in data structures. Participating in programs like the SAP HackFest gave me exposure to what industries expect — the business models, the process of ideating, and pitching your product. The EmpowHer quiz was a great way to learn more about women in tech. My personal interests include Machine learning and App development .Always keen on learning, exploring, and building new things.",
    img: "testimonials_images/ai_animated_g.jpg",
  },
  {
    name: "Manvith",
    username: "@manvithhhhhh",
    body: "Being part of this club has been a valuable experience. I learned new skills, and improved my overall confidence and teamwork abilities.",
    img: "testimonials_images/ai_animated_m.jpg",
  },
];

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};
interface DomainFeature {
  icon: ReactNode;
  title: string;
  subtitle: string;
  description: string;
  technologies: string[];
  bgGradient: string;
  accentColor: string;
  link: string;
}

type DomainAccent = "cyan" | "violet" | "amber";

const domainAccentStyles = [
  {
    accent: "cyan" as DomainAccent,
    card: "ui-card-glass top-border-accent-cyan border-technical/25 hover:border-technical/45",
    line: "via-technical/70",
    icon: "border-technical/25 bg-technical/10 text-technical-text",
    tag: "border-technical/25 bg-technical/5 text-technical-text",
    button: "border-technical text-technical-text",
  },
  {
    accent: "violet" as DomainAccent,
    card: "ui-card-glass top-border-accent-violet border-creative/25 hover:border-creative/45",
    line: "via-creative/70",
    icon: "border-creative/25 bg-creative/10 text-creative-text",
    tag: "border-creative/25 bg-creative/5 text-creative-text",
    button: "border-creative text-creative-text",
  },
  {
    accent: "amber" as DomainAccent,
    card: "ui-card-glass top-border-accent-amber border-highlight/25 hover:border-highlight/45",
    line: "via-highlight/70",
    icon: "border-highlight/25 bg-highlight/10 text-highlight-text",
    tag: "border-highlight/25 bg-highlight/5 text-highlight-text",
    button: "border-highlight text-highlight-text",
  },
] as const;

const domainVisualKinds: DomainVisualKind[] = ["web", "dsa", "aptitude"];

const features: DomainFeature[] = [
  {
    icon: <Code className="w-8 h-8" />,
    title: "Web Development",
    subtitle: "(React, Node.js, Tailwind CSS...)",
    description: "Master modern web technologies and build stunning, responsive applications.",
    technologies: ["React", "Next.js", "TypeScript", "Tailwind CSS", "Node.js"],
    bgGradient: "from-technical/20 via-primary/5 to-technical/10",
    accentColor: "text-technical-text",
    link: "/domains",
  },
  {
    icon: <Users className="w-8 h-8" />,
    title: "Data Structures & Algorithms",
    subtitle: "(Python, Java, C++...)",
    description: "Build a rock-solid foundation in computer science fundamentals.",
    technologies: ["Python", "Java", "C++", "Algorithm Design", "Complexity Analysis"],
    bgGradient: "from-creative/20 via-primary/5 to-creative/10",
    accentColor: "text-creative-text",
    link: "/domains",
  },
  {
    icon: <Trophy className="w-8 h-8" />,
    title: "Aptitude & Reasoning",
    subtitle: "(Quantitative, Verbal, Logical...)",
    description: "Sharpen your analytical thinking and logical reasoning skills.",
    technologies: ["Quantitative", "Verbal", "Logical", "Analytical", "Critical Thinking"],
    bgGradient: "from-highlight/20 via-primary/5 to-highlight/10",
    accentColor: "text-highlight-text",
    link: "/domains",
  },
];
const StatsSection = () => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.section
      initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{
        duration: shouldReduceMotion ? 0 : 0.5,
        ease: [0.16, 1, 0.3, 1],
      }}
      viewport={{ once: true }}
      className="section-space-sm relative mx-3 overflow-hidden rounded-panel border border-line/70 bg-surface/80 shadow-soft sm:mx-5 lg:mx-8"
    >
      <motion.div
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-20"
        style={{
          opacity: 1,
          background:
            "radial-gradient(ellipse at top center, rgb(var(--color-primary) / 0.16) 0%, rgb(var(--color-success) / 0.07) 38%, transparent 72%)",
          transformOrigin: "center",
        }}
        aria-hidden="true"
      />

      <div className="site-container relative z-10">
        <motion.div
          variants={fadeIn}
          initial={shouldReduceMotion ? "animate" : "initial"}
          whileInView="animate"
          viewport={{ once: true }}
          className="mx-auto mb-10 max-w-2xl text-center sm:mb-12"
        >
          <h2 className="section-heading">Delivering Results</h2>
          <p className="section-lead mx-auto text-center">
            Our journey in numbers and achievements
          </p>
        </motion.div>

        <motion.div
          variants={stagger}
          initial={shouldReduceMotion ? "animate" : "initial"}
          whileInView="animate"
          viewport={{ once: true }}
          className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-6"
        >
          {[
            { icon: <Users className="w-8 h-8" />, number: "400+", title: "Members, every year" },
            { icon: <FolderOpen className="w-8 h-8" />, number: "50+", title: "Projects Completed" },
            { icon: <Calendar className="w-8 h-8" />, number: "25+", title: "Events Organized" },
            { icon: <Trophy className="w-8 h-8" />, number: "15+", title: "Awards Won" }
          ].map((stat) => (
            <motion.div
              key={stat.title}
              variants={fadeIn}
              whileHover={shouldReduceMotion ? undefined : { y: -4 }}
              className="ui-card-glass top-border-accent-primary flex min-w-0 flex-col items-center border-primary/25 p-4 text-center transition-colors duration-300 hover:border-dream/45 hover:shadow-glow sm:p-5 lg:p-6"
            >
              <motion.div
                className="mb-3 flex size-11 items-center justify-center rounded-control border border-success/25 bg-success/10 text-success-text sm:mb-4 sm:size-12"
                whileHover={shouldReduceMotion ? undefined : { y: -2 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
              >
                {stat.icon}
              </motion.div>
              <h3 className="font-display text-2xl font-semibold leading-none text-primary-text sm:text-3xl">
                {stat.number}
              </h3>
              <p className="mt-2 text-balance text-xs font-medium leading-snug text-ink-muted sm:text-sm">
                {stat.title}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
};

const Home = () => {
  const shouldReduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const featureRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = featureRefs.current.findIndex((ref) => ref === entry.target);
            if (index !== -1) setActiveFeature(index);
          }
        });
      },
      { threshold: 0.3, rootMargin: "-20% 0px -20% 0px" }
    );
    featureRefs.current.forEach((ref) => ref && observer.observe(ref));
    return () => observer.disconnect();
  }, []);

  const scrollToFeature = (idx: number) => {
    featureRefs.current[idx]?.scrollIntoView({
      behavior: shouldReduceMotion ? "auto" : "smooth",
      block: "center",
    });
  };

  const handleServicesClick = () => {
    if (isAuthenticated) {
      navigate('/domains');
    } else {
      navigate('/login');
    }
  };

  const handleExploreDomainClick = () => {
    if (isAuthenticated) {
      navigate('/domains');
    } else {
      navigate('/login');
    }
  };

  return (
    <PageTransition className="relative isolate overflow-hidden bg-transparent text-ink transition-colors duration-300">

      <div className="fixed left-8 top-1/2 z-20 hidden w-8 -translate-y-1/2 flex-col items-center gap-1 lg:flex">
        {features.map((_, idx) => (
          <button
            key={idx}
            onClick={() => scrollToFeature(idx)}
            className="group relative flex size-11 items-center justify-center rounded-full"
            aria-label={`Go to ${features[idx].title}`}
          >
            <span
              className={`size-3 rounded-full border transition duration-300 ${activeFeature === idx
                  ? idx === 0
                    ? "scale-125 border-technical bg-technical shadow-soft"
                    : idx === 1
                      ? "scale-125 border-creative bg-creative shadow-soft"
                      : "scale-125 border-highlight bg-highlight shadow-soft"
                  : "border-line-strong bg-surface-muted group-hover:border-primary group-hover:bg-primary/20"
                }`}
              aria-hidden="true"
            />
            <div className="pointer-events-none absolute left-12 top-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
              <div className="whitespace-nowrap rounded-control border border-line bg-ink px-3 py-2 text-sm font-medium text-ink-inverse shadow-soft">
                {features[idx].title}
              </div>
            </div>
          </button>
        ))}
      </div>

      <section className="hero-crescent relative isolate flex min-h-[100svh] items-center overflow-hidden bg-transparent pb-section-sm pt-28 text-ink sm:pt-32 lg:pt-36">
        <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
          <div
            className="absolute inset-0 opacity-60 dark:opacity-40"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgb(var(--color-border) / 0.22) 1px, transparent 1px), linear-gradient(to bottom, rgb(var(--color-border) / 0.22) 1px, transparent 1px)",
              backgroundSize: "4rem 4rem",
              WebkitMaskImage: "linear-gradient(to bottom, black, transparent 88%)",
              maskImage: "linear-gradient(to bottom, black, transparent 88%)",
            }}
          />
          <div className="absolute inset-x-0 top-[4.5rem] h-px bg-gradient-to-r from-transparent via-line-strong/70 to-transparent" />
        </div>

        <div className="site-container-wide relative z-20 w-full">
          <motion.div
            className="grid w-full min-w-0 items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)] lg:gap-10 xl:gap-14"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.55, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="min-w-0 max-w-4xl">
              <SectionReveal variant="fade" delay={0.08}>
                <span className="eyebrow border-dream/35 bg-glass/65 text-dream-text shadow-soft">
                  <span className="size-1.5 rounded-full bg-rose shadow-glow" aria-hidden="true" />
                  HackerEarth Hub · NMAMIT
                </span>
              </SectionReveal>

              <SectionReveal variant="slide-up" delay={0.14} className="relative mt-6">
                <div className="relative">
                  <div className="pointer-events-none absolute -inset-x-5 -top-8 h-40 rounded-full bg-gradient-to-r from-dream/12 via-technical/10 to-transparent opacity-70" aria-hidden="true" />
                  <div className="relative">
                    <TypingHero />
                  </div>
                </div>
              </SectionReveal>

              <SectionReveal
                variant="slide-left"
                delay={0.22}
                className="my-6 flex w-40 items-center justify-start gap-2 sm:my-7"
              >
                <div
                  className="flex w-full items-center justify-start gap-2"
                  aria-hidden="true"
                >
                  <span className="h-px flex-1 bg-gradient-to-r from-transparent to-dream/80" />
                  <span className="size-1.5 rotate-45 border border-rose/70 bg-glass shadow-glow" />
                  <span className="h-px flex-1 bg-gradient-to-l from-transparent to-technical/80" />
                </div>
              </SectionReveal>

              <SectionReveal variant="slide-up" delay={0.28}>
                <p className="max-w-2xl text-left text-base font-medium leading-relaxed text-ink sm:text-lg lg:text-xl">
                  We are a community of developers, designers, and innovators focused on hands-on creation. Join us to collaborate on real-world projects, hone your skills, and build a portfolio that stands out.
                </p>
              </SectionReveal>

              <SectionReveal variant="slide-up" delay={0.36}>
                <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                  <button
                    type="button"
                    onClick={handleServicesClick}
                    className="btn btn-secondary group w-full border-dream/35 bg-glass/65 px-6 focus-visible:outline-offset-4 sm:w-auto sm:text-base"
                  >
                    <span>Services</span>
                  </button>

                  <Link
                    to="/login"
                    className="btn btn-primary group w-full px-6 focus-visible:outline-offset-4 sm:w-auto sm:text-base"
                  >
                    <ArrowRight
                      className={`size-4 ${shouldReduceMotion ? "" : "transition-transform duration-200 group-hover:translate-x-0.5"
                        }`}
                      aria-hidden="true"
                    />
                    <span>Join Our Community</span>
                  </Link>
                </div>
              </SectionReveal>
            </div>

            <SectionReveal
              variant="scale"
              delay={0.32}
              className="relative flex w-full items-center justify-center py-4 lg:min-h-[24rem] lg:py-0"
            >
              <HomeTeamCollage />
            </SectionReveal>
          </motion.div>
        </div>
      </section>

      <section className="section-glow-cyan section-space relative z-[9] overflow-x-clip bg-gradient-to-b from-transparent via-dream-soft/20 to-transparent">
        <div className="site-container-wide">
          <SectionReveal
            variant="slide-up"
            className="relative z-10 mx-auto max-w-3xl text-center"
            amount={0.3}
          >
            <div className="flex justify-center">
              <span className="eyebrow group relative overflow-hidden">
                <span className="absolute inset-x-0 -top-px mx-auto h-px w-1/2 bg-gradient-to-r from-transparent via-technical to-transparent transition-all duration-500 group-hover:w-3/4" />
                <span className="absolute inset-x-0 -bottom-px mx-auto h-px w-1/2 bg-gradient-to-r from-transparent via-primary to-transparent transition-all duration-500 group-hover:w-3/4" />
                <span className="relative">Learning Paths</span>
              </span>
            </div>

            <h2 className="section-heading mt-5 text-center">
              Our Different{" "}
              <span className="bg-gradient-to-r from-primary-text to-technical-text bg-clip-text font-light italic text-transparent">
                Technical Domains
              </span>
            </h2>

            <p className="section-lead mx-auto text-center">
              Comprehensive learning paths designed to accelerate career growth and technical transformation.
            </p>
          </SectionReveal>

          <div className="relative mt-12 space-y-6 sm:mt-16 sm:space-y-8">
            {features.map((feature, idx) => (
              <motion.div
                key={feature.title}
                ref={(el) => (featureRefs.current[idx] = el)}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={shouldReduceMotion ? undefined : { y: -4 }}
                transition={{
                  duration: shouldReduceMotion ? 0 : 0.55,
                  delay: shouldReduceMotion ? 0 : idx * 0.06,
                  ease: [0.16, 1, 0.3, 1],
                }}
                viewport={{ once: true, amount: 0.15 }}
                className={`relative overflow-hidden p-4 transition-colors duration-300 hover:shadow-surface sm:p-6 lg:p-8 ${domainAccentStyles[idx].card}`}
              >
                <div
                  className={`pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent to-transparent ${domainAccentStyles[idx].line}`}
                  aria-hidden="true"
                />

                <div className="grid min-w-0 items-center gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-10">
                  <motion.div
                    className={`min-w-0 space-y-5 ${idx % 2 === 1 ? "lg:order-2" : ""}`}
                    initial={shouldReduceMotion ? false : { opacity: 0, x: idx % 2 === 1 ? 18 : -18 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: shouldReduceMotion ? 0 : 0.55, ease: [0.16, 1, 0.3, 1] }}
                    viewport={{ once: true, amount: 0.2 }}
                  >
                    <div className={`flex size-12 items-center justify-center rounded-control border ${domainAccentStyles[idx].icon}`}>
                      {feature.icon}
                    </div>

                    <h3 className="font-display text-title text-ink">{feature.title}</h3>
                    <p className="text-base leading-relaxed text-ink-muted sm:text-lg">
                      {feature.description}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {feature.technologies.map((tech) => (
                        <span
                          key={tech}
                          className={`rounded-full border px-3 py-1.5 font-mono text-[0.7rem] font-semibold ${domainAccentStyles[idx].tag}`}
                        >
                          {tech}
                        </span>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleExploreDomainClick}
                      className={`btn btn-secondary group w-full sm:w-auto ${idx === activeFeature
                          ? domainAccentStyles[idx].button
                          : ""
                        }`}
                    >
                      <span>Explore Domain</span>
                      <ChevronRight
                        className={`size-4 transition-transform ${shouldReduceMotion ? "" : "group-hover:translate-x-0.5"
                          }`}
                      />
                    </button>
                  </motion.div>

                  <motion.div
                    className={`min-w-0 ${idx % 2 === 1 ? "lg:order-1" : ""}`}
                    initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.96 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: shouldReduceMotion ? 0 : 0.55, ease: [0.16, 1, 0.3, 1] }}
                    viewport={{ once: true, amount: 0.2 }}
                  >
                    <div className="ui-card-muted relative min-w-0 overflow-hidden p-3 sm:p-5">
                      <DomainVisualCarousel
                        domain={domainVisualKinds[idx]}
                        accent={domainAccentStyles[idx].accent}
                      />
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <StatsSection />

      {/* events */}
      <section className="section-glow-amber section-space relative bg-gradient-to-b from-transparent via-rose/5 to-transparent">
        <div className="site-container-wide">
          <SectionReveal
            variant="slide-right"
            className="mx-auto max-w-3xl text-center"
            amount={0.3}
          >
            <div className="flex justify-center">
              <span className="eyebrow group relative overflow-hidden">
                <span className="absolute inset-x-0 -top-px mx-auto h-px w-1/2 bg-gradient-to-r from-transparent via-highlight to-transparent transition-all duration-500 group-hover:w-3/4" />
                <span className="absolute inset-x-0 -bottom-px mx-auto h-px w-1/2 bg-gradient-to-r from-transparent via-primary to-transparent transition-all duration-500 group-hover:w-3/4" />
                <span className="relative">Community Events</span>
              </span>
            </div>

            <h2 className="section-heading mt-5 text-center">Explore our Past Events</h2>

            <p className="section-lead mx-auto text-center">
              Take a look at some of our past events and initiatives
            </p>
          </SectionReveal>

          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4">
            {events.map((event, index) => (
              <EventCard key={event.id} event={event} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="section-space relative bg-gradient-to-b from-dream-soft/20 via-surface-muted/45 to-transparent">
        <div className="site-container-wide">
          <SectionReveal
            variant="slide-left"
            className="mx-auto max-w-3xl text-center"
            amount={0.3}
          >
            <div className="flex justify-center">
              <span className="eyebrow group relative overflow-hidden">
                <span className="absolute inset-x-0 -top-px mx-auto h-px w-1/2 bg-gradient-to-r from-transparent via-technical to-transparent transition-all duration-500 group-hover:w-3/4" />
                <span className="absolute inset-x-0 -bottom-px mx-auto h-px w-1/2 bg-gradient-to-r from-transparent via-creative to-transparent transition-all duration-500 group-hover:w-3/4" />
                <span className="relative">Testimonials</span>
              </span>
            </div>

            <h2 className="section-heading mt-5 text-center">What our members say</h2>

            <p className="section-lead mx-auto text-center">
              Voices from our community, hear what our members have to say about their journey..
            </p>
          </SectionReveal>

          <MemberExperienceMarquee experiences={testimonials} />
        </div>
      </section>

      <section className="section-space relative overflow-hidden bg-transparent transition-colors duration-500">
        <div className="site-container">
          <SectionReveal
            variant="scale"
            amount={0.25}
            className="ui-panel-glass top-border-accent-violet relative isolate overflow-hidden border-dream/30 bg-gradient-to-br from-primary/10 via-glass/75 to-creative/10 px-5 py-12 sm:px-8 sm:py-16 lg:px-12 lg:py-20"
          >
            {/* Background effects */}
            <div className="pointer-events-none absolute -left-24 -top-32 size-72 rounded-full bg-primary/10" aria-hidden="true" />
            <div className="pointer-events-none absolute -bottom-36 -right-24 size-80 rounded-full bg-creative/10" aria-hidden="true" />
            <div
              className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-creative/70 to-transparent"
              aria-hidden="true"
            />

            <div className="relative z-10 grid items-center gap-9 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-12">
              <div className="text-center lg:text-left">
                {/* Main heading */}
                <h2 className="section-heading mx-auto max-w-2xl lg:mx-0">
                  Ready to Begin Your Journey?
                </h2>

                {/* Subtitle */}
                <p className="section-lead mx-auto lg:mx-0">
                  Join a community of innovators, builders, and leaders. Start your path to technical excellence today.
                </p>
              </div>

              {/* Animated CTA button */}
              <div className="flex items-center justify-center lg:justify-end">
                <Link
                  to="/login"
                  className={`btn btn-primary group w-full justify-between px-5 focus-visible:outline-offset-4 xs:w-auto xs:min-w-48 xs:justify-center ${shouldReduceMotion ? "" : "hover:-translate-y-1"
                    }`}
                >
                  <span className="flex items-center gap-2">
                    <Rocket
                      className={`size-5 transition-transform duration-200 ${shouldReduceMotion ? "" : "group-hover:-translate-y-0.5"
                        }`}
                      aria-hidden="true"
                    />
                    <span>Get Started</span>
                  </span>
                  <span
                    className="flex size-7 items-center justify-center rounded-full border border-current/30 transition-transform ease-in-out"
                    aria-hidden="true"
                  >
                    <ArrowRight
                      className={`size-4 transition-transform ease-in-out ${shouldReduceMotion ? "" : "group-hover:translate-x-0.5"
                        }`}
                    />
                  </span>
                </Link>
              </div>
            </div>

            {/* Background text effect */}
            <h1
              className="pointer-events-none absolute inset-x-0 -bottom-4 whitespace-nowrap text-center font-display text-[3.5rem] font-semibold leading-none text-transparent sm:-bottom-8 sm:text-[7rem] lg:text-[9rem]"
              style={{
                WebkitTextStroke: "1px rgb(var(--color-primary) / 0.12)",
                color: "transparent",
              }}
              aria-hidden="true"
            >
              HackerEarth
            </h1>
            <h1
              className="pointer-events-none absolute inset-x-0 -bottom-4 whitespace-nowrap text-center font-display text-[3.5rem] font-semibold leading-none text-primary/5 sm:-bottom-8 sm:text-[7rem] lg:text-[9rem] dark:text-creative/5"
              aria-hidden="true"
            >
              HackerEarth
            </h1>
          </SectionReveal>
        </div>
      </section>
    </PageTransition>
  );
};

export default Home;
