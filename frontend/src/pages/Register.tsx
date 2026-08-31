import { FormEvent, useMemo, useState } from "react";
import type { ChangeEvent, FocusEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Mail, Phone, User } from "lucide-react";
import AuthInput from "../components/auth/AuthInput";
import AuthShell from "../components/auth/AuthShell";
import AuthThemeToggle from "../components/auth/AuthThemeToggle";
import AuthVisual from "../components/auth/AuthVisual";
import DomainSelector from "../components/auth/DomainSelector";
import type { Domain } from "../components/auth/DomainSelector";
import PasswordInput from "../components/auth/PasswordInput";
import { useToast } from "../components/ToastProvider";
import { useAuth } from "../context/AuthContext";
import { cn } from "../lib/utils";
import { registrationBranchOptions } from "../lib/registrationBranches";
import logo from "../assets/image.png";

interface RegisterForm {
  name: string;
  email: string;
  usn: string;
  contactNumber: string;
  branch: string;
  year: string;
  password: string;
  confirmPassword: string;
}

const initialForm: RegisterForm = {
  name: "",
  email: "",
  usn: "",
  contactNumber: "",
  branch: "",
  year: "",
  password: "",
  confirmPassword: "",
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const API_BASE_URL = import.meta.env.VITE_API_URL ?? "";
const passwordRules = [
  { label: "8 characters", test: (value: string) => value.length >= 8 },
  { label: "1 uppercase letter", test: (value: string) => /[A-Z]/.test(value) },
  { label: "1 lowercase letter", test: (value: string) => /[a-z]/.test(value) },
  { label: "1 number", test: (value: string) => /\d/.test(value) },
  { label: "1 special character", test: (value: string) => /[^A-Za-z0-9]/.test(value) },
];
const validBranchCodes = new Set<string>(registrationBranchOptions.map((option) => option.value));

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

export default function RegisterPage() {
  const [formData, setFormData] = useState<RegisterForm>(initialForm);
  const [selectedDomains, setSelectedDomains] = useState<Domain[]>([]);
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterForm | "domains", string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof RegisterForm | "domains", boolean>>>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { login } = useAuth();

  const passedPasswordRules = useMemo(() => passwordRules.filter((rule) => rule.test(formData.password)).length, [formData.password]);
  const strengthLabel = ["Very weak", "Weak", "Fair", "Good", "Strong", "Excellent"][passedPasswordRules];
  const strengthColor = passedPasswordRules <= 2 ? "bg-highlight" : passedPasswordRules <= 4 ? "bg-primary" : "bg-success";

  const getPasswordRuleCount = (password: string) => passwordRules.filter((rule) => rule.test(password)).length;

  const validateField = (name: keyof RegisterForm | "domains", value: string | Domain[], nextForm = formData) => {
    if (name === "domains") {
      return Array.isArray(value) && value.length > 0 ? undefined : "Select at least one domain.";
    }

    const fieldValue = String(value);

    if (name === "name" && !fieldValue.trim()) return "Name is required.";
    if (name === "email") {
      const email = fieldValue.trim();
      if (!email) return "Email ID is required.";
      if (!emailPattern.test(email)) return "Enter a valid email address.";
      if (!email.toLowerCase().endsWith("@nmamit.in")) return "Use your official @nmamit.in email address.";
    }
    if (name === "usn" && !fieldValue.trim()) return "USN is required.";
    if (name === "contactNumber") {
      const digits = getDigitsOnly(fieldValue);
      if (!digits) return "Contact number is required.";
      if (digits.length === 12 && !digits.startsWith("91")) return "Contact number with country code must begin with 91.";
      if (!normalizeIndianMobileNumber(digits)) return "Enter a valid Indian mobile number.";
    }
    if (name === "branch") {
      if (!fieldValue) return "Branch is required.";
      if (!validBranchCodes.has(fieldValue)) return "Select a valid branch.";
    }
    if (name === "year") {
      const year = Number(fieldValue);
      if (!fieldValue) return "Year is required.";
      if (!Number.isInteger(year) || year < 2 || year > 4)
        return "Year must be from 2 to 4.";
    }
    if (name === "password") {
      if (!fieldValue) return "Password is required.";
      if (getPasswordRuleCount(fieldValue) < passwordRules.length) return "Password must satisfy all strength requirements.";
    }
    if (name === "confirmPassword") {
      if (!fieldValue) return "Confirm password is required.";
      if (fieldValue !== nextForm.password) return "Passwords do not match.";
    }

    return undefined;
  };

  const validateForm = () => {
    const nextErrors: Partial<Record<keyof RegisterForm | "domains", string>> = {};

    (["name", "email", "usn", "contactNumber", "branch", "year", "password", "confirmPassword"] as Array<keyof RegisterForm>).forEach((field) => {
      const error = validateField(field, formData[field]);
      if (error) nextErrors[field] = error;
    });
    const domainsError = validateField("domains", selectedDomains);
    if (domainsError) nextErrors.domains = domainsError;

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    const fieldName = name as keyof RegisterForm;
    const nextValue = name === "contactNumber" ? getDigitsOnly(value).slice(0, 12) : value;
    const nextForm = { ...formData, [fieldName]: nextValue };

    setFormData(nextForm);
    if (hasSubmitted || touched[fieldName] || (fieldName === "password" && touched.confirmPassword)) {
      setErrors((current) => ({
        ...current,
        ...(hasSubmitted || touched[fieldName] ? { [fieldName]: validateField(fieldName, nextValue, nextForm) } : {}),
        ...(fieldName === "password" && (hasSubmitted || touched.confirmPassword)
          ? { confirmPassword: validateField("confirmPassword", nextForm.confirmPassword, nextForm) }
          : {}),
      }));
    }
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const fieldName = event.target.name as keyof RegisterForm;
    setTouched((current) => ({ ...current, [fieldName]: true }));
    setErrors((current) => ({ ...current, [fieldName]: validateField(fieldName, formData[fieldName]) }));
  };

  const handleDomainChange = (domains: Domain[]) => {
    setSelectedDomains(domains);
    if (hasSubmitted || touched.domains) {
      setErrors((current) => ({ ...current, domains: validateField("domains", domains) }));
    }
  };

  const handleDomainBlur = () => {
    setTouched((current) => ({ ...current, domains: true }));
    setErrors((current) => ({ ...current, domains: validateField("domains", selectedDomains) }));
  };

  const parseResponseJson = async (response: Response): Promise<Record<string, unknown>> => {
    try {
      const data = await response.json();
      return data && typeof data === "object" ? data : {};
    } catch {
      return {};
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasSubmitted(true);
    setTouched({
      name: true,
      email: true,
      usn: true,
      contactNumber: true,
      branch: true,
      year: true,
      password: true,
      confirmPassword: true,
      domains: true,
    });
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const normalizedEmail = formData.email.trim().toLowerCase();
      const normalizedContactNumber = normalizeIndianMobileNumber(formData.contactNumber);

      if (!normalizedContactNumber) {
        setErrors((current) => ({
          ...current,
          contactNumber: "Enter a valid Indian mobile number.",
        }));
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: formData.name.trim(),
          email: normalizedEmail,
          usn: formData.usn.trim().toUpperCase(),
          contactNumber: normalizedContactNumber,
          branch: formData.branch.trim(),
          year: Number(formData.year),
          password: formData.password,
          confirmPassword: formData.confirmPassword,
          enrolledDomains: selectedDomains,
        }),
      });

      const data = await parseResponseJson(response);

      if (!response.ok || data.success === false) {
        const backendMessage =
          typeof data.message === "string"
            ? data.message
            : "Unable to create account. Please try again.";
        const backendCode = typeof data.code === "string" ? data.code : "";
        const isEmailAlreadyRegistered =
          backendCode === "EMAIL_ALREADY_REGISTERED" ||
          backendMessage.toLowerCase().includes("email is already registered");

        showToast({
          variant: isEmailAlreadyRegistered ? "warning" : "error",
          title: isEmailAlreadyRegistered ? "Email already registered" : "Registration failed",
          message: isEmailAlreadyRegistered
            ? "This email is already registered. Please log in instead."
            : backendMessage,
          action: isEmailAlreadyRegistered ? (
            <Link
              to="/login"
              className="inline-flex min-h-9 items-center rounded-control border border-highlight/40 bg-highlight/10 px-3 text-sm font-semibold text-highlight-text transition hover:bg-highlight/20 focus-visible:outline-offset-2"
            >
              Login
            </Link>
          ) : undefined,
        });
        return;
      }

      showToast({
        variant: "success",
        title: "Account created",
        message: "Account created successfully. Opening your dashboard...",
      });

      try {
        const user = await login(normalizedEmail, formData.password);
        navigate(user.role === "admin" ? "/admin/dashboard" : "/student/dashboard", {
          replace: true,
        });
      } catch {
        showToast({
          variant: "info",
          title: "Registration successful",
          message: "Registration successful. Please log in to continue.",
        });
        navigate("/login", { replace: true });
      }
    } catch {
      showToast({
        variant: "error",
        title: "Connection failed",
        message: "Unable to connect to the server. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell waveClassName="opacity-50">
      <Link
        to="/"
        aria-label="Go to HackerEarth Hub-NMAMIT home page"
        className="group absolute left-4 top-4 z-20 flex min-h-11 max-w-[calc(100%-5.5rem)] min-w-0 items-center gap-2 rounded-full border border-dream/30 bg-glass/80 p-1 pr-3 text-ink shadow-glass backdrop-blur-lg transition hover:border-dream/55 hover:text-primary-text focus-visible:outline-offset-2 sm:left-6 sm:top-6 sm:gap-3"
      >
        <span
          className={`flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-dream/30 bg-glass p-0.5 transition duration-200 group-hover:border-rose/50 sm:size-11 ${shouldReduceMotion ? "" : "group-hover:-translate-y-0.5"
            }`}
        >
          <img
            src={logo}
            alt="HackerEarth Logo"
            className="size-full rounded-full object-cover"
          />
        </span>
        <span className="min-w-0 break-words font-display text-sm font-semibold leading-tight tracking-[-0.02em] sm:text-base">
          HackerEarth Hub-NMAMIT
        </span>
      </Link>

      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <AuthThemeToggle />
      </div>

      <div className="ui-panel-glass relative mt-20 grid w-full min-w-0 max-w-7xl grid-cols-[minmax(0,1fr)] gap-4 overflow-hidden border-dream/25 bg-glass/45 p-3 sm:mt-24 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
        <div className="order-2 min-w-0 lg:order-1 lg:sticky lg:top-8 lg:h-[calc(100vh-4rem)] lg:self-start">
          <AuthVisual variant="register" />
        </div>

        <div className="ui-panel-glass order-1 min-w-0 overflow-hidden border-dream/30 bg-glass/80 p-5 sm:p-6 lg:order-2 lg:p-7">
          <motion.section
            initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.45, ease: "easeOut" }}
          >
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-dream-text">Student registration</p>
                  <h2 className="mt-2 break-words text-3xl font-bold tracking-tight text-ink">Create your account</h2>
                  <p className="mt-2 max-w-2xl break-words text-sm leading-6 text-ink-muted">Tell us who you are and which tracks you want to grow in.</p>
                </div>
              </div>
              <div className="hidden rounded-card border border-dream/30 bg-gradient-to-br from-dream/10 via-rose/5 to-technical/10 px-4 py-3 font-mono text-xs text-ink-muted shadow-soft md:block">
                const member = ready;
              </div>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate aria-busy={isLoading}>
              <div className="grid gap-4 md:grid-cols-2">
                <AuthInput id="name" name="name" label="Name" value={formData.name} error={errors.name} onChange={handleChange} onBlur={handleBlur} autoComplete="name" icon={<User className="h-4 w-4" aria-hidden="true" />} />
                <AuthInput id="email" name="email" label="Email ID" type="email" placeholder="yourusn@nmamit.in" value={formData.email} error={errors.email} onChange={handleChange} onBlur={handleBlur} autoComplete="email" icon={<Mail className="h-4 w-4" aria-hidden="true" />} />
                <AuthInput id="usn" name="usn" label="USN" value={formData.usn} error={errors.usn} onChange={handleChange} onBlur={handleBlur} autoComplete="off" />
                <div className="space-y-2">
                  <label htmlFor="contactNumber" className="block text-[0.95rem] font-medium text-ink">
                    Contact Number
                  </label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
                    <span className="pointer-events-none absolute left-10 top-1/2 -translate-y-1/2 rounded-full border border-dream/25 bg-glass/80 px-2 py-0.5 text-xs font-semibold text-ink-muted shadow-soft">
                      +91
                    </span>
                    <input
                      id="contactNumber"
                      name="contactNumber"
                      inputMode="numeric"
                      value={formData.contactNumber}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      autoComplete="tel"
                      placeholder="Enter mobile number"
                      aria-invalid={Boolean(errors.contactNumber)}
                      aria-describedby={errors.contactNumber ? "contactNumber-error" : undefined}
                      className={cn(
                        "min-h-12 w-full rounded-control border bg-glass/65 py-3 pl-24 pr-4 text-sm text-ink shadow-soft transition duration-200 placeholder:text-ink-muted hover:bg-glass/80 focus-visible:border-primary focus-visible:bg-glass focus-visible:shadow-glow",
                        errors.contactNumber
                          ? "border-rose/70 bg-rose/5"
                          : "border-dream/30 hover:border-dream/55",
                      )}
                    />
                  </div>
                  {errors.contactNumber && (
                    <p id="contactNumber-error" className="text-sm font-semibold text-rose-text" role="alert">
                      {errors.contactNumber}
                    </p>
                  )}
                </div>
                <div className="min-w-0 space-y-2">
                  <label htmlFor="branch" className="block text-[0.95rem] font-medium text-ink">
                    Branch
                  </label>
                  <select
                    id="branch"
                    name="branch"
                    value={formData.branch}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    aria-invalid={Boolean(errors.branch)}
                    aria-describedby={errors.branch ? "branch-error" : undefined}
                    className={cn(
                      "min-h-12 w-full min-w-0 rounded-control border bg-glass/65 px-4 py-3 text-sm text-ink shadow-soft transition duration-200 hover:bg-glass/80 focus-visible:border-primary focus-visible:bg-glass focus-visible:shadow-glow [&>option]:bg-surface [&>option]:text-ink",
                      errors.branch
                        ? "border-rose/70 bg-rose/5"
                        : "border-dream/30 hover:border-dream/55",
                    )}
                  >
                    <option value="">Select your branch</option>
                    {registrationBranchOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.branch && (
                    <p id="branch-error" className="text-sm font-semibold text-rose-text" role="alert">
                      {errors.branch}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label htmlFor="year" className="block text-[0.95rem] font-medium text-ink">
                    Year
                  </label>
                  <select
                    id="year"
                    name="year"
                    value={formData.year}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    aria-invalid={Boolean(errors.year)}
                    aria-describedby={errors.year ? "year-error" : undefined}
                    className={cn(
                      "min-h-12 w-full rounded-control border bg-glass/65 px-4 py-3 text-sm text-ink shadow-soft transition hover:bg-glass/80 focus-visible:border-primary focus-visible:bg-glass focus-visible:shadow-glow [&>option]:bg-surface [&>option]:text-ink",
                      errors.year ? "border-rose/70 bg-rose/5" : "border-dream/30 hover:border-dream/55",
                    )}
                  >
                    <option value="">Select year</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                  </select>
                  {errors.year && (
                    <p id="year-error" className="text-sm font-semibold text-rose-text" role="alert">
                      {errors.year}
                    </p>
                  )}
                </div>
                <div>
                  <PasswordInput id="password" name="password" label="Password" value={formData.password} error={errors.password} autoComplete="new-password" onChange={handleChange} onBlur={handleBlur} />
                  <div className="mt-2 space-y-1.5" aria-live="polite">
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          shouldReduceMotion ? "" : "transition-[width] duration-300",
                          strengthColor,
                        )}
                        style={{ width: `${(passedPasswordRules / passwordRules.length) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs font-medium text-ink-muted">Password strength: {strengthLabel}</p>
                    <div className="grid gap-x-3 gap-y-0.5 text-[0.72rem] leading-5 text-ink-muted sm:grid-cols-2">
                      {passwordRules.map((rule) => (
                        <span key={rule.label} className={cn(rule.test(formData.password) && "text-success-text")}>
                          {rule.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <PasswordInput id="confirmPassword" name="confirmPassword" label="Confirm Password" value={formData.confirmPassword} error={errors.confirmPassword} autoComplete="new-password" onChange={handleChange} onBlur={handleBlur} />
              </div>

              <DomainSelector selectedDomains={selectedDomains} onChange={handleDomainChange} onBlur={handleDomainBlur} error={errors.domains} />

              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary group w-full sm:w-auto sm:px-8"
              >
                {isLoading ? "Creating account..." : "Create account"}
                <ArrowRight
                  className={cn(
                    "h-4 w-4",
                    shouldReduceMotion ? "" : "transition-transform group-hover:translate-x-0.5",
                  )}
                  aria-hidden="true"
                />
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-ink-muted">
              Already registered?{" "}
              <Link to="/login" className="inline-flex min-h-11 items-center font-semibold text-primary-text underline decoration-rose/35 underline-offset-4 transition-colors hover:text-rose-text focus-visible:outline-offset-2">
                Login
              </Link>
            </p>
          </motion.section>
        </div>
      </div>
    </AuthShell>
  );
}
