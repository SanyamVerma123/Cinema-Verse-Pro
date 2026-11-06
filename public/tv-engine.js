/**
 * =========================================================================
 * CINEMAVERSE PRO — SMART TV CLIENT ENGINE (tv-engine.js)
 * High-performance, lightweight, deterministic D-Pad remote navigation.
 * Zero-lag 60 FPS Leanback interface for Android TV, Fire TV, and Apple TV.
 * =========================================================================
 */

(function () {
  'use strict';

  // State Management
  let allCatalog = [];
  let currentSpotlightIndex = 0;
  let spotlightTimer = null;
  let currentActiveTab = 'home';
  let activeZone = 'hero'; // 'nav', 'hero', 'rows', 'search-bar', 'keyboard', 'results', 'modal', 'player'
  let currentRowIndex = 0;
  let currentColIndex = 0;
  let navIndex = 1; // 0=Search, 1=Home, 2=Movies, 3=Series, 4=OTT
  let heroBtnIndex = 0; // 0=Watch Now, 1=Info, 2=Watchlist
  let searchBarIndex = 1; // 0=Query text, 1=Voice Search Button
  let keyboardRow = 0;
  let keyboardCol = 0;
  let searchQuery = '';

  // Modal State
  let selectedModalItem = null;
  let selectedModalSeason = 1;
  let selectedModalEpisode = 1;
  let selectedModalServer = 0;
  let modalSubZone = 'actions'; // 'servers', 'actions', 'seasons', 'episodes'
  let modalServerIdx = 0;
  let modalActionIdx = 0; // 0=Play, 1=Close
  let modalSeasonIdx = 0;
  let modalEpIdx = 0;

  // Player State
  let isPlayerActive = false;
  let playerHudTimer = null;
  let playerSubZone = 'servers'; // 'back', 'servers', 'episodes'
  let playerServerIdx = 0;
  let playerEpAction = 1; // 0=Prev, 1=Next

  // Mirror Streaming Servers (10 High-Speed Mirrors)
  const STREAM_SERVERS = [
    { id: 0, name: 'Server 1: Vidly Pro (Multi-Audio)', short: 'Vidly Pro' },
    { id: 1, name: 'Server 2: CineSrc 4K (0 Ads)', short: 'CineSrc 4K' },
    { id: 2, name: 'Server 3: 123Embed Ultra', short: '123Embed' },
    { id: 3, name: 'Server 4: Global World Mirror', short: 'AutoEmbed' },
    { id: 4, name: 'Server 5: AutoEmbed Prime VIP', short: 'Prime VIP' },
    { id: 5, name: 'Server 6: AnimeWorld VIP', short: 'AnimeWorld' },
    { id: 6, name: 'Server 7: MultiEmbed Cloud', short: 'MultiEmbed' },
    { id: 7, name: 'Server 8: VidLink Pro VIP', short: 'VidLink Pro' },
    { id: 8, name: 'Server 9: AnyEmbed Direct', short: 'AnyEmbed' },
    { id: 9, name: 'Server 10: Nontongo Subtitles', short: 'Nontongo' }
  ];

  function getStreamUrl(serverIndex, item, season = 1, episode = 1) {
    if (!item) return 'about:blank';
    const isTv = item.type === 'series';
    const s = season || 1;
    const e = episode || 1;
    const imdb = item.imdbId || '';
    const tmdb = item.tmdbId || '';
    const tmdbOrImdb = tmdb || imdb || item.id;

    switch (serverIndex) {
      case 0:
        return isTv
          ? `https://vidly.pro/tv/${tmdb || tmdbOrImdb}/${s}/${e}?preview=1&theme=aurora&color=e50914&audioPicker=1&nextEpisode=1`
          : `https://vidly.pro/movie/${tmdb || tmdbOrImdb}?preview=1&theme=aurora&color=e50914&audioPicker=1`;
      case 1:
        return isTv ? `https://cinesrc.st/embed/tv/${tmdbOrImdb}?s=${s}&e=${e}` : `https://cinesrc.st/embed/movie/${tmdbOrImdb}`;
      case 2:
        return isTv ? `https://play2.123embed.net/tv/${tmdbOrImdb}/${s}/${e}` : `https://play2.123embed.net/movie/${tmdbOrImdb}`;
      case 3:
        return isTv
          ? `https://player.autoembed.co/embed/tv/${imdb || tmdbOrImdb}/${s}/${e}${imdb ? `?imdb=${imdb}` : ''}`
          : `https://player.autoembed.co/embed/movie/${imdb || tmdbOrImdb}${imdb ? `?imdb=${imdb}` : ''}`;
      case 4:
        return isTv
          ? `https://player.autoembed.co/embed/tv/${tmdbOrImdb}/${s}/${e}${imdb ? `?imdb=${imdb}` : ''}`
          : `https://player.autoembed.co/embed/movie/${tmdbOrImdb}${imdb ? `?imdb=${imdb}` : ''}`;
      case 5:
        return isTv ? `https://player.autoembed.co/embed/tv/${tmdbOrImdb}/${s}/${e}` : `https://player.autoembed.co/embed/movie/${tmdbOrImdb}`;
      case 6:
        return isTv ? `https://multiembed.mov/?video_id=${tmdbOrImdb}&tmdb=1&s=${s}&e=${e}` : `https://multiembed.mov/?video_id=${tmdbOrImdb}&tmdb=1`;
      case 7:
        return isTv
          ? `https://vidlink.pro/tv/${tmdb || tmdbOrImdb}/${s}/${e}?primaryColor=e50914&secondaryColor=181818&iconColor=ffffff&icons=default&player=default&title=true&poster=true&autoplay=false&nextbutton=true`
          : `https://vidlink.pro/movie/${tmdb || tmdbOrImdb}?primaryColor=e50914&secondaryColor=181818&iconColor=ffffff&icons=default&player=default&title=true&poster=true&autoplay=false&nextbutton=true`;
      case 8:
        return isTv
          ? `https://anyembed.xyz/embed/tmdb-tv-${tmdb || tmdbOrImdb}-${s}-${e}`
          : `https://anyembed.xyz/embed/tmdb-movie-${tmdb || tmdbOrImdb}`;
      case 9:
        return isTv
          ? `https://www.nontongo.win/embed/tv/${tmdb || tmdbOrImdb}/${s}/${e}`
          : `https://www.nontongo.win/embed/movie/${tmdb || tmdbOrImdb}`;
      default:
        return isTv
          ? `https://player.autoembed.co/embed/tv/${imdb || tmdbOrImdb}/${s}/${e}`
          : `https://player.autoembed.co/embed/movie/${imdb || tmdbOrImdb}`;
    }
  }

  // Keyboard Layout (6 columns x 6 rows + action buttons)
  const KEYBOARD_KEYS = [
    ['A', 'B', 'C', 'D', 'E', 'F'],
    ['G', 'H', 'I', 'J', 'K', 'L'],
    ['M', 'N', 'O', 'P', 'Q', 'R'],
    ['S', 'T', 'U', 'V', 'W', 'X'],
    ['Y', 'Z', '0', '1', '2', '3'],
    ['4', '5', '6', '7', '8', '9'],
    ['SPACE', 'DELETE', 'CLEAR']
  ];

  // Global Multi-Tier TV Image Fallback Engine
  function createTvSvgHeroBanner(title, platform) {
    const cleanTitle = (title || 'CinemaVerse').replace(/['"<>&]/g, '');
    const cleanPlat = (platform || 'NETFLIX').toUpperCase();
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
        <defs>
          <radialGradient id="amb" cx="70%" cy="30%" r="80%">
            <stop offset="0%" stop-color="#2d1216"/>
            <stop offset="40%" stop-color="#141824"/>
            <stop offset="100%" stop-color="#07080b"/>
          </radialGradient>
          <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#e50914"/>
            <stop offset="100%" stop-color="#f59e0b"/>
          </linearGradient>
        </defs>
        <rect width="1920" height="1080" fill="url(#amb)"/>
        <circle cx="1300" cy="500" r="450" fill="rgba(229,9,20,0.12)" filter="blur(60px)"/>
        <circle cx="1400" cy="450" r="280" fill="rgba(245,158,11,0.08)" filter="blur(50px)"/>
        <g transform="translate(1300, 480)">
          <circle cx="0" cy="0" r="140" fill="rgba(229,9,20,0.2)" stroke="#e50914" stroke-width="4"/>
          <polygon points="-25,-50 55,0 -25,50" fill="#ffffff"/>
        </g>
        <text x="1300" y="700" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-weight="900" font-size="34" fill="#ffffff" text-anchor="middle" letter-spacing="4">${cleanPlat}</text>
        <text x="1300" y="745" font-family="sans-serif" font-weight="700" font-size="20" fill="#94a3b8" text-anchor="middle" letter-spacing="2">4K ULTRA HD STREAMING</text>
      </svg>
    `);
  }

  function setHeroBackdropWithFallback(backdropEl, item) {
    if (!backdropEl || !item) return;
    backdropEl.onerror = null;

    const candidates = [];
    if (item.backdrop && !item.backdrop.includes('undefined')) candidates.push(item.backdrop);
    if (item.poster && !item.poster.includes('undefined')) candidates.push(item.poster);

    let idx = 0;
    function tryNext() {
      if (idx < candidates.length) {
        const url = candidates[idx++];
        backdropEl.onerror = () => {
          if (url.includes('images.metahub.space') && !backdropEl.dataset.proxied) {
            backdropEl.dataset.proxied = 'true';
            backdropEl.src = '/api/image-proxy?url=' + encodeURIComponent(url);
            return;
          }
          tryNext();
        };
        backdropEl.src = url;
      } else {
        backdropEl.onerror = null;
        backdropEl.src = createTvSvgHeroBanner(item.title, item.platformBadge || item.platform);
      }
    }
    tryNext();
  }

  window.handleImgError = function (img, fallback) {
    if (!img) return;
    const orig = img.src || '';
    if (orig.includes('images.metahub.space') && !img.dataset.proxied) {
      img.dataset.proxied = 'true';
      img.src = '/api/image-proxy?url=' + encodeURIComponent(orig);
      return;
    }
    img.onerror = null;
    img.src = fallback || 'https://images.metahub.space/poster/medium/tt4574334/img';
  };

  // =========================================================================
  // INITIALIZATION
  // =========================================================================
  window.initTvApp = function (catalog) {
    allCatalog = Array.isArray(catalog) ? catalog : (window.__TV_CATALOG__ || []);
    console.log(`[CinemaVerse TV] Engine active with ${allCatalog.length} titles`);

    buildOnScreenKeyboard();
    renderSpotlightHero();
    renderAllContentRows();
    setupRemoteKeyEvents();

    // Default focus: Hero Watch Now button
    activeZone = 'hero';
    heroBtnIndex = 0;
    updateFocusUI();

    // Hero Spotlight Carousel rotation every 8 seconds
    if (spotlightTimer) clearInterval(spotlightTimer);
    spotlightTimer = setInterval(nextSpotlight, 8000);

    // Asynchronously enrich with full 1,300+ catalog in background if running on web server
    setTimeout(async () => {
      try {
        const res = await fetch('/api/catalog');
        const data = await res.json();
        if (Array.isArray(data) && data.length > allCatalog.length) {
          allCatalog = data;
          console.log(`[CinemaVerse TV] Enriched with full ${data.length} catalog in background`);
        }
      } catch (e) {
        // Running offline in pure APK; local catalog already complete
      }
    }, 1500);
  };

  // =========================================================================
  // HERO SPOTLIGHT
  // =========================================================================
  function getSpotlightItems() {
    const list = allCatalog.filter(x => (x.backdrop || x.poster) && (x.featured || x.rating >= 8.0));
    return list.length ? list.slice(0, 15) : allCatalog.slice(0, 15);
  }

  function renderSpotlightHero() {
    const items = getSpotlightItems();
    if (!items.length) return;
    const item = items[currentSpotlightIndex % items.length];

    const backdropEl = document.getElementById('tv-hero-backdrop');
    const ottEl = document.getElementById('tv-hero-ott');
    const ratingEl = document.getElementById('tv-hero-rating');
    const matchEl = document.getElementById('tv-hero-match');
    const yearEl = document.getElementById('tv-hero-year');
    const qualityEl = document.getElementById('tv-hero-quality');
    const titleEl = document.getElementById('tv-hero-title');
    const descEl = document.getElementById('tv-hero-desc');

    if (backdropEl) setHeroBackdropWithFallback(backdropEl, item);
    if (ottEl) {
      ottEl.textContent = item.platformBadge || item.platform || 'STREAM';
      if (item.platformColor) ottEl.style.backgroundColor = item.platformColor;
    }
    if (ratingEl) ratingEl.innerHTML = `<i class="fa-solid fa-star"></i> ${item.rating || '8.5'}`;
    if (matchEl) matchEl.textContent = item.matchRate || '99% Match';
    if (yearEl) yearEl.textContent = item.year || '2024';
    if (qualityEl) qualityEl.textContent = item.quality || '4K Ultra HD';
    if (titleEl) titleEl.textContent = item.title || 'CinemaVerse';
    if (descEl) descEl.textContent = item.description || 'Watch in 4K Ultra HD with multi-audio and zero ads.';
  }

  function nextSpotlight() {
    const items = getSpotlightItems();
    if (!items.length) return;
    currentSpotlightIndex = (currentSpotlightIndex + 1) % items.length;
    renderSpotlightHero();
  }

  // =========================================================================
  // CONTENT ROWS
  // =========================================================================
  function renderAllContentRows() {
    const container = document.getElementById('tv-rows-container');
    if (!container) return;
    container.innerHTML = '';

    const rowConfigs = [
      { id: 'top10-movies', title: '🔥 Top 10 Movies Today', filter: x => x.type === 'movie' && x.rank, top10: true },
      { id: 'top10-series', title: '🔥 Top 10 TV Shows Today', filter: x => x.type === 'series' && x.rank, top10: true },
      { id: 'netflix', title: 'Netflix Originals & Blockbusters', filter: x => x.platformId === 'netflix' },
      { id: 'prime', title: 'Amazon Prime Video Exclusives', filter: x => x.platformId === 'prime' },
      { id: 'disney', title: 'Disney+ Hotstar & Marvel Cinematic Universe', filter: x => x.platformId === 'disney' },
      { id: 'hbo', title: 'HBO Max Prestige Series & Warner Bros', filter: x => x.platformId === 'hbo' },
      { id: 'apple', title: 'Apple TV+ Originals & Award Winners', filter: x => x.platformId === 'apple' },
      { id: 'crunchyroll', title: 'Crunchyroll & Anime World Hits', filter: x => x.platformId === 'crunchyroll' || x.platformId === 'animeworld' },
      { id: 'indian', title: 'Blockbuster Indian Cinema (Sony LIV, Zee5, JioCinema)', filter: x => ['sonyliv', 'zee5', 'jiocinema'].includes(x.platformId) }
    ];

    rowConfigs.forEach((conf, rIdx) => {
      let items = allCatalog.filter(conf.filter);
      if (conf.top10) items = items.sort((a, b) => (a.rank || 99) - (b.rank || 99)).slice(0, 10);
      if (!items.length) return;

      const rowEl = document.createElement('div');
      rowEl.className = 'tv-content-row';
      rowEl.id = `tv-row-${rIdx}`;
      rowEl.dataset.rowIndex = rIdx;

      rowEl.innerHTML = `
        <div class="tv-row-header">
          <h3 class="tv-row-title">${conf.title}</h3>
        </div>
        <div class="tv-row-scroller" id="tv-scroller-${rIdx}"></div>
      `;

      const scroller = rowEl.querySelector('.tv-row-scroller');
      items.forEach((item, cIdx) => {
        const card = createTvCard(item, rIdx, cIdx, conf.top10);
        scroller.appendChild(card);
      });

      container.appendChild(rowEl);
    });
  }

  function createTvCard(item, rIdx, cIdx, isTop10 = false) {
    const card = document.createElement('div');
    card.className = isTop10 ? 'tv-card tv-top10-card-wrap' : 'tv-card';
    card.dataset.rowIndex = rIdx;
    card.dataset.colIndex = cIdx;
    card.setAttribute('tabindex', '0');

    const rankHtml = isTop10 ? `<span class="tv-top10-rank">${cIdx + 1}</span>` : '';
    const ratingHtml = item.rating ? `<span class="tv-card-rating">★ ${item.rating}</span>` : '';
    const ottHtml = item.platformBadge || item.platform ? `<span class="tv-card-ott">${item.platformBadge || item.platform}</span>` : '';

    card.innerHTML = `
      ${rankHtml}
      <img class="tv-card-poster" src="${item.poster || item.backdrop || ''}" alt="${item.title}" loading="lazy" decoding="async" onerror="if(window.handleImgError)window.handleImgError(this)" />
      ${ratingHtml}
      ${ottHtml}
      <div class="tv-card-overlay">
        <h4 class="tv-card-title">${item.title}</h4>
        <div class="tv-card-meta">
          <span>${item.year || '2024'}</span>
          <span>${item.type === 'series' ? 'Series' : (item.duration || 'Movie')}</span>
        </div>
      </div>
    `;

    card.onclick = () => openDetailsModal(item);
    return card;
  }

  // =========================================================================
  // ON-SCREEN KEYBOARD & VOICE SEARCH
  // =========================================================================
  function buildOnScreenKeyboard() {
    const gridEl = document.getElementById('tv-keyboard-grid');
    const actionsEl = document.getElementById('tv-keyboard-actions');
    if (!gridEl || !actionsEl) return;

    gridEl.innerHTML = '';
    actionsEl.innerHTML = '';

    for (let r = 0; r < 6; r++) {
      KEYBOARD_KEYS[r].forEach((key, c) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tv-key-btn';
        btn.dataset.kRow = r;
        btn.dataset.kCol = c;
        btn.textContent = key;
        btn.onclick = () => onKeyTyped(key);
        gridEl.appendChild(btn);
      });
    }

    const actions = [
      { text: 'SPACE', icon: 'fa-regular fa-keyboard', action: () => onKeyTyped(' ') },
      { text: 'DELETE', icon: 'fa-solid fa-delete-left', action: onDeleteKey },
      { text: 'CLEAR ALL', icon: 'fa-solid fa-trash-can', action: onClearKey }
    ];

    actions.forEach((act, c) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tv-key-action';
      btn.dataset.kRow = 6;
      btn.dataset.kCol = c;
      btn.innerHTML = `<i class="${act.icon}"></i> ${act.text}`;
      btn.onclick = act.action;
      actionsEl.appendChild(btn);
    });

    const voiceBtn = document.getElementById('tv-btn-voice');
    if (voiceBtn) {
      voiceBtn.onclick = onVoiceSearch;
    }
  }

  function onKeyTyped(char) {
    searchQuery += char;
    updateSearchDisplay();
    executeSearch();
  }

  function onDeleteKey() {
    if (searchQuery.length > 0) {
      searchQuery = searchQuery.slice(0, -1);
      updateSearchDisplay();
      executeSearch();
    }
  }

  function onClearKey() {
    searchQuery = '';
    updateSearchDisplay();
    executeSearch();
  }

  function updateSearchDisplay() {
    const displayEl = document.getElementById('tv-search-query-text');
    if (displayEl) {
      displayEl.textContent = searchQuery || 'Search movies, TV shows, actors, or genres...';
    }
  }

  function onVoiceSearch() {
    // 1. Android TV Native Voice Bridge via remote microphone
    if (window.AndroidVoiceBridge && typeof window.AndroidVoiceBridge.startVoiceSearch === 'function') {
      window.AndroidVoiceBridge.startVoiceSearch();
      return;
    }

    // 2. Web Speech API for Chrome / Edge browsers
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        const voiceBtn = document.getElementById('tv-btn-voice');
        if (voiceBtn) {
          voiceBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Listening...';
        }

        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          window.handleVoiceFinalResult(transcript);
        };

        recognition.onerror = () => {
          if (voiceBtn) voiceBtn.innerHTML = '<i class="fa-solid fa-microphone"></i> Voice Search';
        };

        recognition.onend = () => {
          if (voiceBtn) voiceBtn.innerHTML = '<i class="fa-solid fa-microphone"></i> Voice Search';
        };

        recognition.start();
        return;
      } catch (e) {
        console.warn('SpeechRecognition failed:', e);
      }
    }

    alert('Voice Search: Speak movie name into your Smart TV Remote Microphone');
  }

  window.handleVoiceFinalResult = function (text) {
    if (!text) return;
    searchQuery = text.trim();
    updateSearchDisplay();
    executeSearch();
  };

  function executeSearch() {
    const resultsContainer = document.getElementById('tv-search-results-grid');
    if (!resultsContainer) return;

    if (!searchQuery.trim()) {
      resultsContainer.innerHTML = '';
      return;
    }

    const q = searchQuery.toLowerCase().trim();
    const matches = allCatalog.filter(item => {
      const title = (item.title || '').toLowerCase();
      const genres = (item.genres || []).map(g => g.toLowerCase()).join(' ');
      const desc = (item.description || '').toLowerCase();
      const cast = (item.cast || []).map(c => c.toLowerCase()).join(' ');
      return title.includes(q) || genres.includes(q) || desc.includes(q) || cast.includes(q);
    }).slice(0, 36);

    resultsContainer.innerHTML = '';
    matches.forEach((item, idx) => {
      const card = createTvCard(item, 999, idx, false);
      resultsContainer.appendChild(card);
    });
  }

  // =========================================================================
  // TV DETAILS MODAL (Seasons, Episodes, Servers, and D-Pad Selection)
  // =========================================================================
  function openDetailsModal(item) {
    selectedModalItem = item;
    selectedModalSeason = 1;
    selectedModalEpisode = 1;
    selectedModalServer = 0;

    modalSubZone = 'actions';
    modalActionIdx = 0; // Play Stream focused by default
    modalServerIdx = 0;
    modalSeasonIdx = 0;
    modalEpIdx = 0;

    const modal = document.getElementById('tv-details-modal');
    if (!modal) return;

    const poster = document.getElementById('tv-details-poster');
    const title = document.getElementById('tv-details-title');
    const meta = document.getElementById('tv-details-meta');
    const desc = document.getElementById('tv-details-desc');
    const serversContainer = document.getElementById('tv-details-servers');
    const episodesSection = document.getElementById('tv-details-episodes');

    if (poster) poster.src = item.poster || item.backdrop || '';
    if (title) title.textContent = item.title;
    if (meta) {
      meta.innerHTML = `
        <span class="tv-ott-badge">${item.platformBadge || item.platform}</span>
        <span class="text-gold"><i class="fa-solid fa-star"></i> ${item.rating || '8.5'}</span>
        <span>${item.year || '2024'}</span>
        <span>${item.type === 'series' ? 'TV Series' : (item.duration || 'Movie')}</span>
        <span class="tv-pill-meta text-green">4K Ultra HD</span>
      `;
    }
    if (desc) desc.textContent = item.description || 'Watch in 4K Ultra HD with multi-audio and zero ads.';

    // Populate Servers
    if (serversContainer) {
      serversContainer.innerHTML = '';
      STREAM_SERVERS.forEach((srv, idx) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = `tv-server-chip ${idx === selectedModalServer ? 'active' : ''}`;
        chip.id = `tv-modal-server-${idx}`;
        chip.dataset.serverIdx = idx;
        chip.textContent = srv.short;
        chip.onclick = () => {
          selectedModalServer = idx;
          modalServerIdx = idx;
          document.querySelectorAll('.tv-server-chip').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
        };
        serversContainer.appendChild(chip);
      });
    }

    // Populate Seasons & Episodes if Series
    if (episodesSection) {
      if (item.type === 'series') {
        episodesSection.style.display = 'block';
        renderModalSeasons(item);
        renderModalEpisodes(item, 1);
      } else {
        episodesSection.style.display = 'none';
      }
    }

    modal.classList.add('active');
    activeZone = 'modal';
    updateFocusUI();
  }

  function renderModalSeasons(item) {
    const seasonsRow = document.getElementById('tv-details-seasons-row');
    const seasonsContainer = document.getElementById('tv-details-seasons');
    if (!seasonsRow || !seasonsContainer) return;

    let seasonsList = [];
    if (Array.isArray(item.seasons) && item.seasons.length > 0) {
      seasonsList = item.seasons.map(s => s.season || 1);
    } else {
      const match = (item.duration || '').match(/(\d+)\s*Season/i);
      const sCount = match ? parseInt(match[1]) : 1;
      for (let s = 1; s <= sCount; s++) seasonsList.push(s);
    }

    seasonsContainer.innerHTML = '';
    seasonsList.forEach((sNum, idx) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `tv-season-chip ${sNum === selectedModalSeason ? 'active' : ''}`;
      chip.id = `tv-modal-season-${idx}`;
      chip.dataset.seasonNum = sNum;
      chip.dataset.seasonIdx = idx;
      chip.textContent = `Season ${sNum}`;
      chip.onclick = () => {
        selectedModalSeason = sNum;
        modalSeasonIdx = idx;
        document.querySelectorAll('.tv-season-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        renderModalEpisodes(item, sNum);
      };
      seasonsContainer.appendChild(chip);
    });
  }

  function renderModalEpisodes(item, seasonNum) {
    const scroller = document.getElementById('tv-episodes-scroller');
    const heading = document.getElementById('tv-episodes-heading');
    if (!scroller) return;

    if (heading) heading.textContent = `Episodes — Season ${seasonNum}`;
    scroller.innerHTML = '';

    let episodes = [];
    if (Array.isArray(item.seasons)) {
      const sObj = item.seasons.find(s => s.season === seasonNum);
      if (sObj && Array.isArray(sObj.episodes)) episodes = sObj.episodes;
    }

    const epCount = episodes.length || 10;
    for (let i = 0; i < epCount; i++) {
      const epData = episodes[i] || {};
      const epNum = epData.episode || (i + 1);
      const epTitle = epData.title || `Episode ${epNum}`;
      const epDuration = epData.duration || '48m';

      const card = document.createElement('div');
      card.className = 'tv-episode-card';
      card.id = `tv-modal-ep-${i}`;
      card.dataset.epIdx = i;
      card.dataset.epNum = epNum;
      card.innerHTML = `
        <span style="font-size: 11px; color: var(--tv-text-muted);">Season ${seasonNum} • ${epDuration}</span>
        <strong style="font-size: 14px; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${epTitle}</strong>
        <span style="font-size: 11px; color: #22c55e;"><i class="fa-solid fa-play"></i> Watch Episode</span>
      `;

      card.onclick = () => {
        selectedModalEpisode = epNum;
        startPlayback(item, selectedModalSeason, selectedModalEpisode, selectedModalServer);
      };

      scroller.appendChild(card);
    }
  }

  function closeDetailsModal() {
    const modal = document.getElementById('tv-details-modal');
    if (modal) modal.classList.remove('active');
    activeZone = 'rows';
    updateFocusUI();
  }

  // =========================================================================
  // FULLSCREEN VIDEO PLAYER & IN-PLAYER REMOTE SERVER SWITCHER
  // =========================================================================
  function startPlayback(item, season = 1, episode = 1, serverIndex = 0) {
    if (!item) return;
    closeDetailsModal();
    isPlayerActive = true;
    activeZone = 'player';
    playerSubZone = 'servers';
    playerServerIdx = serverIndex;

    const overlay = document.getElementById('tv-player-overlay');
    const iframe = document.getElementById('tv-player-iframe');
    const titleEl = document.getElementById('tv-player-hud-title');

    if (!overlay || !iframe) return;

    selectedModalItem = item;
    selectedModalSeason = season;
    selectedModalEpisode = episode;
    selectedModalServer = serverIndex;

    const streamUrl = getStreamUrl(serverIndex, item, season, episode);
    console.log(`[CinemaVerse TV Player] Streaming: ${streamUrl}`);
    iframe.src = streamUrl;

    if (titleEl) {
      titleEl.textContent = item.type === 'series'
        ? `${item.title} — Season ${season}, Ep ${episode}`
        : item.title;
    }

    // Populate In-Player Server Switcher
    renderPlayerHudServers();

    // Toggle episode controls if TV series
    const epControls = document.getElementById('tv-player-ep-controls');
    if (epControls) {
      epControls.style.display = item.type === 'series' ? 'flex' : 'none';
      const prevBtn = document.getElementById('tv-player-btn-prev-ep');
      const nextBtn = document.getElementById('tv-player-btn-next-ep');
      if (prevBtn) prevBtn.onclick = () => switchPlayerEpisode(-1);
      if (nextBtn) nextBtn.onclick = () => switchPlayerEpisode(1);
    }

    overlay.classList.add('active');
    showPlayerHudBriefly();
    updateFocusUI();
  }

  function renderPlayerHudServers() {
    const chipsContainer = document.getElementById('tv-player-server-chips');
    if (!chipsContainer) return;
    chipsContainer.innerHTML = '';

    STREAM_SERVERS.forEach((srv, idx) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `tv-player-server-chip ${idx === selectedModalServer ? 'active' : ''}`;
      chip.id = `tv-player-server-${idx}`;
      chip.dataset.serverIdx = idx;
      chip.textContent = srv.short;
      chip.onclick = () => {
        selectedModalServer = idx;
        playerServerIdx = idx;
        switchPlayerServer(idx);
      };
      chipsContainer.appendChild(chip);
    });
  }

  function switchPlayerServer(newServerIdx) {
    selectedModalServer = newServerIdx;
    playerServerIdx = newServerIdx;
    const iframe = document.getElementById('tv-player-iframe');
    if (iframe && selectedModalItem) {
      iframe.src = getStreamUrl(newServerIdx, selectedModalItem, selectedModalSeason, selectedModalEpisode);
    }
    renderPlayerHudServers();
    showPlayerHudBriefly();
    updateFocusUI();
  }

  function switchPlayerEpisode(delta) {
    if (!selectedModalItem || selectedModalItem.type !== 'series') return;
    const nextEp = Math.max(1, selectedModalEpisode + delta);
    selectedModalEpisode = nextEp;

    const iframe = document.getElementById('tv-player-iframe');
    const titleEl = document.getElementById('tv-player-hud-title');
    if (iframe) {
      iframe.src = getStreamUrl(selectedModalServer, selectedModalItem, selectedModalSeason, selectedModalEpisode);
    }
    if (titleEl) {
      titleEl.textContent = `${selectedModalItem.title} — Season ${selectedModalSeason}, Ep ${selectedModalEpisode}`;
    }
    showPlayerHudBriefly();
  }

  function closePlayer() {
    isPlayerActive = false;
    const overlay = document.getElementById('tv-player-overlay');
    const iframe = document.getElementById('tv-player-iframe');
    if (overlay) overlay.classList.remove('active');
    if (iframe) iframe.src = 'about:blank';

    activeZone = 'rows';
    updateFocusUI();
  }

  function showPlayerHudBriefly() {
    const hud = document.getElementById('tv-player-hud');
    if (!hud) return;
    hud.classList.add('visible');
    if (playerHudTimer) clearTimeout(playerHudTimer);
    playerHudTimer = setTimeout(() => {
      hud.classList.remove('visible');
    }, 5000);
  }

  // =========================================================================
  // DETERMINISTIC 2D SPATIAL D-PAD NAVIGATION ENGINE
  // =========================================================================
  function setupRemoteKeyEvents() {
    window.addEventListener('keydown', (e) => {
      const key = e.key;
      const code = e.keyCode;

      // Check Media keys
      if (key === 'MediaPlayPause' || code === 179) {
        e.preventDefault();
        togglePlayPause();
        return;
      }
      if (key === 'MediaFastForward' || code === 228) {
        e.preventDefault();
        seekRelative(10);
        return;
      }
      if (key === 'MediaRewind' || code === 227) {
        e.preventDefault();
        seekRelative(-10);
        return;
      }

      // Universal TV Remote Back Key (Remote Back, Escape, Backspace, BrowserBack)
      if (key === 'Escape' || key === 'Backspace' || key === 'BrowserBack' || code === 27 || code === 8 || code === 4 || code === 10009) {
        if (isPlayerActive) {
          e.preventDefault();
          closePlayer();
          return;
        }
        if (activeZone === 'modal') {
          e.preventDefault();
          closeDetailsModal();
          return;
        }
        if (activeZone === 'search-bar' || activeZone === 'keyboard' || activeZone === 'results') {
          e.preventDefault();
          switchTab('home');
          return;
        }
      }

      // Directional D-Pad Navigation
      switch (key) {
        case 'ArrowUp':
        case 'Up':
          e.preventDefault();
          navigateDpad('up');
          break;
        case 'ArrowDown':
        case 'Down':
          e.preventDefault();
          navigateDpad('down');
          break;
        case 'ArrowLeft':
        case 'Left':
          e.preventDefault();
          navigateDpad('left');
          break;
        case 'ArrowRight':
        case 'Right':
          e.preventDefault();
          navigateDpad('right');
          break;
        case 'Enter':
        case 'Select':
        case 'Ok':
        case 'Space':
        case ' ':
          if (code === 13 || code === 32) {
            e.preventDefault();
            executeCurrentSelection();
          }
          break;
      }
    });
  }

  function navigateDpad(dir) {
    if (isPlayerActive) {
      showPlayerHudBriefly();
      navigatePlayerHud(dir);
      return;
    }

    if (activeZone === 'modal') {
      navigateModal(dir);
      return;
    }

    if (activeZone === 'nav') {
      if (dir === 'up') {
        navIndex = Math.max(0, navIndex - 1);
      } else if (dir === 'down') {
        navIndex = Math.min(4, navIndex + 1);
      } else if (dir === 'right') {
        // Leave nav rail into main content
        const rail = document.getElementById('tv-nav-rail');
        if (rail) rail.classList.remove('expanded');

        if (currentActiveTab === 'search') {
          activeZone = 'keyboard';
          keyboardRow = 0;
          keyboardCol = 0;
        } else {
          activeZone = 'hero';
          heroBtnIndex = 0;
        }
      }
      updateFocusUI();
      return;
    }

    if (activeZone === 'hero') {
      if (dir === 'left') {
        if (heroBtnIndex > 0) {
          heroBtnIndex--;
        } else {
          // Move focus to left nav rail
          activeZone = 'nav';
          const rail = document.getElementById('tv-nav-rail');
          if (rail) rail.classList.add('expanded');
        }
      } else if (dir === 'right') {
        heroBtnIndex = Math.min(2, heroBtnIndex + 1);
      } else if (dir === 'down') {
        // Move from hero down to first content row
        activeZone = 'rows';
        currentRowIndex = 0;
        currentColIndex = 0;
      }
      updateFocusUI();
      return;
    }

    if (activeZone === 'rows') {
      const rows = document.querySelectorAll('.tv-content-row');
      if (!rows.length) return;

      if (dir === 'up') {
        if (currentRowIndex > 0) {
          currentRowIndex--;
        } else {
          // Move back up to hero
          activeZone = 'hero';
          heroBtnIndex = 0;
        }
      } else if (dir === 'down') {
        currentRowIndex = Math.min(rows.length - 1, currentRowIndex + 1);
      } else if (dir === 'left') {
        if (currentColIndex > 0) {
          currentColIndex--;
        } else {
          // Left edge of row -> move focus to nav rail
          activeZone = 'nav';
          const rail = document.getElementById('tv-nav-rail');
          if (rail) rail.classList.add('expanded');
        }
      } else if (dir === 'right') {
        const scroller = document.getElementById(`tv-scroller-${currentRowIndex}`);
        const count = scroller ? scroller.children.length : 0;
        currentColIndex = Math.min(count - 1, currentColIndex + 1);
      }
      updateFocusUI();
      return;
    }

    if (activeZone === 'search-bar') {
      if (dir === 'down') {
        activeZone = 'keyboard';
        keyboardRow = 0;
        keyboardCol = 0;
      } else if (dir === 'left') {
        activeZone = 'nav';
        const rail = document.getElementById('tv-nav-rail');
        if (rail) rail.classList.add('expanded');
      }
      updateFocusUI();
      return;
    }

    if (activeZone === 'keyboard') {
      if (dir === 'up') {
        if (keyboardRow > 0) {
          keyboardRow--;
        } else {
          // Move up to Voice Search
          activeZone = 'search-bar';
          searchBarIndex = 1;
        }
      } else if (dir === 'down') {
        if (keyboardRow < 6) {
          keyboardRow++;
        } else {
          // Move from keyboard down to search results
          const results = document.getElementById('tv-search-results-grid');
          if (results && results.children.length) {
            activeZone = 'results';
            currentColIndex = 0;
          }
        }
      } else if (dir === 'left') {
        if (keyboardCol > 0) {
          keyboardCol--;
        } else {
          // Left edge of keyboard -> move to nav rail
          activeZone = 'nav';
          const rail = document.getElementById('tv-nav-rail');
          if (rail) rail.classList.add('expanded');
        }
      } else if (dir === 'right') {
        const maxCol = keyboardRow === 6 ? 2 : 5;
        keyboardCol = Math.min(maxCol, keyboardCol + 1);
      }
      updateFocusUI();
      return;
    }

    if (activeZone === 'results') {
      const results = document.getElementById('tv-search-results-grid');
      const cards = results ? Array.from(results.children) : [];
      if (!cards.length) return;

      if (dir === 'up') {
        activeZone = 'keyboard';
        keyboardRow = 6;
        keyboardCol = 0;
      } else if (dir === 'left') {
        if (currentColIndex > 0) {
          currentColIndex--;
        } else {
          activeZone = 'nav';
          const rail = document.getElementById('tv-nav-rail');
          if (rail) rail.classList.add('expanded');
        }
      } else if (dir === 'right') {
        currentColIndex = Math.min(cards.length - 1, currentColIndex + 1);
      }
      updateFocusUI();
    }
  }

  // =========================================================================
  // MODAL NAVIGATION (Servers, Actions, Seasons, Episodes)
  // =========================================================================
  function navigateModal(dir) {
    const isSeries = selectedModalItem && selectedModalItem.type === 'series';
    const seasonsContainer = document.getElementById('tv-details-seasons');
    const seasonChipsCount = seasonsContainer ? seasonsContainer.children.length : 0;
    const epScroller = document.getElementById('tv-episodes-scroller');
    const epCardsCount = epScroller ? epScroller.children.length : 0;

    if (dir === 'up') {
      if (modalSubZone === 'episodes') {
        modalSubZone = seasonChipsCount > 0 ? 'seasons' : 'actions';
      } else if (modalSubZone === 'seasons') {
        modalSubZone = 'actions';
      } else if (modalSubZone === 'actions') {
        modalSubZone = 'servers';
      }
    } else if (dir === 'down') {
      if (modalSubZone === 'servers') {
        modalSubZone = 'actions';
      } else if (modalSubZone === 'actions') {
        if (isSeries) {
          modalSubZone = seasonChipsCount > 0 ? 'seasons' : 'episodes';
        }
      } else if (modalSubZone === 'seasons') {
        if (epCardsCount > 0) modalSubZone = 'episodes';
      }
    } else if (dir === 'left') {
      if (modalSubZone === 'servers') {
        modalServerIdx = Math.max(0, modalServerIdx - 1);
      } else if (modalSubZone === 'actions') {
        modalActionIdx = Math.max(0, modalActionIdx - 1);
      } else if (modalSubZone === 'seasons') {
        modalSeasonIdx = Math.max(0, modalSeasonIdx - 1);
      } else if (modalSubZone === 'episodes') {
        modalEpIdx = Math.max(0, modalEpIdx - 1);
      }
    } else if (dir === 'right') {
      if (modalSubZone === 'servers') {
        modalServerIdx = Math.min(STREAM_SERVERS.length - 1, modalServerIdx + 1);
      } else if (modalSubZone === 'actions') {
        modalActionIdx = Math.min(1, modalActionIdx + 1);
      } else if (modalSubZone === 'seasons') {
        modalSeasonIdx = Math.min(seasonChipsCount - 1, modalSeasonIdx + 1);
      } else if (modalSubZone === 'episodes') {
        modalEpIdx = Math.min(epCardsCount - 1, modalEpIdx + 1);
      }
    }

    updateFocusUI();
  }

  // =========================================================================
  // PLAYER HUD NAVIGATION
  // =========================================================================
  function navigatePlayerHud(dir) {
    if (dir === 'up') {
      playerSubZone = 'back';
    } else if (dir === 'down') {
      playerSubZone = 'servers';
    } else if (dir === 'left') {
      if (playerSubZone === 'servers') {
        playerServerIdx = Math.max(0, playerServerIdx - 1);
      } else if (playerSubZone === 'episodes') {
        playerEpAction = 0; // Prev Ep
      }
    } else if (dir === 'right') {
      if (playerSubZone === 'servers') {
        if (playerServerIdx < STREAM_SERVERS.length - 1) {
          playerServerIdx++;
        } else if (selectedModalItem && selectedModalItem.type === 'series') {
          playerSubZone = 'episodes';
          playerEpAction = 1; // Next Ep
        }
      }
    }

    updateFocusUI();
  }

  // =========================================================================
  // EXECUTE CURRENT SELECTION (OK / ENTER)
  // =========================================================================
  function executeCurrentSelection() {
    if (isPlayerActive) {
      if (playerSubZone === 'back') {
        closePlayer();
        return;
      }
      if (playerSubZone === 'servers') {
        switchPlayerServer(playerServerIdx);
        return;
      }
      if (playerSubZone === 'episodes') {
        switchPlayerEpisode(playerEpAction === 0 ? -1 : 1);
        return;
      }
      return;
    }

    if (activeZone === 'modal') {
      if (modalSubZone === 'servers') {
        selectedModalServer = modalServerIdx;
        const chip = document.getElementById(`tv-modal-server-${modalServerIdx}`);
        if (chip) {
          document.querySelectorAll('.tv-server-chip').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
        }
      } else if (modalSubZone === 'actions') {
        if (modalActionIdx === 0) {
          startPlayback(selectedModalItem, selectedModalSeason, selectedModalEpisode, selectedModalServer);
        } else {
          closeDetailsModal();
        }
      } else if (modalSubZone === 'seasons') {
        const seasonChip = document.getElementById(`tv-modal-season-${modalSeasonIdx}`);
        if (seasonChip) seasonChip.click();
      } else if (modalSubZone === 'episodes') {
        const epCard = document.getElementById(`tv-modal-ep-${modalEpIdx}`);
        if (epCard) epCard.click();
      }
      return;
    }

    if (activeZone === 'nav') {
      const navItems = ['search', 'home', 'movies', 'series', 'ott'];
      switchTab(navItems[navIndex]);
      return;
    }

    if (activeZone === 'hero') {
      const items = getSpotlightItems();
      const item = items[currentSpotlightIndex % items.length];
      if (!item) return;

      if (heroBtnIndex === 0) {
        startPlayback(item, 1, 1, 0);
      } else if (heroBtnIndex === 1) {
        openDetailsModal(item);
      } else {
        alert(`Added ${item.title} to Watchlist`);
      }
      return;
    }

    if (activeZone === 'rows') {
      const scroller = document.getElementById(`tv-scroller-${currentRowIndex}`);
      if (!scroller || !scroller.children[currentColIndex]) return;
      const card = scroller.children[currentColIndex];
      card.click();
      return;
    }

    if (activeZone === 'search-bar') {
      onVoiceSearch();
      return;
    }

    if (activeZone === 'keyboard') {
      const selector = `.tv-key-btn[data-k-row="${keyboardRow}"][data-k-col="${keyboardCol}"], .tv-key-action[data-k-row="${keyboardRow}"][data-k-col="${keyboardCol}"]`;
      const btn = document.querySelector(selector);
      if (btn) btn.click();
      return;
    }

    if (activeZone === 'results') {
      const results = document.getElementById('tv-search-results-grid');
      if (!results || !results.children[currentColIndex]) return;
      results.children[currentColIndex].click();
      return;
    }
  }

  // =========================================================================
  // UPDATE VISUAL FOCUS HALO UI
  // =========================================================================
  function updateFocusUI() {
    // Clear all previous focus classes
    document.querySelectorAll('.tv-focused').forEach(el => el.classList.remove('tv-focused'));

    if (isPlayerActive) {
      if (playerSubZone === 'back') {
        const backBtn = document.getElementById('tv-player-btn-back');
        if (backBtn) backBtn.classList.add('tv-focused');
      } else if (playerSubZone === 'servers') {
        const chip = document.getElementById(`tv-player-server-${playerServerIdx}`);
        if (chip) chip.classList.add('tv-focused');
      } else if (playerSubZone === 'episodes') {
        const btn = document.getElementById(playerEpAction === 0 ? 'tv-player-btn-prev-ep' : 'tv-player-btn-next-ep');
        if (btn) btn.classList.add('tv-focused');
      }
      return;
    }

    if (activeZone === 'modal') {
      if (modalSubZone === 'servers') {
        const chip = document.getElementById(`tv-modal-server-${modalServerIdx}`);
        if (chip) {
          chip.classList.add('tv-focused');
          chip.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      } else if (modalSubZone === 'actions') {
        const btnId = modalActionIdx === 0 ? 'tv-modal-play-btn' : 'tv-modal-close-btn';
        const btn = document.getElementById(btnId);
        if (btn) btn.classList.add('tv-focused');
      } else if (modalSubZone === 'seasons') {
        const chip = document.getElementById(`tv-modal-season-${modalSeasonIdx}`);
        if (chip) {
          chip.classList.add('tv-focused');
          chip.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      } else if (modalSubZone === 'episodes') {
        const card = document.getElementById(`tv-modal-ep-${modalEpIdx}`);
        if (card) {
          card.classList.add('tv-focused');
          card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }
      return;
    }

    if (activeZone === 'nav') {
      const navLinks = document.querySelectorAll('.tv-nav-item');
      if (navLinks[navIndex]) {
        navLinks[navIndex].classList.add('tv-focused');
      }
      return;
    }

    if (activeZone === 'hero') {
      const buttons = [
        document.getElementById('tv-hero-btn-play'),
        document.getElementById('tv-hero-btn-info'),
        document.getElementById('tv-hero-btn-list')
      ];
      if (buttons[heroBtnIndex]) {
        buttons[heroBtnIndex].classList.add('tv-focused');
      }
      return;
    }

    if (activeZone === 'rows') {
      const scroller = document.getElementById(`tv-scroller-${currentRowIndex}`);
      if (!scroller) return;

      const card = scroller.children[currentColIndex];
      if (card) {
        card.classList.add('tv-focused');
        card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }

      const rowEl = document.getElementById(`tv-row-${currentRowIndex}`);
      if (rowEl) {
        rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    if (activeZone === 'search-bar') {
      const voiceBtn = document.getElementById('tv-btn-voice');
      if (voiceBtn) voiceBtn.classList.add('tv-focused');
      return;
    }

    if (activeZone === 'keyboard') {
      const selector = `.tv-key-btn[data-k-row="${keyboardRow}"][data-k-col="${keyboardCol}"], .tv-key-action[data-k-row="${keyboardRow}"][data-k-col="${keyboardCol}"]`;
      const btn = document.querySelector(selector);
      if (btn) {
        btn.classList.add('tv-focused');
      }
      return;
    }

    if (activeZone === 'results') {
      const results = document.getElementById('tv-search-results-grid');
      if (results && results.children[currentColIndex]) {
        const card = results.children[currentColIndex];
        card.classList.add('tv-focused');
        card.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }
    }
  }

  // Tab Switcher
  function switchTab(tab) {
    currentActiveTab = tab;
    const rail = document.getElementById('tv-nav-rail');
    if (rail) rail.classList.remove('expanded');

    document.querySelectorAll('.tv-nav-item').forEach(el => el.classList.remove('active'));
    const activeNavEl = document.querySelector(`.tv-nav-item[data-tab="${tab}"]`);
    if (activeNavEl) activeNavEl.classList.add('active');

    const heroSection = document.getElementById('tv-hero-spotlight');
    const rowsSection = document.getElementById('tv-rows-section');
    const searchSection = document.getElementById('tv-search-container');

    if (tab === 'search') {
      if (heroSection) heroSection.style.display = 'none';
      if (rowsSection) rowsSection.style.display = 'none';
      if (searchSection) searchSection.classList.add('active');
      activeZone = 'keyboard';
      keyboardRow = 0;
      keyboardCol = 0;
      updateFocusUI();
    } else {
      if (heroSection) heroSection.style.display = 'flex';
      if (rowsSection) rowsSection.style.display = 'flex';
      if (searchSection) searchSection.classList.remove('active');
      activeZone = 'hero';
      heroBtnIndex = 0;
      updateFocusUI();
    }
  }

  // Global exports
  window.openTvDetailsModal = openDetailsModal;
  window.closeTvDetailsModal = closeDetailsModal;
  window.startTvPlayback = startPlayback;
  window.closeTvPlayer = closePlayer;
  window.switchTvTab = switchTab;
  window.executeCurrentSelection = executeCurrentSelection;
})();
