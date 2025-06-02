const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function initializePortfolioHistory() {
  try {
    console.log('🔄 Initialisation de l\'historique des portefeuilles...');

    // Récupérer tous les portefeuilles existants
    const portfolios = await prisma.portfolios.findMany({
      include: { holdings: true },
    });

    console.log(`📊 ${portfolios.length} portefeuilles trouvés`);

    for (const portfolio of portfolios) {
      try {
        // Calculer la valeur actuelle du portefeuille
        let totalValue = parseFloat(portfolio.balance?.toString() || '0');

        // Ajouter la valeur des holdings
        if (portfolio.holdings && portfolio.holdings.length > 0) {
          for (const holding of portfolio.holdings) {
            const holdingValue = parseFloat(holding.amount.toString()) * parseFloat(holding.average_buy_price.toString());
            totalValue += holdingValue;
          }
        }

        // S'assurer que la valeur minimale est 10K
        totalValue = Math.max(totalValue, 10000);

        // Vérifier s'il y a déjà un historique pour ce portefeuille
        const existingHistory = await prisma.portfolio_history.findFirst({
          where: { portfolio_id: portfolio.id },
        });

        if (!existingHistory) {
          // Créer des entrées d'historique simulées pour les derniers jours
          const now = new Date();
          
          // Créer des entrées pour les 7 derniers jours avec des variations réalistes
          for (let i = 7; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            
            // Simuler des variations réalistes autour de la valeur actuelle
            let historicalValue = totalValue;
            if (i > 0) {
              // Variation de -5% à +5% par jour maximum
              const dailyVariation = (Math.random() - 0.5) * 0.1; // -5% à +5%
              historicalValue = totalValue * (1 + dailyVariation * i * 0.2);
            }
            
            historicalValue = Math.max(historicalValue, 10000); // Minimum 10K

            await prisma.portfolio_history.create({
              data: {
                portfolio_id: portfolio.id,
                total_value: historicalValue,
                recorded_at: date,
              },
            });
          }

          console.log(`✅ Historique créé pour le portefeuille ${portfolio.id} (valeur: $${totalValue.toFixed(2)})`);
        } else {
          console.log(`⏭️ Historique déjà existant pour le portefeuille ${portfolio.id}`);
        }
      } catch (error) {
        console.error(`❌ Erreur pour le portefeuille ${portfolio.id}:`, error);
      }
    }

    console.log('✅ Initialisation de l\'historique terminée');
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le script
if (require.main === module) {
  initializePortfolioHistory();
}

module.exports = { initializePortfolioHistory }; 