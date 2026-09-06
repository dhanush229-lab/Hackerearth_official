import { Request, Response } from "express";
import ExcelJS from "exceljs";
import mongoose, { Types } from "mongoose";
import ActivityOpen from "../models/ActivityOpen";
import Dpp, { DPP_TYPES, DppType, IDpp } from "../models/Dpp";
import PointTransaction from "../models/pointTransaction";
import User from "../models/user";

interface DppBody {
  type?: unknown;
  title?: unknown;
  url?: unknown;
  description?: unknown;
  active?: unknown;
}

interface DppScoreBody {
  score?: unknown;
}

interface OpenStudentDetails {
  _id?: unknown;
  name?: string;
  usn?: string;
  email?: string;
  contactNumber?: string;
  year?: number;
  branch?: string;
}

interface DppOpenRow {
  _id: unknown;
  firstOpenedAt: Date;
  studentId?: OpenStudentDetails | undefined;
  aptitudeScore?: number | null | undefined;
}

const DPP_OPEN_REWARD_POINTS = 5;
const MAX_DPP_TITLE_LENGTH = 120;
const MAX_DPP_DESCRIPTION_LENGTH = 1000;
const MAX_DPP_URL_LENGTH = 1000;
const MAX_DPP_SCORE = 100000;
const OPEN_STUDENT_FIELDS = "name usn email contactNumber year branch";

const normalizeString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const isValidDppType = (value: string): value is DppType =>
  (DPP_TYPES as readonly string[]).includes(value);

const isDuplicateKeyError = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === 11000;

const validateUrl = (value: string) => {
  if (!value || value.length > MAX_DPP_URL_LENGTH) return false;

  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const toActivityType = (type: DppType) =>
  type === "dsa" ? "dsa_dpp" : "aptitude_dpp";

const parseDppScore = (value: unknown) => {
  if (typeof value !== "number" && typeof value !== "string") {
    return { error: "Score must be a whole number from 0 to 100000." };
  }

  const normalized = typeof value === "string" ? value.trim() : String(value);
  if (!/^(0|[1-9]\d*)$/.test(normalized)) {
    return { error: "Score must be a whole number from 0 to 100000." };
  }

  const score = Number(normalized);
  if (!Number.isInteger(score) || score < 0 || score > MAX_DPP_SCORE) {
    return { error: "Score must be a whole number from 0 to 100000." };
  }

  return { score };
};

const validateDppPayload = (
  body: DppBody,
  options: { partial: boolean }
) => {
  const required = !options.partial;
  const update: Partial<{
    type: DppType;
    title: string;
    url: string;
    description: string;
    active: boolean;
  }> = {};

  const type = normalizeString(body.type);
  if (type || required) {
    if (!isValidDppType(type)) {
      return { error: "DPP type must be dsa or aptitude." };
    }
    update.type = type;
  }

  const title = normalizeString(body.title);
  if (title || required) {
    if (!title || title.length > MAX_DPP_TITLE_LENGTH) {
      return { error: "DPP title is required and must be concise." };
    }
    update.title = title;
  }

  const url = normalizeString(body.url);
  if (url || required) {
    if (!validateUrl(url)) {
      return { error: "DPP URL must be a valid http or https URL." };
    }
    update.url = url;
  }

  if (body.description !== undefined) {
    const description = normalizeString(body.description);
    if (description.length > MAX_DPP_DESCRIPTION_LENGTH) {
      return { error: "Description is too long." };
    }
    update.description = description;
  }

  if (body.active !== undefined) {
    if (typeof body.active !== "boolean") {
      return { error: "Active must be true or false." };
    }
    update.active = body.active;
  }

  return { update };
};

const getOpenCountsByDpp = async (dppIds: Types.ObjectId[]) => {
  if (dppIds.length === 0) return new Map<string, number>();

  const counts = await ActivityOpen.aggregate<{
    _id: Types.ObjectId;
    count: number;
  }>([
    {
      $match: {
        activityType: { $in: ["dsa_dpp", "aptitude_dpp"] },
        dppId: { $in: dppIds },
      },
    },
    { $group: { _id: "$dppId", count: { $sum: 1 } } },
  ]).exec();

  return new Map(counts.map((count) => [count._id.toString(), count.count]));
};

const toAdminDpp = (dpp: IDpp, firstOpenCount = 0) => ({
  id: dpp._id.toString(),
  type: dpp.type,
  title: dpp.title,
  url: dpp.url,
  description: dpp.description ?? "",
  active: dpp.active,
  firstOpenCount,
  createdAt: dpp.createdAt,
  updatedAt: dpp.updatedAt,
});

const toStudentDpp = (dpp: IDpp, openedDppIds: Set<string>) => ({
  id: dpp._id.toString(),
  type: dpp.type,
  title: dpp.title,
  url: dpp.url,
  description: dpp.description ?? "",
  opened: openedDppIds.has(dpp._id.toString()),
  createdAt: dpp.createdAt,
  updatedAt: dpp.updatedAt,
});

const toOpenStudent = (open: DppOpenRow) => ({
  id: String(open._id),
  studentId: String(open.studentId?._id ?? ""),
  name: open.studentId?.name ?? "Unknown student",
  usn: open.studentId?.usn ?? "",
  email: open.studentId?.email ?? "",
  contactNumber: open.studentId?.contactNumber ?? "",
  year: open.studentId?.year ?? null,
  branch: open.studentId?.branch ?? "",
  openedAt: open.firstOpenedAt,
  aptitudeScore: open.aptitudeScore ?? null,
});

const sanitizeFilenamePart = (value: string) => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "dpp";
};

