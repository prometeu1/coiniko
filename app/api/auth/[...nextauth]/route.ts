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

console.log('=== Configuration NextAuth ===');
console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL || 'Non défini');
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'Défini' : 'Non défini');
console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'Défini' : 'Non défini');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Défini' : 'Non défini');
console.log('NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? 'Défini' : 'Non défini');
console.log('===========================');

// Vérification des variables d'environnement nécessaires
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.error('❌ ERREUR CRITIQUE: GOOGLE_CLIENT_ID ou GOOGLE_CLIENT_SECRET non défini');
  console.error('Veuillez vérifier votre fichier .env et les valeurs dans Google Cloud Console');
}

// Création d'une fonction d'adaptateur Prisma personnalisée
const customPrismaAdapter = PrismaAdapter(prisma);

// Utilisez ces valeurs de secours si les variables d'environnement ne sont pas définies
const fallbackGoogleClientId = '747561554538-hla86ioipagc6naa7nk1msd0lbqdt04s.apps.googleusercontent.com';
const fallbackGoogleClientSecret = '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';

export const authOptions: NextAuthOptions = {
  adapter: customPrismaAdapter,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || fallbackGoogleClientId,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || fallbackGoogleClientSecret,
    }),
  ],
  debug: process.env.NODE_ENV === 'development',
  callbacks: {
    async session({ session, user }) {
      try {
        // Ajouter l'ID utilisateur à la session
        if (session.user && user?.id) {
          session.user.id = user.id;
        }
        return session;
      } catch (error) {
        console.error("Erreur lors de la session callback:", error);
        return session;
      }
    },
    async signIn({ user, account, profile }) {
      try {
        if (!user?.id) {
          console.log('No user ID found, but allowing sign-in');
          return true;
        }
        
        // Vérifier si l'utilisateur a déjà un portefeuille
        try {
          const existingPortfolio = await prisma.portfolios.findFirst({
            where: { user_id: user.id },
          });

          if (!existingPortfolio) {
            console.log(`Création d'un nouveau portefeuille pour l'utilisateur ${user.id}`);
            
            try {
              // Créer un nouveau portefeuille avec 10000$ de départ
              await prisma.portfolios.create({
                data: {
                  user_id: user.id,
                  balance: 10000,
                },
              });
              console.log('Portfolio created successfully');
            } catch (portfolioError) {
              console.error("Erreur lors de la création du portefeuille:", portfolioError);
              // On continue quand même
            }
          }
        } catch (dbError) {
          console.error("Erreur de base de données lors du portfolio check:", dbError);
          // On continue quand même
        }
        
        return true;
      } catch (error) {
        console.error("Erreur globale dans signIn callback:", error);
        // On autorise quand même la connexion en cas d'erreur
        return true;
      }
    }
  },
  events: {
    createUser: async (message) => {
      try {
        // On attend un court instant pour s'assurer que l'utilisateur est bien créé
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Créer un portefeuille pour le nouvel utilisateur
        try {
          const existingPortfolio = await prisma.portfolios.findFirst({
            where: { user_id: message.user.id },
          });
          
          if (!existingPortfolio) {
            await prisma.portfolios.create({
              data: {
                user_id: message.user.id,
                balance: 10000,
              },
            });
            console.log(`Portfolio created for new user ${message.user.id}`);
          }
        } catch (dbError) {
          console.error("Erreur de base de données lors de la création du portefeuille:", dbError);
        }
      } catch (error) {
        console.error("Erreur globale lors de la création du portefeuille:", error);
      }
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  secret: process.env.NEXTAUTH_SECRET || 'your-secret-key-at-least-32-chars-long',
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; 