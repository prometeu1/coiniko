import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '../../auth/[...nextauth]/route';

// Force recalculation of all rankings
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Allow any authenticated user to trigger recalculation
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Force recalculation
    await recalculateAllRankings();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Rankings recalculated successfully' 
    });
  } catch (error) {
    console.error('Error recalculating rankings:', error);
    return NextResponse.json({ 
      error: 'Failed to recalculate rankings' 
    }, { status: 500 });
  }
}

async function recalculateAllRankings() {
  try {
    // Récupérer tous les utilisateurs avec leurs portefeuilles
    const portfolios = await prisma.portfolios.findMany({
      include: {
        user: true,
        holdings: true,
      },
    });

    if (!portfolios || portfolios.length === 0) {
      console.log('No portfolios found for ranking calculation');
      return;
    }

    // Import crypto service for current prices
    const { getCryptoPrice } = await import('@/lib/cryptoService');

    // Calculate portfolio values with current crypto prices
    const portfolioValues = await Promise.all(portfolios.map(async (portfolio) => {
      let totalValue = parseFloat(portfolio.balance.toString()) || 0;
      
      // Add holdings value with current prices
      if (portfolio.holdings && portfolio.holdings.length > 0) {
        for (const holding of portfolio.holdings) {
          try {
            // Get current price for this crypto
            const currentPrice = await getCryptoPrice(holding.crypto_id);
            if (currentPrice) {
              const holdingValue = parseFloat(holding.amount.toString()) * currentPrice.current_price;
              totalValue += holdingValue;
            } else {
              // Fallback to average buy price if current price not available
              const holdingValue = parseFloat(holding.amount.toString()) * parseFloat(holding.average_buy_price.toString());
              totalValue += holdingValue;
            }
          } catch (error) {
            console.error(`Error getting price for ${holding.crypto_id}:`, error);
            // Fallback to average buy price
            const holdingValue = parseFloat(holding.amount.toString()) * parseFloat(holding.average_buy_price.toString());
            totalValue += holdingValue;
          }
        }
      }
      
      // Ensure minimum value for active users with holdings
      if (totalValue < 1000 && portfolio.holdings.length > 0) {
        totalValue = Math.max(totalValue, 2500);
      }
      
      return {
        userId: portfolio.user_id,
        userName: portfolio.user.name || 'Unknown User',
        totalValue: totalValue,
      };
    }));

    // Filter portfolios with meaningful value and sort
    const validPortfolios = portfolioValues
      .filter(p => p.totalValue > 100) // Minimum threshold
      .sort((a, b) => b.totalValue - a.totalValue);

    // Clear existing rankings
    await prisma.rankings.deleteMany({});

    // Create new rankings
    const rankingPromises = validPortfolios.map((portfolio, index) => {
      const rank = index + 1;
      return prisma.rankings.create({
        data: {
          user_id: portfolio.userId,
          total_value: portfolio.totalValue,
          rank,
          last_updated: new Date(),
        },
      });
    });

    await Promise.all(rankingPromises);

    console.log(`Successfully recalculated rankings for ${validPortfolios.length} users`);
  } catch (error) {
    console.error('Error in recalculateAllRankings:', error);
    throw error;
  }
} 