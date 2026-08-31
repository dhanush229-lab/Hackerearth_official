import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  Lock,
  MapPin,
  Users,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import PageTransition from "../components/ui/PageTransition";
import SectionReveal from "../components/ui/SectionReveal";
import { useToast } from "../components/ToastProvider";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../lib/api";
import {
  getStudentEvents,
  registerForEvent,
  type EventSummary,
} from "../lib/eventApi";

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(new Date(value));

const getButtonLabel = (event: EventSummary) => {
  if (event.isRegistered) return "REGISTERED";
  if (event.status === "full") return "REGISTRATION FULL";
  if (event.status === "ongoing") return "EVENT ONGOING";
  if (event.status === "closed") return "REGISTRATION CLOSED";
  return "REGISTER NOW";
};

const getStatusLabel = (status: EventSummary["status"]) => {
  if (status === "open") return "OPEN";
  if (status === "full") return "FULL";
  if (status === "ongoing") return "ONGOING";
  if (status === "past") return "PAST";
  return "CLOSED";
};

const EventPoster = ({ event }: { event: EventSummary }) => (
  <div className="relative m-3 mb-0 aspect-[16/10] overflow-hidden rounded-[1.35rem] border border-line/70 bg-surface-muted shadow-soft sm:m-4 sm:mb-0">
    <img
      src={event.posterUrl}
      alt={`${event.title} poster`}
      loading="lazy"
      decoding="async"
      className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      onError={(event) => {
        event.currentTarget.style.display = "none";
      }}
    />
    <div className="absolute inset-0 -z-10 grid place-items-center bg-dream-soft/40 text-sm font-semibold text-ink-muted">
      Event poster
    </div>
    <div
      className="pointer-events-none absolute inset-0 bg-gradient-to-t from-primary/20 via-transparent to-transparent"
      aria-hidden="true"
    />
  </div>
);

