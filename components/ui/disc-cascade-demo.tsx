"use client";

import DiscCascadeCarousel, { type DiscCascadeItem } from "@/components/ui/disc-cascade-carousel";

const u = (id: string) =>
  "https://images.unsplash.com/photo-" + id + "?q=80&w=600&h=600&auto=format&fit=crop&ixlib=rb-4.1.0";

// Photos as disc labels, a dark stage, looping autoplay and real fonts.
const records: DiscCascadeItem[] = [
  {
    title: "Cable Car",
    src: u("1774565784366-72db806a40f9"),
    credits: [
      { label: "Side A", value: "Ascent" },
      { label: "Year", value: "2018" },
      { label: "Length", value: "41 min" },
    ],
    reviews: [
      { source: "Low Fidelity", quote: "Climbs and never stops" },
      { source: "The Wax", quote: "A record for windows", stars: 4 },
    ],
  },
  {
    title: "Pale House",
    src: u("1776031312164-f22c0edbdfb9"),
    labelStyle: "block",
    credits: [
      { label: "Side A", value: "Rooms" },
      { label: "Year", value: "2019" },
      { label: "Length", value: "38 min" },
    ],
    reviews: [
      { source: "Groove Notes", quote: "Sunlit and spare" },
      { source: "Low Fidelity", quote: "Every song a doorway" },
    ],
  },
  {
    title: "Cherry Season",
    src: u("1777763517503-05d74f2e0008"),
    credits: [
      { label: "Side A", value: "Blossom" },
      { label: "Year", value: "2020" },
      { label: "Length", value: "44 min" },
    ],
    reviews: [
      { source: "The Wax", quote: "Soft as April" },
      { source: "Groove Notes", quote: "Pink noise, perfected" },
    ],
  },
  {
    title: "Bottle Shop",
    src: u("1774651458632-17df84bad45e"),
    credits: [
      { label: "Side A", value: "Last Call" },
      { label: "Year", value: "2021" },
      { label: "Length", value: "36 min" },
    ],
    reviews: [
      { source: "Low Fidelity", quote: "Fizzes from the first bar" },
      { source: "The Wax", quote: "Bright, sweet, gone", stars: 4 },
    ],
  },
  {
    title: "Tree-Lined Road",
    src: u("1778360508753-dcb2afbeadc2"),
    labelStyle: "block",
    credits: [
      { label: "Side A", value: "Mile One" },
      { label: "Year", value: "2022" },
      { label: "Length", value: "52 min" },
    ],
    reviews: [
      { source: "Groove Notes", quote: "Made for the long way home" },
      { source: "Low Fidelity", quote: "Shade and motion" },
    ],
  },
  {
    title: "Window Seat",
    src: u("1777221895589-2f81579e0dca"),
    credits: [
      { label: "Side A", value: "7A" },
      { label: "Year", value: "2023" },
      { label: "Length", value: "40 min" },
    ],
    reviews: [
      { source: "The Wax", quote: "The view does the talking" },
      { source: "Groove Notes", quote: "Gentle velocity" },
    ],
  },
  {
    title: "Low Tide",
    src: u("1777221895551-844a3c1243b3"),
    credits: [
      { label: "Side A", value: "Gulls" },
      { label: "Year", value: "2024" },
      { label: "Length", value: "47 min" },
    ],
    reviews: [
      { source: "Low Fidelity", quote: "Salt air on tape" },
      { source: "The Wax", quote: "Wide open, wind-blown" },
    ],
  },
];

export default function Demo() {
  return (
    <div className="w-full">
      <DiscCascadeCarousel
        items={records}
        brand="side/b"
        nav={[{ label: "Records" }, { label: "Sessions" }]}
        indexLabel="Catalogue"
        defaultIndex={1}
        loop
        autoplay={3600}
        background="radial-gradient(120% 90% at 50% 40%, #1d1d21, #0b0b0d)"
        color="#ecebe7"
        fontHref="https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Inter:wght@400;600;800&family=Oswald:wght@600;700&display=swap"
        hint="Drag · ← →"
        ariaLabel="Record catalogue"
      />
    </div>
  );
}
