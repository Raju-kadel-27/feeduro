import { TeamsOrbitSection } from "./components/teams-orbit-section";
import { FaqSection } from "./components/faq-section";
import { FeaturesSection } from "./components/features-section";
import { HeroSection } from "./components/hero-section";
import { LandingFooter } from "./components/landing-footer";
import { LandingNav } from "./components/landing-nav";
import { ShowcaseSection } from "./components/showcase-section";

export function LandingPage() {
  return (
    <div className="force-light relative min-h-screen bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='rgb(148 163 184 / 0.05)'%3e%3cpath d='M0 .5H31.5V32'/%3e%3c/svg%3e\")",
        }}
      />
      <LandingNav />
      <main>
        <HeroSection />
<TeamsOrbitSection />
        <ShowcaseSection />
        <FeaturesSection />
<FaqSection />
      </main>
      <LandingFooter />
    </div>
  );
}
