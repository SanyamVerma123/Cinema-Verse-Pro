/**
 * CinemaVerse Pro — TMDb API Integration Engine
 * Official API Documentation: https://developer.themoviedb.org/reference/getting-started
 * 
 * Features:
 * - High-speed caching (in-memory + disk cache)
 * - Automatic image proxying to bypass Indian ISP blocks (Jio/Airtel)
 * - Single-request sub-resource expansion via append_to_response
 * - Official YouTube trailer resolution
 * - Real actor profile photos & character mappings
 * - India-specific content certification (U, UA, A) & watch providers
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const TMDB_API_KEY = process.env.TMDB_API_KEY || 'fe30ba97956d6c5afafc72b84941712d';
const TMDB_BASE_URL = process.env.TMDB_BASE_URL || 'https://api.tmdb.org/3';
const CACHE_DIR = path.join(__dirname, '..', '.cache', 'tmdb');

try {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
} catch (e) {}

const MEMORY_CACHE = new Map();
const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

function toProxyUrl(filePath, size = 'w500') {
  if (!filePath || typeof filePath !== 'string') return null;
  const cleanPath = filePath.replace(/^\/+/, '');
  return `/api/tmdb-image/${size}/${cleanPath}`;
}

async function fetchFromTmdb(endpointPath, queryParams = {}, ttlMs = DEFAULT_TTL_MS) {
  const params = { api_key: TMDB_API_KEY, ...queryParams };
  const queryStr = Object.entries(params)
    .filter(([_, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  const fullUrl = `${TMDB_BASE_URL}${endpointPath}?${queryStr}`;
  const cacheKey = crypto.createHash('sha256').update(fullUrl).digest('hex');

  // 1. In-memory Cache Check
  if (MEMORY_CACHE.has(cacheKey)) {
    const entry = MEMORY_CACHE.get(cacheKey);
    if (Date.now() - entry.timestamp < ttlMs) {
      return entry.data;
    }
  }

  // 2. Disk Cache Check
  const diskPath = path.join(CACHE_DIR, `${cacheKey}.json`);
  if (fs.existsSync(diskPath)) {
    try {
      const stat = fs.statSync(diskPath);
      if (Date.now() - stat.mtimeMs < ttlMs) {
        const cachedData = JSON.parse(fs.readFileSync(diskPath, 'utf8'));
        MEMORY_CACHE.set(cacheKey, { timestamp: stat.mtimeMs, data: cachedData });
        return cachedData;
      }
    } catch (e) {}
  }

  // 3. Network Request to TMDb API
  return new Promise((resolve, reject) => {
    https.get(fullUrl, { headers: { 'Accept': 'application/json' } }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const data = JSON.parse(body);
            MEMORY_CACHE.set(cacheKey, { timestamp: Date.now(), data });
            try {
              fs.writeFileSync(diskPath, JSON.stringify(data), 'utf8');
            } catch (err) {}
            resolve(data);
          } catch (parseErr) {
            reject(new Error(`TMDb JSON parse error: ${parseErr.message}`));
          }
        } else {
          reject(new Error(`TMDb API responded with ${res.statusCode}: ${body.slice(0, 100)}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Extracts Indian or US content maturity certification
 */
function extractCertification(details, isTv) {
  if (isTv) {
    const ratings = details.content_ratings && details.content_ratings.results;
    if (Array.isArray(ratings)) {
      const inRating = ratings.find(r => r.iso_3166_1 === 'IN');
      if (inRating && inRating.rating) return inRating.rating;
      const usRating = ratings.find(r => r.iso_3166_1 === 'US');
      if (usRating && usRating.rating) return usRating.rating;
      const gbRating = ratings.find(r => r.iso_3166_1 === 'GB');
      if (gbRating && gbRating.rating) return gbRating.rating;
    }
    return '16+';
  } else {
    const releases = details.release_dates && details.release_dates.results;
    if (Array.isArray(releases)) {
      const inRelease = releases.find(r => r.iso_3166_1 === 'IN');
      if (inRelease && Array.isArray(inRelease.release_dates)) {
        const cert = inRelease.release_dates.find(d => d.certification);
        if (cert && cert.certification) return cert.certification;
      }
      const usRelease = releases.find(r => r.iso_3166_1 === 'US');
      if (usRelease && Array.isArray(usRelease.release_dates)) {
        const cert = usRelease.release_dates.find(d => d.certification);
        if (cert && cert.certification) return cert.certification;
      }
    }
    return 'UA';
  }
}

/**
 * Extracts the best official trailer
 */
