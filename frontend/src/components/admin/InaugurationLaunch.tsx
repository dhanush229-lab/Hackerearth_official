import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import './InaugurationLaunch.css';

type LaunchPhase =
  | 'waiting'
  | 'countdown'
  | 'impact'
  | 'celebration'
  | 'launched'
  | 'dismissed';

type ImpactStage = 'dark' | 'flash';

const CLUB_LOGO = '/branding/hackerearth-club-logo-with-name.svg';
const TEAM_CUTOUT = '/branding/hackerearth-team-cutout.png';
const COUNTDOWN_START = 5;

const confettiColors = ['#c49dd7', '#df84a1', '#f3b092', '#9b5c87', '#fff4e8'];
const codeSymbols = ['{ }', '</>', '/ /', '01', '<>', '[ ]'];

const isTypingTarget = (target: EventTarget | null) =>
  target instanceof Element &&
  Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));

const InaugurationLaunch = () => {
  const [phase, setPhase] = useState<LaunchPhase>('waiting');
  const [count, setCount] = useState(COUNTDOWN_START);
  const [impactStage, setImpactStage] = useState<ImpactStage>('dark');
  const [isVisible, setIsVisible] = useState(true);
  const overlayRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const playedCountdownTonesRef = useRef<Set<number>>(new Set());

  const confetti = useMemo(
    () =>
      Array.from({ length: 68 }, (_, index) => ({
        id: index,
        x: (index * 37 + 7) % 100,
        drift: ((index * 29) % 35) - 17,
        delay: ((index * 13) % 70) / 100,
        duration: 3.3 + ((index * 17) % 24) / 10,
        rotation: (index * 47) % 360,
        width: 5 + (index % 4) * 2,
        height: 9 + (index % 3) * 4,
        color: confettiColors[index % confettiColors.length],
      })),
    [],
  );

  const glowParticles = useMemo(
    () =>
      Array.from({ length: 18 }, (_, index) => ({
        id: index,
        x: (index * 43 + 11) % 96,
        y: (index * 31 + 8) % 88,
        delay: ((index * 19) % 45) / 10,
        duration: 3.8 + (index % 5) * 0.65,
        size: 3 + (index % 4) * 2,
      })),
    [],
  );

  const ensureAudioContext = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new window.AudioContext();
      }

      const context = audioContextRef.current;
      if (context.state === 'suspended') {
        void context.resume().catch(() => undefined);
      }
      return context;
    } catch {
      return null;
    }
  }, []);

  const playCountdownTone = useCallback(
    (value: number) => {
      if (playedCountdownTonesRef.current.has(value)) return;
      playedCountdownTonesRef.current.add(value);

      try {
        const context = ensureAudioContext();
        if (!context) return;

        const now = context.currentTime;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const progress = COUNTDOWN_START - value;
        oscillator.type = value === 1 ? 'triangle' : 'sine';
        oscillator.frequency.setValueAtTime(440 + progress * 70, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.09 + progress * 0.014, now + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + (value === 1 ? 0.24 : 0.16));
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(now);
        oscillator.stop(now + 0.26);
      } catch {
        // Audio is enhancement-only; the visual ceremony continues without it.
      }
    },
    [ensureAudioContext],
  );

  const playImpact = useCallback(() => {
    try {
      const context = ensureAudioContext();
      if (!context) return;

      const now = context.currentTime;
      const duration = 0.72;
      const noiseBuffer = context.createBuffer(1, context.sampleRate * duration, context.sampleRate);
      const noise = noiseBuffer.getChannelData(0);
      for (let index = 0; index < noise.length; index += 1) {
        const envelope = Math.sin((index / noise.length) * Math.PI);
        noise[index] = (Math.random() * 2 - 1) * envelope;
      }

      const source = context.createBufferSource();
      const filter = context.createBiquadFilter();
      const noiseGain = context.createGain();
      source.buffer = noiseBuffer;
      filter.type = 'bandpass';
      filter.Q.value = 0.85;
      filter.frequency.setValueAtTime(260, now);
      filter.frequency.exponentialRampToValueAtTime(4200, now + 0.45);
      noiseGain.gain.setValueAtTime(0.0001, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.16, now + 0.18);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      source.connect(filter).connect(noiseGain).connect(context.destination);

      const impact = context.createOscillator();
      const impactGain = context.createGain();
      impact.type = 'sine';
      impact.frequency.setValueAtTime(150, now + 0.38);
      impact.frequency.exponentialRampToValueAtTime(52, now + 0.72);
      impactGain.gain.setValueAtTime(0.0001, now);
      impactGain.gain.exponentialRampToValueAtTime(0.2, now + 0.4);
      impactGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);
      impact.connect(impactGain).connect(context.destination);

      source.start(now);
      impact.start(now + 0.36);
      impact.stop(now + 0.78);
    } catch {
      // Audio is enhancement-only; the visual ceremony continues without it.
    }
  }, [ensureAudioContext]);

  const playCelebrationChime = useCallback(() => {
    try {
      const context = ensureAudioContext();
      if (!context) return;
      const now = context.currentTime;

      [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
        const start = now + index * 0.105;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = index === 3 ? 'sine' : 'triangle';
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.075, start + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.15);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + 1.2);
      });
    } catch {
      // Audio is enhancement-only; the visual ceremony continues without it.
    }
  }, [ensureAudioContext]);

  const beginLaunch = useCallback(() => {
    if (phase !== 'waiting') return;
    playedCountdownTonesRef.current.clear();
    setCount(COUNTDOWN_START);
    setPhase('countdown');
    playCountdownTone(COUNTDOWN_START);
  }, [phase, playCountdownTone]);

  const dismissLaunch = useCallback(() => {
    if (phase !== 'launched') return;
    setPhase('dismissed');
  }, [phase]);

  useEffect(() => {
    if (!isVisible) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.scrollTo({ top: 0, behavior: 'auto' });

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isVisible]);

  useEffect(() => {
    if (phase !== 'countdown') return undefined;

    const timer = window.setTimeout(() => {
      if (count > 1) {
        const nextCount = count - 1;
        setCount(nextCount);
        playCountdownTone(nextCount);
      } else {
        setImpactStage('dark');
        setPhase('impact');
      }
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [count, phase, playCountdownTone]);

  useEffect(() => {
    if (phase !== 'impact') return undefined;

    const flashTimer = window.setTimeout(() => {
      setImpactStage('flash');
      playImpact();
    }, 300);
    const celebrationTimer = window.setTimeout(() => {
      setPhase('celebration');
      playCelebrationChime();
    }, 900);

    return () => {
      window.clearTimeout(flashTimer);
      window.clearTimeout(celebrationTimer);
    };
  }, [phase, playCelebrationChime, playImpact]);

  useEffect(() => {
    if (phase !== 'celebration') return undefined;
    const timer = window.setTimeout(() => setPhase('launched'), 3800);
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'dismissed') return undefined;

    const context = audioContextRef.current;
    audioContextRef.current = null;
    if (context) void context.close().catch(() => undefined);

    const timer = window.setTimeout(() => setIsVisible(false), 1000);
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(
    () => () => {
      const context = audioContextRef.current;
      audioContextRef.current = null;
      if (context) void context.close().catch(() => undefined);
    },
    [],
  );

  useEffect(() => {
    if (!isVisible) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;

      if (event.key === 'Tab') {
        const focusable = overlayRef.current?.querySelectorAll<HTMLButtonElement>(
          'button:not([disabled])',
        );
        if (!focusable?.length) {
          event.preventDefault();
          overlayRef.current?.focus();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (focusable.length === 1) {
          event.preventDefault();
          first.focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
        return;
      }

      if (event.code !== 'Space' && event.key !== ' ') return;
      event.preventDefault();
      if (event.repeat) return;

      if (phase === 'waiting') beginLaunch();
      if (phase === 'launched') dismissLaunch();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [beginLaunch, dismissLaunch, isVisible, phase]);

  if (!isVisible) return null;

  const showFinal = phase === 'celebration' || phase === 'launched' || phase === 'dismissed';

  return (
    <div
      ref={overlayRef}
      className={`inauguration-launch inauguration-launch--${phase}`}
      data-inauguration-overlay
      role="dialog"
      aria-modal="true"
      aria-labelledby="inauguration-title"
      tabIndex={-1}
    >
      <div className="inauguration-launch__fallback" aria-hidden="true" />

      <div
        className={`inauguration-launch__scrim${showFinal ? ' inauguration-launch__scrim--cinematic' : ''}`}
        aria-hidden="true"
      />
      <div className="inauguration-launch__aurora" aria-hidden="true" />
      <div className="inauguration-launch__grid" aria-hidden="true" />

      {showFinal && (
        <div className="inauguration-launch__atmosphere" aria-hidden="true">
          <div className="inauguration-launch__waves">
            <span />
            <span />
            <span />
          </div>
          <div className="inauguration-launch__rings">
            <span />
            <span />
            <span />
          </div>
          <div className="inauguration-launch__streaks">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>
      )}

      {phase === 'waiting' && (
        <section className="inauguration-launch__waiting">
          <div className="inauguration-launch__logo-shell">
            <span className="inauguration-launch__logo-ring" aria-hidden="true" />
            <img src={CLUB_LOGO} alt="HackerEarth Hub NMAMIT" />
          </div>
          <p className="inauguration-launch__kicker">HackerEarth Hub — NMAMIT</p>
          <h1 id="inauguration-title">Ready to launch?</h1>
          <p className="inauguration-launch__space-instruction">
            Press <kbd>SPACE</kbd> to begin
          </p>
          <button type="button" className="inauguration-launch__button" onClick={beginLaunch} autoFocus>
            Begin launch
            <span aria-hidden="true">→</span>
          </button>
        </section>
      )}

      {phase === 'countdown' && (
        <section className="inauguration-launch__countdown" aria-live="polite" aria-atomic="true">
          <p>Launch sequence</p>
          <div key={count} className="inauguration-launch__countdown-visual">
            <div className="inauguration-launch__countdown-rings" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div className="inauguration-launch__countdown-number">{count}</div>
          </div>
        </section>
      )}

      {phase === 'impact' && (
        <section className={`inauguration-launch__impact inauguration-launch__impact--${impactStage}`}>
          {impactStage === 'flash' && (
            <div className="inauguration-launch__impact-mark">
              <span aria-hidden="true" />
              <img src={CLUB_LOGO} alt="HackerEarth Hub NMAMIT" />
            </div>
          )}
        </section>
      )}

      {showFinal && (
        <>
          <div className="inauguration-launch__team-scene">
            <span className="inauguration-launch__team-glow" aria-hidden="true" />
            <img
              className="inauguration-launch__team-cutout"
              src={TEAM_CUTOUT}
              alt="HackerEarth Hub NMAMIT team"
            />
          </div>

          <div className="inauguration-launch__particles" aria-hidden="true">
            {confetti.map((piece) => (
              <span
                key={piece.id}
                className="inauguration-launch__confetti"
                style={
                  {
                    '--particle-x': `${piece.x}%`,
                    '--particle-drift': `${piece.drift}vw`,
                    '--particle-delay': `${piece.delay}s`,
                    '--particle-duration': `${piece.duration}s`,
                    '--particle-rotation': `${piece.rotation}deg`,
                    '--particle-width': `${piece.width}px`,
                    '--particle-height': `${piece.height}px`,
                    '--particle-color': piece.color,
                  } as CSSProperties
                }
              />
            ))}
            {glowParticles.map((particle) => (
              <span
                key={particle.id}
                className="inauguration-launch__glow-particle"
                style={
                  {
                    '--particle-x': `${particle.x}%`,
                    '--particle-y': `${particle.y}%`,
                    '--particle-delay': `${particle.delay}s`,
                    '--particle-duration': `${particle.duration}s`,
                    '--particle-size': `${particle.size}px`,
                  } as CSSProperties
                }
              />
            ))}
            {codeSymbols.concat(codeSymbols).map((symbol, index) => (
              <span
                key={`${symbol}-${index}`}
                className="inauguration-launch__code-particle"
                style={
                  {
                    '--particle-x': `${5 + ((index * 41) % 90)}%`,
                    '--particle-y': `${12 + ((index * 23) % 74)}%`,
                    '--particle-delay': `${0.4 + (index % 6) * 0.28}s`,
                  } as CSSProperties
                }
              >
                {symbol}
              </span>
            ))}
          </div>

          <section className="inauguration-launch__final" aria-live="polite">
            <span className="inauguration-launch__live-burst" aria-hidden="true" />
            <img className="inauguration-launch__final-logo" src={CLUB_LOGO} alt="HackerEarth Hub NMAMIT" />
            <p className="inauguration-launch__final-kicker">HackerEarth Hub — NMAMIT</p>
            <div className="inauguration-launch__headline">
              <span>Is now</span>
              <strong id="inauguration-title">Live</strong>
            </div>
            <span className="inauguration-launch__star" aria-hidden="true">✦</span>
            <p className="inauguration-launch__tagline">Learn <i>•</i> Build <i>•</i> Compete <i>•</i> Innovate</p>
          </section>

          {phase === 'launched' && (
            <div className="inauguration-launch__continue">
              <p>Press <kbd>SPACE</kbd> to continue</p>
              <button type="button" className="inauguration-launch__button inauguration-launch__button--quiet" onClick={dismissLaunch}>
                Continue
                <span aria-hidden="true">→</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default InaugurationLaunch;
