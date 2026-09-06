import { Request, Response } from "express";
import ExcelJS from "exceljs";
import mongoose, { Types } from "mongoose";
import ActivityOpen from "../models/ActivityOpen";
import PointTransaction from "../models/pointTransaction";
import User from "../models/user";
import WeeklyContest, { IWeeklyContest } from "../models/WeeklyContest";

type WeeklyContestStatus = "inactive" | "upcoming" | "live" | "ended";

interface WeeklyContestBody {
  title?: unknown;
  description?: unknown;
  weekNumber?: unknown;
  contestUrl?: unknown;
  startDateTime?: unknown;
  endDateTime?: unknown;
  active?: unknown;
}

interface WeeklyContestScoreBody {
  score?: unknown;
}

const MAX_CONTEST_SCORE = 100000;
const MAX_WEEK_NUMBER = 10;
const MAX_CONTEST_TITLE_LENGTH = 120;
const MAX_CONTEST_DESCRIPTION_LENGTH = 1000;
const MAX_CONTEST_URL_LENGTH = 1000;
const ATTEMPT_STUDENT_FIELDS = "name usn email contactNumber year";

const normalizeString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const parseDate = (value: unknown): Date | null => {
  if (typeof value !== "string" && !(value instanceof Date)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseWeekNumber = (value: unknown): number | null => {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" &&
    Number.isInteger(parsed) &&
    parsed >= 1 &&
    parsed <= MAX_WEEK_NUMBER
    ? parsed
    : null;
};

const parseContestScore = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isInteger(value) ? value : null;
  }

  if (typeof value === "string" && /^(0|[1-9]\d*)$/.test(value.trim())) {
    const parsed = Number(value.trim());
    return Number.isSafeInteger(parsed) ? parsed : null;
  }

  return null;
};

const buildWeeklyContestOpenMatch = (weeklyContestId: Types.ObjectId) => ({
  activityType: "weekly_contest" as const,
  weeklyContestId,
});

const getContestStatus = (contest: {
  active: boolean;
  startDateTime: Date;
  endDateTime: Date;
}): WeeklyContestStatus => {
  if (!contest.active) return "inactive";

  const now = new Date();
  if (now < contest.startDateTime) return "upcoming";
  if (now >= contest.endDateTime) return "ended";
  return "live";
};

const validateContestUrl = (value: string) => {
  if (!value || value.length > MAX_CONTEST_URL_LENGTH) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const validateContestPayload = (
  body: WeeklyContestBody,
  options: { partial: boolean }
) => {
  const required = !options.partial;
  const update: Partial<{
    title: string;
    description: string;
    weekNumber: number;
    contestUrl: string;
    startDateTime: Date;
    endDateTime: Date;
    active: boolean;
  }> = {};

  const title = normalizeString(body.title);
  if (title || required) {
    if (!title || title.length > MAX_CONTEST_TITLE_LENGTH) {
      return { error: "Contest title is required and must be concise." };
    }
    update.title = title;
  }

  if (body.description !== undefined) {
    const description = normalizeString(body.description);
    if (description.length > MAX_CONTEST_DESCRIPTION_LENGTH) {
      return { error: "Description is too long." };
    }
    update.description = description;
  }

  if (body.weekNumber !== undefined || required) {
    const weekNumber = parseWeekNumber(body.weekNumber);
    if (!weekNumber) {
      return { error: `Week number must be an integer from 1 to ${MAX_WEEK_NUMBER}.` };
    }
    update.weekNumber = weekNumber;
  }

  const contestUrl = normalizeString(body.contestUrl);
  if (contestUrl || required) {
    if (!validateContestUrl(contestUrl)) {
      return { error: "Contest URL must be a valid http or https URL." };
    }
    update.contestUrl = contestUrl;
  }

  if (body.startDateTime !== undefined || required) {
    const startDateTime = parseDate(body.startDateTime);
    if (!startDateTime) {
      return { error: "A valid contest start date and time is required." };
    }
    update.startDateTime = startDateTime;
  }

  if (body.endDateTime !== undefined || required) {
    const endDateTime = parseDate(body.endDateTime);
    if (!endDateTime) {
      return { error: "A valid contest end date and time is required." };
    }
    update.endDateTime = endDateTime;
  }

  if (body.active !== undefined) {
    if (typeof body.active !== "boolean") {
      return { error: "Active must be true or false." };
    }
    update.active = body.active;
  }

  return { update };
};

const isDuplicateKeyError = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === 11000;

const sanitizeFilenamePart = (value: string) => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "weekly-contest";
};

