import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Function to calculate current portfolio value including holdings
async function calculateCurrentPortfolioValue(portfolioId: string): Promise<number> {
  try {
    const portfolio = await prisma.portfolios.findUnique({
      where: { id: portfolioId },
      include: { holdings: true },
    });

    if (!portfolio) {
      return 0;
    }

    let totalValue = parseFloat(portfolio.balance?.toString() || '0');

    // Add value from holdings
    if (portfolio.holdings && portfolio.holdings.length > 0) {
      for (const holding of portfolio.holdings) {
        const holdingValue = parseFloat(holding.amount.toString()) * parseFloat(holding.average_buy_price.toString());
        totalValue += holdingValue;
      }
    }

    return Math.max(totalValue, 10000); // Minimum of 10K
  } catch (error) {
    console.error('Error calculating portfolio value:', error);
    return 10000; // Return base value on error
  }
}

// API to record current portfolio values for all users
export async function POST(req: NextRequest) {
  try {
    console.log('🔄 Recording portfolio values for historical tracking...');

    // Get all portfolios
    const portfolios = await prisma.portfolios.findMany();

    let recordedCount = 0;

    for (const portfolio of portfolios) {
      try {
        const currentValue = await calculateCurrentPortfolioValue(portfolio.id);

        // Record the current value in history
        await prisma.portfolio_history.create({
          data: {
            portfolio_id: portfolio.id,
            total_value: currentValue,
          },
        });

        recordedCount++;
      } catch (error) {
        console.error(`Error recording value for portfolio ${portfolio.id}:`, error);
      }
    }

    console.log(`✅ Recorded values for ${recordedCount} portfolios`);

    return NextResponse.json({
      success: true,
      message: `Recorded values for ${recordedCount} portfolios`,
      recordedCount,
    });
  } catch (error) {
    console.error('❌ Error recording portfolio values:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to record portfolio values' },
      { status: 500 }
    );
  }
}

// API to get historical data for a portfolio (for debugging)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const portfolioId = searchParams.get('portfolioId');

    if (!portfolioId) {
      return NextResponse.json(
        { error: 'Portfolio ID is required' },
        { status: 400 }
      );
    }

    const history = await prisma.portfolio_history.findMany({
      where: { portfolio_id: portfolioId },
      orderBy: { recorded_at: 'desc' },
      take: 100, // Last 100 records
    });

    return NextResponse.json(history);
  } catch (error) {
    console.error('Error fetching portfolio history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portfolio history' },
      { status: 500 }
    );
  }
} 