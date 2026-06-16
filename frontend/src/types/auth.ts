// ─── Auth types ───────────────────────────────────────────────────────────────
// Field names match the backend API contract exactly.
// confirmPassword is client-only and stripped before sending to the API.

export interface UserAddress {
  _id: string;
  label: string;
  street: string;
  city: string;
  zip: string;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  avatar?: string;
  role?: "user" | "owner" | "admin" | "rider";
  restaurantId?: string;
  isOnline?: boolean;        // rider only
  addresses?: UserAddress[];
  mfaEnabled?: boolean;
  createdAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  captchaToken?: string;
}

export interface SignupData {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string; // client-only — not sent to API
  role?: "user" | "rider";
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiErrorBody {
  message: string;
  errors?: ApiFieldError[];
  code?: string;
}
