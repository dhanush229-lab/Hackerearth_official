import { Quote } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

export interface MemberExperience {
  img: string;
  name: string;
  username: string;
  body: string;
}

const ExperienceCard = ({
  experience,
  index,
}: {
  experience: MemberExperience;
  index: number;
}) => {
  const isCyanAccent = index % 2 === 0;

  return (
    <article
      className={`ui-card-glass relative h-full w-[min(22rem,82vw)] shrink-0 overflow-hidden p-5 transition-colors duration-300 sm:w-96 sm:p-6 ${
        isCyanAccent
          ? "top-border-accent-cyan hover:border-technical/50"
          : "top-border-accent-violet hover:border-creative/50"
      }`}
    >
      <div
        className={`pointer-events-none absolute -left-12 -top-12 size-36 rounded-full opacity-50 ${
          isCyanAccent ? "bg-technical/10" : "bg-creative/10"
        }`}
        aria-hidden="true"
      />

      <Quote
        className={`relative mb-4 size-8 opacity-80 ${
          isCyanAccent ? "text-technical-text" : "text-creative-text"
        }`}
        aria-hidden="true"
      />

      <blockquote className="relative">
        <p className="line-clamp-6 text-sm leading-relaxed text-ink-muted sm:text-base">
          {experience.body}
        </p>
      </blockquote>

      <footer className="relative mt-6 flex items-center gap-3 border-t border-line pt-5">
        <img
          src={experience.img}
          alt={`${experience.name}'s profile picture`}
          loading="lazy"
          decoding="async"
          className={`size-12 shrink-0 rounded-full border-2 bg-surface-muted object-cover object-[center_20%] shadow-soft ${
            isCyanAccent ? "border-technical/35" : "border-creative/35"
          }`}
        />
        <div className="min-w-0">
          <p className="font-display text-sm font-semibold leading-5 text-ink sm:text-base">
            {experience.name}
          </p>
          {experience.username && (
            <p className="break-words text-sm leading-5 text-ink-subtle">
              {experience.username}
            </p>
          )}
        </div>
      </footer>
    </article>
  );
};

export default function MemberExperienceMarquee({
  experiences,
}: {
  experiences: MemberExperience[];
}) {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const loopedExperiences = [...experiences, ...experiences];

  if (shouldReduceMotion) {
    return (
      <div className="mt-12 grid items-start gap-5 md:grid-cols-2 md:gap-6 xl:grid-cols-3">
        {experiences.map((experience, index) => (
          <ExperienceCard
            key={`${experience.name}-${experience.username}`}
            experience={experience}
            index={index}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="member-experience-marquee mt-12 overflow-hidden py-2">
      <motion.div
        className="member-experience-marquee__track flex w-max gap-5 md:gap-6"
        aria-label="Member experiences"
      >
        {loopedExperiences.map((experience, index) => (
          <ExperienceCard
            key={`${experience.name}-${experience.username}-${index}`}
            experience={experience}
            index={index}
          />
        ))}
      </motion.div>
    </div>
  );
}
