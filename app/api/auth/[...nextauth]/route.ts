import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import type { NextAuthOptions } from "next-auth";

// Extend the session type to include user ID
declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    }
  }
}

console.log('=== Configuration NextAuth ===');
console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL || 'Non défini');
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'Défini' : 'Non défini');
console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'Défini' : 'Non défini');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Défini' : 'Non défini');
console.log('NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? 'Défini' : 'Non défini');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('VERCEL_URL:', process.env.VERCEL_URL);
console.log('===========================');

// Configuration de l'API avec clé d'API si disponible
const API_KEY = process.env.NEXT_PUBLIC_COINGECKO_API_KEY || '';
const API_BASE_URL = 'https://api.coingecko.com/api/v3';
const API_PARAMS = API_KEY ? `&x_cg_demo_api_key=${API_KEY}` : '';

// Options pour contrôler le nombre de tentatives et le délai entre les tentatives
const API_OPTIONS = {
  MAX_RETRIES: 5, // Increased from 3 to 5
  RETRY_DELAY: 1500, // Increased from 1000 to 1500 milliseconds
  REQUEST_TIMEOUT: 12000 // Increased from 8000 to 12000 (12 seconds)
};

// Définition explicite des variables d'environnement pour éviter les erreurs
if (!process.env.NEXTAUTH_URL) {
  console.warn('NEXTAUTH_URL est manquant, définition par défaut');
  process.env.NEXTAUTH_URL = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3000' 
    : 'https://coiniko.vercel.app';
}

if (!process.env.NEXTAUTH_SECRET) {
  console.warn('NEXTAUTH_SECRET est manquant, définition par défaut');
  process.env.NEXTAUTH_SECRET = 'coiniko-secret-key-production-2024-very-secure-string';
}

// Vérification des variables d'environnement nécessaires
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.error('❌ ERREUR CRITIQUE: GOOGLE_CLIENT_ID ou GOOGLE_CLIENT_SECRET non défini');
  console.error('Veuillez vérifier votre fichier .env et les valeurs dans Google Cloud Console');
}

// Utilisez ces valeurs de secours si les variables d'environnement ne sont pas définies
// Note: Ces valeurs doivent correspondre à un client OAuth valide dans Google Cloud Console
const fallbackGoogleClientId = '747561554538-hla86ioipagc6naa7nk1msd0lbqdt04s.apps.googleusercontent.com';
const fallbackGoogleClientSecret = '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';

// Utilisé par l'adaptateur Prisma
const createNewPortfolio = async (userId: string) => {
  try {
    const existingPortfolio = await prisma().portfolios.findFirst({
      where: { user_id: userId },
    });

    if (!existingPortfolio) {
      console.log(`Création d'un nouveau portefeuille pour l'utilisateur ${userId}`);
      await prisma().portfolios.create({
        data: {
          user_id: userId,
          balance: 10000,
        },
      });
      console.log('Portfolio created successfully');
    }
    return true;
  } catch (error) {
    console.error("Error creating portfolio:", error);
    return false;
  }
};

// Get the base URL for callbacks
const getBaseUrl = () => {
  // En développement
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }
  
  // En production, utiliser TOUJOURS le domaine personnalisé
  // Ne pas utiliser VERCEL_URL car cela peut être l'URL automatique de déploiement
  return 'https://coiniko.vercel.app';
};

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma()),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || fallbackGoogleClientId,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || fallbackGoogleClientSecret,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      },
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture
        };
      }
    }),
  ],
  debug: process.env.NODE_ENV === 'development',
  logger: {
    error(code: string, metadata?: any) {
      console.error(`Auth error (${code}):`, metadata);
    },
    warn(code: string) {
      console.warn(`Auth warning (${code})`);
    },
    debug(code: string, metadata?: any) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`Auth debug (${code}):`, metadata);
      }
    }
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        domain: undefined
      }
    }
  },
  session: {
    strategy: 'database',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/signin', // Error messages will be passed as query parameters
  },
  callbacks: {
    async session({ session, user }) {
      // Add user ID to session
      if (user) {
        session.user.id = user.id;
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      try {
        if (user?.id) {
          // Create a portfolio for the user if they don't have one
          await createNewPortfolio(user.id);
        }
        return true;
      } catch (error) {
        console.error("Error in signIn callback:", error);
        // Don't block sign-in due to portfolio creation failure
        return true;
      }
    },
    async redirect({ url, baseUrl }) {
      const actualBaseUrl = getBaseUrl();
      
      console.log('Redirect callback:', { url, baseUrl: actualBaseUrl });
      
      // Si l'URL commence par une barre oblique, c'est une URL relative
      if (url.startsWith('/')) {
        return `${actualBaseUrl}${url}`;
      }
      
      // Si l'URL correspond à notre domaine, l'autoriser
      if (url.startsWith(actualBaseUrl)) {
        return url;
      }
      
      // Si c'est localhost en dev
      if (process.env.NODE_ENV === 'development' && url.startsWith('http://localhost:3000')) {
        return url;
      }
      
      // Sinon, rediriger vers la page d'accueil
      return actualBaseUrl;
    }
  },
  events: {
    async signIn({ user }) {
      console.log("User signed in:", user.email);
    },
    async signOut({ session }) {
      console.log("User signed out");
    },
    async createUser({ user }) {
      console.log("New user created:", user.email);
    },
    async linkAccount({ user, account }) {
      console.log("Account linked for user:", user.email);
    }
  }
};

// Handle API routes
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 