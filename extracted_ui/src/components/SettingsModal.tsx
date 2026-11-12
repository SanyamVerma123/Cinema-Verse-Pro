import { useEffect, useState } from "react";
import { STREAM_SERVERS } from "../lib/stream";
import {
  progressStore,
  remindersStore,
  requestNotificationPermission,
  settingsStore,
  toastStore,
  useStore,
  type Progress,
} from "../lib/store";
import { Select, type Opt } from "./Select";
import { Icon, RoundBtn } from "./ui";
import {
  detectDeviceName,
  fetchPublicIp,
  getStoredTrustedDevice,
  saveTrustedDevice,
  revokeTrustedDevice,
  syncProfileToSupabase,
  fetchProfileFromSupabase,
  type TrustedDeviceInfo,
} from "../lib/supabaseSync";
import { type Media, titleOf } from "../lib/tmdb";

const SERVER_OPTIONS: Opt[] = STREAM_SERVERS.map((s) => ({
  value: s.id,
  label: s.name,
  hint: s.badge,
}));

const AUDIO_OPTIONS: Opt[] = [
  { value: "en", label: "🌐 English", hint: "Original / Sub" },
  { value: "hi", label: "🇮🇳 Hindi Dubbed", hint: "Bollywood / Multi-Audio" },
  { value: "ja", label: "🇯🇵 Japanese Audio", hint: "Original Anime" },
  { value: "ta", label: "🇮🇳 Tamil Dubbed", hint: "South India" },
  { value: "te", label: "🇮🇳 Telugu Dubbed", hint: "South India" },
  { value: "es", label: "🇪🇸 Spanish Dubbed", hint: "Español" },
  { value: "fr", label: "🇫🇷 French Dubbed", hint: "Français" },
  { value: "de", label: "🇩🇪 German Dubbed", hint: "Deutsch" },
];

const PRESET_AVATARS = [
  {
    id: "samurai",
    label: "Cyber Samurai",
    url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80",
  },
  {
    id: "detective",
    label: "Neo Noir",
    url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80",
  },
  {
    id: "anime",
    label: "Anime Star",
    url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&h=256&q=80",
  },
  {
    id: "director",
    label: "Cinema Director",
    url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=256&h=256&q=80",
  },
  {
    id: "astronaut",
    label: "Space Odyssey",
    url: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=256&h=256&q=80",
  },
  {
    id: "neon",
    label: "Cyberpunk",
    url: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=256&h=256&q=80",
  },
];

type SettingsTab =
  | "profile"
  | "device"
  | "continue"
  | "streaming"
  | "notifications"
  | "apps"
  | "privacy";

