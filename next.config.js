/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    domains: [
      'assets.coingecko.com',
      'coinmarketcap.com',
      's2.coinmarketcap.com',
      'cryptologos.cc',
      'placehold.co',
      'api.dicebear.com',
      'lh3.googleusercontent.com'
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  env: {
    // Correction des URLs de base de données avec les bonnes valeurs sans retour à la ligne
    DATABASE_URL: "postgresql://postgres.cndhozrtfzeqleynszxc:gi5AAop0YRqSSZXD@aws-0-eu-west-3.pooler.supabase.com:6543/postgres",
    DIRECT_URL: "postgresql://postgres.cndhozrtfzeqleynszxc:gi5AAop0YRqSSZXD@aws-0-eu-west-3.pooler.supabase.com:5432/postgres?pgbouncer=false",
    NEXTAUTH_URL: process.env.NODE_ENV === 'production' 
      ? 'https://coiniko.vercel.app' 
      : 'http://localhost:3000',
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: process.env.NODE_ENV === 'production' ? 'https://coiniko.vercel.app' : '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
        ],
      },
    ];
  },
  experimental: {
    // Optimisations avancées
    optimizeCss: true,
    scrollRestoration: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Configuration pour les packages externes (nouveau format Next.js 15)
  serverExternalPackages: ['@prisma/client'],
};

module.exports = nextConfig; 