const getAttemptCountsByContest = async (contestIds: Types.ObjectId[]) => {
  if (contestIds.length === 0) return new Map<string, number>();

  const counts = await ActivityOpen.aggregate<{
    _id: Types.ObjectId;
    count: number;
  }>([
    {
      $match: {
        activityType: "weekly_contest",
        weeklyContestId: { $in: contestIds },
      },
    },
    { $group: { _id: "$weeklyContestId", count: { $sum: 1 } } },
  ]).exec();

  return new Map(counts.map((count) => [count._id.toString(), count.count]));
};

const toAdminContest = (contest: IWeeklyContest, attemptCount = 0) => ({
  id: contest._id.toString(),
  title: contest.title,
  description: contest.description ?? "",
  weekNumber: contest.weekNumber,
  contestUrl: contest.contestUrl,
  startDateTime: contest.startDateTime,
  endDateTime: contest.endDateTime,
  active: contest.active,
  status: getContestStatus(contest),
  attemptCount,
  createdAt: contest.createdAt,
  updatedAt: contest.updatedAt,
});

const toStudentContest = (contest: IWeeklyContest, claimedContestIds: Set<string>) => ({
  id: contest._id.toString(),
  title: contest.title,
  description: contest.description ?? "",
  weekNumber: contest.weekNumber,
  startDateTime: contest.startDateTime,
  endDateTime: contest.endDateTime,
  status: getContestStatus(contest),
  claimed: claimedContestIds.has(contest._id.toString()),
});

interface AttemptStudentDetails {
  _id?: unknown;
  name?: string;
  usn?: string;
  email?: string;
  contactNumber?: string;
  year?: number;
}

interface ContestAttemptRow {
  _id: unknown;
  firstOpenedAt: Date;
  contestScore: number | null;
  studentId: AttemptStudentDetails | undefined;
}

const toAttemptStudent = (transaction: ContestAttemptRow) => ({
  id: String(transaction._id),
  studentId: String(transaction.studentId?._id ?? ""),
  name: transaction.studentId?.name ?? "Unknown student",
  usn: transaction.studentId?.usn ?? "",
  email: transaction.studentId?.email ?? "",
  contactNumber: transaction.studentId?.contactNumber ?? "",
  year: transaction.studentId?.year ?? null,
  openedAt: transaction.firstOpenedAt,
  contestScore: transaction.contestScore,
});

