import Link from "next/link";
import { UtensilsCrossed } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#ff6b35] rounded-lg flex items-center justify-center">
              <UtensilsCrossed className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-base font-bold text-[#ff6b35]">CraveExpress</span>
          </Link>

          {/* Links */}
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-500">
            <Link href="#" className="hover:text-[#ff6b35] transition-colors">About</Link>
            <Link href="#" className="hover:text-[#ff6b35] transition-colors">Partner with us</Link>
            <Link href="#" className="hover:text-[#ff6b35] transition-colors">Get the app</Link>
            <Link href="#" className="hover:text-[#ff6b35] transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-[#ff6b35] transition-colors">Terms of Service</Link>
          </nav>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100 text-center text-xs text-gray-400">
          © 2024 CraveExpress. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
