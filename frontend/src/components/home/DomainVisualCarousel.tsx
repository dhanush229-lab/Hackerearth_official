import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Brain, Code2, GitBranch } from "lucide-react";

export type DomainVisualKind = "web" | "dsa" | "aptitude";
export type DomainVisualAccent = "cyan" | "violet" | "amber";

interface DomainVisualCarouselProps {
  domain: DomainVisualKind;
  accent: DomainVisualAccent;
}

interface VisualState {
  label: string;
  meta: string;
  content: ReactNode;
}

const accentStyles: Record<
  DomainVisualAccent,
  {
    text: string;
    border: string;
    bg: string;
    glow: string;
    fill: string;
    nodeGlow: string;
  }
> = {
  cyan: {
    text: "text-technical-text",
    border: "border-technical/25",
    bg: "bg-technical/10",
    glow: "bg-technical/15",
    fill: "bg-technical",
    nodeGlow: "text-technical",
  },
  violet: {
    text: "text-creative-text",
    border: "border-creative/25",
    bg: "bg-creative/10",
    glow: "bg-creative/15",
    fill: "bg-creative",
    nodeGlow: "text-creative",
  },
  amber: {
    text: "text-highlight-text",
    border: "border-highlight/25",
    bg: "bg-highlight/10",
    glow: "bg-highlight/15",
    fill: "bg-highlight",
    nodeGlow: "text-highlight",
  },
};

