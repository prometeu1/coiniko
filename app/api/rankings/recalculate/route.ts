import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '../../auth/[...nextauth]/route';

// Fonction pour calculer et mettre à jour les classements de tous les utilisateurs
async function recalculateAllRankings() {
  try {
    // Récupérer tous les portefeuilles avec leurs holdings
    const portfolios = await prisma.portfolios.findMany({
      include: {
        holdings: true,
        user: true,
      },
    });

    // Calculer la valeur totale pour chaque portefeuille
    const portfolioValues = portfolios.map(portfolio => {
      let totalValue = parseFloat(portfolio.balance.toString());
      
      for (const holding of portfolio.holdings) {
        const holdingValue = parseFloat(holding.amount.toString()) * parseFloat(holding.average_buy_price.toString());
        totalValue += holdingValue;
      }
      
      return {
        userId: portfolio.user_id,
        name: portfolio.user.name,
        totalValue: totalValue,
      };
    });

    // Trier par valeur totale (décroissant)
    portfolioValues.sort((a, b) => b.totalValue - a.totalValue);

    // Mettre à jour ou créer les classements
    for (let i = 0; i < portfolioValues.length; i++) {
      const { userId, totalValue } = portfolioValues[i];
      const rank = i + 1;
      
      // Vérifier si un classement existe
      const existingRanking = await prisma.rankings.findFirst({
        where: { user_id: userId },
      });
      
      if (existingRanking) {
        // Mettre à jour le classement existant
        await prisma.rankings.update({
          where: { id: existingRanking.id },
          data: {
            total_value: totalValue,
            rank: rank,
            last_updated: new Date(),
          },
        });
      } else {
        // Créer un nouveau classement
        await prisma.rankings.create({
          data: {
            user_id: userId,
            total_value: totalValue,
            rank: rank,
            last_updated: new Date(),
          },
        });
      }
    }
    
    return portfolioValues.length;
  } catch (error) {
    console.error('Erreur lors du recalcul des classements:', error);
    throw error;
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Seuls les administrateurs devraient pouvoir déclencher un recalcul complet
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    
    const count = await recalculateAllRankings();
    
    return NextResponse.json({ 
      success: true, 
      message: `Classements recalculés pour ${count} utilisateurs` 
    });
  } catch (error) {
    console.error('Erreur lors du recalcul des classements:', error);
    return NextResponse.json({ 
      error: 'Erreur lors du recalcul des classements' 
    }, { status: 500 });
  }
} 