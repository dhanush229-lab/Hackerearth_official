import { API_BASE_URL, ApiError, apiRequest } from './api';

export interface AdminOverview {
  totalStudents: number;
  activeStudents: number;
  inactiveStudents: number;
  totalAdmins: number;
  verifiedStudents: number;
  registrationOpen: boolean;
  domainCounts: {
    webDevelopment: number;
    dsa: number;
    aptitude: number;
  };
}

export interface AdminStudent {
  id: string;
  name: string;
  email: string;
  usn: string;
  contactNumber: string;
  branch: string;
  year: number;
  enrolledDomains: Array<'Web Development' | 'DSA' | 'Aptitude'>;
  role: 'student';
  emailVerified: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface AdminPointStudent {
  id: string;
  name: string;
  email: string;
  usn: string;
  branch: string;
  year: number;
  totalPoints: number;
  overallRank: number | null;
}

export interface AdminPointTransaction {
  id: string;
  points: number;
  source: 'event' | 'weekly_contest' | 'admin_adjustment';
  description?: string;
  editable: boolean;
  createdAt: string;
  awardedBy?: {
    id: string;
    name?: string;
    email?: string;
  };
}

export type AdminWeeklyContestStatus = 'inactive' | 'upcoming' | 'live' | 'ended';

export interface AdminWeeklyContest {
  id: string;
  title: string;
  description?: string;
  weekNumber: number;
  contestUrl: string;
  startDateTime: string;
  endDateTime: string;
  active: boolean;
  status: AdminWeeklyContestStatus;
  attemptCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyContestInput {
  title: string;
  description?: string;
  weekNumber: number;
  contestUrl: string;
  startDateTime: string;
  endDateTime: string;
  active: boolean;
}

export interface AdminWeeklyContestAttempt {
  id: string;
  studentId: string;
  name: string;
  usn: string;
  email: string;
  contactNumber: string;
  year: number | null;
  openedAt: string;
  contestScore: number | null;
}

export interface AdminWeeklyContestAttemptSummary {
  id: string;
  title: string;
  weekNumber: number;
  attemptCount: number;
}

export interface StudentPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface RegistrationSettings {
  id: string;
  key: string;
  studentRegistrationOpen: boolean;
  registrationMessage: string;
  registrationOpensAt?: string | null;
  registrationClosesAt?: string | null;
  registrationOpen: boolean;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

interface OverviewResponse {
  success: true;
  overview: AdminOverview;
}

interface StudentsResponse {
  success: true;
  students: AdminStudent[];
  pagination: StudentPagination;
}

interface StudentStatusResponse {
  success: true;
  message: string;
  student: AdminStudent;
}

interface AwardStudentPointsResponse {
  success: true;
  message: string;
  transaction: AdminPointTransaction;
  student: AdminPointStudent;
}

interface StudentPointHistoryResponse {
  success: true;
  student: AdminPointStudent;
  transactions: AdminPointTransaction[];
}

interface AdminWeeklyContestsResponse {
  success: true;
  contests: AdminWeeklyContest[];
}

interface AdminWeeklyContestResponse {
  success: true;
  message?: string;
  contest: AdminWeeklyContest;
}

interface AdminWeeklyContestAttemptsResponse {
  success: true;
  contest: AdminWeeklyContestAttemptSummary;
  attempts: AdminWeeklyContestAttempt[];
}

interface UpsertWeeklyContestScoreResponse {
  success: true;
  message: string;
  score: {
    studentId: string;
    contestId: string;
    contestScore: number;
    updatedAt: string;
  };
}

interface RegistrationSettingsResponse {
  success: true;
  settings: RegistrationSettings;
}

interface RegistrationUpdateResponse extends RegistrationSettingsResponse {
  message: string;
}

export interface StudentListParams {
  page: number;
  limit: number;
  search?: string;
  branch?: string;
  year?: number;
  domain?: 'Web Development' | 'DSA' | 'Aptitude';
  status?: 'active' | 'inactive';
  sortBy?: 'createdAt' | 'name' | 'usn';
  sortOrder?: 'asc' | 'desc';
}

export type StudentExportParams = Omit<StudentListParams, 'page' | 'limit'>;

export const getAdminOverview = (signal?: AbortSignal) =>
  apiRequest<OverviewResponse>('/api/admin/overview', {
    credentials: 'include',
    signal,
  });

export const getAdminStudents = (
  params: StudentListParams,
  signal?: AbortSignal,
) => {
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
  });

  if (params.search?.trim()) query.set('search', params.search.trim());
  if (params.branch?.trim()) query.set('branch', params.branch.trim());
  if (params.year) query.set('year', String(params.year));
  if (params.domain) query.set('domain', params.domain);
  if (params.status) query.set('status', params.status);
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.sortOrder) query.set('sortOrder', params.sortOrder);

  return apiRequest<StudentsResponse>(`/api/admin/students?${query.toString()}`, {
    credentials: 'include',
    signal,
  });
};

const getErrorMessage = (data: unknown): string => {
  if (
    data &&
    typeof data === 'object' &&
    'message' in data &&
    typeof data.message === 'string'
  ) {
    return data.message;
  }

  return 'Request failed. Please try again.';
};

const getErrorCode = (data: unknown): string | undefined => {
  if (
    data &&
    typeof data === 'object' &&
    'code' in data &&
    typeof data.code === 'string'
  ) {
    return data.code;
  }

  return undefined;
};

const parseJsonSafely = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const getFilenameFromContentDisposition = (contentDisposition: string | null) => {
  if (!contentDisposition) return null;

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1].replace(/"/g, ''));

  const filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  return filenameMatch?.[1] ?? null;
};