const CodePanel = ({ accent }: { accent: DomainVisualAccent }) => {
  const styles = accentStyles[accent];
  const lines = ["const hub = createCommunity();", "hub.build('projects');", "deploy({ team: 'NMAMIT' });", "return innovation;"];

  return (
    <div className="rounded-card border border-line/80 bg-surface/90 p-3 font-mono text-[0.68rem] shadow-soft sm:text-xs">
      <div className="mb-3 flex items-center gap-2 border-b border-line pb-3">
        <span className={`size-2.5 rounded-full ${styles.fill}`} />
        <span className={`size-2.5 rounded-full ${styles.bg}`} />
        <span className="ml-auto text-ink-subtle">app.tsx</span>
      </div>
      <div className="space-y-2">
        {lines.map((line, index) => (
          <div key={line} className="flex gap-3">
            <span className="w-5 select-none text-right text-ink-subtle">{index + 1}</span>
            <span className={index % 2 === 0 ? styles.text : "text-ink-muted"}>{line}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const InterfacePanel = ({ accent }: { accent: DomainVisualAccent }) => {
  const styles = accentStyles[accent];

  return (
    <div className="grid gap-3">
      <div className="rounded-card border border-line/80 bg-surface/90 p-3 shadow-soft">
        <div className="flex items-center justify-between">
          <span className="h-3 w-24 rounded-full bg-surface-muted" />
          <span className={`h-6 w-16 rounded-full ${styles.bg}`} />
        </div>
        <div className="mt-4 grid grid-cols-[0.8fr_1.2fr] gap-3">
          <div className={`min-h-24 rounded-control border ${styles.border} ${styles.bg}`} />
          <div className="space-y-2">
            <span className="block h-3 rounded-full bg-surface-muted" />
            <span className="block h-3 w-5/6 rounded-full bg-surface-muted" />
            <span className={`mt-4 block h-8 w-28 rounded-full ${styles.bg}`} />
          </div>
        </div>
      </div>
    </div>
  );
};

const NetworkGraph = ({ accent }: { accent: DomainVisualAccent }) => {
  const styles = accentStyles[accent];
  const nodes = [
    { x: 32, y: 48 },
    { x: 78, y: 24 },
    { x: 128, y: 54 },
    { x: 174, y: 30 },
    { x: 92, y: 84 },
    { x: 154, y: 92 },
  ];
  const edges = [[0, 1], [1, 2], [2, 3], [2, 4], [4, 5], [3, 5]];

  return (
    <svg className="h-56 w-full" viewBox="0 0 206 118" aria-hidden="true" focusable="false">
      {edges.map(([from, to]) => (
        <line
          key={`${from}-${to}`}
          x1={nodes[from].x}
          y1={nodes[from].y}
          x2={nodes[to].x}
          y2={nodes[to].y}
          stroke="rgb(var(--color-border-strong) / 0.56)"
          strokeWidth="1.4"
        />
      ))}
      {nodes.map((node, index) => (
        <g key={`${node.x}-${node.y}`}>
          <circle cx={node.x} cy={node.y} r={index === 2 ? 12 : 8} className={styles.nodeGlow} fill="currentColor" opacity="0.28" />
          <circle cx={node.x} cy={node.y} r={index === 2 ? 6 : 4.5} fill="rgb(var(--color-surface-raised))" stroke="rgb(var(--color-primary) / 0.55)" />
        </g>
      ))}
    </svg>
  );
};

const TerminalPanel = ({ accent }: { accent: DomainVisualAccent }) => {
  const styles = accentStyles[accent];

  return (
    <div className="rounded-card border border-line/80 bg-surface-raised p-4 font-mono text-xs shadow-soft">
      <p className={styles.text}>$ npm run club:init</p>
      <p className="mt-2 text-ink-muted">✓ Loading members</p>
      <p className="text-ink-muted">✓ Syncing resources</p>
      <p className="text-ink-muted">✓ Publishing weekly challenge</p>
      <p className="mt-3 flex items-center gap-2 text-ink">
        ready
        <span className={`inline-block h-4 w-1.5 ${styles.fill} domain-visual-cursor`} aria-hidden="true" />
      </p>
    </div>
  );
};

const SortingBars = ({ accent }: { accent: DomainVisualAccent }) => {
  const styles = accentStyles[accent];
  const bars = [42, 76, 32, 88, 54, 66, 24, 96];

  return (
    <div className="flex h-56 items-end justify-center gap-2 rounded-card border border-line/80 bg-surface/80 p-5 shadow-soft">
      {bars.map((height, index) => (
        <div
          key={`${height}-${index}`}
          className={`w-full max-w-8 rounded-t-full ${index > 4 ? styles.fill : styles.bg}`}
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  );
};

const DataStructureStack = ({ accent }: { accent: DomainVisualAccent }) => {
  const styles = accentStyles[accent];

  return (
    <div className="grid h-56 place-items-center">
      <div className="w-full max-w-xs space-y-2">
        {["push(42)", "peek()", "pop()", "return top"].map((item, index) => (
          <div
            key={item}
            className={`rounded-control border px-4 py-3 font-mono text-sm shadow-soft ${
              index === 0 ? `${styles.border} ${styles.bg} ${styles.text}` : "border-line bg-surface/90 text-ink-muted"
            }`}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
};

const LogicGrid = ({ accent }: { accent: DomainVisualAccent }) => {
  const styles = accentStyles[accent];

  return (
    <div className="grid h-56 place-items-center">
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 16 }).map((_, index) => (
          <div
            key={index}
            className={`grid size-10 place-items-center rounded-control border font-mono text-xs ${
              [2, 7, 8, 13].includes(index)
                ? `${styles.border} ${styles.bg} ${styles.text}`
                : "border-line bg-surface/75 text-ink-subtle"
            }`}
          >
            {index % 3 === 0 ? "01" : index % 3 === 1 ? "{}" : "∑"}
          </div>
        ))}
      </div>
    </div>
  );
};

const MetricsPanel = ({ accent }: { accent: DomainVisualAccent }) => {
  const styles = accentStyles[accent];

  return (
    <div className="rounded-card border border-line/80 bg-surface/90 p-5 shadow-soft">
      <div className="flex items-end gap-2">
        {[28, 48, 36, 68, 58, 86].map((height, index) => (
          <span
            key={height}
            className={`w-full rounded-t-full ${index === 5 ? styles.fill : styles.bg}`}
            style={{ height: `${height * 1.7}px` }}
          />
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-ink-muted">
        <span>speed</span>
        <span className={styles.text}>+42%</span>
      </div>
    </div>
  );
};

const getVisualStates = (domain: DomainVisualKind, accent: DomainVisualAccent): VisualState[] => {
  if (domain === "web") {
    return [
      { label: "Component Studio", meta: "React UI", content: <CodePanel accent={accent} /> },
      { label: "Responsive App", meta: "Layout", content: <InterfacePanel accent={accent} /> },
      { label: "API Flow", meta: "Client ↔ Server", content: <NetworkGraph accent={accent} /> },
      { label: "Deploy Console", meta: "Build Pipeline", content: <TerminalPanel accent={accent} /> },
    ];
  }

  if (domain === "dsa") {
    return [
      { label: "Sorting Pass", meta: "O(n log n)", content: <SortingBars accent={accent} /> },
      { label: "Graph Traversal", meta: "O(V + E)", content: <NetworkGraph accent={accent} /> },
      { label: "Stack Ops", meta: "LIFO", content: <DataStructureStack accent={accent} /> },
      { label: "Judge Output", meta: "Accepted", content: <TerminalPanel accent={accent} /> },
    ];
  }

  return [
    { label: "Reasoning Grid", meta: "Pattern", content: <LogicGrid accent={accent} /> },
    { label: "Quant Flow", meta: "Speed + Accuracy", content: <MetricsPanel accent={accent} /> },
    { label: "Concept Map", meta: "Logic Links", content: <NetworkGraph accent={accent} /> },
    { label: "Practice Console", meta: "Daily Drill", content: <TerminalPanel accent={accent} /> },
  ];
};

const domainIcons: Record<DomainVisualKind, ReactNode> = {
  web: <Code2 className="size-4" aria-hidden="true" />,
  dsa: <GitBranch className="size-4" aria-hidden="true" />,
  aptitude: <Brain className="size-4" aria-hidden="true" />,
};

export default function DomainVisualCarousel({
  domain,
  accent,
}: DomainVisualCarouselProps) {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const [activeIndex, setActiveIndex] = useState(0);
  const states = useMemo(() => getVisualStates(domain, accent), [accent, domain]);
  const styles = accentStyles[accent];
  const activeState = states[activeIndex] ?? states[0];

  useEffect(() => {
    if (shouldReduceMotion) return;

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % states.length);
    }, 3200);

    return () => window.clearInterval(interval);
  }, [shouldReduceMotion, states.length]);

  return (
    <div className="domain-visual-carousel relative min-h-[19rem] w-full min-w-0 overflow-hidden rounded-card border border-line/70 bg-surface/70 p-3 shadow-soft sm:p-4">
      <div className={`pointer-events-none absolute -right-14 -top-16 size-40 rounded-full opacity-60 ${styles.glow}`} aria-hidden="true" />
      <div className="relative flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`flex size-9 shrink-0 items-center justify-center rounded-control border ${styles.border} ${styles.bg} ${styles.text}`}>
            {domainIcons[domain]}
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-semibold text-ink">{activeState.label}</p>
            <p className={`font-mono text-[0.65rem] font-semibold uppercase tracking-[0.12em] ${styles.text}`}>
              {activeState.meta}
            </p>
          </div>
        </div>
        <div className="hidden items-center gap-1 sm:flex" aria-hidden="true">
          {states.map((state, index) => (
            <span
              key={state.label}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === activeIndex ? `w-6 ${styles.fill}` : "w-1.5 bg-surface-muted"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="relative mt-4 min-h-56">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeState.label}
            initial={shouldReduceMotion ? false : { opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.42, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0"
          >
            {activeState.content}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
