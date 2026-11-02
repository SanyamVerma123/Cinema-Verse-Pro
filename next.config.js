/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  async rewrites() {
    return [
      {
        source: '/download/CinemaVerse-Pro.apk',
        destination: '/CinemaVerse-Pro.apk',
      },
      {
        source: '/download/CinemaMirror-Pro.apk',
        destination: '/CinemaMirror-Pro.apk',
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/download/:file*',
        headers: [
          {
            key: 'Content-Disposition',
            value: 'attachment',
          },
          {
            key: 'Content-Type',
            value: 'application/vnd.android.package-archive',
          },
        ],
      },
      {
        source: '/CinemaVerse-Pro.apk',
        headers: [
          {
            key: 'Content-Disposition',
            value: 'attachment; filename="CinemaVerse-Pro.apk"',
          },
          {
            key: 'Content-Type',
            value: 'application/vnd.android.package-archive',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=60, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
