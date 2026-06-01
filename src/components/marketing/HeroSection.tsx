import { HeroAnimatedContent } from "@/components/marketing/HeroAnimatedContent";
import { HeroClayMascots } from "@/components/marketing/HeroClayMascots";
import { HeroFloatingTags } from "@/components/marketing/HeroFloatingTags";

export function HeroSection() {
  return (
    <section className="relative overflow-x-hidden bg-[#f8fafc] px-4 pb-14 pt-6 sm:px-6 sm:pb-20 sm:pt-8 lg:min-h-[calc(100vh-4rem)] lg:pb-20 lg:pt-10">
      <div className="mx-auto flex h-full max-w-6xl flex-col justify-start lg:pt-4">
        <div className="grid items-center gap-10 sm:gap-14 lg:grid-cols-2 lg:gap-10 xl:gap-16">
          <HeroAnimatedContent />

          <div
            className="hero-reveal-item relative flex w-full items-center justify-center px-2 sm:px-0 lg:justify-end lg:-translate-y-4"
            style={{ animationDelay: "400ms" }}
          >
            <HeroFloatingTags />
            <HeroClayMascots />
          </div>
        </div>
      </div>
    </section>
  );
}
