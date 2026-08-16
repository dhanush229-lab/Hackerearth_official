import { Request, Response } from "express";
import User, { EnrolledDomain, VALID_DOMAINS } from "../models/user";

interface DomainGroup {
  domain: EnrolledDomain;
  joinUrl: string;
}

const DOMAIN_GROUP_ENV_KEYS: Record<EnrolledDomain, string> = {
  "Web Development": "WHATSAPP_WEB_DEVELOPMENT_URL",
  DSA: "WHATSAPP_DSA_URL",
  Aptitude: "WHATSAPP_APTITUDE_URL",
};

const getConfiguredDomainGroups = (
  enrolledDomains: EnrolledDomain[]
): DomainGroup[] => {
  return enrolledDomains.flatMap((domain) => {
    const joinUrl = process.env[DOMAIN_GROUP_ENV_KEYS[domain]]?.trim();

    if (!joinUrl) {
      return [];
    }

    return [{ domain, joinUrl }];
  });
};

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

export const getStudentDomainGroups = async (req: Request, res: Response) => {
  try {
    if (!req.auth) {
      return res.status(401).json({
        success: false,
        code: "AUTH_REQUIRED",
        message: "Authentication is required.",
      });
    }

    const student = await User.findById(req.auth.userId)
      .select("enrolledDomains isActive role")
      .exec();

    if (!student) {
      return res.status(401).json({
        success: false,
        code: "INVALID_TOKEN",
        message: "Invalid authentication token.",
      });
    }

    if (student.role !== "student") {
      return res.status(403).json({
        success: false,
        code: "FORBIDDEN",
        message: "You do not have permission to access this resource.",
      });
    }

    if (!student.isActive) {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_INACTIVE",
        message: "This account is currently inactive.",
      });
    }

    return res.status(200).json({
      success: true,
      groups: getConfiguredDomainGroups(student.enrolledDomains),
    });
  } catch (_error) {
    return res.status(500).json({
      success: false,
      message: "Unexpected server error.",
    });
  }
};

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
      { _id: req.auth.userId, role: "student", isActive: true },
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
        .select("isActive")
        .exec();

      if (existingStudent && !existingStudent.isActive) {
        return res.status(403).json({
          success: false,
          code: "ACCOUNT_INACTIVE",
          message: "This account is currently inactive.",
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
