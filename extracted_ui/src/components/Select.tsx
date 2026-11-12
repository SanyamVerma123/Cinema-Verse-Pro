import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Icon } from "./ui";

export type Opt = { value: string; label: string; hint?: string };
type Pos = { left: number; minWidth: number; top?: number; bottom?: number; maxH: number };

/** Fully custom listbox: glass popover, animated items, keyboard + typeahead, auto-flips, rendered in a portal. */
export function Select({
  value,
  onChange,
  options,
  label,
  ariaLabel,
  size = "md",
  icon,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  options: Opt[];
  label?: string;
  ariaLabel?: string;
  size?: "sm" | "md";
  icon?: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [act, setAct] = useState(0);
  const [pos, setPos] = useState<Pos | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const buffer = useRef({ s: "", t: 0 });
  const uid = useId();
  const sel = options.find((o) => o.value === value) ?? options[0];

  const openMenu = () => {
    const r = btn.current!.getBoundingClientRect();
    const below = window.innerHeight - r.bottom;
    const up = below < 280 && r.top > below;
    setPos({
      left: Math.max(12, Math.min(r.left, window.innerWidth - Math.max(r.width, 220) - 12)),
      minWidth: Math.max(r.width, 180),
      maxH: Math.min(340, (up ? r.top : below) - 20),
      ...(up ? { bottom: window.innerHeight - r.top + 8 } : { top: r.bottom + 8 }),
    });
    setAct(
      Math.max(
        0,
        options.findIndex((o) => o.value === value),
      ),
    );
    setOpen(true);
  };
  const close = useCallback((refocus = false) => {
    setOpen(false);
    if (refocus) btn.current?.focus();
  }, []);
  const pick = (i: number) => {
    onChange(options[i].value);
    close(true);
  };

  useLayoutEffect(() => {
    if (open) menu.current?.focus({ preventScroll: true });
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menu.current?.contains(t) && !btn.current?.contains(t)) close();
    };
    const scroll = (e: Event) => {
      if (!menu.current?.contains(e.target as Node)) close();
    };
    const resize = () => close();
    document.addEventListener("mousedown", down);
    window.addEventListener("scroll", scroll, true);
    window.addEventListener("resize", resize);
    return () => {
      document.removeEventListener("mousedown", down);
      window.removeEventListener("scroll", scroll, true);
      window.removeEventListener("resize", resize);
    };
  }, [open, close]);
  useEffect(() => {
    if (open) document.getElementById(`${uid}-${act}`)?.scrollIntoView({ block: "nearest" });
  }, [act, open, uid]);

  const onMenuKey = (e: React.KeyboardEvent) => {
    const n = options.length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAct((a) => (a + 1) % n);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAct((a) => (a - 1 + n) % n);
    } else if (e.key === "Home") {
      e.preventDefault();
      setAct(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setAct(n - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pick(act);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close(true);
    } else if (e.key === "Tab") close();
    else if (e.key.length === 1) {
      const b = buffer.current;
      b.s = Date.now() - b.t > 700 ? e.key.toLowerCase() : b.s + e.key.toLowerCase();
      b.t = Date.now();
      const i = options.findIndex((o) => o.label.toLowerCase().startsWith(b.s));
      if (i >= 0) setAct(i);
    }
    e.stopPropagation();
  };

  return (
    <>
      <button
        ref={btn}
        type="button"
        aria-label={ariaLabel ?? label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? uid : undefined}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            e.preventDefault();
            openMenu();
          }
        }}
        className={`group/sel relative flex items-center gap-2.5 rounded-xl border bg-white/[.04] text-left backdrop-blur transition duration-200 hover:border-white/30 hover:bg-white/[.07] ${size === "sm" ? "h-9 px-3 text-xs" : "h-11 px-4 text-sm"} ${open ? "border-accent bg-white/[.08] shadow-[0_0_0_4px_rgba(139,108,255,.18)]" : "border-white/12"} ${className}`}
      >
        {icon}
        {label && (
          <span className="text-[10px] font-semibold uppercase tracking-[.14em] text-white/40">
            {label}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate font-medium">{sel?.label}</span>
        <Icon
          name="down"
          size={size === "sm" ? 14 : 16}
          className={`shrink-0 text-white/50 transition-transform duration-300 group-hover/sel:text-white ${open ? "rotate-180 text-accent" : ""}`}
        />
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={menu}
            id={uid}
            role="listbox"
            tabIndex={-1}
            aria-label={ariaLabel ?? label}
            aria-activedescendant={`${uid}-${act}`}
            onKeyDown={onMenuKey}
            style={{
              left: pos.left,
              top: pos.top,
              bottom: pos.bottom,
              minWidth: pos.minWidth,
              maxHeight: pos.maxH,
            }}
            className={`no-scrollbar fixed z-[9999] w-max max-w-[min(92vw,360px)] overflow-y-auto rounded-2xl border border-white/12 bg-[#14141b]/95 p-1.5 shadow-[0_30px_80px_-10px_rgba(0,0,0,.9),inset_0_1px_0_rgba(255,255,255,.06)] outline-none backdrop-blur-2xl animate-[pop_.22s_cubic-bezier(.16,1,.3,1)_both] ${pos.bottom !== undefined ? "origin-bottom" : "origin-top"}`}
          >
            {options.map((o, i) => {
              const on = o.value === value;
              return (
                <div
                  key={o.value}
                  id={`${uid}-${i}`}
                  role="option"
                  aria-selected={on}
                  onMouseMove={() => setAct(i)}
                  onClick={() => pick(i)}
                  style={{ animationDelay: `${Math.min(i, 10) * 18}ms` }}
                  className={`animate-[itemIn_.3s_cubic-bezier(.2,.8,.2,1)_backwards] flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${i === act ? "bg-white/[.09]" : ""} ${on ? "font-semibold text-white" : "text-white/70"}`}
                >
                  <span className="min-w-0 flex-1 truncate">
                    {o.label}
                    {o.hint && (
                      <i className="ml-2 text-xs font-normal not-italic text-white/35">{o.hint}</i>
                    )}
                  </span>
                  {on && (
                    <Icon
                      name="check"
                      size={16}
                      className="shrink-0 text-accent animate-[iconpop_.35s_both]"
                    />
                  )}
                </div>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}

/** Tabs with a gliding indicator. variant "pill" = segmented control, "line" = underline tabs. */
export function SlideTabs<T extends string>({
  items,
  value,
  onChange,
  variant = "pill",
  className = "",
  label,
  nav = false,
}: {
  items: { id: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  variant?: "pill" | "line";
  className?: string;
  label?: string;
  /** Render as navigation links (aria-current) instead of an ARIA tablist. */
  nav?: boolean;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [r, setR] = useState({ l: 0, w: 0, ready: false });
  const measure = useCallback(() => {
    const el = wrap.current?.querySelector<HTMLElement>('[data-active="true"]');
    if (el) setR({ l: el.offsetLeft, w: el.offsetWidth, ready: true });
    else setR((x) => ({ ...x, ready: false }));
  }, []);
  useLayoutEffect(measure, [value, items.length, measure]);
  useEffect(() => {
    const ro = new ResizeObserver(measure);
    if (wrap.current) ro.observe(wrap.current);
    return () => ro.disconnect();
  }, [measure]);
  const line = variant === "line";
  return (
    <div
      ref={wrap}
      role={nav ? undefined : "tablist"}
      aria-label={nav ? undefined : label}
      className={`relative flex ${line ? "gap-1" : "rounded-xl border border-white/12 bg-white/[.04] p-1 backdrop-blur"} ${className}`}
    >
      <span
        aria-hidden="true"
        style={{ left: r.l, width: r.w, opacity: r.ready ? 1 : 0 }}
        className={`pointer-events-none absolute transition-[left,width] duration-[450ms] ease-[cubic-bezier(.16,1,.3,1)] ${line ? "bottom-0 h-0.5 rounded bg-linear-to-r from-accent to-[#ff6a88]" : "bottom-1 top-1 rounded-lg bg-white shadow-lg shadow-black/40"}`}
      />
      {items.map((t) => (
        <button
          key={t.id}
          role={nav ? undefined : "tab"}
          aria-selected={nav ? undefined : t.id === value}
          aria-current={nav && t.id === value ? "page" : undefined}
          data-active={t.id === value}
          onClick={() => onChange(t.id)}
          className={`relative z-10 shrink-0 whitespace-nowrap transition-colors duration-300 ${line ? "px-4 py-3.5 text-sm font-semibold" : "rounded-lg px-4 py-1.5 text-sm font-semibold"} ${t.id === value ? (line ? "text-white" : "text-black") : "text-white/55 hover:text-white"}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
