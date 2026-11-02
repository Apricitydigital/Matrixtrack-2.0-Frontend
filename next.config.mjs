const backendOrigin = (process.env.MATRIXTRACK_BACKEND_URL || 'https://api.matrixtrack20.in').replace(/\/+$/, '');
const publicApi = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.VITE_API_BASE_URL || '/backend';

/** @type {import('next').NextConfig} */
const config = {
  // Keep production builds from replacing files used by a running dev server.
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  poweredByHeader: false,
  webpack(config, { dev }) {
    if (dev) config.cache = { type: 'memory' };
    return config;
  },
  env: { NEXT_PUBLIC_API_BASE_URL: publicApi },
  async rewrites() {
    return [{ source: '/backend/:path*', destination: `${backendOrigin}/:path*` }];
  },
};

export default config;
