import { useState, useEffect } from "react";
import { Icon } from "./ui";
import { fetchProfileFromSupabase, saveTrustedDevice, fetchPublicIp, detectDeviceName } from "../lib/supabaseSync";

export function LoginModal({
  isOpen,
  onSuccess,
}: {
  isOpen: boolean;
  onSuccess: (user: string) => void;
}) {
  const [username, setUsername] = useState(() => {
    return localStorage.getItem("cinemaverse_auth_user") || "CinemaMaster";
  });
  const [passcode, setPasscode] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [publicIp, setPublicIp] = useState<string>("Detecting...");

  useEffect(() => {
    fetchPublicIp().then(setPublicIp);
  }, []);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanPass = passcode.trim();
    if (!cleanPass) {
      setError("Please enter the Universal Access PIN / Passcode.");
      return;
    }

    setLoading(true);

    try {
      // 1. Verify against Vault Authentication backend
      const res = await fetch("/api/vault/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: cleanPass }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        setLoading(false);
        setError("Invalid Passcode. Please check your CinemaVerse Universal PIN.");
        return;
      }

      // 2. Fetch or load cloud profile from Supabase
      const cloudProfile = await fetchProfileFromSupabase("default_user");

      // 3. If remember device is checked, save trusted device with current IP
      if (remember) {
        const devName = detectDeviceName();
        await saveTrustedDevice(true, devName, publicIp);
      }

      // 4. Save universal auth user session
      const cleanUser = username.trim() || "CinemaMaster";
      localStorage.setItem("cinemaverse_auth_user", cleanUser);

      setLoading(false);
      onSuccess(cleanUser);
    } catch (err: any) {
      setLoading(false);
      setError("Network or connection error. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl animate-[fade_.25s_ease-out]">
      {/* Background ambient neon glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 size-96 rounded-full bg-red-600/20 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 left-1/2 -translate-x-1/2 size-96 rounded-full bg-purple-600/20 blur-[120px]" />

      <div className="relative w-full max-w-md rounded-3xl border border-white/15 bg-[#0d0e15]/95 p-6 sm:p-8 shadow-[0_25px_70px_rgba(0,0,0,0.85)] backdrop-blur-xl">
        {/* Brand header */}
        <div className="flex flex-col items-center text-center">
          <div className="size-14 rounded-2xl bg-gradient-to-tr from-red-600 via-purple-600 to-indigo-600 p-0.5 shadow-xl shadow-red-600/30 flex items-center justify-center">
            <div className="size-full rounded-[14px] bg-[#0c0d14] flex items-center justify-center">
              <span className="font-display text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-purple-400">
                CV
              </span>
            </div>
          </div>
          <h2 className="mt-4 font-display text-xl sm:text-2xl font-black tracking-tight text-white">
            CinemaVerse Universal Access
          </h2>
          <p className="mt-1 text-xs text-white/50">
            Sign in once to sync watchlist, continue watching &amp; settings across any TV, mobile or PC.
          </p>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/40 bg-red-950/40 px-3.5 py-2 text-xs font-semibold text-red-300 animate-[shake_.3s_ease-in-out]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Universal Username / Profile Name */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-white/60 mb-1.5">
              Account Name / Device Profile
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. CinemaMaster"
                className="w-full rounded-xl border border-white/15 bg-white/[0.05] px-3.5 py-2.5 pl-10 text-sm text-white placeholder-white/30 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                required
              />
              <span className="absolute left-3.5 top-3 text-white/40">
                <Icon name="user" size={16} />
              </span>
            </div>
          </div>

          {/* Universal Passcode / PIN */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-white/60">
                Universal Access PIN
              </label>
              <span className="text-[10px] text-white/40">Default: cinema2026</span>
            </div>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/15 bg-white/[0.05] px-3.5 py-2.5 pl-10 pr-10 text-sm text-white placeholder-white/30 tracking-widest focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                autoFocus
                required
              />
              <span className="absolute left-3.5 top-3 text-white/40">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <button
                type="button"
                onClick={() => setShowPass((s) => !s)}
                className="absolute right-3 top-2.5 text-xs text-white/50 hover:text-white"
              >
                {showPass ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Remember Device & Trust IP */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="mt-0.5 rounded border-white/30 text-red-600 focus:ring-red-500 size-4 bg-white/10"
              />
              <div className="text-xs text-white/80">
                <span className="font-bold">Trust this Device &amp; IP</span>
                <p className="text-[10px] text-white/40 leading-snug mt-0.5">
                  Directly bypass the public landing page next time from IP:{" "}
                  <span className="font-mono text-amber-300">{publicIp}</span>
                </p>
              </div>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-purple-600 py-3 text-sm font-bold text-white shadow-xl shadow-red-600/30 transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" x2="3" y1="12" y2="12" />
                </svg>
                <span>Unlock Universal CinemaVerse</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
