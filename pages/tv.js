import Head from 'next/head';
import Script from 'next/script';

export default function TvPage({ initialCatalog }) {
  return (
    <>
      <Head>
        <title>CinemaVerse TV — 4K Ultra HD Universal Streaming Hub</title>
        <meta name="description" content="CinemaVerse Smart TV Edition — Ultra-fast 4K streaming across 13 OTT platforms with 100% remote D-Pad navigation." />
        <meta name="viewport" content="width=1920, initial-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
        <link rel="stylesheet" href="/tv.css" />
      </Head>

      <div className="tv-ambient-glow" />

      <div className="tv-app-container">
        {/* Left Navigation Rail */}
        <nav className="tv-nav-rail" id="tv-nav-rail">
          <div className="tv-nav-logo">
            <div className="tv-nav-logo-icon">C</div>
            <span className="tv-nav-logo-text">CINEMAVERSE</span>
          </div>

          <div className="tv-nav-items">
            <button type="button" className="tv-nav-item" data-tab="search" id="tv-nav-search">
              <i className="fa-solid fa-magnifying-glass" />
              <span>Search</span>
            </button>
            <button type="button" className="tv-nav-item active" data-tab="home" id="tv-nav-home">
              <i className="fa-solid fa-house" />
              <span>Home</span>
            </button>
            <button type="button" className="tv-nav-item" data-tab="movies" id="tv-nav-movies">
              <i className="fa-solid fa-film" />
              <span>Movies</span>
            </button>
            <button type="button" className="tv-nav-item" data-tab="series" id="tv-nav-series">
              <i className="fa-solid fa-tv" />
              <span>TV Series</span>
            </button>
            <button type="button" className="tv-nav-item" data-tab="ott" id="tv-nav-ott">
              <i className="fa-solid fa-layer-group" />
              <span>OTT Hub</span>
            </button>
          </div>

          <div className="tv-nav-bottom">
            <div className="tv-nav-item" style={{ opacity: 0.6 }}>
              <i className="fa-solid fa-shield-halved" />
              <span>Ad-Free VIP</span>
            </div>
          </div>
        </nav>

        {/* Main Content Area */}
        <main className="tv-main-content">
          {/* Spotlight Hero Section */}
          <section className="tv-hero-spotlight" id="tv-hero-spotlight">
            <img className="tv-hero-backdrop" id="tv-hero-backdrop" src="" alt="Hero Backdrop" />
            <div className="tv-hero-gradient" />

            <div className="tv-hero-details">
              <div className="tv-hero-badge-row">
                <span className="tv-ott-badge" id="tv-hero-ott">NETFLIX</span>
                <span className="tv-pill-meta text-gold" id="tv-hero-rating">
                  <i className="fa-solid fa-star" /> 9.1
                </span>
                <span className="tv-pill-meta text-green" id="tv-hero-match">99% Match</span>
                <span className="tv-pill-meta" id="tv-hero-year">2024</span>
                <span className="tv-pill-meta" id="tv-hero-quality">4K Ultra HD</span>
              </div>

              <h1 className="tv-hero-title" id="tv-hero-title">CinemaVerse</h1>
              <p className="tv-hero-desc" id="tv-hero-desc">
                Stream over 1,300+ blockbuster movies and TV series across Netflix, Prime Video, Disney+, HBO Max, and Apple TV+ in 4K with zero ads.
              </p>

              <div className="tv-hero-actions">
                <button type="button" className="tv-btn tv-btn-primary" id="tv-hero-btn-play">
                  <i className="fa-solid fa-play" /> Watch Now
                </button>
                <button type="button" className="tv-btn tv-btn-secondary" id="tv-hero-btn-info">
                  <i className="fa-solid fa-circle-info" /> More Info
                </button>
                <button type="button" className="tv-btn tv-btn-secondary" id="tv-hero-btn-list">
                  <i className="fa-solid fa-plus" /> Watchlist
                </button>
              </div>
            </div>
          </section>

          {/* Continuous TV Content Rows Container */}
          <section className="tv-rows-section" id="tv-rows-section">
            <div id="tv-rows-container" />
          </section>

          {/* On-Screen Keyboard Search View */}
          <section className="tv-search-container" id="tv-search-container">
            <div className="tv-search-header">
              <div className="tv-search-bar">
                <i className="fa-solid fa-magnifying-glass" />
                <span className="tv-search-query-text" id="tv-search-query-text">
                  Search movies, TV shows, actors, or genres...
                </span>
                <span className="tv-search-cursor" />
              </div>

              <button type="button" className="tv-btn-voice" id="tv-btn-voice">
                <i className="fa-solid fa-microphone" /> Voice Search
              </button>
            </div>

            {/* Virtual Leanback Keyboard Grid */}
            <div className="tv-keyboard-grid" id="tv-keyboard-grid" />
            <div className="tv-keyboard-actions" id="tv-keyboard-actions" />

            {/* Live Search Results */}
            <div className="tv-search-results-grid" id="tv-search-results-grid" />
          </section>
        </main>
      </div>

      {/* TV Details Modal */}
      <div className="tv-details-modal" id="tv-details-modal">
        <div className="tv-details-hero">
          <img className="tv-details-poster" id="tv-details-poster" src="" alt="Poster" />
          <div className="tv-details-info">
            <h2 className="tv-details-title" id="tv-details-title">Movie Title</h2>
            <div className="tv-details-meta" id="tv-details-meta" />
            <p className="tv-details-desc" id="tv-details-desc" />

            {/* Server Selector */}
            <div className="tv-server-picker-row">
              <span className="tv-server-picker-title">Streaming Mirror Servers (10 High-Speed Mirrors):</span>
              <div className="tv-server-chips" id="tv-details-servers" />
            </div>

            <div style={{ display: 'flex', gap: '14px', marginTop: '14px' }}>
              <button type="button" className="tv-btn tv-btn-primary" id="tv-modal-play-btn" onClick={() => window.executeCurrentSelection && window.executeCurrentSelection()}>
                <i className="fa-solid fa-play" /> Play Stream (OK)
              </button>
              <button type="button" className="tv-btn tv-btn-secondary" id="tv-modal-close-btn" onClick={() => window.closeTvDetailsModal && window.closeTvDetailsModal()}>
                <i className="fa-solid fa-xmark" /> Close (Back)
              </button>
            </div>
          </div>
        </div>

        {/* TV Series Episode Grid & Seasons */}
        <div className="tv-episodes-section" id="tv-details-episodes">
          <div className="tv-seasons-row" id="tv-details-seasons-row">
            <span className="tv-server-picker-title">Seasons:</span>
            <div className="tv-season-chips" id="tv-details-seasons" />
          </div>
          <h3 className="tv-row-title" id="tv-episodes-heading">Episodes</h3>
          <div className="tv-episodes-scroller" id="tv-episodes-scroller" />
        </div>
      </div>

      {/* Fullscreen TV Video Player Overlay */}
      <div className="tv-player-overlay" id="tv-player-overlay">
        <iframe
          className="tv-player-iframe"
          id="tv-player-iframe"
          src="about:blank"
          allow="autoplay; fullscreen; encrypted-media"
          allowFullScreen
        />
        <div className="tv-player-hud" id="tv-player-hud">
          <div className="tv-player-hud-top">
            <span className="tv-player-hud-title" id="tv-player-hud-title">Title</span>
            <button type="button" className="tv-player-hud-btn" id="tv-player-btn-back" onClick={() => window.closeTvPlayer && window.closeTvPlayer()}>
              <i className="fa-solid fa-arrow-left" /> Back to CinemaVerse (Remote Back)
            </button>
          </div>
          <div className="tv-player-hud-bottom">
            <span className="tv-player-hud-label">Switch Server:</span>
            <div className="tv-player-server-chips" id="tv-player-server-chips" />
            <div className="tv-player-ep-controls" id="tv-player-ep-controls" style={{ display: 'none', gap: '8px' }}>
              <button type="button" className="tv-player-hud-btn" id="tv-player-btn-prev-ep">
                <i className="fa-solid fa-backward-step" /> Prev Ep
              </button>
              <button type="button" className="tv-player-hud-btn" id="tv-player-btn-next-ep">
                Next Ep <i className="fa-solid fa-forward-step" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Client-side Catalog & Engine */}
      <script
        dangerouslySetInnerHTML={{
          __html: `window.__TV_CATALOG__ = ${JSON.stringify(initialCatalog || [])};`
        }}
      />
      <Script src="/tv-engine.js" strategy="afterInteractive" onLoad={() => {
        if (window.initTvApp && window.__TV_CATALOG__) {
          window.initTvApp(window.__TV_CATALOG__);
        }
      }} />
    </>
  );
}

