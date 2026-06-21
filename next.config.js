/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Ship the bundled OG-image fonts with the serverless function on Vercel.
    // Bracket-free globs: route paths with [chargeId] are matched via ** since
    // literal square brackets are interpreted as glob character classes.
    outputFileTracingIncludes: {
      "/receipt/**": ["./src/og-assets/fonts/*.ttf"],
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.slack-edge.com" },
      { protocol: "https", hostname: "secure.gravatar.com" },
    ],
  },
  async headers() {
    return [
      {
        source: '/api/slack/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, x-slack-signature, x-slack-request-timestamp' },
        ],
      },
    ]
  },
}

module.exports = nextConfig 