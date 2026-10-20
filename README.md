# CinemaMirror Pro — 100% Ad-Free Streaming Web Application

A modern, high-speed, and completely ad-free streaming web application built with **Node.js** and **Express.js**, designed as a drastically superior alternative to the third-party **NetMirror APK**.

---

## 🛡️ NetMirror APK Security & Forensic Audit Verdict

Prior to building this web application, a full static, forensic, and dynamic reverse-engineering audit was performed on `NetMirror.apk` (`app.netmirror.netmirrornew` v3.0) using the **Reverse Engineer Anything (REA)** toolchain.

### Safety Summary
| Category | Finding | Details |
|---|---|---|
| **Rootkit / System Dropper** | ❌ Not Present | No privilege escalation or root exploits found |
| **Undisclosed Affiliate Redirect** | ⚠️ Confirmed | `MainActivity.onCreate()` fires a 10s delayed `Intent.ACTION_VIEW` to `mpanyinadiingsinsp.com?bC8ac=1258571` |
| **C2 Dynamic Backend Routing** | ⚠️ Confirmed | Fetches live config from `mobiledetect.app/check.php` (with 16 fallback Base64 domains) |
| **User Data Exfiltration** | ⚠️ Confirmed | Every title clicked POSTs scraped HTML to `net52.cc/streamtape.php` |
| **Aggressive Ad Networks** | ⚠️ Confirmed | Embedded player loads scam pop-unders, fake download buttons (`freecdn*.top`, `subscdn.top`) |
| **Cleartext Traffic** | ⚠️ Confirmed | `android:usesCleartextTraffic="true"` leaves unencrypted traffic exposed |

**Conclusion:** The APK is classified as **Adware and Privacy-Hostile Piracy Infrastructure**. It is not an active destructive trojan, but it severely compromises user privacy and pushes deceptive monetization.

---

## 🚀 Key Advantages of CinemaMirror Web Pro

| Feature | Original NetMirror APK | CinemaMirror Web Pro |
|---|---|---|
| **Ad Experience** | ❌ Scam ads, redirects, pop-unders | ✅ **100% Ad-Free, Zero Popups** |
| **Safety & Privacy** | ❌ Exfiltrates history to operator C2 | ✅ **100% Private (Runs locally, no tracking)** |
| **Ad-Shield Sandbox** | ❌ None (WebView allows popup hijacking) | ✅ **Built-in Sandbox blocks `window.open()`** |
| **Screen Lock** | Basic touch toggle | ✅ **Smart Screen Lock (Prevents accidental clicks)** |
| **Gesture Controls** | Basic brightness/volume | ✅ **On-Screen Brightness & Volume Sliders** |
| **Streaming Servers** | Single Streamtape host | ✅ **5 High-Speed Independent Mirror Servers** |
| **Interface** | Clunky WebView wrapper | ✅ **Netflix-Grade Glassmorphism Dark UI** |
| **Platform Support** | Android only | ✅ **Universal: Windows, Mac, Linux, iOS, Android** |

---

## 🛠️ How to Run

1. Open PowerShell or Terminal in `d:\apps\FMR`:
   ```bash
   cd d:\apps\FMR
   npm start
   ```
2. Open your web browser and navigate to:
   ```
   http://localhost:3000
   ```

---

## ⌨️ Keyboard Shortcuts

- `Space` : Play / Pause
- `F` : Fullscreen Toggle
- `L` : Screen Lock Toggle (Cinema Mode)
- `M` : Mute / Unmute Toggle
- `Esc` : Exit Player
- `/` or `Ctrl + K` : Focus Search Bar
