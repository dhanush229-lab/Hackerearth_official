import { Request, Response } from "express";
import ExcelJS from "exceljs";
import mongoose, { SortOrder } from "mongoose";
import User, { EnrolledDomain, IUser, VALID_DOMAINS } from "../models/user";
import SystemSettings, { getSystemSettings } from "../models/systemSettings";
import { isStudentRegistrationAvailable } from "../middleware/requireRegistrationOpen";

interface StudentStatusBody {
  isActive?: unknown;
}

interface PasswordResetLimitBody {
  clear?: unknown;
}

interface RegistrationSettingsBody {
  studentRegistrationOpen?: unknown;
  registrationMessage?: unknown;
  registrationOpensAt?: unknown;
  registrationClosesAt?: unknown;
}

interface StudentListFilter {
  role: "student";
  $or?: Array<{ name: RegExp } | { email: RegExp } | { usn: RegExp }>;
  branch?: RegExp;
  year?: number;
  enrolledDomains?: EnrolledDomain;
  isActive?: boolean;
}

interface StudentQueryOptions {
  filter: StudentListFilter;
  sort: Record<string, SortOrder>;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

const MAX_REGISTRATION_MESSAGE_LENGTH = 500;
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const STUDENT_SAFE_FIELDS =
  "name email usn contactNumber branch year enrolledDomains role emailVerified isActive createdAt";
const STUDENT_EXPORT_FIELDS =
  "name email usn contactNumber branch year enrolledDomains emailVerified isActive createdAt";

const isString = (value: unknown): value is string => typeof value === "string";

const normalizeString = (value: unknown): string => {
  return isString(value) ? value.trim() : "";
};

const escapeRegex = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const parsePositiveInteger = (
  value: unknown,
  defaultValue: number,
  maxValue?: number
): number => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return defaultValue;
  }

  return maxValue ? Math.min(parsed, maxValue) : parsed;
};

const buildStudentQueryOptions = (
  query: Request["query"]
): { options?: StudentQueryOptions; response?: { status: number; body: object } } => {
  const filter: StudentListFilter = { role: "student" };

  const search = normalizeString(query.search);
  if (search) {
    const regex = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ name: regex }, { email: regex }, { usn: regex }];
  }

  const branch = normalizeString(query.branch);
  if (branch) {
    filter.branch = new RegExp(`^${escapeRegex(branch)}$`, "i");
  }

  const year = Number(query.year);
  if (query.year !== undefined) {
    if (!Number.isInteger(year) || year < 1 || year > 4) {
      return {
        response: {
          status: 400,
          body: {
            success: false,
            code: "INVALID_QUERY",
            message: "Year must be an integer from 1 to 4.",
          },
        },
      };
    }
    filter.year = year;
  }

  const domain = normalizeString(query.domain);
  if (domain) {
    if (!isValidDomain(domain)) {
      return {
        response: {
          status: 400,
          body: {
            success: false,
            code: "INVALID_QUERY",
            message: "Domain filter contains an invalid value.",
          },
        },
      };
    }
    filter.enrolledDomains = domain;
  }

  const status = normalizeString(query.status);
  if (status) {
    if (status !== "active" && status !== "inactive") {
      return {
        response: {
          status: 400,
          body: {
            success: false,
            code: "INVALID_QUERY",
            message: "Status must be active or inactive.",
          },
        },
      };
    }
    filter.isActive = status === "active";
  }

  const sortBy = normalizeString(query.sortBy) || "createdAt";
  if (!["createdAt", "name", "usn"].includes(sortBy)) {
    return {
      response: {
        status: 400,
        body: {
          success: false,
          code: "INVALID_QUERY",
          message: "sortBy must be createdAt, name, or usn.",
        },
      },
    };
  }

  const sortOrder = normalizeString(query.sortOrder) || "desc";
  if (sortOrder !== "asc" && sortOrder !== "desc") {
    return {
      response: {
        status: 400,
        body: {
          success: false,
          code: "INVALID_QUERY",
          message: "sortOrder must be asc or desc.",
        },
      },
    };
  }

  return {
    options: {
      filter,
      sort: { [sortBy]: sortOrder === "asc" ? 1 : -1 },
      sortBy,
      sortOrder,
    },
  };
};

