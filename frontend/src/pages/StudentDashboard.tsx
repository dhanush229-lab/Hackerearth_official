import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  GraduationCap,
  Loader2,
  MapPin,
  Medal,
  Shapes,
  Trophy,
  Users,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageTransition from "../components/ui/PageTransition";
import SectionReveal from "../components/ui/SectionReveal";
import ResourceCard from "../components/ResourceCard";
import { useToast } from "../components/ToastProvider";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { blogPosts } from "../lib/resourcesData";
import {
  getStudentEvents,
  type EventSummary,
} from "../lib/eventApi";
import {
  getStudentWeeklyContests,
  openStudentWeeklyContest,
  type StudentWeeklyContest,
} from "../lib/studentApi";
import {
  getStudentRank,
  getStudentWeeklyRank,
  getWeeklyContestWeeks,
  type StudentRank,
  type StudentWeeklyRank,
} from "../lib/leaderboardApi";
import {
  getEnrolledResourceCategories,
  studentResourceSearch,
  studentResourceState,
} from "../lib/studentResources";

type WeeklySelection = "all" | number;

const domainCardStyles = [
  {
    card: "border-technical/25 hover:border-technical/50",
    icon: "border-technical/25 bg-technical/10 text-technical-text",
    glow: "bg-technical/20",
  },
  {
    card: "border-creative/25 hover:border-creative/50",
    icon: "border-creative/25 bg-creative/10 text-creative-text",
    glow: "bg-creative/20",
  },
  {
    card: "border-dream/25 hover:border-dream/50",
    icon: "border-dream/25 bg-dream/10 text-dream-text",
    glow: "bg-dream/20",
  },
] as const;

const formatDashboardDateTime = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

const getDashboardEventStatusLabel = (status: EventSummary["status"]) =>
  status === "ongoing" ? "ONGOING" : "UPCOMING";

