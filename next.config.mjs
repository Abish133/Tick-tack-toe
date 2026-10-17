const nextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  turbopack: { root: import.meta.dirname },
  allowedDevOrigins: ['localhost', '127.0.0.1'],
  // Art is kept for an hour without a server round trip, then refreshed in the background,
  // instead of re-checking every image on every page load.
  async headers() {
    return [{ source: '/assets/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=3600, stale-while-revalidate=604800' }] }];
  },
};
export default nextConfig;
