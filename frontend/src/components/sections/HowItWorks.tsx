import { UtensilsCrossed, Smartphone, Home } from "lucide-react";

const steps = [
  {
    icon: <UtensilsCrossed className="w-7 h-7 text-[#ff6b35]" />,
    step: "1",
    title: "Select Restaurant",
    desc: "Browse menus from local favorites and discover new places.",
  },
  {
    icon: <Smartphone className="w-7 h-7 text-[#ff6b35]" />,
    step: "2",
    title: "Place Order",
    desc: "Customize your meal and checkout quickly and securely.",
  },
  {
    icon: <Home className="w-7 h-7 text-[#ff6b35]" />,
    step: "3",
    title: "Enjoy Meal",
    desc: "Track your delivery in real-time until it reaches your door.",
  },
];

export default function HowItWorks() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">How it works</h2>
        <p className="text-gray-500 text-sm mb-12">
          Get your favorite food in three simple steps.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-0 relative">
          {/* Connector lines – desktop only */}
          <div
            className="hidden sm:block absolute top-12 left-1/2 -translate-x-1/2 w-1/2 border-t-2 border-dashed border-gray-200"
            style={{ left: "25%", width: "50%" }}
          />

          {steps.map((s, i) => (
            <div
              key={s.title}
              className="flex flex-col items-center relative z-10 flex-1"
            >
              {/* Icon circle */}
              <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center border-2 border-orange-100 mb-4 shadow-sm">
                {s.icon}
              </div>
              <p className="text-sm font-bold text-gray-400 mb-1">
                {s.step}.
              </p>
              <h3 className="font-bold text-gray-900 mb-2">{s.title}</h3>
              <p className="text-gray-500 text-sm max-w-[180px] leading-relaxed">
                {s.desc}
              </p>

              {/* Mobile connector */}
              {i < steps.length - 1 && (
                <div className="sm:hidden w-0.5 h-8 border-l-2 border-dashed border-gray-200 my-4" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
