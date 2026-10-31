"use client";

import React, { useState, useEffect } from "react";
import { LiquidGlassCarousel, type LiquidGlassCarouselItem } from "./ui/liquid-glass-carousel";
import { Play, Info, Download, Share2, Plus, Volume2, VolumeX, Flame } from "lucide-react";

export interface HeroMovieItem {
  id: string | number;
  title: string;
  backdrop?: string;
  poster?: string;
  description?: string;
  year?: string | number;
  duration?: string;
  quality?: string;
  matchRate?: string;
  maturity?: string;
  audio?: string;
  platform?: string;
  badge?: string;
}

export interface HeroLiquidGlassBannerProps {
  items?: HeroMovieItem[];
  onPlay?: (item: HeroMovieItem) => void;
  onMoreInfo?: (item: HeroMovieItem) => void;
  onDownload?: (item: HeroMovieItem) => void;
  onShare?: (item: HeroMovieItem) => void;
  className?: string;
}

const DEFAULT_BANNER_ITEMS: HeroMovieItem[] = [
  {
    id: "tt4574334",
    title: "Stranger Things",
    backdrop: "https://images.metahub.space/background/medium/tt4574334/img",
    description: "When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces and one strange little girl.",
    year: "2024",
    duration: "4 Seasons",
    quality: "4K Ultra HD",
    matchRate: "99% Match",
    maturity: "16+",
    audio: "Dolby Atmos",
    platform: "NETFLIX",
    badge: "#1 in TV Shows Today",
  },
  {
    id: "tt0903747",
    title: "Breaking Bad",
    backdrop: "https://images.metahub.space/background/medium/tt0903747/img",
    description: "A chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine with a former student.",
    year: "2013",
    duration: "5 Seasons",
    quality: "4K Ultra HD",
    matchRate: "98% Match",
    maturity: "18+",
    audio: "5.1 Surround",
    platform: "NETFLIX",
    badge: "Trending Worldwide",
  },
  {
    id: "tt1375666",
    title: "Inception",
    backdrop: "https://images.metahub.space/background/medium/tt1375666/img",
    description: "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.",
    year: "2010",
    duration: "2h 28m",
    quality: "4K Ultra HD",
    matchRate: "99% Match",
    maturity: "13+",
    audio: "Dolby Atmos",
    platform: "PRIME VIDEO",
    badge: "Blockbuster Hit",
  },
  {
    id: "tt8772296",
    title: "Euphoria",
    backdrop: "https://images.metahub.space/background/medium/tt8772296/img",
    description: "A look at life for a group of high school students as they grapple with issues of drugs, sex, and identity.",
    year: "2022",
    duration: "2 Seasons",
    quality: "4K Ultra HD",
    matchRate: "97% Match",
    maturity: "18+",
    audio: "5.1 Surround",
    platform: "HBO MAX",
    badge: "Critically Acclaimed",
  },
  {
    id: "tt1190634",
    title: "The Boys",
    backdrop: "https://images.metahub.space/background/medium/tt1190634/img",
    description: "A fun and irreverent take on what happens when superheroes—who are as popular as celebrities—abuse their superpowers rather than use them for good.",
    year: "2024",
    duration: "4 Seasons",
    quality: "4K Ultra HD",
    matchRate: "96% Match",
    maturity: "18+",
    audio: "Dolby Atmos",
    platform: "PRIME VIDEO",
    badge: "Top 10 Series",
  },
];

