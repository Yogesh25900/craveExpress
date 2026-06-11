"use client";

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { User, LoginCredentials, SignupData } from "@/types/auth";
import { authApi, setTokens, clearTokens, getToken } from "@/lib/api";

// ─── Types ──────────────────────────────────────────────────────────────────

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isInitialised: boolean;
  mfaPendingToken: string | null;
}

type AuthAction =
  | { type: "INIT";        payload: User | null }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_USER";    payload: User }
  | { type: "SET_MFA_PENDING"; payload: string }
  | { type: "CLEAR_MFA_PENDING" }
  | { type: "LOGOUT" };

interface AuthContextType extends AuthState {
  isAuthenticated: boolean;
  login:       (credentials: LoginCredentials) => Promise<void>;
  verifyMfa:   (code: string, isRecoveryCode?: boolean) => Promise<void>;
  signup:      (data: SignupData) => Promise<void>;
  logout:      () => Promise<void>;
  updateUser:  (user: User) => void;
}

// ─── Reducer ────────────────────────────────────────────────────────────────

function reducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "INIT":             return { ...state, user: action.payload, isInitialised: true, isLoading: false };
    case "SET_LOADING":      return { ...state, isLoading: action.payload };
    case "SET_USER":         return { ...state, user: action.payload, isLoading: false, mfaPendingToken: null };
    case "SET_MFA_PENDING":  return { ...state, isLoading: false, mfaPendingToken: action.payload };
    case "CLEAR_MFA_PENDING":return { ...state, mfaPendingToken: null };
    case "LOGOUT":           return { ...state, user: null, isLoading: false, mfaPendingToken: null };
    default:                 return state;
  }
}

// ─── Local storage key for hydrating user across page refreshes ──────────────

const USER_KEY = "ce_user";

function saveUser(user: User): void {
  try { localStorage.setItem(USER_KEY, JSON.stringify(user)); } catch { /* noop */ }
}
function loadUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch { return null; }
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, {
    user: null,
    isLoading: false,
    isInitialised: false,
    mfaPendingToken: null,
  });

  // On mount: if a token exists, verify it with the backend and hydrate user.
  // Fall back to the cached user in localStorage while the request is in flight.
  useEffect(() => {
    const token = getToken();
    if (!token) {
      dispatch({ type: "INIT", payload: null });
      return;
    }

    // Optimistic hydration from cache so the UI isn't blank on first render
    const cached = loadUser();
    if (cached) dispatch({ type: "SET_USER", payload: cached });

    authApi.me()
      .then(({ user }) => {
        saveUser(user);
        dispatch({ type: "INIT", payload: user });
      })
      .catch(() => {
        // Token is expired / invalid — clear everything
        clearTokens();
        localStorage.removeItem(USER_KEY);
        dispatch({ type: "INIT", payload: null });
      });
  }, []);

  // ── login ──────────────────────────────────────────────────────────────────
  const login = useCallback(
    async (credentials: LoginCredentials) => {
      dispatch({ type: "SET_LOADING", payload: true });
      try {
        const result = await authApi.login(credentials) as
          | { user: User; accessToken: string; refreshToken: string }
          | { mfaRequired: true; mfaToken: string };

        if ("mfaRequired" in result && result.mfaRequired) {
          dispatch({ type: "SET_MFA_PENDING", payload: result.mfaToken });
          return;
        }

        const { user, accessToken, refreshToken } = result as { user: User; accessToken: string; refreshToken: string };
        setTokens(accessToken, refreshToken);
        saveUser(user);
        dispatch({ type: "SET_USER", payload: user });

        // Role-based redirect
        if (user.role === "admin")  { router.push("/admin");  return; }
        if (user.role === "owner")  { router.push("/owner");  return; }
        if (user.role === "rider")  { router.push("/rider");  return; }
        router.push("/");
      } catch (err) {
        dispatch({ type: "SET_LOADING", payload: false });
        throw err;
      }
    },
    [router]
  );

  // ── verifyMfa ──────────────────────────────────────────────────────────────
  const verifyMfa = useCallback(
    async (code: string, isRecoveryCode = false) => {
      if (!state.mfaPendingToken) throw new Error("No MFA session in progress");
      dispatch({ type: "SET_LOADING", payload: true });
      try {
        const { user, accessToken, refreshToken } = await authApi.mfaVerifyLogin(
          state.mfaPendingToken, code, isRecoveryCode
        );
        setTokens(accessToken, refreshToken);
        saveUser(user);
        dispatch({ type: "SET_USER", payload: user });

        if (user.role === "admin")  { router.push("/admin");  return; }
        if (user.role === "owner")  { router.push("/owner");  return; }
        if (user.role === "rider")  { router.push("/rider");  return; }
        router.push("/");
      } catch (err) {
        dispatch({ type: "SET_LOADING", payload: false });
        throw err;
      }
    },
    [state.mfaPendingToken, router]
  );

  // ── signup ─────────────────────────────────────────────────────────────────
  const signup = useCallback(
    async (data: SignupData) => {
      dispatch({ type: "SET_LOADING", payload: true });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { confirmPassword: _cp, ...payload } = data;
      try {
        const { user, accessToken, refreshToken } = await authApi.signup(payload);
        setTokens(accessToken, refreshToken);
        saveUser(user);
        dispatch({ type: "SET_USER", payload: user });

        // Role-based redirect
        if (user.role === "admin") { router.push("/admin"); return; }
        if (user.role === "owner") { router.push("/owner"); return; }
        if (user.role === "rider") { router.push("/rider"); return; }
        router.push("/");
      } catch (err) {
        dispatch({ type: "SET_LOADING", payload: false });
        throw err;
      }
    },
    [router]
  );

  // ── updateUser ─────────────────────────────────────────────────────────────
  const updateUser = useCallback((user: User) => {
    saveUser(user);
    dispatch({ type: "SET_USER", payload: user });
  }, []);

  // ── logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch { /* best-effort */ }
    clearTokens();
    localStorage.removeItem(USER_KEY);
    dispatch({ type: "LOGOUT" });
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        isAuthenticated: state.user !== null,
        login,
        verifyMfa,
        signup,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
