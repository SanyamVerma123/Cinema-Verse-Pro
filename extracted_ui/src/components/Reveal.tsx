import { useEffect, useRef, useState, type ReactNode } from "react";

/** Fades and lifts its children into view the first time they scroll on screen. */
export function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || on) return;
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && (setOn(true), io.disconnect()),
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [on]);
  return (
    <div ref={ref} className={`reveal empty:hidden ${on ? "in" : ""} ${className}`}>
      {children}
    </div>
  );
}
