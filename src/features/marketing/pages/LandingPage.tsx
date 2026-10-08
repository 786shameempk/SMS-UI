import { Navigate } from "react-router-dom";
import { isAppOnOtherOrigin } from "@/lib/appUrl";
import { useAuthStore } from "@/store/authStore";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import ValueStrip from "../components/ValueStrip";
import FeaturesGrid from "../components/FeaturesGrid";
import AiSection from "../components/AiSection";
import ShowcaseSection from "../components/ShowcaseSection";
import MobileAppsSection from "../components/MobileAppsSection";
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

  // Someone already signed in landing on "/" should go straight to their dashboard, not see marketing copy -
  // but only when the app lives on this same origin (local dev). On the public site the landing page has its own
  // host (sms-schoolsphere.com) and the app another (demo.sms-schoolsphere.com): a session stored here from
  // before that split must not open the dashboard on the marketing host. Sign In links to the app, whose login
  // page sends signed-in users on to their dashboard.
  if (!isAppOnOtherOrigin && token && isSessionValid()) return <Navigate to="/dashboard" replace />;

  return (
    <LeadCaptureProvider>
      <div className="min-h-screen overflow-x-clip bg-white antialiased">
        <Navbar />
        <main>
          <Hero />
          <ValueStrip />
          <FeaturesGrid />
          <AiSection />
          <ShowcaseSection />
          <MobileAppsSection />
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
