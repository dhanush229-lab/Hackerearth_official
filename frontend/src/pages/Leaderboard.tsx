"use client";

import {
  ArrowRight,
  Award,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Crown,
  Medal,
  RotateCcw,
  Search,
  Trophy,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import PageTransition from "../components/ui/PageTransition";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../lib/api";
import {
  getOverallLeaderboard,
  getStudentRank,
  getStudentWeeklyRank,
  getWeeklyContestWeeks,
  getWeeklyLeaderboard,
  type LeaderboardPagination,
  type OverallLeaderboardEntry,
  type StudentRank,
  type StudentWeeklyRank,
  type WeeklyLeaderboardEntry,
} from "../lib/leaderboardApi";
import { cn } from "../lib/utils";

type LeaderboardMode = "overall" | "weekly";
type LeaderboardEntry = OverallLeaderboardEntry | WeeklyLeaderboardEntry;
type WeeklySelection = "all" | number;

const DEFAULT_PAGINATION: LeaderboardPagination = {
  page: 1,
  limit: 25,
  total: 0,
  totalPages: 1,
};

const topRankStyles = [
  {
    card: "order-1 border-highlight/35 bg-highlight/10 lg:order-2 lg:-mt-4",
    icon: Crown,
    iconClass: "text-highlight",
    label: "Champion",
  },
  {
    card: "order-2 border-technical/30 bg-technical/10 lg:order-1",
    icon: Trophy,
    iconClass: "text-technical-text",
    label: "Runner up",
  },
  {
    card: "order-3 border-creative/30 bg-creative/10",
    icon: Medal,
    iconClass: "text-creative-text",
    label: "Top three",
  },
] as const;

const isOverallEntry = (
  entry: LeaderboardEntry
): entry is OverallLeaderboardEntry => "totalPoints" in entry;

const getPoints = (entry: LeaderboardEntry) =>
  isOverallEntry(entry) ? entry.totalPoints : entry.points;

const modeLabels: Record<LeaderboardMode, string> = {
  overall: "Overall Ranks",
  weekly: "Weekly Contests",
};

const getEmptyMessage = (mode: LeaderboardMode, search: string) => {
  if (search) {
    return `No rankings matched "${search}".`;
  }

  return mode === "weekly"
    ? "No weekly contest rankings have been published yet."
    : "No leaderboard records are available yet.";
};

const PaginationControls = ({
  pagination,
  onPageChange,
}: {
  pagination: LeaderboardPagination;
  onPageChange: (page: number) => void;
}) => {
  const currentPage = Math.min(pagination.page, pagination.totalPages);

  return (
    <div className="grid items-center gap-4 p-4 sm:p-6 md:grid-cols-[1fr_auto_1fr]">
      <p className="text-sm text-ink-muted">
        Showing {pagination.total === 0 ? 0 : (currentPage - 1) * pagination.limit + 1}
        {" - "}
        {Math.min(currentPage * pagination.limit, pagination.total)} of{" "}
        {pagination.total} students
      </p>

      <div className="text-sm font-medium tabular-nums text-ink-muted md:text-center">
        Page {currentPage} of {pagination.totalPages}
      </div>

      <div className="flex items-center gap-2 md:justify-end">
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          className="btn btn-secondary btn-icon"
          aria-label="First page"
          title="First page"
        >
          <ChevronsLeft className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="btn btn-secondary btn-icon"
          aria-label="Previous page"
          title="Previous page"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= pagination.totalPages}
          className="btn btn-secondary btn-icon"
          aria-label="Next page"
          title="Next page"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(pagination.totalPages)}
          disabled={currentPage >= pagination.totalPages}
          className="btn btn-secondary btn-icon"
          aria-label="Last page"
          title="Last page"
        >
          <ChevronsRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

const TopThree = ({ entries }: { entries: LeaderboardEntry[] }) => {
  const topEntries = entries.filter((entry) => entry.rank <= 3);

  if (topEntries.length === 0) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-3 lg:items-end">
      {topEntries.map((entry) => {
        const style = topRankStyles[entry.rank - 1];
        const Icon = style.icon;

        return (
          <article
            key={entry.studentId}
            className={cn(
              "ui-card-glass relative overflow-hidden p-5 text-center shadow-soft",
              style.card
            )}
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -right-8 -top-10 size-28 rounded-full bg-dream/20 blur-2xl"
            />
            <Icon
              className={cn("mx-auto size-9", style.iconClass)}
              aria-hidden="true"
            />
            <p className="mt-3 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ink-subtle">
              {style.label}
            </p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-ink">
              #{entry.rank}
            </p>
            <h3 className="mt-3 break-words font-display text-xl font-semibold text-ink">
              {entry.name}
            </h3>
            <p className="mt-1 font-mono text-xs font-semibold text-ink-muted">
              {entry.usn}
            </p>
            <p className="mt-3 text-2xl font-bold tabular-nums text-primary-text">
              {getPoints(entry)}
            </p>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-subtle">
              Points
            </p>
          </article>
        );
      })}
    </div>
  );
};