const loadDppOpens = async (dpp: IDpp) => {
  const opens = await ActivityOpen.find({
    activityType: { $in: ["dsa_dpp", "aptitude_dpp"] },
    dppId: dpp._id,
  })
    .sort({ firstOpenedAt: 1 })
    .populate<{ studentId?: OpenStudentDetails }>(
      "studentId",
      OPEN_STUDENT_FIELDS
    )
    .exec();

  if (dpp.type !== "aptitude" || opens.length === 0) {
    return opens.map((open) => ({
      _id: open._id,
      firstOpenedAt: open.firstOpenedAt,
      studentId: open.studentId,
      aptitudeScore: null,
    }));
  }

  const studentIds = opens
    .map((open) => open.studentId?._id)
    .filter((studentId): studentId is Types.ObjectId => studentId instanceof Types.ObjectId);

  const scores = await PointTransaction.find({
    source: "dpp",
    dppId: dpp._id,
    dppPointType: "aptitude_score",
    studentId: { $in: studentIds },
  })
    .select("studentId points")
    .exec();

  const scoreByStudent = new Map(
    scores.map((score) => [score.studentId.toString(), score.points])
  );

  return opens.map((open) => ({
    _id: open._id,
    firstOpenedAt: open.firstOpenedAt,
    studentId: open.studentId,
    aptitudeScore: scoreByStudent.get(String(open.studentId?._id)) ?? null,
  }));
};

export const createAdminDpp = async (
  req: Request<unknown, unknown, DppBody>,
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

    const validation = validateDppPayload(req.body, { partial: false });
    if (validation.error || !validation.update) {
      return res.status(400).json({
        success: false,
        code: "INVALID_DPP",
        message: validation.error,
      });
    }

    const dpp = await Dpp.create({
      ...validation.update,
      active: validation.update.active ?? true,
      createdBy: new Types.ObjectId(req.auth.userId),
    });

    return res.status(201).json({
      success: true,
      message: "DPP created successfully.",
      dpp: toAdminDpp(dpp),
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Unexpected server error.",
    });
  }
};

export const getAdminDpps = async (_req: Request, res: Response) => {
  try {
    const dpps = await Dpp.find().sort({ type: 1, createdAt: -1 }).exec();
    const openCounts = await getOpenCountsByDpp(dpps.map((dpp) => dpp._id));

    return res.status(200).json({
      success: true,
      dpps: dpps.map((dpp) =>
        toAdminDpp(dpp, openCounts.get(dpp._id.toString()) ?? 0)
      ),
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Unexpected server error.",
    });
  }
};

