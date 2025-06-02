require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const fs = require('fs');

console.log('🔍 Script avancé de diagnostic et réparation de la base de données');
console.log('---------------------------------------------------');

// Variables pour suivre l'état
let prismaWorks = false;
let pgDirectWorks = false;

// Fonction pour créer une base de données locale de secours
async function setupLocalBackupDb() {
  console.log('\n🔧 Configuration d\'une base de données locale de secours...');
  
  try {
    const localDbPath = './.local-db';
    if (!fs.existsSync(localDbPath)) {
      fs.mkdirSync(localDbPath);
    }
    
    // Créer un fichier .env.local.backup avec la configuration SQLite
    const envBackupContent = `# Configuration de base de données locale de secours
DATABASE_URL="file:./.local-db/dev.db"

# Autres variables d'environnement préservées
${fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8').split('\n').filter(line => !line.startsWith('DATABASE_URL')).join('\n') : ''}
`;
    
    fs.writeFileSync('.env.local.backup', envBackupContent);
    console.log('✅ Configuration de secours créée à .env.local.backup');
    console.log('   Pour l\'utiliser, renommez-la en .env.local et exécutez ensuite:');
    console.log('   npx prisma db push --force-reset');
  } catch (err) {
    console.error('❌ Erreur lors de la création de la configuration de secours:', err.message);
  }
}

