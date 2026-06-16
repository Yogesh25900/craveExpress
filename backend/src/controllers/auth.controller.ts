import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { z } from "zod";
import QRCode from "qrcode";
import { User } from "../models/User";
import type { IUser } from "../models/User";
import { Order } from "../models/Order";
import { RefreshToken } from "../models/RefreshToken";
import { safeDecryptPii } from "../utils/pii";
import {
  signAccessToken, signRefreshToken, verifyRefreshToken,
  signMfaPendingToken, verifyMfaPendingToken,
} from "../utils/jwt";
import {
  encryptSecret, decryptSecret, generateTotpSecret, totpKeyUri,
  verifyTotp, generateRecoveryCodes, hashRecoveryCode, findAndConsumeRecoveryCode,
} from "../utils/mfa";
import { ok, created, noContent } from "../utils/response";
import { AppError } from "../middleware/errorHandler";
import { issueCsrfToken } from "../middleware/csrf";
import { env } from "../config/env";
import { securityLog } from "../lib/logger";
import {
  issueOAuthState, verifyOAuthState, buildGoogleAuthUrl, fetchGoogleProfile,
} from "../utils/oauth";

const COMMON_PASSWORDS = new Set([
  "password","password1","password12","password123","password1234",
  "123456","1234567","12345678","123456789","1234567890",
  "qwerty","qwerty123","qwertyuiop","abc123","abcdef","iloveyou",
  "admin","admin123","letmein","welcome","monkey","dragon",
  "master","sunshine","shadow","superman","michael","football",
  "baseball","soccer","hockey","charlie","donald","jordan",
  "harley","ranger","daniel","hello","lovely","starwars",
  "passw0rd","pass@word1","trustno1","access","login","test",
  "guest","111111","000000","696969","batman",
]);

const passwordRule = z
  .string()
  .min(12,  "Password must be at least 12 characters")
  .regex(/[A-Z]/,        "Password must contain at least one uppercase letter")
  .regex(/[a-z]/,        "Password must contain at least one lowercase letter")
  .regex(/[0-9]/,        "Password must contain at least one digit")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

export const signupSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email:    z.string().email("Invalid email address"),
  phone:    z.string().min(7, "Phone number is too short"),
  password: passwordRule,
  role:     z.enum(["user", "rider"]).optional().default("user"),
});

export const loginSchema = z.object({
  email:        z.string().email(),
  password:     z.string().min(1),
  captchaToken: z.string().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword:     passwordRule,
});

export const verifyMfaEnrollSchema = z.object({
  code: z.string().length(6, "Code must be 6 digits").regex(/^\d{6}$/),
});

export const disableMfaSchema = z.object({
  password: z.string().min(1, "Password is required"),
  code:     z.string().min(1, "TOTP or recovery code is required"),
});

export const verifyMfaLoginSchema = z.object({
  mfaToken:       z.string().min(1),
  code:           z.string().min(1, "Code is required"),
  isRecoveryCode: z.boolean().optional().default(false),
});

const MAX_FAILED_ATTEMPTS  = 10;
const CAPTCHA_THRESHOLD    = 3;
const LOCK_DURATION_MS     = 15 * 60 * 1000;
const GENERIC_AUTH_ERROR   = "Invalid email or password";

