import { PipelineStage, Types } from "mongoose";
import PointTransaction from "../models/pointTransaction";
import User from "../models/user";
import WeeklyContest from "../models/WeeklyContest";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

export interface LeaderboardPaginationInput {
  page?: unknown;
  limit?: unknown;
  search?: unknown;
}

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

interface OverallAggregationResult {
  _id: Types.ObjectId;
  name: string;
  usn: string;
  branch: string;
  year: number;
  totalPoints: number;
}

interface WeeklyAggregationResult {
  studentId: Types.ObjectId;
  name: string;
  usn: string;
  branch: string;
  year: number;
  points: number;
}

interface FacetResult<TEntry> {
  metadata: Array<{ total: number }>;
  data: TEntry[];
}

interface StudentRankAggregationResult {
  _id: Types.ObjectId;
  totalPoints: number;
}

interface StudentWeeklyRankAggregationResult {
  studentId: Types.ObjectId;
  points: number;
}

const parsePositiveInteger = (
  value: unknown,
  fallback: number,
  max?: number
) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return max ? Math.min(parsed, max) : parsed;
};

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const parseLeaderboardPagination = ({
  page,
  limit,
  search,
}: LeaderboardPaginationInput) => ({
  page: parsePositiveInteger(page, DEFAULT_PAGE),
  limit: parsePositiveInteger(limit, DEFAULT_LIMIT, MAX_LIMIT),
  search: typeof search === "string" ? search.trim() : "",
});

const buildStudentMatch = (search: string): PipelineStage.Match["$match"] => {
  const match: PipelineStage.Match["$match"] = {
    role: "student",
    isActive: true,
  };

  if (search) {
    const regex = new RegExp(escapeRegex(search), "i");
    match.$or = [{ name: regex }, { usn: regex }];
  }

  return match;
};

const mapPagination = (
  page: number,
  limit: number,
  total: number
): LeaderboardPagination => ({
  page,
  limit,
  total,
  totalPages: total === 0 ? 0 : Math.ceil(total / limit),
});

export const getOverallLeaderboard = async ({
  page,
  limit,
  search,
}: {
  page: number;
  limit: number;
  search: string;
}) => {
  const skip = (page - 1) * limit;
  const [result] = await User.aggregate<FacetResult<OverallAggregationResult>>([
    { $match: buildStudentMatch(search) },
    {
      $lookup: {
        from: "pointtransactions",
        let: { studentId: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$studentId", "$$studentId"] } } },
          { $group: { _id: "$studentId", totalPoints: { $sum: "$points" } } },
        ],
        as: "pointSummary",
      },
    },
    {
      $addFields: {
        totalPoints: {
          $ifNull: [{ $arrayElemAt: ["$pointSummary.totalPoints", 0] }, 0],
        },
      },
    },
    { $sort: { totalPoints: -1, name: 1, email: 1, _id: 1 } },
    {
      $facet: {
        metadata: [{ $count: "total" }],
        data: [
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              name: 1,
              usn: 1,
              branch: 1,
              year: 1,
              totalPoints: 1,
            },
          },
        ],
      },
    },
  ]).exec();

  const total = result?.metadata[0]?.total ?? 0;
  const leaderboard = (result?.data ?? []).map((entry, index) => ({
    rank: skip + index + 1,
    studentId: String(entry._id),
    name: entry.name,
    usn: entry.usn,
    branch: entry.branch,
    year: entry.year,
    totalPoints: entry.totalPoints,
  }));

  return {
    leaderboard,
    pagination: mapPagination(page, limit, total),
  };
};

export const getWeeklyLeaderboard = async ({
  week,
  scope,
  page,
  limit,
  search,
}: {
  week?: number;
  scope?: "all" | "week";
  page: number;
  limit: number;
  search: string;
}) => {
  const skip = (page - 1) * limit;
  const weeklyScope = scope ?? "week";
  const officialWeeks = await getAvailableWeeklyContestWeeks();

  if (weeklyScope === "all" && officialWeeks.length === 0) {
    return {
      leaderboard: [],
      pagination: mapPagination(page, limit, 0),
    };
  }

  if (weeklyScope === "week" && (!week || !officialWeeks.includes(week))) {
    return {
      leaderboard: [],
      pagination: mapPagination(page, limit, 0),
    };
  }

  const weeklyMatch: PipelineStage.Match["$match"] = {
    source: "weekly_contest",
  };

  if (weeklyScope === "all") {
    weeklyMatch.weekNumber = { $in: officialWeeks };
  } else {
    weeklyMatch.weekNumber = week;
  }

  const [result] = await PointTransaction.aggregate<
    FacetResult<WeeklyAggregationResult>
  >([
    { $match: weeklyMatch },
    { $group: { _id: "$studentId", points: { $sum: "$points" } } },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "student",
      },
    },
    { $unwind: "$student" },
    { $match: { "student.role": "student", "student.isActive": true } },
    ...(search
      ? [
        {
          $match: {
            $or: [
              { "student.name": new RegExp(escapeRegex(search), "i") },
              { "student.usn": new RegExp(escapeRegex(search), "i") },
            ],
          },
        } satisfies PipelineStage.Match,
      ]
      : []),
    { $sort: { points: -1, "student.name": 1, "student.usn": 1, _id: 1 } },
    {
      $facet: {
        metadata: [{ $count: "total" }],
        data: [
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              studentId: "$_id",
              name: "$student.name",
              usn: "$student.usn",
              branch: "$student.branch",
              year: "$student.year",
              points: 1,
            },
          },
        ],
      },
    },
  ]).exec();

  const total = result?.metadata[0]?.total ?? 0;
  const leaderboard = (result?.data ?? []).map((entry, index) => ({
    rank: skip + index + 1,
    studentId: String(entry.studentId),
    name: entry.name,
    usn: entry.usn,
    branch: entry.branch,
    year: entry.year,
    points: entry.points,
  }));

  return {
    leaderboard,
    pagination: mapPagination(page, limit, total),
  };
};

