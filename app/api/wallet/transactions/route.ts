import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get the user's portfolio
    const portfolio = await prisma.portfolios.findFirst({
      where: { user_id: session.user.id },
    });

    if (!portfolio) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
    }

    // Get transactions for this portfolio
    const transactions = await prisma.transactions.findMany({
      where: { portfolio_id: portfolio.id },
      orderBy: { timestamp: 'desc' }
    });

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Sell crypto
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { crypto_id, crypto_name, crypto_symbol, amount, price } = await req.json();
    
    if (!crypto_id || !crypto_name || !crypto_symbol || !amount || !price) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get the user's portfolio
    const portfolio = await prisma.portfolios.findFirst({
      where: { user_id: session.user.id },
    });

    if (!portfolio) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
    }

    // Check if user has enough of this crypto to sell
    const holding = await prisma.holdings.findFirst({
      where: {
        portfolio_id: portfolio.id,
        crypto_id: crypto_id.toString(),
      },
    });

    if (!holding || parseFloat(holding.amount.toString()) < amount) {
      return NextResponse.json({ 
        error: 'Insufficient crypto balance', 
        available: holding ? parseFloat(holding.amount.toString()) : 0 
      }, { status: 400 });
    }

    // Calculate total sale value
    const saleValue = amount * price;

    // Begin transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create transaction record
      await tx.transactions.create({
        data: {
          portfolio_id: portfolio.id,
          crypto_id: crypto_id.toString(),
          amount,
          price_at_transaction: price,
          transaction_type: 'sell',
        },
      });

      // Update portfolio balance
      await tx.portfolios.update({
        where: { id: portfolio.id },
        data: { balance: { increment: saleValue } },
      });

      // Update holding
      const newAmount = parseFloat(holding.amount.toString()) - amount;
      
      if (newAmount > 0) {
        // Update holding with reduced amount
        return await tx.holdings.update({
          where: { id: holding.id },
          data: { amount: newAmount },
        });
      } else {
        // Remove holding completely if sold all
        await tx.holdings.delete({
          where: { id: holding.id },
        });
        return null;
      }
    });

    return NextResponse.json({ 
      success: true, 
      value: saleValue,
      holding: result
    });
  } catch (error) {
    console.error('Error selling crypto:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Fonction utilitaire pour mettre à jour le classement
async function updateRanking(prismaClient: any, userId: string) {
  try {
    // Récupérer le portefeuille et calculer la valeur totale
    const portfolio = await prismaClient.portfolios.findFirst({
      where: { user_id: userId },
      include: {
        holdings: true,
      },
    });

    if (!portfolio) return;

    // Pour un classement réel, il faudrait récupérer la valeur actuelle des cryptos
    // Ici, on se base sur le prix d'achat comme simplification
    let totalValue = parseFloat(portfolio.balance.toString());
    
    for (const holding of portfolio.holdings) {
      const holdingValue = parseFloat(holding.amount.toString()) * parseFloat(holding.average_buy_price.toString());
      totalValue += holdingValue;
    }

    // Vérifier si un classement existe déjà
    const existingRanking = await prismaClient.rankings.findFirst({
      where: { user_id: userId },
    });

    if (existingRanking) {
      // Mettre à jour le classement existant
      await prismaClient.rankings.update({
        where: { id: existingRanking.id },
        data: {
          total_value: totalValue,
          last_updated: new Date(),
        },
      });
    } else {
      // Créer un nouveau classement
      await prismaClient.rankings.create({
        data: {
          user_id: userId,
          total_value: totalValue,
          rank: 0, // Sera calculé par un job séparé
          last_updated: new Date(),
        },
      });
    }

    // Note: le calcul des rangs relatifs devrait être fait par un job périodique
  } catch (error) {
    console.error("Erreur lors de la mise à jour du classement:", error);
  }
} 