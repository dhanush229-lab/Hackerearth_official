"use client";

import { useState, type FocusEvent, type KeyboardEvent, type PointerEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Github, Linkedin, Mail } from "lucide-react";
import PageTransition from "../components/ui/PageTransition";
import SectionReveal from "../components/ui/SectionReveal";
import "./Team.css";

interface TeamMember {
  id: string;
  name: string;
  position: string;
  image?: string;
  imagePosition?: string;
  skills?: string[];
  slogan?: string;
  github?: string;
  linkedin?: string;
  email?: string;
}

const leadership: TeamMember[] = [
  { id: "pratham-s-salian",
    name: "Pratham S Salian",
    position: "President" ,
    image: "/team/pratham-s-salian.webp",
    slogan: "Curiosity is the key to innovation.",
    github: "https://github.com/prathamssalian",
    linkedin: "https://www.linkedin.com/in/pratham-s-salian-33534328b?utm_source=share_via&utm_content=profile&utm_medium=member_android",
    email: "prathamssalian@gmail.com",
  },
  {
    id: "shravya-s",
    name: "Shravya S",
    position: "Vice President",
    image: "/team/shravya-s.webp",
    slogan: "Curious learner, always exploring, learning, improving and growing.",
    skills: ["Java", "TypeScript", "React.js"],
    github: "https://github.com/ShravyaS229",
    linkedin: "https://www.linkedin.com/in/shravya04",
    email: "nnm24is229@nmamit.in",
  },
  {
    id: "kashvi-suresh",
    name: "Kashvi Suresh",
    position: "Secretary",
    image: "/team/kashvi-suresh.webp",
    imagePosition: "50% 72%",
    slogan: "A little curious, a little chaotic, always creative ",
    skills: ["Python", "Java", "C", "R"],
    github: "https://github.com/KashviSuresh03",
    linkedin: "http://www.linkedin.com/in/kashvi-suresh",
    email: "nnm24cs114@nmamit.in",
  },
  {
    id: "shaarwari",
    name: "Shaarwari",
    position: "Vice Secretary",
    image: "/team/shaarwari.webp",
    imagePosition: "50% 43%",
    slogan: "Think. Investigate. Build",
    skills: ["Python", "React", "MySQL"],
    github: "https://github.com/Shaarwari13",
    linkedin: "https://www.linkedin.com/in/shaarwari-balegadde/",
    email: "nnm24is208@nmamit.in",
  },
];

const techLeads: TeamMember[] = [
  {
    id: "b-m-shuchay-jogithaya",
    name: "B M Shuchay Jogithaya",
    position: "Tech Lead",
    image: "/team/bm-shuchay-jogithaya.webp",
    slogan: "Unlocking potential through tech.",
    skills: ["Python", "C++", "Next.js"],
    github: "https://github.com/bmshuchayajogithaya-star",
    linkedin: "https://www.linkedin.com/in/b-m-shuchay-jogithaya-71b933377",
    email: "nn25cse082@nmamit.in",
  },
  {
    id: "amish-sudhakara",
    name: "Amish Sudhakara",
    position: "Tech Lead",
    image: "/team/amish-sudhakara.webp",
    slogan: "Curiosity keeps me moving.",
    skills: ["Python", "React", "PyTorch"],
    github: "https://github.com/Amish-Sudhakara",
    linkedin: "https://www.linkedin.com/in/amishsudhakara/",
    email: "nnm24is020@nmamit.in",
  },
  {
    id: "b-shreya-kamath",
    name: "B. SHREYA KAMATH",
    position: "Tech Lead",
    image: "/team/b-shreya-kamath.webp",
    imagePosition: "50% 55%",
    slogan: "Do what inspires you, become what inspires others.",
    skills: ["Python", "Java", "Machine Learning"],
    github: "https://github.com/bshreyakamath",
    linkedin: "https://www.linkedin.com/in/bshreyakamath",
    email: "nnm24am015@nmamit.in",
  },
];