const isValidDomain = (domain: string): domain is EnrolledDomain => {
  return (VALID_DOMAINS as readonly string[]).includes(domain);
};

const parseOptionalDate = (
  value: unknown
): { date?: Date | null; message?: string } => {
  if (value === undefined) {
    return {};
  }

  if (value === null || value === "") {
    return { date: null };
  }

  if (!isString(value)) {
    return { message: "Date values must be valid ISO date strings or null." };
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return { message: "Date values must be valid ISO date strings or null." };
  }

  return { date };
};

const toSafeStudent = (user: IUser) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  usn: user.usn,
  contactNumber: user.contactNumber,
  branch: user.branch,
  year: user.year,
  enrolledDomains: user.enrolledDomains,
  role: user.role,
  emailVerified: user.emailVerified,
  isActive: user.isActive,
  createdAt: user.createdAt,
});

const toSafeSettings = (settings: Awaited<ReturnType<typeof getSystemSettings>>) => ({
  id: settings._id.toString(),
  key: settings.key,
  studentRegistrationOpen: settings.studentRegistrationOpen,
  registrationMessage: settings.registrationMessage,
  registrationOpensAt: settings.registrationOpensAt,
  registrationClosesAt: settings.registrationClosesAt,
  registrationOpen: isStudentRegistrationAvailable(settings),
  updatedBy: settings.updatedBy?.toString(),
  createdAt: settings.createdAt,
  updatedAt: settings.updatedAt,
});

const createSafeExportFilename = (query: Request["query"]): string => {
  const parts = ["hackerearth_students"];
  const year = normalizeString(query.year);
  const branch = normalizeString(query.branch);
  const status = normalizeString(query.status);
  const domain = normalizeString(query.domain);
  const today = new Date().toISOString().slice(0, 10);

  if (year) parts.push(`year_${year}`);
  if (branch) parts.push(branch.toLowerCase());
  if (domain) parts.push(domain.toLowerCase());
  if (status) parts.push(status.toLowerCase());
  parts.push(today);

  const safeName = parts
    .join("_")
    .replace(/[^a-z0-9_-]+/gi, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

  return `${safeName || `hackerearth_students_${today}`}.xlsx`;
};

export const getAdminOverview = async (_req: Request, res: Response) => {
  try {
    const [
      totalStudents,
      activeStudents,
      inactiveStudents,
      totalAdmins,
      verifiedStudents,
      webDevelopmentStudents,
      dsaStudents,
      aptitudeStudents,
      settings,
    ] = await Promise.all([
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "student", isActive: true }),
      User.countDocuments({ role: "student", isActive: false }),
      User.countDocuments({ role: "admin" }),
      // Legacy compatibility: emailVerified is no longer proof of registration OTP verification.
      User.countDocuments({ role: "student", emailVerified: true }),
      User.countDocuments({ role: "student", enrolledDomains: "Web Development" }),
      User.countDocuments({ role: "student", enrolledDomains: "DSA" }),
      User.countDocuments({ role: "student", enrolledDomains: "Aptitude" }),
      getSystemSettings(),
    ]);

    return res.status(200).json({
      success: true,
      overview: {
        totalStudents,
        activeStudents,
        inactiveStudents,
        totalAdmins,
        verifiedStudents,
        registrationOpen: isStudentRegistrationAvailable(settings),
        domainCounts: {
          webDevelopment: webDevelopmentStudents,
          dsa: dsaStudents,
          aptitude: aptitudeStudents,
        },
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Unexpected server error.",
    });
  }
};

