import type { Metadata } from "next";
import AuthLayout from "@/components/layout/AuthLayout";
import ForgotPasswordForm from "@/components/forms/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot Password — CraveExpress",
  description: "Reset your CraveExpress account password.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      heading="Forgot your password?"
      subheading="Enter your email and we'll send you a reset link"
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
