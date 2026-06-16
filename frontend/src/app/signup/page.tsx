import type { Metadata } from "next";
import AuthLayout from "@/components/layout/AuthLayout";
import SignupForm from "@/components/forms/SignupForm";

export const metadata: Metadata = {
  title: "Sign Up — CraveExpress",
  description: "Create your CraveExpress account and start ordering.",
};

export default function SignupPage() {
  return (
    <AuthLayout
      heading="Create your account"
      subheading="Order food or join as a delivery partner"
    >
      <SignupForm />
    </AuthLayout>
  );
}
