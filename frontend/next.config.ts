import type { NextConfig } from "next";

const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ?? "http://localhost:4000";

// Content-Security-Policy for the frontend web app.
// 'unsafe-inline' on script-src is required by Next.js (inline hydration scripts).
// 'unsafe-eval' is required in Next.js development mode only.
const isDev = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  // Next.js requires 'unsafe-inline' for hydration; 'unsafe-eval' for dev HMR
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://js.hcaptcha.com https://newassets.hcaptcha.com`,
  "style-src 'self' 'unsafe-inline'",
  // Unsplash and Picsum for food/restaurant images
  "img-src 'self' data: blob: https://images.unsplash.com https://picsum.photos https://newassets.hcaptcha.com",
  // Backend API + hCaptcha verification endpoint
  `connect-src 'self' ${API_ORIGIN} https://hcaptcha.com https://api.hcaptcha.com`,
  "font-src 'self' data:",
  // hCaptcha renders inside an iframe
  "frame-src https://newassets.hcaptcha.com",
  // Prevent this page from being embedded in any frame (clickjacking)
  "frame-ancestors 'none'",
  "base-uri 'self'",
  // 'self' plus eSewa payment endpoints — the checkout auto-submits a signed form
  // to eSewa's hosted payment page (sandbox rc-epay + production epay).
  "form-action 'self' https://rc-epay.esewa.com.np https://epay.esewa.com.np",
].join("; ");

const securityHeaders = [
  // Prevent MIME-type sniffing
  { key: "X-Content-Type-Options",    value: "nosniff" },
  // Legacy clickjacking protection (frame-ancestors in CSP is the modern equivalent)
  { key: "X-Frame-Options",           value: "DENY" },
  // Reduce referrer leakage
  { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
  // Lock down browser feature APIs
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  // Enable XSS auditor in older browsers
  { key: "X-XSS-Protection",          value: "1; mode=block" },
  // DNS prefetch control
  { key: "X-DNS-Prefetch-Control",    value: "on" },
  // CSP
  { key: "Content-Security-Policy",   value: csp },
];

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle for a small, reproducible Docker image.
  output: "standalone",

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },

  async headers() {
    return [
      {
        // Apply to all routes
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
