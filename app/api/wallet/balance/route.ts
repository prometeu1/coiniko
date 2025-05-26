import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma, handleDatabaseOperation } from '@/lib/db';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'Vous devez être connecté pour accéder à votre solde' },
        { status: 401 }
      );
    }
    
    // Utiliser handleDatabaseOperation pour avoir une gestion des erreurs plus robuste
    return await handleDatabaseOperation(async () => {
      const prismaClient = prisma();
      
      // Vérifier si le prismaClient est correctement initialisé
      if (!prismaClient) {
        throw new Error('Client Prisma non initialisé');
      }
      
      // Récupérer le portefeuille de l'utilisateur en vérifiant si le modèle existe
      const portfolio = await prismaClient.portfolios.findFirst({
        where: { user_id: session.user.id },
      });
      
      if (!portfolio) {
        // Créer un nouveau portefeuille si aucun n'existe
        console.log('Création d\'un nouveau portefeuille pour l\'utilisateur');
        const newPortfolio = await prismaClient.portfolios.create({
          data: {
            user_id: session.user.id,
            balance: 10000, // Montant de départ: 10000$
          },
        });
        
        return NextResponse.json({ balance: Number(newPortfolio.balance) });
      }
      
      // Convertir le Decimal en number pour la réponse JSON
      return NextResponse.json({ balance: Number(portfolio.balance) });
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du solde:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du solde' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'Vous devez être connecté pour modifier votre solde' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const amount = Number(body.amount);
    
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Le montant doit être un nombre positif' },
        { status: 400 }
      );
    }
    
    // Utiliser handleDatabaseOperation pour avoir une gestion des erreurs plus robuste
    return await handleDatabaseOperation(async () => {
      const prismaClient = prisma();
      
      // Récupérer le portefeuille de l'utilisateur
      const portfolio = await prismaClient.portfolios.findFirst({
        where: { user_id: session.user.id },
      });
      
      if (!portfolio) {
        return NextResponse.json(
          { error: 'Portefeuille non trouvé' },
          { status: 404 }
        );
      }
      
      // Mettre à jour le solde
      const updatedPortfolio = await prismaClient.portfolios.update({
        where: { id: portfolio.id },
        data: {
          balance: {
            increment: amount,
          },
        },
      });
      
      return NextResponse.json({ balance: Number(updatedPortfolio.balance) });
    });
  } catch (error) {
    console.error('Erreur lors de la modification du solde:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la modification du solde' },
      { status: 500 }
    );
  }
} 