const ProgressBar = ({ event }: { event: EventSummary }) => {
  const percent =
    event.maxRegistrations > 0
      ? Math.min(100, (event.registrationCount / event.maxRegistrations) * 100)
      : 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-ink">Registrations</span>
        <span className="font-mono text-xs font-semibold text-ink-muted">
          {event.registrationCount} / {event.maxRegistrations} Registered
        </span>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-surface-muted">
        <span
          className="block h-full rounded-full bg-gradient-to-r from-primary via-dream to-technical"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

const UpcomingEventCard = ({
  event,
  index,
  pending,
  onRegister,
}: {
  event: EventSummary;
  index: number;
  pending: boolean;
  onRegister: (event: EventSummary) => void;
}) => {
  const shouldReduceMotion = useReducedMotion();
  const disabled = pending || event.isRegistered || !event.registrationOpen;

  return (
    <motion.article
      initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={shouldReduceMotion ? undefined : { y: -4 }}
      transition={{
        duration: shouldReduceMotion ? 0 : 0.5,
        delay: shouldReduceMotion ? 0 : index * 0.06,
        ease: [0.16, 1, 0.3, 1],
      }}
      viewport={{ once: true, amount: 0.25 }}
      className="ui-card-glass top-border-accent-primary group flex h-full min-w-0 flex-col overflow-hidden border-dream/25 transition duration-300 hover:border-dream/50 hover:shadow-glow"
    >
      <EventPoster event={event} />

      <div className="flex flex-1 flex-col gap-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex min-h-8 items-center rounded-full border border-dream/30 bg-dream/10 px-3 font-mono text-xs font-bold text-dream-text">
            {getStatusLabel(event.status)}
          </span>
          <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-line bg-surface/80 px-3 text-xs font-semibold text-ink-muted">
            <Users className="size-3.5" aria-hidden="true" />
            {event.registrationCount}/{event.maxRegistrations}
          </span>
        </div>

        <div>
          <h3 className="font-display text-2xl font-semibold leading-tight text-ink">
            {event.title}
          </h3>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-ink-muted">
            {event.description}
          </p>
        </div>

        <dl className="grid gap-3 text-sm text-ink-muted sm:grid-cols-2">
          <div className="flex gap-2">
            <Calendar className="mt-0.5 size-4 shrink-0 text-primary-text" aria-hidden="true" />
            <div>
              <dt className="font-semibold text-ink">Event</dt>
              <dd>{formatDateTime(event.eventDateTime)}</dd>
            </div>
          </div>
          {event.eventEndDateTime && (
            <div className="flex gap-2">
              <Clock className="mt-0.5 size-4 shrink-0 text-dream-text" aria-hidden="true" />
              <div>
                <dt className="font-semibold text-ink">Ends</dt>
                <dd>{formatDateTime(event.eventEndDateTime)}</dd>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <Clock className="mt-0.5 size-4 shrink-0 text-rose-text" aria-hidden="true" />
            <div>
              <dt className="font-semibold text-ink">Deadline</dt>
              <dd>{formatDateTime(event.registrationDeadline)}</dd>
            </div>
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <MapPin className="mt-0.5 size-4 shrink-0 text-technical-text" aria-hidden="true" />
            <div>
              <dt className="font-semibold text-ink">Venue</dt>
              <dd>{event.venue}</dd>
            </div>
          </div>
        </dl>

        <ProgressBar event={event} />

        <button
          type="button"
          onClick={() => onRegister(event)}
          disabled={disabled}
          className="btn btn-primary mt-auto w-full justify-center disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          ) : event.isRegistered ? (
            <CheckCircle2 className="size-4" aria-hidden="true" />
          ) : !event.registrationOpen ? (
            <Lock className="size-4" aria-hidden="true" />
          ) : (
            <ArrowRight className="size-4" aria-hidden="true" />
          )}
          {pending ? "REGISTERING..." : getButtonLabel(event)}
        </button>
      </div>
    </motion.article>
  );
};

const PastEventCard = ({ event, index }: { event: EventSummary; index: number }) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.article
      initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{
        duration: shouldReduceMotion ? 0 : 0.45,
        delay: shouldReduceMotion ? 0 : index * 0.05,
      }}
      viewport={{ once: true, amount: 0.25 }}
      className="ui-card-glass group flex h-full min-w-0 flex-col overflow-hidden border-line/80"
    >
      <EventPoster event={event} />
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <span className="inline-flex min-h-8 w-fit items-center rounded-full border border-line bg-surface/80 px-3 font-mono text-xs font-bold text-ink-muted">
          PAST EVENT
        </span>
        <h3 className="mt-4 font-display text-2xl font-semibold leading-tight text-ink">
          {event.title}
        </h3>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-ink-muted">
          {event.description}
        </p>
        <dl className="mt-5 grid gap-3 text-sm text-ink-muted sm:grid-cols-2">
          <div>
            <dt className="font-semibold text-ink">Date</dt>
            <dd>{formatDate(event.eventDateTime)}</dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Venue</dt>
            <dd>{event.venue}</dd>
          </div>
        </dl>
        <p className="mt-5 text-sm font-semibold text-ink-muted">
          {event.registrationCount} Registered
        </p>
      </div>
    </motion.article>
  );
};