export const getStudents = async (req: Request, res: Response) => {
  try {
    const page = parsePositiveInteger(req.query.page, DEFAULT_PAGE);
    const limit = parsePositiveInteger(req.query.limit, DEFAULT_LIMIT, MAX_LIMIT);
    const skip = (page - 1) * limit;
    const studentQuery = buildStudentQueryOptions(req.query);

    if (studentQuery.response) {
      return res
        .status(studentQuery.response.status)
        .json(studentQuery.response.body);
    }

    if (!studentQuery.options) {
      return res.status(500).json({
        success: false,
        message: "Unexpected server error.",
      });
    }

    const { filter, sort } = studentQuery.options;

    const [students, total] = await Promise.all([
      User.find(filter)
        .select(STUDENT_SAFE_FIELDS)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      User.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      students: students.map(toSafeStudent),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Unexpected server error.",
    });
  }
};

export const exportStudents = async (req: Request, res: Response) => {
  try {
    const studentQuery = buildStudentQueryOptions(req.query);

    if (studentQuery.response) {
      return res
        .status(studentQuery.response.status)
        .json(studentQuery.response.body);
    }

    if (!studentQuery.options) {
      return res.status(500).json({
        success: false,
        message: "Unexpected server error.",
      });
    }

    const { filter, sort } = studentQuery.options;
    const students = await User.find(filter)
      .select(STUDENT_EXPORT_FIELDS)
      .sort(sort)
      .exec();

    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        code: "NO_STUDENTS_FOUND",
        message: "No students match the selected filters.",
      });
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "HackerEarth Hub NMAMIT";
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet("Students", {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    worksheet.columns = [
      { header: "Sl. No.", key: "slNo", width: 10 },
      { header: "Name", key: "name", width: 28 },
      { header: "Email", key: "email", width: 34 },
      { header: "USN", key: "usn", width: 18 },
      { header: "Contact Number", key: "contactNumber", width: 18 },
      { header: "Branch", key: "branch", width: 16 },
      { header: "Year", key: "year", width: 10 },
      { header: "Enrolled Domains", key: "enrolledDomains", width: 34 },
      { header: "Account Status", key: "accountStatus", width: 16 },
      { header: "Email Verified", key: "emailVerified", width: 18 },
      { header: "Registration Date", key: "registrationDate", width: 20 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { vertical: "middle" };
    worksheet.autoFilter = {
      from: "A1",
      to: "K1",
    };

    students.forEach((student, index) => {
      worksheet.addRow({
        slNo: index + 1,
        name: student.name,
        email: student.email,
        usn: student.usn,
        contactNumber: student.contactNumber,
        branch: student.branch,
        year: student.year,
        enrolledDomains: student.enrolledDomains.join(", "),
        accountStatus: student.isActive ? "Active" : "Inactive",
        emailVerified: student.emailVerified ? "Verified" : "Not Verified",
        registrationDate: student.createdAt,
      });
    });

    worksheet.getColumn("registrationDate").numFmt = "yyyy-mm-dd hh:mm";

    const filename = createSafeExportFilename(req.query);
    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );

    return res.status(200).send(Buffer.from(buffer));
  } catch {
    return res.status(500).json({
      success: false,
      message: "Unexpected server error.",
    });
  }
};

export const updateStudentStatus = async (
  req: Request<{ studentId: string }, unknown, StudentStatusBody>,
  res: Response
) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.studentId)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_STUDENT_ID",
        message: "A valid student id is required.",
      });
    }

    if (typeof req.body.isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        code: "INVALID_STATUS",
        message: "isActive must be a boolean value.",
      });
    }

    const student = await User.findOneAndUpdate(
      { _id: req.params.studentId, role: "student" },
      { $set: { isActive: req.body.isActive } },
      {
        new: true,
        runValidators: true,
      }
    ).select(
      "name email usn contactNumber branch year enrolledDomains role emailVerified isActive createdAt"
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        code: "STUDENT_NOT_FOUND",
        message: "Student not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Student status updated successfully.",
      student: toSafeStudent(student),
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Unexpected server error.",
    });
  }
};

const getCurrentCalendarMonth = (date = new Date()): string => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;

  return `${year}-${month}`;
};

