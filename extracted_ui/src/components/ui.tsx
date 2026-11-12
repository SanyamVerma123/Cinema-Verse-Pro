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
  bell: (
    <>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </>
  ),
  sliders: <path d="M4 7h10m4 0h2M4 17h2m4 0h10M14 4v6m-4 4v6" />,
  ext: <path d="M14 4h6v6m0-6-9 9M18 14v5H5V6h5" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </>
  ),
  trash: (
    <>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </>
  ),
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  download: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </>
  ),
  sparkles: (
    <>
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
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
      className={`inline-flex items-center gap-1.5 sm:gap-2.5 font-display text-sm sm:text-base md:text-xl lg:text-[22px] font-black tracking-tight select-none ${className}`}
    >
      <img
        src="/logo.svg"
        alt="CinemaVerse"
        className="size-6 sm:size-7 md:size-8 shrink-0 object-contain drop-shadow-md"
      />
      <span className="flex items-center font-display tracking-tight">
        <span className="text-[#ff334b] font-black drop-shadow-sm">CINEMA</span>
        <span className="text-white font-extrabold">VERSE</span>
        <span className="ml-1 sm:ml-1.5 rounded-md bg-linear-to-r from-purple-600 to-indigo-600 px-1 sm:px-1.5 py-0.5 text-[7px] sm:text-[9px] font-black uppercase tracking-wider text-white shadow-sm">
          PRO
        </span>
      </span>
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
