import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import FeaturesGrid from "../components/FeaturesGrid";
import ProductPreview from "../components/ProductPreview";
import WhySection from "../components/WhySection";
import Testimonials from "../components/Testimonials";
import PricingSection from "../components/PricingSection";
import FinalCta from "../components/FinalCta";
import Footer from "../components/Footer";

export default function LandingPage() {
  const token = useAuthStore((s) => s.token);
  const isSessionValid = useAuthStore((s) => s.isSessionValid);

  // Someone already signed in landing on "/" should go straight to their dashboard,
  // not see marketing copy — mirrors the redirect this route used to do unconditionally.
  if (token && isSessionValid()) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <Hero />
        <FeaturesGrid />
        <ProductPreview />
        <WhySection />
        <Testimonials />
        <PricingSection />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
