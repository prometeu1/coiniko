import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '../../auth/[...nextauth]/route';

// Fonction utilitaire pour mettre à jour le classement
async function updateRanking(userId: string) {
  try {
    // Récupérer le portefeuille et calculer la valeur totale
    const portfolio = await prisma.portfolios.findFirst({
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
    const existingRanking = await prisma.rankings.findFirst({
      where: { user_id: userId },
    });

    if (existingRanking) {
      // Mettre à jour le classement existant
      await prisma.rankings.update({
        where: { id: existingRanking.id },
        data: {
          total_value: totalValue,
          last_updated: new Date(),
        },
      });
    } else {
      // Créer un nouveau classement
      await prisma.rankings.create({
        data: {
          user_id: userId,
          total_value: totalValue,
          rank: 0, // Sera calculé par un job séparé
          last_updated: new Date(),
        },
      });
    }

    // Recalculer les rangs
    const allRankings = await prisma.rankings.findMany({
      orderBy: { total_value: 'desc' },
    });

    // Mettre à jour les rangs pour tous les utilisateurs
    for (let i = 0; i < allRankings.length; i++) {
      await prisma.rankings.update({
        where: { id: allRankings[i].id },
        data: { rank: i + 1 },
      });
    }
  } catch (error) {
    console.error("Erreur lors de la mise à jour du classement:", error);
  }
}

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

    // Get the holdings for this portfolio
    const holdings = await prisma.holdings.findMany({
      where: { portfolio_id: portfolio.id },
    });

    // Transformer les données pour correspondre à ce qu'attend le client
    const formattedHoldings = holdings.map(h => ({
      id: h.id,
      crypto_id: h.crypto_id,
      crypto_name: h.crypto_name || 'Crypto',
      crypto_symbol: h.crypto_symbol || 'CRYPTO',
      amount: parseFloat(h.amount.toString()),
      average_buy_price: parseFloat(h.average_buy_price.toString())
    }));

    return NextResponse.json(formattedHoldings);
  } catch (error) {
    console.error('Error fetching holdings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { crypto_id, crypto_name, crypto_symbol, amount, price } = await req.json();
    
    if (!crypto_id || !amount || !price) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get the user's portfolio
    const portfolio = await prisma.portfolios.findFirst({
      where: { user_id: session.user.id },
    });

    if (!portfolio) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
    }

    // Calculate total cost
    const totalCost = amount * price;
    
    // Check if user has enough balance
    if (totalCost > (portfolio.balance || 0)) {
      return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 });
    }

    // Begin transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create transaction record
      await tx.transactions.create({
        data: {
          portfolio_id: portfolio.id,
          crypto_id: crypto_id.toString(),
          crypto_name: crypto_name,
          crypto_symbol: crypto_symbol,
          amount,
          price_at_transaction: price,
          transaction_type: 'buy',
        },
      });

      // Update portfolio balance
      await tx.portfolios.update({
        where: { id: portfolio.id },
        data: { balance: { decrement: totalCost } },
      });

      // Check if holding already exists
      const existingHolding = await tx.holdings.findFirst({
        where: {
          portfolio_id: portfolio.id,
          crypto_id: crypto_id.toString(),
        },
      });

      if (existingHolding) {
        // Update existing holding
        const newAmount = parseFloat(existingHolding.amount.toString()) + amount;
        const newTotalInvested = parseFloat(existingHolding.average_buy_price.toString()) * 
          parseFloat(existingHolding.amount.toString()) + totalCost;
        const newAveragePrice = newTotalInvested / newAmount;

        return await tx.holdings.update({
          where: { id: existingHolding.id },
          data: {
            amount: newAmount,
            average_buy_price: newAveragePrice,
            crypto_name: crypto_name,
            crypto_symbol: crypto_symbol,
          },
        });
      } else {
        // Create new holding
        return await tx.holdings.create({
          data: {
            portfolio_id: portfolio.id,
            crypto_id: crypto_id.toString(),
            crypto_name: crypto_name,
            crypto_symbol: crypto_symbol,
            amount,
            average_buy_price: price,
          },
        });
      }
    });

    // Mettre à jour le classement après la transaction
    await updateRanking(session.user.id);

    return NextResponse.json({ success: true, holding: result });
  } catch (error) {
    console.error('Error buying crypto:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 