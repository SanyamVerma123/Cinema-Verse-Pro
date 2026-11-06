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
  let activeZone = 'hero'; // 'nav', 'hero', 'rows', 'keyboard', 'results', 'modal', 'player'
  let currentRowIndex = 0;
  let currentColIndex = 0;
  let navIndex = 1; // 0=Search, 1=Home, 2=Movies, 3=Series, 4=OTT
  let heroBtnIndex = 0; // 0=Watch Now, 1=Info, 2=Watchlist
  let keyboardRow = 0;
  let keyboardCol = 0;
  let searchQuery = '';
  let selectedModalItem = null;
  let selectedModalSeason = 1;
  let selectedModalEpisode = 1;
  let selectedModalServer = 0;
  let isPlayerActive = false;
  let playerHudTimer = null;

  // Mirror Streaming Servers (10 High-Speed Servers)
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

  // Keyboard Layout
  const KEYBOARD_KEYS = [
    ['A', 'B', 'C', 'D', 'E', 'F'],
    ['G', 'H', 'I', 'J', 'K', 'L'],
    ['M', 'N', 'O', 'P', 'Q', 'R'],
    ['S', 'T', 'U', 'V', 'W', 'X'],
    ['Y', 'Z', '0', '1', '2', '3'],
    ['4', '5', '6', '7', '8', '9'],
    ['SPACE', 'DELETE', 'CLEAR']
  ];

  // Platforms Config
  const OTT_PLATFORMS = [
    { id: 'netflix', name: 'Netflix', color: '#E50914' },
    { id: 'prime', name: 'Prime Video', color: '#00A8E1' },
    { id: 'disney', name: 'Disney+', color: '#0063E5' },
    { id: 'hbo', name: 'HBO Max', color: '#9933FF' },
    { id: 'apple', name: 'Apple TV+', color: '#A3A3A3' },
    { id: 'crunchyroll', name: 'Crunchyroll', color: '#F47521' },
    { id: 'paramount', name: 'Paramount+', color: '#0064FF' },
    { id: 'hulu', name: 'Hulu', color: '#1CE783' },
    { id: 'peacock', name: 'Peacock', color: '#000000' },
    { id: 'sonyliv', name: 'Sony LIV', color: '#0099FF' },
    { id: 'zee5', name: 'Zee5', color: '#8230C6' },
    { id: 'jiocinema', name: 'JioCinema', color: '#E5007D' },
    { id: 'animeworld', name: 'Anime World', color: '#FF3366' }
  ];

  // Initialize TV App
  window.initTvApp = function (catalog) {
    allCatalog = Array.isArray(catalog) ? catalog : (window.__TV_CATALOG__ || []);
    console.log(`[CinemaVerse TV] Loaded ${allCatalog.length} titles`);

    buildOnScreenKeyboard();
    renderSpotlightHero();
    renderAllContentRows();
    setupRemoteKeyEvents();

    // Start with Hero Play focused
    activeZone = 'hero';
    heroBtnIndex = 0;
    updateFocusUI();

    // Rotate Hero Spotlight every 8 seconds
    spotlightTimer = setInterval(nextSpotlight, 8000);

    // Asynchronously enrich with full 1,300+ catalog in background
    setTimeout(async () => {
      try {
        const res = await fetch('/api/catalog');
        const data = await res.json();
        if (Array.isArray(data) && data.length > allCatalog.length) {
          allCatalog = data;
          console.log(`[CinemaVerse TV] Enriched with full ${data.length} catalog in background`);
        }
      } catch (e) {
        console.warn('Background full catalog fetch skipped:', e);
      }
    }, 1500);
  };

  // =========================================================================
  // HERO SPOTLIGHT
  // =========================================================================
  function getSpotlightItems() {
    return allCatalog.filter(x => (x.backdrop || x.poster) && (x.featured || x.rating >= 8.0)).slice(0, 15);
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

    if (backdropEl) backdropEl.src = item.backdrop || item.poster || '';
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
          <span>${item.year || '2024'}</span> •
          <span>${item.type === 'series' ? 'Series' : (item.duration || 'Movie')}</span>
        </div>
      </div>
    `;

    card.onclick = () => openDetailsModal(item);
    return card;
  }

  // =========================================================================
  // ON-SCREEN KEYBOARD & SEARCH
  // =========================================================================
  function buildOnScreenKeyboard() {
    const gridEl = document.getElementById('tv-keyboard-grid');
    const actionsEl = document.getElementById('tv-keyboard-actions');
    if (!gridEl || !actionsEl) return;

    gridEl.innerHTML = '';
    actionsEl.innerHTML = '';

    // Standard letters & numbers
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

    // Special action keys
    const actions = [
      { text: 'SPACE', icon: 'fa-regular fa-square', action: () => onKeyTyped(' ') },
      { text: '⌫ DELETE', icon: 'fa-solid fa-delete-left', action: () => onDeleteKey() },
      { text: '✕ CLEAR', icon: 'fa-solid fa-trash', action: () => onClearKey() }
    ];

    actions.forEach((act, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tv-key-action';
      btn.dataset.kRow = 6;
      btn.dataset.kCol = idx;
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
    if (window.AndroidVoiceBridge && typeof window.AndroidVoiceBridge.startVoiceSearch === 'function') {
      window.AndroidVoiceBridge.startVoiceSearch();
    } else {
      alert('Press microphone button on your Smart TV Remote to speak');
    }
  }

  // Voice result bridge callback
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
  // TV DETAILS MODAL
  // =========================================================================
  function openDetailsModal(item) {
    selectedModalItem = item;
    selectedModalSeason = 1;
    selectedModalEpisode = 1;
    selectedModalServer = 0;

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
        chip.className = `tv-server-chip ${idx === 0 ? 'active' : ''}`;
        chip.id = `tv-server-btn-${idx}`;
        chip.dataset.serverIdx = idx;
        chip.textContent = srv.short;
        chip.onclick = () => {
          selectedModalServer = idx;
          document.querySelectorAll('.tv-server-chip').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
        };
        serversContainer.appendChild(chip);
      });
    }

    // Populate Episodes if Series
    if (episodesSection) {
      if (item.type === 'series') {
        episodesSection.style.display = 'block';
        const scroller = document.getElementById('tv-episodes-scroller');
        if (scroller) {
          scroller.innerHTML = '';
          const epCount = (item.episodes && item.episodes.length) || 12;
          for (let ep = 1; ep <= epCount; ep++) {
            const epCard = document.createElement('div');
            epCard.className = 'tv-episode-card';
            epCard.id = `tv-ep-${ep}`;
            epCard.dataset.epNum = ep;
            epCard.innerHTML = `
              <span style="font-size: 11px; color: var(--tv-text-muted);">Season 1</span>
              <strong style="font-size: 14px; color: #fff;">Episode ${ep}</strong>
              <span style="font-size: 11px; color: #22c55e;"><i class="fa-solid fa-play"></i> Ready</span>
            `;
            epCard.onclick = () => {
              selectedModalEpisode = ep;
              startPlayback(selectedModalItem, selectedModalSeason, selectedModalEpisode, selectedModalServer);
            };
            scroller.appendChild(epCard);
          }
        }
      } else {
        episodesSection.style.display = 'none';
      }
    }

    modal.classList.add('active');
    activeZone = 'modal';
    const playBtn = document.getElementById('tv-modal-play-btn');
    if (playBtn) {
      playBtn.focus();
      playBtn.classList.add('tv-focused');
    }
  }

  function closeDetailsModal() {
    const modal = document.getElementById('tv-details-modal');
    if (modal) modal.classList.remove('active');
    activeZone = 'rows';
    updateFocusUI();
  }

  // =========================================================================
  // FULLSCREEN TV VIDEO PLAYER
  // =========================================================================
  function startPlayback(item, season = 1, episode = 1, serverIndex = 0) {
    closeDetailsModal();
    isPlayerActive = true;
    activeZone = 'player';

    const overlay = document.getElementById('tv-player-overlay');
    const iframe = document.getElementById('tv-player-iframe');
    const titleEl = document.getElementById('tv-player-hud-title');

    if (!overlay || !iframe) return;

    const streamUrl = getStreamUrl(serverIndex, item, season, episode);
    console.log(`[CinemaVerse TV Player] Streaming from: ${streamUrl}`);

    iframe.src = streamUrl;
    if (titleEl) {
      titleEl.textContent = item.type === 'series'
        ? `${item.title} — S${season}:E${episode}`
        : item.title;
    }

    overlay.classList.add('active');
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
    }, 4000);
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
        showPlayerHudBriefly();
        return;
      }
      if (key === 'MediaRewind' || code === 227) {
        e.preventDefault();
        showPlayerHudBriefly();
        return;
      }

      // Handle Back Button (Remote Back, Escape, Backspace)
      if (key === 'Escape' || key === 'Backspace' || key === 'BrowserBack' || code === 27 || code === 8 || code === 4) {
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
        if (activeZone === 'keyboard' || activeZone === 'results') {
          e.preventDefault();
          switchTab('home');
          return;
        }
      }

      // Handle Directional D-Pad Navigation
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
        case ' ':
          e.preventDefault();
          executeCurrentSelection();
          break;
      }
    });
  }

  function navigateDpad(dir) {
    if (isPlayerActive) {
      showPlayerHudBriefly();
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

    if (activeZone === 'keyboard') {
      if (dir === 'up') {
        if (keyboardRow > 0) {
          keyboardRow--;
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
      return;
    }
  }

  function executeCurrentSelection() {
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
        // Watch Now
        startPlayback(item, 1, 1, 0);
      } else if (heroBtnIndex === 1) {
        // More Info
        openDetailsModal(item);
      } else {
        // Watchlist
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

    if (activeZone === 'modal') {
      startPlayback(selectedModalItem, selectedModalSeason, selectedModalEpisode, selectedModalServer);
      return;
    }
  }

  function updateFocusUI() {
    document.querySelectorAll('.tv-focused').forEach(el => el.classList.remove('tv-focused'));

    if (activeZone === 'nav') {
      const navLinks = document.querySelectorAll('.tv-nav-item');
      if (navLinks[navIndex]) {
        navLinks[navIndex].classList.add('tv-focused');
        navLinks[navIndex].focus();
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
        buttons[heroBtnIndex].focus();
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (activeZone === 'rows') {
      const scroller = document.getElementById(`tv-scroller-${currentRowIndex}`);
      if (!scroller) return;

      const card = scroller.children[currentColIndex];
      if (card) {
        card.classList.add('tv-focused');
        card.focus();

        // Smoothly center card horizontally within row
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });

        // Smoothly center row vertically on screen
        const rowEl = document.getElementById(`tv-row-${currentRowIndex}`);
        if (rowEl) {
          rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      return;
    }

    if (activeZone === 'keyboard') {
      const selector = `.tv-key-btn[data-k-row="${keyboardRow}"][data-k-col="${keyboardCol}"], .tv-key-action[data-k-row="${keyboardRow}"][data-k-col="${keyboardCol}"]`;
      const btn = document.querySelector(selector);
      if (btn) {
        btn.classList.add('tv-focused');
        btn.focus();
      }
      return;
    }

    if (activeZone === 'results') {
      const results = document.getElementById('tv-search-results-grid');
      if (results && results.children[currentColIndex]) {
        results.children[currentColIndex].classList.add('tv-focused');
        results.children[currentColIndex].focus();
        results.children[currentColIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      return;
    }
  }

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
})();
