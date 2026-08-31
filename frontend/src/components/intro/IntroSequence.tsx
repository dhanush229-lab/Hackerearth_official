import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

import hackerEarthMark from "../../assets/hackerearth-h-mark.png";
import "./IntroSequence.css";

const STANDARD_EXIT_START_MS = 14_400;
const REDUCED_EXIT_START_MS = 1_600;
const STANDARD_EXIT_DURATION_MS = 450;
const REDUCED_EXIT_DURATION_MS = 320;

const TUNNEL_COLORS = [
  "#c49dd7",
  "#271427",
  "#df84a1",
  "#e09477",
  "#faf1eb",
  "#704a82",
  "#c49dd7",
  "#df84a1",
  "#34203c",
  "#faf1eb",
] as const;

const TRAIL_CONFIG = [
  { side: "left", top: "15%", angle: "11deg", delay: "5.35s" },
  { side: "right", top: "23%", angle: "-9deg", delay: "5.6s" },
  { side: "left", top: "38%", angle: "4deg", delay: "5.85s" },
  { side: "right", top: "51%", angle: "-3deg", delay: "6.05s" },
  { side: "left", top: "68%", angle: "-8deg", delay: "6.3s" },
  { side: "right", top: "79%", angle: "9deg", delay: "6.5s" },
] as const;

const DUST_CONFIG = Array.from({ length: 18 }, (_, index) => ({
  left: `${8 + ((index * 29) % 86)}%`,
  top: `${6 + ((index * 43) % 88)}%`,
  delay: `${(index % 7) * 0.42}s`,
  duration: `${2.8 + (index % 5) * 0.38}s`,
}));

type IntroSequenceProps = {
  children: ReactNode;
};

type IntroStyle = CSSProperties & Record<`--${string}`, string | number>;

