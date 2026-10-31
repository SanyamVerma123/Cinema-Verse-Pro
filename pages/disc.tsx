import Head from "next/head";
import dynamic from "next/dynamic";

const DiscCascadeDemo = dynamic(
  () => import("@/components/ui/disc-cascade-demo"),
  { ssr: false }
);

export default function DiscPage() {
  return (
    <>
      <Head>
        <title>CinemaVerse — 3D Disc Cascade Vinyl Carousel</title>
        <meta name="description" content="Immersive 3D Disc Cascade Vinyl Carousel with realistic CD textures, grooved hubs, and smooth inertia." />
      </Head>
      <main className="min-h-screen bg-[#0d0d0f] flex flex-col items-center justify-center">
        <DiscCascadeDemo />
      </main>
    </>
  );
}