export const updateAdminDpp = async (
  req: Request<{ dppId: string }, unknown, DppBody>,
  res: Response
) => {
  try {
    const { dppId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(dppId)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_DPP_ID",
        message: "A valid DPP id is required.",
      });
    }

    const validation = validateDppPayload(req.body, { partial: true });
    if (validation.error || !validation.update) {
      return res.status(400).json({
        success: false,
        code: "INVALID_DPP",
        message: validation.error,
      });
    }

    const dpp = await Dpp.findById(dppId).exec();
    if (!dpp) {
      return res.status(404).json({
        success: false,
        code: "DPP_NOT_FOUND",
        message: "DPP not found.",
      });
    }

    if (validation.update.type && validation.update.type !== dpp.type) {
      const existingOpen = await ActivityOpen.exists({
        dppId: dpp._id,
        activityType: { $in: ["dsa_dpp", "aptitude_dpp"] },
      }).exec();

      if (existingOpen) {
        return res.status(409).json({
          success: false,
          code: "DPP_TYPE_LOCKED",
          message: "DPP type cannot be changed after students have opened it.",
        });
      }
    }

    Object.assign(dpp, validation.update);
    await dpp.save();

    const openCounts = await getOpenCountsByDpp([dpp._id]);

    return res.status(200).json({
      success: true,
      message: "DPP updated successfully.",
      dpp: toAdminDpp(dpp, openCounts.get(dpp._id.toString()) ?? 0),
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Unexpected server error.",
    });
  }
};

export const upsertAdminDppScore = async (
  req: Request<{ dppId: string; studentId: string }, unknown, DppScoreBody>,
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

    const { dppId, studentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(dppId)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_DPP_ID",
        message: "A valid DPP id is required.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_STUDENT_ID",
        message: "A valid student id is required.",
      });
    }

    const scoreResult = parseDppScore(req.body.score);
    if (scoreResult.error || scoreResult.score === undefined) {
      return res.status(400).json({
        success: false,
        code: "INVALID_DPP_SCORE",
        message: scoreResult.error,
      });
    }

    const dppObjectId = new Types.ObjectId(dppId);
    const studentObjectId = new Types.ObjectId(studentId);
    const [dpp, student] = await Promise.all([
      Dpp.findById(dppObjectId).exec(),
      User.findOne({
        _id: studentObjectId,
        role: "student",
      })
        .select("_id name usn email branch year")
        .exec(),
    ]);

    if (!dpp) {
      return res.status(404).json({
        success: false,
        code: "DPP_NOT_FOUND",
        message: "DPP not found.",
      });
    }

    if (dpp.type !== "aptitude") {
      return res.status(400).json({
        success: false,
        code: "DPP_SCORE_NOT_SUPPORTED",
        message: "Performance scores are supported only for Aptitude DPPs.",
      });
    }

    if (!student) {
      return res.status(404).json({
        success: false,
        code: "STUDENT_NOT_FOUND",
        message: "Student not found.",
      });
    }

    const activityOpen = await ActivityOpen.exists({
      activityType: "aptitude_dpp",
      dppId: dppObjectId,
      studentId: studentObjectId,
    }).exec();

    if (!activityOpen) {
      return res.status(409).json({
        success: false,
        code: "DPP_NOT_OPENED",
        message: "The student must open this Aptitude DPP before a score can be recorded.",
      });
    }

    const now = new Date();
    const adminObjectId = new Types.ObjectId(req.auth.userId);
    const existingScore = await PointTransaction.findOne({
      source: "dpp",
      dppId: dppObjectId,
      dppPointType: "aptitude_score",
      studentId: studentObjectId,
    }).exec();

    let created = false;
    let scoreTransaction;

    if (existingScore) {
      existingScore.previousPoints = existingScore.points;
      existingScore.points = scoreResult.score;
      existingScore.description = `Aptitude score for ${dpp.title}`;
      existingScore.scoreUpdatedBy = adminObjectId;
      existingScore.scoreUpdatedAt = now;
      scoreTransaction = await existingScore.save();
    } else {
      try {
        scoreTransaction = await PointTransaction.create({
          studentId: studentObjectId,
          points: scoreResult.score,
          source: "dpp",
          dppId: dppObjectId,
          dppPointType: "aptitude_score",
          description: `Aptitude score for ${dpp.title}`,
          awardedBy: adminObjectId,
        });
        created = true;
      } catch (error) {
        if (!isDuplicateKeyError(error)) {
          throw error;
        }

        const winningScore = await PointTransaction.findOne({
          source: "dpp",
          dppId: dppObjectId,
          dppPointType: "aptitude_score",
          studentId: studentObjectId,
        }).exec();

        if (!winningScore) {
          throw error;
        }

        winningScore.previousPoints = winningScore.points;
        winningScore.points = scoreResult.score;
        winningScore.description = `Aptitude score for ${dpp.title}`;
        winningScore.scoreUpdatedBy = adminObjectId;
        winningScore.scoreUpdatedAt = now;
        scoreTransaction = await winningScore.save();
      }
    }

    if (!scoreTransaction) {
      return res.status(500).json({
        success: false,
        message: "Unable to record DPP score.",
      });
    }

    return res.status(200).json({
      success: true,
      message: created
        ? "Aptitude DPP score recorded successfully."
        : "Aptitude DPP score updated successfully.",
      action: created ? "created" : "updated",
      dpp: {
        id: dpp._id.toString(),
        type: dpp.type,
        title: dpp.title,
      },
      student: {
        id: student._id.toString(),
        name: student.name,
        email: student.email,
        usn: student.usn,
        branch: student.branch,
        year: student.year,
      },
      score: {
        id: scoreTransaction._id.toString(),
        dppId: dpp._id.toString(),
        studentId: student._id.toString(),
        aptitudeScore: scoreTransaction.points,
        updatedAt: scoreTransaction.updatedAt,
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Unexpected server error.",
    });
  }
};

