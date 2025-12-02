const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  buildExcludes: [/middleware-manifest\.json$/],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=()" },
          {
            // MVP-friendly CSP: allow Next's inline bootstrap + SheetJS fallback
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // allow Next.js inline runtime + Recharts/Excel usage in MVP
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdn.sheetjs.com",
              // keep inline styles for Tailwind's injected styles and our UI
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              // allow loading external stylesheets (Google Fonts)
              "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob:",
              // allow fetching from our own API routes and (future) Supabase if used client-side
              "connect-src 'self' https://*.supabase.co https://*.supabase.in",
              // allow Google Fonts
              "font-src 'self' data: https://fonts.gstatic.com",
              // allow service worker
              "worker-src 'self'",
              // allow web app manifest
              "manifest-src 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

module.exports = withPWA(nextConfig);
