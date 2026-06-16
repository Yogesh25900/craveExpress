import type { Metadata } from "next";
import { Suspense } from "react";
import AuthLayout from "@/components/layout/AuthLayout";
import LoginForm from "@/components/forms/LoginForm";

export const metadata: Metadata = {
  title: "Login — CraveExpress",
  description: "Sign in to your CraveExpress account.",
};

export default function LoginPage() {
  return (
    <AuthLayout
      heading="Welcome back"
      subheading="Sign in to your CraveExpress account"
    >
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthLayout>
  );
}