// verify captcha
async function verifyCaptcha(token: string): Promise<boolean> {
  const body = new URLSearchParams({
    secret:   env.HCAPTCHA_SECRET,
    response: token,
  });
  try {
    const res = await fetch("https://hcaptcha.com/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const data = (await res.json()) as { success: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

const REFRESH_COOKIE = "ce_refresh";
const COOKIE_OPTS = {
  httpOnly: true,
  secure: env.isProd,
  sameSite: "strict" as const,
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// issue tokens
async function issueTokens(user: IUser, familyId?: string): Promise<{ accessToken: string; refreshToken: string }> {
  const jti = randomUUID();
  const fid = familyId ?? randomUUID();

  const accessToken = signAccessToken({
    userId: (user._id as { toString(): string }).toString(),
    role:   user.role as "user" | "admin" | "owner" | "rider",
    ...(user.restaurantSlug ? { restaurantSlug: user.restaurantSlug } : {}),
  });
  const refreshToken = signRefreshToken({
    userId:   (user._id as { toString(): string }).toString(),
    jti,
    familyId: fid,
  });

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await RefreshToken.create({ jti, familyId: fid, userId: user._id, expiresAt });

  return { accessToken, refreshToken };
}

// sign up
export async function signup(req: Request, res: Response): Promise<void> {
  const { fullName, email, phone, password, role } = req.body as z.infer<typeof signupSchema>;

  if (COMMON_PASSWORDS.has(password.toLowerCase()))
    throw new AppError(400, "This password is too common. Please choose a stronger password.");

  const exists = await User.findOne({ email });
  if (exists) throw new AppError(409, "An account with this email already exists");

  const hashed = await bcrypt.hash(password, 12);
  const user = await User.create({
    fullName, email, phone, role,
    password: hashed,
    passwordHistory: [hashed],
    passwordChangedAt: new Date(),
  });

  const { accessToken, refreshToken } = await issueTokens(user);
  res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTS);
  securityLog("AUTH_SIGNUP", { req, email, userId: (user._id as { toString(): string }).toString() });
  created(res, { user, accessToken, refreshToken, csrfToken: issueCsrfToken() });
}

// log in
export async function login(req: Request, res: Response): Promise<void> {
  const { email, password, captchaToken } = req.body as z.infer<typeof loginSchema>;

  const user = await User.findOne({ email }).select("+password +failedLoginAttempts +lockUntil");

  if (user?.lockUntil && user.lockUntil > new Date()) {
    const mins = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000);
    securityLog("AUTH_LOCKOUT_BLOCKED", { req, email, userId: (user._id as { toString(): string }).toString(), minsRemaining: mins });
    throw new AppError(423, `Account temporarily locked. Try again in ${mins} minute${mins !== 1 ? "s" : ""}.`);
  }

  const attempts = user?.failedLoginAttempts ?? 0;
  if (attempts >= CAPTCHA_THRESHOLD) {
    if (!captchaToken) {
      throw new AppError(400, "Please complete the CAPTCHA challenge.", { captchaRequired: true });
    }
    const captchaOk = await verifyCaptcha(captchaToken);
    if (!captchaOk) {
      throw new AppError(400, "CAPTCHA verification failed. Please try again.", { captchaRequired: true });
    }
  }

  if (!user) throw new AppError(401, GENERIC_AUTH_ERROR);
  if (user.isBanned) throw new AppError(403, "This account has been suspended");

  if (!user.password) {
    securityLog("AUTH_LOGIN_FAIL", { req, email, reason: "sso_account_no_password" });
    throw new AppError(401, GENERIC_AUTH_ERROR);
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    const newCount = (user.failedLoginAttempts ?? 0) + 1;
    const shouldLock = newCount >= MAX_FAILED_ATTEMPTS;
    await User.updateOne(
      { _id: user._id },
      {
        failedLoginAttempts: newCount,
        ...(shouldLock ? { lockUntil: new Date(Date.now() + LOCK_DURATION_MS) } : {}),
      }
    );

    if (shouldLock) {
      securityLog("AUTH_ACCOUNT_LOCKED", { req, email, userId: (user._id as { toString(): string }).toString() });
      throw new AppError(423, "Too many failed attempts. Account locked for 15 minutes.");
    }

    const remaining = MAX_FAILED_ATTEMPTS - newCount;
    const needsCaptcha = newCount >= CAPTCHA_THRESHOLD;
    securityLog("AUTH_LOGIN_FAIL", { req, email, reason: "bad_password", attemptsRemaining: remaining });
    throw new AppError(401, GENERIC_AUTH_ERROR, {
      ...(needsCaptcha ? { captchaRequired: true } : {}),
      attemptsRemaining: remaining,
    });
  }

  if (user.failedLoginAttempts || user.lockUntil) {
    await User.updateOne({ _id: user._id }, { failedLoginAttempts: 0, $unset: { lockUntil: 1 } });
  }

  if (user.mfaEnabled) {
    const mfaToken = signMfaPendingToken((user._id as { toString(): string }).toString());
    securityLog("AUTH_MFA_REQUIRED", { req, email, userId: (user._id as { toString(): string }).toString() });
    ok(res, { mfaRequired: true, mfaToken });
    return;
  }

  const { accessToken, refreshToken } = await issueTokens(user);
  res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTS);
  securityLog("AUTH_LOGIN_SUCCESS", { req, email, userId: (user._id as { toString(): string }).toString() });
  ok(res, { user, accessToken, refreshToken, csrfToken: issueCsrfToken() });
}

// refresh token
export async function refresh(req: Request, res: Response): Promise<void> {
  const token: string | undefined =
    (req.cookies as Record<string, string>)?.[REFRESH_COOKIE] ??
    (req.body as { refreshToken?: string }).refreshToken;

  if (!token) throw new AppError(401, "Refresh token required");

  let payload: ReturnType<typeof verifyRefreshToken>;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new AppError(401, "Session expired. Please log in again.");
  }

  if (!payload.jti) {
    throw new AppError(401, "Session expired. Please log in again.");
  }

  const record = await RefreshToken.findOne({ jti: payload.jti });

  if (!record || record.revoked) {
    if (payload.familyId) {
      await RefreshToken.updateMany({ familyId: payload.familyId }, { revoked: true });
    }
    throw new AppError(401, "Session expired. Please log in again.");
  }

  if (record.used) {
    await RefreshToken.updateMany({ familyId: record.familyId }, { revoked: true });
    securityLog("AUTH_REUSE_DETECTED", { req, userId: record.userId.toString(), familyId: record.familyId });
    throw new AppError(401, "Token reuse detected. All sessions revoked for security. Please log in again.");
  }

  record.used = true;
  await record.save();

  const user = await User.findById(record.userId);
  if (!user) throw new AppError(401, "User not found");
  if (user.isBanned) throw new AppError(403, "Account suspended");

  const { accessToken, refreshToken: newRefresh } = await issueTokens(user, record.familyId);
  res.cookie(REFRESH_COOKIE, newRefresh, COOKIE_OPTS);
  securityLog("AUTH_REFRESH", { req, userId: user._id.toString() });
  ok(res, { accessToken, refreshToken: newRefresh, csrfToken: issueCsrfToken() });
}

