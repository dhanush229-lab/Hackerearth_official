import type { EnrolledDomain, User } from "../context/AuthContext";
import { apiRequest } from "./api";

export interface UpdateStudentProfileInput {
  name: string;
  contactNumber: string;
  enrolledDomains: EnrolledDomain[];
}

export type StudentWeeklyContestStatus = "upcoming" | "live" | "ended";

export interface StudentWeeklyContest {
  id: string;
  title: string;
  description?: string;
  weekNumber: number;
  startDateTime: string;
  endDateTime: string;
  status: StudentWeeklyContestStatus;
  claimed: boolean;
}

interface StudentWeeklyContestsResponse {
  success: true;
  contests: StudentWeeklyContest[];
}

interface OpenStudentWeeklyContestResponse {
  success: true;
  awarded: boolean;
  pointsAwarded: number;
  contestUrl: string;
}

interface UpdateStudentProfileResponse {
  success: boolean;
  message: string;
  user: User;
}

export const updateStudentProfile = (input: UpdateStudentProfileInput) =>
  apiRequest<UpdateStudentProfileResponse>("/api/student/profile", {
    method: "PATCH",
    body: JSON.stringify(input),
  });

export const getStudentWeeklyContests = (signal?: AbortSignal) =>
  apiRequest<StudentWeeklyContestsResponse>("/api/student/weekly-contests", {
    signal,
  });

export const openStudentWeeklyContest = (contestId: string) =>
  apiRequest<OpenStudentWeeklyContestResponse>(
    `/api/student/weekly-contests/${encodeURIComponent(contestId)}/open`,
    {
      method: "POST",
    }
  );
