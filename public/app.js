/* ========================================================
   NETFLIX MIRROR PRO — COMPLETE CLIENT APPLICATION
   Multi-OTT Hub, 8 Mirror Servers, Zero Redirects, Zero Sandbox Errors
   ======================================================== */

// Global State
let currentCatalog = [];
let heroItems = [];
let currentHeroIndex = 0;
let heroTimer = null;
let currentItem = null;
let currentServerIndex = 3; // Default: Server 4 (Global Mirror)
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

// Storage Keys
const STORAGE_WATCHLIST = 'netflixmirror_watchlist';
const STORAGE_CONTINUE_WATCHING = 'netflixmirror_continue_watching';
const STORAGE_DAILY_PASS = 'netflixmirror_daily_pass';

// Fallback high-res assets (clean cinema themed SVGs instead of sailboat photos)
const FALLBACK_POSTER = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="500" height="750" viewBox="0 0 500 750"><rect width="500" height="750" fill="%23111827"/><text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" fill="%23e50914" font-family="Arial,sans-serif" font-weight="900" font-size="34">NETFLIX</text><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="%2394a3b8" font-family="Arial,sans-serif" font-weight="600" font-size="16">ULTRA HD 4K</text></svg>';
const FALLBACK_BACKDROP = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><rect width="1280" height="720" fill="%230b0f19"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23e50914" font-family="Arial,sans-serif" font-weight="900" font-size="48">NETFLIX PRO</text></svg>';

// Global image error handler
window.handleImgError = function(img, fallback = FALLBACK_POSTER) {
  img.onerror = null;
  img.src = fallback;
};

// NetMirror REA Anti-Redirect Guard: Neutralize rogue popups and prevent iframe from hijacking the top window
try {
  Object.defineProperty(window, 'open', {
    value: function(url) {
      console.warn('[CinemaMirror Shield] Blocked popup window:', url);
      return null;
    },
    writable: false,
    configurable: false
  });
} catch (e) {
  window.open = function(url) {
    console.warn('[CinemaMirror Shield] Blocked popup window:', url);
    return null;
  };
}

// Block rogue synthetic link clicks targeting external ad pages
document.addEventListener('click', function(e) {
  let target = e.target;
  while (target && target !== document.body && target !== document.documentElement) {
    if (target.tagName === 'A' && (target.target === '_blank' || target.target === '_new')) {
      const href = target.getAttribute('href') || target.href || '';
      if (href && (href.startsWith('http://') || href.startsWith('https://')) && !href.includes(window.location.hostname)) {
        e.preventDefault();
        e.stopPropagation();
        console.warn('[CinemaMirror Shield] Blocked external ad link click:', href);
        return false;
      }
    }
    target = target.parentElement;
  }
}, true);

// NetMirror Navigation Hijack Guard: Keep top window safely rooted in CinemaMirror
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

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  setupNavbarScroll();
  setupSearch();
  setupKeyboardShortcuts();
  checkDailyUnlockPass();
  initProfile();
  initSettings();
  initPwaInstall();
  await loadCatalog();
  renderContinueWatching();
  renderNotifications();
});

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
  box.classList.toggle('open');
  if (box.classList.contains('open')) {
    input.focus();
  }
}

// Multi-OTT Hub Toggle / Scroll
function toggleOttHub() {
  const hub = document.getElementById('ott-hub-wrapper');
  hub.scrollIntoView({ behavior: 'smooth', block: 'center' });
  hub.style.animation = 'pulse 1s ease';
  setTimeout(() => hub.style.animation = '', 1000);
}

