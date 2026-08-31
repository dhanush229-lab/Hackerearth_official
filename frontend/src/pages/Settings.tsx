import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FocusEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, FileText, Lock, ShieldCheck, UserRound, X } from "lucide-react";
import PasswordInput from "../components/auth/PasswordInput";
import { useAuth } from "../context/AuthContext";
import type { EnrolledDomain, User } from "../context/AuthContext";
import { ApiError, apiRequest } from "../lib/api";
import { updateStudentProfile } from "../lib/studentApi";
import { cn } from "../lib/utils";
import { useToast } from "../components/ToastProvider";

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ChangePasswordResponse {
  success: boolean;
  message: string;
}

interface ProfileForm {
  name: string;
  contactNumber: string;
  enrolledDomains: EnrolledDomain[];
}

const initialForm: PasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const validDomains: EnrolledDomain[] = ["Web Development", "DSA", "Aptitude"];

const passwordRules = [
  { label: "8 characters", test: (value: string) => value.length >= 8 },
  { label: "1 uppercase letter", test: (value: string) => /[A-Z]/.test(value) },
  { label: "1 lowercase letter", test: (value: string) => /[a-z]/.test(value) },
  { label: "1 number", test: (value: string) => /\d/.test(value) },
  { label: "1 special character", test: (value: string) => /[^A-Za-z0-9]/.test(value) },
];

const getDigitsOnly = (value: string) => value.replace(/\D/g, "");

const normalizeIndianMobileNumber = (value: string): string | null => {
  const digits = getDigitsOnly(value);

  if (/^\d{10}$/.test(digits)) {
    return digits;
  }

  if (/^91\d{10}$/.test(digits)) {
    return digits.slice(2);
  }

  return null;
};

const createProfileForm = (user: User): ProfileForm => ({
  name: user.name,
  contactNumber: user.contactNumber,
  enrolledDomains: user.enrolledDomains,
});

const policySections = [
  {
    title: "Purpose",
    body:
      "HackerEarth Hub is the official centralized platform for managing student registrations, events, DPPs, announcements, and club activities for NMAMIT.",
  },
  {
    title: "User Eligibility",
    body:
      "Only authorized NMAMIT students and administrators may access the platform. Users must register using valid institutional credentials where applicable.",
  },
  {
    title: "Authentication & Security",
    body:
      "Users are responsible for maintaining login credentials. JWT-based authentication and HTTP-only cookies secure user sessions. Unauthorized access or account sharing is prohibited.",
  },
  {
    title: "User Responsibilities",
    body:
      "Provide accurate information and use the platform only for academic and club-related purposes. Do not upload malicious, offensive, or copyrighted content without permission.",
  },
  {
    title: "Administrator Responsibilities",
    body:
      "Manage users, registrations, events, DPPs, announcements, and platform operations fairly and securely.",
  },
  {
    title: "Data Privacy",
    body:
      "User information is collected only for platform operations and protected using appropriate security practices.",
  },
  {
    title: "Acceptable Use",
    body:
      "Users must not exploit vulnerabilities, disrupt services, or misuse platform features.",
  },
  {
    title: "Content Policy",
    body:
      "All content must be relevant to NMAMIT academic or club activities. Inappropriate or illegal content may be removed.",
  },
  {
    title: "Availability",
    body:
      "The platform may undergo maintenance or updates, which may temporarily affect availability.",
  },
  {
    title: "Policy Updates",
    body:
      "The project team may update this policy as new features are introduced. Continued use indicates acceptance of the latest version.",
  },
];

const validatePasswordField = (
  name: keyof PasswordForm,
  value: string,
  form: PasswordForm
) => {
  if (name === "currentPassword" && !value) {
    return "Current password is required.";
  }

  if (name === "newPassword") {
    if (!value) return "New password is required.";
    if (passwordRules.some((rule) => !rule.test(value))) {
      return "Password must satisfy all strength requirements.";
    }
    if (value && value === form.currentPassword) {
      return "New password must be different from your current password.";
    }
  }

  if (name === "confirmPassword") {
    if (!value) return "Confirm new password is required.";
    if (value !== form.newPassword) return "Passwords do not match.";
  }

  return undefined;
};