function extractBestTrailer(details) {
  const videos = details.videos && details.videos.results;
  if (!Array.isArray(videos) || videos.length === 0) return null;

  // Filter YouTube videos
  const ytVideos = videos.filter(v => v.site === 'YouTube' && v.key);
  if (ytVideos.length === 0) return null;

  // Priority: 1) Official Trailer, 2) Any Trailer, 3) Teaser, 4) First video
  const officialTrailer = ytVideos.find(v => v.type === 'Trailer' && v.official)
    || ytVideos.find(v => v.type === 'Trailer')
    || ytVideos.find(v => v.type === 'Teaser')
    || ytVideos[0];

  if (!officialTrailer) return null;

  return {
    id: officialTrailer.key,
    title: officialTrailer.name || 'Official Trailer',
    url: `https://www.youtube.com/watch?v=${officialTrailer.key}`,
    embedUrl: `https://www.youtube-nocookie.com/embed/${officialTrailer.key}?autoplay=1&rel=0&modestbranding=1`,
    type: officialTrailer.type
  };
}

/**
 * Extracts official transparent title logo
 */
function extractTitleLogo(details) {
  const logos = details.images && details.images.logos;
  if (!Array.isArray(logos) || logos.length === 0) return null;

  const enLogo = logos.find(l => l.iso_639_1 === 'en') || logos[0];
  if (!enLogo || !enLogo.file_path) return null;

  return toProxyUrl(enLogo.file_path, 'w500');
}

/**
 * Extracts formatted cast with photos
 */
function extractCast(details, limit = 12) {
  const castList = details.credits && details.credits.cast;
  if (!Array.isArray(castList)) return [];

  return castList.slice(0, limit).map(c => ({
    id: c.id,
    name: c.name,
    character: c.character || 'Cast',
    photo: c.profile_path ? toProxyUrl(c.profile_path, 'w185') : null
  }));
}

/**
 * Extracts watch providers for streaming
 */
function extractWatchProviders(details) {
  const results = details['watch/providers'] && details['watch/providers'].results;
  if (!results) return [];

  const inProviders = results.IN || results.US || {};
  const flatrate = inProviders.flatrate || [];

  return flatrate.map(p => ({
    name: p.provider_name,
    id: p.provider_id,
    logo: toProxyUrl(p.logo_path, 'w92')
  }));
}

/**
 * Formats currency values (e.g. 165000000 -> "$165M")
 */
function formatCurrency(num) {
  if (!num || isNaN(num) || num <= 0) return null;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(0)}K`;
  return `$${Number(num).toLocaleString()}`;
}

/**
 * Extracts all video clips (trailers, teasers, behind-the-scenes, featurettes)
 */
function extractAllClips(details, limit = 10) {
  const videos = details.videos && details.videos.results;
  if (!Array.isArray(videos)) return [];
  const ytVideos = videos.filter(v => v.site === 'YouTube' && v.key);
  return ytVideos.slice(0, limit).map(v => ({
    id: v.key,
    name: v.name || 'Video Clip',
    type: v.type || 'Clip',
    official: !!v.official,
    publishedAt: v.published_at || '',
    thumbnail: `https://img.youtube.com/vi/${v.key}/mqdefault.jpg`,
    embedUrl: `https://www.youtube-nocookie.com/embed/${v.key}?autoplay=1&rel=0&modestbranding=1`,
    url: `https://www.youtube.com/watch?v=${v.key}`
  }));
}

/**
 * Formats full enriched metadata payload
 */
function formatEnrichedPayload(details, isTv) {
  const title = isTv ? (details.name || details.original_name) : (details.title || details.original_title);
  const releaseDate = isTv ? details.first_air_date : details.release_date;
  const year = releaseDate ? new Date(releaseDate).getFullYear() : (isTv ? 2024 : 2024);
  const duration = isTv 
    ? `${details.number_of_seasons || 1} Season${(details.number_of_seasons || 1) > 1 ? 's' : ''}`
    : (details.runtime ? `${Math.floor(details.runtime / 60)}h ${details.runtime % 60}m` : '2h');

  // Directors & Creators
  let directors = [];
  if (isTv) {
    if (Array.isArray(details.created_by)) {
      directors = details.created_by.map(c => c.name);
    }
  } else {
    if (details.credits && Array.isArray(details.credits.crew)) {
      directors = details.credits.crew.filter(c => c.job === 'Director').map(c => c.name);
    }
  }

  // Recommendations
  const recs = (details.recommendations && details.recommendations.results) || [];
  const formattedRecs = recs.slice(0, 10).map(r => ({
    id: r.id,
    tmdbId: r.id,
    title: isTv ? (r.name || r.original_name) : (r.title || r.original_title),
    type: isTv ? 'series' : 'movie',
    poster: toProxyUrl(r.poster_path, 'w500'),
    backdrop: toProxyUrl(r.backdrop_path, 'w1280'),
    rating: r.vote_average ? Number(r.vote_average.toFixed(1)) : 8.0,
    matchRate: `${Math.round((r.vote_average || 8.0) * 10)}% Match`
  }));

  const keywords = ((details.keywords && (details.keywords.keywords || details.keywords.results)) || []).map(k => k.name);

  return {
    status: 'success',
    id: details.id,
    tmdbId: details.id,
    imdbId: (details.external_ids && details.external_ids.imdb_id) || details.imdb_id || null,
    type: isTv ? 'series' : 'movie',
    title,
    tagline: details.tagline || '',
    overview: details.overview || '',
    year,
    duration,
    rating: details.vote_average ? Number(details.vote_average.toFixed(1)) : 8.5,
    voteCount: details.vote_count || 0,
    certification: extractCertification(details, isTv),
    genres: (details.genres || []).map(g => g.name),
    keywords,
    budget: details.budget || null,
    budgetFormatted: formatCurrency(details.budget),
    revenue: details.revenue || null,
    revenueFormatted: formatCurrency(details.revenue),
    statusName: details.status || 'Released',
    poster: toProxyUrl(details.poster_path, 'w500'),
    backdrop: toProxyUrl(details.backdrop_path, 'w1280'),
    logo: extractTitleLogo(details),
    trailer: extractBestTrailer(details),
    clips: extractAllClips(details, 10),
    cast: extractCast(details, 12),
    directors,
    watchProviders: extractWatchProviders(details),
    recommendations: formattedRecs,
    numberOfSeasons: isTv ? (details.number_of_seasons || 1) : null,
    numberOfEpisodes: isTv ? (details.number_of_episodes || 1) : null,
    rawDetails: details
  };
}

