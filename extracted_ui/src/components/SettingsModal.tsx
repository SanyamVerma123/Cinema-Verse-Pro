import { useEffect, useState } from "react";
import { STREAM_SERVERS } from "../lib/stream";
import {
  progressStore,
  remindersStore,
  requestNotificationPermission,
  settingsStore,
  toastStore,
  useStore,
} from "../lib/store";
import { Select, type Opt } from "./Select";
import { Icon, RoundBtn } from "./ui";

const SERVER_OPTIONS: Opt[] = STREAM_SERVERS.map((s) => ({
  value: s.id,
  label: s.name,
  hint: s.badge,
}));

const AUDIO_OPTIONS: Opt[] = [
  { value: "en", label: "🌐 English", hint: "Original" },
  { value: "hi", label: "🇮🇳 Hindi Dubbed", hint: "Multi-Audio" },
  { value: "ja", label: "🇯🇵 Japanese Audio", hint: "Original/Dub" },
  { value: "ta", label: "🇮🇳 Tamil Dubbed", hint: "South India" },
  { value: "te", label: "🇮🇳 Telugu Dubbed", hint: "South India" },
  { value: "es", label: "🇪🇸 Spanish Dubbed", hint: "Español" },
  { value: "fr", label: "🇫🇷 French Dubbed", hint: "Français" },
  { value: "de", label: "🇩🇪 German Dubbed", hint: "Deutsch" },
];

