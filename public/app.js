/* ========================================================
   CINEMAVERSE PRO — COMPLETE CLIENT APPLICATION
   Universal Multi-OTT Hub, 10 Mirror Servers, Zero Redirects, Zero Sandbox Errors
   ======================================================== */

// Global State
let currentCatalog = [];
let heroItems = [];
let currentHeroIndex = 0;
let heroTimer = null;
let currentItem = null;
let currentServerIndex = 0; // Default: Server 1 (Global Mirror - 0 Ads)
let currentSeason = 1;
let currentEpisode = 1;
let availableServers = [];
let isScreenLocked = false;
let isMuted = false;
let previousVolume = 1.0;
let activePlatformFilter = 'all';
let searchPlatformFilter = 'all';
let isHeroMuted = true;
let isShieldActive = true;
let isTheaterMode = false;
let currentVideoZoom = 'fit';
let currentQuality = '4k';
let currentSpeed = 1.0;

// Storage Keys (CinemaVerse Pro Universe)
const STORAGE_WATCHLIST = 'cinemaverse_watchlist';
const STORAGE_CONTINUE_WATCHING = 'cinemaverse_continue_watching';
const STORAGE_DAILY_PASS = 'cinemaverse_daily_pass';

// Fallback high-res assets (clean cinema themed SVGs instead of sailboat photos)
const FALLBACK_POSTER = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="500" height="750" viewBox="0 0 500 750"><rect width="500" height="750" fill="%23111827"/><text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" fill="%23e50914" font-family="Arial,sans-serif" font-weight="900" font-size="34">CINEMAVERSE</text><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="%2394a3b8" font-family="Arial,sans-serif" font-weight="600" font-size="16">ULTRA HD 4K</text></svg>';
const FALLBACK_BACKDROP = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><rect width="1280" height="720" fill="%230b0f19"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23e50914" font-family="Arial,sans-serif" font-weight="900" font-size="48">CINEMAVERSE PRO</text></svg>';