// ========================================================
// PUBLIC API METHODS
// ========================================================

async function getMovieDetails(id) {
  const details = await fetchFromTmdb(`/movie/${id}`, {
    append_to_response: 'credits,videos,recommendations,similar,images,release_dates,watch/providers,external_ids,keywords'
  });
  return formatEnrichedPayload(details, false);
}

async function getTvDetails(id) {
  const details = await fetchFromTmdb(`/tv/${id}`, {
    append_to_response: 'credits,videos,recommendations,similar,images,content_ratings,watch/providers,external_ids,aggregate_credits,keywords'
  });
  return formatEnrichedPayload(details, true);
}

async function getTvSeason(tvId, seasonNumber) {
  const raw = await fetchFromTmdb(`/tv/${tvId}/season/${seasonNumber}`);
  const episodes = (raw.episodes || []).map(ep => ({
    episode: ep.episode_number,
    title: ep.name || `Episode ${ep.episode_number}`,
    overview: ep.overview || 'Watch now in 4K Ultra HD with multi-audio.',
    duration: ep.runtime ? `${ep.runtime}m` : '48m',
    airDate: ep.air_date || '',
    rating: ep.vote_average ? Number(ep.vote_average.toFixed(1)) : null,
    thumbnail: toProxyUrl(ep.still_path, 'w500')
  }));

  return {
    status: 'success',
    tvId,
    seasonNumber: raw.season_number,
    name: raw.name || `Season ${seasonNumber}`,
    overview: raw.overview || '',
    episodes
  };
}

async function getTrending(timeWindow = 'week') {
  const raw = await fetchFromTmdb(`/trending/all/${timeWindow}`, {}, 1000 * 60 * 60 * 6); // 6 hour TTL
  const items = (raw.results || []).map(item => {
    const isTv = item.media_type === 'tv';
    return {
      id: item.id,
      tmdbId: item.id,
      title: isTv ? (item.name || item.original_name) : (item.title || item.original_title),
      type: isTv ? 'series' : 'movie',
      year: (item.first_air_date || item.release_date || '2024').slice(0, 4),
      rating: item.vote_average ? Number(item.vote_average.toFixed(1)) : 8.0,
      matchRate: `${Math.round((item.vote_average || 8.0) * 10)}% Match`,
      poster: toProxyUrl(item.poster_path, 'w500'),
      backdrop: toProxyUrl(item.backdrop_path, 'w1280'),
      overview: item.overview || ''
    };
  });
  return { status: 'success', total: items.length, data: items };
}

async function searchMulti(query) {
  if (!query || typeof query !== 'string') return { status: 'success', data: [] };
  const raw = await fetchFromTmdb('/search/multi', {
    query: query.trim(),
    include_adult: false
  }, 1000 * 60 * 30); // 30 min TTL

  const results = (raw.results || []).map(r => {
    const isTv = r.media_type === 'tv';
    const isPerson = r.media_type === 'person';
    return {
      id: r.id,
      tmdbId: r.id,
      title: isPerson ? r.name : (isTv ? (r.name || r.original_name) : (r.title || r.original_title)),
      type: isPerson ? 'person' : (isTv ? 'series' : 'movie'),
      year: !isPerson ? (r.first_air_date || r.release_date || '').slice(0, 4) : null,
      rating: r.vote_average ? Number(r.vote_average.toFixed(1)) : null,
      poster: toProxyUrl(isPerson ? r.profile_path : r.poster_path, 'w500'),
      backdrop: toProxyUrl(r.backdrop_path, 'w1280'),
      knownFor: isPerson && Array.isArray(r.known_for) ? r.known_for.map(k => k.title || k.name).join(', ') : null
    };
  });

  return { status: 'success', total: results.length, data: results };
}