const mediaTeam: TeamMember[] = [
  {
    id: "gautham-kini-t",
    name: "Gautham Kini T",
    position: "Social Media Head",
    image: "/team/gautham-kini-t.webp",
    imagePosition: "50% 42%",
    slogan: "Turning ideas into visuals that speak louder",
    skills: ["Python", "Aiml", "Java", "power BI", "c++", "deep learning."],
    github: "https://github.com/Gauthamkini",
    linkedin: "https://www.linkedin.com/in/gautham-kini-t-457311322/",
    email: "nnm24ad022@nmamit.in",
  },
  {
    id: "stuti-shetty",
    name: "Stuti Shetty",
    position: "Social Media Team",
    image: "/team/stuti-shetty.webp",
    slogan: "trust the process",
    github: "https://github.com/stutiishettyy-a11y",
    linkedin: "https://www.linkedin.com/in/stuti-shetty-32ba55428",
    email: "nn25cse365@nmamit.in",

  },
  {
    id: "shaina-pinto",
    name: "Shaina Pinto",
    position: "Social Media Team",
    image: "/team/shaina-pinto.webp",
    imagePosition: "50% 50%",
    slogan: "Dream big. Learn more. Create better.s",
    skills: ["Python"],
    github: "https://github.com/shainapnt-pixel",
    linkedin: "https://www.linkedin.com/in/shaina-pinto-564916375?utm_source=share_via&utm_content=profile&utm_medium=member_android",
    email: "NN25CSE304@nmamit.in",
  },
];

const publicityTeam: TeamMember[] = [
  {
    id: "akshara-shetty",
    name: "Akshara Shetty",
    position: "Publicity Head",
    image: "/team/akshara-shetty.webp",
    slogan: "A little creativity, a lot of energy, and a voice that gets heard.",
    skills: ["C", "C++", "Python"],
    github: "https://github.com/aksharashettyy",
    linkedin: "https://www.linkedin.com/in/akshara-shetty-773423378",
    email: "nn25cse028@nmamit.in",
  },
  {
    id: "unnati-u-bhat",
    name: "Unnati U Bhat",
    position: "Publicity Team",
    image: "/team/unnati-u-bhat.webp",
    slogan: "Exploring, experimenting and creating with spontaneity",
    skills: ["Python", "React", "FastAPI"],
    github: "https://github.com/UnnatiBhat09",
    linkedin: "https://www.linkedin.com/in/unnati-bhat-190a32363",
    email: "nnm24cs279@nmamit.in",
  },
  {
    id: "ashmitha-k-shetty",
    name: "Ashmitha K Shetty",
    position: "Publicity Team",
    image: "/team/ashmitha-k-shetty.webp",
    imagePosition: "50% 58%",
    slogan: "Creating, connecting, and making ideas stand out",
    skills: ["C", "C++", "Python"],
    github: "https://github.com/ashmithakshetty",
    linkedin: "https://www.linkedin.com/in/ashmitha-k-shetty-16b174428",
    email: "nn25cse072@nmamit.in",
  },
  {
    id: "vijaya-g-nayak",
    name: "Vijaya G Nayak",
    position: "Publicity Team",
    image: "/team/vijaya-g-nayak.webp",
    imagePosition: "50% 85%",
    slogan: "Learning, building, and creating my way forward",
    skills: ["C", "C++", "Java"],
    github: "https://github.com/Vijaya130",
    linkedin: "https://www.linkedin.com/in/vijaya-n-7b2399321",
    email: "nnm24is276@nmamit.in",
  },
];

const webTeam: TeamMember[] = [
  {
    id: "dhanush-y-shetty",
    name: "Dhanush Y Shetty",
    position: "Web Master",
    image: "/team/dhanush-y-shetty.webp",
    imagePosition: "50% 35%",
    slogan: "Money follows ma Brotha :)",
    skills: ["C", "Java", "Python"],
    github: "https://github.com/dhanush229-lab",
    linkedin: "https://www.linkedin.com/in/dhanush-y-shetty-3840992a7/",
    email: "nnm24is067@nmamit.in",
  },
  {
    id: "aman-hegde",
    name: "Aman Hegde",
    position: "Web Master",
    image: "/team/aman-hegde.webp",
    imagePosition: "50% 50%",
    slogan: "Building ideas into code, and code into impact.",
    skills: ["Python", "Java", "React"],
    github: "https://github.com/Aman-Hegde",
    linkedin: "https://www.linkedin.com/in/amanhegde/",
    email: "nnm24is019@nmamit.in",
  },
];