export const clearStudentPasswordResetLimit = async (
  req: Request<{ studentId: string }, unknown, PasswordResetLimitBody>,
  res: Response
) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.studentId)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_STUDENT_ID",
        message: "A valid student id is required.",
      });
    }

    if (req.body.clear !== true) {
      return res.status(400).json({
        success: false,
        code: "INVALID_REQUEST",
        message: "clear must be true.",
      });
    }

    const currentMonth = getCurrentCalendarMonth();
    const student = await User.findOneAndUpdate(
      { _id: req.params.studentId, role: "student" },
      {
        $set: {
          passwordResetRequestMonth: currentMonth,
          passwordResetRequestCount: 0,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    ).select(STUDENT_SAFE_FIELDS);

    if (!student) {
      return res.status(404).json({
        success: false,
        code: "STUDENT_NOT_FOUND",
        message: "Student not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Password reset request limit cleared for this month.",
      student: toSafeStudent(student),
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Unexpected server error.",
    });
  }
};

export const getRegistrationSettings = async (_req: Request, res: Response) => {
  try {
    const settings = await getSystemSettings();

    return res.status(200).json({
      success: true,
      settings: toSafeSettings(settings),
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Unexpected server error.",
    });
  }
};

export const updateRegistrationSettings = async (
  req: Request<unknown, unknown, RegistrationSettingsBody>,
  res: Response
) => {
  try {
    const updates: Record<string, unknown> = {};

    if (req.body.studentRegistrationOpen !== undefined) {
      if (typeof req.body.studentRegistrationOpen !== "boolean") {
        return res.status(400).json({
          success: false,
          code: "INVALID_SETTINGS",
          message: "studentRegistrationOpen must be a boolean value.",
        });
      }
      updates.studentRegistrationOpen = req.body.studentRegistrationOpen;
    }

    if (req.body.registrationMessage !== undefined) {
      const registrationMessage = normalizeString(req.body.registrationMessage);
      if (!registrationMessage) {
        return res.status(400).json({
          success: false,
          code: "INVALID_SETTINGS",
          message: "registrationMessage cannot be empty.",
        });
      }

      if (registrationMessage.length > MAX_REGISTRATION_MESSAGE_LENGTH) {
        return res.status(400).json({
          success: false,
          code: "INVALID_SETTINGS",
          message: `registrationMessage cannot exceed ${MAX_REGISTRATION_MESSAGE_LENGTH} characters.`,
        });
      }

      updates.registrationMessage = registrationMessage;
    }

    const opensAtResult = parseOptionalDate(req.body.registrationOpensAt);
    const closesAtResult = parseOptionalDate(req.body.registrationClosesAt);

    if (opensAtResult.message || closesAtResult.message) {
      return res.status(400).json({
        success: false,
        code: "INVALID_SETTINGS",
        message: opensAtResult.message ?? closesAtResult.message,
      });
    }

    if ("date" in opensAtResult) {
      updates.registrationOpensAt = opensAtResult.date;
    }

    if ("date" in closesAtResult) {
      updates.registrationClosesAt = closesAtResult.date;
    }

    const currentSettings = await getSystemSettings();
    const nextOpensAt =
      "registrationOpensAt" in updates
        ? (updates.registrationOpensAt as Date | null | undefined)
        : currentSettings.registrationOpensAt;
    const nextClosesAt =
      "registrationClosesAt" in updates
        ? (updates.registrationClosesAt as Date | null | undefined)
        : currentSettings.registrationClosesAt;

    if (nextOpensAt && nextClosesAt && nextClosesAt <= nextOpensAt) {
      return res.status(400).json({
        success: false,
        code: "INVALID_SETTINGS",
        message: "registrationClosesAt must be later than registrationOpensAt.",
      });
    }

    updates.updatedBy = new mongoose.Types.ObjectId(req.auth?.userId);

    const updatedSettings = await SystemSettings.findOneAndUpdate(
      { key: currentSettings.key },
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    ).exec();

    if (!updatedSettings) {
      return res.status(500).json({
        success: false,
        message: "Unable to update registration settings.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Registration settings updated successfully.",
      settings: toSafeSettings(updatedSettings),
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Unexpected server error.",
    });
  }
};