// log out
export async function logout(req: Request, res: Response): Promise<void> {
  const token: string | undefined =
    (req.cookies as Record<string, string>)?.[REFRESH_COOKIE] ??
    (req.body as { refreshToken?: string }).refreshToken;

  if (token) {
    try {
      const payload = verifyRefreshToken(token);
      if (payload.familyId) {
        await RefreshToken.updateMany({ familyId: payload.familyId }, { revoked: true });
      }
    } catch {
      // Invalid/expired token — nothing to revoke; still clear the cookie
    }
  }

  res.clearCookie(REFRESH_COOKIE, COOKIE_OPTS);
  securityLog("AUTH_LOGOUT", { req });
  noContent(res);
}

// forgot password
export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { email } = req.body as z.infer<typeof forgotPasswordSchema>;
  const user = await User.findOne({ email });
  if (user) {
    console.log(`[DEV] Password reset requested for: ${email}`);
    // TODO: send reset email via nodemailer/resend
  }
  ok(res, { message: "If that email exists, a reset link has been sent." });
}

// change password
export async function changePassword(req: Request, res: Response): Promise<void> {
  const { currentPassword, newPassword } = req.body as z.infer<typeof changePasswordSchema>;

  if (COMMON_PASSWORDS.has(newPassword.toLowerCase()))
    throw new AppError(400, "This password is too common. Please choose a stronger password.");

  const user = await User.findById(req.user!.userId).select("+password +passwordHistory");
  if (!user) throw new AppError(404, "User not found");
  if (!user.password) throw new AppError(400, "This account signs in with Google and has no password to change.");

  const currentMatch = await bcrypt.compare(currentPassword, user.password);
  if (!currentMatch) throw new AppError(401, "Current password is incorrect");

  const PASSWORD_HISTORY_LIMIT = 5;
  for (const oldHash of user.passwordHistory ?? []) {
    const reused = await bcrypt.compare(newPassword, oldHash);
    if (reused) throw new AppError(400, "You cannot reuse a recent password. Please choose a different one.");
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  const updatedHistory = [newHash, ...(user.passwordHistory ?? [])].slice(0, PASSWORD_HISTORY_LIMIT);

  user.password = newHash;
  user.passwordHistory = updatedHistory;
  user.passwordChangedAt = new Date();
  await user.save();

  securityLog("AUTH_PASSWORD_CHANGED", { req, userId: req.user!.userId });
  ok(res, { message: "Password changed successfully." });
}

// get me
export async function getMe(req: Request, res: Response): Promise<void> {
  const user = await User.findById(req.user!.userId);
  if (!user) throw new AppError(404, "User not found");
  ok(res, { user });
}

// export user data
export async function exportUserData(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;

  const [user, orders] = await Promise.all([
    User.findById(userId)
      .select("-password -passwordHistory -mfaSecret -mfaRecoveryCodes -__v")
      .lean(),
    Order.find({ userId }).sort({ createdAt: -1 }).lean(),
  ]);

  if (!user) { res.status(404).json({ success: false, message: "User not found" }); return; }

  const exportUser = {
    ...user,
    phone:     safeDecryptPii(user.phone),
    addresses: (user.addresses ?? []).map((a: Record<string, unknown>) => ({
      ...a,
      street: safeDecryptPii(a.street as string),
      city:   safeDecryptPii(a.city as string),
    })),
  };

  securityLog("DATA_EXPORT", { req, userId });

  res.setHeader("Content-Disposition", "attachment; filename=my-craveexpress-data.json");
  res.setHeader("Content-Type", "application/json");
  res.json({
    exportedAt: new Date().toISOString(),
    profile:    exportUser,
    orders,
  });
}

// update me
export async function updateMe(req: Request, res: Response): Promise<void> {
  const schema = z.object({
    fullName: z.string().min(2).optional(),
    phone:    z.string().min(7).optional(),
    avatar:   z.string().optional(),
  });
  const data = schema.parse(req.body);
  const user = await User.findById(req.user!.userId);
  if (!user) throw new AppError(404, "User not found");
  if (data.fullName !== undefined) user.fullName = data.fullName;
  if (data.phone    !== undefined) user.phone    = data.phone;
  if (data.avatar   !== undefined) user.avatar   = data.avatar;
  await user.save();
  ok(res, { user });
}

// add address
export async function addAddress(req: Request, res: Response): Promise<void> {
  const schema = z.object({
    label:  z.string().default("Home"),
    street: z.string().min(3),
    city:   z.string().default(""),
    zip:    z.string().default(""),
  });
  const addr = schema.parse(req.body);
  const user = await User.findById(req.user!.userId);
  if (!user) throw new AppError(404, "User not found");
  user.addresses.push(addr as IUser["addresses"][number]);
  await user.save();
  ok(res, { user });
}

// remove address
export async function removeAddress(req: Request, res: Response): Promise<void> {
  const user = await User.findByIdAndUpdate(
    req.user!.userId,
    { $pull: { addresses: { _id: req.params.addressId } } },
    { new: true }
  );
  if (!user) throw new AppError(404, "User not found");
  ok(res, { user });
}

// google OAuth start
export async function googleStart(_req: Request, res: Response): Promise<void> {
  if (!env.GOOGLE_OAUTH_ENABLED) {
    throw new AppError(503, "Google sign-in is not configured on this server");
  }
  const state = issueOAuthState();
  res.redirect(buildGoogleAuthUrl(state));
}

// google OAuth callback
export async function googleCallback(req: Request, res: Response): Promise<void> {
  if (!env.GOOGLE_OAUTH_ENABLED) {
    throw new AppError(503, "Google sign-in is not configured on this server");
  }

  const { code, state, error } = req.query as { code?: string; state?: string; error?: string };
  const failRedirect = (reason: string) => {
    securityLog("AUTH_OAUTH_FAIL", { req, reason });
    res.redirect(`${env.CLIENT_URL}/login?error=oauth_failed`);
  };

  if (error || !code) return failRedirect(error ?? "missing_code");
  if (!verifyOAuthState(state)) return failRedirect("invalid_state");

  let profile;
  try {
    profile = await fetchGoogleProfile(code);
  } catch {
    return failRedirect("token_exchange_failed");
  }

  if (!profile.email_verified) return failRedirect("email_unverified");

  const email = profile.email.toLowerCase();

  let user = await User.findOne({ googleId: profile.sub });
  if (!user) {
    user = await User.findOne({ email });
    if (user) {
      if (!user.googleId) {
        user.googleId = profile.sub;
        if (!user.password) user.authProvider = "google";
        await user.save();
      }
    } else {
      user = await User.create({
        fullName:     profile.name || email.split("@")[0],
        email,
        authProvider: "google",
        googleId:     profile.sub,
        ...(profile.picture ? { avatar: profile.picture } : {}),
      });
    }
  }

  if (user.isBanned) return failRedirect("account_suspended");

  const { accessToken, refreshToken } = await issueTokens(user);
  res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTS);
  securityLog("AUTH_OAUTH_LOGIN", { req, email, userId: (user._id as { toString(): string }).toString(), provider: "google" });

  const frag = new URLSearchParams({ accessToken, csrfToken: issueCsrfToken() });
  res.redirect(`${env.CLIENT_URL}/auth/callback#${frag.toString()}`);
}