const eventManagementTeam: TeamMember[] = [
  {
    id: "rachitha-c-shettigar",
    name: "Rachitha C Shettigar",
    position: "Event Management Head",
    image: "/team/rachitha-c-shettigar.webp",
    slogan: "Turning ideas into creativity",
    skills: ["C", "Python", "Java"],
    github: "https://github.com/Rachithashettigar08",
    linkedin: "https://www.linkedin.com/in/rachitha-c-shettigar-7467a5386",
    email: "nnm24cs199@nmamit.in",
  },
  {
    id: "ishani-durgesh-shanbhag",
    name: "Ishani Durgesh Shanbhag",
    position: "Event Team",
    image: "/team/ishani-durgesh-shanbhag.webp",
    slogan: "Fluent in “why not?”",
    skills: ["Python", "React.js", "FastAPI"],
    github: "https://github.com/ishani-codes",
    linkedin: "https://www.linkedin.com/in/ishanishanbhag",
    email: "nnm24cs102@nmamit.in",
  },
  {
    id: "mrinmay-verma",
    name: "Mrinmay Verma",
    position: "Event Team",
    image: "/team/mrinmay-verma.webp",
    slogan: "Curious by nature, driven to learn, and always ready to take on new challenges.",
    skills: ["Python", "C++", "Git/GitHub"],
    github: "https://github.com/Mrinmay-Verma",
    linkedin: "https://www.linkedin.com/in/mrinmay-verma-772b1739a",
    email: "nn25cse199@nmamit.in",
  },
];

const documentationTeam: TeamMember[] = [
  {
    id: "prerana-puthran",
    name: "Prerana Puthran",
    position: "Documentation Head",
    image: "/team/prerana-puthran.webp",
    slogan: "Learn.Build.Lead",
    skills: ["C", "C++", "Python"],
    github: "https://github.com/preranaputhran02",
    linkedin: "https://www.linkedin.com/in/prerana-puthran-b54559386",
    email: "nnm24cs194@nmamit.in",
  },
];

const graphicsTeam: TeamMember[] = [
  {
    id: "hardik-shetty",
    name: "Hardik Shetty",
    position: "Graphics Head",
    image: "/team/hardik-shetty.webp",
  },
  {
    id: "shravya-graphics",
    name: "Shravya",
    position: "Graphics Team ",
    image: "/team/shravya-graphics.webp",
  },
];

const advisory: TeamMember[] = [
  {
    id: "shaamak-senior-advisor",
    name: "Shaamak",
    position: "Senior Advisor",
    image: "/team/shaamak-senior-advisor.webp",
    slogan: "Shaamak bro please send it to me! what to display",
  },
];

const teamSections: Array<{ title: string; data: TeamMember[] }> = [
  { title: "Leadership", data: leadership },
  { title: "Web Team", data: webTeam },
  { title: "Tech Leads", data: techLeads },
  { title: "Media Team", data: mediaTeam },
  { title: "Publicity Team", data: publicityTeam },
  { title: "Event Management Team", data: eventManagementTeam },
  { title: "Documentation Team", data: documentationTeam },
  { title: "Graphics Team", data: graphicsTeam },
  { title: "Advisory", data: advisory },
];

type TeamAccent = "primary" | "technical" | "creative" | "rose";

const teamSectionAccents: TeamAccent[] = [
  "primary",
  "technical",
  "creative",
  "rose",
  "primary",
  "technical",
  "creative",
  "rose",
  "primary",
];

const teamAccentStyles: Record<
  TeamAccent,
  {
    card: string;
    topBorder: string;
    line: string;
    label: string;
    role: string;
    skill: string;
    social: string;
  }
> = {
  primary: {
    card: "border-primary/25 hover:border-primary/45",
    topBorder: "top-border-accent-primary",
    line: "via-primary/70",
    label: "text-primary-text",
    role: "text-primary-text",
    skill: "border-primary/20 bg-primary/5",
    social: "border-primary/20 text-primary-text hover:border-primary/40",
  },
  technical: {
    card: "border-technical/25 hover:border-technical/45",
    topBorder: "top-border-accent-cyan",
    line: "via-technical/70",
    label: "text-technical-text",
    role: "text-technical-text",
    skill: "border-technical/20 bg-technical/5",
    social: "border-technical/20 text-technical-text hover:border-technical/40",
  },
  creative: {
    card: "border-creative/25 hover:border-creative/45",
    topBorder: "top-border-accent-violet",
    line: "via-creative/70",
    label: "text-creative-text",
    role: "text-creative-text",
    skill: "border-creative/20 bg-creative/5",
    social: "border-creative/20 text-creative-text hover:border-creative/40",
  },
  rose: {
    card: "border-rose/25 hover:border-rose/45",
    topBorder: "border-t-2 border-t-rose/70",
    line: "via-rose/70",
    label: "text-rose-text",
    role: "text-rose-text",
    skill: "border-rose/20 bg-rose/5",
    social: "border-rose/20 text-rose-text hover:border-rose/40",
  },
};