export function HeroLiquidGlassBanner({
  items = DEFAULT_BANNER_ITEMS,
  onPlay,
  onMoreInfo,
  onDownload,
  onShare,
  className = "",
}: HeroLiquidGlassBannerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);

  const activeMovie = items[activeIndex] || items[0];

  // Map to LiquidGlassCarousel items
  const carouselItems: LiquidGlassCarouselItem[] = items.map((m) => ({
    title: m.title,
    src: m.backdrop || m.poster || "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&h=800&fit=crop",
    aspect: 16 / 9,
  }));

  const handlePlayClick = () => {
    if (onPlay) {
      onPlay(activeMovie);
    } else if (typeof window !== "undefined" && (window as any).openWatchModal) {
      (window as any).openWatchModal(activeMovie.id);
    }
  };

  const handleInfoClick = () => {
    if (onMoreInfo) {
      onMoreInfo(activeMovie);
    } else if (typeof window !== "undefined" && (window as any).openDetailsModal) {
      (window as any).openDetailsModal(activeMovie.id);
    }
  };

  return (
    <div className={`relative w-full h-[70vh] min-h-[520px] max-h-[750px] overflow-hidden bg-[#141414] select-none ${className}`}>
      {/* 3D WebGL Liquid Glass Canvas Carousel */}
      <div className="absolute inset-0 z-0 pointer-events-auto">
        <LiquidGlassCarousel
          items={carouselItems}
          entry={false}
          onActiveChange={(idx) => setActiveIndex(idx)}
          className="w-full h-full"
        />
      </div>

      {/* Cinematic Vignette Gradients */}
      <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-r from-black/90 via-black/45 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-48 bg-gradient-to-t from-[#141414] via-[#141414]/70 to-transparent" />

      {/* Foreground CinemaVerse UI Metadata */}
      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-end p-8 md:p-14 max-w-2xl text-white">
        {/* OTT Platform and Tag Badges */}
        <div className="flex items-center gap-3 mb-3">
          <span className="bg-red-600/90 text-white text-[11px] font-bold px-2.5 py-1 rounded tracking-widest uppercase shadow">
            {activeMovie.platform || "NETFLIX"}
          </span>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-white/90 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
            <Flame className="w-3.5 h-3.5 text-red-500 fill-red-500" />
            {activeMovie.badge || "#1 in Movies Today"}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-5xl font-black tracking-tight drop-shadow-md mb-3 line-clamp-2">
          {activeMovie.title}
        </h1>

        {/* Meta Info */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs font-medium text-white/80 mb-3">
          <span className="text-emerald-400 font-bold">{activeMovie.matchRate || "99% Match"}</span>
          <span className="text-white/60">•</span>
          <span>{activeMovie.year || "2024"}</span>
          <span className="text-white/60">•</span>
          <span className="border border-white/30 px-1.5 py-0.5 rounded text-[10px]">
            {activeMovie.maturity || "16+"}
          </span>
          <span className="text-white/60">•</span>
          <span>{activeMovie.duration || "2h 15m"}</span>
          <span className="border border-white/20 bg-white/5 px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold text-white/90">
            {activeMovie.quality || "4K Ultra HD"}
          </span>
          <span className="border border-white/20 bg-white/5 px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold text-white/90">
            {activeMovie.audio || "Dolby Atmos"}
          </span>
        </div>

        {/* Description */}
        <p className="text-sm md:text-base text-white/80 line-clamp-3 mb-6 max-w-xl leading-relaxed drop-shadow">
          {activeMovie.description}
        </p>

        {/* Action Buttons */}
        <div className="pointer-events-auto flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={handlePlayClick}
            className="flex items-center gap-2 px-6 py-2.5 bg-white text-black font-bold text-sm rounded hover:bg-white/80 transition-all duration-200 shadow-lg active:scale-95 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-black" /> Play
          </button>
          <button
            type="button"
            onClick={handleInfoClick}
            className="flex items-center gap-2 px-5 py-2.5 bg-white/20 backdrop-blur-md text-white font-semibold text-sm rounded hover:bg-white/30 transition-all duration-200 border border-white/10 active:scale-95 cursor-pointer"
          >
            <Info className="w-4 h-4" /> More Info
          </button>
          <button
            type="button"
            onClick={() => onDownload?.(activeMovie)}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/20 hover:bg-white/20 transition-all active:scale-95 cursor-pointer"
            title="Download Title"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onShare?.(activeMovie)}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/20 hover:bg-white/20 transition-all active:scale-95 cursor-pointer"
            title="Share Title"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Top Right Sound Toggle & Maturity */}
      <div className="pointer-events-auto absolute top-8 right-8 z-10 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIsMuted(!isMuted)}
          className="flex items-center justify-center w-9 h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white hover:bg-black/60 transition cursor-pointer"
          title={isMuted ? "Unmute Preview" : "Mute Preview"}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
        <div className="bg-black/40 backdrop-blur-md border-l-2 border-white/80 px-3 py-1 text-xs font-bold text-white tracking-wider">
          {activeMovie.maturity || "16+"}
        </div>
      </div>
    </div>
  );
}

export default HeroLiquidGlassBanner;
