import {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  AlertCircle,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Code2,
  DoorOpen,
  ExternalLink,
  FileSpreadsheet,
  GitBranch,
  History,
  Image,
  Loader2,
  Pencil,
  PlusCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Trophy,
  UserCheck,
  Users,
  UserX,
  X,
} from 'lucide-react';
import PageTransition from '../components/ui/PageTransition';
import SectionReveal from '../components/ui/SectionReveal';
import InaugurationLaunch from '../components/admin/InaugurationLaunch';
import { INAUGURATION_MODE } from '../config/inauguration';
import { ApiError } from '../lib/api';
import {
  createAdminEvent,
  downloadAdminEventRegistrations,
  getAdminEventRegistrations,
  getAdminEvents,
  uploadAdminEventPoster,
  updateAdminEvent,
  type AdminEventRegistrationStudent,
  type AdminEventRegistrationSummary,
  type EventInput,
  type EventSummary,
} from '../lib/eventApi';
import { registrationBranchOptions } from '../lib/registrationBranches';
import {
  awardStudentPoints,
  createAdminDpp,
  createAdminWeeklyContest,
  downloadAdminDppOpensExcel,
  downloadAdminWeeklyContestAttemptsExcel,
  getAdminDppOpens,
  getAdminDpps,
  getAdminOverview,
  getAdminRegistrationSettings,
  getAdminStudentPointHistory,
  getAdminStudents,
  getAdminWeeklyContestAttempts,
  getAdminWeeklyContests,
  downloadAdminStudentsExcel,
  type AdminPointStudent,
  type AdminPointTransaction,
  type AdminOverview,
  type AdminDpp,
  type AdminDppOpenStudent,
  type AdminDppOpenSummary,
  type AdminStudent,
  type AdminWeeklyContest,
  type AdminWeeklyContestAttempt,
  type AdminWeeklyContestAttemptSummary,
  type DppInput,
  type RegistrationSettings,
  type StudentPagination,
  type WeeklyContestInput,
  upsertAdminWeeklyContestScore,
  updateManualPointTransaction,
  updateAdminDpp,
  updateAdminWeeklyContest,
  updateAdminRegistrationSettings,
  updateAdminStudentStatus,
  upsertAdminDppScore,
} from '../lib/adminApi';

const PAGE_LIMIT = 25;
const OPEN_REGISTRATION_MESSAGE = 'Student registration is currently open.';
const CLOSED_REGISTRATION_MESSAGE = 'Student registration is currently closed.';
const emptyEventForm = {
  title: '',
  posterUrl: '',
  posterPublicId: '',
  description: '',
  venue: '',
  eventDate: '',
  eventTime: '',
  eventEndDate: '',
  eventEndTime: '',
  deadlineDate: '',
  deadlineTime: '',
  maxRegistrations: '',
  active: true,
};
const emptyWeeklyContestForm = {
  title: '',
  description: '',
  weekNumber: '',
  contestUrl: '',
  startDate: '',
  startTime: '',
  endDate: '',
  endTime: '',
  active: true,
};
const emptyDppForm = {
  type: 'dsa',
  title: '',
  url: '',
  description: '',
  active: true,
};
const MAX_POSTER_SIZE_BYTES = 5 * 1024 * 1024;
const acceptedPosterTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

type StatusFilter = '' | 'active' | 'inactive';
type DomainFilter = '' | 'Web Development' | 'DSA' | 'Aptitude';
type AdminErrorKind = 'unauthorized' | 'forbidden' | 'network' | 'server' | 'api';
type EventFormState = typeof emptyEventForm;
type WeeklyContestFormState = typeof emptyWeeklyContestForm;
type DppFormState = typeof emptyDppForm;

interface AdminRequestError {
  kind: AdminErrorKind;
  message: string;
}

const emptyPagination: StudentPagination = {
  page: 1,
  limit: PAGE_LIMIT,
  total: 0,
  totalPages: 0,
};

const domainFilterOptions: Array<{ value: DomainFilter; label: string }> = [
  { value: '', label: 'All Domains' },
  { value: 'Web Development', label: 'Web Development' },
  { value: 'DSA', label: 'DSA' },
  { value: 'Aptitude', label: 'Aptitude' },
];

const statAccents = {
  primary: {
    border: 'border-primary/25',
    icon: 'border-primary/25 bg-primary/10 text-primary-text',
    glow: 'bg-primary/20',
  },
  dream: {
    border: 'border-dream/25',
    icon: 'border-dream/25 bg-dream/10 text-dream-text',
    glow: 'bg-dream/20',
  },
  rose: {
    border: 'border-rose/25',
    icon: 'border-rose/25 bg-rose/10 text-rose-text',
    glow: 'bg-rose/20',
  },
  technical: {
    border: 'border-technical/25',
    icon: 'border-technical/25 bg-technical/10 text-technical-text',
    glow: 'bg-technical/20',
  },
} as const;

const useDebouncedValue = <T,>(value: T, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);

  return debouncedValue;
};

const classifyAdminError = (error: unknown, fallback: string): AdminRequestError => {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return {
        kind: 'unauthorized',
        message: 'Your admin session has expired. Please sign in again.',
      };
    }

    if (error.status === 403) {
      return {
        kind: 'forbidden',
        message: 'Your account does not have permission to access the Admin Dashboard.',
      };
    }

    if (error.status >= 500) {
      return {
        kind: 'server',
        message: 'Something went wrong while loading the Admin Dashboard.',
      };
    }

    return { kind: 'api', message: error.message || fallback };
  }

  if (error instanceof TypeError) {
    return {
      kind: 'network',
      message: 'Unable to connect to the server. Please try again.',
    };
  }

  return { kind: 'api', message: fallback };
};

const isGlobalAuthorizationError = (error: AdminRequestError) =>
  error.kind === 'unauthorized' || error.kind === 'forbidden';

const isAbortError = (error: unknown) =>
  error instanceof DOMException && error.name === 'AbortError';

const formatDateTime = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const toDateInputValue = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const toTimeInputValue = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toTimeString().slice(0, 5);
};

const getEventStatusLabel = (event: EventSummary) => {
  if (event.status === 'open') return 'OPEN';
  if (event.status === 'full') return 'FULL';
  if (event.status === 'ongoing') return 'ONGOING';
  if (event.status === 'past') return 'PAST';
  return 'CLOSED';
};

const getEventStatusClasses = (event: EventSummary) => {
  if (event.status === 'open') return 'border-dream/35 bg-dream/10 text-dream-text';
  if (event.status === 'full') return 'border-technical/35 bg-technical/10 text-technical-text';
  if (event.status === 'ongoing') return 'border-primary/35 bg-primary/10 text-primary-text';
  if (event.status === 'past') return 'border-line bg-surface-muted text-ink-muted';
  return 'border-rose/35 bg-rose/10 text-rose-text';
};

const buildEventPayload = (form: EventFormState): EventInput | null => {
  const eventDateTime = new Date(`${form.eventDate}T${form.eventTime}`);
  const eventEndDateTime = new Date(`${form.eventEndDate}T${form.eventEndTime}`);
  const registrationDeadline = new Date(`${form.deadlineDate}T${form.deadlineTime}`);
  const maxRegistrations = Number(form.maxRegistrations);

  if (
    !form.title.trim() ||
    !form.posterUrl.trim() ||
    !form.description.trim() ||
    !form.venue.trim() ||
    !form.eventDate ||
    !form.eventTime ||
    !form.eventEndDate ||
    !form.eventEndTime ||
    !form.deadlineDate ||
    !form.deadlineTime ||
    Number.isNaN(eventDateTime.getTime()) ||
    Number.isNaN(eventEndDateTime.getTime()) ||
    Number.isNaN(registrationDeadline.getTime()) ||
    !Number.isInteger(maxRegistrations) ||
    maxRegistrations < 1
  ) {
    return null;
  }

  return {
    title: form.title.trim(),
    posterUrl: form.posterUrl.trim(),
    posterPublicId: form.posterPublicId.trim() || undefined,
    description: form.description.trim(),
    venue: form.venue.trim(),
    eventDateTime: eventDateTime.toISOString(),
    eventEndDateTime: eventEndDateTime.toISOString(),
    registrationDeadline: registrationDeadline.toISOString(),
    maxRegistrations,
    active: form.active,
  };
};

const getWeeklyContestStatusLabel = (contest: AdminWeeklyContest) => {
  if (contest.status === 'live') return 'LIVE';
  if (contest.status === 'upcoming') return 'UPCOMING';
  if (contest.status === 'ended') return 'ENDED';
  return 'INACTIVE';
};

const getWeeklyContestStatusClasses = (contest: AdminWeeklyContest) => {
  if (contest.status === 'live') return 'border-success/35 bg-success/10 text-success-text';
  if (contest.status === 'upcoming') return 'border-dream/35 bg-dream/10 text-dream-text';
  if (contest.status === 'ended') return 'border-line bg-surface-muted text-ink-muted';
  return 'border-rose/35 bg-rose/10 text-rose-text';
};

const buildWeeklyContestPayload = (form: WeeklyContestFormState): WeeklyContestInput | null => {
  const weekNumber = Number(form.weekNumber);
  const startDateTime = new Date(`${form.startDate}T${form.startTime}`);
  const endDateTime = new Date(`${form.endDate}T${form.endTime}`);
  const description = form.description.trim();

  if (
    !form.title.trim() ||
    !form.contestUrl.trim() ||
    !form.startDate ||
    !form.startTime ||
    !form.endDate ||
    !form.endTime ||
    !Number.isInteger(weekNumber) ||
    weekNumber < 1 ||
    weekNumber > 10 ||
    Number.isNaN(startDateTime.getTime()) ||
    Number.isNaN(endDateTime.getTime())
  ) {
    return null;
  }

  try {
    const parsedUrl = new URL(form.contestUrl.trim());
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return null;
    }
  } catch {
    return null;
  }

  return {
    title: form.title.trim(),
    description: description || undefined,
    weekNumber,
    contestUrl: form.contestUrl.trim(),
    startDateTime: startDateTime.toISOString(),
    endDateTime: endDateTime.toISOString(),
    active: form.active,
  };
};

const getDppTypeLabel = (type: AdminDpp['type']) =>
  type === 'dsa' ? 'DSA' : 'Aptitude';

const getDppTypeClasses = (type: AdminDpp['type']) =>
  type === 'dsa'
    ? 'border-technical/35 bg-technical/10 text-technical-text'
    : 'border-primary/35 bg-primary/10 text-primary-text';

const getDppOpenKey = (open: AdminDppOpenStudent) => open.studentId || open.id;

const buildDppPayload = (form: DppFormState): DppInput | null => {
  const type = form.type === 'dsa' || form.type === 'aptitude' ? form.type : null;
  const description = form.description.trim();

  if (!type || !form.title.trim() || !form.url.trim()) {
    return null;
  }

  try {
    const parsedUrl = new URL(form.url.trim());
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return null;
    }
  } catch {
    return null;
  }

  return {
    type,
    title: form.title.trim(),
    url: form.url.trim(),
    description: description || undefined,
    active: form.active,
  };
};

const formatShortDate = (value?: string | null) => {
  if (!value) return 'Recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';

  return new Intl.DateTimeFormat('en-IN', {
    month: 'short',
    day: 'numeric',
  }).format(date);
};