const TeamMemberCard = ({
  member,
  accent,
  shouldReduceMotion,
}: {
  member: TeamMember;
  accent: (typeof teamAccentStyles)[TeamAccent];
  shouldReduceMotion: boolean | null;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const hasSocialLinks = Boolean(member.github || member.linkedin || member.email);
  const hasExtendedDetails = Boolean(
    member.slogan || member.skills?.length || hasSocialLinks,
  );
  const showingBack = isHovered || isFlipped;

  const handlePointerEnter = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === "mouse") setIsHovered(true);
  };

  const handlePointerLeave = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== "mouse") return;
    if (
      document.activeElement !== event.currentTarget &&
      event.currentTarget.contains(document.activeElement)
    ) {
      setIsFlipped(true);
    }
    setIsHovered(false);
  };

  const handlePointerUp = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== "mouse") setIsFlipped((current) => !current);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setIsFlipped((current) => !current);
    }
  };

  const handleBlur = (event: FocusEvent<HTMLElement>) => {
    const nextTarget = event.relatedTarget;
    if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
      setIsFlipped(false);
    }
  };

  return (
    <motion.article
      role="group"
      tabIndex={0}
      aria-label={`${member.name}, ${member.position}. Press Enter or Space to ${showingBack ? "hide" : "show"} details.`}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerUp={handlePointerUp}
      onKeyDown={handleKeyDown}
      onBlurCapture={handleBlur}
      whileHover={shouldReduceMotion ? undefined : { y: -4 }}
      className={`team-flip-card ${showingBack ? "is-flipped" : ""}`}
    >
      <div className="team-flip-card__inner">
        <div
          className={`team-flip-card__face ui-card-glass group flex flex-col transition-colors duration-300 hover:shadow-glow ${
            showingBack ? "pointer-events-none" : ""
          } ${accent.card} ${accent.topBorder}`}
          aria-hidden={showingBack}
        >
          <div className="team-flip-card__photo relative m-3 mb-0 overflow-hidden rounded-[1.4rem] border border-line/70 bg-gradient-to-br from-creative/20 via-surface-muted to-primary/15 shadow-soft sm:m-4 sm:mb-0">
            {member.image && (
              <img
                src={member.image}
                alt={member.name}
                loading="lazy"
                decoding="async"
                className="size-full object-cover"
                style={{ objectPosition: member.imagePosition ?? "50% 65%" }}
              />
            )}
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/10 via-transparent to-transparent"
              aria-hidden="true"
            />
            <div
              className={`pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent to-transparent ${accent.line}`}
              aria-hidden="true"
            />
          </div>

          <div className="flex flex-1 flex-col p-5 sm:p-6">
            <h3 className="font-display text-xl font-semibold leading-tight text-ink">
              {member.name}
            </h3>
            <p className={`mt-3 inline-flex w-fit rounded-full border border-current/20 bg-surface-muted/70 px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-[0.12em] ${accent.role}`}>
              {member.position}
            </p>
            {member.slogan && (
              <p className="team-flip-card__front-quote mt-3 text-sm italic leading-5 text-ink-muted">
                "{member.slogan}"
              </p>
            )}
          </div>
        </div>

        <div
          className={`team-flip-card__face team-flip-card__back ui-card-glass flex flex-col p-6 transition-colors duration-300 sm:p-7 ${
            showingBack ? "" : "pointer-events-none"
          } ${hasExtendedDetails ? "" : "team-flip-card__back--minimal"} ${accent.card} ${accent.topBorder}`}
          aria-hidden={!showingBack}
        >
          <div
            className={`pointer-events-none absolute inset-x-8 top-0 h-1 bg-gradient-to-r from-transparent to-transparent ${accent.line}`}
            aria-hidden="true"
          />

          <h3 className="font-display text-xl font-semibold leading-tight text-ink">
            {member.name}
          </h3>
          <p className={`mt-3 inline-flex w-fit rounded-full border border-current/20 bg-surface-muted/70 px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-[0.12em] ${accent.role}`}>
            {member.position}
          </p>

          {hasExtendedDetails && (
            <>
              <div className="mt-6 min-h-28">
                {member.slogan && (
                  <p className="text-sm italic leading-relaxed text-ink-muted sm:text-base">
                    "{member.slogan}"
                  </p>
                )}
              </div>

              <div className="mt-5 flex min-h-16 flex-wrap content-start gap-2">
                {member.skills?.slice(0, 3).map((skill) => (
                  <span
                    key={skill}
                    className={`rounded-full border px-3 py-1 font-mono text-xs font-semibold text-ink-muted ${accent.skill}`}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </>
          )}

          {hasSocialLinks && (
            <div className="mt-auto flex flex-wrap items-center gap-2 pt-6">
              {member.github && (
                <a
                  href={member.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  tabIndex={showingBack ? 0 : -1}
                  onPointerUp={(event) => event.stopPropagation()}
                  onClick={(event) => event.stopPropagation()}
                  className={`btn btn-ghost btn-icon group/social rounded-full bg-glass/60 focus-visible:outline-offset-2 ${accent.social}`}
                  aria-label={`${member.name} GitHub`}
                >
                  <Github
                    className={`size-5 transition-transform duration-200 ${
                      shouldReduceMotion ? "" : "group-hover/social:scale-110"
                    }`}
                    aria-hidden="true"
                  />
                </a>
              )}
              {member.linkedin && (
                <a
                  href={member.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  tabIndex={showingBack ? 0 : -1}
                  onPointerUp={(event) => event.stopPropagation()}
                  onClick={(event) => event.stopPropagation()}
                  className={`btn btn-ghost btn-icon group/social rounded-full bg-glass/60 focus-visible:outline-offset-2 ${accent.social}`}
                  aria-label={`${member.name} LinkedIn`}
                >
                  <Linkedin
                    className={`size-5 transition-transform duration-200 ${
                      shouldReduceMotion ? "" : "group-hover/social:scale-110"
                    }`}
                    aria-hidden="true"
                  />
                </a>
              )}
              {member.email && (
                <a
                  href={`mailto:${member.email}`}
                  tabIndex={showingBack ? 0 : -1}
                  onPointerUp={(event) => event.stopPropagation()}
                  onClick={(event) => event.stopPropagation()}
                  className={`btn btn-ghost btn-icon group/social rounded-full bg-glass/60 focus-visible:outline-offset-2 ${accent.social}`}
                  aria-label={`Email ${member.name}`}
                >
                  <Mail
                    className={`size-5 transition-transform duration-200 ${
                      shouldReduceMotion ? "" : "group-hover/social:scale-110"
                    }`}
                    aria-hidden="true"
                  />
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.article>
  );
};

const Team = () => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <PageTransition className="relative isolate min-h-screen overflow-hidden bg-transparent text-ink transition-colors duration-500">
      <main className="section-glow-subtle relative min-h-screen overflow-hidden">
        <div className="team-page-container site-container-wide section-space pt-28 sm:pt-32">
          <SectionReveal
            variant="slide-up"
            className="mx-auto max-w-3xl text-center"
          >
            <h1 className="section-heading">
              <span className="text-gradient-subtle">Meet Our Team</span>
            </h1>
            <p className="section-lead mx-auto mt-4 text-center">
              The people building HackerEarth Hub NMAMIT
            </p>
          </SectionReveal>

          <div className="mt-16 space-y-20 sm:mt-20 sm:space-y-24">
            {teamSections.map((section, sectionIndex) => {
              const accent = teamAccentStyles[teamSectionAccents[sectionIndex]];

              return (
                <section
                  key={section.title}
                  className="scroll-mt-24 rounded-panel border border-line/50 bg-glass/30 px-1 py-4 shadow-glass sm:p-6 lg:p-8"
                  aria-labelledby={`team-section-${sectionIndex}`}
                >
                  <SectionReveal
                    variant={sectionIndex % 2 === 0 ? "slide-left" : "slide-right"}
                    amount={0.3}
                    className="mb-8 text-center sm:mb-10"
                  >
                    <h2
                      id={`team-section-${sectionIndex}`}
                      className="font-display text-title text-ink"
                    >
                      <span className={`inline-flex px-4 pt-3 ${accent.label} ${accent.topBorder}`}>
                        {section.title}
                      </span>
                    </h2>
                  </SectionReveal>

                  <motion.div
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: shouldReduceMotion ? 0 : 0.5,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    viewport={{ once: true, amount: 0.12 }}
                    className={`team-card-grid ${
                      section.data.length === 3 ? "team-card-grid--three" : ""
                    }`}
                  >
                    {section.data.map((member) => (
                      <TeamMemberCard
                        key={member.id}
                        member={member}
                        accent={accent}
                        shouldReduceMotion={shouldReduceMotion}
                      />
                    ))}
                  </motion.div>
                </section>
              );
            })}
          </div>
        </div>
      </main>
    </PageTransition>
  );
};

export default Team;
