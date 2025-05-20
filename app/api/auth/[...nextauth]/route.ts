import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma, disconnectPrisma, connectPrisma, handleDatabaseOperation } from '@/lib/db';

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
const fallbackGoogleClientId = '747561554538-hla86ioipagc6naa7nk1msd0lbqdt04s.apps.googleusercontent.com';
const fallbackGoogleClientSecret = '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';

// Utilisé par l'adaptateur Prisma
const createNewPortfolio = async (userId: string) => {
  try {
    return await handleDatabaseOperation(async () => {
      const existingPortfolio = await prisma.portfolios.findFirst({
        where: { user_id: userId },
      });

      if (!existingPortfolio) {
        console.log(`Création d'un nouveau portefeuille pour l'utilisateur ${userId}`);
        await prisma.portfolios.create({
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
    return false;
  }
};

// Créer un adaptateur Prisma personnalisé avec gestion d'erreurs
const customPrismaAdapter = {
  ...PrismaAdapter(prisma),
  // Surcharger les méthodes qui causent des problèmes
  async getUserByAccount(providerAccountId) {
    try {
      return await handleDatabaseOperation(async () => {
        const adapter = PrismaAdapter(prisma);
        const user = await adapter.getUserByAccount(providerAccountId);
        console.log(`getUserByAccount: ${user ? 'User found' : 'User not found'}`, user?.email);
        return user;
      }, 3);
    } catch (error) {
      console.error("Error in getUserByAccount:", error);
      await disconnectPrisma();
      return null;
    }
  },
  async getSessionAndUser(sessionToken) {
    try {
      return await handleDatabaseOperation(async () => {
        const adapter = PrismaAdapter(prisma);
        const result = await adapter.getSessionAndUser(sessionToken);
        console.log(`getSessionAndUser: ${result ? 'Session found' : 'Session not found'}`);
        return result;
      }, 3);
    } catch (error) {
      console.error("Error in getSessionAndUser:", error);
      await disconnectPrisma();
      return null;
    }
  },
  async createUser(userData) {
    try {
      return await handleDatabaseOperation(async () => {
        const adapter = PrismaAdapter(prisma);
        console.log("Creating new user:", userData.email);
        const user = await adapter.createUser(userData);
        console.log("User created successfully:", user.id);
        return user;
      }, 3);
    } catch (error) {
      console.error("Error in createUser:", error);
      return null;
    }
  },
  async linkAccount(accountData) {
    try {
      return await handleDatabaseOperation(async () => {
        const adapter = PrismaAdapter(prisma);
        console.log("Linking account for user:", accountData.userId);
        const account = await adapter.linkAccount(accountData);
        console.log("Account linked successfully");
        return account;
      }, 3);
    } catch (error) {
      console.error("Error in linkAccount:", error);
      return null;
    }
  },
  async updateUser(userData) {
    try {
      return await handleDatabaseOperation(async () => {
        const adapter = PrismaAdapter(prisma);
        console.log("Updating user:", userData.id);
        return await adapter.updateUser(userData);
      }, 2);
    } catch (error) {
      console.error("Error in updateUser:", error);
      return null;
    }
  },
  async createSession(sessionData) {
    try {
      return await handleDatabaseOperation(async () => {
        const adapter = PrismaAdapter(prisma);
        console.log("Creating session for user:", sessionData.userId);
        return await adapter.createSession(sessionData);
      }, 2);
    } catch (error) {
      console.error("Error in createSession:", error);
      return null;
    }
  }
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
      }
    }),
  ],
  debug: true, // Toujours activer le debug pour voir les erreurs
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
  callbacks: {
    async session({ session, user }) {
      try {
        // Ajouter l'ID utilisateur à la session
        if (session.user && user?.id) {
          session.user.id = user.id;
          console.log(`Session callback: Setting user ID ${user.id} for ${user.email}`);
        }
        return session;
      } catch (error) {
        console.error("Erreur lors de la session callback:", error);
        return session;
      }
    },
    async signIn({ user, account, profile }) {
      try {
        console.log("SignIn callback - user:", user?.email);
        console.log("SignIn callback - account provider:", account?.provider);
        
        if (!user?.id) {
          console.log('No user ID found, but allowing sign-in');
          return true;
        }
        
        // Créer un portefeuille pour l'utilisateur si nécessaire
        await createNewPortfolio(user.id);
        
        return true;
      } catch (error) {
        console.error("Erreur globale dans signIn callback:", error);
        // On autorise quand même la connexion en cas d'erreur
        return true;
      }
    },
    async redirect({ url, baseUrl }) {
      // Ensure proper redirect handling
      console.log("Redirect callback - url:", url);
      console.log("Redirect callback - baseUrl:", baseUrl);
      
      // Make sure we always redirect to a safe URL
      if (url.startsWith(baseUrl)) return url;
      else if (url.startsWith('/')) return `${baseUrl}${url}`;
      return baseUrl;
    }
  },
  events: {
    createUser: async (message) => {
      try {
        // On attend un court instant pour s'assurer que l'utilisateur est bien créé
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Créer un portefeuille pour le nouvel utilisateur
        await createNewPortfolio(message.user.id);
      } catch (error) {
        console.error("Erreur globale lors de la création du portefeuille:", error);
      }
    },
    signIn: async (message) => {
      console.log(`User signed in: ${message.user.email}`);
    },
    signOut: async (message) => {
      console.log(`User signed out: ${message.token.sub}`);
    },
    error: async (message) => {
      console.error(`Auth error event: ${message.error}`);
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  secret: process.env.NEXTAUTH_SECRET || 'your-secret-key-at-least-32-chars-long',
};

const handler = NextAuth(authOptions);

// Assurez-vous que le navigateur ne met pas en cache les réponses API
export async function GET(request: Request, response: Response) {
  // Ajout des headers anti-cache pour éviter les problèmes de mise en cache
  return handler(request, response);
}

export { handler as POST }; 