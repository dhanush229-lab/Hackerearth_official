import { Request, Response } from "express";
import User, { EnrolledDomain, VALID_DOMAINS } from "../models/user";
import {
  getStudentOverallRank,
  getStudentWeeklyRank,
} from "../services/leaderboardService";

const safeUserFields =
  "name email usn contactNumber branch year enrolledDomains role emailVerified isActive";

const allowedProfileUpdateFields = new Set([
  "name",
  "contactNumber",
  "enrolledDomains",
]);

const isValidDomain = (domain: string): domain is EnrolledDomain => {
  return (VALID_DOMAINS as readonly string[]).includes(domain);
};

const normalizeDomains = (domains: unknown): EnrolledDomain[] | null => {
  if (!Array.isArray(domains)) {
    return null;
  }

  const normalized = domains
    .filter((domain): domain is string => typeof domain === "string")
    .map((domain) => domain.trim());

  if (normalized.length !== domains.length) {
    return null;
  }

  if (normalized.some((domain) => !isValidDomain(domain))) {
    return null;
  }

  return Array.from(new Set(normalized)) as EnrolledDomain[];
};

const includesAllExistingDomains = (
  currentDomains: EnrolledDomain[],
  requestedDomains: EnrolledDomain[]
) => {
  return currentDomains.every((domain) => requestedDomains.includes(domain));
};

const formatSafeUser = (user: {
  _id: unknown;
  name: string;
  email: string;
  usn: string;
  contactNumber: string;
  branch: string;
  year: number;
  enrolledDomains: EnrolledDomain[];
  role: string;
  emailVerified: boolean;
  isActive: boolean;
}) => ({
  id: String(user._id),
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
});

export const updateStudentProfile = async (req: Request, res: Response) => {
  try {
    if (!req.auth) {
      return res.status(401).json({
        success: false,
        code: "AUTH_REQUIRED",
        message: "Authentication is required.",
      });
    }

    const body = req.body as Record<string, unknown>;
    const requestedFields = Object.keys(body);
    const hasProtectedFields = requestedFields.some(
      (field) => !allowedProfileUpdateFields.has(field)
    );

    if (hasProtectedFields) {
      return res.status(400).json({
        success: false,
        code: "INVALID_PROFILE_UPDATE",
        message: "Only name, contact number, and enrolled domains can be updated.",
      });
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const contactNumber =
      typeof body.contactNumber === "string" ? body.contactNumber.trim() : "";
    const enrolledDomains = normalizeDomains(body.enrolledDomains);

    if (!name) {
      return res.status(400).json({
        success: false,
        code: "INVALID_NAME",
        message: "Name is required.",
      });
    }

    if (name.length < 2 || name.length > 100) {
      return res.status(400).json({
        success: false,
        code: "INVALID_NAME",
        message: "Name must be between 2 and 100 characters.",
      });
    }

    if (!/^\d{10}$/.test(contactNumber)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_CONTACT_NUMBER",
        message: "Enter a valid Indian mobile number.",
      });
    }

    if (!enrolledDomains || enrolledDomains.length === 0) {
      return res.status(400).json({
        success: false,
        code: "INVALID_DOMAINS",
        message: "Select at least one valid domain.",
      });
    }

    const student = await User.findOneAndUpdate(
      {
        _id: req.auth.userId,
        role: "student",
        isActive: true,
        enrolledDomains: {
          $not: {
            $elemMatch: {
              $nin: enrolledDomains,
            },
          },
        },
      },
      { $set: { name, contactNumber, enrolledDomains } },
      { new: true, runValidators: true }
    )
      .select(safeUserFields)
      .exec();

    if (!student) {
      const existingStudent = await User.findOne({
        _id: req.auth.userId,
        role: "student",
      })
        .select("isActive enrolledDomains")
        .exec();

      if (existingStudent && !existingStudent.isActive) {
        return res.status(403).json({
          success: false,
          code: "ACCOUNT_INACTIVE",
          message: "This account is currently inactive.",
        });
      }

      if (
        existingStudent &&
        !includesAllExistingDomains(existingStudent.enrolledDomains, enrolledDomains)
      ) {
        return res.status(400).json({
          success: false,
          code: "DOMAIN_REMOVAL_NOT_ALLOWED",
          message: "Existing enrolled domains cannot be removed.",
        });
      }

      return res.status(404).json({
        success: false,
        code: "STUDENT_NOT_FOUND",
        message: "Student account was not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user: formatSafeUser(student),
    });
  } catch (_error) {
    return res.status(500).json({
      success: false,
      message: "Unexpected server error.",
    });
  }
};

export const getStudentRank = async (req: Request, res: Response) => {
  try {
    if (!req.auth) {
      return res.status(401).json({
        success: false,
        code: "AUTH_REQUIRED",
        message: "Authentication is required.",
      });
    }

    const rank = await getStudentOverallRank(req.auth.userId);

    if (!rank) {
      return res.status(404).json({
        success: false,
        code: "STUDENT_NOT_FOUND",
        message: "Student account was not found.",
      });
    }

    return res.status(200).json({
      success: true,
      rank,
    });
  } catch (_error) {
    return res.status(500).json({
      success: false,
      message: "Unexpected server error.",
    });
  }
};

export const getStudentWeeklyStanding = async (
  req: Request,
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

    if (
      req.query.scope !== undefined &&
      req.query.scope !== "all" &&
      req.query.scope !== "week"
    ) {
      return res.status(400).json({
        success: false,
        code: "INVALID_SCOPE",
        message: "Weekly standing scope must be all or week.",
      });
    }

    const scope = req.query.scope === "all" ? "all" : "week";
    const week = Number(req.query.week);

    if (scope === "week" && (!Number.isInteger(week) || week < 1 || week > 10)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_WEEK",
        message: "A valid week number from 1 to 10 is required.",
      });
    }

    const rank = await getStudentWeeklyRank(
      req.auth.userId,
      scope === "week" ? week : undefined,
      scope
    );

    if (!rank) {
      return res.status(404).json({
        success: false,
        code: "STUDENT_NOT_FOUND",
        message: "Student account was not found.",
      });
    }

    return res.status(200).json({
      success: true,
      rank,
    });
  } catch (_error) {
    return res.status(500).json({
      success: false,
      message: "Unexpected server error.",
    });
  }
};
