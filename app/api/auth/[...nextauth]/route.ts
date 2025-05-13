import NextAuth, { NextAuthOptions } from 'next-auth';
import EmailProvider from 'next-auth/providers/email';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/db';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST || 'smtp.example.com',
        port: Number(process.env.EMAIL_SERVER_PORT || 587),
        auth: {
          user: process.env.EMAIL_SERVER_USER || 'example',
          pass: process.env.EMAIL_SERVER_PASSWORD || 'password',
        },
      },
      from: process.env.EMAIL_FROM || 'noreply@example.com',
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      // Ajouter l'ID utilisateur à la session
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
    async signIn({ user }) {
      if (!user?.id) return true;
      
      try {
        // Vérifier si l'utilisateur a déjà un portefeuille
        const existingPortfolio = await prisma.portfolios.findFirst({
          where: { user_id: user.id },
        });

        // Si non, créer un nouveau portefeuille avec 10000$
        if (!existingPortfolio) {
          console.log(`Création d'un nouveau portefeuille pour l'utilisateur ${user.id}`);
          await prisma.portfolios.create({
            data: {
              user_id: user.id,
              balance: 10000, // Montant de départ: 10000$
            },
          });
        }
        
        return true;
      } catch (error) {
        console.error("Erreur lors de la création du portefeuille:", error);
        // On autorise quand même la connexion en cas d'erreur
        return true;
      }
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; 