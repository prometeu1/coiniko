import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";

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
    : 'https://coiniko-one.vercel.app';
}

if (!process.env.NEXTAUTH_SECRET) {
  console.warn('NEXTAUTH_SECRET est manquant, définition par défaut');
  process.env.NEXTAUTH_SECRET = 'your-secret-key-at-least-32-chars-long';
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
          balance: 100000,
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

// Créer un adaptateur Prisma personnalisé avec gestion d'erreurs
const customPrismaAdapter = {
  ...PrismaAdapter(prisma()),
  // Surcharger les méthodes qui causent des problèmes
  async getUserByAccount(providerAccountId) {
    try {
      const adapter = PrismaAdapter(prisma());
      const user = await adapter.getUserByAccount(providerAccountId);
      console.log(`getUserByAccount: ${user ? 'User found' : 'User not found'}`, user?.email);
      return user;
    } catch (error) {
      console.error("Error in getUserByAccount:", error);
      return null;
    }
  },
  async getSessionAndUser(sessionToken) {
    try {
      const adapter = PrismaAdapter(prisma());
      const result = await adapter.getSessionAndUser(sessionToken);
      console.log(`getSessionAndUser: ${result ? 'Session found' : 'Session not found'}`);
      return result;
    } catch (error) {
      console.error("Error in getSessionAndUser:", error);
      return null;
    }
  },
  async createUser(userData) {
    try {
      const adapter = PrismaAdapter(prisma());
      console.log("Creating new user:", userData.email);
      const user = await adapter.createUser(userData);
      console.log("User created successfully:", user.id);
      return user;
    } catch (error) {
      console.error("Error in createUser:", error);
      return null;
    }
  },
  async linkAccount(accountData) {
    try {
      const adapter = PrismaAdapter(prisma());
      console.log("Linking account for user:", accountData.userId);
      const account = await adapter.linkAccount(accountData);
      console.log("Account linked successfully");
      return account;
    } catch (error) {
      console.error("Error in linkAccount:", error);
      return null;
    }
  },
  async updateUser(userData) {
    try {
      const adapter = PrismaAdapter(prisma());
      console.log("Updating user:", userData.id);
      return await adapter.updateUser(userData);
    } catch (error) {
      console.error("Error in updateUser:", error);
      return null;
    }
  },
  async createSession(sessionData) {
    try {
      const adapter = PrismaAdapter(prisma());
      console.log("Creating session for user:", sessionData.userId);
      return await adapter.createSession(sessionData);
    } catch (error) {
      console.error("Error in createSession:", error);
      return null;
    }
  }
};

// Get the base URL for callbacks
const getBaseUrl = () => {
  // En production sur Vercel
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // Fallback pour d'autres déploiements en production
  if (process.env.NODE_ENV === 'production') {
    return 'https://coiniko.vercel.app';
  }
  
  // En développement
  return 'http://localhost:3000';
};

export const authOptions = {
  adapter: customPrismaAdapter,
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
    error(code, metadata) {
      console.error(`Auth error (${code}):`, metadata);
    },
    warn(code) {
      console.warn(`Auth warning (${code})`);
    },
    debug(code, metadata) {
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
        secure: process.env.NODE_ENV === 'production'
      }
    },
    callbackUrl: {
      name: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.callback-url' : 'next-auth.callback-url',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    },
    csrfToken: {
      name: process.env.NODE_ENV === 'production' ? '__Host-next-auth.csrf-token' : 'next-auth.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  },
  session: {
    strategy: 'database',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/signin', // Error messages will be passed as query parameters
  },
  callbacks: {
    async session({ session, user }) {
      // Add user ID to session
      session.user.id = user.id;
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
      // Handle redirects safely pour la production
      const finalBaseUrl = getBaseUrl();
      
      console.log('Redirect callback:', { url, baseUrl, finalBaseUrl });
      
      // Si l'URL commence par une barre oblique, c'est une URL relative
      if (url.startsWith('/')) {
        return `${finalBaseUrl}${url}`;
      }
      
      // Si l'URL correspond à notre domaine, l'autoriser
      if (url.startsWith(finalBaseUrl)) {
        return url;
      }
      
      // Sinon, rediriger vers la page d'accueil
      return finalBaseUrl;
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
export async function GET(request: Request, response: Response) {
  try {
    return await NextAuth(request, response, authOptions);
  } catch (error) {
    console.error("Error in NextAuth GET handler:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: Request, response: Response) {
  try {
    return await NextAuth(request, response, authOptions);
  } catch (error) {
    console.error("Error in NextAuth POST handler:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
} 