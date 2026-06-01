import { AICoachSection } from "@/components/marketing/AICoachSection";
import { DashboardWindowPreview } from "@/components/marketing/DashboardWindowPreview";
import { HeroSection } from "@/components/marketing/HeroSection";
import { LifeDomainsFloat } from "@/components/marketing/LifeDomainsFloat";
import { LogoMarquee } from "@/components/marketing/LogoMarquee";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { ModulesSection } from "@/components/marketing/ModulesSection";
import { PricingSection } from "@/components/marketing/PricingSection";
import { SystemCapabilitiesSection } from "@/components/marketing/SystemCapabilitiesSection";
import { SmartSystemSection } from "@/components/marketing/SmartSystemSection";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      <MarketingNav />
      <main>
        <HeroSection />
        <LogoMarquee />
        <SmartSystemSection />
        <SystemCapabilitiesSection />
        <LifeDomainsFloat />
        <ModulesSection />
        <AICoachSection />
        <DashboardWindowPreview />
        <PricingSection />
      </main>
      <MarketingFooter />
    </div>
  );
}
