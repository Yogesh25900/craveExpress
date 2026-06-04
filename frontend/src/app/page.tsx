import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/sections/HeroSection";
import CategorySection from "@/components/sections/CategorySection";
import FeaturedRestaurants from "@/components/sections/FeaturedRestaurants";
import PromoBanner from "@/components/sections/PromoBanner";
import HowItWorks from "@/components/sections/HowItWorks";
import AppDownload from "@/components/sections/AppDownload";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <CategorySection />
        <FeaturedRestaurants />
        <PromoBanner />
        <HowItWorks />
        <AppDownload />
      </main>
      <Footer />
    </>
  );
}