export const createAdminWeeklyContest = async (
  req: Request<unknown, unknown, WeeklyContestBody>,
  res: Response
) => {
  try {
    if (!req.auth) {
      return res.status(401).json({
        success: false,
        code: "AUTH_REQUIRED",
        message: "Authentication is required.",
      });
    }

    const validation = validateContestPayload(req.body, { partial: false });
    if (validation.error || !validation.update) {
      return res.status(400).json({
        success: false,
        code: "INVALID_WEEKLY_CONTEST",
        message: validation.error,
      });
    }

    const { startDateTime, endDateTime } = validation.update;
    if (!startDateTime || !endDateTime || endDateTime <= startDateTime) {
      return res.status(400).json({
        success: false,
        code: "INVALID_CONTEST_DATES",
        message: "Contest end date and time must be after the start date and time.",
      });
    }

    const contest = await WeeklyContest.create({
      ...validation.update,
      createdBy: new Types.ObjectId(req.auth.userId),
      active: validation.update.active ?? true,
    });

    return res.status(201).json({
      success: true,
      message: "Weekly contest created successfully.",
      contest: toAdminContest(contest),
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return res.status(409).json({
        success: false,
        code: "WEEKLY_CONTEST_EXISTS",
        message: "A weekly contest already exists for this week.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unexpected server error.",
    });
  }
};

export const getAdminWeeklyContests = async (_req: Request, res: Response) => {
  try {
    const contests = await WeeklyContest.find().sort({ weekNumber: 1 }).exec();
    const attemptCounts = await getAttemptCountsByContest(
      contests.map((contest) => contest._id)
    );

    return res.status(200).json({
      success: true,
      contests: contests.map((contest) =>
        toAdminContest(contest, attemptCounts.get(contest._id.toString()) ?? 0)
      ),
    });
  } catch (_error) {
    return res.status(500).json({
      success: false,
      message: "Unexpected server error.",
    });
  }
};

export const updateAdminWeeklyContest = async (
  req: Request<{ contestId: string }, unknown, WeeklyContestBody>,
  res: Response
) => {
  try {
    const { contestId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(contestId)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_CONTEST_ID",
        message: "A valid contest id is required.",
      });
    }

    const contest = await WeeklyContest.findById(contestId).exec();
    if (!contest) {
      return res.status(404).json({
        success: false,
        code: "WEEKLY_CONTEST_NOT_FOUND",
        message: "Weekly contest not found.",
      });
    }

    const validation = validateContestPayload(req.body, { partial: true });
    if (validation.error || !validation.update) {
      return res.status(400).json({
        success: false,
        code: "INVALID_WEEKLY_CONTEST",
        message: validation.error,
      });
    }

    const nextStartDateTime = validation.update.startDateTime ?? contest.startDateTime;
    const nextEndDateTime = validation.update.endDateTime ?? contest.endDateTime;
    if (nextEndDateTime <= nextStartDateTime) {
      return res.status(400).json({
        success: false,
        code: "INVALID_CONTEST_DATES",
        message: "Contest end date and time must be after the start date and time.",
      });
    }

    Object.assign(contest, validation.update);
    await contest.save();

    const attemptCounts = await getAttemptCountsByContest([contest._id]);

    return res.status(200).json({
      success: true,
      message: "Weekly contest updated successfully.",
      contest: toAdminContest(
        contest,
        attemptCounts.get(contest._id.toString()) ?? 0
      ),
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return res.status(409).json({
        success: false,
        code: "WEEKLY_CONTEST_EXISTS",
        message: "A weekly contest already exists for this week.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unexpected server error.",
    });
  }
};

export const getStudentWeeklyContests = async (req: Request, res: Response) => {
  try {
    if (!req.auth) {
      return res.status(401).json({
        success: false,
        code: "AUTH_REQUIRED",
        message: "Authentication is required.",
      });
    }

    const contests = await WeeklyContest.find({ active: true })
      .sort({ weekNumber: 1 })
      .exec();
    const claimedContestIds = await ActivityOpen.distinct("weeklyContestId", {
      studentId: new Types.ObjectId(req.auth.userId),
      activityType: "weekly_contest",
      weeklyContestId: { $exists: true },
    }).exec();
    const claimedSet = new Set(claimedContestIds.map((id) => String(id)));

    return res.status(200).json({
      success: true,
      contests: contests.map((contest) => toStudentContest(contest, claimedSet)),
    });
  } catch (_error) {
    return res.status(500).json({
      success: false,
      message: "Unexpected server error.",
    });
  }
};

export const openStudentWeeklyContest = async (
  req: Request<{ contestId: string }>,
  res: Response
) => {
  try {
    if (!req.auth) {
      return res.status(401).json({
        success: false,
        code: "AUTH_REQUIRED",
        message: "Authentication is required.",
      });
    }

    const { contestId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(contestId)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_CONTEST_ID",
        message: "A valid contest id is required.",
      });
    }

    const [contest, student] = await Promise.all([
      WeeklyContest.findById(contestId).exec(),
      User.findOne({
        _id: req.auth.userId,
        role: "student",
        isActive: true,
      })
        .select("_id")
        .exec(),
    ]);

    if (!student) {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_INACTIVE",
        message: "This student account is not active.",
      });
    }

    if (!contest) {
      return res.status(404).json({
        success: false,
        code: "WEEKLY_CONTEST_NOT_FOUND",
        message: "Weekly contest not found.",
      });
    }

    const status = getContestStatus(contest);
    if (status !== "live") {
      const response =
        status === "upcoming"
          ? {
            code: "CONTEST_NOT_STARTED",
            message: "Contest has not started yet.",
          }
          : status === "ended"
            ? { code: "CONTEST_ENDED", message: "Contest has ended." }
            : { code: "CONTEST_INACTIVE", message: "Contest is not active." };

      return res.status(409).json({
        success: false,
        ...response,
      });
    }

    let firstOpen = true;

    try {
      await ActivityOpen.create({
        studentId: student._id,
        activityType: "weekly_contest",
        weeklyContestId: contest._id,
      });
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        throw error;
      }
      firstOpen = false;
    }

    return res.status(200).json({
      success: true,
      firstOpen,
      awarded: false,
      pointsAwarded: 0,
      contestUrl: contest.contestUrl,
    });
  } catch (_error) {
    return res.status(500).json({
      success: false,
      message: "Unexpected server error.",
    });
  }
};

