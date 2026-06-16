import { Router } from "express";
import { validate } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";
import { authLimiter } from "../middleware/rateLimiter";
import { verifyCsrf } from "../middleware/csrf";
import {
  signup, login, refresh, logout, forgotPassword, changePassword,
  enrollMfa, verifyMfaEnrollment, disableMfa, verifyMfaLogin,
  googleStart, googleCallback,
  getMe, updateMe, addAddress, removeAddress, exportUserData,
  signupSchema, loginSchema, forgotPasswordSchema, changePasswordSchema,
  verifyMfaEnrollSchema, disableMfaSchema, verifyMfaLoginSchema,
} from "../controllers/auth.controller";

const router = Router();

// Public
router.post("/signup",          authLimiter, validate(signupSchema),          signup);
router.post("/login",           authLimiter, validate(loginSchema),           login);
router.post("/refresh", verifyCsrf,                                            refresh);
router.post("/logout",  verifyCsrf,                                            logout);
router.post("/forgot-password", authLimiter, validate(forgotPasswordSchema),  forgotPassword);
router.post("/mfa/verify-login",             validate(verifyMfaLoginSchema),  verifyMfaLogin);

// OAuth2 / SSO
router.get("/oauth/google",          googleStart);
router.get("/oauth/google/callback", googleCallback);

// Protected (user must be logged in)
router.get ("/me/export",                 requireAuth, exportUserData);
router.get ("/me",                        requireAuth, getMe);
router.put ("/me",                        requireAuth, updateMe);
router.post("/me/addresses",              requireAuth, addAddress);
router.delete("/me/addresses/:addressId", requireAuth, removeAddress);
router.post("/me/change-password",        requireAuth, validate(changePasswordSchema),    changePassword);
router.post("/me/mfa/enroll",             requireAuth, enrollMfa);
router.post("/me/mfa/verify-enroll",      requireAuth, validate(verifyMfaEnrollSchema),  verifyMfaEnrollment);
router.post("/me/mfa/disable",            requireAuth, validate(disableMfaSchema),        disableMfa);

export default router;
