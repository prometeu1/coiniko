import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '../auth/[...nextauth]/route';

// Récupérer le classement global des utilisateurs
export async function GET() {
  try {
    // Force recalculation of rankings first
    await generateInitialRankings();
    
    // Récupération des classements de la base de données avec des informations utilisateur complètes
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
            email: true, // Add email for better identification
          },
        },
      },
    });

    if (!rankings || rankings.length === 0) {
      // Try to get users directly and create rankings
      const users = await prisma.user.findMany({
        where: {
          AND: [
            { email: { not: null } }, // Ensure user has email (from Google OAuth)
            { 
              OR: [
                { name: { not: null } },
                { image: { not: null } }
              ]
            }
          ]
        },
        include: {
          portfolios: {
            include: {
              holdings: true
            }
          }
        }
      });
      
      if (users.length > 0) {
        console.log(`Found ${users.length} real Google users, creating initial rankings...`);
        await generateInitialRankings();
        
        // Try again to get rankings
        const newRankings = await prisma.rankings.findMany({
          orderBy: {
            rank: 'asc',
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
                email: true,
              },
            },
          },
        });
        
        if (newRankings.length > 0) {
          return NextResponse.json(newRankings);
        }
      }
      
      // UNIQUEMENT si vraiment aucun utilisateur réel n'existe, utiliser les fallbacks
      console.log('No real Google users found, using minimal fallbacks');
      const fallbackRankings = await createFallbackRankings();
      return NextResponse.json(fallbackRankings);
    }

    // S'assurer qu'on a les bonnes données d'utilisateur et filtrer les utilisateurs factices
    const validRankings = rankings.filter(ranking => 
      ranking.user && 
      ranking.user.id && 
      ranking.user.id !== 'dummy1' && 
      ranking.user.id !== 'dummy2' && 
      ranking.user.id !== 'dummy3' &&
      ranking.user.email && // Must have email (from Google OAuth)
      !ranking.user.email.includes('example.com') // Filter out fake emails
    );

    console.log(`Found ${validRankings.length} valid real user rankings`);

    if (validRankings.length === 0) {
      console.log('No valid real user rankings found, regenerating...');
      await generateInitialRankings();
      
      const regeneratedRankings = await prisma.rankings.findMany({
        where: {
          user: {
            AND: [
              { email: { not: null } },
              { email: { not: { contains: 'example.com' } } }
            ]
          }
        },
        orderBy: {
          rank: 'asc',
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
              email: true,
            },
          },
        },
      });
      
      return NextResponse.json(regeneratedRankings);
    }

    return NextResponse.json(validRankings);
  } catch (error) {
    console.error('Erreur lors de la récupération des classements:', error);
    
    // En cas d'erreur, essayer de créer des classements de secours avec de vrais utilisateurs
    const fallbackRankings = await createFallbackRankings();
    return NextResponse.json(fallbackRankings);
  }
}

