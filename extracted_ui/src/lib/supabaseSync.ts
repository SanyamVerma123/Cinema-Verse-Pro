/**
 * CinemaVerse Pro — Supabase Cloud Sync & Trusted Device Service
 * Handles user profile persistence, cloud sync to Supabase, and trusted device/IP management.
 */

export interface CloudProfile {
  id: string;
  profile_name: string;
  avatar_url: string;
  trusted_devices: TrustedDeviceInfo[];
  preferences: Record<string, any>;
  continue_watching?: any[];
  favorites?: any[];
  chat_history?: any[];
  updated_at?: string;
}

export interface TrustedDeviceInfo {
  id: string;
  deviceName: string;
  ip: string;
  userAgent: string;
  isCurrent: boolean;
  trusted: boolean;
  registeredAt: number;
  lastSeenAt: number;
}

const SUPABASE_URL = "https://qfzhavrneaqsoowmifay.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmemhhdnJuZWFxc29vd21pZmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1ODY1NDcsImV4cCI6MjEwNjE2MjU0N30.K4Ll6sTNEkBa91RbhgPV1EVKkvcIAoGvtHGwynYL1f4";

const TRUSTED_DEVICE_KEY = "cinemaverse_trusted_device";
const PROFILE_LOCAL_KEY = "cinemaverse_user_profile";

/**
 * Detect client device name and platform
 */
export function detectDeviceName(): string {
  if (typeof window === "undefined" || !navigator) return "Unknown Device";
  const ua = navigator.userAgent;

  // Mobile detection
  if (/Android/i.test(ua)) {
    const match = ua.match(/Android\s+([0-9.]+);\s*([^;]+?)\s*Build/i);
    if (match && match[2]) {
      return match[2].trim();
    }
    return "Android Mobile Device";
  }
  if (/iPhone/i.test(ua)) {
    return "Apple iPhone";
  }
  if (/iPad/i.test(ua)) {
    return "Apple iPad";
  }
  if (/Macintosh/i.test(ua)) {
    return "Apple Mac";
  }
  if (/Windows NT/i.test(ua)) {
    return "Windows PC Workstation";
  }
  if (/Linux/i.test(ua)) {
    return "Linux Workstation";
  }
  return "Personal Device";
}

/**
 * Fetch client's public IP address via reliable JSON API
 */
export async function fetchPublicIp(): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch("https://api.ipify.org?format=json", {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (data && data.ip) return data.ip;
    }
  } catch {}

  try {
    const res2 = await fetch("https://api64.ipify.org?format=json");
    if (res2.ok) {
      const data2 = await res2.json();
      if (data2 && data2.ip) return data2.ip;
    }
  } catch {}

  return "127.0.0.1 (Local)";
}

/**
 * Retrieve trusted device status from localStorage
 */
export function getStoredTrustedDevice(): TrustedDeviceInfo | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(TRUSTED_DEVICE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Save trusted device state locally and update Supabase
 */
export async function saveTrustedDevice(
  trusted: boolean,
  deviceName: string,
  ip: string
): Promise<TrustedDeviceInfo> {
  const existing = getStoredTrustedDevice();
  const id = existing?.id || `dev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = Date.now();

  const devInfo: TrustedDeviceInfo = {
    id,
    deviceName: deviceName.trim() || detectDeviceName(),
    ip: ip || existing?.ip || "Detected Online",
    userAgent: navigator.userAgent,
    isCurrent: true,
    trusted,
    registeredAt: existing?.registeredAt || now,
    lastSeenAt: now,
  };

  try {
    localStorage.setItem(TRUSTED_DEVICE_KEY, JSON.stringify(devInfo));
  } catch {}

  // Sync to Supabase in background
  syncProfileToSupabase({
    trusted_devices: [devInfo],
  }).catch(() => {});

  return devInfo;
}

/**
 * Revoke trusted device status
 */
export function revokeTrustedDevice(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(TRUSTED_DEVICE_KEY);
  } catch {}
}

/**
 * Fetch profile from Supabase REST API
 */
export async function fetchProfileFromSupabase(userId = "default_user"): Promise<CloudProfile | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/cinemaverse_user_profiles?id=eq.${encodeURIComponent(userId)}&select=*`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data[0] as CloudProfile;
      }
    }
  } catch (err) {
    console.warn("[Supabase Sync] Fetch error:", err);
  }
  return null;
}

/**
 * Upsert profile to Supabase REST API
 */
export async function syncProfileToSupabase(
  partial: Partial<CloudProfile>,
  userId = "default_user"
): Promise<{ success: boolean; data?: CloudProfile; error?: string }> {
  try {
    const payload = {
      id: userId,
      ...partial,
      updated_at: new Date().toISOString(),
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/cinemaverse_user_profiles`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const respData = await res.json();
      const saved = Array.isArray(respData) ? respData[0] : respData;
      return { success: true, data: saved };
    } else {
      const txt = await res.text();
      return { success: false, error: txt };
    }
  } catch (err: any) {
    return { success: false, error: err?.message || "Network offline" };
  }
}