export default function IntroSequence({ children }: IntroSequenceProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const [reducedMotion] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false,
  );
  const timerIdsRef = useRef<number[]>([]);
  const exitStartedRef = useRef(false);

  const clearTimers = useCallback(() => {
    timerIdsRef.current.forEach((timerId) => window.clearTimeout(timerId));
    timerIdsRef.current = [];
  }, []);

  const requestExit = useCallback(() => {
    if (exitStartedRef.current) return;

    exitStartedRef.current = true;
    clearTimers();
    setIsExiting(true);

    timerIdsRef.current.push(
      window.setTimeout(
        () => setIsVisible(false),
        reducedMotion ? REDUCED_EXIT_DURATION_MS : STANDARD_EXIT_DURATION_MS,
      ),
    );
  }, [clearTimers, reducedMotion]);

  useEffect(() => {
    if (!isVisible) return;

    timerIdsRef.current.push(
      window.setTimeout(
        requestExit,
        reducedMotion ? REDUCED_EXIT_START_MS : STANDARD_EXIT_START_MS,
      ),
    );

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") requestExit();
    };

    window.addEventListener("keydown", handleKeyDown);

    const scrollTargets = [
      document.documentElement,
      document.body,
      document.getElementById("scroll-container"),
    ].filter((target): target is HTMLElement => target instanceof HTMLElement);

    const previousStyles = scrollTargets.map((target) => ({
      target,
      overflow: target.style.overflow,
      overscrollBehavior: target.style.overscrollBehavior,
      touchAction: target.style.touchAction,
    }));

    previousStyles.forEach(({ target }) => {
      target.style.overflow = "hidden";
      target.style.overscrollBehavior = "none";
      target.style.touchAction = "none";
    });

    const appContainer = document.getElementById("scroll-container");
    const previousInert = appContainer?.getAttribute("inert") ?? null;
    appContainer?.setAttribute("inert", "");

    return () => {
      clearTimers();
      window.removeEventListener("keydown", handleKeyDown);

      previousStyles.forEach(
        ({ target, overflow, overscrollBehavior, touchAction }) => {
          target.style.overflow = overflow;
          target.style.overscrollBehavior = overscrollBehavior;
          target.style.touchAction = touchAction;
        },
      );

      if (appContainer) {
        if (previousInert === null) appContainer.removeAttribute("inert");
        else appContainer.setAttribute("inert", previousInert);
      }
    };
  }, [clearTimers, isVisible, reducedMotion, requestExit]);

  return (
    <>
      {children}

      {isVisible && (
        <div
          className={`intro-sequence${isExiting ? " intro-sequence--exiting" : ""}${
            reducedMotion ? " intro-sequence--reduced" : ""
          }`}
          role="dialog"
          aria-label="HackerEarth Hub cinematic opening"
          aria-modal="true"
          onClick={requestExit}
        >
          <div className="intro-sequence__world" aria-hidden="true">
            <div className="intro-sequence__luminous-core" />

            <div className="intro-sequence__auroras">
              {Array.from({ length: 5 }, (_, index) => (
                <span
                  className={`intro-sequence__aurora intro-sequence__aurora--${index + 1}`}
                  key={index}
                />
              ))}
            </div>

            <div className="intro-sequence__dust">
              {DUST_CONFIG.map((particle, index) => (
                <span
                  key={index}
                  style={
                    {
                      "--dust-left": particle.left,
                      "--dust-top": particle.top,
                      "--dust-delay": particle.delay,
                      "--dust-duration": particle.duration,
                    } as IntroStyle
                  }
                />
              ))}
            </div>

            <div className="intro-sequence__tunnel">
              {TUNNEL_COLORS.map((color, index) => (
                <span
                  className="intro-sequence__tunnel-ring"
                  key={`${color}-${index}`}
                  style={
                    {
                      "--ring-color": color,
                      "--ring-delay": `${1.72 + index * 0.53}s`,
                      "--ring-rotation": `${index % 2 === 0 ? -7 + index * 1.7 : 8 - index * 1.35}deg`,
                    } as IntroStyle
                  }
                />
              ))}
              <span className="intro-sequence__portal-core" />
            </div>

            <div className="intro-sequence__traveler">
              <span className="intro-sequence__traveler-glass">
                <img
                  src={hackerEarthMark}
                  alt=""
                  draggable="false"
                />
              </span>
            </div>

            <div className="intro-sequence__speed-trails">
              {TRAIL_CONFIG.map((trail, index) => (
                <span
                  className={`intro-sequence__speed-trail intro-sequence__speed-trail--${trail.side}`}
                  key={`${trail.side}-${trail.top}`}
                  style={
                    {
                      "--trail-top": trail.top,
                      "--trail-angle": trail.angle,
                      "--trail-delay": trail.delay,
                      "--trail-color": TUNNEL_COLORS[(index * 2) % TUNNEL_COLORS.length],
                    } as IntroStyle
                  }
                />
              ))}
            </div>

            <div className="intro-sequence__message">
              <span>LEARN</span>
              <i />
              <span>BUILD</span>
              <i />
              <span>COMPETE</span>
              <i />
              <span>INNOVATE</span>
            </div>

            <div className="intro-sequence__formation">
              {Array.from({ length: 4 }, (_, index) => (
                <span
                  className={`intro-sequence__formation-ribbon intro-sequence__formation-ribbon--${index + 1}`}
                  key={index}
                />
              ))}
            </div>

            <div className="intro-sequence__halo">
              <span className="intro-sequence__halo-orbit" />
              <span className="intro-sequence__halo-light" />
            </div>

            <div className="intro-sequence__brand-lockup">
              <div className="intro-sequence__brand-mark">
                <img
                  src={hackerEarthMark}
                  alt=""
                  draggable="false"
                />
              </div>
              <div className="intro-sequence__brand-copy">
                <h1>HACKEREARTH HUB</h1>
                <p>NMAMIT</p>
              </div>
              <div className="intro-sequence__brand-tagline">
                Learn <i /> Build <i /> Compete <i /> Innovate
              </div>
            </div>
          </div>

          <p className="intro-sequence__skip-hint">
            Click anywhere or press Esc to skip
          </p>
        </div>
      )}
    </>
  );
}
