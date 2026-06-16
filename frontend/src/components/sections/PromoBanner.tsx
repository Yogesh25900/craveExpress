import Image from "next/image";

export default function PromoBanner() {
  return (
    <section className="py-10 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl overflow-hidden flex flex-col md:flex-row min-h-[200px]">
          {/* Left - Free Delivery */}
          <div className="flex-1 bg-gradient-to-br from-gray-900 to-gray-800 p-8 sm:p-10 flex flex-col justify-center relative overflow-hidden">
            {/* Decorative blobs */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#ff6b35]/20 rounded-full blur-2xl" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-[#ff6b35]/10 rounded-full blur-2xl" />

            <div className="relative">
              <span className="inline-block bg-[#ff6b35] text-white text-xs font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wide">
                Limited Time
              </span>
              <h3 className="text-white text-2xl sm:text-3xl font-extrabold leading-tight mb-2">
                Free Delivery on
                <br />
                your first order!
              </h3>
              <p className="text-gray-400 text-sm mb-6">
                Use code <span className="text-[#ff6b35] font-bold">CRAVEFREE</span> at checkout
              </p>
              <button className="inline-flex bg-[#ff6b35] hover:bg-[#e55a26] text-white font-semibold px-6 py-3 rounded-full text-sm transition-colors">
                Claim Offer
              </button>
            </div>
          </div>

          {/* Right - Flash Sale */}
          <div className="flex-1 relative min-h-[220px] md:min-h-0">
            <Image
              src="https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&h=400&fit=crop&q=80"
              alt="Fresh produce"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-green-900/80 via-green-800/50 to-transparent" />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
              <div className="bg-red-500 text-white font-extrabold text-sm px-4 py-1 rounded-full mb-3 uppercase tracking-widest shadow-lg transform -rotate-2">
                FLASH SALE!
              </div>
              <h3 className="text-white font-extrabold text-2xl sm:text-3xl leading-tight drop-shadow-lg">
                UP TO 30% OFF
              </h3>
              <p className="text-green-200 font-semibold text-sm sm:text-base mt-1">
                FRESH PRODUCE
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
