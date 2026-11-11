import type { ReactNode } from "react";

const P: Record<string, ReactNode> = {
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="m5 12 4 4L19 6" />,
  play: <path d="m8 5 11 7-11 7Z" fill="currentColor" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6m0-10v.5" />
    </>
  ),
  left: <path d="m15 5-7 7 7 7" />,
  right: <path d="m9 5 7 7-7 7" />,
  down: <path d="m5 9 7 7 7-7" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  volume: (
    <>
      <path d="M4 9v6h4l5 4V5L8 9Z" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
    </>
  ),
  mute: (
    <>
      <path d="M4 9v6h4l5 4V5L8 9Z" />
      <path d="m17 9 5 6m0-6-5 6" />
    </>
  ),
  star: (
    <path
      d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9Z"
      fill="currentColor"
    />
  ),
  home: <path d="M4 11 12 4l8 7v9h-5v-6H9v6H4Z" />,
  film: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 4v16M17 4v16M3 9h4m10 0h4M3 15h4m10 0h4" />
    </>
  ),
  tv: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="m8 21 4-3 4 3M8 3l4 3 4-3" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5Z" />
    </>
  ),
  list: <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />,
  bell: <path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4Zm4 4h4" />,
  sliders: <path d="M4 7h10m4 0h2M4 17h2m4 0h10M14 4v6m-4 4v6" />,
  ext: <path d="M14 4h6v6m0-6-9 9M18 14v5H5V6h5" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
};
export type IconName = keyof typeof P;
export function Icon({
  name,
  size = 20,
  className = "",
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {P[name]}
    </svg>
  );
}

export function Brand({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 font-display text-[26px] font-extrabold tracking-tighter ${className}`}
    >
      <span className="relative grid size-7 place-items-center rounded-lg bg-linear-to-br from-[#e50914] to-[#ff3b30] shadow-md shadow-red-600/30">
        <Icon name="play" size={14} className="text-white" />
      </span>
      <span>Cinema<span className="text-[#e50914]">Verse</span></span>
    </span>
  );
}

export function Chip({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border border-white/20 px-1.5 py-px text-[10px] font-semibold tracking-wide text-white/80 ${className}`}
    >
      {children}
    </span>
  );
}

export const RoundBtn = ({
  icon,
  label,
  onClick,
  active,
  size = 36,
  solid,
}: {
  icon: IconName;
  label: string;
  onClick: () => void;
  active?: boolean;
  size?: number;
  solid?: boolean;
}) => (
  <button
    aria-label={label}
    title={label}
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    style={{ width: size, height: size }}
    className={`grid shrink-0 place-items-center rounded-full border transition ${solid ? "border-white bg-white text-black hover:bg-white/80" : "border-white/40 bg-black/50 text-white backdrop-blur hover:border-white hover:bg-white/15"} ${active ? "!border-accent !text-accent" : ""}`}
  >
    <Icon name={icon} size={size * 0.5} />
  </button>
);