export default function SettingsPage() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [formData, setFormData] = useState(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof PasswordForm, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof PasswordForm, boolean>>>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<ProfileForm | null>(
    user ? createProfileForm(user) : null
  );
  const [profileErrors, setProfileErrors] = useState<Partial<Record<keyof ProfileForm, string>>>({});
  const [profileMessage, setProfileMessage] = useState("");
  const [isProfileSubmitting, setIsProfileSubmitting] = useState(false);

  useEffect(() => {
    if (user && !isEditingProfile) {
      setProfileForm(createProfileForm(user));
    }
  }, [isEditingProfile, user]);

  const passedPasswordRules = useMemo(
    () => passwordRules.filter((rule) => rule.test(formData.newPassword)).length,
    [formData.newPassword]
  );
  const strengthLabel = ["Very weak", "Weak", "Fair", "Good", "Strong", "Excellent"][passedPasswordRules];
  const strengthColor =
    passedPasswordRules <= 2 ? "bg-highlight" : passedPasswordRules <= 4 ? "bg-primary" : "bg-success";

  if (!user) return null;

  const isStudent = user.role === "student";

  const validateProfileForm = (form: ProfileForm) => {
    const nextErrors: Partial<Record<keyof ProfileForm, string>> = {};
    const normalizedContactNumber = normalizeIndianMobileNumber(form.contactNumber);

    if (!form.name.trim()) {
      nextErrors.name = "Name is required.";
    } else if (form.name.trim().length < 2 || form.name.trim().length > 100) {
      nextErrors.name = "Name must be between 2 and 100 characters.";
    }

    if (!form.contactNumber.trim()) {
      nextErrors.contactNumber = "Contact number is required.";
    } else if (!normalizedContactNumber) {
      const digits = getDigitsOnly(form.contactNumber);
      nextErrors.contactNumber =
        digits.length === 12 && !digits.startsWith("91")
          ? "Contact number with country code must begin with 91."
          : "Enter a valid Indian mobile number.";
    }

    if (form.enrolledDomains.length === 0) {
      nextErrors.enrolledDomains = "Select at least one domain.";
    }

    setProfileErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleProfileEdit = () => {
    setProfileForm(createProfileForm(user));
    setProfileErrors({});
    setProfileMessage("");
    setIsEditingProfile(true);
  };

  const handleProfileCancel = () => {
    setProfileForm(createProfileForm(user));
    setProfileErrors({});
    setProfileMessage("");
    setIsEditingProfile(false);
  };

  const handleProfileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    setProfileForm((current) => {
      if (!current) return current;

      const nextValue = name === "contactNumber" ? getDigitsOnly(value).slice(0, 12) : value;
      const nextForm = { ...current, [name]: nextValue };

      setProfileErrors((currentErrors) => ({
        ...currentErrors,
        [name]: undefined,
      }));
      setProfileMessage("");

      return nextForm;
    });
  };

  const handleProfileDomainToggle = (domain: EnrolledDomain) => {
    if (user.enrolledDomains.includes(domain)) {
      return;
    }

    setProfileForm((current) => {
      if (!current) return current;

      const isSelected = current.enrolledDomains.includes(domain);
      const enrolledDomains = isSelected
        ? current.enrolledDomains.filter((selectedDomain) => selectedDomain !== domain)
        : [...current.enrolledDomains, domain];

      setProfileErrors((currentErrors) => ({
        ...currentErrors,
        enrolledDomains: undefined,
      }));
      setProfileMessage("");

      return { ...current, enrolledDomains };
    });
  };

  const handleProfileSave = async () => {
    if (!profileForm) return;

    setProfileMessage("");

    if (!validateProfileForm(profileForm)) {
      return;
    }

    const normalizedContactNumber = normalizeIndianMobileNumber(profileForm.contactNumber);

    if (!normalizedContactNumber) {
      return;
    }

    setIsProfileSubmitting(true);

    try {
      const data = await updateStudentProfile({
        name: profileForm.name.trim(),
        contactNumber: normalizedContactNumber,
        enrolledDomains: profileForm.enrolledDomains,
      });

      await refreshUser();
      setIsEditingProfile(false);
      setProfileErrors({});
      setProfileMessage(data.message || "Profile updated successfully.");
      showToast({ variant: "success", message: data.message || "Profile updated successfully." });
    } catch (error) {
      const errorMessage =
        error instanceof ApiError
          ? error.message
          : "Unable to update profile right now. Please try again.";

      setProfileMessage(errorMessage);
      showToast({ variant: "error", message: errorMessage });
    } finally {
      setIsProfileSubmitting(false);
    }
  };

  const validateForm = () => {
    const nextErrors: Partial<Record<keyof PasswordForm, string>> = {};

    (Object.keys(formData) as Array<keyof PasswordForm>).forEach((field) => {
      const error = validatePasswordField(field, formData[field], formData);
      if (error) nextErrors[field] = error;
    });

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const fieldName = event.target.name as keyof PasswordForm;
    const nextForm = { ...formData, [fieldName]: event.target.value };

    setFormData(nextForm);
    setMessage("");

    if (hasSubmitted || touched[fieldName]) {
      setErrors((current) => ({
        ...current,
        [fieldName]: validatePasswordField(fieldName, nextForm[fieldName], nextForm),
        ...(fieldName !== "confirmPassword" && (hasSubmitted || touched.confirmPassword)
          ? {
              confirmPassword: validatePasswordField(
                "confirmPassword",
                nextForm.confirmPassword,
                nextForm
              ),
            }
          : {}),
        ...(fieldName === "currentPassword" && (hasSubmitted || touched.newPassword)
          ? {
              newPassword: validatePasswordField(
                "newPassword",
                nextForm.newPassword,
                nextForm
              ),
            }
          : {}),
      }));
    }
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    const fieldName = event.target.name as keyof PasswordForm;
    setTouched((current) => ({ ...current, [fieldName]: true }));
    setErrors((current) => ({
      ...current,
      [fieldName]: validatePasswordField(fieldName, formData[fieldName], formData),
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasSubmitted(true);
    setTouched({
      currentPassword: true,
      newPassword: true,
      confirmPassword: true,
    });
    setMessage("");
    setIsSuccess(false);

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const data = await apiRequest<ChangePasswordResponse>("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify(formData),
      });

      const successMessage =
        data.message ||
        "Password updated successfully. Please log in again with your new password.";
      setIsSuccess(true);
      setMessage(successMessage);
      showToast({ variant: "success", message: successMessage });

      window.setTimeout(() => {
        void logout().finally(() => navigate("/login", { replace: true }));
      }, 1100);
    } catch (error) {
      setIsSuccess(false);

      const errorMessage =
        error instanceof ApiError
          ? error.message
          : "Unable to connect to the server. Please try again.";

      setMessage(errorMessage);
      showToast({ variant: "error", message: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative isolate min-h-screen overflow-x-hidden bg-transparent text-ink">
      <div className="site-container-wide space-y-8 pb-section pt-24 sm:pt-28 lg:pt-32">
        <header className="ui-panel-glass relative overflow-hidden p-5 sm:p-7 lg:p-8">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-dream/10"
              />
              <div className="relative max-w-3xl">
                <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-technical-text">
                  Account control
                </p>
                <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                  Settings
                </h1>
                <p className="mt-3 text-sm leading-6 text-ink-muted sm:text-base">
                  Manage your account security and review HackerEarth Hub policies.
                </p>
              </div>
        </header>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start">
              <section className="ui-panel-glass p-5 sm:p-6" aria-labelledby="account-heading">
                <div className="flex items-start gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-control border border-primary/25 bg-primary/10 text-primary-text">
                    <UserRound className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-primary-text">
                      Account
                    </p>
                    <h2 id="account-heading" className="mt-1 font-display text-2xl font-semibold text-ink">
                      Security
                    </h2>
                  </div>
                </div>

                <div className="mt-6 rounded-card border border-line/80 bg-surface/80 p-4 text-sm shadow-soft">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-display text-lg font-semibold text-ink">
                        Account Details
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-ink-muted">
                        Review your identity details and update student profile preferences.
                      </p>
                    </div>
                    {isStudent && !isEditingProfile && (
                      <button
                        type="button"
                        className="btn btn-secondary w-full sm:w-auto"
                        onClick={handleProfileEdit}
                      >
                        Edit Profile
                      </button>
                    )}
                  </div>

                  {isEditingProfile && profileForm ? (
                    <div className="mt-5 grid gap-4">
                      <div>
                        <label htmlFor="profile-name" className="block text-sm font-semibold text-ink">
                          Name
                        </label>
                        <input
                          id="profile-name"
                          name="name"
                          type="text"
                          value={profileForm.name}
                          onChange={handleProfileChange}
                          className={cn(
                            "mt-2 w-full rounded-control border bg-surface px-4 py-3 text-sm font-medium text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30",
                            profileErrors.name ? "border-rose/60" : "border-line"
                          )}
                          aria-invalid={Boolean(profileErrors.name)}
                          aria-describedby={profileErrors.name ? "profile-name-error" : undefined}
                        />
                        {profileErrors.name && (
                          <p id="profile-name-error" className="mt-2 text-sm font-semibold text-rose-text" role="alert">
                            {profileErrors.name}
                          </p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="profile-contact-number" className="block text-sm font-semibold text-ink">
                          Contact Number
                        </label>
                        <div className="mt-2 flex overflow-hidden rounded-control border border-line bg-surface transition-with-motion focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30">
                          <span className="flex items-center border-r border-line bg-surface-muted px-3 text-sm font-semibold text-ink">
                            +91
                          </span>
                          <input
                            id="profile-contact-number"
                            name="contactNumber"
                            type="tel"
                            inputMode="numeric"
                            value={profileForm.contactNumber}
                            onChange={handleProfileChange}
                            maxLength={12}
                            placeholder="Enter mobile number"
                            className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm font-medium text-ink outline-none placeholder:text-ink-subtle"
                            aria-invalid={Boolean(profileErrors.contactNumber)}
                            aria-describedby={profileErrors.contactNumber ? "profile-contact-number-error" : undefined}
                          />
                        </div>
                        {profileErrors.contactNumber && (
                          <p id="profile-contact-number-error" className="mt-2 text-sm font-semibold text-rose-text" role="alert">
                            {profileErrors.contactNumber}
                          </p>
                        )}
                      </div>

                      <fieldset>
                        <legend className="text-sm font-semibold text-ink">
                          Enrolled Domains
                        </legend>
                        <div className="mt-3 grid gap-3 sm:grid-cols-3">
                          {validDomains.map((domain) => {
                            const selected = profileForm.enrolledDomains.includes(domain);
                            const locked = user.enrolledDomains.includes(domain);
                            const statusLabel = locked
                              ? "Enrolled"
                              : selected
                                ? "Will be added"
                                : "Available to add";

                            return (
                              <button
                                key={domain}
                                type="button"
                                onClick={() => handleProfileDomainToggle(domain)}
                                className={cn(
                                  "flex min-h-[5rem] items-start justify-between gap-3 rounded-card border p-3 text-left transition-with-motion focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                                  selected
                                    ? "border-primary/70 bg-primary/10 shadow-glow"
                                    : "border-line bg-surface-muted/70 hover:border-primary/45",
                                  locked && "cursor-not-allowed hover:border-primary/70"
                                )}
                                aria-pressed={selected}
                                aria-disabled={locked}
                                disabled={locked}
                              >
                                <span>
                                  <span className="block font-semibold text-ink">{domain}</span>
                                  <span className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-ink-subtle">
                                    {locked && <Lock className="size-3.5" aria-hidden="true" />}
                                    {statusLabel}
                                  </span>
                                </span>
                                <span
                                  className={cn(
                                    "flex size-6 shrink-0 items-center justify-center rounded-full border",
                                    selected
                                      ? "border-primary/60 bg-primary text-ink-inverse"
                                      : "border-line text-ink-subtle"
                                  )}
                                  aria-hidden="true"
                                >
                                  {selected && <Check className="size-4" />}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        {profileErrors.enrolledDomains && (
                          <p className="mt-2 text-sm font-semibold text-rose-text" role="alert">
                            {profileErrors.enrolledDomains}
                          </p>
                        )}
                      </fieldset>

                      <div className="grid gap-3 border-t border-line/70 pt-4 sm:grid-cols-2">
                        <div>
                          <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
                            Email
                          </p>
                          <p className="mt-1 break-words font-semibold text-ink">{user.email}</p>
                        </div>
                        <div>
                          <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
                            USN
                          </p>
                          <p className="mt-1 break-words font-semibold text-ink">{user.usn}</p>
                        </div>
                        <div>
                          <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
                            Branch
                          </p>
                          <p className="mt-1 break-words font-semibold text-ink">{user.branch}</p>
                        </div>
                        <div>
                          <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
                            Year
                          </p>
                          <p className="mt-1 font-semibold text-ink">{user.year}</p>
                        </div>
                      </div>

                      {profileMessage && (
                        <p className="rounded-control border border-highlight/40 bg-highlight/10 px-4 py-3 text-sm font-medium text-highlight-text" role="alert">
                          {profileMessage}
                        </p>
                      )}

                      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={handleProfileCancel}
                          disabled={isProfileSubmitting}
                        >
                          <X className="size-4" aria-hidden="true" />
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={handleProfileSave}
                          disabled={isProfileSubmitting}
                        >
                          {isProfileSubmitting && (
                            <span
                              className="size-4 rounded-full border-2 border-ink-inverse/40 border-b-ink-inverse animate-spin motion-reduce:animate-none"
                              aria-hidden="true"
                            />
                          )}
                          {isProfileSubmitting ? "Saving changes..." : "Save Changes"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                      <div>
                        <dt className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
                          Name
                        </dt>
                        <dd className="mt-1 break-words font-semibold text-ink">{user.name}</dd>
                      </div>
                      <div>
                        <dt className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
                          Email
                        </dt>
                        <dd className="mt-1 break-words font-semibold text-ink">{user.email}</dd>
                      </div>
                      <div>
                        <dt className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
                          USN
                        </dt>
                        <dd className="mt-1 break-words font-semibold text-ink">{user.usn}</dd>
                      </div>
                      <div>
                        <dt className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
                          Contact Number
                        </dt>
                        <dd className="mt-1 font-semibold text-ink">+91 {user.contactNumber}</dd>
                      </div>
                      <div>
                        <dt className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
                          Branch
                        </dt>
                        <dd className="mt-1 break-words font-semibold text-ink">{user.branch}</dd>
                      </div>
                      <div>
                        <dt className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
                          Year
                        </dt>
                        <dd className="mt-1 font-semibold text-ink">{user.year}</dd>
                      </div>
                      <div>
                        <dt className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
                          Role
                        </dt>
                        <dd className="mt-2">
                          <span className="inline-flex rounded-full border border-dream/30 bg-dream/10 px-3 py-1.5 text-xs font-semibold capitalize text-dream-text">
                            {user.role}
                          </span>
                        </dd>
                      </div>
                      <div>
                        <dt className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
                          Domains
                        </dt>
                        <dd className="mt-2 flex flex-wrap gap-2">
                          {user.enrolledDomains.map((domain) => (
                            <span
                              key={domain}
                              className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-text"
                            >
                              {domain}
                            </span>
                          ))}
                        </dd>
                      </div>
                    </dl>
                  )}
                </div>

                <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
                  <PasswordInput
                    id="currentPassword"
                    name="currentPassword"
                    label="Current Password"
                    value={formData.currentPassword}
                    error={errors.currentPassword}
                    autoComplete="current-password"
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />

                  <div>
                    <PasswordInput
                      id="newPassword"
                      name="newPassword"
                      label="New Password"
                      value={formData.newPassword}
                      error={errors.newPassword}
                      autoComplete="new-password"
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                    <div className="mt-2 space-y-1.5" aria-live="polite">
                      <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
                        <div
                          className={cn("h-full rounded-full transition-[width] duration-300", strengthColor)}
                          style={{ width: `${(passedPasswordRules / passwordRules.length) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs font-medium text-ink-muted">
                        Password strength: {strengthLabel}
                      </p>
                      <div className="grid gap-x-3 gap-y-0.5 text-[0.72rem] leading-5 text-ink-muted sm:grid-cols-2">
                        {passwordRules.map((rule) => (
                          <span
                            key={rule.label}
                            className={cn(rule.test(formData.newPassword) && "text-success-text")}
                          >
                            {rule.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <PasswordInput
                    id="confirmPassword"
                    name="confirmPassword"
                    label="Confirm New Password"
                    value={formData.confirmPassword}
                    error={errors.confirmPassword}
                    autoComplete="new-password"
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />

                  {message && (
                    <p
                      className={cn(
                        "rounded-control border px-4 py-3 text-sm font-medium",
                        isSuccess
                          ? "border-success/40 bg-success/10 text-success-text"
                          : "border-highlight/40 bg-highlight/10 text-highlight-text"
                      )}
                      role={isSuccess ? "status" : "alert"}
                    >
                      {message}
                    </p>
                  )}

                  <button
                    type="submit"
                    className="btn btn-primary w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting && (
                      <span
                        className="size-4 rounded-full border-2 border-ink-inverse/40 border-b-ink-inverse animate-spin motion-reduce:animate-none"
                        aria-hidden="true"
                      />
                    )}
                    {isSubmitting ? "Updating password..." : "Update Password"}
                    {!isSubmitting && <ArrowRight className="size-4" aria-hidden="true" />}
                  </button>
                </form>
              </section>

              <section className="ui-panel-glass overflow-hidden p-5 sm:p-6" aria-labelledby="policy-heading">
                <div className="flex items-start gap-3 border-b border-line/80 pb-5">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-control border border-technical/25 bg-technical/10 text-technical-text">
                    <FileText className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-technical-text">
                      Site policy
                    </p>
                    <h2 id="policy-heading" className="mt-1 font-display text-2xl font-semibold text-ink">
                      HackerEarth Hub NMAMIT – Site Policy
                    </h2>
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  {policySections.map((section, index) => (
                    <article
                      key={section.title}
                      className="rounded-card border border-line/80 bg-surface/80 p-4 shadow-soft"
                    >
                      <div className="flex gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-control border border-dream/30 bg-dream/10 font-mono text-xs font-bold text-dream-text">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <h3 className="font-display text-base font-semibold text-ink">
                            {section.title}
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-ink-muted">
                            {section.body}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="mt-5 flex items-start gap-3 rounded-card border border-dream/25 bg-dream/10 p-4 text-sm leading-6 text-ink-muted">
                  <ShieldCheck className="mt-0.5 size-5 shrink-0 text-dream-text" aria-hidden="true" />
                  <p>
                    Continued use indicates acceptance of the latest HackerEarth Hub NMAMIT project policy.
                  </p>
                </div>
              </section>
          </div>
        </div>
      </main>
  );
}
