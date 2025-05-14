import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '../auth/[...nextauth]/route';

// Récupérer le classement global des utilisateurs
export async function GET() {
  try {
    // Récupération des classements de la base de données
    const rankings = await prisma.rankings.findMany({
      orderBy: {
        rank: 'asc',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    if (!rankings || rankings.length === 0) {
      // Si aucun classement n'est trouvé, générer un classement préliminaire
      await generateInitialRankings();
      
      // Récupérer les classements nouvellement générés
      const initialRankings = await prisma.rankings.findMany({
        orderBy: {
          rank: 'asc',
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      });
      
      return NextResponse.json(initialRankings);
    }

    return NextResponse.json(rankings);
  } catch (error) {
    console.error('Erreur lors de la récupération des classements:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des classements' },
      { status: 500 }
    );
  }
}

// Fonction pour générer un classement initial en fonction des portefeuilles existants
async function generateInitialRankings() {
  try {
    // Récupérer tous les utilisateurs avec leurs portefeuilles
    const portfolios = await prisma.portfolios.findMany({
      include: {
        user: true,
        holdings: true,
      },
    });

    // Pour chaque portefeuille, calculer la valeur totale (solde + valeur des crypto)
    // Ici on utilise simplement le solde comme valeur totale pour l'exemple
    const portfolioValues = portfolios.map(portfolio => ({
      userId: portfolio.user_id,
      totalValue: portfolio.balance || 10000, // Utiliser le solde ou 10000 par défaut
    }));

    // Trier par valeur totale décroissante
    portfolioValues.sort((a, b) => Number(b.totalValue) - Number(a.totalValue));

    // Créer ou mettre à jour les classements
    for (let i = 0; i < portfolioValues.length; i++) {
      const { userId, totalValue } = portfolioValues[i];
      const rank = i + 1;

      await prisma.rankings.upsert({
        where: { user_id: userId },
        update: {
          total_value: totalValue,
          rank,
          last_updated: new Date(),
        },
        create: {
          user_id: userId,
          total_value: totalValue,
          rank,
          last_updated: new Date(),
        },
      });
    }

    console.log('Classements initiaux générés avec succès');
  } catch (error) {
    console.error('Erreur lors de la génération des classements initiaux:', error);
    throw error;
  }
}

// Update user ranking (to be called by a scheduled job or trigger)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get the user's portfolio
    const portfolio = await prisma.portfolios.findFirst({
      where: { user_id: session.user.id },
      include: {
        holdings: true
      }
    });

    if (!portfolio) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
    }

    // Calculate total portfolio value (this would need current prices from an API)
    // For this example, we'll just use the user's current holdings and a mock price
    const { prices } = await req.json(); // Expect current prices to be passed in
    
    let totalValue = portfolio.balance || 0;
    
    // Add value of all holdings
    for (const holding of portfolio.holdings) {
      const cryptoId = holding.crypto_id;
      const price = prices[cryptoId] || 0;
      totalValue += parseFloat(holding.amount.toString()) * price;
    }

    // Update or create ranking
    const existingRanking = await prisma.rankings.findUnique({
      where: { user_id: session.user.id }
    });

    if (existingRanking) {
      await prisma.rankings.update({
        where: { id: existingRanking.id },
        data: {
          total_value: totalValue,
          last_updated: new Date()
        }
      });
    } else {
      await prisma.rankings.create({
        data: {
          user_id: session.user.id,
          total_value: totalValue,
          rank: 0, // Will be calculated in a batch job
          last_updated: new Date()
        }
      });
    }

    // Recalculate rankings for all users
    const allRankings = await prisma.rankings.findMany({
      orderBy: { total_value: 'desc' }
    });

    // Update ranks
    for (let i = 0; i < allRankings.length; i++) {
      await prisma.rankings.update({
        where: { id: allRankings[i].id },
        data: { rank: i + 1 }
      });
    }

    return NextResponse.json({ success: true, totalValue });
  } catch (error) {
    console.error('Error updating ranking:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 