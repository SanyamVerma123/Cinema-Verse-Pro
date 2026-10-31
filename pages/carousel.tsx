import Head from "next/head";
import dynamic from "next/dynamic";

const HeroLiquidGlassBanner = dynamic(
  () => import("@/components/HeroLiquidGlassBanner"),
  { ssr: false }
);

const LiquidGlassCarousel = dynamic(
  () => import("@/components/ui/liquid-glass-carousel"),
  { ssr: false }
);

export default function CarouselPage() {
  return (
    <>
      <Head>
        <title>CinemaVerse — Liquid Glass Carousel Experience</title>
        <meta name="description" content="Next-Gen 3D Liquid Glass Carousel with Three.js shaders and GSAP animations." />
      </Head>

      <main className="min-h-screen bg-[#141414] text-white">
        {/* Navigation Bar */}
        <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 bg-gradient-to-b from-black/80 to-transparent backdrop-blur-sm">
          <div className="flex items-center gap-6">
            <a href="/" className="text-2xl font-black tracking-tighter text-red-600">
              CINEMAVERSE
            </a>
            <span className="text-xs font-semibold uppercase tracking-wider text-white/60 border border-white/20 px-2 py-0.5 rounded">
              Liquid Glass 3D Showcase
            </span>
          </div>
          <a
            href="/"
            className="text-xs font-semibold px-4 py-2 rounded bg-white/10 hover:bg-white/20 transition border border-white/20"
          >
            ← Back to Home
          </a>
        </header>

        {/* Hero Liquid Glass Banner with OTT UI */}
        <section className="pt-16">
          <HeroLiquidGlassBanner />
        </section>

        {/* Standalone Carousel Section */}
        <section className="py-16 px-8 max-w-7xl mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight mb-2">Standalone Liquid Glass Carousel</h2>
            <p className="text-sm text-neutral-400">
              Drag, swipe, or click any card to experience real-time WebGL refraction, chromatic dispersion, and fluid inertia.
            </p>
          </div>
          <div className="w-full h-[600px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black">
            <LiquidGlassCarousel entry={false} />
          </div>
        </section>
      </main>
    </>
  );
}