const DashboardEventPreview = ({ event }: { event: EventSummary }) => (
  <article className="rounded-card border border-line/80 bg-surface/75 p-3 shadow-soft">
    <div className="grid gap-3 sm:grid-cols-[5rem_minmax(0,1fr)]">
      <div className="aspect-[16/10] overflow-hidden rounded-control border border-line bg-surface-muted sm:aspect-square">
        {event.posterUrl ? (
          <img
            src={event.posterUrl}
            alt={`${event.title} poster`}
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
            onError={(imageEvent) => {
              imageEvent.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="flex size-full items-center justify-center text-xs font-semibold text-ink-muted">
            Event
          </div>
        )}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h4 className="break-words font-display text-base font-semibold text-ink">
            {event.title}
          </h4>
          <span className="inline-flex min-h-7 shrink-0 items-center rounded-full border border-dream/30 bg-dream/10 px-2.5 font-mono text-[0.65rem] font-bold text-dream-text">
            {getDashboardEventStatusLabel(event.status)}
          </span>
        </div>
        <dl className="mt-3 grid gap-2 text-xs text-ink-muted">
          <div className="flex gap-2">
            <Clock className="mt-0.5 size-3.5 shrink-0 text-primary-text" aria-hidden="true" />
            <div>
              <dt className="sr-only">Start time</dt>
              <dd>{formatDashboardDateTime(event.eventDateTime)}</dd>
            </div>
          </div>
          <div className="flex gap-2">
            <MapPin className="mt-0.5 size-3.5 shrink-0 text-technical-text" aria-hidden="true" />
            <div>
              <dt className="sr-only">Venue</dt>
              <dd>{event.venue}</dd>
            </div>
          </div>
          <div className="flex gap-2">
            <Users className="mt-0.5 size-3.5 shrink-0 text-rose-text" aria-hidden="true" />
            <div>
              <dt className="sr-only">Registrations</dt>
              <dd>{event.registrationCount} / {event.maxRegistrations} Registered</dd>
            </div>
          </div>
        </dl>
      </div>
    </div>
  </article>
);

const formatContestTime = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

const getTaskButtonLabel = (contest: StudentWeeklyContest) => {
  if (contest.status === "upcoming") {
    return `Starts ${new Intl.DateTimeFormat("en-IN", {
      timeStyle: "short",
    }).format(new Date(contest.startDateTime))}`;
  }

  if (contest.status === "ended") return "Contest Ended";
  return contest.claimed ? "Open Contest" : "Start Contest";
};

const WeeklyContestTaskCard = ({
  contest,
  pending,
  onOpen,
}: {
  contest: StudentWeeklyContest;
  pending: boolean;
  onOpen: (contest: StudentWeeklyContest) => void;
}) => {
  const isActionable = contest.status === "live";

  return (
    <article className="rounded-card border border-line/80 bg-surface/75 p-4 shadow-soft">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <span className="inline-flex min-h-7 items-center rounded-full border border-technical/30 bg-technical/10 px-2.5 font-mono text-[0.65rem] font-bold text-technical-text">
            Week {contest.weekNumber}
          </span>
          <h4 className="mt-3 break-words font-display text-base font-semibold text-ink">
            {contest.title}
          </h4>
          {contest.description && (
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink-muted">
              {contest.description}
            </p>
          )}
        </div>
        <span className="inline-flex min-h-7 w-fit items-center rounded-full border border-dream/30 bg-dream/10 px-2.5 font-mono text-[0.65rem] font-bold uppercase text-dream-text">
          {contest.status}
        </span>
      </div>

      <dl className="mt-4 grid gap-2 text-xs text-ink-muted">
        <div>
          <dt className="font-semibold text-ink">Starts</dt>
          <dd>{formatContestTime(contest.startDateTime)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-ink">Ends</dt>
          <dd>{formatContestTime(contest.endDateTime)}</dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={() => onOpen(contest)}
        disabled={!isActionable || pending}
        className="btn btn-secondary mt-4 w-full justify-center disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit"
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        ) : isActionable ? (
          <ExternalLink className="size-4" aria-hidden="true" />
        ) : (
          <Clock className="size-4" aria-hidden="true" />
        )}
        {pending ? "Opening..." : getTaskButtonLabel(contest)}
      </button>
    </article>
  );
};

const StudentDashboard = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const { showToast } = useToast();
  const [studentRank, setStudentRank] = useState<StudentRank | null>(null);
  const [studentRankError, setStudentRankError] = useState("");
  const [availableWeeks, setAvailableWeeks] = useState<number[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<WeeklySelection>("all");
  const [weeklyRank, setWeeklyRank] = useState<StudentWeeklyRank | null>(null);
  const [weeklyRankError, setWeeklyRankError] = useState("");
  const [isLoadingWeeks, setIsLoadingWeeks] = useState(true);
  const [isLoadingWeeklyRank, setIsLoadingWeeklyRank] = useState(false);
  const [dashboardEvents, setDashboardEvents] = useState<EventSummary[]>([]);
  const [dashboardEventsError, setDashboardEventsError] = useState("");
  const [isLoadingDashboardEvents, setIsLoadingDashboardEvents] = useState(true);
  const [weeklyContestTasks, setWeeklyContestTasks] = useState<StudentWeeklyContest[]>([]);
  const [weeklyContestTasksError, setWeeklyContestTasksError] = useState("");
  const [isLoadingWeeklyContestTasks, setIsLoadingWeeklyContestTasks] = useState(true);
  const [pendingContestId, setPendingContestId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    const loadStudentRank = async () => {
      try {
        setStudentRankError("");
        const data = await getStudentRank();

        if (isMounted) {
          setStudentRank(data.rank);
        }
      } catch {
        if (isMounted) {
          setStudentRank(null);
          setStudentRankError("Your standing could not be loaded right now.");
        }
      }
    };

    void loadStudentRank();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;

    const controller = new AbortController();
    setIsLoadingWeeklyContestTasks(true);
    setWeeklyContestTasksError("");

    void getStudentWeeklyContests(controller.signal)
      .then((response) => {
        setWeeklyContestTasks(response.contests);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setWeeklyContestTasks([]);
        setWeeklyContestTasksError("Weekly contests could not be loaded right now.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingWeeklyContestTasks(false);
        }
      });

    return () => controller.abort();
  }, [user?.id]);

  const handleOpenWeeklyContest = async (contest: StudentWeeklyContest) => {
    if (pendingContestId || contest.status !== "live") return;

    const externalTab = window.open("about:blank", "_blank");
    if (!externalTab) {
      showToast({
        variant: "error",
        message: "Popup was blocked. Please allow popups and try again.",
      });
      return;
    }
    externalTab.opener = null;
    setPendingContestId(contest.id);

    try {
      const response = await openStudentWeeklyContest(contest.id);
      setWeeklyContestTasks((current) =>
        current.map((item) =>
          item.id === contest.id ? { ...item, claimed: true } : item
        )
      );
      if (response.awarded) {
        showToast({
          variant: "success",
          message: `+${response.pointsAwarded} weekly contest points recorded.`,
        });
      }

      externalTab.location.href = response.contestUrl;
    } catch (error) {
      externalTab.close();
      const message =
        error instanceof Error
          ? error.message
          : "Unable to open this contest right now.";
      showToast({ variant: "error", message });
    } finally {
      setPendingContestId(null);
    }
  };

  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    const loadWeeklyContestWeeks = async () => {
      try {
        setIsLoadingWeeks(true);
        const data = await getWeeklyContestWeeks();

        if (isMounted) {
          const weeks = data.weeks;
          setAvailableWeeks(weeks);
          setSelectedWeek((currentWeek) =>
            currentWeek === "all" ||
              (typeof currentWeek === "number" && weeks.includes(currentWeek))
              ? currentWeek
              : "all"
          );
          setWeeklyRankError("");
        }
      } catch {
        if (isMounted) {
          setAvailableWeeks([]);
          setSelectedWeek("all");
          setWeeklyRank(null);
          setWeeklyRankError("Weekly rankings could not be loaded right now.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingWeeks(false);
        }
      }
    };

    void loadWeeklyContestWeeks();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user) {
      setWeeklyRank(null);
      return;
    }

    let isMounted = true;

    const loadWeeklyRank = async () => {
      try {
        setIsLoadingWeeklyRank(true);
        setWeeklyRankError("");
        const data = await getStudentWeeklyRank({
          scope: selectedWeek === "all" ? "all" : "week",
          week: selectedWeek === "all" ? undefined : selectedWeek,
        });

        if (isMounted) {
          setWeeklyRank(data.rank);
        }
      } catch {
        if (isMounted) {
          setWeeklyRank(null);
          setWeeklyRankError("Your weekly standing could not be loaded right now.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingWeeklyRank(false);
        }
      }
    };

    void loadWeeklyRank();

    return () => {
      isMounted = false;
    };
  }, [selectedWeek, user?.id]);

  useEffect(() => {
    if (!user) return;

    const controller = new AbortController();
    setIsLoadingDashboardEvents(true);
    setDashboardEventsError("");

    void getStudentEvents(controller.signal)
      .then((response) => {
        const currentEvents = response.upcoming
          .filter((event) => event.status !== "past")
          .sort(
            (first, second) =>
              new Date(first.eventDateTime).getTime() -
              new Date(second.eventDateTime).getTime()
          )
          .slice(0, 3);

        setDashboardEvents(currentEvents);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setDashboardEvents([]);
        setDashboardEventsError("Upcoming events could not be loaded right now.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingDashboardEvents(false);
        }
      });

    return () => controller.abort();
  }, [user?.id]);

  if (!user) return null;

  const enrolledCategories = getEnrolledResourceCategories(user);
  const recommendedResources = blogPosts
    .filter((resource) => enrolledCategories.has(resource.category))
    .slice(0, 3);

  return (
    <PageTransition>
      <main
        className="relative isolate min-h-screen overflow-x-hidden bg-transparent text-ink"
        data-color-scheme={isDark ? "dark" : "light"}
      >
        <div className="site-container-wide pb-section pt-24 sm:pt-28 lg:pt-32">
          <div className="min-w-0 space-y-10 lg:space-y-12">
            <SectionReveal variant="fade">
              <header
                id="student-dashboard-top"
                className="ui-panel-glass scroll-mt-28 overflow-hidden"
                aria-labelledby="dashboard-heading"
              >
                <div className="relative overflow-hidden p-5 sm:p-7 lg:p-8">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-dream/10"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-24 left-10 size-52 rounded-full bg-technical/5"
                  />

                  <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,0.72fr)] lg:items-center">
                    <div className="min-w-0">
                      <span className="inline-flex items-center gap-2 rounded-full border border-dream/30 bg-dream/10 px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-dream-text">
                        <GraduationCap className="size-4" aria-hidden="true" />
                        Student dashboard
                      </span>
                      <p className="mt-5 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-rose-text">
                        Welcome back,
                      </p>
                      <h1
                        id="dashboard-heading"
                        className="mt-2 break-words font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl lg:text-5xl"
                      >
                        {user.name}
                      </h1>
                      <p className="mt-4 max-w-2xl text-sm leading-6 text-ink-muted sm:text-base">
                        Your learning hub for club events, tasks, resources, and domains.
                      </p>
                    </div>

                    <aside
                      className="rounded-card border border-line/80 bg-surface/90 p-5 shadow-soft sm:p-6"
                      aria-label="Student profile summary"
                    >
                      <div className="flex items-center gap-3 border-b border-line/80 pb-4">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-control border border-primary/25 bg-primary/10 text-primary-text">
                          <UserRound className="size-5" aria-hidden="true" />
                        </span>
                        <div>
                          <p className="font-display text-lg font-semibold text-ink">Profile summary</p>
                          <p className="text-xs text-ink-subtle">Student details</p>
                        </div>
                      </div>

                      <dl className="mt-4 space-y-4">
                        <div>
                          <dt className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
                            Name
                          </dt>
                          <dd className="mt-1 break-words text-sm font-semibold text-ink">{user.name}</dd>
                        </div>
                        <div>
                          <dt className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
                            USN
                          </dt>
                          <dd className="mt-1 break-words text-sm font-semibold text-ink">{user.usn}</dd>
                        </div>
                        <div>
                          <dt className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
                            Enrolled domains
                          </dt>
                          <dd className="mt-2 flex flex-wrap gap-2">
                            {user.enrolledDomains.map((domain) => (
                              <span
                                key={domain}
                                className="rounded-full border border-dream/30 bg-dream/10 px-3 py-1.5 text-xs font-semibold text-dream-text"
                              >
                                {domain}
                              </span>
                            ))}
                          </dd>
                        </div>
                      </dl>

                    </aside>
                  </div>
                </div>
              </header>
            </SectionReveal>

            <SectionReveal delay={0.05}>
              <section
                id="student-standing"
                aria-labelledby="student-standing-heading"
                className="ui-panel-glass scroll-mt-28 p-5 sm:p-6 lg:p-8"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-primary-text">
                      Your standing
                    </p>
                    <h2
                      id="student-standing-heading"
                      className="mt-1 font-display text-2xl font-semibold text-ink sm:text-3xl"
                    >
                      Overall & Weekly Rankings
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
                      Track your overall club points and weekly contest performance from one place.
                    </p>
                  </div>
                  <Link
                    to="/leaderboard"
                    className="btn btn-secondary w-full justify-center sm:w-fit"
                  >
                    View Full Leaderboard
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </div>

                <div className="mt-6 grid gap-5 lg:grid-cols-2">
                  <article className="ui-card-glass relative min-h-72 overflow-hidden border-primary/25 p-5 sm:p-6">
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-16 -top-20 size-44 rounded-full bg-primary/15"
                    />
                    <div className="relative flex items-start justify-between gap-4">
                      <div>
                        <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-primary-text">
                          Overall Ranking
                        </p>
                        <h3 className="mt-2 font-display text-xl font-semibold text-ink">
                          Club leaderboard
                        </h3>
                      </div>
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-control border border-primary/25 bg-primary/10 text-primary-text">
                        <Trophy className="size-6" aria-hidden="true" />
                      </span>
                    </div>

                    {studentRank ? (
                      <div className="relative mt-8 grid gap-5 sm:grid-cols-2">
                        <div>
                          <p className="text-sm font-medium text-ink-muted">Overall Rank</p>
                          <p className="mt-2 font-display text-5xl font-bold tabular-nums text-primary-text">
                            #{studentRank.overallRank}
                          </p>
                          <p className="mt-3 text-sm text-ink-subtle">
                            Out of {studentRank.totalActiveStudents} students
                          </p>
                        </div>
                        <div className="rounded-card border border-line/80 bg-surface/80 p-4">
                          <p className="text-sm font-medium text-ink-muted">Overall Total Points</p>
                          <p className="mt-2 font-display text-4xl font-bold tabular-nums text-ink">
                            {studentRank.totalPoints}
                          </p>
                          <p className="mt-2 text-sm text-ink-subtle">Cumulative club score</p>
                        </div>
                      </div>
                    ) : (
                      <div className="relative mt-8 rounded-card border border-line/80 bg-surface/75 p-5 text-sm text-ink-muted">
                        {studentRankError || "Loading your overall standing..."}
                      </div>
                    )}
                  </article>

                  <article className="ui-card-glass relative min-h-72 overflow-hidden border-dream/25 p-5 sm:p-6">
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -left-20 -top-20 size-44 rounded-full bg-dream/15"
                    />
                    <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-dream-text">
                          Weekly Ranking
                        </p>
                        <h3 className="mt-2 font-display text-xl font-semibold text-ink">
                          Contest performance
                        </h3>
                      </div>
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-control border border-dream/25 bg-dream/10 text-dream-text">
                        <Medal className="size-6" aria-hidden="true" />
                      </span>
                    </div>

                    {isLoadingWeeks ? (
                      <div
                        className="relative mt-6 h-11 w-40 animate-pulse rounded-full bg-surface-muted motion-reduce:animate-none"
                        aria-hidden="true"
                      />
                    ) : availableWeeks.length > 0 ? (
                      <div className="relative mt-6 flex flex-wrap gap-2" aria-label="Select weekly contest week">
                        <button
                          type="button"
                          onClick={() => setSelectedWeek("all")}
                          className={`rounded-full border px-4 py-2 text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dream focus-visible:ring-offset-2 focus-visible:ring-offset-base motion-reduce:transition-none ${selectedWeek === "all"
                              ? "border-dream/50 bg-dream/15 text-dream-text shadow-glow"
                              : "border-line bg-surface/80 text-ink-muted hover:border-dream/35 hover:text-ink"
                            }`}
                          aria-pressed={selectedWeek === "all"}
                        >
                          All Weekly Contests
                        </button>
                        {availableWeeks.map((week) => {
                          const isSelected = selectedWeek === week;

                          return (
                            <button
                              key={week}
                              type="button"
                              onClick={() => setSelectedWeek(week)}
                              className={`rounded-full border px-4 py-2 text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dream focus-visible:ring-offset-2 focus-visible:ring-offset-base motion-reduce:transition-none ${isSelected
                                  ? "border-dream/50 bg-dream/15 text-dream-text shadow-glow"
                                  : "border-line bg-surface/80 text-ink-muted hover:border-dream/35 hover:text-ink"
                                }`}
                              aria-pressed={isSelected}
                            >
                              Week {week}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="relative mt-6 rounded-card border border-line/80 bg-surface/75 p-5 text-sm text-ink-muted">
                        No weekly contest rankings available yet.
                      </div>
                    )}

                    {availableWeeks.length > 0 && (
                      <div className="relative mt-7">
                        {isLoadingWeeklyRank ? (
                          <div className="grid gap-4 sm:grid-cols-2" aria-hidden="true">
                            <div className="h-28 animate-pulse rounded-card bg-surface-muted motion-reduce:animate-none" />
                            <div className="h-28 animate-pulse rounded-card bg-surface-muted motion-reduce:animate-none" />
                          </div>
                        ) : weeklyRankError ? (
                          <div className="rounded-card border border-rose/25 bg-rose/10 p-5 text-sm text-ink-muted">
                            {weeklyRankError}
                          </div>
                        ) : weeklyRank ? (
                          <div className="grid gap-5 sm:grid-cols-2">
                            <div>
                              <p className="text-sm font-medium text-ink-muted">Weekly Rank</p>
                              <p className="mt-2 font-display text-5xl font-bold tabular-nums text-dream-text">
                                {weeklyRank.weeklyRank ? `#${weeklyRank.weeklyRank}` : "Not ranked"}
                              </p>
                              <p className="mt-3 text-sm text-ink-subtle">
                                {weeklyRank.totalRankedStudents > 0
                                  ? `Out of ${weeklyRank.totalRankedStudents} ranked students`
                                  : "No ranked students for this week yet"}
                              </p>
                            </div>
                            <div className="rounded-card border border-line/80 bg-surface/80 p-4">
                              <p className="text-sm font-medium text-ink-muted">Weekly Points</p>
                              <p className="mt-2 font-display text-4xl font-bold tabular-nums text-ink">
                                {weeklyRank.weeklyPoints}
                              </p>
                              <p className="mt-2 text-sm text-ink-subtle">
                                {weeklyRank.scope === "all"
                                  ? "All weekly contest score"
                                  : `Week ${weeklyRank.week} contest score`}
                              </p>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </article>
                </div>
              </section>
            </SectionReveal>

            <SectionReveal delay={0.04}>
              <section
                id="student-events-tasks"
                aria-labelledby="activities-heading"
                className="scroll-mt-28"
              >
                <div className="mb-5">
                  <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-rose-text">
                    Stay on track
                  </p>
                  <h2 id="activities-heading" className="mt-1 font-display text-2xl font-semibold text-ink sm:text-3xl">
                    Events &amp; tasks
                  </h2>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <article className="ui-card-glass flex min-h-64 flex-col border-primary/25 p-5 sm:p-6">
                    <div className="flex size-11 items-center justify-center rounded-control border border-primary/25 bg-primary/10 text-primary-text">
                      <CalendarDays className="size-5" aria-hidden="true" />
                    </div>
                    <h3 className="mt-5 font-display text-xl font-semibold text-ink">Upcoming events</h3>
                    <div className="mt-4 flex-1 space-y-3">
                      {isLoadingDashboardEvents ? (
                        <div className="space-y-3" aria-hidden="true">
                          {[0, 1].map((item) => (
                            <div
                              key={item}
                              className="h-24 animate-pulse rounded-card bg-surface-muted motion-reduce:animate-none"
                            />
                          ))}
                        </div>
                      ) : dashboardEventsError ? (
                        <p className="rounded-card border border-line/80 bg-surface/75 p-4 text-sm leading-6 text-ink-muted">
                          {dashboardEventsError}
                        </p>
                      ) : dashboardEvents.length > 0 ? (
                        dashboardEvents.map((event) => (
                          <DashboardEventPreview key={event.id} event={event} />
                        ))
                      ) : (
                        <p className="rounded-card border border-line/80 bg-surface/75 p-4 text-sm leading-6 text-ink-muted">
                          No upcoming events right now.
                        </p>
                      )}
                    </div>
                    <Link to="/events" className="btn btn-secondary mt-5 w-full justify-center sm:w-fit">
                      View Event
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  </article>

                  <article className="ui-card-glass flex min-h-64 flex-col border-technical/25 p-5 sm:p-6">
                    <div className="flex size-11 items-center justify-center rounded-control border border-technical/25 bg-technical/10 text-technical-text">
                      <CheckCircle2 className="size-5" aria-hidden="true" />
                    </div>
                    <h3 className="mt-5 font-display text-xl font-semibold text-ink">My tasks</h3>
                    <div className="mt-4 flex-1 space-y-3">
                      {isLoadingWeeklyContestTasks ? (
                        <div className="space-y-3" aria-hidden="true">
                          {[0, 1].map((item) => (
                            <div
                              key={item}
                              className="h-32 animate-pulse rounded-card bg-surface-muted motion-reduce:animate-none"
                            />
                          ))}
                        </div>
                      ) : weeklyContestTasksError ? (
                        <p className="rounded-card border border-line/80 bg-surface/75 p-4 text-sm leading-6 text-ink-muted">
                          {weeklyContestTasksError}
                        </p>
                      ) : weeklyContestTasks.length > 0 ? (
                        weeklyContestTasks.map((contest) => (
                          <WeeklyContestTaskCard
                            key={contest.id}
                            contest={contest}
                            pending={pendingContestId === contest.id}
                            onOpen={handleOpenWeeklyContest}
                          />
                        ))
                      ) : (
                        <p className="rounded-card border border-line/80 bg-surface/75 p-4 text-sm leading-6 text-ink-muted">
                          No weekly contests assigned yet.
                        </p>
                      )}
                    </div>
                  </article>
                </div>
              </section>
            </SectionReveal>

            <SectionReveal delay={0.06}>
              <section
                id="student-resources"
                aria-labelledby="resources-heading"
                className="ui-panel-glass scroll-mt-28 p-5 sm:p-6 lg:p-8"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-creative-text">
                      Continue learning
                    </p>
                    <h2 id="resources-heading" className="mt-1 font-display text-2xl font-semibold text-ink sm:text-3xl">
                      Resources
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
                      A selection from the learning library for your enrolled domains.
                    </p>
                  </div>
                  <Link
                    to={`/domains${studentResourceSearch}`}
                    state={studentResourceState}
                    className="btn btn-secondary w-full shrink-0 sm:w-fit"
                  >
                    Browse all resources
                    <ExternalLink className="size-4" aria-hidden="true" />
                  </Link>
                </div>

                {recommendedResources.length > 0 ? (
                  <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {recommendedResources.map((resource, index) => (
                      <ResourceCard
                        key={resource.id}
                        post={resource}
                        isDark={isDark}
                        index={index}
                        headingLevel="h3"
                        detailSearch={studentResourceSearch}
                        detailState={studentResourceState}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="mt-6 flex items-start gap-3 rounded-card border border-line/80 bg-surface/75 p-5 text-sm text-ink-muted">
                    <BookOpen className="mt-0.5 size-5 shrink-0 text-creative-text" aria-hidden="true" />
                    <p>Explore the learning library to find resources across club domains.</p>
                  </div>
                )}
              </section>
            </SectionReveal>

            <SectionReveal delay={0.08}>
              <section id="student-domains" aria-labelledby="domains-heading" className="scroll-mt-28">
                <div className="mb-5">
                  <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-dream-text">
                    Your learning tracks
                  </p>
                  <h2 id="domains-heading" className="mt-1 font-display text-2xl font-semibold text-ink sm:text-3xl">
                    My domains
                  </h2>
                </div>

                {user.enrolledDomains.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {user.enrolledDomains.map((domain, index) => {
                      const accent = domainCardStyles[index % domainCardStyles.length];

                      return (
                        <Link
                          key={domain}
                          to={`/domains${studentResourceSearch}`}
                          state={studentResourceState}
                          className={`ui-card-glass group relative flex min-h-32 items-center gap-4 overflow-hidden p-5 transition duration-300 ease-out-expo hover:-translate-y-1 hover:shadow-glow motion-reduce:transform-none motion-reduce:transition-none ${accent.card}`}
                        >
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none absolute -right-10 -top-12 size-28 rounded-full opacity-30 ${accent.glow}`}
                          />
                          <span className={`relative flex size-11 shrink-0 items-center justify-center rounded-control border ${accent.icon}`}>
                            <Shapes className="size-5" aria-hidden="true" />
                          </span>
                          <span className="relative min-w-0 flex-1">
                            <span className="block break-words font-display text-lg font-semibold text-ink">{domain}</span>
                            <span className="mt-1 block text-sm text-ink-muted">View learning resources</span>
                          </span>
                          <ArrowRight className="relative size-4 shrink-0 text-primary-text transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none" aria-hidden="true" />
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="ui-card-glass flex items-start gap-3 p-5 text-sm text-ink-muted">
                    <BookOpen className="mt-0.5 size-5 shrink-0 text-technical-text" aria-hidden="true" />
                    <p>No enrolled domains are available for this account.</p>
                  </div>
                )}
              </section>
            </SectionReveal>
          </div>
        </div>
      </main>
    </PageTransition>
  );
};

export default StudentDashboard;