async function findByImdb(imdbId) {
  if (!imdbId) return null;
  const raw = await fetchFromTmdb(`/find/${imdbId}`, { external_source: 'imdb_id' });
  const movie = raw.movie_results && raw.movie_results[0];
  const tv = raw.tv_results && raw.tv_results[0];
  if (movie) return { ...movie, media_type: 'movie' };
  if (tv) return { ...tv, media_type: 'tv' };
  return null;
}

/**
 * Fetches comprehensive person / artist details, biography and full filmography
 */
async function getPersonDetails(personId) {
  const details = await fetchFromTmdb(`/person/${personId}`, {
    append_to_response: 'combined_credits,images,external_ids'
  });

  const rawCredits = (details.combined_credits && details.combined_credits.cast) || [];
  
  // Deduplicate and rank credits
  const seen = new Set();
  const credits = [];
  for (const c of rawCredits) {
    if (!c.id || seen.has(c.id)) continue;
    seen.add(c.id);
    const isTv = c.media_type === 'tv';
    const charLower = (c.character || '').toLowerCase();
    const isSelf = charLower === 'self' || charLower.startsWith('self -') || charLower.includes('talk show');
    const isTalkOrReality = Array.isArray(c.genre_ids) && (c.genre_ids.includes(10767) || c.genre_ids.includes(10764));
    
    // Weight calculation: real narrative movie and series roles ranked highest
    let weight = (c.vote_count || 0) + ((c.popularity || 0) * 15);
    if (isSelf || isTalkOrReality) {
      weight *= 0.05;
    } else if (c.media_type === 'movie') {
      weight *= 1.3;
    }

    credits.push({
      id: c.id,
      tmdbId: c.id,
      title: isTv ? (c.name || c.original_name) : (c.title || c.original_title),
      character: c.character || 'Cast',
      type: isTv ? 'series' : 'movie',
      year: (c.first_air_date || c.release_date || '').slice(0, 4),
      rating: c.vote_average ? Number(c.vote_average.toFixed(1)) : null,
      matchRate: c.vote_average ? `${Math.round(c.vote_average * 10)}% Match` : null,
      poster: toProxyUrl(c.poster_path, 'w500'),
      backdrop: toProxyUrl(c.backdrop_path, 'w1280'),
      popularity: c.popularity || 0,
      voteCount: c.vote_count || 0,
      _weight: weight
    });
  }

  // Sort by weight descending so iconic movies appear first
  credits.sort((a, b) => b._weight - a._weight);

  return {
    status: 'success',
    id: details.id,
    name: details.name,
    biography: details.biography || '',
    birthday: details.birthday || null,
    deathday: details.deathday || null,
    placeOfBirth: details.place_of_birth || null,
    knownForDepartment: details.known_for_department || 'Acting',
    photo: toProxyUrl(details.profile_path, 'h632'),
    photoThumb: toProxyUrl(details.profile_path, 'w185'),
    imdbId: (details.external_ids && details.external_ids.imdb_id) || null,
    filmography: credits.slice(0, 60)
  };
}

/**
 * Dedicated artist / person search
 */
async function searchPerson(query) {
  if (!query || typeof query !== 'string') return { status: 'success', total: 0, data: [] };
  const raw = await fetchFromTmdb('/search/person', {
    query: query.trim(),
    include_adult: false
  }, 1000 * 60 * 30);

  const results = (raw.results || []).map(p => ({
    id: p.id,
    name: p.name,
    photo: toProxyUrl(p.profile_path, 'w185'),
    knownForDepartment: p.known_for_department || 'Acting',
    knownFor: (p.known_for || []).map(k => ({
      id: k.id,
      title: k.media_type === 'tv' ? (k.name || k.original_name) : (k.title || k.original_title),
      type: k.media_type === 'tv' ? 'series' : 'movie',
      year: (k.first_air_date || k.release_date || '').slice(0, 4),
      poster: toProxyUrl(k.poster_path, 'w500')
    }))
  }));

  return { status: 'success', total: results.length, data: results };
}

module.exports = {
  TMDB_API_KEY,
  TMDB_BASE_URL,
  toProxyUrl,
  fetchFromTmdb,
  getMovieDetails,
  getTvDetails,
  getTvSeason,
  getTrending,
  searchMulti,
  findByImdb,
  getPersonDetails,
  searchPerson
};