const StatCard = ({
  label,
  value,
  icon,
  detail,
  accent,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  detail?: string;
  accent: {
    border: string;
    icon: string;
    glow: string;
  };
}) => (
  <article className={`relative flex min-h-40 h-full flex-col justify-between overflow-hidden rounded-card border bg-surface/90 p-5 shadow-soft sm:p-6 ${accent.border}`}>
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute -right-12 -top-12 size-28 rounded-full opacity-25 ${accent.glow}`}
    />
    <div className="flex items-start justify-between gap-4">
      <p className="relative font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ink-subtle">
        {label}
      </p>
      <span className={`relative flex size-10 shrink-0 items-center justify-center rounded-control border ${accent.icon}`}>
        {icon}
      </span>
    </div>
    <div className="relative mt-5">
      <p className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        {value}
      </p>
      {detail && <p className="mt-2 text-sm leading-6 text-ink-muted">{detail}</p>}
    </div>
  </article>
);

const InlineFeedback = ({
  kind,
  children,
}: {
  kind: 'error' | 'success';
  children: ReactNode;
}) => (
  <div
    className={`flex items-start gap-2 rounded-control border p-3 text-sm leading-6 ${
      kind === 'error'
        ? 'border-rose/40 bg-rose/10 text-ink'
        : 'border-dream/40 bg-dream/10 text-ink'
    }`}
    role={kind === 'error' ? 'alert' : 'status'}
  >
    {kind === 'error' ? (
      <AlertCircle className="mt-0.5 size-4 shrink-0 text-rose-text" aria-hidden="true" />
    ) : (
      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-dream-text" aria-hidden="true" />
    )}
    <span>{children}</span>
  </div>
);

const LoadingState = ({ label }: { label: string }) => (
  <div className="flex min-h-32 items-center justify-center gap-3 rounded-card border border-line/80 bg-surface/90 p-6 text-sm font-medium text-ink-muted shadow-soft" role="status">
    <Loader2 className="size-5 animate-spin text-dream-text motion-reduce:animate-none" aria-hidden="true" />
    {label}
  </div>
);

const AdminDashboard = () => {
  const [globalAuthError, setGlobalAuthError] = useState<AdminRequestError | null>(null);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState<AdminRequestError | null>(null);

  const [registration, setRegistration] = useState<RegistrationSettings | null>(null);
  const [registrationLoading, setRegistrationLoading] = useState(true);
  const [registrationPending, setRegistrationPending] = useState(false);
  const [registrationError, setRegistrationError] = useState<AdminRequestError | null>(null);
  const [registrationNotice, setRegistrationNotice] = useState<string | null>(null);

  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [pagination, setPagination] = useState<StudentPagination>(emptyPagination);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentsError, setStudentsError] = useState<AdminRequestError | null>(null);
  const [studentsNotice, setStudentsNotice] = useState<string | null>(null);
  const [pendingStudentId, setPendingStudentId] = useState<string | null>(null);
  const [studentRefreshToken, setStudentRefreshToken] = useState(0);
  const [studentsExporting, setStudentsExporting] = useState(false);

  const [awardSearchEmail, setAwardSearchEmail] = useState('');
  const [awardSearchResults, setAwardSearchResults] = useState<AdminStudent[]>([]);
  const [awardSearchLoading, setAwardSearchLoading] = useState(false);
  const [awardSearchError, setAwardSearchError] = useState<AdminRequestError | null>(null);
  const [selectedAwardStudent, setSelectedAwardStudent] = useState<AdminPointStudent | null>(null);
  const [pointHistory, setPointHistory] = useState<AdminPointTransaction[]>([]);
  const [pointHistoryLoading, setPointHistoryLoading] = useState(false);
  const [awardPoints, setAwardPoints] = useState('');
  const [awardDescription, setAwardDescription] = useState('');
  const [awardError, setAwardError] = useState<AdminRequestError | null>(null);
  const [awardNotice, setAwardNotice] = useState<string | null>(null);
  const [awardSubmitting, setAwardSubmitting] = useState(false);
  const [isAwardConfirmOpen, setIsAwardConfirmOpen] = useState(false);
  const [editingPointTransaction, setEditingPointTransaction] = useState<AdminPointTransaction | null>(null);
  const [editAwardPoints, setEditAwardPoints] = useState('');
  const [editAwardDescription, setEditAwardDescription] = useState('');
  const [editAwardSubmitting, setEditAwardSubmitting] = useState(false);
  const [editAwardError, setEditAwardError] = useState<AdminRequestError | null>(null);

  const [events, setEvents] = useState<EventSummary[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState<AdminRequestError | null>(null);
  const [eventsNotice, setEventsNotice] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState<EventFormState>(emptyEventForm);
  const [eventFormError, setEventFormError] = useState<AdminRequestError | null>(null);
  const [eventSubmitting, setEventSubmitting] = useState(false);
  const [eventSubmitLabel, setEventSubmitLabel] = useState('');
  const [selectedEventPosterFile, setSelectedEventPosterFile] = useState<File | null>(null);
  const [eventPosterPreviewUrl, setEventPosterPreviewUrl] = useState('');
  const [editingEvent, setEditingEvent] = useState<EventSummary | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [registrationsEvent, setRegistrationsEvent] = useState<AdminEventRegistrationSummary | null>(null);
  const [eventRegistrations, setEventRegistrations] = useState<AdminEventRegistrationStudent[]>([]);
  const [registrationsLoading, setRegistrationsLoading] = useState(false);
  const [registrationsError, setRegistrationsError] = useState<AdminRequestError | null>(null);
  const [registrationsDownloading, setRegistrationsDownloading] = useState(false);
  const [weeklyContests, setWeeklyContests] = useState<AdminWeeklyContest[]>([]);
  const [weeklyContestsLoading, setWeeklyContestsLoading] = useState(true);
  const [weeklyContestsError, setWeeklyContestsError] = useState<AdminRequestError | null>(null);
  const [weeklyContestsNotice, setWeeklyContestsNotice] = useState<string | null>(null);
  const [weeklyContestForm, setWeeklyContestForm] = useState<WeeklyContestFormState>(emptyWeeklyContestForm);
  const [weeklyContestFormError, setWeeklyContestFormError] = useState<AdminRequestError | null>(null);
  const [weeklyContestSubmitting, setWeeklyContestSubmitting] = useState(false);
  const [editingWeeklyContest, setEditingWeeklyContest] = useState<AdminWeeklyContest | null>(null);
  const [isWeeklyContestModalOpen, setIsWeeklyContestModalOpen] = useState(false);
  const [attemptsContest, setAttemptsContest] = useState<AdminWeeklyContestAttemptSummary | null>(null);
  const [weeklyContestAttempts, setWeeklyContestAttempts] = useState<AdminWeeklyContestAttempt[]>([]);
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [attemptsError, setAttemptsError] = useState<AdminRequestError | null>(null);
  const [attemptsDownloading, setAttemptsDownloading] = useState(false);
  const [scoreAttempt, setScoreAttempt] = useState<AdminWeeklyContestAttempt | null>(null);
  const [contestScoreInput, setContestScoreInput] = useState('');
  const [scoreSubmitting, setScoreSubmitting] = useState(false);
  const [scoreError, setScoreError] = useState<AdminRequestError | null>(null);
  const [dpps, setDpps] = useState<AdminDpp[]>([]);
  const [dppsLoading, setDppsLoading] = useState(true);
  const [dppsError, setDppsError] = useState<AdminRequestError | null>(null);
  const [dppsNotice, setDppsNotice] = useState<string | null>(null);
  const [dppForm, setDppForm] = useState<DppFormState>(emptyDppForm);
  const [dppFormError, setDppFormError] = useState<AdminRequestError | null>(null);
  const [dppSubmitting, setDppSubmitting] = useState(false);
  const [editingDpp, setEditingDpp] = useState<AdminDpp | null>(null);
  const [isDppModalOpen, setIsDppModalOpen] = useState(false);
  const [dppOpensSummary, setDppOpensSummary] = useState<AdminDppOpenSummary | null>(null);
  const [dppOpens, setDppOpens] = useState<AdminDppOpenStudent[]>([]);
  const [dppOpensLoading, setDppOpensLoading] = useState(false);
  const [dppOpensError, setDppOpensError] = useState<AdminRequestError | null>(null);
  const [dppOpensDownloading, setDppOpensDownloading] = useState(false);
  const [dppScoreInputs, setDppScoreInputs] = useState<Record<string, string>>({});
  const [dppScoreErrors, setDppScoreErrors] = useState<Record<string, string>>({});
  const [dppScoreNotice, setDppScoreNotice] = useState<string | null>(null);
  const [pendingDppScoreStudentIds, setPendingDppScoreStudentIds] = useState<Record<string, boolean>>({});

  const [search, setSearch] = useState('');
  const [branch, setBranch] = useState('');
  const [year, setYear] = useState('');
  const [status, setStatus] = useState<StatusFilter>('');
  const [domain, setDomain] = useState<DomainFilter>('');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(search, 300);
  const debouncedBranch = useDebouncedValue(branch, 300);

  const loadOverview = useCallback(async (signal?: AbortSignal) => {
    setOverviewLoading(true);
    setOverviewError(null);

    try {
      const response = await getAdminOverview(signal);
      setOverview(response.overview);
    } catch (error) {
      if (!isAbortError(error)) {
        const requestError = classifyAdminError(error, 'Unable to load dashboard statistics.');
        if (isGlobalAuthorizationError(requestError)) {
          setGlobalAuthError((current) => current ?? requestError);
        } else {
          setOverviewError(requestError);
        }
      }
    } finally {
      if (!signal?.aborted) setOverviewLoading(false);
    }
  }, []);

  const loadRegistration = useCallback(async (signal?: AbortSignal) => {
    setRegistrationLoading(true);
    setRegistrationError(null);

    try {
      const response = await getAdminRegistrationSettings(signal);
      setRegistration(response.settings);
    } catch (error) {
      if (!isAbortError(error)) {
        const requestError = classifyAdminError(error, 'Unable to load registration settings.');
        if (isGlobalAuthorizationError(requestError)) {
          setGlobalAuthError((current) => current ?? requestError);
        } else {
          setRegistrationError(requestError);
        }
      }
    } finally {
      if (!signal?.aborted) setRegistrationLoading(false);
    }
  }, []);

  const loadEvents = useCallback(async (signal?: AbortSignal) => {
    setEventsLoading(true);
    setEventsError(null);

    try {
      const response = await getAdminEvents(signal);
      setEvents(response.events);
    } catch (error) {
      if (!isAbortError(error)) {
        const requestError = classifyAdminError(error, 'Unable to load events.');
        if (isGlobalAuthorizationError(requestError)) {
          setGlobalAuthError((current) => current ?? requestError);
        } else {
          setEventsError(requestError);
        }
      }
    } finally {
      if (!signal?.aborted) setEventsLoading(false);
    }
  }, []);

  const loadWeeklyContests = useCallback(async (signal?: AbortSignal) => {
    setWeeklyContestsLoading(true);
    setWeeklyContestsError(null);

    try {
      const response = await getAdminWeeklyContests(signal);
      setWeeklyContests(response.contests);
    } catch (error) {
      if (!isAbortError(error)) {
        const requestError = classifyAdminError(error, 'Unable to load weekly contests.');
        if (isGlobalAuthorizationError(requestError)) {
          setGlobalAuthError((current) => current ?? requestError);
        } else {
          setWeeklyContestsError(requestError);
        }
      }
    } finally {
      if (!signal?.aborted) setWeeklyContestsLoading(false);
    }
  }, []);

  const loadDpps = useCallback(async (signal?: AbortSignal) => {
    setDppsLoading(true);
    setDppsError(null);

    try {
      const response = await getAdminDpps(signal);
      setDpps(response.dpps);
    } catch (error) {
      if (!isAbortError(error)) {
        const requestError = classifyAdminError(error, 'Unable to load DPPs.');
        if (isGlobalAuthorizationError(requestError)) {
          setGlobalAuthError((current) => current ?? requestError);
        } else {
          setDppsError(requestError);
        }
      }
    } finally {
      if (!signal?.aborted) setDppsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadOverview(controller.signal);
    void loadRegistration(controller.signal);
    void loadEvents(controller.signal);
    void loadWeeklyContests(controller.signal);
    void loadDpps(controller.signal);
    return () => controller.abort();
  }, [loadDpps, loadEvents, loadOverview, loadRegistration, loadWeeklyContests]);

  useEffect(() => {
    const controller = new AbortController();
    setStudentsLoading(true);
    setStudentsError(null);

    void getAdminStudents(
      {
        page,
        limit: PAGE_LIMIT,
        search: debouncedSearch,
        branch: debouncedBranch,
        year: year ? Number(year) : undefined,
        status: status || undefined,
        domain: domain || undefined,
      },
      controller.signal,
    )
      .then((response) => {
        setStudents(response.students);
        setPagination(response.pagination);
      })
      .catch((error: unknown) => {
        if (!isAbortError(error)) {
          const requestError = classifyAdminError(error, 'Unable to load registered students.');
          if (isGlobalAuthorizationError(requestError)) {
            setGlobalAuthError((current) => current ?? requestError);
          } else {
            setStudentsError(requestError);
          }
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setStudentsLoading(false);
      });

    return () => controller.abort();
  }, [debouncedBranch, debouncedSearch, domain, page, status, studentRefreshToken, year]);

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
    setPage(1);
    setStudentsNotice(null);
  };

  const handleBranchChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setBranch(event.target.value);
    setPage(1);
    setStudentsNotice(null);
  };

  const handleDomainChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setDomain(event.target.value as DomainFilter);
    setPage(1);
    setStudentsNotice(null);
  };

  const handleRegistrationToggle = async () => {
    if (!registration || registrationPending) return;

    const nextOpen = !registration.studentRegistrationOpen;
    const normalizedMessage = registration.registrationMessage.trim();
    const nextMessage = nextOpen
      ? normalizedMessage === CLOSED_REGISTRATION_MESSAGE
        ? OPEN_REGISTRATION_MESSAGE
        : normalizedMessage
      : normalizedMessage === OPEN_REGISTRATION_MESSAGE
        ? CLOSED_REGISTRATION_MESSAGE
        : normalizedMessage;

    setRegistrationPending(true);
    setRegistrationError(null);
    setRegistrationNotice(null);

    try {
      const response = await updateAdminRegistrationSettings(nextOpen, nextMessage);
      setRegistration(response.settings);
      setRegistrationNotice(response.message);
      await loadOverview();
    } catch (error) {
      const requestError = classifyAdminError(error, 'Unable to update registration settings.');
      if (isGlobalAuthorizationError(requestError)) {
        setGlobalAuthError(requestError);
      } else {
        setRegistrationError(requestError);
      }
    } finally {
      setRegistrationPending(false);
    }
  };

  const handleStudentStatusChange = async (student: AdminStudent) => {
    const nextActive = !student.isActive;
    if (
      !nextActive &&
      !window.confirm(`Disable ${student.name}'s student account?`)
    ) {
      return;
    }

    setPendingStudentId(student.id);
    setStudentsError(null);
    setStudentsNotice(null);

    try {
      const response = await updateAdminStudentStatus(student.id, nextActive);
      setStudentsNotice(response.message);
      setStudentRefreshToken((current) => current + 1);
      await loadOverview();
    } catch (error) {
      const requestError = classifyAdminError(error, 'Unable to update the student status.');
      if (isGlobalAuthorizationError(requestError)) {
        setGlobalAuthError(requestError);
      } else {
        setStudentsError(requestError);
      }
    } finally {
      setPendingStudentId(null);
    }
  };

  const handleDownloadExcel = async () => {
    if (studentsExporting || pagination.total === 0) return;

    setStudentsExporting(true);
    setStudentsError(null);
    setStudentsNotice(null);

    try {
      const { blob, filename } = await downloadAdminStudentsExcel({
        search: debouncedSearch,
        branch: debouncedBranch,
        year: year ? Number(year) : undefined,
        status: status || undefined,
        domain: domain || undefined,
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      setStudentsNotice('Excel export downloaded successfully.');
    } catch (error) {
      const requestError = classifyAdminError(error, 'Unable to export students.');
      if (isGlobalAuthorizationError(requestError)) {
        setGlobalAuthError(requestError);
      } else {
        setStudentsError(requestError);
      }
    } finally {
      setStudentsExporting(false);
    }
  };

  const loadAwardStudentHistory = useCallback(async (studentId: string) => {
    setPointHistoryLoading(true);
    setAwardError(null);

    try {
      const response = await getAdminStudentPointHistory(studentId, 10);
      setSelectedAwardStudent(response.student);
      setPointHistory(response.transactions);
    } catch (error) {
      const requestError = classifyAdminError(error, 'Unable to load point activity.');
      if (isGlobalAuthorizationError(requestError)) {
        setGlobalAuthError(requestError);
      } else {
        setAwardError(requestError);
      }
    } finally {
      setPointHistoryLoading(false);
    }
  }, []);

  const handleAwardSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = awardSearchEmail.trim().toLowerCase();

    if (!normalizedEmail) {
      setAwardSearchError({ kind: 'api', message: 'Enter a college email to search.' });
      return;
    }

    setAwardSearchLoading(true);
    setAwardSearchError(null);
    setAwardNotice(null);
    setAwardSearchResults([]);
    setSelectedAwardStudent(null);
    setPointHistory([]);

    try {
      const response = await getAdminStudents({
        page: 1,
        limit: 5,
        search: normalizedEmail,
        status: 'active',
        sortBy: 'name',
        sortOrder: 'asc',
      });
      setAwardSearchResults(response.students);
      if (response.students.length === 0) {
        setAwardSearchError({ kind: 'api', message: 'No active student matched that email.' });
      }
    } catch (error) {
      const requestError = classifyAdminError(error, 'Unable to search students.');
      if (isGlobalAuthorizationError(requestError)) {
        setGlobalAuthError(requestError);
      } else {
        setAwardSearchError(requestError);
      }
    } finally {
      setAwardSearchLoading(false);
    }
  };

  const handleSelectAwardStudent = async (student: AdminStudent) => {
    setAwardSearchResults([]);
    setAwardError(null);
    setAwardNotice(null);
    await loadAwardStudentHistory(student.id);
  };

  const getAwardValidationMessage = () => {
    const points = Number(awardPoints);
    const description = awardDescription.trim();

    if (!selectedAwardStudent) return 'Select an active student first.';
    if (!awardPoints.trim() || !Number.isInteger(points) || points < 1 || points > 100000) {
      return 'Points must be a whole number from 1 to 100000.';
    }
    if (!description) return 'A reason or activity description is required.';
    if (description.length > 240) return 'Description cannot exceed 240 characters.';
    return null;
  };

  const handleOpenAwardConfirm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationMessage = getAwardValidationMessage();

    if (validationMessage) {
      setAwardError({ kind: 'api', message: validationMessage });
      return;
    }

    setAwardError(null);
    setIsAwardConfirmOpen(true);
  };

  const handleConfirmAward = async () => {
    if (!selectedAwardStudent || awardSubmitting) return;

    const validationMessage = getAwardValidationMessage();
    if (validationMessage) {
      setAwardError({ kind: 'api', message: validationMessage });
      setIsAwardConfirmOpen(false);
      return;
    }

    setAwardSubmitting(true);
    setAwardError(null);
    setAwardNotice(null);

    try {
      const response = await awardStudentPoints({
        studentId: selectedAwardStudent.id,
        points: Number(awardPoints),
        description: awardDescription.trim(),
      });
      setSelectedAwardStudent(response.student);
      setPointHistory((current) => [response.transaction, ...current].slice(0, 10));
      setAwardNotice(`${response.transaction.points} points awarded to ${response.student.name}.`);
      setAwardPoints('');
      setAwardDescription('');
      setIsAwardConfirmOpen(false);
    } catch (error) {
      const requestError = classifyAdminError(error, 'Unable to award points.');
      if (isGlobalAuthorizationError(requestError)) {
        setGlobalAuthError(requestError);
      } else {
        setAwardError(requestError);
      }
    } finally {
      setAwardSubmitting(false);
    }
  };

  const openEditPointTransactionModal = (transaction: AdminPointTransaction) => {
    if (!transaction.editable) return;
    setEditingPointTransaction(transaction);
    setEditAwardPoints(String(transaction.points));
    setEditAwardDescription(transaction.description ?? '');
    setEditAwardError(null);
    setAwardNotice(null);
  };

  const closeEditPointTransactionModal = () => {
    if (editAwardSubmitting) return;
    setEditingPointTransaction(null);
    setEditAwardPoints('');
    setEditAwardDescription('');
    setEditAwardError(null);
  };

  const getEditAwardValidationMessage = () => {
    const points = Number(editAwardPoints);
    const description = editAwardDescription.trim();

    if (!editingPointTransaction) return 'Select a point award to edit.';
    if (!editAwardPoints.trim() || !Number.isInteger(points) || points < 1 || points > 100000) {
      return 'Points must be a whole number from 1 to 100000.';
    }
    if (!description) return 'A reason or activity description is required.';
    if (description.length > 240) return 'Description cannot exceed 240 characters.';
    return null;
  };

  const handleSubmitEditPointTransaction = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingPointTransaction || editAwardSubmitting) return;

    const validationMessage = getEditAwardValidationMessage();
    if (validationMessage) {
      setEditAwardError({ kind: 'api', message: validationMessage });
      return;
    }

    setEditAwardSubmitting(true);
    setEditAwardError(null);
    setAwardNotice(null);

    try {
      const response = await updateManualPointTransaction({
        transactionId: editingPointTransaction.id,
        points: Number(editAwardPoints),
        description: editAwardDescription.trim(),
      });

      setSelectedAwardStudent(response.student);
      setPointHistory((current) =>
        current.map((transaction) =>
          transaction.id === response.transaction.id ? response.transaction : transaction
        )
      );
      setAwardNotice(`Point award updated for ${response.student.name}.`);
      closeEditPointTransactionModal();
    } catch (error) {
      const requestError = classifyAdminError(error, 'Unable to update point award.');
      if (isGlobalAuthorizationError(requestError)) {
        setGlobalAuthError(requestError);
      } else {
        setEditAwardError(requestError);
      }
    } finally {
      setEditAwardSubmitting(false);
    }
  };

  const openCreateEventModal = () => {
    setEditingEvent(null);
    setEventForm(emptyEventForm);
    setEventFormError(null);
    setSelectedEventPosterFile(null);
    setEventPosterPreviewUrl('');
    setEventSubmitLabel('');
    setIsEventModalOpen(true);
  };

  const openEditEventModal = (event: EventSummary) => {
    setEditingEvent(event);
    setEventForm({
      title: event.title,
      posterUrl: event.posterUrl,
      posterPublicId: event.posterPublicId ?? '',
      description: event.description,
      venue: event.venue,
      eventDate: toDateInputValue(event.eventDateTime),
      eventTime: toTimeInputValue(event.eventDateTime),
      eventEndDate: toDateInputValue(event.eventEndDateTime),
      eventEndTime: toTimeInputValue(event.eventEndDateTime),
      deadlineDate: toDateInputValue(event.registrationDeadline),
      deadlineTime: toTimeInputValue(event.registrationDeadline),
      maxRegistrations: String(event.maxRegistrations),
      active: event.active,
    });
    setEventFormError(null);
    setSelectedEventPosterFile(null);
    setEventPosterPreviewUrl(event.posterUrl);
    setEventSubmitLabel('');
    setIsEventModalOpen(true);
  };

  const closeEventModal = () => {
    if (eventSubmitting) return;
    setIsEventModalOpen(false);
    setEditingEvent(null);
    setEventForm(emptyEventForm);
    setSelectedEventPosterFile(null);
    setEventPosterPreviewUrl('');
    setEventSubmitLabel('');
    setEventFormError(null);
  };

  const handleEventFormChange = (
    field: keyof EventFormState,
    value: string | boolean
  ) => {
    setEventForm((current) => ({ ...current, [field]: value }));
    setEventFormError(null);
  };

  const handleEventPosterChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setSelectedEventPosterFile(null);
      setEventPosterPreviewUrl(editingEvent?.posterUrl ?? '');
      return;
    }

    if (!acceptedPosterTypes.has(file.type)) {
      setSelectedEventPosterFile(null);
      setEventFormError({
        kind: 'api',
        message: 'Poster must be a JPG, PNG, or WebP image.',
      });
      event.target.value = '';
      return;
    }

    if (file.size > MAX_POSTER_SIZE_BYTES) {
      setSelectedEventPosterFile(null);
      setEventFormError({
        kind: 'api',
        message: 'Poster image must be 5 MB or smaller.',
      });
      event.target.value = '';
      return;
    }

    setSelectedEventPosterFile(file);
    setEventPosterPreviewUrl(URL.createObjectURL(file));
    setEventFormError(null);
  };

  const handleEventSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingEvent && !selectedEventPosterFile) {
      setEventFormError({
        kind: 'api',
        message: 'Choose an event poster image.',
      });
      return;
    }

    const draftPayload = buildEventPayload(
      selectedEventPosterFile && !eventForm.posterUrl
        ? { ...eventForm, posterUrl: 'https://poster-upload.local/pending-image' }
        : eventForm
    );

    if (!draftPayload) {
      setEventFormError({
        kind: 'api',
        message: 'Fill all event fields with valid values.',
      });
      return;
    }

    if (new Date(draftPayload.eventEndDateTime) <= new Date(draftPayload.eventDateTime)) {
      setEventFormError({
        kind: 'api',
        message: 'Event end date and time must be after the event start date and time.',
      });
      return;
    }

    if (new Date(draftPayload.registrationDeadline) > new Date(draftPayload.eventDateTime)) {
      setEventFormError({
        kind: 'api',
        message: 'Registration deadline must be before or at the event start date and time.',
      });
      return;
    }

    setEventSubmitting(true);
    setEventSubmitLabel(selectedEventPosterFile ? 'Uploading poster...' : editingEvent ? 'Updating event...' : 'Creating event...');
    setEventFormError(null);
    setEventsNotice(null);
    setEventsError(null);

    try {
      let payload = draftPayload;

      if (selectedEventPosterFile) {
        const uploadResponse = await uploadAdminEventPoster(selectedEventPosterFile);
        payload = {
          ...draftPayload,
          posterUrl: uploadResponse.poster.url,
          posterPublicId: uploadResponse.poster.publicId,
        };
        setEventSubmitLabel(editingEvent ? 'Updating event...' : 'Creating event...');
      }

      const response = editingEvent
        ? await updateAdminEvent(editingEvent.id, payload)
        : await createAdminEvent(payload);

      setEvents((current) => {
        if (editingEvent) {
          return current.map((item) => item.id === response.event.id ? response.event : item);
        }

        return [response.event, ...current];
      });
      setEventsNotice(response.message ?? (editingEvent ? 'Event updated successfully.' : 'Event created successfully.'));
      setIsEventModalOpen(false);
      setEditingEvent(null);
      setEventForm(emptyEventForm);
      setSelectedEventPosterFile(null);
      setEventPosterPreviewUrl('');
    } catch (error) {
      const requestError = classifyAdminError(error, editingEvent ? 'Unable to update event.' : 'Unable to create event.');
      if (isGlobalAuthorizationError(requestError)) {
        setGlobalAuthError(requestError);
      } else {
        setEventFormError(requestError);
      }
    } finally {
      setEventSubmitting(false);
      setEventSubmitLabel('');
    }
  };

  const openRegistrationsModal = async (event: EventSummary) => {
    setRegistrationsEvent({
      id: event.id,
      title: event.title,
      registrationCount: event.registrationCount,
      maxRegistrations: event.maxRegistrations,
    });
    setEventRegistrations([]);
    setRegistrationsError(null);
    setRegistrationsLoading(true);

    try {
      const response = await getAdminEventRegistrations(event.id);
      setRegistrationsEvent(response.event);
      setEventRegistrations(response.registrations);
      setEvents((current) =>
        current.map((item) =>
          item.id === response.event.id
            ? {
                ...item,
                registrationCount: response.event.registrationCount,
                maxRegistrations: response.event.maxRegistrations,
              }
            : item
        )
      );
    } catch (error) {
      const requestError = classifyAdminError(error, 'Unable to load event registrations.');
      if (isGlobalAuthorizationError(requestError)) {
        setGlobalAuthError(requestError);
        setRegistrationsEvent(null);
      } else {
        setRegistrationsError(requestError);
      }
    } finally {
      setRegistrationsLoading(false);
    }
  };

  const closeRegistrationsModal = () => {
    if (registrationsDownloading) return;
    setRegistrationsEvent(null);
    setEventRegistrations([]);
    setRegistrationsError(null);
  };

  const handleDownloadEventRegistrations = async () => {
    if (!registrationsEvent || registrationsDownloading) return;

    setRegistrationsDownloading(true);
    setRegistrationsError(null);

    try {
      const { blob, filename } = await downloadAdminEventRegistrations(registrationsEvent.id);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      const requestError = classifyAdminError(error, 'Unable to download registrations.');
      if (isGlobalAuthorizationError(requestError)) {
        setGlobalAuthError(requestError);
        setRegistrationsEvent(null);
      } else {
        setRegistrationsError(requestError);
      }
    } finally {
      setRegistrationsDownloading(false);
    }
  };

  const openCreateWeeklyContestModal = () => {
    setEditingWeeklyContest(null);
    setWeeklyContestForm(emptyWeeklyContestForm);
    setWeeklyContestFormError(null);
    setIsWeeklyContestModalOpen(true);
  };

  const openEditWeeklyContestModal = (contest: AdminWeeklyContest) => {
    setEditingWeeklyContest(contest);
    setWeeklyContestForm({
      title: contest.title,
      description: contest.description ?? '',
      weekNumber: String(contest.weekNumber),
      contestUrl: contest.contestUrl,
      startDate: toDateInputValue(contest.startDateTime),
      startTime: toTimeInputValue(contest.startDateTime),
      endDate: toDateInputValue(contest.endDateTime),
      endTime: toTimeInputValue(contest.endDateTime),
      active: contest.active,
    });
    setWeeklyContestFormError(null);
    setIsWeeklyContestModalOpen(true);
  };

  const closeWeeklyContestModal = () => {
    if (weeklyContestSubmitting) return;
    setIsWeeklyContestModalOpen(false);
    setEditingWeeklyContest(null);
    setWeeklyContestForm(emptyWeeklyContestForm);
    setWeeklyContestFormError(null);
  };

  const handleWeeklyContestFormChange = (
    field: keyof WeeklyContestFormState,
    value: string | boolean
  ) => {
    setWeeklyContestForm((current) => ({ ...current, [field]: value }));
    setWeeklyContestFormError(null);
  };

  const handleWeeklyContestSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = buildWeeklyContestPayload(weeklyContestForm);
    if (!payload) {
      setWeeklyContestFormError({
        kind: 'api',
        message: 'Fill all weekly contest fields with valid values.',
      });
      return;
    }

    if (new Date(payload.endDateTime) <= new Date(payload.startDateTime)) {
      setWeeklyContestFormError({
        kind: 'api',
        message: 'Contest end date and time must be after the start date and time.',
      });
      return;
    }

    setWeeklyContestSubmitting(true);
    setWeeklyContestFormError(null);
    setWeeklyContestsNotice(null);
    setWeeklyContestsError(null);

    try {
      const response = editingWeeklyContest
        ? await updateAdminWeeklyContest(editingWeeklyContest.id, payload)
        : await createAdminWeeklyContest(payload);

      setWeeklyContests((current) => {
        if (editingWeeklyContest) {
          return current
            .map((contest) => contest.id === response.contest.id ? response.contest : contest)
            .sort((first, second) => first.weekNumber - second.weekNumber);
        }

        return [...current, response.contest].sort(
          (first, second) => first.weekNumber - second.weekNumber
        );
      });
      setWeeklyContestsNotice(response.message ?? 'Weekly contest saved successfully.');
      setIsWeeklyContestModalOpen(false);
      setEditingWeeklyContest(null);
      setWeeklyContestForm(emptyWeeklyContestForm);
      setWeeklyContestFormError(null);
    } catch (error) {
      const requestError = classifyAdminError(
        error,
        editingWeeklyContest ? 'Unable to update weekly contest.' : 'Unable to create weekly contest.'
      );
      if (isGlobalAuthorizationError(requestError)) {
        setGlobalAuthError(requestError);
      } else {
        setWeeklyContestFormError(requestError);
      }
    } finally {
      setWeeklyContestSubmitting(false);
    }
  };

  const openAttemptsModal = async (contest: AdminWeeklyContest) => {
    setAttemptsContest({
      id: contest.id,
      title: contest.title,
      weekNumber: contest.weekNumber,
      attemptCount: contest.attemptCount,
    });
    setWeeklyContestAttempts([]);
    setAttemptsError(null);
    setAttemptsLoading(true);

    try {
      const response = await getAdminWeeklyContestAttempts(contest.id);
      setAttemptsContest(response.contest);
      setWeeklyContestAttempts(response.attempts);
      setWeeklyContests((current) =>
        current.map((item) =>
          item.id === response.contest.id
            ? { ...item, attemptCount: response.contest.attemptCount }
            : item
        )
      );
    } catch (error) {
      const requestError = classifyAdminError(error, 'Unable to load contest attempts.');
      if (isGlobalAuthorizationError(requestError)) {
        setGlobalAuthError(requestError);
        setAttemptsContest(null);
      } else {
        setAttemptsError(requestError);
      }
    } finally {
      setAttemptsLoading(false);
    }
  };

  const closeAttemptsModal = () => {
    if (attemptsDownloading) return;
    setAttemptsContest(null);
    setWeeklyContestAttempts([]);
    setAttemptsError(null);
    setScoreAttempt(null);
    setScoreError(null);
  };

  const openScoreModal = (attempt: AdminWeeklyContestAttempt) => {
    setScoreAttempt(attempt);
    setContestScoreInput(attempt.contestScore === null ? '' : String(attempt.contestScore));
    setScoreError(null);
  };

  const closeScoreModal = () => {
    if (scoreSubmitting) return;
    setScoreAttempt(null);
    setContestScoreInput('');
    setScoreError(null);
  };

  const handleSubmitContestScore = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!attemptsContest || !scoreAttempt || scoreSubmitting) return;

    const score = Number(contestScoreInput);
    if (
      !/^(0|[1-9]\d*)$/.test(contestScoreInput.trim()) ||
      !Number.isInteger(score) ||
      score < 0 ||
      score > 100000
    ) {
      setScoreError({
        kind: 'api',
        message: 'Contest score must be a whole number from 0 to 100000.',
      });
      return;
    }

    setScoreSubmitting(true);
    setScoreError(null);
    setAttemptsError(null);

    try {
      const response = await upsertAdminWeeklyContestScore({
        contestId: attemptsContest.id,
        studentId: scoreAttempt.studentId,
        score,
      });
      setWeeklyContestAttempts((current) =>
        current.map((attempt) =>
          attempt.id === scoreAttempt.id
            ? { ...attempt, contestScore: response.score.contestScore }
            : attempt
        )
      );
      setScoreAttempt(null);
      setContestScoreInput('');
    } catch (error) {
      const requestError = classifyAdminError(error, 'Unable to save contest score.');
      if (isGlobalAuthorizationError(requestError)) {
        setGlobalAuthError(requestError);
        setScoreAttempt(null);
      } else {
        setScoreError(requestError);
      }
    } finally {
      setScoreSubmitting(false);
    }
  };

  const handleDownloadContestAttempts = async (
    contest: AdminWeeklyContest | AdminWeeklyContestAttemptSummary | null = attemptsContest
  ) => {
    if (!contest || attemptsDownloading) return;

    setAttemptsDownloading(true);
    setAttemptsError(null);
    setWeeklyContestsError(null);
    const isModalDownload = attemptsContest?.id === contest.id;

    try {
      const { blob, filename } = await downloadAdminWeeklyContestAttemptsExcel(contest.id);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      const requestError = classifyAdminError(error, 'Unable to download contest attempts.');
      if (isGlobalAuthorizationError(requestError)) {
        setGlobalAuthError(requestError);
        if (isModalDownload) setAttemptsContest(null);
      } else {
        if (isModalDownload) {
          setAttemptsError(requestError);
        } else {
          setWeeklyContestsError(requestError);
        }
      }
    } finally {
      setAttemptsDownloading(false);
    }
  };

  const openCreateDppModal = () => {
    setEditingDpp(null);
    setDppForm(emptyDppForm);
    setDppFormError(null);
    setIsDppModalOpen(true);
  };

  const openEditDppModal = (dpp: AdminDpp) => {
    setEditingDpp(dpp);
    setDppForm({
      type: dpp.type,
      title: dpp.title,
      url: dpp.url,
      description: dpp.description ?? '',
      active: dpp.active,
    });
    setDppFormError(null);
    setIsDppModalOpen(true);
  };

  const closeDppModal = () => {
    if (dppSubmitting) return;
    setIsDppModalOpen(false);
    setEditingDpp(null);
    setDppForm(emptyDppForm);
    setDppFormError(null);
  };

  const handleDppFormChange = (
    field: keyof DppFormState,
    value: string | boolean
  ) => {
    setDppForm((current) => ({ ...current, [field]: value }));
    setDppFormError(null);
  };

  const handleDppSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = buildDppPayload(dppForm);
    if (!payload) {
      setDppFormError({
        kind: 'api',
        message: 'Fill all DPP fields with valid values.',
      });
      return;
    }

    setDppSubmitting(true);
    setDppFormError(null);
    setDppsError(null);
    setDppsNotice(null);

    try {
      const response = editingDpp
        ? await updateAdminDpp(editingDpp.id, payload)
        : await createAdminDpp(payload);

      setDpps((current) => {
        const next = editingDpp
          ? current.map((dpp) => dpp.id === response.dpp.id ? response.dpp : dpp)
          : [response.dpp, ...current];

        return next.sort((first, second) => {
          if (first.type !== second.type) return first.type.localeCompare(second.type);
          return first.title.localeCompare(second.title);
        });
      });
      setDppsNotice(response.message ?? 'DPP saved successfully.');
      setIsDppModalOpen(false);
      setEditingDpp(null);
      setDppForm(emptyDppForm);
      setDppFormError(null);
    } catch (error) {
      const requestError = classifyAdminError(
        error,
        editingDpp ? 'Unable to update DPP.' : 'Unable to create DPP.'
      );
      if (isGlobalAuthorizationError(requestError)) {
        setGlobalAuthError(requestError);
      } else {
        setDppFormError(requestError);
      }
    } finally {
      setDppSubmitting(false);
    }
  };

  const openDppOpensModal = async (dpp: AdminDpp) => {
    setDppOpensSummary({
      id: dpp.id,
      type: dpp.type,
      title: dpp.title,
      firstOpenCount: dpp.firstOpenCount,
    });
    setDppOpens([]);
    setDppOpensError(null);
    setDppScoreErrors({});
    setDppScoreNotice(null);
    setDppOpensLoading(true);

    try {
      const response = await getAdminDppOpens(dpp.id);
      setDppOpensSummary(response.dpp);
      setDppOpens(response.opens);
      setDppScoreInputs(
        Object.fromEntries(
          response.opens.map((open) => [
            getDppOpenKey(open),
            open.aptitudeScore === null ? '' : String(open.aptitudeScore),
          ])
        )
      );
      setDpps((current) =>
        current.map((item) =>
          item.id === response.dpp.id
            ? { ...item, firstOpenCount: response.dpp.firstOpenCount }
            : item
        )
      );
    } catch (error) {
      const requestError = classifyAdminError(error, 'Unable to load DPP first opens.');
      if (isGlobalAuthorizationError(requestError)) {
        setGlobalAuthError(requestError);
        setDppOpensSummary(null);
      } else {
        setDppOpensError(requestError);
      }
    } finally {
      setDppOpensLoading(false);
    }
  };

  const closeDppOpensModal = () => {
    if (dppOpensDownloading) return;
    setDppOpensSummary(null);
    setDppOpens([]);
    setDppOpensError(null);
    setDppScoreInputs({});
    setDppScoreErrors({});
    setDppScoreNotice(null);
    setPendingDppScoreStudentIds({});
  };

  const handleDppScoreInputChange = (open: AdminDppOpenStudent, value: string) => {
    const key = getDppOpenKey(open);
    setDppScoreInputs((current) => ({ ...current, [key]: value }));
    setDppScoreErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    setDppScoreNotice(null);
  };

  const handleSaveDppScore = async (open: AdminDppOpenStudent) => {
    if (!dppOpensSummary || dppOpensSummary.type !== 'aptitude') return;

    const key = getDppOpenKey(open);
    const rawScore = dppScoreInputs[key] ?? '';
    const normalizedScore = rawScore.trim();

    if (open.studentId && pendingDppScoreStudentIds[open.studentId]) return;

    if (!open.studentId) {
      setDppScoreErrors((current) => ({
        ...current,
        [key]: 'Student id is unavailable for this open record.',
      }));
      return;
    }

    if (!/^(0|[1-9]\d*)$/.test(normalizedScore)) {
      setDppScoreErrors((current) => ({
        ...current,
        [key]: 'Score must be a whole number from 0 to 100000.',
      }));
      return;
    }

    const score = Number(normalizedScore);
    if (!Number.isInteger(score) || score < 0 || score > 100000) {
      setDppScoreErrors((current) => ({
        ...current,
        [key]: 'Score must be a whole number from 0 to 100000.',
      }));
      return;
    }

    setPendingDppScoreStudentIds((current) => ({
      ...current,
      [open.studentId as string]: true,
    }));
    setDppScoreNotice(null);
    setDppScoreErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });

    try {
      const response = await upsertAdminDppScore({
        dppId: dppOpensSummary.id,
        studentId: open.studentId,
        score,
      });
      setDppOpens((current) =>
        current.map((item) =>
          item.studentId === response.score.studentId
            ? { ...item, aptitudeScore: response.score.aptitudeScore }
            : item
        )
      );
      setDppScoreInputs((current) => ({
        ...current,
        [key]: String(response.score.aptitudeScore),
      }));
      setDppScoreNotice('Aptitude score saved.');
    } catch (error) {
      const requestError = classifyAdminError(error, 'Unable to save aptitude score.');
      if (isGlobalAuthorizationError(requestError)) {
        setGlobalAuthError(requestError);
      } else {
        setDppScoreErrors((current) => ({
          ...current,
          [key]: requestError.message,
        }));
      }
    } finally {
      if (open.studentId) {
        setPendingDppScoreStudentIds((current) => {
          const next = { ...current };
          delete next[open.studentId as string];
          return next;
        });
      }
    }
  };

  const renderDppScoreControls = (open: AdminDppOpenStudent) => {
    const key = getDppOpenKey(open);
    const isSaving = Boolean(open.studentId && pendingDppScoreStudentIds[open.studentId]);

    return (
      <div className="min-w-0 space-y-2">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="number"
            min={0}
            max={100000}
            step={1}
            value={dppScoreInputs[key] ?? ''}
            onChange={(event) => handleDppScoreInputChange(open, event.target.value)}
            placeholder="Score"
            className="min-h-10 w-full rounded-control border border-line-strong bg-surface/95 px-3 py-2 text-sm text-ink shadow-soft placeholder:text-ink-subtle focus:border-technical/60 focus:ring-2 focus:ring-technical/20 sm:w-28"
            aria-label={`Aptitude score for ${open.name}`}
          />
          <button
            type="button"
            className="btn btn-secondary min-h-10 rounded-full"
            onClick={() => void handleSaveDppScore(open)}
            disabled={isSaving || !open.studentId}
          >
            {isSaving && (
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            )}
            {isSaving ? 'Saving...' : open.aptitudeScore === null ? 'Save Score' : 'Update Score'}
          </button>
        </div>
        {dppScoreErrors[key] && (
          <p className="text-xs leading-5 text-rose-text" role="alert">
            {dppScoreErrors[key]}
          </p>
        )}
      </div>
    );
  };

  const handleDownloadDppOpens = async (
    dpp: AdminDpp | AdminDppOpenSummary | null = dppOpensSummary
  ) => {
    if (!dpp || dppOpensDownloading) return;

    setDppOpensDownloading(true);
    setDppOpensError(null);
    setDppsError(null);
    const isModalDownload = dppOpensSummary?.id === dpp.id;

    try {
      const { blob, filename } = await downloadAdminDppOpensExcel(dpp.id);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      const requestError = classifyAdminError(error, 'Unable to download DPP first opens.');
      if (isGlobalAuthorizationError(requestError)) {
        setGlobalAuthError(requestError);
        if (isModalDownload) setDppOpensSummary(null);
      } else {
        if (isModalDownload) {
          setDppOpensError(requestError);
        } else {
          setDppsError(requestError);
        }
      }
    } finally {
      setDppOpensDownloading(false);
    }
  };

  const handleGlobalRetry = () => {
    setGlobalAuthError(null);
    setOverviewError(null);
    setRegistrationError(null);
    setStudentsError(null);
    setEventsError(null);
    setWeeklyContestsError(null);
    setDppsError(null);
    void loadOverview();
    void loadRegistration();
    void loadEvents();
    void loadWeeklyContests();
    void loadDpps();
    setStudentRefreshToken((current) => current + 1);
  };

  const registrationOpensAt = formatDateTime(registration?.registrationOpensAt);
  const registrationClosesAt = formatDateTime(registration?.registrationClosesAt);
  const filtersActive = Boolean(search.trim() || branch.trim() || year || status || domain);
  const dppTypeLocked = Boolean(editingDpp && editingDpp.firstOpenCount > 0);

  return (
    <>
      {INAUGURATION_MODE && <InaugurationLaunch />}
      <PageTransition>
      <main className="relative isolate min-h-screen overflow-x-hidden bg-transparent text-ink">
        <div className="site-container-wide min-w-0 space-y-10 pb-section pt-24 sm:pt-28 lg:pt-32">
          <SectionReveal variant="fade" duration={0.42}>
            <header className="ui-panel-glass relative overflow-hidden px-5 py-6 sm:px-7 sm:py-7 lg:px-8">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-dream/10"
              />
              <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-rose-text">
                    Administration
                  </p>
                  <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                    Admin Dashboard
                  </h1>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-muted sm:text-base">
                    Monitor registrations and manage registered student access.
                  </p>
                </div>
                {overview && (
                  <div className="inline-flex min-h-11 w-fit items-center gap-2 rounded-full border border-dream/30 bg-dream/10 px-4 text-sm font-semibold text-dream-text">
                    <ShieldCheck className="size-4" aria-hidden="true" />
                    {overview.totalAdmins} {overview.totalAdmins === 1 ? 'administrator' : 'administrators'}
                  </div>
                )}
              </div>
            </header>
          </SectionReveal>

        {globalAuthError && (
          <section className="ui-panel-glass border-rose/30 p-5 sm:p-6" aria-labelledby="admin-access-error">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 id="admin-access-error" className="font-display text-xl font-semibold text-ink">
                  Admin access unavailable
                </h2>
                <div className="mt-3">
                  <InlineFeedback kind="error">{globalAuthError.message}</InlineFeedback>
                </div>
              </div>
              <button type="button" onClick={handleGlobalRetry} className="btn btn-secondary shrink-0">
                <RefreshCw className="size-4" aria-hidden="true" />
                Retry dashboard
              </button>
            </div>
          </section>
        )}

        {!globalAuthError && (
          <>
        <SectionReveal delay={0.03} duration={0.42}>
        <section aria-labelledby="overview-heading">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 id="overview-heading" className="font-display text-2xl font-semibold text-ink sm:text-3xl">
              Overview
            </h2>
            {overviewError && (
              <button type="button" onClick={() => void loadOverview()} className="btn btn-secondary">
                <RefreshCw className="size-4" aria-hidden="true" />
                Retry
              </button>
            )}
          </div>

          {overviewLoading && !overview ? (
            <LoadingState label="Loading dashboard statistics..." />
          ) : overviewError && !overview ? (
            <InlineFeedback kind="error">{overviewError.message}</InlineFeedback>
          ) : overview ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <SectionReveal delay={0.02} duration={0.38} className="h-full">
                  <StatCard label="Total Students" value={overview.totalStudents} icon={<Users className="size-5" aria-hidden="true" />} detail={`${overview.verifiedStudents} email verified`} accent={statAccents.primary} />
                </SectionReveal>
                <SectionReveal delay={0.05} duration={0.38} className="h-full">
                  <StatCard label="Active Students" value={overview.activeStudents} icon={<UserCheck className="size-5" aria-hidden="true" />} accent={statAccents.dream} />
                </SectionReveal>
                <SectionReveal delay={0.08} duration={0.38} className="h-full">
                  <StatCard label="Inactive Students" value={overview.inactiveStudents} icon={<UserX className="size-5" aria-hidden="true" />} accent={statAccents.rose} />
                </SectionReveal>
                <SectionReveal delay={0.11} duration={0.38} className="h-full">
                  <StatCard label="Registration Status" value={overview.registrationOpen ? 'OPEN' : 'CLOSED'} icon={<DoorOpen className="size-5" aria-hidden="true" />} detail="Live registration availability" accent={statAccents.technical} />
                </SectionReveal>
              </div>

              <div className="mt-6 border-t border-line/80 pt-6">
                <h3 className="font-display text-xl font-semibold text-ink">
                  Domain Registrations
                </h3>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <SectionReveal delay={0.14} duration={0.38} className="h-full">
                    <StatCard label="Web Development" value={overview.domainCounts.webDevelopment} icon={<Code2 className="size-5" aria-hidden="true" />} detail="Registered students" accent={statAccents.technical} />
                  </SectionReveal>
                  <SectionReveal delay={0.17} duration={0.38} className="h-full">
                    <StatCard label="DSA" value={overview.domainCounts.dsa} icon={<GitBranch className="size-5" aria-hidden="true" />} detail="Registered students" accent={statAccents.dream} />
                  </SectionReveal>
                  <SectionReveal delay={0.2} duration={0.38} className="h-full">
                    <StatCard label="Aptitude" value={overview.domainCounts.aptitude} icon={<Brain className="size-5" aria-hidden="true" />} detail="Registered students" accent={statAccents.primary} />
                  </SectionReveal>
                </div>
              </div>
            </>
          ) : null}
        </section>
        </SectionReveal>

        <SectionReveal delay={0.05} duration={0.42}>
        <section aria-labelledby="registration-heading" className="overflow-hidden rounded-card border border-line/80 bg-surface/90 shadow-soft">
          <div className="border-b border-line/80 bg-dream-soft/30 p-5 sm:p-6">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-dream-text">
              Registration Control
            </p>
            <h2 id="registration-heading" className="mt-1 font-display text-2xl font-semibold text-ink">
              Student Registration
            </h2>
          </div>

          <div className="p-5 sm:p-6">
            {registrationLoading && !registration ? (
              <LoadingState label="Loading registration settings..." />
            ) : registrationError && !registration ? (
              <div className="space-y-4">
                <InlineFeedback kind="error">{registrationError.message}</InlineFeedback>
                <button type="button" onClick={() => void loadRegistration()} className="btn btn-secondary">
                  <RefreshCw className="size-4" aria-hidden="true" />
                  Retry settings
                </button>
              </div>
            ) : registration ? (
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 max-w-3xl">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`inline-flex min-h-9 items-center rounded-full border px-3 font-mono text-xs font-bold tracking-[0.12em] ${
                      registration.registrationOpen
                        ? 'border-dream/40 bg-dream/10 text-dream-text'
                        : 'border-rose/40 bg-rose/10 text-rose-text'
                    }`}>
                      {registration.registrationOpen ? 'OPEN' : 'CLOSED'}
                    </span>
                    <span className="text-xs text-ink-subtle">
                      Updated {formatDateTime(registration.updatedAt) ?? 'recently'}
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-ink-muted">
                    {registration.registrationMessage}
                  </p>
                  {(registrationOpensAt || registrationClosesAt) && (
                    <dl className="mt-4 grid gap-2 text-sm text-ink-muted sm:grid-cols-2">
                      {registrationOpensAt && <div><dt className="font-semibold text-ink">Opens</dt><dd>{registrationOpensAt}</dd></div>}
                      {registrationClosesAt && <div><dt className="font-semibold text-ink">Closes</dt><dd>{registrationClosesAt}</dd></div>}
                    </dl>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => void handleRegistrationToggle()}
                  disabled={registrationPending}
                  className="btn btn-primary w-full shrink-0 disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit"
                >
                  {registrationPending ? (
                    <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  ) : registration.studentRegistrationOpen ? (
                    <UserX className="size-4" aria-hidden="true" />
                  ) : (
                    <UserCheck className="size-4" aria-hidden="true" />
                  )}
                  {registrationPending
                    ? 'Updating...'
                    : registration.studentRegistrationOpen
                      ? 'Close Registration'
                      : 'Open Registration'}
                </button>
              </div>
            ) : null}

            {(registrationError || registrationNotice) && registration && (
              <div className="mt-5">
                {registrationError ? (
                  <InlineFeedback kind="error">{registrationError.message}</InlineFeedback>
                ) : registrationNotice ? (
                  <InlineFeedback kind="success">{registrationNotice}</InlineFeedback>
                ) : null}
              </div>
            )}
          </div>
        </section>
        </SectionReveal>

        <SectionReveal delay={0.06} duration={0.42}>
        <section aria-labelledby="events-management-heading" className="overflow-hidden rounded-card border border-line/80 bg-surface/90 shadow-soft">
          <div className="border-b border-line/80 bg-dream-soft/30 p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-primary-text">
                  Events &amp; Tracks
                </p>
                <h2 id="events-management-heading" className="mt-1 font-display text-2xl font-semibold text-ink">
                  Manage Events
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-muted">
                  Create workshops, manage event registration windows, and monitor live capacity.
                </p>
              </div>
              <button type="button" onClick={openCreateEventModal} className="btn btn-primary w-full justify-center sm:w-fit">
                <PlusCircle className="size-4" aria-hidden="true" />
                Add Event
              </button>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {(eventsError || eventsNotice) && (
              <div className="mb-5">
                {eventsError ? (
                  <InlineFeedback kind="error">{eventsError.message}</InlineFeedback>
                ) : eventsNotice ? (
                  <InlineFeedback kind="success">{eventsNotice}</InlineFeedback>
                ) : null}
              </div>
            )}

            {eventsLoading && events.length === 0 ? (
              <LoadingState label="Loading events..." />
            ) : eventsError && events.length === 0 ? (
              <button type="button" onClick={() => void loadEvents()} className="btn btn-secondary">
                <RefreshCw className="size-4" aria-hidden="true" />
                Retry events
              </button>
            ) : events.length === 0 ? (
              <div className="rounded-card border border-line/80 bg-surface/80 p-8 text-center text-sm text-ink-muted">
                No events have been created yet.
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {events.map((event) => (
                  <article key={event.id} className="rounded-card border border-line/80 bg-glass/60 p-4 shadow-soft">
                    <div className="grid gap-4 sm:grid-cols-[8rem_minmax(0,1fr)]">
                      <div className="aspect-[16/10] overflow-hidden rounded-control border border-line bg-surface-muted">
                        <img
                          src={event.posterUrl}
                          alt={`${event.title} poster`}
                          className="size-full object-cover"
                          loading="lazy"
                          onError={(imageEvent) => {
                            imageEvent.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="break-words font-display text-lg font-semibold text-ink">
                              {event.title}
                            </h3>
                            <p className="mt-1 text-sm text-ink-muted">{formatDateTime(event.eventDateTime)}</p>
                          </div>
                          <span className={`inline-flex min-h-8 items-center rounded-full border px-3 font-mono text-xs font-bold ${getEventStatusClasses(event)}`}>
                            {getEventStatusLabel(event)}
                          </span>
                        </div>

                        <dl className="mt-4 grid gap-3 text-sm text-ink-muted sm:grid-cols-2">
                          <div>
                            <dt className="font-semibold text-ink">Venue</dt>
                            <dd>{event.venue}</dd>
                          </div>
                          <div>
                            <dt className="font-semibold text-ink">Registrations</dt>
                            <dd>{event.registrationCount} / {event.maxRegistrations}</dd>
                          </div>
                          <div>
                            <dt className="font-semibold text-ink">Ends</dt>
                            <dd>{event.eventEndDateTime ? formatDateTime(event.eventEndDateTime) : 'Legacy event'}</dd>
                          </div>
                          <div>
                            <dt className="font-semibold text-ink">Deadline</dt>
                            <dd>{formatDateTime(event.registrationDeadline)}</dd>
                          </div>
                        </dl>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button type="button" onClick={() => void openRegistrationsModal(event)} className="btn btn-secondary rounded-full">
                            <Users className="size-4" aria-hidden="true" />
                            View Registrations
                          </button>
                          <button type="button" onClick={() => openEditEventModal(event)} className="btn btn-secondary rounded-full">
                            <Pencil className="size-4" aria-hidden="true" />
                            Edit
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
        </SectionReveal>

        <SectionReveal delay={0.065} duration={0.42}>
        <section aria-labelledby="weekly-contests-heading" className="overflow-hidden rounded-card border border-line/80 bg-surface/90 shadow-soft">
          <div className="border-b border-line/80 bg-dream-soft/30 p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-dream-text">
                  Weekly Contests
                </p>
                <h2 id="weekly-contests-heading" className="mt-1 font-display text-2xl font-semibold text-ink">
                  Manage Weekly Contests
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-muted">
                  Schedule official weekly contest links and review recorded first-click attempts.
                </p>
              </div>
              <button type="button" onClick={openCreateWeeklyContestModal} className="btn btn-primary w-full justify-center sm:w-fit">
                <PlusCircle className="size-4" aria-hidden="true" />
                Add Weekly Contest
              </button>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {(weeklyContestsError || weeklyContestsNotice) && (
              <div className="mb-5">
                {weeklyContestsError ? (
                  <InlineFeedback kind="error">{weeklyContestsError.message}</InlineFeedback>
                ) : weeklyContestsNotice ? (
                  <InlineFeedback kind="success">{weeklyContestsNotice}</InlineFeedback>
                ) : null}
              </div>
            )}

            {weeklyContestsLoading && weeklyContests.length === 0 ? (
              <LoadingState label="Loading weekly contests..." />
            ) : weeklyContestsError && weeklyContests.length === 0 ? (
              <button type="button" onClick={() => void loadWeeklyContests()} className="btn btn-secondary">
                <RefreshCw className="size-4" aria-hidden="true" />
                Retry weekly contests
              </button>
            ) : weeklyContests.length === 0 ? (
              <div className="rounded-card border border-line/80 bg-surface/80 p-8 text-center text-sm text-ink-muted">
                No weekly contests have been created yet.
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {weeklyContests.map((contest) => (
                  <article key={contest.id} className="rounded-card border border-line/80 bg-glass/60 p-4 shadow-soft">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <span className="inline-flex min-h-8 items-center rounded-full border border-dream/30 bg-dream/10 px-3 font-mono text-xs font-bold text-dream-text">
                          Week {contest.weekNumber}
                        </span>
                        <h3 className="mt-3 break-words font-display text-lg font-semibold text-ink">
                          {contest.title}
                        </h3>
                        {contest.description && (
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink-muted">
                            {contest.description}
                          </p>
                        )}
                      </div>
                      <span className={`inline-flex min-h-8 w-fit items-center rounded-full border px-3 font-mono text-xs font-bold ${getWeeklyContestStatusClasses(contest)}`}>
                        {getWeeklyContestStatusLabel(contest)}
                      </span>
                    </div>

                    <dl className="mt-4 grid gap-3 text-sm text-ink-muted sm:grid-cols-2">
                      <div>
                        <dt className="font-semibold text-ink">Starts</dt>
                        <dd>{formatDateTime(contest.startDateTime)}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-ink">Ends</dt>
                        <dd>{formatDateTime(contest.endDateTime)}</dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="font-semibold text-ink">Recorded Attempts</dt>
                        <dd>{contest.attemptCount}</dd>
                      </div>
                    </dl>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="button" onClick={() => void openAttemptsModal(contest)} className="btn btn-secondary rounded-full">
                        <Users className="size-4" aria-hidden="true" />
                        View Attempts
                      </button>
                      <button type="button" onClick={() => void handleDownloadContestAttempts(contest)} className="btn btn-secondary rounded-full" disabled={attemptsDownloading}>
                        <FileSpreadsheet className="size-4" aria-hidden="true" />
                        {attemptsDownloading ? 'Downloading...' : 'Download Excel'}
                      </button>
                      <button type="button" onClick={() => openEditWeeklyContestModal(contest)} className="btn btn-secondary rounded-full">
                        <Pencil className="size-4" aria-hidden="true" />
                        Edit
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
        </SectionReveal>

        <SectionReveal delay={0.068} duration={0.42}>
        <section aria-labelledby="dpp-management-heading" className="overflow-hidden rounded-card border border-line/80 bg-surface/90 shadow-soft">
          <div className="border-b border-line/80 bg-dream-soft/30 p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-technical-text">
                  DSA &amp; Aptitude
                </p>
                <h2 id="dpp-management-heading" className="mt-1 font-display text-2xl font-semibold text-ink">
                  Manage DPPs
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-muted">
                  Create practice problem links, track first opens, and export student participation records.
                </p>
              </div>
              <button type="button" onClick={openCreateDppModal} className="btn btn-primary w-full justify-center sm:w-fit">
                <PlusCircle className="size-4" aria-hidden="true" />
                Add DPP
              </button>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {(dppsError || dppsNotice) && (
              <div className="mb-5">
                {dppsError ? (
                  <InlineFeedback kind="error">{dppsError.message}</InlineFeedback>
                ) : dppsNotice ? (
                  <InlineFeedback kind="success">{dppsNotice}</InlineFeedback>
                ) : null}
              </div>
            )}

            {dppsLoading && dpps.length === 0 ? (
              <LoadingState label="Loading DPPs..." />
            ) : dppsError && dpps.length === 0 ? (
              <button type="button" onClick={() => void loadDpps()} className="btn btn-secondary">
                <RefreshCw className="size-4" aria-hidden="true" />
                Retry DPPs
              </button>
            ) : dpps.length === 0 ? (
              <div className="rounded-card border border-line/80 bg-surface/80 p-8 text-center text-sm text-ink-muted">
                No DPPs have been created yet.
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {dpps.map((dpp) => (
                  <article key={dpp.id} className="rounded-card border border-line/80 bg-glass/60 p-4 shadow-soft">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <span className={`inline-flex min-h-8 items-center rounded-full border px-3 font-mono text-xs font-bold ${getDppTypeClasses(dpp.type)}`}>
                          {getDppTypeLabel(dpp.type)}
                        </span>
                        <h3 className="mt-3 break-words font-display text-lg font-semibold text-ink">
                          {dpp.title}
                        </h3>
                        {dpp.description && (
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink-muted">
                            {dpp.description}
                          </p>
                        )}
                      </div>
                      <span className={`inline-flex min-h-8 w-fit items-center rounded-full border px-3 font-mono text-xs font-bold ${
                        dpp.active
                          ? 'border-dream/35 bg-dream/10 text-dream-text'
                          : 'border-rose/35 bg-rose/10 text-rose-text'
                      }`}>
                        {dpp.active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </div>

                    <dl className="mt-4 grid gap-3 text-sm text-ink-muted sm:grid-cols-2">
                      <div>
                        <dt className="font-semibold text-ink">First Opens</dt>
                        <dd>{dpp.firstOpenCount}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-ink">Updated</dt>
                        <dd>{formatDateTime(dpp.updatedAt)}</dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="font-semibold text-ink">External Link</dt>
                        <dd className="mt-1">
                          <a
                            href={dpp.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex max-w-full items-center gap-2 break-all text-technical-text underline decoration-line underline-offset-4 hover:text-primary-text"
                          >
                            Open DPP link
                            <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
                          </a>
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="button" onClick={() => void openDppOpensModal(dpp)} className="btn btn-secondary rounded-full">
                        <Users className="size-4" aria-hidden="true" />
                        View Opens
                      </button>
                      <button type="button" onClick={() => void handleDownloadDppOpens(dpp)} className="btn btn-secondary rounded-full" disabled={dppOpensDownloading}>
                        <FileSpreadsheet className="size-4" aria-hidden="true" />
                        {dppOpensDownloading ? 'Downloading...' : 'Download Excel'}
                      </button>
                      <button type="button" onClick={() => openEditDppModal(dpp)} className="btn btn-secondary rounded-full">
                        <Pencil className="size-4" aria-hidden="true" />
                        Edit
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
        </SectionReveal>

        <SectionReveal delay={0.07} duration={0.42}>
        <section aria-labelledby="award-points-heading" className="overflow-hidden rounded-card border border-line/80 bg-surface/90 shadow-soft">
          <div className="border-b border-line/80 bg-dream-soft/30 p-5 sm:p-6">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-technical-text">
              Leaderboard Points
            </p>
            <h2 id="award-points-heading" className="mt-1 font-display text-2xl font-semibold text-ink">
              Award Student Points
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-muted">
              Search by registered college email, verify the student, then record a new point transaction.
            </p>
          </div>

          <div className="grid gap-5 p-5 sm:p-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="space-y-4">
              <form onSubmit={handleAwardSearch} className="rounded-card border border-line/80 bg-glass/60 p-4 shadow-soft">
                <label htmlFor="award-student-email" className="block text-sm font-semibold text-ink">
                  Search Student
                </label>
                <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                  <span className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" aria-hidden="true" />
                    <input
                      id="award-student-email"
                      type="email"
                      value={awardSearchEmail}
                      onChange={(event) => {
                        setAwardSearchEmail(event.target.value);
                        setAwardSearchError(null);
                      }}
                      placeholder="Search by college email"
                      className="min-h-11 w-full rounded-control border border-line-strong bg-surface/95 py-2 pl-10 pr-3 text-sm text-ink shadow-soft placeholder:text-ink-subtle focus:border-technical/60 focus:ring-2 focus:ring-technical/20"
                    />
                  </span>
                  <button type="submit" className="btn btn-primary shrink-0" disabled={awardSearchLoading}>
                    {awardSearchLoading ? (
                      <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                    ) : (
                      <Search className="size-4" aria-hidden="true" />
                    )}
                    {awardSearchLoading ? 'Searching...' : 'Search'}
                  </button>
                </div>
              </form>

              {awardSearchError && <InlineFeedback kind="error">{awardSearchError.message}</InlineFeedback>}

              {awardSearchResults.length > 0 && (
                <div className="rounded-card border border-line/80 bg-surface/80 p-3 shadow-soft">
                  <p className="px-1 pb-2 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ink-subtle">
                    Search Results
                  </p>
                  <div className="grid gap-2">
                    {awardSearchResults.map((student) => (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() => void handleSelectAwardStudent(student)}
                        className="rounded-control border border-line/80 bg-glass/60 p-3 text-left transition hover:border-technical/45 hover:bg-technical/10 focus-visible:outline-offset-2"
                      >
                        <span className="block font-semibold text-ink">{student.name}</span>
                        <span className="mt-1 block break-words text-sm text-ink-muted">{student.email}</span>
                        <span className="mt-2 block font-mono text-xs font-semibold text-ink-subtle">
                          {student.usn} • {student.branch} • Year {student.year}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedAwardStudent && (
                <div className="rounded-card border border-technical/25 bg-technical/10 p-4 shadow-soft">
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-control border border-technical/25 bg-technical/10 text-technical-text">
                      <Trophy className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-display text-lg font-semibold text-ink">
                        {selectedAwardStudent.name}
                      </h3>
                      <p className="mt-1 break-words text-sm text-ink-muted">
                        {selectedAwardStudent.email}
                      </p>
                      <p className="mt-2 font-mono text-xs font-semibold text-ink-subtle">
                        {selectedAwardStudent.usn} • {selectedAwardStudent.branch} • Year {selectedAwardStudent.year}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-card border border-line/80 bg-surface/80 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-subtle">
                        Current Points
                      </p>
                      <p className="mt-1 text-3xl font-semibold tabular-nums text-primary-text">
                        {selectedAwardStudent.totalPoints}
                      </p>
                    </div>
                    <div className="rounded-card border border-line/80 bg-surface/80 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-subtle">
                        Overall Rank
                      </p>
                      <p className="mt-1 text-3xl font-semibold tabular-nums text-primary-text">
                        {selectedAwardStudent.overallRank ? `#${selectedAwardStudent.overallRank}` : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <form onSubmit={handleOpenAwardConfirm} className="rounded-card border border-line/80 bg-glass/60 p-4 shadow-soft">
                <div className="grid gap-4 sm:grid-cols-[minmax(0,0.45fr)_minmax(0,1fr)]">
                  <label>
                    <span className="mb-2 block text-sm font-semibold text-ink">Points to Award</span>
                    <input
                      type="number"
                      min={1}
                      max={100000}
                      step={1}
                      value={awardPoints}
                      onChange={(event) => {
                        setAwardPoints(event.target.value);
                        setAwardError(null);
                      }}
                      placeholder="20"
                      className="min-h-11 w-full rounded-control border border-line-strong bg-surface/95 px-3 py-2 text-sm text-ink shadow-soft placeholder:text-ink-subtle focus:border-technical/60 focus:ring-2 focus:ring-technical/20"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-semibold text-ink">Reason / Activity</span>
                    <input
                      type="text"
                      value={awardDescription}
                      onChange={(event) => {
                        setAwardDescription(event.target.value);
                        setAwardError(null);
                      }}
                      maxLength={240}
                      placeholder="Participated in HackerEarth workshop"
                      className="min-h-11 w-full rounded-control border border-line-strong bg-surface/95 px-3 py-2 text-sm text-ink shadow-soft placeholder:text-ink-subtle focus:border-technical/60 focus:ring-2 focus:ring-technical/20"
                    />
                  </label>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary mt-4 w-full justify-center sm:w-fit"
                  disabled={!selectedAwardStudent || awardSubmitting}
                >
                  <PlusCircle className="size-4" aria-hidden="true" />
                  Award Points
                </button>
              </form>

              {(awardError || awardNotice) && (
                awardError ? (
                  <InlineFeedback kind="error">{awardError.message}</InlineFeedback>
                ) : awardNotice ? (
                  <InlineFeedback kind="success">{awardNotice}</InlineFeedback>
                ) : null
              )}

              <div className="rounded-card border border-line/80 bg-surface/80 p-4 shadow-soft">
                <div className="flex items-center gap-2">
                  <History className="size-4 text-dream-text" aria-hidden="true" />
                  <h3 className="font-display text-lg font-semibold text-ink">
                    Recent Point Activity
                  </h3>
                </div>

                {pointHistoryLoading ? (
                  <div className="mt-4">
                    <LoadingState label="Loading point activity..." />
                  </div>
                ) : selectedAwardStudent ? (
                  pointHistory.length > 0 ? (
                    <ul className="mt-4 divide-y divide-line/70">
                      {pointHistory.map((transaction) => (
                        <li key={transaction.id} className="flex gap-3 py-3">
                          <span className="font-mono text-sm font-bold text-success-text">
                            +{transaction.points}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-ink">
                              {transaction.description || 'Point award'}
                            </span>
                            <span className="mt-1 block text-xs text-ink-subtle">
                              {formatShortDate(transaction.createdAt)}
                              {transaction.awardedBy?.name ? ` • by ${transaction.awardedBy.name}` : ''}
                            </span>
                          </span>
                          {transaction.editable && (
                            <button
                              type="button"
                              className="btn btn-secondary min-h-9 shrink-0 rounded-full px-3 text-xs"
                              onClick={() => openEditPointTransactionModal(transaction)}
                            >
                              <Pencil className="size-3.5" aria-hidden="true" />
                              Edit
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-4 text-sm leading-6 text-ink-muted">
                      No point activity yet.
                    </p>
                  )
                ) : (
                  <p className="mt-4 text-sm leading-6 text-ink-muted">
                    Select a student to view recent manual point awards.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
        </SectionReveal>

        <SectionReveal delay={0.07} duration={0.42}>
        <section aria-labelledby="students-heading" className="min-w-0">
          <div className="mb-5">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-rose-text">
              Registered Students
            </p>
            <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="students-heading" className="font-display text-2xl font-semibold text-ink sm:text-3xl">
                  Student Directory
                </h2>
                <p className="mt-2 text-sm text-ink-muted" aria-live="polite">
                  {pagination.total} {pagination.total === 1 ? 'student' : 'students'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleDownloadExcel()}
                  className="btn min-h-11 rounded-full border border-creative/30 bg-creative/10 px-4 text-creative-text hover:bg-creative/20"
                  disabled={studentsLoading || studentsExporting || pagination.total === 0}
                >
                  {studentsExporting ? (
                    <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  ) : (
                    <FileSpreadsheet className="size-4" aria-hidden="true" />
                  )}
                  {studentsExporting ? 'Preparing Excel...' : 'Download Excel'}
                </button>
                <button
                  type="button"
                  onClick={() => setStudentRefreshToken((current) => current + 1)}
                  className="btn btn-secondary rounded-full"
                  disabled={studentsLoading}
                >
                  <RefreshCw className={`size-4 ${studentsLoading ? 'animate-spin motion-reduce:animate-none' : ''}`} aria-hidden="true" />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          <div className="min-w-0 rounded-card border border-line/80 bg-surface/90 p-4 shadow-soft sm:p-5">
            <div className="grid min-w-0 gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-[minmax(15rem,1fr)_minmax(10rem,0.5fr)_9rem_10rem_minmax(12rem,0.6fr)]">
              <label className="min-w-0 md:col-span-2 lg:col-span-1">
                <span className="mb-2 block text-sm font-semibold text-ink">Search students</span>
                <span className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" aria-hidden="true" />
                  <input
                    type="search"
                    value={search}
                    onChange={handleSearchChange}
                    placeholder="Search students..."
                    className="min-h-11 w-full rounded-control border border-line-strong bg-glass/70 py-2 pl-10 pr-3 text-sm text-ink shadow-soft placeholder:text-ink-subtle focus:border-rose/60 focus:ring-2 focus:ring-rose/20"
                  />
                </span>
              </label>

              <label className="min-w-0">
                <span className="mb-2 block text-sm font-semibold text-ink">Branch</span>
                <select
                  value={branch}
                  onChange={handleBranchChange}
                  className="min-h-11 w-full rounded-control border border-line-strong bg-surface/95 px-3 py-2 text-sm text-ink shadow-soft focus:border-rose/60 focus:ring-2 focus:ring-rose/20 [&>option]:bg-surface [&>option]:text-ink"
                >
                  <option value="">All branches</option>
                  {registrationBranchOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-2 block text-sm font-semibold text-ink">Year</span>
                <select
                  value={year}
                  onChange={(event) => { setYear(event.target.value); setPage(1); setStudentsNotice(null); }}
                  className="min-h-11 w-full rounded-control border border-line-strong bg-glass/70 px-3 py-2 text-sm text-ink shadow-soft focus:border-rose/60 focus:ring-2 focus:ring-rose/20"
                >
                  <option value="">All years</option>
                  {[1, 2, 3, 4].map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>

              <label>
                <span className="mb-2 block text-sm font-semibold text-ink">Status</span>
                <select
                  value={status}
                  onChange={(event) => { setStatus(event.target.value as StatusFilter); setPage(1); setStudentsNotice(null); }}
                  className="min-h-11 w-full rounded-control border border-line-strong bg-glass/70 px-3 py-2 text-sm text-ink shadow-soft focus:border-rose/60 focus:ring-2 focus:ring-rose/20"
                >
                  <option value="">All statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>

              <label>
                <span className="mb-2 block text-sm font-semibold text-ink">Domain</span>
                <select
                  value={domain}
                  onChange={handleDomainChange}
                  className="min-h-11 w-full rounded-control border border-line-strong bg-glass/70 px-3 py-2 text-sm text-ink shadow-soft focus:border-rose/60 focus:ring-2 focus:ring-rose/20"
                >
                  {domainFilterOptions.map((option) => (
                    <option key={option.label} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {(studentsError || studentsNotice) && (
            <div className="mt-4">
              {studentsError ? (
                <InlineFeedback kind="error">{studentsError.message}</InlineFeedback>
              ) : studentsNotice ? (
                <InlineFeedback kind="success">{studentsNotice}</InlineFeedback>
              ) : null}
            </div>
          )}

          <div className="mt-5 min-w-0 overflow-hidden rounded-card border border-line/80 bg-surface/90 shadow-soft">
            {studentsLoading && students.length === 0 ? (
              <LoadingState label="Loading registered students..." />
            ) : studentsError && students.length === 0 ? (
              <div className="p-5 sm:p-6">
                <button type="button" onClick={() => setStudentRefreshToken((current) => current + 1)} className="btn btn-secondary">
                  <RefreshCw className="size-4" aria-hidden="true" />
                  Retry students
                </button>
              </div>
            ) : students.length === 0 ? (
              <div className="p-8 text-center sm:p-12">
                <span className="mx-auto flex size-12 items-center justify-center rounded-full border border-dream/25 bg-dream/10 text-dream-text">
                  <Users className="size-6" aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-display text-xl font-semibold text-ink">
                  {filtersActive ? 'No matching students' : 'No students registered'}
                </h3>
                <p className="mt-2 text-sm leading-6 text-ink-muted">
                  {filtersActive
                    ? 'Try adjusting the search or filters.'
                    : 'Registered student accounts will appear here.'}
                </p>
              </div>
            ) : (
              <div>
                <p className="border-b border-line/80 bg-surface-muted/50 px-4 py-3 text-xs font-medium text-ink-subtle lg:hidden">
                  Scroll horizontally to view every student field and action.
                </p>
              <div className="max-w-full overflow-x-auto overscroll-x-contain">
                <table className="min-w-[72rem] w-full border-collapse text-left text-sm">
                  <caption className="sr-only">Registered student directory</caption>
                  <thead className="border-b border-line-strong bg-dream-soft/50 text-xs uppercase tracking-[0.08em] text-ink-muted">
                    <tr>
                      {['Name', 'USN', 'Email', 'Phone Number', 'Branch', 'Year', 'Status', 'Action'].map((heading) => (
                        <th key={heading} scope="col" className="px-4 py-4 font-semibold">{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/80">
                    {students.map((student) => (
                      <tr key={student.id} className="bg-surface/80 transition-colors hover:bg-dream-soft/30 motion-reduce:transition-none">
                        <th scope="row" className="px-4 py-4 font-semibold text-ink">{student.name}</th>
                        <td className="px-4 py-4 font-mono text-xs font-semibold text-ink-muted">{student.usn}</td>
                        <td className="px-4 py-4 text-ink-muted"><a href={`mailto:${student.email}`} className="underline decoration-line underline-offset-4 hover:text-technical-text">{student.email}</a></td>
                        <td className="px-4 py-4 text-ink-muted">{student.contactNumber}</td>
                        <td className="px-4 py-4 text-ink-muted">{student.branch}</td>
                        <td className="px-4 py-4 text-ink-muted">Year {student.year}</td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold ${student.isActive ? 'border-dream/30 bg-dream/10 text-dream-text' : 'border-rose/30 bg-rose/10 text-rose-text'}`}>
                            {student.isActive ? <CheckCircle2 className="size-3.5" aria-hidden="true" /> : <UserX className="size-3.5" aria-hidden="true" />}
                            {student.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => void handleStudentStatusChange(student)}
                            disabled={pendingStudentId === student.id}
                            className={`btn min-w-24 rounded-full border disabled:cursor-not-allowed disabled:opacity-60 ${student.isActive ? 'border-rose/30 bg-rose/10 text-rose-text hover:bg-rose/20' : 'border-dream/30 bg-dream/10 text-dream-text hover:bg-dream/20'}`}
                          >
                            {pendingStudentId === student.id && <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
                            {pendingStudentId === student.id ? 'Updating...' : student.isActive ? 'Disable' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </div>
            )}

            <div className="flex flex-col gap-4 border-t border-line/80 bg-dream-soft/25 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-ink-muted" aria-live="polite">
                Page {pagination.totalPages === 0 ? 0 : pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={studentsLoading || pagination.page <= 1}
                  className="btn btn-secondary flex-1 rounded-full disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                >
                  <ChevronLeft className="size-4" aria-hidden="true" />
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={studentsLoading || pagination.totalPages === 0 || pagination.page >= pagination.totalPages}
                  className="btn btn-secondary flex-1 rounded-full disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                >
                  Next
                  <ChevronRight className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </section>
        </SectionReveal>
          </>
        )}
        </div>

        {registrationsEvent && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-canvas/70 p-4 backdrop-blur-md">
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="event-registrations-heading"
              className="ui-panel-glass my-8 w-full max-w-5xl border-dream/30 p-5 shadow-glass sm:p-6"
            >
              <div className="flex flex-col gap-4 border-b border-line/80 pb-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-dream-text">
                    Registered Students
                  </p>
                  <h2 id="event-registrations-heading" className="mt-1 break-words font-display text-2xl font-semibold text-ink">
                    {registrationsEvent.title}
                  </h2>
                  <p className="mt-2 text-sm font-semibold text-ink-muted">
                    {registrationsEvent.registrationCount} / {registrationsEvent.maxRegistrations} Registered
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => void handleDownloadEventRegistrations()}
                    className="btn min-h-11 rounded-full border border-creative/30 bg-creative/10 px-4 text-creative-text hover:bg-creative/20"
                    disabled={registrationsDownloading}
                  >
                    {registrationsDownloading ? (
                      <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                    ) : (
                      <FileSpreadsheet className="size-4" aria-hidden="true" />
                    )}
                    {registrationsDownloading ? 'Downloading...' : 'Download Excel'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon self-end sm:self-auto"
                    onClick={closeRegistrationsModal}
                    disabled={registrationsDownloading}
                    aria-label="Close event registrations"
                  >
                    <X className="size-5" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="mt-5">
                {registrationsError && (
                  <div className="mb-4">
                    <InlineFeedback kind="error">{registrationsError.message}</InlineFeedback>
                  </div>
                )}

                {registrationsLoading ? (
                  <LoadingState label="Loading event registrations..." />
                ) : eventRegistrations.length === 0 ? (
                  <div className="rounded-card border border-line/80 bg-surface/80 p-8 text-center text-sm text-ink-muted">
                    No students have registered for this event yet.
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-card border border-line/80 bg-surface/90 shadow-soft">
                    <p className="border-b border-line/80 bg-surface-muted/50 px-4 py-3 text-xs font-medium text-ink-subtle md:hidden">
                      Scroll horizontally to view every registration field.
                    </p>
                    <div className="max-w-full overflow-x-auto overscroll-x-contain">
                      <table className="min-w-[46rem] w-full border-collapse text-left text-sm">
                        <caption className="sr-only">Event registrations</caption>
                        <thead className="border-b border-line-strong bg-dream-soft/50 text-xs uppercase tracking-[0.08em] text-ink-muted">
                          <tr>
                            {['Name', 'USN', 'Email', 'Phone Number', 'Year'].map((heading) => (
                              <th key={heading} scope="col" className="px-4 py-4 font-semibold">{heading}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line/80">
                          {eventRegistrations.map((registration) => (
                            <tr key={registration.id} className="bg-surface/80 transition-colors hover:bg-dream-soft/30 motion-reduce:transition-none">
                              <th scope="row" className="px-4 py-4 font-semibold text-ink">{registration.name}</th>
                              <td className="px-4 py-4 font-mono text-xs font-semibold text-ink-muted">{registration.usn}</td>
                              <td className="px-4 py-4 text-ink-muted">
                                <a href={`mailto:${registration.email}`} className="underline decoration-line underline-offset-4 hover:text-technical-text">
                                  {registration.email}
                                </a>
                              </td>
                              <td className="px-4 py-4 text-ink-muted">{registration.contactNumber}</td>
                              <td className="px-4 py-4 text-ink-muted">{registration.year ?? '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {attemptsContest && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-canvas/70 p-4 backdrop-blur-md">
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="weekly-attempts-heading"
              className="ui-panel-glass my-8 flex max-h-[calc(100vh-4rem)] w-full max-w-5xl flex-col overflow-hidden border-dream/30 shadow-glass"
            >
              <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line/70 bg-surface/80 p-5 sm:p-6">
                <div>
                  <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-dream-text">
                    Recorded Attempts
                  </p>
                  <h2 id="weekly-attempts-heading" className="mt-1 font-display text-2xl font-semibold text-ink">
                    {attemptsContest.title}
                  </h2>
                  <p className="mt-2 text-sm text-ink-muted">
                    {attemptsContest.attemptCount} students opened this contest
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleDownloadContestAttempts()}
                    className="btn btn-secondary hidden sm:inline-flex"
                    disabled={attemptsDownloading}
                  >
                    <FileSpreadsheet className="size-4" aria-hidden="true" />
                    {attemptsDownloading ? 'Downloading...' : 'Download Excel'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon"
                    onClick={closeAttemptsModal}
                    disabled={attemptsDownloading}
                    aria-label="Close contest attempts"
                  >
                    <X className="size-5" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
                <button
                  type="button"
                  onClick={() => void handleDownloadContestAttempts()}
                  className="btn btn-secondary mb-4 w-full justify-center sm:hidden"
                  disabled={attemptsDownloading}
                >
                  <FileSpreadsheet className="size-4" aria-hidden="true" />
                  {attemptsDownloading ? 'Downloading...' : 'Download Excel'}
                </button>

                {attemptsError && <InlineFeedback kind="error">{attemptsError.message}</InlineFeedback>}

                {attemptsLoading ? (
                  <div className="mt-4">
                    <LoadingState label="Loading recorded attempts..." />
                  </div>
                ) : weeklyContestAttempts.length === 0 ? (
                  <div className="mt-4 rounded-card border border-line/80 bg-surface/80 p-8 text-center text-sm text-ink-muted">
                    No students have opened this contest yet.
                  </div>
                ) : (
                  <div className="mt-4 overflow-hidden rounded-card border border-line/80 bg-surface/90 shadow-soft">
                    <p className="border-b border-line/80 bg-surface-muted/50 px-4 py-3 text-xs font-medium text-ink-subtle md:hidden">
                      Scroll horizontally to view every attempt field.
                    </p>
                    <div className="max-w-full overflow-x-auto overscroll-x-contain">
                      <table className="min-w-[68rem] w-full border-collapse text-left text-sm">
                        <caption className="sr-only">Weekly contest recorded attempts</caption>
                        <thead className="border-b border-line-strong bg-dream-soft/50 text-xs uppercase tracking-[0.08em] text-ink-muted">
                          <tr>
                            {['Name', 'USN', 'Email', 'Phone Number', 'Year', 'Opened At', 'Contest Score', 'Action'].map((heading) => (
                              <th key={heading} scope="col" className="px-4 py-4 font-semibold">{heading}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line/80">
                          {weeklyContestAttempts.map((attempt) => (
                            <tr key={attempt.id} className="bg-surface/80 transition-colors hover:bg-dream-soft/30 motion-reduce:transition-none">
                              <th scope="row" className="px-4 py-4 font-semibold text-ink">{attempt.name}</th>
                              <td className="px-4 py-4 font-mono text-xs font-semibold text-ink-muted">{attempt.usn}</td>
                              <td className="px-4 py-4 text-ink-muted">
                                <a href={`mailto:${attempt.email}`} className="underline decoration-line underline-offset-4 hover:text-technical-text">
                                  {attempt.email}
                                </a>
                              </td>
                              <td className="px-4 py-4 text-ink-muted">{attempt.contactNumber}</td>
                              <td className="px-4 py-4 text-ink-muted">{attempt.year ?? '-'}</td>
                              <td className="px-4 py-4 text-ink-muted">{formatDateTime(attempt.openedAt)}</td>
                              <td className="px-4 py-4 font-semibold text-ink">
                                {attempt.contestScore === null ? '-' : attempt.contestScore}
                              </td>
                              <td className="px-4 py-4">
                                <button
                                  type="button"
                                  className="btn btn-secondary rounded-full"
                                  onClick={() => openScoreModal(attempt)}
                                >
                                  {attempt.contestScore === null ? 'Add Score' : 'Edit Score'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {scoreAttempt && attemptsContest && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-canvas/70 p-4 backdrop-blur-md">
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="contest-score-heading"
              className="ui-panel-glass w-full max-w-md border-technical/30 p-5 shadow-glass sm:p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-technical-text">
                    Contest Score
                  </p>
                  <h2 id="contest-score-heading" className="mt-1 font-display text-2xl font-semibold text-ink">
                    {scoreAttempt.contestScore === null ? 'Add score' : 'Edit score'}
                  </h2>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-icon shrink-0"
                  onClick={closeScoreModal}
                  disabled={scoreSubmitting}
                  aria-label="Close contest score form"
                >
                  <X className="size-5" aria-hidden="true" />
                </button>
              </div>

              <div className="mt-5 rounded-card border border-line/80 bg-surface/80 p-4 text-sm text-ink-muted">
                <p className="font-semibold text-ink">{scoreAttempt.name}</p>
                <p className="mt-1 font-mono text-xs font-semibold text-ink-subtle">
                  {scoreAttempt.usn} • Week {attemptsContest.weekNumber}
                </p>
                <p className="mt-3 leading-6">
                  Enter only the external contest result. Contest opens record participation separately.
                </p>
              </div>

              <form onSubmit={handleSubmitContestScore} className="mt-5 space-y-4">
                <label>
                  <span className="mb-2 block text-sm font-semibold text-ink">Score</span>
                  <input
                    type="number"
                    min={0}
                    max={100000}
                    step={1}
                    value={contestScoreInput}
                    onChange={(event) => {
                      setContestScoreInput(event.target.value);
                      setScoreError(null);
                    }}
                    className="min-h-11 w-full rounded-control border border-line-strong bg-surface/95 px-3 py-2 text-sm text-ink shadow-soft placeholder:text-ink-subtle focus:border-technical/60 focus:ring-2 focus:ring-technical/20"
                    required
                  />
                </label>

                {scoreError && <InlineFeedback kind="error">{scoreError.message}</InlineFeedback>}

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button type="button" className="btn btn-secondary" onClick={closeScoreModal} disabled={scoreSubmitting}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={scoreSubmitting}>
                    {scoreSubmitting && (
                      <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                    )}
                    {scoreSubmitting ? 'Saving...' : 'Save Score'}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        {dppOpensSummary && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-canvas/70 p-4 backdrop-blur-md">
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="dpp-opens-heading"
              className="ui-panel-glass my-8 flex max-h-[calc(100vh-4rem)] w-full max-w-5xl flex-col overflow-hidden border-technical/30 shadow-glass"
            >
              <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line/70 bg-surface/80 p-5 sm:p-6">
                <div>
                  <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-technical-text">
                    First Opens
                  </p>
                  <h2 id="dpp-opens-heading" className="mt-1 font-display text-2xl font-semibold text-ink">
                    {dppOpensSummary.title}
                  </h2>
                  <p className="mt-2 text-sm text-ink-muted">
                    {dppOpensSummary.firstOpenCount} students opened this {getDppTypeLabel(dppOpensSummary.type)} DPP
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleDownloadDppOpens()}
                    className="btn btn-secondary hidden sm:inline-flex"
                    disabled={dppOpensDownloading}
                  >
                    <FileSpreadsheet className="size-4" aria-hidden="true" />
                    {dppOpensDownloading ? 'Downloading...' : 'Download Excel'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon"
                    onClick={closeDppOpensModal}
                    disabled={dppOpensDownloading}
                    aria-label="Close DPP first opens"
                  >
                    <X className="size-5" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
                <button
                  type="button"
                  onClick={() => void handleDownloadDppOpens()}
                  className="btn btn-secondary mb-4 w-full justify-center sm:hidden"
                  disabled={dppOpensDownloading}
                >
                  <FileSpreadsheet className="size-4" aria-hidden="true" />
                  {dppOpensDownloading ? 'Downloading...' : 'Download Excel'}
                </button>

                {dppOpensError && <InlineFeedback kind="error">{dppOpensError.message}</InlineFeedback>}
                {dppOpensSummary.type === 'aptitude' && !dppOpensLoading && dppOpens.length > 0 && (
                  <div className="mt-4 rounded-card border border-primary/25 bg-primary/10 p-4 text-sm leading-6 text-ink-muted">
                    Enter the student's aptitude performance score. This is added to the Overall Leaderboard separately from the +5 first-open reward.
                  </div>
                )}
                {dppScoreNotice && (
                  <div className="mt-4">
                    <InlineFeedback kind="success">{dppScoreNotice}</InlineFeedback>
                  </div>
                )}

                {dppOpensLoading ? (
                  <div className="mt-4">
                    <LoadingState label="Loading DPP first opens..." />
                  </div>
                ) : dppOpens.length === 0 ? (
                  <div className="mt-4 rounded-card border border-line/80 bg-surface/80 p-8 text-center text-sm text-ink-muted">
                    No students have opened this DPP yet.
                  </div>
                ) : (
                  <div className="mt-4 overflow-hidden rounded-card border border-line/80 bg-surface/90 shadow-soft">
                    <p className="border-b border-line/80 bg-surface-muted/50 px-4 py-3 text-xs font-medium text-ink-subtle md:hidden">
                      {dppOpensSummary.type === 'aptitude'
                        ? 'Manage aptitude scores from each student card.'
                        : 'Scroll horizontally to view every first-open field.'}
                    </p>
                    {dppOpensSummary.type === 'aptitude' && (
                      <div className="grid gap-3 p-4 md:hidden">
                        {dppOpens.map((open) => (
                          <article key={open.id} className="rounded-card border border-line/80 bg-glass/60 p-4">
                            <div className="flex flex-col gap-1">
                              <h3 className="font-display text-base font-semibold text-ink">{open.name}</h3>
                              <p className="font-mono text-xs font-semibold text-ink-subtle">{open.usn}</p>
                              <a href={`mailto:${open.email}`} className="break-words text-sm text-technical-text underline decoration-line underline-offset-4">
                                {open.email}
                              </a>
                            </div>
                            <dl className="mt-4 grid gap-3 text-sm text-ink-muted">
                              <div>
                                <dt className="font-semibold text-ink">Phone Number</dt>
                                <dd>{open.contactNumber}</dd>
                              </div>
                              <div>
                                <dt className="font-semibold text-ink">Year</dt>
                                <dd>{open.year ?? '-'}</dd>
                              </div>
                              <div>
                                <dt className="font-semibold text-ink">Branch</dt>
                                <dd>{open.branch}</dd>
                              </div>
                              <div>
                                <dt className="font-semibold text-ink">Opened At</dt>
                                <dd>{formatDateTime(open.openedAt)}</dd>
                              </div>
                            </dl>
                            <div className="mt-4">
                              <p className="mb-2 text-sm font-semibold text-ink">Aptitude Score</p>
                              {renderDppScoreControls(open)}
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                    <div className="max-w-full overflow-x-auto overscroll-x-contain">
                      <table className={`${dppOpensSummary.type === 'aptitude' ? 'hidden min-w-[78rem] md:table' : 'min-w-[64rem]'} w-full border-collapse text-left text-sm`}>
                        <caption className="sr-only">DPP first opens</caption>
                        <thead className="border-b border-line-strong bg-dream-soft/50 text-xs uppercase tracking-[0.08em] text-ink-muted">
                          <tr>
                            {[
                              'Name',
                              'USN',
                              'Email',
                              'Phone Number',
                              'Year',
                              'Branch',
                              'Opened At',
                              ...(dppOpensSummary.type === 'aptitude' ? ['Aptitude Score'] : []),
                            ].map((heading) => (
                              <th key={heading} scope="col" className="px-4 py-4 font-semibold">{heading}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line/80">
                          {dppOpens.map((open) => (
                            <tr key={open.id} className="bg-surface/80 transition-colors hover:bg-dream-soft/30 motion-reduce:transition-none">
                              <th scope="row" className="px-4 py-4 font-semibold text-ink">{open.name}</th>
                              <td className="px-4 py-4 font-mono text-xs font-semibold text-ink-muted">{open.usn}</td>
                              <td className="px-4 py-4 text-ink-muted">
                                <a href={`mailto:${open.email}`} className="underline decoration-line underline-offset-4 hover:text-technical-text">
                                  {open.email}
                                </a>
                              </td>
                              <td className="px-4 py-4 text-ink-muted">{open.contactNumber}</td>
                              <td className="px-4 py-4 text-ink-muted">{open.year ?? '-'}</td>
                              <td className="px-4 py-4 text-ink-muted">{open.branch}</td>
                              <td className="px-4 py-4 text-ink-muted">{formatDateTime(open.openedAt)}</td>
                              {dppOpensSummary.type === 'aptitude' && (
                                <td className="px-4 py-4 align-top">
                                  {renderDppScoreControls(open)}
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {isDppModalOpen && (
          <div className="fixed inset-0 z-[90] overflow-hidden bg-canvas/70 backdrop-blur-md">
            <div className="flex h-full items-start justify-center px-4 pb-4 pt-24 sm:px-6 sm:pb-6 sm:pt-28 lg:pt-32">
              <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="dpp-modal-heading"
                className="ui-panel-glass flex max-h-[calc(100vh-7rem)] w-full max-w-3xl flex-col overflow-hidden border-technical/30 shadow-glass sm:max-h-[calc(100vh-8.5rem)] lg:max-h-[calc(100vh-10rem)]"
              >
                <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line/70 bg-surface/80 p-5 sm:p-6">
                  <div>
                    <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-technical-text">
                      {editingDpp ? 'Edit DPP' : 'Add DPP'}
                    </p>
                    <h2 id="dpp-modal-heading" className="mt-1 font-display text-2xl font-semibold text-ink">
                      {editingDpp ? 'Update practice link' : 'Create a practice link'}
                    </h2>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon shrink-0"
                    onClick={closeDppModal}
                    disabled={dppSubmitting}
                    aria-label="Close DPP form"
                  >
                    <X className="size-5" aria-hidden="true" />
                  </button>
                </div>

                <form onSubmit={handleDppSubmit} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label>
                      <span className="mb-2 block text-sm font-semibold text-ink">Type</span>
                      <select
                        value={dppForm.type}
                        onChange={(event) => handleDppFormChange('type', event.target.value)}
                        disabled={dppTypeLocked}
                        className="min-h-11 w-full rounded-control border border-line-strong bg-surface/95 px-3 py-2 text-sm text-ink shadow-soft disabled:cursor-not-allowed disabled:opacity-100 focus:border-technical/60 focus:ring-2 focus:ring-technical/20"
                        required
                      >
                        <option value="dsa">DSA</option>
                        <option value="aptitude">Aptitude</option>
                      </select>
                      {dppTypeLocked && (
                        <span className="mt-2 block text-xs leading-5 text-ink-subtle">
                          Type is locked after students have opened this DPP.
                        </span>
                      )}
                    </label>

                    <label>
                      <span className="mb-2 block text-sm font-semibold text-ink">Title</span>
                      <input
                        type="text"
                        value={dppForm.title}
                        onChange={(event) => handleDppFormChange('title', event.target.value)}
                        maxLength={120}
                        placeholder="Arrays Practice Set"
                        className="min-h-11 w-full rounded-control border border-line-strong bg-surface/95 px-3 py-2 text-sm text-ink shadow-soft placeholder:text-ink-subtle focus:border-technical/60 focus:ring-2 focus:ring-technical/20"
                        required
                      />
                    </label>

                    <label className="sm:col-span-2">
                      <span className="mb-2 block text-sm font-semibold text-ink">External URL</span>
                      <input
                        type="url"
                        value={dppForm.url}
                        onChange={(event) => handleDppFormChange('url', event.target.value)}
                        maxLength={1000}
                        placeholder="https://"
                        className="min-h-11 w-full rounded-control border border-line-strong bg-surface/95 px-3 py-2 text-sm text-ink shadow-soft placeholder:text-ink-subtle focus:border-technical/60 focus:ring-2 focus:ring-technical/20"
                        required
                      />
                    </label>

                    <label className="sm:col-span-2">
                      <span className="mb-2 block text-sm font-semibold text-ink">Description</span>
                      <textarea
                        value={dppForm.description}
                        onChange={(event) => handleDppFormChange('description', event.target.value)}
                        rows={3}
                        maxLength={1000}
                        placeholder="Optional context for this DPP"
                        className="w-full rounded-control border border-line-strong bg-surface/95 px-3 py-2 text-sm text-ink shadow-soft placeholder:text-ink-subtle focus:border-technical/60 focus:ring-2 focus:ring-technical/20"
                      />
                    </label>

                    <label className="flex items-center gap-3 rounded-card border border-line/80 bg-surface/80 p-4 sm:col-span-2">
                      <input
                        type="checkbox"
                        checked={dppForm.active}
                        onChange={(event) => handleDppFormChange('active', event.target.checked)}
                        className="size-4 rounded border-line text-technical focus:ring-technical"
                      />
                      <span>
                        <span className="block text-sm font-semibold text-ink">Active</span>
                        <span className="block text-xs text-ink-muted">Visible to students when enabled.</span>
                      </span>
                    </label>
                  </div>

                  {dppFormError && <InlineFeedback kind="error">{dppFormError.message}</InlineFeedback>}

                  <div className="flex flex-col-reverse gap-3 border-t border-line/70 pt-4 sm:flex-row sm:justify-end">
                    <button type="button" className="btn btn-secondary" onClick={closeDppModal} disabled={dppSubmitting}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={dppSubmitting}>
                      {dppSubmitting && (
                        <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                      )}
                      {dppSubmitting ? 'Saving...' : editingDpp ? 'Save Changes' : 'Create DPP'}
                    </button>
                  </div>
                </form>
              </section>
            </div>
          </div>
        )}

        {isWeeklyContestModalOpen && (
          <div className="fixed inset-0 z-[90] overflow-hidden bg-canvas/70 backdrop-blur-md">
            <div className="flex h-full items-start justify-center px-4 pb-4 pt-24 sm:px-6 sm:pb-6 sm:pt-28 lg:pt-32">
              <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="weekly-contest-modal-heading"
                className="ui-panel-glass flex max-h-[calc(100vh-7rem)] w-full max-w-3xl flex-col overflow-hidden border-dream/30 shadow-glass sm:max-h-[calc(100vh-8.5rem)] lg:max-h-[calc(100vh-10rem)]"
              >
                <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line/70 bg-surface/80 p-5 sm:p-6">
                  <div>
                    <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-dream-text">
                      {editingWeeklyContest ? 'Edit Weekly Contest' : 'Add Weekly Contest'}
                    </p>
                    <h2 id="weekly-contest-modal-heading" className="mt-1 font-display text-2xl font-semibold text-ink">
                      {editingWeeklyContest ? 'Update contest details' : 'Create a weekly contest'}
                    </h2>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon shrink-0"
                    onClick={closeWeeklyContestModal}
                    disabled={weeklyContestSubmitting}
                    aria-label="Close weekly contest form"
                  >
                    <X className="size-5" aria-hidden="true" />
                  </button>
                </div>

                <form onSubmit={handleWeeklyContestSubmit} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label>
                      <span className="mb-2 block text-sm font-semibold text-ink">Week Number</span>
                      <select
                        value={weeklyContestForm.weekNumber}
                        onChange={(event) => handleWeeklyContestFormChange('weekNumber', event.target.value)}
                        className="min-h-11 w-full rounded-control border border-line-strong bg-surface/95 px-3 py-2 text-sm text-ink shadow-soft focus:border-dream/60 focus:ring-2 focus:ring-dream/20"
                        required
                      >
                        <option value="">Select week</option>
                        {Array.from({ length: 10 }, (_, index) => index + 1).map((week) => (
                          <option key={week} value={week}>Week {week}</option>
                        ))}
                      </select>
                    </label>

                    <label>
                      <span className="mb-2 block text-sm font-semibold text-ink">Contest Title</span>
                      <input
                        type="text"
                        value={weeklyContestForm.title}
                        onChange={(event) => handleWeeklyContestFormChange('title', event.target.value)}
                        maxLength={120}
                        className="min-h-11 w-full rounded-control border border-line-strong bg-surface/95 px-3 py-2 text-sm text-ink shadow-soft placeholder:text-ink-subtle focus:border-dream/60 focus:ring-2 focus:ring-dream/20"
                        required
                      />
                    </label>

                    <label className="sm:col-span-2">
                      <span className="mb-2 block text-sm font-semibold text-ink">Description</span>
                      <textarea
                        value={weeklyContestForm.description}
                        onChange={(event) => handleWeeklyContestFormChange('description', event.target.value)}
                        rows={3}
                        maxLength={1000}
                        className="w-full rounded-control border border-line-strong bg-surface/95 px-3 py-2 text-sm text-ink shadow-soft placeholder:text-ink-subtle focus:border-dream/60 focus:ring-2 focus:ring-dream/20"
                      />
                    </label>

                    <label className="sm:col-span-2">
                      <span className="mb-2 block text-sm font-semibold text-ink">Contest URL</span>
                      <input
                        type="url"
                        value={weeklyContestForm.contestUrl}
                        onChange={(event) => handleWeeklyContestFormChange('contestUrl', event.target.value)}
                        maxLength={1000}
                        placeholder="https://"
                        className="min-h-11 w-full rounded-control border border-line-strong bg-surface/95 px-3 py-2 text-sm text-ink shadow-soft placeholder:text-ink-subtle focus:border-dream/60 focus:ring-2 focus:ring-dream/20"
                        required
                      />
                    </label>

                    <label>
                      <span className="mb-2 block text-sm font-semibold text-ink">Start Date</span>
                      <input
                        type="date"
                        value={weeklyContestForm.startDate}
                        onChange={(event) => handleWeeklyContestFormChange('startDate', event.target.value)}
                        className="min-h-11 w-full rounded-control border border-line-strong bg-surface/95 px-3 py-2 text-sm text-ink shadow-soft focus:border-dream/60 focus:ring-2 focus:ring-dream/20"
                        required
                      />
                    </label>

                    <label>
                      <span className="mb-2 block text-sm font-semibold text-ink">Start Time</span>
                      <input
                        type="time"
                        value={weeklyContestForm.startTime}
                        onChange={(event) => handleWeeklyContestFormChange('startTime', event.target.value)}
                        className="min-h-11 w-full rounded-control border border-line-strong bg-surface/95 px-3 py-2 text-sm text-ink shadow-soft focus:border-dream/60 focus:ring-2 focus:ring-dream/20"
                        required
                      />
                    </label>

                    <label>
                      <span className="mb-2 block text-sm font-semibold text-ink">End Date</span>
                      <input
                        type="date"
                        value={weeklyContestForm.endDate}
                        onChange={(event) => handleWeeklyContestFormChange('endDate', event.target.value)}
                        className="min-h-11 w-full rounded-control border border-line-strong bg-surface/95 px-3 py-2 text-sm text-ink shadow-soft focus:border-dream/60 focus:ring-2 focus:ring-dream/20"
                        required
                      />
                    </label>

                    <label>
                      <span className="mb-2 block text-sm font-semibold text-ink">End Time</span>
                      <input
                        type="time"
                        value={weeklyContestForm.endTime}
                        onChange={(event) => handleWeeklyContestFormChange('endTime', event.target.value)}
                        className="min-h-11 w-full rounded-control border border-line-strong bg-surface/95 px-3 py-2 text-sm text-ink shadow-soft focus:border-dream/60 focus:ring-2 focus:ring-dream/20"
                        required
                      />
                    </label>
                  </div>

                  <label className="flex items-center gap-3 rounded-card border border-line/80 bg-surface/75 p-3 text-sm font-semibold text-ink">
                    <input
                      type="checkbox"
                      checked={weeklyContestForm.active}
                      onChange={(event) => handleWeeklyContestFormChange('active', event.target.checked)}
                      className="size-4 rounded border-line text-dream focus:ring-dream/30"
                    />
                    Contest active
                  </label>

                  {weeklyContestFormError && <InlineFeedback kind="error">{weeklyContestFormError.message}</InlineFeedback>}

                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button type="button" onClick={closeWeeklyContestModal} className="btn btn-secondary" disabled={weeklyContestSubmitting}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={weeklyContestSubmitting}>
                      {weeklyContestSubmitting && (
                        <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                      )}
                      {weeklyContestSubmitting
                        ? editingWeeklyContest ? 'Updating...' : 'Creating...'
                        : editingWeeklyContest ? 'Update Contest' : 'Create Contest'}
                    </button>
                  </div>
                </form>
              </section>
            </div>
          </div>
        )}

        {isEventModalOpen && (
          <div className="fixed inset-0 z-[90] overflow-hidden bg-canvas/70 backdrop-blur-md">
            <div className="flex h-full items-start justify-center px-4 pb-4 pt-24 sm:px-6 sm:pb-6 sm:pt-28 lg:pt-32">
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="event-modal-heading"
              className="ui-panel-glass flex max-h-[calc(100vh-7rem)] w-full max-w-3xl flex-col overflow-hidden border-primary/30 shadow-glass sm:max-h-[calc(100vh-8.5rem)] lg:max-h-[calc(100vh-10rem)]"
            >
              <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line/70 bg-surface/80 p-5 sm:p-6">
                <div>
                  <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-primary-text">
                    {editingEvent ? 'Edit Event' : 'Add Event'}
                  </p>
                  <h2 id="event-modal-heading" className="mt-1 font-display text-2xl font-semibold text-ink">
                    {editingEvent ? 'Update event details' : 'Create a new event'}
                  </h2>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-icon shrink-0"
                  onClick={closeEventModal}
                  disabled={eventSubmitting}
                  aria-label="Close event form"
                >
                  <X className="size-5" aria-hidden="true" />
                </button>
              </div>

              <form onSubmit={handleEventSubmit} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="sm:col-span-2">
                    <span className="mb-2 block text-sm font-semibold text-ink">Event Title</span>
                    <input
                      type="text"
                      value={eventForm.title}
                      onChange={(event) => handleEventFormChange('title', event.target.value)}
                      maxLength={120}
                      className="min-h-11 w-full rounded-control border border-line-strong bg-surface/95 px-3 py-2 text-sm text-ink shadow-soft placeholder:text-ink-subtle focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                      required
                    />
                  </label>

                  <div className="sm:col-span-2">
                    <label htmlFor="event-poster" className="mb-2 block text-sm font-semibold text-ink">
                      Event Poster
                    </label>
                    <div className="grid gap-4 rounded-card border border-line/80 bg-surface/75 p-4 sm:grid-cols-[12rem_minmax(0,1fr)]">
                      <div className="aspect-[16/10] overflow-hidden rounded-control border border-line bg-surface-muted">
                        {eventPosterPreviewUrl ? (
                          <img
                            src={eventPosterPreviewUrl}
                            alt="Selected event poster preview"
                            className="size-full object-cover"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center text-sm font-semibold text-ink-muted">
                            Poster preview
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <label className="btn btn-secondary w-full cursor-pointer justify-center sm:w-fit">
                          <Image className="size-4" aria-hidden="true" />
                          Choose Image
                          <input
                            id="event-poster"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleEventPosterChange}
                            className="sr-only"
                          />
                        </label>
                        <p className="mt-3 text-sm leading-6 text-ink-muted">
                          JPG, PNG, or WebP. Maximum 5 MB.
                        </p>
                        <p className="mt-2 truncate text-sm font-semibold text-ink">
                          {selectedEventPosterFile
                            ? selectedEventPosterFile.name
                            : editingEvent
                              ? 'Current poster will be kept unless replaced.'
                              : 'No poster selected yet.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <label className="sm:col-span-2">
                    <span className="mb-2 block text-sm font-semibold text-ink">Description</span>
                    <textarea
                      value={eventForm.description}
                      onChange={(event) => handleEventFormChange('description', event.target.value)}
                      rows={4}
                      maxLength={2000}
                      className="w-full rounded-control border border-line-strong bg-surface/95 px-3 py-2 text-sm text-ink shadow-soft placeholder:text-ink-subtle focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                      required
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-semibold text-ink">Venue</span>
                    <input
                      type="text"
                      value={eventForm.venue}
                      onChange={(event) => handleEventFormChange('venue', event.target.value)}
                      maxLength={160}
                      className="min-h-11 w-full rounded-control border border-line-strong bg-surface/95 px-3 py-2 text-sm text-ink shadow-soft placeholder:text-ink-subtle focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                      required
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-semibold text-ink">Maximum Registrations</span>
                    <input
                      type="number"
                      min={1}
                      max={10000}
                      step={1}
                      value={eventForm.maxRegistrations}
                      onChange={(event) => handleEventFormChange('maxRegistrations', event.target.value)}
                      className="min-h-11 w-full rounded-control border border-line-strong bg-surface/95 px-3 py-2 text-sm text-ink shadow-soft placeholder:text-ink-subtle focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                      required
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-semibold text-ink">Event Start Date</span>
                    <input
                      type="date"
                      value={eventForm.eventDate}
                      onChange={(event) => handleEventFormChange('eventDate', event.target.value)}
                      className="min-h-11 w-full rounded-control border border-line-strong bg-surface/95 px-3 py-2 text-sm text-ink shadow-soft focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                      required
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-semibold text-ink">Event Start Time</span>
                    <input
                      type="time"
                      value={eventForm.eventTime}
                      onChange={(event) => handleEventFormChange('eventTime', event.target.value)}
                      className="min-h-11 w-full rounded-control border border-line-strong bg-surface/95 px-3 py-2 text-sm text-ink shadow-soft focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                      required
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-semibold text-ink">Event End Date</span>
                    <input
                      type="date"
                      value={eventForm.eventEndDate}
                      onChange={(event) => handleEventFormChange('eventEndDate', event.target.value)}
                      className="min-h-11 w-full rounded-control border border-line-strong bg-surface/95 px-3 py-2 text-sm text-ink shadow-soft focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                      required
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-semibold text-ink">Event End Time</span>
                    <input
                      type="time"
                      value={eventForm.eventEndTime}
                      onChange={(event) => handleEventFormChange('eventEndTime', event.target.value)}
                      className="min-h-11 w-full rounded-control border border-line-strong bg-surface/95 px-3 py-2 text-sm text-ink shadow-soft focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                      required
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-semibold text-ink">Registration Deadline Date</span>
                    <input
                      type="date"
                      value={eventForm.deadlineDate}
                      onChange={(event) => handleEventFormChange('deadlineDate', event.target.value)}
                      className="min-h-11 w-full rounded-control border border-line-strong bg-surface/95 px-3 py-2 text-sm text-ink shadow-soft focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                      required
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-semibold text-ink">Registration Deadline Time</span>
                    <input
                      type="time"
                      value={eventForm.deadlineTime}
                      onChange={(event) => handleEventFormChange('deadlineTime', event.target.value)}
                      className="min-h-11 w-full rounded-control border border-line-strong bg-surface/95 px-3 py-2 text-sm text-ink shadow-soft focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                      required
                    />
                  </label>
                </div>

                <label className="flex items-center gap-3 rounded-card border border-line/80 bg-surface/75 p-3 text-sm font-semibold text-ink">
                  <input
                    type="checkbox"
                    checked={eventForm.active}
                    onChange={(event) => handleEventFormChange('active', event.target.checked)}
                    className="size-4 rounded border-line text-primary focus:ring-primary/30"
                  />
                  Registration active
                </label>

                {eventFormError && <InlineFeedback kind="error">{eventFormError.message}</InlineFeedback>}

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button type="button" onClick={closeEventModal} className="btn btn-secondary" disabled={eventSubmitting}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={eventSubmitting}>
                    {eventSubmitting && (
                      <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                    )}
                    {eventSubmitting
                      ? editingEvent ? 'Updating...' : 'Creating...'
                      : editingEvent ? 'Update Event' : 'Create Event'}
                  </button>
                </div>
              </form>
            </section>
            </div>
          </div>
        )}

        {isAwardConfirmOpen && selectedAwardStudent && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-canvas/70 p-4 backdrop-blur-md">
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="award-confirm-heading"
              className="ui-panel-glass w-full max-w-lg border-dream/30 p-5 shadow-glass sm:p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-dream-text">
                    Confirm Award
                  </p>
                  <h2 id="award-confirm-heading" className="mt-1 font-display text-2xl font-semibold text-ink">
                    Award {Number(awardPoints)} points to {selectedAwardStudent.name}?
                  </h2>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-icon shrink-0"
                  onClick={() => setIsAwardConfirmOpen(false)}
                  disabled={awardSubmitting}
                  aria-label="Close award confirmation"
                >
                  <X className="size-5" aria-hidden="true" />
                </button>
              </div>

              <div className="mt-5 rounded-card border border-line/80 bg-surface/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-subtle">
                  Reason
                </p>
                <p className="mt-2 text-sm leading-6 text-ink">
                  {awardDescription.trim()}
                </p>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsAwardConfirmOpen(false)}
                  disabled={awardSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => void handleConfirmAward()}
                  disabled={awardSubmitting}
                >
                  {awardSubmitting && (
                    <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  )}
                  {awardSubmitting ? 'Awarding...' : 'Confirm Award'}
                </button>
              </div>
            </section>
          </div>
        )}

        {editingPointTransaction && selectedAwardStudent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-canvas/70 p-4 backdrop-blur-md">
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="edit-point-award-heading"
              className="ui-panel-glass w-full max-w-md border-technical/30 p-5 shadow-glass sm:p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-technical-text">
                    Correct Award
                  </p>
                  <h2 id="edit-point-award-heading" className="mt-1 font-display text-2xl font-semibold text-ink">
                    Edit manual points
                  </h2>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-icon shrink-0"
                  onClick={closeEditPointTransactionModal}
                  disabled={editAwardSubmitting}
                  aria-label="Close edit point award form"
                >
                  <X className="size-5" aria-hidden="true" />
                </button>
              </div>

              <div className="mt-5 rounded-card border border-line/80 bg-surface/80 p-4 text-sm text-ink-muted">
                <p className="font-semibold text-ink">{selectedAwardStudent.name}</p>
                <p className="mt-1 font-mono text-xs font-semibold text-ink-subtle">
                  {selectedAwardStudent.usn} • Manual award
                </p>
                <p className="mt-3 leading-6">
                  This updates the existing award transaction. Leaderboard totals will reflect the corrected value.
                </p>
              </div>

              <form onSubmit={handleSubmitEditPointTransaction} className="mt-5 space-y-4">
                <label>
                  <span className="mb-2 block text-sm font-semibold text-ink">Points</span>
                  <input
                    type="number"
                    min={1}
                    max={100000}
                    step={1}
                    value={editAwardPoints}
                    onChange={(event) => {
                      setEditAwardPoints(event.target.value);
                      setEditAwardError(null);
                    }}
                    className="min-h-11 w-full rounded-control border border-line-strong bg-surface/95 px-3 py-2 text-sm text-ink shadow-soft placeholder:text-ink-subtle focus:border-technical/60 focus:ring-2 focus:ring-technical/20"
                    required
                  />
                </label>

                <label>
                  <span className="mb-2 block text-sm font-semibold text-ink">Reason / Activity</span>
                  <input
                    type="text"
                    value={editAwardDescription}
                    onChange={(event) => {
                      setEditAwardDescription(event.target.value);
                      setEditAwardError(null);
                    }}
                    maxLength={240}
                    className="min-h-11 w-full rounded-control border border-line-strong bg-surface/95 px-3 py-2 text-sm text-ink shadow-soft placeholder:text-ink-subtle focus:border-technical/60 focus:ring-2 focus:ring-technical/20"
                    required
                  />
                </label>

                {editAwardError && <InlineFeedback kind="error">{editAwardError.message}</InlineFeedback>}

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={closeEditPointTransactionModal}
                    disabled={editAwardSubmitting}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={editAwardSubmitting}>
                    {editAwardSubmitting && (
                      <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                    )}
                    {editAwardSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </main>
      </PageTransition>
    </>
  );
};

export default AdminDashboard;
