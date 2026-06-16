"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Mail, AlertCircle, ArrowLeft, CheckCircle } from "lucide-react";

// ─── Validation ────────────────────────────────────────────────────────────

function validateEmail(email: string): string | null {
  if (!email) return "Email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address.";
  return null;
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [serverError, setServerError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEmail(e.target.value);
    if (error) setError("");
    if (serverError) setServerError("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const fieldError = validateEmail(email);
    if (fieldError) {
      setError(fieldError);
      return;
    }

    setIsLoading(true);
    try {
      // Phase 2: replace with → await authApi.forgotPassword(email)
      await new Promise((r) => setTimeout(r, 1200));
      setIsSent(true);
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Failed to send reset link. Try again."
      );
    } finally {
      setIsLoading(false);
    }
  }

  // ── Success state ─────────────────────────────────────────────────────────
  if (isSent) {
    return (
      <div className="text-center py-4 space-y-4">
        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 text-lg">Check your inbox</h3>
          <p className="text-sm text-gray-500 mt-1">
            We&apos;ve sent a password reset link to{" "}
            <span className="font-medium text-gray-700">{email}</span>.
          </p>
        </div>
        <p className="text-xs text-gray-400">
          Didn&apos;t receive it? Check your spam folder or{" "}
          <button
            onClick={() => setIsSent(false)}
            className="text-[#ff6b35] font-medium hover:underline"
          >
            try again
          </button>
          .
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#ff6b35] hover:text-[#e55a26] transition-colors mt-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to login
        </Link>
      </div>
    );
  }

  // ── Form state ────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {serverError && (
        <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {serverError}
        </div>
      )}

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Email address
        </label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="email"
            name="email"
            value={email}
            onChange={handleChange}
            placeholder="you@example.com"
            autoComplete="email"
            className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm bg-gray-50 border transition-colors focus:outline-none focus:ring-2 focus:ring-[#ff6b35]/30 focus:border-[#ff6b35] ${
              error
                ? "border-red-400 bg-red-50 focus:ring-red-200"
                : "border-gray-200"
            }`}
          />
        </div>
        {error && (
          <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 bg-[#ff6b35] hover:bg-[#e55a26] disabled:opacity-70 disabled:cursor-not-allowed text-white font-semibold rounded-full transition-colors flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            Sending…
          </>
        ) : (
          "Send Reset Link"
        )}
      </button>

      <Link
        href="/login"
        className="flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-[#ff6b35] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to login
      </Link>
    </form>
  );
}
