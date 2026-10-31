"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, Star, Play, Info } from "lucide-react";

export interface DiscCredit {
  label: string;
  value: string;
}

export interface DiscReview {
  source: string;
  quote: string;
  stars?: number;
}

export interface DiscCascadeItem {
  id?: string | number;
  title: string;
  src: string;
  labelStyle?: "curved" | "block";
  credits?: DiscCredit[];
  reviews?: DiscReview[];
  year?: string | number;
  length?: string;
  quality?: string;
  platform?: string;
  description?: string;
  rating?: string | number;
}

export interface DiscCascadeCarouselProps {
  items: DiscCascadeItem[];
  brand?: string;
  nav?: Array<{ label: string }>;
  indexLabel?: string;
  defaultIndex?: number;
  loop?: boolean;
  autoplay?: number | boolean;
  background?: string;
  color?: string;
  fontHref?: string;
  hint?: string;
  ariaLabel?: string;
  className?: string;
  onItemClick?: (item: DiscCascadeItem, index: number) => void;
  onPlay?: (item: DiscCascadeItem) => void;
}

export function DiscCascadeCarousel({
  items = [],
  brand = "side/b",
  nav = [{ label: "Records" }, { label: "Sessions" }],
  indexLabel = "Catalogue",
  defaultIndex = 1,
  loop = true,
  autoplay = 3600,
  background = "radial-gradient(120% 90% at 50% 40%, #1d1d21, #0b0b0d)",
  color = "#ecebe7",
  fontHref = "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;600;800&family=Oswald:wght@600;700&display=swap",
  hint = "Drag · ← →",
  ariaLabel = "Record catalogue",
  className = "",
  onItemClick,
  onPlay,
}: DiscCascadeCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(
    items.length ? Math.min(Math.max(0, defaultIndex), items.length - 1) : 0
  );
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [discRotation, setDiscRotation] = useState(0);

  const startXRef = useRef(0);
  const lastXRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoplayTimerRef = useRef<NodeJS.Timeout | null>(null);

  const n = items.length;

  const goTo = useCallback(
    (target: number) => {
      if (!n) return;
      if (loop) {
        setCurrentIndex((target + n) % n);
      } else {
        setCurrentIndex(Math.max(0, Math.min(n - 1, target)));
      }
      setDiscRotation((prev) => prev + (target > currentIndex ? 45 : -45));
    },
    [currentIndex, loop, n]
  );

  const next = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo]);
  const prev = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo]);

  // Autoplay management
  useEffect(() => {
    if (!autoplay || isDragging || n <= 1) return;
    const intervalMs = typeof autoplay === "number" ? autoplay : 3600;
    autoplayTimerRef.current = setInterval(() => {
      goTo(currentIndex + 1);
    }, intervalMs);

    return () => {
      if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);
    };
  }, [autoplay, currentIndex, goTo, isDragging, n]);

  // Touch and Drag handlers
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    setIsDragging(true);
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    startXRef.current = clientX;
    lastXRef.current = clientX;
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging) return;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const delta = clientX - startXRef.current;
    setDragOffset(delta);
    lastXRef.current = clientX;
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    const threshold = 70;
    if (dragOffset < -threshold) {
      next();
    } else if (dragOffset > threshold) {
      prev();
    }
    setDragOffset(0);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") next();
    if (e.key === "ArrowLeft") prev();
  };

  const currentItem = items[currentIndex] || items[0];

  // Format index string "06 / 07"
  const pad = (num: number) => String(num).padStart(2, "0");

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseMove={handleTouchMove}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
      className={`relative w-full min-h-[640px] md:min-h-[720px] overflow-hidden select-none flex flex-col justify-between py-8 px-6 md:px-12 focus:outline-none ${className}`}
      style={{
        background,
        color,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* External Fonts */}
      {fontHref && <link rel="stylesheet" href={fontHref} />}

      {/* TOP HEADER BAR */}
      <div className="relative z-30 flex items-start justify-between w-full">
        {/* Top-Left Active Item Info */}
        <div className="flex flex-col max-w-[280px] md:max-w-xs transition-opacity duration-300">
          <h2
            className="text-2xl md:text-4xl tracking-tight leading-none mb-3 font-normal"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            {currentItem?.title || ""}
          </h2>

          <div className="flex flex-col gap-1.5 text-[11px] md:text-xs tracking-wider uppercase opacity-75">
            {currentItem?.credits?.length ? (
              currentItem.credits.map((c, i) => (
                <div key={i} className="flex justify-between border-b border-white/10 pb-0.5">
                  <span className="opacity-60">{c.label}</span>
                  <span className="font-semibold text-white/90">{c.value}</span>
                </div>
              ))
            ) : (
              <>
                <div className="flex justify-between border-b border-white/10 pb-0.5">
                  <span className="opacity-60">SIDE A</span>
                  <span className="font-semibold text-white/90">
                    {currentItem?.platform || "FEATURED"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-0.5">
                  <span className="opacity-60">YEAR</span>
                  <span className="font-semibold text-white/90">{currentItem?.year || "2024"}</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-0.5">
                  <span className="opacity-60">LENGTH</span>
                  <span className="font-semibold text-white/90">{currentItem?.length || "45 min"}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Top-Center Brand & Navigation */}
        <div className="flex items-center gap-6 md:gap-8 text-xs font-semibold tracking-wider">
          <span className="text-sm md:text-base font-black tracking-tighter uppercase px-2.5 py-1 bg-white/10 rounded backdrop-blur-sm border border-white/10">
            {brand}
          </span>
          <div className="hidden sm:flex items-center gap-5 text-white/80">
            {nav.map((item, idx) => (
              <span
                key={idx}
                className="cursor-pointer hover:text-white transition flex flex-col items-center"
              >
                {item.label}
                {idx === 0 && <span className="w-1 h-1 rounded-full bg-white mt-0.5" />}
              </span>
            ))}
            <span className="cursor-pointer text-white/60 hover:text-white transition">
              {indexLabel} ▾
            </span>
          </div>
        </div>

        {/* Top-Right Play Action */}
        <div className="flex items-center gap-2">
          {onPlay && (
            <button
              type="button"
              onClick={() => onPlay(currentItem)}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-white/90 transition shadow-lg cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-black" /> Play
            </button>
          )}
        </div>
      </div>

      {/* CENTER STAGE: 3D CD DISC CASCADE */}
      <div className="relative z-20 w-full h-[360px] md:h-[440px] flex items-center justify-center my-auto overflow-visible">
        {items.map((item, index) => {
          // Circular offset calculation relative to current index
          let offset = index - currentIndex;
          if (loop && n > 2) {
            if (offset > n / 2) offset -= n;
            if (offset < -n / 2) offset += n;
          }

          // Visible range: 2 to the left, 2 to the right
          const isVisible = Math.abs(offset) <= 2;
          if (!isVisible) return null;

          const isCenter = offset === 0;

          // Cascade transformation calculation
          const spacing = typeof window !== "undefined" && window.innerWidth < 768 ? 160 : 250;
          const translateX = offset * spacing + dragOffset * 0.4;
          const translateY = Math.abs(offset) * 35;
          const rotationAngle = offset * 22 + (isCenter ? (discRotation % 360) : 0);
          const scale = isCenter ? 1.05 : Math.max(0.68, 1 - Math.abs(offset) * 0.18);
          const zIndex = 20 - Math.abs(offset) * 5;
          const opacity = Math.max(0.4, 1 - Math.abs(offset) * 0.25);

          return (
            <div
              key={index}
              onClick={() => {
                if (isCenter) {
                  onItemClick?.(item, index);
                  onPlay?.(item);
                } else {
                  goTo(index);
                }
              }}
              style={{
                transform: `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale}) rotate(${rotationAngle}deg)`,
                zIndex,
                opacity,
                transition: isDragging ? "none" : "transform 0.55s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.5s ease",
              }}
              className="absolute w-[280px] h-[280px] sm:w-[350px] sm:h-[350px] md:w-[420px] md:h-[420px] rounded-full cursor-pointer select-none group"
            >
              {/* CD DISC SURFACE */}
              <div className="relative w-full h-full rounded-full overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.18)] bg-neutral-900">
                {/* Smooth Continuous 360-Degree Disc Rotator */}
                <div className="absolute inset-0 rounded-full animate-[spin_20s_linear_infinite] origin-center">
                  {/* 1. Poster / Disc Face Artwork */}
                  <img
                    src={item.src}
                    alt={item.title}
                    draggable={false}
                    className="w-full h-full object-cover rounded-full pointer-events-none"
                  />

                  {/* 2. Concentric Vinyl Grooves Overlay */}
                  <div
                    className="absolute inset-0 rounded-full pointer-events-none"
                    style={{
                      background:
                        "repeating-radial-gradient(circle at center, transparent 0, transparent 3px, rgba(255,255,255,0.035) 4px, transparent 5px)",
                    }}
                  />

                  {/* 3. Holographic Rainbow CD Specular Sheen */}
                  <div
                    className="absolute inset-0 rounded-full pointer-events-none mix-blend-screen opacity-35"
                    style={{
                      background:
                        "conic-gradient(from 45deg at 50% 50%, rgba(255,255,255,0) 0deg, rgba(255,255,255,0.4) 45deg, rgba(255,100,100,0.2) 90deg, rgba(100,255,100,0.2) 135deg, rgba(100,150,255,0.3) 180deg, rgba(255,255,255,0.4) 225deg, rgba(255,255,255,0.36) 360deg)",
                    }}
                  />

                  {/* 4. Arched Curved Title & Metadata via SVG TextPath */}
                  <svg
                    viewBox="0 0 400 400"
                    className="absolute inset-0 w-full h-full pointer-events-none z-10"
                  >
                    <defs>
                      <path
                        id={`rim-top-${index}`}
                        d="M 60,200 A 140,140 0 0,1 340,200"
                        fill="none"
                      />
                      <path
                        id={`rim-side-${index}`}
                        d="M 70,250 A 135,135 0 0,1 110,85"
                        fill="none"
                      />
                    </defs>

                    {/* Arched Bold Title */}
                    <text
                      fill="#ffffff"
                      style={{
                        fontFamily: "'Oswald', 'Inter', sans-serif",
                        fontWeight: 800,
                        fontSize: "30px",
                        letterSpacing: "4px",
                        filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.85))",
                      }}
                    >
                      <textPath href={`#rim-top-${index}`} startOffset="50%" textAnchor="middle">
                        {item.title.toUpperCase()}
                      </textPath>
                    </text>

                    {/* Rim Metadata */}
                    <text
                      fill="rgba(255,255,255,0.75)"
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 600,
                        fontSize: "9px",
                        letterSpacing: "2.5px",
                        filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.9))",
                      }}
                    >
                      <textPath href={`#rim-side-${index}`}>
                        {`SIDE A · YEAR ${item.year || "2024"} · ${item.length || "45 MIN"}`}
                      </textPath>
                    </text>
                  </svg>
                </div>

                {/* 5. Authentic CD Center Hub & Glowing Triangle Play Button */}
                <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                  {/* Clear Clamping Plastic Zone */}
                  <div
                    className="w-[36%] h-[36%] rounded-full relative flex items-center justify-center border border-white/30 backdrop-blur-[2px]"
                    style={{
                      background:
                        "radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(200,200,200,0.3) 65%, rgba(160,160,160,0.5) 100%)",
                      boxShadow: "inset 0 0 10px rgba(0,0,0,0.5), 0 0 5px rgba(255,255,255,0.4)",
                    }}
                  >
                    {/* Metallic Silver Mirror Sputtering Ring */}
                    <div
                      className="w-[72%] h-[72%] rounded-full relative flex items-center justify-center border border-white/60 shadow-inner"
                      style={{
                        background:
                          "conic-gradient(from 0deg, #d1d5db 0deg, #f9fafb 45deg, #9ca3af 90deg, #e5e7eb 180deg, #9ca3af 270deg, #d1d5db 360deg)",
                      }}
                    >
                      {/* Inner Plastic Grooved Ring */}
                      <div className="w-[66%] h-[66%] rounded-full border border-black/30 flex items-center justify-center bg-black/10" />
                    </div>

                    {/* Glowing Triangle Play Button in Center */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        onItemClick?.(item, index);
                        onPlay?.(item);
                      }}
                      className="pointer-events-auto absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 md:w-14 md:h-14 rounded-full bg-red-600/95 hover:bg-red-500 border-2 border-white/90 shadow-[0_0_20px_rgba(229,9,20,0.8),inset_0_0_6px_rgba(255,255,255,0.4)] flex items-center justify-center cursor-pointer transition-transform duration-200 hover:scale-115 active:scale-95 z-30"
                      title={`Play ${item.title}`}
                    >
                      <Play className="w-5 h-5 fill-white text-white ml-0.5" />
                    </div>
                  </div>
                </div>

                {/* Outer Glass Rim Bevel */}
                <div className="absolute inset-0 rounded-full border-2 border-white/20 pointer-events-none" />
              </div>
            </div>
          );
        })}
      </div>

      {/* BOTTOM BAR: REVIEWS & CONTROLS */}
      <div className="relative z-30 flex flex-col sm:flex-row items-center justify-between gap-6 w-full pt-4">
        {/* Bottom-Left Hint */}
        <div className="hidden sm:block text-[11px] font-semibold tracking-widest uppercase text-white/50">
          {hint}
        </div>

        {/* Bottom-Center Reviews with Star Ratings */}
        <div className="flex items-center gap-8 text-center">
          {currentItem?.reviews?.length ? (
            currentItem.reviews.slice(0, 2).map((rev, i) => (
              <div key={i} className="flex flex-col items-center max-w-[190px]">
                <div className="flex items-center gap-0.5 text-amber-400 mb-1">
                  {Array.from({ length: rev.stars || 5 }).map((_, s) => (
                    <Star key={s} className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-[10px] font-bold tracking-widest uppercase opacity-70">
                  {rev.source}
                </span>
                <span className="text-[11px] font-medium italic text-white/90 line-clamp-1">
                  “{rev.quote}”
                </span>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-0.5 text-amber-400 mb-1">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="text-[10px] font-bold tracking-widest uppercase opacity-70">
                CRITICS CONSENSUS
              </span>
              <span className="text-[11px] font-medium italic text-white/90">
                “Essential viewing with unmatched craft”
              </span>
            </div>
          )}
        </div>

        {/* Bottom-Right Arrow Navigation Buttons & Counter */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={prev}
            aria-label="Previous record"
            className="flex items-center justify-center w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white transition active:scale-95 cursor-pointer backdrop-blur-sm"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-xs font-bold tracking-widest tabular-nums text-white/90">
            {pad(currentIndex + 1)} / {pad(n)}
          </span>

          <button
            type="button"
            onClick={next}
            aria-label="Next record"
            className="flex items-center justify-center w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white transition active:scale-95 cursor-pointer backdrop-blur-sm"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default DiscCascadeCarousel;
