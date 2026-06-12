"use client";

import { useState, type FormEvent, type ChangeEvent } from "react";
import Link from "next/link";
import { User, Mail, Phone, Lock, Eye, EyeOff, AlertCircle, ShoppingBag, Bike } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import type { SignupData } from "@/types/auth";

// ─── Password requirements ─────────────────────────────────────────────────

export interface PasswordRequirements {
  minLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasDigit: boolean;
  hasSymbol: boolean;
}

export function checkPasswordRequirements(password: string): PasswordRequirements {
  return {
    minLength: password.length >= 12,
    hasUpper:  /[A-Z]/.test(password),
    hasLower:  /[a-z]/.test(password),
    hasDigit:  /[0-9]/.test(password),
    hasSymbol: /[^A-Za-z0-9]/.test(password),
  };
}

function meetsAllRequirements(reqs: PasswordRequirements): boolean {
  return Object.values(reqs).every(Boolean);
}

// ─── Validation ────────────────────────────────────────────────────────────

type FormErrors = Partial<Record<keyof SignupData, string>>;

function validate(form: SignupData): FormErrors {
  const errors: FormErrors = {};

  if (!form.fullName.trim()) {
    errors.fullName = "Full name is required.";
  } else if (form.fullName.trim().length < 2) {
    errors.fullName = "Name must be at least 2 characters.";
  }

  if (!form.email) {
    errors.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!form.phone) {
    errors.phone = "Phone number is required.";
  } else if (!/^\+?[\d\s\-]{10,15}$/.test(form.phone)) {
    errors.phone = "Enter a valid phone number.";
  }

  if (!form.password) {
    errors.password = "Password is required.";
  } else if (!meetsAllRequirements(checkPasswordRequirements(form.password))) {
    errors.password = "Password does not meet all requirements below.";
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = "Please confirm your password.";
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
}

// ─── Password strength ─────────────────────────────────────────────────────

function getStrength(reqs: PasswordRequirements, password: string): { label: string; color: string; width: string } {
  if (!password) return { label: "", color: "bg-gray-200", width: "0%" };
  const score = Object.values(reqs).filter(Boolean).length;
  if (score <= 1) return { label: "Weak",   color: "bg-red-400",   width: "20%" };
  if (score === 2) return { label: "Weak",   color: "bg-red-400",   width: "40%" };
  if (score === 3) return { label: "Fair",   color: "bg-amber-400", width: "60%" };
  if (score === 4) return { label: "Good",   color: "bg-green-400", width: "80%" };
  return                  { label: "Strong", color: "bg-green-500", width: "100%" };
}

// ─── Reusable field component ──────────────────────────────────────────────

interface FieldProps {
  label: string;
  name: keyof SignupData;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  icon: React.ReactNode;
  value: string;
  error?: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  rightSlot?: React.ReactNode;
}

function Field({
  label, name, type = "text", placeholder, autoComplete,
  icon, value, error, onChange, rightSlot,
}: FieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          {icon}
        </span>
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`w-full pl-10 ${rightSlot ? "pr-11" : "pr-4"} py-3 rounded-xl text-sm bg-gray-50 border transition-colors focus:outline-none focus:ring-2 focus:ring-[#ff6b35]/30 focus:border-[#ff6b35] ${
            error ? "border-red-400 bg-red-50 focus:ring-red-200" : "border-gray-200"
          }`}
        />
        {rightSlot && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2">
            {rightSlot}
          </span>
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────

const INITIAL: SignupData = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
};

export default function SignupForm() {
  const { signup, isLoading } = useAuth();

  const [role, setRole] = useState<"user" | "rider">("user");
  const [form, setForm] = useState<SignupData>(INITIAL);
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const reqs = checkPasswordRequirements(form.password);
  const strength = getStrength(reqs, form.password);

  function handleRoleChange(newRole: "user" | "rider") {
    setRole(newRole);
    setErrors({});
    setServerError("");
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof SignupData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (serverError) setServerError("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    try {
      await signup({ ...form, role });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Sign up failed. Please try again.");
    }
  }

  const isRider = role === "rider";

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {/* Role toggle */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl">
        <button
          type="button"
          onClick={() => handleRoleChange("user")}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            !isRider
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <ShoppingBag className={`w-4 h-4 ${!isRider ? "text-[#ff6b35]" : ""}`} />
          Order Food
        </button>
        <button
          type="button"
          onClick={() => handleRoleChange("rider")}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            isRider
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Bike className={`w-4 h-4 ${isRider ? "text-[#ff6b35]" : ""}`} />
          Deliver with Us
        </button>
      </div>

      {/* Role context hint */}
      {isRider && (
        <p className="text-xs text-center text-[#ff6b35] font-medium bg-[#fff3ef] rounded-lg py-2 px-3">
          Earn money delivering food on your own schedule
        </p>
      )}

      {serverError && (
        <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {serverError}
        </div>
      )}

      <Field
        label="Full name"
        name="fullName"
        placeholder={isRider ? "Your full name" : "John Doe"}
        autoComplete="name"
        icon={<User className="w-4 h-4" />}
        value={form.fullName}
        error={errors.fullName}
        onChange={handleChange}
      />

      <Field
        label="Email address"
        name="email"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        icon={<Mail className="w-4 h-4" />}
        value={form.email}
        error={errors.email}
        onChange={handleChange}
      />

      <Field
        label="Phone number"
        name="phone"
        type="tel"
        placeholder="+1 234 567 8900"
        autoComplete="tel"
        icon={<Phone className="w-4 h-4" />}
        value={form.phone}
        error={errors.phone}
        onChange={handleChange}
      />

      {/* Password with strength meter */}
      <div>
        <Field
          label="Password"
          name="password"
          type={showPassword ? "text" : "password"}
          placeholder="Min. 12 chars, upper, lower, digit, symbol"
          autoComplete="new-password"
          icon={<Lock className="w-4 h-4" />}
          value={form.password}
          error={errors.password}
          onChange={handleChange}
          rightSlot={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
        />
        {form.password && (
          <div className="mt-2 space-y-2">
            {/* Strength bar */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                  style={{ width: strength.width }}
                />
              </div>
              <span className={`text-xs font-semibold w-12 text-right ${
                strength.label === "Weak"   ? "text-red-500"   :
                strength.label === "Fair"   ? "text-amber-500" :
                strength.label === "Good"   ? "text-green-500" : "text-green-600"
              }`}>{strength.label}</span>
            </div>
            {/* Requirements checklist */}
            <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
              {([
                ["minLength", "12+ characters"],
                ["hasUpper",  "Uppercase letter"],
                ["hasLower",  "Lowercase letter"],
                ["hasDigit",  "Number"],
                ["hasSymbol", "Special character"],
              ] as [keyof PasswordRequirements, string][]).map(([key, label]) => (
                <li key={key} className={`flex items-center gap-1 text-xs font-medium ${reqs[key] ? "text-green-600" : "text-gray-400"}`}>
                  <span className={`inline-flex w-3.5 h-3.5 rounded-full items-center justify-center text-[9px] font-bold shrink-0 ${reqs[key] ? "bg-green-500 text-white" : "bg-gray-200 text-gray-400"}`}>
                    {reqs[key] ? "✓" : "·"}
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <Field
        label="Confirm password"
        name="confirmPassword"
        type={showConfirm ? "text" : "password"}
        placeholder="Re-enter your password"
        autoComplete="new-password"
        icon={<Lock className="w-4 h-4" />}
        value={form.confirmPassword}
        error={errors.confirmPassword}
        onChange={handleChange}
        rightSlot={
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label={showConfirm ? "Hide password" : "Show password"}
          >
            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        }
      />

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 bg-[#ff6b35] hover:bg-[#e55a26] disabled:opacity-70 disabled:cursor-not-allowed text-white font-semibold rounded-full transition-colors flex items-center justify-center gap-2 mt-2"
      >
        {isLoading ? (
          <>
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            Creating account…
          </>
        ) : isRider ? (
          "Join as Delivery Partner"
        ) : (
          "Create Account"
        )}
      </button>

      <p className="text-center text-sm text-gray-500 pt-1">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-[#ff6b35] font-semibold hover:text-[#e55a26] transition-colors"
        >
          Login
        </Link>
      </p>
    </form>
  );
}
