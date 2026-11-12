import { useEffect, useState } from "react";
import { img, titleOf, useTmdb, type Media } from "../lib/tmdb";
import {
  daysUntilRelease,
  isReminded,
  releaseDateLabel,
  remindersStore,
  requestNotificationPermission,
  toggleReminder,
  useStore,
} from "../lib/store";
import { Icon, RoundBtn } from "./ui";

export function NotificationsDrawer({
  isOpen,
  onClose,
  onOpenMedia,
}: {
  isOpen: boolean;
  onClose: () => void;
  onOpenMedia: (m: Media) => void;
}) {
  const reminders = useStore(remindersStore);
  const [perm, setPerm] = useState<NotificationPermission>(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      return Notification.permission;
    }
    return "denied";
  });

  // Upcoming discovery from TMDb proxy
  const { data: upcomingData, loading: upcomingLoading } = useTmdb<any>("/movie/upcoming");
  const upcomingTitles: Media[] = upcomingData?.results?.slice(0, 10) ?? [];

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, onClose]);

  const handleRequestPerm = async () => {
    const res = await requestNotificationPermission();
    setPerm(res);
  };

  const handleTestNotification = () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "granted") {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification("CinemaVerse Alert Test 🎬", {
            body: "Push notification system is active! You'll receive alerts even when your phone screen is closed.",
            icon: "/icon-192.png",
            badge: "/icon-192.png",
          });
        });
      } else {
        new Notification("CinemaVerse Alert Test 🎬", {
          body: "Push notification system is active! You'll receive alerts even when your phone screen is closed.",
          icon: "/icon-192.png",
        });
      }
    } else {
      handleRequestPerm();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex justify-end bg-black/75 backdrop-blur-sm animate-[fade_.25s_both]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Release Alerts and Notifications"
        onClick={(e) => e.stopPropagation()}
        className="no-scrollbar relative flex size-full max-w-md flex-col bg-[#111218] border-l border-white/10 shadow-2xl shadow-black animate-[slideInRight_.35s_cubic-bezier(.16,1,.3,1)_both]"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-white/8 bg-[#161722]/80 px-5 py-4 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-accent/20 text-accent border border-accent/30">
              <Icon name="bell" size={18} />
            </span>
            <div>
              <h2 className="font-display text-base font-extrabold text-white">
                Release Alerts
              </h2>
              <p className="text-[11px] text-white/50">
                {reminders.length} movie{reminders.length === 1 ? "" : "s"} scheduled for release
              </p>
            </div>
          </div>
          <RoundBtn icon="close" label="Close" onClick={onClose} size={36} />
        </div>

        {/* Content Body */}
        <div className="no-scrollbar flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
          {/* Web Push / Mobile Background Notification Card */}
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-linear-to-br from-white/[0.05] via-[#171824] to-[#12131c] p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-red-600/20 text-red-400 border border-red-500/30">
                <Icon name="bell" size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-white">
                    Mobile &amp; Closed-Tab Alerts
                  </h3>
                  {perm === "granted" ? (
                    <span className="rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400 border border-emerald-500/30">
                      Active
                    </span>
                  ) : (
                    <span className="rounded-md bg-amber/20 px-1.5 py-0.5 text-[9px] font-bold text-amber border border-amber/30">
                      Permission Needed
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-white/60">
                  {perm === "granted"
                    ? "Notifications enabled! You'll receive system alerts on your lock screen even when CinemaVerse is closed."
                    : "Receive push notifications directly on your phone's lock screen the moment your movie premieres, even when the browser or app is closed."}
                </p>

                <div className="mt-3 flex items-center gap-2">
                  {perm !== "granted" ? (
                    <button
                      onClick={handleRequestPerm}
                      className="btn-shine relative flex items-center gap-1.5 rounded-lg bg-linear-to-r from-red-600 to-accent px-3 py-1.5 text-xs font-bold text-white shadow-md transition hover:brightness-110 active:scale-95"
                    >
                      <Icon name="bell" size={13} />
                      Enable Mobile Notifications
                    </button>
                  ) : (
                    <button
                      onClick={handleTestNotification}
                      className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 hover:bg-white/20 active:scale-95 transition"
                    >
                      Send Test Alert
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* User's Active Reminders */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white/70">
                Your Movie Reminders ({reminders.length})
              </h3>
            </div>

            {reminders.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-center">
                <span className="mx-auto grid size-10 place-items-center rounded-full bg-white/5 text-white/30">
                  <Icon name="bell" size={20} />
                </span>
                <p className="mt-2 text-xs font-semibold text-white/70">No reminders scheduled</p>
                <p className="mt-1 text-[11px] text-white/40">
                  Browse upcoming movies below and tap &quot;Notify Me&quot; to get notified on release day!
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {reminders.map(({ media: m, releaseDate }) => {
                  const days = daysUntilRelease(m);
                  return (
                    <div
                      key={m.id}
                      className="group flex items-center gap-3 rounded-xl border border-white/10 bg-[#171822] p-2.5 transition hover:border-white/20 hover:bg-[#1d1f2d]"
                    >
                      {/* Poster */}
                      <button
                        onClick={() => {
                          onOpenMedia(m);
                          onClose();
                        }}
                        className="relative aspect-[2/3] w-14 shrink-0 overflow-hidden rounded-lg bg-panel"
                      >
                        <img
                          src={img(m.poster_path, "w185")}
                          alt={titleOf(m)}
                          className="size-full object-cover transition group-hover:scale-105"
                        />
                      </button>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <button
                          onClick={() => {
                            onOpenMedia(m);
                            onClose();
                          }}
                          className="truncate text-left text-xs font-bold text-white group-hover:text-accent"
                        >
                          {titleOf(m)}
                        </button>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                          <span className="rounded bg-accent/20 px-1.5 py-0.5 font-bold text-accent">
                            {releaseDateLabel(m) || releaseDate}
                          </span>
                          {days !== null && (
                            <span className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 text-white/70">
                              {days === 0 ? "Releases Today!" : `In ${days} days`}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => toggleReminder(m)}
                        title="Remove Reminder"
                        aria-label="Remove Reminder"
                        className="grid size-8 shrink-0 place-items-center rounded-lg text-white/40 hover:bg-red-500/20 hover:text-red-400 active:scale-95 transition"
                      >
                        <Icon name="close" size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Upcoming Blockbusters Discovery */}
          {upcomingTitles.length > 0 && (
            <div className="pt-2 border-t border-white/8">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-white/70">
                Upcoming Blockbusters
              </h3>
              <div className="space-y-2">
                {upcomingTitles.map((m) => {
                  const reminded = isReminded(reminders, m);
                  const days = daysUntilRelease(m);
                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-2 hover:bg-white/[0.06] transition"
                    >
                      <button
                        onClick={() => {
                          onOpenMedia(m);
                          onClose();
                        }}
                        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                      >
                        <img
                          src={img(m.poster_path, "w185")}
                          alt=""
                          className="aspect-[2/3] w-10 shrink-0 rounded-md object-cover bg-panel"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-white">
                            {titleOf(m)}
                          </p>
                          <p className="text-[10px] text-white/50">
                            {releaseDateLabel(m)} {days !== null ? `(In ${days}d)` : ""}
                          </p>
                        </div>
                      </button>

                      <button
                        onClick={() => toggleReminder(m)}
                        className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition active:scale-95 ${
                          reminded
                            ? "bg-accent/20 text-accent border border-accent/40"
                            : "bg-white/10 text-white hover:bg-white/20 border border-white/15"
                        }`}
                      >
                        <Icon name={reminded ? "check" : "bell"} size={12} />
                        {reminded ? "Set" : "Remind"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
