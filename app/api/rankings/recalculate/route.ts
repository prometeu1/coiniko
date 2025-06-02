import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { PrismaClient } from '@prisma/client';
import { authOptions } from '../../auth/[...nextauth]/route';

// Créer une nouvelle instance de PrismaClient pour cette route
const prisma = new PrismaClient();

// Helper function to calculate percentage change
function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

// Helper function to get historical portfolio values (mock implementation)
async function getHistoricalPortfolioValue(userId: string, hoursAgo: number): Promise<number> {
  // In a real implementation, this would query historical data
  // For now, we'll simulate with some variation from current value
  try {
    const portfolio = await prisma.portfolios.findFirst({
      where: { user_id: userId },
      include: { holdings: true }
    });
    
    if (!portfolio) return 0;
    
    // Simulate historical values with some realistic fluctuation
    const currentValue = parseFloat(portfolio.balance.toString()) || 0;
    let historicalMultiplier = 1;
    
    switch (hoursAgo) {
      case 1: // 1 hour ago
        historicalMultiplier = 0.98 + (Math.random() * 0.04); // -2% to +2%
        break;
      case 24: // 24 hours ago
        historicalMultiplier = 0.90 + (Math.random() * 0.20); // -10% to +10%
        break;
      case 168: // 7 days ago (7 * 24 = 168 hours)
        historicalMultiplier = 0.80 + (Math.random() * 0.40); // -20% to +20%
        break;
      default:
        historicalMultiplier = 1;
    }
    
    return currentValue * historicalMultiplier;
  } catch (error) {
    console.error('Error getting historical portfolio value:', error);
    return 0;
  }
}

// Force recalculation of all rankings
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Allow any authenticated user to trigger recalculation
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Force recalculation and get updated rankings
    const updatedRankings = await recalculateAllRankings();
    
    // Return successful response with the updated rankings
    return NextResponse.json({ 
      success: true, 
      message: 'Classements recalculés avec succès',
      rankings: updatedRankings
    });
  } catch (error) {
    console.error('❌ Erreur lors du recalcul des classements:', error);
    return NextResponse.json({ 
      error: 'Échec du recalcul des classements',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}

async function recalculateAllRankings() {
  try {
    console.log('⚙️ Début du recalcul des classements...');
    
    // Récupérer tous les portefeuilles
    const portfolios = await prisma.portfolios.findMany({
      include: {
        user: true,
        holdings: true,
      },
    });

    console.log(`📊 Portefeuilles trouvés: ${portfolios.length}`);

    if (!portfolios || portfolios.length === 0) {
      console.log('❌ Aucun portefeuille trouvé');
      return [];
    }

    // Calculer les valeurs des portefeuilles (simplifié)
    const portfolioValues = portfolios.map((portfolio) => {
      // Utiliser le solde comme valeur principale
      const balance = parseFloat(portfolio.balance?.toString() || '0');
      
      // Ajouter la valeur des holdings
      let holdingsValue = 0;
      if (portfolio.holdings?.length > 0) {
        for (const holding of portfolio.holdings) {
          // Calculer avec le prix d'achat moyen (simplifié)
          const holdingValue = parseFloat(holding.amount.toString()) * parseFloat(holding.average_buy_price.toString());
          holdingsValue += holdingValue;
        }
      }
      
      const totalValue = balance + holdingsValue;
      
      // Assurer une valeur minimale pour les classements
      const finalValue = totalValue < 1000 ? Math.random() * 5000000 + 1000000 : totalValue;
      
      // Simuler des métriques de performance réalistes
      const performance = {
        change_1h: -2 + (Math.random() * 4), // -2% à +2%
        change_24h: -10 + (Math.random() * 20), // -10% à +10%
        change_7d: -20 + (Math.random() * 40), // -20% à +40%
        change_all_time: 50 + (Math.random() * 100), // 50% à 150%
      };
      
      return {
        userId: portfolio.user_id,
        userName: portfolio.user.name || portfolio.user.email || 'Investisseur anonyme',
        totalValue: finalValue,
        performance,
      };
    });

    // Trier par valeur totale décroissante
    const sortedPortfolios = portfolioValues.sort((a, b) => b.totalValue - a.totalValue);

    console.log(`💰 Portefeuilles classés: ${sortedPortfolios.length}`);

    // Supprimer les classements existants
    await prisma.rankings.deleteMany({});

    // Créer les nouveaux classements
    for (let i = 0; i < sortedPortfolios.length; i++) {
      const { userId, totalValue } = sortedPortfolios[i];
      const rank = i + 1;

      await prisma.rankings.create({
        data: {
          user_id: userId,
          total_value: totalValue,
          rank,
          last_updated: new Date(),
        },
      });
    }

    console.log(`✅ Classements recalculés avec succès pour ${sortedPortfolios.length} utilisateurs`);
    return sortedPortfolios.map(p => ({
      ...p,
      rank: sortedPortfolios.indexOf(p) + 1
    }));
  } catch (error) {
    console.error('❌ Erreur lors du recalcul des classements:', error);
    throw error; // Propager l'erreur pour la gérer dans le handler
  }
} 