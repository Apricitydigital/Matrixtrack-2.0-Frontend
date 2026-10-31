const backendOrigin = (process.env.MATRIXTRACK_BACKEND_URL || 'https://api.matrixtrack20.in').replace(/\/+$/, '');
const publicApi = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.VITE_API_BASE_URL || '/backend';

/** @type {import('next').NextConfig} */
const config = {
  poweredByHeader: false,
  env: { NEXT_PUBLIC_API_BASE_URL: publicApi },
  async rewrites() {
    return [{ source: '/backend/:path*', destination: `${backendOrigin}/:path*` }];
  },
};

export default config;