export async function getStaticProps() {
  let fullCatalog = [];
  try {
    fullCatalog = require('../catalog');
  } catch (err) {
    console.error('Failed to load catalog for TV page:', err);
  }

  // Lightweight 180KB initial TV payload for instant 60 FPS loading on low-power TV chips
  const featured = fullCatalog.filter(x => x.featured || x.trending || x.rank);
  const byPlat = {};
  fullCatalog.forEach(x => {
    byPlat[x.platformId] = byPlat[x.platformId] || [];
    if (byPlat[x.platformId].length < 20) byPlat[x.platformId].push(x);
  });
  const list = Array.from(new Set([...featured, ...Object.values(byPlat).flat()]));

  const compactCatalog = list.map(item => ({
    id: item.id || '',
    imdbId: item.imdbId || '',
    tmdbId: item.tmdbId || '',
    title: item.title || '',
    type: item.type || 'movie',
    year: item.year || 2024,
    rating: item.rating || 8.0,
    matchRate: item.matchRate || '99% Match',
    duration: item.duration || '2h',
    quality: item.quality || '4K Ultra HD',
    poster: item.poster || '',
    backdrop: item.backdrop || item.poster || '',
    platform: item.platform || 'Netflix',
    platformId: item.platformId || 'netflix',
    platformBadge: item.platformBadge || item.platform || 'NETFLIX',
    platformColor: item.platformColor || '#E50914',
    featured: !!item.featured,
    trending: !!item.trending,
    rank: item.rank || null,
    genres: (item.genres || []).slice(0, 3),
    description: (item.description || '').slice(0, 160)
  }));

  return {
    props: {
      initialCatalog: compactCatalog
    }
  };
}
