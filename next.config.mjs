/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // Buddy pages are served through teddy.myqr.co.nz (forwarded by the party site), so scripts and styles
  // load from this app's own address. Set ASSET_PREFIX=https://create.myqr.co.nz in production.
  assetPrefix: process.env.ASSET_PREFIX || undefined,
  async headers() {
    return [
      { source: '/:path*', headers: [{ key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }, { key: 'X-Content-Type-Options', value: 'nosniff' }] },
      { source: '/b/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex' }] },
      { source: '/_next/static/:path*', headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }] },
    ];
  },
};
export default nextConfig;
