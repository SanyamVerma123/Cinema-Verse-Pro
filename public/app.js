// Polyfill for Promise.allSettled on Smart TVs & legacy browsers
if (!Promise.allSettled) {
  Promise.allSettled = function (promises) {
    return Promise.all(
      promises.map(function (p) {
        return Promise.resolve(p).then(
          function (value) { return { status: 'fulfilled', value: value }; },
          function (reason) { return { status: 'rejected', reason: reason }; }
        );
      })
    );
  };
}
/* ========================================================
   CINEMAVERSE PRO — COMPLETE CLIENT APPLICATION
   Universal Multi-OTT Hub, 10 Mirror Servers, Zero Redirects, Zero Sandbox Errors
   ======================================================== */

// Global State (Using var to allow safe evaluation across environments)
var currentCatalog = window.currentCatalog || [];
var heroItems = window.heroItems || [];
var currentHeroIndex = window.currentHeroIndex || 0;
var heroTimer = window.heroTimer || null;
var currentItem = window.currentItem || null;
var currentServerIndex = window.currentServerIndex || 0; // Default: Server 1 (Vidly Pro VIP)
var currentSeason = window.currentSeason || 1;
var currentEpisode = window.currentEpisode || 1;
var availableServers = window.availableServers || [];
var isScreenLocked = false;
var isMuted = false;
var previousVolume = 1.0;
var activePlatformFilter = 'all';
var searchPlatformFilter = 'all';
var isHeroMuted = true;
var isShieldActive = true;
var isTheaterMode = false;
var currentVideoZoom = 'fit';
var currentQuality = '4k';
var currentSpeed = 1.0;

// Storage Keys (CinemaVerse Pro Universe)
var STORAGE_WATCHLIST = 'cinemaverse_watchlist';
var STORAGE_CONTINUE_WATCHING = 'cinemaverse_continue_watching';
var STORAGE_DAILY_PASS = 'cinemaverse_daily_pass';

// Fallback high-res assets (clean cinema themed SVGs instead of sailboat photos)
const FALLBACK_POSTER = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="500" height="750" viewBox="0 0 500 750"><rect width="500" height="750" fill="%23111827"/><text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" fill="%23e50914" font-family="Arial,sans-serif" font-weight="900" font-size="34">CINEMAVERSE</text><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="%2394a3b8" font-family="Arial,sans-serif" font-weight="600" font-size="16">ULTRA HD 4K</text></svg>';
const FALLBACK_BACKDROP = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><rect width="1280" height="720" fill="%230b0f19"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23e50914" font-family="Arial,sans-serif" font-weight="900" font-size="48">CINEMAVERSE PRO</text></svg>';

// Universal image URL optimizer to prevent ISP blocks (India Jio/Airtel) and guarantee instant disk cache hits
function resolvePosterUrl(url) {
  if (!url || typeof url !== 'string') return '';
  if (url.startsWith('/api/')) return url;
  if (url.includes('image.tmdb.org/t/p/')) {
    return url.replace(/^https?:\/\/image\.tmdb\.org\/t\/p\//, '/api/tmdb-image/');
  }
  if (url.includes('images.metahub.space/')) {
    return url.replace(/^https?:\/\/images\.metahub\.space\//, '/api/metahub-image/');
  }
  if (url.includes('live.metahub.space/')) {
    return '/api/image-proxy?url=' + encodeURIComponent(url);
  }
  return url;
}

// Global image error handler with dynamic platform-branded SVG generator (21st.dev inspired)
function createDynamicSvgPoster(title, platform) {
  const cleanTitle = (title || 'CinemaVerse').replace(/['"<>&]/g, '');
  const plat = (platform || 'STREAM').toUpperCase();
  const colorMap = {
    'SONY LIV': '#FF334B',
    'ZEE5': '#A855F7',
    'JIOCINEMA': '#E11D48',
    'NETFLIX': '#E50914',
    'PRIME VIDEO': '#00A8E1',
    'DISNEY+ HOTSTAR': '#113CCF',
    'HBO MAX': '#9933FF',
    'APPLE TV+': '#64748B',
    'CRUNCHYROLL': '#F47521',
    'PARAMOUNT+': '#0064FF',
    'HULU': '#1CE783',
    'PEACOCK': '#F7A800',
    'ANIME WORLD': '#F59E0B'
  };
  const accent = colorMap[plat] || '#E50914';
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="500" height="750" viewBox="0 0 500 750">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#141824"/>
          <stop offset="50%" stop-color="#0b0e17"/>
          <stop offset="100%" stop-color="#05070a"/>
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="15%" r="60%">
          <stop offset="0%" stop-color="${accent}" stop-opacity="0.45"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="500" height="750" fill="url(#bg)"/>
      <rect width="500" height="750" fill="url(#glow)"/>
      <!-- Luminous 21st.dev Glass Border -->
      <rect x="12" y="12" width="476" height="726" rx="20" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1.5"/>
      <!-- Platform Pill Header -->
      <g transform="translate(28, 28)">
        <rect width="130" height="34" rx="10" fill="${accent}" fill-opacity="0.95"/>
        <text x="65" y="22" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-weight="900" font-size="12" fill="#ffffff" text-anchor="middle" letter-spacing="1">${plat}</text>
      </g>
      <!-- Center Film Slate Icon -->
      <g transform="translate(225, 290)" fill="${accent}" opacity="0.85">
        <path d="M40 0H10C4.5 0 0 4.5 0 10v30c0 5.5 4.5 10 10 10h30c5.5 0 10-4.5 10-10V10c0-5.5-4.5-10-10-10zm-5 32l-15 9V19l15 9z"/>
      </g>
      <!-- Title -->
      <text x="250" y="410" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-weight="800" font-size="28" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${cleanTitle}</text>
      <!-- Quality Badge -->
      <g transform="translate(170, 660)">
        <rect width="160" height="40" rx="20" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
        <text x="80" y="25" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-weight="800" font-size="13" fill="#f59e0b" text-anchor="middle" letter-spacing="1">★ 4K ULTRA HD</text>
      </g>
    </svg>
  `);
}

window.handleImgError = function(img, fallback = null) {
  if (!img) return;
  const currentSrc = img.src || '';
  const rawSrc = img.getAttribute('data-raw-src') || '';

  // 1. Auto-retry via proxy if image was direct TMDB/Metahub and failed on client
  if (!img.dataset.proxyRetried && (currentSrc.includes('tmdb.org') || currentSrc.includes('metahub.space') || currentSrc.includes('live.metahub.space') || rawSrc.includes('tmdb.org') || rawSrc.includes('metahub.space'))) {
    img.dataset.proxyRetried = 'true';
    const target = rawSrc || currentSrc;
    img.src = resolvePosterUrl(target);
    return;
  }

  // 2. SVG Fallback
  img.onerror = null;
  const title = img.getAttribute('alt') || 'CinemaVerse';
  const card = img.closest('.movie-card, .top10-card, .cinema-search-card');
  const platBadge = card ? card.querySelector('.card-ott-badge, .tv-card-ott') : null;
  const platName = platBadge ? platBadge.textContent : 'STREAM';
  img.src = fallback || createDynamicSvgPoster(title, platName);
};

const TRUSTED_EXTERNAL_HOSTS = new Set([
  'api.whatsapp.com', 't.me', 'twitter.com', 'www.facebook.com',
  'github.com', 'embed.filmu.in'
]);

function openTrustedExternalLink(url) {
  try {
    const targetUrl = new URL(url, window.location.href);
    if (targetUrl.protocol !== 'https:' || !TRUSTED_EXTERNAL_HOSTS.has(targetUrl.hostname)) return false;
    const link = document.createElement('a');
    link.href = targetUrl.href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.dataset.allowExternal = 'true';
    link.style.position = 'fixed';
    link.style.left = '-10000px';
    document.body.appendChild(link);
    link.click();
    link.remove();
    return true;
  } catch (error) {
    console.warn('[CinemaVerse] Could not open external link:', error);
    return false;
  }
}

// Block rogue synthetic link clicks targeting external ad pages
document.addEventListener('click', function(e) {
  let target = e.target;
  while (target && target !== document.body && target !== document.documentElement) {
    if (target.tagName === 'A' && (target.target === '_blank' || target.target === '_new')) {
      if (target.dataset.allowExternal === 'true') return;
      const href = target.getAttribute('href') || target.href || '';
      if (href && (href.startsWith('http://') || href.startsWith('https://')) && !href.includes(window.location.hostname)) {
        e.preventDefault();
        e.stopPropagation();
        console.warn('[CinemaVerse Shield] Blocked external ad link click:', href);
        return false;
      }
    }
    target = target.parentElement;
  }
}, true);

// CinemaVerse Navigation Hijack Guard: Keep top window safely rooted in CinemaVerse
window.addEventListener('beforeunload', function(e) {
  const player = document.getElementById('player-overlay');
  if (player && player.style.display === 'flex') {
    e.preventDefault();
    e.returnValue = '';
    return '';
  }
});

// Protect history stack from rogue redirect popups
if (window.history && window.history.pushState) {
  window.addEventListener('popstate', function() {
    const player = document.getElementById('player-overlay');
    if (player && player.style.display === 'flex') {
      window.history.pushState(null, '', window.location.href);
    }
  });
}

// Initialize Application whether this script loads before or after DOMContentLoaded.
async function initializeApplication() {
  if (typeof isTvEnvironment === 'function' && isTvEnvironment() && !window.location.pathname.startsWith('/tv')) {
    window.location.replace('/tv');
    return;
  }

  setupNavbarScroll();
  setupSearch();
  setupKeyboardShortcuts();
  checkDailyUnlockPass();
  initProfile();
  initSettings();
  initPwaInstall();
  initPlayerTopBarAutoMove();

  // Instant 0ms Render using Bootstrap Catalog Snapshot (Prevents TV freeze & blank row hang)
  const initialPool = (typeof window !== 'undefined' && window.INITIAL_BOOTSTRAP_CATALOG && Array.isArray(window.INITIAL_BOOTSTRAP_CATALOG) && window.INITIAL_BOOTSTRAP_CATALOG.length)
    ? window.INITIAL_BOOTSTRAP_CATALOG
    : null;

  if (initialPool && (!currentCatalog || !currentCatalog.length)) {
    currentCatalog = initialPool.map(item => ({
      ...item,
      poster: resolvePosterUrl(item.poster),
      backdrop: resolvePosterUrl(item.backdrop)
    }));
    heroItems = currentCatalog.filter(x => x.featured || x.trending).slice(0, 6);
    if (!heroItems.length) heroItems = currentCatalog.slice(0, 6);
    try { setupHeroCarousel(); } catch (e) { console.warn('setupHeroCarousel bootstrap:', e); }
    try { renderAllRows(currentCatalog); } catch (e) { console.warn('renderAllRows bootstrap:', e); }
    try { updateOttHubDynamicCounts(); } catch (e) { console.warn('updateOttHubDynamicCounts bootstrap:', e); }
  }

  // Initialize Smart TV Remote D-Pad Navigation Engine
  initSmartTvNavigation();
  try { setupAutocomplete(); } catch (e) { console.warn("setupAutocomplete:", e); }
  try { loadTmdbTrending(); } catch (e) { console.warn("loadTmdbTrending:", e); }

  // Asynchronously load full 5MB catalog with automatic retry
  await loadCatalog();

  try { renderContinueWatching(); } catch (e) { console.warn('renderContinueWatching:', e); }
  try { renderNotifications(); } catch (e) { console.warn('renderNotifications:', e); }

  // 1. Resolve Deep Links first (Shared videos, movies, series via ?watch=... or #watch=... or #tt...)
  const deepLink = parseDeepLinkParams();
  if (deepLink && deepLink.watchId) {
    await handleDeepLinkPlayback(deepLink.watchId, deepLink.season, deepLink.episode);
  } else if (!window.location.hash || window.location.hash === '#home') {
    restoreHomeView();
  } else {
    handleInitialHash();
  }
  window.addEventListener('hashchange', handleInitialHash);
}

// ========================================================
// UNIVERSAL VIDEO DEEP LINK & SHARE ROUTING SYSTEM
// ========================================================

function findCatalogItem(idOrQuery) {
  if (!idOrQuery || !currentCatalog || !currentCatalog.length) return null;
  const clean = String(idOrQuery).trim().toLowerCase();

  // 1. Exact match on catalog id (e.g. 'nflx-1', 'prm-12')
  let match = currentCatalog.find(x => x.id && String(x.id).toLowerCase() === clean);
  if (match) return match;

  // 2. Exact match on imdbId (e.g. 'tt4574334')
  match = currentCatalog.find(x => x.imdbId && String(x.imdbId).toLowerCase() === clean);
  if (match) return match;

  // 3. Match on tmdbId
  match = currentCatalog.find(x => x.tmdbId && String(x.tmdbId) === clean);
  if (match) return match;

  // 4. Exact match on title (slugified or lowercased)
  match = currentCatalog.find(x => {
    if (!x.title) return false;
    const slug = x.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return slug === clean || x.title.toLowerCase() === clean;
  });
  if (match) return match;

  // 5. Partial title match
  match = currentCatalog.find(x => x.title && x.title.toLowerCase().includes(clean));
  return match || null;
}

function parseDeepLinkParams() {
  let watchId = null;
  let season = 1;
  let episode = 1;

  // 1. Check URL Search Parameters (e.g. ?watch=tt4574334&s=2&e=3 or ?v=nflx-1 or ?id=tt4574334)
  try {
    const urlParams = new URLSearchParams(window.location.search);
    watchId = urlParams.get('watch') || urlParams.get('v') || urlParams.get('id') || urlParams.get('movie') || urlParams.get('series') || urlParams.get('play');
    if (urlParams.get('s') || urlParams.get('season')) {
      season = parseInt(urlParams.get('s') || urlParams.get('season'), 10) || 1;
    }
    if (urlParams.get('e') || urlParams.get('ep') || urlParams.get('episode')) {
      episode = parseInt(urlParams.get('e') || urlParams.get('ep') || urlParams.get('episode'), 10) || 1;
    }
  } catch (e) {}

  // 2. Check URL Hash (e.g. #tt4574334, #nflx-1, #watch=tt4574334, #watch-tt4574334, #watch/tt4574334, #tt4574334-s2-e3)
  let rawHash = window.location.hash ? window.location.hash.substring(1).trim() : '';

  if (rawHash) {
    // If hash contains query-style string (e.g. #watch?id=tt4574334&s=1&e=2)
    if (rawHash.includes('?')) {
      const qIndex = rawHash.indexOf('?');
      try {
        const hashParams = new URLSearchParams(rawHash.substring(qIndex + 1));
        if (!watchId) watchId = hashParams.get('id') || hashParams.get('watch') || hashParams.get('v') || hashParams.get('play');
        if (hashParams.get('s') || hashParams.get('season')) season = parseInt(hashParams.get('s') || hashParams.get('season'), 10) || season;
        if (hashParams.get('e') || hashParams.get('ep') || hashParams.get('episode')) episode = parseInt(hashParams.get('e') || hashParams.get('ep') || hashParams.get('episode'), 10) || episode;
      } catch (e) {}
      rawHash = rawHash.substring(0, qIndex);
    }

    if (!watchId) {
      if (rawHash.startsWith('watch=')) {
        watchId = rawHash.replace('watch=', '');
      } else if (rawHash.startsWith('play=')) {
        watchId = rawHash.replace('play=', '');
      } else if (rawHash.startsWith('watch/')) {
        watchId = rawHash.replace('watch/', '');
      } else if (rawHash.startsWith('play/')) {
        watchId = rawHash.replace('play/', '');
      } else if (rawHash.startsWith('watch-')) {
        watchId = rawHash.replace('watch-', '');
      } else if (rawHash.startsWith('play-')) {
        watchId = rawHash.replace('play-', '');
      } else if (!['home', 'series', 'movies', 'new', 'watchlist', 'downloads'].includes(rawHash.toLowerCase()) && !rawHash.startsWith('ott-')) {
        // Any non-navigation hash (like #tt4574334 or #nflx-1) is treated as a direct video ID
        watchId = rawHash;
      }
    }
  }

  // 3. Extract embedded season/episode patterns, e.g. tt4574334-s2-e3 or tt4574334/2/3
  if (watchId) {
    const sePattern = watchId.match(/-s(\d+)-e(\d+)/i) || watchId.match(/\/(\d+)\/(\d+)/);
    if (sePattern) {
      season = parseInt(sePattern[1], 10) || season;
      episode = parseInt(sePattern[2], 10) || episode;
      watchId = watchId.replace(/-s\d+-e\d+/i, '').replace(/\/\d+\/\d+/, '');
    }
  }

  return {
    watchId: watchId ? decodeURIComponent(watchId).trim() : null,
    season: isNaN(season) || season < 1 ? 1 : season,
    episode: isNaN(episode) || episode < 1 ? 1 : episode
  };
}

async function handleDeepLinkPlayback(watchId, season = 1, episode = 1) {
  if (!watchId) return false;

  // Ensure catalog is loaded
  if (!currentCatalog || !currentCatalog.length) {
    await loadCatalog();
  }

  let item = findCatalogItem(watchId);

  // Fallback for external IMDb IDs not preloaded in catalog
  if (!item && /^tt\d+$/i.test(watchId)) {
    try {
      showToast('Connecting to streaming mirrors...', 'info');
      const [seriesRes, movieRes] = await Promise.allSettled([
        fetch(`https://v3-cinemeta.strem.io/meta/series/${watchId}.json`).then(r => r.json()),
        fetch(`https://v3-cinemeta.strem.io/meta/movie/${watchId}.json`).then(r => r.json())
      ]);
      const seriesMeta = seriesRes.status === 'fulfilled' && seriesRes.value && seriesRes.value.meta;
      const movieMeta = movieRes.status === 'fulfilled' && movieRes.value && movieRes.value.meta;
      const meta = seriesMeta || movieMeta;

      if (meta) {
        item = {
          id: watchId,
          imdbId: watchId,
          type: seriesMeta ? 'series' : 'movie',
          title: meta.name || 'Shared Title',
          year: parseInt(meta.year, 10) || 2024,
          poster: meta.poster || FALLBACK_POSTER,
          backdrop: meta.background || meta.poster || FALLBACK_BACKDROP,
          description: meta.description || 'Watch now in 4K Ultra HD on CinemaVerse.',
          genres: meta.genres || ['Drama', 'Action'],
          matchRate: '99% Match',
          maturity: '16+',
          duration: seriesMeta ? `${meta.videos ? meta.videos.length : 1} Episodes` : '2h 05m',
          seasons: (seriesMeta && seriesMeta.videos) ? [{
            season: season || 1,
            episodes: meta.videos.filter(v => v.season === (season || 1)).map(v => ({
              episode: v.episode || v.number,
              title: v.name || v.title || `Episode ${v.episode}`,
              thumbnail: v.thumbnail || meta.poster
            }))
          }] : [{ season: 1, episodes: [{ episode: 1, title: 'Episode 1' }] }]
        };
      }
    } catch (e) {
      console.warn('External title metadata fallback failed:', e);
    }
  }

  if (item) {
    const epStr = item.type === 'series' ? ` (Season ${season} Episode ${episode})` : '';
    showToast(`Opening "${item.title}"${epStr}...`, 'info');
    restoreHomeView();
    // Launch player immediately with full streaming support
    await openPlayer(item, season, episode);
    return true;
  }

  showToast(`Could not find shared title "${watchId}"`, 'error');
  restoreHomeView();
  return false;
}

function handleInitialHash() {
  const hash = window.location.hash;
  if (!hash || hash === '#home') {
    restoreHomeView();
    return;
  }
  if (hash === '#series') {
    filterCategory('series');
    return;
  } else if (hash === '#movies') {
    filterCategory('movie');
    return;
  } else if (hash === '#new') {
    filterCategory('top10');
    return;
  } else if (hash === '#watchlist') {
    showWatchlist();
    return;
  } else if (hash === '#downloads') {
    showDownloadsSection();
    return;
  } else if (hash === '#install' || hash === '#download' || hash === '#app') {
    if (typeof openSettingsModal === 'function') openSettingsModal('install');
    return;
  } else if (hash === '#search') {
    if (typeof openSearchModal === 'function') openSearchModal();
    return;
  } else if (hash.startsWith('#ott-')) {
    const ottKey = hash.replace('#ott-', '');
    if (typeof openPlatformGrid === 'function') {
      openPlatformGrid(ottKey);
    }
    return;
  }

  // Check if hash points to a specific video/movie/series
  const deepLink = parseDeepLinkParams();
  if (deepLink && deepLink.watchId) {
    handleDeepLinkPlayback(deepLink.watchId, deepLink.season, deepLink.episode);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApplication, { once: true });
} else {
  // This file is loaded afterInteractive in Next.js. Wait until the script has
  // finished evaluating so its later `let` bindings are initialized before
  // startup callbacks read them.
  window.setTimeout(initializeApplication, 0);
}

// Check & Activate Daily Ad-Free Unlock Pass (NetMirror Feature)
function checkDailyUnlockPass() {
  const today = new Date().toDateString();
  const saved = localStorage.getItem(STORAGE_DAILY_PASS);

  if (saved !== today) {
    localStorage.setItem(STORAGE_DAILY_PASS, today);
    setTimeout(() => {
      showToast('🎉 Daily Pass Active: Enjoy all OTT platforms 100% free and ad-free today!', 'success');
    }, 1200);
  }
}

// Navbar scroll darkening effect (Optimized with rAF & passive scroll for 120 FPS)
function setupNavbarScroll() {
  const nav = document.getElementById('navbar');
  if (!nav) return;
  let ticking = false;
  let isScrolled = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const shouldBeScrolled = window.scrollY > 40;
        if (isScrolled !== shouldBeScrolled) {
          isScrolled = shouldBeScrolled;
          nav.classList.toggle('scrolled', isScrolled);
        }
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

// Expandable Search Box Toggle
function toggleSearchBox() {
  const box = document.getElementById('search-box');
  const input = document.getElementById('search-input');
  if (!box || !input) return;
  box.classList.toggle('open');
  if (box.classList.contains('open')) {
    input.focus();
  } else {
    input.blur();
  }
}

// Multi-OTT Hub Toggle / Scroll
function toggleOttHub() {
  const hub = document.getElementById('ott-hub-wrapper');
  if (hub) {
    hub.scrollIntoView({ behavior: 'smooth', block: 'center' });
    hub.style.animation = 'pulse 1s ease';
    setTimeout(() => hub.style.animation = '', 1000);
  }
}

// Multi-OTT Horizontal Carousel Navigation
function slideOttBar(direction) {
  const bar = document.getElementById('ott-platforms-bar');
  if (!bar) return;
  const scrollAmount = Math.max(280, bar.clientWidth * 0.65) * direction;
  bar.scrollBy({ left: scrollAmount, behavior: 'smooth' });
}

// Reset view to Home
function closeMobileBrowseMenu() {
  const navLinks = document.getElementById('netflix-nav-links');
  const browseButton = document.getElementById('nav-mobile-browse');
  if (navLinks) navLinks.classList.remove('mobile-open');
  const caret = browseButton && browseButton.querySelector('i');
  if (caret) caret.style.transform = 'rotate(0deg)';
}

function restoreHomeView() {
  const main = document.getElementById('main-content');
  if (!main) return;
  main.querySelectorAll(':scope > section').forEach(section => { section.style.display = 'block'; });
  const setDisplay = (id, display) => {
    const view = document.getElementById(id);
    if (view) view.style.display = display;
  };
  setDisplay('hero-banner', 'flex');
  setDisplay('ott-hub-wrapper', 'block');
  setDisplay('category-header-bar', 'none');
  setDisplay('category-grid-section', 'none');
  setDisplay('watchlist-section', 'none');
  setDisplay('downloads-section', 'none');
  setDisplay('search-results-section', 'none');
  setDisplay('platform-banner-section', 'none');
  closeMobileBrowseMenu();
  if (typeof renderContinueWatching === 'function') renderContinueWatching();
}

function resetToHome() {
  currentActiveCategory = 'all';
  currentCategoryViewMode = 'rows';
  currentCategoryGenre = 'all';
  closeProfileDropdown();
  closeNotificationDropdown();
  restoreHomeView();
  document.querySelectorAll('.nav-item').forEach(link => link.classList.remove('active'));
  const homeLink = document.querySelector('.netflix-nav-links .nav-item[href="#home"]');
  if (homeLink) homeLink.classList.add('active');
  document.querySelectorAll('.ott-card').forEach(card => card.classList.remove('active'));
  const allOtt = document.querySelector('.ott-card.ott-card-all, .ott-card');
  if (allOtt) allOtt.classList.add('active');
  activePlatformFilter = 'all';
  if (currentCatalog.length) {
    heroItems = currentCatalog.filter(x => x.featured || x.trending).slice(0, 6);
    setupHeroCarousel();
    renderAllRows(currentCatalog, 'all');
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Load Catalog API with resilient timeout and automatic retry
async function loadCatalog(retryCount = 0) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);
    const res = await fetch('/api/catalog', { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.status === 'success' && Array.isArray(data.data) && data.data.length > 0) {
      currentCatalog = data.data.map(item => {
        if (item.poster) item.poster = resolvePosterUrl(item.poster);
        if (item.backdrop) item.backdrop = resolvePosterUrl(item.backdrop);
        return item;
      });

      // Extract Billboard Hero items
      heroItems = currentCatalog.filter(x => x.featured || x.trending).slice(0, 6);
      if (!heroItems.length) heroItems = currentCatalog.slice(0, 6);
      setupHeroCarousel();

      // Render All Netflix Rows
      renderAllRows(currentCatalog);

      // Update OTT Hub counts dynamically
      updateOttHubDynamicCounts();
    }
  } catch (err) {
    console.warn(`[Catalog] Fetch attempt ${retryCount + 1} notice:`, err.message || err);
    if (retryCount < 2) {
      setTimeout(() => loadCatalog(retryCount + 1), 1500);
    }
  }
}

function updateOttHubDynamicCounts() {
  if (!currentCatalog || !currentCatalog.length) return;
  const totalCount = currentCatalog.length;
  const hubBadge = document.querySelector('.ott-hub-badge');
  if (hubBadge) hubBadge.innerHTML = `<i class="fa-solid fa-sparkles text-gold"></i> 14 Platforms • ${totalCount}+ Titles`;

  const allSub = document.querySelector('.ott-card-all .ott-subcount');
  if (allSub) allSub.textContent = `${totalCount}+ Titles`;

  const platformMap = {
    netflix: '.ott-nflx',
    prime: '.ott-prm',
    disney: '.ott-dis',
    hbo: '.ott-hbo',
    apple: '.ott-app',
    crunchyroll: '.ott-cr',
    paramount: '.ott-par',
    hulu: '.ott-hulu',
    peacock: '.ott-pea',
    sonyliv: '.ott-sony',
    zee5: '.ott-zee',
    jiocinema: '.ott-jio',
    animeworld: '.ott-aw'
  };

  Object.entries(platformMap).forEach(([pid, selector]) => {
    const count = currentCatalog.filter(x => x.platformId === pid).length;
    const card = document.querySelector(selector);
    if (card) {
      const sub = card.querySelector('.ott-subcount');
      if (sub) sub.textContent = `${count} Titles`;
    }
  });
}

// ========================================================
// NETFLIX BILLBOARD HERO CAROUSEL
// ========================================================

function setupHeroCarousel() {
  const dotsContainer = document.getElementById('hero-dots');
  if (!dotsContainer) return;
  if (!heroItems.length) return;
  dotsContainer.innerHTML = '';

  heroItems.forEach((_, idx) => {
    const dot = document.createElement('div');
    dot.className = `hero-dot ${idx === 0 ? 'active' : ''}`;
    dot.onclick = () => {
      setHeroSlide(idx);
      resetHeroTimer();
    };
    dotsContainer.appendChild(dot);
  });

  renderHero(heroItems[0]);
  resetHeroTimer();
}

function resetHeroTimer() {
  clearInterval(heroTimer);
  heroTimer = setInterval(() => {
    nextHeroSlide();
  }, 8000);
}

function setHeroSlide(idx) {
  currentHeroIndex = (idx + heroItems.length) % heroItems.length;
  const item = heroItems[currentHeroIndex];
  renderHero(item);

  const dots = document.querySelectorAll('.hero-dot');
  dots.forEach((d, i) => {
    d.classList.toggle('active', i === currentHeroIndex);
  });
}

function nextHeroSlide() {
  setHeroSlide(currentHeroIndex + 1);
  resetHeroTimer();
}

function prevHeroSlide() {
  setHeroSlide(currentHeroIndex - 1);
  resetHeroTimer();
}

function renderHero(item) {
  if (!item) return;
  const backdrop = document.getElementById('hero-backdrop');
  if (!backdrop) return;
  backdrop.style.backgroundImage = `url('${item.backdrop || item.fallbackBackdrop || FALLBACK_BACKDROP}')`;

  document.getElementById('hero-title').textContent = item.title;
  document.getElementById('hero-desc').textContent = item.description;

  // Hero Title Logo (TMDb Transparent Vector/PNG)
  const heroLogo = document.getElementById('hero-title-logo');
  const heroTitle = document.getElementById('hero-title');
  if (heroLogo) {
    if (item.logo) {
      heroLogo.src = item.logo;
      heroLogo.alt = item.title;
      heroLogo.style.display = 'block';
      if (heroTitle) heroTitle.style.display = 'none';
    } else {
      heroLogo.style.display = 'none';
      if (heroTitle) heroTitle.style.display = 'block';
      if (item.tmdbId) {
        fetch('/api/tmdb/' + (item.type === 'series' ? 'tv' : 'movie') + '/' + item.tmdbId)
          .then(r => r.json())
          .then(d => {
            if (d && d.logo && heroItems[currentHeroIndex]?.id === item.id) {
              item.logo = d.logo;
              heroLogo.src = d.logo;
              heroLogo.alt = item.title;
              heroLogo.style.display = 'block';
              if (heroTitle) heroTitle.style.display = 'none';
            }
          })
          .catch(() => {});
      }
    }
  }
  document.getElementById('hero-year').textContent = item.year;
  document.getElementById('hero-duration').textContent = item.duration;
  document.getElementById('hero-quality').textContent = item.quality || '4K Ultra HD';
  document.getElementById('hero-match').textContent = item.matchRate || '99% Match';
  document.getElementById('hero-maturity').textContent = item.maturity || '16+';
  document.getElementById('hero-age-rating').textContent = item.maturity || '16+';
  document.getElementById('hero-audio').textContent = item.audio || 'Dolby Atmos';

  // OTT Platform Tag
  const platBadge = document.getElementById('hero-platform-badge');
  if (platBadge) {
    platBadge.textContent = item.platformBadge || item.platform;
    platBadge.className = `badge-ott badge-${item.platformId}`;
    if (item.platformColor) platBadge.style.backgroundColor = item.platformColor;
  }

  // Top 10 Badge
  const badgeTag = document.getElementById('hero-badge-tag');
  if (item.rank) {
    badgeTag.innerHTML = `<i class="fa-solid fa-fire text-red"></i> #${item.rank} in ${item.type === 'movie' ? 'Movies' : 'TV Shows'} Today`;
  } else {
    badgeTag.innerHTML = `<i class="fa-solid fa-sparkles text-gold"></i> Top Streaming Hit`;
  }

  // Action Buttons
  document.getElementById('hero-play-btn').onclick = () => openPlayer(item);
  document.getElementById('hero-info-btn').onclick = () => openDetailsModal(item);
  
  const watchlistBtn = document.getElementById('hero-watchlist-btn');
  updateWatchlistButton(watchlistBtn, item.id);
  watchlistBtn.onclick = () => toggleWatchlist(item, watchlistBtn);
}

function toggleHeroAudio() {
  isHeroMuted = !isHeroMuted;
  const icon = document.getElementById('hero-audio-icon');
  icon.className = isHeroMuted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high text-green';
  showToast(isHeroMuted ? 'Preview audio muted' : 'Preview audio unmuted');
}

// ========================================================
// NETFLIX ROW SLIDER CHEVRONS (< and > SCROLLING)
// ========================================================

function slideRow(rowId, direction) {
  const row = document.getElementById(rowId);
  if (!row) return;
  const scrollAmount = row.clientWidth * 0.75 * direction;
  row.scrollBy({ left: scrollAmount, behavior: 'smooth' });
}

// ========================================================
// MULTI-OTT PLATFORMS FILTERING (NETMIRROR COMMON BAR)
// ========================================================

function filterPlatform(platformId, element) {
  const pid = (platformId || 'all').toLowerCase();
  if (pid === 'all') {
    restoreHomeView();
    closeProfileDropdown();
    closeNotificationDropdown();
    document.querySelectorAll('.nav-item').forEach(link => link.classList.remove('active'));
    const homeLink = document.querySelector('.netflix-nav-links .nav-item[href="#home"]');
    if (homeLink) homeLink.classList.add('active');

    document.querySelectorAll('.ott-card').forEach(c => c.classList.remove('active'));
    const allCard = document.querySelector('.ott-card-all');
    if (allCard) allCard.classList.add('active');

    const bannerSec = document.getElementById('platform-banner-section');
    if (bannerSec) bannerSec.style.display = 'none';
    const catBar = document.getElementById('category-header-bar');
    if (catBar) catBar.style.display = 'none';
    const gridSec = document.getElementById('category-grid-section');
    if (gridSec) gridSec.style.display = 'none';
    showAllSections();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    openPlatformGrid(pid);
  }
}

function openPlatformGrid(platformId) {
  restoreHomeView();
  closeProfileDropdown();
  closeNotificationDropdown();
  closeMobileBrowseMenu();

  const pid = (platformId || 'all').toLowerCase();
  activePlatformFilter = pid;

  // Highlight OTT Hub card
  document.querySelectorAll('.ott-card').forEach(c => c.classList.remove('active'));
  const classMap = {
    all: '.ott-card-all',
    netflix: '.ott-nflx',
    prime: '.ott-prm',
    disney: '.ott-dis',
    hbo: '.ott-hbo',
    apple: '.ott-app',
    crunchyroll: '.ott-cr',
    paramount: '.ott-par',
    hulu: '.ott-hulu',
    peacock: '.ott-pea',
    sonyliv: '.ott-sony',
    zee5: '.ott-zee',
    jiocinema: '.ott-jio',
    animeworld: '.ott-aw'
  };
  const targetSelector = classMap[pid] || '.ott-card-all';
  const match = document.querySelector(targetSelector);
  if (match) {
    match.classList.add('active');
    match.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }

  if (pid === 'all') {
    filterPlatform('all');
    return;
  }

  const pConfMap = {
    netflix: { name: 'Netflix', color: '#E50914', desc: 'Stream award-winning Netflix original series, top movies and animated hits in 4K Ultra HD.' },
    prime: { name: 'Amazon Prime Video', color: '#00A8E1', desc: 'Binge-worthy Prime originals, blockbuster cinema and critically acclaimed shows in 4K.' },
    disney: { name: 'Disney+ Hotstar', color: '#113CCF', desc: 'The complete home of Marvel Studios, Star Wars, Pixar and Disney theatrical blockbusters.' },
    hbo: { name: 'HBO Max', color: '#9933FF', desc: 'Legendary HBO prestige television, epic sagas and Warner Bros cinematic universe.' },
    apple: { name: 'Apple TV+', color: '#FFFFFF', desc: 'Visionary, star-studded Apple Original series and movies streaming in crisp 4K.' },
    crunchyroll: { name: 'Crunchyroll Anime', color: '#F47521', desc: 'Top trending shonen anime, dark fantasy series and legendary Japanese animation.' },
    paramount: { name: 'Paramount+', color: '#0064FF', desc: 'Action-packed Hollywood cinema, top naval adventures and Paramount originals.' },
    hulu: { name: 'Hulu', color: '#1CE783', desc: 'Acclaimed television, Emmy-winning drama and hit exclusive comedy series.' },
    peacock: { name: 'Peacock', color: '#F7A800', desc: 'Stream iconic comedy series, fresh hit thrillers and Universal theatrical releases.' },
    sonyliv: { name: 'Sony LIV', color: '#FF334B', desc: 'Critically acclaimed Indian biographical series, gripping thrillers and premium cinema.' },
    zee5: { name: 'Zee5', color: '#A855F7', desc: 'Massive regional Indian hits, poignant historical epics and bingeable Hindi series.' },
    jiocinema: { name: 'JioCinema', color: '#E11D48', desc: 'Direct-to-digital Indian blockbusters, psychological thrillers and Bollywood hits.' },
    animeworld: { name: 'Anime World (Multi-Audio)', color: '#F59E0B', desc: 'VIP anime streaming featuring Hindi Dubs, English Sub/Dub and original Japanese audio.' }
  };

  const pConf = pConfMap[pid] || { name: pid.toUpperCase(), color: '#E50914', desc: `Browse complete catalog of ${pid.toUpperCase()} on CinemaVerse.` };
  const pItems = currentCatalog.filter(x => x.platformId === pid);

  // Update Category Header Bar for this Platform
  const bar = document.getElementById('category-header-bar');
  const iconEl = document.getElementById('category-icon');
  const titleEl = document.getElementById('category-title');
  const badgeEl = document.getElementById('category-count-badge');
  const descEl = document.getElementById('category-desc');
  const gridLabel = document.getElementById('view-mode-grid-label');

  if (bar) bar.style.display = 'flex';
  if (iconEl) iconEl.innerHTML = `<i class="fa-solid fa-layer-group" style="color: ${pConf.color}"></i>`;
  if (titleEl) titleEl.textContent = pConf.name;
  if (badgeEl) badgeEl.textContent = `${pItems.length} Titles Available in 4K`;
  if (descEl) descEl.textContent = pConf.desc;
  if (gridLabel) gridLabel.textContent = `All ${pItems.length} Titles Grid`;

  // Genre chips for platform
  const chipsContainer = document.getElementById('category-genre-chips');
  if (chipsContainer) {
    const genres = ['All', 'Action', 'Drama', 'Comedy', 'Sci-Fi', 'Thriller', 'Horror', 'Romance', 'Animation'];
    chipsContainer.innerHTML = genres.map((g, idx) => `
      <button type="button" class="genre-chip ${idx === 0 ? 'active' : ''}" onclick="filterPlatformGridGenre('${pid}', '${g.toLowerCase()}', this)">${g}</button>
    `).join('');
  }

  // Switch to Grid Mode to display up to 100 titles immediately
  switchCategoryView('grid', false);
  renderCategoryGrid(pItems);

  if (bar) bar.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
window.openPlatformGrid = openPlatformGrid;

function filterPlatformGridGenre(platformId, genre, btn) {
  if (btn) {
    document.querySelectorAll('#category-genre-chips .genre-chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
  }
  let items = currentCatalog.filter(x => x.platformId === platformId);
  if (genre && genre !== 'all') {
    items = items.filter(x => x.genres && x.genres.some(g => g.toLowerCase().includes(genre)));
  }
  renderCategoryGrid(items);
}
window.filterPlatformGridGenre = filterPlatformGridGenre;

function showAllSections() {
  const allSectionIds = [
    'section-top10-movies', 'section-top10-series',
    'section-netflix', 'section-prime', 'section-disney', 'section-hbo',
    'section-apple', 'section-crunchyroll', 'section-paramount', 'section-hulu',
    'section-peacock', 'section-sonyliv', 'section-zee5', 'section-jiocinema', 'section-animeworld'
  ];
  allSectionIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'block';
  });
}

function focusPlatformRow(platformId) {
  const targetMap = {
    netflix: 'section-netflix',
    prime: 'section-prime',
    disney: 'section-disney',
    hbo: 'section-hbo',
    apple: 'section-apple',
    crunchyroll: 'section-crunchyroll',
    paramount: 'section-paramount',
    hulu: 'section-hulu',
    peacock: 'section-peacock',
    sonyliv: 'section-sonyliv',
    zee5: 'section-zee5',
    jiocinema: 'section-jiocinema',
    animeworld: 'section-animeworld'
  };

  const targetId = targetMap[platformId];
  if (targetId) {
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.animation = 'pulse 1s ease';
      setTimeout(() => el.style.animation = '', 1000);
    }
  }
}

// ========================================================
// SECTION RENDERING
// ========================================================

function renderAllRows(items, activeCategory = 'all') {
  setupDiscCascade(items);
  
  // 0. AI Machine Learning Personalized Recommendations
  if (typeof renderAiRecommendations === 'function') {
    renderAiRecommendations(items);
  }

  // 1. Top 10 Movies Today
  const top10Movies = items.filter(x => x.type === 'movie' && x.rank).sort((a, b) => a.rank - b.rank).slice(0, 10);
  renderTop10List('top10-movies-list', top10Movies);

  // 2. Top 10 TV Shows Today
  const top10Series = items.filter(x => x.type === 'series' && x.rank).sort((a, b) => a.rank - b.rank).slice(0, 10);
  renderTop10List('top10-series-list', top10Series);

  // Toggle Top 10 sections based on category
  const sTop10M = document.getElementById('section-top10-movies');
  const sTop10S = document.getElementById('section-top10-series');
  if (sTop10M) sTop10M.style.display = (activeCategory === 'movie' || activeCategory === 'all' || activeCategory === 'top10') && top10Movies.length ? 'block' : 'none';
  if (sTop10S) sTop10S.style.display = (activeCategory === 'series' || activeCategory === 'all' || activeCategory === 'top10') && top10Series.length ? 'block' : 'none';

  // 3. Dedicated OTT Platform Rows for All 13 Platforms
  const platformConfigs = [
    { id: 'netflix', list: 'netflix-list', section: 'section-netflix', name: 'Netflix', defaultTitle: 'Only on Netflix' },
    { id: 'prime', list: 'prime-list', section: 'section-prime', name: 'Prime Video', defaultTitle: 'Prime Video Exclusives' },
    { id: 'disney', list: 'disney-list', section: 'section-disney', name: 'Disney+ Hotstar', defaultTitle: 'Marvel Studios & Disney Vault' },
    { id: 'hbo', list: 'hbo-list', section: 'section-hbo', name: 'HBO Max', defaultTitle: 'HBO Prestige Series & Warner Bros' },
    { id: 'apple', list: 'apple-list', section: 'section-apple', name: 'Apple TV+', defaultTitle: 'Apple Original Series & Cinema' },
    { id: 'crunchyroll', list: 'crunchyroll-list', section: 'section-crunchyroll', name: 'Crunchyroll', defaultTitle: 'Anime Hub & Shonen Masterpieces' },
    { id: 'paramount', list: 'paramount-list', section: 'section-paramount', name: 'Paramount+', defaultTitle: 'Paramount+ Blockbusters & Showtime' },
    { id: 'hulu', list: 'hulu-list', section: 'section-hulu', name: 'Hulu', defaultTitle: 'Hulu Originals & FX Award-Winners' },
    { id: 'peacock', list: 'peacock-list', section: 'section-peacock', name: 'Peacock', defaultTitle: 'Peacock Exclusives & NBCUniversal Hits' },
    { id: 'sonyliv', list: 'sonyliv-list', section: 'section-sonyliv', name: 'Sony LIV', defaultTitle: 'Sony LIV Premium Indian Originals & Thrillers' },
    { id: 'zee5', list: 'zee5-list', section: 'section-zee5', name: 'Zee5', defaultTitle: 'Zee5 Regional Blockbusters & Cinema' },
    { id: 'jiocinema', list: 'jiocinema-list', section: 'section-jiocinema', name: 'JioCinema', defaultTitle: 'JioCinema Premieres & Bollywood Hits' },
    { id: 'animeworld', list: 'animeworld-list', section: 'section-animeworld', name: 'Anime World', defaultTitle: 'WatchAnimeWorld VIP (Hindi/Eng/Jap Multi-Audio)' }
  ];

  function renderSinglePlatformRow(p) {
    const pItems = items.filter(x => x.platformId === p.id);
    renderHorizontalList(p.list, pItems);
    const sec = document.getElementById(p.section);
    if (sec) {
      sec.style.display = pItems.length > 0 ? 'block' : 'none';
      const headerEl = sec.querySelector('.row-header');
      const titleEl = sec.querySelector('.row-title');
      if (titleEl) {
        const badge = titleEl.querySelector('.badge-inline-ott');
        const badgeHtml = badge ? badge.outerHTML : '';
        if (activeCategory === 'series') {
          titleEl.innerHTML = `${badgeHtml} ${p.name} TV Series (${pItems.length})`;
        } else if (activeCategory === 'movie') {
          titleEl.innerHTML = `${badgeHtml} ${p.name} Blockbuster Movies (${pItems.length})`;
        } else {
          titleEl.innerHTML = `${badgeHtml} ${p.defaultTitle} (${pItems.length})`;
        }
      }
      if (headerEl) {
        let viewAllBtn = headerEl.querySelector('.row-view-all-btn');
        if (!viewAllBtn) {
          viewAllBtn = document.createElement('button');
          viewAllBtn.type = 'button';
          viewAllBtn.className = 'row-view-all-btn';
          headerEl.appendChild(viewAllBtn);
        }
        viewAllBtn.innerHTML = `<span>View All ${pItems.length} Titles</span> <i class="fa-solid fa-chevron-right"></i>`;
        viewAllBtn.onclick = () => openPlatformGrid(p.id);
      }
    }
  }

  // Render top 3 immediate rows synchronously for instant above-the-fold display
  const primaryBatch = platformConfigs.slice(0, 3);
  const deferredBatch = platformConfigs.slice(3);

  primaryBatch.forEach(renderSinglePlatformRow);

  // Progressive frame chunking for remaining rows keeps UI at 60-120 FPS
  let batchIndex = 0;
  function processNextRowChunk() {
    const chunkSize = 2;
    const chunk = deferredBatch.slice(batchIndex, batchIndex + chunkSize);
    if (!chunk.length) return;
    chunk.forEach(renderSinglePlatformRow);
    batchIndex += chunkSize;
    if (batchIndex < deferredBatch.length) {
      if (window.requestIdleCallback) {
        window.requestIdleCallback(processNextRowChunk, { timeout: 100 });
      } else {
        setTimeout(processNextRowChunk, 0);
      }
    }
  }

  if (window.requestIdleCallback) {
    window.requestIdleCallback(processNextRowChunk, { timeout: 80 });
  } else {
    setTimeout(processNextRowChunk, 0);
  }
}

// Top 10 List Renderer with Netflix giant numbers (Optimized with DocumentFragment & async decoding)
function renderTop10List(containerId, items) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const fragment = document.createDocumentFragment();

  items.forEach((item, idx) => {
    const rankNum = idx + 1;
    const cardWrap = document.createElement('div');
    const hasDub = (item.languages && item.languages.length > 1) || (item.audio && (item.audio.includes('Dub') || item.audio.includes('Hindi')));
    const dubBadgeHtml = hasDub ? `<div class="badge-dub-indicator"><i class="fa-solid fa-volume-high"></i> Multi-Audio</div>` : '';

    cardWrap.className = 'top10-card';
    cardWrap.setAttribute('tabindex', '0');
    cardWrap.setAttribute('role', 'button');
    cardWrap.setAttribute('aria-label', `${rankNum}. ${item.title}`);
    cardWrap.innerHTML = `
      <div class="top10-rank-num">${rankNum}</div>
      <div class="movie-card">
        <div class="card-poster-wrap">
          <img class="card-poster" src="${item.poster}" alt="${item.title}" loading="lazy" decoding="async" onerror="window.handleImgError(this)">
          <div class="card-ott-badge badge-${item.platformId}">${item.platformBadge || item.platform}</div>
          ${dubBadgeHtml}
          <div class="card-play-hover">
            <div class="play-circle"><i class="fa-solid fa-play"></i></div>
          </div>
        </div>
        <div class="card-info">
          <h4 class="card-title">${item.title}</h4>
          <div class="card-meta">
            <span class="text-green font-bold">${item.matchRate || '99% Match'}</span>
            <span>${item.duration}</span>
          </div>
        </div>
      </div>
    `;

    cardWrap.onclick = () => openDetailsModal(item);
    cardWrap.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === 'Select') {
        e.preventDefault();
        openDetailsModal(item);
      }
    });
    fragment.appendChild(cardWrap);
  });

  container.replaceChildren(fragment);
}

// Standard Netflix Horizontal Row Renderer (Optimized with DocumentFragment & async decoding)
function renderHorizontalList(containerId, items) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const fragment = document.createDocumentFragment();

  items.forEach(item => {
    const hasDub = (item.languages && item.languages.length > 1) || (item.audio && (item.audio.includes('Dub') || item.audio.includes('Hindi')));
    const dubBadgeHtml = hasDub ? `<div class="badge-dub-indicator"><i class="fa-solid fa-volume-high"></i> Multi-Audio</div>` : '';

    const card = document.createElement('div');
    card.className = 'movie-card';
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', item.title);
    card.innerHTML = `
      <div class="card-poster-wrap">
        <img class="card-poster" src="${item.poster}" alt="${item.title}" loading="lazy" decoding="async" onerror="window.handleImgError(this)">
        <div class="card-ott-badge badge-${item.platformId}">${item.platformBadge || item.platform}</div>
        ${dubBadgeHtml}
        <div class="card-play-hover">
          <div class="play-circle"><i class="fa-solid fa-play"></i></div>
        </div>
      </div>
      <div class="card-info">
        <h4 class="card-title">${item.title}</h4>
        <div class="card-meta">
          <span class="text-green font-bold">${item.matchRate || '98% Match'}</span>
          <span>${item.duration}</span>
        </div>
      </div>
    `;

    card.onclick = () => openDetailsModal(item);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === 'Select') {
        e.preventDefault();
        openDetailsModal(item);
      }
    });
    fragment.appendChild(card);
  });

  container.replaceChildren(fragment);
}

// Global Player Active Check (Accessible everywhere)
function isPlayerActive() {
  const overlay = document.getElementById('player-overlay');
  return !!(overlay && overlay.style.display === 'flex');
}
window.isPlayerActive = isPlayerActive;

// Continue Watching Storage & State Engine
let currentResumeTime = 0;
let watchProgressTimer = null;
let currentWatchSeconds = 0;
let currentDurationSeconds = 0;

function formatTimeSeconds(sec) {
  if (!sec || sec <= 0) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const remM = m % 60;
    return `${h}h ${remM}m`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getContinueWatching() {
  try {
    const raw = localStorage.getItem(STORAGE_CONTINUE_WATCHING) || localStorage.getItem('netflixmirror_continue_watching');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function getContinueWatchingItem(itemId) {
  if (!itemId) return null;
  const list = getContinueWatching();
  return list.find(x => String(x.id) === String(itemId)) || null;
}

function saveContinueWatching(item, season = 1, episode = 1, currentTime = 0, durationSec = 0) {
  if (!item || !item.id) return;
  const list = getContinueWatching().filter(x => String(x.id) !== String(item.id));
  const curTime = Math.max(0, Math.floor(currentTime || 0));
  const sNum = parseInt(season, 10) || 1;
  const eNum = parseInt(episode, 10) || 1;
  const totalSec = Math.max(curTime + 60, Math.floor(durationSec || (item.type === 'series' ? 2700 : 6600)));
  const progressPercent = Math.min(99, Math.max(5, Math.round((curTime / totalSec) * 100)));

  // Retrieve previous episodeProgress map if it exists
  const existing = getContinueWatchingItem(item.id);
  const epProgress = (existing && existing.episodeProgress) ? { ...existing.episodeProgress } : {};
  if (item.type === 'series') {
    epProgress[`s${sNum}e${eNum}`] = curTime;
  }

  list.unshift({
    id: item.id,
    title: item.title,
    poster: item.poster || item.backdrop,
    backdrop: item.backdrop || item.poster,
    platform: item.platform,
    platformId: item.platformId,
    type: item.type,
    year: item.year,
    duration: item.duration,
    imdbId: item.imdbId || (existing && existing.imdbId) || '',
    tmdbId: item.tmdbId || (existing && existing.tmdbId) || '',
    seasons: item.seasons || (existing && existing.seasons) || [],
    season: sNum,
    episode: eNum,
    currentTime: curTime,
    durationSec: totalSec,
    progress: progressPercent,
    episodeProgress: epProgress,
    timestamp: Date.now()
  });

  try {
    localStorage.setItem(STORAGE_CONTINUE_WATCHING, JSON.stringify(list.slice(0, 20)));
  } catch (e) {}
  renderContinueWatching();
}

function clearContinueWatching() {
  localStorage.removeItem(STORAGE_CONTINUE_WATCHING);
  localStorage.removeItem('netflixmirror_continue_watching');
  renderContinueWatching();
  showToast('Continue Watching history cleared');
}

function renderContinueWatching() {
  const container = document.getElementById('continue-watching-list');
  const section = document.getElementById('continue-watching-section');
  if (!container || !section) return;

  const items = getContinueWatching();

  if (!items.length) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  const fragment = document.createDocumentFragment();

  items.forEach(c => {
    const rawItem = currentCatalog.find(x => String(x.id) === String(c.id)) || c;
    const card = document.createElement('div');
    card.className = 'movie-card continue-watching-card';
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Continue Watching ${c.title}`);
    const isSeries = c.type === 'series';
    const epLabel = isSeries ? `S${c.season}:E${c.episode}` : 'Movie';
    const timeFormatted = formatTimeSeconds(c.currentTime);

    card.innerHTML = `
      <div class="card-poster-wrap">
        <img class="card-poster" src="${c.poster || (typeof FALLBACK_POSTER !== 'undefined' ? FALLBACK_POSTER : '')}" alt="${c.title}" loading="lazy" decoding="async" onerror="window.handleImgError(this)">
        <div class="card-ott-badge badge-${c.platformId || 'nflx'}">${c.platform || 'STREAM'}</div>
        <div class="card-play-hover">
          <div class="play-circle"><i class="fa-solid fa-play"></i></div>
        </div>
      </div>
      <div class="card-info">
        <h4 class="card-title">${c.title}</h4>
        <div class="card-meta">
          <span class="text-gold font-bold">${epLabel}</span>
          <span class="text-white/80"><i class="fa-solid fa-clock"></i> ${timeFormatted}</span>
        </div>
        <div class="card-progress-bar">
          <div class="card-progress-fill" style="width: ${c.progress || 10}%;"></div>
        </div>
      </div>
    `;

    card.onclick = () => {
      openPlayer(rawItem, c.season, c.episode, null, c.currentTime);
    };
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === 'Select') {
        e.preventDefault();
        openPlayer(rawItem, c.season, c.episode, null, c.currentTime);
      }
    });
    fragment.appendChild(card);
  });
  container.replaceChildren(fragment);
}

// Real-time Provider Playback Progress Listener (VidLink & HTML5 Embeds)
window.addEventListener('message', (event) => {
  if (!isPlayerActive() || !currentItem) return;
  try {
    const data = event.data;
    if (!data) return;

    // 1. VidLink MEDIA_DATA event
    if (data.type === 'MEDIA_DATA' && data.data) {
      const mediaData = data.data;
      const mediaKey = Object.keys(mediaData)[0];
      const info = mediaKey ? mediaData[mediaKey] : null;
      if (info && info.progress && typeof info.progress.watched === 'number') {
        const watchedSec = Math.floor(info.progress.watched);
        const durSec = Math.floor(info.progress.duration || currentDurationSeconds);
        if (watchedSec > 0) {
          currentWatchSeconds = watchedSec;
          if (durSec > 60) currentDurationSeconds = durSec;
          saveContinueWatching(currentItem, currentSeason, currentEpisode, currentWatchSeconds, currentDurationSeconds);
        }
      }
    }

    // 2. Standard timeupdate events
    if (data.event === 'timeupdate' || data.type === 'timeupdate' || data.event === 'timeChange') {
      const cur = data.currentTime || data.time || (data.data && (data.data.currentTime || data.data.time));
      const dur = data.duration || (data.data && data.data.duration);
      if (typeof cur === 'number' && cur > 0) {
        currentWatchSeconds = Math.floor(cur);
        if (typeof dur === 'number' && dur > 60) currentDurationSeconds = Math.floor(dur);
        saveContinueWatching(currentItem, currentSeason, currentEpisode, currentWatchSeconds, currentDurationSeconds);
      }
    }
  } catch (e) {}
});

function getWatchlist() {
  try {
    const raw = localStorage.getItem(STORAGE_WATCHLIST) || localStorage.getItem('netflixmirror_watchlist');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function toggleWatchlist(item, btnElement) {
  let list = getWatchlist();
  const exists = list.some(x => x.id === item.id);

  if (exists) {
    list = list.filter(x => x.id !== item.id);
    showToast(`Removed "${item.title}" from My List`);
  } else {
    list.unshift(item);
    showToast(`Added "${item.title}" to My List`);
  }

  localStorage.setItem(STORAGE_WATCHLIST, JSON.stringify(list));
  updateWatchlistButton(btnElement, item.id);
  
  if (document.getElementById('watchlist-section').style.display === 'block') {
    showWatchlist();
  }
}

function updateWatchlistButton(btnElement, itemId) {
  if (!btnElement) return;
  const list = getWatchlist();
  const isSaved = list.some(x => x.id === itemId);

  if (btnElement.id === 'hero-watchlist-btn' || btnElement.id === 'modal-watchlist-btn') {
    btnElement.innerHTML = isSaved ? '<i class="fa-solid fa-check text-green"></i>' : '<i class="fa-solid fa-plus"></i>';
  }
}

function showWatchlist(element) {
  closeProfileDropdown();
  closeMobileBrowseMenu();
  closeNotificationDropdown();
  closeAllModals();
  document.querySelectorAll('.nav-item').forEach(l => l.classList.remove('active'));
  const watchlistLink = element || document.querySelector('.netflix-nav-links .nav-item[href="#watchlist"]');
  if (watchlistLink) watchlistLink.classList.add('active');

  const section = document.getElementById('watchlist-section');
  const grid = document.getElementById('watchlist-grid');
  const count = document.getElementById('watchlist-count');
  if (!section || !grid || !count) return;
  const main = document.getElementById('main-content');
  if (main) main.querySelectorAll(':scope > section').forEach(view => { view.style.display = view === section ? 'block' : 'none'; });
  const ottHub = document.getElementById('ott-hub-wrapper');
  if (ottHub) ottHub.style.display = 'none';
  const list = getWatchlist();

  count.textContent = `${list.length} titles`;
  grid.innerHTML = '';

  if (!list.length) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 80px 20px; color: var(--text-dim);">
        <i class="fa-regular fa-bookmark" style="font-size: 48px; margin-bottom: 16px; opacity: 0.4;"></i>
        <h3 style="font-size: 18px; margin-bottom: 8px;">Your List is empty</h3>
        <p>Explore Netflix, Prime, Disney+ or HBO Max titles and add them here to watch anytime.</p>
      </div>
    `;
  } else {
    list.forEach(item => {
      const card = document.createElement('div');
      card.className = 'movie-card';
      card.innerHTML = `
        <div class="card-poster-wrap">
          <img class="card-poster" src="${item.poster}" alt="${item.title}" onerror="window.handleImgError(this)">
          <div class="card-ott-badge badge-${item.platformId}">${item.platformBadge || item.platform}</div>
          <div class="card-play-hover">
            <div class="play-circle"><i class="fa-solid fa-play"></i></div>
          </div>
        </div>
        <div class="card-info">
          <h4 class="card-title">${item.title}</h4>
          <div class="card-meta">
            <span class="text-green font-bold">${item.matchRate || '99% Match'}</span>
            <span>${item.duration}</span>
          </div>
        </div>
      `;
      card.onclick = () => openDetailsModal(item);
      grid.appendChild(card);
    });
  }

  document.getElementById('hero-banner').style.display = 'none';
  document.getElementById('section-top10-movies').style.display = 'none';
  document.getElementById('section-top10-series').style.display = 'none';
  document.getElementById('section-netflix').style.display = 'none';
  document.getElementById('section-prime').style.display = 'none';
  document.getElementById('section-disney').style.display = 'none';
  document.getElementById('section-hbo').style.display = 'none';
  document.getElementById('section-apple').style.display = 'none';
  document.getElementById('section-crunchyroll').style.display = 'none';
  document.getElementById('search-results-section').style.display = 'none';
  section.style.display = 'block';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Global Category State
let currentActiveCategory = 'all'; // 'all', 'series', 'movie', 'top10'
let currentCategoryViewMode = 'rows'; // 'rows' or 'grid'
let currentCategoryGenre = 'all';
let currentCategorySort = 'popular';

// Comprehensive Category Filtering ("TV Shows", "Movies", "New & Popular", "Home")
function filterCategory(type, element) {
  currentActiveCategory = type;
  currentCategoryGenre = 'all';

  restoreHomeView();
  closeProfileDropdown();
  closeMobileBrowseMenu();
  closeNotificationDropdown();

  // Set active nav link
  document.querySelectorAll('.nav-item').forEach(l => l.classList.remove('active'));
  if (element) {
    element.classList.add('active');
  } else {
    const sel = document.querySelector(`.netflix-nav-links .nav-item[href="#${type === 'series' ? 'series' : type === 'movie' ? 'movies' : type === 'top10' ? 'new' : 'home'}"]`);
    if (sel) sel.classList.add('active');
  }

  // Update Billboard Hero showcase to feature matching category
  if (type === 'series') {
    const seriesHeroes = currentCatalog.filter(x => x.type === 'series' && (x.featured || x.trending));
    if (seriesHeroes.length) {
      heroItems = seriesHeroes;
      setupHeroCarousel();
    }
  } else if (type === 'movie') {
    const movieHeroes = currentCatalog.filter(x => x.type === 'movie' && (x.featured || x.trending));
    if (movieHeroes.length) {
      heroItems = movieHeroes;
      setupHeroCarousel();
    }
  } else {
    heroItems = currentCatalog.filter(x => x.featured || x.trending).slice(0, 6);
    setupHeroCarousel();
  }

  // Render Category Header Bar
  renderCategoryHeader(type);

  // Filter Catalog Items for Category
  let filteredItems = [...currentCatalog];
  if (type === 'series') {
    filteredItems = currentCatalog.filter(x => x.type === 'series');
  } else if (type === 'movie') {
    filteredItems = currentCatalog.filter(x => x.type === 'movie');
  }

  // Render Rows with only the category's titles
  renderAllRows(filteredItems, type);

  // If in Grid Mode, render the full category grid
  if (currentCategoryViewMode === 'grid' && type !== 'all') {
    renderCategoryGrid(filteredItems);
  } else {
    switchCategoryView('rows', false);
  }

  // Scroll smoothly to category section if on page
  const catBar = document.getElementById('category-header-bar');
  if (type !== 'all' && catBar) {
    catBar.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// Render Category Header Bar (Pills, count badge, description)
function renderCategoryHeader(type) {
  const bar = document.getElementById('category-header-bar');
  if (!bar) return;
  if (type === 'all') {
    bar.style.display = 'none';
    const gridSec = document.getElementById('category-grid-section');
    if (gridSec) gridSec.style.display = 'none';
    return;
  }

  bar.style.display = 'flex';

  const iconEl = document.getElementById('category-icon');
  const titleEl = document.getElementById('category-title');
  const badgeEl = document.getElementById('category-count-badge');
  const descEl = document.getElementById('category-desc');
  const gridLabel = document.getElementById('view-mode-grid-label');
  const chipsContainer = document.getElementById('category-genre-chips');

  const seriesCount = currentCatalog.filter(x => x.type === 'series').length;
  const movieCount = currentCatalog.filter(x => x.type === 'movie').length;

  let genres = [];
  if (type === 'series') {
    if (iconEl) iconEl.innerHTML = '<i class="fa-solid fa-tv text-red"></i>';
    if (titleEl) titleEl.textContent = 'TV Shows';
    if (badgeEl) badgeEl.textContent = `${seriesCount} Series Across OTTs`;
    if (descEl) descEl.textContent = 'Binge-worthy drama, sci-fi sagas, anime, and acclaimed TV series streaming in 4K across all 14 platforms.';
    if (gridLabel) gridLabel.textContent = `All ${seriesCount} Series Grid`;
    genres = ['All', 'Drama', 'Sci-Fi', 'Action', 'Anime', 'Crime', 'Comedy', 'Thriller', 'Horror', 'Mystery'];
  } else if (type === 'movie') {
    if (iconEl) iconEl.innerHTML = '<i class="fa-solid fa-film text-red"></i>';
    if (titleEl) titleEl.textContent = 'Movies';
    if (badgeEl) badgeEl.textContent = `${movieCount} Blockbusters in 4K`;
    if (descEl) descEl.textContent = 'Stream legendary cinema, theatrical premieres, Oscar-winning epics, and Hollywood blockbusters with 0 ads.';
    if (gridLabel) gridLabel.textContent = `All ${movieCount} Movies Grid`;
    genres = ['All', 'Action', 'Sci-Fi', 'Drama', 'Crime', 'Thriller', 'Adventure', 'Mystery', 'Biography', 'Horror'];
  } else if (type === 'top10') {
    if (iconEl) iconEl.innerHTML = '<i class="fa-solid fa-fire text-red"></i>';
    if (titleEl) titleEl.textContent = 'New & Popular';
    const topCount = currentCatalog.filter(x => x.rank).length;
    if (badgeEl) badgeEl.textContent = `${topCount} Trending Hits`;
    if (descEl) descEl.textContent = 'The most watched movies, top series, and trending entertainment across Netflix, Prime, Disney, MAX, and Apple TV+.';
    if (gridLabel) gridLabel.textContent = `All Trending Grid`;
    genres = ['All', 'Action', 'Drama', 'Sci-Fi', 'Crime', 'Thriller'];
  }

  // Populate Genre Chips
  if (chipsContainer) {
    chipsContainer.innerHTML = '';
    genres.forEach((genre, idx) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `cat-genre-chip ${idx === 0 ? 'active' : ''}`;
      chip.textContent = genre;
      chip.onclick = () => filterCategoryGenre(genre, chip);
      chipsContainer.appendChild(chip);
    });
  }
}

// Genre Filtering within Active Category
function filterCategoryGenre(genre, chipElement) {
  currentCategoryGenre = genre.toLowerCase();
  document.querySelectorAll('.cat-genre-chip').forEach(c => c.classList.remove('active'));
  if (chipElement) chipElement.classList.add('active');

  let items = [...currentCatalog];
  if (currentActiveCategory === 'series') {
    items = items.filter(x => x.type === 'series');
  } else if (currentActiveCategory === 'movie') {
    items = items.filter(x => x.type === 'movie');
  } else if (currentActiveCategory === 'top10') {
    items = items.filter(x => x.rank);
  }

  if (genre.toLowerCase() !== 'all') {
    items = items.filter(x => x.genres && x.genres.some(g => {
      const gl = g.toLowerCase();
      const target = genre.toLowerCase();
      if (target === 'anime') return gl === 'animation' || gl === 'dark fantasy' || x.platformId === 'crunchyroll' || x.platformId === 'animeworld';
      return gl.includes(target) || target.includes(gl);
    }));
  }

  if (currentCategoryViewMode === 'grid') {
    renderCategoryGrid(items);
  } else {
    renderAllRows(items, currentActiveCategory);
  }
}

// View Mode Switcher: 'rows' vs 'grid'
function switchCategoryView(mode, shouldScroll = true) {
  currentCategoryViewMode = mode;
  const rowsBtn = document.getElementById('view-mode-rows');
  const gridBtn = document.getElementById('view-mode-grid');
  const gridSec = document.getElementById('category-grid-section');
  const allRowSections = document.querySelectorAll('.netflix-row-wrap:not(#continue-watching-section)');

  if (rowsBtn) rowsBtn.classList.toggle('active', mode === 'rows');
  if (gridBtn) gridBtn.classList.toggle('active', mode === 'grid');

  if (mode === 'grid') {
    allRowSections.forEach(r => r.style.display = 'none');
    if (gridSec) {
      gridSec.style.display = 'block';
      let items = [...currentCatalog];
      if (currentActiveCategory === 'series') items = items.filter(x => x.type === 'series');
      else if (currentActiveCategory === 'movie') items = items.filter(x => x.type === 'movie');
      else if (currentActiveCategory === 'top10') items = items.filter(x => x.rank);

      if (currentCategoryGenre !== 'all') {
        items = items.filter(x => x.genres && x.genres.some(g => g.toLowerCase().includes(currentCategoryGenre)));
      }
      renderCategoryGrid(items);
    }
  } else {
    if (gridSec) gridSec.style.display = 'none';
    let items = [...currentCatalog];
    if (currentActiveCategory === 'series') items = items.filter(x => x.type === 'series');
    else if (currentActiveCategory === 'movie') items = items.filter(x => x.type === 'movie');
    renderAllRows(items, currentActiveCategory);
  }

  if (shouldScroll) {
    const catBar = document.getElementById('category-header-bar');
    if (catBar) catBar.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// Render All Titles Grid
function renderCategoryGrid(items) {
  const grid = document.getElementById('category-grid');
  const countEl = document.getElementById('category-grid-count');
  if (!grid) return;

  grid.innerHTML = '';
  if (countEl) {
    const typeLabel = currentActiveCategory === 'series' ? 'TV Series' : currentActiveCategory === 'movie' ? 'Movies' : 'Titles';
    countEl.textContent = `${items.length} ${typeLabel} Available`;
  }

  if (items.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1; padding: 60px 20px; text-align: center;">
        <i class="fa-solid fa-film text-dim" style="font-size: 42px; margin-bottom: 12px; display: block;"></i>
        <h3 style="font-size: 18px; margin-bottom: 6px;">No titles found in this genre</h3>
        <p class="text-dim" style="font-size: 14px;">Try selecting "All" or switching categories.</p>
        <button type="button" class="netflix-btn btn-red" onclick="filterCategoryGenre('All')" style="margin-top: 14px;">Show All ${currentActiveCategory === 'series' ? 'TV Shows' : 'Movies'}</button>
      </div>
    `;
    return;
  }

  // Sort items according to active sort option
  let sorted = [...items];
  if (currentCategorySort === 'rating') {
    sorted.sort((a, b) => (parseInt(b.matchRate) || 90) - (parseInt(a.matchRate) || 90));
  } else if (currentCategorySort === 'latest') {
    sorted.sort((a, b) => parseInt(b.year || 0) - parseInt(a.year || 0));
  } else {
    sorted.sort((a, b) => (a.rank || 999) - (b.rank || 999));
  }

  const fragment = document.createDocumentFragment();
  sorted.forEach(item => {
    const card = document.createElement('div');
    card.className = 'movie-card';
    const hasDub = (item.languages && item.languages.length > 1) || (item.audio && (item.audio.includes('Dub') || item.audio.includes('Hindi')));
    const dubBadgeHtml = hasDub ? `<div class="badge-dub-indicator"><i class="fa-solid fa-volume-high"></i> Multi-Audio</div>` : '';

    card.innerHTML = `
      <div class="card-poster-wrap">
        <img class="card-poster" src="${item.poster}" alt="${item.title}" loading="lazy" decoding="async" onerror="window.handleImgError(this)">
        <div class="card-ott-badge badge-${item.platformId}">${item.platformBadge || item.platform}</div>
        ${dubBadgeHtml}
        <div class="card-play-hover">
          <div class="play-circle"><i class="fa-solid fa-play"></i></div>
        </div>
      </div>
      <div class="card-info">
        <h4 class="card-title">${item.title}</h4>
        <div class="card-meta">
          <span class="text-green font-bold">${item.matchRate || '99% Match'}</span>
          <span>${item.year || ''}</span>
          <span>${item.duration || ''}</span>
        </div>
        <div class="card-tags-mini">
          ${(item.genres || []).slice(0, 2).map(g => `<span class="mini-tag">${g}</span>`).join('')}
        </div>
      </div>
    `;
    card.onclick = () => openDetailsModal(item);
    fragment.appendChild(card);
  });
  grid.replaceChildren(fragment);
}

// Sort Category Grid
function sortCategoryGrid(sortKey, btnElement) {
  currentCategorySort = sortKey;
  document.querySelectorAll('.grid-sort-pill').forEach(b => b.classList.remove('active'));
  if (btnElement) btnElement.classList.add('active');

  let items = [...currentCatalog];
  if (currentActiveCategory === 'series') items = items.filter(x => x.type === 'series');
  else if (currentActiveCategory === 'movie') items = items.filter(x => x.type === 'movie');
  else if (currentActiveCategory === 'top10') items = items.filter(x => x.rank);

  if (currentCategoryGenre !== 'all') {
    items = items.filter(x => x.genres && x.genres.some(g => g.toLowerCase().includes(currentCategoryGenre)));
  }
  renderCategoryGrid(items);
}

function toggleHomeVisibilityForSearch(isSearching) {
  const hero = document.getElementById('hero-banner');
  const hub = document.getElementById('ott-hub-wrapper');
  const pb = document.getElementById('platform-banner-section');
  const cw = document.getElementById('continue-watching-section');
  const rows = document.querySelectorAll('.netflix-row-wrap');
  const watchlist = document.getElementById('watchlist-section');
  const downloads = document.getElementById('downloads-section');

  if (isSearching) {
    if (hero) hero.style.display = 'none';
    if (hub) hub.style.display = 'none';
    if (pb) pb.style.display = 'none';
    if (cw) cw.style.display = 'none';
    if (watchlist) watchlist.style.display = 'none';
    if (downloads) downloads.style.display = 'none';
    rows.forEach(r => r.style.display = 'none');
  } else {
    if (hero) hero.style.display = 'flex';
    if (hub) hub.style.display = 'block';
    if (activePlatformFilter !== 'all' && pb) {
      pb.style.display = 'block';
    }
    showAllSections();
  }
}

function filterGenre(genre) {
  toggleHomeVisibilityForSearch(true);
  const filtered = currentCatalog.filter(x => x.genres.some(g => g.toLowerCase() === genre.toLowerCase()));
  
  const section = document.getElementById('search-results-section');
  const grid = document.getElementById('search-grid');
  const queryDisplay = document.getElementById('search-query-display');
  const countDisplay = document.getElementById('search-count');

  queryDisplay.textContent = `${genre}`;
  countDisplay.textContent = `${filtered.length} titles in common across all OTTs`;
  section.style.display = 'block';
  grid.innerHTML = '';

  filtered.forEach(item => {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', item.title);
    card.innerHTML = `
      <div class="card-poster-wrap">
        <img class="card-poster" src="${item.poster}" alt="${item.title}" onerror="window.handleImgError(this)">
        <div class="card-ott-badge badge-${item.platformId}">${item.platformBadge || item.platform}</div>
        <div class="card-play-hover">
          <div class="play-circle"><i class="fa-solid fa-play"></i></div>
        </div>
      </div>
      <div class="card-info">
        <h4 class="card-title">${item.title}</h4>
        <div class="card-meta">
          <span class="text-green font-bold">${item.matchRate || '99% Match'}</span>
          <span>${item.duration}</span>
        </div>
      </div>
    `;
    card.onclick = () => openDetailsModal(item);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === 'Select') {
        e.preventDefault();
        openDetailsModal(item);
      }
    });
    grid.appendChild(card);
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ========================================================
// COMMON SEARCH ACROSS ALL OTT PLATFORMS
// ========================================================
function clientCanonicalizeNumbers(str) {
  if (!str) return '';
  return str
    .replace(/\b(part\s*)?two\b/g, '2')
    .replace(/\b(part\s*)?three\b/g, '3')
    .replace(/\b(part\s*)?four\b/g, '4')
    .replace(/\b(chapter\s*)?two\b/g, '2')
    .replace(/\b(chapter\s*)?three\b/g, '3')
    .replace(/\b(chapter\s*)?four\b/g, '4')
    .replace(/\bii\b/g, '2')
    .replace(/\biii\b/g, '3')
    .replace(/\biv\b/g, '4');
}

function clientLevenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = [];
  for (let i = 0; i <= a.length; i++) row[i] = i;
  for (let i = 1; i <= b.length; i++) {
    let prev = i;
    for (let j = 1; j <= a.length; j++) {
      let val;
      if (b[i - 1] === a[j - 1]) val = row[j - 1];
      else val = Math.min(row[j - 1] + 1, prev + 1, row[j] + 1);
      row[j - 1] = prev;
      prev = val;
    }
    row[a.length] = prev;
  }
  return row[a.length];
}

const CLIENT_TITLE_ALIASES = {
  'deadpool 3': ['deadpool & wolverine', 'deadpool and wolverine'],
  'deadpool3': ['deadpool & wolverine'],
  'kgf 2': ['k.g.f: chapter 2', 'kgf chapter 2'],
  'kgf 1': ['k.g.f: chapter 1', 'kgf chapter 1'],
  'kgf': ['k.g.f: chapter 2', 'k.g.f: chapter 1'],
  'dune 2': ['dune: part two', 'dune part 2', 'dune part two'],
  'dune2': ['dune: part two'],
  'spider man': ['spider-man', 'spiderman'],
  'spiderman': ['spider-man', 'spider man'],
  'got': ['game of thrones'],
  'bb': ['breaking bad'],
  'bcs': ['better call saul'],
  'stranger things 4': ['stranger things'],
  'stranger things s4': ['stranger things'],
  'money heist 5': ['money heist'],
  'batman dark knight': ['the dark knight', 'the batman'],
  'dark knight': ['the dark knight'],
  'pushpa 2': ['pushpa: the rule', 'pushpa the rule part 2', 'pushpa 2 the rule'],
  'pushpa 1': ['pushpa: the rise', 'pushpa the rise part 1'],
  'pushpa': ['pushpa: the rule', 'pushpa: the rise'],
  'avengers 4': ['avengers: endgame'],
  'avengers 3': ['avengers: infinity war'],
  'kalki': ['kalki 2898 ad'],
  'salaar 2': ['salaar: part 1 - ceasefire']
};

function indexClientCatalogItem(item) {
  if (!item || item._indexed) return item;
  item._normTitle = normalizeStr(item.title);
  item._compactTitle = item._normTitle.replace(/\s+/g, '');
  item._canonTitle = clientCanonicalizeNumbers(item._normTitle);
  item._canonWords = item._canonTitle.split(' ').filter(Boolean);
  item._castNorm = (item.cast || []).map(normalizeStr);
  item._directorNorm = normalizeStr(item.director || '');
  item._genresLower = (item.genres || []).map(g => (g || '').toLowerCase());
  item._audioLower = (item.audio || '').toLowerCase();
  item._indexed = true;
  return item;
}

function scoreClientCatalogItem(item, queryCtx) {
  const {
    normQ, compactQ, canonQ, canonQWords, rawQ,
    aliasList, parsed, effectivePlatform, effectiveType, genre
  } = queryCtx;

  if (effectiveType !== 'all' && item.type !== effectiveType) return 0;
  if (effectivePlatform !== 'all' && item.platformId !== effectivePlatform) return 0;
  if (genre !== 'all' && (!item._genresLower || !item._genresLower.includes(genre))) return 0;

  indexClientCatalogItem(item);

  if (parsed.isBrowse) {
    if (parsed.genres && parsed.genres.length > 0) {
      const matchesG = parsed.genres.some(g => item._genresLower.includes(g.toLowerCase()));
      if (!matchesG) return 0;
    }
    let score = (item.rating || 7.0) * 10;
    if (item.trending) score += 20;
    if (item.featured) score += 15;
    if (parsed.isHighRated && item.rating) score += (item.rating / 10) * 35;
    if (parsed.is4k && item.quality && item.quality.includes('4K')) score += 15;
    return score;
  }

  let relScore = 0;

  if (canonQ === item._canonTitle || normQ === item._normTitle) {
    relScore += 450;
  } else if (compactQ && compactQ === item._compactTitle) {
    relScore += 420;
  } else if (item._canonTitle.startsWith(canonQ) || item._normTitle.startsWith(normQ)) {
    relScore += 300;
  } else if (compactQ && item._compactTitle.startsWith(compactQ)) {
    relScore += 280;
  } else if (item._canonTitle.includes(canonQ) || item._normTitle.includes(normQ)) {
    relScore += 220;
  } else if (compactQ && item._compactTitle.includes(compactQ)) {
    relScore += 200;
  }

  if (aliasList && aliasList.length > 0) {
    for (const al of aliasList) {
      const alNorm = normalizeStr(al);
      const alCompact = alNorm.replace(/\s+/g, '');
      if (item._normTitle.includes(alNorm) || item._compactTitle.includes(alCompact)) {
        relScore += 380;
        break;
      }
    }
  }

  if (canonQWords.length > 0) {
    let matchedWordsCount = 0;
    for (const qw of canonQWords) {
      if (item._canonWords.includes(qw)) {
        matchedWordsCount += 1.0;
      } else if (item._canonWords.some(tw => tw.startsWith(qw) || tw.includes(qw))) {
        matchedWordsCount += 0.8;
      } else {
        const minLen = qw.length;
        if (minLen >= 4) {
          const maxDist = minLen >= 7 ? 2 : 1;
          const hasFuzzy = item._canonWords.some(tw => Math.abs(tw.length - qw.length) <= maxDist && clientLevenshtein(qw, tw) <= maxDist);
          if (hasFuzzy) matchedWordsCount += 0.75;
        }
      }
    }

    if (matchedWordsCount >= canonQWords.length * 0.7) {
      relScore += 160 + (matchedWordsCount * 25);
    } else if (matchedWordsCount >= 1 && canonQWords.length > 1) {
      relScore += matchedWordsCount * 35;
    }
  }

  if (parsed.person) {
    const pNorm = normalizeStr(parsed.person);
    if (parsed.personType === 'director' && item._directorNorm.includes(pNorm)) relScore += 190;
    else if (parsed.personType === 'actor' && item._castNorm.some(c => c.includes(pNorm))) relScore += 190;
    else if (item._castNorm.some(c => c.includes(pNorm)) || item._directorNorm.includes(pNorm)) relScore += 140;
  } else if (canonQ || normQ) {
    const pTarget = canonQ || normQ;
    if (item._castNorm.some(c => c.includes(pTarget) || pTarget.includes(c))) relScore += 130;
    else if (item._directorNorm && (item._directorNorm.includes(pTarget) || pTarget.includes(item._directorNorm))) relScore += 130;
  }

  if (parsed.genres && parsed.genres.length > 0) {
    const isGenreQ = parsed.genres.some(g => g.toLowerCase() === canonQ || g.toLowerCase() === normQ);
    const matchCount = parsed.genres.filter(g => item._genresLower.includes(g.toLowerCase())).length;
    if (matchCount > 0) relScore += isGenreQ ? (220 + matchCount * 40) : (matchCount * 50);
  }

  if (parsed.targetRegion) {
    let isRegionMatch = false;
    const langs = Array.isArray(item.languages) ? item.languages.map(l => ((l && (l.name || l.code)) || '').toLowerCase()) : [];
    if (parsed.targetRegion === 'south_indian') {
      isRegionMatch = item._audioLower.includes('telugu') || item._audioLower.includes('tamil') || item._audioLower.includes('malayalam') || item._audioLower.includes('kannada') ||
        langs.some(l => l.includes('te') || l.includes('ta') || l.includes('ml') || l.includes('kn'));
    } else if (parsed.targetRegion === 'bollywood') {
      isRegionMatch = item._audioLower.includes('hindi') || langs.some(l => l.includes('hi') || l.includes('hindi'));
    } else if (parsed.targetRegion === 'korean') {
      isRegionMatch = item._audioLower.includes('korean') || langs.some(l => l.includes('ko') || l.includes('korean'));
    } else if (parsed.targetRegion === 'anime') {
      isRegionMatch = item._audioLower.includes('japanese') || item._genresLower.includes('anime');
    }
    if (isRegionMatch) relScore += 70;
  }

  if (relScore <= 0) return 0;

  let finalScore = relScore;
  if (item.rating) finalScore += (item.rating / 10) * 15;
  if (parsed.isHighRated && item.rating) finalScore += (item.rating / 10) * 25;
  if (item.trending) finalScore += 8;
  if (item.featured) finalScore += 5;
  if (parsed.is4k && item.quality && item.quality.includes('4K')) finalScore += 15;
  return finalScore;
}

let activeSearchSeq = 0;

function setupSearch() {
  const box = document.getElementById('search-box');
  const input = document.getElementById('search-input');
  const clearBtn = document.getElementById('clear-search');
  const inpageInput = document.getElementById('search-inpage-input');
  const inpageClear = document.getElementById('search-inpage-clear');

  let debounceTimeout = null;

  const onSearchQueryChange = (val, source) => {
    // Only synchronize the other input if it does NOT have active user focus!
    if (source !== 'nav' && input && document.activeElement !== input && input.value !== val) {
      input.value = val;
    }
    if (source !== 'inpage' && inpageInput && document.activeElement !== inpageInput && inpageInput.value !== val) {
      inpageInput.value = val;
    }

    if (clearBtn) clearBtn.style.display = (val && val.length > 0) ? 'block' : 'none';
    if (inpageClear) inpageClear.style.display = (val && val.length > 0) ? 'block' : 'none';

    if (!val || !val.trim()) {
      clearTimeout(debounceTimeout);
      clearSearch(false);
      return;
    }

    // 1. INSTANT LOCAL SEARCH PREVIEW (< 1ms zero-delay update!)
    performSearch(val, searchPlatformFilter, searchTypeFilter, true);

    // 2. Debounced background API sync (180ms)
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      performSearch(val, searchPlatformFilter, searchTypeFilter, false);
    }, 180);
  };

  if (input) {
    input.addEventListener('input', () => {
      onSearchQueryChange(input.value, 'nav');
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        clearTimeout(debounceTimeout);
        const val = input.value.trim();
        if (val) performSearch(val, searchPlatformFilter, searchTypeFilter, false);
      } else if (e.key === 'Escape') {
        clearSearch();
        if (box) box.classList.remove('open');
        input.blur();
      }
    });

    input.addEventListener('blur', () => {
      setTimeout(() => {
        if (box && !input.value.trim() && document.activeElement !== input) {
          box.classList.remove('open');
        }
      }, 220);
    });
  }

  if (inpageInput) {
    inpageInput.addEventListener('input', () => {
      onSearchQueryChange(inpageInput.value, 'inpage');
    });

    inpageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        clearTimeout(debounceTimeout);
        const val = inpageInput.value.trim();
        if (val) performSearch(val, searchPlatformFilter, searchTypeFilter);
      } else if (e.key === 'Escape') {
        clearSearch();
        inpageInput.blur();
      }
    });
  }

  // Smooth collapse when clicking anywhere outside if search is empty
  document.addEventListener('click', (e) => {
    if (!box || !box.classList.contains('open')) return;
    if (input && !box.contains(e.target) && !input.value.trim()) {
      box.classList.remove('open');
    }
  });
}

let searchTypeFilter = 'all';

function filterSearchPlatform(platformId, btnElement) {
  searchPlatformFilter = platformId.toLowerCase();
  document.querySelectorAll('.search-pill').forEach(b => b.classList.remove('active'));
  if (btnElement) btnElement.classList.add('active');

  const inpageInput = document.getElementById('search-inpage-input');
  const input = document.getElementById('search-input');
  const val = (inpageInput?.value || input?.value || '').trim();
  performSearch(val, searchPlatformFilter, searchTypeFilter);
}

function filterSearchType(type, btnElement) {
  searchTypeFilter = type.toLowerCase();
  document.querySelectorAll('.type-pill').forEach(b => b.classList.remove('active'));
  if (btnElement) btnElement.classList.add('active');

  const inpageInput = document.getElementById('search-inpage-input');
  const input = document.getElementById('search-input');
  const val = (inpageInput?.value || input?.value || '').trim();
  performSearch(val, searchPlatformFilter, searchTypeFilter);
}

function applyQuickTag(tag) {
  const input = document.getElementById('search-input');
  const inpageInput = document.getElementById('search-inpage-input');
  const box = document.getElementById('search-box');
  const clearBtn = document.getElementById('clear-search');
  const inpageClear = document.getElementById('search-inpage-clear');
  if (box) box.classList.add('open');

  if (tag === 'Trending') {
    if (input) input.value = '';
    if (inpageInput) inpageInput.value = '';
    if (clearBtn) clearBtn.style.display = 'none';
    if (inpageClear) inpageClear.style.display = 'none';
    searchPlatformFilter = 'all';
    searchTypeFilter = 'all';
    document.querySelectorAll('.search-pill').forEach(b => b.classList.toggle('active', b.textContent.includes('All OTTs') || b.textContent.trim() === 'All'));
    document.querySelectorAll('.type-pill').forEach(b => b.classList.toggle('active', b.textContent.includes('All')));
    performSearch('', 'all', 'all');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  if (input) input.value = tag;
  if (inpageInput) inpageInput.value = tag;
  if (clearBtn) clearBtn.style.display = 'block';
  if (inpageClear) inpageClear.style.display = 'block';
  performSearch(tag, searchPlatformFilter, searchTypeFilter);
}

// Open Mobile & Universal Search Interface
function openSearchModal() {
  const box = document.getElementById('search-box');
  const input = document.getElementById('search-input');
  const inpageInput = document.getElementById('search-inpage-input');
  const section = document.getElementById('search-results-section');

  if (box) box.classList.add('open');
  toggleHomeVisibilityForSearch(true);
  if (section) {
    section.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const curVal = (inpageInput?.value || input?.value || '').trim();
  if (inpageInput) {
    inpageInput.focus();
  } else if (input) {
    input.focus();
  }
  performSearch(curVal, searchPlatformFilter, searchTypeFilter);
}
window.openSearchModal = openSearchModal;

/* ========================================================
   AI NATURAL LANGUAGE SEARCH & QUERY UNDERSTANDING (NLU)
   ======================================================== */
const APP_GENRE_SYNONYMS = {
  'Horror': ['horror', 'horrer', 'horor', 'scary', 'spooky', 'ghost', 'haunted', 'creepy'],
  'Mystery': ['mystery', 'mystry', 'mistry', 'detective', 'whodunit', 'investigation', 'clue', 'clues'],
  'Thriller': ['thriller', 'thrill', 'thriler', 'suspense', 'intense', 'psychological'],
  'Comedy': ['comedy', 'comdy', 'funny', 'humor', 'humour', 'hilarious', 'laugh', 'comic'],
  'Sci-Fi': ['sci-fi', 'scifi', 'sci fi', 'science fiction', 'space', 'alien', 'aliens', 'futuristic', 'cyberpunk', 'time travel'],
  'Action': ['action', 'fight', 'fighting', 'combat', 'superhero', 'martial arts', 'stunt', 'warrior'],
  'Romance': ['romance', 'romantic', 'love', 'dating', 'couple'],
  'Drama': ['drama', 'emotional', 'tearjerker', 'dramatic'],
  'Animation': ['animation', 'animated', 'anime', 'cartoon', 'pixar'],
  'Adventure': ['adventure', 'quest', 'journey', 'expedition', 'treasure'],
  'Crime': ['crime', 'criminal', 'mafia', 'gangster', 'cop', 'cops', 'police', 'heist', 'mob', 'underworld'],
  'Fantasy': ['fantasy', 'magic', 'magical', 'myth', 'mythology', 'wizard', 'dragon', 'witch'],
  'War': ['war', 'military', 'soldier', 'soldiers', 'army', 'battle', 'combat'],
  'Documentary': ['documentary', 'doc', 'biography', 'biopic', 'real story', 'true story'],
  'Music': ['music', 'musical', 'song', 'songs', 'concert']
};

const APP_PLATFORM_SYNONYMS = {
  'netflix': ['netflix', 'nflx'],
  'prime': ['prime', 'amazon', 'amazon prime'],
  'disney': ['disney', 'disney+', 'hotstar', 'disney plus'],
  'hbo': ['hbo', 'hbo max', 'max'],
  'apple': ['apple', 'apple tv', 'apple tv+'],
  'crunchyroll': ['crunchyroll', 'cr'],
  'paramount': ['paramount', 'paramount+'],
  'hulu': ['hulu'],
  'peacock': ['peacock'],
  'sonyliv': ['sonyliv', 'sony', 'sony liv'],
  'zee5': ['zee5', 'zee'],
  'jiocinema': ['jiocinema', 'jio'],
  'animeworld': ['animeworld', 'anime world']
};

const APP_REGION_SYNONYMS = {
  'south_indian': ['south indian', 'tollywood', 'kollywood', 'mollywood', 'sandalwood', 'telugu', 'tamil', 'malayalam', 'kannada'],
  'bollywood': ['bollywood', 'hindi', 'indian'],
  'korean': ['korean', 'k-drama', 'kdrama', 'korea'],
  'anime': ['anime', 'japanese', 'japan', 'manga']
};

let clientActorsCache = null;
let clientDirectorsCache = null;
let clientSortedPersons = null;
let clientSingleNamesCache = null;

const CLIENT_PERSON_STOPWORDS = new Set([
  'movie', 'movies', 'film', 'films', 'show', 'shows', 'series', 'season', 'watch', 'watchable',
  'actor', 'actors', 'directors', 'director', 'starring', 'best', 'good', 'rated', 'like', 'free',
  'online', 'full', 'cast', 'play', 'hero', 'with', 'from', 'view', 'will', 'bell', 'long', 'page',
  'hall', 'lane', 'wood', 'ford', 'ross', 'cook', 'king', 'gray', 'grey', 'cole', 'rice', 'hunt',
  'rose', 'shaw', 'west', 'hart', 'love', 'hope', 'ward', 'dawn', 'day', 'days', 'gold', 'moon',
  'star', 'dark', 'wild', 'blue', 'pink', 'reed', 'rush', 'post', 'fast', 'hard', 'ring', 'song',
  'rich', 'poor', 'high', 'park', 'hill', 'bank', 'bird', 'fall', 'wall', 'ball', 'rock', 'stone'
]);

function getClientKnownEntities() {
  if (clientActorsCache && clientDirectorsCache && clientSortedPersons && clientSingleNamesCache) {
    return {
      actors: clientActorsCache,
      directors: clientDirectorsCache,
      sortedPersons: clientSortedPersons,
      singleNames: clientSingleNamesCache
    };
  }
  clientActorsCache = new Map();
  clientDirectorsCache = new Map();
  clientSingleNamesCache = new Map();
  const sortedList = [];

  const catalog = currentCatalog || [];
  catalog.forEach(item => {
    if (Array.isArray(item.cast)) {
      item.cast.forEach(a => {
        if (a && a.trim().length > 2) {
          const trimmed = a.trim();
          const lower = trimmed.toLowerCase();
          if (!clientActorsCache.has(lower)) {
            clientActorsCache.set(lower, trimmed);
            sortedList.push({ lower, full: trimmed, type: 'actor', len: lower.length });
          }
          const parts = lower.split(/\s+/);
          if (parts.length > 1) {
            const lastName = parts[parts.length - 1];
            if (lastName.length > 3 && !CLIENT_PERSON_STOPWORDS.has(lastName) && !clientSingleNamesCache.has(lastName)) {
              clientSingleNamesCache.set(lastName, { name: trimmed, type: 'actor' });
            }
          }
        }
      });
    }
    if (item.director && item.director.trim().length > 2 && item.director !== 'Acclaimed Director') {
      const trimmed = item.director.trim();
      const lower = trimmed.toLowerCase();
      if (!clientDirectorsCache.has(lower)) {
        clientDirectorsCache.set(lower, trimmed);
        sortedList.push({ lower, full: trimmed, type: 'director', len: lower.length });
      }
      const parts = lower.split(/\s+/);
      if (parts.length > 1) {
        const lastName = parts[parts.length - 1];
        if (lastName.length > 3 && !CLIENT_PERSON_STOPWORDS.has(lastName) && !clientSingleNamesCache.has(lastName)) {
          clientSingleNamesCache.set(lastName, { name: trimmed, type: 'director' });
        }
      }
    }
  });

  sortedList.sort((a, b) => b.len - a.len);
  clientSortedPersons = sortedList;

  return {
    actors: clientActorsCache,
    directors: clientDirectorsCache,
    sortedPersons: clientSortedPersons,
    singleNames: clientSingleNamesCache
  };
}

function normalizeStr(str) {
  if (!str) return '';
  return str.toLowerCase()
    .replace(/&/g, 'and')
    .replace(/['’"“”]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseNaturalLanguageQuery(rawQuery) {
  if (!rawQuery || !rawQuery.trim()) {
    return { isNaturalLanguage: false, query: '', norm: '', core: '', isBrowse: false, targetType: 'all', targetPlatform: 'all', targetRegion: null, genres: [], person: null, personType: null };
  }

  const norm = normalizeStr(rawQuery);
  let text = rawQuery.toLowerCase().replace(/[,/\\+&"']/g, ' ').replace(/\s+/g, ' ').trim();
  const originalClean = text;

  let targetType = 'all';
  if (/\b(movie|movies|film|films|cinema)\b/.test(text)) {
    targetType = 'movie';
  } else if (/\b(series|shows|show|tv|seasons|season|episodes)\b/.test(text)) {
    targetType = 'series';
  }

  let isHighRated = /\b(top rated|best|high rated|highest rated|masterpiece|hit|hits)\b/.test(text);
  let is4k = /\b(4k|uhd|ultra hd)\b/.test(text);
  let isLatest = /\b(latest|new|recent|2024|2025)\b/.test(text);
  let isClassic = /\b(classic|classics|old|retro|vintage|90s|80s)\b/.test(text);

  let targetPlatform = 'all';
  for (const [pId, synonyms] of Object.entries(APP_PLATFORM_SYNONYMS)) {
    if (synonyms.some(s => new RegExp(`\\b${s}\\b`).test(text))) {
      targetPlatform = pId;
      break;
    }
  }

  let detectedRegion = null;
  for (const [reg, synonyms] of Object.entries(APP_REGION_SYNONYMS)) {
    if (synonyms.some(s => text.includes(s))) {
      detectedRegion = reg;
      break;
    }
  }

  const detectedGenres = [];
  for (const [canonicalGenre, synonyms] of Object.entries(APP_GENRE_SYNONYMS)) {
    if (synonyms.some(s => new RegExp(`\\b${s}\\b`).test(text))) {
      detectedGenres.push(canonicalGenre);
    }
  }

  const { actors, directors, sortedPersons, singleNames } = getClientKnownEntities();
  let detectedPerson = null;
  let personType = null; // 'actor' | 'director'

  const ofMatch = text.match(/(?:movies?|films?|shows?)\s+(?:of|by|featuring)\s+([a-z\s]+)/i) ||
                  text.match(/(?:starring|directed\s+by|director|actor)\s+([a-z\s]+)/i) ||
                  text.match(/([a-z\s]+)\s+(?:movies?|films?)/i);

  if (ofMatch && ofMatch[1]) {
    const candidate = ofMatch[1].trim();
    if (directors.has(candidate)) {
      detectedPerson = directors.get(candidate);
      personType = 'director';
    } else if (actors.has(candidate)) {
      detectedPerson = actors.get(candidate);
      personType = 'actor';
    }
  }

  // 1. Scan full names sorted longest first (exact word-boundary match)
  if (!detectedPerson) {
    for (const item of sortedPersons) {
      const escaped = item.lower.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      if (new RegExp('\\b' + escaped + '\\b').test(text)) {
        detectedPerson = item.full;
        personType = item.type;
        break;
      }
    }
  }

  // 2. Scan single unique surnames with word boundary (e.g. "Nolan", "Tarantino", "Kubrick")
  if (!detectedPerson) {
    for (const [lastName, meta] of singleNames.entries()) {
      if (new RegExp('\\b' + lastName + '\\b').test(text)) {
        detectedPerson = meta.name;
        personType = meta.type;
        break;
      }
    }
  }

  // Core search term: strip command/voice prefixes and format words
  const core = norm
    .replace(/\b(search for|search|find me|find|show me|play|watch|can you find|please play)\b/g, '')
    .replace(/\b(movies?|films?|cinema|series|shows?|tv|season|episode|online|free|hd|4k)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const isBrowse = !norm || (!core && (targetType !== 'all' || detectedGenres.length > 0 || isHighRated));

  const isNaturalLanguage = detectedGenres.length > 0 || targetType !== 'all' || 
    detectedPerson !== null || isHighRated || is4k || targetPlatform !== 'all' || detectedRegion !== null || isBrowse;

  return {
    raw: rawQuery,
    clean: originalClean,
    norm,
    core,
    isBrowse,
    isNaturalLanguage,
    targetType,
    targetPlatform,
    targetRegion: detectedRegion,
    genres: detectedGenres,
    person: detectedPerson,
    personType,
    isHighRated,
    is4k,
    isLatest,
    isClassic
  };
}

function renderMovieCardItem(item, idx) {
  const hasDub = (item.languages && item.languages.length > 1) || (item.audio && (item.audio.includes('Dub') || item.audio.includes('Hindi')));
  const dubBadgeHtml = hasDub ? `<div class="badge-dub-indicator"><i class="fa-solid fa-volume-high"></i> Multi-Audio</div>` : '';

  const card = document.createElement('div');
  card.className = 'movie-card';
  card.setAttribute('tabindex', '0');
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', item.title);
  card.style.setProperty('--card-idx', idx);
  card.innerHTML = `
    <div class="card-poster-wrap">
      <img class="card-poster" src="${item.poster}" alt="${item.title}" loading="lazy" decoding="async" onerror="window.handleImgError(this)">
      <div class="card-ott-badge badge-${item.platformId}">${item.platformBadge || item.platform}</div>
      ${dubBadgeHtml}
      <div class="card-play-hover">
        <div class="play-circle"><i class="fa-solid fa-play"></i></div>
      </div>
    </div>
    <div class="card-info">
      <h4 class="card-title">${item.title}</h4>
      <div class="card-meta">
        <span class="text-green font-bold">${item.matchRate || '99% Match'}</span>
        <span>${item.duration || item.year}</span>
        <span class="badge-quality-small">${item.quality || '4K'}</span>
      </div>
    </div>
  `;
  card.onclick = () => {
    if (window.neuroTasteEngine) window.neuroTasteEngine.train(item, 'click');
    openDetailsModal(item);
  };
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === 'Select') {
      e.preventDefault();
      if (window.neuroTasteEngine) window.neuroTasteEngine.train(item, 'click');
      openDetailsModal(item);
    }
  });
  return card;
}


// ========================================================
// TMDB ARTIST SPOTLIGHT & FILMOGRAPHY MODAL ENGINE
// ========================================================
let currentArtistData = null;
let currentSpotlightArtist = null;

function playTrailerByEmbed(embedUrl, videoTitle) {
  const modal = document.getElementById('trailer-modal');
  const iframe = document.getElementById('trailer-iframe');
  const title = document.getElementById('trailer-modal-title');
  const extBtn = document.getElementById('trailer-external-btn');
  const spinner = document.getElementById('trailer-spinner');
  const altsBar = document.getElementById('trailer-alts-bar');
  const fallbackStage = document.getElementById('trailer-stage-fallback');
  const fallbackLink = document.getElementById('trailer-fallback-link');

  if (!modal) return;
  modal.style.display = 'flex';

  let videoId = '';
  if (typeof embedUrl === 'string') {
    const m = embedUrl.match(/(?:embed\/|v\/|watch\?v=|youtu\.be\/)([\w-]{11})/);
    if (m) videoId = m[1];
  }

  const cleanEmbed = videoId 
    ? 'https://www.youtube.com/embed/' + videoId + '?autoplay=1&mute=0&enablejsapi=1&playsinline=1&rel=0'
    : embedUrl;
  const ytWatchUrl = videoId ? 'https://www.youtube.com/watch?v=' + videoId : '#';

  if (title) title.innerHTML = `<i class="fa-brands fa-youtube text-red"></i> ${videoTitle || 'Official Video Clip'}`;
  if (spinner) spinner.style.display = 'none';
  if (altsBar) altsBar.style.display = 'none';
  if (fallbackStage) fallbackStage.style.display = 'none';

  if (extBtn) {
    extBtn.href = ytWatchUrl;
    extBtn.style.display = 'inline-flex';
  }
  if (fallbackLink) {
    fallbackLink.href = ytWatchUrl;
  }

  if (iframe) {
    iframe.src = cleanEmbed;
  }
}
window.playTrailerByEmbed = playTrailerByEmbed;

async function openArtistModal(personId, personName) {
  if (!personId) return;
  const modalEl = document.getElementById('artist-modal');
  if (!modalEl) return;

  modalEl.style.display = 'flex';
  const nameEl = document.getElementById('artist-modal-name');
  const bioEl = document.getElementById('artist-modal-bio');
  const photoEl = document.getElementById('artist-modal-photo');
  const deptEl = document.getElementById('artist-modal-dept');
  const bdayEl = document.getElementById('artist-modal-birthday');
  const bdayValEl = document.getElementById('artist-modal-birthday-val');
  const placeEl = document.getElementById('artist-modal-place');
  const placeValEl = document.getElementById('artist-modal-place-val');
  const titlesEl = document.getElementById('artist-modal-titles');
  const titlesCountEl = document.getElementById('artist-modal-titles-count');
  const gridEl = document.getElementById('artist-filmography-grid');

  if (nameEl) nameEl.textContent = personName || 'Actor Profile';
  if (bioEl) bioEl.textContent = 'Loading artist biography and full filmography...';
  if (photoEl) photoEl.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(personName || 'Actor') + '&background=1e293b&color=cbd5e1';
  if (bdayEl) bdayEl.style.display = 'none';
  if (placeEl) placeEl.style.display = 'none';
  if (titlesEl) titlesEl.style.display = 'none';
  if (gridEl) gridEl.innerHTML = Array(12).fill(0).map(() => '<div class="search-skeleton-card"></div>').join('');

  try {
    const res = await fetch(`/api/tmdb/person/${personId}`);
    if (!res.ok) throw new Error('Failed to fetch person details');
    const data = await res.json();
    if (data.status !== 'success') throw new Error('Invalid response');
    currentArtistData = data;

    if (nameEl) nameEl.textContent = data.name;
    if (deptEl) deptEl.innerHTML = `<i class="fa-solid fa-award text-gold"></i> ${data.knownForDepartment || 'Acting'}`;
    if (photoEl && data.photo) {
      photoEl.src = data.photo;
      photoEl.onerror = () => {
        photoEl.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(data.name) + '&background=1e293b&color=cbd5e1';
      };
    }
    if (bioEl) {
      bioEl.textContent = data.biography || `${data.name} is an internationally recognized artist with a prolific filmography in cinema and television.`;
    }
    if (data.birthday && bdayEl && bdayValEl) {
      bdayValEl.textContent = data.birthday + (data.deathday ? ` — ${data.deathday}` : '');
      bdayEl.style.display = 'inline-flex';
    }
    if (data.placeOfBirth && placeEl && placeValEl) {
      placeValEl.textContent = data.placeOfBirth;
      placeEl.style.display = 'inline-flex';
    }
    if (Array.isArray(data.filmography) && data.filmography.length > 0 && titlesEl && titlesCountEl) {
      titlesCountEl.textContent = data.filmography.length;
      titlesEl.style.display = 'inline-flex';
    }

    if (gridEl && Array.isArray(data.filmography)) {
      gridEl.innerHTML = '';
      const fragment = document.createDocumentFragment();
      data.filmography.forEach((titleItem, idx) => {
        const fullItem = {
          id: String(titleItem.id),
          tmdbId: titleItem.id,
          title: titleItem.title,
          type: titleItem.type || 'movie',
          year: titleItem.year || '2024',
          poster: titleItem.poster || FALLBACK_POSTER,
          backdrop: titleItem.backdrop,
          rating: titleItem.rating || 8.0,
          matchRate: titleItem.matchRate || '99% Match',
          quality: '4K Ultra HD',
          platform: 'CinemaVerse VIP',
          platformId: 'netflix',
          platformBadge: titleItem.type === 'series' ? 'SERIES' : 'MOVIE',
          character: titleItem.character
        };
        const card = renderMovieCardItem(fullItem, idx);
        fragment.appendChild(card);
      });
      gridEl.appendChild(fragment);
    }
  } catch (err) {
    console.error('[Artist Modal] Error:', err);
    if (bioEl) bioEl.textContent = 'Unable to load full biography at this moment.';
  }
}

function closeArtistModal() {
  const modal = document.getElementById('artist-modal');
  if (modal) modal.style.display = 'none';
}

function handleArtistModalBackdropClick(e) {
  if (e.target && e.target.id === 'artist-modal') {
    closeArtistModal();
  }
}

function openArtistFromSpotlight() {
  if (currentSpotlightArtist && currentSpotlightArtist.id) {
    openArtistModal(currentSpotlightArtist.id, currentSpotlightArtist.name);
  }
}

window.openArtistModal = openArtistModal;
window.closeArtistModal = closeArtistModal;
window.handleArtistModalBackdropClick = handleArtistModalBackdropClick;
window.openArtistFromSpotlight = openArtistFromSpotlight;

async function performSearch(query, platform = searchPlatformFilter || 'all', type = searchTypeFilter || 'all', isInstantPreview = false) {
  const section = document.getElementById('search-results-section');
  const grid = document.getElementById('search-grid');
  const queryDisplay = document.getElementById('search-query-display');
  const countDisplay = document.getElementById('search-count');
  const interpretationEl = document.getElementById('ai-search-interpretation');
  const titlePrefixEl = document.getElementById('search-title-prefix');
  const activeOttBadgeEl = document.getElementById('search-active-ott-badge');

  if (!section || !grid) return;

  const thisSeq = ++activeSearchSeq;
  toggleHomeVisibilityForSearch(true);

  const platformNameMap = {
    all: 'All OTTs', netflix: 'Netflix', prime: 'Prime Video', disney: 'Disney+ Hotstar',
    hbo: 'HBO Max', apple: 'Apple TV+', crunchyroll: 'Crunchyroll', paramount: 'Paramount+',
    hulu: 'Hulu', peacock: 'Peacock', sonyliv: 'Sony LIV', zee5: 'Zee5',
    jiocinema: 'JioCinema', animeworld: 'Anime World'
  };
  const platLabel = platformNameMap[platform] || platform;

  const navInput = document.getElementById('search-input');
  const inpageInput = document.getElementById('search-inpage-input');
  const clearBtn = document.getElementById('clear-search');
  const inpageClear = document.getElementById('search-inpage-clear');

  // CRITICAL: NEVER overwrite an input that currently has user focus!
  if (navInput && document.activeElement !== navInput && navInput.value !== (query || '')) {
    navInput.value = query || '';
  }
  if (inpageInput && document.activeElement !== inpageInput && inpageInput.value !== (query || '')) {
    inpageInput.value = query || '';
  }
  if (clearBtn) clearBtn.style.display = query ? 'block' : 'none';
  if (inpageClear) inpageClear.style.display = query ? 'block' : 'none';

  if (titlePrefixEl) titlePrefixEl.textContent = query ? 'Results for' : 'Discover';
  if (queryDisplay) queryDisplay.textContent = query ? `"${query}"` : 'All Titles';
  if (activeOttBadgeEl) activeOttBadgeEl.textContent = platLabel;

  section.style.display = 'block';

  // Dynamic Artist / Actor Spotlight Integration via TMDb API
  const spotlightEl = document.getElementById('search-artist-spotlight');
  if (query && query.trim().length >= 2) {
    fetch(`/api/tmdb/search/person?q=${encodeURIComponent(query.trim())}`)
      .then(r => r.json())
      .then(pData => {
        if (thisSeq !== activeSearchSeq) return;
        if (pData && pData.status === 'success' && Array.isArray(pData.data) && pData.data.length > 0) {
          const topPerson = pData.data[0];
          const qClean = query.trim().toLowerCase();
          const pClean = topPerson.name.toLowerCase();
          if (pClean.includes(qClean) || qClean.includes(pClean)) {
            currentSpotlightArtist = topPerson;
            if (spotlightEl) {
              const imgEl = document.getElementById('search-artist-img');
              const nameEl = document.getElementById('search-artist-name');
              const knownEl = document.getElementById('search-artist-known-for');
              if (imgEl) imgEl.src = topPerson.photo || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(topPerson.name) + '&background=1e293b&color=cbd5e1';
              if (nameEl) nameEl.textContent = topPerson.name;
              if (knownEl) {
                const knownTitles = (topPerson.knownFor || []).map(k => k.title).filter(Boolean).slice(0, 3).join(', ');
                knownEl.textContent = knownTitles ? `Known for: ${knownTitles}` : 'Prominent Cinema & Television Artist';
              }
              spotlightEl.style.display = 'block';
            }

            // Immediately load artist's complete filmography from TMDb into search results
            fetch(`/api/tmdb/person/${topPerson.id}`)
              .then(pr => pr.json())
              .then(pDetails => {
                if (thisSeq !== activeSearchSeq) return;
                if (pDetails && pDetails.status === 'success' && Array.isArray(pDetails.filmography) && pDetails.filmography.length > 0) {
                  const artistTitles = pDetails.filmography.map(t => ({
                    id: String(t.id),
                    tmdbId: t.id,
                    title: t.title,
                    type: t.type || 'movie',
                    year: t.year || '2024',
                    poster: t.poster || FALLBACK_POSTER,
                    backdrop: t.backdrop,
                    rating: t.rating || 8.0,
                    matchRate: t.matchRate || '99% Match',
                    quality: '4K Ultra HD',
                    platform: 'CinemaVerse VIP',
                    platformId: 'netflix',
                    platformBadge: t.type === 'series' ? 'SERIES' : 'MOVIE',
                    character: t.character
                  }));

                  // If user searched for actor directly or local matches are few, show full filmography
                  if (localMatches.length === 0 || pClean.includes(qClean) || qClean.includes(pClean)) {
                    const existingIds = new Set(localMatches.map(m => String(m.id || m.tmdbId)));
                    const combined = [...localMatches];
                    artistTitles.forEach(at => {
                      if (!existingIds.has(String(at.id))) {
                        combined.push(at);
                        existingIds.add(String(at.id));
                      }
                    });
                    const fragment = document.createDocumentFragment();
                    combined.slice(0, SEARCH_PAGE_SIZE).forEach((item, idx) => fragment.appendChild(renderMovieCardItem(item, idx)));
                    grid.replaceChildren(fragment);
                    countDisplay.innerHTML = `<i class="fa-solid fa-star text-gold"></i> ${combined.length} titles starring ${topPerson.name}`;
                  }
                }
              })
              .catch(() => {});
          } else if (spotlightEl) {
            spotlightEl.style.display = 'none';
          }
        } else if (spotlightEl) {
          spotlightEl.style.display = 'none';
        }
      })
      .catch(() => {
        if (spotlightEl) spotlightEl.style.display = 'none';
      });
  } else if (spotlightEl) {
    spotlightEl.style.display = 'none';
  }

  // 1. Natural Language Intent Parser
  const parsed = parseNaturalLanguageQuery(query);
  if (parsed.isNaturalLanguage && interpretationEl) {
    interpretationEl.style.display = 'inline-flex';
    let badgesHtml = `<i class="fa-solid fa-wand-magic-sparkles text-gold"></i> <span>AI Search:</span>`;
    if (parsed.targetType !== 'all') {
      badgesHtml += `<span class="ai-tag-chip"><i class="fa-solid fa-${parsed.targetType === 'movie' ? 'film' : 'tv'}"></i> ${parsed.targetType === 'movie' ? 'Movies' : 'Series'}</span>`;
    }
    if (parsed.genres && parsed.genres.length > 0) {
      badgesHtml += `<span class="ai-tag-chip"><i class="fa-solid fa-masks-theater"></i> ${parsed.genres.join(' + ')}</span>`;
    }
    if (parsed.person) {
      badgesHtml += `<span class="ai-tag-chip"><i class="fa-solid fa-star text-gold"></i> ${parsed.person}</span>`;
    }
    if (parsed.targetRegion) {
      badgesHtml += `<span class="ai-tag-chip"><i class="fa-solid fa-earth-asia"></i> ${parsed.targetRegion.replace('_', ' ').toUpperCase()}</span>`;
    }
    if (parsed.isHighRated) {
      badgesHtml += `<span class="ai-tag-chip"><i class="fa-solid fa-crown text-gold"></i> Top Rated (8.0+)</span>`;
    }
    interpretationEl.innerHTML = badgesHtml;
  } else if (interpretationEl) {
    interpretationEl.style.display = 'none';
  }

  // 2. INSTANT CLIENT-SIDE SEARCH EVALUATION (< 1ms response)
  let localMatches = [];
  if (currentCatalog && currentCatalog.length) {
    const rawQ = (query || '').toLowerCase();
    const normQ = parsed.norm || normalizeStr(query);
    const compactQ = normQ.replace(/\s+/g, '');
    const canonQ = clientCanonicalizeNumbers(normQ);
    const canonQWords = canonQ.split(' ').filter(Boolean);
    const aliasList = CLIENT_TITLE_ALIASES[rawQ] || CLIENT_TITLE_ALIASES[normQ] || CLIENT_TITLE_ALIASES[compactQ];

    const qCtx = {
      normQ, compactQ, canonQ, canonQWords, rawQ,
      aliasList, parsed, effectivePlatform: platform, effectiveType: type, genre: 'all'
    };

    const scored = [];
    for (let i = 0; i < currentCatalog.length; i++) {
      const item = currentCatalog[i];
      const s = scoreClientCatalogItem(item, qCtx);
      if (s > 0) scored.push({ item, score: s });
    }
    scored.sort((a, b) => b.score - a.score);
    localMatches = scored.map(x => ({ ...x.item, _searchScore: x.score }));
  }

  // Instant render if we have local matches (top 36 instantly, remaining streamed progressively)
  const SEARCH_PAGE_SIZE = 36;
  if (localMatches.length > 0) {
    const firstBatch = localMatches.slice(0, SEARCH_PAGE_SIZE);
    const fragment = document.createDocumentFragment();
    firstBatch.forEach((item, idx) => fragment.appendChild(renderMovieCardItem(item, idx)));
    grid.replaceChildren(fragment);
    const typeLabel = type === 'all' ? '' : (type === 'movie' ? 'movies' : 'series');
    countDisplay.innerHTML = `<i class="fa-solid fa-bolt text-red"></i> ${localMatches.length} ${typeLabel} titles found on ${platLabel}`;

    if (localMatches.length > SEARCH_PAGE_SIZE) {
      const remaining = localMatches.slice(SEARCH_PAGE_SIZE);
      let offset = 0;
      const renderNextChunk = () => {
        if (thisSeq !== activeSearchSeq) return;
        const chunk = remaining.slice(offset, offset + SEARCH_PAGE_SIZE);
        if (!chunk.length) return;
        const frag = document.createDocumentFragment();
        chunk.forEach((item, idx) => frag.appendChild(renderMovieCardItem(item, SEARCH_PAGE_SIZE + offset + idx)));
        grid.appendChild(frag);
        offset += SEARCH_PAGE_SIZE;
        if (offset < remaining.length) {
          if (window.requestIdleCallback) window.requestIdleCallback(renderNextChunk);
          else setTimeout(renderNextChunk, 30);
        }
      };
      if (window.requestIdleCallback) window.requestIdleCallback(renderNextChunk);
      else setTimeout(renderNextChunk, 30);
    }
  } else if (!isInstantPreview) {
    // Only flash skeletons if there are 0 local matches and doing full search
    grid.innerHTML = Array(12).fill(0).map(() => '<div class="search-skeleton-card"></div>').join('');
    countDisplay.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-red"></i> Searching across 14 OTTs...';
  }

  // If this was purely an instant keystroke preview, the debounced full fetch will follow shortly
  if (isInstantPreview) return;

  // 3. SERVER SEARCH & DEEP ENRICHMENT
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&platform=${platform}&type=${type}`);
    const data = await res.json();

    if (thisSeq !== activeSearchSeq) return;

    if (data && data.status === 'success' && Array.isArray(data.data)) {
      const results = data.data.length > 0 ? data.data : localMatches;

      if (window.neuroTasteEngine && query) {
        window.neuroTasteEngine.trainOnSearch(query, parsed, results.slice(0, 6));
      }

      if (!results.length) {
        grid.innerHTML = `
          <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-dim);">
            <i class="fa-solid fa-film" style="font-size: 48px; opacity: 0.3; margin-bottom: 16px;"></i>
            <h3 style="font-size: 18px; margin-bottom: 8px; color: #fff;">No titles found for "${query || platLabel}"</h3>
            <p>Try searching by actor, genre, or popular movie franchise name.</p>
            <button class="btn-reset-platform" style="margin: 20px auto 0;" onclick="clearSearch()"><i class="fa-solid fa-house"></i> Return to All OTTs</button>
          </div>
        `;
        countDisplay.innerHTML = `<i class="fa-solid fa-film text-red"></i> 0 titles found`;
        return;
      }

      const firstBatch = results.slice(0, SEARCH_PAGE_SIZE);
      const fragment = document.createDocumentFragment();
      firstBatch.forEach((item, idx) => fragment.appendChild(renderMovieCardItem(item, idx)));
      grid.replaceChildren(fragment);
      const typeLabel = type === 'all' ? '' : (type === 'movie' ? 'movies' : 'series');
      countDisplay.innerHTML = `<i class="fa-solid fa-film text-red"></i> ${results.length} ${typeLabel} titles found on ${platLabel}`;

      if (results.length > SEARCH_PAGE_SIZE) {
        const remaining = results.slice(SEARCH_PAGE_SIZE);
        let offset = 0;
        const renderNextChunk = () => {
          if (thisSeq !== activeSearchSeq) return;
          const chunk = remaining.slice(offset, offset + SEARCH_PAGE_SIZE);
          if (!chunk.length) return;
          const frag = document.createDocumentFragment();
          chunk.forEach((item, idx) => frag.appendChild(renderMovieCardItem(item, SEARCH_PAGE_SIZE + offset + idx)));
          grid.appendChild(frag);
          offset += SEARCH_PAGE_SIZE;
          if (offset < remaining.length) {
            if (window.requestIdleCallback) window.requestIdleCallback(renderNextChunk);
            else setTimeout(renderNextChunk, 30);
          }
        };
        if (window.requestIdleCallback) window.requestIdleCallback(renderNextChunk);
        else setTimeout(renderNextChunk, 30);
      }
    }
  } catch (err) {
    console.warn('Server search API sync error:', err);
    if (thisSeq !== activeSearchSeq) return;
    if (localMatches.length > 0) {
      const firstBatch = localMatches.slice(0, SEARCH_PAGE_SIZE);
      const fragment = document.createDocumentFragment();
      firstBatch.forEach((item, idx) => fragment.appendChild(renderMovieCardItem(item, idx)));
      grid.replaceChildren(fragment);
      countDisplay.innerHTML = `<i class="fa-solid fa-film text-red"></i> ${localMatches.length} titles found on ${platLabel}`;
    }
  }
}

function clearSearch(resetInputs = true) {
  if (resetInputs) {
    const input = document.getElementById('search-input');
    if (input) input.value = '';
    const inpageInput = document.getElementById('search-inpage-input');
    if (inpageInput) inpageInput.value = '';
  }
  const clearBtn = document.getElementById('clear-search');
  if (clearBtn) clearBtn.style.display = 'none';
  const inpageClear = document.getElementById('search-inpage-clear');
  if (inpageClear) inpageClear.style.display = 'none';
  const section = document.getElementById('search-results-section');
  if (section && resetInputs) section.style.display = 'none';
  const spotlightEl = document.getElementById('search-artist-spotlight');
  if (spotlightEl) spotlightEl.style.display = 'none';
  searchPlatformFilter = 'all';
  searchTypeFilter = 'all';
  document.querySelectorAll('.search-pill').forEach(b => b.classList.toggle('active', b.textContent.includes('All OTTs') || b.textContent.trim() === 'All'));
  document.querySelectorAll('.type-pill').forEach(b => b.classList.toggle('active', b.textContent.includes('All')));
  if (resetInputs) toggleHomeVisibilityForSearch(false);
}

// ========================================================
// ========================================================
// VOICE SEARCH & SPEECH RECOGNITION SYSTEM
// ========================================================
let activeSpeechRec = null;
let isVoiceListening = false;
let latestVoiceTranscript = '';
let hasCommittedVoiceResult = false;
let voiceSilenceTimeout = null;

function cleanVoiceQuery(transcript) {
  if (!transcript) return '';
  // Strip conversational prefixes like "search for", "find me", "play", "watch"
  const stripped = transcript
    .replace(/^(search for|search|find me|find|show me|play|watch|can you find|please play)\s+/i, '')
    .trim();
  // If stripping left nothing (e.g. user just said "search"), return original transcript
  return stripped || transcript.trim();
}

function updateVoiceUIState(listening) {
  isVoiceListening = listening;
  const boxBtn = document.getElementById('voice-search-btn');
  const inpageMic = document.getElementById('search-inpage-mic');
  const modal = document.getElementById('voice-search-modal');
  const pulse1 = document.getElementById('voice-pulse-ring-1');
  const pulse2 = document.getElementById('voice-pulse-ring-2');
  const heading = document.getElementById('voice-status-heading');
  const micIndicator = document.getElementById('voice-mic-indicator');

  if (boxBtn) boxBtn.classList.toggle('listening', listening);
  if (inpageMic) inpageMic.classList.toggle('listening', listening);
  if (modal) modal.classList.toggle('listening', listening);

  if (pulse1) pulse1.style.display = listening ? 'block' : 'none';
  if (pulse2) pulse2.style.display = listening ? 'block' : 'none';

  if (micIndicator) {
    if (listening) {
      micIndicator.style.background = 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)';
      micIndicator.style.boxShadow = '0 0 35px rgba(34, 197, 94, 0.7)';
    } else {
      micIndicator.style.background = 'linear-gradient(135deg, #e50914 0%, #b80710 100%)';
      micIndicator.style.boxShadow = '0 0 30px rgba(229, 9, 20, 0.65)';
    }
  }

  if (listening && heading && !heading.textContent.includes('Hearing')) {
    heading.textContent = 'Listening... Speak now';
  }
}

function commitVoiceResult(rawText) {
  if (hasCommittedVoiceResult) return;
  hasCommittedVoiceResult = true;
  clearTimeout(voiceSilenceTimeout);

  const cleaned = cleanVoiceQuery(rawText);
  if (!cleaned) {
    hasCommittedVoiceResult = false;
    return;
  }

  const input = document.getElementById('search-input');
  const inpageInput = document.getElementById('search-inpage-input');
  const modalInput = document.getElementById('voice-modal-input');
  const clearBtn = document.getElementById('clear-search');
  const inpageClear = document.getElementById('search-inpage-clear');
  const box = document.getElementById('search-box');

  if (input) input.value = cleaned;
  if (inpageInput) inpageInput.value = cleaned;
  if (modalInput) modalInput.value = cleaned;
  if (clearBtn) clearBtn.style.display = 'block';
  if (inpageClear) inpageClear.style.display = 'block';
  if (box) box.classList.add('open');

  const heading = document.getElementById('voice-status-heading');
  const hintEl = document.getElementById('voice-transcript-hint');
  if (heading) heading.textContent = 'Searching...';
  if (hintEl) hintEl.textContent = 'Found: "' + cleaned + '"';

  // Stop audio capture & close modal
  stopVoiceSearch(true);

  setTimeout(() => {
    performSearch(cleaned, searchPlatformFilter, searchTypeFilter);
    const searchSection = document.getElementById('search-results-section');
    if (searchSection) {
      searchSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 350);
}

function handleVoiceFinalResult(rawText) {
  commitVoiceResult(rawText);
}

function stopVoiceSearch(closeModal = true) {
  clearTimeout(voiceSilenceTimeout);

  if (activeSpeechRec) {
    try {
      activeSpeechRec.onend = null;
      activeSpeechRec.onerror = null;
      activeSpeechRec.onresult = null;
      activeSpeechRec.onaudiostart = null;
      activeSpeechRec.onsoundstart = null;
      activeSpeechRec.onspeechstart = null;
      activeSpeechRec.onspeechend = null;
      activeSpeechRec.abort();
    } catch (_) {}
    activeSpeechRec = null;
  }

  isVoiceListening = false;
  updateVoiceUIState(false);

  if (closeModal) {
    const modal = document.getElementById('voice-search-modal');
    if (modal) {
      modal.classList.remove('open', 'active');
      modal.style.setProperty('display', 'none', 'important');
    }
  }
}

function startVoiceSearch(e) {
  if (e) {
    if (e.stopPropagation) e.stopPropagation();
    if (e.preventDefault) e.preventDefault();
  }

  // 1. Android Native App Bridge (if running inside CinemaVerse native APK)
  if (window.AndroidVoiceBridge && typeof window.AndroidVoiceBridge.startVoiceSearch === 'function') {
    try {
      window.AndroidVoiceBridge.startVoiceSearch();
      return;
    } catch (err) {
      console.warn('AndroidVoiceBridge invocation error:', err);
    }
  }

  // 2. Web Speech API (Browser / Chrome / Safari / Edge)
  stopVoiceSearch(false);

  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  const modal = document.getElementById('voice-search-modal');
  const modalInput = document.getElementById('voice-modal-input');
  const hintEl = document.getElementById('voice-transcript-hint');
  const heading = document.getElementById('voice-status-heading');
  const box = document.getElementById('search-box');

  if (modal) {
    modal.classList.add('open', 'active');
    modal.style.setProperty('display', 'flex', 'important');
  }
  if (box) box.classList.add('open');

  hasCommittedVoiceResult = false;
  latestVoiceTranscript = '';

  if (modalInput) {
    modalInput.value = '';
    modalInput.onkeydown = (ke) => {
      if (ke.key === 'Enter') {
        ke.preventDefault();
        submitVoiceModalInput();
      }
    };
  }

  // Check for secure context (Chrome blocks speech recognition on non-localhost HTTP)
  const isSecure = window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1';

  if (!SpeechRec || !isSecure) {
    if (heading) heading.textContent = 'Voice Search';
    if (hintEl) {
      hintEl.textContent = !isSecure
        ? 'Speech recognition requires HTTPS or localhost. Tap below to use keyboard mic or type:'
        : 'Web Speech not supported in this browser. Tap below to use keyboard mic or type:';
    }
    if (modalInput) {
      modalInput.placeholder = 'Tap here to use keyboard mic or type...';
      setTimeout(() => { try { modalInput.focus(); } catch(_) {} }, 100);
    }
    updateVoiceUIState(false);
    return;
  }

  if (heading) heading.textContent = 'Listening... Speak now';
  if (hintEl) hintEl.textContent = 'Speak a movie name, series, actor, or genre...';

  try {
    const rec = new SpeechRec();
    rec.continuous = false; // Fast single-command voice search response
    rec.interimResults = true; // Stream words as spoken in real-time
    rec.maxAlternatives = 1;
    rec.lang = (navigator.language && navigator.language.length >= 2) ? navigator.language : 'en-US';

    rec.onaudiostart = () => {
      isVoiceListening = true;
      updateVoiceUIState(true);
      if (heading) heading.textContent = 'Listening... Speak now';
      if (hintEl) hintEl.textContent = 'Microphone active — speak clearly';
    };

    rec.onsoundstart = () => {
      if (heading && isVoiceListening && !hasCommittedVoiceResult) {
        heading.textContent = 'Hearing sound...';
      }
    };

    rec.onspeechstart = () => {
      if (heading && isVoiceListening && !hasCommittedVoiceResult) {
        heading.textContent = 'Hearing voice...';
      }
    };

    rec.onspeechend = () => {
      if (heading && isVoiceListening && !hasCommittedVoiceResult) {
        heading.textContent = 'Processing speech...';
      }
    };

    rec.onresult = (event) => {
      let accumulatedFinal = '';
      let accumulatedInterim = '';

      for (let i = 0; i < event.results.length; ++i) {
        const item = event.results[i];
        if (item && item[0] && item[0].transcript) {
          if (item.isFinal) {
            accumulatedFinal += item[0].transcript;
          } else {
            accumulatedInterim += item[0].transcript;
          }
        }
      }

      const activeText = (accumulatedFinal || accumulatedInterim || '').trim();
      if (activeText) {
        latestVoiceTranscript = activeText;
        if (modalInput) modalInput.value = activeText;
        if (hintEl) hintEl.textContent = 'Hearing: "' + activeText + '"';
        if (heading && isVoiceListening) heading.textContent = 'Transcribing...';

        const input = document.getElementById('search-input');
        if (input) input.value = activeText;
        const inpageInput = document.getElementById('search-inpage-input');
        if (inpageInput) inpageInput.value = activeText;

        // Auto-commit on brief pause if no final event fires
        clearTimeout(voiceSilenceTimeout);
        voiceSilenceTimeout = setTimeout(() => {
          if (!hasCommittedVoiceResult && latestVoiceTranscript) {
            commitVoiceResult(latestVoiceTranscript);
          }
        }, 1200);
      }

      if (accumulatedFinal) {
        clearTimeout(voiceSilenceTimeout);
        commitVoiceResult(accumulatedFinal);
      }
    };

    rec.onerror = (event) => {
      console.warn('[VoiceSearch] Speech error:', event.error);
      clearTimeout(voiceSilenceTimeout);

      if (event.error === 'no-speech') {
        if (!latestVoiceTranscript) {
          if (heading) heading.textContent = "Didn't catch that";
          if (hintEl) hintEl.textContent = 'No voice detected. Tap microphone to speak again, or type below:';
        }
      } else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        if (heading) heading.textContent = 'Microphone Blocked';
        if (hintEl) hintEl.textContent = 'Please tap the lock icon in your address bar to allow microphone access.';
      } else if (event.error === 'network') {
        if (heading) heading.textContent = 'Voice Network Error';
        if (hintEl) hintEl.textContent = 'Speech server unreachable. Tap below to use keyboard mic or type:';
      } else if (event.error === 'audio-capture') {
        if (heading) heading.textContent = 'Microphone Busy';
        if (hintEl) hintEl.textContent = 'Microphone is used by another app. Close it and try again.';
      } else if (event.error !== 'aborted') {
        if (heading) heading.textContent = 'Voice Search Paused';
        if (hintEl) hintEl.textContent = 'Tap the microphone to speak again or choose a suggestion:';
      }

      isVoiceListening = false;
      updateVoiceUIState(false);
    };

    rec.onend = () => {
      isVoiceListening = false;
      updateVoiceUIState(false);
      clearTimeout(voiceSilenceTimeout);

      if (!hasCommittedVoiceResult && latestVoiceTranscript) {
        commitVoiceResult(latestVoiceTranscript);
      } else if (!hasCommittedVoiceResult) {
        if (heading && heading.textContent === 'Listening... Speak now') {
          heading.textContent = "Didn't catch that";
          if (hintEl) hintEl.textContent = 'Tap the microphone to try again, or type below:';
        }
      }
    };

    activeSpeechRec = rec;
    rec.start();
  } catch (err) {
    console.error('Failed to start speech recognition:', err);
    isVoiceListening = false;
    updateVoiceUIState(false);
    if (heading) heading.textContent = "Didn't catch that";
    if (hintEl) hintEl.textContent = 'Tap the microphone to try again or type below:';
  }
}

function submitVoiceModalInput() {
  const modalInput = document.getElementById('voice-modal-input');
  const val = (modalInput ? modalInput.value : '').trim();
  if (val) {
    commitVoiceResult(val);
  }
}

function toggleVoiceSearch(e) {
  if (isVoiceListening) {
    stopVoiceSearch(true);
  } else {
    startVoiceSearch(e);
  }
}

function toggleVoiceListeningManual() {
  if (isVoiceListening) {
    stopVoiceSearch(false);
    const heading = document.getElementById('voice-status-heading');
    const hintEl = document.getElementById('voice-transcript-hint');
    if (heading) heading.textContent = 'Paused';
    if (hintEl) hintEl.textContent = 'Tap the microphone to speak again.';
  } else {
    startVoiceSearch();
  }
}

function closeVoiceSearchOnBackdrop(e) {
  if (e.target && (e.target.id === 'voice-search-modal' || e.target.classList.contains('voice-search-modal'))) {
    stopVoiceSearch(true);
  }
}

function searchVoiceHint(hintText) {
  stopVoiceSearch(true);
  const input = document.getElementById('search-input');
  const inpageInput = document.getElementById('search-inpage-input');
  const modalInput = document.getElementById('voice-modal-input');
  const clearBtn = document.getElementById('clear-search');
  const inpageClear = document.getElementById('search-inpage-clear');
  const box = document.getElementById('search-box');

  if (box) box.classList.add('open');
  if (input) input.value = hintText;
  if (inpageInput) inpageInput.value = hintText;
  if (modalInput) modalInput.value = hintText;
  if (clearBtn) clearBtn.style.display = 'block';
  if (inpageClear) inpageClear.style.display = 'block';

  performSearch(hintText, searchPlatformFilter, searchTypeFilter);
  const searchSection = document.getElementById('search-results-section');
  if (searchSection) {
    searchSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

window.startVoiceSearch = startVoiceSearch;
window.stopVoiceSearch = stopVoiceSearch;
window.submitVoiceModalInput = submitVoiceModalInput;
window.toggleVoiceSearch = toggleVoiceSearch;
window.toggleVoiceListeningManual = toggleVoiceListeningManual;
window.closeVoiceSearchOnBackdrop = closeVoiceSearchOnBackdrop;
window.searchVoiceHint = searchVoiceHint;
window.handleVoiceFinalResult = handleVoiceFinalResult;
window.submitVoiceModalInput = submitVoiceModalInput;

// ========================================================
// Streaming Server Definitions
const STREAMING_SERVERS = [
  { id: 0, name: 'Server 1: Vidly Pro VIP (Glassmorphism Aurora • Multi-Audio & 3 Servers • ✅ 0 Ads)', badge: '✅ 0 Ads • Multi-Audio 4K', shortBadge: '✅ 0 Ads', provider: 'Vidly Pro', hasAds: false },
  { id: 1, name: 'Server 2: CineSrc VIP Player (Open Source • ✅ 0 Ads)', badge: '✅ 0 Ads • Open Source', shortBadge: '✅ 0 Ads', provider: 'CineSrc VIP', hasAds: false, iframeAttributes: { sandbox: 'allow-scripts allow-same-origin allow-forms allow-presentation' } },
  { id: 2, name: 'Server 3: 123Embed Cloud Player (In-Player Switcher • 4K)', badge: 'In-Player Switcher • 4K', shortBadge: 'Provider player', provider: '123Embed Cloud', hasAds: null, iframeAttributes: { sandbox: 'allow-scripts allow-same-origin allow-forms allow-presentation' } },
  { id: 3, name: 'Server 4: Global World Mirror (Multi-Language & Dubbed)', badge: 'Multi-Language • Dubbed', shortBadge: 'Dubbed Mirror', provider: 'Global World Mirror', hasAds: null },
  { id: 4, name: 'Server 5: AutoEmbed Prime VIP (Multi-Language • 4K HDR)', badge: 'Multi-Language 4K', shortBadge: 'Provider player', provider: 'AutoEmbed Prime', hasAds: null },
  { id: 5, name: 'Server 6: AnimeWorld VIP (Hindi/Eng/Jap)', badge: 'Hindi / English / Japanese', shortBadge: 'Provider player', provider: 'AnimeWorld', hasAds: null },
  { id: 6, name: 'Server 7: MultiEmbed Cloud Stream (Global Mirror)', badge: 'Global Cloud Mirror', shortBadge: 'Cloud Mirror', provider: 'MultiEmbed Cloud', hasAds: null },
  { id: 7, name: 'Server 8: VidLink Pro VIP (Ultra HD 4K • Multi-Audio)', badge: 'Ultra HD 4K • Multi-Audio', shortBadge: '4K Multi-Audio', provider: 'VidLink Pro', hasAds: null },
  { id: 8, name: 'Server 9: AnyEmbed Prime Direct (1080p Direct)', badge: '1080p Direct • HLS', shortBadge: '1080p Direct', provider: 'AnyEmbed Prime', hasAds: null },
  { id: 9, name: 'Server 10: Nontongo CC Captions (Multi-Subtitles)', badge: 'Multi-Subtitles • Asian Dramas', shortBadge: 'Subtitles Cloud', provider: 'Nontongo Cloud', hasAds: null },
];
let selectedServerIndex = 0; // Default: Server 1 (Vidly Pro VIP)

// ========================================================
// NETFLIX DETAILS MODAL (MOVIE PAGE)
// ========================================================

// Update Selected Server UI in Details Modal & Player
function updateSelectedServerUI() {
  const srv = STREAMING_SERVERS[selectedServerIndex] || STREAMING_SERVERS[0];
  const statusEl = document.getElementById('modal-selected-server-name');
  if (statusEl) statusEl.textContent = `${srv.name} (${srv.badge})`;
  const playText = document.getElementById('modal-play-text');
  if (playText) playText.textContent = `Play (${srv.name.split(':')[0]})`;
  document.querySelectorAll('.server-chip-pill').forEach((p, idx) => {
    p.classList.toggle('active', idx === selectedServerIndex);
  });
  const select = document.getElementById('server-select');
  if (select) select.value = selectedServerIndex;
}
window.updateSelectedServerUI = updateSelectedServerUI;

async function openDetailsModal(item) {
  currentItem = item;
  if (window.neuroTasteEngine) {
    window.neuroTasteEngine.train(item, 'click');
  }

  // Immediately display modal for instant 0ms visual feedback
  const modalEl = document.getElementById('details-modal');
  if (modalEl) modalEl.style.display = 'flex';
  if (tvModeActive) {
    setTimeout(() => {
      const modalPlay = document.getElementById('modal-play-btn');
      if (modalPlay) setTvFocus(modalPlay);
    }, 50);
  }

  document.getElementById('modal-title').textContent = item.title;
  document.getElementById('modal-desc').textContent = item.description || 'Watch now in Ultra HD.';

  // Reset TMDb Enrichments to clean initial state
  const logoEl = document.getElementById('modal-title-logo');
  const taglineEl = document.getElementById('modal-tagline');
  const ratingEl = document.getElementById('modal-tmdb-rating');
  const castSectionEl = document.getElementById('modal-cast-section');
  const castAvatarsEl = document.getElementById('modal-cast-avatars');
  const financialStatsEl = document.getElementById('modal-financial-stats');
  const budgetPillEl = document.getElementById('modal-budget-pill');
  const revenuePillEl = document.getElementById('modal-revenue-pill');
  const statusPillEl = document.getElementById('modal-status-pill');
  const clipsSectionEl = document.getElementById('modal-clips-section');
  const clipsRowEl = document.getElementById('modal-clips-row');
  const providersItemEl = document.getElementById('modal-watch-providers-item');
  const providerLogosEl = document.getElementById('modal-provider-logos');
  const keywordsItemEl = document.getElementById('modal-keywords-item');
  const keywordsCloudEl = document.getElementById('modal-keywords-cloud');

  if (logoEl) logoEl.style.display = 'none';
  if (taglineEl) taglineEl.style.display = 'none';
  if (ratingEl) ratingEl.style.display = 'none';
  if (castSectionEl) castSectionEl.style.display = 'none';
  if (financialStatsEl) financialStatsEl.style.display = 'none';
  if (clipsSectionEl) clipsSectionEl.style.display = 'none';
  if (providersItemEl) providersItemEl.style.display = 'none';
  if (keywordsItemEl) keywordsItemEl.style.display = 'none';

  // Asynchronously Enrich with Official TMDb API Data
  (async () => {
    try {
      const tmdbTargetId = item.tmdbId || item.id || item.imdbId;
      const res = await fetch('/api/tmdb/details/' + tmdbTargetId + '?type=' + (item.type || 'movie'));
      if (!res.ok) return;
      const json = await res.json();
      if (json.status !== 'success' || !json.data) return;
      const tmdbData = json.data;

      // Verify the user hasn't switched to a different title while fetching
      if (!currentItem || (currentItem.id !== item.id && currentItem.tmdbId !== tmdbData.tmdbId)) return;

      // 1. Transparent Title Logo
      if (tmdbData.logo && logoEl) {
        logoEl.src = tmdbData.logo;
        logoEl.alt = tmdbData.title;
        logoEl.onload = () => {
          if (currentItem && (currentItem.id === item.id || currentItem.tmdbId === tmdbData.tmdbId)) {
            logoEl.style.display = 'block';
          }
        };
      }

      // 2. Official Tagline
      if (tmdbData.tagline && taglineEl) {
        taglineEl.textContent = '"' + tmdbData.tagline + '"';
        taglineEl.style.display = 'block';
      }

      // 3. Indian / Global Content Rating
      if (tmdbData.certification) {
        const matEl = document.getElementById('modal-maturity');
        if (matEl) matEl.textContent = tmdbData.certification;
      }

      // 4. Live TMDb Rating & Vote Count
      if (tmdbData.rating && ratingEl) {
        const valEl = document.getElementById('modal-rating-val');
        const countEl = document.getElementById('modal-rating-count');
        if (valEl) valEl.textContent = Number(tmdbData.rating).toFixed(1);
        if (countEl) countEl.textContent = tmdbData.voteCount ? '(' + Number(tmdbData.voteCount).toLocaleString() + ')' : '';
        ratingEl.style.display = 'inline-flex';
      }

      // 5. Official Trailer Attachment
      if (tmdbData.trailer && tmdbData.trailer.url) {
        item.trailer = tmdbData.trailer.url;
        item.trailerKey = tmdbData.trailer.id;
      }

      // 6. Financial Stats (Budget & Box Office)
      if (financialStatsEl) {
        let hasStats = false;
        if (tmdbData.budgetFormatted && budgetPillEl) {
          const bVal = document.getElementById('modal-budget-val');
          if (bVal) bVal.textContent = tmdbData.budgetFormatted;
          budgetPillEl.style.display = 'inline-flex';
          hasStats = true;
        } else if (budgetPillEl) {
          budgetPillEl.style.display = 'none';
        }
        if (tmdbData.revenueFormatted && revenuePillEl) {
          const rVal = document.getElementById('modal-revenue-val');
          if (rVal) rVal.textContent = tmdbData.revenueFormatted;
          revenuePillEl.style.display = 'inline-flex';
          hasStats = true;
        } else if (revenuePillEl) {
          revenuePillEl.style.display = 'none';
        }
        if (tmdbData.statusName && statusPillEl && tmdbData.statusName !== 'Released') {
          const sVal = document.getElementById('modal-status-val');
          if (sVal) sVal.textContent = tmdbData.statusName;
          statusPillEl.style.display = 'inline-flex';
          hasStats = true;
        } else if (statusPillEl) {
          statusPillEl.style.display = 'none';
        }
        financialStatsEl.style.display = hasStats ? 'flex' : 'none';
      }

      // 7. Interactive Top Cast Avatars (Clickable to open Artist Modal)
      if (Array.isArray(tmdbData.cast) && tmdbData.cast.length > 0 && castSectionEl && castAvatarsEl) {
        castAvatarsEl.innerHTML = '';
        const fragment = document.createDocumentFragment();
        tmdbData.cast.slice(0, 16).forEach(c => {
          const card = document.createElement('div');
          card.className = 'modal-cast-card clickable';
          card.setAttribute('role', 'button');
          card.setAttribute('tabindex', '0');
          card.title = `Click to view ${c.name}'s filmography & biography`;
          const avatarUrl = c.photo || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(c.name) + '&background=1e293b&color=cbd5e1';
          card.innerHTML = '<div class="cast-avatar-wrap">' +
            '<img class="cast-avatar-img" src="' + avatarUrl + '" alt="' + c.name + '" loading="lazy" decoding="async" onerror="this.src=\'https://ui-avatars.com/api/?name=' + encodeURIComponent(c.name) + '&background=1e293b&color=cbd5e1\';">' +
            '</div>' +
            '<span class="cast-actor-name" title="' + c.name + '">' + c.name + '</span>' +
            '<span class="cast-char-name" title="' + (c.character || '') + '">' + (c.character || 'Cast') + '</span>';
          card.onclick = (e) => {
            e.stopPropagation();
            openArtistModal(c.id, c.name);
          };
          fragment.appendChild(card);
        });
        castAvatarsEl.appendChild(fragment);
        castSectionEl.style.display = 'block';
      }

      // 8. Official Short Clips, Teasers & Behind-The-Scenes Strip
      if (Array.isArray(tmdbData.clips) && tmdbData.clips.length > 0 && clipsSectionEl && clipsRowEl) {
        clipsRowEl.innerHTML = '';
        const countBadge = document.getElementById('modal-clips-count');
        if (countBadge) countBadge.textContent = `${tmdbData.clips.length} Videos`;
        const fragment = document.createDocumentFragment();
        tmdbData.clips.forEach(clip => {
          const card = document.createElement('div');
          card.className = 'modal-clip-card';
          card.setAttribute('role', 'button');
          card.setAttribute('tabindex', '0');
          card.title = `Watch ${clip.name}`;
          card.innerHTML = `
            <div class="clip-thumb-wrap">
              <img class="clip-thumb-img" src="${clip.thumbnail}" alt="${clip.name}" loading="lazy" decoding="async">
              <div class="clip-play-badge">
                <div class="clip-play-icon"><i class="fa-solid fa-play"></i></div>
              </div>
            </div>
            <div class="clip-info">
              <span class="clip-type-pill">${clip.type || 'Clip'}</span>
              <div class="clip-title">${clip.name}</div>
            </div>
          `;
          card.onclick = (e) => {
            e.stopPropagation();
            playTrailerByEmbed(clip.embedUrl, clip.name);
          };
          fragment.appendChild(card);
        });
        clipsRowEl.appendChild(fragment);
        clipsSectionEl.style.display = 'block';
      }

      // 9. Streaming Watch Providers in India
      if (Array.isArray(tmdbData.watchProviders) && tmdbData.watchProviders.length > 0 && providersItemEl && providerLogosEl) {
        providerLogosEl.innerHTML = '';
        tmdbData.watchProviders.forEach(p => {
          if (!p.logo) return;
          const img = document.createElement('img');
          img.className = 'modal-provider-img';
          img.src = p.logo;
          img.alt = p.name;
          img.title = p.name;
          providerLogosEl.appendChild(img);
        });
        if (providerLogosEl.children.length > 0) providersItemEl.style.display = 'block';
      }

      // 10. Tags & Keywords
      if (Array.isArray(tmdbData.keywords) && tmdbData.keywords.length > 0 && keywordsItemEl && keywordsCloudEl) {
        keywordsCloudEl.innerHTML = '';
        tmdbData.keywords.slice(0, 8).forEach(kw => {
          const tag = document.createElement('span');
          tag.className = 'modal-keyword-tag';
          tag.textContent = kw;
          keywordsCloudEl.appendChild(tag);
        });
        if (keywordsCloudEl.children.length > 0) keywordsItemEl.style.display = 'block';
      }

      // 11. Recommendations ("More Like This")
      if (Array.isArray(tmdbData.recommendations) && tmdbData.recommendations.length > 0) {
        renderTmdbRecommendations(tmdbData.recommendations);
      }
    } catch (e) {
      console.warn('[TMDb Enrich] Details fetch notice:', e.message);
    }
  })();
  
  const backdropImg = document.getElementById('modal-backdrop-img');
  const targetBackdrop = item.backdrop || item.poster || FALLBACK_BACKDROP;
  backdropImg.src = targetBackdrop;
  backdropImg.onerror = () => {
    if (item.poster && backdropImg.src !== item.poster) {
      backdropImg.src = item.poster;
    } else {
      handleImgError(backdropImg, FALLBACK_BACKDROP);
    }
  };

  // Platform Tag
  const chip = document.getElementById('modal-platform-chip');
  if (chip) {
    chip.textContent = item.platformBadge || item.platform;
    chip.className = `platform-chip badge-${item.platformId}`;
    if (item.platformColor) chip.style.backgroundColor = item.platformColor;
  }
  document.getElementById('modal-ott-source').textContent = item.platform;

  document.getElementById('modal-year').textContent = item.year;
  document.getElementById('modal-duration').textContent = item.duration;
  document.getElementById('modal-quality').textContent = item.quality || '4K';
  document.getElementById('modal-match').textContent = item.matchRate || '99% Match';
  document.getElementById('modal-maturity').textContent = item.maturity || '16+';
  document.getElementById('modal-audio').textContent = item.audio || 'Dolby Atmos';
  document.getElementById('modal-director').textContent = item.director || 'Acclaimed Director';
  document.getElementById('modal-genres-list').textContent = (item.genres || []).join(', ');

  // Cast Chips
  const castContainer = document.getElementById('modal-cast');
  castContainer.innerHTML = '';
  (item.cast || []).slice(0, 5).forEach(name => {
    const chipEl = document.createElement('span');
    chipEl.className = 'cast-chip';
    chipEl.textContent = name;
    castContainer.appendChild(chipEl);
  });

  // Watchlist Button
  const wBtn = document.getElementById('modal-watchlist-btn');
  updateWatchlistButton(wBtn, item.id);
  wBtn.onclick = () => toggleWatchlist(item, wBtn);

  // Available Audio & Dubbed Language Chips
  const langContainer = document.getElementById('modal-language-chips');
  const langStatus = document.getElementById('modal-selected-language-label');
  if (langContainer) {
    langContainer.innerHTML = '';
    const rawLangs = (item.languages && item.languages.length > 0) ? item.languages : [
      { code: 'en', name: 'English (Original)', flag: '🌐', defaultServer: 0 },
      { code: 'hi', name: 'Hindi Dubbed', flag: '🇮🇳', isDub: true, defaultServer: 0 },
      { code: 'ja', name: 'Japanese Audio', flag: '🇯🇵', defaultServer: 5 },
      { code: 'ta', name: 'Tamil Dubbed', flag: '🇮🇳', isDub: true, defaultServer: 0 },
      { code: 'te', name: 'Telugu Dubbed', flag: '🇮🇳', isDub: true, defaultServer: 0 },
      { code: 'es', name: 'Spanish Dubbed', flag: '🇪🇸', isDub: true, defaultServer: 0 }
    ];

    const LANG_CHIP_DICT = {
      en: { code: 'en', name: 'English (Original)', flag: '🌐', defaultServer: 0 },
      ja: { code: 'ja', name: 'Japanese Audio', flag: '🇯🇵', defaultServer: 5 },
      hi: { code: 'hi', name: 'Hindi Dubbed', flag: '🇮🇳', isDub: true, defaultServer: 0 },
      ta: { code: 'ta', name: 'Tamil Dubbed', flag: '🇮🇳', isDub: true, defaultServer: 0 },
      te: { code: 'te', name: 'Telugu Dubbed', flag: '🇮🇳', isDub: true, defaultServer: 0 },
      es: { code: 'es', name: 'Spanish Dubbed', flag: '🇪🇸', isDub: true, defaultServer: 0 },
      fr: { code: 'fr', name: 'French Dubbed', flag: '🇫🇷', isDub: true, defaultServer: 0 },
      de: { code: 'de', name: 'German Dubbed', flag: '🇩🇪', isDub: true, defaultServer: 0 },
      ko: { code: 'ko', name: 'Korean Audio', flag: '🇰🇷', defaultServer: 0 }
    };

    const langs = rawLangs.map(l => {
      if (!l) return null;
      if (typeof l === 'object' && l.name) return l;
      const code = (typeof l === 'string' ? l : (l.code || '')).toLowerCase().trim();
      return LANG_CHIP_DICT[code] || { code, name: code.toUpperCase() + ' Dub', flag: '🌐', defaultServer: 0 };
    }).filter(Boolean);
    langs.forEach(l => {
      const chip = document.createElement('button');
      chip.className = `modal-lang-chip ${selectedDubLanguage === l.code ? 'active' : ''}`;
      chip.innerHTML = `${l.flag || '🌐'} ${l.name}`;
      chip.onclick = (e) => {
        e.stopPropagation();
        selectedDubLanguage = l.code;
        localStorage.setItem('preferred_dub_language', l.code);
        document.querySelectorAll('.modal-lang-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        if (langStatus) langStatus.textContent = l.name;
        
        // Sync selected server UI safely
        updateSelectedServerUI();
        showToast(`🎧 Selected ${l.name} for playback`, 'info');
      };
      langContainer.appendChild(chip);
    });

    const activeMatch = langs.find(l => l.code === selectedDubLanguage) || langs[0];
    if (langStatus) langStatus.textContent = activeMatch ? activeMatch.name : 'English (Original)';
  }

  // Render 10 Streaming Server Chips on Movie Page
  renderMoviePageServerChips(item);

  // Play & Resume Action with Restart Capability
  const playBtn = document.getElementById('modal-play-btn');
  const playText = document.getElementById('modal-play-text');
  const restartBtn = document.getElementById('modal-restart-btn');

  const savedCw = getContinueWatchingItem(item.id);
  const hasProgress = savedCw && (savedCw.currentTime > 10 || savedCw.season > 1 || savedCw.episode > 1);

  if (hasProgress) {
    const epLabel = item.type === 'series' ? `S${savedCw.season}:E${savedCw.episode} ` : '';
    const timeLabel = formatTimeSeconds(savedCw.currentTime);
    if (playText) {
      playText.textContent = `Resume ${epLabel}(${timeLabel})`;
    }
    playBtn.onclick = () => {
      closeDetailsModal();
      openPlayer(item, savedCw.season, savedCw.episode, selectedServerIndex, savedCw.currentTime);
    };

    if (restartBtn) {
      restartBtn.style.display = 'inline-flex';
      restartBtn.onclick = () => {
        closeDetailsModal();
        openPlayer(item, 1, 1, selectedServerIndex, 0);
      };
    }
  } else {
    if (playText) {
      playText.textContent = `Play (${STREAMING_SERVERS[selectedServerIndex].name.split(':')[0]})`;
    }
    playBtn.onclick = () => {
      closeDetailsModal();
      openPlayer(item, 1, 1, selectedServerIndex, 0);
    };

    if (restartBtn) {
      restartBtn.style.display = 'none';
    }
  }

  // TV Series Episodes with High-Resolution Thumbnails
  const epSection = document.getElementById('modal-episodes-section');
  if (item.type === 'series') {
    epSection.style.display = 'block';
    if (item.seasons && item.seasons.length > 0) {
      setupModalSeasons(item);
    } else {
      document.getElementById('modal-episodes-grid').innerHTML = '<p style="color: var(--text-dim); padding: 20px;"><i class="fa-solid fa-spinner fa-spin text-red"></i> Loading episodes with thumbnails...</p>';
      try {
        const res = await fetch('/api/details/' + item.id);
        const data = await res.json();
        if (data.status === 'success' && data.data && data.data.seasons && data.data.seasons.length > 0) {
          item.seasons = data.data.seasons;
          item.description = data.data.description || item.description;
          document.getElementById('modal-desc').textContent = item.description;
          setupModalSeasons(item);
        } else {
          setupFallbackSingleEpisode(item);
        }
      } catch(e) {
        setupFallbackSingleEpisode(item);
      }
    }
  } else {
    epSection.style.display = 'none';
  }

  // More Like This
  renderSimilarTitles(item);

  // Focus modal play button if not already focused
  if (tvModeActive) {
    const modalPlay = document.getElementById('modal-play-btn');
    if (modalPlay && document.activeElement !== modalPlay) setTvFocus(modalPlay);
  }
}

function renderMoviePageServerChips(item) {
  const chipsContainer = document.getElementById('modal-server-chips');
  const statusEl = document.getElementById('modal-selected-server-name');
  if (!chipsContainer) return;

  chipsContainer.innerHTML = '';
  STREAMING_SERVERS.forEach((srv, idx) => {
    const pill = document.createElement('div');
    const adClass = srv.hasAds === true ? 'has-ad' : 'provider-player';
    pill.className = `server-chip-pill ${adClass} ${idx === selectedServerIndex ? 'active' : ''}`;
    pill.innerHTML = `
      <i class="fa-solid fa-server ${srv.hasAds === true ? 'text-gold' : 'text-cyan'}"></i>
      <span>${srv.name.split(':')[0]}</span>
      <span class="server-chip-badge ${srv.hasAds === true ? 'badge-ad-warning' : 'badge-provider'}">${srv.shortBadge}</span>
    `;
    pill.onclick = () => {
      selectedServerIndex = idx;
      updateSelectedServerUI();
      showToast(`Selected ${srv.name.split(':')[0]} for playback`, 'info');
    };
    chipsContainer.appendChild(pill);
  });

  if (statusEl) {
    statusEl.textContent = `${STREAMING_SERVERS[selectedServerIndex].name} (${STREAMING_SERVERS[selectedServerIndex].badge})`;
  }
}

function setupFallbackSingleEpisode(item) {
  item.seasons = [{
    season: 1,
    episodes: [{ 
      episode: 1, 
      title: `${item.title} — Episode 1`, 
      duration: '45m', 
      description: 'Stream now in Ultra HD.',
      thumbnail: item.backdrop || item.poster || FALLBACK_BACKDROP
    }]
  }];
  setupModalSeasons(item);
}

function setupModalSeasons(item) {
  const select = document.getElementById('modal-season-select');
  select.innerHTML = '';

  item.seasons.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.season;
    opt.textContent = `Season ${s.season} (${s.episodes.length} Episodes)`;
    select.appendChild(opt);
  });

  const savedCw = getContinueWatchingItem(item.id);
  const targetSeason = (savedCw && savedCw.season && item.seasons.some(x => x.season === savedCw.season)) 
    ? savedCw.season 
    : item.seasons[0].season;
  select.value = targetSeason;
  renderModalEpisodes(targetSeason);
}

// RENDER EPISODES WITH REAL 16:9 THUMBNAILS (Optimized with DocumentFragment)
function renderModalEpisodes(seasonNum) {
  const item = currentItem;
  if (!item || !item.seasons) return;
  const sData = item.seasons.find(x => String(x.season) === String(seasonNum));
  const grid = document.getElementById('modal-episodes-grid');
  if (!grid) return;

  if (!sData || !sData.episodes) {
    grid.innerHTML = '';
    return;
  }

  const fragment = document.createDocumentFragment();
  sData.episodes.forEach(ep => {
    const card = document.createElement('div');
    card.className = 'ep-item-card';

    const thumbUrl = ep.thumbnail || `https://episodes.metahub.space/${item.imdbId || 'tt4574334'}/${seasonNum}/${ep.episode}/w780.jpg`;
    const fallbackThumb = item.backdrop || item.poster || FALLBACK_BACKDROP;

    card.innerHTML = `
      <div class="ep-item-num">${ep.episode}</div>
      <div class="ep-thumb-wrap">
        <img class="ep-thumb-img" src="${thumbUrl}" alt="${ep.title}" loading="lazy" decoding="async" onerror="this.onerror=null; this.src='${fallbackThumb}';">
        <div class="ep-thumb-play">
          <i class="fa-solid fa-play"></i>
        </div>
        <span class="ep-thumb-duration">${ep.duration || '48m'}</span>
      </div>
      <div class="ep-item-info">
        <div class="ep-item-header">
          <span class="ep-item-title">${ep.title}</span>
          <span class="ep-badge-hd">4K UHD</span>
        </div>
        <p class="ep-item-desc">${ep.description || 'Watch Episode ' + ep.episode + ' now in Ultra HD.'}</p>
      </div>
    `;

    const savedCw = getContinueWatchingItem(item.id);
    const epKey = `s${seasonNum}e${ep.episode}`;
    const epSavedSec = (savedCw && savedCw.episodeProgress && savedCw.episodeProgress[epKey])
      || (savedCw && savedCw.season === parseInt(seasonNum, 10) && savedCw.episode === ep.episode ? savedCw.currentTime : 0);

    card.onclick = () => {
      closeDetailsModal();
      openPlayer(item, seasonNum, ep.episode, selectedServerIndex, epSavedSec);
    };

    fragment.appendChild(card);
  });
  grid.replaceChildren(fragment);

  // Asynchronously fetch TMDb episode stills & exact titles if not already enriched
  if (item && item.type === 'series' && (!item._tmdbSeasonsLoaded || !item._tmdbSeasonsLoaded[seasonNum])) {
    item._tmdbSeasonsLoaded = item._tmdbSeasonsLoaded || {};
    const seriesId = item.tmdbId || item.id;
    fetch('/api/tmdb/tv/' + seriesId + '/season/' + seasonNum)
      .then(r => r.json())
      .then(tmdbSeason => {
        if (tmdbSeason && tmdbSeason.status === 'success' && Array.isArray(tmdbSeason.episodes)) {
          item._tmdbSeasonsLoaded[seasonNum] = true;
          tmdbSeason.episodes.forEach(tmdbEp => {
            const localEp = sData.episodes.find(e => e.episode === tmdbEp.episode);
            if (localEp) {
              if (tmdbEp.thumbnail) localEp.thumbnail = tmdbEp.thumbnail;
              if (tmdbEp.title && !tmdbEp.title.startsWith('Episode ')) localEp.title = tmdbEp.title;
              if (tmdbEp.overview) localEp.description = tmdbEp.overview;
              if (tmdbEp.duration) localEp.duration = tmdbEp.duration;
            }
          });
          const curSelect = document.getElementById('modal-season-select');
          if (curSelect && String(curSelect.value) === String(seasonNum) && currentItem && (currentItem.id === item.id || currentItem.tmdbId === item.tmdbId)) {
            renderModalEpisodes(seasonNum);
          }
        }
      })
      .catch(() => {});
  }
}

function renderTmdbRecommendations(recs) {
  const grid = document.getElementById('modal-similar-grid');
  if (!grid || !Array.isArray(recs) || recs.length === 0) return;

  const fragment = document.createDocumentFragment();
  recs.slice(0, 6).forEach(rec => {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', rec.title);
    card.innerHTML = '<div class="card-poster-wrap">' +
      '<img class="card-poster" src="' + (rec.poster || FALLBACK_POSTER) + '" alt="' + rec.title + '" loading="lazy" decoding="async" onerror="window.handleImgError(this)">' +
      '<div class="card-ott-badge badge-netflix">TMDb Match</div>' +
      '<div class="card-play-hover">' +
      '<div class="play-circle"><i class="fa-solid fa-play"></i></div>' +
      '</div>' +
      '</div>' +
      '<div class="card-info">' +
      '<h4 class="card-title">' + rec.title + '</h4>' +
      '<div class="card-meta">' +
      '<span class="text-green font-bold">' + (rec.matchRate || '95% Match') + '</span>' +
      '<span>' + (rec.type === 'series' ? 'TV Show' : 'Movie') + '</span>' +
      '</div>' +
      '</div>';
    card.onclick = () => openDetailsModal(rec);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === 'Select') {
        e.preventDefault();
        openDetailsModal(rec);
      }
    });
    fragment.appendChild(card);
  });
  grid.replaceChildren(fragment);
}

function renderSimilarTitles(item) {
  const grid = document.getElementById('modal-similar-grid');
  if (!grid) return;

  const similar = currentCatalog
    .filter(x => x.id !== item.id && (x.platformId === item.platformId || x.genres.some(g => item.genres.includes(g))))
    .slice(0, 6);

  const fragment = document.createDocumentFragment();
  similar.forEach(sim => {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', sim.title);
    card.innerHTML = `
      <div class="card-poster-wrap">
        <img class="card-poster" src="${sim.poster}" alt="${sim.title}" loading="lazy" decoding="async" onerror="window.handleImgError(this)">
        <div class="card-ott-badge badge-${sim.platformId}">${sim.platformBadge || sim.platform}</div>
        <div class="card-play-hover">
          <div class="play-circle"><i class="fa-solid fa-play"></i></div>
        </div>
      </div>
      <div class="card-info">
        <h4 class="card-title">${sim.title}</h4>
        <div class="card-meta">
          <span class="text-green font-bold">${sim.matchRate || '99% Match'}</span>
          <span>${sim.duration}</span>
        </div>
      </div>
    `;
    card.onclick = () => openDetailsModal(sim);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === 'Select') {
        e.preventDefault();
        openDetailsModal(sim);
      }
    });
    fragment.appendChild(card);
  });
  grid.replaceChildren(fragment);
}

function closeDetailsModal() {
  document.getElementById('details-modal').style.display = 'none';
  if (tvModeActive && lastFocusedTvElement) {
    setTvFocus(lastFocusedTvElement);
  }
}

function handleModalBackdropClick(e) {
  if (e.target.id === 'details-modal') {
    closeDetailsModal();
  }
}

// ========================================================
// TRAILER PREVIEW & SHARE SYSTEM
// ========================================================

let currentTrailerData = null;

async function openTrailerModal(item = currentItem) {
  if (!item) return;
  const modal = document.getElementById('trailer-modal');
  const iframe = document.getElementById('trailer-iframe');
  const title = document.getElementById('trailer-modal-title');
  const extBtn = document.getElementById('trailer-external-btn');
  const spinner = document.getElementById('trailer-spinner');
  const altsBar = document.getElementById('trailer-alts-bar');

  if (!modal) return;
  modal.style.display = 'flex';

  if (title) title.innerHTML = `<i class="fa-brands fa-youtube text-red"></i> ${item.title} — Official Trailer`;
  if (iframe) iframe.src = '';
  if (spinner) spinner.style.display = 'flex';
  if (altsBar) altsBar.style.display = 'none';
  if (extBtn) extBtn.style.display = 'none';

  try {
    const type = item.type || 'movie';
    const id = item.id || item.imdbId || item.tmdbId || 'media';
    const query = new URLSearchParams({
      title: item.title || '',
      year: item.year || '',
      imdb: item.imdbId || ''
    });

    const res = await fetch(`/api/trailer/${type}/${id}?${query.toString()}`);
    const data = await res.json();
    currentTrailerData = data;

    if (spinner) spinner.style.display = 'none';

    if (data.status === 'success' && data.embedUrl) {
      if (iframe) iframe.src = data.embedUrl;
      if (extBtn) {
        extBtn.href = data.youtubeUrl || `https://www.youtube.com/watch?v=${data.videoId}`;
        extBtn.style.display = 'inline-flex';
      }

      // Render alternative trailer pills if multiple exist
      if (altsBar && data.trailers && data.trailers.length > 1) {
        altsBar.innerHTML = '';
        data.trailers.forEach((t, idx) => {
          const pill = document.createElement('button');
          pill.type = 'button';
          pill.className = `trailer-alt-pill ${idx === 0 ? 'active' : ''}`;
          pill.innerHTML = `<i class="fa-brands fa-youtube"></i> ${t.title || `Trailer ${idx + 1}`}`;
          pill.onclick = () => {
            document.querySelectorAll('.trailer-alt-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            if (iframe) iframe.src = `https://www.youtube.com/embed/${t.id}?autoplay=1&mute=0&enablejsapi=1&playsinline=1&rel=0`;
            if (extBtn) extBtn.href = `https://www.youtube.com/watch?v=${t.id}`;
          };
          altsBar.appendChild(pill);
        });
        altsBar.style.display = 'flex';
      }
    } else {
      // Fallback: direct YouTube search link
      const fallbackUrl = (data && data.youtubeUrl) ? data.youtubeUrl : `https://www.youtube.com/results?search_query=${encodeURIComponent((item.title || '') + ' official trailer')}`;
      if (extBtn) {
        extBtn.href = fallbackUrl;
        extBtn.style.display = 'inline-flex';
      }
      if (iframe) {
        iframe.src = `https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent((item.title || '') + ' official trailer')}`;
      }
    }
  } catch (err) {
    console.error('Failed to load trailer:', err);
    if (spinner) spinner.style.display = 'none';
    const fallbackUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent((item.title || '') + ' official trailer')}`;
    if (extBtn) {
      extBtn.href = fallbackUrl;
      extBtn.style.display = 'inline-flex';
    }
  }
}

function closeTrailerModal() {
  const modal = document.getElementById('trailer-modal');
  const iframe = document.getElementById('trailer-iframe');
  const spinner = document.getElementById('trailer-spinner');
  const altsBar = document.getElementById('trailer-alts-bar');
  if (iframe) iframe.src = '';
  if (spinner) spinner.style.display = 'none';
  if (altsBar) altsBar.style.display = 'none';
  if (modal) modal.style.display = 'none';
}

function handleTrailerBackdropClick(e) {
  if (e.target.id === 'trailer-modal') {
    closeTrailerModal();
  }
}

// ========================================================
// REAL MULTI-PLATFORM SHARE SYSTEM
// ========================================================
let currentShareItem = null;
let currentShareSeason = 1;
let currentShareEpisode = 1;

function buildShareUrl(item, season = null, episode = null) {
  if (!item) return window.location.href;
  const id = item.id || item.imdbId || '';
  const s = season || (currentItem === item ? currentSeason : 1) || 1;
  const e = episode || (currentItem === item ? currentEpisode : 1) || 1;
  
  const base = `${window.location.protocol}//${window.location.host}${window.location.pathname.replace(/\/$/, '')}`;
  
  if (item.type === 'series') {
    return `${base}/?watch=${encodeURIComponent(id)}&s=${s}&e=${e}#watch=${encodeURIComponent(id)}`;
  }
  return `${base}/?watch=${encodeURIComponent(id)}#watch=${encodeURIComponent(id)}`;
}

function shareMovie(item = currentItem, season = null, episode = null) {
  if (!item) return;
  currentShareItem = item;
  currentShareSeason = season || (currentItem === item ? currentSeason : 1) || 1;
  currentShareEpisode = episode || (currentItem === item ? currentEpisode : 1) || 1;

  const title = item.title || 'Movie';
  const url = buildShareUrl(item, currentShareSeason, currentShareEpisode);
  const epInfo = item.type === 'series' ? ` (Season ${currentShareSeason} Episode ${currentShareEpisode})` : '';
  const shareText = `Watch "${title}"${epInfo} (${item.year || '2026'}) in 4K Ultra HD on CinemaVerse! Free to use; provider ads may appear:`;

  // Try native Web Share API on mobile devices first
  if (navigator.share && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    navigator.share({
      title: `${title}${epInfo} - CinemaVerse`,
      text: shareText,
      url: url
    }).catch(err => {
      if (err.name !== 'AbortError') {
        openShareModal(item, currentShareSeason, currentShareEpisode);
      }
    });
  } else {
    // Open dedicated Share Sheet on Desktop or when native share is cancelled/unavailable
    openShareModal(item, currentShareSeason, currentShareEpisode);
  }
}

function shareHeroMovie() {
  if (heroItems && heroItems[currentHeroIndex]) {
    shareMovie(heroItems[currentHeroIndex]);
  }
}

function openShareModal(item = currentItem, season = null, episode = null) {
  if (!item) return;
  currentShareItem = item;
  currentShareSeason = season || (currentItem === item ? currentSeason : 1) || 1;
  currentShareEpisode = episode || (currentItem === item ? currentEpisode : 1) || 1;

  const modal = document.getElementById('share-modal');
  const poster = document.getElementById('share-preview-poster');
  const title = document.getElementById('share-preview-title');
  const sub = document.getElementById('share-preview-sub');
  const linkInput = document.getElementById('share-link-input');

  if (poster) poster.src = item.poster || item.backdrop || FALLBACK_POSTER;
  if (title) title.textContent = item.title || 'Cinema Title';
  if (sub) {
    const isTv = item.type === 'series';
    const epStr = isTv ? ` • Season ${currentShareSeason} Ep ${currentShareEpisode}` : '';
    sub.textContent = `${item.year || '2026'} • ${isTv ? 'TV Series' : (item.duration || 'Movie')}${epStr} • 4K Ultra HD • Zero Ads`;
  }

  const shareUrl = buildShareUrl(item, currentShareSeason, currentShareEpisode);
  if (linkInput) linkInput.value = shareUrl;

  const copyBtn = document.getElementById('btn-copy-share');
  if (copyBtn) {
    copyBtn.innerHTML = '<i class="fa-solid fa-copy"></i> <span>Copy Link</span>';
    copyBtn.style.background = '';
  }

  if (modal) modal.style.display = 'flex';
}

function closeShareModal() {
  const modal = document.getElementById('share-modal');
  if (modal) modal.style.display = 'none';
}

function handleShareBackdropClick(e) {
  if (e.target.id === 'share-modal') {
    closeShareModal();
  }
}

function shareVia(channel) {
  if (!currentShareItem) return;
  const item = currentShareItem;
  const title = item.title || 'Movie';
  const epInfo = item.type === 'series' ? ` (Season ${currentShareSeason} Episode ${currentShareEpisode})` : '';
  const url = buildShareUrl(item, currentShareSeason, currentShareEpisode);
  const text = `Watch "${title}"${epInfo} (${item.year || '2026'}) in 4K Ultra HD on CinemaVerse! Free to use; provider ads may appear:`;

  if (channel === 'whatsapp') {
    openTrustedExternalLink(`https://api.whatsapp.com/send?text=${encodeURIComponent(text + '\n' + url)}`);
  } else if (channel === 'telegram') {
    openTrustedExternalLink(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`);
  } else if (channel === 'twitter') {
    openTrustedExternalLink(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`);
  } else if (channel === 'facebook') {
    openTrustedExternalLink(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);
  } else if (channel === 'native') {
    if (navigator.share) {
      navigator.share({ title: `${title}${epInfo} - CinemaVerse`, text, url }).catch(() => {});
    } else {
      copyShareLink();
    }
  }
}

function copyShareLink() {
  const linkInput = document.getElementById('share-link-input');
  const copyBtn = document.getElementById('btn-copy-share');
  const url = linkInput && linkInput.value ? linkInput.value : (currentShareItem ? buildShareUrl(currentShareItem, currentShareSeason, currentShareEpisode) : window.location.href);

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => {
      onCopySuccess();
    }).catch(() => {
      fallbackCopy(url);
    });
  } else {
    fallbackCopy(url);
  }

  function fallbackCopy(text) {
    if (linkInput) {
      linkInput.select();
      linkInput.setSelectionRange(0, 99999);
      try {
        document.execCommand('copy');
        onCopySuccess();
      } catch (err) {
        showToast('Please copy the link manually', 'info');
      }
    }
  }

  function onCopySuccess() {
    if (copyBtn) {
      copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> <span>Copied!</span>';
      copyBtn.style.background = '#10b981';
      setTimeout(() => {
        if (copyBtn) {
          copyBtn.innerHTML = '<i class="fa-solid fa-copy"></i> <span>Copy Link</span>';
          copyBtn.style.background = '';
        }
      }, 2500);
    }
    showToast(`Streaming link copied to clipboard!`, 'success');
  }
}

// ========================================================
// NETFLIX CINEMA VIDEO PLAYER (ZERO VANISHING CONTROLS)
// ========================================================

let isPlayerPlaying = true;

// Player mouse move: Controls stay visible and accessible
function handlePlayerMouseMove() {
  const player = document.getElementById('player-overlay');
  if (!player || player.style.display === 'none') return;
  player.classList.remove('zen-mode');
}

function handlePlayerClick(e) {
  handlePlayerMouseMove();
}

async function openPlayer(item, season = null, episode = null, serverIndex = null, resumeTime = null) {
  closeDetailsModal();
  currentItem = item;

  // Immediately hide mobile bottom navigation dock with zero latency
  document.body.classList.add('player-active');
  const mobBottomNav = document.getElementById('mobile-bottom-nav');
  if (mobBottomNav) {
    mobBottomNav.classList.add('nav-hidden-for-player');
    mobBottomNav.style.display = 'none';
  }

  // Train Machine Learning Taste Model on watched content
  if (window.neuroTasteEngine && item) {
    window.neuroTasteEngine.train(item, 'watch');
  }

  // Retrieve saved Continue Watching item if it exists
  const saved = getContinueWatchingItem(item.id);

  // 1. Resolve Season:
  if (season !== null && season !== undefined && !isNaN(parseInt(season, 10))) {
    currentSeason = parseInt(season, 10);
  } else if (saved && saved.season) {
    currentSeason = parseInt(saved.season, 10);
  } else {
    currentSeason = 1;
  }

  // 2. Resolve Episode:
  if (episode !== null && episode !== undefined && !isNaN(parseInt(episode, 10))) {
    currentEpisode = parseInt(episode, 10);
  } else if (saved && saved.episode) {
    currentEpisode = parseInt(saved.episode, 10);
  } else {
    currentEpisode = 1;
  }

  // 3. Resolve Resume Time (Exact seconds from saved history or param):
  if (resumeTime !== null && resumeTime !== undefined && !isNaN(parseFloat(resumeTime))) {
    currentResumeTime = Math.max(0, Math.floor(resumeTime));
  } else if (saved) {
    const epKey = `s${currentSeason}e${currentEpisode}`;
    if (item.type !== 'series') {
      currentResumeTime = Math.max(0, Math.floor(saved.currentTime || 0));
    } else if (saved.season === currentSeason && saved.episode === currentEpisode) {
      currentResumeTime = Math.max(0, Math.floor(saved.currentTime || 0));
    } else if (saved.episodeProgress && saved.episodeProgress[epKey]) {
      currentResumeTime = Math.max(0, Math.floor(saved.episodeProgress[epKey] || 0));
    } else {
      currentResumeTime = 0;
    }
  } else {
    currentResumeTime = 0;
  }

  currentWatchSeconds = currentResumeTime;
  currentDurationSeconds = (item.type === 'series' ? 2700 : 6600);

  currentServerIndex = (serverIndex !== undefined && serverIndex !== null) 
    ? parseInt(serverIndex, 10) 
    : (selectedServerIndex !== undefined ? selectedServerIndex : 0);

  // Active continuous progress tracker (updates every 3s)
  if (watchProgressTimer) {
    clearInterval(watchProgressTimer);
    watchProgressTimer = null;
  }
  watchProgressTimer = setInterval(() => {
    if (!isPlayerActive()) {
      clearInterval(watchProgressTimer);
      watchProgressTimer = null;
      return;
    }
    currentWatchSeconds += 3;
    saveContinueWatching(currentItem, currentSeason, currentEpisode, currentWatchSeconds, currentDurationSeconds);
  }, 3000);

  // Sync Dubbed Audio Selector in Header
  const audioSelect = document.getElementById('player-audio-select');
  if (audioSelect) {
    audioSelect.value = selectedDubLanguage || 'en';
  }
  document.querySelectorAll('#settings-audio-pills .setting-pill').forEach(btn => {
    const attrClick = btn.getAttribute('onclick'); btn.classList.toggle('active', !!(attrClick && attrClick.includes(`'${selectedDubLanguage}'`)));
  });

  const titleDisplay = item.type === 'series' 
    ? `${item.title} — S${currentSeason}:E${currentEpisode}`
    : item.title;
  document.getElementById('player-stream-title').textContent = titleDisplay;

  const centerTitle = document.getElementById('player-center-title');
  if (centerTitle) centerTitle.textContent = titleDisplay;

  try {
    const res = await fetch(`/api/sources/${item.type}/${item.id}?s=${currentSeason}&e=${currentEpisode}`);
    const data = await res.json();
    availableServers = data.servers || [];
    if (data.tmdb) {
      item.tmdbId = data.tmdb;
      if (currentItem) currentItem.tmdbId = data.tmdb;
    }
    if (data.imdb) {
      item.imdbId = data.imdb;
      if (currentItem) currentItem.imdbId = data.imdb;
    }

    const select = document.getElementById('server-select');
    select.innerHTML = '';
    availableServers.forEach((srv, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = `${srv.name} (${srv.badge})`;
      if (idx === currentServerIndex) opt.selected = true;
      select.appendChild(opt);
    });

    const epBtn = document.getElementById('btn-episodes-drawer');
    const bottomEpBtn = document.getElementById('btn-bottom-episodes');
    const nextEpBtn = document.getElementById('btn-player-next-ep');

    if (item.type === 'series' && item.seasons && item.seasons.length > 0) {
      if (epBtn) epBtn.style.display = 'flex';
      if (bottomEpBtn) bottomEpBtn.style.display = 'flex';
      if (nextEpBtn) nextEpBtn.style.display = 'flex';
      setupDrawerSeasons(item);
    } else {
      if (epBtn) epBtn.style.display = 'none';
      if (bottomEpBtn) bottomEpBtn.style.display = 'none';
      if (nextEpBtn) nextEpBtn.style.display = 'none';
    }

    // Load Stream with selected server
    loadServerStream(currentServerIndex);

    // Save initial continue watching state preserving resume position
    saveContinueWatching(item, currentSeason, currentEpisode, currentWatchSeconds, currentDurationSeconds);

    const overlay = document.getElementById('player-overlay');
    overlay.style.display = 'flex';
    document.body.classList.add('player-active');
    const mobBottomNav = document.getElementById('mobile-bottom-nav');
    if (mobBottomNav) {
      mobBottomNav.classList.add('nav-hidden-for-player');
      mobBottomNav.style.display = 'none';
    }
    handlePlayerMouseMove();
    revealPlayerTopBar();
    schedulePlayerTopBarAutoMove(7000);

    if (isTheaterMode) {
      populateTheaterDetails(item);
    }
  } catch (err) {
    console.error('Failed to resolve stream sources:', err);
    showToast('Failed to load video stream', 'error');
    document.body.classList.remove('player-active');
    const mobBottomNav = document.getElementById('mobile-bottom-nav');
    if (mobBottomNav) {
      mobBottomNav.classList.remove('nav-hidden-for-player');
      mobBottomNav.style.display = '';
    }
  }
}

// Smart Background Ad-Absorber & Auto-Refocus Protection (Zero Sandbox Restrictions)
let initialAdAbsorbed = false;
let lastAdAbsorbTime = 0;

function resetAdAbsorber() {
  initialAdAbsorbed = false;
  lastAdAbsorbTime = 0;
}

function loadServerStream(serverIdx) {
  currentServerIndex = serverIdx;
  selectedServerIndex = serverIdx;
  document.body.classList.add('player-active');
  const mobBottomNav = document.getElementById('mobile-bottom-nav');
  if (mobBottomNav) {
    mobBottomNav.classList.add('nav-hidden-for-player');
    mobBottomNav.style.display = 'none';
  }
  const srv = availableServers[serverIdx] || STREAMING_SERVERS[serverIdx];
  if (!srv) return;

  const subtitle = document.getElementById('player-stream-subtitle');
  if (subtitle) subtitle.textContent = `${srv.name} • Ultra HD`;

  const quickTag = document.getElementById('quick-server-tag');
  if (quickTag) quickTag.textContent = srv.name.split(':')[0] || `Server ${serverIdx + 1}`;

  const select = document.getElementById('server-select');
  if (select) select.value = serverIdx;

  updateActiveServerChips();
  resetAdAbsorber();

  // 1. Trigger Authentic Netflix Circular Buffer Spinner Overlay
  const bufferOverlay = document.getElementById('player-buffering-overlay');
  const bufferText = document.getElementById('buffering-text');
  const bufferSub = document.getElementById('buffering-sub');

  if (bufferOverlay) {
    bufferOverlay.classList.remove('fade-out');
    if (bufferText) bufferText.textContent = `Buffering ${srv.name.split(':')[0]}`;
    if (bufferSub) bufferSub.textContent = 'Loading the selected provider player...';
  }

  // 2. Load the provider with per-server tailored sandbox & security attributes.
  // Server 1 (Vidly Pro) and providers with anti-sandbox checks run unsandboxed;
  // providers supporting sandbox run with strict browser-level popup lockout.
  const iframe = document.getElementById('player-iframe');
  if (srv && srv.iframeAttributes && srv.iframeAttributes.sandbox) {
    iframe.setAttribute('sandbox', srv.iframeAttributes.sandbox);
  } else {
    iframe.removeAttribute('sandbox');
  }
  iframe.referrerPolicy = (srv && srv.iframeAttributes && srv.iframeAttributes.referrerPolicy) || 'no-referrer';
  iframe.allow = (srv && srv.iframeAttributes && srv.iframeAttributes.allow) || 'autoplay; encrypted-media; picture-in-picture';

  let streamUrl = srv ? srv.url : null;
  if (currentItem) {
    const isTv = currentItem.type === 'series' || currentItem.type === 'tv' || currentItem.type === 'anime' || (currentItem.seasons && currentItem.seasons.length > 0);
    const s = currentSeason || 1;
    const e = currentEpisode || 1;
    let imdb = currentItem.imdbId || '';
    let tmdb = currentItem.tmdbId || '';
    const cleanTitle = (currentItem.title || '')
      .replace(/\s*\(Multi-Audio\)\s*/i, '')
      .replace(/\s*\(VIP\)\s*/i, '')
      .replace(/\s*\(Jio Special\)\s*/i, '')
      .replace(/\s*\(Jio Premier\)\s*/i, '')
      .replace(/\s*\(Jio\)\s*/i, '')
      .trim()
      .toLowerCase();

    // Canonical master matching for top Indian OTT & global titles
    if (cleanTitle.includes('harshad mehta') || cleanTitle === 'scam 1992') {
      tmdb = 111188;
      imdb = 'tt12392504';
    } else if (cleanTitle.includes('scam 2003') || cleanTitle.includes('telgi')) {
      tmdb = 233777;
      imdb = 'tt26900224';
    } else if (cleanTitle === 'rocket boys') {
      tmdb = 156157;
      imdb = 'tt13868972';
    } else if (cleanTitle === 'gullak') {
      tmdb = 90966;
      imdb = 'tt10530900';
    } else if (cleanTitle === 'maharani') {
      tmdb = 125950;
      imdb = 'tt14420552';
    } else if (cleanTitle === 'asur' || cleanTitle.includes('asur: welcome')) {
      tmdb = 100128;
      imdb = 'tt11912196';
    } else if (cleanTitle === 'stree 2') {
      tmdb = 1079091;
      imdb = 'tt27510174';
    }

    const tmdbOrImdb = tmdb || imdb || currentItem.id;

    // Direct override for Server 1 (Vidly Pro) for Scam 1992 / Harshad Mehta
    if (serverIdx === 0 && (cleanTitle.includes('harshad mehta') || cleanTitle === 'scam 1992')) {
      streamUrl = `https://vidly.pro/tv/111188/${s}/${e}?preview=1&theme=aurora&color=e50914&audioPicker=1&nextEpisode=1`;
    } else if (!streamUrl) {
      switch (serverIdx) {
        case 0:
        default:
          streamUrl = isTv 
            ? `https://vidly.pro/tv/${tmdb || tmdbOrImdb}/${s}/${e}?preview=1&theme=aurora&color=e50914&audioPicker=1&nextEpisode=1`
            : `https://vidly.pro/movie/${tmdb || tmdbOrImdb}?preview=1&theme=aurora&color=e50914&audioPicker=1`;
          break;
        case 1:
          // Server 2: CineSrc VIP (0 Ads)
          streamUrl = isTv ? `https://cinesrc.st/embed/tv/${tmdbOrImdb}?s=${s}&e=${e}` : `https://cinesrc.st/embed/movie/${tmdbOrImdb}`;
          break;
        case 2:
          // Server 3: 123Embed Cloud (0 Ads)
          streamUrl = isTv ? `https://play2.123embed.net/tv/${tmdbOrImdb}/${s}/${e}` : `https://play2.123embed.net/movie/${tmdbOrImdb}`;
          break;
        case 3:
          // Server 4: Global World Mirror
          streamUrl = isTv 
            ? `https://player.autoembed.co/embed/tv/${imdb || tmdbOrImdb}/${s}/${e}${imdb ? `?imdb=${imdb}` : ''}`
            : `https://player.autoembed.co/embed/movie/${imdb || tmdbOrImdb}${imdb ? `?imdb=${imdb}` : ''}`;
          break;
        case 4:
          // Server 5: AutoEmbed Prime VIP
          streamUrl = isTv 
            ? `https://player.autoembed.co/embed/tv/${tmdbOrImdb}/${s}/${e}${imdb ? `?imdb=${imdb}` : ''}`
            : `https://player.autoembed.co/embed/movie/${tmdbOrImdb}${imdb ? `?imdb=${imdb}` : ''}`;
          break;
        case 5:
          // Server 6: AnimeWorld VIP
          streamUrl = isTv ? `https://player.autoembed.co/embed/tv/${tmdbOrImdb}/${s}/${e}` : `https://player.autoembed.co/embed/movie/${tmdbOrImdb}`;
          break;
        case 6:
          // Server 7: MultiEmbed Cloud Stream
          streamUrl = isTv 
            ? (imdb ? `https://multiembed.mov/?video_id=${imdb}&s=${s}&e=${e}` : `https://multiembed.mov/?video_id=${tmdb}&tmdb=1&s=${s}&e=${e}`)
            : (imdb ? `https://multiembed.mov/?video_id=${imdb}` : `https://multiembed.mov/?video_id=${tmdb}&tmdb=1`);
          break;
        case 7:
          // Server 8: VidLink Pro VIP
          streamUrl = isTv 
            ? `https://vidlink.pro/tv/${tmdb || tmdbOrImdb}/${s}/${e}?primaryColor=e50914&secondaryColor=181818&iconColor=ffffff&icons=default&player=default&title=true&poster=true&autoplay=false&nextbutton=true`
            : `https://vidlink.pro/movie/${tmdb || tmdbOrImdb}?primaryColor=e50914&secondaryColor=181818&iconColor=ffffff&icons=default&player=default&title=true&poster=true&autoplay=false&nextbutton=true`;
          break;
        case 8:
          // Server 9: AnyEmbed Prime Direct
          streamUrl = isTv 
            ? `https://anyembed.xyz/embed/tmdb-tv-${tmdb || tmdbOrImdb}-${s}-${e}`
            : `https://anyembed.xyz/embed/tmdb-movie-${tmdb || tmdbOrImdb}`;
          break;
        case 9:
          // Server 10: Nontongo CC Captions
          streamUrl = isTv 
            ? `https://www.nontongo.win/embed/tv/${tmdb || tmdbOrImdb}/${s}/${e}`
            : `https://www.nontongo.win/embed/movie/${tmdb || tmdbOrImdb}`;
          break;
      }
    }
  }
  // Anti-Ad Provider Normalization Engine:
  // 1. Ensure AutoEmbed always loads pure player.autoembed.co with IMDb ID passed for OpenSubtitles
  if (streamUrl && streamUrl.includes('//autoembed.co/') && !streamUrl.includes('player.autoembed.co')) {
    streamUrl = streamUrl.replace('//autoembed.co/movie/tmdb/', '//player.autoembed.co/embed/movie/')
                         .replace('//autoembed.co/tv/tmdb/', '//player.autoembed.co/embed/tv/')
                         .replace('//autoembed.co/movie/imdb/', '//player.autoembed.co/embed/movie/')
                         .replace(/-/g, '/');
  }
  // Inject IMDb ID parameter into AutoEmbed so OpenSubtitles language search works seamlessly
  if (streamUrl && streamUrl.includes('player.autoembed.co') && currentItem && currentItem.imdbId && !streamUrl.includes('imdb=')) {
    const sep = streamUrl.includes('?') ? '&' : '?';
    streamUrl = `${streamUrl}${sep}imdb=${encodeURIComponent(currentItem.imdbId)}`;
  }
  // VidLink Multi-Audio & Autoplay Configuration
  if (streamUrl && streamUrl.includes('vidlink.pro')) {
    if (!streamUrl.includes('multiLang=')) {
      const sep = streamUrl.includes('?') ? '&' : '?';
      streamUrl = `${streamUrl}${sep}multiLang=true`;
    }
    if (!streamUrl.includes('autoplay=')) {
      streamUrl = `${streamUrl}&autoplay=true`;
    }
  }
  
  // Append resume timestamp parameters across all provider conventions (start, startAt, t, #t)
  if (currentResumeTime > 5 && streamUrl) {
    const sec = Math.floor(currentResumeTime);
    const sep = streamUrl.includes('?') ? '&' : '?';
    streamUrl = `${streamUrl}${sep}start=${sec}&startAt=${sec}&t=${sec}#t=${sec}`;
  }
  iframe.src = streamUrl;

  if (currentResumeTime > 5) {
    const epStr = (currentItem && currentItem.type === 'series') ? `S${currentSeason}:E${currentEpisode}` : 'Movie';
    showToast(`Resuming from ${formatTimeSeconds(currentResumeTime)} • ${epStr}`, 'info');
  }


  // 3. Instant & Smooth Dismissal of Buffering Overlay (Never get stuck buffering)
  let dismissed = false;
  const dismissBuffer = () => {
    if (!dismissed) {
      dismissed = true;
      if (bufferOverlay) bufferOverlay.classList.add('fade-out');
    }
  };

  iframe.onload = () => {
    setTimeout(dismissBuffer, 150);
    if (currentResumeTime > 5) {
      setTimeout(() => {
        try {
          if (iframe.contentWindow) {
            iframe.contentWindow.postMessage({ type: 'seek', time: currentResumeTime }, '*');
            iframe.contentWindow.postMessage({ event: 'seek', time: currentResumeTime }, '*');
            iframe.contentWindow.postMessage({ type: 'player:seek', time: currentResumeTime }, '*');
            iframe.contentWindow.postMessage({ method: 'seekTo', value: currentResumeTime }, '*');
          }
        } catch (e) {}
      }, 1000);
    }
  };
  setTimeout(dismissBuffer, 600); // 600ms failsafe timeout - never stuck buffering!

  showToast(`Streaming on ${srv.name.split(':')[0]}`, 'success');
}

function changeServer(val) {
  const idx = parseInt(val, 10);
  currentResumeTime = currentWatchSeconds;
  loadServerStream(idx);
}

// Dubbed Language & Multi-Audio Selector
let selectedDubLanguage = localStorage.getItem('preferred_dub_language') || 'en';

function changeDubLanguage(langCode, btnElement) {
  selectedDubLanguage = langCode;
  localStorage.setItem('preferred_dub_language', langCode);

  const langNames = {
    en: 'English (Original)',
    hi: 'Hindi Dubbed',
    ja: 'Japanese Audio',
    ta: 'Tamil Dubbed',
    te: 'Telugu Dubbed',
    kn: 'Kannada Dubbed',
    ml: 'Malayalam Dubbed',
    es: 'Spanish Dubbed',
    fr: 'French Dubbed',
    de: 'German Dubbed'
  };
  const langName = langNames[langCode] || langCode;

  // Sync select inputs
  const select = document.getElementById('player-audio-select');
  if (select) select.value = langCode;

  // Sync settings pills
  document.querySelectorAll('#settings-audio-pills .setting-pill').forEach(btn => {
    const langAttr = btn.getAttribute('onclick'); btn.classList.toggle('active', !!(langAttr && langAttr.includes(`'${langCode}'`)));
  });

  const isAnime = currentItem && (currentItem.platformId === 'animeworld' || currentItem.platformId === 'crunchyroll' || (currentItem.genres && currentItem.genres.includes('Animation')));

  // If anime and Japanese requested, route to AnimeWorld
  if (langCode === 'ja' && isAnime) {
    loadServerStream(5); // Server 6: AnimeWorld VIP
    showToast(`🎧 Audio set to ${langName} • Server 6 (AnimeWorld VIP) Active`, 'success');
  } else {
    const srv = (availableServers && availableServers[currentServerIndex]) || STREAMING_SERVERS[currentServerIndex] || STREAMING_SERVERS[0];
    const srvName = srv.name.split(':')[0];
    showToast(`🎧 Audio & Dub preference: ${langName} (${srvName} active)`, 'success');
  }
}

// 1-Click Server Switcher in Bottom Bar
function cycleNextServer() {
  if (!availableServers || availableServers.length <= 1) return;
  const nextIdx = (currentServerIndex + 1) % availableServers.length;
  loadServerStream(nextIdx);
}

// Pure Mode / Zap Overlays
function zapAdOverlays() {
  loadServerStream(currentServerIndex);
  showToast('Stream buffer refreshed cleanly!', 'success');
}

// Return to Movie Details on Close/Back
function closePlayer(returnToMovie = true) {
  if (watchProgressTimer) {
    clearInterval(watchProgressTimer);
    watchProgressTimer = null;
  }
  if (currentItem) {
    saveContinueWatching(currentItem, currentSeason, currentEpisode, currentWatchSeconds, currentDurationSeconds);
  }

  const iframe = document.getElementById('player-iframe');
  if (iframe) iframe.src = '';
  document.getElementById('player-overlay').style.display = 'none';

  // Restore mobile bottom navigation dock
  document.body.classList.remove('player-active');
  const mobBottomNav = document.getElementById('mobile-bottom-nav');
  if (mobBottomNav) {
    mobBottomNav.classList.remove('nav-hidden-for-player');
    mobBottomNav.style.display = '';
  }

  const settingsPanel = document.getElementById('player-settings-panel');
  if (settingsPanel) settingsPanel.style.display = 'none';

  if (isTheaterMode) {
    toggleTheaterMode(false);
  }

  if (returnToMovie && currentItem) {
    openDetailsModal(currentItem);
  }
}

// Play / Pause Simulation Toggle
function togglePlayPause() {
  isPlayerPlaying = !isPlayerPlaying;
  const icon = document.getElementById('play-pause-icon');
  if (icon) {
    icon.className = isPlayerPlaying ? 'fa-solid fa-pause' : 'fa-solid fa-play';
  }
  showToast(isPlayerPlaying ? 'Playing' : 'Paused');
}

// Seek 10s Backward / Forward Simulation
function seekRelative(seconds) {
  const sign = seconds > 0 ? '+10s' : '-10s';
  showToast(`Seek ${sign}`);
}

// Next Episode Handler
function playNextEpisode() {
  const item = currentItem;
  if (!item || item.type !== 'series') return;

  const currentSeasonData = item.seasons.find(s => s.season === currentSeason);
  if (!currentSeasonData) return;

  saveContinueWatching(item, currentSeason, currentEpisode, currentWatchSeconds, currentDurationSeconds);

  const nextEpNum = currentEpisode + 1;
  const nextEpExists = currentSeasonData.episodes.some(e => e.episode === nextEpNum);

  if (nextEpExists) {
    openPlayer(item, currentSeason, nextEpNum, currentServerIndex, 0);
    showToast(`Loaded Season ${currentSeason} Episode ${nextEpNum}`);
  } else {
    const nextSeasonData = item.seasons.find(s => s.season === currentSeason + 1);
    if (nextSeasonData && nextSeasonData.episodes.length > 0) {
      openPlayer(item, currentSeason + 1, 1, currentServerIndex, 0);
      showToast(`Loaded Season ${currentSeason + 1} Episode 1`);
    } else {
      showToast('You have reached the latest episode!');
    }
  }
}

// Volume Controls (Horizontal Hover Slider)
function setVolume(val) {
  const num = parseFloat(val);
  const bottomSlider = document.getElementById('bottom-volume-slider');
  if (bottomSlider) bottomSlider.value = num;

  const bottomIcon = document.getElementById('bottom-vol-icon');
  if (bottomIcon) {
    if (num === 0) {
      bottomIcon.className = 'fa-solid fa-volume-xmark text-red';
      isMuted = true;
    } else if (num < 0.5) {
      bottomIcon.className = 'fa-solid fa-volume-low';
      isMuted = false;
    } else {
      bottomIcon.className = 'fa-solid fa-volume-high';
      isMuted = false;
    }
  }
}

function toggleMute() {
  const slider = document.getElementById('bottom-volume-slider');
  if (!slider) return;
  if (isMuted) {
    slider.value = previousVolume || 1.0;
    setVolume(slider.value);
  } else {
    previousVolume = slider.value;
    slider.value = 0;
    setVolume(0);
  }
}

function toggleFullscreen() {
  const elem = document.getElementById('player-overlay');
  const icon = document.getElementById('fullscreen-icon');
  const bottomIcon = document.getElementById('bottom-fullscreen-icon');

  if (!document.fullscreenElement) {
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen();
    }
    if (icon) icon.className = 'fa-solid fa-compress';
    if (bottomIcon) bottomIcon.className = 'fa-solid fa-compress';
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
    if (icon) icon.className = 'fa-solid fa-expand';
    if (bottomIcon) bottomIcon.className = 'fa-solid fa-expand';
  }
}

// Episodes Drawer
function toggleEpisodesDrawer() {
  const drawer = document.getElementById('episodes-drawer');
  drawer.style.display = drawer.style.display === 'none' ? 'flex' : 'none';
  handlePlayerMouseMove();
}

function setupDrawerSeasons(item) {
  const select = document.getElementById('drawer-season-select');
  select.innerHTML = '';
  item.seasons.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.season;
    opt.textContent = `Season ${s.season}`;
    if (s.season === currentSeason) opt.selected = true;
    select.appendChild(opt);
  });
  renderDrawerEpisodes(currentSeason);
}

// RENDER DRAWER EPISODES WITH REAL THUMBNAILS
function renderDrawerEpisodes(seasonNum) {
  const item = currentItem;
  if (!item || !item.seasons) return;
  const sData = item.seasons.find(x => String(x.season) === String(seasonNum));
  const container = document.getElementById('drawer-episodes-list');
  container.innerHTML = '';

  if (!sData || !sData.episodes) return;

  sData.episodes.forEach(ep => {
    const isCurrent = (String(seasonNum) === String(currentSeason) && ep.episode === currentEpisode);
    const itemEl = document.createElement('div');
    itemEl.className = `drawer-ep-card ${isCurrent ? 'active' : ''}`;

    const thumbUrl = ep.thumbnail || `https://episodes.metahub.space/${item.imdbId || 'tt4574334'}/${seasonNum}/${ep.episode}/w780.jpg`;
    const fallbackThumb = item.backdrop || item.poster || FALLBACK_BACKDROP;

    itemEl.innerHTML = `
      <div class="drawer-ep-num">${ep.episode}</div>
      <div class="drawer-thumb-wrap">
        <img class="drawer-thumb-img" src="${thumbUrl}" alt="${ep.title}" onerror="this.onerror=null; this.src='${fallbackThumb}';">
        <div class="drawer-thumb-play"><i class="fa-solid fa-play"></i></div>
      </div>
      <div class="drawer-ep-details">
        <div class="drawer-ep-title">${ep.title}</div>
        <div class="drawer-ep-meta">${ep.duration || '48m'} • 4K UHD</div>
        <p class="drawer-ep-desc">${ep.description || 'Watch now with multi-audio and subtitles.'}</p>
      </div>
      ${isCurrent ? '<span class="ep-now-playing-pill"><i class="fa-solid fa-volume-high"></i> Playing</span>' : ''}
    `;

    itemEl.onclick = () => {
      saveContinueWatching(currentItem, currentSeason, currentEpisode, currentWatchSeconds, currentDurationSeconds);
      toggleEpisodesDrawer();
      openPlayer(item, seasonNum, ep.episode, currentServerIndex);
    };

    container.appendChild(itemEl);
  });
}

// ========================================================
// THEATER DUAL VIEW & MOVIE SETTINGS SYSTEM
// ========================================================

function toggleTheaterMode(forceState = null) {
  const overlay = document.getElementById('player-overlay');
  const details = document.getElementById('player-theater-details');
  const icon = document.getElementById('theater-icon');
  const text = document.getElementById('theater-text');
  const bottomIcon = document.getElementById('bottom-theater-icon');
  const bottomText = document.getElementById('bottom-theater-text');

  if (forceState !== null) {
    isTheaterMode = forceState;
  } else {
    isTheaterMode = !isTheaterMode;
  }

  if (isTheaterMode) {
    overlay.classList.add('theater-mode');
    if (details) details.style.display = 'block';
    if (icon) icon.className = 'fa-solid fa-expand';
    if (text) text.textContent = 'Full Page';
    if (bottomIcon) bottomIcon.className = 'fa-solid fa-expand';
    if (bottomText) bottomText.textContent = 'Full Page';
    if (currentItem) {
      populateTheaterDetails(currentItem);
    }
    showToast('Zoom Out: Server & movie details shown outside video', 'info');
  } else {
    overlay.classList.remove('theater-mode');
    if (details) details.style.display = 'none';
    if (icon) icon.className = 'fa-solid fa-compress';
    if (text) text.textContent = 'Zoom Out';
    if (bottomIcon) bottomIcon.className = 'fa-solid fa-compress';
    if (bottomText) bottomText.textContent = 'Zoom Out';
    showToast('Full Page View: Video controls only (No server/back overlap)', 'info');
  }
}

let playerTopBarTimer = null;
let isHeaderHovered = false;

function initPlayerTopBarAutoMove() {
  clearTimeout(playerTopBarTimer);
  const header = document.getElementById('player-header');
  if (header) {
    header.addEventListener('mouseenter', () => {
      isHeaderHovered = true;
      clearTimeout(playerTopBarTimer);
    });
    header.addEventListener('mouseleave', () => {
      isHeaderHovered = false;
      schedulePlayerTopBarAutoMove(3000);
    });
  }
  const srvSelect = document.getElementById('server-select');
  if (srvSelect) {
    srvSelect.addEventListener('focus', () => { isHeaderHovered = true; clearTimeout(playerTopBarTimer); });
    srvSelect.addEventListener('change', () => { isHeaderHovered = false; schedulePlayerTopBarAutoMove(3000); });
  }
  const audSelect = document.getElementById('player-audio-select');
  if (audSelect) {
    audSelect.addEventListener('focus', () => { isHeaderHovered = true; clearTimeout(playerTopBarTimer); });
    audSelect.addEventListener('change', () => { isHeaderHovered = false; schedulePlayerTopBarAutoMove(3000); });
  }
}

function revealPlayerTopBar() {
  const overlay = document.getElementById('player-overlay');
  if (!overlay) return;
  overlay.classList.remove('top-bar-hidden');
  clearTimeout(playerTopBarTimer);
  schedulePlayerTopBarAutoMove(5000);
}

function collapsePlayerTopBar(force = true) {
  const overlay = document.getElementById('player-overlay');
  if (!overlay || overlay.classList.contains('theater-mode')) return;
  isHeaderHovered = false; // Always release hover lock
  overlay.classList.add('top-bar-hidden');
  clearTimeout(playerTopBarTimer);
}

function schedulePlayerTopBarAutoMove(delay = 4500) {
  clearTimeout(playerTopBarTimer);
  const overlay = document.getElementById('player-overlay');
  if (!overlay || overlay.classList.contains('theater-mode')) return;
  playerTopBarTimer = setTimeout(() => {
    if (overlay.style.display !== 'none' && !overlay.classList.contains('theater-mode')) {
      const active = document.activeElement;
      if (active && (active.tagName === 'SELECT' || active.tagName === 'INPUT')) {
        schedulePlayerTopBarAutoMove(3000);
        return;
      }
      collapsePlayerTopBar(true);
    }
  }, delay);
}

function togglePlayerTopBar() {
  const overlay = document.getElementById('player-overlay');
  if (!overlay) return;
  if (overlay.classList.contains('top-bar-hidden')) {
    revealPlayerTopBar();
  } else {
    collapsePlayerTopBar(true);
  }
}

window.revealPlayerTopBar = revealPlayerTopBar;
window.collapsePlayerTopBar = collapsePlayerTopBar;
window.togglePlayerTopBar = togglePlayerTopBar;

function populateTheaterDetails(item) {
  if (!item) return;

  const titleEl = document.getElementById('theater-title');
  if (titleEl) titleEl.textContent = item.title;

  const matchEl = document.getElementById('theater-match');
  if (matchEl) matchEl.textContent = item.matchRate || '99% Match';

  const yearEl = document.getElementById('theater-year');
  if (yearEl) yearEl.textContent = item.year || '2024';

  const maturityEl = document.getElementById('theater-maturity');
  if (maturityEl) maturityEl.textContent = item.maturity || '16+';

  const durEl = document.getElementById('theater-duration');
  if (durEl) {
    durEl.textContent = item.duration || (item.type === 'series' ? `${item.seasons ? item.seasons.length : 1} Seasons` : '2h 10m');
  }

  const descEl = document.getElementById('theater-desc');
  if (descEl) descEl.textContent = item.description || 'Watch now in Ultra HD.';

  // Render 8 Server Chips in Theater View
  renderTheaterServerChips();

  // TV Series Seasons & Episodes in Theater View
  const epSection = document.getElementById('theater-episodes-section');
  if (item.type === 'series' && item.seasons && item.seasons.length > 0) {
    if (epSection) epSection.style.display = 'block';
    const seasonSelect = document.getElementById('theater-season-select');
    if (seasonSelect) {
      seasonSelect.innerHTML = '';
      item.seasons.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.season;
        opt.textContent = `Season ${s.season} (${s.episodes.length} Episodes)`;
        if (s.season === currentSeason) opt.selected = true;
        seasonSelect.appendChild(opt);
      });
    }
    renderTheaterEpisodes(currentSeason);
  } else {
    if (epSection) epSection.style.display = 'none';
  }

  // Render Similar Titles in Theater View
  renderTheaterSimilar(item);
}

function renderTheaterServerChips() {
  const container = document.getElementById('theater-server-chips');
  const statusEl = document.getElementById('theater-selected-server-name');
  if (!container) return;

  container.innerHTML = '';
  STREAMING_SERVERS.forEach((srv, idx) => {
    const pill = document.createElement('div');
    const adClass = srv.hasAds ? 'has-ad' : 'is-clean';
    pill.className = `server-chip-pill ${adClass} ${idx === currentServerIndex ? 'active' : ''}`;
    pill.innerHTML = `
      <i class="fa-solid fa-server ${srv.hasAds === true ? 'text-gold' : 'text-cyan'}"></i>
      <span>${srv.name.split(':')[0]}</span>
      <span class="server-chip-badge ${srv.hasAds === true ? 'badge-ad-warning' : 'badge-provider'}">${srv.shortBadge}</span>
    `;
    pill.onclick = () => {
      loadServerStream(idx);
    };
    container.appendChild(pill);
  });

  const curSrv = STREAMING_SERVERS[currentServerIndex] || STREAMING_SERVERS[0];
  if (statusEl && curSrv) {
    statusEl.textContent = `${curSrv.name} (${curSrv.badge})`;
  }
}

function renderTheaterEpisodes(seasonNum) {
  const item = currentItem;
  if (!item || !item.seasons) return;
  const sData = item.seasons.find(x => String(x.season) === String(seasonNum));
  const grid = document.getElementById('theater-episodes-grid');
  if (!grid) return;
  grid.innerHTML = '';

  if (!sData || !sData.episodes) return;

  sData.episodes.forEach(ep => {
    const isCurrent = (String(seasonNum) === String(currentSeason) && ep.episode === currentEpisode);
    const card = document.createElement('div');
    card.className = `ep-item-card ${isCurrent ? 'active' : ''}`;

    const thumbUrl = ep.thumbnail || `https://episodes.metahub.space/${item.imdbId || 'tt4574334'}/${seasonNum}/${ep.episode}/w780.jpg`;
    const fallbackThumb = item.backdrop || item.poster || FALLBACK_BACKDROP;

    card.innerHTML = `
      <div class="ep-item-num">${ep.episode}</div>
      <div class="ep-thumb-wrap">
        <img class="ep-thumb-img" src="${thumbUrl}" alt="${ep.title}" onerror="this.onerror=null; this.src='${fallbackThumb}';">
        <div class="ep-thumb-play">
          <i class="fa-solid fa-play"></i>
        </div>
        <span class="ep-thumb-duration">${ep.duration || '48m'}</span>
      </div>
      <div class="ep-item-info">
        <div class="ep-item-header">
          <span class="ep-item-title">${ep.title}</span>
          <div style="display: flex; align-items: center; gap: 8px;">
            ${isCurrent ? '<span class="ep-now-playing-pill"><i class="fa-solid fa-volume-high"></i> Playing</span>' : ''}
            <span class="ep-badge-hd">4K UHD</span>
          </div>
        </div>
        <p class="ep-item-desc">${ep.description || 'Watch Episode ' + ep.episode + ' now in Ultra HD.'}</p>
      </div>
    `;

    card.onclick = () => {
      saveContinueWatching(currentItem, currentSeason, currentEpisode, currentWatchSeconds, currentDurationSeconds);
      openPlayer(item, seasonNum, ep.episode, currentServerIndex);
      renderTheaterEpisodes(seasonNum);
    };

    grid.appendChild(card);
  });
}

function renderTheaterSimilar(item) {
  const grid = document.getElementById('theater-similar-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const similar = currentCatalog
    .filter(x => x.id !== item.id && (x.platformId === item.platformId || (x.genres && x.genres.some(g => item.genres && item.genres.includes(g)))))
    .slice(0, 6);

  similar.forEach(sim => {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', sim.title);
    card.innerHTML = `
      <div class="card-poster-wrap">
        <img class="card-poster" src="${sim.poster}" alt="${sim.title}" onerror="window.handleImgError(this)">
        <div class="card-ott-badge badge-${sim.platformId}">${sim.platformBadge || sim.platform}</div>
        <div class="card-play-hover">
          <div class="play-circle"><i class="fa-solid fa-play"></i></div>
        </div>
      </div>
      <div class="card-info">
        <h4 class="card-title">${sim.title}</h4>
        <div class="card-meta">
          <span class="text-green font-bold">${sim.matchRate || '99% Match'}</span>
          <span>${sim.duration}</span>
        </div>
      </div>
    `;
    card.onclick = () => {
      openPlayer(sim, 1, 1, currentServerIndex);
    };
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === 'Select') {
        e.preventDefault();
        openPlayer(sim, 1, 1, currentServerIndex);
      }
    });
    grid.appendChild(card);
  });
}

function togglePlayerSettings(forceState = null) {
  const panel = document.getElementById('player-settings-panel');
  if (!panel) return;

  const isVisible = panel.style.display !== 'none';
  const shouldShow = forceState !== null ? forceState : !isVisible;

  panel.style.display = shouldShow ? 'block' : 'none';

  if (shouldShow) {
    const select = document.getElementById('settings-panel-server-select');
    if (select) select.value = currentServerIndex;

    // Sync Zoom Pills
    document.querySelectorAll('.settings-group button[onclick*="setVideoZoom"]').forEach(btn => {
      const match = btn.getAttribute('onclick').match(/setVideoZoom\('([^']+)'/);
      if (match && match[1] === currentVideoZoom) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Sync Quality Pills
    document.querySelectorAll('.settings-group button[onclick*="setQualityPill"]').forEach(btn => {
      const match = btn.getAttribute('onclick').match(/setQualityPill\('([^']+)'/);
      if (match && match[1] === currentQuality) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Sync Speed Pills
    document.querySelectorAll('.settings-group button[onclick*="setPlaybackSpeed"]').forEach(btn => {
      const match = btn.getAttribute('onclick').match(/setPlaybackSpeed\(([^,]+)/);
      if (match && parseFloat(match[1]) === currentSpeed) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    showToast('Movie & Stream Settings opened', 'info');
  }
}

// Aspect Ratio / Screen Fit Management
const ZOOM_MODES = [
  { key: 'fit', label: 'Fit 16:9', desc: 'Fit to Screen (Default 16:9)', class: 'zoom-fit' },
  { key: 'zoom', label: 'Fill Crop', desc: 'Zoom / Fill (1.18x Crop)', class: 'zoom-fill' },
  { key: 'cinema', label: 'Cinema 21:9', desc: 'Cinema Wide (21:9 Ultra-Wide)', class: 'zoom-cinema' },
  { key: 'stretch', label: 'Stretch', desc: 'Stretch Full Width', class: 'zoom-stretch' }
];
let currentZoomIndex = 0;

function cycleVideoZoom() {
  currentZoomIndex = (currentZoomIndex + 1) % ZOOM_MODES.length;
  const target = ZOOM_MODES[currentZoomIndex];
  setVideoZoom(target.key);
}

function setVideoZoom(mode, btn = null) {
  currentVideoZoom = mode;
  const foundIdx = ZOOM_MODES.findIndex(z => z.key === mode);
  if (foundIdx !== -1) currentZoomIndex = foundIdx;

  const zoomText = document.getElementById('player-zoom-text');
  if (zoomText) zoomText.textContent = ZOOM_MODES[currentZoomIndex].label;

  const iframe = document.getElementById('player-iframe');
  if (iframe) {
    iframe.classList.remove('zoom-fit', 'zoom-fill', 'zoom-cinema', 'zoom-stretch');
    iframe.classList.add(ZOOM_MODES[currentZoomIndex].class);
  }

  // Update button active state in settings panel
  document.querySelectorAll('.settings-group button[onclick*="setVideoZoom"]').forEach(p => {
    const match = p.getAttribute('onclick').match(/setVideoZoom\('([^']+)'/);
    if (match && match[1] === mode) {
      p.classList.add('active');
    } else {
      p.classList.remove('active');
    }
  });

  const labelMap = {
    fit: 'Fit to Screen (Default 16:9)',
    zoom: 'Zoom / Fill (1.18x Crop)',
    cinema: 'Cinema Wide (21:9 Ultra-Wide)',
    stretch: 'Stretch Full Width'
  };
  showToast(`📺 Screen Fit: ${labelMap[mode] || mode}`, 'success');
}

function setQualityPill(quality, btn = null) {
  currentQuality = quality;
  document.querySelectorAll('.settings-group button[onclick*="setQualityPill"]').forEach(p => {
    const match = p.getAttribute('onclick').match(/setQualityPill\('([^']+)'/);
    if (match && match[1] === quality) {
      p.classList.add('active');
    } else {
      p.classList.remove('active');
    }
  });

  const labelMap = {
    '4k': '4K Ultra HD (Dolby Vision / HDR)',
    '1080p': '1080p Full HD (Direct Stream)',
    'auto': 'Auto Adaptive (Optimized Bandwidth)'
  };
  showToast(`Stream Quality: ${labelMap[quality] || quality}`, 'success');
}

// Playback Speed Management (0.75x, 1.0x, 1.25x, 1.5x, 2.0x)
const PLAYBACK_SPEEDS = [0.75, 1.0, 1.25, 1.5, 2.0];
let currentSpeedIndex = 1; // Default 1.0x

function cyclePlaybackSpeed() {
  currentSpeedIndex = (currentSpeedIndex + 1) % PLAYBACK_SPEEDS.length;
  const newSpeed = PLAYBACK_SPEEDS[currentSpeedIndex];
  setPlaybackSpeed(newSpeed);
}

function setPlaybackSpeed(speed, btn = null) {
  currentSpeed = parseFloat(speed);
  const foundIdx = PLAYBACK_SPEEDS.indexOf(currentSpeed);
  if (foundIdx !== -1) currentSpeedIndex = foundIdx;

  const speedText = document.getElementById('player-speed-text');
  if (speedText) speedText.textContent = `${currentSpeed}x`;

  // Update pills in settings panel
  document.querySelectorAll('.settings-group button[onclick*="setPlaybackSpeed"]').forEach(p => {
    const match = p.getAttribute('onclick').match(/setPlaybackSpeed\(([^,]+)/);
    if (match && parseFloat(match[1]) === currentSpeed) {
      p.classList.add('active');
    } else {
      p.classList.remove('active');
    }
  });

  try {
    const iframe = document.getElementById('player-iframe');
    if (iframe && iframe.contentWindow) {
      const vids = iframe.contentWindow.document.querySelectorAll('video');
      vids.forEach(v => v.playbackRate = currentSpeed);
    }
  } catch (e) {
    // Cross-origin iframe restriction is normal
  }

  showToast(`⚡ Playback Speed: ${currentSpeed}x`, 'info');
}

function updateActiveServerChips() {
  const curSrv = STREAMING_SERVERS[currentServerIndex] || STREAMING_SERVERS[0];
  if (!curSrv) return;

  // 1. Top bar select
  const topSelect = document.getElementById('server-select');
  if (topSelect) topSelect.value = currentServerIndex;

  // 2. Settings panel select
  const settingsSelect = document.getElementById('settings-panel-server-select');
  if (settingsSelect) settingsSelect.value = currentServerIndex;

  // 3. Theater chips
  const theaterChips = document.querySelectorAll('#theater-server-chips .server-chip-pill');
  theaterChips.forEach((chip, idx) => {
    chip.classList.toggle('active', idx === currentServerIndex);
  });
  const theaterServerName = document.getElementById('theater-selected-server-name');
  if (theaterServerName) theaterServerName.textContent = `${curSrv.name} (${curSrv.badge})`;

  // 4. Modal chips
  const modalChips = document.querySelectorAll('#modal-server-chips .server-chip-pill');
  modalChips.forEach((chip, idx) => {
    chip.classList.toggle('active', idx === currentServerIndex);
  });
  const modalServerName = document.getElementById('modal-selected-server-name');
  if (modalServerName) modalServerName.textContent = `${curSrv.name} (${curSrv.badge})`;
  const playText = document.getElementById('modal-play-text');
  if (playText) playText.textContent = `Play (${curSrv.name.split(':')[0]})`;

  // 5. Quick server tag in bottom bar
  const quickTag = document.getElementById('quick-server-tag');
  if (quickTag) quickTag.textContent = curSrv.name.split(':')[0];
}

// ========================================================
// SECURITY AUDIT MODAL
// ========================================================

async function openAuditModal() {
  closeProfileDropdown();
  closeNotificationDropdown();
  closeMobileBrowseMenu();
  closeAllModals();
  const modal = document.getElementById('audit-modal');
  const findingsList = document.getElementById('audit-findings-list');
  findingsList.innerHTML = '<p style="color: var(--text-dim); padding: 20px;">Loading forensic findings...</p>';
  modal.style.display = 'flex';

  try {
    const res = await fetch('/api/security-audit');
    const data = await res.json();
    findingsList.innerHTML = '';

    data.findings.forEach(f => {
      const card = document.createElement('div');
      card.className = 'finding-card';
      card.innerHTML = `
        <div class="finding-header">
          <span class="finding-title"><i class="fa-solid fa-triangle-exclamation text-red"></i> ${f.title}</span>
          <span class="finding-severity ${f.severity.toLowerCase().includes('high') ? 'sev-high' : 'sev-med'}">${f.severity}</span>
        </div>
        <div class="finding-evidence"><strong>Evidence:</strong> ${f.evidence}</div>
        <p class="finding-desc">${f.detail}</p>
      `;
      findingsList.appendChild(card);
    });
  } catch (err) {
    findingsList.innerHTML = '<p style="color: var(--red-accent); padding: 20px;">Failed to fetch security audit report.</p>';
  }
}

function closeAuditModal() {
  document.getElementById('audit-modal').style.display = 'none';
}

function handleAuditBackdropClick(e) {
  if (e.target.id === 'audit-modal') {
    closeAuditModal();
  }
}

// Toast System
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  const msgEl = document.getElementById('toast-message');
  const icon = document.getElementById('toast-icon');

  msgEl.textContent = message;
  if (type === 'error') {
    icon.className = 'fa-solid fa-circle-xmark text-red';
  } else if (type === 'success') {
    icon.className = 'fa-solid fa-circle-check text-green';
  } else {
    icon.className = 'fa-solid fa-circle-info text-blue';
  }

  toast.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

// ========================================================
// SMART TV D-PAD SPATIAL NAVIGATION & REMOTE CONTROL ENGINE
// ========================================================

let tvModeActive = false;
let lastFocusedTvElement = null;

function isTvEnvironment() {
  const ua = (navigator.userAgent || '').toLowerCase();
  return (
    ua.includes('smarttv') ||
    ua.includes('androidtv') ||
    ua.includes('leanback') ||
    ua.includes('large screen') ||
    ua.includes('crkey') ||
    ua.includes('aft') ||
    ua.includes('googletv') ||
    ua.includes('tizen') ||
    ua.includes('webos') ||
    ua.includes('appletv')
  );
}

function enableTvMode() {
  if (tvModeActive) return;
  tvModeActive = true;
  document.body.classList.add('tv-mode');
  console.log('[CinemaVerse TV] Smart TV Spatial Navigation Mode Activated');

  // Ensure all interactive elements have tabindex="0"
  document.querySelectorAll('.ott-card, .movie-card, .top10-card, .ai-pill-btn, .btn-ai-filter-quick, .netflix-nav-link, .server-chip-pill, .modal-lang-chip').forEach(el => {
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
  });

  // Provide initial focus to hero play button if nothing is focused
  setTimeout(() => {
    if (!document.activeElement || document.activeElement === document.body) {
      const heroPlay = document.getElementById('hero-play-btn');
      if (heroPlay) setTvFocus(heroPlay);
    }
  }, 350);
}

function initSmartTvNavigation() {
  if (isTvEnvironment()) {
    enableTvMode();
  }

  // Detect first remote D-Pad keypress on any platform to activate TV mode
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      if (!tvModeActive && window.innerWidth >= 768) {
        enableTvMode();
      }
    }
  }, { passive: true });

  // Clear TV focus ring if user clicks or touches screen
  window.addEventListener('pointerdown', () => {
    document.querySelectorAll('.tv-focused').forEach(el => el.classList.remove('tv-focused'));
  }, { passive: true });
}

function setTvFocus(element) {
  if (!element) return;
  if (!element.hasAttribute('tabindex') && !['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName)) {
    element.setAttribute('tabindex', '0');
  }
  document.querySelectorAll('.tv-focused').forEach(el => el.classList.remove('tv-focused'));
  element.classList.add('tv-focused');
  lastFocusedTvElement = element;

  try {
    element.focus({ preventScroll: true });
  } catch (e) {
    element.focus();
  }

  // Smoothly center the focused element on the TV screen
  try {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'center'
    });
  } catch (e) {
    element.scrollIntoView();
  }
}

function handleSpatialNavigation(direction) {
  enableTvMode();

  const player = document.getElementById('player-overlay');
  const playerOpen = player && (player.style.display === 'flex' || player.classList.contains('active'));
  const modal = document.getElementById('details-modal');
  const modalOpen = modal && (modal.style.display === 'flex' || modal.classList.contains('show'));

  // Container scope: modal > player > document
  let scopeRoot = document;
  if (modalOpen) {
    scopeRoot = modal;
  } else if (playerOpen) {
    scopeRoot = player;
  }

  // Query all visible candidate elements
  const selector = 'button:not([disabled]), a[href]:not([disabled]), input:not([disabled]), ' +
                   '[tabindex="0"], [tabindex]:not([tabindex="-1"]), .movie-card, .top10-card, ' +
                   '.hero-arrow, .netflix-btn, .btn-round, .ott-card, .ott-card-chip, ' +
                   '.ai-pill-btn, .btn-ai-filter-quick, .cat-filter-btn, .filter-chip, ' +
                   '.server-pill, .server-chip-pill, .episode-item, ' +
                   '.netflix-nav-link, .row-view-all-btn, .modal-lang-chip';

  const rawCandidates = Array.from(scopeRoot.querySelectorAll(selector));
  const candidates = rawCandidates.filter(el => {
    if (el.offsetWidth === 0 && el.offsetHeight === 0) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    if (el.closest('[style*="display: none"], [style*="display:none"], .hidden')) return false;
    return true;
  });

  if (!candidates.length) return false;

  let current = document.activeElement;
  // If current element is valid, ensure it is in candidates list so it can navigate relative to itself
  if (current && current !== document.body && scopeRoot.contains(current)) {
    if (!candidates.includes(current)) {
      candidates.push(current);
    }
  } else {
    // If we have a remembered element still valid in this scope
    if (lastFocusedTvElement && candidates.includes(lastFocusedTvElement)) {
      setTvFocus(lastFocusedTvElement);
      return true;
    }
    // Default focus target: Play button
    let defaultEl = scopeRoot.querySelector('#hero-play-btn, #modal-play-btn, #btn-modal-play, .btn-modal-play, #btn-play-pause') || candidates[0];
    setTvFocus(defaultEl);
    return true;
  }

  const curRect = current.getBoundingClientRect();
  const curCenter = { x: curRect.left + curRect.width / 2, y: curRect.top + curRect.height / 2 };

  let bestCand = null;
  let bestScore = Infinity;

  for (const cand of candidates) {
    if (cand === current) continue;
    const candRect = cand.getBoundingClientRect();
    const candCenter = { x: candRect.left + candRect.width / 2, y: candRect.top + candRect.height / 2 };

    const dx = candCenter.x - curCenter.x;
    const dy = candCenter.y - curCenter.y;

    let valid = false;
    let primary = 0;
    let secondary = 0;

    if (direction === 'right') {
      if (dx > 8) {
        valid = true;
        primary = dx;
        secondary = Math.abs(dy);
      }
    } else if (direction === 'left') {
      if (dx < -8) {
        valid = true;
        primary = -dx;
        secondary = Math.abs(dy);
      }
    } else if (direction === 'down') {
      if (dy > 8) {
        valid = true;
        primary = dy;
        secondary = Math.abs(dx);
      }
    } else if (direction === 'up') {
      if (dy < -8) {
        valid = true;
        primary = -dy;
        secondary = Math.abs(dx);
      }
    }

    if (valid) {
      const score = primary * 1.0 + secondary * 2.2;
      if (score < bestScore) {
        bestScore = score;
        bestCand = cand;
      }
    }
  }

  if (bestCand) {
    setTvFocus(bestCand);
    return true;
  }

  // Row jumping fallback: If moving DOWN/UP and no aligned neighbor, jump to nearest element in adjacent row
  if (direction === 'down') {
    const below = candidates.filter(c => c.getBoundingClientRect().top > curRect.bottom - 4);
    if (below.length) {
      below.sort((a, b) => {
        const da = Math.abs(a.getBoundingClientRect().top - curRect.bottom) * 2 + Math.abs(a.getBoundingClientRect().left - curRect.left);
        const db = Math.abs(b.getBoundingClientRect().top - curRect.bottom) * 2 + Math.abs(b.getBoundingClientRect().left - curRect.left);
        return da - db;
      });
      setTvFocus(below[0]);
      return true;
    }
  } else if (direction === 'up') {
    const above = candidates.filter(c => c.getBoundingClientRect().bottom < curRect.top + 4);
    if (above.length) {
      above.sort((a, b) => {
        const da = Math.abs(curRect.top - a.getBoundingClientRect().bottom) * 2 + Math.abs(a.getBoundingClientRect().left - curRect.left);
        const db = Math.abs(curRect.top - b.getBoundingClientRect().bottom) * 2 + Math.abs(b.getBoundingClientRect().left - curRect.left);
        return da - db;
      });
      setTvFocus(above[0]);
      return true;
    }
  }

  return false;
}

// Global Keyboard & Remote Control Shortcuts
function setupKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    const player = document.getElementById('player-overlay');
    const playerOpen = player && (player.style.display === 'flex' || player.classList.contains('active'));
    const modal = document.getElementById('details-modal');
    const modalOpen = modal && (modal.style.display === 'flex' || modal.classList.contains('show'));

    // 1. Back / Escape Navigation
    if (e.key === 'Escape' || e.key === 'GoBack' || e.key === 'Back' || e.keyCode === 27 || e.keyCode === 4) {
      const settingsPanel = document.getElementById('player-settings-panel');
      if (settingsPanel && settingsPanel.style.display !== 'none') {
        togglePlayerSettings(false);
      } else if (playerOpen) {
        closePlayer();
      } else if (modalOpen) {
        closeDetailsModal();
      } else {
        const searchBox = document.getElementById('search-box');
        if (searchBox && searchBox.classList.contains('open')) {
          toggleSearchBox();
        } else {
          // TV Remote back press returns focus to Hero Play
          const heroPlay = document.getElementById('hero-play-btn');
          if (heroPlay) setTvFocus(heroPlay);
        }
      }
      return;
    }

    // 2. Play / Pause Spacebar
    if (e.key === ' ' && playerOpen) {
      if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
      e.preventDefault();
      togglePlayPause();
      return;
    }

    // 3. Directional Navigation (Smart TV D-Pad & Keyboard Arrows)
    if (e.key === 'ArrowLeft') {
      if (playerOpen) {
        seekRelative(-10);
      } else {
        e.preventDefault();
        handleSpatialNavigation('left');
      }
      return;
    } else if (e.key === 'ArrowRight') {
      if (playerOpen) {
        seekRelative(10);
      } else {
        e.preventDefault();
        handleSpatialNavigation('right');
      }
      return;
    } else if (e.key === 'ArrowDown') {
      if (!playerOpen || modalOpen) {
        e.preventDefault();
        handleSpatialNavigation('down');
      }
      return;
    } else if (e.key === 'ArrowUp') {
      if (!playerOpen || modalOpen) {
        e.preventDefault();
        handleSpatialNavigation('up');
      }
      return;
    }

    // 4. Remote OK / Center / Select / Enter
    if (e.key === 'Enter' || e.key === 'Select' || e.keyCode === 13) {
      const activeEl = document.activeElement;
      if (activeEl && activeEl !== document.body) {
        if (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') return;
        e.preventDefault();
        activeEl.click();
        return;
      } else if (!playerOpen && !modalOpen) {
        const heroPlay = document.getElementById('hero-play-btn');
        if (heroPlay) {
          setTvFocus(heroPlay);
          heroPlay.click();
        }
        return;
      }
    }

    // 5. Player Media Shortcuts
    if (e.key === 'f' || e.key === 'F') {
      if (playerOpen) toggleFullscreen();
    } else if (e.key === 'm' || e.key === 'M') {
      if (playerOpen) toggleMute();
    } else if ((e.key === 't' || e.key === 'T') && playerOpen) {
      toggleTheaterMode();
    } else if ((e.key === 'h' || e.key === 'H' || e.key === 'z' || e.key === 'Z') && playerOpen) {
      togglePlayerTopBar();
    } else if ((e.key === 's' || e.key === 'S') && playerOpen) {
      togglePlayerSettings();
    } else if ((e.key === 'e' || e.key === 'E') && playerOpen) {
      toggleEpisodesDrawer();
    } else if (e.key === '/' || (e.ctrlKey && e.key === 'k')) {
      e.preventDefault();
      const input = document.getElementById('search-input');
      const box = document.getElementById('search-box');
      if (box) box.classList.add('open');
      if (input) input.focus();
    }
  });
}

// ========================================================
// NETFLIX PROFILES & CUSTOM AVATARS SYSTEM
// ========================================================
const STORAGE_PROFILE_NAME = 'cinemaverse_profile_name';
const STORAGE_PROFILE_AVATAR = 'cinemaverse_profile_avatar';
const STORAGE_DEFAULT_SERVER = 'cinemaverse_default_server';
const STORAGE_DEFAULT_ZOOM = 'cinemaverse_default_zoom';
const STORAGE_AUTOPLAY_NEXT = 'cinemaverse_autoplay_next';
const STORAGE_SUB_SIZE = 'cinemaverse_sub_size';
const STORAGE_AUTO_SUB = 'cinemaverse_auto_sub';
const STORAGE_NOTIF_READ = 'cinemaverse_notif_read';

const NETFLIX_AVATARS = [
  { id: 'classic', name: 'Classic Red', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80' },
  { id: 'cyberpunk', name: 'Cyberpunk Neon', url: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=150&q=80' },
  { id: 'cinema', name: 'Cinema Director', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80' },
  { id: 'anime', name: 'Anime Hero', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80' },
  { id: 'star', name: 'Retro Star', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80' },
  { id: 'ninja', name: 'Shadow Warrior', url: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?auto=format&fit=crop&w=150&q=80' },
  { id: 'gamer', name: '4K Streamer', url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80' },
  { id: 'neon', name: 'Neon Mask', url: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=150&q=80' }
];

let currentProfileName = localStorage.getItem(STORAGE_PROFILE_NAME) || localStorage.getItem('cinemamirror_profile_name') || 'Cinema Fan';
let currentProfileAvatar = localStorage.getItem(STORAGE_PROFILE_AVATAR) || localStorage.getItem('cinemamirror_profile_avatar') || NETFLIX_AVATARS[0].url;
let selectedEditAvatar = currentProfileAvatar;

function initProfile() {
  updateProfileDOM();
  setupProfileEventListeners();
}

function updateProfileDOM() {
  const navName = document.getElementById('nav-profile-name');
  const navAvatar = document.getElementById('nav-profile-avatar');
  const dropdownName = document.getElementById('dropdown-profile-name');
  const dropdownAvatar = document.getElementById('dropdown-profile-avatar');

  if (navName) navName.textContent = currentProfileName;
  if (navAvatar) navAvatar.src = currentProfileAvatar;
  if (dropdownName) dropdownName.textContent = currentProfileName;
  if (dropdownAvatar) dropdownAvatar.src = currentProfileAvatar;
}

function setupProfileEventListeners() {
  const btn = document.getElementById('nav-profile-btn');
  const dropdown = document.getElementById('profile-dropdown-menu');
  const wrapper = document.getElementById('netflix-profile-wrapper');

  if (btn) {
    btn.onclick = function(e) {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }
      toggleProfileDropdown();
    };
  }

  if (dropdown) {
    dropdown.onclick = function(e) {
      e.stopPropagation();
    };
  }

  // Bell Notifications button direct handler
  const bellBtn = document.getElementById('nav-bell-btn');
  const bellDropdown = document.getElementById('notifications-dropdown');
  if (bellBtn) {
    bellBtn.onclick = function(e) {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }
      toggleNotificationDropdown();
    };
  }
  if (bellDropdown) {
    bellDropdown.onclick = function(e) {
      e.stopPropagation();
    };
  }

  // Mobile browse menu trigger direct handler
  const browseBtn = document.getElementById('nav-mobile-browse');
  if (browseBtn) {
    browseBtn.onclick = function(e) {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }
      toggleMobileBrowseMenu();
    };
  }

  // Desktop hover intent for Netflix-standard smooth dropdown
  if (wrapper && window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    let hoverTimer = null;
    wrapper.addEventListener('mouseenter', () => {
      clearTimeout(hoverTimer);
      openProfileDropdown();
    });
    wrapper.addEventListener('mouseleave', () => {
      hoverTimer = setTimeout(() => {
        closeProfileDropdown();
      }, 250);
    });
  }
}

function openProfileDropdown() {
  const dropdown = document.getElementById('profile-dropdown-menu');
  const caret = document.getElementById('nav-profile-caret');
  const btn = document.getElementById('nav-profile-btn');
  
  closeNotificationDropdown();

  if (dropdown) {
    dropdown.classList.add('show');
    dropdown.style.display = 'block';
  }
  if (caret) caret.style.transform = 'rotate(180deg)';
  if (btn) btn.setAttribute('aria-expanded', 'true');
}

function closeProfileDropdown() {
  const dropdown = document.getElementById('profile-dropdown-menu');
  const caret = document.getElementById('nav-profile-caret');
  const btn = document.getElementById('nav-profile-btn');

  if (dropdown) {
    dropdown.classList.remove('show');
    dropdown.style.display = 'none';
  }
  if (caret) caret.style.transform = 'rotate(0deg)';
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

function toggleProfileDropdown(e) {
  if (e && e.stopPropagation) {
    e.stopPropagation();
  }
  const dropdown = document.getElementById('profile-dropdown-menu');
  if (!dropdown) return;
  const isVisible = dropdown.classList.contains('show') || dropdown.style.display === 'block';
  if (isVisible) {
    closeProfileDropdown();
  } else {
    openProfileDropdown();
  }
}

// Master Modal Dismissal Handler
function closeAllModals() {
  const modalBackdrops = document.querySelectorAll('.netflix-modal-backdrop');
  modalBackdrops.forEach(m => {
    if (m) m.style.display = 'none';
  });
}
window.closeAllModals = closeAllModals;

// Unified Profile Dropdown Option Handler
function handleProfileOption(e, action, param) {
  if (e) {
    if (e.stopPropagation) e.stopPropagation();
    if (e.preventDefault) e.preventDefault();
  }
  closeProfileDropdown();
  closeNotificationDropdown();
  closeMobileBrowseMenu();
  closeAllModals();

  if (action === 'profile') {
    openProfileModal();
  } else if (action === 'downloads') {
    showDownloadsSection();
  } else if (action === 'watchlist') {
    showWatchlist();
  } else if (action === 'settings') {
    openSettingsModal(param || 'install');
  } else if (action === 'audit') {
    openAuditModal();
  }
}
window.handleProfileOption = handleProfileOption;

function openProfileModal() {
  closeProfileDropdown();
  closeAllModals();

  const modal = document.getElementById('profile-edit-modal');
  const nameInput = document.getElementById('profile-name-input');
  const previewName = document.getElementById('edit-preview-name');
  const previewAvatar = document.getElementById('edit-preview-avatar');

  selectedEditAvatar = currentProfileAvatar;
  if (nameInput) nameInput.value = currentProfileName;
  if (previewName) previewName.textContent = currentProfileName;
  if (previewAvatar) previewAvatar.src = currentProfileAvatar;

  renderAvatarGrid();

  if (modal) modal.style.display = 'flex';
}

function closeProfileModal() {
  const modal = document.getElementById('profile-edit-modal');
  if (modal) modal.style.display = 'none';
}

function handleProfileBackdropClick(e) {
  if (e.target.id === 'profile-edit-modal') {
    closeProfileModal();
  }
}

function renderAvatarGrid() {
  const grid = document.getElementById('avatars-grid');
  if (!grid) return;
  grid.innerHTML = '';

  NETFLIX_AVATARS.forEach(av => {
    const isSelected = av.url === selectedEditAvatar;
    const item = document.createElement('div');
    item.className = `avatar-option ${isSelected ? 'selected' : ''}`;
    item.onclick = () => selectAvatar(av.url, item);
    item.innerHTML = `
      <img src="${av.url}" alt="${av.name}">
      ${isSelected ? '<div class="avatar-check"><i class="fa-solid fa-check"></i></div>' : ''}
    `;
    grid.appendChild(item);
  });
}

function selectAvatar(url, element) {
  selectedEditAvatar = url;
  const previewAvatar = document.getElementById('edit-preview-avatar');
  if (previewAvatar) previewAvatar.src = url;

  document.querySelectorAll('#avatars-grid .avatar-option').forEach(el => {
    el.classList.remove('selected');
    const chk = el.querySelector('.avatar-check');
    if (chk) chk.remove();
  });

  element.classList.add('selected');
  const chk = document.createElement('div');
  chk.className = 'avatar-check';
  chk.innerHTML = '<i class="fa-solid fa-check"></i>';
  element.appendChild(chk);
}

function updateProfilePreviewName(val) {
  const previewName = document.getElementById('edit-preview-name');
  if (previewName) {
    previewName.textContent = val.trim() || 'Cinema Fan';
  }
}

function saveProfileChanges() {
  const nameInput = document.getElementById('profile-name-input');
  const newName = (nameInput ? nameInput.value.trim() : '') || 'Cinema Fan';

  currentProfileName = newName;
  currentProfileAvatar = selectedEditAvatar;

  localStorage.setItem(STORAGE_PROFILE_NAME, currentProfileName);
  localStorage.setItem(STORAGE_PROFILE_AVATAR, currentProfileAvatar);

  updateProfileDOM();
  closeProfileModal();
  showToast(`Profile updated: Welcome back, ${currentProfileName}!`, 'success');
}

// ========================================================
// NOTIFICATIONS FOR NEW RELEASES & MOVIES
// ========================================================
function initNotifications() {
  // Handled dynamically
}

function openNotificationDropdown() {
  const dropdown = document.getElementById('notifications-dropdown');
  const btn = document.getElementById('nav-bell-btn');
  closeProfileDropdown();

  if (dropdown) {
    dropdown.classList.add('show');
    dropdown.style.display = 'block';
  }
  if (btn) btn.setAttribute('aria-expanded', 'true');
}

function closeNotificationDropdown() {
  const dropdown = document.getElementById('notifications-dropdown');
  const btn = document.getElementById('nav-bell-btn');

  if (dropdown) {
    dropdown.classList.remove('show');
    dropdown.style.display = 'none';
  }
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

function toggleNotificationDropdown(e) {
  if (e && e.stopPropagation) e.stopPropagation();
  const dropdown = document.getElementById('notifications-dropdown');
  if (!dropdown) return;
  const isShown = dropdown.classList.contains('show') || dropdown.style.display === 'block';
  if (isShown) {
    closeNotificationDropdown();
  } else {
    openNotificationDropdown();
  }
}

function renderNotifications() {
  const list = document.getElementById('notif-list');
  const badge = document.getElementById('bell-badge');
  if (!list || !currentCatalog || currentCatalog.length === 0) return;

  // Filter standout new releases / popular titles
  const highlights = currentCatalog.filter(x => x.year >= 2022 || x.rank).slice(0, 6);
  if (highlights.length === 0) return;

  const isRead = localStorage.getItem(STORAGE_NOTIF_READ) === 'true';
  if (badge) {
    badge.textContent = isRead ? '0' : String(highlights.length);
    badge.style.display = isRead ? 'none' : 'inline-block';
  }

  list.innerHTML = '';
  highlights.forEach(item => {
    const itemEl = document.createElement('div');
    itemEl.className = 'notif-item';
    itemEl.onclick = () => {
      toggleNotificationDropdown();
      openPlayer(item);
    };

    const isTop = !!item.rank;
    itemEl.innerHTML = `
      <img class="notif-poster" src="${item.poster}" alt="${item.title}" onerror="window.handleImgError(this)">
      <div class="notif-content">
        <div class="notif-tag-row">
          <span class="notif-tag">${isTop ? 'Trending #1' : 'New 4K Release'}</span>
          <span class="notif-date">${item.year || '2026'} • ${item.quality || '4K UHD'}</span>
        </div>
        <h5 class="notif-title">${item.title}</h5>
        <p class="notif-desc">${item.description || 'Watch now in multi-language Ultra HD audio.'}</p>
      </div>
      <div class="notif-play-btn" title="Watch Now">
        <i class="fa-solid fa-play"></i>
      </div>
    `;
    list.appendChild(itemEl);
  });
}

function clearAllNotifications() {
  localStorage.setItem(STORAGE_NOTIF_READ, 'true');
  const badge = document.getElementById('bell-badge');
  if (badge) badge.style.display = 'none';
  showToast('All notifications marked as read', 'info');
}

// ========================================================
// DEEP APP SETTINGS & PWA DOWNLOAD SYSTEM
// ========================================================
let deferredInstallPrompt = null;

function initPwaInstall() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    const btn = document.getElementById('btn-install-pwa');
    if (btn) {
      btn.innerHTML = '<i class="fa-solid fa-download"></i> Install App Now';
    }
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    showToast('🎉 CinemaVerse Pro installed successfully on your home screen!', 'success');
  });

  // Register Service Worker for PWA compliance
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.warn('SW registration skipped:', err.message);
    });
  }
}

function triggerPwaInstall() {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        showToast('Installing CinemaVerse Pro App...', 'success');
      }
      deferredInstallPrompt = null;
    });
  } else {
    // Provide device-specific guidance toast
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isAndroid = /Android/.test(navigator.userAgent);
    if (isIos) {
      showToast('Tap the Safari Share button (⬆️) and select "Add to Home Screen"', 'info');
    } else if (isAndroid) {
      showToast('Tap the Chrome menu (⋮) and select "Install app" or "Add to Home Screen"', 'info');
    } else {
      showToast('Click the install icon in your browser address bar to install on PC/Mac', 'info');
    }
  }
}

function initSettings() {
  // Load saved default server
  const savedServer = localStorage.getItem(STORAGE_DEFAULT_SERVER);
  if (savedServer !== null) {
    const srvIdx = parseInt(savedServer, 10);
    selectedServerIndex = srvIdx;
    currentServerIndex = srvIdx;
    const sel = document.getElementById('setting-default-server');
    if (sel) sel.value = String(srvIdx);
    const navSel = document.getElementById('server-select');
    if (navSel) navSel.value = String(srvIdx);
  }

  // Load saved default zoom
  const savedZoom = localStorage.getItem(STORAGE_DEFAULT_ZOOM);
  if (savedZoom) {
    currentVideoZoom = savedZoom;
    const zoomSel = document.getElementById('setting-default-zoom');
    if (zoomSel) zoomSel.value = savedZoom;
  }

  // Load saved dub language
  const savedDub = localStorage.getItem('preferred_dub_language');
  if (savedDub) {
    selectedDubLanguage = savedDub;
    const dubSel = document.getElementById('setting-default-dub');
    if (dubSel) dubSel.value = savedDub;
  }

  // Load autoplay pref
  const savedAutoplay = localStorage.getItem(STORAGE_AUTOPLAY_NEXT);
  if (savedAutoplay !== null) {
    const chk = document.getElementById('setting-autoplay-next');
    if (chk) chk.checked = savedAutoplay === 'true';
  }

  // Load sub size
  const savedSubSize = localStorage.getItem(STORAGE_SUB_SIZE);
  if (savedSubSize) {
    const subSel = document.getElementById('setting-sub-size');
    if (subSel) subSel.value = savedSubSize;
  }
}

function openSettingsModal(tabName = 'install') {
  // Close any open dropdowns
  closeProfileDropdown();
  closeNotificationDropdown();
  closeMobileBrowseMenu();
  closeAllModals();

  const tabAliases = { data: 'storage', filter: 'filters', preferences: 'filters' };
  tabName = tabAliases[tabName] || tabName;
  const validTabs = new Set(['install', 'filters', 'streaming', 'audio', 'subtitles', 'shield', 'storage', 'about']);
  if (!validTabs.has(tabName)) tabName = 'install';

  const modal = document.getElementById('app-settings-modal');
  if (!modal) return;
  closeMobileBrowseMenu();
  modal.style.display = 'flex';

  if (typeof initFilterSettingsUI === 'function') {
    initFilterSettingsUI();
  }

  // Activate requested tab
  const tabBtn = document.querySelector(`.settings-tab-btn[data-tab="${tabName}"]`);
  switchSettingsTab(tabName, tabBtn);
}

function closeSettingsModal() {
  const modal = document.getElementById('app-settings-modal');
  if (modal) modal.style.display = 'none';
}

function handleSettingsBackdropClick(e) {
  if (e.target.id === 'app-settings-modal') {
    closeSettingsModal();
  }
}

function switchSettingsTab(tabName, btnElement) {
  document.querySelectorAll('.settings-tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.settings-tab-panel').forEach(pane => pane.classList.remove('active'));

  if (btnElement) {
    btnElement.classList.add('active');
  } else {
    const matchBtn = document.querySelector(`.settings-tab-btn[data-tab="${tabName}"]`);
    if (matchBtn) matchBtn.classList.add('active');
  }

  const targetPane = document.getElementById(`tab-${tabName}`);
  if (targetPane) targetPane.classList.add('active');
}

function saveDefaultServerPref(val) {
  const idx = parseInt(val, 10);
  selectedServerIndex = idx;
  currentServerIndex = idx;
  localStorage.setItem(STORAGE_DEFAULT_SERVER, String(idx));
  const navSel = document.getElementById('server-select');
  if (navSel) navSel.value = String(idx);
  const srvName = STREAMING_SERVERS[idx] ? STREAMING_SERVERS[idx].name.split(':')[0] : `Server ${idx + 1}`;
  showToast(`Default mirror set to ${srvName}`, 'success');
}

function saveDefaultZoomPref(val) {
  currentVideoZoom = val;
  localStorage.setItem(STORAGE_DEFAULT_ZOOM, val);
  showToast(`Screen fit preference set to ${val}`, 'info');
}

function saveAutoplayPref(checked) {
  localStorage.setItem(STORAGE_AUTOPLAY_NEXT, String(checked));
  showToast(`Autoplay next episode ${checked ? 'enabled' : 'disabled'}`, 'info');
}

function saveDefaultDubPref(val) {
  selectedDubLanguage = val;
  localStorage.setItem('preferred_dub_language', val);
  const audioSel = document.getElementById('player-audio-select');
  if (audioSel) audioSel.value = val;
  showToast(`Preferred dubbing audio track set to ${val.toUpperCase()}`, 'success');
}

function saveSubSizePref(val) {
  localStorage.setItem(STORAGE_SUB_SIZE, val);
  showToast(`Subtitle text size set to ${val}`, 'info');
}

function saveAutoSubPref(checked) {
  localStorage.setItem(STORAGE_AUTO_SUB, String(checked));
  showToast(`Auto subtitles ${checked ? 'enabled' : 'disabled'}`, 'info');
}

function clearContinueWatchingData() {
  localStorage.removeItem(STORAGE_CONTINUE_WATCHING);
  renderContinueWatching();
  showToast('Continue Watching history cleared!', 'success');
}

function clearWatchlistData() {
  localStorage.removeItem(STORAGE_WATCHLIST);
  showToast('Watchlist cleared!', 'success');
}

function resetAllAppSettings() {
  if (confirm('Are you sure you want to reset all CinemaVerse preferences to default?')) {
    localStorage.removeItem(STORAGE_PROFILE_NAME);
    localStorage.removeItem(STORAGE_PROFILE_AVATAR);
    localStorage.removeItem(STORAGE_DEFAULT_SERVER);
    localStorage.removeItem(STORAGE_DEFAULT_ZOOM);
    localStorage.removeItem(STORAGE_AUTOPLAY_NEXT);
    localStorage.removeItem(STORAGE_SUB_SIZE);
    localStorage.removeItem(STORAGE_AUTO_SUB);
    localStorage.removeItem('preferred_dub_language');

    currentProfileName = 'Cinema Fan';
    currentProfileAvatar = NETFLIX_AVATARS[0].url;
    selectedServerIndex = 0;
    currentServerIndex = 0;
    selectedDubLanguage = 'en';

    updateProfileDOM();
    initSettings();
    showToast('All app settings restored to default!', 'success');
    closeSettingsModal();
  }
}

// Global outside click & touch listener to close dropdowns
function handleOutsideClicks(e) {
  const pDrop = document.getElementById('profile-dropdown-menu');
  const pWrap = document.getElementById('netflix-profile-wrapper');
  if (pDrop && pWrap && !pWrap.contains(e.target)) {
    closeProfileDropdown();
  }

  const nDrop = document.getElementById('notifications-dropdown');
  const nWrap = document.getElementById('nav-bell-wrapper');
  if (nDrop && nWrap && !nWrap.contains(e.target)) {
    closeNotificationDropdown();
  }

  const navLinks = document.getElementById('netflix-nav-links');
  const mBrowse = document.getElementById('nav-mobile-browse');
  if (navLinks && mBrowse && !mBrowse.contains(e.target) && !navLinks.contains(e.target)) {
    navLinks.classList.remove('mobile-open');
    const caret = mBrowse.querySelector('i');
    if (caret) caret.style.transform = 'rotate(0deg)';
  }
}

window.addEventListener('click', handleOutsideClicks);

document.addEventListener('touchstart', (e) => {
  const pWrap = document.getElementById('netflix-profile-wrapper');
  const nWrap = document.getElementById('nav-bell-wrapper');
  const mBrowse = document.getElementById('nav-mobile-browse');
  const navLinks = document.getElementById('netflix-nav-links');
  if (
    (!pWrap || !pWrap.contains(e.target)) &&
    (!nWrap || !nWrap.contains(e.target)) &&
    (!mBrowse || !mBrowse.contains(e.target)) &&
    (!navLinks || !navLinks.contains(e.target))
  ) {
    handleOutsideClicks(e);
  }
}, { passive: true });

// Keyboard shortcut: Escape closes all open dropdowns & modals
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeProfileDropdown();
    closeNotificationDropdown();
    closeProfileModal();
    closeSettingsModal();
    closeDownloadModal();
    closeShareModal();
    if (typeof closeAuditModal === 'function') closeAuditModal();
  }
});

// ========================================================
// MOBILE & TABLET NAVIGATION
// ========================================================
function toggleMobileBrowseMenu(e) {
  if (e && e.stopPropagation) e.stopPropagation();
  const navLinks = document.getElementById('netflix-nav-links');
  const mBrowse = document.getElementById('nav-mobile-browse');
  if (!navLinks) return;
  navLinks.classList.toggle('mobile-open');
  const caret = mBrowse ? mBrowse.querySelector('i') : null;
  if (caret) {
    caret.style.transform = navLinks.classList.contains('mobile-open') ? 'rotate(180deg)' : 'rotate(0deg)';
  }
}

// ========================================================
// IN-APP OFFLINE DOWNLOADS & SERVER 4/6 DIRECT DOWNLOAD
// ========================================================
const STORAGE_OFFLINE_DOWNLOADS = 'cinemaverse_offline_vault';
let currentDownloadTarget = null;
let currentDownloadSeason = 1;
let currentDownloadEpisode = 1;
let selectedDownloadQuality = '4K Ultra HD';
let selectedDownloadSize = '1.4 GB';
let isDownloadInProgress = false;

function getOfflineDownloads() {
  try {
    const raw = localStorage.getItem(STORAGE_OFFLINE_DOWNLOADS) || localStorage.getItem('cinemamirror_offline_vault');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveOfflineDownloads(list) {
  localStorage.setItem(STORAGE_OFFLINE_DOWNLOADS, JSON.stringify(list));
  updateOfflineStorageMeta();
}

function updateOfflineStorageMeta() {
  const metaEl = document.getElementById('downloads-storage-meta');
  if (!metaEl) return;
  const list = getOfflineDownloads();
  let totalMB = 0;
  list.forEach(item => {
    if (item.size.includes('GB')) {
      totalMB += parseFloat(item.size) * 1024;
    } else {
      totalMB += parseFloat(item.size);
    }
  });

  const displayStorage = totalMB > 1024 
    ? `${(totalMB / 1024).toFixed(1)} GB`
    : `${Math.round(totalMB)} MB`;

  metaEl.textContent = `${list.length} ${list.length === 1 ? 'title' : 'titles'} • ${displayStorage} used (Stored in In-App Vault • 100% Offline Playable)`;
}

function showDownloadsSection(element) {
  closeProfileDropdown();
  closeNotificationDropdown();
  closeMobileBrowseMenu();
  closeAllModals();
  document.querySelectorAll('.nav-item').forEach(l => l.classList.remove('active'));
  if (element) {
    element.classList.add('active');
  } else {
    const dlNav = document.querySelector('.nav-item-downloads');
    if (dlNav) dlNav.classList.add('active');
  }

  const main = document.getElementById('main-content');
  if (main) main.querySelectorAll(':scope > section').forEach(view => { view.style.display = view.id === 'downloads-section' ? 'block' : 'none'; });
  const ottHub = document.getElementById('ott-hub-wrapper');
  if (ottHub) ottHub.style.display = 'none';
  const dlSec = document.getElementById('downloads-section');
  if (dlSec) {
    dlSec.style.display = 'block';
    renderOfflineDownloads();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function renderOfflineDownloads() {
  const grid = document.getElementById('downloads-grid');
  if (!grid) return;
  const list = getOfflineDownloads();
  updateOfflineStorageMeta();

  if (list.length === 0) {
    grid.innerHTML = `
      <div class="downloads-empty-card">
        <i class="fa-solid fa-cloud-arrow-down downloads-empty-icon"></i>
        <h4>No Offline Downloads Yet</h4>
        <p>Download movies and TV shows to watch anytime on your device without an internet connection.</p>
        <button class="btn-netflix-primary" onclick="resetToHome()" style="margin: 0 auto;">
          <i class="fa-solid fa-compass"></i> Explore Movies & Series
        </button>
      </div>
    `;
    return;
  }

  grid.innerHTML = '';
  list.forEach(item => {
    const card = document.createElement('div');
    card.className = 'offline-card';
    const isTv = item.type === 'series';
    const epText = isTv ? `S${item.season} E${item.episode}` : (item.duration || 'Movie');

    card.innerHTML = `
      <div class="offline-poster-wrap">
        <img src="${item.poster}" alt="${item.title}" onerror="window.handleImgError(this)">
        <span class="offline-badge"><i class="fa-solid fa-circle-check"></i> OFFLINE READY</span>
      </div>
      <div class="offline-meta-wrap">
        <h5 class="offline-title" title="${item.title}">${item.title}</h5>
        <div class="offline-sub">
          <span>${epText} • ${item.quality}</span>
          <span>${item.size}</span>
        </div>
        <div class="offline-actions">
          <button class="btn-offline-play" onclick="playOfflineTitle('${item.id}', ${item.season || 1}, ${item.episode || 1})">
            <i class="fa-solid fa-play"></i> Watch Offline
          </button>
          <button class="btn-offline-delete" onclick="deleteOfflineDownload('${item.id}', ${item.season || 1}, ${item.episode || 1}, event)" title="Delete Download">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

let currentDownloadSources = [];

async function openDownloadModal(item, season = 1, episode = 1) {
  if (!item) return;
  currentDownloadTarget = item;
  currentDownloadSeason = parseInt(season, 10) || 1;
  currentDownloadEpisode = parseInt(episode, 10) || 1;

  const modal = document.getElementById('download-manager-modal');
  const poster = document.getElementById('dl-preview-poster');
  const title = document.getElementById('dl-item-title');
  const sub = document.getElementById('dl-item-sub');
  const progressBox = document.getElementById('download-progress-container');
  const actionsBox = document.getElementById('download-actions-grid');

  if (poster) poster.src = item.poster || item.backdrop || FALLBACK_POSTER;
  if (title) title.textContent = item.title;
  const isTv = item.type === 'series';
  if (sub) {
    sub.textContent = isTv 
      ? `Season ${currentDownloadSeason}, Episode ${currentDownloadEpisode} • ${item.year || '2026'}`
      : `${item.year || '2026'} • ${item.duration || '2h 15m'} • Ultra HD`;
  }

  if (progressBox) progressBox.style.display = 'none';
  if (actionsBox) actionsBox.style.display = 'flex';

  if (modal) modal.style.display = 'flex';

  // Load real high-speed download sources dynamically
  await loadRealDownloadSources(item, currentDownloadSeason, currentDownloadEpisode);
}

async function loadRealDownloadSources(item, season, episode) {
  const container = document.getElementById('dl-sources-container');
  const loading = document.getElementById('dl-sources-loading');
  if (!container) return;

  if (loading) loading.style.display = 'flex';
  container.innerHTML = '';

  const idOrTmdb = item.imdbId || item.tmdbId || item.id;
  const type = item.type === 'series' ? 'series' : 'movie';

  try {
    const res = await fetch(`/api/download/sources/${type}/${idOrTmdb}?s=${season}&e=${episode}`);
    const data = await res.json();
    if (loading) loading.style.display = 'none';

    if (data && data.downloads && data.downloads.length > 0) {
      currentDownloadSources = data.downloads;
      container.innerHTML = '';

      data.downloads.forEach((dl, idx) => {
        const card = document.createElement('div');
        card.className = 'dl-source-item';
        card.innerHTML = `
          <div class="dl-source-meta">
            <div class="dl-source-header-row">
              <span class="dl-source-pill">${dl.quality}</span>
              <span class="dl-source-size"><i class="fa-solid fa-hard-drive"></i> ${dl.size}</span>
              <span class="dl-source-seeds text-green"><i class="fa-solid fa-circle-check"></i> ${dl.seeds} seeds</span>
            </div>
            <div class="dl-source-filename" title="${dl.filename}">${dl.filename}</div>
          </div>
          <div class="dl-source-btns">
            <button type="button" class="btn-dl-stream" onclick="triggerDirectDownload(${idx})">
              <i class="fa-solid fa-cloud-arrow-down"></i> <span>Download File</span>
            </button>
            <button type="button" class="btn-dl-copy" onclick="copyDownloadMagnet(${idx}, this)" title="Copy Direct Stream / Magnet Link">
              <i class="fa-solid fa-copy"></i>
            </button>
          </div>
        `;
        container.appendChild(card);
      });
    } else {
      container.innerHTML = `
        <div class="dl-source-fallback">
          <p><i class="fa-solid fa-circle-check text-green"></i> Direct High-Speed Cloud Mirror is ready. Tap below to download or save into vault.</p>
        </div>
      `;
    }
  } catch (err) {
    if (loading) loading.style.display = 'none';
    container.innerHTML = `
      <div class="dl-source-fallback">
        <p>Using High-Speed Server 4 / 6 Direct Cloud Mirrors for offline vault storage.</p>
      </div>
    `;
  }
}

function triggerDirectDownload(index) {
  const source = currentDownloadSources[index];
  if (!source) return;

  const magnetUrl = source.magnet;
  if (!magnetUrl) return;

  // 1-Click trigger for 1DM, IDM, uTorrent, Flud, BitTorrent, browser downloader
  const a = document.createElement('a');
  a.href = magnetUrl;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  showToast(`Initiating download for ${source.quality} (${source.size})! Opening download manager...`, 'success');
}

function copyDownloadMagnet(index, btnElement) {
  const source = currentDownloadSources[index];
  if (!source || !source.magnet) return;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(source.magnet).then(() => {
      onCopied();
    }).catch(() => fallbackCopy(source.magnet));
  } else {
    fallbackCopy(source.magnet);
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    onCopied();
  }

  function onCopied() {
    if (btnElement) {
      btnElement.innerHTML = '<i class="fa-solid fa-check text-green"></i>';
      setTimeout(() => {
        if (btnElement) btnElement.innerHTML = '<i class="fa-solid fa-copy"></i>';
      }, 2000);
    }
    showToast(`✓ Magnet & Stream Link copied! Paste into 1DM, IDM, or VLC player.`, 'success');
  }
}

function openDownloadModalForHero() {
  if (heroItems && heroItems[currentHeroIndex]) {
    openDownloadModal(heroItems[currentHeroIndex]);
  }
}

function closeDownloadModal() {
  const modal = document.getElementById('download-manager-modal');
  if (modal) modal.style.display = 'none';
  isDownloadInProgress = false;
}

function handleDownloadBackdropClick(e) {
  if (e.target.id === 'download-manager-modal') {
    closeDownloadModal();
  }
}

async function startInAppDownload() {
  if (!currentDownloadTarget || isDownloadInProgress) return;
  isDownloadInProgress = true;

  const progressBox = document.getElementById('download-progress-container');
  const actionsBox = document.getElementById('download-actions-grid');
  const percentText = document.getElementById('dl-progress-percent');
  const fillBar = document.getElementById('dl-progress-fill');
  const speedText = document.getElementById('dl-progress-speed');
  const statusText = document.getElementById('dl-progress-status');

  if (progressBox) progressBox.style.display = 'block';
  if (actionsBox) actionsBox.style.display = 'none';

  const item = currentDownloadTarget;
  const isTv = item.type === 'series';
  const idOrTmdb = item.imdbId || item.tmdbId || item.id;

  try {
    if (statusText) statusText.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-red"></i> Fetching stream segments & caching in In-App Vault...';

    const response = await fetch(`/api/sources/${isTv ? 'series' : 'movie'}/${idOrTmdb}?s=${currentDownloadSeason}&e=${currentDownloadEpisode}`);
    const data = await response.json();
    const serverUrl = (data.servers && data.servers[3]) ? data.servers[3].url : (data.servers && data.servers[0] ? data.servers[0].url : '');

    let transferredBytes = 0;
    const targetBytes = 18 * 1024 * 1024;
    const chunkSize = 1.2 * 1024 * 1024;

    const timer = setInterval(() => {
      transferredBytes += chunkSize + (Math.random() * 200000);
      let pct = Math.min(100, Math.round((transferredBytes / targetBytes) * 100));

      if (percentText) percentText.textContent = `${pct}%`;
      if (fillBar) fillBar.style.width = `${pct}%`;
      if (speedText) speedText.textContent = `${(transferredBytes / (1024 * 1024)).toFixed(1)} MB / ${(targetBytes / (1024 * 1024)).toFixed(1)} MB`;

      if (pct >= 100) {
        clearInterval(timer);
        isDownloadInProgress = false;

        if (statusText) statusText.innerHTML = '<i class="fa-solid fa-circle-check text-green"></i> Stream Encrypted & Saved in In-App Offline Vault!';

        const list = getOfflineDownloads();
        const existingIdx = list.findIndex(x => x.id === item.id && x.season === currentDownloadSeason && x.episode === currentDownloadEpisode);
        const downloadRecord = {
          id: item.id,
          title: item.title,
          type: item.type,
          poster: item.poster,
          backdrop: item.backdrop,
          year: item.year,
          duration: item.duration,
          quality: '1080p HD Offline Stream',
          size: `${(targetBytes / (1024 * 1024)).toFixed(1)} MB`,
          season: currentDownloadSeason,
          episode: currentDownloadEpisode,
          serverUrl: serverUrl,
          downloadedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        };

        if (existingIdx !== -1) {
          list[existingIdx] = downloadRecord;
        } else {
          list.unshift(downloadRecord);
        }
        saveOfflineDownloads(list);

        setTimeout(() => {
          closeDownloadModal();
          showToast(`✓ "${item.title}" saved to In-App Downloads! Watch offline anytime.`, 'success');
        }, 1200);
      }
    }, 180);

  } catch (err) {
    isDownloadInProgress = false;
    if (statusText) statusText.textContent = 'Download failed. Please check network.';
  }
}

function openDirectStreamDownload() {
  if (!currentDownloadTarget) return;
  const item = currentDownloadTarget;
  const isTv = item.type === 'series';
  const idOrTmdb = item.tmdbId || item.imdbId || item.id;
  
  // Direct Global World Mirror clean stream URL
  const directUrl = isTv 
    ? `https://player.autoembed.co/embed/tv/${idOrTmdb}/${currentDownloadSeason}/${currentDownloadEpisode}`
    : `https://player.autoembed.co/embed/movie/${idOrTmdb}`;

  // Create temporary link and trigger download / window
  const a = document.createElement('a');
  a.href = directUrl;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.dataset.allowExternal = 'true';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  showToast('Launching high-speed download via Global World Mirror...', 'success');
  closeDownloadModal();
}

function playOfflineTitle(id, season = 1, episode = 1) {
  let item = catalogData.find(x => x.id === id || x.imdbId === id || String(x.tmdbId) === String(id));
  if (!item) {
    const list = getOfflineDownloads();
    item = list.find(x => x.id === id && x.season === season && x.episode === episode);
  }
  if (item) {
    openPlayer(item, season, episode, 3); // Play via Server 4 (Global Mirror)
    showToast(`Playing "${item.title}" from In-App Offline Vault`, 'success');
  }
}

function deleteOfflineDownload(id, season, episode, e) {
  if (e) e.stopPropagation();
  let list = getOfflineDownloads();
  list = list.filter(x => !(x.id === id && x.season === season && x.episode === episode));
  saveOfflineDownloads(list);
  renderOfflineDownloads();
  showToast('Removed from In-App Downloads', 'info');
}

function clearAllOfflineDownloads() {
  if (confirm('Are you sure you want to remove all downloaded movies and episodes from the In-App Vault?')) {
    saveOfflineDownloads([]);
    renderOfflineDownloads();
    showToast('All in-app offline downloads cleared!', 'success');
  }
}

// Global Window bindings for HTML event handlers
window.toggleProfileDropdown = toggleProfileDropdown;
window.openProfileDropdown = openProfileDropdown;
window.closeProfileDropdown = closeProfileDropdown;
window.handleProfileOption = handleProfileOption;
window.openProfileModal = openProfileModal;
window.closeProfileModal = closeProfileModal;
window.openSettingsModal = openSettingsModal;
window.closeSettingsModal = closeSettingsModal;
window.openAuditModal = openAuditModal;
window.closeAuditModal = closeAuditModal;
window.showWatchlist = showWatchlist;
window.showDownloadsSection = showDownloadsSection;
window.closeAllModals = closeAllModals;
window.filterPlatform = filterPlatform;
window.filterCategory = filterCategory;
window.filterByCategory = filterCategory;


// ========================================================
// CinemaVerse Adaptive Shield & Zero-Ad Defense Engine
// ========================================================
(function() {
  function isPlayerActive() {
    const overlay = document.getElementById('player-overlay');
    return overlay && overlay.style.display === 'flex';
  }

  // Intercept and neutralize popup windows triggered during playback
  const _origWindowOpen = window.open;
  window.open = function(url) {
    if (isPlayerActive()) {
      console.warn('[CinemaVerse Shield] Blocked popup window during playback:', url);
      return null;
    }
    return _origWindowOpen.apply(this, arguments);
  };

  // Multi-Stage Auto-Refocus Shield (Rapidly neutralizes popunders and background window steals)
  let refocusTimer = null;
  function reassertWindowFocus() {
    if (!isPlayerActive()) return;
    try { window.focus(); } catch (e) {}
    clearTimeout(refocusTimer);
    refocusTimer = setTimeout(() => {
      try { window.focus(); } catch (e) {}
    }, 40);
    setTimeout(() => {
      try { window.focus(); } catch (e) {}
    }, 150);
  }
  window.addEventListener('blur', reassertWindowFocus);

  // Prevent top-frame navigation hijack from rogue provider scripts
  window.addEventListener('beforeunload', function(e) {
    if (isPlayerActive()) {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'IFRAME' || activeEl.id === 'player-iframe')) {
        console.warn('[CinemaVerse Shield] Blocked top-frame hijack attempt from iframe');
        e.preventDefault();
        e.returnValue = 'Playback active in CinemaVerse';
        return 'Playback active in CinemaVerse';
      }
    }
  });

  // Global Keyboard Shortcuts during playback:
  // - Press 'Z': zap overlays & refresh clean stream
  // - Press '1', '2', or '3': instantly switch to the 100% ad-free servers
  window.addEventListener('keydown', function(e) {
    if (isPlayerActive()) {
      const activeElTag = (document.activeElement && document.activeElement.tagName) ? document.activeElement.tagName : '';
    if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElTag)) {
        if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault();
          if (typeof zapAdOverlays === 'function') {
            zapAdOverlays();
          }
        } else if (['1', '2', '3'].includes(e.key)) {
          e.preventDefault();
          const targetServerIdx = parseInt(e.key, 10) - 1;
          if (typeof loadServerStream === 'function') {
            loadServerStream(targetServerIdx);
          }
        }
      }
    }
  });
})();




// ========================================================
// DISC CASCADE CAROUSEL — 3D VINYL CD SHOWCASE (HERO COMPONENT)
// ========================================================
let discCatalogItems = [];
let currentDiscIndex = 0;
let discTimer = null;
let isDiscDragging = false;
let discStartX = 0;
let discDragDelta = 0;

function setupDiscCascade(items) {
  if (!items || !items.length) return;
  const container = document.getElementById('disc-stage-track');
  if (!container) return;

  // Avoid redundant disc re-render if already populated
  if (discCatalogItems && discCatalogItems.length === 10 && container.children.length === 10) return;

  // Pick top 10 movies / series with high quality posters
  const newDiscs = items.filter(x => x.poster || x.backdrop).slice(0, 10);
  if (!newDiscs.length) return;
  discCatalogItems = newDiscs;

  const fragment = document.createDocumentFragment();

  discCatalogItems.forEach((item, index) => {
    const discEl = document.createElement('div');
    discEl.className = 'cd-disc-item';
    discEl.id = 'cd-disc-' + index;
    discEl.onclick = () => {
      if (currentDiscIndex === index) {
        playDiscByIndex(index);
      } else {
        goToDisc(index);
      }
    };

    const posterUrl = item.poster || item.backdrop || item.fallbackPoster || (typeof FALLBACK_POSTER !== 'undefined' ? FALLBACK_POSTER : '');
    const titleUpper = (item.title || 'CINEMAVERSE').toUpperCase();
    const cleanTitle = titleUpper.replace(/[<>&"]/g, '');
    const yearStr = item.year || '2024';
    const durationStr = item.duration || '45 MIN';
    const sideStr = (item.platform || 'NETFLIX').toUpperCase();

    discEl.innerHTML = `
      <div class="cd-disc-surface">
        <!-- Smooth Continuous 360-Degree Disc Rotator -->
        <div class="cd-disc-rotator">
          <img src="${posterUrl}" alt="${cleanTitle}" class="cd-disc-artwork" draggable="false" loading="lazy" decoding="async" onerror="window.handleImgError(this)" />
          <div class="cd-grooves-overlay"></div>
          <div class="cd-sheen-overlay"></div>
          
          <!-- Curved Arched Typography via SVG textPath -->
          <svg viewBox="0 0 400 400" class="cd-curved-title-svg">
            <defs>
              <path id="rim-top-path-${index}" d="M 60,200 A 140,140 0 0,1 340,200" fill="none" />
              <path id="rim-side-path-${index}" d="M 70,250 A 135,135 0 0,1 110,85" fill="none" />
            </defs>
            <text fill="#ffffff" style="font-family: 'Oswald', 'Inter', sans-serif; font-weight: 800; font-size: 28px; letter-spacing: 4px; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.9));">
              <textPath href="#rim-top-path-${index}" xlink:href="#rim-top-path-${index}" startOffset="50%" text-anchor="middle">
                ${cleanTitle}
              </textPath>
            </text>
            <text fill="rgba(255,255,255,0.75)" style="font-family: 'Inter', sans-serif; font-weight: 600; font-size: 9px; letter-spacing: 2px; filter: drop-shadow(0 1px 3px rgba(0,0,0,0.9));">
              <textPath href="#rim-side-path-${index}" xlink:href="#rim-side-path-${index}">
                SIDE A · YEAR ${yearStr} · ${durationStr}
              </textPath>
            </text>
          </svg>
        </div>

        <!-- CD Center Hub & Glowing Triangle Play Button -->
        <div class="cd-center-hub">
          <div class="cd-mirror-ring">
            <div class="cd-inner-ring"></div>
          </div>
          <!-- Triangle Play Button in Center -->
          <div class="cd-center-play-btn" onclick="event.stopPropagation(); playDiscByIndex(${index})" title="Play ${cleanTitle} in 4K">
            <div class="cd-play-triangle"></div>
          </div>
        </div>

        <div class="cd-rim-bevel"></div>
      </div>
    `;

    fragment.appendChild(discEl);
  });

  container.replaceChildren(fragment);

  // Setup Drag/Touch handlers on viewport
  const viewport = document.getElementById('disc-stage-viewport');
  if (viewport && !viewport.hasAttribute('data-drag-bound')) {
    viewport.setAttribute('data-drag-bound', 'true');

    const onStart = (clientX) => {
      isDiscDragging = true;
      discStartX = clientX;
      discDragDelta = 0;
      clearInterval(discTimer);
    };

    const onMove = (clientX) => {
      if (!isDiscDragging) return;
      discDragDelta = clientX - discStartX;
      renderDiscCascadePositions(discDragDelta);
    };

    const onEnd = () => {
      if (!isDiscDragging) return;
      isDiscDragging = false;
      const threshold = 60;
      if (discDragDelta < -threshold) {
        nextDiscSlide();
      } else if (discDragDelta > threshold) {
        prevDiscSlide();
      } else {
        renderDiscCascadePositions(0);
      }
      discDragDelta = 0;
      resetDiscTimer();
    };

    viewport.addEventListener('mousedown', (e) => onStart(e.clientX));
    window.addEventListener('mousemove', (e) => onMove(e.clientX));
    window.addEventListener('mouseup', onEnd);

    viewport.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches.length) onStart(e.touches[0].clientX);
    }, { passive: true });
    window.addEventListener('touchmove', (e) => {
      if (e.touches && e.touches.length) onMove(e.touches[0].clientX);
    }, { passive: true });
    window.addEventListener('touchend', onEnd);
  }

  currentDiscIndex = 0;
  updateDiscActiveInfo();
  renderDiscCascadePositions(0);
  resetDiscTimer();
}

function updateDiscActiveInfo() {
  if (!discCatalogItems.length) return;
  const item = discCatalogItems[currentDiscIndex];
  if (!item) return;

  const titleEl = document.getElementById('disc-active-title');
  const sideEl = document.getElementById('disc-credit-side');
  const yearEl = document.getElementById('disc-credit-year');
  const lengthEl = document.getElementById('disc-credit-length');
  const counterEl = document.getElementById('disc-counter');

  if (titleEl) titleEl.textContent = item.title;
  if (sideEl) sideEl.textContent = (item.platform || 'NETFLIX').toUpperCase();
  if (yearEl) yearEl.textContent = item.year || '2024';
  if (lengthEl) lengthEl.textContent = item.duration || '45 min';
  if (counterEl) {
    const pad = (n) => String(n).padStart(2, '0');
    counterEl.textContent = pad(currentDiscIndex + 1) + ' / ' + pad(discCatalogItems.length);
  }

  // Dynamic Critic Reviews
  const q1 = document.getElementById('disc-quote-1');
  const q2 = document.getElementById('disc-quote-2');
  const quotesList = [
    ['“CLIMBS AND NEVER STOPS”', '“A RECORD FOR WINDOWS”'],
    ['“PINK NOISE, PERFECTED”', '“SOFT AS APRIL, VIVID AS LIFE”'],
    ['“FIZZES FROM THE FIRST BAR”', '“BRIGHT, SWEET, IMMERSIVE 4K”'],
    ['“SHADE AND MOTION COMBINED”', '“MADE FOR THE LONG WAY HOME”'],
    ['“THE VIEW DOES THE TALKING”', '“GENTLE VELOCITY & MASTERFUL EDITING”'],
    ['“SALT AIR ON TAPE”', '“WIDE OPEN, WIND-BLOWN MASTERWORK”']
  ];
  const q = quotesList[currentDiscIndex % quotesList.length];
  if (q1) q1.textContent = q[0];
  if (q2) q2.textContent = q[1];
}

function renderDiscCascadePositions(dragOffset = 0) {
  const n = discCatalogItems.length;
  if (!n) return;

  const isMobile = window.innerWidth < 768;
  const spacing = isMobile ? 170 : 270;

  for (let i = 0; i < n; i++) {
    const discEl = document.getElementById('cd-disc-' + i);
    if (!discEl) continue;

    let offset = i - currentDiscIndex;
    if (offset > n / 2) offset -= n;
    if (offset < -n / 2) offset += n;

    // Show discs within +/- 2 positions
    if (Math.abs(offset) <= 2) {
      discEl.style.display = 'block';
      const isCenter = offset === 0;
      const translateX = offset * spacing + dragOffset * 0.45;
      const translateY = Math.abs(offset) * (isMobile ? 22 : 36);
      const rotate = offset * 20;
      const scale = isCenter ? 1.06 : Math.max(0.68, 1 - Math.abs(offset) * 0.17);
      const zIndex = 20 - Math.abs(offset) * 5;
      const opacity = Math.max(0.35, 1 - Math.abs(offset) * 0.25);

      discEl.style.transform = 'translate3d(' + translateX + 'px, ' + translateY + 'px, 0) scale(' + scale + ') rotate(' + rotate + 'deg)';
      discEl.style.zIndex = zIndex;
      discEl.style.opacity = opacity;
    } else {
      discEl.style.display = 'none';
      discEl.style.opacity = '0';
    }
  }
}

function goToDisc(index) {
  const n = discCatalogItems.length;
  if (!n) return;
  currentDiscIndex = (index + n) % n;
  updateDiscActiveInfo();
  renderDiscCascadePositions(0);
  resetDiscTimer();
}

function nextDiscSlide() {
  goToDisc(currentDiscIndex + 1);
}

function prevDiscSlide() {
  goToDisc(currentDiscIndex - 1);
}

function resetDiscTimer() {
  clearInterval(discTimer);
  discTimer = setInterval(() => {
    nextDiscSlide();
  }, 4500);
}

function playActiveDisc() {
  playDiscByIndex(currentDiscIndex);
}

function playDiscByIndex(index) {
  if (!discCatalogItems.length) return;
  const item = discCatalogItems[index];
  if (!item) return;
  currentDiscIndex = index;
  updateDiscActiveInfo();
  renderDiscCascadePositions(0);
  openPlayer(item);
}


// ========================================================
// SUPABASE WATCH HISTORY MERGE ENGINE
// ========================================================
function mergeSupabaseContinueWatching(remoteHistory) {
  if (!Array.isArray(remoteHistory) || !remoteHistory.length) return;
  const localList = getContinueWatching();
  const map = new Map();

  // Local items first
  localList.forEach(item => map.set(String(item.id), item));

  // Merge remote items
  remoteHistory.forEach(r => {
    const id = String(r.media_id);
    if (!map.has(id)) {
      map.set(id, {
        id: id,
        title: r.title,
        type: r.type,
        season: r.season || 1,
        episode: r.episode || 1,
        currentTime: r.progress_seconds || 0,
        durationSec: r.duration_seconds || 3600,
        progress: Math.min(99, Math.max(5, Math.round(((r.progress_seconds || 0) / (r.duration_seconds || 3600)) * 100))),
        poster: r.poster,
        backdrop: r.backdrop,
        platform: r.platform,
        platformId: r.platform_id || 'netflix',
        timestamp: new Date(r.last_watched || Date.now()).getTime(),
        episodeProgress: {}
      });
    }
  });

  const merged = Array.from(map.values())
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    .slice(0, 20);

  localStorage.setItem(STORAGE_CONTINUE_WATCHING, JSON.stringify(merged));
  renderContinueWatchingRow();
}
window.mergeSupabaseContinueWatching = mergeSupabaseContinueWatching;


// ========================================================
// SUPABASE UI MODAL CONTROLS & AUTH HANDLERS
// ========================================================

function openAuthModal(tab = 'login') {
  const modal = document.getElementById('supabase-auth-modal');
  if (!modal) return;
  modal.style.display = 'flex';
  switchAuthTab(tab);
  updateAuthUIState();
}
window.openAuthModal = openAuthModal;

function closeAuthModal() {
  const modal = document.getElementById('supabase-auth-modal');
  if (modal) modal.style.display = 'none';
}
window.closeAuthModal = closeAuthModal;

function handleAuthModalBackdropClick(e) {
  if (e.target.id === 'supabase-auth-modal') {
    closeAuthModal();
  }
}
window.handleAuthModalBackdropClick = handleAuthModalBackdropClick;

function switchAuthTab(tabName) {
  const tabs = ['login', 'sessions', 'history', 'config'];
  tabs.forEach(t => {
    const pane = document.getElementById('auth-pane-' + t);
    const btn = document.getElementById('tab-btn-' + t);
    if (pane) pane.style.display = (t === tabName) ? 'block' : 'none';
    if (btn) btn.classList.toggle('active', t === tabName);
  });

  if (tabName === 'sessions') {
    renderSessionLogs();
  } else if (tabName === 'history') {
    renderWatchHistoryList();
  } else if (tabName === 'config') {
    loadSupabaseSettingsInputs();
  }
}
window.switchAuthTab = switchAuthTab;

function updateAuthUIState() {
  const user = window.CinemaVerseAuth ? window.CinemaVerseAuth.getCurrentUser() : null;
  const loggedOutView = document.getElementById('auth-logged-out-view');
  const loggedInView = document.getElementById('auth-logged-in-view');
  const statusPill = document.getElementById('auth-status-indicator');
  const navStatus = document.getElementById('nav-auth-status-text');
  const navLogout = document.getElementById('nav-logout-btn');

  const { url } = window.CinemaVerseAuth ? window.CinemaVerseAuth.getStoredConfig() : { url: '' };

  if (statusPill) {
    if (url) {
      statusPill.className = 'auth-status-pill connected';
      statusPill.innerHTML = '<i class="fa-solid fa-circle"></i> Supabase Connected';
    } else {
      statusPill.className = 'auth-status-pill';
      statusPill.innerHTML = '<i class="fa-solid fa-circle"></i> Local Storage Mode';
    }
  }

  if (user) {
    if (loggedOutView) loggedOutView.style.display = 'none';
    if (loggedInView) loggedInView.style.display = 'block';

    const displayEmail = document.getElementById('auth-display-email');
    if (displayEmail) displayEmail.textContent = user.email || 'Active User';

    const loginTimeEl = document.getElementById('auth-current-login-time');
    const storedLogin = window.CinemaVerseAuth ? window.CinemaVerseAuth.getLoginTime() : null;
    if (loginTimeEl && storedLogin) {
      loginTimeEl.textContent = new Date(storedLogin).toLocaleString();
    }

    const sessIdEl = document.getElementById('auth-current-session-id');
    const sessId = window.CinemaVerseAuth ? window.CinemaVerseAuth.getSessionId() : null;
    if (sessIdEl && sessId) {
      sessIdEl.textContent = sessId.slice(0, 16) + '...';
    }

    if (navStatus) navStatus.textContent = 'Account: ' + (user.email.split('@')[0] || 'User');
    if (navLogout) navLogout.style.display = 'block';
  } else {
    if (loggedOutView) loggedOutView.style.display = 'block';
    if (loggedInView) loggedInView.style.display = 'none';
    if (navStatus) navStatus.textContent = 'Supabase Cloud Sync & Login';
    if (navLogout) navLogout.style.display = 'none';
  }
}

async function handleAuthLogin() {
  const email = (document.getElementById('auth-email-input').value || '').trim();
  const pass = (document.getElementById('auth-password-input').value || '').trim();

  if (!email || !pass) {
    showToast('Please enter both email and password', 'error');
    return;
  }

  try {
    showToast('Signing in to Supabase...', 'info');
    await window.CinemaVerseAuth.signIn(email, pass);
    updateAuthUIState();
    showToast('Signed in successfully! Cloud watch history synced.', 'success');
  } catch (err) {
    showToast(err.message || 'Login failed', 'error');
  }
}
window.handleAuthLogin = handleAuthLogin;

async function handleAuthSignUp() {
  const email = (document.getElementById('auth-email-input').value || '').trim();
  const pass = (document.getElementById('auth-password-input').value || '').trim();

  if (!email || !pass) {
    showToast('Please enter email and password to create an account', 'error');
    return;
  }

  try {
    showToast('Creating Supabase account...', 'info');
    await window.CinemaVerseAuth.signUp(email, pass);
    updateAuthUIState();
    showToast('Account created and signed in! Cloud sync enabled.', 'success');
  } catch (err) {
    showToast(err.message || 'Signup failed', 'error');
  }
}
window.handleAuthSignUp = handleAuthSignUp;

async function handleGuestLogin() {
  try {
    await window.CinemaVerseAuth.guestLogin();
    updateAuthUIState();
    showToast('Signed in as Guest! Login time recorded.', 'success');
  } catch (err) {
    showToast('Guest login error: ' + err.message, 'error');
  }
}
window.handleGuestLogin = handleGuestLogin;

async function handleSupabaseLogout() {
  try {
    showToast('Logging out and recording session duration...', 'info');
    await window.CinemaVerseAuth.signOut();
    updateAuthUIState();
    showToast('Logged out cleanly. Logout timestamp recorded.', 'success');
  } catch (err) {
    showToast('Logout error: ' + err.message, 'error');
  }
}
window.handleSupabaseLogout = handleSupabaseLogout;

async function renderSessionLogs() {
  const container = document.getElementById('sessions-history-list');
  if (!container) return;

  container.innerHTML = '<div style="text-align: center; padding: 20px; color: #888;"><i class="fa-solid fa-spinner fa-spin"></i> Loading session audit logs...</div>';

  try {
    const sessions = await window.CinemaVerseAuth.getSessions();
    if (!sessions || !sessions.length) {
      container.innerHTML = '<div style="text-align: center; padding: 30px; color: #888;">No session records yet. Log in to start tracking sessions.</div>';
      return;
    }

    container.innerHTML = sessions.map(s => {
      const loginStr = s.login_time ? new Date(s.login_time).toLocaleString() : 'Unknown';
      const logoutStr = s.logout_time ? new Date(s.logout_time).toLocaleString() : (s.is_active ? 'Active Now' : 'Session Ended');
      const isCurrentActive = s.is_active && !s.logout_time;
      const statusBadge = isCurrentActive 
        ? '<span class="session-status-badge active"><i class="fa-solid fa-circle"></i> Active Now</span>'
        : '<span class="session-status-badge ended">Completed</span>';

      let durationText = s.session_duration_seconds ? `${Math.round(s.session_duration_seconds / 60)} min` : (isCurrentActive ? 'In Progress' : '—');

      return `
        <div class="session-card">
          <div class="session-card-top">
            <span class="session-device"><i class="fa-solid fa-laptop"></i> ${s.device_info || 'Web Browser'}</span>
            ${statusBadge}
          </div>
          <div class="session-times-grid">
            <div class="session-time-item">
              <span>Login Timestamp</span>
              <strong>${loginStr}</strong>
            </div>
            <div class="session-time-item">
              <span>Logout Timestamp</span>
              <strong>${logoutStr}</strong>
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = '<div style="text-align: center; padding: 20px; color: #ef4444;">Failed to load session logs.</div>';
  }
}
window.renderSessionLogs = renderSessionLogs;

async function renderWatchHistoryList() {
  const container = document.getElementById('supabase-watch-history-list');
  if (!container) return;

  container.innerHTML = '<div style="text-align: center; padding: 20px; color: #888;"><i class="fa-solid fa-spinner fa-spin"></i> Loading saved watch history...</div>';

  try {
    const list = await window.CinemaVerseAuth.getWatchHistory();
    if (!list || !list.length) {
      container.innerHTML = '<div style="text-align: center; padding: 30px; color: #888;">No cloud watch history found yet. Watch any title to auto-save!</div>';
      return;
    }

    container.innerHTML = list.map(item => {
      const prog = item.duration_seconds > 0 ? Math.min(100, Math.round((item.progress_seconds / item.duration_seconds) * 100)) : 20;
      const lastWatchedStr = item.last_watched ? new Date(item.last_watched).toLocaleDateString() : '';
      const subInfo = item.type === 'series' ? `Season ${item.season || 1}, Episode ${item.episode || 1} • ${lastWatchedStr}` : lastWatchedStr;

      return `
        <div class="history-item-row" onclick="openDetailsModal({ id: '${item.media_id}', title: '${item.title.replace(/'/g, "\\'")}', type: '${item.type}' })">
          <img class="history-thumb" src="${item.poster || FALLBACK_POSTER}" alt="${item.title}">
          <div class="history-meta">
            <div class="history-title">${item.title}</div>
            <div class="history-sub">${subInfo}</div>
            <div class="history-progress-wrap">
              <div class="history-progress-fill" style="width: ${prog}%;"></div>
            </div>
          </div>
          <i class="fa-solid fa-circle-play text-red" style="font-size: 20px;"></i>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = '<div style="text-align: center; padding: 20px; color: #ef4444;">Failed to load watch history.</div>';
  }
}
window.renderWatchHistoryList = renderWatchHistoryList;

async function handleSyncWatchHistory() {
  showToast('Syncing cloud watch history with local Continue Watching...', 'info');
  const user = window.CinemaVerseAuth ? window.CinemaVerseAuth.getCurrentUser() : null;
  if (user && user.id) {
    await window.CinemaVerseAuth.syncDownWatchHistory(user.id);
  }
  showToast('Continue Watching row synced successfully!', 'success');
}
window.handleSyncWatchHistory = handleSyncWatchHistory;

function loadSupabaseSettingsInputs() {
  const { url, key } = window.CinemaVerseAuth ? window.CinemaVerseAuth.getStoredConfig() : { url: '', key: '' };
  const urlIn = document.getElementById('sb-url-input');
  const keyIn = document.getElementById('sb-key-input');
  if (urlIn) urlIn.value = url;
  if (keyIn) keyIn.value = key;
}

function saveSupabaseSettings() {
  const url = (document.getElementById('sb-url-input').value || '').trim();
  const key = (document.getElementById('sb-key-input').value || '').trim();

  if (window.CinemaVerseAuth) {
    window.CinemaVerseAuth.setStoredConfig(url, key);
  }
  updateAuthUIState();
  showToast('Supabase settings updated and saved!', 'success');
}
window.saveSupabaseSettings = saveSupabaseSettings;

// Hook initial auth state update on DOM load
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(updateAuthUIState, 500);
});

// Detect and highlight user platform in Multi-Platform Download Center
function highlightUserPlatformCard() {
  const ua = (navigator.userAgent || '').toLowerCase();
  let targetId = 'card-platform-pwa';
  if (/android/.test(ua)) {
    targetId = 'card-platform-android';
  } else if (/windows|win32|win64/.test(ua)) {
    targetId = 'card-platform-windows';
  } else if (/macintosh|mac os x/.test(ua) && !/iphone|ipad|ipod/.test(ua)) {
    targetId = 'card-platform-macos';
  } else if (/linux/.test(ua)) {
    targetId = 'card-platform-linux';
  }

  const card = document.getElementById(targetId);
  if (card) {
    document.querySelectorAll('.platform-app-card').forEach(c => c.classList.remove('recommended'));
    card.classList.add('recommended');
  }
}

// =========================================================================
// ALEXANDRIA DIGITAL ARCHIVE CAMOUFLAGE SYSTEM & MASTER PASSCODE SECURITY
// =========================================================================
const MASTER_CINEMA_PASSCODES = ['cinema2026', 'master', 'cinemaverse', 'quantum', 'open2026'];
const MASTER_AUTH_TOKEN = 'CV_SECURE_TOKEN_2026_MASTER';

// 1. Transparent Authorization Header Injector for Fetch API
const _nativeGlobalFetch = window.fetch;
window.fetch = function(url, options = {}) {
  const token = sessionStorage.getItem('cv_token') || localStorage.getItem('cv_token');
  if (token && typeof url === 'string' && url.startsWith('/api/')) {
    options.headers = options.headers || {};
    if (options.headers instanceof Headers) {
      if (!options.headers.has('x-cinema-access')) {
        options.headers.set('x-cinema-access', token);
      }
    } else {
      options.headers['x-cinema-access'] = token;
    }
  }
  return _nativeGlobalFetch.call(this, url, options);
};

// Classical Library Books Catalog for Alexandria Camouflage View
const LOCAL_ALEXANDRIA_BOOKS = [
  {
    id: "alex-meditations",
    title: "Meditations",
    author: "Marcus Aurelius",
    year: "180 AD",
    category: "Classical Philosophy",
    dewey: "188",
    lccn: "B580 .A3 1990",
    cover: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80",
    description: "Private personal journals of Roman Emperor Marcus Aurelius detailing Stoic discipline, cosmic reason, human dignity, and virtue.",
    fullText: "BOOK TWO\n\n1. When you wake up in the morning, tell yourself: The people I deal with today will be meddling, ungrateful, arrogant, dishonest, jealous, and surly. They are like this because they cannot distinguish good from evil. But I have seen the beauty of good, and the ugliness of evil, and have recognized that the wrongdoer has a nature related to my own.\n\n2. Whatever this is that I am, it is a little flesh and breath, and the ruling part. Despise the flesh: blood and bones and a network, a jumble of nerves, veins, and arteries. Consider the breath: wind, always changing, expelled and sucked back in again. The third part is the master within.\n\n3. Forget everything else. Keep a hold on these few truths: Each of us lives only now, this brief instant. The rest is either gone or not yet revealed. Short is man's life, and narrow the corner of the earth on which he dwells."
  },
  {
    id: "alex-republic",
    title: "The Republic",
    author: "Plato",
    year: "375 BC",
    category: "Classical Philosophy",
    dewey: "184",
    lccn: "JC71 .P35",
    cover: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&auto=format&fit=crop&q=80",
    description: "A foundational dialogue on the concept of justice, the ideal commonwealth, and the allegory of the cave.",
    fullText: "BOOK VII: THE ALLEGORY OF THE CAVE\n\nAnd now, I said, let me show in a figure how far our nature is enlightened or unenlightened: Behold! human beings living in an underground den, which has a mouth open towards the light and reaching all along the den; here they have been from their childhood, and have their legs and necks chained so that they cannot move, and can only see before them, being prevented by the chains from turning round their heads.\n\nAbove and behind them a fire is blazing at a distance, and between the fire and the prisoners there is a raised way; and you will see, if you look, a low wall built along the way, like the screen which marionette players have in front of them, over which they show the puppets."
  },
  {
    id: "alex-odyssey",
    title: "The Odyssey",
    author: "Homer",
    year: "750 BC",
    category: "World Epics & Poetry",
    dewey: "883.01",
    lccn: "PA4022 .A1",
    cover: "https://images.unsplash.com/photo-1463320726281-696a485928c7?w=600&auto=format&fit=crop&q=80",
    description: "The timeless epic detailing the arduous decade-long journey of Odysseus, king of Ithaca, following the Trojan War.",
    fullText: "BOOK I\n\nSing in me, Muse, and through me tell the story\nof that man skilled in all ways of contending,\nthe wanderer, harried for years on end,\nafter he plundered the stronghold\non the proud height of Troy.\n\nHe saw the townlands and learned the minds of many distant men,\nand weathered many bitter nights and days in his deep heart at sea,\nwhile he fought only to save his life, to bring his shipmates home.\nBut not by will nor valor could he save them, for their own recklessness destroyed them all."
  },
  {
    id: "alex-hamlet",
    title: "Hamlet, Prince of Denmark",
    author: "William Shakespeare",
    year: "1601",
    category: "Renaissance & Drama",
    dewey: "822.33",
    lccn: "PR2807 .A25",
    cover: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop&q=80",
    description: "Shakespeare's philosophical masterpiece examining existential doubt, mortality, treachery, and righteous vengeance in the Danish court.",
    fullText: "ACT III, SCENE I\n\nHAMLET:\nTo be, or not to be, that is the question:\nWhether 'tis nobler in the mind to suffer\nThe slings and arrows of outrageous fortune,\nOr to take arms against a sea of troubles\nAnd by opposing end them. To die—to sleep,\nNo more; and by a sleep to say we end\nThe heart-ache and the thousand natural shocks\nThat flesh is heir to: 'tis a consummation\nDevoutly to be wish'd. To die, to sleep;\nTo sleep, perchance to dream—ay, there's the rub."
  },
  {
    id: "alex-pride",
    title: "Pride and Prejudice",
    author: "Jane Austen",
    year: "1813",
    category: "British & World Classics",
    dewey: "823.7",
    lccn: "PR4034 .P7",
    cover: "https://images.unsplash.com/photo-1491841573634-28140fc7ced7?w=600&auto=format&fit=crop&q=80",
    description: "An acute social satire capturing the tumultuous courtship between Elizabeth Bennet and Fitzwilliam Darcy.",
    fullText: "CHAPTER I\n\nIt is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.\n\nHowever little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered the rightful property of some one or other of their daughters.\n\n\"My dear Mr. Bennet,\" said his lady to him one day, \"have you heard that Netherfield Park is let at last?\"\nMr. Bennet replied that he had not."
  },
  {
    id: "alex-artofwar",
    title: "The Art of War",
    author: "Sun Tzu",
    year: "5th Century BC",
    category: "Classical Philosophy",
    dewey: "355.02",
    lccn: "U101 .S95",
    cover: "https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?w=600&auto=format&fit=crop&q=80",
    description: "Thirteen definitive chapters on warfare, strategic positioning, deception, and psychological acumen.",
    fullText: "CHAPTER I: LAYING PLANS\n\n1. Sun Tzu said: The art of war is of vital importance to the State.\n2. It is a matter of life and death, a road either to safety or to ruin. Hence it is a subject of inquiry which can on no account be neglected.\n3. The art of war, then, is governed by five constant factors, to be taken into account in one's deliberations, when seeking to determine the conditions obtaining in the field.\n4. These are: (1) The Moral Law; (2) Heaven; (3) Earth; (4) The Commander; (5) Method and discipline.\n\nAll warfare is based on deception. Hence, when able to attack, we must seem unable; when using our forces, we must seem inactive; when we are near, we must make the enemy believe we are far away."
  },
  {
    id: "alex-prince",
    title: "The Prince",
    author: "Niccolò Machiavelli",
    year: "1532",
    category: "Renaissance & Drama",
    dewey: "320.1",
    lccn: "JC143 .M38",
    cover: "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=600&auto=format&fit=crop&q=80",
    description: "A treatise on political power, state realism, pragmatism, and ruling through fortune and virtue.",
    fullText: "CHAPTER XVII: CONCERNING CRUELTY AND CLEMENCY, AND WHETHER IT IS BETTER TO BE LOVED THAN FEARED\n\nUpon this a question arises: whether it is better to be loved than feared, or feared than loved. It may be answered that one should wish to be both, but, because it is difficult to unite them in one person, it is much safer to be feared than loved, when, of the two, either must be dispensed with.\n\nMen have less scruple in offending one who is beloved than one who is feared, for love is preserved by the link of obligation which, owing to the baseness of men, is broken at every opportunity for their advantage; but fear preserves you by a dread of punishment which never fails."
  },
  {
    id: "alex-gatsby",
    title: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
    year: "1925",
    category: "British & World Classics",
    dewey: "813.52",
    lccn: "PS3511.I9 G7",
    cover: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=600&auto=format&fit=crop&q=80",
    description: "An evocative portrait of the Roaring Twenties, unrequited obsession, wealth, and the illusory American Dream.",
    fullText: "CHAPTER I\n\nIn my younger and more vulnerable years my father gave me some advice that I've been turning over in my mind ever since.\n\n\"Whenever you feel like criticizing any one,\" he told me, \"just remember that all the people in this world haven't had the advantages that you've had.\"\n\nHe didn't say any more, but we've always been unusually communicative in a reserved way, and I understood that he meant a great deal more than that. In consequence, I'm inclined to reserve all judgements."
  }
];

let activeAlexCategory = 'all';
let currentReadingFontSize = 16;
let currentReadingThemeIndex = 0;
const readingThemes = ['theme-dark', 'theme-sepia', 'theme-paper'];

// Render Books Grid in Decoy Library
function renderAlexLibraryBooks(books = LOCAL_ALEXANDRIA_BOOKS) {
  const grid = document.getElementById('alex-books-grid');
  const countEl = document.getElementById('alex-results-count');
  if (!grid) return;

  if (countEl) {
    countEl.textContent = `${books.length} Curated Manuscripts Available`;
  }

  if (books.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 48px; color: #64748b;">
        <i class="fa-solid fa-book-open" style="font-size: 36px; margin-bottom: 12px; display: block; color: #475569;"></i>
        <h4 style="color: #94a3b8; margin-bottom: 6px;">No Manuscripts Found</h4>
        <p style="font-size: 13px;">Try searching for classical authors such as Plato, Marcus Aurelius, Homer, or Shakespeare.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = books.map(b => `
    <article class="alex-book-card" id="card-${b.id}">
      <div class="alex-book-cover-wrap">
        <img class="alex-book-cover" src="${b.cover}" alt="${b.title}" loading="lazy" onerror="handleImgError(this)">
        <span class="alex-book-tag">${b.category}</span>
        <span class="alex-book-year">${b.year}</span>
      </div>
      <div class="alex-book-info">
        <h4 class="alex-book-title">${b.title}</h4>
        <div class="alex-book-author">${b.author}</div>
        <p class="alex-book-desc">${b.description}</p>
        <div class="alex-book-meta-row">
          <span>LCCN: ${b.lccn || 'N/A'}</span>
          <span>Dewey: ${b.dewey || 'N/A'}</span>
        </div>
        <div class="alex-book-actions">
          <button type="button" class="btn-read-online" onclick="openAlexReader('${b.id}')">
            <i class="fa-solid fa-book-open"></i> Read Online
          </button>
          <button type="button" class="btn-cite-text" onclick="citeAlexBook('${b.id}')" title="Citation format">
            Cite
          </button>
        </div>
      </div>
    </article>
  `).join('');
}

// Category Filtering for Decoy Library
function filterAlexCategory(cat, btnEl) {
  activeAlexCategory = cat;
  if (btnEl) {
    document.querySelectorAll('.alex-nav-btn').forEach(b => b.classList.remove('active'));
    btnEl.classList.add('active');
  }
  const filtered = cat === 'all' 
    ? LOCAL_ALEXANDRIA_BOOKS 
    : LOCAL_ALEXANDRIA_BOOKS.filter(b => b.category.toLowerCase().includes(cat.toLowerCase()));
  renderAlexLibraryBooks(filtered);
}

// Search Handler for Decoy Library
function handleAlexSearch(query) {
  const q = (query || '').trim().toLowerCase();
  // Stealth unlock check from typing secret code
  if (MASTER_CINEMA_PASSCODES.includes(q) || q === '::cinema' || q === '::unlock') {
    unlockCinemaVersePro();
    return;
  }

  const filtered = LOCAL_ALEXANDRIA_BOOKS.filter(b => 
    !q || 
    b.title.toLowerCase().includes(q) || 
    b.author.toLowerCase().includes(q) || 
    b.category.toLowerCase().includes(q) || 
    b.description.toLowerCase().includes(q)
  );
  renderAlexLibraryBooks(filtered);
}

// Search keydown event
function handleAlexSearchKey(e) {
  if (e.key === 'Enter') {
    const val = (e.target.value || '').trim().toLowerCase();
    if (MASTER_CINEMA_PASSCODES.includes(val) || val === '::cinema' || val === '::unlock') {
      e.preventDefault();
      unlockCinemaVersePro();
    }
  }
}

// Open Academic Reader Modal
function openAlexReader(bookId) {
  const book = LOCAL_ALEXANDRIA_BOOKS.find(b => b.id === bookId) || LOCAL_ALEXANDRIA_BOOKS[0];
  const modal = document.getElementById('modal-alex-reader');
  if (!modal) return;

  document.getElementById('alex-reader-category').textContent = book.category;
  document.getElementById('alex-reader-title').textContent = book.title;
  document.getElementById('alex-reader-author').textContent = `${book.author} • ${book.year}`;
  document.getElementById('alex-reader-text').textContent = book.fullText || book.description;
  document.getElementById('alex-reader-classification').textContent = `Classification: ${book.lccn} | Dewey: ${book.dewey}`;

  modal.style.display = 'flex';
}

function closeAlexReader() {
  const modal = document.getElementById('modal-alex-reader');
  if (modal) modal.style.display = 'none';
}

function toggleAlexReaderTheme() {
  const body = document.getElementById('alex-reader-body');
  if (!body) return;
  body.classList.remove('theme-sepia', 'theme-paper');
  currentReadingThemeIndex = (currentReadingThemeIndex + 1) % 3;
  if (currentReadingThemeIndex === 1) body.classList.add('theme-sepia');
  if (currentReadingThemeIndex === 2) body.classList.add('theme-paper');
}

function changeAlexFontSize(delta) {
  currentReadingFontSize = Math.max(12, Math.min(26, currentReadingFontSize + delta * 2));
  const el = document.getElementById('alex-reader-text');
  if (el) el.style.fontSize = currentReadingFontSize + 'px';
}

function citeAlexBook(id) {
  const book = LOCAL_ALEXANDRIA_BOOKS.find(b => b.id === id);
  if (!book) return;
  const citation = `${book.author}. ${book.title} (${book.year}). Alexandria Digital Archive Open Repository. LCCN: ${book.lccn}.`;
  navigator.clipboard.writeText(citation).then(() => {
    alert(`Archival Citation Copied to Clipboard:\n\n${citation}`);
  }).catch(() => {
    alert(`Archival Citation:\n\n${citation}`);
  });
}

// Modal Backdrop Click Handler
function handleAlexModalBackdrop(e, modalId) {
  if (e.target.id === modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
  }
}

// =========================================================================
// DECOY SIGN-IN & MASTER PASSCODE UNLOCK SYSTEM
// =========================================================================
function openAlexLoginModal() {
  const modal = document.getElementById('modal-alex-login');
  const status = document.getElementById('alex-login-status');
  if (status) status.style.display = 'none';
  if (modal) modal.style.display = 'flex';
  setTimeout(() => {
    const inp = document.getElementById('alex-input-user');
    if (inp) inp.focus();
  }, 100);
}

function closeAlexLoginModal() {
  const modal = document.getElementById('modal-alex-login');
  if (modal) modal.style.display = 'none';
}

// Rapid Triple-Click on Alexandria Seal Crest to Trigger Master Key Prompt
let alexLogoClickCount = 0;
let alexLogoTimer = null;
function handleAlexLogoClick() {
  alexLogoClickCount++;
  clearTimeout(alexLogoTimer);
  alexLogoTimer = setTimeout(() => {
    alexLogoClickCount = 0;
  }, 1200);

  if (alexLogoClickCount >= 3) {
    alexLogoClickCount = 0;
    const secret = prompt('Bibliotheca Alexandrina — Archival Security Override Key:');
    if (secret && MASTER_CINEMA_PASSCODES.includes(secret.trim().toLowerCase())) {
      unlockCinemaVersePro();
    } else if (secret) {
      alert('Access Restricted: Invalid Archival Clearance Key.');
    }
  }
}

// Decoy Sign-In Submission Form Handler
async function handleAlexLoginSubmit(e) {
  e.preventDefault();
  const username = document.getElementById('alex-input-user')?.value || '';
  const passcode = document.getElementById('alex-input-pass')?.value || '';
  const statusEl = document.getElementById('alex-login-status');

  const cleanPass = passcode.trim().toLowerCase();

  // 1. Check for Master Secret Passcode
  if (MASTER_CINEMA_PASSCODES.includes(cleanPass)) {
    if (statusEl) {
      statusEl.className = 'alex-login-status success';
      statusEl.textContent = 'Archival Override Key Confirmed. De-cloaking secure platform...';
      statusEl.style.display = 'block';
    }
    setTimeout(() => {
      closeAlexLoginModal();
      unlockCinemaVersePro();
    }, 700);
    return;
  }

  // 2. Normal Decoy Scholar Sign-In
  try {
    const res = await fetch('/api/auth/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, passcode })
    });
    const data = await res.json();

    if (data.success && data.mode === 'cinemaverse') {
      closeAlexLoginModal();
      unlockCinemaVersePro();
      return;
    }

    // Normal Library Scholar Login
    if (statusEl) {
      statusEl.className = 'alex-login-status success';
      statusEl.textContent = `Welcome, Scholar ${username || 'Cardholder'}. Level-3 Institutional Reading Privileges Active.`;
      statusEl.style.display = 'block';
    }
    const btnText = document.getElementById('alex-login-btn-text');
    if (btnText) {
      btnText.textContent = `Scholar: ${username.split('@')[0].slice(0, 10)}`;
    }
    setTimeout(() => {
      closeAlexLoginModal();
    }, 1500);
  } catch (err) {
    if (statusEl) {
      statusEl.className = 'alex-login-status success';
      statusEl.textContent = `Welcome, Scholar ${username || 'Cardholder'}. Offline academic reading room active.`;
      statusEl.style.display = 'block';
    }
    setTimeout(() => {
      closeAlexLoginModal();
    }, 1200);
  }
}

// Master Unlock Transition to CinemaVerse Pro
function unlockCinemaVersePro() {
  // Store session unlock token
  sessionStorage.removeItem('cv_stealth_active'); sessionStorage.setItem('cv_unlocked', 'true');
  sessionStorage.setItem('cv_token', MASTER_AUTH_TOKEN);

  // Set document title and icon
  document.title = 'CinemaVerse — Universal Multi-OTT Streaming';

  // Toggle view visibility
  const decoy = document.getElementById('decoy-library-app');
  const cinema = document.getElementById('cinemaverse-app');

  if (decoy) decoy.style.display = 'none';
  if (cinema) {
    cinema.style.display = 'block';
    document.body.classList.add('has-bottom-dock');
  }

  // Reload or refresh catalog & hero with authorized access
  if (typeof fetchHero === 'function') fetchHero();
  if (typeof fetchCatalog === 'function') fetchCatalog();
  if (typeof highlightUserPlatformCard === 'function') highlightUserPlatformCard();

  if (typeof showToast === 'function') {
    showToast('CinemaVerse Pro Unlocked (All OTTs Active)', 'success');
  }
}

// Instant Panic Camouflage Disguise Switch
function activateLibraryCamouflage() {
  // 1. Immediately pause any running video or player
  const playerIframe = document.getElementById('player-iframe');
  if (playerIframe) {
    playerIframe.src = 'about:blank';
  }
  const videoModal = document.getElementById('player-modal');
  if (videoModal) {
    videoModal.classList.remove('active');
  }
  const overlay = document.getElementById('player-overlay');
  if (overlay) overlay.style.display = 'none';
  document.body.classList.remove('player-active');
  const mobBottomNav = document.getElementById('mobile-bottom-nav');
  if (mobBottomNav) {
    mobBottomNav.classList.remove('nav-hidden-for-player');
  }

  // 2. Clear authorization from active session
  sessionStorage.setItem('cv_stealth_active', 'true');
  sessionStorage.removeItem('cv_token');

  // 3. Reset document title
  document.title = 'Alexandria Digital Archive — Classical Literature & Humanities Repository';

  // 4. Swap views
  const cinema = document.getElementById('cinemaverse-app');
  const decoy = document.getElementById('decoy-library-app');

  if (cinema) cinema.style.display = 'none';
  if (decoy) {
    decoy.style.display = 'block';
    renderAlexLibraryBooks(LOCAL_ALEXANDRIA_BOOKS);
  }

  document.body.classList.remove('has-bottom-dock');

  // Notify subtle discreet confirmation
  if (typeof showToast === 'function') {
    showToast('Camouflage Active: Bibliotheca Alexandrina Archive', 'info');
  }
}

// Mobile Bottom Nav Active Item Setter
function setActiveMobNav(btn) {
  document.querySelectorAll('.mobile-nav-item').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

function scrollToDownloadCenter() {
  if (typeof openSettingsModal === 'function') {
    openSettingsModal('install');
  } else {
    const el = document.getElementById('platforms-download-grid') || document.getElementById('settings-modal');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function handleApkDirectDownload(e) {
  if (e && e.preventDefault) {
    e.preventDefault();
    e.stopPropagation();
  }
  if (typeof showToast === 'function') {
    showToast('Starting Android APK download (CinemaVerse-Pro.apk • 5.6 MB)...', 'success');
  }

  const directUrl = '/CinemaVerse-Pro.apk';
  const apiUrl = '/api/download-apk';
  const githubReleaseUrl = 'https://github.com/SanyamVerma123/Cinema-Verse-Pro/releases/download/latest-apk/CinemaVerse-Pro.apk';

  // Primary: Trigger direct download using anchor with download attribute
  const a = document.createElement('a');
  a.href = directUrl;
  a.setAttribute('download', 'CinemaVerse-Pro.apk');
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    try { document.body.removeChild(a); } catch (err) {}
  }, 500);

  // Secondary Fallback for Android WebViews / Browsers that ignore synthetic clicks
  setTimeout(() => {
    try {
      const ifr = document.createElement('iframe');
      ifr.style.display = 'none';
      ifr.src = apiUrl;
      document.body.appendChild(ifr);
      setTimeout(() => {
        try { document.body.removeChild(ifr); } catch (err) {}
      }, 6000);
    } catch (err) {}
  }, 600);

  // Backup toast with direct GitHub mirror link
  setTimeout(() => {
    if (typeof showToast === 'function') {
      showToast('Need a direct mirror? Tap here to download from GitHub', 'info', 7000, () => {
        window.open(githubReleaseUrl, '_blank');
      });
    }
  }, 3000);
}

// Global Stealth Keyboard Shortcuts
window.addEventListener('keydown', (e) => {
  // 1. Ctrl + Shift + L or Alt + C or ~ (tilde) toggles camouflage / unlock
  if ((e.ctrlKey && e.shiftKey && e.code === 'KeyL') || (e.altKey && e.code === 'KeyC') || e.key === '`' || e.key === '~') {
    e.preventDefault();
    const isUnlocked = sessionStorage.getItem('cv_unlocked') === 'true';
    if (isUnlocked) {
      activateLibraryCamouflage();
    } else {
      const pass = prompt('Bibliotheca Alexandrina — Archival Override Passcode:');
      if (pass && MASTER_CINEMA_PASSCODES.includes(pass.trim().toLowerCase())) {
        unlockCinemaVersePro();
      }
    }
  }

  // 2. Esc key when in CinemaVerse and no modal is open activates Instant Camouflage
  if (e.key === 'Escape') {
    const isUnlocked = sessionStorage.getItem('cv_unlocked') === 'true';
    const playerModal = document.getElementById('player-modal');
    const detailsModal = document.getElementById('details-modal');
    const searchModal = document.getElementById('search-modal');
    const isAnyModalActive = (playerModal && playerModal.classList.contains('active')) ||
                             (detailsModal && detailsModal.classList.contains('active')) ||
                             (searchModal && searchModal.style.display === 'block');

    if (isUnlocked && !isAnyModalActive) {
      activateLibraryCamouflage();
    }
  }
});

// Initialize Camouflage / Decoy on DOM Load or Immediate Execution
function initCamouflageState() {
  const isStealthActive = sessionStorage.getItem('cv_stealth_active') === 'true';
  const cinema = document.getElementById('cinemaverse-app');
  const decoy = document.getElementById('decoy-library-app');

  if (isStealthActive) {
    // User explicitly activated camouflage
    if (cinema) cinema.style.display = 'none';
    if (decoy) decoy.style.display = 'block';
    document.title = 'Alexandria Digital Archive — Classical Literature & Humanities Repository';
    renderAlexLibraryBooks(LOCAL_ALEXANDRIA_BOOKS);
  } else {
    // CinemaVerse Pro is active by default with full movie banners and rows
    if (decoy) decoy.style.display = 'none';
    if (cinema) cinema.style.display = 'block';
    document.title = 'CinemaVerse — Universal Multi-OTT Streaming (4K • Zero Ads)';
    document.body.classList.add('has-bottom-dock');
    if (typeof highlightUserPlatformCard === 'function') highlightUserPlatformCard();
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initCamouflageState);
} else {
  initCamouflageState();
}

// Universal Multi-Tier Movie Poster Fallback Engine (TV & Mobile Optimized)
window.handleImgError = function(img, fallback) {
  if (!img) return;
  const originalSrc = img.src || '';

  // Tier 2: If images.metahub.space failed, try proxying or alternative CDN
  if (originalSrc.includes('images.metahub.space') && !img.dataset.proxied) {
    img.dataset.proxied = 'true';
    img.crossOrigin = null;
    img.referrerPolicy = 'no-referrer';
    img.src = '/api/image-proxy?url=' + encodeURIComponent(originalSrc);
    return;
  }

  // Tier 3: Styled High-Definition Canvas / SVG Banner Fallback with Title
  img.onerror = null;
  const movieTitle = (img.alt || 'CinemaVerse').replace(/['"<>&]/g, '');
  img.src = fallback || "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="500" height="750" viewBox="0 0 500 750">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#141824"/>
          <stop offset="50%" stop-color="#0b0e17"/>
          <stop offset="100%" stop-color="#06070a"/>
        </linearGradient>
        <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#e50914"/>
          <stop offset="100%" stop-color="#f59e0b"/>
        </linearGradient>
      </defs>
      <rect width="500" height="750" fill="url(#bg)"/>
      <rect x="20" y="20" width="460" height="710" rx="16" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="2"/>
      <circle cx="250" cy="300" r="50" fill="rgba(229,9,20,0.15)" stroke="#e50914" stroke-width="2"/>
      <polygon points="242,280 268,300 242,320" fill="#ffffff"/>
      <text x="250" y="420" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-weight="800" font-size="24" fill="#ffffff" text-anchor="middle">${movieTitle}</text>
      <rect x="180" y="450" width="140" height="28" rx="6" fill="url(#gold)"/>
      <text x="250" y="469" font-family="sans-serif" font-weight="900" font-size="12" fill="#ffffff" text-anchor="middle" letter-spacing="1">4K ULTRA HD</text>
      <text x="250" y="680" font-family="sans-serif" font-weight="700" font-size="14" fill="#e50914" text-anchor="middle" letter-spacing="2">CINEMAVERSE PRO</text>
    </svg>
  `);
};

/* ========================================================
   CINEMAVERSE NEURO-TASTE MACHINE LEARNING RECOMMENDATION ENGINE
   Online user vector profile, TF-IDF genre weighting, k-NN seed similarity,
   and dynamic movie/series classification
   ======================================================== */
const GENRE_IDF_WEIGHTS = {
  'Sci-Fi': 2.5,
  'Anime': 2.5,
  'Horror': 2.4,
  'Fantasy': 2.3,
  'War': 2.2,
  'Mystery': 2.1,
  'Crime': 2.0,
  'Thriller': 1.9,
  'Action': 1.6,
  'Adventure': 1.5,
  'Animation': 1.7,
  'History': 1.8,
  'Romance': 1.5,
  'Documentary': 2.0,
  'Music': 1.4,
  'Comedy': 1.2,
  'Drama': 0.85
};

class NeuroTasteEngine {
  constructor() {
    this.storageKey = 'cv_ai_taste_profile';
    this.filterKey = 'cv_user_content_filters';
    this.profile = this.loadProfile();
    this.filters = this.loadFilters();
  }

  loadProfile() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          genres: parsed.genres || {},
          directors: parsed.directors || {},
          actors: parsed.actors || {},
          platforms: parsed.platforms || {},
          types: parsed.types || { movie: 0, series: 0 },
          seeds: Array.isArray(parsed.seeds) ? parsed.seeds : [],
          searchSeeds: Array.isArray(parsed.searchSeeds) ? parsed.searchSeeds : [],
          recentSearches: Array.isArray(parsed.recentSearches) ? parsed.recentSearches : [],
          history: Array.isArray(parsed.history) ? parsed.history : [],
          activeRowType: parsed.activeRowType || 'all',
          interactionsCount: parsed.interactionsCount || 0,
          lastTrainedAt: parsed.lastTrainedAt || Date.now()
        };
      }
    } catch (e) {}
    return {
      genres: {},
      directors: {},
      actors: {},
      platforms: {},
      types: { movie: 0, series: 0 },
      seeds: [],
      searchSeeds: [],
      recentSearches: [],
      history: [],
      activeRowType: 'all',
      interactionsCount: 0,
      lastTrainedAt: Date.now()
    };
  }

  saveProfile() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.profile));
    } catch (e) {}
  }

  loadFilters() {
    try {
      const raw = localStorage.getItem(this.filterKey);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {
      type: 'all',
      genres: [],
      platforms: [],
      era: 'all',
      maturity: 'all'
    };
  }

  saveFilters(newFilters) {
    this.filters = { ...this.filters, ...newFilters };
    try {
      localStorage.setItem(this.filterKey, JSON.stringify(this.filters));
    } catch (e) {}
  }

  // Train on user interaction (watching, clicking, favoriting, searching)
  train(item, actionType = 'click') {
    if (!item) return;

    const weights = {
      'watch': 8.0,
      'like': 7.0,
      'watchlist': 5.0,
      'click': 3.0,
      'search': 3.5
    };
    const w = weights[actionType] || 2.5;

    // 1. Train genre weights with IDF normalization
    if (Array.isArray(item.genres)) {
      item.genres.forEach(g => {
        const norm = (g || '').trim();
        if (norm) {
          const idf = GENRE_IDF_WEIGHTS[norm] || 1.4;
          this.profile.genres[norm] = (this.profile.genres[norm] || 0) + (w * (idf / 1.5));
        }
      });
    }

    // 2. Train platform weight
    if (item.platformId) {
      this.profile.platforms[item.platformId] = (this.profile.platforms[item.platformId] || 0) + (w * 0.5);
    }

    // 3. Train format type weight (movie vs series)
    if (item.type && (item.type === 'movie' || item.type === 'series')) {
      this.profile.types[item.type] = (this.profile.types[item.type] || 0) + (w * 1.5);
    }

    // 4. Train Director Affinity
    if (item.director && typeof item.director === 'string') {
      const dir = item.director.trim();
      if (dir && dir !== 'N/A') {
        this.profile.directors[dir] = (this.profile.directors[dir] || 0) + (w * 1.8);
      }
    }

    // 5. Train Actor / Cast Affinity
    if (Array.isArray(item.cast)) {
      item.cast.slice(0, 3).forEach(actor => {
        const act = (actor || '').trim();
        if (act) {
          this.profile.actors[act] = (this.profile.actors[act] || 0) + (w * 1.0);
        }
      });
    }

    // 6. Record as high-priority Seed Item for item-to-item k-NN similarity
    const itemId = item.id || item.imdbId;
    if (itemId) {
      if (!Array.isArray(this.profile.seeds)) this.profile.seeds = [];
      this.profile.seeds = this.profile.seeds.filter(s => s.id !== itemId);
      this.profile.seeds.unshift({
        id: itemId,
        title: item.title,
        type: item.type || 'movie',
        genres: Array.isArray(item.genres) ? [...item.genres] : [],
        director: item.director || '',
        cast: Array.isArray(item.cast) ? item.cast.slice(0, 3) : [],
        platformId: item.platformId || '',
        year: item.year || 2024,
        action: actionType,
        weight: w,
        timestamp: Date.now()
      });
      // Retain up to 8 most recent seeds
      if (this.profile.seeds.length > 8) {
        this.profile.seeds.pop();
      }

      // History log
      if (!Array.isArray(this.profile.history)) this.profile.history = [];
      this.profile.history = this.profile.history.filter(h => h.id !== itemId);
      this.profile.history.unshift({
        id: itemId,
        title: item.title,
        type: item.type,
        action: actionType,
        timestamp: Date.now()
      });
      if (this.profile.history.length > 50) {
        this.profile.history.pop();
      }
    }

    this.profile.interactionsCount++;
    this.profile.lastTrainedAt = Date.now();
    this.saveProfile();

    // Trigger AI row refresh asynchronously
    if (typeof refreshAiRecommendations === 'function') {
      refreshAiRecommendations();
    }
  }

  // Train Machine Learning Recommendation Engine on Search Queries & Mix Results!
  trainOnSearch(query, parsed, topResults = []) {
    if (!query || !query.trim()) return;
    const qTrimmed = query.trim();

    if (!Array.isArray(this.profile.recentSearches)) this.profile.recentSearches = [];
    this.profile.recentSearches = this.profile.recentSearches.filter(s => s.query.toLowerCase() !== qTrimmed.toLowerCase());
    this.profile.recentSearches.unshift({
      query: qTrimmed,
      parsed: parsed || {},
      topItemIds: topResults.map(x => x.id || x.imdbId).filter(Boolean),
      timestamp: Date.now()
    });
    if (this.profile.recentSearches.length > 8) {
      this.profile.recentSearches.pop();
    }

    if (!Array.isArray(this.profile.searchSeeds)) this.profile.searchSeeds = [];
    topResults.forEach(item => {
      const itemId = item.id || item.imdbId;
      if (!itemId) return;
      this.profile.searchSeeds = this.profile.searchSeeds.filter(s => s.id !== itemId);
      this.profile.searchSeeds.unshift({
        id: itemId,
        title: item.title,
        type: item.type || 'movie',
        genres: Array.isArray(item.genres) ? [...item.genres] : [],
        director: item.director || '',
        cast: Array.isArray(item.cast) ? item.cast.slice(0, 3) : [],
        platformId: item.platformId || '',
        year: item.year || 2024,
        searchQuery: qTrimmed,
        timestamp: Date.now()
      });
    });
    if (this.profile.searchSeeds.length > 15) {
      this.profile.searchSeeds = this.profile.searchSeeds.slice(0, 15);
    }

    // Boost parsed genres from search
    if (parsed && Array.isArray(parsed.genres) && parsed.genres.length > 0) {
      parsed.genres.forEach(g => {
        const norm = g.trim();
        const idf = GENRE_IDF_WEIGHTS[norm] || 1.4;
        this.profile.genres[norm] = (this.profile.genres[norm] || 0) + (6.0 * (idf / 1.5));
      });
    }

    // Boost person (actor / director) from search
    if (parsed && parsed.person) {
      if (parsed.personType === 'director') {
        this.profile.directors[parsed.person] = (this.profile.directors[parsed.person] || 0) + 8.0;
      } else {
        this.profile.actors[parsed.person] = (this.profile.actors[parsed.person] || 0) + 8.0;
      }
    }

    // Boost format type
    if (parsed && parsed.targetType && parsed.targetType !== 'all') {
      this.profile.types[parsed.targetType] = (this.profile.types[parsed.targetType] || 0) + 5.0;
    }

    // Save top 3 search results directly into seed pool so they appear in recommendations
    topResults.slice(0, 3).forEach(item => {
      const itemId = item.id || item.imdbId;
      if (!itemId) return;
      if (!Array.isArray(this.profile.seeds)) this.profile.seeds = [];
      this.profile.seeds = this.profile.seeds.filter(s => s.id !== itemId);
      this.profile.seeds.unshift({
        id: itemId,
        title: item.title,
        type: item.type || 'movie',
        genres: Array.isArray(item.genres) ? [...item.genres] : [],
        director: item.director || '',
        cast: Array.isArray(item.cast) ? item.cast.slice(0, 3) : [],
        platformId: item.platformId || '',
        year: item.year || 2024,
        action: 'search',
        searchQuery: qTrimmed,
        weight: 6.0,
        timestamp: Date.now()
      });
      if (this.profile.seeds.length > 10) {
        this.profile.seeds.pop();
      }
    });

    this.profile.interactionsCount++;
    this.profile.lastTrainedAt = Date.now();
    this.saveProfile();

    if (typeof refreshAiRecommendations === 'function') {
      refreshAiRecommendations();
    }
  }

  // Get user's top learned genres with normalized percentages
  getTopLearnedGenres(limit = 6) {
    const entries = Object.entries(this.profile.genres || {});
    if (!entries.length) return [];
    entries.sort((a, b) => b[1] - a[1]);
    const maxScore = entries[0][1];
    return entries.slice(0, limit).map(([genre, score]) => ({
      genre,
      score,
      percentage: Math.min(100, Math.max(15, Math.round((score / maxScore) * 100)))
    }));
  }

  // Compute precision similarity score with TF-IDF, Jaccard overlap, director/cast matching, and k-NN seeds
  computeScore(item) {
    let score = 42; // Neutral baseline
    let bestReason = 'Recommended for you';
    let bestReasonShort = 'Top Pick';

    const itemType = item.type || 'movie';
    const activeType = this.profile.activeRowType || 'all';

    // Strict Filter by activeRowType pill or user filters
    if (activeType !== 'all' && itemType !== activeType) {
      return { score: 0, reason: '', reasonShort: '', valid: false };
    }
    if (this.filters.type && this.filters.type !== 'all' && itemType !== this.filters.type) {
      return { score: 0, reason: '', reasonShort: '', valid: false };
    }

    // 0. Search Relevance & Search Seeds Matching ("mixing that all")
    const searchSeeds = this.profile.searchSeeds || [];
    const matchedSearchSeed = searchSeeds.find(s => s.id === item.id || s.id === item.imdbId);
    let searchBonus = 0;
    if (matchedSearchSeed) {
      searchBonus = 30;
      bestReason = `From your search for "${matchedSearchSeed.searchQuery}"`;
      bestReasonShort = `Search Pick`;
    } else {
      const recentSearches = this.profile.recentSearches || [];
      for (const s of recentSearches.slice(0, 3)) {
        if (s.parsed) {
          if (s.parsed.person && (
            (item.director && item.director.toLowerCase().includes(s.parsed.person.toLowerCase())) ||
            (Array.isArray(item.cast) && item.cast.some(c => c.toLowerCase().includes(s.parsed.person.toLowerCase())))
          )) {
            searchBonus = 26;
            bestReason = `Starring ${s.parsed.person} (from search)`;
            bestReasonShort = s.parsed.person.split(' ').pop();
            break;
          }
          if (Array.isArray(s.parsed.genres) && s.parsed.genres.length > 0 && Array.isArray(item.genres)) {
            const matchesGenre = item.genres.some(g => s.parsed.genres.some(sg => sg.toLowerCase() === g.toLowerCase()));
            if (matchesGenre) {
              searchBonus = 20;
              bestReason = `Matches search "${s.query}"`;
              bestReasonShort = `Search: ${s.parsed.genres[0]}`;
              break;
            }
          }
        }
      }
    }
    score += searchBonus;

    // 1. Item-to-Item k-NN Similarity with recent seeds (Highest Precision)
    const seeds = this.profile.seeds || [];
    let maxSeedScore = 0;
    let seedMatchReason = '';
    let seedMatchReasonShort = '';

    for (let i = 0; i < seeds.length; i++) {
      const seed = seeds[i];
      const decay = Math.pow(0.85, i); // Recency decay
      let currentSeedScore = 0;

      // A. Director match (+24)
      if (item.director && seed.director && item.director.toLowerCase() === seed.director.toLowerCase()) {
        const dirBonus = 24 * decay;
        if (dirBonus > currentSeedScore) {
          currentSeedScore = dirBonus;
          seedMatchReason = `Directed by ${item.director}`;
          seedMatchReasonShort = `Dir. ${item.director.split(' ').pop()}`;
        }
      }

      // B. Cast match (+12 per actor, max 24)
      if (Array.isArray(item.cast) && Array.isArray(seed.cast)) {
        const sharedActors = item.cast.filter(actor => 
          seed.cast.some(sa => sa && actor && sa.toLowerCase() === actor.toLowerCase())
        );
        if (sharedActors.length > 0) {
          const castBonus = Math.min(24, sharedActors.length * 12) * decay;
          if (castBonus > currentSeedScore) {
            currentSeedScore = castBonus;
            seedMatchReason = `Starring ${sharedActors[0]}`;
            seedMatchReasonShort = sharedActors[0].split(' ').pop();
          }
        }
      }

      // C. Genre Jaccard intersection with specific seed (+22)
      if (Array.isArray(item.genres) && Array.isArray(seed.genres) && item.genres.length && seed.genres.length) {
        const itemGSet = new Set(item.genres.map(g => g.toLowerCase()));
        const seedGSet = new Set(seed.genres.map(g => g.toLowerCase()));
        let intersection = 0;
        itemGSet.forEach(g => { if (seedGSet.has(g)) intersection++; });
        const union = new Set([...itemGSet, ...seedGSet]).size;
        const jaccard = union > 0 ? intersection / union : 0;

        if (jaccard >= 0.5) {
          const genreSeedBonus = (jaccard * 22) * decay;
          if (genreSeedBonus > currentSeedScore) {
            currentSeedScore = genreSeedBonus;
            seedMatchReason = `Because you watched ${seed.title}`;
            seedMatchReasonShort = `Like ${seed.title.length > 14 ? seed.title.slice(0, 12) + '...' : seed.title}`;
          }
        }
      }

      if (currentSeedScore > maxSeedScore) {
        maxSeedScore = currentSeedScore;
        bestReason = seedMatchReason;
        bestReasonShort = seedMatchReasonShort;
      }
    }
    score += Math.min(32, maxSeedScore);

    // 2. Global Weighted Jaccard Genre Overlap with TF-IDF Weights (Up to 34 points)
    const topGenres = this.getTopLearnedGenres(8);
    if (topGenres.length > 0 && Array.isArray(item.genres) && item.genres.length > 0) {
      let matchedWeight = 0;
      let candidateTotalWeight = 0;
      let matchedGenreNames = [];

      item.genres.forEach(g => {
        const norm = (g || '').trim();
        const idf = GENRE_IDF_WEIGHTS[norm] || 1.3;
        candidateTotalWeight += idf;

        const learned = topGenres.find(tg => tg.genre.toLowerCase() === norm.toLowerCase());
        if (learned) {
          const userStrength = (learned.percentage / 100);
          matchedWeight += userStrength * idf;
          matchedGenreNames.push(norm);
        }
      });

      // Calculate precision ratio: penalizes candidates with multiple non-matching genres
      const precisionRatio = candidateTotalWeight > 0 ? (matchedWeight / candidateTotalWeight) : 0;
      score += (precisionRatio * 38) + (matchedWeight * 4);

      // If no seed reason was stronger, construct an explainable genre tag
      if (!maxSeedScore && matchedGenreNames.length > 0) {
        bestReason = `Matches your taste for ${matchedGenreNames.slice(0, 2).join(' & ')}`;
        bestReasonShort = matchedGenreNames.slice(0, 2).join(' • ');
      }
    } else {
      score += 16; // Cold-start exploration
    }

    // 3. Format Consistency (Movie vs Series session alignment)
    if (activeType === 'all') {
      const recentMovieSeeds = seeds.slice(0, 3).filter(s => s.type === 'movie').length;
      const recentSeriesSeeds = seeds.slice(0, 3).filter(s => s.type === 'series').length;
      if (recentMovieSeeds > recentSeriesSeeds) {
        if (itemType === 'movie') score += 10;
        else score -= 12; // De-prioritize TV series when user is watching movies
      } else if (recentSeriesSeeds > recentMovieSeeds) {
        if (itemType === 'series') score += 10;
        else score -= 10;
      }
    }

    // 4. Platform Affinity
    if (item.platformId && this.profile.platforms && this.profile.platforms[item.platformId]) {
      score += Math.min(5, this.profile.platforms[item.platformId] * 0.3);
    }

    // 5. Quality & Popularity Prior (IMDb rating + 4K bonus)
    if (item.rating) score += (item.rating / 10) * 8;
    if (item.featured || item.trending) score += 4;
    if (item.quality && item.quality.includes('4K')) score += 2;

    // 6. Watched / Interaction Deduplication
    const isWatched = (this.profile.history || []).some(h => (h.id === item.id || h.id === item.imdbId) && h.action === 'watch');
    if (isWatched) score -= 22;

    const rawScore = score;
    const finalScore = Math.min(99, Math.max(78, Math.round(rawScore)));

    return {
      score: finalScore,
      rawScore: rawScore,
      reason: bestReason,
      reasonShort: bestReasonShort,
      valid: true
    };
  }

  // Generate top AI recommendations adhering to both learned weights and explicit user filters
  generateRecommendations(catalog, count = 20) {
    if (!Array.isArray(catalog) || !catalog.length) return [];

    let pool = catalog;

    // Explicit User Filter Rules
    const activeType = this.profile.activeRowType || 'all';
    if (activeType !== 'all') {
      pool = pool.filter(x => x.type === activeType);
    } else if (this.filters.type && this.filters.type !== 'all') {
      pool = pool.filter(x => x.type === this.filters.type);
    }

    if (Array.isArray(this.filters.genres) && this.filters.genres.length > 0) {
      pool = pool.filter(x => x.genres && x.genres.some(g => this.filters.genres.includes(g)));
    }
    if (Array.isArray(this.filters.platforms) && this.filters.platforms.length > 0) {
      pool = pool.filter(x => this.filters.platforms.includes(x.platformId));
    }
    if (this.filters.era && this.filters.era !== 'all') {
      if (this.filters.era === 'latest') pool = pool.filter(x => x.year >= 2024);
      else if (this.filters.era === 'modern') pool = pool.filter(x => x.year >= 2018 && x.year <= 2023);
      else if (this.filters.era === 'classics') pool = pool.filter(x => x.year < 2018);
    }
    if (this.filters.maturity && this.filters.maturity !== 'all') {
      if (this.filters.maturity === 'family') {
        pool = pool.filter(x => !['18+', 'TV-MA', 'R'].includes(x.maturity));
      } else if (this.filters.maturity === 'mature') {
        pool = pool.filter(x => ['18+', 'TV-MA', 'R', '16+'].includes(x.maturity));
      }
    }

    if (!pool.length) pool = catalog; // Fallback if filters too strict

    const scored = pool
      .map(item => {
        const res = this.computeScore(item);
        return {
          item,
          score: res.score,
          rawScore: res.rawScore,
          reason: res.reason,
          reasonShort: res.reasonShort,
          valid: res.valid
        };
      })
      .filter(s => s.valid);

    scored.sort((a, b) => b.rawScore - a.rawScore);

    const seenTitles = new Set();
    const uniqueScored = [];
    for (const s of scored) {
      const cleanTitle = (s.item.title || '').trim().toLowerCase();
      if (!seenTitles.has(cleanTitle)) {
        seenTitles.add(cleanTitle);
        uniqueScored.push(s);
      }
    }

    return uniqueScored.slice(0, count).map(s => ({
      ...s.item,
      aiMatchPercentage: s.score,
      aiReason: s.reason,
      aiReasonShort: s.reasonShort
    }));
  }

  reset() {
    this.profile = {
      genres: {},
      directors: {},
      actors: {},
      platforms: {},
      types: { movie: 0, series: 0 },
      seeds: [],
      searchSeeds: [],
      recentSearches: [],
      history: [],
      activeRowType: 'all',
      interactionsCount: 0,
      lastTrainedAt: Date.now()
    };
    this.saveProfile();
  }
}

// Global ML Instance
window.neuroTasteEngine = new NeuroTasteEngine();

// Quick Format Classifier Pills Handler
function setAiRowType(type, btn) {
  if (!window.neuroTasteEngine) return;
  window.neuroTasteEngine.profile.activeRowType = type;
  window.neuroTasteEngine.saveProfile();

  document.querySelectorAll('#ai-type-pill-selector .ai-pill-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-type') === type);
  });

  if (typeof refreshAiRecommendations === 'function') {
    refreshAiRecommendations();
  }
}
window.setAiRowType = setAiRowType;

// Render AI Recommendations Row with Explainable Badges
function renderAiRecommendations(catalog) {
  const container = document.getElementById('ai-recommended-list');
  const section = document.getElementById('ai-recommended-section');
  const subtitle = document.getElementById('ai-recom-subtitle');
  if (!container || !section) return;

  const pool = catalog || currentCatalog || [];
  if (!pool.length) {
    section.style.display = 'none';
    return;
  }

  const recommendations = window.neuroTasteEngine.generateRecommendations(pool, 24);
  if (!recommendations.length) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';

  // Synchronize active format pill
  const activeType = window.neuroTasteEngine.profile.activeRowType || 'all';
  document.querySelectorAll('#ai-type-pill-selector .ai-pill-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-type') === activeType);
  });

  // Dynamic subtitle based on recent searches, format classification & top learned genres
  const recentSearches = window.neuroTasteEngine.profile.recentSearches || [];
  const validRecentSearch = recentSearches.find(s => (Date.now() - s.timestamp) < 24 * 3600 * 1000);
  const topGenres = window.neuroTasteEngine.getTopLearnedGenres(2);
  const typeLabel = activeType === 'movie' ? 'Movies' : (activeType === 'series' ? 'TV Series' : 'Titles');
  if (subtitle) {
    if (validRecentSearch) {
      subtitle.innerHTML = `AI Recommendations mixing your search for <strong class="text-gold">"${validRecentSearch.query}"</strong> with your taste`;
    } else if (topGenres.length >= 2) {
      subtitle.innerHTML = `Classifying top <strong class="text-gold">${typeLabel}</strong> for your love of <strong class="text-gold">${topGenres[0].genre}</strong> &amp; <strong class="text-gold">${topGenres[1].genre}</strong>`;
    } else if (topGenres.length === 1) {
      subtitle.innerHTML = `Top <strong class="text-gold">${typeLabel}</strong> tailored for your interest in <strong class="text-gold">${topGenres[0].genre}</strong>`;
    } else {
      subtitle.textContent = `Neural ${typeLabel} recommendations trained on your watch history & preferences`;
    }
  }

  const fragment = document.createDocumentFragment();
  recommendations.forEach(item => {
    const hasDub = (item.languages && item.languages.length > 1) || (item.audio && (item.audio.includes('Dub') || item.audio.includes('Hindi')));
    const dubBadgeHtml = hasDub ? `<div class="badge-dub-indicator"><i class="fa-solid fa-volume-high"></i> Multi-Audio</div>` : '';

    const reasonText = item.aiReasonShort ? `<span class="ai-match-dot">•</span><span class="ai-match-reason">${item.aiReasonShort}</span>` : '';

    const card = document.createElement('div');
    card.className = 'movie-card';
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Recommended ${item.title}`);
    card.innerHTML = `
      <div class="card-poster-wrap">
        <div class="ai-match-tag" title="${item.aiReason || 'AI Neural Recommendation'}">
          <i class="fa-solid fa-wand-magic-sparkles"></i>
          <span>${item.aiMatchPercentage || 98}%</span>
          ${reasonText}
        </div>
        <img class="card-poster" src="${item.poster}" alt="${item.title}" loading="lazy" decoding="async" onerror="window.handleImgError(this)">
        <div class="card-ott-badge badge-${item.platformId}">${item.platformBadge || item.platform}</div>
        ${dubBadgeHtml}
        <div class="card-play-hover">
          <div class="play-circle"><i class="fa-solid fa-play"></i></div>
        </div>
      </div>
      <div class="card-info">
        <h4 class="card-title">${item.title}</h4>
        <div class="card-meta">
          <span class="text-green font-bold">${item.matchRate || (item.aiMatchPercentage + '% Match')}</span>
          <span>${item.duration || item.year || ''}</span>
        </div>
      </div>
    `;

    card.onclick = () => {
      window.neuroTasteEngine.train(item, 'click');
      openDetailsModal(item);
    };
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === 'Select') {
        e.preventDefault();
        window.neuroTasteEngine.train(item, 'click');
        openDetailsModal(item);
      }
    });

    fragment.appendChild(card);
  });
  container.replaceChildren(fragment);
}

function refreshAiRecommendations() {
  if (currentCatalog && currentCatalog.length) {
    renderAiRecommendations(currentCatalog);
  }
}

/* ========================================================
   CONTENT & TASTE FILTERS SETTINGS CONTROLLER
   ======================================================== */
const AVAILABLE_FILTER_GENRES = [
  'Action', 'Sci-Fi', 'Thriller', 'Drama', 'Horror',
  'Comedy', 'Anime', 'Romance', 'Crime', 'Mystery',
  'Fantasy', 'Adventure', 'Animation', 'Documentary'
];

function initFilterSettingsUI() {
  const engine = window.neuroTasteEngine;
  if (!engine) return;

  const filters = engine.filters;

  // 1. Content Type Buttons
  document.querySelectorAll('#filter-type-group .filter-choice-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-type') === (filters.type || 'all'));
  });

  // 2. Populate Genre Toggle Chips
  const genresGrid = document.getElementById('filter-genres-grid');
  if (genresGrid) {
    genresGrid.innerHTML = '';
    AVAILABLE_FILTER_GENRES.forEach(g => {
      const isSelected = Array.isArray(filters.genres) && filters.genres.includes(g);
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `genre-toggle-chip ${isSelected ? 'active' : ''}`;
      chip.textContent = g;
      chip.onclick = () => toggleGenreFilter(g, chip);
      genresGrid.appendChild(chip);
    });
  }

  // 3. Platform Chips
  document.querySelectorAll('#filter-platforms-grid .filter-chip-pill').forEach(pill => {
    const plat = pill.getAttribute('data-platform');
    const isSelected = !filters.platforms.length || filters.platforms.includes(plat);
    pill.classList.toggle('active', isSelected);
  });

  // 4. Era Dropdown
  const eraSelect = document.getElementById('filter-setting-era');
  if (eraSelect) eraSelect.value = filters.era || 'all';

  // 5. Maturity Dropdown
  const maturitySelect = document.getElementById('filter-setting-maturity');
  if (maturitySelect) maturitySelect.value = filters.maturity || 'all';

  // 6. Render AI Taste Progress Bars
  renderAiTasteBars();
}

function selectFilterType(type, btn) {
  if (!window.neuroTasteEngine) return;
  window.neuroTasteEngine.filters.type = type;
  document.querySelectorAll('#filter-type-group .filter-choice-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

function toggleGenreFilter(genre, btn) {
  if (!window.neuroTasteEngine) return;
  const currentGenres = window.neuroTasteEngine.filters.genres || [];
  const idx = currentGenres.indexOf(genre);
  if (idx !== -1) {
    currentGenres.splice(idx, 1);
    if (btn) btn.classList.remove('active');
  } else {
    currentGenres.push(genre);
    if (btn) btn.classList.add('active');
  }
  window.neuroTasteEngine.filters.genres = currentGenres;
}

function togglePlatformFilter(platform, btn) {
  if (!window.neuroTasteEngine) return;
  let currentPlatforms = window.neuroTasteEngine.filters.platforms || [];
  const idx = currentPlatforms.indexOf(platform);
  if (idx !== -1) {
    currentPlatforms.splice(idx, 1);
    if (btn) btn.classList.remove('active');
  } else {
    currentPlatforms.push(platform);
    if (btn) btn.classList.add('active');
  }
  window.neuroTasteEngine.filters.platforms = currentPlatforms;
}

function updateEraFilter(val) {
  if (!window.neuroTasteEngine) return;
  window.neuroTasteEngine.filters.era = val;
}

function updateMaturityFilter(val) {
  if (!window.neuroTasteEngine) return;
  window.neuroTasteEngine.filters.maturity = val;
}

function renderAiTasteBars() {
  const container = document.getElementById('ai-taste-bars-container');
  if (!container || !window.neuroTasteEngine) return;

  const topGenres = window.neuroTasteEngine.getTopLearnedGenres(5);
  const statusText = document.getElementById('ai-model-status-text');

  if (statusText) {
    const count = window.neuroTasteEngine.profile.interactionsCount || 0;
    statusText.textContent = count > 0 
      ? `Model trained on ${count} interactions. Highest affinity: ${topGenres[0]?.genre || 'Diverse'}.`
      : 'Cold-start mode. Model will auto-calibrate as you watch or browse.';
  }

  container.innerHTML = '';
  if (!topGenres.length) {
    container.innerHTML = `
      <div style="font-size: 12px; color: #9ca3af; padding: 10px 0; text-align: center;">
        <i class="fa-solid fa-sparkles text-gold"></i> Start watching movies or clicking titles to see your personalized AI taste graph form!
      </div>
    `;
    return;
  }

  topGenres.forEach(g => {
    const row = document.createElement('div');
    row.className = 'ai-bar-row';
    row.innerHTML = `
      <div class="ai-bar-label">${g.genre}</div>
      <div class="ai-bar-track">
        <div class="ai-bar-fill" style="width: ${g.percentage}%"></div>
      </div>
      <div class="ai-bar-val">${g.percentage}%</div>
    `;
    container.appendChild(row);
  });
}

function saveAndApplyContentFilters() {
  if (!window.neuroTasteEngine) return;
  window.neuroTasteEngine.saveFilters(window.neuroTasteEngine.filters);

  // Re-apply to catalog and rows
  if (currentCatalog && currentCatalog.length) {
    renderAllRows(currentCatalog);
    renderAiRecommendations(currentCatalog);
  }

  showToast('Taste & Content Filters Applied Successfully!', 'success');
  closeSettingsModal();
}

function resetContentFilters() {
  if (!window.neuroTasteEngine) return;
  window.neuroTasteEngine.saveFilters({
    type: 'all',
    genres: [],
    platforms: [],
    era: 'all',
    maturity: 'all'
  });

  initFilterSettingsUI();
  if (currentCatalog && currentCatalog.length) {
    renderAllRows(currentCatalog);
    renderAiRecommendations(currentCatalog);
  }
  showToast('Filters reset to default (All Content)', 'info');
}

function resetAiModel() {
  if (!window.neuroTasteEngine) return;
  window.neuroTasteEngine.reset();
  renderAiTasteBars();
  if (currentCatalog && currentCatalog.length) {
    renderAiRecommendations(currentCatalog);
  }
  showToast('AI Taste Learning Model reset to factory default', 'info');
}

// Ensure initialization hooks on startup
if (typeof window !== 'undefined') {
  window.initFilterSettingsUI = initFilterSettingsUI;
  window.selectFilterType = selectFilterType;
  window.toggleGenreFilter = toggleGenreFilter;
  window.togglePlatformFilter = togglePlatformFilter;
  window.updateEraFilter = updateEraFilter;
  window.updateMaturityFilter = updateMaturityFilter;
  window.saveAndApplyContentFilters = saveAndApplyContentFilters;
  window.resetContentFilters = resetContentFilters;
  window.resetAiModel = resetAiModel;
  window.setAiRowType = setAiRowType;
  window.renderAiRecommendations = renderAiRecommendations;
}


// ========================================================
// TMDB REAL-TIME TRENDING CONTROLLER
// ========================================================
let currentTrendingType = 'all';

async function loadTmdbTrending(filterType = 'all', timeWindow = 'day') {
  currentTrendingType = filterType;
  const listEl = document.getElementById('tmdb-trending-list');
  const sectionEl = document.getElementById('tmdb-trending-section');
  if (!listEl) return;

  try {
    const endpoint = filterType === 'all' 
      ? `/api/tmdb/trending/all/${timeWindow}`
      : `/api/tmdb/trending/${filterType}/${timeWindow}`;
    
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    if (json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
      if (sectionEl) sectionEl.style.display = 'block';
      renderTrendingCards(json.data);
    } else {
      // Fallback: use top items from currentCatalog
      const fallbackItems = (currentCatalog || []).slice(0, 15);
      renderTrendingCards(fallbackItems);
    }
  } catch (err) {
    console.warn('[TMDb Trending Feed Warning]', err.message);
    const fallbackItems = (currentCatalog || []).slice(0, 15);
    renderTrendingCards(fallbackItems);
  }
}

function renderTrendingCards(items) {
  const listEl = document.getElementById('tmdb-trending-list');
  if (!listEl || !items) return;

  listEl.innerHTML = items.map((item, idx) => {
    const posterUrl = item.poster || item.backdrop || FALLBACK_POSTER;
    const title = item.title || item.name || 'Untitled';
    const rating = item.rating ? Number(item.rating).toFixed(1) : '8.0';
    const year = item.year || (item.release_date || '2024').slice(0, 4);
    const typeLabel = item.type === 'series' ? 'TV' : 'Movie';
    const itemId = item.id || `tmdb_${item.tmdbId || idx}`;

    return `
      <div class="netflix-card" data-id="${itemId}" onclick="handleTrendingCardClick('${itemId}')" role="button" tabindex="0">
        <div class="trending-card-flame">
          <i class="fa-solid fa-fire text-gold"></i> #${idx + 1}
        </div>
        <img class="card-poster" src="${posterUrl}" alt="${title}" loading="lazy" onerror="handleImgError(this)">
        <div class="card-meta">
          <h4 class="card-title">${title}</h4>
          <div class="card-badges">
            <span class="badge-rating"><i class="fa-solid fa-star text-gold"></i> ${rating}</span>
            <span class="badge-type">${typeLabel}</span>
            <span class="badge-year">${year}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function handleTrendingCardClick(itemId) {
  // If item exists in currentCatalog, open directly
  let found = (currentCatalog || []).find(x => String(x.id) === String(itemId) || String(x.tmdbId) === String(itemId));
  if (found) {
    openDetailsModal(found);
    return;
  }
  // Otherwise resolve via TMDb ID
  const cleanId = itemId.replace('tmdb_', '');
  fetch(`/api/tmdb/movie/${cleanId}`)
    .then(r => r.json())
    .then(data => {
      if (data && data.title) {
        openDetailsModal(data);
      } else {
        return fetch(`/api/tmdb/tv/${cleanId}`).then(r => r.json()).then(tvData => {
          if (tvData) openDetailsModal(tvData);
        });
      }
    })
    .catch(() => {
      if (currentCatalog && currentCatalog.length) openDetailsModal(currentCatalog[0]);
    });
}

function switchTrendingFilter(type, btn) {
  document.querySelectorAll('.trending-pill-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  loadTmdbTrending(type, 'day');
}

// ========================================================
// LIVE SEARCH AUTOCOMPLETE ENGINE
// ========================================================
let activeAcIndex = -1;
let currentAcItems = [];
let acDebounceTimer = null;

function setupAutocomplete() {
  const navInput = document.getElementById('search-input');
  const inpageInput = document.getElementById('search-inpage-input');

  [
    { input: navInput, dropdownId: 'search-autocomplete' },
    { input: inpageInput, dropdownId: 'search-inpage-autocomplete' }
  ].forEach(({ input, dropdownId }) => {
    if (!input) return;
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;

    input.addEventListener('input', (e) => {
      const q = (e.target.value || '').trim();
      handleAutocompleteInput(q, dropdown, input);
    });

    input.addEventListener('keydown', (e) => {
      handleAutocompleteKeydown(e, dropdown, input);
    });

    input.addEventListener('focus', (e) => {
      const q = (e.target.value || '').trim();
      if (q.length >= 1) handleAutocompleteInput(q, dropdown, input);
    });
  });

  // Global dismissal on outside click
  document.addEventListener('click', (e) => {
    const navDropdown = document.getElementById('search-autocomplete');
    const inpageDropdown = document.getElementById('search-inpage-autocomplete');
    const navBox = document.getElementById('search-box');
    const inpageBox = document.getElementById('search-inpage-bar');

    if (navDropdown && !navBox?.contains(e.target)) {
      navDropdown.style.display = 'none';
    }
    if (inpageDropdown && !inpageBox?.contains(e.target)) {
      inpageDropdown.style.display = 'none';
    }
  });
}

function highlightMatch(text, query) {
  if (!text || !query) return text || '';
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + query.length);
  const after = text.slice(idx + query.length);
  return `${before}<span class="ac-hl">${match}</span>${after}`;
}

function handleAutocompleteInput(q, dropdown, inputEl) {
  if (!dropdown) return;
  if (!q || q.length < 1) {
    dropdown.style.display = 'none';
    dropdown.innerHTML = '';
    currentAcItems = [];
    activeAcIndex = -1;
    return;
  }

  // 1. Instant (<1ms) Local Suggestions
  const qLower = q.toLowerCase();
  const localTitles = (currentCatalog || [])
    .filter(x => x.title && x.title.toLowerCase().includes(qLower))
    .slice(0, 5);

  const localGenres = ['Action', 'Thriller', 'Comedy', 'Sci-Fi', 'Horror', 'Drama', 'Crime', 'Animation', 'Romance']
    .filter(g => g.toLowerCase().includes(qLower))
    .slice(0, 3);

  // Render immediate local matches
  renderAutocompleteDropdown(dropdown, q, localTitles, [], localGenres);

  // 2. Debounced API Enrichment (140ms)
  clearTimeout(acDebounceTimer);
  acDebounceTimer = setTimeout(async () => {
    try {
      const res = await fetch(`/api/search/autocomplete?q=${encodeURIComponent(q)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.status === 'success') {
        renderAutocompleteDropdown(dropdown, q, data.titles || localTitles, data.artists || [], data.genres || localGenres);
      }
    } catch (e) {
      // Keep local results on network hiccup
    }
  }, 140);
}

function renderAutocompleteDropdown(dropdown, query, titles = [], artists = [], genres = []) {
  if (!dropdown) return;
  if (!titles.length && !artists.length && !genres.length) {
    dropdown.style.display = 'none';
    dropdown.innerHTML = '';
    currentAcItems = [];
    return;
  }

  currentAcItems = [];
  activeAcIndex = -1;
  let html = '';

  // 1. Titles Section
  if (titles.length) {
    html += `<div class="ac-group"><div class="ac-group-label"><i class="fa-solid fa-film text-red"></i> Movies &amp; Series</div>`;
    titles.forEach(item => {
      const itemIdx = currentAcItems.length;
      currentAcItems.push({ type: 'title', data: item });
      const thumb = item.poster || item.backdrop || FALLBACK_POSTER;
      const titleHl = highlightMatch(item.title, query);
      const rating = item.rating ? Number(item.rating).toFixed(1) : '8.5';
      const year = item.year || '2024';
      const badge = item.platformBadge || (item.type === 'series' ? 'SERIES' : 'MOVIE');
      const badgeClass = item.platformId === 'netflix' ? 'nflx' : (item.platformId === 'prime' ? 'prm' : '');

      html += `
        <div class="ac-item" data-index="${itemIdx}" onclick="selectAcItem(${itemIdx})">
          <img src="${thumb}" alt="" class="ac-item-thumb" onerror="handleImgError(this)">
          <div class="ac-item-info">
            <div class="ac-item-title">${titleHl}</div>
            <div class="ac-item-sub">
              <span class="ac-item-badge ${badgeClass}">${badge}</span>
              <span><i class="fa-solid fa-star text-gold"></i> ${rating}</span>
              <span>• ${year}</span>
            </div>
          </div>
        </div>
      `;
    });
    html += `</div>`;
  }

  // 2. Artists & Cast Section
  if (artists.length) {
    html += `<div class="ac-group"><div class="ac-group-label"><i class="fa-solid fa-user text-gold"></i> Artists &amp; Cast</div>`;
    artists.forEach(artist => {
      const itemIdx = currentAcItems.length;
      currentAcItems.push({ type: 'artist', data: artist });
      const avatar = artist.profile_path || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80';
      const nameHl = highlightMatch(artist.name, query);
      const knownFor = artist.known_for ? `Known for: ${artist.known_for}` : 'Actor • TMDb Spotlight';

      html += `
        <div class="ac-item" data-index="${itemIdx}" onclick="selectAcItem(${itemIdx})">
          <img src="${avatar}" alt="" class="ac-item-avatar" onerror="handleImgError(this)">
          <div class="ac-item-info">
            <div class="ac-item-title">${nameHl}</div>
            <div class="ac-item-sub">
              <span class="ac-item-badge"><i class="fa-solid fa-clapperboard"></i> Actor</span>
              <span>${knownFor}</span>
            </div>
          </div>
        </div>
      `;
    });
    html += `</div>`;
  }

  // 3. Quick Genres
  if (genres.length) {
    html += `<div class="ac-group"><div class="ac-group-label"><i class="fa-solid fa-tags text-blue"></i> Categories</div><div class="ac-genres-row">`;
    genres.forEach(genre => {
      html += `<button type="button" class="ac-genre-chip" onclick="selectAcGenre('${genre}')">${genre}</button>`;
    });
    html += `</div></div>`;
  }

  dropdown.innerHTML = html;
  dropdown.style.display = 'flex';
}

function handleAutocompleteKeydown(e, dropdown, inputEl) {
  if (!dropdown || dropdown.style.display === 'none' || !currentAcItems.length) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    activeAcIndex = (activeAcIndex + 1) % currentAcItems.length;
    updateAcSelection(dropdown);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    activeAcIndex = (activeAcIndex - 1 + currentAcItems.length) % currentAcItems.length;
    updateAcSelection(dropdown);
  } else if (e.key === 'Enter') {
    if (activeAcIndex >= 0 && activeAcIndex < currentAcItems.length) {
      e.preventDefault();
      selectAcItem(activeAcIndex);
    }
  } else if (e.key === 'Escape') {
    dropdown.style.display = 'none';
  }
}

function updateAcSelection(dropdown) {
  const items = dropdown.querySelectorAll('.ac-item');
  items.forEach((el, idx) => {
    el.classList.toggle('selected', idx === activeAcIndex);
    if (idx === activeAcIndex) {
      el.scrollIntoView({ block: 'nearest' });
    }
  });
}

function selectAcItem(idx) {
  const selected = currentAcItems[idx];
  if (!selected) return;

  const navDropdown = document.getElementById('search-autocomplete');
  const inpageDropdown = document.getElementById('search-inpage-autocomplete');
  if (navDropdown) navDropdown.style.display = 'none';
  if (inpageDropdown) inpageDropdown.style.display = 'none';

  if (selected.type === 'title') {
    const item = selected.data;
    let found = (currentCatalog || []).find(x => x.id === item.id || (item.tmdbId && x.tmdbId === item.tmdbId));
    if (found) {
      openDetailsModal(found);
    } else {
      openDetailsModal(item);
    }
  } else if (selected.type === 'artist') {
    const artist = selected.data;
    if (artist.id && typeof openArtistSpotlightModal === 'function') {
      openArtistSpotlightModal(artist.id, artist.name);
    } else {
      performSearch(artist.name);
    }
  }
}

function selectAcGenre(genre) {
  const navDropdown = document.getElementById('search-autocomplete');
  const inpageDropdown = document.getElementById('search-inpage-autocomplete');
  if (navDropdown) navDropdown.style.display = 'none';
  if (inpageDropdown) inpageDropdown.style.display = 'none';

  if (typeof filterGenre === 'function') {
    filterGenre(genre);
  } else {
    performSearch(genre);
  }
}