export function SettingsModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const settings = useStore(settingsStore);
  const [tab, setTab] = useState<"streaming" | "notifications" | "privacy" | "apps">("streaming");
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      return Notification.permission;
    }
    return "denied";
  });

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

  const updateSetting = <K extends keyof typeof settings>(key: K, val: (typeof settings)[K]) => {
    settingsStore.set({ ...settings, [key]: val });
  };

  const handleClearHistory = () => {
    if (confirm("Are you sure you want to clear your entire watch history and playback progress?")) {
      progressStore.set({});
      try {
        localStorage.removeItem("frame:progress");
      } catch {}
      toastStore.set({ id: Date.now(), msg: "Watch history and playback progress cleared!" });
    }
  };

  const handleClearReminders = () => {
    if (confirm("Clear all upcoming movie reminders?")) {
      remindersStore.set([]);
      try {
        localStorage.removeItem("cv:reminders");
      } catch {}
      toastStore.set({ id: Date.now(), msg: "All release reminders cleared." });
    }
  };

  const handleDisguiseMode = () => {
    window.location.href = "/";
  };

  const handleEnablePush = async () => {
    const res = await requestNotificationPermission();
    setNotifPerm(res);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 animate-[fade_.25s_both]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Profile and Settings"
        onClick={(e) => e.stopPropagation()}
        className="no-scrollbar relative flex size-full max-h-[640px] max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/12 bg-[#121319] shadow-2xl shadow-black animate-[pop_.3s_cubic-bezier(.16,1,.3,1)_both]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-[#161722]/80 px-6 py-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-full bg-linear-to-br from-red-600 via-purple-600 to-indigo-600 text-sm font-black text-white ring-2 ring-white/20 shadow-md shadow-purple-600/30">
              CV
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-black text-white">CinemaVerse Profile</h2>
                <span className="rounded-md bg-linear-to-r from-purple-600 to-indigo-600 px-1.5 py-0.5 text-[9px] font-black uppercase text-white shadow-xs">
                  VIP 4K
                </span>
              </div>
              <p className="text-xs text-white/50">Personalize streaming, audio, and device notifications</p>
            </div>
          </div>
          <RoundBtn icon="close" label="Close" onClick={onClose} size={36} />
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 bg-white/[0.02] px-6">
          {(
            [
              { id: "streaming", label: "Streaming & Audio" },
              { id: "notifications", label: "Mobile Notifications" },
              { id: "privacy", label: "Data & Privacy" },
              { id: "apps", label: "Apps & Smart TV" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative px-4 py-3 text-xs font-bold transition ${
                tab === t.id ? "text-accent" : "text-white/60 hover:text-white"
              }`}
            >
              {t.label}
              {tab === t.id && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-accent shadow-[0_0_8px_rgba(255,51,75,0.8)]" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Body */}
        <div className="no-scrollbar flex-1 overflow-y-auto p-6 space-y-6">
          {tab === "streaming" && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-2">
                  Preferred Default Streaming Server
                </label>
                <p className="text-xs text-white/50 mb-3">
                  Choose which of the 10 VIP servers loads by default when you play any title.
                </p>
                <Select
                  value={settings.defaultServer}
                  onChange={(v) => updateSetting("defaultServer", v)}
                  options={SERVER_OPTIONS}
                  className="w-full text-xs font-semibold bg-[#171824]"
                />
              </div>

              <div className="pt-4 border-t border-white/8">
                <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-2">
                  Preferred Audio &amp; Dubbing Track
                </label>
                <p className="text-xs text-white/50 mb-3">
                  Default language for international titles and regional anime/series.
                </p>
                <Select
                  value={settings.defaultAudio}
                  onChange={(v) => updateSetting("defaultAudio", v)}
                  options={AUDIO_OPTIONS}
                  className="w-full text-xs font-semibold bg-[#171824]"
                />
              </div>

              <div className="pt-4 border-t border-white/8 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">Autoplay Next Episode</h4>
                  <p className="text-xs text-white/50">Automatically queue and load next TV episode</p>
                </div>
                <button
                  type="button"
                  onClick={() => updateSetting("autoplayNext", !settings.autoplayNext)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    settings.autoplayNext ? "bg-accent" : "bg-white/20"
                  }`}
                >
                  <span
                    className={`block size-4 rounded-full bg-white transition-transform ${
                      settings.autoplayNext ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {tab === "notifications" && (
            <div className="space-y-5">
              <div className="rounded-xl border border-white/10 bg-[#161724] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white">Mobile Push Notifications</h4>
                    <p className="text-xs text-white/50 mt-0.5">
                      Receive alerts even when your phone or browser tab is completely closed.
                    </p>
                  </div>
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                      notifPerm === "granted"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-amber/20 text-amber border border-amber/30"
                    }`}
                  >
                    {notifPerm === "granted" ? "Enabled" : "Disabled"}
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  {notifPerm !== "granted" ? (
                    <button
                      onClick={handleEnablePush}
                      className="btn-shine relative flex items-center gap-2 rounded-lg bg-linear-to-r from-red-600 to-accent px-4 py-2 text-xs font-bold text-white shadow-md hover:brightness-110 active:scale-95"
                    >
                      <Icon name="bell" size={14} />
                      Enable Mobile Push Notifications
                    </button>
                  ) : (
                    <p className="text-xs text-emerald-400 flex items-center gap-1.5 font-semibold">
                      <Icon name="check" size={14} /> System notifications active! You will receive premiere alerts on your device lock screen.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === "privacy" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">Clear Playback History</h4>
                  <p className="text-xs text-white/50">Erase all resume points and &quot;Continue Watching&quot; entries</p>
                </div>
                <button
                  onClick={handleClearHistory}
                  className="rounded-lg border border-red-500/40 bg-red-600/20 px-3 py-1.5 text-xs font-bold text-red-200 hover:bg-red-600 hover:text-white transition active:scale-95"
                >
                  Clear History
                </button>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">Clear Release Reminders</h4>
                  <p className="text-xs text-white/50">Remove all scheduled upcoming movie alerts</p>
                </div>
                <button
                  onClick={handleClearReminders}
                  className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/20 transition active:scale-95"
                >
                  Clear Reminders
                </button>
              </div>

              <div className="rounded-xl border border-amber/30 bg-amber/10 p-4 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">Instant Camouflage Mode</h4>
                  <p className="text-xs text-white/60">Immediately disguise this window as the CinePulse medical cover</p>
                </div>
                <button
                  onClick={handleDisguiseMode}
                  className="rounded-lg bg-amber px-3 py-1.5 text-xs font-bold text-black hover:bg-amber/90 transition active:scale-95"
                >
                  Activate Disguise
                </button>
              </div>
            </div>
          )}

          {tab === "apps" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#171822] p-4">
                <div>
                  <h4 className="text-sm font-bold text-white">CinemaVerse Android Pro APK</h4>
                  <p className="text-xs text-white/50">Native Android app with hardware acceleration &amp; background audio</p>
                </div>
                <a
                  href="/CinemaVerse-Pro.apk"
                  download="CinemaVerse-Pro.apk"
                  className="btn-shine relative flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-bold text-white shadow-md hover:brightness-110 active:scale-95"
                >
                  <Icon name="download" size={14} /> Download APK
                </a>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#171822] p-4">
                <div>
                  <h4 className="text-sm font-bold text-white">CinemaVerse Smart TV Leanback</h4>
                  <p className="text-xs text-white/50">Full remote-control (D-Pad) optimized 10-foot UI for Android TV &amp; Fire TV</p>
                </div>
                <a
                  href="/tv.html"
                  className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/20 active:scale-95 transition"
                >
                  <Icon name="tv" size={14} /> Launch TV Mode
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/10 bg-[#161722]/80 px-6 py-3.5 backdrop-blur-md">
          <span className="text-[11px] text-white/40">CinemaVerse Pro v4.2 • 10 VIP Streaming Servers Active</span>
          <button
            onClick={onClose}
            className="rounded-lg bg-white/15 px-4 py-1.5 text-xs font-bold text-white hover:bg-white/25 active:scale-95 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