export const upsertAdminWeeklyContestScore = async (
  req: Request<{ contestId: string; studentId: string }, unknown, WeeklyContestScoreBody>,
  res: Response
) => {
  try {
    if (!req.auth) {
      return res.status(401).json({
        success: false,
        code: "AUTH_REQUIRED",
        message: "Authentication is required.",
      });
    }

    const { contestId, studentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(contestId)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_CONTEST_ID",
        message: "A valid contest id is required.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_STUDENT_ID",
        message: "A valid student id is required.",
      });
    }

    const score = parseContestScore(req.body.score);
    if (score === null || score < 0 || score > MAX_CONTEST_SCORE) {
      return res.status(400).json({
        success: false,
        code: "INVALID_CONTEST_SCORE",
        message: `Contest score must be a whole number from 0 to ${MAX_CONTEST_SCORE}.`,
      });
    }

    const contestObjectId = new Types.ObjectId(contestId);
    const studentObjectId = new Types.ObjectId(studentId);
    const [contest, student, activityOpen] = await Promise.all([
      WeeklyContest.findById(contestObjectId).exec(),
      User.findOne({
        _id: studentObjectId,
        role: "student",
        isActive: true,
      })
        .select("_id name usn email contactNumber year")
        .exec(),
      ActivityOpen.findOne({
        ...buildWeeklyContestOpenMatch(contestObjectId),
        studentId: studentObjectId,
      }).exec(),
    ]);

    if (!contest) {
      return res.status(404).json({
        success: false,
        code: "WEEKLY_CONTEST_NOT_FOUND",
        message: "Weekly contest not found.",
      });
    }

    if (!student) {
      return res.status(404).json({
        success: false,
        code: "STUDENT_NOT_FOUND",
        message: "Active student not found.",
      });
    }

    if (!activityOpen) {
      return res.status(409).json({
        success: false,
        code: "CONTEST_ATTEMPT_REQUIRED",
        message: "The student must open the contest before a score can be recorded.",
      });
    }

    const existingScore = await PointTransaction.findOne({
      source: "weekly_contest",
      weeklyContestId: contestObjectId,
      weeklyContestPointType: "contest_score",
      studentId: studentObjectId,
    }).exec();

    const now = new Date();
    const adminObjectId = new Types.ObjectId(req.auth.userId);

    let scoreTransaction;
    if (existingScore) {
      existingScore.previousPoints = existingScore.points;
      existingScore.points = score;
      existingScore.description = `Contest score for ${contest.title}`;
      existingScore.scoreUpdatedBy = adminObjectId;
      existingScore.scoreUpdatedAt = now;
      scoreTransaction = await existingScore.save();
    } else {
      scoreTransaction = await PointTransaction.findOneAndUpdate(
        {
          source: "weekly_contest",
          weeklyContestId: contestObjectId,
          weeklyContestPointType: "contest_score",
          studentId: studentObjectId,
        },
        {
          $set: {
            points: score,
            description: `Contest score for ${contest.title}`,
            scoreUpdatedBy: adminObjectId,
            scoreUpdatedAt: now,
          },
          $setOnInsert: {
            studentId: studentObjectId,
            source: "weekly_contest",
            weeklyContestId: contestObjectId,
            weeklyContestPointType: "contest_score",
            contestId: contestObjectId,
            weekNumber: contest.weekNumber,
            awardedBy: adminObjectId,
          },
        },
        {
          returnDocument: "after",
          runValidators: true,
          upsert: true,
        }
      ).exec();
    }

    if (!scoreTransaction) {
      console.error(
        "Failed to record weekly contest score: score transaction was not created or updated."
      );

      return res.status(500).json({
        success: false,
        message: "Unable to record contest score.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Contest score saved successfully.",
      score: {
        studentId: student._id.toString(),
        contestId: contest._id.toString(),
        contestScore: scoreTransaction.points,
        updatedAt: scoreTransaction.updatedAt,
      },
    });
  } catch (error) {
    console.error("Failed to record weekly contest score:", error);

    return res.status(500).json({
      success: false,
      message: "Unexpected server error.",
    });
  }
};

