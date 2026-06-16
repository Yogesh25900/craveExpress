"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function HeroSection() {
  const [address, setAddress] = useState("");
  const router = useRouter();

  function handleFindFood() {
    const q = address.trim();
    router.push(q ? `/restaurants?search=${encodeURIComponent(q)}` : "/restaurants");
  }

  return (
    <section className="relative h-[600px] overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1920&h=700&fit=crop&q=80"
          alt="Delicious food spread"
          fill
          className="object-cover object-center"
          priority
        />
        {/* Dark overlay – heavier on left where text sits, fades right */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
        {/* Additional bottom fade for depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
      </div>

      {/* Content — vertically centered inside the 600px hero */}
      <div className="relative z-10 h-full flex items-center">
        <div className="w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-16">
          <div className="max-w-lg">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-[1.15] mb-3">
              Deliciousness delivered
              <br />
              <span className="text-white">to your door</span>
            </h1>
            <p className="text-gray-300 text-base mb-8">
              Find your favorite restaurants in your area
            </p>

            {/* Address bar + CTA */}
            <div className="flex items-center bg-white rounded-full shadow-xl overflow-hidden max-w-md">
              <div className="flex items-center flex-1 pl-4 pr-2">
                <MapPin className="w-4 h-4 text-gray-400 shrink-0 mr-2" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleFindFood()}
                  placeholder="Enter your delivery address"
                  className="flex-1 py-3.5 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none bg-transparent min-w-0"
                />
              </div>
              <button
                onClick={handleFindFood}
                className="bg-[#ff6b35] hover:bg-[#e55a26] text-white font-semibold text-sm px-6 py-3.5 rounded-full m-1 transition-colors whitespace-nowrap"
              >
                Find Food
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
