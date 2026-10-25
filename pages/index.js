import fs from 'node:fs';
import path from 'node:path';
import Script from 'next/script';
import Head from 'next/head';

function getPageMarkup() {
  const htmlPath = path.join(process.cwd(), 'public', 'index.html');
  const document = fs.readFileSync(htmlPath, 'utf8');
  const body = document.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1];

  if (!body) throw new Error('The legacy page markup is missing its body element.');

  return body
    .replace(/<script\b[^>]*src=["']app\.js["'][^>]*><\/script>/i, '')
    .trim();
}

export default function Home({ pageMarkup, meta }) {
  const currentMeta = meta || {
    title: 'CinemaVerse — Universal Multi-OTT Streaming Hub (4K • Zero Ads)',
    description: 'Watch 1,300+ blockbuster movies and TV series across Netflix, Prime Video, Disney+, HBO Max, and Apple TV+ in 4K Ultra HD. 100% Free with zero ads.',
    image: 'https://images.metahub.space/background/medium/tt4574334/img',
    fallbackImage: 'https://images.metahub.space/poster/medium/tt4574334/img',
    type: 'website'
  };

  return (
    <>
      <Head>
        <title>{currentMeta.title}</title>
        <meta name="description" content={currentMeta.description} key="meta_desc" />

        {/* Canonical URL */}
        {currentMeta.url && <link rel="canonical" href={currentMeta.url} key="canonical_url" />}

        {/* Open Graph / WhatsApp / Facebook / Telegram */}
        <meta property="og:type" content={currentMeta.type || 'website'} key="og_type" />
        <meta property="og:site_name" content="CinemaVerse" key="og_site_name" />
        <meta property="og:title" content={currentMeta.title} key="og_title" />
        <meta property="og:description" content={currentMeta.description} key="og_desc" />
        {currentMeta.url && <meta property="og:url" content={currentMeta.url} key="og_url" />}
        {currentMeta.image && (
          <>
            <meta property="og:image" content={currentMeta.image} key="og_image" />
            <meta property="og:image:secure_url" content={currentMeta.image} key="og_image_secure" />
            <meta property="og:image:alt" content={currentMeta.title} key="og_image_alt" />
            <meta property="og:image:width" content="1200" key="og_image_w" />
            <meta property="og:image:height" content="675" key="og_image_h" />
          </>
        )}
        {currentMeta.fallbackImage && currentMeta.fallbackImage !== currentMeta.image && (
          <meta property="og:image" content={currentMeta.fallbackImage} key="og_image_fallback" />
        )}

        {/* Twitter / X Large Summary Card */}
        <meta name="twitter:card" content="summary_large_image" key="tw_card" />
        <meta name="twitter:site" content="@CinemaVerse" key="tw_site" />
        <meta name="twitter:title" content={currentMeta.title} key="tw_title" />
        <meta name="twitter:description" content={currentMeta.description} key="tw_desc" />
        {currentMeta.image && <meta name="twitter:image" content={currentMeta.image} key="tw_image" />}
        {currentMeta.image && <meta name="twitter:image:alt" content={currentMeta.title} key="tw_image_alt" />}
      </Head>
      <div dangerouslySetInnerHTML={{ __html: pageMarkup }} />
      <Script src="/app.js" strategy="afterInteractive" />
    </>
  );
}

export async function getServerSideProps(context) {
  const query = context.query || {};
  const watchId = (query.watch || query.v || query.id || query.movie || query.series || query.play || '').trim();
  const seasonNum = parseInt(query.s || query.season, 10) || 1;
  const episodeNum = parseInt(query.e || query.ep || query.episode, 10) || 1;

  const proto = context.req.headers['x-forwarded-proto'] || 'http';
  const host = context.req.headers['x-forwarded-host'] || context.req.headers.host || 'localhost:3000';
  const baseUrl = `${proto}://${host}`;

  let catalog = [];
  try {
    catalog = require('../catalog');
  } catch (e) {
    console.error('Failed to load catalog in getServerSideProps:', e);
  }

  let item = null;
  if (watchId) {
    const clean = watchId.toLowerCase();
    item = catalog.find(x => x.id && String(x.id).toLowerCase() === clean) ||
           catalog.find(x => x.imdbId && String(x.imdbId).toLowerCase() === clean) ||
           catalog.find(x => x.tmdbId && String(x.tmdbId) === clean) ||
           catalog.find(x => {
             if (!x.title) return false;
             const slug = x.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
             return slug === clean || x.title.toLowerCase() === clean;
           });

    // Fallback for external IMDb IDs not preloaded in catalog
    if (!item && /^tt\d+$/i.test(watchId)) {
      try {
        const metaRes = await Promise.race([
          fetch(`https://v3-cinemeta.strem.io/meta/series/${watchId}.json`, { signal: AbortSignal.timeout(1500) }).then(r => r.json()),
          fetch(`https://v3-cinemeta.strem.io/meta/movie/${watchId}.json`, { signal: AbortSignal.timeout(1500) }).then(r => r.json())
        ]);
        const meta = metaRes?.meta;
        if (meta) {
          item = {
            id: watchId,
            imdbId: watchId,
            title: meta.name || 'Shared Title',
            year: parseInt(meta.year, 10) || 2024,
            type: meta.type || 'movie',
            poster: meta.poster,
            backdrop: meta.background || meta.poster,
            description: meta.description
          };
        }
      } catch (e) {
        // Cinemeta timeout or network error fallback
      }
    }
  }

  let meta = null;
  if (item) {
    const isTv = item.type === 'series';
    let epTitle = null;
    let epDesc = null;
    let epThumbnail = null;

    if (isTv && item.seasons) {
      const sObj = item.seasons.find(s => s.season === seasonNum);
      if (sObj && sObj.episodes) {
        const eObj = sObj.episodes.find(e => e.episode === episodeNum);
        if (eObj) {
          epTitle = eObj.title;
          epDesc = eObj.description;
          epThumbnail = eObj.thumbnail;
        }
      }
    }

    const title = isTv
      ? `${item.title} — S${seasonNum}:E${episodeNum}${epTitle ? ` "${epTitle}"` : ''} | CinemaVerse`
      : `Watch ${item.title} (${item.year || 2026}) in 4K Ultra HD | CinemaVerse`;

    const description = (epDesc || item.description || `Watch "${item.title}" in 4K Ultra HD with Dolby Atmos audio.`) +
      ` • 100% Free with zero ads on CinemaVerse Pro.`;

    // WhatsApp, Twitter, Telegram, and Discord link previews perform best with 16:9 widescreen backdrop or episode thumbnail!
    const mainImage = epThumbnail || item.backdrop || item.poster;
    const fallbackImage = item.poster || item.backdrop;

    const url = isTv
      ? `${baseUrl}/?watch=${encodeURIComponent(item.id || item.imdbId || watchId)}&s=${seasonNum}&e=${episodeNum}`
      : `${baseUrl}/?watch=${encodeURIComponent(item.id || item.imdbId || watchId)}`;

    meta = {
      title,
      description,
      image: mainImage,
      fallbackImage,
      url,
      type: isTv ? 'video.tv_show' : 'video.movie'
    };
  } else {
    // Default Home Preview Card
    meta = {
      title: 'CinemaVerse — Universal Multi-OTT Streaming Hub (4K • Zero Ads)',
      description: 'Watch 1,300+ blockbuster movies and TV series across Netflix, Prime Video, Disney+, HBO Max, and Apple TV+ in 4K Ultra HD. 100% Free with zero ads.',
      image: 'https://images.metahub.space/background/medium/tt4574334/img',
      fallbackImage: 'https://images.metahub.space/poster/medium/tt4574334/img',
      url: baseUrl,
      type: 'website'
    };
  }

  return {
    props: {
      pageMarkup: getPageMarkup(),
      meta
    }
  };
}
