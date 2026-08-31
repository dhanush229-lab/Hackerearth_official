import { apiRequest } from "./api";

export interface LeaderboardPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface OverallLeaderboardEntry {
  rank: number;
  studentId: string;
  name: string;
  usn: string;
  branch: string;
  year: number;
  totalPoints: number;
}

export interface WeeklyLeaderboardEntry {
  rank: number;
  studentId: string;
  name: string;
  usn: string;
  branch: string;
  year: number;
  points: number;
}

export interface StudentRank {
  overallRank: number;
  totalPoints: number;
  totalActiveStudents: number;
}

export interface StudentWeeklyRank {
  week: number | null;
  scope: "all" | "week";
  weeklyRank: number | null;
  weeklyPoints: number;
  totalRankedStudents: number;
}

interface OverallLeaderboardResponse {
  success: boolean;
  leaderboard: OverallLeaderboardEntry[];
  pagination: LeaderboardPagination;
}

interface WeeklyLeaderboardResponse {
  success: boolean;
  scope: "all" | "week";
  week: number | null;
  leaderboard: WeeklyLeaderboardEntry[];
  pagination: LeaderboardPagination;
}

interface WeeklyContestWeeksResponse {
  success: boolean;
  weeks: number[];
}

interface StudentRankResponse {
  success: boolean;
  rank: StudentRank;
}

interface StudentWeeklyRankResponse {
  success: boolean;
  rank: StudentWeeklyRank;
}

const buildQueryString = (params: Record<string, string | number | undefined>) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      query.set(key, String(value));
    }
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
};

export const getOverallLeaderboard = (params: {
  page: number;
  limit: number;
  search?: string;
}) =>
  apiRequest<OverallLeaderboardResponse>(
    `/api/leaderboard/overall${buildQueryString(params)}`
  );

export const getWeeklyLeaderboard = (params: {
  week?: number;
  scope?: "all" | "week";
  page: number;
  limit: number;
  search?: string;
}) =>
  apiRequest<WeeklyLeaderboardResponse>(
    `/api/leaderboard/weekly${buildQueryString(params)}`
  );

export const getWeeklyContestWeeks = () =>
  apiRequest<WeeklyContestWeeksResponse>("/api/leaderboard/weeks");

export const getStudentRank = () =>
  apiRequest<StudentRankResponse>("/api/student/rank");

export const getStudentWeeklyRank = ({
  week,
  scope = "week",
}: {
  week?: number;
  scope?: "all" | "week";
}) =>
  apiRequest<StudentWeeklyRankResponse>(
    `/api/student/weekly-rank${buildQueryString({ week, scope })}`
  );