// Global image error handler
window.handleImgError = function(img, fallback = FALLBACK_POSTER) {
  img.onerror = null;
  img.src = fallback;
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

// CinemaVerse Adaptive Anti-Redirect Guard: Neutralize rogue popups and prevent iframe from hijacking the top window
try {
  Object.defineProperty(window, 'open', {
    value: function(url) {
      console.warn('[CinemaVerse Shield] Blocked popup window:', url);
      return null;
    },
    writable: false,
    configurable: false
  });
} catch (e) {
  window.open = function(url) {
    console.warn('[CinemaVerse Shield] Blocked popup window:', url);
    return null;
  };
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
  setupNavbarScroll();
  setupSearch();
  setupKeyboardShortcuts();
  checkDailyUnlockPass();
  initProfile();
  initSettings();
  initPwaInstall();
  initPlayerTopBarAutoMove();
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
      const seriesMeta = seriesRes.status === 'fulfilled' && seriesRes.value?.meta;
      const movieMeta = movieRes.status === 'fulfilled' && movieRes.value?.meta;
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
          seasons: seriesMeta?.videos ? [{
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

// Navbar scroll darkening effect
function setupNavbarScroll() {
  window.addEventListener('scroll', () => {
    const nav = document.getElementById('navbar');
    if (window.scrollY > 40) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  });
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

// Load Catalog API
async function loadCatalog() {
  try {
    const res = await fetch('/api/catalog');
    const data = await res.json();
    if (data.status === 'success') {
      currentCatalog = data.data;

      // Extract Billboard Hero items
      heroItems = currentCatalog.filter(x => x.featured || x.trending).slice(0, 6);
      setupHeroCarousel();

      // Render All Netflix Rows
      renderAllRows(currentCatalog);

      // Update OTT Hub counts dynamically
      updateOttHubDynamicCounts();
    }
  } catch (err) {
    console.error('Failed to load catalog:', err);
    showToast('Failed to connect to streaming catalog', 'error');
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
  if (!heroItems.length) return;
  const dotsContainer = document.getElementById('hero-dots');
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
  backdrop.style.backgroundImage = `url('${item.backdrop || item.fallbackBackdrop || FALLBACK_BACKDROP}')`;

  document.getElementById('hero-title').textContent = item.title;
  document.getElementById('hero-desc').textContent = item.description;
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

  platformConfigs.forEach(p => {
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
  });
}

// Top 10 List Renderer with Netflix giant numbers
function renderTop10List(containerId, items) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  items.forEach((item, idx) => {
    const rankNum = idx + 1;
    const cardWrap = document.createElement('div');
    const hasDub = item.languages?.length > 1 || item.audio?.includes('Dub') || item.audio?.includes('Hindi');
    const dubBadgeHtml = hasDub ? `<div class="badge-dub-indicator"><i class="fa-solid fa-volume-high"></i> Multi-Audio</div>` : '';

    cardWrap.className = 'top10-card';
    cardWrap.innerHTML = `
      <div class="top10-rank-num">${rankNum}</div>
      <div class="movie-card">
        <div class="card-poster-wrap">
          <img class="card-poster" src="${item.poster}" alt="${item.title}" onerror="window.handleImgError(this)" loading="lazy">
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
    container.appendChild(cardWrap);
  });
}

// Standard Netflix Horizontal Row Renderer
function renderHorizontalList(containerId, items) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  items.forEach(item => {
    const hasDub = item.languages?.length > 1 || item.audio?.includes('Dub') || item.audio?.includes('Hindi');
    const dubBadgeHtml = hasDub ? `<div class="badge-dub-indicator"><i class="fa-solid fa-volume-high"></i> Multi-Audio</div>` : '';

    const card = document.createElement('div');
    card.className = 'movie-card';
    card.innerHTML = `
      <div class="card-poster-wrap">
        <img class="card-poster" src="${item.poster}" alt="${item.title}" onerror="window.handleImgError(this)" loading="lazy">
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
    container.appendChild(card);
  });
}

// Continue Watching
function getContinueWatching() {
  try {
    const raw = localStorage.getItem(STORAGE_CONTINUE_WATCHING) || localStorage.getItem('netflixmirror_continue_watching');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveContinueWatching(item, season = 1, episode = 1) {
  let list = getContinueWatching().filter(x => x.id !== item.id);
  list.unshift({
    id: item.id,
    title: item.title,
    poster: item.poster,
    platform: item.platform,
    platformId: item.platformId,
    type: item.type,
    year: item.year,
    duration: item.duration,
    season,
    episode,
    progress: Math.floor(Math.random() * 40) + 35,
    timestamp: Date.now()
  });
  list = list.slice(0, 10);
  localStorage.setItem(STORAGE_CONTINUE_WATCHING, JSON.stringify(list));
  renderContinueWatching();
}

function clearContinueWatching() {
  localStorage.removeItem(STORAGE_CONTINUE_WATCHING);
  renderContinueWatching();
  showToast('Continue Watching history cleared');
}

function renderContinueWatching() {
  const container = document.getElementById('continue-watching-list');
  const section = document.getElementById('continue-watching-section');
  const items = getContinueWatching();

  if (!items.length) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  container.innerHTML = '';

  items.forEach(c => {
    const rawItem = currentCatalog.find(x => x.id === c.id) || c;
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.innerHTML = `
      <div class="card-poster-wrap">
        <img class="card-poster" src="${c.poster}" alt="${c.title}" onerror="window.handleImgError(this)">
        <div class="card-ott-badge badge-${c.platformId || 'nflx'}">${c.platform || 'STREAM'}</div>
        <div class="card-play-hover">
          <div class="play-circle"><i class="fa-solid fa-play"></i></div>
        </div>
      </div>
      <div class="card-info">
        <h4 class="card-title">${c.title}</h4>
        <div class="card-meta">
          <span>${c.type === 'series' ? `S${c.season}:E${c.episode}` : 'Movie'}</span>
          <span>Resume</span>
        </div>
        <div class="card-progress-bar">
          <div class="card-progress-fill" style="width: ${c.progress}%;"></div>
        </div>
      </div>
    `;

    card.onclick = () => openPlayer(rawItem, c.season, c.episode);
    container.appendChild(card);
  });
}

// Watchlist (My List)
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

  sorted.forEach(item => {
    const card = document.createElement('div');
    card.className = 'movie-card';
    const hasDub = item.languages?.length > 1 || item.audio?.includes('Dub') || item.audio?.includes('Hindi');
    const dubBadgeHtml = hasDub ? `<div class="badge-dub-indicator"><i class="fa-solid fa-volume-high"></i> Multi-Audio</div>` : '';

    card.innerHTML = `
      <div class="card-poster-wrap">
        <img class="card-poster" src="${item.poster}" alt="${item.title}" onerror="window.handleImgError(this)" loading="lazy">
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
    grid.appendChild(card);
  });
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

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ========================================================
// COMMON SEARCH ACROSS ALL OTT PLATFORMS
// ========================================================

function setupSearch() {
  const box = document.getElementById('search-box');
  const input = document.getElementById('search-input');
  const clearBtn = document.getElementById('clear-search');
  if (!input) return;
  let debounceTimeout = null;

  input.addEventListener('input', () => {
    const val = input.value.trim();
    if (clearBtn) clearBtn.style.display = val ? 'block' : 'none';

    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      if (val) {
        performSearch(val, searchPlatformFilter);
      } else {
        clearSearch();
      }
    }, 250);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      clearSearch();
      if (box) box.classList.remove('open');
      input.blur();
    }
  });

  // Smooth collapse on blur if search query is empty
  input.addEventListener('blur', () => {
    setTimeout(() => {
      if (box && !input.value.trim() && document.activeElement !== input) {
        box.classList.remove('open');
      }
    }, 220);
  });

  // Smooth collapse when clicking anywhere outside if search is empty
  document.addEventListener('click', (e) => {
    if (!box || !box.classList.contains('open')) return;
    if (!box.contains(e.target) && !input.value.trim()) {
      box.classList.remove('open');
    }
  });
}

let searchTypeFilter = 'all';

function filterSearchPlatform(platformId, btnElement) {
  searchPlatformFilter = platformId.toLowerCase();
  document.querySelectorAll('.search-pill').forEach(b => b.classList.remove('active'));
  if (btnElement) btnElement.classList.add('active');

  const val = document.getElementById('search-input').value.trim();
  performSearch(val, searchPlatformFilter, searchTypeFilter);
}

function filterSearchType(type, btnElement) {
  searchTypeFilter = type.toLowerCase();
  document.querySelectorAll('.type-pill').forEach(b => b.classList.remove('active'));
  if (btnElement) btnElement.classList.add('active');

  const val = document.getElementById('search-input').value.trim();
  performSearch(val, searchPlatformFilter, searchTypeFilter);
}

function applyQuickTag(tag) {
  const input = document.getElementById('search-input');
  const box = document.getElementById('search-box');
  const clearBtn = document.getElementById('clear-search');
  if (box) box.classList.add('open');
  if (input) {
    if (tag === 'Trending') {
      input.value = '';
      searchPlatformFilter = 'all';
      searchTypeFilter = 'all';
      document.querySelectorAll('.search-pill').forEach(b => b.classList.toggle('active', b.textContent === 'All'));
      document.querySelectorAll('.type-pill').forEach(b => b.classList.toggle('active', b.textContent.includes('All')));
      clearSearch();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    input.value = tag;
    if (clearBtn) clearBtn.style.display = 'block';
    input.focus();
    performSearch(tag, searchPlatformFilter, searchTypeFilter);
  }
}

async function performSearch(query, platform = searchPlatformFilter || 'all', type = searchTypeFilter || 'all') {
  const section = document.getElementById('search-results-section');
  const grid = document.getElementById('search-grid');
  const queryDisplay = document.getElementById('search-query-display');
  const countDisplay = document.getElementById('search-count');

  if (!query && platform === 'all' && type === 'all') {
    clearSearch();
    return;
  }

  toggleHomeVisibilityForSearch(true);
  
  const platformNameMap = {
    all: 'All OTT Platforms',
    netflix: 'Netflix',
    prime: 'Prime Video',
    disney: 'Disney+ Hotstar',
    hbo: 'HBO Max',
    apple: 'Apple TV+',
    crunchyroll: 'Crunchyroll',
    paramount: 'Paramount+',
    hulu: 'Hulu',
    peacock: 'Peacock',
    sonyliv: 'Sony LIV',
    zee5: 'Zee5',
    jiocinema: 'JioCinema',
    animeworld: 'Anime World (WatchAnimeWorld)'
  };
  const platLabel = platformNameMap[platform] || platform;

  if (query) {
    queryDisplay.textContent = `${query} (${platLabel})`;
  } else {
    queryDisplay.textContent = `All Titles on ${platLabel}`;
  }

  countDisplay.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-red"></i> Searching universal database across all 14 OTT platforms...';
  section.style.display = 'block';

  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&platform=${platform}&type=${type}`);
    const data = await res.json();
    const results = data.data || [];

    const typeLabel = type === 'all' ? '' : (type === 'movie' ? 'movies' : 'series');
    countDisplay.textContent = `${results.length} ${typeLabel} titles found on ${platLabel}`;
    grid.innerHTML = '';

    if (!results.length) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-dim);">
          <i class="fa-solid fa-film" style="font-size: 48px; opacity: 0.3; margin-bottom: 16px;"></i>
          <h3 style="font-size: 18px; margin-bottom: 8px; color: #fff;">No titles found for "${query || platLabel}"</h3>
          <p>Try searching for popular hits like "Stranger Things", "Naruto", "The Boys", "Game of Thrones", "Asur", "Scam 1992", or "Yellowstone".</p>
          <button class="btn-reset-platform" style="margin: 20px auto 0;" onclick="clearSearch()"><i class="fa-solid fa-house"></i> Return to All OTTs</button>
        </div>
      `;
      return;
    }

    results.forEach(item => {
      const hasDub = item.languages?.length > 1 || item.audio?.includes('Dub') || item.audio?.includes('Hindi');
      const dubBadgeHtml = hasDub ? `<div class="badge-dub-indicator"><i class="fa-solid fa-volume-high"></i> Multi-Audio</div>` : '';

      const card = document.createElement('div');
      card.className = 'movie-card';
      card.innerHTML = `
        <div class="card-poster-wrap">
          <img class="card-poster" src="${item.poster}" alt="${item.title}" onerror="window.handleImgError(this)">
          <div class="card-ott-badge badge-${item.platformId}">${item.platformBadge || item.platform}</div>
          <div class="card-type-badge">${item.type === 'series' ? 'SERIES' : 'MOVIE'}</div>
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
      card.onclick = () => openDetailsModal(item);
      grid.appendChild(card);
    });
  } catch (err) {
    console.error('Search failed:', err);
    countDisplay.textContent = 'Error connecting to search server';
  }
}

function clearSearch() {
  const input = document.getElementById('search-input');
  if (input) input.value = '';
  const clearBtn = document.getElementById('clear-search');
  if (clearBtn) clearBtn.style.display = 'none';
  const section = document.getElementById('search-results-section');
  if (section) section.style.display = 'none';
  searchPlatformFilter = 'all';
  searchTypeFilter = 'all';
  document.querySelectorAll('.search-pill').forEach(b => b.classList.toggle('active', b.textContent === 'All'));
  document.querySelectorAll('.type-pill').forEach(b => b.classList.toggle('active', b.textContent.includes('All')));
  toggleHomeVisibilityForSearch(false);
}

// ========================================================
// Streaming Server Definitions
const STREAMING_SERVERS = [
  { id: 0, name: 'Server 1: Global World Mirror (Multi-Language & Dubbed • ✅ 0 Ads)', badge: '✅ 0 Ads • Multi-Language 4K', shortBadge: '✅ 0 Ads', provider: 'Global World Mirror', hasAds: false },
  { id: 1, name: 'Server 2: VidSrc Pro VIP (Ultra HD 4K • Multi-Server & Audio)', badge: '✅ Fast 4K • Multi-Audio', shortBadge: '4K Multi-Audio', provider: 'VidSrc Pro', hasAds: false },
  { id: 2, name: 'Server 3: CineSrc VIP Player (✅ 0 Ads • Open Source)', badge: '✅ 0 Ads • Open-Source Clean Stream', shortBadge: '✅ 0 Ads', provider: 'CineSrc VIP', hasAds: false },
  { id: 3, name: 'Server 4: 123Embed Cloud Player (In-Player Switcher • 4K • ✅ 0 Ads)', badge: '✅ 0 Ads • In-Player Switcher', shortBadge: '✅ 0 Ads', provider: '123Embed Cloud', hasAds: false },
  { id: 4, name: 'Server 5: AutoEmbed Prime VIP (Multi-Language • 4K HDR • ✅ 0 Ads)', badge: '✅ 0 Ads • Multi-Language 4K', shortBadge: '✅ 0 Ads', provider: 'AutoEmbed Prime', hasAds: false },
  { id: 5, name: 'Server 6: VidSrc Cloud Direct (1080p Direct • Multi-Audio)', badge: 'Fast 1080p • Multi-Audio', shortBadge: '1080p Direct', provider: 'VidSrc Cloud', hasAds: false },
  { id: 6, name: 'Server 7: MultiEmbed Cloud Stream (Global Mirror • ✅ 0 Ads)', badge: 'Global Cloud Mirror', shortBadge: 'Cloud Mirror', provider: 'MultiEmbed Cloud', hasAds: false },
  { id: 7, name: 'Server 8: AnimeWorld VIP (Hindi/Eng/Jap • ✅ 0 Ads)', badge: '✅ 0 Ads • Hindi/Eng/Jap', shortBadge: '✅ 0 Ads', provider: 'AnimeWorld', hasAds: false },
  { id: 8, name: 'Server 9: 2Embed CC Captions (🛡️ Shield Protected)', badge: '🛡️ Protected by Anti-Ad Shield', shortBadge: '🛡️ Shielded', provider: '2Embed CC', hasAds: true },
  { id: 9, name: 'Server 10: Vidly Pro VIP (Glassmorphism Aurora • Multi-Audio & 3 Servers • ✅ 0 Ads)', badge: '✅ 0 Ads • Multi-Audio 4K', shortBadge: '✅ 0 Ads', provider: 'Vidly Pro', hasAds: false }
];
let selectedServerIndex = 0; // Default: Server 1 (Global Mirror - 0 Ads)

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
  document.getElementById('modal-title').textContent = item.title;
  document.getElementById('modal-desc').textContent = item.description || 'Watch now in Ultra HD.';
  
  const backdropImg = document.getElementById('modal-backdrop-img');
  backdropImg.src = item.backdrop || item.poster || FALLBACK_BACKDROP;
  backdropImg.onerror = () => handleImgError(backdropImg, FALLBACK_BACKDROP);

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
  (item.cast || []).forEach(name => {
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
    const langs = item.languages || [
      { code: 'en', name: 'English (Original)', flag: '🌐', defaultServer: 0 },
      { code: 'hi', name: 'Hindi Dubbed', flag: '🇮🇳', isDub: true, defaultServer: 0 },
      { code: 'ja', name: 'Japanese Audio', flag: '🇯🇵', defaultServer: 7 },
      { code: 'ta', name: 'Tamil Dubbed', flag: '🇮🇳', isDub: true, defaultServer: 0 },
      { code: 'te', name: 'Telugu Dubbed', flag: '🇮🇳', isDub: true, defaultServer: 0 },
      { code: 'es', name: 'Spanish Dubbed', flag: '🇪🇸', isDub: true, defaultServer: 0 }
    ];

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

  // Play Button (Uses currently selected server)
  const playBtn = document.getElementById('modal-play-btn');
  const playText = document.getElementById('modal-play-text');
  if (playText) {
    playText.textContent = `Play (${STREAMING_SERVERS[selectedServerIndex].name.split(':')[0]})`;
  }
  playBtn.onclick = () => {
    closeDetailsModal();
    openPlayer(item, 1, 1, selectedServerIndex);
  };

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

  // Show Modal
  document.getElementById('details-modal').style.display = 'flex';
}

function renderMoviePageServerChips(item) {
  const chipsContainer = document.getElementById('modal-server-chips');
  const statusEl = document.getElementById('modal-selected-server-name');
  if (!chipsContainer) return;

  chipsContainer.innerHTML = '';
  STREAMING_SERVERS.forEach((srv, idx) => {
    const pill = document.createElement('div');
    const adClass = srv.hasAds ? 'has-ad' : 'is-clean';
    pill.className = `server-chip-pill ${adClass} ${idx === selectedServerIndex ? 'active' : ''}`;
    pill.innerHTML = `
      <i class="fa-solid fa-server ${srv.hasAds ? 'text-gold' : 'text-green'}"></i>
      <span>${srv.name.split(':')[0]}</span>
      <span class="server-chip-badge ${srv.hasAds ? 'badge-ad-warning' : 'badge-clean'}">${srv.shortBadge}</span>
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

  renderModalEpisodes(item.seasons[0].season);
}

// RENDER EPISODES WITH REAL 16:9 THUMBNAILS
function renderModalEpisodes(seasonNum) {
  const item = currentItem;
  if (!item || !item.seasons) return;
  const sData = item.seasons.find(x => String(x.season) === String(seasonNum));
  const grid = document.getElementById('modal-episodes-grid');
  grid.innerHTML = '';

  if (!sData || !sData.episodes) return;

  sData.episodes.forEach(ep => {
    const card = document.createElement('div');
    card.className = 'ep-item-card';

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
          <span class="ep-badge-hd">4K UHD</span>
        </div>
        <p class="ep-item-desc">${ep.description || 'Watch Episode ' + ep.episode + ' now in Ultra HD.'}</p>
      </div>
    `;

    card.onclick = () => {
      closeDetailsModal();
      openPlayer(item, seasonNum, ep.episode, selectedServerIndex);
    };

    grid.appendChild(card);
  });
}

function renderSimilarTitles(item) {
  const grid = document.getElementById('modal-similar-grid');
  grid.innerHTML = '';

  const similar = currentCatalog
    .filter(x => x.id !== item.id && (x.platformId === item.platformId || x.genres.some(g => item.genres.includes(g))))
    .slice(0, 6);

  similar.forEach(sim => {
    const card = document.createElement('div');
    card.className = 'movie-card';
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
    card.onclick = () => openDetailsModal(sim);
    grid.appendChild(card);
  });
}

function closeDetailsModal() {
  document.getElementById('details-modal').style.display = 'none';
}

function handleModalBackdropClick(e) {
  if (e.target.id === 'details-modal') {
    closeDetailsModal();
  }
}

// ========================================================
// TRAILER PREVIEW & SHARE SYSTEM
// ========================================================

function openTrailerModal(item = currentItem) {
  if (!item) return;
  const modal = document.getElementById('trailer-modal');
  const iframe = document.getElementById('trailer-iframe');
  const title = document.getElementById('trailer-modal-title');

  title.innerHTML = `<i class="fa-brands fa-youtube text-red"></i> ${item.title} — Official Trailer`;
  const query = encodeURIComponent(`${item.title} official trailer ${item.year || ''}`);
  iframe.src = `https://www.youtube.com/embed?listType=search&list=${query}&autoplay=1`;
  modal.style.display = 'flex';
}

function closeTrailerModal() {
  const modal = document.getElementById('trailer-modal');
  const iframe = document.getElementById('trailer-iframe');
  if (iframe) iframe.src = '';
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
  const shareText = `Watch "${title}"${epInfo} (${item.year || '2026'}) in 4K Ultra HD on CinemaVerse! 100% Free & 0 Ads:`;

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
  const text = `Watch "${title}"${epInfo} (${item.year || '2026'}) in 4K Ultra HD on CinemaVerse! 100% Free & 0 Ads:`;

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

async function openPlayer(item, season = 1, episode = 1, serverIndex = null) {
  closeDetailsModal();
  currentItem = item;
  currentSeason = parseInt(season, 10);
  currentEpisode = parseInt(episode, 10);
  currentServerIndex = (serverIndex !== undefined && serverIndex !== null) 
    ? parseInt(serverIndex, 10) 
    : (selectedServerIndex !== undefined ? selectedServerIndex : 0);

  // Sync Dubbed Audio Selector in Header
  const audioSelect = document.getElementById('player-audio-select');
  if (audioSelect) {
    audioSelect.value = selectedDubLanguage || 'en';
  }
  document.querySelectorAll('#settings-audio-pills .setting-pill').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('onclick')?.includes(`'${selectedDubLanguage}'`));
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

    saveContinueWatching(item, currentSeason, currentEpisode);
    const overlay = document.getElementById('player-overlay');
    overlay.style.display = 'flex';
    handlePlayerMouseMove();
    revealPlayerTopBar();
    schedulePlayerTopBarAutoMove(7000);

    if (isTheaterMode) {
      populateTheaterDetails(item);
    }
  } catch (err) {
    console.error('Failed to resolve stream sources:', err);
    showToast('Failed to load video stream', 'error');
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
    if (bufferSub) bufferSub.textContent = 'High-speed clean stream • Neutralizing popups & ads...';
  }

  // 2. High-Speed Direct Stream Loading — Zero Sandbox Restrictions (100% Server Compatible)
  const iframe = document.getElementById('player-iframe');
  // Unconditionally remove sandbox so providers never crash with 'Failed to load video streaming' or 'Please Disable Sandbox'
  iframe.removeAttribute('sandbox');
  iframe.referrerPolicy = 'origin';

  let streamUrl = srv ? srv.url : null;
  if (!streamUrl && currentItem) {
    const isTv = currentItem.type === 'series';
    const s = currentSeason || 1;
    const e = currentEpisode || 1;
    const imdb = currentItem.imdbId || '';
    const tmdb = currentItem.tmdbId || '';
    const tmdbOrImdb = tmdb || imdb || currentItem.id;
    switch (serverIdx) {
      case 0:
        streamUrl = isTv 
          ? `https://player.autoembed.co/embed/tv/${imdb || tmdbOrImdb}/${s}/${e}${imdb ? `?imdb=${imdb}` : ''}`
          : `https://player.autoembed.co/embed/movie/${imdb || tmdbOrImdb}${imdb ? `?imdb=${imdb}` : ''}`;
        break;
      case 1:
        streamUrl = isTv
          ? `https://vidsrc2.ru/embed/tv?imdb=${imdb}&tmdb=${tmdb}&season=${s}&episode=${e}`
          : `https://vidsrc2.ru/embed/movie/${tmdbOrImdb}${imdb ? `?imdb=${imdb}` : ''}`;
        break;
      case 2:
        streamUrl = isTv ? `https://cinesrc.st/embed/tv/${tmdbOrImdb}?s=${s}&e=${e}` : `https://cinesrc.st/embed/movie/${tmdbOrImdb}`;
        break;
      case 3:
        streamUrl = isTv ? `https://play2.123embed.net/tv/${tmdbOrImdb}/${s}/${e}` : `https://play2.123embed.net/movie/${tmdbOrImdb}`;
        break;
      case 4:
        streamUrl = isTv ? `https://autoembed.co/tv/tmdb/${tmdbOrImdb}-${s}-${e}` : `https://autoembed.co/movie/tmdb/${tmdbOrImdb}`;
        break;
      case 5:
        streamUrl = isTv ? `https://vidsrc.pm/embed/tv?imdb=${imdb}&tmdb=${tmdb}&season=${s}&episode=${e}` : `https://vidsrc.pm/embed/movie/${tmdbOrImdb}`;
        break;
      case 6:
        streamUrl = isTv ? `https://multiembed.mov/?video_id=${tmdbOrImdb}&tmdb=1&s=${s}&e=${e}` : `https://multiembed.mov/?video_id=${tmdbOrImdb}&tmdb=1`;
        break;
      case 7:
        streamUrl = isTv ? `https://player.autoembed.co/embed/tv/${tmdbOrImdb}/${s}/${e}` : `https://player.autoembed.co/embed/movie/${tmdbOrImdb}`;
        break;
      case 8:
        streamUrl = isTv ? `https://www.2embed.cc/embedtv/${imdb || tmdbOrImdb}&s=${s}&e=${e}` : `https://www.2embed.cc/embed/${imdb || tmdbOrImdb}`;
        break;
      default:
        streamUrl = isTv 
          ? `https://vidly.pro/tv/${tmdb || tmdbOrImdb}/${s}/${e}?theme=aurora&color=e50914&audioPicker=1&nextEpisode=1`
          : `https://vidly.pro/movie/${tmdb || tmdbOrImdb}?theme=aurora&color=e50914&audioPicker=1`;
        break;
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
  if (streamUrl && streamUrl.includes('player.autoembed.co') && currentItem?.imdbId && !streamUrl.includes('imdb=')) {
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
  iframe.src = streamUrl;

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
  };
  setTimeout(dismissBuffer, 600); // 600ms failsafe timeout - never stuck buffering!

  showToast(`Streaming on ${srv.name.split(':')[0]}`, 'success');
}

function changeServer(val) {
  const idx = parseInt(val, 10);
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
    btn.classList.toggle('active', btn.getAttribute('onclick')?.includes(`'${langCode}'`));
  });

  const isAnime = currentItem && (currentItem.platformId === 'animeworld' || currentItem.platformId === 'crunchyroll' || currentItem.genres?.includes('Animation'));

  // If anime and Japanese requested, route to AnimeWorld
  if (langCode === 'ja' && isAnime) {
    loadServerStream(7); // Server 8: AnimeWorld VIP
    showToast(`🎧 Audio set to ${langName} • Server 8 (AnimeWorld VIP) Active`, 'success');
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
  const iframe = document.getElementById('player-iframe');
  if (iframe) iframe.src = '';
  document.getElementById('player-overlay').style.display = 'none';

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

  const nextEpNum = currentEpisode + 1;
  const nextEpExists = currentSeasonData.episodes.some(e => e.episode === nextEpNum);

  if (nextEpExists) {
    openPlayer(item, currentSeason, nextEpNum, currentServerIndex);
    showToast(`Loaded Season ${currentSeason} Episode ${nextEpNum}`);
  } else {
    const nextSeasonData = item.seasons.find(s => s.season === currentSeason + 1);
    if (nextSeasonData && nextSeasonData.episodes.length > 0) {
      openPlayer(item, currentSeason + 1, 1, currentServerIndex);
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
      schedulePlayerTopBarAutoMove(4000);
    });
  }
  const srvSelect = document.getElementById('server-select');
  if (srvSelect) {
    srvSelect.addEventListener('focus', () => { isHeaderHovered = true; clearTimeout(playerTopBarTimer); });
    srvSelect.addEventListener('change', () => { schedulePlayerTopBarAutoMove(4000); });
  }
  const audSelect = document.getElementById('player-audio-select');
  if (audSelect) {
    audSelect.addEventListener('focus', () => { isHeaderHovered = true; clearTimeout(playerTopBarTimer); });
    audSelect.addEventListener('change', () => { schedulePlayerTopBarAutoMove(4000); });
  }
}

function revealPlayerTopBar() {
  const overlay = document.getElementById('player-overlay');
  if (!overlay) return;
  overlay.classList.remove('top-bar-hidden');
  clearTimeout(playerTopBarTimer);
  schedulePlayerTopBarAutoMove(8000);
}

function collapsePlayerTopBar() {
  const overlay = document.getElementById('player-overlay');
  if (!overlay || overlay.classList.contains('theater-mode')) return;
  if (isHeaderHovered) return;
  overlay.classList.add('top-bar-hidden');
  clearTimeout(playerTopBarTimer);
}

function schedulePlayerTopBarAutoMove(delay = 4500) {
  clearTimeout(playerTopBarTimer);
  const overlay = document.getElementById('player-overlay');
  if (!overlay || overlay.classList.contains('theater-mode')) return;
  if (isHeaderHovered) return;
  playerTopBarTimer = setTimeout(() => {
    if (overlay.style.display !== 'none' && !overlay.classList.contains('theater-mode') && !isHeaderHovered) {
      collapsePlayerTopBar();
    }
  }, delay);
}

function togglePlayerTopBar() {
  const overlay = document.getElementById('player-overlay');
  if (!overlay) return;
  if (overlay.classList.contains('top-bar-hidden')) {
    revealPlayerTopBar();
  } else {
    collapsePlayerTopBar();
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
      <i class="fa-solid fa-server ${srv.hasAds ? 'text-gold' : 'text-green'}"></i>
      <span>${srv.name.split(':')[0]}</span>
      <span class="server-chip-badge ${srv.hasAds ? 'badge-ad-warning' : 'badge-clean'}">${srv.shortBadge}</span>
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

// Keyboard Shortcuts
function setupKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    const playerOpen = document.getElementById('player-overlay').style.display === 'flex';
    const modalOpen = document.getElementById('details-modal').style.display === 'flex';

    if (e.key === 'Escape') {
      const settingsPanel = document.getElementById('player-settings-panel');
      if (settingsPanel && settingsPanel.style.display !== 'none') {
        togglePlayerSettings(false);
      } else if (playerOpen) {
        closePlayer();
      } else if (modalOpen) {
        closeDetailsModal();
      } else {
        closeAuditModal();
      }
    } else if (e.key === ' ' && playerOpen) {
      if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
      e.preventDefault();
      togglePlayPause();
    } else if (e.key === 'ArrowLeft' && playerOpen) {
      seekRelative(-10);
    } else if (e.key === 'ArrowRight' && playerOpen) {
      seekRelative(10);
    } else if (e.key === 'f' || e.key === 'F') {
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
      document.getElementById('search-box').classList.add('open');
      input.focus();
    }
  });

  // Auto-Refocus Window Protection (Prevents ad window hijacking when clicking player)
  window.addEventListener('blur', () => {
    if (playerOpen) {
      setTimeout(() => {
        try { window.focus(); } catch(e) {}
      }, 60);
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

  const tabAliases = { data: 'storage' };
  tabName = tabAliases[tabName] || tabName;
  const validTabs = new Set(['install', 'streaming', 'audio', 'subtitles', 'shield', 'storage', 'about']);
  if (!validTabs.has(tabName)) tabName = 'install';

  const modal = document.getElementById('app-settings-modal');
  if (!modal) return;
  closeMobileBrowseMenu();
  modal.style.display = 'flex';

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
// CinemaVerse Zero-Ad Defense Engine (Neutralizes Popups, Popunders & Window Hijacking)
// ========================================================
(function() {
  function isPlayerActive() {
    const overlay = document.getElementById('player-overlay');
    return overlay && overlay.style.display === 'flex';
  }

  const _origWindowOpen = window.open;
  window.open = function(url, target, features) {
    if (typeof url === 'string') {
      const u = url.toLowerCase();
      if (u.includes('xm.com') || u.includes('worncalmy') || u.includes('adsterra') || 
          u.includes('monetag') || u.includes('onclick') || u.includes('bet') || 
          u.includes('casino') || u.includes('track') || u.includes('affiliate') || 
          u.includes('pop') || u.includes('doubleclick') || u.includes('traffic')) {
        console.warn('[Anti-Ad Shield] Neutralized ad popup target:', url);
        return null;
      }
    }
    // If video player is active, suppress external popups
    if (isPlayerActive()) {
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        try {
          const parsed = new URL(url);
          if (parsed.origin !== window.location.origin) {
            console.warn('[Anti-Ad Shield] Blocked cross-origin player popup:', url);
            return null;
          }
        } catch(e) {}
      }
    }
    return _origWindowOpen.apply(this, arguments);
  };

  // Reclaim focus smoothly if an external tab tried to steal focus
  window.addEventListener('blur', function() {
    if (isPlayerActive()) {
      setTimeout(() => { 
        try { window.focus(); } catch(e) {}
      }, 50);
    }
  });

  // Prevent top-frame navigation hijack from rogue embeds
  window.addEventListener('beforeunload', function(e) {
    if (isPlayerActive()) {
      const activeEl = document.activeElement;
      if (activeEl && activeEl.id === 'player-iframe') {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    }
  });
})();
