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

    // Get the holdings for this portfolio
    const holdings = await prisma.holdings.findMany({
      where: { portfolio_id: portfolio.id },
    });

    return NextResponse.json({ holdings });
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
          },
        });
      } else {
        // Create new holding
        return await tx.holdings.create({
          data: {
            portfolio_id: portfolio.id,
            crypto_id: crypto_id.toString(),
            amount,
            average_buy_price: price,
          },
        });
      }
    });

    return NextResponse.json({ success: true, holding: result });
  } catch (error) {
    console.error('Error buying crypto:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 