// Reset view to Home
function resetToHome() {
  filterPlatform('all');
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
    }
  } catch (err) {
    console.error('Failed to load catalog:', err);
    showToast('Failed to connect to streaming catalog', 'error');
  }
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
  activePlatformFilter = platformId.toLowerCase();

  document.querySelectorAll('.ott-card').forEach(c => c.classList.remove('active'));
  if (element) {
    element.classList.add('active');
  } else {
    const match = document.querySelector(`.ott-card.ott-${platformId}`) || document.querySelector('.ott-card');
    if (match) match.classList.add('active');
  }

  const bannerSec = document.getElementById('platform-banner-section');
  const bannerTitle = document.getElementById('platform-banner-title');
  const bannerDesc = document.getElementById('platform-banner-desc');
  const bannerEl = document.getElementById('platform-banner');

  if (activePlatformFilter === 'all') {
    if (bannerSec) bannerSec.style.display = 'none';
    showAllSections();
  } else {
    if (bannerSec) bannerSec.style.display = 'block';

    const platformNames = {
      netflix: { title: 'Netflix Originals & Worldwide Blockbusters', desc: 'Stream award-winning Netflix original series, top movies and animated hits in 4K.', color: '#e50914' },
      prime: { title: 'Amazon Prime Video Exclusives', desc: 'Binge-worthy Prime originals, blockbuster cinema and critically acclaimed shows.', color: '#00a8e1' },
      disney: { title: 'Disney+ Hotstar Vault', desc: 'The complete home of Marvel Studios, Star Wars, Pixar and Disney theatrical releases.', color: '#113ccf' },
      hbo: { title: 'HBO Max Prestige Television & Warner Bros', desc: 'Legendary HBO series, epic sagas and Warner Bros cinematic blockbusters.', color: '#9933ff' },
      apple: { title: 'Apple TV+ Original Masterpieces', desc: 'Visionary, star-studded Apple Original series and movies streaming in crisp 4K.', color: '#ffffff' },
      crunchyroll: { title: 'Anime Hub / Crunchyroll Exclusives', desc: 'Top trending shonen anime, dark fantasy series and legendary Japanese animation.', color: '#f47521' },
      paramount: { title: 'Paramount+ Blockbusters & Showtime', desc: 'Action-packed Hollywood cinema, top naval adventures and Paramount originals.', color: '#0064ff' },
      hulu: { title: 'Hulu Originals & FX Award-Winners', desc: 'Acclaimed television, Emmy-winning drama and hit exclusive comedy series.', color: '#1ce783' },
      peacock: { title: 'Peacock Exclusives & NBCUniversal Hits', desc: 'Stream iconic comedy series, fresh hit thrillers and Universal theatrical releases.', color: '#f7a800' },
      sonyliv: { title: 'Sony LIV Premium Indian Originals', desc: 'Critically acclaimed Indian biographical series, gripping thrillers and premium cinema.', color: '#ff334b' },
      zee5: { title: 'Zee5 Regional Cinema & Blockbusters', desc: 'Massive regional Indian hits, poignant historical epics and bingeable Hindi series.', color: '#a855f7' },
      jiocinema: { title: 'JioCinema Direct Premieres & Bollywood', desc: 'Direct-to-digital Indian blockbusters, psychological thrillers and HBO prestige content.', color: '#e11d48' },
      animeworld: { title: 'WatchAnimeWorld VIP Multi-Audio Hub', desc: 'High-speed anime streaming featuring Hindi Dubs, English Sub/Dub and original Japanese audio.', color: '#f59e0b' }
    };

    const info = platformNames[activePlatformFilter] || { title: `${platformId.toUpperCase()} Vault`, desc: 'Showing titles from this OTT platform', color: '#e50914' };
    if (bannerTitle) bannerTitle.textContent = info.title;
    if (bannerDesc) bannerDesc.textContent = info.desc;
    if (bannerEl) bannerEl.style.borderColor = `${info.color}88`;

    focusPlatformRow(activePlatformFilter);
  }
}

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