export const getAvailableWeeklyContestWeeks = async () => {
  const contests = await WeeklyContest.find({})
    .select("weekNumber")
    .sort({ weekNumber: 1 })
    .lean()
    .exec();

  return contests
    .map((contest) => contest.weekNumber)
    .filter((week): week is number => Number.isInteger(week) && week > 0);
};

export const getStudentOverallRank = async (
  studentId: string
): Promise<StudentRank | null> => {
  if (!Types.ObjectId.isValid(studentId)) {
    return null;
  }

  const objectId = new Types.ObjectId(studentId);

  const [rankedStudents, totalActiveStudents] = await Promise.all([
    User.aggregate<StudentRankAggregationResult>([
      { $match: { role: "student", isActive: true } },
      {
        $lookup: {
          from: "pointtransactions",
          let: { studentId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$studentId", "$$studentId"] } } },
            {
              $group: {
                _id: "$studentId",
                totalPoints: { $sum: "$points" },
              },
            },
          ],
          as: "pointSummary",
        },
      },
      {
        $addFields: {
          totalPoints: {
            $ifNull: [{ $arrayElemAt: ["$pointSummary.totalPoints", 0] }, 0],
          },
        },
      },
      {
        $sort: { totalPoints: -1, name: 1, email: 1, _id: 1 },
      },
      { $project: { totalPoints: 1 } },
    ]).exec(),
    User.countDocuments({ role: "student", isActive: true }).exec(),
  ]);

  const studentIndex = rankedStudents.findIndex(
    (student) => student._id.toString() === objectId.toString()
  );

  if (studentIndex === -1) {
    return null;
  }

  const studentRank = rankedStudents[studentIndex];

  if (!studentRank) {
    return null;
  }

  return {
    overallRank: studentIndex + 1,
    totalPoints: studentRank.totalPoints,
    totalActiveStudents,
  };
};

export const getStudentWeeklyRank = async (
  studentId: string,
  week?: number,
  scope: "all" | "week" = "week"
): Promise<StudentWeeklyRank | null> => {
  if (
    !Types.ObjectId.isValid(studentId) ||
    (scope === "week" && (!Number.isInteger(week) || !week || week < 1))
  ) {
    return null;
  }

  const objectId = new Types.ObjectId(studentId);
  const officialWeeks = await getAvailableWeeklyContestWeeks();

  if (scope === "all" && officialWeeks.length === 0) {
    const activeStudentExists = await User.exists({
      _id: objectId,
      role: "student",
      isActive: true,
    }).exec();

    if (!activeStudentExists) {
      return null;
    }

    return {
      week: null,
      scope,
      weeklyRank: null,
      weeklyPoints: 0,
      totalRankedStudents: 0,
    };
  }

  if (scope === "week" && (!week || !officialWeeks.includes(week))) {
    const activeStudentExists = await User.exists({
      _id: objectId,
      role: "student",
      isActive: true,
    }).exec();

    if (!activeStudentExists) {
      return null;
    }

    return {
      week: week ?? null,
      scope,
      weeklyRank: null,
      weeklyPoints: 0,
      totalRankedStudents: 0,
    };
  }

  const weeklyMatch: PipelineStage.Match["$match"] = {
    source: "weekly_contest",
  };

  if (scope === "all") {
    weeklyMatch.weekNumber = { $in: officialWeeks };
  } else {
    weeklyMatch.weekNumber = week;
  }

  const rankedStudents = await PointTransaction.aggregate<StudentWeeklyRankAggregationResult>([
    { $match: weeklyMatch },
    { $group: { _id: "$studentId", points: { $sum: "$points" } } },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "student",
      },
    },
    { $unwind: "$student" },
    { $match: { "student.role": "student", "student.isActive": true } },
    { $sort: { points: -1, "student.name": 1, "student.usn": 1, _id: 1 } },
    { $project: { studentId: "$_id", points: 1 } },
  ]).exec();

  const studentIndex = rankedStudents.findIndex(
    (student) => student.studentId.toString() === objectId.toString()
  );

  if (studentIndex === -1) {
    const activeStudentExists = await User.exists({
      _id: objectId,
      role: "student",
      isActive: true,
    }).exec();

    if (!activeStudentExists) {
      return null;
    }

    return {
      week: scope === "all" ? null : week ?? null,
      scope,
      weeklyRank: null,
      weeklyPoints: 0,
      totalRankedStudents: rankedStudents.length,
    };
  }

  const studentRank = rankedStudents[studentIndex];

  if (!studentRank) {
    return null;
  }

  return {
    week: scope === "all" ? null : week ?? null,
    scope,
    weeklyRank: studentIndex + 1,
    weeklyPoints: studentRank.points,
    totalRankedStudents: rankedStudents.length,
  };
};
