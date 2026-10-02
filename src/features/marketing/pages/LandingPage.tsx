import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import ValueStrip from "../components/ValueStrip";
import FeaturesGrid from "../components/FeaturesGrid";
import ShowcaseSection from "../components/ShowcaseSection";
import InsightsSection from "../components/InsightsSection";
import HowItWorks from "../components/HowItWorks";
import SecuritySection from "../components/SecuritySection";
import Testimonials from "../components/Testimonials";
import PlansSection from "../components/PlansSection";
import FaqSection from "../components/FaqSection";
import FinalCta from "../components/FinalCta";
import Footer from "../components/Footer";
import { LeadCaptureProvider } from "../components/LeadCapture";

export default function LandingPage() {
  const token = useAuthStore((s) => s.token);
  const isSessionValid = useAuthStore((s) => s.isSessionValid);

  // Someone already signed in landing on "/" should go straight to their dashboard,
  // not see marketing copy — mirrors the redirect this route used to do unconditionally.
  if (token && isSessionValid()) return <Navigate to="/dashboard" replace />;

  return (
    <LeadCaptureProvider>
      <div className="min-h-screen overflow-x-clip bg-white antialiased">
        <Navbar />
        <main>
          <Hero />
          <ValueStrip />
          <FeaturesGrid />
          <ShowcaseSection />
          <InsightsSection />
          <HowItWorks />
          <SecuritySection />
          <Testimonials />
          <PlansSection />
          <FaqSection />
          <FinalCta />
        </main>
        <Footer />
      </div>
    </LeadCaptureProvider>
  );
}
