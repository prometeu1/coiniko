/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    domains: [
      'lh3.googleusercontent.com', // Pour les images de profil Google
      'avatars.githubusercontent.com',
      'localhost',
      's2.coinmarketcap.com', // Images de CoinMarketCap
      'assets.coingecko.com', // Images de CoinGecko
      'api.dicebear.com', // Pour les avatars générés
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
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https:; frame-ancestors 'none'; form-action 'self'"
          }
        ]
      }
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
  async redirects() {
    return [
      {
        source: '/api/auth/signin',
        destination: '/auth/signin',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig; 