export const downloadAdminStudentsExcel = async (
  params: StudentExportParams,
): Promise<{ blob: Blob; filename: string }> => {
  const query = new URLSearchParams();

  if (params.search?.trim()) query.set('search', params.search.trim());
  if (params.branch?.trim()) query.set('branch', params.branch.trim());
  if (params.year) query.set('year', String(params.year));
  if (params.domain) query.set('domain', params.domain);
  if (params.status) query.set('status', params.status);
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.sortOrder) query.set('sortOrder', params.sortOrder);

  const queryString = query.toString();
  const response = await fetch(
    `${API_BASE_URL}/api/admin/students/export${queryString ? `?${queryString}` : ''}`,
    {
      method: 'GET',
      credentials: 'include',
    },
  );

  if (!response.ok) {
    const data = await parseJsonSafely(response);
    throw new ApiError({
      status: response.status,
      code: getErrorCode(data),
      message: getErrorMessage(data),
      data,
    });
  }

  const filename =
    getFilenameFromContentDisposition(response.headers.get('Content-Disposition')) ??
    'hackerearth_students.xlsx';
  const blob = await response.blob();

  return { blob, filename };
};

export const updateAdminStudentStatus = (
  studentId: string,
  isActive: boolean,
) =>
  apiRequest<StudentStatusResponse>(
    `/api/admin/students/${encodeURIComponent(studentId)}/status`,
    {
      method: 'PATCH',
      credentials: 'include',
      body: JSON.stringify({ isActive }),
    },
  );

export const awardStudentPoints = ({
  studentId,
  points,
  description,
}: {
  studentId: string;
  points: number;
  description: string;
}) =>
  apiRequest<AwardStudentPointsResponse>('/api/admin/leaderboard/points', {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify({ studentId, points, description }),
  });

export const updateManualPointTransaction = ({
  transactionId,
  points,
  description,
}: {
  transactionId: string;
  points: number;
  description: string;
}) =>
  apiRequest<AwardStudentPointsResponse>(
    `/api/admin/leaderboard/points/${encodeURIComponent(transactionId)}`,
    {
      method: 'PATCH',
      credentials: 'include',
      body: JSON.stringify({ points, description }),
    },
  );

export const getAdminStudentPointHistory = (
  studentId: string,
  limit = 10,
  signal?: AbortSignal,
) =>
  apiRequest<StudentPointHistoryResponse>(
    `/api/admin/leaderboard/students/${encodeURIComponent(studentId)}/points?limit=${limit}`,
    {
      credentials: 'include',
      signal,
    },
  );

export const getAdminRegistrationSettings = (signal?: AbortSignal) =>
  apiRequest<RegistrationSettingsResponse>('/api/admin/settings/registration', {
    credentials: 'include',
    signal,
  });

export const updateAdminRegistrationSettings = (
  studentRegistrationOpen: boolean,
  registrationMessage: string,
) =>
  apiRequest<RegistrationUpdateResponse>('/api/admin/settings/registration', {
    method: 'PATCH',
    credentials: 'include',
    body: JSON.stringify({
      studentRegistrationOpen,
      registrationMessage,
    }),
  });

export const getAdminWeeklyContests = (signal?: AbortSignal) =>
  apiRequest<AdminWeeklyContestsResponse>('/api/admin/weekly-contests', {
    credentials: 'include',
    signal,
  });

export const createAdminWeeklyContest = (input: WeeklyContestInput) =>
  apiRequest<AdminWeeklyContestResponse>('/api/admin/weekly-contests', {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify(input),
  });

export const updateAdminWeeklyContest = (
  contestId: string,
  input: Partial<WeeklyContestInput>,
) =>
  apiRequest<AdminWeeklyContestResponse>(
    `/api/admin/weekly-contests/${encodeURIComponent(contestId)}`,
    {
      method: 'PATCH',
      credentials: 'include',
      body: JSON.stringify(input),
    },
  );

export const getAdminWeeklyContestAttempts = (
  contestId: string,
  signal?: AbortSignal,
) =>
  apiRequest<AdminWeeklyContestAttemptsResponse>(
    `/api/admin/weekly-contests/${encodeURIComponent(contestId)}/attempts`,
    {
      credentials: 'include',
      signal,
    },
  );

export const downloadAdminWeeklyContestAttemptsExcel = async (
  contestId: string,
): Promise<{ blob: Blob; filename: string }> => {
  const response = await fetch(
    `${API_BASE_URL}/api/admin/weekly-contests/${encodeURIComponent(contestId)}/attempts/export`,
    {
      method: 'GET',
      credentials: 'include',
    },
  );

  if (!response.ok) {
    const data = await parseJsonSafely(response);
    throw new ApiError({
      status: response.status,
      code: getErrorCode(data),
      message: getErrorMessage(data),
      data,
    });
  }

  const filename =
    getFilenameFromContentDisposition(response.headers.get('Content-Disposition')) ??
    'weekly-contest-attempts.xlsx';
  const blob = await response.blob();

  return { blob, filename };
};

export const upsertAdminWeeklyContestScore = ({
  contestId,
  studentId,
  score,
}: {
  contestId: string;
  studentId: string;
  score: number;
}) =>
  apiRequest<UpsertWeeklyContestScoreResponse>(
    `/api/admin/weekly-contests/${encodeURIComponent(contestId)}/students/${encodeURIComponent(studentId)}/score`,
    {
      method: 'PUT',
      credentials: 'include',
      body: JSON.stringify({ score }),
    },
  );