const loadContestAttempts = async (contestId: string) => {
  const weeklyContestObjectId = new Types.ObjectId(contestId);
  const attempts = await ActivityOpen.find(
    buildWeeklyContestOpenMatch(weeklyContestObjectId)
  )
    .sort({ firstOpenedAt: 1 })
    .populate<{
      studentId?: {
        _id?: unknown;
        name?: string;
        usn?: string;
        email?: string;
        contactNumber?: string;
        year?: number;
      };
    }>("studentId", ATTEMPT_STUDENT_FIELDS)
    .exec();

  const studentIds = attempts
    .map((attempt) => attempt.studentId?._id)
    .filter((studentId): studentId is Types.ObjectId => studentId instanceof Types.ObjectId);
  const scores = await PointTransaction.find({
    source: "weekly_contest",
    weeklyContestId: weeklyContestObjectId,
    weeklyContestPointType: "contest_score",
    studentId: { $in: studentIds },
  })
    .select("studentId points")
    .exec();
  const scoreByStudent = new Map(
    scores.map((score) => [score.studentId.toString(), score.points])
  );

  return attempts.map((attempt) => ({
    _id: attempt._id,
    firstOpenedAt: attempt.firstOpenedAt,
    studentId: attempt.studentId,
    contestScore: scoreByStudent.get(String(attempt.studentId?._id)) ?? null,
  }));
};

export const getAdminWeeklyContestAttempts = async (
  req: Request<{ contestId: string }>,
  res: Response
) => {
  try {
    const { contestId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(contestId)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_CONTEST_ID",
        message: "A valid contest id is required.",
      });
    }

    const contest = await WeeklyContest.findById(contestId).exec();
    if (!contest) {
      return res.status(404).json({
        success: false,
        code: "WEEKLY_CONTEST_NOT_FOUND",
        message: "Weekly contest not found.",
      });
    }

    const attempts = await loadContestAttempts(contestId);

    return res.status(200).json({
      success: true,
      contest: {
        id: contest._id.toString(),
        title: contest.title,
        weekNumber: contest.weekNumber,
        attemptCount: attempts.length,
      },
      attempts: attempts.map(toAttemptStudent),
    });
  } catch (_error) {
    return res.status(500).json({
      success: false,
      message: "Unexpected server error.",
    });
  }
};

export const exportAdminWeeklyContestAttempts = async (
  req: Request<{ contestId: string }>,
  res: Response
) => {
  try {
    const { contestId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(contestId)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_CONTEST_ID",
        message: "A valid contest id is required.",
      });
    }

    const contest = await WeeklyContest.findById(contestId).exec();
    if (!contest) {
      return res.status(404).json({
        success: false,
        code: "WEEKLY_CONTEST_NOT_FOUND",
        message: "Weekly contest not found.",
      });
    }

    const attempts = await loadContestAttempts(contestId);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "HackerEarth Hub NMAMIT";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("Attempts");
    worksheet.columns = [
      { header: "Name", key: "name", width: 28 },
      { header: "USN", key: "usn", width: 16 },
      { header: "Email", key: "email", width: 32 },
      { header: "Phone Number", key: "contactNumber", width: 18 },
      { header: "Year", key: "year", width: 10 },
      { header: "Opened At", key: "openedAt", width: 22 },
      { header: "Contest Score", key: "contestScore", width: 16 },
    ];
    worksheet.getRow(1).font = { bold: true };
    worksheet.views = [{ state: "frozen", ySplit: 1 }];

    attempts.forEach((attempt) => {
      const student = toAttemptStudent(attempt);
      worksheet.addRow({
        name: student.name,
        usn: student.usn,
        email: student.email,
        contactNumber: student.contactNumber,
        year: student.year ?? "",
        openedAt: student.openedAt,
        contestScore: student.contestScore ?? "",
      });
    });
    worksheet.getColumn("openedAt").numFmt = "yyyy-mm-dd hh:mm";

    const filename = `week-${contest.weekNumber}-${sanitizeFilenamePart(contest.title)}-attempts.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (_error) {
    return res.status(500).json({
      success: false,
      message: "Unexpected server error.",
    });
  }
};