const LeaderboardTable = ({
  entries,
  mode,
  search,
}: {
  entries: LeaderboardEntry[];
  mode: LeaderboardMode;
  search: string;
}) => (
  <>
    {/* Mobile layout */}
    <div className="border-b border-line bg-surface sm:hidden">
      {entries.length > 0 ? (
        <div className="divide-y divide-line">
          {entries.map((entry) => (
            <article
              key={`${entry.rank}-${entry.studentId}`}
              className="p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="shrink-0 font-mono text-lg font-bold tabular-nums text-primary-text">
                      #{entry.rank}
                    </span>

                    <h3 className="min-w-0 break-words font-display text-base font-semibold text-ink">
                      {entry.name}
                    </h3>
                  </div>

                  <p className="mt-2 break-all font-mono text-xs font-semibold text-ink-muted">
                    {entry.usn}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="font-mono text-lg font-bold tabular-nums text-success-text">
                    {getPoints(entry)}
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-subtle">
                    Points
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-line bg-surface-muted px-3 py-1 text-xs font-medium text-ink-muted">
                  {entry.branch}
                </span>

                <span className="rounded-full border border-line bg-surface-muted px-3 py-1 text-xs font-medium text-ink-muted">
                  Year {entry.year}
                </span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="px-4 py-10 text-center text-sm text-ink-muted">
          {getEmptyMessage(mode, search)}
        </div>
      )}
    </div>

    {/* Tablet / desktop layout */}
    <div
      className="hidden overflow-auto border-b border-line bg-surface sm:block"
      role="region"
      aria-label={`${modeLabels[mode]} table`}
      tabIndex={0}
    >
      <table className="w-full min-w-[46rem] border-separate border-spacing-0 text-left text-sm">
        <caption className="sr-only">{modeLabels[mode]}</caption>

        <thead>
          <tr>
            {["Rank", "Student", "USN", "Branch", "Year", "Points"].map(
              (column) => (
                <th
                  key={column}
                  className="sticky top-0 z-10 border-b border-primary/25 bg-surface px-4 py-3 font-semibold text-ink"
                >
                  {column}
                </th>
              )
            )}
          </tr>
        </thead>

        <tbody>
          {entries.map((entry) => (
            <tr
              key={`${entry.rank}-${entry.studentId}`}
              className="group transition-colors hover:bg-surface-muted"
            >
              <td className="border-b border-line px-4 py-4 font-mono font-bold tabular-nums text-primary-text">
                #{entry.rank}
              </td>

              <td className="border-b border-line px-4 py-4">
                <p className="font-semibold text-ink">{entry.name}</p>
              </td>

              <td className="border-b border-line px-4 py-4 font-mono text-xs font-semibold text-ink-muted">
                {entry.usn}
              </td>

              <td className="border-b border-line px-4 py-4 text-ink-muted">
                {entry.branch}
              </td>

              <td className="border-b border-line px-4 py-4 font-mono tabular-nums text-ink-muted">
                {entry.year}
              </td>

              <td className="border-b border-line px-4 py-4 font-mono font-bold tabular-nums text-success-text">
                {getPoints(entry)}
              </td>
            </tr>
          ))}

          {entries.length === 0 && (
            <tr>
              <td
                colSpan={6}
                className="px-4 py-10 text-center text-ink-muted"
              >
                {getEmptyMessage(mode, search)}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </>
);

export default function Leaderboard() {
  const shouldReduceMotion = useReducedMotion();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [mode, setMode] = useState<LeaderboardMode>("overall");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
  const [weeks, setWeeks] = useState<number[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<WeeklySelection>("all");
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [studentRank, setStudentRank] = useState<StudentRank | null>(null);
  const [studentWeeklyRank, setStudentWeeklyRank] = useState<StudentWeeklyRank | null>(null);
  const [studentRankError, setStudentRankError] = useState("");

  const pageSize = 25;

  const loadLeaderboard = useMemo(
    () => async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        if (mode === "overall") {
          const data = await getOverallLeaderboard({
            page,
            limit: pageSize,
            search: appliedSearch,
          });
          setEntries(data.leaderboard);
          setPagination(data.pagination);
        } else if (selectedWeek === "all" || selectedWeek) {
          const data = await getWeeklyLeaderboard({
            scope: selectedWeek === "all" ? "all" : "week",
            week: selectedWeek === "all" ? undefined : selectedWeek,
            page,
            limit: pageSize,
            search: appliedSearch,
          });
          setEntries(data.leaderboard);
          setPagination(data.pagination);
        } else {
          setEntries([]);
          setPagination(DEFAULT_PAGINATION);
        }
      } catch (error) {
        setEntries([]);
        setPagination(DEFAULT_PAGINATION);
        setErrorMessage(
          error instanceof ApiError
            ? error.message
            : "Unable to load leaderboard right now."
        );
      } finally {
        setIsLoading(false);
      }
    },
    [appliedSearch, mode, page, selectedWeek]
  );

  useEffect(() => {
    void loadLeaderboard();
  }, [loadLeaderboard]);

  useEffect(() => {
    const loadWeeks = async () => {
      try {
        const data = await getWeeklyContestWeeks();
        setWeeks(data.weeks);
        setSelectedWeek((current) =>
          current === "all" || (typeof current === "number" && data.weeks.includes(current))
            ? current
            : "all"
        );
      } catch {
        setWeeks([]);
        setSelectedWeek("all");
      }
    };

    void loadWeeks();
  }, []);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "student") {
      setStudentRank(null);
      setStudentWeeklyRank(null);
      return;
    }

    const loadStudentRank = async () => {
      try {
        setStudentRankError("");
        if (mode === "overall") {
          const data = await getStudentRank();
          setStudentRank(data.rank);
          setStudentWeeklyRank(null);
        } else {
          const data = await getStudentWeeklyRank({
            scope: selectedWeek === "all" ? "all" : "week",
            week: selectedWeek === "all" ? undefined : selectedWeek,
          });
          setStudentWeeklyRank(data.rank);
          setStudentRank(null);
        }
      } catch {
        setStudentRank(null);
        setStudentWeeklyRank(null);
        setStudentRankError("Your standing could not be loaded right now.");
      }
    };

    void loadStudentRank();
  }, [isAuthenticated, mode, selectedWeek, user?.role]);

  const handleModeChange = (nextMode: LeaderboardMode) => {
    setMode(nextMode);
    setPage(1);
    setAppliedSearch("");
    setSearchInput("");
  };

  const handleWeekChange = (week: WeeklySelection) => {
    setSelectedWeek(week);
    setPage(1);
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAppliedSearch(searchInput.trim());
    setPage(1);
  };

  const tableEntries =
    page === 1 ? entries.filter((entry) => entry.rank > 3) : entries;

  return (
    <PageTransition>
      <main className="section-glow-subtle min-h-screen bg-canvas text-ink transition-colors duration-500">
        <div className="site-container-wide section-space min-w-0 overflow-x-hidden pt-24 lg:pt-section">
          <motion.header
            className="mx-auto mb-8 max-w-4xl text-center sm:mb-10"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.5,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-primary-text">
              HackerEarth Hub NMAMIT
            </p>
            <h1 className="section-heading mt-3">
              <span className="text-gradient-subtle">Leaderboard</span>
            </h1>
            <p className="section-lead mx-auto mt-4 text-center">
              Track club participation, activity points, and weekly contest performance.
            </p>
          </motion.header>

          <div className="mx-auto mb-8 flex w-full max-w-xl rounded-2xl border border-line/70 bg-surface-muted/55 p-1 shadow-soft">
            {(["overall", "weekly"] as LeaderboardMode[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => handleModeChange(option)}
                className={cn(
                  "min-h-11 flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition duration-200 focus-visible:outline-offset-2",
                  mode === option
                    ? "border-dream/40 bg-gradient-to-r from-primary/15 via-dream/10 to-technical/10 text-primary-text shadow-soft"
                    : "border-transparent text-ink-muted hover:border-dream/30 hover:bg-dream-soft/35 hover:text-ink"
                )}
                aria-pressed={mode === option}
              >
                {modeLabels[option]}
              </button>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.36fr)]">
            <section className="space-y-5">
              <div className="ui-card top-border-accent-primary overflow-hidden border-primary/25">
                <div className="grid gap-4 border-b border-line p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                  <div>
                    <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-technical-text">
                      {mode === "weekly"
                        ? selectedWeek === "all"
                          ? "All Weekly Contest Rankings"
                          : `Week ${selectedWeek} Rankings`
                        : modeLabels[mode]}
                    </p>
                    <h2 className="mt-1 font-display text-2xl font-semibold text-ink">
                      {mode === "weekly" ? "Weekly Contests" : "Overall Ranks"}
                    </h2>
                  </div>

                  <form
                    onSubmit={handleSearch}
                    className="flex min-w-0 flex-col gap-2 sm:flex-row"
                  >
                    <label htmlFor="leaderboard-search" className="sr-only">
                      Search by student name or USN
                    </label>
                    <input
                      id="leaderboard-search"
                      type="search"
                      value={searchInput}
                      onChange={(event) => setSearchInput(event.target.value)}
                      placeholder="Search name or USN"
                      className="min-h-11 min-w-0 flex-1 rounded-control border border-line-strong bg-surface px-3 py-2 text-sm font-medium text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25"
                    />
                    <button
                      type="submit"
                      className="btn btn-primary w-full shrink-0 justify-center sm:w-auto"
                    >
                      <Search className="size-4" aria-hidden="true" />
                      Search
                    </button>
                  </form>
                </div>

                {mode === "weekly" && (
                  <div className="border-b border-line p-4 sm:p-6">
                    {weeks.length > 0 ? (
                      <div className="flex flex-wrap gap-2" aria-label="Weekly contest selector">
                        <button
                          type="button"
                          onClick={() => handleWeekChange("all")}
                          className={cn(
                            "rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline-offset-2",
                            selectedWeek === "all"
                              ? "border-dream/40 bg-dream/15 text-dream-text shadow-soft"
                              : "border-line bg-surface text-ink-muted hover:border-dream/35 hover:text-ink"
                          )}
                          aria-pressed={selectedWeek === "all"}
                        >
                          All Weekly Contests
                        </button>
                        {weeks.map((week) => (
                          <button
                            key={week}
                            type="button"
                            onClick={() => handleWeekChange(week)}
                            className={cn(
                              "rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline-offset-2",
                              selectedWeek === week
                                ? "border-dream/40 bg-dream/15 text-dream-text shadow-soft"
                                : "border-line bg-surface text-ink-muted hover:border-dream/35 hover:text-ink"
                            )}
                            aria-pressed={selectedWeek === week}
                          >
                            Week {week}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-ink-muted">
                        No weekly contest rankings have been published yet.
                      </p>
                    )}
                  </div>
                )}

                {isLoading ? (
                  <div className="grid gap-4 p-4 sm:p-6">
                    {[0, 1, 2].map((item) => (
                      <div
                        key={item}
                        className="h-20 animate-pulse rounded-card bg-surface-muted motion-reduce:animate-none"
                      />
                    ))}
                  </div>
                ) : errorMessage ? (
                  <div className="m-4 rounded-control border border-rose/30 bg-rose/10 px-5 py-10 text-center sm:m-6">
                    <p className="font-semibold text-rose-text">{errorMessage}</p>
                    <button
                      type="button"
                      className="btn btn-secondary mt-5"
                      onClick={() => void loadLeaderboard()}
                    >
                      <RotateCcw className="size-4" aria-hidden="true" />
                      Retry
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="p-4 sm:p-6">
                      <TopThree entries={entries} />
                    </div>
                    <LeaderboardTable
                      entries={tableEntries}
                      mode={mode}
                      search={appliedSearch}
                    />
                    <PaginationControls
                      pagination={pagination}
                      onPageChange={setPage}
                    />
                  </>
                )}
              </div>
            </section>

            <aside className="space-y-5">
              {!authLoading && !isAuthenticated && (
                <div className="ui-card-glass border-dream/25 p-5">
                  <Award className="size-8 text-dream-text" aria-hidden="true" />
                  <h2 className="mt-4 font-display text-xl font-semibold text-ink">
                    Sign in to know your rank.
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-ink-muted">
                    Log in with your NMAMIT account to see your personal standing.
                  </p>
                  <Link to="/login" className="btn btn-primary mt-5 w-full justify-center">
                    Login
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </div>
              )}

              {!authLoading && user?.role === "student" && (
                <div className="ui-card-glass border-technical/25 p-5">
                  <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-technical-text">
                    Your Standing
                  </p>
                  {mode === "overall" && studentRank ? (
                    <div className="mt-4 grid gap-3">
                      <div className="rounded-card border border-line/80 bg-surface/80 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-subtle">
                          Your Rank
                        </p>
                        <p className="mt-1 text-3xl font-bold tabular-nums text-primary-text">
                          #{studentRank.overallRank}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-card border border-line/80 bg-surface/80 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-subtle">
                            Total Points
                          </p>
                          <p className="mt-1 text-2xl font-bold tabular-nums text-ink">
                            {studentRank.totalPoints}
                          </p>
                        </div>
                        <div className="rounded-card border border-line/80 bg-surface/80 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-subtle">
                            Out Of
                          </p>
                          <p className="mt-1 text-2xl font-bold tabular-nums text-ink">
                            {studentRank.totalActiveStudents}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : mode === "weekly" && studentWeeklyRank ? (
                    <div className="mt-4 grid gap-3">
                      <div className="rounded-card border border-line/80 bg-surface/80 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-subtle">
                          {studentWeeklyRank.scope === "all"
                            ? "All Weekly Rank"
                            : `Week ${studentWeeklyRank.week} Rank`}
                        </p>
                        <p className="mt-1 text-3xl font-bold tabular-nums text-primary-text">
                          {studentWeeklyRank.weeklyRank
                            ? `#${studentWeeklyRank.weeklyRank}`
                            : "Not ranked"}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-card border border-line/80 bg-surface/80 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-subtle">
                            Weekly Points
                          </p>
                          <p className="mt-1 text-2xl font-bold tabular-nums text-ink">
                            {studentWeeklyRank.weeklyPoints}
                          </p>
                        </div>
                        <div className="rounded-card border border-line/80 bg-surface/80 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-subtle">
                            Ranked
                          </p>
                          <p className="mt-1 text-2xl font-bold tabular-nums text-ink">
                            {studentWeeklyRank.totalRankedStudents}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm leading-6 text-ink-muted">
                      {studentRankError || "Loading your standing..."}
                    </p>
                  )}
                </div>
              )}
            </aside>
          </div>
        </div>
      </main>
    </PageTransition>
  );
}