export const getAdminDppOpens = async (
  req: Request<{ dppId: string }>,
  res: Response
) => {
  try {
    const { dppId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(dppId)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_DPP_ID",
        message: "A valid DPP id is required.",
      });
    }

    const dpp = await Dpp.findById(dppId).exec();
    if (!dpp) {
      return res.status(404).json({
        success: false,
        code: "DPP_NOT_FOUND",
        message: "DPP not found.",
      });
    }

    const opens = await loadDppOpens(dpp);

    return res.status(200).json({
      success: true,
      dpp: {
        id: dpp._id.toString(),
        type: dpp.type,
        title: dpp.title,
        firstOpenCount: opens.length,
      },
      opens: opens.map(toOpenStudent),
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Unexpected server error.",
    });
  }
};

export const exportAdminDppOpens = async (
  req: Request<{ dppId: string }>,
  res: Response
) => {
  try {
    const { dppId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(dppId)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_DPP_ID",
        message: "A valid DPP id is required.",
      });
    }

    const dpp = await Dpp.findById(dppId).exec();
    if (!dpp) {
      return res.status(404).json({
        success: false,
        code: "DPP_NOT_FOUND",
        message: "DPP not found.",
      });
    }

    const opens = await loadDppOpens(dpp);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "HackerEarth Hub NMAMIT";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("DPP Opens");
    worksheet.columns = [
      { header: "Name", key: "name", width: 28 },
      { header: "USN", key: "usn", width: 16 },
      { header: "Email", key: "email", width: 32 },
      { header: "Phone Number", key: "contactNumber", width: 18 },
      { header: "Year", key: "year", width: 10 },
      { header: "Branch", key: "branch", width: 18 },
      { header: "Opened At", key: "openedAt", width: 22 },
      ...(dpp.type === "aptitude"
        ? [{ header: "Aptitude Score", key: "aptitudeScore", width: 18 }]
        : []),
    ];
    worksheet.getRow(1).font = { bold: true };
    worksheet.views = [{ state: "frozen", ySplit: 1 }];

    opens.forEach((open) => {
      const student = toOpenStudent(open);
      worksheet.addRow({
        name: student.name,
        usn: student.usn,
        email: student.email,
        contactNumber: student.contactNumber,
        year: student.year ?? "",
        branch: student.branch,
        openedAt: student.openedAt,
        ...(dpp.type === "aptitude"
          ? { aptitudeScore: student.aptitudeScore ?? "" }
          : {}),
      });
    });
    worksheet.getColumn("openedAt").numFmt = "yyyy-mm-dd hh:mm";

    const filename = `${dpp.type}-${sanitizeFilenamePart(dpp.title)}-opens.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch {
    return res.status(500).json({
      success: false,
      message: "Unexpected server error.",
    });
  }
};

export const getStudentDpps = async (req: Request, res: Response) => {
  try {
    if (!req.auth) {
      return res.status(401).json({
        success: false,
        code: "AUTH_REQUIRED",
        message: "Authentication is required.",
      });
    }

    const studentObjectId = new Types.ObjectId(req.auth.userId);
    const [student, dpps, openedDppIds] = await Promise.all([
      User.exists({
        _id: studentObjectId,
        role: "student",
        isActive: true,
      }).exec(),
      Dpp.find({ active: true }).sort({ type: 1, createdAt: -1 }).exec(),
      ActivityOpen.distinct("dppId", {
        studentId: studentObjectId,
        activityType: { $in: ["dsa_dpp", "aptitude_dpp"] },
        dppId: { $exists: true },
      }).exec(),
    ]);

    if (!student) {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_INACTIVE",
        message: "This student account is not active.",
      });
    }

    const openedSet = new Set(openedDppIds.map((id) => String(id)));

    return res.status(200).json({
      success: true,
      dpps: dpps.map((dpp) => toStudentDpp(dpp, openedSet)),
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Unexpected server error.",
    });
  }
};

export const openStudentDpp = async (
  req: Request<{ dppId: string }>,
  res: Response
) => {
  let createdOpenId: Types.ObjectId | null = null;

  try {
    if (!req.auth) {
      return res.status(401).json({
        success: false,
        code: "AUTH_REQUIRED",
        message: "Authentication is required.",
      });
    }

    const { dppId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(dppId)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_DPP_ID",
        message: "A valid DPP id is required.",
      });
    }

    const studentObjectId = new Types.ObjectId(req.auth.userId);
    const dppObjectId = new Types.ObjectId(dppId);
    const [student, dpp] = await Promise.all([
      User.findOne({
        _id: studentObjectId,
        role: "student",
        isActive: true,
      })
        .select("_id")
        .exec(),
      Dpp.findOne({ _id: dppObjectId, active: true }).exec(),
    ]);

    if (!student) {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_INACTIVE",
        message: "This student account is not active.",
      });
    }

    if (!dpp) {
      return res.status(404).json({
        success: false,
        code: "DPP_NOT_FOUND",
        message: "Active DPP not found.",
      });
    }

    let firstOpen = true;
    let pointsAwarded = DPP_OPEN_REWARD_POINTS;

    try {
      const activityOpen = await ActivityOpen.create({
        studentId: student._id,
        activityType: toActivityType(dpp.type),
        dppId: dpp._id,
      });
      createdOpenId = activityOpen._id;
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        throw error;
      }

      firstOpen = false;
      pointsAwarded = 0;
    }

    if (firstOpen) {
      try {
        await PointTransaction.create({
          studentId: student._id,
          points: DPP_OPEN_REWARD_POINTS,
          source: "dpp",
          dppId: dpp._id,
          dppPointType: "open_reward",
          description: `First open reward for ${dpp.title}`,
        });
      } catch (error) {
        if (isDuplicateKeyError(error)) {
          if (createdOpenId) {
            await ActivityOpen.deleteOne({ _id: createdOpenId }).exec();
          }
          firstOpen = false;
          pointsAwarded = 0;
        } else {
          if (createdOpenId) {
            await ActivityOpen.deleteOne({ _id: createdOpenId }).exec();
          }
          throw error;
        }
      }
    }

    return res.status(200).json({
      success: true,
      firstOpen,
      pointsAwarded,
      dppUrl: dpp.url,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Unexpected server error.",
    });
  }
};
