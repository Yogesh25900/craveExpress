"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, AlertCircle, ShieldAlert } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { GOOGLE_OAUTH_URL } from "@/lib/api";
import type { LoginCredentials } from "@/types/auth";

// hCaptcha test sitekey — always passes in development
const HCAPTCHA_SITEKEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY ?? "10000000-ffff-ffff-ffff-000000000001";
const CAPTCHA_THRESHOLD = 3;

declare global {
  interface Window {
    hcaptcha?: {
      render: (el: HTMLElement, opts: { sitekey: string; callback: (t: string) => void; "expired-callback": () => void }) => string;
      reset: (id?: string) => void;
    };
    _hcaptchaLoaded?: boolean;
  }
}

// ─── Validation ────────────────────────────────────────────────────────────

type FormErrors = Partial<Record<keyof LoginCredentials, string>>;

function validate(form: LoginCredentials): FormErrors {
  const errors: FormErrors = {};
  if (!form.email) {
    errors.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = "Enter a valid email address.";
  }
  if (!form.password) {
    errors.password = "Password is required.";
  } else if (form.password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  }
  return errors;
}

// ─── Google icon SVG ───────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function LoginForm() {
  const { login, verifyMfa, mfaPendingToken, isLoading } = useAuth();

  const [form, setForm] = useState<LoginCredentials>({ email: "", password: "" });
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<HTMLDivElement>(null);
  const captchaIdRef = useRef<string | null>(null);

  // MFA step state
  const [mfaCode, setMfaCode] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const [mfaError, setMfaError] = useState("");

  const showCaptcha = failedAttempts >= CAPTCHA_THRESHOLD;

  // Surface OAuth failures the backend signals via ?error=oauth_failed
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get("error") === "oauth_failed") {
      setServerError("Google sign-in failed or was cancelled. Please try again.");
    }
  }, [searchParams]);

  // Step 1 — preload the hCaptcha script as soon as the component mounts so
  // it is ready by the time the threshold is crossed.
  useEffect(() => {
    if (window.hcaptcha || window._hcaptchaLoaded) return;
    window._hcaptchaLoaded = true;
    const script = document.createElement("script");
    script.src = "https://js.hcaptcha.com/1/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }, []);

  // Step 2 — render the widget once the threshold is crossed AND the DOM node
  // is mounted. Poll briefly to handle the race between state update and script
  // load completing.
  useEffect(() => {
    if (!showCaptcha) return;
    if (captchaIdRef.current) return; // already rendered

    function tryRender() {
      if (!captchaRef.current) return false;
      if (!window.hcaptcha) return false;
      captchaIdRef.current = window.hcaptcha.render(captchaRef.current, {
        sitekey: HCAPTCHA_SITEKEY,
        callback: (token) => setCaptchaToken(token),
        "expired-callback": () => setCaptchaToken(null),
      });
      return true;
    }

    if (tryRender()) return;

    // Script not yet loaded — poll every 200 ms until it is (max 5 s)
    const interval = setInterval(() => {
      if (tryRender()) clearInterval(interval);
    }, 200);
    const timeout = setTimeout(() => clearInterval(interval), 5000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [showCaptcha]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof LoginCredentials]) {
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
    if (showCaptcha && !captchaToken) {
      setServerError("Please complete the CAPTCHA challenge first.");
      return;
    }
    try {
      await login({ ...form, ...(captchaToken ? { captchaToken } : {}) });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login failed. Please try again.";
      setServerError(msg);
      setFailedAttempts((n) => n + 1);
      // Reset CAPTCHA widget so user can solve it again
      if (captchaIdRef.current !== null && window.hcaptcha) {
        window.hcaptcha.reset(captchaIdRef.current);
        captchaIdRef.current = null;
      }
      setCaptchaToken(null);
    }
  }

  async function handleMfaSubmit(e: FormEvent) {
    e.preventDefault();
    setMfaError("");
    if (!mfaCode.trim()) { setMfaError("Please enter your code."); return; }
    try {
      await verifyMfa(mfaCode.trim(), useRecovery);
    } catch (err) {
      setMfaError(err instanceof Error ? err.message : "Verification failed. Try again.");
      setMfaCode("");
    }
  }

  // ── MFA step-up screen ─────────────────────────────────────────────────────
  if (mfaPendingToken) {
    return (
      <form onSubmit={handleMfaSubmit} noValidate className="space-y-5">
        <div className="flex flex-col items-center gap-2 pb-2">
          <div className="w-12 h-12 rounded-full bg-[#fff3ef] flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-[#ff6b35]" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Two-factor verification</h2>
          <p className="text-sm text-gray-500 text-center">
            {useRecovery
              ? "Enter one of your recovery codes to continue."
              : "Open your authenticator app and enter the 6-digit code."}
          </p>
        </div>

        {mfaError && (
          <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            {mfaError}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {useRecovery ? "Recovery code" : "Authenticator code"}
          </label>
          <input
            type="text"
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value)}
            placeholder={useRecovery ? "XXXXX-XXXXX" : "000000"}
            autoComplete="one-time-code"
            maxLength={useRecovery ? 11 : 6}
            className="w-full px-4 py-3 rounded-xl text-sm bg-gray-50 border border-gray-200 text-center tracking-widest text-lg font-mono transition-colors focus:outline-none focus:ring-2 focus:ring-[#ff6b35]/30 focus:border-[#ff6b35]"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-[#ff6b35] hover:bg-[#e55a26] disabled:opacity-70 disabled:cursor-not-allowed text-white font-semibold rounded-full transition-colors flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Verifying…
            </>
          ) : (
            "Verify"
          )}
        </button>

        <button
          type="button"
          onClick={() => { setUseRecovery((v) => !v); setMfaCode(""); setMfaError(""); }}
          className="w-full text-sm text-[#ff6b35] hover:text-[#e55a26] font-medium transition-colors"
        >
          {useRecovery ? "Use authenticator code instead" : "Use a recovery code instead"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* Server error banner */}
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
            value={form.email}
            onChange={handleChange}
            placeholder="you@example.com"
            autoComplete="email"
            className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm bg-gray-50 border transition-colors focus:outline-none focus:ring-2 focus:ring-[#ff6b35]/30 focus:border-[#ff6b35] ${
              errors.email
                ? "border-red-400 bg-red-50 focus:ring-red-200"
                : "border-gray-200"
            }`}
          />
        </div>
        {errors.email && (
          <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {errors.email}
          </p>
        )}
      </div>

      {/* Password */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-gray-700">Password</label>
          <Link
            href="/forgot-password"
            className="text-xs text-[#ff6b35] hover:text-[#e55a26] font-medium transition-colors"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Min. 8 characters"
            autoComplete="current-password"
            className={`w-full pl-10 pr-11 py-3 rounded-xl text-sm bg-gray-50 border transition-colors focus:outline-none focus:ring-2 focus:ring-[#ff6b35]/30 focus:border-[#ff6b35] ${
              errors.password
                ? "border-red-400 bg-red-50 focus:ring-red-200"
                : "border-gray-200"
            }`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.password && (
          <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {errors.password}
          </p>
        )}
      </div>

      {/* CAPTCHA — shown after repeated failures */}
      {showCaptcha && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            Too many failed attempts — please verify you&apos;re human.
          </div>
          <div ref={captchaRef} className="flex justify-center" />
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading || (showCaptcha && !captchaToken)}
        className="w-full py-3 bg-[#ff6b35] hover:bg-[#e55a26] disabled:opacity-70 disabled:cursor-not-allowed text-white font-semibold rounded-full transition-colors flex items-center justify-center gap-2 mt-2"
      >
        {isLoading ? (
          <>
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            Signing in…
          </>
        ) : (
          "Login"
        )}
      </button>

      {/* Divider */}
      <div className="relative flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 shrink-0">or continue with</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Google OAuth — opens in a popup so the user stays on the login page */}
      <button
        type="button"
        onClick={() => {
          const w = 500, h = 620;
          const left = window.screenX + (window.outerWidth - w) / 2;
          const top  = window.screenY + (window.outerHeight - h) / 2;
          const popup = window.open(
            GOOGLE_OAUTH_URL,
            "google_oauth",
            `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`
          );
          if (!popup) {
            // Fallback: popups blocked — redirect in same tab
            window.location.href = GOOGLE_OAUTH_URL;
            return;
          }
          // Listen for the callback page to post back the result
          function onMessage(e: MessageEvent) {
            if (e.origin !== window.location.origin) return;
            if (e.data?.type !== "OAUTH_SUCCESS") return;
            window.removeEventListener("message", onMessage);
            const role = e.data.role as string;
            if (role === "admin")  { window.location.href = "/admin"; return; }
            if (role === "owner")  { window.location.href = "/owner"; return; }
            if (role === "rider")  { window.location.href = "/rider"; return; }
            window.location.href = "/";
          }
          window.addEventListener("message", onMessage);
        }}
        className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
      >
        <GoogleIcon />
        Continue with Google
      </button>

      {/* Switch to signup */}
      <p className="text-center text-sm text-gray-500 pt-1">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="text-[#ff6b35] font-semibold hover:text-[#e55a26] transition-colors"
        >
          Sign up
        </Link>
      </p>
    </form>
  );
}