// enroll MFA
export async function enrollMfa(req: Request, res: Response): Promise<void> {
  const user = await User.findById(req.user!.userId);
  if (!user) throw new AppError(404, "User not found");
  if (user.mfaEnabled) throw new AppError(400, "MFA is already enabled on this account");

  const secret = generateTotpSecret();
  const otpauthUrl = totpKeyUri(user.email, secret);
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl);
  const encrypted = encryptSecret(secret);

  await User.updateOne({ _id: user._id }, { mfaTempSecret: encrypted });

  ok(res, { qrDataUrl, secret });
}

// verify MFA enrollment
export async function verifyMfaEnrollment(req: Request, res: Response): Promise<void> {
  const { code } = req.body as z.infer<typeof verifyMfaEnrollSchema>;

  const user = await User.findById(req.user!.userId).select("+mfaTempSecret");
  if (!user) throw new AppError(404, "User not found");
  if (user.mfaEnabled) throw new AppError(400, "MFA is already enabled");
  if (!user.mfaTempSecret) throw new AppError(400, "No MFA enrollment in progress — call /enroll first");

  const secret = decryptSecret(user.mfaTempSecret);
  const valid = await verifyTotp(secret, code);
  if (!valid) throw new AppError(400, "Invalid code. Check your authenticator app and try again.");

  const plainCodes = generateRecoveryCodes();
  const hashedCodes = await Promise.all(plainCodes.map(hashRecoveryCode));

  await User.updateOne(
    { _id: user._id },
    {
      mfaEnabled:    true,
      mfaSecret:     encryptSecret(secret),
      recoveryCodes: hashedCodes,
      $unset:        { mfaTempSecret: 1 },
    }
  );

  securityLog("AUTH_MFA_ENROLLED", { req, userId: req.user!.userId });
  ok(res, { recoveryCodes: plainCodes });
}

