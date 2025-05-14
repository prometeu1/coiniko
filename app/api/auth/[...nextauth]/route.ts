import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/db';

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

// Forcer la redirection vers le port 3000 (celui attendu par Google OAuth)
const PORT = 3000;
const NEXTAUTH_URL = `http://localhost:${PORT}`;

console.log('=== Configuration NextAuth ===');
console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL || NEXTAUTH_URL);
console.log('Forçage vers:', NEXTAUTH_URL);
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'Défini' : 'Non défini');
console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'Défini' : 'Non défini');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Défini' : 'Non défini');
console.log('NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? 'Défini' : 'Non défini');

// Afficher les premiers caractères pour le débogage
if (process.env.GOOGLE_CLIENT_ID) {
  console.log('GOOGLE_CLIENT_ID (premiers caractères):', process.env.GOOGLE_CLIENT_ID.substring(0, 8) + '...');
}
console.log('===========================');

// Vérification des variables d'environnement nécessaires
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.error('❌ ERREUR CRITIQUE: GOOGLE_CLIENT_ID ou GOOGLE_CLIENT_SECRET non défini');
  console.error('Veuillez vérifier votre fichier .env et les valeurs dans Google Cloud Console');
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
  ],
  debug: true, // Facilite le débogage
  callbacks: {
    async session({ session, user }) {
      console.log('Session callback called with user:', user?.id);
      // Ajouter l'ID utilisateur à la session
      if (session.user && user?.id) {
        session.user.id = user.id;
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      console.log('SignIn callback called');
      console.log('User info:', user);
      console.log('Account info:', account);
      console.log('Profile info:', profile);
      
      try {
        if (!user?.id) {
          console.log('No user ID found');
          return true;
        }
        
        console.log(`Checking portfolio for user ${user.id}`);
        
        // Vérifier si l'utilisateur a déjà un portefeuille
        try {
          const existingPortfolio = await prisma.portfolios.findFirst({
            where: { user_id: user.id },
          });

          if (!existingPortfolio) {
            console.log(`Création d'un nouveau portefeuille pour l'utilisateur ${user.id}`);
            
            try {
              // Vérifier que l'utilisateur existe
              const dbUser = await prisma.user.findUnique({
                where: { id: user.id }
              });
              
              if (dbUser) {
                console.log('User found in database, creating portfolio');
                await prisma.portfolios.create({
                  data: {
                    user_id: user.id,
                    balance: 10000, // Montant de départ: 10000$
                  },
                });
                console.log('Portfolio created successfully');
              } else {
                console.log('User not found in database yet, will create portfolio on next sign in');
              }
            } catch (dbError) {
              console.error("Erreur lors de la vérification de l'utilisateur:", dbError);
              // Continue despite errors
            }
          } else {
            console.log('User already has a portfolio');
          }
        } catch (portfolioError) {
          console.error("Error checking portfolio:", portfolioError);
          // Continue despite errors
        }
        
        return true;
      } catch (error) {
        console.error("Erreur complète lors de la création du portefeuille:", error);
        // On autorise quand même la connexion en cas d'erreur
        return true;
      }
    },
    async redirect({ url, baseUrl }) {
      console.log('Redirect callback called');
      console.log('URL:', url);
      console.log('Base URL:', baseUrl);
      
      // Simplifier la logique de redirection
      // Si l'URL commence par le baseUrl ou /, on redirige vers cette URL
      // Sinon, on redirige vers la page d'accueil
      if (url.startsWith('/') || url.startsWith(baseUrl)) {
        console.log('Redirecting to', url);
        return url;
      } else {
        console.log('Redirecting to base URL', baseUrl);
        return baseUrl;
      }
    }
  },
  events: {
    createUser: async (message) => {
      console.log('=== User creation event triggered ===');
      console.log('New user:', message.user);
      
      try {
        // On attend 1 seconde pour s'assurer que l'utilisateur est bien créé dans la base de données
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // On vérifie si l'utilisateur existe réellement dans la base de données
        const dbUser = await prisma.user.findUnique({
          where: { id: message.user.id }
        });
        
        if (dbUser) {
          console.log('User confirmed in database, creating portfolio');
          
          // Vérifier si l'utilisateur a déjà un portefeuille
          const existingPortfolio = await prisma.portfolios.findFirst({
            where: { user_id: message.user.id },
          });
          
          if (!existingPortfolio) {
            await prisma.portfolios.create({
              data: {
                user_id: message.user.id,
                balance: 10000, // Montant de départ: 10000$
              },
            });
            console.log(`Portfolio created for new user ${message.user.id}`);
          } else {
            console.log('User already has a portfolio');
          }
        } else {
          console.error('User NOT found in database after creation event!');
        }
      } catch (error) {
        console.error("Erreur complète lors de la création du portefeuille pour le nouvel utilisateur:", error);
      }
    },
    signIn: async (message) => {
      console.log('=== User signIn event triggered ===');
      console.log('User signed in:', message.user.id);
      
      try {
        // On vérifie si l'utilisateur a un portefeuille
        const existingPortfolio = await prisma.portfolios.findFirst({
          where: { user_id: message.user.id },
        });
        
        if (!existingPortfolio) {
          console.log('User has no portfolio, creating one');
          
          await prisma.portfolios.create({
            data: {
              user_id: message.user.id,
              balance: 10000, // Montant de départ: 10000$
            },
          });
          console.log(`Portfolio created for user ${message.user.id} during sign in`);
        } else {
          console.log('User already has a portfolio');
        }
      } catch (error) {
        console.error("Erreur lors de la vérification/création du portefeuille:", error);
      }
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET || 'your-secret-key-at-least-32-chars-long',
  // Forcer l'URL explicitement
  url: NEXTAUTH_URL,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; 