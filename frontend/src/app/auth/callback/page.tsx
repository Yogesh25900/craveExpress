"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { authApi, setTokens, storeCsrfToken } from "@/lib/api";

// ─────────────────────────────────────────────────────────────────────────────
// OAuth landing page. Google → backend → this page. The backend appends the
// short-lived access token and CSRF token in the URL *fragment* (never the query
// string, so they stay out of server logs and Referer headers). The refresh
// token is already set as an httpOnly cookie by the backend. We read the fragment
// on the client, persist the tokens, hydrate the user, then route by role.
// ─────────────────────────────────────────────────────────────────────────────

export default function AuthCallbackPage() {
  const router = useRouter();
  const { updateUser } = useAuth();
  const [error, setError] = useState("");
  const ranRef = useRef(false); // guard against React StrictMode double-invoke

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    async function finalise() {
      // Fragment looks like: #accessToken=...&csrfToken=...
      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash;
      const params = new URLSearchParams(hash);
      const accessToken = params.get("accessToken");
      const csrfToken = params.get("csrfToken");

      if (!accessToken) {
        router.replace("/login?error=oauth_failed");
        return;
      }

      // Persist tokens BEFORE any authenticated request, and strip the fragment
      // from the address bar so the token isn't left in browser history.
      setTokens(accessToken);
      if (csrfToken) storeCsrfToken(csrfToken);
      window.history.replaceState(null, "", window.location.pathname);

      try {
        const { user } = await authApi.me();
        updateUser(user);

        // If opened as a popup, notify the opener and close this window
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(
            { type: "OAUTH_SUCCESS", role: user.role },
            window.location.origin
          );
          window.close();
          return;
        }

        // Fallback: normal same-tab redirect
        if (user.role === "admin")  { router.replace("/admin"); return; }
        if (user.role === "owner")  { router.replace("/owner"); return; }
        if (user.role === "rider")  { router.replace("/rider"); return; }
        router.replace("/");
      } catch {
        setError("We couldn't complete your sign-in. Please try again.");
        if (window.opener && !window.opener.closed) {
          setTimeout(() => window.close(), 2000);
        } else {
          setTimeout(() => router.replace("/login?error=oauth_failed"), 2000);
        }
      }
    }

    void finalise();
  }, [router, updateUser]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50 px-4 text-center">
      {error ? (
        <>
          <AlertCircle className="w-8 h-8 text-red-500" />
          <p className="text-sm text-gray-600">{error}</p>
        </>
      ) : (
        <>
          <Loader2 className="w-8 h-8 text-[#ff6b35] animate-spin" />
          <p className="text-sm text-gray-500">Signing you in…</p>
        </>
      )}
    </div>
  );
}