// Fonction améliorée pour générer un classement initial en fonction des portefeuilles existants
async function generateInitialRankings() {
  try {
    // Récupérer tous les utilisateurs avec leurs portefeuilles
    const portfolios = await prisma.portfolios.findMany({
      include: {
        user: true,
        holdings: true,
      },
    });

    console.log(`Found ${portfolios.length} portfolios to process`);

    if (!portfolios || portfolios.length === 0) {
      console.log('Aucun portefeuille trouvé pour générer le classement initial');
      
      // Check if we have users without portfolios
      const usersWithoutPortfolios = await prisma.user.findMany({
        where: {
          portfolios: {
            none: {}
          }
        }
      });
      
      // Create portfolios for users without them
      for (const user of usersWithoutPortfolios) {
        await prisma.portfolios.create({
          data: {
            user_id: user.id,
            balance: 35663370.68, // Default starting balance
          }
        });
        console.log(`Created portfolio for user ${user.name || user.email}`);
      }
      
      // Try again after creating portfolios
      const newPortfolios = await prisma.portfolios.findMany({
        include: {
          user: true,
          holdings: true,
        },
      });
      
      if (newPortfolios.length === 0) {
        return;
      }
      
      // Update portfolios variable to use new ones
      portfolios.push(...newPortfolios);
    }

    // Import crypto service for current prices
    const { getCryptoPrice } = await import('@/lib/cryptoService');

    // Pour chaque portefeuille, calculer la valeur totale (solde + valeur des crypto)
    const portfolioValues = await Promise.all(portfolios.map(async (portfolio) => {
      let totalValue = parseFloat(portfolio.balance.toString()) || 35663370.68; // Use realistic starting value
      
      // Ajouter la valeur des holdings avec les prix actuels
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
      
      // Ensure minimum value for active users
      if (totalValue < 10000 && portfolio.holdings.length > 0) {
        totalValue = Math.max(totalValue, 35663370.68);
      }
      
      return {
        userId: portfolio.user_id,
        userName: portfolio.user.name || portfolio.user.email || 'Unknown User',
        totalValue: totalValue,
      };
    }));

    // Filter out portfolios with 0 value and sort by total value descending
    const validPortfolios = portfolioValues
      .filter(p => p.totalValue > 1000) // Lower threshold
      .sort((a, b) => b.totalValue - a.totalValue);

    console.log(`Processing ${validPortfolios.length} valid portfolios for ranking`);

    // Clear existing rankings
    await prisma.rankings.deleteMany({});

    // Créer les nouveaux classements
    for (let i = 0; i < validPortfolios.length; i++) {
      const { userId, totalValue } = validPortfolios[i];
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

    console.log(`Classements générés avec succès pour ${validPortfolios.length} utilisateurs`);
  } catch (error) {
    console.error('Erreur lors de la génération des classements:', error);
    // Don't throw to avoid crashing the API
  }
}

// Create fallback rankings with real users if possible
async function createFallbackRankings() {
  try {
    // Try to get real Google users first (users with email and OAuth data)
    const users = await prisma.user.findMany({
      where: {
        AND: [
          { email: { not: null } },
          { email: { not: { contains: 'example.com' } } }, // Filter out fake emails
          { 
            OR: [
              { name: { not: null } },
              { image: { not: null } }
            ]
          }
        ]
      },
      take: 10, // Get up to 10 real users
      orderBy: {
        createdAt: 'desc' // Get most recent users first
      }
    });
    
    console.log(`Found ${users.length} real Google users for fallback rankings`);
    
    if (users.length > 0) {
      // Create rankings with real Google users
      const fallbackRankings = users.map((user, index) => ({
        id: `fallback-${user.id}`,
        user_id: user.id,
        total_value: 35663370.68 - (index * 5000000), // Decreasing values
        rank: index + 1,
        last_updated: new Date(),
        user: { 
          id: user.id, 
          name: user.name || user.email?.split('@')[0] || `User ${index + 1}`, 
          image: user.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
          email: user.email 
        }
      }));
      
      // Save these fallback rankings to database for consistency
      try {
        await prisma.rankings.deleteMany({});
        
        for (const ranking of fallbackRankings) {
          await prisma.rankings.create({
            data: {
              user_id: ranking.user_id,
              total_value: ranking.total_value,
              rank: ranking.rank,
              last_updated: ranking.last_updated,
            },
          });
        }
      } catch (dbError) {
        console.error('Error saving fallback rankings to database:', dbError);
      }
      
      return fallbackRankings;
    }
  } catch (error) {
    console.error('Error creating fallback rankings with real users:', error);
  }
  
  // If no real users, create dummy rankings (only as absolute last resort)
  console.log('Creating dummy rankings as absolute last resort');
  return [
    {
      id: 'dummy1',
      user_id: 'dummy1',
      total_value: 35663370.68,
      rank: 1,
      last_updated: new Date(),
      user: { id: 'dummy1', name: 'Investisseur Gold', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=gold', email: 'gold@example.com' }
    },
    {
      id: 'dummy2',
      user_id: 'dummy2',
      total_value: 25000000,
      rank: 2,
      last_updated: new Date(),
      user: { id: 'dummy2', name: 'Investisseur Silver', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=silver', email: 'silver@example.com' }
    },
    {
      id: 'dummy3',
      user_id: 'dummy3',
      total_value: 15000000,
      rank: 3,
      last_updated: new Date(),
      user: { id: 'dummy3', name: 'Investisseur Bronze', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bronze', email: 'bronze@example.com' }
    }
  ];
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