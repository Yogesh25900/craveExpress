import Link from "next/link";
import { UtensilsCrossed, ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
  heading: string;
  subheading: string;
}

export default function AuthLayout({
  children,
  heading,
  subheading,
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative overflow-hidden">
      {/* Subtle brand blobs */}
      <div className="pointer-events-none absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-[#ff6b35]/6 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-[#ff6b35]/4 blur-3xl" />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-[#ff6b35] rounded-lg flex items-center justify-center shadow-sm">
            <UtensilsCrossed className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-base font-bold text-gray-900">CraveExpress</span>
        </Link>

        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#ff6b35] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>
      </header>

      {/* Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          {/* Heading */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">{heading}</h1>
            <p className="text-sm text-gray-500 mt-1">{subheading}</p>
          </div>

          {/* Form card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
