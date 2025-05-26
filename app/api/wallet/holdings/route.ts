import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma, handleDatabaseOperation } from '@/lib/db';
import { authOptions } from '../../auth/[...nextauth]/route';

// Fonction utilitaire pour mettre à jour le classement
async function updateRanking(userId: string) {
  try {
    const prismaClient = prisma();
    
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

    // Recalculer les rangs
    const allRankings = await prismaClient.rankings.findMany({
      orderBy: { total_value: 'desc' },
    });

    // Mettre à jour les rangs pour tous les utilisateurs
    for (let i = 0; i < allRankings.length; i++) {
      await prismaClient.rankings.update({
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
    return await handleDatabaseOperation(async () => {
      const prismaClient = prisma();
      
      // Get the user's portfolio
      const portfolio = await prismaClient.portfolios.findFirst({
        where: { user_id: session.user.id },
      });

      if (!portfolio) {
        return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
      }

      // Get the holdings for this portfolio
      const holdings = await prismaClient.holdings.findMany({
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
    });
  } catch (error) {
    console.error('Error fetching holdings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'auth_required' }, { status: 401 });
  }

  try {
    const { crypto_id, crypto_name, crypto_symbol, amount, price } = await req.json();
    
    // Validation plus stricte des données d'entrée
    if (!crypto_id || !crypto_name || !crypto_symbol || !amount || !price) {
      return NextResponse.json({ 
        error: 'Missing required fields', 
        details: { 
          crypto_id: !crypto_id ? 'missing' : 'ok',
          crypto_name: !crypto_name ? 'missing' : 'ok',
          crypto_symbol: !crypto_symbol ? 'missing' : 'ok',
          amount: !amount ? 'missing' : 'ok',
          price: !price ? 'missing' : 'ok'
        },
        code: 'missing_fields'
      }, { status: 400 });
    }

    if (isNaN(amount) || amount <= 0 || isNaN(price) || price <= 0) {
      return NextResponse.json({ 
        error: 'Invalid amount or price', 
        code: 'invalid_values'
      }, { status: 400 });
    }

    return await handleDatabaseOperation(async () => {
      const prismaClient = prisma();
      
      // Get the user's portfolio
      let portfolio = await prismaClient.portfolios.findFirst({
        where: { user_id: session.user.id },
      });

      if (!portfolio) {
        // Créer un nouveau portefeuille si aucun n'existe
        portfolio = await prismaClient.portfolios.create({
          data: {
            user_id: session.user.id,
            balance: 100000, // Montant de départ: 100000$
          },
        });
        
        console.log('Nouveau portefeuille créé avec un solde initial de 100000$');
      }

      // Calculate total cost with proper precision
      const totalCost = parseFloat((amount * price).toFixed(2));
      const formattedAmount = parseFloat(amount.toFixed(8));
      
      // Check if user has enough balance with a small epsilon for floating point errors
      const EPSILON = 0.01;
      const currentBalance = parseFloat(portfolio.balance.toString());
      
      if (totalCost > currentBalance + EPSILON) {
        return NextResponse.json({ 
          error: 'Insufficient funds', 
          balance: currentBalance,
          cost: totalCost,
          code: 'insufficient_funds'
        }, { status: 400 });
      }

      // Begin transaction with explicit retry logic
      let result;
      let retries = 0;
      const MAX_RETRIES = 3;
      
      while (retries < MAX_RETRIES) {
        try {
          result = await prismaClient.$transaction(async (tx) => {
            // Create transaction record
            const transaction = await tx.transactions.create({
              data: {
                portfolio_id: portfolio.id,
                crypto_id: crypto_id.toString(),
                crypto_name: crypto_name,
                crypto_symbol: crypto_symbol,
                amount: formattedAmount,
                price_at_transaction: price,
                transaction_type: 'buy',
              },
            });

            // Update portfolio balance with exact amount
            const updatedPortfolio = await tx.portfolios.update({
              where: { id: portfolio.id },
              data: { 
                balance: {
                  set: parseFloat((currentBalance - totalCost).toFixed(2))
                } 
              },
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
              const currentAmount = parseFloat(existingHolding.amount.toString());
              const currentAvgPrice = parseFloat(existingHolding.average_buy_price.toString());
              
              const newAmount = parseFloat((currentAmount + formattedAmount).toFixed(8));
              const totalInvested = parseFloat((currentAmount * currentAvgPrice).toFixed(2)) + totalCost;
              const newAveragePrice = parseFloat((totalInvested / newAmount).toFixed(2));

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
                  amount: formattedAmount,
                  average_buy_price: price,
                },
              });
            }
          });
          
          // Break out of retry loop on success
          break;
        } catch (error) {
          retries++;
          console.error(`Transaction failed (attempt ${retries}/${MAX_RETRIES}):`, error);
          
          if (retries >= MAX_RETRIES) {
            throw error;
          }
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000 * retries));
        }
      }

      // Update user's ranking
      setTimeout(() => updateRanking(session.user.id), 0);
      
      return NextResponse.json({
        success: true,
        message: 'Crypto purchased successfully',
        holding: {
          id: result.id,
          crypto_id: result.crypto_id,
          amount: parseFloat(result.amount.toString()),
          average_buy_price: parseFloat(result.average_buy_price.toString())
        }
      });
    });
  } catch (error) {
    console.error('Error during purchase:', error);
    return NextResponse.json({ 
      error: 'Transaction failed', 
      details: error.message,
      code: 'transaction_failed'
    }, { status: 500 });
  }
} 