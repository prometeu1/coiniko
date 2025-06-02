const fetch = require('node-fetch');

async function testRankings() {
  try {
    console.log('🧪 Test de l\'API de classement...');

    // Tester l'API en local
    const response = await fetch('http://localhost:3000/api/rankings');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const rankings = await response.json();
    
    console.log(`📊 ${rankings.length} classements récupérés`);
    
    rankings.forEach((ranking, index) => {
      console.log(`\n🏆 Rang ${ranking.rank}: ${ranking.user.name || ranking.user.email}`);
      console.log(`💰 Valeur: $${parseFloat(ranking.total_value).toLocaleString()}`);
      console.log(`📈 Performances:`);
      console.log(`   - 1h: ${ranking.performance.change_1h.toFixed(2)}%`);
      console.log(`   - 24h: ${ranking.performance.change_24h.toFixed(2)}%`);
      console.log(`   - 7j: ${ranking.performance.change_7d.toFixed(2)}%`);
      console.log(`   - All-time: ${ranking.performance.change_all_time.toFixed(2)}%`);
    });

    // Vérifier que les variations all-time sont correctes (basées sur 10K)
    const allTimeVariationsCorrect = rankings.every(ranking => {
      const expectedAllTime = ((parseFloat(ranking.total_value) - 10000) / 10000) * 100;
      const actualAllTime = ranking.performance.change_all_time;
      const difference = Math.abs(expectedAllTime - actualAllTime);
      return difference < 0.01; // Tolérance de 0.01%
    });

    if (allTimeVariationsCorrect) {
      console.log('\n✅ Les variations all-time sont correctes (basées sur 10K)');
    } else {
      console.log('\n⚠️ Les variations all-time ne sont pas correctes');
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
  }
}

// Exécuter le test
if (require.main === module) {
  testRankings();
}

module.exports = { testRankings }; 