function renderAllRows(items) {
  // 1. Top 10 Movies Today (Netflix giant number outlines)
  const top10Movies = items.filter(x => x.type === 'movie' && x.rank).sort((a, b) => a.rank - b.rank).slice(0, 10);
  renderTop10List('top10-movies-list', top10Movies);

  // 2. Top 10 TV Shows Today (Netflix giant number outlines)
  const top10Series = items.filter(x => x.type === 'series' && x.rank).sort((a, b) => a.rank - b.rank).slice(0, 10);
  renderTop10List('top10-series-list', top10Series);

  // 3. Dedicated OTT Platform Rows for All 13 Platforms
  renderHorizontalList('netflix-list', items.filter(x => x.platformId === 'netflix'));
  renderHorizontalList('prime-list', items.filter(x => x.platformId === 'prime'));
  renderHorizontalList('disney-list', items.filter(x => x.platformId === 'disney'));
  renderHorizontalList('hbo-list', items.filter(x => x.platformId === 'hbo'));
  renderHorizontalList('apple-list', items.filter(x => x.platformId === 'apple'));
  renderHorizontalList('crunchyroll-list', items.filter(x => x.platformId === 'crunchyroll'));
  renderHorizontalList('paramount-list', items.filter(x => x.platformId === 'paramount'));
  renderHorizontalList('hulu-list', items.filter(x => x.platformId === 'hulu'));
  renderHorizontalList('peacock-list', items.filter(x => x.platformId === 'peacock'));
  renderHorizontalList('sonyliv-list', items.filter(x => x.platformId === 'sonyliv'));
  renderHorizontalList('zee5-list', items.filter(x => x.platformId === 'zee5'));
  renderHorizontalList('jiocinema-list', items.filter(x => x.platformId === 'jiocinema'));
  renderHorizontalList('animeworld-list', items.filter(x => x.platformId === 'animeworld'));
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
          <img class="card-poster" src="${item.poster}" alt="${item.title}" onerror="handleImgError(this)" loading="lazy">
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
        <img class="card-poster" src="${item.poster}" alt="${item.title}" onerror="handleImgError(this)" loading="lazy">
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
    return JSON.parse(localStorage.getItem(STORAGE_CONTINUE_WATCHING)) || [];
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
        <img class="card-poster" src="${c.poster}" alt="${c.title}" onerror="handleImgError(this)">
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
    return JSON.parse(localStorage.getItem(STORAGE_WATCHLIST)) || [];
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
  document.querySelectorAll('.nav-item').forEach(l => l.classList.remove('active'));
  if (element) element.classList.add('active');

  const section = document.getElementById('watchlist-section');
  const grid = document.getElementById('watchlist-grid');
  const count = document.getElementById('watchlist-count');
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
          <img class="card-poster" src="${item.poster}" alt="${item.title}" onerror="handleImgError(this)">
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

// Category Filtering
function filterCategory(type, element) {
  document.querySelectorAll('.nav-item').forEach(l => l.classList.remove('active'));
  if (element) element.classList.add('active');

  document.getElementById('watchlist-section').style.display = 'none';
  document.getElementById('search-results-section').style.display = 'none';
  document.getElementById('hero-banner').style.display = 'flex';

  const sTop10M = document.getElementById('section-top10-movies');
  const sTop10S = document.getElementById('section-top10-series');
  const sNflx = document.getElementById('section-netflix');
  const sPrm = document.getElementById('section-prime');
  const sDis = document.getElementById('section-disney');
  const sHbo = document.getElementById('section-hbo');
  const sApp = document.getElementById('section-apple');
  const sCr = document.getElementById('section-crunchyroll');

  if (type === 'all') {
    showAllSections();
  } else if (type === 'movie') {
    sTop10M.style.display = 'block';
    sTop10S.style.display = 'none';
    sNflx.style.display = 'block';
    sPrm.style.display = 'block';
    sDis.style.display = 'block';
    sHbo.style.display = 'block';
    sApp.style.display = 'none';
    sCr.style.display = 'none';
  } else if (type === 'series') {
    sTop10M.style.display = 'none';
    sTop10S.style.display = 'block';
    sNflx.style.display = 'block';
    sPrm.style.display = 'block';
    sDis.style.display = 'block';
    sHbo.style.display = 'block';
    sApp.style.display = 'block';
    sCr.style.display = 'block';
  } else if (type === 'top10') {
    sTop10M.style.display = 'block';
    sTop10S.style.display = 'block';
    sNflx.style.display = 'none';
    sPrm.style.display = 'none';
    sDis.style.display = 'none';
    sHbo.style.display = 'none';
    sApp.style.display = 'none';
    sCr.style.display = 'none';
  }
}

function toggleHomeVisibilityForSearch(isSearching) {
  const hero = document.getElementById('hero-banner');
  const hub = document.getElementById('ott-hub-wrapper');
  const pb = document.getElementById('platform-banner-section');
  const cw = document.getElementById('continue-watching-section');
  const rows = document.querySelectorAll('.netflix-row-wrap');
  const watchlist = document.getElementById('watchlist-section');

  if (isSearching) {
    if (hero) hero.style.display = 'none';
    if (hub) hub.style.display = 'none';
    if (pb) pb.style.display = 'none';
    if (cw) cw.style.display = 'none';
    if (watchlist) watchlist.style.display = 'none';
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
        <img class="card-poster" src="${item.poster}" alt="${item.title}" onerror="handleImgError(this)">
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
  const input = document.getElementById('search-input');
  const clearBtn = document.getElementById('clear-search');
  let debounceTimeout = null;

  input.addEventListener('input', () => {
    const val = input.value.trim();
    clearBtn.style.display = val ? 'block' : 'none';

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
      input.blur();
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
          <img class="card-poster" src="${item.poster}" alt="${item.title}" onerror="handleImgError(this)">
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
  { id: 0, name: 'Server 1: VidLink Pro HD', badge: 'Fastest • 0 Ads • Multi-Audio 4K', provider: 'VidLink Pro' },
  { id: 1, name: 'Server 2: VidSrc PM 4K', badge: 'Direct 4K UHD', provider: 'VidSrc PM' },
  { id: 2, name: 'Server 3: AutoEmbed CC Clean', badge: 'Auto Dub • 0 Ads', provider: 'AutoEmbed Direct' },
  { id: 3, name: 'Server 4: Global Mirror', badge: 'Multi-Language • 0 Ads', provider: 'Global Mirror' },
  { id: 4, name: 'Server 5: 2Embed CC Captions', badge: 'Multi-Language CC', provider: '2Embed CC' },
  { id: 5, name: 'Server 6: FilmU VIP Cloud Mirror', badge: 'Fast Cloud • 0 Ads', provider: 'FilmU VIP' },
  { id: 6, name: 'Server 7: VidSrc Buzz Clean Direct', badge: 'Fast HD 1080p • 0 Ads', provider: 'VidSrc Buzz' },
  { id: 7, name: 'Server 8: AutoEmbed Direct Mirror', badge: 'Global Mirror • 0 Ads', provider: 'AutoEmbed Direct' },
  { id: 8, name: 'Server 9: AnimeWorld VIP', badge: 'Multi-Audio: Hindi/Eng/Jap • 0 Ads', provider: 'AnimeWorld' },
  { id: 9, name: 'Server 10: VidLink Pro Clean Alternative', badge: 'Clean 4K Ultra HD • 0 Ads', provider: 'VidLink Alt' }
];
let selectedServerIndex = 3; // Default: Server 4 (Global Mirror)

// ========================================================
// NETFLIX DETAILS MODAL (MOVIE PAGE)
// ========================================================

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
      { code: 'hi', name: 'Hindi Dubbed', flag: '🇮🇳', isDub: true, defaultServer: 2 },
      { code: 'ja', name: 'Japanese Audio', flag: '🇯🇵', defaultServer: 8 },
      { code: 'ta', name: 'Tamil Dubbed', flag: '🇮🇳', isDub: true, defaultServer: 2 },
      { code: 'te', name: 'Telugu Dubbed', flag: '🇮🇳', isDub: true, defaultServer: 2 },
      { code: 'es', name: 'Spanish Dubbed', flag: '🇪🇸', isDub: true, defaultServer: 5 }
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
        
        // Auto pre-select multi-audio server if dubbed
        if (l.defaultServer !== undefined) {
          selectedServerIndex = l.defaultServer;
          updateSelectedServerUI();
        }
        showToast(`🎧 Selected ${l.name} for playback`, 'info');
      };
      langContainer.appendChild(chip);
    });

    const activeMatch = langs.find(l => l.code === selectedDubLanguage) || langs[0];
    if (langStatus) langStatus.textContent = activeMatch ? activeMatch.name : 'English (Original)';
  }

  // Render 8 Streaming Server Chips on Movie Page
  renderMoviePageServerChips(item);

  // Play Button (Uses currently selected server)
  const playBtn = document.getElementById('modal-play-btn');
  const playText = document.getElementById('modal-play-text');
  if (playText) {
    playText.textContent = `Play (${STREAMING_SERVERS[selectedServerIndex].name.split(':')[0]})`;
  }
  playBtn.onclick = () => {
    closeDetailsModal();
    // Auto-select multi-audio server if preferred
    let srvIdx = selectedServerIndex;
    const isAnime = item.platformId === 'animeworld' || item.platformId === 'crunchyroll' || item.genres?.includes('Animation');
    if (selectedDubLanguage === 'hi') {
      srvIdx = isAnime ? 8 : 2;
    } else if (selectedDubLanguage === 'ja' && isAnime) {
      srvIdx = 8;
    } else if (selectedDubLanguage === 'ta' || selectedDubLanguage === 'te') {
      srvIdx = 2;
    }
    openPlayer(item, 1, 1, srvIdx);
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
    pill.className = `server-chip-pill ${idx === selectedServerIndex ? 'active' : ''}`;
    pill.innerHTML = `
      <i class="fa-solid fa-server text-red"></i>
      <span>${srv.name.split(':')[0]}</span>
      <span class="server-chip-badge">${srv.badge.split('•')[0].trim()}</span>
    `;
    pill.onclick = () => {
      selectedServerIndex = idx;
      document.querySelectorAll('.server-chip-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      if (statusEl) statusEl.textContent = `${srv.name} (${srv.badge})`;
      const playText = document.getElementById('modal-play-text');
      if (playText) playText.textContent = `Play (${srv.name.split(':')[0]})`;
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
        <img class="card-poster" src="${sim.poster}" alt="${sim.title}" onerror="handleImgError(this)">
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

function shareMovie(item = currentItem) {
  if (!item) return;
  const url = `${window.location.origin}/#${item.id}`;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => {
      showToast(`Link for "${item.title}" copied to clipboard!`, 'success');
    }).catch(() => {
      showToast(`Sharing "${item.title}"`, 'info');
    });
  } else {
    showToast(`Sharing "${item.title}"`, 'info');
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

async function openPlayer(item, season = 1, episode = 1, serverIndex = 3) {
  closeDetailsModal();
  currentItem = item;
  currentSeason = parseInt(season, 10);
  currentEpisode = parseInt(episode, 10);
  currentServerIndex = (serverIndex !== undefined && serverIndex !== null) ? parseInt(serverIndex, 10) : (selectedServerIndex !== undefined ? selectedServerIndex : 3);

  // Auto-route to multi-audio server (Server 4: Global Mirror) if dubbed language is preferred
  const isAnime = item.platformId === 'animeworld' || item.platformId === 'crunchyroll' || item.genres?.includes('Animation');
  if (selectedDubLanguage && selectedDubLanguage !== 'en') {
    if (isAnime && selectedDubLanguage === 'ja') {
      currentServerIndex = 8;
    } else {
      currentServerIndex = 3; // Server 4: Global Mirror (Multi-Language & Dubbed)
    }
  }

  // Sync Dubbed Audio Selector in Header
  const audioSelect = document.getElementById('player-audio-select');
  if (audioSelect) {
    audioSelect.value = selectedDubLanguage;
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

  // 2. High-Speed Direct Stream Loading — ZERO SANDBOX RESTRICTIONS (100% Server Compatible)
  const iframe = document.getElementById('player-iframe');
  iframe.removeAttribute('sandbox');
  iframe.referrerPolicy = 'origin';

  let streamUrl = srv.url;
  // NetMirror REA Multi-Server Anti-Ad & Multi-Audio Bypass Engine:
  // 1. FilmU (Server 4 & 6): Inject verified premium whitelist key & debug bypass
  if (streamUrl && streamUrl.includes('embed.filmu.in') && !streamUrl.includes('apikey=')) {
    const sep = streamUrl.includes('?') ? '&' : '?';
    streamUrl = `${streamUrl}${sep}apikey=streamie_premium_k7m3x9qp2v&debug=savu`;
  }
  // 2. AutoEmbed (Server 3 & 8): Strip outer ad wrapper (gussiessmutchy.com) and load pure player.autoembed.co
  if (streamUrl && streamUrl.includes('//autoembed.co/') && !streamUrl.includes('player.autoembed.co')) {
    streamUrl = streamUrl.replace('//autoembed.co/movie/tmdb/', '//player.autoembed.co/embed/movie/')
                         .replace('//autoembed.co/tv/tmdb/', '//player.autoembed.co/embed/tv/')
                         .replace('//autoembed.co/movie/imdb/', '//player.autoembed.co/embed/movie/')
                         .replace(/-/g, '/');
  }
  // 3. VidLink (Server 1, 9, 10): Ensure multi-language audio track support is enabled
  if (streamUrl && streamUrl.includes('vidlink.pro') && !streamUrl.includes('multiLang=')) {
    const sep = streamUrl.includes('?') ? '&' : '?';
    streamUrl = `${streamUrl}${sep}multiLang=true`;
  }
  iframe.src = streamUrl;

  // 3. Smooth Dismissal of Buffering Overlay
  let dismissed = false;
  const dismissBuffer = () => {
    if (!dismissed) {
      dismissed = true;
      setTimeout(() => {
        if (bufferOverlay) bufferOverlay.classList.add('fade-out');
      }, 1200);
    }
  };

  iframe.onload = dismissBuffer;
  setTimeout(dismissBuffer, 2600);

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

  // For multi-language and default, use Server 4 (Global Mirror)
  if (langCode === 'ja' && isAnime) {
    loadServerStream(8); // Server 9: AnimeWorld VIP (Multi-Audio: Hindi/Eng/Jap)
    showToast(`🎧 Audio set to ${langName} • Server 9 (AnimeWorld VIP) Active`, 'success');
  } else {
    loadServerStream(3); // Server 4: Global Mirror (Multi-Language & Dubbed)
    showToast(`🎧 Audio set to ${langName} • Server 4 (Global Mirror) Active`, 'success');
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
    pill.className = `server-chip-pill ${idx === currentServerIndex ? 'active' : ''}`;
    pill.innerHTML = `
      <i class="fa-solid fa-server text-red"></i>
      <span>${srv.name.split(':')[0]}</span>
      <span class="server-chip-badge">${srv.badge.split('•')[0].trim()}</span>
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
        <img class="card-poster" src="${sim.poster}" alt="${sim.title}" onerror="handleImgError(this)">
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

  // Auto-Refocus Window Protection & Netflix Buffer Absorber (Prevents ad window hijacking when clicking player)
  window.addEventListener('blur', () => {
    const iframe = document.getElementById('player-iframe');
    if (document.activeElement === iframe) {
      setTimeout(() => {
        window.focus();
      }, 80);

      const now = Date.now();
      if (!initialAdAbsorbed && (now - lastAdAbsorbTime > 3000)) {
        initialAdAbsorbed = true;
        lastAdAbsorbTime = now;
        const bufferOverlay = document.getElementById('player-buffering-overlay');
        const bufferText = document.getElementById('buffering-text');
        const bufferSub = document.getElementById('buffering-sub');
        if (bufferOverlay) {
          bufferOverlay.classList.remove('fade-out');
          if (bufferText) bufferText.textContent = 'Connecting Ultra HD Stream';
          if (bufferSub) bufferSub.textContent = 'Ad neutralized • Resuming pure playback...';
          setTimeout(() => {
            bufferOverlay.classList.add('fade-out');
          }, 1200);
        }
      }
    }
  });
}

// ========================================================
// NETFLIX PROFILES & CUSTOM AVATARS SYSTEM
// ========================================================
const STORAGE_PROFILE_NAME = 'cinemamirror_profile_name';
const STORAGE_PROFILE_AVATAR = 'cinemamirror_profile_avatar';
const STORAGE_DEFAULT_SERVER = 'cinemamirror_default_server';
const STORAGE_DEFAULT_ZOOM = 'cinemamirror_default_zoom';
const STORAGE_AUTOPLAY_NEXT = 'cinemamirror_autoplay_next';
const STORAGE_SUB_SIZE = 'cinemamirror_sub_size';
const STORAGE_AUTO_SUB = 'cinemamirror_auto_sub';
const STORAGE_NOTIF_READ = 'cinemamirror_notif_read';

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

let currentProfileName = localStorage.getItem(STORAGE_PROFILE_NAME) || 'Cinema Fan';
let currentProfileAvatar = localStorage.getItem(STORAGE_PROFILE_AVATAR) || NETFLIX_AVATARS[0].url;
let selectedEditAvatar = currentProfileAvatar;

function initProfile() {
  updateProfileDOM();
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

function toggleProfileDropdown(e) {
  if (e) e.stopPropagation();
  const dropdown = document.getElementById('profile-dropdown-menu');
  const caret = document.getElementById('nav-profile-caret');
  const notifDropdown = document.getElementById('notifications-dropdown');
  
  if (notifDropdown) notifDropdown.style.display = 'none';

  if (!dropdown) return;
  const isShown = dropdown.style.display === 'block';
  dropdown.style.display = isShown ? 'none' : 'block';
  if (caret) caret.style.transform = isShown ? 'rotate(0deg)' : 'rotate(180deg)';
}

function openProfileModal() {
  const dropdown = document.getElementById('profile-dropdown-menu');
  if (dropdown) dropdown.style.display = 'none';
  const caret = document.getElementById('nav-profile-caret');
  if (caret) caret.style.transform = 'rotate(0deg)';

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

function toggleNotificationDropdown(e) {
  if (e) e.stopPropagation();
  const dropdown = document.getElementById('notifications-dropdown');
  const profileDropdown = document.getElementById('profile-dropdown-menu');
  
  if (profileDropdown) profileDropdown.style.display = 'none';

  if (!dropdown) return;
  const isShown = dropdown.style.display === 'block';
  dropdown.style.display = isShown ? 'none' : 'block';
}

function renderNotifications() {
  const list = document.getElementById('notif-list');
  const badge = document.getElementById('bell-badge');
  if (!list || !catalogData || catalogData.length === 0) return;

  // Filter standout new releases / popular titles
  const highlights = catalogData.filter(x => x.year >= 2022 || x.rank).slice(0, 6);
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
      <img class="notif-poster" src="${item.poster}" alt="${item.title}" onerror="handleImgError(this)">
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
    showToast('🎉 CinemaMirror Pro installed successfully on your home screen!', 'success');
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
        showToast('Installing CinemaMirror Pro App...', 'success');
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
  const pDrop = document.getElementById('profile-dropdown-menu');
  if (pDrop) pDrop.style.display = 'none';
  const nDrop = document.getElementById('notifications-dropdown');
  if (nDrop) nDrop.style.display = 'none';

  const modal = document.getElementById('app-settings-modal');
  if (!modal) return;
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
  if (confirm('Are you sure you want to reset all CinemaMirror preferences to default?')) {
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
    selectedServerIndex = 3;
    currentServerIndex = 3;
    selectedDubLanguage = 'en';

    updateProfileDOM();
    initSettings();
    showToast('All app settings restored to default!', 'success');
    closeSettingsModal();
  }
}

// Global click-outside listener to close dropdowns
window.addEventListener('click', (e) => {
  const pDrop = document.getElementById('profile-dropdown-menu');
  const pWrap = document.getElementById('netflix-profile-wrapper');
  if (pDrop && pWrap && !pWrap.contains(e.target)) {
    pDrop.style.display = 'none';
    const caret = document.getElementById('nav-profile-caret');
    if (caret) caret.style.transform = 'rotate(0deg)';
  }

  const nDrop = document.getElementById('notifications-dropdown');
  const nWrap = document.getElementById('nav-bell-wrapper');
  if (nDrop && nWrap && !nWrap.contains(e.target)) {
    nDrop.style.display = 'none';
  }
});