// disable MFA
export async function disableMfa(req: Request, res: Response): Promise<void> {
  const { password, code } = req.body as z.infer<typeof disableMfaSchema>;

  const user = await User.findById(req.user!.userId).select("+password +mfaSecret +recoveryCodes");
  if (!user) throw new AppError(404, "User not found");
  if (!user.mfaEnabled) throw new AppError(400, "MFA is not enabled on this account");
  if (!user.password) throw new AppError(400, "This account signs in with Google; manage MFA from your provider.");

  const pwOk = await bcrypt.compare(password, user.password);
  if (!pwOk) throw new AppError(401, "Incorrect password");

  const secret = decryptSecret(user.mfaSecret!);
  const totpOk = await verifyTotp(secret, code);

  if (!totpOk) {
    const recovery = await findAndConsumeRecoveryCode(code.toUpperCase(), user.recoveryCodes);
    if (!recovery) throw new AppError(400, "Invalid code");
  }

  await User.updateOne(
    { _id: user._id },
    { mfaEnabled: false, $unset: { mfaSecret: 1, recoveryCodes: 1 } }
  );

  securityLog("AUTH_MFA_DISABLED", { req, userId: req.user!.userId });
  ok(res, { message: "MFA disabled successfully" });
}

// verify MFA login
export async function verifyMfaLogin(req: Request, res: Response): Promise<void> {
  const { mfaToken, code, isRecoveryCode } = req.body as z.infer<typeof verifyMfaLoginSchema>;

  let payload;
  try {
    payload = verifyMfaPendingToken(mfaToken);
  } catch {
    throw new AppError(401, "MFA session expired. Please log in again.");
  }

  const user = await User.findById(payload.userId).select("+mfaSecret +recoveryCodes");
  if (!user || !user.mfaEnabled || !user.mfaSecret) {
    throw new AppError(401, GENERIC_AUTH_ERROR);
  }

  if (isRecoveryCode) {
    const recovery = await findAndConsumeRecoveryCode(code.toUpperCase(), user.recoveryCodes);
    if (!recovery) throw new AppError(401, "Invalid recovery code");
    const updatedCodes = user.recoveryCodes.filter((_, i) => i !== recovery.index);
    await User.updateOne({ _id: user._id }, { recoveryCodes: updatedCodes });
  } else {
    const secret = decryptSecret(user.mfaSecret);
    const valid = await verifyTotp(secret, code);
    if (!valid) throw new AppError(401, "Invalid authenticator code. Try again.");
  }

  await User.updateOne({ _id: user._id }, { failedLoginAttempts: 0, $unset: { lockUntil: 1 } });

  const freshUser = await User.findById(payload.userId);
  if (!freshUser) throw new AppError(404, "User not found");

  const { accessToken, refreshToken } = await issueTokens(freshUser);
  res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTS);
  securityLog("AUTH_MFA_LOGIN", { req, userId: payload.userId, method: isRecoveryCode ? "recovery_code" : "totp" });
  ok(res, { user: freshUser, accessToken, refreshToken, csrfToken: issueCsrfToken() });
}