async function main() {
  console.log('1️⃣ Vérification des variables d\'environnement...');
  
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ Variable DATABASE_URL non définie dans .env.local');
    console.log('👉 Assurez-vous d\'avoir une variable DATABASE_URL valide dans votre fichier .env.local');
    await setupLocalBackupDb();
    return;
  }
  
  console.log('✅ Variable DATABASE_URL trouvée');
  
  try {
    const url = new URL(dbUrl);
    console.log(`   Base de données: ${url.hostname}`);
    console.log(`   Nom d'utilisateur: ${url.username}`);
    console.log(`   Base de données: ${url.pathname.substring(1)}`);
    console.log(`   SSL requis: ${dbUrl.includes('sslmode=require') ? 'Oui' : 'Non'}`);
  } catch (e) {
    console.warn('⚠️ Format de l\'URL de la base de données potentiellement invalide');
  }
  
  console.log('\n2️⃣ Test de connexion directe PostgreSQL...');
  
  // Créer un pool de connexion PostgreSQL
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: dbUrl.includes('sslmode=require') 
      ? { rejectUnauthorized: false } 
      : false
  });
  
  try {
    const client = await pool.connect();
    console.log('✅ Connexion PostgreSQL établie avec succès');
    
    // Tester une requête simple
    const result = await client.query('SELECT current_timestamp as time');
    console.log(`   Horodatage du serveur: ${result.rows[0].time}`);
    
    // Vérifier les connexions actives
    const connectionResult = await client.query('SELECT count(*) FROM pg_stat_activity');
    console.log(`   Connexions actives: ${connectionResult.rows[0].count}`);
    
    // Nettoyer les prepared statements
    try {
      // Essayer de nettoyer tous les prepared statements d'un coup
      await client.query('DEALLOCATE ALL');
      console.log('   ✅ Tous les prepared statements ont été nettoyés');
    } catch (e) {
      console.warn('   ⚠️ Impossible de nettoyer tous les prepared statements:', e.message);
      
      try {
        // Si la première tentative échoue, essayer de lister et nettoyer individuellement
        const stmtResult = await client.query('SELECT count(*) FROM pg_prepared_statements');
        console.log(`   Prepared statements: ${stmtResult.rows[0].count}`);
        
        if (parseInt(stmtResult.rows[0].count) > 0) {
          console.log('   🧹 Tentative de nettoyage des prepared statements individuels...');
          const statements = await client.query('SELECT name FROM pg_prepared_statements');
          
          let successCount = 0;
          for (const row of statements.rows) {
            try {
              await client.query(`DEALLOCATE "${row.name}"`);
              successCount++;
            } catch (err) {
              console.warn(`   ⚠️ Impossible de deallouer: ${row.name}`);
            }
          }
          
          console.log(`   ✅ ${successCount}/${statements.rows.length} prepared statements nettoyés`);
        }
      } catch (listErr) {
        console.warn('   ⚠️ Impossible de lister les prepared statements:', listErr.message);
      }
    }
    
    client.release();
    pgDirectWorks = true;
  } catch (e) {
    console.error('❌ Échec de la connexion PostgreSQL:', e.message);
    
    if (e.message.includes('ECONNREFUSED')) {
      console.log('👉 Le serveur de base de données n\'est pas accessible. Vérifiez que:');
      console.log('   - Le serveur de base de données est en ligne');
      console.log('   - L\'URL dans DATABASE_URL est correcte');
      console.log('   - Aucun pare-feu ne bloque la connexion');
    }
    
    if (e.message.includes('password authentication failed')) {
      console.log('👉 Échec d\'authentification. Vérifiez que:');
      console.log('   - Le nom d\'utilisateur et le mot de passe dans DATABASE_URL sont corrects');
    }
    
    await setupLocalBackupDb();
    return;
  }
  
  console.log('\n3️⃣ Test de connexion Prisma...');
  
  // Tester Prisma
  let prisma;
  try {
    prisma = new PrismaClient();
    console.log('✅ Instance PrismaClient créée');
    
    // Test simple avec Prisma
    const user = await prisma.user.findFirst({
      take: 1
    });
    
    console.log(`✅ Requête Prisma exécutée avec succès${user ? (' - Utilisateur trouvé: ' + user.email) : ' - Aucun utilisateur trouvé'}`);
    prismaWorks = true;
    
    // Vérifier le nombre d'utilisateurs
    const userCount = await prisma.user.count();
    console.log(`   Nombre d'utilisateurs: ${userCount}`);
    
    // Vérifier les portefeuilles
    const portfolioCount = await prisma.portfolios.count();
    console.log(`   Nombre de portefeuilles: ${portfolioCount}`);
    
    // Vérifier les transactions
    const txCount = await prisma.transactions.count();
    console.log(`   Nombre de transactions: ${txCount}`);
  } catch (e) {
    console.error('❌ Échec de la connexion Prisma:', e.message);
    
    if (e.message.includes('P1001') || e.message.includes('P1003')) {
      console.log('👉 Prisma ne peut pas se connecter à la base de données');
      console.log('   Vérifiez que la base de données est en ligne et accessible');
    }
    
    if (e.message.includes('P1001')) {
      console.log('👉 La base de données existe mais le schéma pourrait être manquant');
      console.log('   Essayez de déployer votre schéma avec: npx prisma db push');
    }
  } finally {
    if (prisma) {
      await prisma.$disconnect();
    }
  }
  
  console.log('\n4️⃣ Nettoyage de la connexion Prisma');
  
  // Créer un fichier JS pour réinitialiser les connexions Prisma
  try {
    const resetScript = `
// Script temporaire pour nettoyer les connexions Prisma
const { PrismaClient } = require('@prisma/client');

async function resetPrisma() {
  console.log('🧹 Nettoyage des connexions Prisma...');
  
  try {
    const prisma = new PrismaClient();
    await prisma.$disconnect();
    console.log('✅ Prisma disconnected successfully');
  } catch (err) {
    console.error('Error during cleanup:', err);
  }
}

resetPrisma()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
`;
    
    fs.writeFileSync('reset-prisma.js', resetScript);
    console.log('✅ Script de nettoyage Prisma créé');
    
    try {
      const { execSync } = require('child_process');
      execSync('node reset-prisma.js', { stdio: 'inherit' });
      console.log('✅ Nettoyage Prisma terminé');
      
      // Supprimer le fichier après utilisation
      fs.unlinkSync('reset-prisma.js');
    } catch (err) {
      console.error('❌ Erreur lors de l\'exécution du script de nettoyage:', err.message);
    }
  } catch (err) {
    console.error('❌ Erreur lors de la création du script de nettoyage:', err.message);
  }
  
  console.log('\n5️⃣ Résumé du diagnostic');
  console.log('---------------------------------------------------');
  
  if (pgDirectWorks && prismaWorks) {
    console.log('✅ La connexion à la base de données fonctionne correctement');
    console.log('✅ Prisma fonctionne correctement');
    console.log('\n👍 Bon travail! Votre configuration de base de données semble fonctionner correctement.');
  } else if (pgDirectWorks && !prismaWorks) {
    console.log('✅ La connexion directe à la base de données fonctionne');
    console.log('❌ Prisma ne fonctionne pas correctement');
    console.log('\n👉 Actions suggérées:');
    console.log('   1. Exécutez `npx prisma db push` pour synchroniser le schéma');
    console.log('   2. Exécutez `npx prisma generate` pour régénérer le client Prisma');
    console.log('   3. Redémarrez votre application');
  } else {
    console.log('❌ La connexion à la base de données ne fonctionne pas');
    console.log('\n👉 Actions suggérées:');
    console.log('   1. Vérifiez que DATABASE_URL est correcte dans .env.local');
    console.log('   2. Vérifiez que votre serveur de base de données est en ligne');
    console.log('   3. Vérifiez vos identifiants de connexion');
    console.log('   4. Utilisez la configuration locale de secours (voir ci-dessus)');
  }
  
  // Fermer le pool PostgreSQL
  await pool.end();
}

// Exécuter le script
main()
  .catch(e => {
    console.error('❌ Erreur fatale:', e);
    process.exit(1);
  }); 