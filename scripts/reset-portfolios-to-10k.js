const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function resetPortfoliosTo10K() {
  try {
    console.log('🔄 Réinitialisation de tous les portefeuilles à 10K...');

    // 1. Nettoyer l'historique existant
    console.log('🧹 Nettoyage de l\'historique...');
    await prisma.portfolio_history.deleteMany({});

    // 2. Nettoyer les classements existants
    console.log('🧹 Nettoyage des classements...');
    await prisma.rankings.deleteMany({});

    // 3. Réinitialiser tous les portefeuilles à 10K
    console.log('💰 Réinitialisation des portefeuilles...');
    const result = await prisma.portfolios.updateMany({
      data: {
        balance: 10000,
      },
    });

    console.log(`✅ ${result.count} portefeuilles réinitialisés à $10,000`);

    // 4. Supprimer tous les holdings (investissements)
    console.log('🧹 Suppression des holdings...');
    const holdingsResult = await prisma.holdings.deleteMany({});
    console.log(`✅ ${holdingsResult.count} holdings supprimés`);

    // 5. Supprimer toutes les transactions
    console.log('🧹 Suppression des transactions...');
    const transactionsResult = await prisma.transactions.deleteMany({});
    console.log(`✅ ${transactionsResult.count} transactions supprimées`);

    // 6. Créer l'historique initial pour tous les portefeuilles
    console.log('📊 Création de l\'historique initial...');
    const portfolios = await prisma.portfolios.findMany();
    
    for (const portfolio of portfolios) {
      // Créer une entrée d'historique initiale
      await prisma.portfolio_history.create({
        data: {
          portfolio_id: portfolio.id,
          total_value: 10000,
          recorded_at: new Date(),
        },
      });
    }

    console.log(`✅ Historique initial créé pour ${portfolios.length} portefeuilles`);

    // 7. Recréer les classements
    console.log('🏆 Recréation des classements...');
    for (let i = 0; i < portfolios.length; i++) {
      const portfolio = portfolios[i];
      await prisma.rankings.create({
        data: {
          user_id: portfolio.user_id,
          total_value: 10000,
          rank: i + 1,
          last_updated: new Date(),
        },
      });
    }

    console.log(`✅ Classements créés pour ${portfolios.length} utilisateurs`);
    console.log('🎉 Réinitialisation terminée ! Tous les utilisateurs commencent maintenant à $10,000');

  } catch (error) {
    console.error('❌ Erreur lors de la réinitialisation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le script
if (require.main === module) {
  resetPortfoliosTo10K();
}

module.exports = { resetPortfoliosTo10K }; 