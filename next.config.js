/** @type {import('next').NextConfig} */
const nextConfig = {
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