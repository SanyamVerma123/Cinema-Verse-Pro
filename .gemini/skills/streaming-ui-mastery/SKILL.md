---
name: streaming-ui-mastery
description: World-class UI/UX engineering, micro-interactions, and component architecture for universal streaming, media platforms, and entertainment web apps (smart TV, mobile, desktop) inspired by shadcn/ui and Apple TV+.
metadata:
  version: "1.0"
  framework: "shadcn/ui + Tailwind + Vanilla/Next.js"
---

# Streaming UI Mastery & Component Architecture Guide

This skill encapsulates the battle-tested design patterns, micro-interactions, and component standards required to build and maintain world-class, professional entertainment and streaming web applications (e.g., CinemaVerse Pro). It synthesizes design principles from **shadcn/ui**, **Apple TV+**, **Netflix**, and **Linear**.

---

## 1. Design Tokens & Visual Hierarchy

### Dark Mode & Obsidian Canvas
Never use washed-out `#121212` or pure flat `#000000` for main surfaces. Always use a deep, warm obsidian-slate palette with layered radial ambience:
- **Base Canvas:** `#080911` with fixed radial ambient gradients (`radial-gradient(ellipse at 50% -10%, rgba(229, 9, 20, 0.15) 0%, transparent 60%)`).
- **Surface Elevation 1 (Cards, Shelves):** `rgba(18, 22, 34, 0.75)` with `backdrop-filter: blur(18px) saturate(180%)`.
- **Surface Elevation 2 (Modals, Overlays):** `rgba(14, 17, 27, 0.96)` with `backdrop-filter: blur(32px)`.
- **Borders:** Subtle translucent strokes (`1px solid rgba(255, 255, 255, 0.08)` default, `rgba(255, 255, 255, 0.2)` on hover, and `rgba(229, 9, 20, 0.7)` when active).

### Typography Scale
- **Headings (Billboards, Modal Titles):** `font-family: 'Outfit', sans-serif; font-weight: 800; letter-spacing: -0.5px;` with subtle text shadow (`0 2px 14px rgba(0, 0, 0, 0.8)`).
- **Body & Metadata:** `font-family: 'Inter', sans-serif; font-weight: 400/500; font-size: 14px; line-height: 1.6; color: #d1d5db;`.
- **Micro-labels & Badges:** `font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px;`.

---

## 2. Component Design Standards (shadcn/ui Inspired)

### A. Search Bar & Live Autocomplete Dropdown
- **Container:** Rounded pill (`border-radius: 9999px`) with glass backdrop (`rgba(255, 255, 255, 0.07)`).
- **Focus Ring:** Dynamic red ambient ring (`box-shadow: 0 0 0 3px rgba(229, 9, 20, 0.25), 0 0 20px rgba(229, 9, 20, 0.2)`).
- **Autocomplete Architecture:**
  - Structure as a floating shadcn `Command` dialog.
  - Divide into distinct sections: **Movies & Series**, **Artists & Cast**, and **Category Chips**.
  - Highlight matched text tokens in high-contrast accent (`<span class="ac-hl">`).
  - Provide full keyboard traversal: <kbd>↑</kbd>, <kbd>↓</kbd>, <kbd>Enter</kbd>, and <kbd>Esc</kbd>.

### B. Action Buttons & Micro-Interactions
- **Primary Action (Play):** Pure white pill, bold black font, smooth scale `transform: translateY(-2px) scale(1.02)` and ambient drop shadow on hover.
- **Secondary Action (More Info):** Frosted glass pill (`background: rgba(255, 255, 255, 0.16); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.2)`).
- **Icon Actions (Watchlist, Share, Audio):** Circular glass buttons (`44px x 44px; border-radius: 50%`) with micro-rotation and scale feedback.
- **Active Press:** `transform: scale(0.96); transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);`.

### C. Cards, Shelves & Carousels
- **Card Sizing:** 16:9 for landscape showcases/trending feeds, 2:3 for standard poster browsing.
- **Hover Elevation:** `transform: translateY(-6px) scale(1.04);` accompanied by deep ambient shadow (`box-shadow: 0 16px 36px rgba(0, 0, 0, 0.8)`).
- **Slider Arrows:** Floating circular glass discs (`width: 48px; height: 48px; border-radius: 50%`) with centered arrows, backdrop blur, and smooth opacity transitions on row hover.
- **Rank Badges (Trending / Top 10):**
  - Trending: Gradient flame badge (`linear-gradient(135deg, #ef4444, #f59e0b)`) with gold fire glyph.
  - Top 10: Charcoal Netflix-style numerals layered partially behind posters for 3D depth.

### D. Details Modal & Dialogs
- **Geometry:** Max-width `840px`, centered, border-radius `22px`, zero horizontal overflow (`overflow-x: hidden !important;`).
- **Server Switching:** 10 distinct pill tabs with streaming speed badges (`Server 1: Instant 4K`, `Server 4: Multi-Audio`), active state illuminated in vibrant red gradient.
- **Cast Chips:** Interactive pills with 32px circular actor portraits.
- **Episodes Drawer:** 16:9 video thumbnails with duration chips and hover play overlays.

### E. Mobile Bottom Navigation Dock
- **Geometry:** Fixed bottom, curved top corners (`24px 24px 0 0`), safe-area bottom padding.
- **Backdrop:** `rgba(10, 13, 22, 0.92)` with `backdrop-filter: blur(28px) saturate(190%)`.
- **Active State:** Illuminated red pill backdrop with glowing icon shadow.
- **Auto-Hide:** Automatically hide with zero latency (`display: none !important;`) during video player or trailer playback.

---

## 3. Performance & Multi-Device Checklist

1. **Proxy All Third-Party Media:** Route all TMDb and Metahub images through `/api/tmdb-image/*` and `/api/metahub-image/*` to prevent ISP blocks and DNS timeouts.
2. **Zero Layout Shifts:** Provide aspect-ratio placeholders on posters (`aspect-ratio: 2/3`) and banners (`aspect-ratio: 16/9`) to guarantee zero cumulative layout shift (CLS).
3. **Smart TV 10-ft Experience:** Ensure every interactive button and card has a clear `:focus-visible` or `.dpad-focused` ring (`outline: 3px solid #e50914; outline-offset: 3px;`).
4. **Haptic & Visual Feedback:** Every button press must have tactile feedback (`transform: scale(0.96)`) to feel responsive even on slow mobile networks.