const Events = () => {
  const { user, isLoading } = useAuth();
  const { showToast } = useToast();
  const [upcomingEvents, setUpcomingEvents] = useState<EventSummary[]>([]);
  const [pastEvents, setPastEvents] = useState<EventSummary[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState("");
  const [pendingEventId, setPendingEventId] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;

    if (!user || user.role !== "student") {
      setUpcomingEvents([]);
      setPastEvents([]);
      setIsLoadingEvents(false);
      return;
    }

    const controller = new AbortController();
    setIsLoadingEvents(true);
    setEventsError("");

    void getStudentEvents(controller.signal)
      .then((response) => {
        setUpcomingEvents(response.upcoming);
        setPastEvents(response.past);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setEventsError("Events could not be loaded right now.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingEvents(false);
        }
      });

    return () => controller.abort();
  }, [isLoading, user]);

  const handleRegister = async (event: EventSummary) => {
    if (pendingEventId) return;

    try {
      setPendingEventId(event.id);
      const response = await registerForEvent(event.id);

      const updateEvent = (item: EventSummary) =>
        item.id === event.id
          ? {
              ...item,
              isRegistered: true,
              registrationCount: response.registrationCount,
              maxRegistrations: response.maxRegistrations,
              registrationOpen: false,
            }
          : item;

      setUpcomingEvents((current) => current.map(updateEvent));
      showToast({ variant: "success", message: response.message });
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Unable to register for this event. Please try again.";
      if (error instanceof ApiError) {
        setUpcomingEvents((current) =>
          current.map((item) => {
            if (item.id !== event.id) return item;
            if (error.code === "ALREADY_REGISTERED") {
              return { ...item, isRegistered: true, registrationOpen: false };
            }
            if (error.code === "EVENT_FULL") {
              return { ...item, status: "full", registrationOpen: false };
            }
            if (
              error.code === "REGISTRATION_CLOSED" ||
              error.code === "EVENT_PAST"
            ) {
              return { ...item, status: "closed", registrationOpen: false };
            }
            return item;
          })
        );
      }
      showToast({ variant: "error", message });
    } finally {
      setPendingEventId(null);
    }
  };

  return (
    <PageTransition className="relative isolate min-h-screen overflow-hidden bg-transparent text-ink transition-colors duration-500">
      <main className="min-h-screen">
        <section className="section-glow-subtle section-space relative overflow-x-clip pt-28 sm:pt-32">
          <div className="site-container">
            <SectionReveal
              variant="slide-up"
              className="mx-auto mb-10 max-w-3xl text-center sm:mb-12"
              amount={0.3}
            >
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-dream-text">
                Events &amp; Tracks
              </p>
              <h1 className="section-heading mt-2">
                <span className="text-gradient-subtle">Events</span>
              </h1>
              <p className="mt-4 text-sm leading-6 text-ink-muted sm:text-base">
                Register for upcoming HackerEarth Hub sessions and revisit past club activities.
              </p>
            </SectionReveal>

            {!isLoading && (!user || user.role !== "student") ? (
              <div className="ui-panel-glass mx-auto max-w-2xl p-6 text-center sm:p-8">
                <h2 className="font-display text-2xl font-semibold text-ink">
                  Sign in as a student to register
                </h2>
                <p className="mt-3 text-sm leading-6 text-ink-muted">
                  Event registration is available for authenticated students.
                </p>
                <Link to="/login" className="btn btn-primary mt-6">
                  Login
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            ) : isLoadingEvents ? (
              <div className="grid gap-6 md:grid-cols-2">
                {[0, 1].map((item) => (
                  <div
                    key={item}
                    className="ui-card-glass min-h-96 animate-pulse border-dream/20 p-5 motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                ))}
              </div>
            ) : eventsError ? (
              <div className="ui-panel-glass mx-auto max-w-2xl p-6 text-center text-sm text-ink-muted">
                {eventsError}
              </div>
            ) : (
              <div className="space-y-12">
                <section aria-labelledby="upcoming-events-heading">
                  <div className="mb-5">
                    <h2 id="upcoming-events-heading" className="font-display text-2xl font-semibold text-ink sm:text-3xl">
                      Upcoming Events
                    </h2>
                  </div>
                  {upcomingEvents.length > 0 ? (
                    <div className="grid gap-6 lg:grid-cols-2">
                      {upcomingEvents.map((event, index) => (
                        <UpcomingEventCard
                          key={event.id}
                          event={event}
                          index={index}
                          pending={pendingEventId === event.id}
                          onRegister={handleRegister}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="ui-card-glass p-8 text-center text-sm text-ink-muted">
                      No upcoming events right now. Check back soon.
                    </div>
                  )}
                </section>

                <section aria-labelledby="past-events-heading">
                  <div className="mb-5">
                    <h2 id="past-events-heading" className="font-display text-2xl font-semibold text-ink sm:text-3xl">
                      Past Events
                    </h2>
                  </div>
                  {pastEvents.length > 0 ? (
                    <div className="grid gap-6 lg:grid-cols-2">
                      {pastEvents.map((event, index) => (
                        <PastEventCard key={event.id} event={event} index={index} />
                      ))}
                    </div>
                  ) : (
                    <div className="ui-card-glass p-8 text-center text-sm text-ink-muted">
                      No past events to show yet.
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>
        </section>
      </main>
    </PageTransition>
  );
};

export default Events;
