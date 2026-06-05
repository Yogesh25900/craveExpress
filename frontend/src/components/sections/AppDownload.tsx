import { Apple, Play, UtensilsCrossed } from "lucide-react";

export default function AppDownload() {
  return (
    <section className="py-10 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#ff6b35] rounded-2xl overflow-hidden flex flex-col md:flex-row items-center gap-8 px-8 py-12 sm:px-12 sm:py-14 relative">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />

          {/* Text */}
          <div className="flex-1 relative z-10 text-center md:text-left">
            <h2 className="text-white text-2xl sm:text-3xl font-extrabold mb-3 leading-tight">
              Get more with the
              <br />
              CraveExpress App
            </h2>
            <p className="text-orange-100 text-sm mb-8 max-w-sm md:mx-0 mx-auto">
              Track your orders in real-time, get exclusive offers, and reorder
              your favorites with a tap.
            </p>

            {/* Store buttons */}
            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              <button className="flex items-center gap-3 bg-black hover:bg-gray-900 text-white px-5 py-3 rounded-xl transition-colors group">
                <Apple className="w-6 h-6" />
                <div className="text-left">
                  <p className="text-[10px] text-gray-400 leading-none">
                    Download on the
                  </p>
                  <p className="text-sm font-bold leading-tight">App Store</p>
                </div>
              </button>
              <button className="flex items-center gap-3 bg-black hover:bg-gray-900 text-white px-5 py-3 rounded-xl transition-colors group">
                <Play className="w-5 h-5 fill-white" />
                <div className="text-left">
                  <p className="text-[10px] text-gray-400 leading-none">
                    Get it on
                  </p>
                  <p className="text-sm font-bold leading-tight">Google Play</p>
                </div>
              </button>
            </div>
          </div>

          {/* Phone mockup */}
          <div className="relative z-10 shrink-0">
            <div className="w-40 h-72 bg-white rounded-3xl shadow-2xl border-4 border-white flex flex-col overflow-hidden">
              {/* Phone status bar */}
              <div className="bg-[#ff6b35] px-4 py-3 flex items-center gap-2">
                <div className="w-5 h-5 bg-white/30 rounded flex items-center justify-center">
                  <UtensilsCrossed className="w-3 h-3 text-white" strokeWidth={2.5} />
                </div>
                <span className="text-white text-[10px] font-bold">
                  CraveExpress
                </span>
              </div>
              {/* App content mockup */}
              <div className="flex-1 p-3 bg-gray-50 space-y-2">
                {[60, 45, 50, 40].map((w, i) => (
                  <div
                    key={i}
                    className="h-8 bg-gray-200 rounded-lg animate-pulse"
                    style={{ width: `${w + i * 5}%` }}
                  />
                ))}
                <div className="grid grid-cols-2 gap-1.5 mt-2">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-12 bg-gray-200 rounded-lg animate-pulse"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
