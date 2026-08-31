import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import User from "../models/user";
import { EnrolledDomain, VALID_DOMAINS } from "../models/user";

const PASSWORD_SALT_ROUNDS = 12;
const EMAIL_DOMAIN = "@nmamit.in";

interface RegistrationRequestBody {
  name?: unknown;
  email?: unknown;
  usn?: unknown;
  contactNumber?: unknown;
  branch?: unknown;
  year?: unknown;
  password?: unknown;
  confirmPassword?: unknown;
  enrolledDomains?: unknown;
}

interface NormalizedRegistrationInput {
  name: string;
  email: string;
  usn: string;
  contactNumber: string;
  branch: string;
  year: number;
  password: string;
  enrolledDomains: EnrolledDomain[];
}

const isString = (value: unknown): value is string => typeof value === "string";

const isValidDomain = (domain: string): domain is EnrolledDomain => {
  return (VALID_DOMAINS as readonly string[]).includes(domain);
};

const normalizeString = (value: unknown): string => {
  return isString(value) ? value.trim() : "";
};

const isStrongPassword = (password: string): boolean => {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
};

const normalizeRegistrationInput = (
  body: RegistrationRequestBody
): { data?: NormalizedRegistrationInput; message?: string } => {
  const name = normalizeString(body.name);
  const email = normalizeString(body.email).toLowerCase();
  const usn = normalizeString(body.usn).toUpperCase();
  const contactNumber = normalizeString(body.contactNumber);
  const branch = normalizeString(body.branch);
  const password = normalizeString(body.password);
  const confirmPassword = normalizeString(body.confirmPassword);
  const year = Number(body.year);

  if (
    !name ||
    !email ||
    !usn ||
    !contactNumber ||
    !branch ||
    !password ||
    !confirmPassword ||
    body.year === undefined ||
    body.enrolledDomains === undefined
  ) {
    return { message: "All registration fields are required." };
  }

  if (!email.endsWith(EMAIL_DOMAIN)) {
    return { message: "Only official @nmamit.in email addresses may register." };
  }

  if (!/^\d{10}$/.test(contactNumber)) {
    return { message: "Contact number must contain exactly 10 digits." };
  }

  if (!Number.isInteger(year) || year < 2 || year > 4) {
    return { message: "Year must be an integer from 2 to 4." };
  }

  if (password !== confirmPassword) {
    return { message: "Password and confirm password must match." };
  }

  if (!isStrongPassword(password)) {
    return {
      message:
        "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character.",
    };
  }

  if (!Array.isArray(body.enrolledDomains) || body.enrolledDomains.length === 0) {
    return { message: "At least one enrolled domain must be selected." };
  }

  const enrolledDomains = Array.from(
    new Set(body.enrolledDomains.filter(isString).map((domain) => domain.trim()))
  );

  if (
    enrolledDomains.length === 0 ||
    enrolledDomains.some((domain) => !isValidDomain(domain))
  ) {
    return { message: "Enrolled domains contain an invalid value." };
  }

  return {
    data: {
      name,
      email,
      usn,
      contactNumber,
      branch,
      year,
      password,
      enrolledDomains: enrolledDomains as EnrolledDomain[],
    },
  };
};

const getDuplicateKeyMessage = (error: unknown): string | null => {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  ) {
    const keyPattern =
      "keyPattern" in error && typeof error.keyPattern === "object"
        ? error.keyPattern
        : null;

    if (keyPattern && "email" in keyPattern) {
      return "Email is already registered.";
    }

    if (keyPattern && "usn" in keyPattern) {
      return "USN is already registered.";
    }

    return "A registration already exists for these details.";
  }

  return null;
};

export const registerStudent = async (
  req: Request<unknown, unknown, RegistrationRequestBody>,
  res: Response
) => {
  try {
    const normalized = normalizeRegistrationInput(req.body);

    if (!normalized.data) {
      return res.status(400).json({
        success: false,
        message: normalized.message,
      });
    }

    const registration = normalized.data;

    const existingUser = await User.findOne({
      $or: [{ email: registration.email }, { usn: registration.usn }],
    })
      .select("email usn")
      .lean();

    if (existingUser?.email === registration.email) {
      return res.status(409).json({
        success: false,
        code: "EMAIL_ALREADY_REGISTERED",
        message: "Email is already registered.",
      });
    }

    if (existingUser?.usn === registration.usn) {
      return res.status(409).json({
        success: false,
        code: "USN_ALREADY_REGISTERED",
        message: "USN is already registered.",
      });
    }

    const passwordHash = await bcrypt.hash(
      registration.password,
      PASSWORD_SALT_ROUNDS
    );

    const user = await User.create({
      name: registration.name,
      email: registration.email,
      usn: registration.usn,
      contactNumber: registration.contactNumber,
      branch: registration.branch,
      year: registration.year,
      passwordHash,
      enrolledDomains: registration.enrolledDomains,
      role: "student",
      emailVerified: false,
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: "Account created successfully. You can now log in.",
      user: {
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
      },
    });
  } catch (error) {
    const duplicateMessage = getDuplicateKeyMessage(error);

    if (duplicateMessage) {
      return res.status(409).json({
        success: false,
        code:
          duplicateMessage === "Email is already registered."
            ? "EMAIL_ALREADY_REGISTERED"
            : duplicateMessage === "USN is already registered."
              ? "USN_ALREADY_REGISTERED"
              : "REGISTRATION_ALREADY_EXISTS",
        message: duplicateMessage,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unexpected server error.",
    });
  }
};