export function SettingsModal({
  isOpen,
  onClose,
  onOpenMedia,
  onPlay,
}: {
  isOpen: boolean;
  onClose: () => void;
  onOpenMedia?: (media: Media) => void;
  onPlay?: (media: Media, o?: { season?: number; episode?: number; label?: string }) => void;
}) {
  const settings = useStore(settingsStore);
  const progressMap = useStore(progressStore);
  const reminders = useStore(remindersStore);

  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      return Notification.permission;
    }
    return "denied";
  });

  // Device & IP state
  const [detectedDevName, setDetectedDevName] = useState("");
  const [customDevName, setCustomDevName] = useState("");
  const [publicIp, setPublicIp] = useState("Detecting IP...");
  const [trustedInfo, setTrustedInfo] = useState<TrustedDeviceInfo | null>(null);
  const [isSavingDevice, setIsSavingDevice] = useState(false);

  // Cloud sync state
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<"idle" | "synced" | "error">("idle");
  const [cloudSyncMsg, setCloudSyncMsg] = useState("");

  // Avatar URL custom field
  const [customAvatarInput, setCustomAvatarInput] = useState("");
  const [showCustomAvatarInput, setShowCustomAvatarInput] = useState(false);

  // Load device info and IP on mount
  useEffect(() => {
    if (!isOpen) return;

    const dev = detectDeviceName();
    setDetectedDevName(dev);

    const storedDev = getStoredTrustedDevice();
    setTrustedInfo(storedDev);
    setCustomDevName(storedDev?.deviceName || settings.deviceName || dev);

    fetchPublicIp().then((ip) => {
      setPublicIp(ip);
      if (storedDev && storedDev.ip !== ip) {
        // Update stored IP if changed
        saveTrustedDevice(storedDev.trusted, storedDev.deviceName, ip).then(setTrustedInfo);
      }
    });

    // Check notification status
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifPerm(Notification.permission);
    }
  }, [isOpen]);

  // Handle ESC key and scroll locking
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
    const updated = { ...settings, [key]: val };
    settingsStore.set(updated);
  };

  // Toggle Trusted Device
  const handleToggleTrustDevice = async () => {
    setIsSavingDevice(true);
    const isCurrentlyTrusted = !!trustedInfo?.trusted;
    const newTrust = !isCurrentlyTrusted;
    const nameToSave = customDevName.trim() || detectedDevName;

    if (newTrust) {
      const saved = await saveTrustedDevice(true, nameToSave, publicIp);
      setTrustedInfo(saved);
      updateSetting("trustedDevice", true);
      updateSetting("deviceName", nameToSave);
      updateSetting("deviceIp", publicIp);
      toastStore.set({
        id: Date.now(),
        msg: `🛡️ Device "${nameToSave}" is now trusted! Public landing gate will be skipped.`,
      });
    } else {
      revokeTrustedDevice();
      setTrustedInfo(null);
      updateSetting("trustedDevice", false);
      toastStore.set({
        id: Date.now(),
        msg: "Device trust revoked. Public gate re-enabled.",
      });
    }
    setIsSavingDevice(false);
  };

  // Sync to Supabase Cloud
  const handleSyncToCloud = async () => {
    setIsCloudSyncing(true);
    setCloudSyncStatus("idle");
    setCloudSyncMsg("Syncing with Supabase Cloud...");

    const progressList = Object.values(progressMap);
    const devicesList = trustedInfo ? [trustedInfo] : [];

    const res = await syncProfileToSupabase({
      profile_name: settings.profileName,
      avatar_url: settings.avatarUrl || PRESET_AVATARS[0].url,
      trusted_devices: devicesList,
      preferences: {
        defaultServer: settings.defaultServer,
        defaultAudio: settings.defaultAudio,
        quality: settings.quality || "auto",
        autoplayNext: settings.autoplayNext,
        autoZapAds: settings.autoZapAds ?? true,
        trailerSound: settings.trailerSound ?? true,
      },
      continue_watching: progressList,
    });

    if (res.success) {
      setCloudSyncStatus("synced");
      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setCloudSyncMsg(`Synced at ${timeStr}`);
      updateSetting("lastSyncedAt", Date.now());
      toastStore.set({
        id: Date.now(),
        msg: "☁️ Profile and personalization saved to Supabase Cloud!",
      });
    } else {
      setCloudSyncStatus("error");
      setCloudSyncMsg(res.error || "Sync failed");
      toastStore.set({
        id: Date.now(),
        msg: "Cloud sync failed. Local settings preserved.",
      });
    }
    setIsCloudSyncing(false);
  };

  // Restore from Supabase Cloud
  const handleRestoreFromCloud = async () => {
    setIsCloudSyncing(true);
    setCloudSyncMsg("Fetching from Supabase Cloud...");

    const cloudData = await fetchProfileFromSupabase();
    if (cloudData) {
      settingsStore.set({
        ...settings,
        profileName: cloudData.profile_name || settings.profileName,
        avatarUrl: cloudData.avatar_url || settings.avatarUrl,
        defaultServer: cloudData.preferences?.defaultServer || settings.defaultServer,
        defaultAudio: cloudData.preferences?.defaultAudio || settings.defaultAudio,
        autoplayNext: cloudData.preferences?.autoplayNext ?? settings.autoplayNext,
        lastSyncedAt: Date.now(),
      });

      if (Array.isArray(cloudData.trusted_devices) && cloudData.trusted_devices.length > 0) {
        const matching = cloudData.trusted_devices[0];
        localStorage.setItem("cinemaverse_trusted_device", JSON.stringify(matching));
        setTrustedInfo(matching);
      }

      setCloudSyncStatus("synced");
      setCloudSyncMsg("Restored from Cloud");
      toastStore.set({
        id: Date.now(),
        msg: "☁️ Profile restored from Supabase Cloud!",
      });
    } else {
      setCloudSyncStatus("error");
      setCloudSyncMsg("No cloud profile found");
      toastStore.set({
        id: Date.now(),
        msg: "No cloud profile found for this account.",
      });
    }
    setIsCloudSyncing(false);
  };

  // Continue Watching Actions
  const handleRemoveProgress = (key: string, title: string) => {
    const next = { ...progressMap };
    delete next[key];
    progressStore.set(next);
    toastStore.set({
      id: Date.now(),
      msg: `Removed "${title}" from Continue Watching`,
    });
  };

  const handleClearAllProgress = () => {
    if (confirm("Are you sure you want to clear your entire Continue Watching list?")) {
      progressStore.set({});
      try {
        localStorage.removeItem("frame:progress");
      } catch {}
      toastStore.set({
        id: Date.now(),
        msg: "Continue Watching history cleared.",
      });
    }
  };

  const handleResumeItem = (item: Progress) => {
    onClose();
    if (onPlay) {
      // Parse season/episode from label if available (e.g., "S1:E2")
      let season = 1;
      let episode = 1;
      if (item.label) {
        const match = item.label.match(/S(\d+):E(\d+)/i);
        if (match) {
          season = parseInt(match[1], 10);
          episode = parseInt(match[2], 10);
        }
      }
      onPlay(item.media, { season, episode, label: item.label });
    } else if (onOpenMedia) {
      onOpenMedia(item.media);
    }
  };

  const handleEnablePush = async () => {
    const res = await requestNotificationPermission();
    setNotifPerm(res);
  };

  const handleDisguiseMode = () => {
    window.location.href = "/";
  };

  if (!isOpen) return null;

  const continueItems = Object.entries(progressMap);
  const currentAvatarUrl =
    settings.avatarUrl ||
    PRESET_AVATARS.find((a) => a.id === settings.avatar)?.url ||
    PRESET_AVATARS[0].url;

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 md:p-6 animate-[fade_.2s_both]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="CinemaVerse Settings Studio"
        onClick={(e) => e.stopPropagation()}
        className="no-scrollbar relative flex size-full max-h-[720px] max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-[#0b0c13] shadow-2xl shadow-black ring-1 ring-white/10 animate-[pop_.25s_cubic-bezier(.16,1,.3,1)_both]"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-[#12131d]/90 px-4 sm:px-6 py-4 backdrop-blur-xl">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <img
                src={currentAvatarUrl}
                alt={settings.profileName}
                className="size-11 sm:size-12 rounded-2xl object-cover ring-2 ring-red-500/60 shadow-lg shadow-red-500/20"
              />
              <span className="absolute -bottom-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-[#12131d]" title="Cloud Synced">
                <span className="size-1.5 rounded-full bg-white animate-pulse" />
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-base sm:text-lg font-black text-white">
                  {settings.profileName || "VIP Cinema Member"}
                </h2>
                <span className="rounded-lg bg-linear-to-r from-red-600 via-purple-600 to-indigo-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow-sm">
                  {settings.vipBadge || "Obsidian VIP"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/50">
                <span>{settings.bio || "Personalized Cinema Profile"}</span>
                <span>•</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  ☁️ Supabase Cloud
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncToCloud}
              disabled={isCloudSyncing}
              title="Save all changes to Supabase Cloud"
              className="hidden sm:flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-bold text-white transition active:scale-95 disabled:opacity-50"
            >
              <svg className={`size-3.5 ${isCloudSyncing ? "animate-spin text-red-500" : "text-emerald-400"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
              </svg>
              <span>{isCloudSyncing ? "Syncing..." : "Sync Cloud"}</span>
            </button>
            <RoundBtn icon="close" label="Close Settings" onClick={onClose} size={36} />
          </div>
        </div>

        {/* Main Body: Sidebar / Horizontal Tabs + Tab Content */}
        <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
          {/* Navigation Bar / Sidebar */}
          <div className="flex md:flex-col shrink-0 border-b md:border-b-0 md:border-r border-white/10 bg-[#0e0f17]/95 p-2 sm:p-3 overflow-x-auto md:w-60 gap-1 no-scrollbar">
            {(
              [
                { id: "profile", label: "Profile & Identity", icon: "user", badge: "Cloud" },
                {
                  id: "device",
                  label: "Device & IP Trust",
                  icon: "shield",
                  badge: trustedInfo?.trusted ? "Active" : undefined,
                },
                {
                  id: "continue",
                  label: "Continue Watching",
                  icon: "film",
                  badge: continueItems.length > 0 ? String(continueItems.length) : undefined,
                },
                { id: "streaming", label: "Streaming & Servers", icon: "sliders" },
                { id: "notifications", label: "Push Alerts", icon: "bell" },
                { id: "apps", label: "Apps & Smart TV", icon: "tv" },
                { id: "privacy", label: "Storage & Disguise", icon: "settings" },
              ] as const
            ).map((t) => {
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition shrink-0 md:w-full active:scale-[0.98] ${
                    active
                      ? "bg-red-600/20 text-white border border-red-500/50 shadow-md shadow-red-600/10"
                      : "text-white/60 hover:bg-white/5 hover:text-white border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon name={t.icon} size={15} className={active ? "text-red-500" : "text-white/50"} />
                    <span className="truncate">{t.label}</span>
                  </div>
                  {t.badge && (
                    <span
                      className={`ml-1.5 rounded-md px-1.5 py-0.2 text-[9px] font-black ${
                        t.badge === "Active"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                          : t.badge === "Cloud"
                          ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
                          : "bg-white/10 text-white/70"
                      }`}
                    >
                      {t.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab Content Panel */}
          <div className="no-scrollbar flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-[#0b0c13]">
            {/* 1. PROFILE & IDENTITY TAB */}
            {activeTab === "profile" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-extrabold text-white">VIP Profile &amp; Cloud Identity</h3>
                  <p className="text-xs text-white/50 mt-0.5">
                    Personalize your streaming persona, avatar, and cloud backup across all your devices.
                  </p>
                </div>

                {/* Profile Name & Bio */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-white/10 bg-[#13141f] p-4">
                    <label className="block text-[11px] font-black uppercase tracking-wider text-white/60 mb-1.5">
                      Profile Display Name
                    </label>
                    <input
                      type="text"
                      value={settings.profileName}
                      onChange={(e) => updateSetting("profileName", e.target.value)}
                      placeholder="e.g. Neo or Ranana"
                      className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-xs font-bold text-white placeholder-white/30 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[#13141f] p-4">
                    <label className="block text-[11px] font-black uppercase tracking-wider text-white/60 mb-1.5">
                      Bio / Motto
                    </label>
                    <input
                      type="text"
                      value={settings.bio || ""}
                      onChange={(e) => updateSetting("bio", e.target.value)}
                      placeholder="e.g. 4K Cinema & Anime Connoisseur"
                      className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-xs font-bold text-white placeholder-white/30 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                </div>

                {/* Avatar Selection */}
                <div className="rounded-2xl border border-white/10 bg-[#13141f] p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-white">Choose Avatar</h4>
                      <p className="text-[11px] text-white/50">Pick from cinematic studio presets or provide a custom image URL</p>
                    </div>
                    <button
                      onClick={() => setShowCustomAvatarInput((v) => !v)}
                      className="text-xs font-bold text-red-400 hover:text-red-300 underline"
                    >
                      {showCustomAvatarInput ? "Use Presets" : "Custom URL"}
                    </button>
                  </div>

                  {showCustomAvatarInput ? (
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={customAvatarInput}
                        onChange={(e) => setCustomAvatarInput(e.target.value)}
                        placeholder="https://example.com/avatar.jpg"
                        className="flex-1 rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-xs text-white placeholder-white/30 focus:border-red-500 focus:outline-none"
                      />
                      <button
                        onClick={() => {
                          if (customAvatarInput.trim()) {
                            updateSetting("avatarUrl", customAvatarInput.trim());
                            toastStore.set({ id: Date.now(), msg: "Custom avatar updated!" });
                          }
                        }}
                        className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-500 active:scale-95"
                      >
                        Apply
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                      {PRESET_AVATARS.map((av) => {
                        const isSelected = settings.avatarUrl === av.url || settings.avatar === av.id;
                        return (
                          <button
                            key={av.id}
                            onClick={() => {
                              updateSetting("avatar", av.id);
                              updateSetting("avatarUrl", av.url);
                            }}
                            className={`group relative flex flex-col items-center rounded-2xl border p-2 transition active:scale-95 ${
                              isSelected
                                ? "border-red-500 bg-red-600/20 shadow-lg shadow-red-600/30"
                                : "border-white/10 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.06]"
                            }`}
                          >
                            <img
                              src={av.url}
                              alt={av.label}
                              className="size-14 rounded-xl object-cover ring-1 ring-white/10 group-hover:scale-105 transition-transform"
                            />
                            <span className="mt-1.5 text-[10px] font-bold text-white/80 group-hover:text-white truncate">
                              {av.label}
                            </span>
                            {isSelected && (
                              <span className="absolute top-1 right-1 grid size-4 place-items-center rounded-full bg-red-600 text-[10px] font-black text-white">
                                ✓
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Supabase Cloud Sync Center */}
                <div className="rounded-2xl border border-purple-500/30 bg-linear-to-br from-purple-950/40 to-[#12131d] p-5 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="grid size-11 place-items-center rounded-2xl bg-purple-600/30 border border-purple-500/50 text-purple-300">
                        <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
                        </svg>
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-extrabold text-white">Supabase Cloud Synchronization</h4>
                          <span className="rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-black text-emerald-400 border border-emerald-500/30">
                            LIVE CLOUD
                          </span>
                        </div>
                        <p className="text-xs text-white/60">
                          {cloudSyncMsg || (settings.lastSyncedAt ? `Last cloud sync: ${new Date(settings.lastSyncedAt).toLocaleString()}` : "Ready to sync with Supabase PostgreSQL cloud database")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={handleRestoreFromCloud}
                        disabled={isCloudSyncing}
                        className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/20 active:scale-95 transition disabled:opacity-50"
                      >
                        Restore
                      </button>
                      <button
                        onClick={handleSyncToCloud}
                        disabled={isCloudSyncing}
                        className="flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-purple-600/30 active:scale-95 transition disabled:opacity-50"
                      >
                        <svg className={`size-3.5 ${isCloudSyncing ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                          <path d="M3 3v5h5" />
                          <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                          <path d="M16 21h5v-5" />
                        </svg>
                        <span>{isCloudSyncing ? "Syncing..." : "Backup to Cloud"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. DEVICE & IP TRUST TAB (BYPASS PUBLIC GATE) */}
            {activeTab === "device" && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-white">Trusted Device &amp; Direct Vault Bypass</h3>
                    <span className="rounded-md bg-red-600/30 border border-red-500/50 px-2 py-0.5 text-[9px] font-black uppercase text-red-300">
                      Zero Public Gate
                    </span>
                  </div>
                  <p className="text-xs text-white/50 mt-0.5">
                    Save your mobile or PC device signature and IP address. Whenever you visit CinemaVerse again from this device, you will never see the public app or website — you go directly to the VIP Vault!
                  </p>
                </div>

                {/* Primary Bypass Master Card */}
                <div className={`rounded-2xl border p-5 transition-all shadow-xl ${
                  trustedInfo?.trusted
                    ? "border-emerald-500/50 bg-linear-to-br from-emerald-950/40 via-[#0e1713] to-[#12131d]"
                    : "border-white/12 bg-[#13141f]"
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <span className={`grid size-12 place-items-center rounded-2xl border transition-colors shrink-0 ${
                        trustedInfo?.trusted
                          ? "border-emerald-500 bg-emerald-600/25 text-emerald-400"
                          : "border-white/20 bg-white/10 text-white/60"
                      }`}>
                        <Icon name="shield" size={24} />
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-extrabold text-white">
                            {trustedInfo?.trusted ? "Bypass Gate is ACTIVE on this Device" : "Enable Direct Vault Bypass"}
                          </h4>
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase ${
                            trustedInfo?.trusted
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                              : "bg-white/10 text-white/50"
                          }`}>
                            {trustedInfo?.trusted ? "Trusted Device" : "Untrusted"}
                          </span>
                        </div>
                        <p className="text-xs text-white/60 mt-1 max-w-lg leading-relaxed">
                          {trustedInfo?.trusted
                            ? "This device is registered in your trusted database. When opening the site, it will instantly bypass the public CinePulse discovery page and launch CinemaVerse Vault directly."
                            : "Click below to trust this device and store your public IP and hardware profile. Future visits from this phone or browser will load the vault immediately."}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleToggleTrustDevice}
                      disabled={isSavingDevice}
                      className={`shrink-0 rounded-2xl px-5 py-3 text-xs font-black tracking-wider transition active:scale-95 shadow-lg ${
                        trustedInfo?.trusted
                          ? "bg-red-600/20 hover:bg-red-600 border border-red-500/50 text-red-200 hover:text-white"
                          : "bg-linear-to-r from-emerald-600 to-teal-500 hover:brightness-110 text-white shadow-emerald-600/30"
                      }`}
                    >
                      {isSavingDevice
                        ? "Saving..."
                        : trustedInfo?.trusted
                        ? "Revoke Trust"
                        : "🛡️ Trust This Device"}
                    </button>
                  </div>
                </div>

                {/* Detected Device Signature Details */}
                <div className="rounded-2xl border border-white/10 bg-[#13141f] p-5 space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-white/70">
                    Device Signature &amp; Network Identification
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Device Friendly Name */}
                    <div className="rounded-xl border border-white/10 bg-black/40 p-3.5">
                      <label className="block text-[10px] font-black uppercase tracking-wider text-white/50 mb-1">
                        Device Name / Nickname
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={customDevName}
                          onChange={(e) => setCustomDevName(e.target.value)}
                          placeholder="e.g. Ranana's S24 Ultra"
                          className="flex-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-bold text-white focus:border-red-500 focus:outline-none"
                        />
                        <button
                          onClick={async () => {
                            if (trustedInfo?.trusted) {
                              const s = await saveTrustedDevice(true, customDevName, publicIp);
                              setTrustedInfo(s);
                              toastStore.set({ id: Date.now(), msg: "Device nickname updated!" });
                            }
                          }}
                          className="rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-bold text-white"
                        >
                          Save
                        </button>
                      </div>
                      <span className="text-[10px] text-white/40 mt-1 block">
                        Hardware match: {detectedDevName}
                      </span>
                    </div>

                    {/* Detected Public IP */}
                    <div className="rounded-xl border border-white/10 bg-black/40 p-3.5">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-black uppercase tracking-wider text-white/50">
                          Detected Public IP Address
                        </label>
                        <button
                          onClick={() => {
                            setPublicIp("Detecting...");
                            fetchPublicIp().then(setPublicIp);
                          }}
                          className="text-[10px] font-bold text-accent hover:underline"
                        >
                          Refresh IP
                        </button>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-white/15 bg-white/5 px-3 py-1.5">
                        <span className="font-mono text-xs font-bold text-emerald-400">{publicIp}</span>
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                          <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
                          Verified
                        </span>
                      </div>
                      <span className="text-[10px] text-white/40 mt-1 block">
                        Stored in Supabase encrypted device audit ledger
                      </span>
                    </div>
                  </div>
                </div>

                {/* Information Card on How Vault Bypass Operates */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-amber text-lg">💡</span>
                    <div className="text-xs text-white/60 leading-relaxed">
                      <b className="text-white">How does direct access work?</b> When you enable device trust, a signed cryptographic token with your device ID and IP is saved. Whenever you open the website URL or bookmark from this phone or browser, it intercepts the initial boot and instantly redirects to the CinemaVerse Vault (<code className="rounded bg-white/10 px-1 py-0.5 text-white font-mono">/vault</code>) in under 15ms. Anyone else visiting will see the public cover page.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. CONTINUE WATCHING TAB */}
            {activeTab === "continue" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-white">Continue Watching Studio</h3>
                    <p className="text-xs text-white/50 mt-0.5">
                      Manage your active in-progress titles, resume points, and episode timestamps.
                    </p>
                  </div>
                  {continueItems.length > 0 && (
                    <button
                      onClick={handleClearAllProgress}
                      className="rounded-xl border border-red-500/40 bg-red-600/20 px-3 py-1.5 text-xs font-bold text-red-200 hover:bg-red-600 hover:text-white transition active:scale-95"
                    >
                      Clear All ({continueItems.length})
                    </button>
                  )}
                </div>

                {continueItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] py-16 px-4 text-center">
                    <span className="grid size-14 place-items-center rounded-2xl bg-white/5 text-white/40 mb-3">
                      <Icon name="film" size={28} />
                    </span>
                    <h4 className="text-sm font-extrabold text-white">No active watching sessions</h4>
                    <p className="text-xs text-white/50 max-w-sm mt-1">
                      Movies and series you stream will automatically appear here with your exact resume point and progress bar.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {continueItems.map(([key, item]) => {
                      const m = item.media;
                      const title = titleOf(m);
                      const posterUrl = m.poster_path
                        ? `https://image.tmdb.org/t/p/w185${m.poster_path}`
                        : m.backdrop_path
                        ? `https://image.tmdb.org/t/p/w300${m.backdrop_path}`
                        : "/fallback-poster.png";

                      return (
                        <div
                          key={key}
                          className="group relative flex overflow-hidden rounded-2xl border border-white/10 bg-[#13141f] p-3 transition hover:border-red-500/50 hover:bg-[#161725] shadow-md"
                        >
                          <img
                            src={posterUrl}
                            alt={title}
                            className="size-20 shrink-0 rounded-xl object-cover ring-1 ring-white/10"
                          />

                          <div className="ml-3 flex flex-1 flex-col justify-between min-w-0 pr-1">
                            <div>
                              <div className="flex items-center justify-between gap-2">
                                <h4 className="truncate text-xs font-bold text-white group-hover:text-red-400 transition-colors">
                                  {title}
                                </h4>
                                <button
                                  onClick={() => handleRemoveProgress(key, title)}
                                  title="Remove from history"
                                  className="text-white/40 hover:text-red-400 p-1 transition"
                                >
                                  <Icon name="trash" size={13} />
                                </button>
                              </div>

                              {item.label && (
                                <span className="inline-block mt-0.5 rounded-md bg-amber/20 px-1.5 py-0.2 text-[10px] font-black text-amber">
                                  {item.label}
                                </span>
                              )}
                            </div>

                            {/* Progress bar and time */}
                            <div>
                              <div className="flex items-center justify-between text-[10px] font-bold text-white/50 mb-1">
                                <span>{item.pct.toFixed(0)}% watched</span>
                                <span>{Math.round(item.time / 60)}m played</span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-linear-to-r from-red-600 to-accent"
                                  style={{ width: `${Math.min(100, Math.max(5, item.pct))}%` }}
                                />
                              </div>

                              <button
                                onClick={() => handleResumeItem(item)}
                                className="mt-2.5 flex items-center justify-center gap-1.5 w-full rounded-lg bg-white/10 hover:bg-red-600 py-1.5 text-xs font-bold text-white transition active:scale-95"
                              >
                                <Icon name="play" size={11} />
                                <span>Resume Playing</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 4. STREAMING & SERVERS TAB */}
            {activeTab === "streaming" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-extrabold text-white">Streaming Engine &amp; VIP Servers</h3>
                  <p className="text-xs text-white/50 mt-0.5">
                    Customize default playback parameters, auto ad-suppression, and high-speed multi-CDN routes.
                  </p>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-2">
                      Preferred Default VIP Streaming Server
                    </label>
                    <p className="text-xs text-white/50 mb-3">
                      Server 1 and Server 2 provide direct 4K streaming and multi-dub Hindi/English audio tracks.
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
                      Preferred Audio Track &amp; Dubbing
                    </label>
                    <p className="text-xs text-white/50 mb-3">
                      Default language for international movies, Hollywood blockbusters, and anime.
                    </p>
                    <Select
                      value={settings.defaultAudio}
                      onChange={(v) => updateSetting("defaultAudio", v)}
                      options={AUDIO_OPTIONS}
                      className="w-full text-xs font-semibold bg-[#171824]"
                    />
                  </div>

                  {/* Toggles */}
                  <div className="pt-4 border-t border-white/8 space-y-4">
                    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#13141f] p-4">
                      <div>
                        <h4 className="text-xs font-bold text-white">Autoplay Next Episode</h4>
                        <p className="text-xs text-white/50">Automatically transition to the next episode in a TV series</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateSetting("autoplayNext", !settings.autoplayNext)}
                        className={`relative h-6 w-11 rounded-full transition-colors ${
                          settings.autoplayNext ? "bg-red-600" : "bg-white/20"
                        }`}
                      >
                        <span
                          className={`block size-4 rounded-full bg-white transition-transform ${
                            settings.autoplayNext ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#13141f] p-4">
                      <div>
                        <h4 className="text-xs font-bold text-white">Auto-Zap Redirect Ads</h4>
                        <p className="text-xs text-white/50">Automatically suppress popup ads, sandboxed redirects, and click-jackers</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateSetting("autoZapAds", !(settings.autoZapAds ?? true))}
                        className={`relative h-6 w-11 rounded-full transition-colors ${
                          (settings.autoZapAds ?? true) ? "bg-red-600" : "bg-white/20"
                        }`}
                      >
                        <span
                          className={`block size-4 rounded-full bg-white transition-transform ${
                            (settings.autoZapAds ?? true) ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#13141f] p-4">
                      <div>
                        <h4 className="text-xs font-bold text-white">Background Trailer Audio</h4>
                        <p className="text-xs text-white/50">Play cinematic score sound when inspecting movie details</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateSetting("trailerSound", !(settings.trailerSound ?? true))}
                        className={`relative h-6 w-11 rounded-full transition-colors ${
                          (settings.trailerSound ?? true) ? "bg-red-600" : "bg-white/20"
                        }`}
                      >
                        <span
                          className={`block size-4 rounded-full bg-white transition-transform ${
                            (settings.trailerSound ?? true) ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 5. PUSH NOTIFICATIONS TAB */}
            {activeTab === "notifications" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-extrabold text-white">Mobile Push Notifications &amp; Alerts</h3>
                  <p className="text-xs text-white/50 mt-0.5">
                    Receive upcoming movie premiere notifications directly on your phone lock-screen even when closed.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#13141f] p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white">System Push Notifications</h4>
                      <p className="text-xs text-white/50 mt-0.5">
                        Alerts deliver in real-time when new releases from today onwards premiere.
                      </p>
                    </div>
                    <span
                      className={`rounded-md px-2.5 py-1 text-[10px] font-black uppercase ${
                        notifPerm === "granted"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                          : "bg-amber/20 text-amber border border-amber/40"
                      }`}
                    >
                      {notifPerm === "granted" ? "Active" : "Disabled"}
                    </span>
                  </div>

                  <div className="mt-4">
                    {notifPerm !== "granted" ? (
                      <button
                        onClick={handleEnablePush}
                        className="flex items-center gap-2 rounded-xl bg-linear-to-r from-red-600 to-accent px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-red-600/30 hover:brightness-110 active:scale-95 transition"
                      >
                        <Icon name="bell" size={15} />
                        Enable Mobile Push Permission
                      </button>
                    ) : (
                      <p className="text-xs text-emerald-400 flex items-center gap-1.5 font-semibold">
                        <Icon name="check" size={15} /> Lock-screen alerts are enabled on this mobile device.
                      </p>
                    )}
                  </div>
                </div>

                {/* Scheduled Reminders List */}
                <div className="rounded-2xl border border-white/10 bg-[#13141f] p-5">
                  <h4 className="text-xs font-black uppercase tracking-wider text-white/70 mb-3">
                    Scheduled Premiere Reminders ({reminders.length})
                  </h4>
                  {reminders.length === 0 ? (
                    <p className="text-xs text-white/40">
                      No reminders set yet. Browse Upcoming Titles and tap &quot;Remind Me&quot; to queue premiere alerts!
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {reminders.map((r, i) => (
                        <div key={i} className="flex items-center justify-between rounded-xl bg-black/40 p-2.5 border border-white/8">
                          <span className="text-xs font-bold text-white truncate max-w-xs">{titleOf(r.media)}</span>
                          <span className="text-[10px] font-mono text-amber">{r.releaseDate}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 6. APPS & SMART TV TAB */}
            {activeTab === "apps" && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-base font-extrabold text-white">CinemaVerse Native Apps &amp; Smart TV</h3>
                  <p className="text-xs text-white/50 mt-0.5">
                    Experience CinemaVerse on your Android smartphone, tablet, or Android TV / Fire TV.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#13141f] p-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">CinemaVerse Android Pro APK</h4>
                      <span className="rounded-md bg-accent/20 px-1.5 py-0.2 text-[9px] font-bold text-accent">v4.2</span>
                    </div>
                    <p className="text-xs text-white/50 mt-1">
                      Hardware-accelerated mobile streaming, picture-in-picture, and background audio.
                    </p>
                  </div>
                  <a
                    href="/CinemaVerse-Pro.apk"
                    download="CinemaVerse-Pro.apk"
                    className="flex shrink-0 items-center gap-2 rounded-xl bg-accent hover:brightness-110 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-accent/25 active:scale-95 transition"
                  >
                    <Icon name="download" size={15} /> Download APK (Direct)
                  </a>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#13141f] p-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">CinemaVerse Smart TV Leanback Mode</h4>
                      <span className="rounded-md bg-purple-600/20 px-1.5 py-0.2 text-[9px] font-bold text-purple-300">10-Foot UI</span>
                    </div>
                    <p className="text-xs text-white/50 mt-1">
                      Full D-Pad remote control navigation for Android TV, Fire TV Stick, and WebOS. Passcode protected.
                    </p>
                  </div>
                  <a
                    href="/tv.html"
                    className="flex shrink-0 items-center gap-2 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 px-4 py-2.5 text-xs font-bold text-white active:scale-95 transition"
                  >
                    <Icon name="tv" size={15} /> Open TV Leanback
                  </a>
                </div>

                <div className="rounded-2xl border border-white/8 bg-black/40 p-4 text-xs text-white/60">
                  <b className="text-white">Smart TV Passcode:</b> <span className="font-mono text-red-400 font-bold ml-1">cinema2026</span>
                </div>
              </div>
            )}

            {/* 7. STORAGE & DISGUISE TAB */}
            {activeTab === "privacy" && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-base font-extrabold text-white">Storage, Cache &amp; Disguise Mode</h3>
                  <p className="text-xs text-white/50 mt-0.5">
                    Clear local storage, wipe cached posters, or trigger instant medical disguise mode.
                  </p>
                </div>

                {/* Instant Camouflage Panic Button */}
                <div className="rounded-2xl border border-amber/40 bg-amber/10 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span>Instant Camouflage Mode</span>
                      <span className="rounded-md bg-amber/30 px-1.5 py-0.2 text-[9px] font-black text-amber">PANIC BUTTON</span>
                    </h4>
                    <p className="text-xs text-white/70 mt-1">
                      Instantly exit the vault and disguise this browser tab as the CinePulse medical cover portal.
                    </p>
                  </div>
                  <button
                    onClick={handleDisguiseMode}
                    className="shrink-0 rounded-xl bg-amber hover:bg-amber/90 px-4 py-2.5 text-xs font-black text-black active:scale-95 transition"
                  >
                    Activate Disguise Now
                  </button>
                </div>

                {/* Clear Local Cache */}
                <div className="rounded-2xl border border-white/10 bg-[#13141f] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-white">Reset Local App Cache</h4>
                    <p className="text-xs text-white/50 mt-1">
                      Flushes cached TMDb catalog metadata and reloads fresh streaming server endpoints.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm("Reset local cache and reload page?")) {
                        try {
                          sessionStorage.clear();
                        } catch {}
                        window.location.reload();
                      }
                    }}
                    className="shrink-0 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 px-4 py-2 text-xs font-bold text-white transition active:scale-95"
                  >
                    Clear Cache &amp; Reload
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-white/10 bg-[#12131d]/90 px-4 sm:px-6 py-3.5 backdrop-blur-xl">
          <div className="flex items-center gap-2 text-[11px] text-white/40">
            <span>CinemaVerse Pro v4.2</span>
            <span>•</span>
            <span className="text-emerald-400 font-semibold">10 VIP Servers Operational</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncToCloud}
              disabled={isCloudSyncing}
              className="rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-1.5 text-xs font-bold text-white shadow-md shadow-purple-600/20 active:scale-95 transition"
            >
              {isCloudSyncing ? "Saving..." : "Save & Sync"}
            </button>
            <button
              onClick={onClose}
              className="rounded-xl bg-white/15 hover:bg-white/25 px-4 py-1.5 text-xs font-bold text-white active:scale-95 transition"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
