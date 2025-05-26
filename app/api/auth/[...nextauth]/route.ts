import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma, disconnectPrisma, connectPrisma, handleDatabaseOperation, resetPrisma } from '@/lib/db';

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

// Reset DB connection on startup to clear any existing prepared statements
try {
  resetPrisma().catch(console.error);
} catch (e) {
  console.error('Failed to reset Prisma on startup:', e);
}

// Utilisé par l'adaptateur Prisma
const createNewPortfolio = async (userId: string) => {
  try {
    return await handleDatabaseOperation(async () => {
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
    });
  } catch (error) {
    console.error("Error creating portfolio:", error);
    // Try to reset the connection since we encountered an error
    try {
      await resetPrisma();
    } catch (e) {
      console.error('Failed to reset after portfolio creation error:', e);
    }
    return false;
  }
};

// Wrap adapter methods with error handling
const wrapAdapterMethod = async <T>(method: () => Promise<T>, methodName: string): Promise<T | null> => {
  try {
    return await handleDatabaseOperation(async () => {
      return await method();
    }, 3);
  } catch (error) {
    console.error(`Error in ${methodName}:`, error);
    
    // For persistent database errors, try to reset the connection
    try {
      await resetPrisma();
    } catch (e) {
      console.error(`Failed to reset connection after ${methodName} error:`, e);
    }
    
    return null;
  }
};

// Créer un adaptateur Prisma personnalisé avec gestion d'erreurs
const customPrismaAdapter = {
  ...PrismaAdapter(prisma()),
  // Surcharger les méthodes qui causent des problèmes
  async getUserByAccount(providerAccountId) {
    try {
      return await wrapAdapterMethod(async () => {
        const adapter = PrismaAdapter(prisma());
        const user = await adapter.getUserByAccount(providerAccountId);
        console.log(`getUserByAccount: ${user ? 'User found' : 'User not found'}`, user?.email);
        return user;
      }, 'getUserByAccount');
    } catch (error) {
      console.error("Error in getUserByAccount:", error);
      return null;
    }
  },
  async getSessionAndUser(sessionToken) {
    try {
      return await wrapAdapterMethod(async () => {
        const adapter = PrismaAdapter(prisma());
        const result = await adapter.getSessionAndUser(sessionToken);
        console.log(`getSessionAndUser: ${result ? 'Session found' : 'Session not found'}`);
        return result;
      }, 'getSessionAndUser');
    } catch (error) {
      console.error("Error in getSessionAndUser:", error);
      return null;
    }
  },
  async createUser(userData) {
    try {
      return await wrapAdapterMethod(async () => {
        const adapter = PrismaAdapter(prisma());
        console.log("Creating new user:", userData.email);
        const user = await adapter.createUser(userData);
        console.log("User created successfully:", user.id);
        return user;
      }, 'createUser');
    } catch (error) {
      console.error("Error in createUser:", error);
      return null;
    }
  },
  async linkAccount(accountData) {
    try {
      return await wrapAdapterMethod(async () => {
        const adapter = PrismaAdapter(prisma());
        console.log("Linking account for user:", accountData.userId);
        const account = await adapter.linkAccount(accountData);
        console.log("Account linked successfully");
        return account;
      }, 'linkAccount');
    } catch (error) {
      console.error("Error in linkAccount:", error);
      return null;
    }
  },
  async updateUser(userData) {
    try {
      return await wrapAdapterMethod(async () => {
        const adapter = PrismaAdapter(prisma());
        console.log("Updating user:", userData.id);
        return await adapter.updateUser(userData);
      }, 'updateUser');
    } catch (error) {
      console.error("Error in updateUser:", error);
      return null;
    }
  },
  async createSession(sessionData) {
    try {
      return await wrapAdapterMethod(async () => {
        const adapter = PrismaAdapter(prisma());
        console.log("Creating session for user:", sessionData.userId);
        return await adapter.createSession(sessionData);
      }, 'createSession');
    } catch (error) {
      console.error("Error in createSession:", error);
      return null;
    }
  }
};

// Get the base URL for callbacks
const getBaseUrl = () => {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3000' 
    : 'https://coiniko-one.vercel.app';
};

export const authOptions: NextAuthOptions = {
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
      console.log(`Auth debug (${code}):`, metadata);
    }
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
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
      // Handle redirects safely
      if (!url.startsWith('/') && !url.startsWith(baseUrl)) {
        return baseUrl;
      }
      return url;
    }
  },
  events: {
    async signIn({ user }) {
      console.log("User signed in:", user.email);
    },
    async signOut({ session }) {
      console.log("User signed out");
      // Clean up database connections on sign out
      try {
        await resetPrisma();
      } catch (error) {
        console.error("Error resetting Prisma on signout:", error);
      }
    },
    async createUser({ user }) {
      console.log("New user created:", user.email);
    },
    async linkAccount({ user, account }) {
      console.log("Account linked for user:", user.email);
    },
    async session({ session, token }) {
      // This is called whenever a session is checked
      // We can use this to detect and fix database issues
      if (session?.user?.id) {
        try {
          // Verify the user exists in the database
          const userExists = await handleDatabaseOperation(async () => {
            const user = await prisma().user.findUnique({
              where: { id: session.user.id as string },
              select: { id: true }
            });
            return !!user;
          });
          
          if (!userExists) {
            console.error(`Session check failed: User ${session.user.id} not found in database`);
            // This will cause the session to be invalidated
            return false;
          }
        } catch (error) {
          console.error("Error checking user in session event:", error);
          // Don't invalidate the session due to a database error
        }
      }
    }
  }
};

// Handle API routes
export async function GET(request: Request, response: Response) {
  try {
    // Reset database connection before handling auth requests
    await resetPrisma();
    return await NextAuth(request, response, authOptions);
  } catch (error) {
    console.error("Error in NextAuth GET handler:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: Request, response: Response) {
  try {
    // Reset database connection before handling auth requests
    await resetPrisma();
    return await NextAuth(request, response, authOptions);
  } catch (error) {
    console.error("Error in NextAuth POST handler:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
} 